import { api } from '../../../../shared/api';

export const inventoryCheckApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getInventoryChecks: builder.query<any[], {
            depositoId?: string; categoryId?: string; status?: string; desde?: string; hasta?: string;
        }>({
            query: (f = {}) => {
                const p = new URLSearchParams();
                Object.entries(f).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)) });
                return `inventory-checks?${p.toString()}`;
            },
            providesTags: ['InventoryChecks'],
        }),
        getInventoryCheck: builder.query<any, string>({
            query: (id) => `inventory-checks/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'InventoryChecks', id }],
        }),
        createInventoryCheck: builder.mutation<any, { depositoId: string; categoryId?: string }>({
            query: (body) => ({ url: 'inventory-checks', method: 'POST', body }),
            invalidatesTags: ['InventoryChecks'],
        }),
        updateCheckItem: builder.mutation<any, {
            checkId: string; itemId: string;
            tag: string; observacion?: string | null; notaLibre?: string | null;
            realQtyPrincipal?: number | null; realQtySecundaria?: number | null;
        }>({
            query: ({ checkId, itemId, ...body }) => ({
                url: `inventory-checks/${checkId}/items/${itemId}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: (_result, _error, { checkId }) => [{ type: 'InventoryChecks', id: checkId }],
        }),
        completeCheck: builder.mutation<any, string>({
            query: (id) => ({ url: `inventory-checks/${id}/complete`, method: 'PATCH' }),
            invalidatesTags: (_result, _error, id) => [{ type: 'InventoryChecks', id }, 'InventoryChecks'],
        }),
        getCheckReport: builder.query<any, string>({
            query: (id) => `inventory-checks/${id}/report`,
            providesTags: (_result, _error, id) => [{ type: 'InventoryChecks', id }],
        }),
        getInventoryCheckAnalytics: builder.query<any, void>({
            query: () => 'inventory-checks/analytics',
            providesTags: ['InventoryChecks'],
        }),
    }),
});

export const {
    useGetInventoryChecksQuery,
    useGetInventoryCheckQuery,
    useCreateInventoryCheckMutation,
    useUpdateCheckItemMutation,
    useCompleteCheckMutation,
    useGetCheckReportQuery,
    useGetInventoryCheckAnalyticsQuery,
} = inventoryCheckApi;
