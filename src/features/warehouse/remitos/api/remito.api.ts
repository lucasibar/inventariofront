import { api } from '../../../../shared/api';
import type { CreateRemitoDto } from '../model/create-remito.dto';

export const remitoApi = api.injectEndpoints({
    endpoints: (builder) => ({
        createRemito: builder.mutation<void, CreateRemitoDto>({
            query: (body) => ({
                url: 'remitos-entrada',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['RemitosEntrada', 'Stock'],
        }),
    }),
});

export const { useCreateRemitoMutation } = remitoApi;
