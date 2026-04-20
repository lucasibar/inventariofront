import { api } from '../../../shared/api';

export const remitosSalidaApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getRemitosSalida: builder.query<any[], void>({
            query: () => 'remitos-salida',
            providesTags: ['RemitosSalida'],
        }),
        getRemitoSalida: builder.query<any, string>({
            query: (id) => `remitos-salida/${id}`,
            providesTags: ['RemitosSalida'],
        }),
        previewRemitoSalida: builder.mutation<any, { lines: any[] }>({
            query: (body) => ({ url: 'remitos-salida/preview', method: 'POST', body }),
        }),
        createRemitoSalida: builder.mutation<any, any>({
            query: (body) => ({ url: 'remitos-salida', method: 'POST', body }),
            invalidatesTags: ['RemitosSalida', 'Stock'],
        }),
        deleteRemitoSalida: builder.mutation<void, string>({
            query: (id) => ({ url: `remitos-salida/${id}`, method: 'DELETE' }),
            invalidatesTags: ['RemitosSalida'],
        }),
        despachoDirecto: builder.mutation<any, {
            fecha: string;
            clientId?: string;
            clientName?: string;
            depositoId: string;
            posicionId: string;
            itemId: string;
            lotId: string;
            qtyPrincipal: number;
            qtySecundaria?: number;
        }>({
            query: (body) => ({ url: 'remitos-salida/despacho-directo', method: 'POST', body }),
            invalidatesTags: ['RemitosSalida', 'Stock'],
        }),
    }),
});

export const { useGetRemitosSalidaQuery, useGetRemitoSalidaQuery, useLazyGetRemitoSalidaQuery, usePreviewRemitoSalidaMutation, useCreateRemitoSalidaMutation, useDeleteRemitoSalidaMutation, useDespachoDirectoMutation } = remitosSalidaApi;
