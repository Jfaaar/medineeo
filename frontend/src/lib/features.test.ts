// Regression test for the dental-pack removal: the feature catalog and
// permission matrix used to carry dentalChart/perioChart/endoChart/orthoModule
// (and dentalChart.view/.update). Lock in that they're gone so a future
// change can't silently reintroduce a dental-only module.
import { describe, it, expect } from 'vitest';
import { FEATURE_KEYS } from './features';
import { hasPermission } from './permissions';

describe('FEATURE_KEYS', () => {
  it('no longer lists dental-only feature keys', () => {
    for (const key of ['dentalChart', 'perioChart', 'endoChart', 'orthoModule']) {
      expect(FEATURE_KEYS).not.toContain(key);
    }
  });
});

describe('permissions', () => {
  it('no role is granted the removed dentalChart.view/.update permissions', () => {
    // Cast through `unknown` — the whole point is that these strings are no
    // longer valid `Permission` values, so this wouldn't typecheck otherwise.
    const removed = ['dentalChart.view', 'dentalChart.update'] as unknown as Parameters<
      typeof hasPermission
    >[1][];
    for (const role of ['clinic_admin', 'doctor', 'assistant'] as const) {
      for (const permission of removed) {
        expect(hasPermission(role, permission)).toBe(false);
      }
    }
  });
});
