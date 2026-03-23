import { api } from '../../../shared/api';

export const dashboardApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getCapacityDashboard: builder.query<any[], void>({
            query: () => 'dashboard/capacity',
            providesTags: ['Depots', 'Stock'],
        }),
    }),
});

export const {
    useGetCapacityDashboardQuery,
} = dashboardApi;
