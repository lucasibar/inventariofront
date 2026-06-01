import { api } from '../../../../shared/api';

export const tasksApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getPendingTasks: builder.query<any[], void>({
            query: () => 'tasks/pending',
            providesTags: ['Tasks'],
        }),
        completeTask: builder.mutation<void, string>({
            query: (id: string) => ({
                url: `tasks/${id}/complete`,
                method: 'PATCH',
            }),
            invalidatesTags: ['Tasks', 'Stock'],
        }),
    }),
});

export const {
    useGetPendingTasksQuery,
    useCompleteTaskMutation,
} = tasksApi;
