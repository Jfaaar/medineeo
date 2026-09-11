-- Local-dev seed.
--
-- Creates a single tenant + profile for the dev user inserted by
-- 00_local_stubs.sql. With auth.uid() hardcoded to the dev user's id,
-- every RLS policy resolves cleanly and the backend can insert / read
-- without any session-level GUC dance.
--
-- Identifiers are deterministic so they can be referenced from code:
--   user id   : 00000000-0000-0000-0000-000000000001
--   clinic id : 00000000-0000-0000-0000-0000000000c1

INSERT INTO clinics (id, name, email, address, phone, subscription_status)
  VALUES (
    '00000000-0000-0000-0000-0000000000c1',
    'Dev Clinic',
    'dev@medineeo.local',
    '123 Localhost St',
    '+212600000000',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, name, role, clinic_id)
  VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Demo User',
    'clinic_admin',
    '00000000-0000-0000-0000-0000000000c1'
  )
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        role = EXCLUDED.role,
        clinic_id = EXCLUDED.clinic_id;

INSERT INTO clinic_settings (clinic_id, primary_specialty, enabled_specialties)
  VALUES (
    '00000000-0000-0000-0000-0000000000c1',
    'general_practice',
    ARRAY['general_practice']
  )
  ON CONFLICT (clinic_id) DO UPDATE
    SET primary_specialty = EXCLUDED.primary_specialty,
        enabled_specialties = EXCLUDED.enabled_specialties;

-- A handful of sample patients so the UI has something to render.
INSERT INTO patients (id, clinic_id, full_name, phone, email, status)
  VALUES
    ('00000000-0000-0000-0000-0000000001a1',
     '00000000-0000-0000-0000-0000000000c1',
     'Alice Demo', '+212611111111', 'alice@example.com', 'active'),
    ('00000000-0000-0000-0000-0000000001a2',
     '00000000-0000-0000-0000-0000000000c1',
     'Bob Demo',   '+212622222222', 'bob@example.com',   'active'),
    ('00000000-0000-0000-0000-0000000001a3',
     '00000000-0000-0000-0000-0000000000c1',
     'Carol Demo', '+212633333333', NULL,                'archived')
  ON CONFLICT (id) DO NOTHING;
