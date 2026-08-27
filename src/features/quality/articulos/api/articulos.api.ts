import { api } from '../../../../shared/api';

export const articulosApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getArticulos: builder.query<any[], { q?: string; estadoRevision?: string; marca?: string; clienteId?: string } | void>({
            query: (params = {}) => {
                const searchParams = new URLSearchParams();
                if (params && typeof params === 'object') {
                    if (params.q) searchParams.set('q', params.q);
                    if (params.estadoRevision) searchParams.set('estadoRevision', params.estadoRevision);
                    if (params.marca) searchParams.set('marca', params.marca);
                    if (params.clienteId) searchParams.set('clienteId', params.clienteId);
                }
                const queryString = searchParams.toString();
                return `articulos${queryString ? `?${queryString}` : ''}`;
            },
            providesTags: ['Articulos'],
        }),
        getArticulo: builder.query<any, string>({
            query: (id) => `articulos/${id}`,
            providesTags: ['Articulos'],
        }),
        createArticulo: builder.mutation<any, any>({
            query: (body) => ({ url: 'articulos', method: 'POST', body }),
            invalidatesTags: ['Articulos'],
        }),
        updateArticulo: builder.mutation<any, { id: string; data: any }>({
            query: ({ id, data }) => ({ url: `articulos/${id}`, method: 'PUT', body: data }),
            invalidatesTags: ['Articulos'],
        }),
        updateArticuloStatus: builder.mutation<any, { id: string; estadoRevision: string; revisadoPor?: string }>({
            query: ({ id, ...body }) => ({
                url: `articulos/${id}/status`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Articulos'],
        }),
        deleteArticulo: builder.mutation<void, string>({
            query: (id) => ({ url: `articulos/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Articulos'],
        }),
        getArticuloCategorias: builder.query<any[], void>({
            query: () => 'articulos/categorias',
            providesTags: ['ArticuloCategorias'],
        }),
        createArticuloCategoria: builder.mutation<any, { nombre: string }>({
            query: (body) => ({ url: 'articulos/categorias', method: 'POST', body }),
            invalidatesTags: ['ArticuloCategorias'],
        }),
        updateArticuloCategoria: builder.mutation<any, { id: string; data: { nombre?: string; activo?: boolean } }>({
            query: ({ id, data }) => ({ url: `articulos/categorias/${id}`, method: 'PUT', body: data }),
            invalidatesTags: ['ArticuloCategorias'],
        }),
    }),
});

export const {
    useGetArticulosQuery,
    useGetArticuloQuery,
    useCreateArticuloMutation,
    useUpdateArticuloMutation,
    useUpdateArticuloStatusMutation,
    useDeleteArticuloMutation,
    useGetArticuloCategoriasQuery,
    useCreateArticuloCategoriaMutation,
    useUpdateArticuloCategoriaMutation,
} = articulosApi;
