import { api } from '../../../../shared/api';

export const purchaseOrdersApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getPurchaseOrders: builder.query<any[], string | void>({
            query: (depositoId) => `/purchase-orders${depositoId ? `?depositoId=${depositoId}` : ''}`,
            providesTags: ['PurchaseOrders'],
        }),
        createPurchaseOrder: builder.mutation<any, Partial<any>>({
            query: (body) => ({
                url: '/purchase-orders',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['PurchaseOrders', 'Dashboard'],
        }),
        updatePurchaseOrder: builder.mutation<any, { id: string; body: any }>({
            query: ({ id, body }) => ({
                url: `/purchase-orders/${id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['PurchaseOrders', 'Dashboard'],
        }),
        deletePurchaseOrder: builder.mutation<any, string>({
            query: (id) => ({
                url: `/purchase-orders/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['PurchaseOrders', 'Dashboard'],
        }),
        updatePurchaseOrderStatus: builder.mutation<any, { id: string; status: string }>({
            query: ({ id, status }) => ({
                url: `/purchase-orders/${id}/status`,
                method: 'PATCH',
                body: { status },
            }),
            invalidatesTags: ['PurchaseOrders', 'Dashboard'],
        }),
        getDashboardStats: builder.query<any, void>({
            query: () => '/purchase-orders/dashboard-stats',
            providesTags: ['Dashboard'],
        }),
        getUnlinkedMovements: builder.query<any[], void>({
            query: () => '/purchase-orders/unlinked-movements',
            providesTags: ['Stock'],
        }),
        linkMovement: builder.mutation<any, { movementId: string; purchaseOrderLineId: string }>({
            query: (body) => ({
                url: '/purchase-orders/link',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['PurchaseOrders', 'Stock', 'Dashboard'],
        }),
        getCombos: builder.query<any[], string | void>({
            query: (depositoId) => `/combos-compra${depositoId ? `?depositoId=${depositoId}` : ''}`,
            providesTags: ['PurchaseOrders'],
        }),
        getComboBreakdown: builder.query<any, string>({
            query: (id) => `/combos-compra/${id}/breakdown`,
            providesTags: ['PurchaseOrders'],
        }),
        
        // --- NUEVOS ENDPOINTS ---
        getNextNumber: builder.query<{ numero: string }, void>({
            query: () => '/purchase-orders/next-number',
            providesTags: ['PurchaseOrders'],
        }),
        getOrderFulfillment: builder.query<any, string>({
            query: (id) => `/purchase-orders/${id}/fulfillment`,
            providesTags: ['PurchaseOrders'],
        }),
        getPendingForItem: builder.query<any[], { supplierId: string; itemId: string }>({
            query: ({ supplierId, itemId }) => `/purchase-orders/pending-for-item?supplierId=${supplierId}&itemId=${itemId}`,
            providesTags: ['PurchaseOrders'],
        }),
        getSupplierPending: builder.query<any[], string>({
            query: (supplierId) => `/purchase-orders/supplier/${supplierId}/pending`,
            providesTags: ['PurchaseOrders'],
        }),
        linkMovementReceipt: builder.mutation<any, { movimientoId: string; links: { purchaseOrderLineId: string; qtyPrincipal: number; qtySecundaria?: number }[] }>({
            query: (body) => ({
                url: '/purchase-orders/receipts',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['PurchaseOrders', 'Stock', 'Dashboard'],
        }),
        closeAdjustment: builder.mutation<any, { purchaseOrderLineId: string; qtyPrincipal: number; qtySecundaria?: number | null; observaciones: string }>({
            query: (body) => ({
                url: '/purchase-orders/receipts/close-adjustment',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['PurchaseOrders', 'Dashboard'],
        }),
        unlinkReceipt: builder.mutation<any, string>({
            query: (id) => ({
                url: `/purchase-orders/receipts/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['PurchaseOrders', 'Stock', 'Dashboard'],
        }),
        generateRemitoFromPO: builder.mutation<any, { id: string; body: { depositoId?: string; fecha?: string; lines?: any[]; observaciones?: string } }>({
            query: ({ id, body }) => ({
                url: `/purchase-orders/${id}/generate-remito`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['PurchaseOrders', 'Stock', 'Dashboard'],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetPurchaseOrdersQuery,
    useCreatePurchaseOrderMutation,
    useUpdatePurchaseOrderMutation,
    useDeletePurchaseOrderMutation,
    useUpdatePurchaseOrderStatusMutation,
    useGetDashboardStatsQuery,
    useGetUnlinkedMovementsQuery,
    useLinkMovementMutation,
    useGetCombosQuery,
    useGetComboBreakdownQuery,
    
    // Hooks exportados para nuevos endpoints
    useGetNextNumberQuery,
    useGetOrderFulfillmentQuery,
    useGetPendingForItemQuery,
    useLazyGetPendingForItemQuery,
    useGetSupplierPendingQuery,
    useLinkMovementReceiptMutation,
    useCloseAdjustmentMutation,
    useUnlinkReceiptMutation,
    useGenerateRemitoFromPOMutation,
} = purchaseOrdersApi;
