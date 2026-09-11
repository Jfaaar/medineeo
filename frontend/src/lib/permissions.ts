import type { UserRole } from '../types';

/**
 * Centralized permission system.
 *
 * Adding a permission is two steps:
 *   1. Add the string to the `Permission` union below.
 *   2. Add it to the role(s) that should have it in `ROLE_PERMISSIONS`.
 *
 * UI: <PermissionGate permission="patients.delete">…</PermissionGate>
 * Hook: const { can } = usePermissions(); if (can('invoices.refund')) …
 */

export type Permission =
  // Patients
  | 'patients.view'
  | 'patients.create'
  | 'patients.update'
  | 'patients.archive'
  | 'patients.delete'
  | 'patients.export'

  // Appointments / calendar
  | 'appointments.view'
  | 'appointments.create'
  | 'appointments.update'
  | 'appointments.cancel'
  | 'appointments.checkin'

  // Clinical
  | 'clinical.view'
  | 'clinical.create'
  | 'clinical.update'
  | 'clinical.sign'
  | 'clinical.unlock'
  | 'clinical.delete'

  // Treatments / quotes
  | 'treatments.view'
  | 'treatments.create'
  | 'treatments.update'
  | 'treatments.accept'
  | 'treatments.convert'
  | 'treatments.delete'
  | 'quotes.view'
  | 'quotes.create'
  | 'quotes.send'

  // Prescriptions
  | 'prescriptions.view'
  | 'prescriptions.create'
  | 'prescriptions.sign'
  | 'prescriptions.delete'

  // Certificates
  | 'certificates.view'
  | 'certificates.create'
  | 'certificates.sign'
  | 'certificates.delete'

  // Referral letters
  | 'referrals.view'
  | 'referrals.create'
  | 'referrals.sign'
  | 'referrals.delete'

  // Invoices / payments
  | 'invoices.view'
  | 'invoices.create'
  | 'invoices.update'
  | 'invoices.cancel'
  | 'payments.record'
  | 'payments.refund'

  // Insurance
  | 'insurance.view'
  | 'insurance.submit'
  | 'insurance.update'
  | 'insurance.reimburse'

  // Inventory
  | 'inventory.view'
  | 'inventory.create'
  | 'inventory.update'
  | 'inventory.adjust'
  | 'inventory.purchase'
  | 'suppliers.manage'

  // Documents / radiology
  | 'documents.view'
  | 'documents.upload'
  | 'documents.delete'

  // Reports
  | 'reports.view'
  | 'reports.export'
  | 'reports.financial'

  // Team / clinic settings
  | 'team.view'
  | 'team.invite'
  | 'team.update'
  | 'team.remove'
  | 'settings.view'
  | 'settings.update'

  // Backoffice (super admin only)
  | 'backoffice.access'
  | 'backoffice.clinics.manage'
  | 'backoffice.subscriptions.manage'
  | 'backoffice.users.impersonate'
  | 'backoffice.audit.view';

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[] | '*'> = {
  super_admin: '*',

  clinic_admin: [
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
  ],

  doctor: [
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
  ],

  assistant: [
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
  ],
};

export const hasPermission = (
  role: UserRole | undefined | null,
  permission: Permission,
): boolean => {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (perms === '*') return true;
  return perms.includes(permission);
};

export const hasAnyPermission = (
  role: UserRole | undefined | null,
  permissions: Permission[],
): boolean => permissions.some((p) => hasPermission(role, p));

export const hasAllPermissions = (
  role: UserRole | undefined | null,
  permissions: Permission[],
): boolean => permissions.every((p) => hasPermission(role, p));
