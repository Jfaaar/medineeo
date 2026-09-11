// Referral letters service — thin fetch shim over /api/v1/referrals.
import { http } from '../http';
import type { Referral } from '../../types';

interface ListOpts {
  page?: number;
  pageSize?: number;
  patientId?: string;
}

interface BackendPaged {
  data: Referral[];
  page: number;
  pageSize: number;
  total: number;
}

export const referralsService = {
  async list(opts: ListOpts = {}) {
    const r = await http<BackendPaged>('GET', 'referrals', { params: opts });
    return { data: r.data, total: r.total };
  },

  async get(id: string) {
    try {
      return await http<Referral>('GET', `referrals/${id}`);
    } catch (e: unknown) {
      if ((e as { status?: number }).status === 404) return null;
      throw e;
    }
  },

  async create(input: Omit<Referral, 'id'>): Promise<Referral> {
    return http<Referral>('POST', 'referrals', { body: input });
  },

  async update(id: string, input: Partial<Referral>): Promise<Referral> {
    return http<Referral>('PUT', `referrals/${id}`, { body: input });
  },

  async sign(id: string): Promise<Referral> {
    return http<Referral>('POST', `referrals/${id}/sign`);
  },

  async remove(id: string): Promise<void> {
    await http<void>('DELETE', `referrals/${id}`);
  },
};

export type { ListOpts as ReferralsListOpts };
