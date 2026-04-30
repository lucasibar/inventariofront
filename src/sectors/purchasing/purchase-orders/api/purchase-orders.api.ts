import { api } from '../../../../shared/api';

export const purchaseOrdersApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getPurchaseOrders: builder.query<any[], void>({
            query: () => '/purchase-orders',
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
            providesTags: ['Movements'],
        }),
        linkMovement: builder.mutation<any, { movementId: string; purchaseOrderLineId: string }>({
            query: (body) => ({
                url: '/purchase-orders/link',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['PurchaseOrders', 'Movements', 'Dashboard'],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetPurchaseOrdersQuery,
    useCreatePurchaseOrderMutation,
    useDeletePurchaseOrderMutation,
    useUpdatePurchaseOrderStatusMutation,
    useGetDashboardStatsQuery,
    useGetUnlinkedMovementsQuery,
    useLinkMovementMutation,
} = purchaseOrdersApi;
