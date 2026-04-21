import { api } from '../../../shared/api';

export const itemsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getItems: builder.query<any[], { q?: string; categoryId?: string; boxTypeId?: string }>({
            query: ({ q, categoryId, boxTypeId } = {}) => {
                const params = new URLSearchParams();
                if (q) params.set('q', q);
                if (categoryId) params.set('categoryId', categoryId);
                if (boxTypeId) params.set('boxTypeId', boxTypeId);
                return `items?${params.toString()}`;
            },
            providesTags: ['Items'],
        }),
        createItem: builder.mutation<any, any>({
            query: (body) => ({ url: 'items', method: 'POST', body }),
            invalidatesTags: ['Items'],
        }),
        updateItem: builder.mutation<any, { id: string; data: any }>({
            query: ({ id, data }) => ({ url: `items/${id}`, method: 'PUT', body: data }),
            invalidatesTags: ['Items'],
        }),
        bulkAssignBoxType: builder.mutation<number, { boxTypeId: string; supplierId?: string; category?: string; itemId?: string }>({
            query: (body) => ({ url: 'items/bulk-box-type', method: 'POST', body }),
            invalidatesTags: ['Items'],
        }),
        deleteItem: builder.mutation<void, string>({
            query: (id) => ({ url: `items/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Items'],
        }),
        getItemCategories: builder.query<any[], string | void>({
            query: (depositoId) => `items/categories${depositoId ? `?depositoId=${depositoId}` : ''}`,
            providesTags: ['Items'], // Reuse items tag or create Category tag
        }),
        createItemCategory: builder.mutation<any, { nombre: string; depositoId: string }>({
            query: (body) => ({ url: 'items/categories', method: 'POST', body }),
            invalidatesTags: ['Items'],
        }),
    }),
});

export const { 
    useGetItemsQuery, 
    useLazyGetItemsQuery, 
    useCreateItemMutation, 
    useUpdateItemMutation, 
    useDeleteItemMutation,
    useBulkAssignBoxTypeMutation,
    useGetItemCategoriesQuery,
    useCreateItemCategoryMutation
} = itemsApi;
