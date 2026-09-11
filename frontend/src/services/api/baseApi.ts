import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getStoredToken } from '@/shared/storage/authStorage';

function getBaseUrl(): string {
  const raw = (import.meta.env as Record<string, string | undefined>).VITE_API_BASE_URL;
  const trimmed = raw?.trim().replace(/\/$/, '') || '';
  if (!trimmed) return '/api/v1';
  // Be tolerant: if the env var omitted the version segment (a common
  // mistake during the workspace-split env transition), append /api/v1.
  if (/\/api\/v\d+$/.test(trimmed)) return trimmed;
  return `${trimmed}/api/v1`;
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: getBaseUrl(),
    prepareHeaders(headers, { endpoint }) {
      const token = getStoredToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (typeof endpoint === 'string' && endpoint.toLowerCase().includes('upload')) {
        return headers;
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: [
    'User',
    'Auth',
    'Clinic',
    'Invitation',
    'Staff',
    'Patient',
    'Appointment',
    'Invoice',
    'Payment',
    'Treatment',
    'TreatmentPlan',
    'Quote',
    'Prescription',
    'Inventory',
    'InventoryTransaction',
    'Supplier',
    'ClinicalNote',
    'VitalSigns',
    'Problem',
    'Vaccination',
    'BodyRegion',
    'InsurancePolicy',
    'InsuranceClaim',
    'Document',
    'Settings',
    'Stats',
    'Feature',
    'RolePermissions',
  ],
  endpoints: () => ({}),
});
