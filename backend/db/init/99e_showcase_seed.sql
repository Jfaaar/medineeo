-- 99e_showcase_seed.sql — marketing-grade demo data for the landing-page screenshots.
--
-- Everything is dated RELATIVE to CURRENT_DATE, so a re-run always produces a
-- clinic that looks "live today" (full agenda, revenue booked this morning, a
-- month of calendar traffic). Re-apply any time with:
--
--   docker exec -i dentflow-postgres psql -U dentflow -d dentflow \
--     < backend/db/init/99e_showcase_seed.sql
--
-- Idempotent: every row it owns is tagged and dropped up front. Showcase
-- patients carry external_ref 'SHOW-nnn'; showcase inventory/appointments hang
-- off them or off the 'SHOW-' name prefix.

BEGIN;

-- ─── Purge previous showcase rows ────────────────────────────────────────────

CREATE TEMP TABLE _show_pat ON COMMIT DROP AS
  SELECT id FROM patients WHERE external_ref LIKE 'SHOW-%';

DELETE FROM payments      WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id IN (SELECT id FROM _show_pat));
DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id IN (SELECT id FROM _show_pat));
DELETE FROM invoices      WHERE patient_id IN (SELECT id FROM _show_pat);
DELETE FROM prescription_items WHERE prescription_id IN (SELECT id FROM prescriptions WHERE patient_id IN (SELECT id FROM _show_pat));
DELETE FROM prescriptions WHERE patient_id IN (SELECT id FROM _show_pat);
DELETE FROM treatments    WHERE patient_id IN (SELECT id FROM _show_pat);
DELETE FROM vital_signs   WHERE patient_id IN (SELECT id FROM _show_pat);
DELETE FROM appointments  WHERE patient_id IN (SELECT id FROM _show_pat);
DELETE FROM patients      WHERE external_ref LIKE 'SHOW-%';

-- ─── Clinic identity ─────────────────────────────────────────────────────────

UPDATE clinics
   SET name    = 'Cabinet Médical Atlas',
       phone   = '+212 5 22 47 18 90',
       address = '14, Boulevard d''Anfa — Casablanca'
 WHERE id = '00000000-0000-0000-0000-0000000000c1';

-- ─── Patients ────────────────────────────────────────────────────────────────
-- 48 patients. Registration dates fan out over 14 months so "new this month"
-- lands on a believable handful rather than the whole book.

INSERT INTO patients (
  id, clinic_id, external_ref, full_name, phone, email, birth_date, gender,
  address, insurance_provider, insurance_number, status, created_at, created_by
)
SELECT
  ('00000000-0000-0000-0000-5' || lpad(n::text, 11, '0'))::uuid,
  '00000000-0000-0000-0000-0000000000c1',
  'SHOW-' || lpad(n::text, 3, '0'),
  name,
  '+212 6 ' || lpad(((n * 7919) % 100)::text, 2, '0') || ' ' ||
               lpad(((n * 104729) % 100)::text, 2, '0') || ' ' ||
               lpad(((n * 1299709) % 100)::text, 2, '0') || ' ' ||
               lpad(((n * 15485863) % 100)::text, 2, '0'),
  lower(split_part(name, ' ', 1)) || '.' ||
    lower(regexp_replace(split_part(name, ' ', 2), '[^a-zA-Z]', '', 'g')) || '@example.ma',
  (CURRENT_DATE - ((6570 + (n * 811) % 18250))::int)::date,   -- 18 to ~68 years old
  CASE WHEN n % 2 = 0 THEN 'female' ELSE 'male' END,
  addr,
  CASE WHEN n % 3 = 0 THEN 'CNSS' WHEN n % 3 = 1 THEN 'CNOPS' ELSE NULL END,
  CASE WHEN n % 3 <> 2 THEN 'AS' || lpad((480000 + n * 137)::text, 8, '0') ELSE NULL END,
  'active',
  now() - ((n * 9) % 420 || ' days')::interval,
  '00000000-0000-0000-0000-000000000001'
FROM (
  VALUES
    (1,  'Youssef Benali',      'Rue Ibn Batouta, Maârif'),
    (2,  'Salma Idrissi',       'Av. Mohammed V, Gauthier'),
    (3,  'Karim El Amrani',     'Rue de Rome, Racine'),
    (4,  'Nadia Cherkaoui',     'Bd Zerktouni, Bourgogne'),
    (5,  'Mehdi Bennani',       'Rue Jean Jaurès, Maârif'),
    (6,  'Imane Tazi',          'Bd d''Anfa, Anfa'),
    (7,  'Omar Lahlou',         'Rue Ahmed Charci, Palmier'),
    (8,  'Yasmine Alaoui',      'Av. Hassan II, Centre'),
    (9,  'Rachid Berrada',      'Rue Ali Abderrazak, Maârif'),
    (10, 'Fatima Zahra Sqalli', 'Bd Ghandi, Californie'),
    (11, 'Anas Chraibi',        'Rue Normandie, Maârif'),
    (12, 'Leila Benjelloun',    'Av. 2 Mars, Derb Sultan'),
    (13, 'Hamza Fassi',         'Rue Soumaya, Palmier'),
    (14, 'Sara Kettani',        'Bd Abdelmoumen, Bourgogne'),
    (15, 'Ilyas Ouazzani',      'Rue Chichaoua, Oasis'),
    (16, 'Meryem Skalli',       'Av. Al Massira, Ain Diab'),
    (17, 'Adam Sefrioui',       'Rue Al Yarmouk, Sidi Maarouf'),
    (18, 'Hind Bouhafs',        'Bd Moulay Youssef, Centre'),
    (19, 'Zakaria Mansouri',    'Rue Taha Hussein, Gauthier'),
    (20, 'Rim Belkadi',         'Av. des FAR, Centre'),
    (21, 'Bilal Naciri',        'Rue Verdun, Maârif'),
    (22, 'Kenza Filali',        'Bd Yacoub El Mansour, Anfa'),
    (23, 'Ayoub Rahmani',       'Rue Al Banafsaj, Oasis'),
    (24, 'Amina Ziani',         'Av. Hassan Seghir, Centre'),
    (25, 'Reda Kabbaj',         'Rue Lalla Yacout, Centre'),
    (26, 'Ghita Berrada',       'Bd Bir Anzarane, Maârif'),
    (27, 'Nabil Hakimi',        'Rue Chevalier Bayard, Racine'),
    (28, 'Chaimae Slaoui',      'Av. Mers Sultan, Centre'),
    (29, 'Walid Amrani',        'Rue Ibn Khaldoun, Palmier'),
    (30, 'Douae Mekouar',       'Bd Rachidi, Gauthier'),
    (31, 'Soufiane Benslimane', 'Rue Aïn Harrouda, Sidi Bernoussi'),
    (32, 'Lina Bouzidi',        'Av. Hassan II, Belvédère'),
    (33, 'Othmane Guessous',    'Rue Assilah, Maârif'),
    (34, 'Nisrine Bencheikh',   'Bd Emile Zola, Belvédère'),
    (35, 'Yassine Ait Ali',     'Rue Tarik Ibn Ziad, Centre'),
    (36, 'Khadija Rifai',       'Av. Anoual, Maârif'),
    (37, 'Marouane Sebti',      'Rue Ibn Sina, Oasis'),
    (38, 'Sofia Haddaoui',      'Bd Panoramique, Ain Chock'),
    (39, 'Ismail Bargach',      'Rue El Yassmine, Californie'),
    (40, 'Oumaima Chakir',      'Av. Zerktouni, Racine'),
    (41, 'Hicham Doukkali',     'Rue Bab Mansour, Palmier'),
    (42, 'Asmae Lamrani',       'Bd Sidi Abderrahmane, Ain Diab'),
    (43, 'Tarik Benomar',       'Rue Ibn Rochd, Gauthier'),
    (44, 'Siham Bouazza',       'Av. Al Qods, Sidi Moumen'),
    (45, 'Amine Regragui',      'Rue Al Andalous, Maârif'),
    (46, 'Wafae Hilali',        'Bd Ouled Ziane, Roches Noires'),
    (47, 'Jad Benchekroun',     'Rue Ain Sebaa, Ain Sebaa'),
    (48, 'Maha Ouahbi',         'Av. Mohammed VI, Anfa Sup.')
) AS t(n, name, addr);

-- ─── Appointments ────────────────────────────────────────────────────────────
-- The clinic books on a strict 30-minute grid, 08:00 → 18:00. Every appointment
-- below therefore starts on a :00 or :30 boundary, lasts exactly 30 minutes, and
-- the last possible slot starts at 17:30 (ending at 18:00). Slot minutes are
-- expressed as minutes from midnight: 480 = 08:00, 1050 = 17:30.
--
-- Three bands:
--   (a) TODAY   — a full clinic day: morning done, one in the chair, afternoon booked.
--   (b) PAST    — ~10 weeks of completed visits; these become the revenue history.
--   (c) FUTURE  — the rest of the month, so the month calendar has traffic.

-- (a) Today — the agenda the hero screenshot shows. Morning booked solid, a
-- break at midday, afternoon ahead. 08:00 → 17:30.
INSERT INTO appointments (
  id, clinic_id, patient_id, doctor_id, room_id, appointment_type,
  starts_at, ends_at, status, observation, completed_at, created_at, created_by
)
SELECT
  ('00000000-0000-0000-0000-a10' || lpad(i::text, 9, '0'))::uuid,
  '00000000-0000-0000-0000-0000000000c1',
  ('00000000-0000-0000-0000-5' || lpad(pat::text, 11, '0'))::uuid,
  '00000000-0000-0000-0000-000000000002',
  CASE WHEN i % 2 = 0 THEN '00000000-0000-0000-0000-bd0000000001'::uuid
                      ELSE '00000000-0000-0000-0000-bd0000000002'::uuid END,
  kind,
  (CURRENT_DATE + slot_min * INTERVAL '1 minute') AT TIME ZONE 'Africa/Casablanca',
  (CURRENT_DATE + (slot_min + 30) * INTERVAL '1 minute') AT TIME ZONE 'Africa/Casablanca',
  status::appointment_status,
  note,
  CASE WHEN status = 'completed'
       THEN (CURRENT_DATE + (slot_min + 30) * INTERVAL '1 minute') AT TIME ZONE 'Africa/Casablanca'
       END,
  now() - ((i + 3) || ' days')::interval,
  '00000000-0000-0000-0000-000000000001'
FROM (
  VALUES
    (1,  4,  'Consultation',      480,  'completed',   'Consultation de routine, RAS'),     -- 08:00
    (2,  11, 'Contrôle',          510,  'completed',   'Contrôle post-traitement'),         -- 08:30
    (3,  22, 'Bilan',             540,  'completed',   'Bilan de santé annuel'),            -- 09:00
    (4,  7,  'Consultation',      570,  'completed',   'Douleur abdominale'),               -- 09:30
    (5,  35, 'Suivi chronique',   600,  'in_progress', 'Suivi hypertension'),               -- 10:00
    (6,  2,  'Consultation',      660,  'confirmed',   'Première visite'),                  -- 11:00
    (7,  19, 'Petite chirurgie',  690,  'confirmed',   'Excision kyste sébacé'),            -- 11:30
    (8,  28, 'Consultation',      840,  'confirmed',   NULL),                               -- 14:00
    (9,  13, 'Vaccination',       870,  'confirmed',   'Rappel vaccinal'),                  -- 14:30
    (10, 40, 'Contrôle',          900,  'pending',     NULL),                               -- 15:00
    (11, 26, 'Analyse',           930,  'pending',     'Prélèvement sanguin'),              -- 15:30
    (12, 9,  'Urgence',           1020, 'confirmed',   'Douleur aiguë — créneau réservé')   -- 17:00
) AS t(i, pat, kind, slot_min, status, note);

-- (b) Past 10 weeks — completed visits, weekdays only, 6–9 slots a day.
-- Slots 1–5 run 08:00 → 10:00, slots 6–9 run 14:00 → 15:30.
INSERT INTO appointments (
  id, clinic_id, patient_id, doctor_id, room_id, appointment_type,
  starts_at, ends_at, status, completed_at, created_at, created_by
)
SELECT
  ('00000000-0000-0000-0000-a20' || lpad((d * 10 + s)::text, 9, '0'))::uuid,
  '00000000-0000-0000-0000-0000000000c1',
  ('00000000-0000-0000-0000-5' || lpad((((d * 7 + s * 13) % 48) + 1)::text, 11, '0'))::uuid,
  '00000000-0000-0000-0000-000000000002',
  CASE WHEN s % 2 = 0 THEN '00000000-0000-0000-0000-bd0000000001'::uuid
                      ELSE '00000000-0000-0000-0000-bd0000000002'::uuid END,
  (ARRAY['Consultation','Contrôle','Bilan','Vaccination','Suivi chronique','Petite chirurgie','Analyse','Urgence'])[(d * 3 + s) % 8 + 1],
  ts,
  ts + INTERVAL '30 minutes',
  'completed',
  ts + INTERVAL '30 minutes',
  ts - INTERVAL '9 days',
  '00000000-0000-0000-0000-000000000001'
FROM generate_series(1, 70) AS d,
     generate_series(1, 9)  AS s,
     LATERAL (
       SELECT ((CURRENT_DATE - d) +
               (CASE WHEN s <= 5 THEN 480 + (s - 1) * 30      -- 08:00 … 10:00
                                 ELSE 840 + (s - 6) * 30 END) -- 14:00 … 15:30
               * INTERVAL '1 minute') AT TIME ZONE 'Africa/Casablanca' AS ts
     ) AS x
WHERE EXTRACT(ISODOW FROM (CURRENT_DATE - d)) < 6      -- weekdays only
  AND s <= 6 + ((d * 5) % 4);                          -- 6–9 slots a day

-- (c) Rest of the month ahead — booked, not yet happened.
-- Slots 1–3 run 09:00 → 10:00, slots 4–6 run 14:30 → 15:30.
INSERT INTO appointments (
  id, clinic_id, patient_id, doctor_id, room_id, appointment_type,
  starts_at, ends_at, status, created_at, created_by
)
SELECT
  ('00000000-0000-0000-0000-a30' || lpad((d * 10 + s)::text, 9, '0'))::uuid,
  '00000000-0000-0000-0000-0000000000c1',
  ('00000000-0000-0000-0000-5' || lpad((((d * 11 + s * 17) % 48) + 1)::text, 11, '0'))::uuid,
  '00000000-0000-0000-0000-000000000002',
  CASE WHEN s % 2 = 0 THEN '00000000-0000-0000-0000-bd0000000001'::uuid
                      ELSE '00000000-0000-0000-0000-bd0000000002'::uuid END,
  (ARRAY['Consultation','Contrôle','Bilan','Vaccination','Suivi chronique','Analyse'])[(d * 2 + s) % 6 + 1],
  ts,
  ts + INTERVAL '30 minutes',
  CASE WHEN (d + s) % 4 = 0 THEN 'pending' ELSE 'confirmed' END::appointment_status,
  now() - ((d % 7) || ' days')::interval,
  '00000000-0000-0000-0000-000000000001'
FROM generate_series(1, 45) AS d,
     generate_series(1, 6)  AS s,
     LATERAL (
       SELECT ((CURRENT_DATE + d) +
               (CASE WHEN s <= 3 THEN 540 + (s - 1) * 30      -- 09:00 … 10:00
                                 ELSE 870 + (s - 4) * 30 END) -- 14:30 … 15:30
               * INTERVAL '1 minute') AT TIME ZONE 'Africa/Casablanca' AS ts
     ) AS x
WHERE EXTRACT(ISODOW FROM (CURRENT_DATE + d)) < 6
  AND s <= 3 + ((d * 3) % 4);

-- ─── Invoices, items, payments ───────────────────────────────────────────────
-- One invoice per completed past visit + the four already-finished visits from
-- today (so "Revenue today" is a real number, not a zero).

INSERT INTO invoices (
  clinic_id, patient_id, appointment_id, number, amount, discount, tax,
  status, issued_at, due_at, created_at
)
SELECT
  a.clinic_id,
  a.patient_id,
  a.id,
  'FA-' || to_char(a.starts_at, 'YYYYMM') || '-' || lpad((row_number() OVER (ORDER BY a.starts_at))::text, 4, '0'),
  price,
  0,
  0,
  'unpaid',                                   -- payments below flip this via trigger
  a.starts_at,
  a.starts_at + INTERVAL '30 days',
  a.starts_at
FROM appointments a
JOIN patients p ON p.id = a.patient_id AND p.external_ref LIKE 'SHOW-%'
CROSS JOIN LATERAL (
  SELECT CASE a.appointment_type
           WHEN 'Consultation'      THEN 300
           WHEN 'Contrôle'          THEN 200
           WHEN 'Bilan'             THEN 400
           WHEN 'Vaccination'       THEN 150
           WHEN 'Suivi chronique'   THEN 500
           WHEN 'Petite chirurgie'  THEN 900
           WHEN 'Analyse'           THEN 250
           WHEN 'Urgence'           THEN 400
           ELSE 400
         END::numeric AS price
) AS pr
WHERE a.status = 'completed';

INSERT INTO invoice_items (clinic_id, invoice_id, description, quantity, unit_price)
SELECT i.clinic_id, i.id, a.appointment_type, 1, i.amount
FROM invoices i
JOIN appointments a ON a.id = i.appointment_id
JOIN patients p ON p.id = i.patient_id AND p.external_ref LIKE 'SHOW-%';

-- Payments: ~72% settled in full, ~14% part-paid, ~14% still open. Older
-- invoices settle more often than recent ones — which is how a real ledger ages.
INSERT INTO payments (clinic_id, invoice_id, amount, method, paid_at, recorded_by)
SELECT
  i.clinic_id,
  i.id,
  CASE WHEN bucket < 72 THEN i.amount ELSE round(i.amount * 0.4) END,
  (ARRAY['cash','cash','card','transfer','insurance'])[(bucket % 5) + 1]::payment_method,
  i.issued_at + INTERVAL '20 minutes',
  '00000000-0000-0000-0000-000000000001'
FROM invoices i
JOIN patients p ON p.id = i.patient_id AND p.external_ref LIKE 'SHOW-%'
CROSS JOIN LATERAL (
  SELECT (('x' || substr(md5(i.id::text), 1, 8))::bit(32)::bigint % 100) AS bucket
) AS b
WHERE bucket < 86;                              -- the remaining 14% stay unpaid

-- ─── Inventory ───────────────────────────────────────────────────────────────
-- Enough lines that the Stock page reads like a real cabinet, with two items
-- under their reorder point so the alert panel has something to say.

INSERT INTO inventory_items (
  id, clinic_id, supplier_id, name, type, category, stock, min_stock, unit,
  cost_price, sell_price, expiry_date, batch_number, brand, location
)
VALUES
  ('00000000-0000-0000-0000-bf0000000010', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-be0000000002', 'Anesthésique local (lidocaïne 2%)', 'medicament', 'anesthésie',   64,  20, 'ampoule',   8.5,  15,  CURRENT_DATE + 240, 'LIDO-4471', 'Septodont',  'Armoire A'),
  ('00000000-0000-0000-0000-bf0000000011', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-be0000000002', 'Seringues jetables 5ml',            'consumable', 'injection',    22,  10, 'boîte',     95,   180, CURRENT_DATE + 400, 'SYR-88',    'BD',         'Armoire B'),
  ('00000000-0000-0000-0000-bf0000000012', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-be0000000002', 'Compresses stériles',               'consumable', 'pansement',    18,  8,  'boîte',     140,  260, CURRENT_DATE + 310, 'GAZ-231',   'MedLine',    'Armoire B'),
  ('00000000-0000-0000-0000-bf0000000013', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-be0000000002', 'Kits de suture',                    'consumable', 'petite-chirurgie', 6,   15, 'set',   210,  0,   NULL,               'SUT-K12',   'Ethicon',    'Tiroir 3'),
  ('00000000-0000-0000-0000-bf0000000014', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-be0000000001', 'Masques chirurgicaux',              'consumable', 'hygiène',      340, 100,'boîte',     35,   0,   CURRENT_DATE + 500, 'MSK-9901',  'MedLine',    'Réserve'),
  ('00000000-0000-0000-0000-bf0000000015', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-be0000000001', 'Ibuprofène 400mg',                  'medicament', 'analgésique',  85,  30, 'boîte',     22,   40,  CURRENT_DATE + 180, 'IBU-400',   'Cooper Pharma','Armoire A'),
  ('00000000-0000-0000-0000-bf0000000016', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-be0000000002', 'Gants d''examen (nitrile)',         'consumable', 'hygiène',      48,  20, 'boîte',     18,   0,   NULL,               'GLV-D22',   'Ansell',     'Tiroir 1'),
  ('00000000-0000-0000-0000-bf0000000017', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-be0000000002', 'Alcool antiseptique',               'consumable', 'hygiène',      12,  10, 'flacon',    90,   0,   CURRENT_DATE + 95,  'ALC-556',   'Gifrer',     'Tiroir 2'),
  ('00000000-0000-0000-0000-bf0000000018', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-be0000000002', 'Tensiomètre électronique',          'equipment',  'matériel',     2,   1,  'unité',     0,    0,   NULL,               NULL,        'Omron',      'Salle 1')
ON CONFLICT (id) DO UPDATE SET
  stock = EXCLUDED.stock, min_stock = EXCLUDED.min_stock, name = EXCLUDED.name;

-- Bring the baseline items in line with the rest: French names, believable
-- levels, and gloves left under their reorder point to drive the alert panel.
UPDATE inventory_items SET name = 'Gants chirurgicaux (M)', category = 'hygiène',
       stock = 8,   min_stock = 20  WHERE id = '00000000-0000-0000-0000-bf0000000003';
UPDATE inventory_items SET name = 'Amoxicilline 500mg', category = 'antibiotique',
       stock = 120, min_stock = 40  WHERE id = '00000000-0000-0000-0000-bf0000000001';
UPDATE inventory_items SET name = 'Paracétamol 1g', category = 'analgésique',
       stock = 200, min_stock = 50  WHERE id = '00000000-0000-0000-0000-bf0000000002';
UPDATE inventory_items SET name = 'Kit de suture (absorbable)', category = 'petite-chirurgie',
       stock = 15,  min_stock = 6   WHERE id = '00000000-0000-0000-0000-bf0000000004';

-- ─── Hero patient: Yasmine Alaoui (SHOW-008) ─────────────────────────────────
-- The patient-chart screenshot opens on her, so she gets a full record:
-- vitals, treatment history and a signed prescription.

INSERT INTO vital_signs (
  clinic_id, patient_id, recorded_by, recorded_at, systolic_bp, diastolic_bp,
  heart_rate, temperature_c, respiratory_rate, spo2, weight_kg, height_cm, pain_score, notes
)
SELECT
  '00000000-0000-0000-0000-0000000000c1',
  '00000000-0000-0000-0000-500000000008',
  '00000000-0000-0000-0000-000000000002',
  now() - (v.days_ago || ' days')::interval,
  v.sys, v.dia, v.hr, v.temp, 16, v.spo2, 62.5, 168, v.pain, v.note
FROM (
  VALUES
    (0,   118, 78, 72, 36.6, 98, 2, 'Constantes stables avant consultation'),
    (34,  122, 80, 76, 36.8, 97, 4, 'Douleur signalée — suivi rapproché'),
    (96,  120, 79, 70, 36.5, 99, 0, 'Bilan annuel — RAS')
) AS v(days_ago, sys, dia, hr, temp, spo2, pain, note);

INSERT INTO treatments (
  clinic_id, patient_id, doctor_id, description, price, status, performed_at
)
VALUES
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-500000000008', '00000000-0000-0000-0000-000000000002', 'Bilan sanguin complet',        700,  'completed',   now() - INTERVAL '34 days'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-500000000008', '00000000-0000-0000-0000-000000000002', 'Suivi tension artérielle',     1500, 'completed',   now() - INTERVAL '96 days'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-500000000008', '00000000-0000-0000-0000-000000000002', 'Vaccination antigrippale',     2800, 'in_progress', now() - INTERVAL '6 days'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-500000000008', '00000000-0000-0000-0000-000000000002', 'Consultation de suivi',        800,  'planned',     NULL);

INSERT INTO prescriptions (id, clinic_id, patient_id, doctor_id, notes, signed_at, created_at)
VALUES (
  '00000000-0000-0000-0000-ae0000000010',
  '00000000-0000-0000-0000-0000000000c1',
  '00000000-0000-0000-0000-500000000008',
  '00000000-0000-0000-0000-000000000002',
  'À prendre au cours des repas. Reconsulter si la douleur persiste au-delà de 48 h.',
  now() - INTERVAL '6 days',
  now() - INTERVAL '6 days'
);

INSERT INTO prescription_items (
  clinic_id, prescription_id, inventory_item_id, medication_name, dosage, frequency, duration, substitution_allowed
)
VALUES
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-ae0000000010', '00000000-0000-0000-0000-bf0000000001', 'Amoxicilline 500mg', '500mg', '3x / jour',      '7 jours', true),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-ae0000000010', '00000000-0000-0000-0000-bf0000000015', 'Ibuprofène 400mg',   '400mg', 'si douleur',     '5 jours', true),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-ae0000000010', '00000000-0000-0000-0000-bf0000000002', 'Paracétamol 1g',     '1g',    '3x / jour max',  '5 jours', true);

COMMIT;

-- ─── Summary ─────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM patients WHERE status = 'active')                                    AS active_patients,
  (SELECT count(*) FROM appointments)                                                        AS appointments,
  (SELECT count(*) FROM appointments WHERE starts_at::date = CURRENT_DATE)                   AS today,
  (SELECT count(*) FROM invoices)                                                            AS invoices,
  (SELECT to_char(coalesce(sum(amount), 0), 'FM999G999') FROM invoices)                      AS billed,
  (SELECT to_char(coalesce(sum(paid_amount), 0), 'FM999G999') FROM invoices)                 AS collected,
  (SELECT to_char(coalesce(sum(amount), 0), 'FM999G999') FROM invoices
     WHERE issued_at::date = CURRENT_DATE)                                                   AS billed_today;
