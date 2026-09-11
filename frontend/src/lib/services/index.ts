/**
 * Services barrel — every service is now a thin fetch shim against
 * /api/v1/* (the layered Express + Postgres backend).
 */

export { authService, type AppUser } from './auth';
export { adminService, type Customer } from './admin';

export { patientsService } from './patients';
export { appointmentsService } from './appointments';
export { invoicesService } from './invoices';
export { paymentsService } from './payments';
export { treatmentsService } from './treatments';
export { treatmentPlansService } from './treatmentPlans';
export { quotesService } from './quotes';
export { prescriptionsService } from './prescriptions';
export { certificatesService } from './certificates';
export { referralsService } from './referrals';
export { inventoryService } from './inventory';
export { inventoryTransactionsService } from './inventoryTransactions';
export { suppliersService } from './suppliers';
export { clinicalNotesService } from './clinicalNotes';
export { insuranceService } from './insurance';
export { settingsService, type ClinicSettings } from './settings';

export * as documentsService from './documents';
export * as notificationsService from './notifications';
