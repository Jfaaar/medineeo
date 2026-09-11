// Lazy seeder for a pack's clinic-scoped defaults.
//
// Called from settingsService.updateSettings whenever the clinic's
// enabled_specialties array *grows*. Each entry in the registry receives
// the db connection and clinic_id and idempotently inserts that pack's seed
// rows. A handler throwing must not fail the settings update — seeds are
// best-effort — so each is run inside a try/catch here.
//
// Never act on a *removal* of a specialty — keep historical data; the
// feature gate alone stops surfacing it.

// ─── No-op handlers for packs whose seeds haven't been written yet ──────────
function noopSeeder(code) {
  return async function seed(_db, clinicId) {
    console.log(
      `[specialtyDefaultsSeeder] no-op seed for specialty '${code}' on clinic ${clinicId} ` +
      `(replace with pack defaults in the corresponding Phase-N migration)`,
    );
  };
}

const SPECIALTY_SEEDERS = {
  general_practice: noopSeeder('general_practice'),
  dental:           noopSeeder('dental'),
  pediatrics:       noopSeeder('pediatrics'),
  gynecology:       noopSeeder('gynecology'),
  cardiology:       noopSeeder('cardiology'),
  dermatology:      noopSeeder('dermatology'),
  ent:              noopSeeder('ent'),
  ophthalmology:    noopSeeder('ophthalmology'),
  orthopedics:      noopSeeder('orthopedics'),
  psychiatry:       noopSeeder('psychiatry'),
  other:            noopSeeder('other'),
};

async function seedSpecialtyDefaults(db, clinicId, addedCodes) {
  for (const code of addedCodes) {
    const seeder = SPECIALTY_SEEDERS[code];
    if (!seeder) continue;
    try {
      await seeder(db, clinicId);
    } catch (err) {
      // Best-effort — never let a seed failure roll back the settings update.
      console.error(`[specialtyDefaultsSeeder] seed for '${code}' failed:`, err.message);
    }
  }
}

module.exports = { seedSpecialtyDefaults, SPECIALTY_SEEDERS };
