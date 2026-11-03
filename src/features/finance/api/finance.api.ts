import { api } from '../../../shared/api';

export interface AgingBucket {
    label: string;
    days: string;
    color: string;
    usd: number;
    ars: number;
    kilos: number;
    itemsCount: number;
    pctOfValuation: number;
    pctOfKilos: number;
}

export interface FinanceSummary {
    tipoCambio: number;
    totalValuationUsd: number;
    totalValuationArs: number;
    totalKilos: number;
    totalItemsCount: number;
    costedItemsCount: number;
    coberturaCosteoPct: number;
    capitalCriticoUsd: number;
    capitalCriticoArs: number;
    capitalAlertaUsd: number;
    capitalCirculanteUsd: number;
}

export interface CategoryValuation {
    categoryId: string | null;
    categoria: string;
    kilos: number;
    valuationUsd: number;
    valuationArs: number;
    totalItems: number;
    costedItems: number;
    pctOfTotalValuation: number;
}

export interface DepotValuation {
    depositoId: string | null;
    deposito: string;
    kilos: number;
    valuationUsd: number;
    valuationArs: number;
    pctOfTotalValuation: number;
}

export interface RotacionValuation {
    rotacion: string;
    usd: number;
    ars: number;
    kilos: number;
    pctOfValuation: number;
}

export interface ParetoItem {
    itemId: string;
    codigoInterno: string;
    descripcion: string;
    categoria: string;
    rotacion: string;
    unidad: string;
    costoUnitarioUsd: number;
    stockQty: number;
    valuationUsd: number;
    valuationArs: number;
    maxDaysInStock: number;
    statusAging: 'CIRCULANTE' | 'ALERTA_AMARILLA' | 'ESTANCADO_CRITICO';
    pctOfTotalValuation: number;
}

export interface FinanceCockpitData {
    summary: FinanceSummary;
    aging: {
        circulante: AgingBucket;
        alertaAmarilla: AgingBucket;
        estancadoCritico: AgingBucket;
    };
    rotacion: RotacionValuation[];
    categories: CategoryValuation[];
    depots: DepotValuation[];
    topPareto: ParetoItem[];
}

export interface CategoryCostSummary {
    categoryId: string;
    categoria: string;
    totalItems: number;
    itemsCosteados: number;
    costoPromedioUsd: number;
    stockTotal: number;
    valorTotalUsd: number;
}

export const financeApi = api.injectEndpoints({
    endpoints: (build) => ({
        getFinanceCockpit: build.query<FinanceCockpitData, { tipoCambio?: number; depositoId?: string; categoryId?: string } | void>({
            query: (params) => {
                const searchParams = new URLSearchParams();
                if (params?.tipoCambio) searchParams.append('tipoCambio', String(params.tipoCambio));
                if (params?.depositoId) searchParams.append('depositoId', params.depositoId);
                if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
                const queryStr = searchParams.toString();
                return `finance/cockpit${queryStr ? `?${queryStr}` : ''}`;
            },
            providesTags: ['Finance', 'Stock'],
        }),
        getCategoriesCostSummary: build.query<CategoryCostSummary[], void>({
            query: () => 'finance/categories-cost-summary',
            providesTags: ['Finance', 'Items'],
        }),
        bulkAssignCostByCategory: build.mutation<{ updatedCount: number }, { categoryId: string; costoUnitario: number }>({
            query: (body) => ({
                url: 'items/bulk-cost-by-category',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Finance', 'Items'],
        }),
        bulkAssignCosts: build.mutation<{ updatedCategories: number; totalItemsUpdated: number }, { updates: { categoryId: string; costoUnitario: number }[] }>({
            query: (body) => ({
                url: 'items/bulk-costs',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Finance', 'Items'],
        }),
    }),
});

export const {
    useGetFinanceCockpitQuery,
    useGetCategoriesCostSummaryQuery,
    useBulkAssignCostByCategoryMutation,
    useBulkAssignCostsMutation,
} = financeApi;
