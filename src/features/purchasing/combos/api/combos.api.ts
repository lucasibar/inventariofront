import { api } from '../../../../shared/api';

export const combosApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getCombos: builder.query<any[], string | void>({
            query: (depositoId) => `combos-compra${depositoId ? `?depositoId=${depositoId}` : ''}`,
            providesTags: ['Combos'],
        }),
        getComboBreakdown: builder.query<any[], string>({
            query: (id) => `combos-compra/${id}/breakdown`,
            providesTags: ['Combos'],
        }),
        createCombo: builder.mutation<any, { title: string; supplierId?: string | null; itemIds: string[]; depositoId?: string | null; stockMinimo?: number | null; stockMaximo?: number | null }>({
            query: (body) => ({ url: 'combos-compra', method: 'POST', body }),
            invalidatesTags: ['Combos'],
        }),
        updateCombo: builder.mutation<any, { id: string; data: { title?: string; itemIds?: string[]; depositoId?: string | null; stockMinimo?: number | null; stockMaximo?: number | null } }>({
            query: ({ id, data }) => ({ url: `combos-compra/${id}`, method: 'PATCH', body: data }),
            invalidatesTags: ['Combos'],
        }),
        deleteCombo: builder.mutation<void, string>({
            query: (id) => ({ url: `combos-compra/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Combos'],
        }),
    }),
});

export const {
    useGetCombosQuery,
    useGetComboBreakdownQuery,
    useCreateComboMutation,
    useUpdateComboMutation,
    useDeleteComboMutation,
} = combosApi;
