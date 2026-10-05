import { api } from '../../../shared/api';

export interface Articulo {
    id: string;
    codigo: string;
    descripcion: string;
    tipo: string;
    unidadMedida: string;
    almacenEstandar?: string;
    marca?: string;
    talle?: string;
    tipoArticulo?: string;
    activo: boolean;
    estadoRevision?: string;
    createdAt?: string;
}

export interface ArticuloMaestroEquivalencia {
    id: string;
    codigo: string;
    descripcion: string;
    tipo: string;
    unidadMedida: string;
    itemsAsignadosCount: number;
    mapeado: boolean;
    itemPrincipal: string | null;
}

export interface ArticuloItemEquivalencia {
    id: string;
    articuloId: string;
    codigoArticulo: string;
    itemId: string;
    codigoItem: string;
    ordenPrioridad: number;
    esPrincipal: boolean;
    factorConversion: number;
    observaciones: string | null;
    stockActual: number;
    item: {
        id: string;
        codigoInterno: string;
        descripcion: string;
        unidadPrincipal: string;
        supplierName?: string;
        categoria?: string;
    };
}

export interface ArticuloEstructura {
    id: string;
    codigoPadre: string;
    codigoComponente: string;
    secuencia?: number;
    cantidadBase: number;
    porcentajePerdida?: number;
    almacenComponente?: string;
    observaciones?: string;
}

export const articulosApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getArticulos: builder.query<{
            items: Articulo[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }, {
            search?: string;
            tipo?: string;
            marca?: string;
            talle?: string;
            activo?: boolean;
            page?: number;
            limit?: number;
        }>({
            query: (params = {}) => {
                const p = new URLSearchParams();
                if (params.search) p.set('search', params.search);
                if (params.tipo) p.set('tipo', params.tipo);
                if (params.marca) p.set('marca', params.marca);
                if (params.talle) p.set('talle', params.talle);
                if (params.activo !== undefined) p.set('activo', String(params.activo));
                if (params.page) p.set('page', String(params.page));
                if (params.limit) p.set('limit', String(params.limit));
                return `articulos?${p.toString()}`;
            },
            providesTags: ['Articulos'],
        }),

        getArticuloById: builder.query<Articulo, string>({
            query: (id) => `articulos/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Articulos', id }],
        }),

        getEquivalenciasMaestro: builder.query<{
            items: ArticuloMaestroEquivalencia[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }, {
            search?: string;
            tipo?: string;
            soloSinMapear?: boolean;
            soloMapeados?: boolean;
            page?: number;
            limit?: number;
        }>({
            query: (params = {}) => {
                const p = new URLSearchParams();
                if (params.search) p.set('search', params.search);
                if (params.tipo) p.set('tipo', params.tipo);
                if (params.soloSinMapear) p.set('soloSinMapear', 'true');
                if (params.soloMapeados) p.set('soloMapeados', 'true');
                if (params.page) p.set('page', String(params.page));
                if (params.limit) p.set('limit', String(params.limit));
                return `articulos/equivalencias/maestro?${p.toString()}`;
            },
            providesTags: ['ArticuloEquivalencias'],
        }),

        getArticuloEquivalencias: builder.query<ArticuloItemEquivalencia[], string>({
            query: (articuloId) => `articulos/${articuloId}/equivalencias`,
            providesTags: (_result, _error, articuloId) => [
                { type: 'ArticuloEquivalencias', id: articuloId },
                'ArticuloEquivalencias',
            ],
        }),

        asociarItem: builder.mutation<ArticuloItemEquivalencia, {
            articuloId: string;
            itemId: string;
            ordenPrioridad?: number;
            factorConversion?: number;
            observaciones?: string;
        }>({
            query: ({ articuloId, ...body }) => ({
                url: `articulos/${articuloId}/equivalencias`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['ArticuloEquivalencias'],
        }),

        reordenarPrioridades: builder.mutation<ArticuloItemEquivalencia[], {
            articuloId: string;
            equivalenciaIds: string[];
        }>({
            query: ({ articuloId, equivalenciaIds }) => ({
                url: `articulos/${articuloId}/equivalencias/orden`,
                method: 'PUT',
                body: { equivalenciaIds },
            }),
            invalidatesTags: ['ArticuloEquivalencias'],
        }),

        desasociarItem: builder.mutation<{ success: boolean; reordenados: number }, string>({
            query: (id) => ({
                url: `articulos/equivalencias/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['ArticuloEquivalencias'],
        }),

        getArticuloEstructuras: builder.query<ArticuloEstructura[], string>({
            query: (codigoPadre) => `articulos/${codigoPadre}/estructuras`,
            providesTags: ['Estructuras'],
        }),

        buscarItemsParaVincular: builder.query<any[], { q?: string; categoryId?: string }>({
            query: (params = {}) => {
                const p = new URLSearchParams();
                if (params.q) p.set('q', params.q);
                if (params.categoryId) p.set('categoryId', params.categoryId);
                return `items?${p.toString()}`;
            },
            providesTags: ['Items'],
        }),
    }),
});

export const {
    useGetArticulosQuery,
    useGetArticuloByIdQuery,
    useGetEquivalenciasMaestroQuery,
    useGetArticuloEquivalenciasQuery,
    useAsociarItemMutation,
    useReordenarPrioridadesMutation,
    useDesasociarItemMutation,
    useGetArticuloEstructurasQuery,
    useBuscarItemsParaVincularQuery,
} = articulosApi;
