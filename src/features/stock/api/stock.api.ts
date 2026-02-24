import { api } from '../../../shared/api';

export const stockApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getStock: builder.query<any[], {
            depotId?: string; positionId?: string; supplierId?: string;
            itemId?: string; lotNumber?: string; q?: string;
        }>({
            query: (f = {}) => {
                const p = new URLSearchParams();
                Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v as string); });
                return `stock?${p.toString()}`;
            },
            providesTags: ['Stock'],
        }),
        getAlerts: builder.query<any[], void>({
            query: () => 'stock/alerts',
            providesTags: ['Stock'],
        }),
        getDashboardCompras: builder.query<any[], void>({
            query: () => 'dashboard/compras',
            providesTags: ['Dashboard'],
        }),
        adjustStock: builder.mutation<any, {
            depositoId: string; posicionId: string; itemId: string; lotId: string;
            deltaKilos: number; deltaUnidades?: number | null;
            fecha: string; observaciones?: string;
        }>({
            query: (body) => ({ url: 'stock/adjust', method: 'PATCH', body }),
            invalidatesTags: ['Stock'],
        }),
        moveStock: builder.mutation<void, {
            depositoId: string; posicionIdOrigen: string; posicionIdDestino: string;
            itemId: string; lotId: string; kilos: number; unidades?: number | null; fecha: string;
        }>({
            query: (body) => ({ url: 'stock/move', method: 'POST', body }),
            invalidatesTags: ['Stock'],
        }),
        deleteStock: builder.mutation<void, {
            depositoId: string; posicionId: string; itemId: string; lotId: string; fecha: string;
        }>({
            query: (body) => ({ url: 'stock', method: 'DELETE', body }),
            invalidatesTags: ['Stock'],
        }),
        updateBatchNumber: builder.mutation<void, { batchId: string; newLotNumber: string }>({
            query: (body) => ({ url: 'stock/batch-number', method: 'PATCH', body }),
            invalidatesTags: ['Stock'],
        }),
        getStockSummary: builder.query<any, {
            depositoId?: string; supplierId?: string; itemId?: string;
            lotId?: string; categoria?: string; rotacion?: string;
            groupBy?: 'item' | 'batch' | 'categoria';
        }>({
            query: (f = {}) => {
                const p = new URLSearchParams();
                Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v as string); });
                return `stock/summary?${p.toString()}`;
            },
            providesTags: ['Stock'],
        }),
    }),
});

export const {
    useGetStockQuery,
    useGetAlertsQuery,
    useGetDashboardComprasQuery,
    useAdjustStockMutation,
    useMoveStockMutation,
    useDeleteStockMutation,
    useUpdateBatchNumberMutation,
    useGetStockSummaryQuery,
} = stockApi;


