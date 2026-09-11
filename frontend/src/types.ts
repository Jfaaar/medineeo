
export type UserRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'assistant';

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'cancelled';

export interface Clinic {
  id: string;
  name: string;
  address: string;
  maxStaff: number;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'clinic_admin' | 'doctor' | 'assistant';
  clinicId?: string; // Optional for super_admin
  avatar?: string;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'canceled'
  | 'no_show'
  | 'rescheduled';

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  profilePicture?: string;
  address?: string;
  birthDate?: string; // ISO Date
  gender?: 'male' | 'female';
  medicalHistory?: MedicalHistory;
  insuranceProvider?: string; // e.g., CNSS, CNOPS
  status?: 'active' | 'archived';
  createdAt?: string;
}

export interface MedicalHistory {
  allergies: string[];
  conditions: string[]; // e.g. Diabetes, Hypertension
  medications: string[];
  notes?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string; // Denormalized for MVP display
  doctorId?: string;
  doctorName?: string;
  roomId?: string;
  roomName?: string;
  appointmentType?: string;
  start: string; // ISO Date String
  end: string; // ISO Date String
  status: AppointmentStatus;
  observation?: string;
  checkedInAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  method?: 'cash' | 'card' | 'transfer' | 'check';
  note?: string;
}

export interface Invoice {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  amount: number; // Total amount required
  paidAmount: number; // Amount paid so far
  payments: Payment[]; // History of transactions
  status: 'paid' | 'unpaid' | 'partial';
  date: string; // ISO Date String of issuance
}

export interface ConsumedMaterial {
  itemId: string;
  itemName: string;
  quantity: number;
}

export interface Treatment {
  id: string;
  patientId: string;
  date: string;
  description: string; // e.g., "Physical therapy session"
  price: number;
  status: 'planned' | 'completed';
  materialsUsed?: ConsumedMaterial[]; // Inventory items consumed
}

export interface Quote {
  id: string;
  patientId: string;
  treatments: Treatment[]; // Embedded for simplicity
  total: number;
  date: string;
  status: 'draft' | 'accepted' | 'rejected';
}

export interface Radio {
  id: string;
  patientId: string;
  url: string;
  fileName: string;
  date: string; // ISO Date
  note?: string;
}

// --- INVENTORY & PRESCRIPTIONS ---

export type InventoryItemType = 'medicament' | 'consumable' | 'equipment';

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: InventoryItemType;
  category?: string; // e.g. Antibiotic, Hygiene, Surgical, PPE
  stock: number;
  minStock: number; // Low stock alert threshold
  supplier?: string;
  price?: number; // Cost price per unit (optional)
  description?: string;

  // Medicament Specific
  form?: string; // e.g., Tablet, Syrup, Injection
  expiryDate?: string; // ISO Date

  // Equipment/Consumable Specific
  brand?: string;
  serialNumber?: string; // Equipment only
  lastMaintenance?: string; // Equipment only
  location?: string; // Shelf A, Cabinet 2
}

// Alias for backward compatibility if needed, though we will update usages
export type Medicament = InventoryItem;

export interface InventoryTransaction {
  id: string;
  medicamentId: string;
  medicamentName: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  quantity: number;
  reason?: string;
  date: string;
}

export interface PrescriptionItem {
  // Only set when picked from the clinic's own stocked inventory (enables
  // stock deduction on save). Catalog-sourced picks leave this unset.
  medicamentId?: string;
  medicamentName: string; // Denormalized for display
  dosage: string; // e.g., "500mg"
  frequency: string; // e.g., "2 times a day"
  duration: string; // e.g., "5 days"
  note?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  date: string;
  items: PrescriptionItem[];
  notes?: string;
}

export type CertificateType = 'sick_leave' | 'fitness' | 'school_work' | 'travel' | 'other';

export interface Certificate {
  id: string;
  clinicId?: string;
  patientId: string;
  patientName?: string; // denormalized for the clinic-wide certificates list
  doctorId?: string;
  type: CertificateType;
  reason?: string;
  startDate?: string; // ISO date
  endDate?: string; // ISO date
  restDays?: number;
  content?: string; // the drafted/edited certificate body text, printed verbatim
  notes?: string;
  signedAt?: string; // locked when set
  createdAt?: string;
  updatedAt?: string;
}

export type ReferralUrgency = 'routine' | 'urgent';

export interface Referral {
  id: string;
  clinicId?: string;
  patientId: string;
  patientName?: string; // denormalized for the clinic-wide referrals list
  doctorId?: string;
  recipientSpecialty: string; // free text: 'Cardiology', 'Emergency', ... — no fixed enum
  recipientName?: string; // optional named doctor / facility
  urgency: ReferralUrgency;
  reason?: string;
  content?: string; // the drafted/edited letter body, printed verbatim
  notes?: string;
  signedAt?: string; // locked when set
  createdAt?: string;
  updatedAt?: string;
}

export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

export interface DaySummary {
  date: Date;
  confirmed: number;
  pending: number;
  canceled: number;
  appointments: Appointment[];
}

// ─── Clinical entities ─────────────────────────────────────────────────────
// Backed by the tables defined in backend/db/migrations/0002_clinical_tables.sql.

export type PatientStatus = 'active' | 'archived' | 'deceased' | 'transferred';

export interface ClinicalNote {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  consultationReason?: string;
  symptoms?: string;
  diagnosis?: string;
  notes?: string;
  treatmentPlan?: string;
  followUp?: string;
  vitals?: Record<string, number | string>;
  signedAt?: string; // locked when set
  createdAt: string;
  updatedAt: string;
}

export interface TreatmentPlan {
  id: string;
  clinicId: string;
  patientId: string;
  patientName?: string;
  doctorId?: string;
  title?: string;
  notes?: string;
  status: 'draft' | 'proposed' | 'accepted' | 'rejected' | 'completed' | 'canceled';
  estimatedTotal?: number;
  discount?: number;
  insuranceCovered?: number;
  patientResponsibility?: number;
  acceptedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InsurancePolicy {
  id: string;
  clinicId: string;
  patientId: string;
  providerId?: string;
  policyNumber?: string;
  coveragePct?: number;
  validUntil?: string;
}

export interface InsuranceClaim {
  id: string;
  clinicId: string;
  patientId: string;
  invoiceId?: string;
  policyId?: string;
  status:
    | 'draft'
    | 'submitted'
    | 'accepted'
    | 'rejected'
    | 'paid'
    | 'partially_paid';
  submittedAt?: string;
  amountClaimed?: number;
  amountReimbursed?: number;
  notes?: string;
}

export interface ClinicDocument {
  id: string;
  clinicId: string;
  patientId?: string;
  appointmentId?: string;
  category:
    | 'radiology'
    | 'consent'
    | 'insurance'
    | 'certificate'
    | 'prescription_pdf'
    | 'invoice_pdf'
    | 'plan_pdf'
    | 'other';
  fileName: string;
  storagePath: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedBy?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  clinicId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
// ─── Phase 3 UI helper types (Agent D) ─────────────────────────────────────
// These are auxiliary shapes consumed by features/clinical, features/treatments,
// features/insurance, and features/prescriptions. They DO NOT replace the
// canonical types above (ClinicalNote, TreatmentPlan, InsurancePolicy,
// InsuranceClaim) — those follow the Supabase migration schema.

export interface Vitals {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
}

// Items on a treatment plan are stored in the `treatments` table
// (linked via plan_id), so the shape mirrors a Treatment row.
export interface TreatmentPlanItem {
  id: string;
  planId?: string;
  patientId: string;
  description: string;
  price: number;
  status: 'planned' | 'in_progress' | 'completed' | 'canceled';
  performedAt?: string;
  createdAt?: string;
}

export interface TreatmentMaterial {
  id?: string;
  treatmentId: string;
  itemId: string;
  itemName?: string;
  quantity: number;
  clinicId: string;
}

export interface InsuranceProvider {
  id: string;
  name: string;
  code?: string;
  contactPhone?: string;
  contactEmail?: string;
  defaultCoveragePct?: number;
  clinicId?: string | null;
  createdAt?: string;
}
