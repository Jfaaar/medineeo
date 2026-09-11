-- ============================================
-- 0014_referrals.sql
-- Referral letters — addressed to another specialist or department (e.g.
-- cardiology, emergency), same shape as certificates: a clinic-scoped record
-- tied to a patient + doctor, kept permanently in the patient's history, with
-- an editable/printable letter body. Fills in the 'referrals' feature key
-- seeded (but never backed by a real table) in 0012_core_feature_keys.sql.
-- ============================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_specialty TEXT NOT NULL,   -- free text: 'Cardiology', 'Emergency', ... (no fixed enum — any specialist)
  recipient_name TEXT,                 -- optional named doctor / facility
  urgency TEXT NOT NULL DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent')),
  reason TEXT,                         -- clinical reason / presenting complaint
  content TEXT,                        -- the actual letter body, drafted/edited by the doctor at
                                        -- creation time (in whatever language the app was in) — printed
                                        -- verbatim, never regenerated later.
  notes TEXT,
  signed_at TIMESTAMPTZ,               -- non-null = locked, mirrors clinical_notes/certificates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referrals_patient ON referrals(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_clinic ON referrals(clinic_id);
CREATE TRIGGER trg_referrals_updated BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS — mirrors the generic tenant-scope pattern from 0003 ───────────────
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_select" ON referrals;
CREATE POLICY "referrals_select" ON referrals FOR SELECT
  USING (is_super_admin() OR clinic_id = current_clinic_id());

DROP POLICY IF EXISTS "referrals_insert" ON referrals;
CREATE POLICY "referrals_insert" ON referrals FOR INSERT
  WITH CHECK (is_super_admin() OR clinic_id = current_clinic_id());

DROP POLICY IF EXISTS "referrals_update" ON referrals;
CREATE POLICY "referrals_update" ON referrals FOR UPDATE
  USING (is_super_admin() OR clinic_id = current_clinic_id())
  WITH CHECK (is_super_admin() OR clinic_id = current_clinic_id());

DROP POLICY IF EXISTS "referrals_delete" ON referrals;
CREATE POLICY "referrals_delete" ON referrals FOR DELETE
  USING (is_super_admin() OR clinic_id = current_clinic_id());

-- Now that a dedicated permission exists (see backend/lib/rolePermissions.js),
-- point the feature catalog at it instead of the generic documents.view.
UPDATE feature_definitions SET default_permission = 'referrals.view'
 WHERE feature_key = 'referrals';
