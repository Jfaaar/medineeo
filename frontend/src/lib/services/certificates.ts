// Certificates service — thin fetch shim over /api/v1/certificates.
import { http } from '../http';
import type { Certificate } from '../../types';

interface ListOpts {
  page?: number;
  pageSize?: number;
  patientId?: string;
}

interface BackendPaged {
  data: Certificate[];
  page: number;
  pageSize: number;
  total: number;
}

export const certificatesService = {
  async list(opts: ListOpts = {}) {
    const r = await http<BackendPaged>('GET', 'certificates', { params: opts });
    return { data: r.data, total: r.total };
  },

  async get(id: string) {
    try {
      return await http<Certificate>('GET', `certificates/${id}`);
    } catch (e: unknown) {
      if ((e as { status?: number }).status === 404) return null;
      throw e;
    }
  },

  async create(input: Omit<Certificate, 'id'>): Promise<Certificate> {
    return http<Certificate>('POST', 'certificates', { body: input });
  },

  async update(id: string, input: Partial<Certificate>): Promise<Certificate> {
    return http<Certificate>('PUT', `certificates/${id}`, { body: input });
  },

  async sign(id: string): Promise<Certificate> {
    return http<Certificate>('POST', `certificates/${id}/sign`);
  },

  async remove(id: string): Promise<void> {
    await http<void>('DELETE', `certificates/${id}`);
  },
};

export type { ListOpts as CertificatesListOpts };
