import { api } from '../../../shared/api';

export const ordersApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getOrders: builder.query<any[], void>({
            query: () => 'orders',
            providesTags: ['Orders'],
        }),
        getOrder: builder.query<any, string>({
            query: (id: string) => `orders/${id}`,
            providesTags: ['Orders'],
        }),
        createOrder: builder.mutation<any, any>({
            query: (body: any) => ({ url: 'orders', method: 'POST', body }),
            invalidatesTags: ['Orders'],
        }),
        updateOrder: builder.mutation<any, { id: string; data: any }>({
            query: ({ id, data }: { id: string; data: any }) => ({ url: `orders/${id}`, method: 'PUT', body: data }),
            invalidatesTags: ['Orders'],
        }),
        deleteOrder: builder.mutation<void, string>({
            query: (id: string) => ({ url: `orders/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Orders'],
        }),
    }),
});

export const { useGetOrdersQuery, useGetOrderQuery, useCreateOrderMutation, useUpdateOrderMutation, useDeleteOrderMutation } = ordersApi;
