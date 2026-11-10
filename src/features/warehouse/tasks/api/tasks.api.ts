import { api } from '../../../../shared/api';

export interface TaskItem {
    id: string;
    type: string;
    depositoId?: string | null;
    deposito?: { id: string; nombre: string; planta?: string };
    taskTypeId?: string | null;
    taskType?: { id: string; codigo: string; nombre: string; tiempoEstimadoMinutos: number };
    title?: string | null;
    description?: string | null;
    customerOrDestination?: string | null;
    dueDate?: string | null;
    originSector?: string;
    controlType?: string | null;
    controlFilter?: string | null;
    itemId?: string | null;
    item?: { id: string; codigo: string; descripcion: string; unidadPrincipal?: string };
    batchId?: string | null;
    batch?: { id: string; lotNumber: string };
    sourcePositionId?: string | null;
    sourcePosition?: { id: string; codigo: string; categoriaPrincipal?: string; categoriaSecundaria?: string };
    targetPositionId?: string | null;
    targetPosition?: { id: string; codigo: string; categoriaPrincipal?: string; categoriaSecundaria?: string };
    qty?: number | null;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    priority: number;
    assignedEmployeeId?: string | null;
    assignedEmployee?: { id: string; legajo: string; fullName: string };
    completedByEmployeeId?: string | null;
    completedByEmployee?: { id: string; legajo: string; fullName: string };
    startedAt?: string | null;
    completedAt?: string | null;
    tiempoEstimadoMinutos?: number | null;
    tiempoRealMinutos?: number | null;
    resultStatus?: string | null;
    resultNotes?: string | null;
    createdAt: string;
}

export interface TaskTypeCatalog {
    id: string;
    codigo: string;
    nombre: string;
    descripcion?: string | null;
    depositoId?: string | null;
    tipoGeneral: string;
    tiempoEstimadoMinutos: number;
    activo: boolean;
}

export interface EmptyPosition {
    id: string;
    codigo: string;
    depositoId: string;
    metrosCubicos?: number;
    categoriaPrincipal?: string;
}

export interface WarehouseProductivityResponse {
    summary: {
        totalPlanificadas?: number;
        totalTareas: number;
        totalPendientes?: number;
        totalEnProgreso?: number;
        totalVencidas?: number;
        porcentajeCumplimientoPlan?: number;
        tasaPuntualidad?: number;
        pedidosTotales?: number;
        pedidosCompletados?: number;
        controlesRealizados?: number;
        discrepanciasDetectadas?: number;
        totalHorasEstimadas: number;
        totalHorasReales: number;
        operariosActivos: number;
        totalColaboradoresSector?: number;
        eficienciaPromedio: number;
    };
    catalogStats?: {
        id: string;
        codigo: string;
        nombre: string;
        tipoGeneral: string;
        tiempoEstimadoMinutos: number;
        vecesRealizada: number;
        tiempoPromedioReal: number;
        desvioMinutos: number;
        cumplimientoEstandarPct: number;
    }[];
    ranking: {
        employeeId: string;
        legajo: string;
        fullName: string;
        depositoNombre: string;
        subSector?: string;
        totalTareas: number;
        totalTareasCompletadas?: number;
        totalTareasAsignadas?: number;
        tiempoEstimadoMinutos: number;
        tiempoRealMinutos: number;
        horasEstimadas: number;
        horasReales: number;
        porcentajeEficiencia: number;
        porcentajeOcupacionUtilidad: number;
        porcentajeCumplimientoPlan?: number;
        discrepanciasDetectadas?: number;
        tareasPorTipo: Record<string, { count: number; minutos: number }>;
        ultimasTareas: any[];
    }[];
    tasksList?: TaskItem[];
}

export const tasksApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getTasks: builder.query<TaskItem[], {
            depositoId?: string;
            status?: string;
            type?: string;
            employeeId?: string;
            q?: string;
            from?: string;
            to?: string;
        } | void>({
            query: (params) => {
                const searchParams = new URLSearchParams();
                if (params?.depositoId) searchParams.append('depositoId', params.depositoId);
                if (params?.status) searchParams.append('status', params.status);
                if (params?.type) searchParams.append('type', params.type);
                if (params?.employeeId) searchParams.append('employeeId', params.employeeId);
                if (params?.q) searchParams.append('q', params.q);
                if (params?.from) searchParams.append('from', params.from);
                if (params?.to) searchParams.append('to', params.to);
                return `tasks?${searchParams.toString()}`;
            },
            providesTags: ['Tasks'],
        }),
        getPendingTasks: builder.query<TaskItem[], string | void>({
            query: (depositoId) => depositoId ? `tasks/pending?depositoId=${depositoId}` : 'tasks/pending',
            providesTags: ['Tasks'],
        }),
        getTaskTypes: builder.query<TaskTypeCatalog[], string | void>({
            query: (depositoId) => depositoId ? `tasks/types?depositoId=${depositoId}` : 'tasks/types',
            providesTags: ['Tasks'],
        }),
        createTaskType: builder.mutation<TaskTypeCatalog, Partial<TaskTypeCatalog>>({
            query: (body) => ({
                url: 'tasks/types',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Tasks'],
        }),
        updateTaskType: builder.mutation<TaskTypeCatalog, { id: string } & Partial<TaskTypeCatalog>>({
            query: ({ id, ...body }) => ({
                url: `tasks/types/${id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['Tasks'],
        }),
        getEmptyPositions: builder.query<EmptyPosition[], string | void>({
            query: (depositoId) => depositoId ? `tasks/empty-positions?depositoId=${depositoId}` : 'tasks/empty-positions',
        }),
        createTask: builder.mutation<TaskItem, any>({
            query: (body) => ({
                url: 'tasks',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Tasks'],
        }),
        startTask: builder.mutation<TaskItem, { id: string; employeeId?: string }>({
            query: ({ id, employeeId }) => ({
                url: `tasks/${id}/start`,
                method: 'PATCH',
                body: { employeeId },
            }),
            invalidatesTags: ['Tasks'],
        }),
        completeTask: builder.mutation<TaskItem, {
            id: string;
            actualTargetPositionId?: string | null;
            actualQty?: number | null;
            tiempoRealMinutos?: number | null;
            completedByEmployeeId?: string | null;
            resultStatus?: string;
            resultNotes?: string | null;
        }>({
            query: ({ id, ...body }) => ({
                url: `tasks/${id}/complete`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Tasks', 'Stock'],
        }),
        cancelTask: builder.mutation<TaskItem, { id: string; reason?: string }>({
            query: ({ id, reason }) => ({
                url: `tasks/${id}/cancel`,
                method: 'PATCH',
                body: { reason },
            }),
            invalidatesTags: ['Tasks'],
        }),
        updateTask: builder.mutation<TaskItem, { id: string } & Partial<TaskItem>>({
            query: ({ id, ...body }) => ({
                url: `tasks/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Tasks'],
        }),
        reorderTasks: builder.mutation<{ success: boolean; count: number }, string[]>({
            query: (taskIds) => ({
                url: 'tasks/reorder',
                method: 'POST',
                body: { taskIds },
            }),
            invalidatesTags: ['Tasks'],
        }),
        getWarehouseProductivityRRHH: builder.query<WarehouseProductivityResponse, {
            from?: string;
            to?: string;
            depositoId?: string;
            employeeId?: string;
            sector?: string;
            subSector?: string;
        } | void>({
            query: (params) => {
                const searchParams = new URLSearchParams();
                if (params?.from) searchParams.append('from', params.from);
                if (params?.to) searchParams.append('to', params.to);
                if (params?.depositoId) searchParams.append('depositoId', params.depositoId);
                if (params?.employeeId) searchParams.append('employeeId', params.employeeId);
                if (params?.sector) searchParams.append('sector', params.sector);
                if (params?.subSector) searchParams.append('subSector', params.subSector);
                return `tasks/productivity-rrhh?${searchParams.toString()}`;
            },
            providesTags: ['Tasks'],
        }),
    }),
});

export const {
    useGetTasksQuery,
    useGetPendingTasksQuery,
    useGetTaskTypesQuery,
    useCreateTaskTypeMutation,
    useUpdateTaskTypeMutation,
    useGetEmptyPositionsQuery,
    useCreateTaskMutation,
    useStartTaskMutation,
    useCompleteTaskMutation,
    useCancelTaskMutation,
    useUpdateTaskMutation,
    useReorderTasksMutation,
    useGetWarehouseProductivityRRHHQuery,
} = tasksApi;
