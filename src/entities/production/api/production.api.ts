import { api } from '../../../shared/api';

export const productionApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getProductionLogs: builder.query({
            query: (params: any) => {
                const p = new URLSearchParams();
                if (params.desde) p.set('desde', params.desde);
                if (params.hasta) p.set('hasta', params.hasta);
                if (params.machineId) p.set('machineId', params.machineId);
                return `production-records/logs?${p.toString()}`;
            },
            providesTags: ['Production'],
        }),
        updateProductionRecord: builder.mutation({
            query: ({ id, ...body }: any) => ({ url: `production-records/${id}`, method: 'PATCH', body }),
            invalidatesTags: ['Production'],
        }),
        deleteProductionRecord: builder.mutation({
            query: (id: any) => ({ url: `production-records/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Production'],
        }),
    }),
});

export const {
    useGetProductionLogsQuery,
    useUpdateProductionRecordMutation,
    useDeleteProductionRecordMutation,
} = productionApi;
