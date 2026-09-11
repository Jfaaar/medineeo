-- ============================================================================
-- 0005_clinical_locks_and_triggers.sql
-- Phase 3 — Clinical lock policies, treatment_materials, and reusable triggers.
-- ============================================================================
--
-- This migration assumes the tables introduced in
-- 0002_clinical_tables.sql (clinical_notes, treatment_plans,
-- treatment_plan_items, treatments, quotes, prescriptions,
-- insurance_providers/policies/claims) are already in place, alongside the
-- core tables from 0001 (clinics, profiles, patients, appointments, invoices,
-- invoice_items, payments, inventory_items, inventory_transactions).
--
-- The migration is idempotent — every object is created with IF NOT EXISTS or
-- replaced with CREATE OR REPLACE so it is safe to re-run during dev.

-- ---------------------------------------------------------------------------
-- 1. clinical_notes UPDATE policy: deny edits once a note has been signed,
--    except for super_admin (audit override).
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'clinical_notes') THEN
    -- Drop the old "owner can update" style policy if it exists so we can
    -- replace it with a stricter one. Names should match those used in 0002.
    EXECUTE 'DROP POLICY IF EXISTS "clinical_notes_update" ON clinical_notes';
    EXECUTE 'DROP POLICY IF EXISTS "Clinic members can update clinical notes" ON clinical_notes';

    EXECUTE $POLICY$
      CREATE POLICY "clinical_notes_update_unless_signed"
        ON clinical_notes
        FOR UPDATE
        USING (
          -- Allow if note is unsigned and same clinic, OR caller is super_admin.
          (
            signed_at IS NULL
            AND clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
          )
          OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'super_admin'
          )
        )
        WITH CHECK (
          (
            signed_at IS NULL
            AND clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
          )
          OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'super_admin'
          )
        )
    $POLICY$;

    -- Also forbid DELETE of signed notes for non super_admin users.
    EXECUTE 'DROP POLICY IF EXISTS "clinical_notes_delete" ON clinical_notes';
    EXECUTE $POLICY$
      CREATE POLICY "clinical_notes_delete_unless_signed"
        ON clinical_notes
        FOR DELETE
        USING (
          (
            signed_at IS NULL
            AND clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
          )
          OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'super_admin'
          )
        )
    $POLICY$;
  ELSE
    RAISE NOTICE 'Skipping clinical_notes policy: table does not exist (run 0002 first).';
  END IF;
END$$;


-- ---------------------------------------------------------------------------
-- 2. treatment_materials junction table.
--    Tracks which inventory items + quantities a given treatment will consume.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS treatment_materials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity    NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatment_materials_treatment
  ON treatment_materials(treatment_id);
CREATE INDEX IF NOT EXISTS idx_treatment_materials_item
  ON treatment_materials(item_id);
CREATE INDEX IF NOT EXISTS idx_treatment_materials_clinic
  ON treatment_materials(clinic_id);

ALTER TABLE treatment_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treatment_materials_clinic_scope" ON treatment_materials;
CREATE POLICY "treatment_materials_clinic_scope"
  ON treatment_materials
  FOR ALL
  USING (
    clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );


-- ---------------------------------------------------------------------------
-- 3. deduct_treatment_materials() trigger
--    When a treatment row transitions to status='completed', deduct the linked
--    materials from inventory_items.stock and write inventory_transactions
--    rows of type='OUT'. Re-running on an already-completed treatment is a
--    no-op (idempotency guarded by a marker timestamp column).
-- ---------------------------------------------------------------------------

-- Add a marker column to treatments if it doesn't exist so we can dedupe.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'treatments' AND column_name = 'materials_deducted_at') THEN
    NULL; -- already there
  ELSE
    BEGIN
      EXECUTE 'ALTER TABLE treatments ADD COLUMN materials_deducted_at TIMESTAMPTZ';
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'Skipping materials_deducted_at: treatments table missing.';
    END;
  END IF;
END$$;

CREATE OR REPLACE FUNCTION deduct_treatment_materials()
RETURNS TRIGGER AS $$
DECLARE
  mat RECORD;
BEGIN
  -- Only run when crossing into 'completed' status and we haven't already
  -- deducted for this treatment.
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.materials_deducted_at IS NULL THEN

    FOR mat IN
      SELECT item_id, quantity FROM treatment_materials WHERE treatment_id = NEW.id
    LOOP
      UPDATE inventory_items
        SET stock = GREATEST(0, COALESCE(stock, 0) - mat.quantity)
        WHERE id = mat.item_id;

      INSERT INTO inventory_transactions (id, item_id, type, quantity, reason, clinic_id, created_at)
      VALUES (
        gen_random_uuid(),
        mat.item_id,
        'OUT',
        mat.quantity,
        'Auto-deduction for treatment ' || NEW.id::TEXT,
        NEW.clinic_id,
        NOW()
      );
    END LOOP;

    NEW.materials_deducted_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'treatments') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_deduct_treatment_materials ON treatments';
    EXECUTE 'CREATE TRIGGER trg_deduct_treatment_materials
             BEFORE UPDATE ON treatments
             FOR EACH ROW EXECUTE FUNCTION deduct_treatment_materials()';
  ELSE
    RAISE NOTICE 'Skipping deduct_treatment_materials trigger: treatments table missing.';
  END IF;
END$$;


-- ---------------------------------------------------------------------------
-- 4. recompute_invoice_status() trigger.
--    After every INSERT/UPDATE/DELETE on payments, recompute the parent
--    invoice's paid_amount + status. Idempotent across re-runs.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  exists_already BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'recompute_invoice_status'
  ) INTO exists_already;

  IF exists_already THEN
    RAISE NOTICE 'recompute_invoice_status() already exists; replacing definition only.';
  END IF;
END$$;

CREATE OR REPLACE FUNCTION recompute_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  target_invoice UUID;
  total_paid     NUMERIC(12,2);
  total_due      NUMERIC(12,2);
  new_status     TEXT;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    target_invoice := OLD.invoice_id;
  ELSE
    target_invoice := NEW.invoice_id;
  END IF;

  IF target_invoice IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments
    WHERE invoice_id = target_invoice;

  SELECT COALESCE(amount, 0) INTO total_due
    FROM invoices
    WHERE id = target_invoice;

  IF total_paid <= 0 THEN
    new_status := 'unpaid';
  ELSIF total_paid >= total_due THEN
    new_status := 'paid';
  ELSE
    new_status := 'partial';
  END IF;

  UPDATE invoices
    SET paid_amount = total_paid,
        status      = new_status::invoice_status,
        updated_at  = NOW()
    WHERE id = target_invoice;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'payments') THEN
    -- Only create the trigger if it isn't already registered (Phase 2 may have
    -- shipped it). We re-create on the same name to keep behavior current.
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_recompute_invoice_status') THEN
      RAISE NOTICE 'trg_recompute_invoice_status already exists; refreshing.';
      EXECUTE 'DROP TRIGGER trg_recompute_invoice_status ON payments';
    END IF;

    EXECUTE 'CREATE TRIGGER trg_recompute_invoice_status
             AFTER INSERT OR UPDATE OR DELETE ON payments
             FOR EACH ROW EXECUTE FUNCTION recompute_invoice_status()';
  ELSE
    RAISE NOTICE 'Skipping recompute_invoice_status trigger: payments table missing.';
  END IF;
END$$;
