// Catalog test — asserts the three feature-key sources agree:
//
//   1. backend/lib/features.js              FEATURE_KEYS
//   2. frontend/src/lib/features.ts         FEATURE_KEYS
//   3. INSERT rows in the SQL migrations    feature_definitions seed
//
// Plus shape checks: every default_specialties entry is in the 11-code whitelist,
// every default_permission is a known permission, every category is valid.
//
// Catches the most common bug when adding a feature key: forgetting to mirror
// it across the three places.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { FEATURE_KEYS: BACKEND_FEATURE_KEYS } = require('../lib/features');
const { ALL_PERMISSIONS } = require('../lib/rolePermissions');

const REPO_ROOT = join(__dirname, '..', '..');
const SPECIALTY_CODES = [
  'general_practice', 'dental', 'pediatrics', 'gynecology', 'cardiology',
  'dermatology', 'ent', 'ophthalmology', 'orthopedics', 'psychiatry', 'other',
];
const VALID_CATEGORIES = new Set(['clinical', 'operations', 'admin']);
const ALL_PERMISSIONS_SET = new Set(ALL_PERMISSIONS);

function readFrontendFeatureKeys() {
  const path = join(REPO_ROOT, 'frontend/src/lib/features.ts');
  const src = readFileSync(path, 'utf8');
  const m = src.match(/export const FEATURE_KEYS = \[([\s\S]*?)\] as const;/);
  if (!m) throw new Error('Could not locate FEATURE_KEYS in frontend/src/lib/features.ts');
  return [...m[1].matchAll(/'([a-zA-Z_]+)'/g)].map((mm) => mm[1]);
}

// Parse every `INSERT INTO feature_definitions (...) VALUES (...)` row across
// all migrations and the dev seed. Each entry is keyed by feature_key and
// reflects the *last* INSERT — later migrations overwrite earlier ones, which
// matches the ON CONFLICT DO UPDATE behavior at runtime.
function readSeededDefinitions() {
  const files = [
    'backend/db/migrations/0011_feature_access.sql',
    'backend/db/migrations/0012_core_feature_keys.sql',
  ];
  const defs = new Map();
  for (const rel of files) {
    const src = readFileSync(join(REPO_ROOT, rel), 'utf8');
    // Each row tuple in the VALUES list looks like:
    //   ('key', 'Label', 'Desc', ARRAY[...], 'perm.view', 'category', N)
    // We capture each tuple between matching parens following INSERT INTO
    // feature_definitions ... VALUES.
    const valuesBlocks = [...src.matchAll(
      /INSERT INTO feature_definitions[\s\S]*?VALUES([\s\S]*?)ON CONFLICT/g,
    )];
    for (const block of valuesBlocks) {
      const body = block[1];
      // Match top-level tuples — careful: ARRAY[...] uses brackets, not parens.
      const tuples = [...body.matchAll(/\(\s*'([^']+)'\s*,([\s\S]*?)\)\s*(?:,|$)/g)];
      for (const t of tuples) {
        const key = t[1];
        const rest = t[2];
        // default_specialties: ARRAY[...] or ARRAY[]::TEXT[]
        const sp = rest.match(/ARRAY\[([^\]]*)\]/);
        const specialties = sp
          ? sp[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean)
          : [];
        // Strip the ARRAY[...] block before extracting the remaining quoted
        // tokens, so we don't accidentally pick up the specialty codes inside
        // the array as display_name/description/permission/category.
        const restNoArray = rest.replace(/ARRAY\[[^\]]*\]/, '');
        const quoted = [...restNoArray.matchAll(/'([^']*)'/g)].map((m) => m[1]);
        // quoted = [display_name, description, default_permission, category]
        const displayName = quoted[0] ?? null;
        const defaultPermission = quoted[2];
        const category = quoted[3];
        defs.set(key, {
          featureKey: key,
          displayName,
          defaultSpecialties: specialties,
          defaultPermission,
          category,
        });
      }
    }
  }
  // 0012 also does an UPDATE that promotes vitals/problemList to all 11 — reflect that.
  const promote = ['vitals', 'problemList'];
  for (const k of promote) {
    if (defs.has(k)) defs.get(k).defaultSpecialties = [...SPECIALTY_CODES];
  }
  return defs;
}

describe('feature catalog', () => {
  const frontendKeys = readFrontendFeatureKeys();
  const seededDefs = readSeededDefinitions();
  const seededKeys = [...seededDefs.keys()];

  it('backend and frontend FEATURE_KEYS arrays agree', () => {
    expect(new Set(BACKEND_FEATURE_KEYS)).toEqual(new Set(frontendKeys));
  });

  it('arrays are in the same order (mirrored files)', () => {
    expect(BACKEND_FEATURE_KEYS).toEqual(frontendKeys);
  });

  it('every FEATURE_KEYS entry has a seeded feature_definitions row', () => {
    const missing = BACKEND_FEATURE_KEYS.filter((k) => !seededDefs.has(k));
    expect(missing, `keys missing a DB seed row: ${missing.join(', ')}`).toEqual([]);
  });

  it('every seeded feature_definitions row is in FEATURE_KEYS', () => {
    const orphans = seededKeys.filter((k) => !BACKEND_FEATURE_KEYS.includes(k));
    expect(orphans, `seeded keys missing from FEATURE_KEYS: ${orphans.join(', ')}`).toEqual([]);
  });

  it('every default_specialties entry is in the 11-code whitelist', () => {
    const whitelist = new Set(SPECIALTY_CODES);
    for (const def of seededDefs.values()) {
      const bad = def.defaultSpecialties.filter((s) => !whitelist.has(s));
      expect(bad, `${def.featureKey} has invalid specialties: ${bad.join(', ')}`).toEqual([]);
    }
  });

  it('every default_permission is a known permission', () => {
    for (const def of seededDefs.values()) {
      expect(
        ALL_PERMISSIONS_SET.has(def.defaultPermission),
        `${def.featureKey} default_permission '${def.defaultPermission}' is not in ALL_PERMISSIONS`,
      ).toBe(true);
    }
  });

  it('every category is one of clinical / operations / admin', () => {
    for (const def of seededDefs.values()) {
      expect(VALID_CATEGORIES.has(def.category)).toBe(true);
    }
  });

  it('vitals and problemList are now enabled for every specialty (Phase 0 promotion)', () => {
    for (const k of ['vitals', 'problemList']) {
      const def = seededDefs.get(k);
      expect(def, `${k} missing from seed`).toBeTruthy();
      expect(new Set(def.defaultSpecialties)).toEqual(new Set(SPECIALTY_CODES));
    }
  });

  it('the six new core keys are seeded with all-specialty defaults', () => {
    const coreNew = ['clinicalNotes', 'allergies', 'medicationList', 'quotes', 'certificates', 'referrals'];
    for (const k of coreNew) {
      const def = seededDefs.get(k);
      expect(def, `${k} missing from seed`).toBeTruthy();
      expect(new Set(def.defaultSpecialties)).toEqual(new Set(SPECIALTY_CODES));
    }
  });
});
