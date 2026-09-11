-- Rich dev seed for end-to-end testing of the medical-MVP pivot.
-- Runs after 99_dev_seed.sql on a fresh volume; also idempotent so it
-- can be re-applied to a running container with `psql -f`.
--
-- Existing baseline (from 99_dev_seed.sql):
--   clinic   00000000-0000-0000-0000-0000000000c1  Dev Clinic (general_practice)
--   user     00000000-0000-0000-0000-000000000001  Demo User (clinic_admin)
--   patient  ...0001a1  Alice Demo
--   patient  ...0001a2  Bob Demo
--   patient  ...0001a3  Carol Demo (archived)
--
-- UUID convention (hex-only) for new rows below:
--   rooms                  bd00...0001
--   appointments           a000...0001
--   vital_signs            aa00...0001
--   problem_list           ab00...0001
--   vaccinations           c000...0001
--   body_region_findings   b000...0001
--   clinical_notes         e000...0001
--   suppliers              be00...0001
--   inventory_items        bf00...0001
--   insurance_providers    cc00...0001
--   insurance_policies     cd00...0001
--   treatment_plans        ac00...0001
--   treatments             ad00...0001
--   prescriptions          ae00...0001
--   prescription_items     af00...0001
--   invoices               f000...0001
--   invoice_items          bb00...0001
--   payments               bc00...0001

-- ─── Doctor / auth.users (extra) ─────────────────────────────────────────────
INSERT INTO auth.users (id, email)
  VALUES ('00000000-0000-0000-0000-000000000002', 'doctor@medineeo.local')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, name, role, clinic_id)
  VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Dr. Hakim',
    'doctor',
    '00000000-0000-0000-0000-0000000000c1'
  )
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, role = EXCLUDED.role, clinic_id = EXCLUDED.clinic_id;

-- ─── Patient medical history ─────────────────────────────────────────────────
INSERT INTO patient_medical_history (patient_id, clinic_id, allergies, conditions, medications, notes)
  VALUES
    ('00000000-0000-0000-0000-0000000001a1',
     '00000000-0000-0000-0000-0000000000c1',
     ARRAY['Penicillin','Latex'],
     ARRAY['Hypertension','Type 2 Diabetes'],
     ARRAY['Metformin 500mg BID','Lisinopril 10mg daily'],
     'Family history of cardiovascular disease. Non-smoker.'),
    ('00000000-0000-0000-0000-0000000001a2',
     '00000000-0000-0000-0000-0000000000c1',
     ARRAY['Aspirin'],
     ARRAY['Asthma'],
     ARRAY['Albuterol inhaler PRN'],
     'Mild persistent asthma. Last severe episode: 2024.'),
    ('00000000-0000-0000-0000-0000000001a3',
     '00000000-0000-0000-0000-0000000000c1',
     ARRAY[]::text[],
     ARRAY[]::text[],
     ARRAY[]::text[],
     'No known issues at archive time.')
  ON CONFLICT (patient_id) DO UPDATE
    SET allergies = EXCLUDED.allergies,
        conditions = EXCLUDED.conditions,
        medications = EXCLUDED.medications,
        notes = EXCLUDED.notes;

-- ─── Rooms ───────────────────────────────────────────────────────────────────
INSERT INTO rooms (id, clinic_id, name, kind, active) VALUES
  ('00000000-0000-0000-0000-bd0000000001', '00000000-0000-0000-0000-0000000000c1', 'Consultation 1', 'consultation', true),
  ('00000000-0000-0000-0000-bd0000000002', '00000000-0000-0000-0000-0000000000c1', 'Operatory A',     'operatory',    true)
  ON CONFLICT (id) DO NOTHING;

-- ─── Appointments ────────────────────────────────────────────────────────────
INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, room_id, appointment_type, starts_at, ends_at, status, observation)
  VALUES
    -- Times are anchored to date_trunc('day', ...) + a fixed hour offset
    -- so they always land inside the DayView visible range (08:00–18:00).
    -- Alice: past completed + upcoming confirmed
    ('00000000-0000-0000-0000-a00000000001',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a1',
     '00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-bd0000000001',
     'follow-up',
     date_trunc('day', NOW() - INTERVAL '14 days') + INTERVAL '9 hours',
     date_trunc('day', NOW() - INTERVAL '14 days') + INTERVAL '9 hours 30 minutes',
     'completed',
     'BP review and medication adjustment.'),
    ('00000000-0000-0000-0000-a00000000002',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a1',
     '00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-bd0000000001',
     'follow-up',
     date_trunc('day', NOW() + INTERVAL '5 days') + INTERVAL '14 hours',
     date_trunc('day', NOW() + INTERVAL '5 days') + INTERVAL '14 hours 30 minutes',
     'confirmed',
     'Quarterly diabetes check.'),
    -- Bob: past completed (cleaning) + upcoming pending (consult)
    ('00000000-0000-0000-0000-a00000000003',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a2',
     '00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-bd0000000002',
     'cleaning',
     date_trunc('day', NOW() - INTERVAL '30 days') + INTERVAL '11 hours',
     date_trunc('day', NOW() - INTERVAL '30 days') + INTERVAL '11 hours 30 minutes',
     'completed',
     'Routine prophylaxis. No issues.'),
    ('00000000-0000-0000-0000-a00000000004',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a2',
     '00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-bd0000000001',
     'consultation',
     date_trunc('day', NOW() + INTERVAL '2 days') + INTERVAL '10 hours',
     date_trunc('day', NOW() + INTERVAL '2 days') + INTERVAL '10 hours 30 minutes',
     'pending',
     'Asthma follow-up.')
  ON CONFLICT (id) DO NOTHING;

-- ─── Vital signs (Alice has trend over time) ─────────────────────────────────
INSERT INTO vital_signs (id, clinic_id, patient_id, recorded_by, recorded_at,
                         systolic_bp, diastolic_bp, heart_rate, temperature_c,
                         respiratory_rate, spo2, weight_kg, height_cm,
                         pain_score, notes)
  VALUES
    -- Alice 90 days ago, baseline elevated BP
    ('00000000-0000-0000-0000-aa0000000001',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a1',
     '00000000-0000-0000-0000-000000000002',
     NOW() - INTERVAL '90 days',
     148, 92, 84, 36.7, 16, 97, 78.0, 165.0, 0,
     'Baseline visit. BP elevated.'),
    -- Alice 30 days ago, post med change
    ('00000000-0000-0000-0000-aa0000000002',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a1',
     '00000000-0000-0000-0000-000000000002',
     NOW() - INTERVAL '30 days',
     138, 86, 76, 36.5, 14, 98, 76.5, 165.0, 0,
     'After Lisinopril titration. Improving.'),
    -- Alice today, well controlled
    ('00000000-0000-0000-0000-aa0000000003',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a1',
     '00000000-0000-0000-0000-000000000002',
     NOW() - INTERVAL '1 day',
     128, 80, 72, 36.6, 14, 98, 75.0, 165.0, 1,
     'Goal range. Continue current regimen.'),
    -- Bob 30 days ago
    ('00000000-0000-0000-0000-aa0000000004',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a2',
     '00000000-0000-0000-0000-000000000002',
     NOW() - INTERVAL '30 days',
     118, 76, 68, 36.4, 18, 96, 82.0, 178.0, 0,
     'No active wheeze. Asthma stable.'),
    -- Bob 2 days ago
    ('00000000-0000-0000-0000-aa0000000005',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a2',
     '00000000-0000-0000-0000-000000000002',
     NOW() - INTERVAL '2 days',
     120, 78, 72, 37.0, 20, 95, 81.5, 178.0, 2,
     'Mild URI symptoms. SpO2 borderline; monitor.')
  ON CONFLICT (id) DO NOTHING;

-- ─── Problem list ────────────────────────────────────────────────────────────
INSERT INTO problem_list (id, clinic_id, patient_id, icd10_code, icd10_label,
                          description, status, onset_date, resolved_date, notes, created_by)
  VALUES
    ('00000000-0000-0000-0000-ab0000000001',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a1',
     'I10', 'Essential (primary) hypertension', NULL,
     'chronic', '2022-03-15', NULL,
     'On Lisinopril. Well-controlled as of last visit.',
     '00000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-ab0000000002',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a1',
     'E11.9', 'Type 2 diabetes mellitus without complications', NULL,
     'active', '2023-08-01', NULL,
     'A1c trending down. On Metformin.',
     '00000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-ab0000000003',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a1',
     'J20.9', 'Acute bronchitis, unspecified', NULL,
     'resolved', '2025-11-10', '2025-11-25',
     'Self-limited. No antibiotics.',
     '00000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-ab0000000004',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a2',
     'J45.909', 'Unspecified asthma, uncomplicated', NULL,
     'chronic', '2018-05-20', NULL,
     'Mild persistent. Albuterol PRN.',
     '00000000-0000-0000-0000-000000000002')
  ON CONFLICT (id) DO NOTHING;

-- ─── Vaccinations (one with next_dose_date in past = "due") ─────────────────
INSERT INTO vaccinations (id, clinic_id, patient_id, vaccine_name, administered_date,
                          dose_number, lot_number, manufacturer, site, route,
                          next_dose_date, administered_by, notes)
  VALUES
    ('00000000-0000-0000-0000-c00000000001',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a1',
     'Tetanus-Diphtheria (Td) booster', '2024-06-12',
     1, 'TD-2024-A1', 'Sanofi Pasteur', 'left deltoid', 'IM',
     '2034-06-12',
     '00000000-0000-0000-0000-000000000002', NULL),
    ('00000000-0000-0000-0000-c00000000002',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a1',
     'Influenza (seasonal)', '2025-10-01',
     1, 'FLU-25-26', 'GSK', 'right deltoid', 'IM',
     CURRENT_DATE - INTERVAL '7 days',
     '00000000-0000-0000-0000-000000000002',
     'Annual. Next dose now overdue — flag for outreach.'),
    ('00000000-0000-0000-0000-c00000000003',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a1',
     'COVID-19 mRNA booster', '2025-11-05',
     4, 'COV-25-X', 'Pfizer-BioNTech', 'left deltoid', 'IM',
     NULL,
     '00000000-0000-0000-0000-000000000002', NULL),
    ('00000000-0000-0000-0000-c00000000004',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a2',
     'Pneumococcal (PPSV23)', '2025-03-15',
     1, 'PNV-25', 'Merck', 'left deltoid', 'IM',
     NULL,
     '00000000-0000-0000-0000-000000000002',
     'Indicated for chronic asthma.')
  ON CONFLICT (id) DO NOTHING;

-- ─── Body region findings (Alice — chest tenderness; Bob — back/leg) ────────
INSERT INTO body_region_findings (id, clinic_id, patient_id, region, side,
                                   finding, severity, notes,
                                   recorded_at, recorded_by)
  VALUES
    ('00000000-0000-0000-0000-b00000000001',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a1',
     'chest', 'left',
     'Tenderness on palpation', 'mild',
     'Reproducible with deep inspiration; likely costochondritis.',
     NOW() - INTERVAL '14 days',
     '00000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-b00000000002',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a2',
     'lower_limb_right', 'right',
     'Limited dorsiflexion', 'moderate',
     'Post-sprain. Refer PT.',
     NOW() - INTERVAL '7 days',
     '00000000-0000-0000-0000-000000000002')
  ON CONFLICT (id) DO NOTHING;

-- ─── Clinical notes (1 SOAP, 1 legacy) ──────────────────────────────────────
INSERT INTO clinical_notes (id, clinic_id, patient_id, doctor_id, appointment_id,
                            consultation_reason, symptoms, diagnosis,
                            subjective, objective, assessment, plan,
                            signed_at)
  VALUES
    -- Alice — SOAP
    ('00000000-0000-0000-0000-e00000000001',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a1',
     '00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-a00000000001',
     NULL, NULL, NULL,
     'Reports occasional morning headaches; no chest pain or palpitations. Compliant with Lisinopril. Diet adherence partial.',
     'BP 138/86, HR 76, regular. Lungs clear. No edema.',
     '1) HTN — improving on current dose, still slightly above goal. 2) T2DM — A1c last month 6.9%, on target.',
     '1) Continue Lisinopril 10mg, recheck BP in 4 weeks. 2) Continue Metformin, repeat A1c in 3 months. 3) Reinforce DASH diet + 30 min walking 5x/week.',
     NOW() - INTERVAL '14 days'),
    -- Bob — legacy free-form
    ('00000000-0000-0000-0000-e00000000002',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a2',
     '00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-a00000000003',
     'Routine check-up + asthma follow-up',
     'No new complaints. Mild post-exercise wheeze.',
     'Stable. Asthma well-controlled.',
     NULL, NULL, NULL, NULL,
     NOW() - INTERVAL '30 days')
  ON CONFLICT (id) DO NOTHING;

-- ─── Suppliers ───────────────────────────────────────────────────────────────
INSERT INTO suppliers (id, clinic_id, name, contact_person, phone, email)
  VALUES
    ('00000000-0000-0000-0000-be0000000001',
     '00000000-0000-0000-0000-0000000000c1',
     'MedSupply Maroc', 'Karim Bennani', '+212522111222', 'karim@medsupply.ma'),
    ('00000000-0000-0000-0000-be0000000002',
     '00000000-0000-0000-0000-0000000000c1',
     'ClinicCare Distribution', 'Sara Tazi', '+212522333444', 'sales@cliniccare.ma')
  ON CONFLICT (id) DO NOTHING;

-- ─── Inventory items ─────────────────────────────────────────────────────────
INSERT INTO inventory_items (id, clinic_id, supplier_id, name, type, category,
                             stock, min_stock, unit, cost_price, sell_price,
                             expiry_date, batch_number, brand)
  VALUES
    ('00000000-0000-0000-0000-bf0000000001',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-be0000000001',
     'Amoxicillin 500mg', 'medicament', 'antibiotic',
     120, 30, 'capsule', 1.50, 3.00,
     '2027-03-01', 'AMX-2025-Q1', 'Cooper Pharma'),
    ('00000000-0000-0000-0000-bf0000000002',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-be0000000001',
     'Paracetamol 1g', 'medicament', 'analgesic',
     200, 50, 'tablet', 0.40, 1.00,
     '2026-12-01', 'PCM-2025-A', 'Sothema'),
    ('00000000-0000-0000-0000-bf0000000003',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-be0000000001',
     'Surgical gloves (M)', 'consumable', 'PPE',
     8, 20, 'box',
     45.00, NULL, NULL, NULL, 'Mediflex'),
    ('00000000-0000-0000-0000-bf0000000004',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-be0000000002',
     'Suture kit (absorbable)', 'consumable', 'minor-procedure',
     15, 5, 'kit',
     180.00, NULL, '2027-06-01', 'SK-2025', 'Ethicon')
  ON CONFLICT (id) DO NOTHING;

-- ─── Insurance providers + policy ────────────────────────────────────────────
INSERT INTO insurance_providers (id, clinic_id, name, default_coverage_pct, contact_phone)
  VALUES
    ('00000000-0000-0000-0000-cc0000000001', NULL, 'CNSS',  70.0, '+212522480080'),
    ('00000000-0000-0000-0000-cc0000000002', NULL, 'CNOPS', 80.0, '+212522480090')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO insurance_policies (id, clinic_id, patient_id, provider_id,
                                policy_number, coverage_pct, valid_until)
  VALUES
    ('00000000-0000-0000-0000-cd0000000001',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a1',
     '00000000-0000-0000-0000-cc0000000001',
     'CNSS-A-12345', 70.0, '2027-12-31')
  ON CONFLICT (id) DO NOTHING;

-- ─── Treatment plan + treatments (Bob) ───────────────────────────────────────
INSERT INTO treatment_plans (id, clinic_id, patient_id, doctor_id, title, status,
                             estimated_total, discount, insurance_covered,
                             patient_responsibility, accepted_at)
  VALUES
    ('00000000-0000-0000-0000-ac0000000001',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a2',
     '00000000-0000-0000-0000-000000000002',
     'Respiratory care plan', 'accepted',
     800.00, 0, 0, 800.00, NOW() - INTERVAL '20 days')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO treatments (id, clinic_id, patient_id, plan_id, doctor_id,
                        description, price, status, performed_at)
  VALUES
    ('00000000-0000-0000-0000-ad0000000001',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a2',
     '00000000-0000-0000-0000-ac0000000001',
     '00000000-0000-0000-0000-000000000002',
     'Nebulizer treatment session',
     500.00, 'completed', NOW() - INTERVAL '15 days'),
    ('00000000-0000-0000-0000-ad0000000002',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a2',
     '00000000-0000-0000-0000-ac0000000001',
     '00000000-0000-0000-0000-000000000002',
     'Spirometry / pulmonary function test',
     300.00, 'completed', NOW() - INTERVAL '30 days')
  ON CONFLICT (id) DO NOTHING;

-- ─── Prescriptions (Alice — chronic meds) ───────────────────────────────────
INSERT INTO prescriptions (id, clinic_id, patient_id, doctor_id, consultation_id,
                           notes, signed_at)
  VALUES
    ('00000000-0000-0000-0000-ae0000000001',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a1',
     '00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-e00000000001',
     'Continue chronic medications. 90-day supply.',
     NOW() - INTERVAL '14 days')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription_items (id, clinic_id, prescription_id, medication_name,
                                dosage, frequency, duration, substitution_allowed)
  VALUES
    ('00000000-0000-0000-0000-af0000000001',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-ae0000000001',
     'Lisinopril', '10mg', 'Once daily', '90 days', true),
    ('00000000-0000-0000-0000-af0000000002',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-ae0000000001',
     'Metformin', '500mg', 'Twice daily with meals', '90 days', true)
  ON CONFLICT (id) DO NOTHING;

-- ─── Invoices + items + payment (Bob — for the treatment plan above) ───────
INSERT INTO invoices (id, clinic_id, patient_id, appointment_id, number, amount,
                      paid_amount, status, issued_at, due_at)
  VALUES
    ('00000000-0000-0000-0000-f00000000001',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-0000000001a2',
     '00000000-0000-0000-0000-a00000000003',
     'INV-2026-0001',
     800.00, 500.00, 'partial',
     NOW() - INTERVAL '15 days',
     NOW() + INTERVAL '15 days')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO invoice_items (id, clinic_id, invoice_id, treatment_id,
                           description, quantity, unit_price)
  VALUES
    ('00000000-0000-0000-0000-bb0000000001',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-f00000000001',
     '00000000-0000-0000-0000-ad0000000001',
     'Nebulizer treatment session', 1, 500.00),
    ('00000000-0000-0000-0000-bb0000000002',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-f00000000001',
     '00000000-0000-0000-0000-ad0000000002',
     'Spirometry / pulmonary function test', 1, 300.00)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, clinic_id, invoice_id, amount, method, paid_at,
                      recorded_by, note)
  VALUES
    ('00000000-0000-0000-0000-bc0000000001',
     '00000000-0000-0000-0000-0000000000c1',
     '00000000-0000-0000-0000-f00000000001',
     500.00, 'cash', NOW() - INTERVAL '14 days',
     '00000000-0000-0000-0000-000000000002',
     'Down payment.')
  ON CONFLICT (id) DO NOTHING;

-- ─── Second clinic (medical-only, multi-tenant test) ─────────────────────────
INSERT INTO clinics (id, name, email, address, phone, subscription_status)
  VALUES (
    '00000000-0000-0000-0000-0000000000c2',
    'Sunrise Family Practice',
    'admin@sunrise.medineeo.local',
    '45 Avenue Hassan II, Rabat',
    '+212537111222',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;

INSERT INTO clinic_settings (clinic_id, primary_specialty, enabled_specialties)
  VALUES (
    '00000000-0000-0000-0000-0000000000c2',
    'general_practice',
    ARRAY['general_practice','pediatrics']
  )
  ON CONFLICT (clinic_id) DO UPDATE
    SET primary_specialty = EXCLUDED.primary_specialty,
        enabled_specialties = EXCLUDED.enabled_specialties;

INSERT INTO patients (id, clinic_id, full_name, phone, email, gender, birth_date, status)
  VALUES (
    '00000000-0000-0000-0000-0000000001b1',
    '00000000-0000-0000-0000-0000000000c2',
    'Sami Pediatric',
    '+212611445566',
    NULL,
    'male',
    '2018-04-12',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
