// Referral letters — pg. Same shape as certificatesRepository: a clinic-scoped
// header row per referral, kept permanently for the patient's history.

const COLS = {
  doctorId: 'doctor_id',
  recipientSpecialty: 'recipient_specialty',
  recipientName: 'recipient_name',
  urgency: 'urgency',
  reason: 'reason',
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
    recipientSpecialty: row.recipient_specialty,
    recipientName: row.recipient_name ?? undefined,
    urgency: row.urgency,
    reason: row.reason ?? undefined,
    content: row.content ?? undefined,
    notes: row.notes ?? undefined,
    signedAt: row.signed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = `r.*, p.full_name AS patient_full_name`;
const FROM_JOIN = `referrals r LEFT JOIN patients p ON p.id = r.patient_id`;

async function list(db, { page = 0, pageSize = 50, patientId }) {
  const where = []; const params = [];
  if (patientId) { params.push(patientId); where.push(`r.patient_id = $${params.length}`); }
  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(pageSize); const limitIdx = params.length;
  params.push(page * pageSize); const offsetIdx = params.length;

  const dataSQL = `SELECT ${SELECT} FROM ${FROM_JOIN} ${whereSQL} ORDER BY r.created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
  const countParams = params.slice(0, params.length - 2);
  const countSQL = `SELECT COUNT(*)::int AS count FROM referrals r ${whereSQL}`;
  const [d, c] = await Promise.all([db.query(dataSQL, params), db.query(countSQL, countParams)]);
  return { data: d.rows.map(fromDb), page, pageSize, total: c.rows[0].count };
}

async function get(db, id) {
  const r = await db.query(`SELECT ${SELECT} FROM ${FROM_JOIN} WHERE r.id = $1`, [id]);
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
    `INSERT INTO referrals (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`,
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
  await db.query(`UPDATE referrals SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return get(db, id);
}

async function sign(db, id) {
  await db.query(`UPDATE referrals SET signed_at = NOW() WHERE id = $1 AND signed_at IS NULL`, [id]);
  return get(db, id);
}

async function remove(db, id) {
  await db.query(`DELETE FROM referrals WHERE id = $1`, [id]);
}

module.exports = { list, get, create, update, sign, remove };
