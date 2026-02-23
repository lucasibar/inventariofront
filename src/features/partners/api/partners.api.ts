import { api } from '../../../shared/api';

export const partnersApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getPartners: builder.query<any[], { type?: string; q?: string }>({
            query: ({ type, q } = {}) => {
                const params = new URLSearchParams();
                if (type) params.set('type', type);
                if (q) params.set('q', q);
                return `partners?${params.toString()}`;
            },
            providesTags: ['Partners'],
        }),
        createPartner: builder.mutation<any, any>({
            query: (body) => ({ url: 'partners', method: 'POST', body }),
            invalidatesTags: ['Partners'],
        }),
        updatePartner: builder.mutation<any, { id: string; data: any }>({
            query: ({ id, data }) => ({ url: `partners/${id}`, method: 'PUT', body: data }),
            invalidatesTags: ['Partners'],
        }),
        deletePartner: builder.mutation<void, string>({
            query: (id) => ({ url: `partners/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Partners'],
        }),
    }),
});

export const { useGetPartnersQuery, useLazyGetPartnersQuery, useCreatePartnerMutation, useUpdatePartnerMutation, useDeletePartnerMutation } = partnersApi;
