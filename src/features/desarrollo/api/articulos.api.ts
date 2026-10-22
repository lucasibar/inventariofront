import { api } from '../../../shared/api';

export interface Articulo {
    id: string;
    codigo: string;
    descripcion: string;
    unidadMedida: string;
    marca?: string;
    talle?: string;
    pesoU?: number;
    modelo?: string;
    destino?: string;
    variante?: string;
    etapa?: 'TERMINADO' | 'COSTURA' | 'TEJIDO' | 'HILADO' | 'INSUMO' | string;
    familia?: string;
    codigoSusi?: string;
    estado?: 'CHEQUEADO' | 'CONTROLAR' | 'MAL' | 'DESHABILITADO' | string;
    activo: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface ArticuloMaestroEquivalencia {
    id: string;
    codigo: string;
    descripcion: string;
    tipo: string;
    etapa?: string;
    familia?: string;
    unidadMedida: string;
    estadoRevision?: string;
    detalleRevision?: string;
    itemsAsignadosCount: number;
    estructurasQueLoUsan?: number;
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
    cantidad: number;
    cantidadSecundaria?: number;
    observacion?: string;
    descripcionInsumo?: string;
    etapaComponente?: string;
    familiaComponente?: string;
    unidadMedidaComponente?: string;
    articuloPadreId?: string;
    articuloHijoId?: string;
    subComponentesCount?: number;
    equivalenciasCount?: number;
}

export interface ArticuloResumenMaquina {
    id: string;
    codigo: string;
    descripcion: string;
    tipo: string;
    etapa?: string;
    familia?: string;
    modelo?: string;
    variante?: string;
    talle?: string;
    marca?: string;
    totalMachineTypes: number;
    confirmadosCount: number;
    estimadosCount: number;
    avgCycleTimeSeconds: number | null;
    preferredCycleTimeSeconds?: number | null;
    overallStatus: 'CONFIRMADO' | 'ESTIMADO' | 'SIN_ASIGNAR';
}

export interface ArticuloMachineTypeDetail {
    articuloId: string;
    machineTypeId: string;
    cycleTimeSeconds: number | null;
    preferida?: boolean;
    timeSource: string;
    status: 'CONFIRMADO' | 'ESTIMADO' | 'PENDIENTE';
    machineTypeName: string;
    marca: string;
    modelo: string;
    cantAgujas: number;
    cilindro: number;
    puntera: string;
}

export interface MachineTypeCatalogo {
    id: string;
    name: string;
    marca: string;
    modelo: string;
    cantAgujas: number;
    cilindro: number;
    puntera: string;
    processCategory: string;
}

export interface SimulacionNecesidadesResult {
    codigoPadre: string;
    descripcionPadre: string;
    etapaPadre: string | null;
    cantidadSolicitada: number;
    hiladosNecesarios: Array<{
        codigoArticulo: string;
        articuloId: string | null;
        descripcion: string;
        unidadMedida: string;
        cantidadTotalRequerida: number;
        stockTotalDisponible: number;
        faltante: number;
        alcanzaStock: boolean;
        sinEquivalenciaEnDeposito: boolean;
        itemsEquivalentes: Array<{
            ordenPrioridad: number;
            esPrincipal: boolean;
            codigoItem: string;
            descripcionItem: string;
            stockActual: number;
            factorConversion: number;
        }>;
    }>;
    insumosNecesarios: Array<{
        codigoArticulo: string;
        articuloId: string | null;
        descripcion: string;
        etapa: string;
        unidadMedida: string;
        cantidadTotalRequerida: number;
        sinCantidadDefinida: boolean;
        stockTotalDisponible: number;
        equivalenciasCount: number;
    }>;
    tejidoMaquinas: Array<{
        codigoTejido: string;
        descripcionTejido: string;
        unidadesATejer: number;
        sinMaquinaAsignada: boolean;
        opcionesMaquina: Array<{
            machineTypeId: string;
            machineTypeName: string;
            preferida: boolean;
            cycleTimeSeconds: number;
            status: string;
            horasTotales: number;
            turnos8h: number;
        }>;
    }>;
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
            etapa?: string;
            familia?: string;
            modelo?: string;
            destino?: string;
            estado?: string;
            soloConEtapa?: boolean;
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
                if (params.etapa) p.set('etapa', params.etapa);
                if (params.familia) p.set('familia', params.familia);
                if (params.modelo) p.set('modelo', params.modelo);
                if (params.destino) p.set('destino', params.destino);
                if (params.estado) p.set('estado', params.estado);
                if (params.soloConEtapa) p.set('soloConEtapa', 'true');
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

        createArticulo: builder.mutation<Articulo, Partial<Articulo>>({
            query: (body) => ({
                url: 'articulos',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Articulos', 'Estructuras', 'ArticuloEquivalencias'],
        }),

        updateArticulo: builder.mutation<Articulo, { id: string; data: Partial<Articulo> }>({
            query: ({ id, data }) => ({
                url: `articulos/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_res, _err, { id }) => [
                'Articulos',
                { type: 'Articulos', id },
                'Estructuras',
                'ArticuloEquivalencias',
            ],
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
            etapa?: string;
            soloSinMapear?: boolean;
            soloMapeados?: boolean;
            page?: number;
            limit?: number;
        }>({
            query: (params = {}) => {
                const p = new URLSearchParams();
                if (params.search) p.set('search', params.search);
                if (params.tipo) p.set('tipo', params.tipo);
                if (params.etapa) p.set('etapa', params.etapa);
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
            invalidatesTags: ['ArticuloEquivalencias', 'Articulos', 'Estructuras'],
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
            invalidatesTags: ['ArticuloEquivalencias', 'Estructuras'],
        }),

        desasociarItem: builder.mutation<{ success: boolean; reordenados: number }, string>({
            query: (id) => ({
                url: `articulos/equivalencias/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['ArticuloEquivalencias', 'Articulos', 'Estructuras'],
        }),

        getArticuloEstructuras: builder.query<ArticuloEstructura[], string>({
            query: (codigoPadre) => `articulos/estructuras/${encodeURIComponent(codigoPadre)}`,
            providesTags: ['Estructuras'],
        }),

        upsertLineaEstructura: builder.mutation<ArticuloEstructura, {
            codigoPadre: string;
            codigoComponente: string;
            cantidad: number;
            cantidadSecundaria?: number;
            observacion?: string;
            tipoFijoVariable?: string;
        }>({
            query: ({ codigoPadre, ...body }) => ({
                url: `articulos/estructuras/${encodeURIComponent(codigoPadre)}/componente`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Estructuras', 'Articulos'],
        }),

        eliminarLineaEstructura: builder.mutation<{ success: boolean }, string>({
            query: (id) => ({
                url: `articulos/estructuras/linea/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Estructuras', 'Articulos'],
        }),

        simularNecesidades: builder.query<SimulacionNecesidadesResult, { codigoPadre: string; cantidad: number }>({
            query: ({ codigoPadre, cantidad }) =>
                `articulos/estructuras/${encodeURIComponent(codigoPadre)}/simular?cantidad=${cantidad}`,
            providesTags: ['Estructuras', 'ArticuloEquivalencias', 'Articulos'],
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

        getCatalogoMaquinas: builder.query<MachineTypeCatalogo[], string | undefined>({
            query: (processCategory) => {
                const p = new URLSearchParams();
                if (processCategory) p.set('processCategory', processCategory);
                return `articulos/maquinas/catalogo?${p.toString()}`;
            },
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
            etapa?: string;
            familia?: string;
            page?: number;
            limit?: number;
        }>({
            query: (params = {}) => {
                const p = new URLSearchParams();
                if (params.search) p.set('search', params.search);
                if (params.status) p.set('status', params.status);
                if (params.etapa) p.set('etapa', params.etapa);
                if (params.familia) p.set('familia', params.familia);
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
            preferida?: boolean;
        }>({
            query: ({ articuloId, machineTypeId, ...body }) => ({
                url: `articulos/${articuloId}/maquinas/${machineTypeId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_res, _err, { articuloId }) => [
                'Articulos',
                { type: 'Articulos', id: `maquinas-${articuloId}` },
                'Estructuras',
            ],
        }),

        deleteArticuloMachineType: builder.mutation<{ success: boolean }, {
            articuloId: string;
            machineTypeId: string;
        }>({
            query: ({ articuloId, machineTypeId }) => ({
                url: `articulos/${articuloId}/maquinas/${machineTypeId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_res, _err, { articuloId }) => [
                'Articulos',
                { type: 'Articulos', id: `maquinas-${articuloId}` },
                'Estructuras',
            ],
        }),

        getPendientesEstructura: builder.query<{
            items: Array<{
                id: string;
                codigo: string;
                descripcion: string;
                tipo: string;
                etapa?: string;
                familia?: string;
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
    useCreateArticuloMutation,
    useUpdateArticuloMutation,
    useGetEquivalenciasMaestroQuery,
    useGetArticuloEquivalenciasQuery,
    useAsociarItemMutation,
    useReordenarPrioridadesMutation,
    useDesasociarItemMutation,
    useGetArticuloEstructurasQuery,
    useUpsertLineaEstructuraMutation,
    useEliminarLineaEstructuraMutation,
    useSimularNecesidadesQuery,
    useBuscarItemsParaVincularQuery,
    useGetCatalogoMaquinasQuery,
    useGetArticulosConMaquinasQuery,
    useGetArticuloMachineTypesQuery,
    useUpdateArticuloMachineTypeMutation,
    useDeleteArticuloMachineTypeMutation,
    useGetPendientesEstructuraQuery,
    useCrearArbolEstructuraMutation,
} = articulosApi;
