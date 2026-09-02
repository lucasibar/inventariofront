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
    useGetProductionLogsQuery,
    useUpdateProductionRecordMutation,
    useDeleteProductionRecordMutation,
    useGetProductionResourcesQuery,
    useUpdateProductionResourceMutation,
    usePreviewControlGestionImportMutation,
    useImportControlGestionMutation,
} = productionApi;
