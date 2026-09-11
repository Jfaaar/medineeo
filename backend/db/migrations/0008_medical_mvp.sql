-- ============================================
-- 0008_medical_mvp.sql
-- Pivot Dentflow → MediNEEO multi-specialty medical clinic.
--
-- 1. Specialty configuration on clinic_settings (default: general_practice).
-- 2. SOAP fields on clinical_notes (subjective/objective/assessment/plan).
-- 3. Four new tables: vital_signs, problem_list, vaccinations,
--    body_region_findings — each tenant-scoped with RLS mirroring 0003.
--
-- Gating happens in the application layer via a per-clinic
-- enabled_specialties array.
-- ============================================

-- ─── Specialty config on clinic_settings ─────────────────────────────────────
ALTER TABLE clinic_settings
  ADD COLUMN IF NOT EXISTS primary_specialty TEXT NOT NULL DEFAULT 'general_practice',
  ADD COLUMN IF NOT EXISTS enabled_specialties TEXT[] NOT NULL DEFAULT ARRAY['general_practice'];

-- Whitelist of allowed specialty codes. TEXT + CHECK is cheaper to evolve
-- than a Postgres ENUM (which makes array operations and value adds painful).
ALTER TABLE clinic_settings
  DROP CONSTRAINT IF EXISTS clinic_settings_primary_specialty_chk;
ALTER TABLE clinic_settings
  ADD CONSTRAINT clinic_settings_primary_specialty_chk CHECK (primary_specialty IN (
    'general_practice','dental','pediatrics','gynecology','cardiology',
    'dermatology','ent','ophthalmology','orthopedics','psychiatry','other'
  ));

ALTER TABLE clinic_settings
  DROP CONSTRAINT IF EXISTS clinic_settings_enabled_specialties_chk;
ALTER TABLE clinic_settings
  ADD CONSTRAINT clinic_settings_enabled_specialties_chk CHECK (
    cardinality(enabled_specialties) > 0
    AND enabled_specialties <@ ARRAY[
      'general_practice','dental','pediatrics','gynecology','cardiology',
      'dermatology','ent','ophthalmology','orthopedics','psychiatry','other'
    ]
  );

-- ─── SOAP fields on clinical_notes ───────────────────────────────────────────
-- Additive only; the existing free-form fields stay for legacy/dental notes.
ALTER TABLE clinical_notes
  ADD COLUMN IF NOT EXISTS subjective TEXT,
  ADD COLUMN IF NOT EXISTS objective TEXT,
  ADD COLUMN IF NOT EXISTS assessment TEXT,
  ADD COLUMN IF NOT EXISTS plan TEXT;

-- ─── Vital signs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vital_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  systolic_bp INT,
  diastolic_bp INT,
  heart_rate INT,
  temperature_c NUMERIC(4,1),
  respiratory_rate INT,
  spo2 INT,
  weight_kg NUMERIC(5,2),
  height_cm NUMERIC(5,2),
  bmi NUMERIC(4,1) GENERATED ALWAYS AS (
    CASE
      WHEN weight_kg IS NOT NULL AND height_cm IS NOT NULL AND height_cm > 0
        THEN ROUND((weight_kg / ((height_cm / 100.0) * (height_cm / 100.0)))::numeric, 1)
      ELSE NULL
    END
  ) STORED,
  pain_score INT CHECK (pain_score IS NULL OR (pain_score BETWEEN 0 AND 10)),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vitals_patient_time ON vital_signs(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vitals_clinic ON vital_signs(clinic_id);
CREATE TRIGGER trg_vitals_updated BEFORE UPDATE ON vital_signs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Problem list ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS problem_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  icd10_code TEXT,
  icd10_label TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','resolved','chronic','inactive')),
  onset_date DATE,
  resolved_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (icd10_code IS NOT NULL OR description IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_problems_patient ON problem_list(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_problems_clinic ON problem_list(clinic_id);
CREATE TRIGGER trg_problems_updated BEFORE UPDATE ON problem_list
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Vaccinations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vaccinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  administered_date DATE NOT NULL,
  dose_number INT,
  lot_number TEXT,
  manufacturer TEXT,
  site TEXT,                          -- e.g. left_deltoid, right_thigh
  route TEXT,                         -- e.g. IM, SC, oral, intranasal
  next_dose_date DATE,
  administered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vaccinations_patient ON vaccinations(patient_id, administered_date DESC);
CREATE INDEX IF NOT EXISTS idx_vaccinations_clinic ON vaccinations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_due ON vaccinations(next_dose_date)
  WHERE next_dose_date IS NOT NULL;
CREATE TRIGGER trg_vaccinations_updated BEFORE UPDATE ON vaccinations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Body region findings (replaces odontogram for non-dental clinics) ──────
CREATE TABLE IF NOT EXISTS body_region_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  region TEXT NOT NULL,               -- e.g. head, neck, chest, abdomen, back, upper_limb, lower_limb
  side TEXT CHECK (side IS NULL OR side IN ('left','right','center','bilateral')),
  finding TEXT NOT NULL,              -- e.g. tenderness, swelling, lesion
  severity TEXT,                      -- e.g. mild, moderate, severe
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_body_findings_patient ON body_region_findings(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_body_findings_clinic ON body_region_findings(clinic_id);
CREATE TRIGGER trg_body_findings_updated BEFORE UPDATE ON body_region_findings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS for the four new tables (mirrors the pattern in 0003) ──────────────
DO $$
DECLARE
  t TEXT;
  scoped TEXT[] := ARRAY['vital_signs','problem_list','vaccinations','body_region_findings'];
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
