// Treatment plans — pg.
//
// "Items" on a plan are stored in the `treatments` table, linked via
// treatments.plan_id. We deliberately reuse the treatments table so that a
// "planned" line item can later be promoted to a "completed" treatment with
// inventory deductions, without copying data between tables.
//
// `estimated_total` is recomputed from the sum of all linked treatment prices
// every time an item is added/removed, so the column stays consistent without
// the UI needing to do math on the client.

const num = (v) => (v == null ? 0 : typeof v === 'number' ? v : Number(v) || 0);
const numOrUndef = (v) => (v == null ? undefined : typeof v === 'number' ? v : Number(v));

const SELECT = `tp.*, p.full_name AS patient_full_name`;
const FROM_JOIN = `treatment_plans tp LEFT JOIN patients p ON p.id = tp.patient_id`;

function fromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    patientName: row.patient_full_name ?? '',
    doctorId: row.doctor_id ?? undefined,
    title: row.title ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    estimatedTotal: numOrUndef(row.estimated_total),
    discount: numOrUndef(row.discount),
    insuranceCovered: numOrUndef(row.insurance_covered),
    patientResponsibility: numOrUndef(row.patient_responsibility),
    acceptedAt: row.accepted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function itemFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    planId: row.plan_id ?? undefined,
    patientId: row.patient_id,
    description: row.description,
    price: num(row.price),
    status: row.status, // 'planned' | 'in_progress' | 'completed' | 'canceled'
    performedAt: row.performed_at ?? undefined,
    createdAt: row.created_at,
  };
}

const COLS = {
  patientId: 'patient_id',
  doctorId: 'doctor_id',
  title: 'title',
  notes: 'notes',
  status: 'status',
  estimatedTotal: 'estimated_total',
  discount: 'discount',
  insuranceCovered: 'insurance_covered',
  patientResponsibility: 'patient_responsibility',
  acceptedAt: 'accepted_at',
};

async function list(db, { page = 0, pageSize = 50, patientId, status, search }) {
  const where = []; const params = [];
  if (patientId) { params.push(patientId); where.push(`tp.patient_id = $${params.length}`); }
  if (status) { params.push(status); where.push(`tp.status = $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(tp.title ILIKE $${params.length} OR p.full_name ILIKE $${params.length})`);
  }
  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(pageSize); const limitIdx = params.length;
  params.push(page * pageSize); const offsetIdx = params.length;

  const dataSQL = `SELECT ${SELECT} FROM ${FROM_JOIN} ${whereSQL} ORDER BY tp.created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
  const countParams = params.slice(0, params.length - 2);
  const countSQL = `SELECT COUNT(*)::int AS count FROM ${FROM_JOIN} ${whereSQL}`;

  const [d, c] = await Promise.all([db.query(dataSQL, params), db.query(countSQL, countParams)]);
  return { data: d.rows.map(fromDb), page, pageSize, total: c.rows[0].count };
}

async function get(db, id) {
  const r = await db.query(`SELECT ${SELECT} FROM ${FROM_JOIN} WHERE tp.id = $1`, [id]);
  return fromDb(r.rows[0]);
}

async function create(db, input, clinicId) {
  const cols = ['clinic_id'];
  const vals = [clinicId];
  for (const [k, col] of Object.entries(COLS)) {
    if (input[k] !== undefined) {
      cols.push(col);
      vals.push(input[k] ?? null);
    }
  }
  const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
  const r = await db.query(
    `INSERT INTO treatment_plans (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`,
    vals,
  );
  return get(db, r.rows[0].id);
}

async function update(db, id, patch) {
  const sets = []; const params = [];
  for (const [k, col] of Object.entries(COLS)) {
    if (patch[k] !== undefined) {
      params.push(patch[k] ?? null);
      sets.push(`${col} = $${params.length}`);
    }
  }
  if (sets.length === 0) return get(db, id);
  params.push(id);
  await db.query(
    `UPDATE treatment_plans SET ${sets.join(', ')} WHERE id = $${params.length}`,
    params,
  );
  return get(db, id);
}

async function cancel(db, id) {
  await db.query(`UPDATE treatment_plans SET status = 'canceled' WHERE id = $1`, [id]);
}

async function setStatus(db, id, status, extra = {}) {
  const sets = ['status = $1'];
  const params = [status];
  if (extra.acceptedAt !== undefined) {
    params.push(extra.acceptedAt);
    sets.push(`accepted_at = $${params.length}`);
  }
  params.push(id);
  await db.query(
    `UPDATE treatment_plans SET ${sets.join(', ')} WHERE id = $${params.length}`,
    params,
  );
  return get(db, id);
}

// ─── Items (treatments scoped to plan) ───────────────────────────────────────

async function listItems(db, planId) {
  const r = await db.query(
    `SELECT * FROM treatments WHERE plan_id = $1 ORDER BY created_at ASC`,
    [planId],
  );
  return r.rows.map(itemFromDb);
}

async function addItem(db, planId, input, clinicId) {
  // Find the plan's patient to attach to the new treatment row.
  const planRow = await db.query(
    `SELECT patient_id FROM treatment_plans WHERE id = $1`,
    [planId],
  );
  if (planRow.rowCount === 0) return null;
  const patientId = planRow.rows[0].patient_id;
  const r = await db.query(
    `INSERT INTO treatments
       (clinic_id, patient_id, plan_id, description, price, status)
     VALUES ($1, $2, $3, $4, $5, 'planned')
     RETURNING *`,
    [
      clinicId,
      patientId,
      planId,
      input.description,
      input.price ?? 0,
    ],
  );
  await recomputeEstimatedTotal(db, planId);
  return itemFromDb(r.rows[0]);
}

async function removeItem(db, itemId) {
  // Capture the plan_id before delete so we can recompute the total after.
  const r = await db.query(`SELECT plan_id FROM treatments WHERE id = $1`, [itemId]);
  if (r.rowCount === 0) return false;
  const planId = r.rows[0].plan_id;
  await db.query(`DELETE FROM treatments WHERE id = $1`, [itemId]);
  if (planId) await recomputeEstimatedTotal(db, planId);
  return true;
}

async function recomputeEstimatedTotal(db, planId) {
  await db.query(
    `UPDATE treatment_plans
       SET estimated_total = COALESCE(
         (SELECT SUM(price)::numeric(12,2) FROM treatments WHERE plan_id = $1),
         0
       )
     WHERE id = $1`,
    [planId],
  );
}

// ─── Convert to invoice ──────────────────────────────────────────────────────
//
// Creates a single invoice for the plan totalling all linked treatment prices
// minus the plan's discount/insurance coverage. Returns the new invoice id.

async function convertToInvoice(db, planId, clinicId) {
  const items = await listItems(db, planId);
  if (items.length === 0) {
    return { error: 'No items on plan to invoice' };
  }
  const planRow = await db.query(
    `SELECT patient_id, discount, insurance_covered FROM treatment_plans WHERE id = $1`,
    [planId],
  );
  if (planRow.rowCount === 0) return { error: 'Plan not found' };
  const { patient_id, discount, insurance_covered } = planRow.rows[0];
  const subtotal = items.reduce((sum, it) => sum + num(it.price), 0);
  const amount = Math.max(0, subtotal - num(discount) - num(insurance_covered));
  const r = await db.query(
    `INSERT INTO invoices (clinic_id, patient_id, amount, paid_amount, status, issued_at)
     VALUES ($1, $2, $3, 0, 'unpaid', NOW())
     RETURNING id`,
    [clinicId, patient_id, amount],
  );
  return { invoiceId: r.rows[0].id, amount };
}

// ─── Convert to appointments ─────────────────────────────────────────────────
//
// For each "planned" item without an existing appointment, create an
// appointment starting at startDate, spaced spacingDays apart. Returns the
// list of created appointment ids.

async function convertToAppointments(db, planId, clinicId, opts) {
  const items = await listItems(db, planId);
  const planned = items.filter((it) => it.status === 'planned');
  if (planned.length === 0) return { appointments: [] };
  const planRow = await db.query(
    `SELECT patient_id FROM treatment_plans WHERE id = $1`,
    [planId],
  );
  if (planRow.rowCount === 0) return { error: 'Plan not found' };
  const patientId = planRow.rows[0].patient_id;

  const startMs = new Date(opts.startDate).getTime();
  if (Number.isNaN(startMs)) return { error: 'Invalid startDate' };

  const created = [];
  for (let i = 0; i < planned.length; i++) {
    const item = planned[i];
    const offsetMs = i * opts.spacingDays * 86_400_000;
    const startsAt = new Date(startMs + offsetMs);
    const endsAt = new Date(startsAt.getTime() + opts.durationMinutes * 60_000);
    const observation = `[Plan] ${item.description}`;
    const r = await db.query(
      `INSERT INTO appointments
         (clinic_id, patient_id, starts_at, ends_at, status, observation)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING id`,
      [clinicId, patientId, startsAt.toISOString(), endsAt.toISOString(), observation],
    );
    created.push(r.rows[0].id);
  }
  return { appointments: created };
}

module.exports = {
  list,
  get,
  create,
  update,
  cancel,
  setStatus,
  listItems,
  addItem,
  removeItem,
  recomputeEstimatedTotal,
  convertToInvoice,
  convertToAppointments,
};
