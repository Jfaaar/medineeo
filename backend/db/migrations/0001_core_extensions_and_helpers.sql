-- ============================================
-- 0001_core_extensions_and_helpers.sql
-- Extensions, enums, helper functions used by every later migration.
-- Idempotent. Apply once before 0002+.
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- patient name search

-- ─── Enums ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin','clinic_admin','doctor','assistant',
    'receptionist','accountant','inventory_manager','lab_technician'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trial','active','past_due','suspended','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE patient_status AS ENUM ('active','archived','deceased','transferred');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM (
    'pending','confirmed','checked_in','in_progress',
    'completed','canceled','no_show','rescheduled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft','unpaid','partial','paid','overdue','canceled','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash','card','transfer','cheque','insurance','mobile');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE treatment_status AS ENUM ('planned','in_progress','completed','canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_status AS ENUM ('draft','proposed','accepted','rejected','completed','canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE claim_status AS ENUM ('draft','submitted','accepted','rejected','paid','partially_paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inventory_type AS ENUM ('medicament','consumable','equipment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stock_txn_type AS ENUM ('purchase','usage','adjustment','return','expired','damaged','transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Helper functions for RLS ────────────────────────────────────────────────

-- Returns the caller's clinic_id (NULL for super_admin or unauthenticated).
CREATE OR REPLACE FUNCTION current_clinic_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT clinic_id FROM profiles WHERE id = auth.uid() $$;

-- NOTE: named current_user_role() (not current_role) because Postgres reserves
-- `current_role` as a built-in returning the session role.
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT role FROM profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') $$;

-- Touch updated_at on every UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;
