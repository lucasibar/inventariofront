import { api } from '../../../shared/api';

export interface QualityLot {
    id: string;
    lotNumber: string;
    expirationDate: string | null;
    productionDate: string | null;
    qualityStatus: 'QUARANTINE' | 'RELEASED';
    qualityTestedAt: string | null;
    qualityTestedBy: string | null;
    qualityNotes: string | null;
    totalQtyPrincipal: number;
    createdAt: string;
    item: { id: string; codigoInterno: string; descripcion: string; unidadPrincipal: string };
    supplier: { id: string; name: string } | null;
    locations: Array<{ depositoId: string; deposito: string | null; posicion: string | null; qtyPrincipal: number }>;
}

export interface QualityLotsPage {
    data: QualityLot[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    summary: { quarantine: number; released: number; total: number };
}

export const qualityLotsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getQualityLots: builder.query<QualityLotsPage, { page: number; pageSize: number; status?: string; q?: string; depositoId?: string }>({
            query: ({ page, pageSize, status, q, depositoId }) => {
                const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
                if (status) params.set('status', status);
                if (q) params.set('q', q);
                if (depositoId) params.set('depositoId', depositoId);
                return `quality/lots?${params}`;
            },
            providesTags: ['Stock'],
        }),
        releaseQualityLot: builder.mutation<QualityLot, { id: string; notes?: string }>({
            query: ({ id, notes }) => ({ url: `quality/lots/${id}/release`, method: 'PATCH', body: { notes } }),
            invalidatesTags: ['Stock', 'Production', 'Dashboard'],
        }),
    }),
});

export const { useGetQualityLotsQuery, useReleaseQualityLotMutation } = qualityLotsApi;
