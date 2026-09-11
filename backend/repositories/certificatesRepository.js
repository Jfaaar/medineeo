// Medical certificates — pg. Same shape as prescriptionsRepository: a
// clinic-scoped header row per certificate, kept permanently for the
// patient's history (no delete-on-print or expiry).

const COLS = {
  doctorId: 'doctor_id',
  type: 'type',
  reason: 'reason',
  startDate: 'start_date',
  endDate: 'end_date',
  restDays: 'rest_days',
  content: 'content',
  notes: 'notes',
};

function fromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    patientName: row.patient_full_name ?? undefined,
    doctorId: row.doctor_id ?? undefined,
    type: row.type,
    reason: row.reason ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    restDays: row.rest_days ?? undefined,
    content: row.content ?? undefined,
    notes: row.notes ?? undefined,
    signedAt: row.signed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = `c.*, p.full_name AS patient_full_name`;
const FROM_JOIN = `certificates c LEFT JOIN patients p ON p.id = c.patient_id`;

async function list(db, { page = 0, pageSize = 50, patientId }) {
  const where = []; const params = [];
  if (patientId) { params.push(patientId); where.push(`c.patient_id = $${params.length}`); }
  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(pageSize); const limitIdx = params.length;
  params.push(page * pageSize); const offsetIdx = params.length;

  const dataSQL = `SELECT ${SELECT} FROM ${FROM_JOIN} ${whereSQL} ORDER BY c.created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
  const countParams = params.slice(0, params.length - 2);
  const countSQL = `SELECT COUNT(*)::int AS count FROM certificates c ${whereSQL}`;
  const [d, c] = await Promise.all([db.query(dataSQL, params), db.query(countSQL, countParams)]);
  return { data: d.rows.map(fromDb), page, pageSize, total: c.rows[0].count };
}

async function get(db, id) {
  const r = await db.query(`SELECT ${SELECT} FROM ${FROM_JOIN} WHERE c.id = $1`, [id]);
  return fromDb(r.rows[0]);
}

async function create(db, input, clinicId) {
  const cols = ['clinic_id', 'patient_id'];
  const vals = [clinicId, input.patientId];
  for (const [k, col] of Object.entries(COLS)) {
    if (input[k] !== undefined) {
      cols.push(col);
      vals.push(input[k] ?? null);
    }
  }
  const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
  const r = await db.query(
    `INSERT INTO certificates (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`,
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
  await db.query(`UPDATE certificates SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return get(db, id);
}

async function sign(db, id) {
  await db.query(`UPDATE certificates SET signed_at = NOW() WHERE id = $1 AND signed_at IS NULL`, [id]);
  return get(db, id);
}

async function remove(db, id) {
  await db.query(`DELETE FROM certificates WHERE id = $1`, [id]);
}

module.exports = { list, get, create, update, sign, remove };
