// Auth gates + zod sanity checks across the final Phase 3 cluster:
// clinical (notes), insurance, settings, stats.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import request from 'supertest';

const require = createRequire(import.meta.url);

let app;

beforeAll(() => {
  const mod = require('../index.js');
  app = mod.createApp();
});

describe('Auth gates on final cluster', () => {
  it.each([
    '/api/v1/clinical/notes',
    '/api/v1/insurance/providers',
    '/api/v1/insurance/policies',
    '/api/v1/insurance/claims',
    '/api/v1/settings',
    '/api/v1/stats/dashboard',
    '/api/v1/stats/revenue',
  ])('GET %s returns 401 unauthenticated', async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('Zod clinical validation', () => {
  it('clinicalNoteCreateSchema requires patientId + doctorId', () => {
    const { clinicalNoteCreateSchema } = require('../validation/clinical.js');
    expect(clinicalNoteCreateSchema.safeParse({}).success).toBe(false);
    expect(
      clinicalNoteCreateSchema.safeParse({ patientId: 'p1', doctorId: 'd1' }).success
    ).toBe(true);
  });

});

describe('Zod insurance validation', () => {
  it('policyCreateSchema requires patientId', () => {
    const { policyCreateSchema } = require('../validation/insurance.js');
    expect(policyCreateSchema.safeParse({}).success).toBe(false);
    expect(policyCreateSchema.safeParse({ patientId: 'p1' }).success).toBe(true);
  });

  it('claimCreateSchema requires patientId + status', () => {
    const { claimCreateSchema } = require('../validation/insurance.js');
    expect(claimCreateSchema.safeParse({}).success).toBe(false);
    expect(
      claimCreateSchema.safeParse({ patientId: 'p1', status: 'submitted' }).success
    ).toBe(true);
  });

  it('rejects unknown claim status', () => {
    const { claimCreateSchema } = require('../validation/insurance.js');
    expect(
      claimCreateSchema.safeParse({ patientId: 'p1', status: 'pending' }).success
    ).toBe(false);
  });
});

describe('Zod settings validation', () => {
  it('clinicSettingsUpdateSchema accepts partial inputs', () => {
    const { clinicSettingsUpdateSchema } = require('../validation/settings.js');
    expect(clinicSettingsUpdateSchema.safeParse({}).success).toBe(true);
    expect(
      clinicSettingsUpdateSchema.safeParse({ currency: 'EUR', defaultAppointmentMinutes: 45 })
        .success
    ).toBe(true);
  });

  it('rejects negative invoiceSeq', () => {
    const { clinicSettingsUpdateSchema } = require('../validation/settings.js');
    expect(
      clinicSettingsUpdateSchema.safeParse({ invoiceSeq: -1 }).success
    ).toBe(false);
  });
});
