// Regression suite for the dental-pack removal (branch fix/switch_to_general_erp).
// Locks in the contract so a future change can't silently reintroduce
// dental-specific routes, feature keys, permissions, or schema fields.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const require = createRequire(import.meta.url);
const { getPool, closePool } = require('../db/pg.js');

// Fixtures seeded by backend/db/init/99_dev_seed.sql + 99c_dev_seed_rich.sql —
// these tests run against the shared dev Postgres (see CLAUDE.md), same as
// every other backend test file.
const CLINIC_ID = '00000000-0000-0000-0000-0000000000c1';
const PATIENT_ID = '00000000-0000-0000-0000-0000000001a1'; // Alice Demo
const DOCTOR_ID = '00000000-0000-0000-0000-000000000002'; // Dr. Hakim

let app;
let authHeader;
let pool;

beforeAll(() => {
  const mod = require('../index.js');
  app = mod.createApp();
  pool = getPool();

  // authenticateToken() falls back to the real JWT path under NODE_ENV=test
  // (see backend/middleware/auth.js devAuthEnabled()), so an authenticated
  // request is needed to actually reach route matching — an unauthenticated
  // one gets stopped earlier by an unrelated router's blanket auth gate and
  // would 401 regardless of whether the dental path exists.
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-dental-removal';
  authHeader = `Bearer ${jwt.sign(
    {
      sub: 'test-user',
      email: 'test@example.com',
      role: 'clinic_admin',
      clinic_id: CLINIC_ID,
    },
    process.env.JWT_SECRET,
  )}`;
});

afterAll(async () => {
  await closePool();
});

describe('Dental pack routes no longer exist', () => {
  it.each([
    '/api/v1/dental/perio',
    '/api/v1/dental/endo',
    '/api/v1/dental/ortho/episodes',
    '/api/v1/dental/lab-cases',
    '/api/v1/clinical/dental-chart',
  ])('GET %s 404s even for an authenticated clinic_admin', async (path) => {
    const res = await request(app).get(path).set('Authorization', authHeader);
    expect(res.status).toBe(404);
  });

  it.each([
    '/api/v1/dental/perio',
    '/api/v1/clinical/dental-chart',
  ])('GET %s 401s when unauthenticated (never leaks a 200/500 either)', async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(401);
  });
});

describe('Dental feature keys and permissions are gone', () => {
  it('FEATURE_KEYS no longer lists dentalChart/perioChart/endoChart/orthoModule', () => {
    const { FEATURE_KEYS } = require('../lib/features.js');
    for (const key of ['dentalChart', 'perioChart', 'endoChart', 'orthoModule']) {
      expect(FEATURE_KEYS).not.toContain(key);
    }
  });

  it('ALL_PERMISSIONS no longer lists dentalChart.view/.update', () => {
    const { ALL_PERMISSIONS } = require('../lib/rolePermissions.js');
    expect(ALL_PERMISSIONS).not.toContain('dentalChart.view');
    expect(ALL_PERMISSIONS).not.toContain('dentalChart.update');
  });

  it('specialtyDefaultsSeeder no longer exports a dental catalog', () => {
    const seeder = require('../services/specialtyDefaultsSeeder.js');
    expect(seeder.DENTAL_CATALOG).toBeUndefined();
    expect(seeder.DENTAL_CATEGORY).toBeUndefined();
  });
});

describe('tooth/surface are stripped from treatment schemas', () => {
  it('treatmentCreateSchema drops an unknown tooth/surface field', () => {
    const { treatmentCreateSchema } = require('../validation/treatments.js');
    const parsed = treatmentCreateSchema.parse({
      patientId: 'p1',
      description: 'Physio session',
      price: 100,
      status: 'planned',
      tooth: '11',
      surface: 'occlusal',
    });
    expect(parsed).not.toHaveProperty('tooth');
    expect(parsed).not.toHaveProperty('surface');
  });

  it('planItemCreateSchema drops an unknown tooth/surface field', () => {
    const { planItemCreateSchema } = require('../validation/treatmentPlans.js');
    const parsed = planItemCreateSchema.parse({
      description: 'Item',
      price: 50,
      tooth: '21',
      surface: 'mesial',
    });
    expect(parsed).not.toHaveProperty('tooth');
    expect(parsed).not.toHaveProperty('surface');
  });
});

describe('DB schema no longer carries dental-only structures', () => {
  it('dental_chart_entries table does not exist', async () => {
    const r = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables WHERE table_name = 'dental_chart_entries'
       ) AS exists`,
    );
    expect(r.rows[0].exists).toBe(false);
  });

  it('treatments table has no tooth/surface columns', async () => {
    const r = await pool.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'treatments' AND column_name IN ('tooth', 'surface')`,
    );
    expect(r.rows).toEqual([]);
  });

  it('inventory_type enum no longer includes dental_material', async () => {
    const r = await pool.query(`SELECT unnest(enum_range(NULL::inventory_type))::text AS v`);
    const values = r.rows.map((row) => row.v);
    expect(values).toEqual(['medicament', 'consumable', 'equipment']);
  });

  it('perio/endo/ortho/dental-lab tables do not exist', async () => {
    const r = await pool.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_name IN ('perio_charts', 'perio_sites', 'endo_records', 'ortho_episodes', 'ortho_visits', 'dental_lab_cases')`,
    );
    expect(r.rows).toEqual([]);
  });
});

// ─── End-to-end round trips ───────────────────────────────────────────────
// The tests above only prove the schema/zod/route surface is clean. These
// exercise the full controller → service → repository → Postgres path with a
// real authenticated request, which is what actually would have caught a
// broken column reference (e.g. a stray `tooth` in an INSERT list) after the
// migrations were hand-edited.

describe('Treatments round-trip with no tooth/surface', () => {
  let createdId;

  afterAll(async () => {
    if (createdId) await pool.query('DELETE FROM treatments WHERE id = $1', [createdId]);
  });

  it('POST /api/v1/treatments ignores a client-sent tooth/surface and persists cleanly', async () => {
    const res = await request(app)
      .post('/api/v1/treatments')
      .set('Authorization', authHeader)
      .send({
        patientId: PATIENT_ID,
        description: 'Physical therapy session',
        price: 250,
        status: 'planned',
        tooth: '11', // should be silently dropped, not cause a 500
        surface: 'occlusal',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeTruthy();
    expect(res.body.data).not.toHaveProperty('tooth');
    expect(res.body.data).not.toHaveProperty('surface');
    createdId = res.body.data.id;
  });

  it('GET /api/v1/treatments/:id reads back the same row with no tooth/surface', async () => {
    const res = await request(app)
      .get(`/api/v1/treatments/${createdId}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('Physical therapy session');
    expect(res.body.data).not.toHaveProperty('tooth');
    expect(res.body.data).not.toHaveProperty('surface');
  });
});

describe('Treatment plan items + convert-to-appointments with no tooth', () => {
  let planId;
  let itemId;
  let createdAppointmentIds = [];

  afterAll(async () => {
    if (createdAppointmentIds.length) {
      await pool.query('DELETE FROM appointments WHERE id = ANY($1::uuid[])', [
        createdAppointmentIds,
      ]);
    }
    if (itemId) await pool.query('DELETE FROM treatments WHERE id = $1', [itemId]);
    if (planId) await pool.query('DELETE FROM treatment_plans WHERE id = $1', [planId]);
  });

  it('creates a plan and adds an item, dropping tooth/surface', async () => {
    const planRes = await request(app)
      .post('/api/v1/treatment-plans')
      .set('Authorization', authHeader)
      .send({ patientId: PATIENT_ID, title: 'Regression test plan' });
    expect(planRes.status).toBe(201);
    planId = planRes.body.data.id;

    const itemRes = await request(app)
      .post(`/api/v1/treatment-plans/${planId}/items`)
      .set('Authorization', authHeader)
      .send({ description: 'Consult', price: 100, tooth: '26', surface: 'mesial' });
    expect(itemRes.status).toBe(201);
    expect(itemRes.body.data).not.toHaveProperty('tooth');
    expect(itemRes.body.data).not.toHaveProperty('surface');
    itemId = itemRes.body.data.id;

    const listRes = await request(app)
      .get(`/api/v1/treatment-plans/${planId}/items`)
      .set('Authorization', authHeader);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0]).not.toHaveProperty('tooth');
  });

  it('convert-to-appointments builds the observation string without a tooth reference', async () => {
    const res = await request(app)
      .post(`/api/v1/treatment-plans/${planId}/convert-to-appointments`)
      .set('Authorization', authHeader)
      .send({ startDate: new Date(Date.now() + 86_400_000).toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.data.appointments).toHaveLength(1);
    createdAppointmentIds = res.body.data.appointments;

    const r = await pool.query('SELECT observation FROM appointments WHERE id = $1', [
      createdAppointmentIds[0],
    ]);
    expect(r.rows[0].observation).toBe('[Plan] Consult');
    expect(r.rows[0].observation).not.toMatch(/tooth/i);
  });
});

describe('Clinical notes still work after the dental-chart split (routes/clinicalController/clinicalService/validation)', () => {
  let noteId;

  it('creates, signs, and locks a note; cleans up after itself', async () => {
    const createRes = await request(app)
      .post('/api/v1/clinical/notes')
      .set('Authorization', authHeader)
      .send({ patientId: PATIENT_ID, doctorId: DOCTOR_ID, notes: 'Regression test note' });
    expect(createRes.status).toBe(201);
    noteId = createRes.body.data.id;
    expect(createRes.body.data.signedAt).toBeFalsy();

    const signRes = await request(app)
      .post(`/api/v1/clinical/notes/${noteId}/sign`)
      .set('Authorization', authHeader);
    expect(signRes.status).toBe(200);
    expect(signRes.body.data.signedAt).toBeTruthy();

    const lockedUpdateRes = await request(app)
      .put(`/api/v1/clinical/notes/${noteId}`)
      .set('Authorization', authHeader)
      .send({ notes: 'Should be rejected' });
    expect(lockedUpdateRes.status).toBe(400);
    expect(lockedUpdateRes.body.error.code).toBe('NOTE_LOCKED');

    const deleteRes = await request(app)
      .delete(`/api/v1/clinical/notes/${noteId}`)
      .set('Authorization', authHeader);
    expect(deleteRes.status).toBe(204);
    noteId = undefined;
  });

  afterAll(async () => {
    if (noteId) await pool.query('DELETE FROM clinical_notes WHERE id = $1', [noteId]);
  });
});

describe('specialtyDefaultsSeeder no longer seeds dental inventory', () => {
  it('seeding the dental specialty is a real no-op, not just a missing export', async () => {
    const { seedSpecialtyDefaults } = require('../services/specialtyDefaultsSeeder.js');
    const before = await pool.query(
      'SELECT COUNT(*)::int AS n FROM inventory_items WHERE clinic_id = $1',
      [CLINIC_ID],
    );
    await seedSpecialtyDefaults(pool, CLINIC_ID, ['dental']);
    const after = await pool.query(
      'SELECT COUNT(*)::int AS n FROM inventory_items WHERE clinic_id = $1',
      [CLINIC_ID],
    );
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });
});

describe('requireFeature rejects the removed dental feature keys', () => {
  it('throws synchronously for an unknown feature_key instead of silently gating nothing', () => {
    const { requireFeature } = require('../middleware/featureGuard.js');
    for (const key of ['dentalChart', 'perioChart', 'endoChart', 'orthoModule']) {
      expect(() => requireFeature(key)).toThrow(/unknown feature_key/);
    }
  });
});
