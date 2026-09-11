// JS mirror of frontend/src/lib/permissions.ts ROLE_PERMISSIONS matrix.
// Used by the override resolver and the requirePermission middleware so the
// server enforces the same fine-grained, dotted-namespace permissions the UI
// gates on (clinical.sign, treatments.accept, payments.refund, …).
//
// The legacy coarse permissions in backend/lib/permissions.js (clinic:create,
// patient:write, document:delete, …) remain in place for the routes that
// already depend on them; this matrix is purely additive.

const ALL_PERMISSIONS = [
  // Patients
  'patients.view', 'patients.create', 'patients.update', 'patients.archive', 'patients.delete', 'patients.export',
  // Appointments
  'appointments.view', 'appointments.create', 'appointments.update', 'appointments.cancel', 'appointments.checkin',
  // Clinical
  'clinical.view', 'clinical.create', 'clinical.update', 'clinical.sign', 'clinical.unlock', 'clinical.delete',
  // Treatments / quotes
  'treatments.view', 'treatments.create', 'treatments.update', 'treatments.accept', 'treatments.convert', 'treatments.delete',
  'quotes.view', 'quotes.create', 'quotes.send',
  // Prescriptions
  'prescriptions.view', 'prescriptions.create', 'prescriptions.sign', 'prescriptions.delete',
  // Certificates
  'certificates.view', 'certificates.create', 'certificates.sign', 'certificates.delete',
  // Referral letters
  'referrals.view', 'referrals.create', 'referrals.sign', 'referrals.delete',
  // Invoices / payments
  'invoices.view', 'invoices.create', 'invoices.update', 'invoices.cancel',
  'payments.record', 'payments.refund',
  // Insurance
  'insurance.view', 'insurance.submit', 'insurance.update', 'insurance.reimburse',
  // Inventory
  'inventory.view', 'inventory.create', 'inventory.update', 'inventory.adjust', 'inventory.purchase',
  'suppliers.manage',
  // Documents / radiology
  'documents.view', 'documents.upload', 'documents.delete',
  // Reports
  'reports.view', 'reports.export', 'reports.financial',
  // Team / clinic settings
  'team.view', 'team.invite', 'team.update', 'team.remove',
  'settings.view', 'settings.update',
  // Backoffice (super admin only)
  'backoffice.access', 'backoffice.clinics.manage', 'backoffice.subscriptions.manage',
  'backoffice.users.impersonate', 'backoffice.audit.view',
];

const ALL_PERMISSIONS_SET = new Set(ALL_PERMISSIONS);

const ROLE_PERMISSIONS = {
  super_admin: '*',

  clinic_admin: new Set([
    'patients.view', 'patients.create', 'patients.update', 'patients.archive', 'patients.delete', 'patients.export',
    'appointments.view', 'appointments.create', 'appointments.update', 'appointments.cancel', 'appointments.checkin',
    'clinical.view', 'clinical.create', 'clinical.update', 'clinical.sign', 'clinical.unlock', 'clinical.delete',
    'treatments.view', 'treatments.create', 'treatments.update', 'treatments.accept', 'treatments.convert', 'treatments.delete',
    'quotes.view', 'quotes.create', 'quotes.send',
    'prescriptions.view', 'prescriptions.create', 'prescriptions.delete',
    'certificates.view', 'certificates.create', 'certificates.sign', 'certificates.delete',
    'referrals.view', 'referrals.create', 'referrals.sign', 'referrals.delete',
    'invoices.view', 'invoices.create', 'invoices.update', 'invoices.cancel',
    'payments.record', 'payments.refund',
    'insurance.view', 'insurance.submit', 'insurance.update', 'insurance.reimburse',
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.adjust', 'inventory.purchase',
    'suppliers.manage',
    'documents.view', 'documents.upload', 'documents.delete',
    'reports.view', 'reports.export', 'reports.financial',
    'team.view', 'team.invite', 'team.update', 'team.remove',
    'settings.view', 'settings.update',
  ]),

  doctor: new Set([
    'patients.view', 'patients.create', 'patients.update',
    'appointments.view', 'appointments.create', 'appointments.update', 'appointments.cancel', 'appointments.checkin',
    'clinical.view', 'clinical.create', 'clinical.update', 'clinical.sign',
    'treatments.view', 'treatments.create', 'treatments.update', 'treatments.accept', 'treatments.convert',
    'quotes.view', 'quotes.create', 'quotes.send',
    'prescriptions.view', 'prescriptions.create', 'prescriptions.sign',
    'certificates.view', 'certificates.create', 'certificates.sign',
    'referrals.view', 'referrals.create', 'referrals.sign',
    'invoices.view', 'invoices.create',
    'insurance.view', 'insurance.update', 'insurance.submit', 'insurance.reimburse',
    'inventory.view',
    'documents.view', 'documents.upload',
    'reports.view',
    'team.view',
    'settings.view',
  ]),

  assistant: new Set([
    'patients.view', 'patients.create', 'patients.update',
    'appointments.view', 'appointments.create', 'appointments.update', 'appointments.cancel', 'appointments.checkin',
    'clinical.view',
    'treatments.view',
    'quotes.view',
    'prescriptions.view',
    'certificates.view',
    'referrals.view',
    'invoices.view', 'invoices.create',
    'payments.record',
    'insurance.view',
    'inventory.view',
    'documents.view', 'documents.upload',
    'team.view',
    'settings.view',
  ]),
};

const OVERRIDABLE_ROLES = ['clinic_admin', 'doctor', 'assistant'];

function staticHas(role, permission) {
  if (!role) return false;
  const set = ROLE_PERMISSIONS[role];
  if (set === '*') return true;
  if (!set) return false;
  return set.has(permission);
}

function staticPermissionsFor(role) {
  const set = ROLE_PERMISSIONS[role];
  if (set === '*') return [...ALL_PERMISSIONS];
  if (!set) return [];
  return [...set];
}

function isKnownPermission(permission) {
  return ALL_PERMISSIONS_SET.has(permission);
}

module.exports = {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  OVERRIDABLE_ROLES,
  staticHas,
  staticPermissionsFor,
  isKnownPermission,
};
