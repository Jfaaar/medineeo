// Legacy `api` facade — preserves the call surface used across feature
// pages (api.patients.list(), api.appointments.save(), etc.) while
// delegating to the fetch-based services in lib/services/*. Backoffice
// and staff endpoints are stubbed because the post-Supabase auth provider
// hasn't been wired in yet.

import {
  Appointment,
  Patient,
  Invoice,
  Treatment,
  Quote,
  InventoryItem,
  Prescription,
  Certificate,
  Referral,
  Supplier,
} from '../types';
import {
  patientsService,
  appointmentsService,
  invoicesService,
  treatmentsService,
  quotesService,
  prescriptionsService,
  certificatesService,
  referralsService,
  inventoryService,
  suppliersService,
} from './services';

const NOT_IMPLEMENTED = (op: string) =>
  Promise.reject(new Error(`${op} requires the auth provider to be wired in (currently stubbed).`));

// Variadic stubs so existing callsites compile; rejection happens at call time.
// Return type is `Promise<any>` so consumers like .find() / .filter() on the
// (unreachable) result still type-check.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Stub = (..._args: unknown[]) => Promise<any>;
const stub = (op: string): Stub => () => NOT_IMPLEMENTED(op);

export const api = {
  auth: {
    login: stub('api.auth.login'),
    register: stub('api.auth.register'),
  },
  backoffice: {
    listClinics: stub('api.backoffice.listClinics'),
    createClinic: stub('api.backoffice.createClinic'),
    updateClinic: stub('api.backoffice.updateClinic'),
    deleteClinic: stub('api.backoffice.deleteClinic'),
    getStats: stub('api.backoffice.getStats'),
    getClinicUsers: stub('api.backoffice.getClinicUsers'),
    resetUserPassword: stub('api.backoffice.resetUserPassword'),
    updateUserRole: stub('api.backoffice.updateUserRole'),
    createClinicUser: stub('api.backoffice.createClinicUser'),
    updateUser: stub('api.backoffice.updateUser'),
    deleteUser: stub('api.backoffice.deleteUser'),
  },
  staff: {
    create: stub('api.staff.create'),
  },

  // ────────────── Domain entities (Postgres-backed via /api/v1/*) ──────────────
  patients: {
    list: async (
      opts: { search?: string; page?: number; pageSize?: number; status?: 'active' | 'archived' } = {},
    ): Promise<Patient[]> => {
      const { data } = await patientsService.list({
        search: opts.search,
        page: opts.page,
        pageSize: opts.pageSize,
        filters: opts.status ? { status: opts.status } : undefined,
      });
      return data;
    },
    listPaged: (opts: {
      search?: string;
      page?: number;
      pageSize?: number;
      status?: 'active' | 'archived';
    } = {}) =>
      patientsService.list({
        search: opts.search,
        page: opts.page,
        pageSize: opts.pageSize,
        filters: opts.status ? { status: opts.status } : undefined,
      }),
    create: (patient: Patient) => {
      const { id: _omitId, createdAt: _omitCreatedAt, ...rest } = patient;
      void _omitId;
      void _omitCreatedAt;
      return patientsService.create({ ...rest, status: rest.status ?? 'active' });
    },
    update: (patient: Patient) => patientsService.update(patient),
    delete: async (id: string) => {
      await patientsService.delete(id);
      return { success: true };
    },
  },

  appointments: {
    list: async (): Promise<Appointment[]> => {
      const { data } = await appointmentsService.list({ pageSize: 500 });
      return data;
    },
    save: async (
      appointment: Partial<Appointment>,
      cancelIds: string[] = [],
    ): Promise<Appointment[]> => {
      if (cancelIds.length > 0) await appointmentsService.cancelMany(cancelIds);

      if (appointment.id) {
        await appointmentsService.update({
          id: appointment.id,
          patientId: appointment.patientId,
          start: appointment.start,
          end: appointment.end,
          status: appointment.status,
          observation: appointment.observation,
        });
      } else if (appointment.patientId && appointment.start && appointment.end) {
        await appointmentsService.create({
          patientId: appointment.patientId,
          patientName: appointment.patientName ?? '',
          start: appointment.start,
          end: appointment.end,
          status: appointment.status ?? 'pending',
          observation: appointment.observation,
        });
      }

      const { data } = await appointmentsService.list({ pageSize: 500 });
      return data;
    },
    restore: async (id: string): Promise<Appointment[]> => {
      await appointmentsService.restore(id);
      const { data } = await appointmentsService.list({ pageSize: 500 });
      return data;
    },
  },

  invoices: {
    list: async (): Promise<Invoice[]> => {
      const { data } = await invoicesService.list({ pageSize: 500 });
      return data;
    },
    create: (invoice: Omit<Invoice, 'id'>) => invoicesService.create(invoice),
    update: (invoice: Invoice) => invoicesService.update(invoice),
  },

  treatments: {
    list: async (patientId: string): Promise<Treatment[]> => {
      const { data } = await treatmentsService.list({ patientId, pageSize: 500 });
      return data;
    },
    create: (treatment: Omit<Treatment, 'id'>) => treatmentsService.create(treatment),
  },

  quotes: {
    list: async (patientId: string): Promise<Quote[]> => {
      const { data } = await quotesService.list({ patientId, pageSize: 500 });
      return data;
    },
    create: (quote: Omit<Quote, 'id'>) => quotesService.create(quote),
  },

  inventory: {
    list: async (): Promise<InventoryItem[]> => {
      const { data } = await inventoryService.list({ pageSize: 500 });
      return data;
    },
    create: (item: Omit<InventoryItem, 'id'>) => inventoryService.create(item),
    update: (item: InventoryItem) => inventoryService.update(item),
    delete: async (id: string) => {
      await inventoryService.delete(id);
      return true;
    },
    adjustStock: (id: string, quantity: number, reason: string) =>
      inventoryService.adjustStock(id, quantity, reason),
  },

  suppliers: {
    list: async (): Promise<Supplier[]> => {
      const { data } = await suppliersService.list({ pageSize: 500 });
      return data;
    },
    create: (supplier: Omit<Supplier, 'id'>) => suppliersService.create(supplier),
    update: (supplier: Supplier) => suppliersService.update(supplier),
    delete: async (id: string) => {
      await suppliersService.delete(id);
      return true;
    },
  },

  prescriptions: {
    list: async (patientId: string): Promise<Prescription[]> => {
      const { data } = await prescriptionsService.list({ patientId, pageSize: 500 });
      return data;
    },
    create: (prescription: Omit<Prescription, 'id'>) =>
      prescriptionsService.create(prescription),
  },

  certificates: {
    list: async (patientId: string): Promise<Certificate[]> => {
      const { data } = await certificatesService.list({ patientId, pageSize: 500 });
      return data;
    },
    listAll: async (): Promise<Certificate[]> => {
      const { data } = await certificatesService.list({ pageSize: 500 });
      return data;
    },
    create: (certificate: Omit<Certificate, 'id'>) =>
      certificatesService.create(certificate),
    sign: (id: string) => certificatesService.sign(id),
    remove: (id: string) => certificatesService.remove(id),
  },

  referrals: {
    list: async (patientId: string): Promise<Referral[]> => {
      const { data } = await referralsService.list({ patientId, pageSize: 500 });
      return data;
    },
    listAll: async (): Promise<Referral[]> => {
      const { data } = await referralsService.list({ pageSize: 500 });
      return data;
    },
    create: (referral: Omit<Referral, 'id'>) =>
      referralsService.create(referral),
    sign: (id: string) => referralsService.sign(id),
    remove: (id: string) => referralsService.remove(id),
  },
};
