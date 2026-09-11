-- ============================================
-- 0003_rls_policies.sql
-- Enable RLS and apply tenant-isolation policies for every table from 0002.
--
-- Pattern:
--   - super_admin: full access (USING is_super_admin())
--   - clinic users: only rows where clinic_id = current_clinic_id()
--   - WITH CHECK ensures inserts/updates can't escape the tenant
-- ============================================

-- Tables to lock down. Order does not matter.
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'patients','patient_medical_history','rooms',
    'appointments','appointment_logs',
    'clinical_notes',
    'treatment_plans','treatments','quotes',
    'insurance_providers','insurance_policies','insurance_claims',
    'invoices','invoice_items','payments',
    'prescriptions','prescription_items',
    'suppliers','inventory_items','inventory_transactions',
    'purchase_orders','purchase_order_items',
    'documents','notification_templates','notifications',
    'clinic_settings','audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ─── Generic tenant-scope policy generator ───────────────────────────────────
-- For each table we build SELECT / INSERT / UPDATE / DELETE policies.
-- insurance_providers is special-cased (allow read of global presets where clinic_id IS NULL).
-- audit_logs is special-cased (insert by anyone in same clinic; select restricted; no update/delete).

DO $$
DECLARE
  t TEXT;
  scoped TEXT[] := ARRAY[
    'patients','patient_medical_history','rooms',
    'appointments','appointment_logs',
    'clinical_notes',
    'treatment_plans','treatments','quotes',
    'insurance_policies','insurance_claims',
    'invoices','invoice_items','payments',
    'prescriptions','prescription_items',
    'suppliers','inventory_items','inventory_transactions',
    'purchase_orders','purchase_order_items',
    'documents','notifications','clinic_settings'
  ];
BEGIN
  FOREACH t IN ARRAY scoped LOOP
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

-- ─── insurance_providers: allow global presets ───────────────────────────────
DROP POLICY IF EXISTS "insurance_providers_select" ON insurance_providers;
CREATE POLICY "insurance_providers_select" ON insurance_providers FOR SELECT
  USING (clinic_id IS NULL OR is_super_admin() OR clinic_id = current_clinic_id());

DROP POLICY IF EXISTS "insurance_providers_insert" ON insurance_providers;
CREATE POLICY "insurance_providers_insert" ON insurance_providers FOR INSERT
  WITH CHECK (is_super_admin() OR clinic_id = current_clinic_id());

DROP POLICY IF EXISTS "insurance_providers_update" ON insurance_providers;
CREATE POLICY "insurance_providers_update" ON insurance_providers FOR UPDATE
  USING (is_super_admin() OR clinic_id = current_clinic_id())
  WITH CHECK (is_super_admin() OR clinic_id = current_clinic_id());

DROP POLICY IF EXISTS "insurance_providers_delete" ON insurance_providers;
CREATE POLICY "insurance_providers_delete" ON insurance_providers FOR DELETE
  USING (is_super_admin());

-- ─── notification_templates: same as providers ───────────────────────────────
DROP POLICY IF EXISTS "notification_templates_select" ON notification_templates;
CREATE POLICY "notification_templates_select" ON notification_templates FOR SELECT
  USING (clinic_id IS NULL OR is_super_admin() OR clinic_id = current_clinic_id());

DROP POLICY IF EXISTS "notification_templates_write" ON notification_templates;
CREATE POLICY "notification_templates_write" ON notification_templates FOR ALL
  USING (is_super_admin() OR clinic_id = current_clinic_id())
  WITH CHECK (is_super_admin() OR clinic_id = current_clinic_id());

-- ─── audit_logs: read-only for non-super-admins, append-only ─────────────────
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT
  USING (is_super_admin() OR clinic_id = current_clinic_id());

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT
  WITH CHECK (is_super_admin() OR clinic_id = current_clinic_id());

-- No UPDATE / DELETE policies on audit_logs — RLS denies by default, so logs are immutable.
