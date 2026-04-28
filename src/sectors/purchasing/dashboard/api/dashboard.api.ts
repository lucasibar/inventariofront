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
    }),
});

export const {
    useGetCapacityDashboardQuery,
    useGetVolumesDashboardQuery,
} = dashboardApi;
