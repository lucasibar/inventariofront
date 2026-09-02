import { api } from '../../../../shared/api';

export type MaterialReviewStatus = 'NORMAL' | 'TO_REVIEW' | 'PRIORITIZE_EXIT' | 'RESOLVED';

export interface MaterialAnalysisRow {
    itemId: string;
    codigoInterno: string;
    descripcion: string;
    categoryId: string | null;
    categoryName: string | null;
    unidadPrincipal: string;
    unidadSecundaria: string | null;
    linkedArticles: number;
    hasArticleMatch: boolean;
    stockKg: number;
    stockSecondary: number;
    lastMovementDate: string | null;
    movementCount: number;
    stagnantMonths: number | null;
    noMovementForPeriod: boolean;
    reviewStatus: MaterialReviewStatus;
    reviewNotes: string | null;
    reviewedBy: string | null;
    reviewedAt: string | null;
}

export interface MaterialAnalysisResponse {
    cutoffDate: string;
    months: number;
    summary: {
        totalActiveMaterials: number;
        withoutArticleMatch: number;
        stagnantWithStock: number;
        prioritizeExit: number;
    };
    withoutArticleMatch: MaterialAnalysisRow[];
    stagnant: MaterialAnalysisRow[];
}

export const materialAnalysisApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getMaterialAnalysis: builder.query<MaterialAnalysisResponse, { months?: number } | void>({
            query: (params) => `warehouse/material-analysis?months=${params?.months ?? 6}`,
            providesTags: ['Items', 'Stock'],
        }),
        updateMaterialReview: builder.mutation<any, { itemId: string; status: MaterialReviewStatus; notes?: string | null }>({
            query: ({ itemId, ...body }) => ({
                url: `warehouse/material-analysis/${itemId}/review`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Items', 'Stock'],
        }),
    }),
});

export const { useGetMaterialAnalysisQuery, useUpdateMaterialReviewMutation } = materialAnalysisApi;
