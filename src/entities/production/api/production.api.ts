import { api } from '../../../shared/api';

export interface ProductionResourceAttributes {
    marca?: string;
    modelo?: string;
    cantidadAgujas?: number;
    diametroCilindro?: number;
    anio?: number;
    tipoTecnico?: number;
    alimentacionDoble?: boolean;
    costuraIntegrada?: boolean;
}

export interface ProductionResource {
    id: string;
    code: string;
    name: string;
    resourceType: string;
    sectorCode: string | null;
    sectorName: string | null;
    area: string | null;
    active: boolean;
    plantId: string;
    machineId: string | null;
    attributes: ProductionResourceAttributes | null;
    machine: {
        id: string;
        number: number;
        codigoInterno: string;
        nombre: string;
        status: string;
    } | null;
    plant: {
        id: string;
        name: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface UpdateProductionResourceRequest {
    id: string;
    name?: string;
    active?: boolean;
    attributes?: ProductionResourceAttributes;
}

export interface ControlGestionImportPreview {
    fileName: string;
    fileSize: number;
    fileHash: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    invalidRowSamples: Array<{ sourceRow: number; errors: string[] }>;
    sourceRowFrom: number | null;
    sourceRowTo: number | null;
    dateFrom: string | null;
    dateTo: string | null;
    machineCount: number;
    missingMachines: number[];
    employeeCount: number;
    existingEmployees: number;
    newEmployees: number;
    employeeNameConflicts: number;
    employeeNameConflictSamples: Array<{ legajo: string; names: string[] }>;
    articleCount: number;
    matchedArticles: number;
    unmatchedArticles: number;
    unmatchedArticleSamples: string[];
    existingRecords: number;
    rowsToCreate: number;
    rowsToUpdate: number;
    canImport: boolean;
    warnings: string[];
}

export interface ControlGestionImportResult {
    success: boolean;
    importedRows: number;
    createdRows: number;
    updatedRows: number;
    createdEmployees: number;
    matchedArticles: number;
    unmatchedArticles: number;
    dateFrom: string;
    dateTo: string;
}

export type ProductionScheduleStatus = 'DRAFT' | 'VALIDATED' | 'RELEASED' | 'IN_PROGRESS' | 'CLOSED' | 'ANNULLED';

export interface ProductionScheduleMaterial {
    id: string;
    itemId: string | null;
    itemCodeSnapshot: string | null;
    itemDescriptionSnapshot: string | null;
    role: string;
    colorSnapshot: string | null;
    setupCones: number;
    coneWeightKg: number | null;
    setupWeightKg: number | null;
    consumptionGramsPerSock: number | null;
    expectedConsumptionKg: number | null;
    requiredKg: number | null;
    projectedMainKg: number | null;
    replenishmentAlert: boolean;
    replenishmentVerified: boolean;
}

export interface ProductionScheduleLine {
    id: string;
    machineNumberSnapshot: number;
    area: string | null;
    shift: string;
    articleId: string | null;
    articleCodeSnapshot: string | null;
    articleDescriptionSnapshot: string | null;
    sizeSnapshot: string | null;
    colorSnapshot: string | null;
    plannedSeconds: number | null;
    plannedGoodSocks: number | null;
    plannedChangeSeconds: number;
    matchStatus: 'EXACT' | 'HEURISTIC' | 'NEEDS_REVIEW';
    active: boolean;
    materials: ProductionScheduleMaterial[];
}

export interface ProductionSchedule {
    id: string;
    planDate: string;
    sectorCode: string;
    status: ProductionScheduleStatus;
    revision: number;
    sourceFiles: Array<{ fileName: string; fileHash: string; entriesCount: number; machinesFound: number[] }>;
    notes: string | null;
    lines?: ProductionScheduleLine[];
    linesCount?: number;
    createdAt: string;
    updatedAt: string;
}

export interface ProductionPickingItem {
    itemId: string | null;
    codigo: string | null;
    descripcion: string | null;
    roles: string[];
    maquinas: number[];
    areas: string[];
    setupCones: number;
    requiredKg: number;
    expectedConsumptionKg: number;
    mainStockKg: number;
    reserveStockKg: number;
    projectedMainKg: number;
    missingInPickingKg: number;
    replenishmentVerified: boolean;
    missedReplenishmentAlert: boolean;
}

export interface ProductionDashboardResponse {
    date: string;
    generatedAt: string;
    isFuture: boolean;
    schedule: { id: string; status: ProductionScheduleStatus; revision: number; planDate: string } | null;
    summary: {
        scheduledMachines: number;
        currentlyStoppedMachines: number;
        plannedSeconds: number;
        plannedChangeSeconds: number;
        futureAvailableSeconds: number;
        downtimeSeconds: number;
        actualAvailableSeconds: number;
        availabilityPct: number | null;
        plannedGoodSocks: number;
        plannedGoodDozens: number;
        actualGoodSocks: number;
        actualGoodDozens: number;
        secondSocks: number;
        planCompliancePct: number | null;
        grossProductionPct: number | null;
        secondRatePct: number | null;
        fttPct: number | null;
        performancePct: number | null;
        oeePct: number | null;
    };
    definitions: Record<string, string>;
    areas: Array<{
        area: string;
        machines: number;
        plannedGoodSocks: number;
        actualGoodSocks: number;
        secondSocks: number;
        planCompliancePct: number | null;
        availabilityPct: number | null;
        fttPct: number | null;
    }>;
    machines: Array<{
        machineNumber: number;
        area: string | null;
        currentStatus: string | null;
        articleCodes: string[];
        plannedSeconds: number;
        availableSeconds: number;
        downtimeSeconds: number;
        plannedGoodSocks: number;
        actualGoodSocks: number;
        secondSocks: number;
        planCompliancePct: number | null;
        availabilityPct: number | null;
        fttPct: number | null;
        performancePct: number | null;
        oeePct: number | null;
    }>;
}

export interface CreateProductionScheduleLineRequest {
    scheduleId: string;
    machineNumber: number;
    shift: string;
    articleCode?: string | null;
    area?: string | null;
    plannedSeconds?: number | null;
    plannedGoodSocks?: number | null;
    plannedChangeSeconds?: number;
}

export interface CreateActualProductionRequest {
    recordDate: string;
    shift: string;
    machineNumber: number;
    employeeLegajo?: string | null;
    articleId?: string | null;
    articleCode?: string | null;
    scheduleLineId?: string | null;
    goodDozens?: number;
    goodSocks?: number;
    secondSocks?: number;
    secondMechanicalSocks?: number;
    runSeconds?: number | null;
    sourceType?: 'MANUAL' | 'FILE' | 'PLAN_CONFIRMATION';
    sourceReference?: string | null;
    notes?: string | null;
}

export interface ProductionActualEntry {
    id: string;
    scheduleLineId: string | null;
    recordDate: string;
    shift: string;
    machineNumberSnapshot: number;
    articleCodeSnapshot: string | null;
    employeeLegajoSnapshot: string | null;
    goodSocks: number;
    secondSocks: number;
    secondMechanicalSocks: number;
    runSeconds: number | null;
    sourceType: 'MANUAL' | 'FILE' | 'PLAN_CONFIRMATION';
    status: 'DRAFT' | 'CONFIRMED' | 'CORRECTED' | 'ANNULLED';
    createdAt: string;
}

export const productionApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getProductionDashboard: builder.query<ProductionDashboardResponse, { date?: string } | void>({
            query: (params) => `production/dashboard${params?.date ? `?date=${encodeURIComponent(params.date)}` : ''}`,
            providesTags: ['Production'],
        }),
        getProductionSchedules: builder.query<ProductionSchedule[], { from?: string; to?: string; status?: ProductionScheduleStatus } | void>({
            query: (params) => {
                const search = new URLSearchParams();
                if (params?.from) search.set('from', params.from);
                if (params?.to) search.set('to', params.to);
                if (params?.status) search.set('status', params.status);
                return `production/schedules${search.toString() ? `?${search}` : ''}`;
            },
            providesTags: ['Production'],
        }),
        getProductionSchedule: builder.query<ProductionSchedule, string>({
            query: (id) => `production/schedules/${id}`,
            providesTags: ['Production'],
        }),
        importProductionSchedulePdf: builder.mutation<ProductionSchedule, FormData>({
            query: (body) => ({ url: 'production/schedules/import-pdf', method: 'POST', body }),
            invalidatesTags: ['Production'],
        }),
        updateProductionScheduleStatus: builder.mutation<ProductionSchedule, { id: string; status: ProductionScheduleStatus; notes?: string | null }>({
            query: ({ id, ...body }) => ({ url: `production/schedules/${id}/status`, method: 'PATCH', body }),
            invalidatesTags: ['Production'],
        }),
        updateProductionScheduleLine: builder.mutation<ProductionScheduleLine, { id: string; plannedSeconds?: number | null; plannedGoodSocks?: number | null; plannedChangeSeconds?: number; active?: boolean }>({
            query: ({ id, ...body }) => ({ url: `production/schedule-lines/${id}`, method: 'PATCH', body }),
            invalidatesTags: ['Production'],
        }),
        createProductionScheduleLine: builder.mutation<ProductionScheduleLine, CreateProductionScheduleLineRequest>({
            query: ({ scheduleId, ...body }) => ({ url: `production/schedules/${scheduleId}/lines`, method: 'POST', body }),
            invalidatesTags: ['Production'],
        }),
        getProductionPicking: builder.query<ProductionPickingItem[], string>({
            query: (scheduleId) => `production/schedules/${scheduleId}/picking`,
            providesTags: ['Production'],
        }),
        getProductionActuals: builder.query<ProductionActualEntry[], string>({
            query: (scheduleId) => `production/schedules/${scheduleId}/actuals`,
            providesTags: ['Production'],
        }),
        verifyProductionPicking: builder.mutation<ProductionPickingItem[], { scheduleId: string; itemId: string }>({
            query: ({ scheduleId, itemId }) => ({
                url: `production/schedules/${scheduleId}/picking/${itemId}/verify`,
                method: 'PATCH',
                body: {},
            }),
            invalidatesTags: ['Production'],
        }),
        createActualProduction: builder.mutation<any, CreateActualProductionRequest>({
            query: (body) => ({ url: 'production/actual', method: 'POST', body }),
            invalidatesTags: ['Production'],
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
        getProductionResources: builder.query<ProductionResource[], { sectorCode?: string; active?: boolean } | void>({
            query: (params) => {
                const search = new URLSearchParams();
                if (params?.sectorCode) search.set('sectorCode', params.sectorCode);
                if (params?.active !== undefined) search.set('active', String(params.active));
                const queryString = search.toString();
                return `production/resources${queryString ? `?${queryString}` : ''}`;
            },
            providesTags: ['Production'],
        }),
        updateProductionResource: builder.mutation<ProductionResource, UpdateProductionResourceRequest>({
            query: ({ id, ...body }) => ({
                url: `production/resources/${id}`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Production'],
        }),
        previewControlGestionImport: builder.mutation<ControlGestionImportPreview, FormData>({
            query: (formData) => ({
                url: 'production/imports/control-gestion/preview',
                method: 'POST',
                body: formData,
            }),
        }),
        importControlGestion: builder.mutation<ControlGestionImportResult, FormData>({
            query: (formData) => ({
                url: 'production/imports/control-gestion/import',
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: ['Production'],
        }),
    }),
});

export const {
    useGetProductionDashboardQuery,
    useGetProductionSchedulesQuery,
    useGetProductionScheduleQuery,
    useImportProductionSchedulePdfMutation,
    useUpdateProductionScheduleStatusMutation,
    useUpdateProductionScheduleLineMutation,
    useCreateProductionScheduleLineMutation,
    useGetProductionPickingQuery,
    useGetProductionActualsQuery,
    useVerifyProductionPickingMutation,
    useCreateActualProductionMutation,
    useGetProductionLogsQuery,
    useUpdateProductionRecordMutation,
    useDeleteProductionRecordMutation,
    useGetProductionResourcesQuery,
    useUpdateProductionResourceMutation,
    usePreviewControlGestionImportMutation,
    useImportControlGestionMutation,
} = productionApi;
