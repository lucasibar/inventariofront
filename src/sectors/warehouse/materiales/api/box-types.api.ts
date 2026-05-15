import { api } from '../../../../shared/api';

export const boxTypesApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getBoxTypes: builder.query<any[], void>({
            query: () => 'box-types',
            providesTags: ['BoxTypes'],
        }),
        createBoxType: builder.mutation<any, any>({
            query: (body) => ({ url: 'box-types', method: 'POST', body }),
            invalidatesTags: ['BoxTypes'],
        }),
        updateBoxType: builder.mutation<any, { id: string; data: any }>({
            query: ({ id, data }) => ({ url: `box-types/${id}`, method: 'PUT', body: data }),
            invalidatesTags: ['BoxTypes'],
        }),
        deleteBoxType: builder.mutation<void, string>({
            query: (id) => ({ url: `box-types/${id}`, method: 'DELETE' }),
            invalidatesTags: ['BoxTypes'],
        }),
    }),
});

export const { 
    useGetBoxTypesQuery, 
    useCreateBoxTypeMutation, 
    useUpdateBoxTypeMutation, 
    useDeleteBoxTypeMutation 
} = boxTypesApi;
