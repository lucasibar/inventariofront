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


export interface MaintenanceLog {
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
        plantId?: string;
        typeId?: string;
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


export const maintenanceApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getPlants: builder.query<any[], void>({
            query: () => 'maintenance/plants',
            providesTags: ['Maintenance'],
        }),
        getMachineTypes: builder.query<any[], void>({
            query: () => 'maintenance/types',
            providesTags: ['Maintenance'],
        }),
        getMachines: builder.query({
            query: ({ plantId, typeId }: any) => {
                let url = `maintenance/machines?plantId=${plantId}`;
                if (typeId) url += `&typeId=${typeId}`;
                return url;
            },
            providesTags: ['Maintenance'],
        }),
        getMetrics: builder.query({
            query: ({ plantId }: any) => `maintenance/metrics?plantId=${plantId}`,
            providesTags: ['Maintenance'],
        }),
        updateMachineStatus: builder.mutation({
            query: ({ id, plantId, typeId, ...body }: any) => ({
                url: `maintenance/machines/${id}/status`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Maintenance', 'Machine'],
            async onQueryStarted({ id, plantId, typeId, status, generatedBy }, { dispatch, queryFulfilled }) {
                const patchResult1 = dispatch(
                    maintenanceApi.util.updateQueryData('getMachines', { plantId, typeId }, (draft) => {
                        const machine = draft.find((m: any) => m.id === id);
                        if (machine) {
                            machine.status = status;
                            if (generatedBy) machine.lastChangeBy = generatedBy;
                        }
                    })
                );
                const patchResult2 = dispatch(
                    maintenanceApi.util.updateQueryData('getMachines', { plantId }, (draft) => {
                        const machine = draft.find((m: any) => m.id === id);
                        if (machine) {
                            machine.status = status;
                            if (generatedBy) machine.lastChangeBy = generatedBy;
                        }
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult1.undo();
                    patchResult2.undo();
                }
            },
        }),

        getMachineKPIs: builder.query({
            query: ({ id, startDate, endDate }: { id: string; startDate?: string; endDate?: string }) => {
                let url = `maintenance/machines/${id}/metrics`;
                const params = new URLSearchParams();
                if (startDate) params.append('startDate', startDate);
                if (endDate) params.append('endDate', endDate);
                const queryStr = params.toString();
                return queryStr ? `${url}?${queryStr}` : url;
            },
            providesTags: (_res: any, _err: any) => [{ type: 'Maintenance', id: 'KPI' }],
        }),
        
        getPlantKPIs: builder.query({
            query: ({ plantId, startDate, endDate }: any) => {
                let url = `maintenance/plants/${plantId}/kpis`;
                const params = new URLSearchParams();
                if (startDate) params.append('startDate', startDate);
                if (endDate) params.append('endDate', endDate);
                const queryStr = params.toString();
                return queryStr ? `${url}?${queryStr}` : url;
            },
            providesTags: (_res: any, _err: any) => [{ type: 'Maintenance', id: 'PlantKPI' }],
        }),
        getLogs: builder.query({
            query: (params: any) => ({
                url: 'maintenance/logs',
                params
            }),
            providesTags: ['Maintenance'],
        }),
        updateLog: builder.mutation({
            query: ({ id, ...body }: any) => ({
                url: `maintenance/logs/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Maintenance'],
        }),
        deleteLog: builder.mutation({
            query: (id: any) => ({
                url: `maintenance/logs/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Maintenance'],
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
} = maintenanceApi;
