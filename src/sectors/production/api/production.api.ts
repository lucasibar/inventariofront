import { api } from '../../../shared/api';

export interface Plant {
    id: string;
    name: string;
    location?: string;
}

export interface MachineType {
    id: string;
    name: string;
}

export interface Machine {
    id: string;
    number: number;
    codigoInterno: string;
    nombre: string;
    status: 'ACTIVA' | 'REVISAR' | 'VELOCIDAD_REDUCIDA' | 'PARADA' | 'ELECTRONIC';
    lastObservation?: string;
    lastChangeBy?: string;
    plantId: string;
    typeId: string;
    metadata?: {
        cantidadAgujas?: string | number;
        tipoCilindro?: string;
        tipoTrimer?: string;
        [key: string]: any;
    };
    createdAt: string;
    updatedAt: string;
}


export interface PerformanceLog {
    id: string;
    machineId: string;
    fromStatus: string;
    toStatus: string;
    failureType?: string;
    observation?: string;
    generatedBy: string;
    timestamp: string;
    machine?: {
        number: number;
        codigoInterno: string;
        plant?: { name: string };
    };
}


export interface Metrics {
    total: number;
    running: number;
    failed: number;
    byStatus: { status: string; count: string }[];
}

export interface MachineKPI {
    uptime: string;
    downtime: string;
    availability: string;
    mtbf: string;
    mttr: string;
    mttf: string;
    failures: number;
    repairs: number;
    oee: string;
    history: any[];
}


export const performanceApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getPlants: builder.query<any[], void>({
            query: () => 'performance/plants',
            providesTags: ['Performance'],
        }),
        getMachineTypes: builder.query<any[], void>({
            query: () => 'performance/types',
            providesTags: ['Performance'],
        }),
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
        getMachines: builder.query({
            query: ({ plantId, typeId }: any) => {
                let url = `performance/machines?plantId=${plantId}`;
                if (typeId) url += `&typeId=${typeId}`;
                return url;
            },
            providesTags: ['Performance'],
        }),
        getMetrics: builder.query({
            query: ({ plantId }: any) => `performance/metrics?plantId=${plantId}`,
            providesTags: ['Performance'],
        }),
        updateMachineStatus: builder.mutation({
            query: ({ id, ...body }: any) => ({
                url: `performance/machines/${id}/status`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Performance', 'Machine'],
        }),

        getMachineKPIs: builder.query({
            query: ({ id, startDate, endDate }: { id: string; startDate?: string; endDate?: string }) => {
                let url = `performance/machines/${id}/metrics`;
                const params = new URLSearchParams();
                if (startDate) params.append('startDate', startDate);
                if (endDate) params.append('endDate', endDate);
                const queryStr = params.toString();
                return queryStr ? `${url}?${queryStr}` : url;
            },
            providesTags: (_res: any, _err: any) => [{ type: 'Performance', id: 'KPI' }],
        }),
        
        getPlantKPIs: builder.query({
            query: ({ plantId, startDate, endDate }: any) => {
                let url = `performance/plants/${plantId}/kpis`;
                const params = new URLSearchParams();
                if (startDate) params.append('startDate', startDate);
                if (endDate) params.append('endDate', endDate);
                const queryStr = params.toString();
                return queryStr ? `${url}?${queryStr}` : url;
            },
            providesTags: (_res: any, _err: any) => [{ type: 'Performance', id: 'PlantKPI' }],
        }),
        getLogs: builder.query({
            query: (params: any) => ({
                url: 'performance/logs',
                params
            }),
            providesTags: ['Performance'],
        }),
        updateLog: builder.mutation({
            query: ({ id, ...body }: any) => ({
                url: `performance/logs/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Performance'],
        }),
        deleteLog: builder.mutation({
            query: (id: any) => ({
                url: `performance/logs/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Performance'],
        }),
    }),
});


export const {
    useGetPlantsQuery,
    useGetMachineTypesQuery,
    useGetMachinesQuery,
    useGetMetricsQuery,
    useGetMachineKPIsQuery,
    useGetPlantKPIsQuery,
    useGetLogsQuery,
    useUpdateLogMutation,
    useDeleteLogMutation,
    useUpdateMachineStatusMutation,
    useGetProductionLogsQuery,
    useUpdateProductionRecordMutation,
    useDeleteProductionRecordMutation,
} = performanceApi;


