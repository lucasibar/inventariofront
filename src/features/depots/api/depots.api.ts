import { api } from '../../../shared/api';

export const depotsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getDepots: builder.query<any[], void>({
            query: () => 'depots',
            providesTags: (result) => 
                result 
                    ? [...result.map(({ id }) => ({ type: 'Depots' as const, id })), { type: 'Depots', id: 'LIST' }]
                    : [{ type: 'Depots', id: 'LIST' }],
        }),
        getArchivedDepots: builder.query<any[], void>({
            query: () => 'depots/archived',
            providesTags: [{ type: 'Depots', id: 'LIST' }],
        }),
        createDepot: builder.mutation<any, any>({
            query: (body) => ({ url: 'depots', method: 'POST', body }),
            invalidatesTags: [{ type: 'Depots', id: 'LIST' }],
        }),
        updateDepot: builder.mutation<any, { id: string; data: any }>({
            query: ({ id, data }) => ({ url: `depots/${id}`, method: 'PUT', body: data }),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Depots', id }, { type: 'Depots', id: 'LIST' }],
            async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    depotsApi.util.updateQueryData('getDepots', undefined, (draft) => {
                        const depot = draft.find((d) => d.id === id);
                        if (depot) {
                            Object.assign(depot, data);
                        }
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
        }),
        deleteDepot: builder.mutation<void, string>({
            query: (id) => ({ url: `depots/${id}`, method: 'DELETE' }),
            invalidatesTags: (_result, _error, id) => [{ type: 'Depots', id }, { type: 'Depots', id: 'LIST' }],
        }),
        restoreDepot: builder.mutation<any, string>({
            query: (id) => ({ url: `depots/${id}/restore`, method: 'PATCH' }),
            invalidatesTags: (_result, _error, id) => [{ type: 'Depots', id }, { type: 'Depots', id: 'LIST' }],
        }),
        createPosition: builder.mutation<any, { depotId: string; data: any }>({
            query: ({ depotId, data }) => ({ url: `depots/${depotId}/positions`, method: 'POST', body: data }),
            invalidatesTags: ['Depots'],
        }),
        updatePosition: builder.mutation<any, { id: string; data: any }>({
            query: ({ id, data }) => ({ url: `positions/${id}`, method: 'PUT', body: data }),
            invalidatesTags: ['Depots'],
            async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    depotsApi.util.updateQueryData('getDepots', undefined, (draft) => {
                        for (const depot of draft) {
                            const pos = depot.positions?.find((p: any) => p.id === id);
                            if (pos) {
                                Object.assign(pos, data);
                                break;
                            }
                        }
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
        }),
        deletePosition: builder.mutation<void, string>({
            query: (id) => ({ url: `positions/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Depots', 'Positions'],
        }),
        renamePlant: builder.mutation<void, { oldName: string; newName: string }>({
            query: (body) => ({ url: 'depots/plants/rename', method: 'PATCH', body }),
            invalidatesTags: ['Depots'],
        }),
        togglePlantStatus: builder.mutation<void, { planta: string; activo: boolean }>({
            query: (body) => ({ url: 'depots/plants/toggle', method: 'PATCH', body }),
            invalidatesTags: ['Depots'],
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
    useTogglePlantStatusMutation,
    useCreatePositionMutation,
    useUpdatePositionMutation,
    useDeletePositionMutation,
    useRenamePlantMutation,
} = depotsApi;

