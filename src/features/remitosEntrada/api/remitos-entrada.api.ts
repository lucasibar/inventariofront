import { api } from '../../../shared/api';

export const remitosEntradaApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getRemitosEntrada: builder.query<any[], void>({
            query: () => 'remitos-entrada',
            providesTags: ['RemitosEntrada'],
        }),
        getRemitoEntrada: builder.query<any, string>({
            query: (id) => `remitos-entrada/${id}`,
            providesTags: ['RemitosEntrada'],
        }),
        createRemitoEntrada: builder.mutation<any, any>({
            query: (body) => ({ url: 'remitos-entrada', method: 'POST', body }),
            invalidatesTags: ['RemitosEntrada', 'Stock'],
        }),
        deleteRemitoEntrada: builder.mutation<void, string>({
            query: (id) => ({ url: `remitos-entrada/${id}`, method: 'DELETE' }),
            invalidatesTags: ['RemitosEntrada'],
        }),
    }),
});

export const { useGetRemitosEntradaQuery, useGetRemitoEntradaQuery, useCreateRemitoEntradaMutation, useDeleteRemitoEntradaMutation } = remitosEntradaApi;
