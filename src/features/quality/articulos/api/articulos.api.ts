import { api } from '../../../../shared/api';

export const articulosApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getArticulos: builder.query<any[], { q?: string }>({
            query: ({ q } = {}) => {
                const params = new URLSearchParams();
                if (q) params.set('q', q);
                return `articulos?${params.toString()}`;
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
    useDeleteArticuloMutation,
    useGetArticuloCategoriasQuery,
    useCreateArticuloCategoriaMutation,
    useUpdateArticuloCategoriaMutation,
} = articulosApi;
