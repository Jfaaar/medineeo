-- ============================================
-- 0013_certificates.sql
-- Structured medical certificates (sick leave / fitness / school-work /
-- travel / other) — same shape as prescriptions: a clinic-scoped record tied
-- to a patient + doctor, kept permanently in the patient's history, with a
-- printable view on the frontend. Fills in the 'certificates' feature key
-- seeded (but never backed by a real table) in 0012_core_feature_keys.sql.
-- ============================================

DO $$ BEGIN
  CREATE TYPE certificate_type AS ENUM ('sick_leave', 'fitness', 'school_work', 'travel', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type certificate_type NOT NULL DEFAULT 'sick_leave',
  reason TEXT,                     -- optional diagnosis/motive (medical secrecy — often left blank)
  start_date DATE,                 -- rest/validity start (sick_leave, travel, ...)
  end_date DATE,                   -- rest/validity end
  rest_days INT,                   -- denormalized convenience for sick_leave; editable independent of dates
  content TEXT,                    -- the actual certificate body text, as drafted/edited by the doctor
                                    -- at creation time (in whatever language the app was in) — printed
                                    -- verbatim, never regenerated later, so historical certificates don't
                                    -- reword themselves if the suggested-text templates change.
  notes TEXT,
  signed_at TIMESTAMPTZ,           -- non-null = locked, mirrors clinical_notes/prescriptions
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_certificates_patient ON certificates(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_clinic ON certificates(clinic_id);
CREATE TRIGGER trg_certificates_updated BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS — mirrors the generic tenant-scope pattern from 0003 ───────────────
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "certificates_select" ON certificates;
CREATE POLICY "certificates_select" ON certificates FOR SELECT
  USING (is_super_admin() OR clinic_id = current_clinic_id());

DROP POLICY IF EXISTS "certificates_insert" ON certificates;
CREATE POLICY "certificates_insert" ON certificates FOR INSERT
  WITH CHECK (is_super_admin() OR clinic_id = current_clinic_id());

DROP POLICY IF EXISTS "certificates_update" ON certificates;
CREATE POLICY "certificates_update" ON certificates FOR UPDATE
  USING (is_super_admin() OR clinic_id = current_clinic_id())
  WITH CHECK (is_super_admin() OR clinic_id = current_clinic_id());

DROP POLICY IF EXISTS "certificates_delete" ON certificates;
CREATE POLICY "certificates_delete" ON certificates FOR DELETE
  USING (is_super_admin() OR clinic_id = current_clinic_id());

-- Now that a dedicated permission exists (see backend/lib/rolePermissions.js),
-- point the feature catalog at it instead of the generic documents.view.
UPDATE feature_definitions SET default_permission = 'certificates.view'
 WHERE feature_key = 'certificates';
