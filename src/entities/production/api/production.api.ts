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

export interface ProductionOverviewRow {
    machineNumber: number;
    area: string;
    currentStatus: string | null;
    goodSocks: number;
    goodDozens: number;
    secondSocks: number;
    availabilityPct: number | null;
    fttPct: number | null;
    performancePct: number | null;
    oeePct: number | null;
}

export interface ProductionOverviewResponse {
    from: string;
    to: string;
    daysWithProduction: number;
    summary: Omit<ProductionOverviewRow, 'machineNumber' | 'area' | 'currentStatus'> & { machines: number };
    areas: Array<Omit<ProductionOverviewRow, 'machineNumber' | 'currentStatus'> & { machines: number }>;
    machines: ProductionOverviewRow[];
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
    employeeNameSnapshot?: string | null;
    goodSocks: number;
    secondSocks: number;
    secondMechanicalSocks: number;
    runSeconds: number | null;
    sourceType: 'MANUAL' | 'FILE' | 'PLAN_CONFIRMATION';
    status: 'DRAFT' | 'CONFIRMED' | 'CORRECTED' | 'ANNULLED';
    notes?: string | null;
    createdBy?: string | null;
    correctionOfId?: string | null;
    createdAt: string;
}

export interface ProductionActualPage {
    data: ProductionActualEntry[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface ProductionActualFilters {
    page?: number;
    pageSize?: number;
    from?: string;
    to?: string;
    status?: ProductionActualEntry['status'];
    shift?: string;
    machineNumber?: number;
    q?: string;
}

export type ProductionMaterialRequestStatus = 'REQUESTED' | 'RESERVED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CONSUMED' | 'CANCELLED';

export interface ProductionMaterialAllocation {
    id: string;
    lotId: string;
    lotNumberSnapshot: string;
    fifoDateSnapshot: string | null;
    reservedKg: number;
    deliveredKg: number;
    position?: { id: string; codigo: string };
}

export interface ProductionMaterialRequestLine {
    id: string;
    itemId: string;
    requestedKg: number;
    reservedKg: number;
    deliveredKg: number;
    consumedKg: number;
    pendingReturnKg: number;
    returnedKg: number;
    item: { id: string; codigoInterno: string; descripcion: string; unidadPrincipal: string };
    allocations: ProductionMaterialAllocation[];
}

export interface ProductionMaterialRequest {
    id: string;
    scheduleId: string;
    sourceDepotId: string;
    status: ProductionMaterialRequestStatus;
    requestedBy: string | null;
    reservedAt: string | null;
    preparationStartedAt: string | null;
    readyAt: string | null;
    deliveredAt: string | null;
    consumedAt: string | null;
    returnedAt: string | null;
    notes: string | null;
    sourceDepot: { id: string; nombre: string };
    lines: ProductionMaterialRequestLine[];
    createdAt: string;
}

export interface ProductionOutputLot {
    id: string;
    scheduleId: string;
    articleId: string | null;
    articleCodeSnapshot: string;
    lotNumber: string;
    goodSocks: number;
    secondSocks: number;
    qualityStatus: 'QUARANTINE' | 'RELEASED';
    qualityTestedAt: string | null;
    qualityTestedBy: string | null;
    qualityNotes: string | null;
    stockPostedAt: string | null;
    stockPostedBy: string | null;
    targetDepot?: { id: string; nombre: string } | null;
    targetPosition?: { id: string; codigo: string } | null;
    finishedItem?: { id: string; codigoInterno: string; descripcion: string } | null;
    secondItem?: { id: string; codigoInterno: string; descripcion: string } | null;
    article?: { id: string; codigo: string; descripcion: string } | null;
    schedule?: ProductionSchedule;
    createdAt: string;
}

export type ProductionLineReturnStatus = 'DECLARED' | 'POSTED' | 'CANCELLED';

export interface ProductionLineReturn {
    id: string;
    sourceMovementId: string;
    sourceDocumentId: string;
    requestLineId: string | null;
    itemId: string;
    lotId: string;
    returnPositionId: string;
    destinationPositionId: string | null;
    quantity: number;
    status: ProductionLineReturnStatus;
    declaredBy: string | null;
    postedAt: string | null;
    postedBy: string | null;
    cancelledAt: string | null;
    cancelledBy: string | null;
    cancellationReason: string | null;
    createdAt: string;
    item: { id: string; codigoInterno: string; descripcion: string; unidadPrincipal: string };
    batch: { id: string; lotNumber: string };
    sourceDocument: { id: string; numero: string; fecha: string };
    returnPosition: { id: string; codigo: string; depositoId: string; depot?: { id: string; nombre: string } };
    destinationPosition: { id: string; codigo: string } | null;
    suggestedPosition: { id: string; codigo: string; depositoId: string } | null;
}

export const productionApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getProductionDashboard: builder.query<ProductionDashboardResponse, { date?: string } | void>({
            query: (params) => `production/dashboard${params?.date ? `?date=${encodeURIComponent(params.date)}` : ''}`,
            providesTags: ['Production'],
        }),
        getProductionOverview: builder.query<ProductionOverviewResponse, { from: string; to: string }>({
            query: ({ from, to }) => `production/dashboard-overview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
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
        getProductionActualHistory: builder.query<ProductionActualPage, ProductionActualFilters | void>({
            query: (params) => {
                const search = new URLSearchParams();
                if (params?.page) search.set('page', String(params.page));
                if (params?.pageSize) search.set('pageSize', String(params.pageSize));
                if (params?.from) search.set('from', params.from);
                if (params?.to) search.set('to', params.to);
                if (params?.status) search.set('status', params.status);
                if (params?.shift) search.set('shift', params.shift);
                if (params?.machineNumber) search.set('machineNumber', String(params.machineNumber));
                if (params?.q) search.set('q', params.q);
                return `production/actual${search.toString() ? `?${search}` : ''}`;
            },
            providesTags: ['Production'],
        }),
        correctActualProduction: builder.mutation<ProductionActualEntry, { id: string; body: CreateActualProductionRequest }>({
            query: ({ id, body }) => ({ url: `production/actual/${id}/correct`, method: 'POST', body }),
            invalidatesTags: ['Production'],
        }),
        annulActualProduction: builder.mutation<ProductionActualEntry, { id: string; reason: string }>({
            query: ({ id, reason }) => ({ url: `production/actual/${id}/annul`, method: 'PATCH', body: { reason } }),
            invalidatesTags: ['Production'],
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
        getProductionMaterialRequest: builder.query<ProductionMaterialRequest | null, string>({
            query: (scheduleId) => `production/schedules/${scheduleId}/material-request`,
            providesTags: ['Production'],
        }),
        createProductionMaterialRequest: builder.mutation<ProductionMaterialRequest, { scheduleId: string; sourceDepotId: string; notes?: string }>({
            query: ({ scheduleId, ...body }) => ({ url: `production/schedules/${scheduleId}/material-request`, method: 'POST', body }),
            invalidatesTags: ['Production'],
        }),
        reserveProductionMaterials: builder.mutation<ProductionMaterialRequest, string>({
            query: (id) => ({ url: `production/material-requests/${id}/reserve`, method: 'POST', body: {} }),
            invalidatesTags: ['Production', 'Stock'],
        }),
        startProductionPreparation: builder.mutation<ProductionMaterialRequest, string>({
            query: (id) => ({ url: `production/material-requests/${id}/start-preparation`, method: 'POST', body: {} }),
            invalidatesTags: ['Production'],
        }),
        readyProductionMaterials: builder.mutation<ProductionMaterialRequest, string>({
            query: (id) => ({ url: `production/material-requests/${id}/ready`, method: 'POST', body: {} }),
            invalidatesTags: ['Production'],
        }),
        deliverProductionMaterials: builder.mutation<ProductionMaterialRequest, string>({
            query: (id) => ({ url: `production/material-requests/${id}/deliver`, method: 'POST', body: {} }),
            invalidatesTags: ['Production', 'Stock', 'Dashboard'],
        }),
        consumeProductionMaterials: builder.mutation<ProductionMaterialRequest, { id: string; lines: Array<{ itemId: string; consumedKg: number }> }>({
            query: ({ id, lines }) => ({ url: `production/material-requests/${id}/consume`, method: 'POST', body: { lines } }),
            invalidatesTags: ['Production'],
        }),
        getProductionLineReturns: builder.query<
            { data: ProductionLineReturn[]; total: number; page: number; pageSize: number; totalPages: number },
            { page: number; pageSize: number; status?: ProductionLineReturnStatus; q?: string }
        >({
            query: ({ page, pageSize, status, q }) => {
                const search = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
                if (status) search.set('status', status);
                if (q) search.set('q', q);
                return `production/line-returns?${search}`;
            },
            providesTags: ['Production'],
        }),
        declareProductionLineReturn: builder.mutation<ProductionLineReturn, { itemId: string; quantity: number }>({
            query: (body) => ({ url: 'production/line-returns', method: 'POST', body }),
            invalidatesTags: ['Production'],
        }),
        receiveProductionLineReturns: builder.mutation<ProductionLineReturn[], { lines: Array<{ returnId: string; destinationPositionId?: string }> }>({
            query: (body) => ({ url: 'production/line-returns/receive', method: 'POST', body }),
            invalidatesTags: ['Production', 'Stock', 'Dashboard'],
        }),
        cancelProductionLineReturn: builder.mutation<ProductionLineReturn, { id: string; reason: string }>({
            query: ({ id, reason }) => ({ url: `production/line-returns/${id}/cancel`, method: 'PATCH', body: { reason } }),
            invalidatesTags: ['Production', 'Stock', 'Dashboard'],
        }),
        closeProductionSchedule: builder.mutation<{ schedule: ProductionSchedule; lots: ProductionOutputLot[] }, string>({
            query: (scheduleId) => ({ url: `production/schedules/${scheduleId}/close`, method: 'POST', body: {} }),
            invalidatesTags: ['Production'],
        }),
        getProductionOutputLots: builder.query<{ data: ProductionOutputLot[]; total: number; page: number; pageSize: number; totalPages: number }, { page: number; pageSize: number; status?: string; q?: string }>({
            query: ({ page, pageSize, status, q }) => {
                const search = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
                if (status) search.set('status', status);
                if (q) search.set('q', q);
                return `production/output-lots?${search}`;
            },
            providesTags: ['Production'],
        }),
        releaseProductionOutputLot: builder.mutation<ProductionOutputLot, { id: string; notes?: string; targetDepotId: string; targetPositionId: string }>({
            query: ({ id, ...body }) => ({ url: `production/output-lots/${id}/release`, method: 'PATCH', body }),
            invalidatesTags: ['Production', 'Stock', 'Dashboard'],
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
    useGetProductionOverviewQuery,
    useGetProductionSchedulesQuery,
    useGetProductionScheduleQuery,
    useImportProductionSchedulePdfMutation,
    useUpdateProductionScheduleStatusMutation,
    useUpdateProductionScheduleLineMutation,
    useCreateProductionScheduleLineMutation,
    useGetProductionPickingQuery,
    useGetProductionActualsQuery,
    useGetProductionActualHistoryQuery,
    useCorrectActualProductionMutation,
    useAnnulActualProductionMutation,
    useVerifyProductionPickingMutation,
    useCreateActualProductionMutation,
    useGetProductionMaterialRequestQuery,
    useCreateProductionMaterialRequestMutation,
    useReserveProductionMaterialsMutation,
    useStartProductionPreparationMutation,
    useReadyProductionMaterialsMutation,
    useDeliverProductionMaterialsMutation,
    useConsumeProductionMaterialsMutation,
    useGetProductionLineReturnsQuery,
    useDeclareProductionLineReturnMutation,
    useReceiveProductionLineReturnsMutation,
    useCancelProductionLineReturnMutation,
    useCloseProductionScheduleMutation,
    useGetProductionOutputLotsQuery,
    useReleaseProductionOutputLotMutation,
    useGetProductionLogsQuery,
    useUpdateProductionRecordMutation,
    useDeleteProductionRecordMutation,
    useGetProductionResourcesQuery,
    useUpdateProductionResourceMutation,
    usePreviewControlGestionImportMutation,
    useImportControlGestionMutation,
} = productionApi;
