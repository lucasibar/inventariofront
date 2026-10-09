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
    posicion?: string;
    secuencia?: string;
    cantidad: number;
    fechaInicio?: string;
    fechaFin?: string;
    observacion?: string;
    tipoFijoVariable?: string;
    revisionInicial?: string;
    revisionFinal?: string;
    detalleFalla?: string;
    componenteAnterior?: string;
    estadoRevision?: string;
    fuenteControl?: string;
    detalleRevision?: string;
    estadoConsumo?: string;
    descripcionInsumo?: string;
}

export interface ArticuloResumenMaquina {
    id: string;
    codigo: string;
    descripcion: string;
    tipo: string;
    talle?: string;
    marca?: string;
    totalMachineTypes: number;
    confirmadosCount: number;
    estimadosCount: number;
    avgCycleTimeSeconds: number | null;
    overallStatus: 'CONFIRMADO' | 'ESTIMADO' | 'SIN_ASIGNAR';
}

export interface ArticuloMachineTypeDetail {
    articuloId: string;
    machineTypeId: string;
    cycleTimeSeconds: number | null;
    timeSource: string;
    status: 'CONFIRMADO' | 'ESTIMADO' | 'PENDIENTE';
    machineTypeName: string;
    marca: string;
    modelo: string;
    cantAgujas: number;
    cilindro: number;
    puntera: string;
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
            query: (codigoPadre) => `articulos/estructuras/${encodeURIComponent(codigoPadre)}`,
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

        getArticulosConMaquinas: builder.query<{
            items: ArticuloResumenMaquina[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }, {
            search?: string;
            status?: string;
            page?: number;
            limit?: number;
        }>({
            query: (params = {}) => {
                const p = new URLSearchParams();
                if (params.search) p.set('search', params.search);
                if (params.status) p.set('status', params.status);
                if (params.page) p.set('page', String(params.page));
                if (params.limit) p.set('limit', String(params.limit));
                return `articulos/maquinas/resumen?${p.toString()}`;
            },
            providesTags: ['Articulos'],
        }),

        getArticuloMachineTypes: builder.query<ArticuloMachineTypeDetail[], string>({
            query: (articuloId) => `articulos/${articuloId}/maquinas`,
            providesTags: (_res, _err, id) => [{ type: 'Articulos', id: `maquinas-${id}` }],
        }),

        updateArticuloMachineType: builder.mutation<{ success: boolean }, {
            articuloId: string;
            machineTypeId: string;
            cycleTimeSeconds: number;
            status?: string;
        }>({
            query: ({ articuloId, machineTypeId, ...body }) => ({
                url: `articulos/${articuloId}/maquinas/${machineTypeId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_res, _err, { articuloId }) => [
                'Articulos',
                { type: 'Articulos', id: `maquinas-${articuloId}` },
            ],
        }),
        getPendientesEstructura: builder.query<{
            items: Array<{
                id: string;
                codigo: string;
                descripcion: string;
                tipo: string;
                unidadMedida: string;
                marca?: string;
                talle?: string;
                articuloGenerico?: string;
            }>;
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }, {
            search?: string;
            tipo?: string;
            page?: number;
            limit?: number;
        }>({
            query: (params = {}) => {
                const p = new URLSearchParams();
                if (params.search) p.set('search', params.search);
                if (params.tipo) p.set('tipo', params.tipo);
                if (params.page) p.set('page', String(params.page));
                if (params.limit) p.set('limit', String(params.limit));
                return `articulos/estructuras/pendientes?${p.toString()}`;
            },
            providesTags: ['Estructuras'],
        }),

        crearArbolEstructura: builder.mutation<{
            success: boolean;
            componentesGuardados: number;
            piCreado: boolean;
        }, {
            codigoPadre: string;
            productoIntermedio?: {
                codigoPI: string;
                descripcionPI?: string;
                cantidad?: number;
            };
            componentes: Array<{
                codigoComponente: string;
                descripcionInsumo?: string;
                cantidad: number;
                tipoFijoVariable?: string;
                itemIdEquivalente?: string;
                ordenPrioridad?: number;
            }>;
        }>({
            query: (body) => ({
                url: 'articulos/estructuras/crear-arbol',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Estructuras', 'Articulos', 'ArticuloEquivalencias'],
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
    useGetArticulosConMaquinasQuery,
    useGetArticuloMachineTypesQuery,
    useUpdateArticuloMachineTypeMutation,
    useGetPendientesEstructuraQuery,
    useCrearArbolEstructuraMutation,
} = articulosApi;

