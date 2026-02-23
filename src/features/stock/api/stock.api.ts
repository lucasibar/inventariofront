import { api } from '../../../shared/api';

export const stockApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getStock: builder.query<any[], {
            depotId?: string; positionId?: string; supplierId?: string;
            itemId?: string; lotNumber?: string; q?: string;
        }>({
            query: (f = {}) => {
                const p = new URLSearchParams();
                Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v as string); });
                return `stock?${p.toString()}`;
            },
            providesTags: ['Stock'],
        }),
        getAlerts: builder.query<any[], void>({
            query: () => 'stock/alerts',
            providesTags: ['Stock'],
        }),
        getDashboardCompras: builder.query<any[], void>({
            query: () => 'dashboard/compras',
            providesTags: ['Dashboard'],
        }),
    }),
});

export const { useGetStockQuery, useGetAlertsQuery, useGetDashboardComprasQuery } = stockApi;
