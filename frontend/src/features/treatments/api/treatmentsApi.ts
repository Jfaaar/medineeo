import { baseApi } from '@/services/api/baseApi';

export interface ConsumedMaterial {
  itemId: string;
  quantity: number;
}

export interface Treatment {
  id: string;
  patientId: string;
  date: string;
  description: string;
  price: number;
  status: 'planned' | 'completed';
  materialsUsed?: ConsumedMaterial[];
}

export interface TreatmentsListParams {
  page?: number;
  pageSize?: number;
  patientId?: string;
}

export interface TreatmentsListResponse {
  data: Treatment[];
  page: number;
  pageSize: number;
  total: number;
}

export const treatmentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listTreatments: build.query<TreatmentsListResponse, TreatmentsListParams | void>({
      query: (params) => ({
        url: 'treatments',
        params: (params ?? undefined) as Record<string, unknown> | undefined,
      }),
      transformResponse: (r: { data: TreatmentsListResponse }) => r.data,
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((t) => ({ type: 'Treatment' as const, id: t.id })),
              { type: 'Treatment' as const, id: 'LIST' },
            ]
          : [{ type: 'Treatment' as const, id: 'LIST' }],
    }),
    getTreatment: build.query<Treatment, string>({
      query: (id) => ({ url: `treatments/${id}` }),
      transformResponse: (r: { data: Treatment }) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Treatment', id }],
    }),
    createTreatment: build.mutation<Treatment, Omit<Treatment, 'id'>>({
      query: (body) => ({ url: 'treatments', method: 'POST', body }),
      transformResponse: (r: { data: Treatment }) => r.data,
      invalidatesTags: [
        { type: 'Treatment', id: 'LIST' },
        { type: 'Inventory', id: 'LIST' },
      ],
    }),
    updateTreatment: build.mutation<Treatment, { id: string; patch: Partial<Treatment> }>({
      query: ({ id, patch }) => ({ url: `treatments/${id}`, method: 'PUT', body: patch }),
      transformResponse: (r: { data: Treatment }) => r.data,
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Treatment', id },
        { type: 'Treatment', id: 'LIST' },
      ],
    }),
    cancelTreatment: build.mutation<void, string>({
      query: (id) => ({ url: `treatments/${id}/cancel`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Treatment', id },
        { type: 'Treatment', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListTreatmentsQuery,
  useGetTreatmentQuery,
  useCreateTreatmentMutation,
  useUpdateTreatmentMutation,
  useCancelTreatmentMutation,
} = treatmentsApi;
