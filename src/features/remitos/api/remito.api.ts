import { api } from '../../../shared/api';
import type { CreateRemitoDto } from '../model/create-remito.dto';

export const remitoApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getRemitosEntrada: builder.query<any[], void>({
            query: () => 'remitos-entrada',
            providesTags: ['RemitosEntrada'],
        }),
        getRemitoEntrada: builder.query<any, string>({
            query: (id) => `remitos-entrada/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'RemitosEntrada', id }],
        }),
        getRemitosSalida: builder.query<any[], void>({
            query: () => 'remitos-salida',
            providesTags: ['RemitosSalida'],
        }),
        getRemitoSalida: builder.query<any, string>({
            query: (id) => `remitos-salida/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'RemitosSalida', id }],
        }),
        createRemito: builder.mutation<void, CreateRemitoDto>({
            query: (body) => ({
                url: 'remitos-entrada', // Correct endpoint based on legacy code
                method: 'POST',
                body,
            }),
            invalidatesTags: ['RemitosEntrada', 'Stock'],
        }),
        deleteRemito: builder.mutation<void, string>({
            query: (id) => ({ url: `remitos-entrada/${id}`, method: 'DELETE' }),
            invalidatesTags: ['RemitosEntrada'],
        }),
        getDepots: builder.query<any[], void>({
            query: () => 'depots',
        }),
        searchPartners: builder.query<any[], string>({
            query: (search) => `partners?search=${search}`,
        }),
    }),
});

export const {
    useCreateRemitoMutation,
    useGetDepotsQuery,
    useLazySearchPartnersQuery,
    useGetRemitosEntradaQuery,
    useGetRemitoEntradaQuery,
    useLazyGetRemitoEntradaQuery,
    useGetRemitosSalidaQuery,
    useGetRemitoSalidaQuery,
    useLazyGetRemitoSalidaQuery,
    useDeleteRemitoMutation
} = remitoApi;
