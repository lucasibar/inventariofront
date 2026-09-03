import { api } from '../../../../shared/api';

export const itemsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getItems: builder.query<any[], { q?: string; categoryId?: string; boxTypeId?: string; depositoId?: string }>({
            query: ({ q, categoryId, boxTypeId, depositoId } = {}) => {
                const params = new URLSearchParams();
                if (q) params.set('q', q);
                if (categoryId) params.set('categoryId', categoryId);
                if (boxTypeId) params.set('boxTypeId', boxTypeId);
                if (depositoId) params.set('depositoId', depositoId);
                return `items?${params.toString()}`;
            },
            providesTags: ['Items'],
        }),
        getItemsCompleteness: builder.query<any, { page: number; pageSize: number; q?: string; depositoId?: string; level?: string }>({
            query: ({ page, pageSize, q, depositoId, level }) => {
                const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
                if (q) params.set('q', q);
                if (depositoId) params.set('depositoId', depositoId);
                if (level) params.set('level', level);
                return `items/completeness?${params}`;
            },
            providesTags: ['Items'],
            transformResponse: (response: any) => ({
                ...response,
                data: response.data.map((item: any) => ({
                    ...item,
                    code: item.codigoInterno,
                    description: item.descripcion,
                    context: [item.deposito, item.categoria, item.supplierName].filter(Boolean).join(' · '),
                })),
            }),
        }),
        createItem: builder.mutation<any, any>({
            query: (body) => ({ url: 'items', method: 'POST', body }),
            invalidatesTags: ['Items', 'Stock'],
        }),
        updateItem: builder.mutation<any, { id: string; data: any }>({
            query: ({ id, data }) => ({ url: `items/${id}`, method: 'PUT', body: data }),
            invalidatesTags: ['Items', 'Stock', 'RemitosEntrada', 'RemitosSalida', 'Dashboard'],
        }),
        bulkAssignBoxType: builder.mutation<number, { boxTypeId: string; supplierId?: string; categoryId?: string; itemId?: string }>({
            query: (body) => ({ url: 'items/bulk-box-type', method: 'POST', body }),
            invalidatesTags: ['Items'],
        }),
        deleteItem: builder.mutation<void, string>({
            query: (id) => ({ url: `items/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Items'],
        }),
        syncItemRelations: builder.mutation<{ batchesUpdated: number; stockUpdated: number; docsUpdated: number }, void>({
            query: () => ({ url: 'items/sync-relations', method: 'POST' }),
            invalidatesTags: ['Items', 'Stock', 'RemitosEntrada', 'RemitosSalida', 'Dashboard'],
        }),
        getItemCategories: builder.query<any[], string | void>({
            query: (depositoId) => `items/categories${depositoId ? `?depositoId=${depositoId}` : ''}`,
            providesTags: ['Items'], // Reuse items tag or create Category tag
        }),
        createItemCategory: builder.mutation<any, { nombre: string; depositoId: string; minimo?: number; maximo?: number }>({
            query: (body) => ({ url: 'items/categories', method: 'POST', body }),
            invalidatesTags: ['Items'],
        }),
        updateItemCategory: builder.mutation<any, { id: string; data: { nombre?: string; minimo?: number | null; maximo?: number | null; activo?: boolean } }>({
            query: ({ id, data }) => ({ url: `items/categories/${id}`, method: 'PUT', body: data }),
            invalidatesTags: ['Items'],
        }),
    }),
});

export const { 
    useGetItemsQuery, 
    useGetItemsCompletenessQuery,
    useLazyGetItemsQuery, 
    useCreateItemMutation, 
    useUpdateItemMutation, 
    useDeleteItemMutation,
    useSyncItemRelationsMutation,
    useBulkAssignBoxTypeMutation,
    useGetItemCategoriesQuery,
    useCreateItemCategoryMutation,
    useUpdateItemCategoryMutation
} = itemsApi;
