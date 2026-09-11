// Treatment plans service — thin fetch shim over /api/v1/treatment-plans.
import { http } from '../http';
import type { TreatmentPlan, TreatmentPlanItem } from '../../types';

export interface ListOpts {
  page?: number;
  pageSize?: number;
  patientId?: string;
  search?: string;
  filters?: { status?: TreatmentPlan['status'] };
}

interface BackendPaged {
  data: TreatmentPlan[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AddItemInput {
  description: string;
  price: number;
}

export interface ConvertToAppointmentsInput {
  startDate: string; // ISO datetime
  durationMinutes?: number;
  spacingDays?: number;
}

export interface ConvertToInvoiceResult {
  invoiceId: string;
  amount: number;
}

export interface ConvertToAppointmentsResult {
  appointments: string[];
}

export const treatmentPlansService = {
  async list(opts: ListOpts = {}) {
    const r = await http<BackendPaged>('GET', 'treatment-plans', {
      params: {
        page: opts.page,
        pageSize: opts.pageSize,
        patientId: opts.patientId,
        search: opts.search,
        status: opts.filters?.status,
      },
    });
    return { data: r.data, total: r.total, page: r.page, pageSize: r.pageSize };
  },

  async get(id: string): Promise<TreatmentPlan | null> {
    try {
      return await http<TreatmentPlan>('GET', `treatment-plans/${id}`);
    } catch (e: unknown) {
      if ((e as { status?: number }).status === 404) return null;
      throw e;
    }
  },

  async create(input: Omit<TreatmentPlan, 'id' | 'clinicId' | 'patientName'>) {
    return http<TreatmentPlan>('POST', 'treatment-plans', { body: input });
  },

  async update(id: string, input: Partial<TreatmentPlan>) {
    return http<TreatmentPlan>('PUT', `treatment-plans/${id}`, { body: input });
  },

  async cancel(id: string) {
    await http<void>('POST', `treatment-plans/${id}/cancel`);
  },

  async accept(id: string) {
    return http<TreatmentPlan>('POST', `treatment-plans/${id}/accept`);
  },

  async reject(id: string) {
    return http<TreatmentPlan>('POST', `treatment-plans/${id}/reject`);
  },

  async listItems(planId: string) {
    return http<TreatmentPlanItem[]>('GET', `treatment-plans/${planId}/items`);
  },

  async addItem(planId: string, input: AddItemInput) {
    return http<TreatmentPlanItem>('POST', `treatment-plans/${planId}/items`, { body: input });
  },

  async removeItem(itemId: string) {
    await http<void>('DELETE', `treatment-plans/items/${itemId}`);
  },

  async convertToInvoice(planId: string) {
    return http<ConvertToInvoiceResult>('POST', `treatment-plans/${planId}/convert-to-invoice`);
  },

  async convertToAppointments(planId: string, input: ConvertToAppointmentsInput) {
    return http<ConvertToAppointmentsResult>(
      'POST',
      `treatment-plans/${planId}/convert-to-appointments`,
      { body: input },
    );
  },
};
