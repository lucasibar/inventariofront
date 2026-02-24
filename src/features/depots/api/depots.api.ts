import { api } from '../../../shared/api';

export const depotsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getDepots: builder.query<any[], void>({
            query: () => 'depots',
            providesTags: ['Depots'],
        }),
        getArchivedDepots: builder.query<any[], void>({
            query: () => 'depots/archived',
            providesTags: ['Depots'],
        }),
        createDepot: builder.mutation<any, any>({
            query: (body) => ({ url: 'depots', method: 'POST', body }),
            invalidatesTags: ['Depots'],
        }),
        updateDepot: builder.mutation<any, { id: string; data: any }>({
            query: ({ id, data }) => ({ url: `depots/${id}`, method: 'PUT', body: data }),
            invalidatesTags: ['Depots'],
        }),
        deleteDepot: builder.mutation<void, string>({
            query: (id) => ({ url: `depots/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Depots'],
        }),
        restoreDepot: builder.mutation<any, string>({
            query: (id) => ({ url: `depots/${id}/restore`, method: 'PATCH' }),
            invalidatesTags: ['Depots'],
        }),
        createPosition: builder.mutation<any, { depotId: string; data: any }>({
            query: ({ depotId, data }) => ({ url: `depots/${depotId}/positions`, method: 'POST', body: data }),
            invalidatesTags: ['Depots', 'Positions'],
        }),
        updatePosition: builder.mutation<any, { id: string; data: any }>({
            query: ({ id, data }) => ({ url: `positions/${id}`, method: 'PUT', body: data }),
            invalidatesTags: ['Depots', 'Positions'],
        }),
        deletePosition: builder.mutation<void, string>({
            query: (id) => ({ url: `positions/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Depots', 'Positions'],
        }),
    }),
});

export const {
    useGetDepotsQuery,
    useGetArchivedDepotsQuery,
    useCreateDepotMutation,
    useUpdateDepotMutation,
    useDeleteDepotMutation,
    useRestoreDepotMutation,
    useCreatePositionMutation,
    useUpdatePositionMutation,
    useDeletePositionMutation,
} = depotsApi;

