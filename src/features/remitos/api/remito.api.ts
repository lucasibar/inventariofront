
import { api } from '../../shared/api';
import { CreateRemitoDto } from '../../entities/remito/create-remito.dto'; // Need to create this DTO on frontend

export const remitoApi = api.injectEndpoints({
    endpoints: (builder) => ({
        createRemito: builder.mutation<void, CreateRemitoDto>({
            query: (body) => ({
                url: 'remitos',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Inventory', 'Items'],
        }),
        getDepots: builder.query<any[], void>({ // Type weak for now
            query: () => 'depots',
        }),
        searchPartners: builder.query<any[], string>({
            query: (search) => `partners?search=${search}`,
        }),
    }),
});

export const { useCreateRemitoMutation, useGetDepotsQuery, useLazySearchPartnersQuery } = remitoApi;
