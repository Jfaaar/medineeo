// Treatments — pg.
const num = (v) => (v == null ? 0 : typeof v === 'number' ? v : Number(v) || 0);

function fromDb(row, materials) {
  if (!row) return null;
  return {
    id: row.id,
    patientId: row.patient_id,
    date: row.performed_at ?? row.created_at,
    description: row.description,
    price: num(row.price),
    status: row.status === 'completed' ? 'completed' : 'planned',
    materialsUsed: materials,
  };
}

async function list(db, { page = 0, pageSize = 200, patientId }) {
  const where = []; const params = [];
  if (patientId) { params.push(patientId); where.push(`patient_id = $${params.length}`); }
  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(pageSize); const limitIdx = params.length;
  params.push(page * pageSize); const offsetIdx = params.length;

  const dataSQL = `SELECT * FROM treatments ${whereSQL} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
  const countParams = params.slice(0, params.length - 2);
  const countSQL = `SELECT COUNT(*)::int AS count FROM treatments ${whereSQL}`;
  const [d, c] = await Promise.all([db.query(dataSQL, params), db.query(countSQL, countParams)]);
  return { data: d.rows.map((r) => fromDb(r)), page, pageSize, total: c.rows[0].count };
}

async function get(db, id) {
  const r = await db.query(`SELECT * FROM treatments WHERE id = $1`, [id]);
  return fromDb(r.rows[0]);
}

async function create(db, input, clinicId) {
  const performedAt = input.status === 'completed' ? input.date ?? new Date().toISOString() : null;
  const r = await db.query(
    `INSERT INTO treatments (clinic_id, patient_id, description, price, status, performed_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      clinicId, input.patientId,
      input.description, input.price, input.status, performedAt,
    ],
  );
  const created = fromDb(r.rows[0], input.materialsUsed);

  if (
    input.status === 'completed' &&
    Array.isArray(input.materialsUsed) &&
    input.materialsUsed.length > 0
  ) {
    // Bulk insert deduction rows.
    const values = [];
    const placeholders = [];
    let idx = 1;
    for (const m of input.materialsUsed) {
      values.push(
        clinicId, m.itemId, 'usage', -Math.abs(m.quantity),
        `Clinical Use: ${input.description}`, created.id,
      );
      placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
    }
    await db.query(
      `INSERT INTO inventory_transactions (clinic_id, item_id, type, quantity, reason, reference_id)
       VALUES ${placeholders.join(', ')}`,
      values,
    );
  }

  return created;
}

async function update(db, id, patch) {
  const sets = []; const params = [];
  const set = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  if (patch.description !== undefined) set('description', patch.description);
  if (patch.price !== undefined) set('price', patch.price);
  if (patch.status !== undefined) {
    set('status', patch.status);
    set('performed_at', patch.status === 'completed' ? patch.date ?? new Date().toISOString() : null);
  }
  if (sets.length === 0) return get(db, id);
  params.push(id);
  const r = await db.query(
    `UPDATE treatments SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return fromDb(r.rows[0]);
}

async function cancel(db, id) {
  await db.query(`UPDATE treatments SET status = 'canceled' WHERE id = $1`, [id]);
}

module.exports = { list, get, create, update, cancel };
