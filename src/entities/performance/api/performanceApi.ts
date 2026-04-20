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
    status: 'SOLVED' | 'ELECTRICAL' | 'MECHANICAL' | 'SUCTION' | 'YARN_SHORTAGE';
    lastObservation?: string;
    lastChangeBy?: string;
    plantId: string;
    typeId: string;
}

export interface Metrics {
    total: number;
    running: number;
    failed: number;
    byStatus: { status: string; count: string }[];
}

export const performanceApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getPlants: builder.query<Plant[], void>({
            query: () => 'performance/plants',
            providesTags: ['Performance'],
        }),
        getMachineTypes: builder.query<MachineType[], void>({
            query: () => 'performance/types',
            providesTags: ['Performance'],
        }),
        getMachines: builder.query<Machine[], { plantId: string; typeId: string }>({
            query: ({ plantId, typeId }) => `performance/machines?plantId=${plantId}&typeId=${typeId}`,
            providesTags: ['Performance'],
        }),
        getMetrics: builder.query<Metrics, { plantId: string }>({
            query: ({ plantId }) => `performance/metrics?plantId=${plantId}`,
            providesTags: ['Performance'],
        }),
        updateMachineStatus: builder.mutation<Machine, { id: string; status: string; observation?: string; generatedBy: string; failureType?: string }>({
            query: ({ id, ...body }) => ({
                url: `performance/machines/${id}/status`,
                method: 'POST',
                body,
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
    useUpdateMachineStatusMutation,
} = performanceApi;
