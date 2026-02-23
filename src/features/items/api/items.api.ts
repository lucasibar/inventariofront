import { api } from '../../../shared/api';

export const itemsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getItems: builder.query<any[], { q?: string; categoria?: string }>({
            query: ({ q, categoria } = {}) => {
                const params = new URLSearchParams();
                if (q) params.set('q', q);
                if (categoria) params.set('categoria', categoria);
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
        deleteItem: builder.mutation<void, string>({
            query: (id) => ({ url: `items/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Items'],
        }),
    }),
});

export const { useGetItemsQuery, useLazyGetItemsQuery, useCreateItemMutation, useUpdateItemMutation, useDeleteItemMutation } = itemsApi;
