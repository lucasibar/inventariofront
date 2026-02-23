import { api } from '../../../shared/api';

export const ordersApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getOrders: builder.query<any[], void>({
            query: () => 'orders',
            providesTags: ['Orders'],
        }),
        getOrder: builder.query<any, string>({
            query: (id) => `orders/${id}`,
            providesTags: ['Orders'],
        }),
        createOrder: builder.mutation<any, any>({
            query: (body) => ({ url: 'orders', method: 'POST', body }),
            invalidatesTags: ['Orders'],
        }),
        updateOrder: builder.mutation<any, { id: string; data: any }>({
            query: ({ id, data }) => ({ url: `orders/${id}`, method: 'PUT', body: data }),
            invalidatesTags: ['Orders'],
        }),
        deleteOrder: builder.mutation<void, string>({
            query: (id) => ({ url: `orders/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Orders'],
        }),
    }),
});

export const { useGetOrdersQuery, useGetOrderQuery, useCreateOrderMutation, useUpdateOrderMutation, useDeleteOrderMutation } = ordersApi;
