-- ============================================
-- 0011_feature_access.sql
-- Specialty-driven feature access + per-clinic role permission overrides.
--
-- Three tables:
--   1. feature_definitions      — global catalog (seeded). Each row: feature_key,
--                                 display_name, default_specialties[], default_permission,
--                                 category, sort_order.
--   2. clinic_feature_overrides — per-clinic forced on/off. Absence means
--                                 "follow default_specialties ∩ enabled_specialties".
--   3. role_permission_overrides — per-clinic deltas over the static ROLE_PERMISSIONS
--                                 matrix (grant or revoke per role/permission).
--
-- Effective feature-enabled for (clinic, key):
--   override.enabled            IF override row exists
--   feature_definitions.default_specialties && clinic_settings.enabled_specialties
--                               OTHERWISE  (empty default_specialties = never auto-on)
--
-- Effective permission for (clinic, role, permission):
--   override.granted            IF override row exists
--   ROLE_PERMISSIONS[role]      OTHERWISE  (resolved in app layer)
-- ============================================

-- ─── feature_definitions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_definitions (
  feature_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  default_specialties TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  default_permission TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('clinical','operations','admin')),
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feature_definitions_specialties_chk CHECK (
    default_specialties <@ ARRAY[
      'general_practice','dental','pediatrics','gynecology','cardiology',
      'dermatology','ent','ophthalmology','orthopedics','psychiatry','other'
    ]
  )
);
CREATE TRIGGER trg_feature_definitions_updated BEFORE UPDATE ON feature_definitions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── clinic_feature_overrides ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_feature_overrides (
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL REFERENCES feature_definitions(feature_key) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (clinic_id, feature_key)
);
CREATE INDEX IF NOT EXISTS idx_clinic_feature_overrides_clinic ON clinic_feature_overrides(clinic_id);
CREATE TRIGGER trg_clinic_feature_overrides_updated BEFORE UPDATE ON clinic_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── role_permission_overrides ───────────────────────────────────────────────
-- granted = true  → role gains this permission in this clinic
-- granted = false → role loses it (even if static matrix grants it)
-- super_admin is intentionally excluded — it always has '*'.
CREATE TABLE IF NOT EXISTS role_permission_overrides (
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('clinic_admin','doctor','assistant')),
  permission TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (clinic_id, role, permission)
);
CREATE INDEX IF NOT EXISTS idx_role_perm_overrides_clinic_role
  ON role_permission_overrides(clinic_id, role);
CREATE TRIGGER trg_role_perm_overrides_updated BEFORE UPDATE ON role_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- feature_definitions is a global catalog (no clinic_id) — readable by any
-- authenticated user, mutable by super_admin only. Keep RLS off; app layer
-- enforces the write path.
--
-- The two override tables are tenant-scoped — mirror the 0003 pattern.
DO $$
DECLARE
  t TEXT;
  scoped TEXT[] := ARRAY['clinic_feature_overrides','role_permission_overrides'];
BEGIN
  FOREACH t IN ARRAY scoped LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON %I', t, t);
    EXECUTE format($p$
      CREATE POLICY "%1$s_select" ON %1$I FOR SELECT
        USING (is_super_admin() OR clinic_id = current_clinic_id())
    $p$, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON %I', t, t);
    EXECUTE format($p$
      CREATE POLICY "%1$s_insert" ON %1$I FOR INSERT
        WITH CHECK (is_super_admin() OR clinic_id = current_clinic_id())
    $p$, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON %I', t, t);
    EXECUTE format($p$
      CREATE POLICY "%1$s_update" ON %1$I FOR UPDATE
        USING (is_super_admin() OR clinic_id = current_clinic_id())
        WITH CHECK (is_super_admin() OR clinic_id = current_clinic_id())
    $p$, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON %I', t, t);
    EXECUTE format($p$
      CREATE POLICY "%1$s_delete" ON %1$I FOR DELETE
        USING (is_super_admin() OR clinic_id = current_clinic_id())
    $p$, t);
  END LOOP;
END $$;

-- ─── Seed feature_definitions ────────────────────────────────────────────────
-- Specialty mapping rules (per the "specialty-gate everything" policy):
--   • Operational / admin features list every specialty so they appear by
--     default in any clinic (and disappear only if a clinic narrows its
--     enabled_specialties or explicitly overrides off).
--   • Specialty-specific clinical modules list only the specialties they fit:
--       - vitals, problemList, bodyRegionChart → all specialties
--       - vaccinations       → general_practice, pediatrics
--
-- ON CONFLICT DO UPDATE makes this re-runnable as the catalog evolves.
INSERT INTO feature_definitions
  (feature_key, display_name, description, default_specialties, default_permission, category, sort_order)
VALUES
  -- Overview / scheduling (always relevant)
  ('dashboard',       'Dashboard',         'Clinic-wide stats overview',
     ARRAY['general_practice','dental','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'settings.view', 'operations', 10),
  ('calendar',        'Calendar',          'Appointment scheduling',
     ARRAY['general_practice','dental','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'appointments.view', 'operations', 20),
  ('waitingRoom',     'Waiting room',      'Check-in queue',
     ARRAY['general_practice','dental','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'appointments.view', 'operations', 30),
  ('patients',        'Patients',          'Patient directory and records',
     ARRAY['general_practice','dental','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'patients.view', 'clinical', 40),

  -- Specialty-specific clinical modules
  ('vitals',          'Vital signs',       'BP, HR, temperature, SpO2, BMI tracking',
     ARRAY['general_practice','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'clinical.view', 'clinical', 60),
  ('problemList',     'Problem list',      'ICD-10 chronic and active problems',
     ARRAY['general_practice','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'clinical.view', 'clinical', 70),
  ('bodyRegionChart', 'Body region chart', 'Body-region findings (non-dental visual chart)',
     ARRAY['general_practice','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'clinical.view', 'clinical', 80),
  ('vaccinations',    'Vaccinations',      'Immunization history and schedules',
     ARRAY['general_practice','pediatrics'],
     'clinical.view', 'clinical', 90),

  -- Treatment / prescription / insurance (all specialties)
  ('treatments',      'Treatment plans',   'Plan items, status, conversion to invoices',
     ARRAY['general_practice','dental','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'treatments.view', 'clinical', 100),
  ('prescriptions',   'Prescriptions',     'Rx editor and history',
     ARRAY['general_practice','dental','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'prescriptions.view', 'clinical', 110),
  ('insurance',       'Insurance',         'Policies, claims, reimbursements',
     ARRAY['general_practice','dental','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'insurance.view', 'operations', 120),

  -- Operations
  ('invoices',        'Invoices',          'Billing, payments, refunds',
     ARRAY['general_practice','dental','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'invoices.view', 'operations', 130),
  ('inventory',       'Inventory',         'Stock, suppliers, purchase orders',
     ARRAY['general_practice','dental','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'inventory.view', 'operations', 140),
  ('medicaments',     'Medicament catalog','Drug search and references',
     ARRAY['general_practice','dental','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'prescriptions.view', 'operations', 150),
  ('documents',       'Documents',         'Radiology / file uploads',
     ARRAY['general_practice','dental','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'documents.view', 'operations', 160),
  ('reports',         'Reports',           'Financial and clinical reports',
     ARRAY['general_practice','dental','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'reports.view', 'operations', 170),

  -- Admin
  ('team',            'Team',              'Staff and invitations',
     ARRAY['general_practice','dental','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'team.view', 'admin', 200),
  ('settings',        'Settings',          'Clinic-wide configuration',
     ARRAY['general_practice','dental','pediatrics','gynecology','cardiology','dermatology','ent','ophthalmology','orthopedics','psychiatry','other'],
     'settings.view', 'admin', 210)
ON CONFLICT (feature_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_specialties = EXCLUDED.default_specialties,
  default_permission = EXCLUDED.default_permission,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;
