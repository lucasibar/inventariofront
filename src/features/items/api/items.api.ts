import { api } from '../../../shared/api';

export const itemsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getItems: builder.query<any[], { q?: string; categoria?: string; boxTypeId?: string }>({
            query: ({ q, categoria, boxTypeId } = {}) => {
                const params = new URLSearchParams();
                if (q) params.set('q', q);
                if (categoria) params.set('categoria', categoria);
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
    }),
});

export const { 
    useGetItemsQuery, 
    useLazyGetItemsQuery, 
    useCreateItemMutation, 
    useUpdateItemMutation, 
    useDeleteItemMutation,
    useBulkAssignBoxTypeMutation
} = itemsApi;
