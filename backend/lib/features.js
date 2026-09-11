// Canonical feature catalog (mirrors backend/db/migrations/0011_feature_access.sql seed).
// The DB is the source of truth at runtime; this file exists so middleware can
// reason about feature keys without a DB round-trip and so tests can assert the
// catalog without spinning up Postgres.

const FEATURE_KEYS = [
  'dashboard',
  'calendar',
  'waitingRoom',
  'patients',
  'clinicalNotes',
  'allergies',
  'medicationList',
  'vitals',
  'problemList',
  'bodyRegionChart',
  'vaccinations',
  'treatments',
  'prescriptions',
  'quotes',
  'insurance',
  'invoices',
  'inventory',
  'medicaments',
  'documents',
  'reports',
  'certificates',
  'referrals',
  'team',
  'settings',
];

const FEATURE_KEY_SET = new Set(FEATURE_KEYS);

function isFeatureKey(value) {
  return typeof value === 'string' && FEATURE_KEY_SET.has(value);
}

module.exports = { FEATURE_KEYS, isFeatureKey };
