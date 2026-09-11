# DentFlow — Clinic Management System

> Multi-tenant SaaS for clinics: patient records, scheduling, clinical tracking, radiology, inventory, prescriptions, and invoicing. Mobile-first, multilingual (EN / FR / ES / IT / AR with RTL), light & dark mode.

---

## 1. Snapshot

| Area | Status |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| Auth | Supabase Auth (email/password) + Firebase Phone OTP |
| Database | Supabase Postgres (with RLS), JSON file fallback in `server/db.js` |
| Backend API | Express server ([server/index.js](server/index.js)) — ~1k lines |
| File storage | Local disk via `multer` (radiology uploads) |
| Deployment | Vercel ([vercel.json](vercel.json)) — frontend only; backend needs separate host |
| State | React Context (Auth / Theme / Language) + per-feature local state |
| Persistence cache | `localStorage` ([lib/storage.ts](lib/storage.ts)) for offline-friendly UX |

---

## 2. Architecture

### Frontend
- **Framework:** React 18 + TypeScript, bundled by **Vite 5** ([vite.config.ts](vite.config.ts)).
- **Styling:** Tailwind CSS, custom Medical Blue / Slate palette, full dark-mode support.
- **Icons:** `lucide-react`.
- **Class merging:** `clsx` + `tailwind-merge` ([lib/utils.ts](lib/utils.ts)).
- **State:** Three top-level Contexts wrap the tree in [App.tsx](App.tsx#L68-L78) — `ThemeProvider` → `LanguageProvider` → `AuthProvider`. Per-feature state stays local.
- **Routing:** Tab-based switch in [App.tsx](App.tsx#L24-L56) — no `react-router`. Super-admins are routed to a separate `Backoffice` shell.

### Backend & Data
The repo is mid-migration from a localStorage-only prototype to a **Supabase-backed multi-tenant SaaS**.

- **Supabase** ([lib/supabase.ts](lib/supabase.ts)) is the source of truth for auth + tenant data.
  - Schema bootstrapped by [supabase/bootstrap.sql](supabase/bootstrap.sql): `profiles`, `clinics`, `invitations`, plus an `auth.users → profiles` trigger.
  - RLS policies enforce tenant isolation: a user only sees rows in their `clinic_id` unless they are `super_admin`.
  - Phone-auth migration in [supabase/phone_auth_migration.sql](supabase/phone_auth_migration.sql).
- **Firebase** ([lib/firebase.ts](lib/firebase.ts)) is used solely for **phone-number OTP** sign-in (recent commit `7635ada`).
- **Express server** ([server/index.js](server/index.js)) exposes `/api/auth/*`, `/api/backoffice/*`, and `/uploads/*`. It validates Supabase access tokens via `supabaseAuth.auth.getUser(token)` and uses a service-role admin client for privileged operations.
- **`localStorage` cache** ([lib/storage.ts](lib/storage.ts)) still stores Patients, Appointments, Invoices, Radios, Treatments, Quotes, Inventory, Suppliers, Prescriptions. This is the offline-first cache layer; the migration to Supabase tables for these is **not yet complete**.

### Request flow

```
React component
    └─ lib/api.ts         (typed wrapper, simulates latency)
         ├─ supabase-js   (auth, eventually data)
         └─ fetch → http://localhost:3001/api/...
                          └─ Express → supabase-admin / db.js / disk
```

---

## 3. Feature Modules

All under [features/](features/), one folder per domain:

| Module | Path | Notes |
| --- | --- | --- |
| Auth | [features/auth/](features/auth/) | Supabase email/password + Firebase phone OTP, role-aware routing. |
| Dashboard | [features/dashboard/](features/dashboard/) | Daily agenda, validate-to-invoice flow. |
| Calendar | [features/calendar/](features/calendar/) | Custom-built Month / Week / Day / Agenda views, conflict detection, cancel log. |
| Patients | [features/patients/](features/patients/) | Directory + per-patient dashboard (Overview, Treatments, Schedule, Financials, Radiology). |
| Appointments | [features/appointments/](features/appointments/) | Hooks + modals reused across calendar & patient views. |
| Invoices | [features/invoices/](features/invoices/) | Generated from completed appointments; supports **partial payments** + payment history (see `Invoice.payments[]` in [types.ts](types.ts#L65-L75)). |
| Inventory | [features/inventory/](features/inventory/) | Medicaments / consumables / equipment; stock thresholds, transactions log, suppliers. |
| Prescriptions | [features/prescriptions/](features/prescriptions/) | Ties medicaments to patient visits with dosage / frequency / duration. |
| Backoffice | [features/backoffice/](features/backoffice/) | Super-admin only: clinic CRUD, staff management, role promotion, invitations. |
| Settings / Team | [features/settings/](features/settings/) | Per-clinic team management. |
| i18n | [features/language/](features/language/) | Context + `t()` lookup against [lib/i18n/](lib/i18n/). |
| Theme | [features/theme/](features/theme/) | Dark-mode toggle persisted to localStorage. |

---

## 4. Data Model (from [types.ts](types.ts))

Core entities and the things easy to miss:

- **`User`** — roles: `super_admin | clinic_admin | doctor | assistant`. `clinicId` ties non-super-admins to a tenant.
- **`Clinic`** — `subscriptionStatus: 'active' | 'inactive'`, `maxStaff` cap (the SQL schema also has `'suspended' | 'cancelled'` — **types and schema are out of sync**, see §7).
- **`Patient`** — includes `medicalHistory` (allergies / conditions / medications), `insuranceProvider` (CNSS / CNOPS — Morocco-focused), `status: active | archived`.
- **`Appointment`** — denormalized `patientName` for MVP display, `status: confirmed | pending | canceled | completed`.
- **`Invoice`** — `amount`, `paidAmount`, `payments[]`, status `paid | unpaid | partial`. (The old documentation said paid/unpaid only — partial payments are now supported.)
- **`Treatment`** — `status: planned | completed`, `materialsUsed[]` linking to inventory.
- **`Quote`** — embedded treatments, `status: draft | accepted | rejected`.
- **`InventoryItem`** — discriminated by `type` (medicament / consumable / equipment); medicament-specific fields (`form`, `expiryDate`) and equipment-specific fields (`serialNumber`, `lastMaintenance`) live on the same interface.
- **`Prescription`** — array of `PrescriptionItem` with denormalized `medicamentName`.
- **`Radio`** — uploaded image URL + filename, served from `/uploads/radios/`.

---

## 5. Project Layout

```
/
├── App.tsx                      Root: providers, role-based shell selection
├── index.tsx / index.html
├── types.ts                     All domain interfaces (single source of truth)
├── components/
│   ├── layout/                  Sidebar, Topbar, Layout, BackofficeSidebar
│   └── ui/                      Button, Input, Modal, Card, ...
├── features/                    See §3
├── lib/
│   ├── api.ts                   Typed API wrapper (~520 lines)
│   ├── storage.ts               localStorage CRUD
│   ├── supabase.ts              Supabase client
│   ├── firebase.ts              Firebase client (phone OTP only)
│   ├── services/                Domain-level service helpers
│   ├── i18n/                    EN / FR / ES / IT / AR translations
│   └── utils.ts                 Date formatting, classnames
├── server/
│   ├── index.js                 Express + multer + Supabase admin
│   ├── db.js                    JSON-file persistence fallback
│   ├── data.json                Local dev DB
│   └── scraper.js               Profile-image scraping helper
├── supabase/
│   ├── bootstrap.sql            Run once on a fresh project
│   ├── schema.sql               Clinic / invitations migration
│   └── phone_auth_migration.sql
├── vercel.json                  Vite framework + SPA rewrite
├── netlify.toml                 (empty — leftover)
└── .env.local                   Supabase + Firebase keys (not committed)
```

---

## 6. Local Development

**Prerequisites:** Node ≥ 14, a Supabase project, a Firebase project (only if testing phone OTP).

```bash
npm install
# Populate .env.local with:
#   VITE_SUPABASE_URL=...
#   VITE_SUPABASE_ANON_KEY=...
#   SUPABASE_SERVICE_ROLE_KEY=...
#   VITE_FIREBASE_API_KEY=...   (and the rest of the Firebase web config)
npm run dev   # concurrently runs: Express on :3001 and Vite on :5173
```

Run the SQL bootstrap once in the Supabase SQL editor:

```sql
-- 1. supabase/bootstrap.sql
-- 2. supabase/phone_auth_migration.sql   (if you want phone login)
```

`npm run build` outputs to `dist/`. `npm start` is **not defined** despite what the old docs claimed — production hosting needs `node server/index.js` plus a static host for `dist/` (or rework as serverless functions; see §7).

---

## 7. Known Issues & Inconsistencies

These are real bugs / drifts surfaced while writing this doc — fixing them is the lowest-risk first wave of enhancement.

1. **README is the AI Studio template.** It still tells users to set `GEMINI_API_KEY`, but no Gemini code exists in the repo. Replace with the real setup steps from §6.
2. **Empty `netlify.toml`.** Either fill it in or delete it; right now it implies dual deployment that doesn't work.
3. **Type / schema drift on `Clinic.subscriptionStatus`.**
   - `types.ts` → `'active' | 'inactive'`
   - `supabase/schema.sql` → `'active' | 'suspended' | 'cancelled'`
   Pick one and align both sides; otherwise the API will reject valid DB values.
4. **`api.ts` hardcodes `http://localhost:3001`.** Production builds hit localhost. Move the base URL to an env var (`VITE_API_BASE_URL`).
5. **Auth is split across two providers (Supabase + Firebase phone).** Sessions, tokens, and user IDs do not align cleanly — risk of orphaned profiles when a phone-OTP user has no Supabase row. Decide on one identity authority (Supabase Phone Auth is now GA and would let you drop Firebase entirely).
6. **`server/index.js` mixes JSON-file storage (`db.js`) with Supabase.** New writes go to one or the other depending on the route. Migrate the remaining `db.js` reads/writes to Supabase tables and delete `data.json`.
7. **Vercel config doesn't host the Express server.** `vercel.json` only knows about the Vite output. Either:
   - Convert the Express routes to `/api/*` serverless functions, or
   - Host the server separately (Fly / Render / Railway) and set `VITE_API_BASE_URL` to its URL.
8. **`localStorage` is still authoritative for Patients/Appointments/Invoices/etc.** Tenants currently can't share data across devices for these entities. Migrating `storage.ts` callers to Supabase tables (with RLS keyed on `clinic_id`) is the largest remaining piece of work.

---

## 8. Enhancement Roadmap

### Quick wins (≤ 1 day each)
- Fix the README and delete or populate `netlify.toml` (§7.1, §7.2).
- Centralize the API base URL behind `import.meta.env.VITE_API_BASE_URL` (§7.4).
- Reconcile the `Clinic.subscriptionStatus` enum across TS + SQL (§7.3).
- Replace mock latency `delay()` calls in [lib/api.ts](lib/api.ts#L8) with real loading states once data is server-backed.
- Add `engines.node` ≥ 18 in [package.json](package.json) — Supabase / Firebase SDKs no longer support 14.

### Foundation (1–2 weeks)
- **Finish the Supabase migration.** Add tables for `patients`, `appointments`, `invoices`, `treatments`, `radios`, `inventory_items`, `inventory_transactions`, `prescriptions`, `quotes`, `suppliers`, all keyed by `clinic_id` with RLS. Convert [lib/storage.ts](lib/storage.ts) callers to use Supabase queries; keep localStorage only as an offline cache hydrated via a sync layer.
- **Consolidate auth.** Move phone OTP to Supabase Phone Auth, remove the Firebase dependency, and drop ~30 KB from the bundle.
- **Storage for radiology.** Move `multer` disk uploads to Supabase Storage with signed URLs — required for any non-localhost deployment.
- **Add `react-router`.** Tab-string routing in [App.tsx](App.tsx#L22) breaks deep-linking, browser back, and shareable URLs (e.g. a link to a specific patient).

### Product (incremental)
- **Server-side search** for the patient directory (currently filters in-memory — won't scale past a few thousand patients per clinic).
- **Audit log table** for compliance (who edited a treatment, who deleted a patient) — important for any medical SaaS.
- **Soft delete + archive** for patients/appointments instead of hard DELETE (already partly there via `Patient.status`).
- **Real notifications**: appointment reminders via WhatsApp/SMS (already linked in patient quick actions — make it programmatic via a Supabase Edge Function).
- **Reporting module**: revenue per doctor, no-show rate, treatment plan acceptance rate. The data model already supports this.
- **Multi-currency / locale-aware money formatting.** Right now amounts are bare numbers; for a Morocco-first product (CNSS / CNOPS), MAD formatting + tax rules belong in `lib/utils.ts`.

### Quality
- **Add a test runner.** No tests today. Vitest + React Testing Library is the lowest-friction path on Vite.
- **Add ESLint + Prettier + a `typecheck` script.** `tsc --noEmit` is not wired into CI; type errors can ship.
- **CI on Vercel preview deploys** (typecheck + build) before main.
- **Bundle-analyze.** Likely opportunities: tree-shake `lucide-react` icon imports and lazy-load Backoffice routes.

### Security & compliance
- **Rotate `.env.local`.** It's git-ignored, but ensure no secrets ever landed in history.
- **CSP / HSTS headers** on the Express server.
- **HIPAA / GDPR posture review.** The app stores PHI (allergies, conditions, medications). Encryption at rest is on Supabase by default; encryption in transit and access logging need to be explicit.
- **Rate-limit the Express auth endpoints** (`express-rate-limit`).
- **Validate all Express request bodies** with Zod or similar — currently most handlers trust the client.

---

## 9. Glossary

- **Clinic** — top-level tenant. All non-super-admin data is scoped by `clinic_id`.
- **Backoffice** — the super-admin UI ([features/backoffice/](features/backoffice/)) for managing tenants. Distinct from a clinic's own admin panel.
- **CNSS / CNOPS** — Moroccan public health insurance providers, surfaced in `Patient.insuranceProvider`.
