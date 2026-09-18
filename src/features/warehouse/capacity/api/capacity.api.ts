import { api } from '../../../../shared/api';

export const capacityApi = api.injectEndpoints({
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
            providesTags: ['Stock', 'Dashboard'],
        }),
    }),
});

export const {
    useGetCapacityDashboardQuery,
    useGetVolumesDashboardQuery,
    useGetCapacityTimelineQuery,
} = capacityApi;
