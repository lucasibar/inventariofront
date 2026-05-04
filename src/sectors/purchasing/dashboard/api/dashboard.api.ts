import { api } from '../../../../shared/api';

export const dashboardApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getCapacityDashboard: builder.query<any[], void>({
            query: () => 'dashboard/capacity',
            providesTags: ['Depots', 'Stock'],
        }),
        getVolumesDashboard: builder.query<any[], void>({
            query: () => 'dashboard/volumes',
            providesTags: ['Stock'],
        }),
        getCapacityTimeline: builder.query<any[], void>({
            query: () => 'dashboard/capacity-timeline',
            providesTags: ['Stock', 'PurchaseOrders', 'Dashboard'],
        }),
    }),
});

export const {
    useGetCapacityDashboardQuery,
    useGetVolumesDashboardQuery,
    useGetCapacityTimelineQuery,
} = dashboardApi;
