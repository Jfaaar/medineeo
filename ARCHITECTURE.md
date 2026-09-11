# DentFlow Architecture & Migration Plan

This document describes the target architecture and the phased migration to get there. Phase 1 has landed; Phases 2–4 are scoped, sequenced, and ready to execute incrementally.

---

## 0. Target architecture

```
┌──────────────────────┐        ┌─────────────────────────────────────┐
│  React 18 + Vite     │        │  Supabase                           │
│  TypeScript          │        │  ┌──────────┐  ┌────────────────┐   │
│  Tailwind            │ ◀────▶ │  │ Postgres │  │ Auth (email +  │   │
│  React Router        │ HTTPS  │  │ + RLS    │  │ phone OTP)     │   │
│  Permission gates    │        │  └──────────┘  └────────────────┘   │
└──────────┬───────────┘        │  ┌──────────┐  ┌────────────────┐   │
           │                    │  │ Storage  │  │ Edge Functions │   │
           │                    │  │ (medical)│  │ (notifications)│   │
           │                    │  └──────────┘  └────────────────┘   │
           ▼                    └────────────────┬────────────────────┘
┌──────────────────────┐                         │
│  Express API         │ ──── service role ──────┘
│  (admin ops + Zod    │
│   validation +       │
│   audit logging)     │
└──────────────────────┘
```

- **Frontend** talks to Supabase directly for tenant-scoped reads/writes (RLS does the security).
- **Express** is reserved for privileged operations that need the service role (impersonation, user creation, password resets, billing) and for legacy fallbacks during migration.
- **localStorage / IndexedDB** is a cache only — never the source of truth for medical or financial data.

---

## 1. Phase 1 — Stabilize foundation (DONE)

| Item | Status | File(s) |
| --- | --- | --- |
| README rewritten to match real stack | ✅ | [README.md](README.md) |
| Empty `netlify.toml` removed | ✅ | — |
| `VITE_API_BASE_URL` env-driven base URL helper | ✅ | [lib/apiBase.ts](lib/apiBase.ts) |
| All hardcoded `http://localhost:3001` removed | ✅ | [lib/api.ts](lib/api.ts), [lib/services/admin.ts](lib/services/admin.ts), [features/auth/InvitePage.tsx](features/auth/InvitePage.tsx), [features/backoffice/ClinicsPage.tsx](features/backoffice/ClinicsPage.tsx), [features/backoffice/CustomersPage.tsx](features/backoffice/CustomersPage.tsx) |
| `Clinic.subscriptionStatus` aligned across TS + SQL (`trial \| active \| past_due \| suspended \| cancelled`) | ✅ | [types.ts](types.ts), [supabase/bootstrap.sql](supabase/bootstrap.sql), [supabase/schema.sql](supabase/schema.sql) |
| `engines.node >= 18`; `typecheck`/`lint`/`format`/`test` scripts | ✅ | [package.json](package.json) |
| ESLint + Prettier configured | ✅ | [.eslintrc.cjs](.eslintrc.cjs), [.prettierrc.json](.prettierrc.json) |
| TypeScript upgraded to 5.6 + tsconfig modernized; `tsc --noEmit` passes | ✅ | [tsconfig.json](tsconfig.json) |
| Permission matrix + `usePermissions` + `<PermissionGate>` | ✅ | [lib/permissions.ts](lib/permissions.ts), [features/auth/usePermissions.tsx](features/auth/usePermissions.tsx) |
| `react-router-dom@6` integrated; `RequireAuth` / `RequireRole` / `RequirePermission` guards | ✅ | [App.tsx](App.tsx), [features/auth/RouteGuards.tsx](features/auth/RouteGuards.tsx) |
| Vercel SPA rewrite fixed | ✅ | [vercel.json](vercel.json) |
| `.env.example` documenting all expected vars | ✅ | [.env.example](.env.example) |

**Routes now wired:**

```
/                          → role landing (redirect)
/login                     → public
/register                  → public
/app/dashboard             → clinic users
/app/calendar              → clinic users
/app/patients              → clinic users
/app/patients/:patientId   → clinic users
/app/invoices              → clinic users
/app/inventory             → clinic users
/app/team                  → clinic users
/app/settings              → clinic users
/backoffice                → super_admin
/backoffice/clinics        → super_admin
/backoffice/clinics/:id    → super_admin
```

Remaining routes from the product spec (`/app/treatments`, `/app/prescriptions`, `/app/payments`, `/app/suppliers`, `/app/reports`, `/backoffice/subscriptions`, `/backoffice/users`, `/backoffice/audit-logs`) are placeholders that will be added as their pages ship in Phase 3.

---

## 2. Phase 2 — Complete Supabase migration

**Goal:** Make Supabase the source of truth for every domain entity. localStorage becomes a cache only.

### 2.1 Database schema

Apply the migrations in order (idempotent):

1. [supabase/migrations/0001_core_extensions_and_helpers.sql](supabase/migrations/0001_core_extensions_and_helpers.sql) — extensions, enums, RLS helper functions (`is_super_admin()`, `current_clinic_id()`, `set_updated_at()`).
2. [supabase/migrations/0002_clinical_tables.sql](supabase/migrations/0002_clinical_tables.sql) — every domain table:

   `patients`, `patient_medical_history`, `rooms`, `appointments`, `appointment_logs`, `clinical_notes`, `treatment_plans`, `treatments`, `quotes`, `insurance_providers`, `insurance_policies`, `insurance_claims`, `invoices`, `invoice_items`, `payments`, `prescriptions`, `prescription_items`, `suppliers`, `inventory_items`, `inventory_transactions`, `purchase_orders`, `purchase_order_items`, `documents`, `notification_templates`, `notifications`, `clinic_settings`, `audit_logs`.

3. [supabase/migrations/0003_rls_policies.sql](supabase/migrations/0003_rls_policies.sql) — generates SELECT/INSERT/UPDATE/DELETE policies for every tenant-scoped table; `audit_logs` is append-only; `insurance_providers` and `notification_templates` allow reading global presets.
4. [supabase/migrations/0004_storage_buckets.sql](supabase/migrations/0004_storage_buckets.sql) — creates the private `medical` storage bucket and tenant-scoped object policies. Path convention: `{clinic_id}/{patient_id}/{document_id}.{ext}`.

### 2.2 Domain types

Centralize in `types.ts`. Add the new entities without breaking existing ones (see §5 for the type changes).

### 2.3 Data access layer

Rebuild the API wrapper around Supabase queries. The current [lib/api.ts](lib/api.ts) uses localStorage for patients/appointments/etc.; replace those calls with Supabase RPC.

```ts
// lib/services/patients.ts
import { supabase } from '../supabase';
import type { Patient } from '../../types';

export const patientsService = {
  async list(opts: { search?: string; status?: 'active' | 'archived'; page?: number; pageSize?: number } = {}) {
    const page = opts.page ?? 0;
    const size = opts.pageSize ?? 50;
    let q = supabase.from('patients').select('*', { count: 'exact' }).range(page * size, page * size + size - 1);
    if (opts.search) q = q.ilike('full_name', `%${opts.search}%`);
    if (opts.status) q = q.eq('status', opts.status);
    const { data, error, count } = await q;
    if (error) throw error;
    return { data: data ?? [], total: count ?? 0 };
  },
  // create / update / archive ...
};
```

### 2.4 Cache layer (replace `lib/storage.ts` source-of-truth role)

```ts
// lib/cache.ts
const TTL = 5 * 60 * 1000;
export const cache = {
  read<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { v, t } = JSON.parse(raw);
    if (Date.now() - t > TTL) return null;
    return v as T;
  },
  write<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify({ v: value, t: Date.now() }));
  },
  invalidate(prefix: string) {
    Object.keys(localStorage).filter((k) => k.startsWith(prefix)).forEach((k) => localStorage.removeItem(k));
  },
};
```

Use `cache` only for **read** acceleration. Writes always hit Supabase first; on success, invalidate the relevant cache prefix.

### 2.5 Migration order (least to most disruptive)

1. **Read-only ports** first: `inventory_items`, `suppliers`, `prescriptions`. These have low write volume — easy to test.
2. **Patients** — the gateway entity for everything else.
3. **Appointments + clinical notes** — depend on patients.
4. **Treatments + treatment plans + quotes** — depend on appointments.
5. **Invoices + payments + insurance claims** — depend on treatments.
6. **Documents** — last, because it requires Supabase Storage migration too.

For each port:

- Add the Supabase service module under `lib/services/<entity>.ts`.
- Replace API calls in pages (e.g. [features/patients/PatientsPage.tsx](features/patients/PatientsPage.tsx)) with the new service.
- Remove that key from [lib/storage.ts](lib/storage.ts).
- Run `npm run typecheck` and the page-level smoke test.

### 2.6 Server-side search & pagination

`patients.full_name` already has a `gin_trgm` index (created in 0002). For phone/email searches:

```ts
const { data } = await supabase
  .from('patients')
  .select('*')
  .or(`phone.ilike.%${q}%,email.ilike.%${q}%`)
  .range(0, 49);
```

Add a `useDebouncedQuery` hook and a generic `<DataTable>` component that consumes `{ data, total, page, pageSize, onPageChange }`.

---

## 3. Phase 3 — Full clinic modules

Each module follows the same recipe: route → page → service → Supabase table → permission gate.

### 3.1 Enhanced patient profile

- Tabs: Overview / Clinical / Treatments / Schedule / Financials / Insurance / Documents / Notes.
- Pull from: `patients`, `patient_medical_history`, `clinical_notes`, `treatments`, `appointments`, `invoices`, `insurance_policies`, `documents`.
- Duplicate detection on save: query for `phone = ? OR email = ?` and warn before insert.

### 3.2 Clinical notes

- `<ClinicalNoteEditor>` writes to `clinical_notes`. Once `signed_at IS NOT NULL`, the editor goes read-only and the row is locked from updates by RLS:

  ```sql
  CREATE POLICY "clinical_notes_no_update_after_sign" ON clinical_notes
    FOR UPDATE USING (signed_at IS NULL OR is_super_admin())
    WITH CHECK (signed_at IS NULL OR is_super_admin());
  ```

  (Add this in `0005_clinical_locks.sql` when shipping.)

### 3.3 Treatment plans, quotes, prescriptions

- PDF generation: render with React + Tailwind into a hidden iframe, then `window.print()` for a v1; replace with `@react-pdf/renderer` when typography matters.
- Multilingual output: reuse the existing i18n `t()` calls inside the templates.

### 3.4 Insurance + payments

- `insurance_providers` table is seeded with `CNSS` and `CNOPS` as global presets (`clinic_id IS NULL`).
- Payment recording validates `payments.amount + sum(existing) <= invoices.amount`. Compute `invoices.status` via a trigger:

  ```sql
  CREATE OR REPLACE FUNCTION recompute_invoice_status() RETURNS TRIGGER AS $$
  BEGIN
    UPDATE invoices SET
      paid_amount = COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = NEW.invoice_id AND NOT refunded), 0),
      status = CASE
        WHEN paid_amount >= amount THEN 'paid'::invoice_status
        WHEN paid_amount > 0 THEN 'partial'::invoice_status
        WHEN due_at IS NOT NULL AND due_at < NOW() THEN 'overdue'::invoice_status
        ELSE 'unpaid'::invoice_status
      END
    WHERE id = NEW.invoice_id;
    RETURN NEW;
  END $$ LANGUAGE plpgsql;
  ```

### 3.5 Inventory: auto-deduct on treatment completion

```sql
CREATE OR REPLACE FUNCTION deduct_treatment_materials() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    -- materials are recorded in a treatment_materials junction table (add in 0005)
    INSERT INTO inventory_transactions (clinic_id, item_id, type, quantity, reference_id, created_by)
    SELECT NEW.clinic_id, tm.item_id, 'usage', -tm.quantity, NEW.id, NEW.doctor_id
    FROM treatment_materials tm WHERE tm.treatment_id = NEW.id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
```

### 3.6 Documents + radiology via Supabase Storage

Replace the `multer` disk upload with a direct browser upload to Supabase Storage. The Express server's only remaining file responsibility is signed-URL generation (or call `supabase.storage.from('medical').createSignedUrl()` directly from the client — RLS already gates it).

```ts
// lib/services/documents.ts
async upload(file: File, patientId: string, category: string) {
  const docId = crypto.randomUUID();
  const ext = file.name.split('.').pop();
  const path = `${user.clinicId}/${patientId}/${docId}.${ext}`;
  const { error } = await supabase.storage.from('medical').upload(path, file);
  if (error) throw error;
  await supabase.from('documents').insert({
    id: docId, clinic_id: user.clinicId, patient_id: patientId,
    category, file_name: file.name, storage_path: path,
    mime_type: file.type, size_bytes: file.size,
  });
}
```

### 3.7 Notifications

- Insert rows into `notifications` with `status = 'queued'`, `scheduled_for = ts`.
- A Supabase Edge Function (cron) pulls due rows, dispatches via SMTP / Twilio / WhatsApp Business API, sets `status = 'sent'`. Skeleton:

  ```ts
  // supabase/functions/dispatch-notifications/index.ts
  Deno.serve(async () => {
    const { data: due } = await supabase
      .from('notifications')
      .select('*')
      .eq('status', 'queued')
      .lte('scheduled_for', new Date().toISOString())
      .limit(100);
    for (const n of due ?? []) await deliver(n);
    return new Response('ok');
  });
  ```

### 3.8 Reports

- Materialize each report as a Postgres view or function and call it via `supabase.rpc(...)`. Examples:

  ```sql
  CREATE OR REPLACE VIEW v_revenue_by_doctor AS
    SELECT a.clinic_id, a.doctor_id, DATE_TRUNC('month', p.paid_at) AS month,
           SUM(p.amount) AS revenue
    FROM payments p JOIN invoices i ON i.id = p.invoice_id
    JOIN appointments a ON a.id = i.appointment_id
    GROUP BY 1, 2, 3;
  ```

- Add CSV export client-side (`Blob` + anchor download) — no server work needed.

### 3.9 Role expansion

Phase 1's `lib/permissions.ts` already supports the legacy 4 roles. To add `receptionist`, `accountant`, `inventory_manager`, `lab_technician`:

1. Run the `user_role` enum already created in 0001 (it includes them).
2. Extend `UserRole` in [types.ts](types.ts) and add their permission rows to `ROLE_PERMISSIONS`.
3. Backfill `profiles.role` for any existing accounts that should change.

---

## 4. Phase 4 — Production readiness

### 4.1 Audit logging

Wrap every privileged Express route with an audit middleware:

```ts
// server/middleware/audit.js
module.exports = (action, entityType) => async (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    supabaseAdmin.from('audit_logs').insert({
      clinic_id: req.user?.clinic_id ?? null,
      user_id: req.user?.id ?? null,
      action, entity_type: entityType, entity_id: req.params.id ?? null,
      old_values: req.audit?.before ?? null,
      new_values: req.audit?.after ?? null,
      ip_address: req.ip, user_agent: req.get('user-agent'),
    });
  });
  next();
};
```

Frontend writes (RLS-allowed) call a thin `auditLog()` helper that inserts into `audit_logs` directly.

### 4.2 Validation (Zod)

```ts
// server/schemas/patient.js
const { z } = require('zod');
const PatientCreateSchema = z.object({
  full_name: z.string().min(2).max(200),
  phone: z.string().regex(/^\+?\d{6,15}$/).optional(),
  email: z.string().email().optional(),
  birth_date: z.string().date().optional(),
  // ...
});
module.exports = { PatientCreateSchema };
```

```ts
// server/middleware/validate.js
module.exports = (schema) => (req, res, next) => {
  const r = schema.safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: 'Invalid input', issues: r.error.issues });
  req.body = r.data;
  next();
};
```

### 4.3 Rate limiting + headers

```js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'blob:', 'https://*.supabase.co'] } },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/auth/', authLimiter);
```

### 4.4 Backend module split

Refactor the ~1k-line [server/index.js](server/index.js) into:

```
server/
├── index.js              # bootstrap only
├── routes/
│   ├── auth.js
│   ├── backoffice.js
│   ├── documents.js
│   └── reports.js
├── middleware/
│   ├── auth.js           # supabase token validation
│   ├── permissions.js
│   ├── validate.js
│   ├── rateLimit.js
│   └── audit.js
├── services/
└── schemas/              # Zod
```

### 4.5 Testing

- `vitest` is already in `package.json`.
- Add `setup.ts` with a Supabase test client pointing at a local seeded project.
- Critical workflows to cover (the bar for v1):
  1. Patient create → search → archive cycle.
  2. Appointment create → conflict rejection → reschedule.
  3. Treatment marked complete → invoice generated → payment recorded → invoice status flips to `paid`.
  4. Document upload → signed URL retrieval → cross-tenant access denied.
  5. RLS: clinic A user cannot SELECT clinic B's patients (run as anon JWT).

### 4.6 CI

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

### 4.7 Auth consolidation

- Migrate Firebase phone OTP to **Supabase Phone Auth** (now GA). The `phoneAuthProvider` in [lib/services/phoneAuth.ts](lib/services/phoneAuth.ts) is the only call-site to update.
- Drop the `firebase` dependency (~40 KB gzipped saved).

### 4.8 Deployment

| Component | Host | Notes |
| --- | --- | --- |
| Frontend (Vite build) | **Vercel** | already configured ([vercel.json](vercel.json)). Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`. |
| Express API | **Fly.io** or **Render** | needs `SUPABASE_SERVICE_ROLE_KEY` as a secret. Set `PORT` from env. |
| Database, Auth, Storage | **Supabase** | apply migrations via `supabase db push` or the SQL editor. |
| Notification dispatcher | **Supabase Edge Function** with a cron trigger | runs every 1 min. |

Alternative: convert the Express routes to Supabase Edge Functions and host everything on Supabase + Vercel — single vendor, no Express process to babysit.

---

## 5. Domain types — additions for Phases 2+

To be added to [types.ts](types.ts) when each module ships. Keep the existing interfaces (Patient, Appointment, Invoice, etc.) compatible during migration; **add** fields rather than rename.

```ts
export type PatientStatus = 'active' | 'archived' | 'deceased' | 'transferred';

export interface ClinicalNote {
  id: string; clinicId: string; patientId: string; doctorId: string;
  appointmentId?: string;
  consultationReason?: string; symptoms?: string; diagnosis?: string;
  notes?: string; treatmentPlan?: string; followUp?: string;
  vitals?: Record<string, number | string>;
  signedAt?: string;       // locked when set
  createdAt: string; updatedAt: string;
}

export interface TreatmentPlan {
  id: string; clinicId: string; patientId: string; doctorId?: string;
  title?: string; status: 'draft' | 'proposed' | 'accepted' | 'rejected' | 'completed' | 'canceled';
  estimatedTotal?: number; discount?: number;
  insuranceCovered?: number; patientResponsibility?: number;
  acceptedAt?: string;
}

export interface InsurancePolicy {
  id: string; clinicId: string; patientId: string;
  providerId?: string; policyNumber?: string;
  coveragePct?: number; validUntil?: string;
}

export interface InsuranceClaim {
  id: string; clinicId: string; patientId: string; invoiceId?: string;
  policyId?: string;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'paid' | 'partially_paid';
  submittedAt?: string; amountClaimed?: number; amountReimbursed?: number;
  notes?: string;
}

export interface ClinicDocument {
  id: string; clinicId: string; patientId?: string; appointmentId?: string;
  category: 'radiology' | 'consent' | 'insurance' | 'certificate' | 'prescription_pdf' | 'invoice_pdf' | 'plan_pdf' | 'other';
  fileName: string; storagePath: string; mimeType?: string; sizeBytes?: number;
  uploadedBy?: string; createdAt: string;
}

export interface AuditLog {
  id: string; clinicId?: string; userId?: string;
  action: string; entityType: string; entityId?: string;
  oldValues?: unknown; newValues?: unknown;
  ipAddress?: string; userAgent?: string;
  createdAt: string;
}
```

---

## 6. Checklist — "DentFlow is a full clinic management SaaS"

### Foundation (Phase 1) — done
- [x] Single API base URL via env
- [x] Aligned enums, Node 18+, lint/format/test scripts
- [x] React Router with role + permission guards
- [x] Permissions matrix replaces hardcoded role checks (UI gate ready)
- [x] `tsc --noEmit` green

### Data + multi-tenancy (Phase 2)
- [ ] All migrations applied to a clean Supabase project
- [ ] RLS verified: cross-clinic SELECT is rejected
- [ ] localStorage no longer holds patients/appointments/invoices/etc.
- [ ] Server-side patient search + pagination working

### Clinical + financial (Phase 3)
- [ ] Patient profile with all tabs powered by Supabase
- [ ] Clinical notes lock after signing
- [ ] Treatment plan → invoice flow end-to-end
- [ ] Partial payment + status auto-recompute
- [ ] Insurance claims: submit → reimburse
- [ ] Inventory auto-deduct on treatment completion
- [ ] Radiology + documents on Supabase Storage with signed URLs
- [ ] Notifications queued + dispatched by Edge Function
- [ ] Reports module (revenue, no-shows, acceptance) with CSV export

### Production readiness (Phase 4)
- [ ] Audit logs on every privileged write
- [ ] Zod validation on every Express route
- [ ] `helmet` + `express-rate-limit` enabled
- [ ] Express split into routes/middleware/services/schemas
- [ ] Critical-path Vitest suite green
- [ ] CI workflow runs typecheck + lint + build + test
- [ ] Firebase removed; Supabase Phone Auth in its place
- [ ] Frontend deployed (Vercel) + backend deployed (Fly/Render or Edge Functions)
- [ ] Runbook for migrations and rollback documented

When every box in §6 is checked, DentFlow is a production-ready, multi-tenant clinic management SaaS.
