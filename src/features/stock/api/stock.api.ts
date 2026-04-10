import { api } from '../../../shared/api';

export const stockApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getStock: builder.query<any[], {
            depotId?: string; positionId?: string; supplierId?: string;
            itemId?: string; lotNumber?: string; q?: string; categoria?: string;
            limit?: number;
        }>({
            query: (f = {}) => {
                const p = new URLSearchParams();
                Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, String(v)) });
                return `stock?${p.toString()}`;
            },
            providesTags: (result, error, arg) => [
                { type: 'Stock', id: `${arg.depotId || 'all'}-${arg.positionId || 'all'}` },
                'Stock'
            ],
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
            qtyPrincipal: number; qtySecundaria?: number | null;
            fecha: string; observaciones?: string;
        }>({
            query: (body) => ({ url: 'stock/adjust', method: 'PATCH', body }),
            invalidatesTags: ['Stock'],
        }),
        moveStock: builder.mutation<void, {
            depositoId: string; posicionIdOrigen: string; posicionIdDestino: string;
            itemId: string; lotId: string; qtyPrincipal: number; qtySecundaria?: number | null; fecha: string;
        }>({
            query: (body) => ({ url: 'stock/move', method: 'POST', body }),
            invalidatesTags: ['Stock'],
        }),
        bulkMoveStock: builder.mutation<void, {
            items: {
                depositoId: string; posicionIdOrigen: string; posicionIdDestino: string;
                itemId: string; lotId: string; qtyPrincipal: number; qtySecundaria?: number | null;
            }[];
            fecha: string;
            observaciones?: string;
        }>({
            query: (body) => ({ url: 'stock/bulk-move', method: 'POST', body }),
            invalidatesTags: ['Stock'],
        }),

        quickAddStock: builder.mutation<void, {
            depositoId: string; posicionId: string; itemId: string; supplierId: string;
            lotNumber: string; qtyPrincipal: number; qtySecundaria?: number | null; fecha: string;
        }>({
            query: (body) => ({ url: 'stock/quick-add', method: 'POST', body }),
            invalidatesTags: ['Stock'],
        }),
        deleteStock: builder.mutation<void, {
            depositoId: string; posicionId: string; itemId: string; lotId: string; fecha: string;
        }>({
            query: (body) => ({ url: 'stock', method: 'DELETE', body }),
            invalidatesTags: ['Stock'],
        }),
        reassignBatch: builder.mutation<{ action: 'merged' | 'created'; batchId: string }, {
            depositoId: string; posicionId: string; itemId: string;
            currentLotId: string; newLotNumber: string; fecha: string;
        }>({
            query: (body) => ({ url: 'stock/reassign-batch', method: 'PATCH', body }),
            invalidatesTags: ['Stock'],
        }),
        checkBatch: builder.query<{ exists: boolean; batchId?: string }, { itemId: string; lotNumber: string; supplierId?: string }>({
            query: (params) => {
                const p = new URLSearchParams({ itemId: params.itemId, lotNumber: params.lotNumber });
                if (params.supplierId) p.set('supplierId', params.supplierId);
                return `stock/check-batch?${p.toString()}`;
            },
        }),
        submitPickingAudit: builder.mutation<any, {
            items: { depositoId: string; posicionId: string; itemId: string; lotId: string | null; faltantePrincipal: number }[];
            fecha: string; observaciones?: string;
        }>({
            query: (body) => ({ url: 'auditoria-picking', method: 'POST', body }),
            invalidatesTags: ['Stock'],
        }),

        // --- Combos de Compra ---
        getCombos: builder.query<any[], void>({
            query: () => 'combos-compra',
            providesTags: ['Dashboard'],
        }),
        getComboBreakdown: builder.query<any[], string>({
            query: (id) => `combos-compra/${id}/breakdown`,
            providesTags: ['Dashboard', 'Stock'],
        }),
        createCombo: builder.mutation<any, { title: string; supplierId?: string | null; itemIds: string[] }>({
            query: (body) => ({ url: 'combos-compra', method: 'POST', body }),
            invalidatesTags: ['Dashboard'],
        }),
        deleteCombo: builder.mutation<void, string>({
            query: (id) => ({ url: `combos-compra/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Dashboard'],
        }),
        deleteAllItemStock: builder.mutation<void, { itemId: string; fecha: string; observaciones?: string }>({
            query: ({ itemId, ...body }) => ({ url: `stock/item/${itemId}`, method: 'DELETE', body }),
            invalidatesTags: ['Stock'],
        }),
        getRecentMovements: builder.query<any[], { desde?: string; hasta?: string; depositoId?: string; itemId?: string; lotNumber?: string }>({
            query: (params) => {
                const p = new URLSearchParams();
                if (params.desde) p.set('desde', params.desde);
                if (params.hasta) p.set('hasta', params.hasta);
                if (params.depositoId) p.set('depositoId', params.depositoId);
                if (params.itemId) p.set('itemId', params.itemId);
                if (params.lotNumber) p.set('lotNumber', params.lotNumber);
                return `movimientos?${p.toString()}`;
            },
            providesTags: ['Stock'],
        }),
        reverseMovement: builder.mutation<void, string>({
            query: (id) => ({ url: `movimientos/${id}/cancel`, method: 'POST' }),
            invalidatesTags: ['Stock'],
        }),
    }),
});

export const {
    useGetStockQuery,
    useGetAlertsQuery,
    useGetDashboardComprasQuery,
    useAdjustStockMutation,
    useMoveStockMutation,
    useBulkMoveStockMutation,
    useQuickAddStockMutation,
    useDeleteStockMutation,
    useReassignBatchMutation,
    useLazyCheckBatchQuery,
    useSubmitPickingAuditMutation,
    useGetCombosQuery,
    useGetComboBreakdownQuery,
    useCreateComboMutation,
    useDeleteComboMutation,
    useDeleteAllItemStockMutation,
    useGetRecentMovementsQuery,
    useReverseMovementMutation,
} = stockApi;


