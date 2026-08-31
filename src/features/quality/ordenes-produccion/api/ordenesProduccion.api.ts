import { api } from '../../../../shared/api';
import type { ProduccionParseResult } from '../types/ordenesProduccion.types';

export const ordenesProduccionApi = api.injectEndpoints({
    endpoints: (builder) => ({
        parseOrdenesProduccion: builder.mutation<ProduccionParseResult, FormData>({
            query: (formData) => ({
                url: 'articulos/ordenes-produccion/parse',
                method: 'POST',
                body: formData,
            }),
        }),
    }),
});

export const { useParseOrdenesProduccionMutation } = ordenesProduccionApi;
