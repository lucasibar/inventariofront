import { api } from '../../../shared/api';

export interface PedidoVenta {
    id: string;
    numeroPedido: string;
    cliente: string;
    destino: string;
    fechaPedido: string;
    fechaEntrega?: string | null;
    articuloId?: string | null;
    articuloCodigo: string;
    articuloDescripcion?: string | null;
    talle?: string | null;
    paresPorPack: number;
    packsPedidas: number;
    packsTejidas: number;
    packsCocidas: number;
    packsPlanchadas: number;
    packsEmpaquetadas: number;
    packsArmadas: number;
    packsDespachadas: number;
    saldoPendiente: number;
    porcentajeCompleto: number;
    estado: string;
    tieneEstructura: boolean;
    prioridad: string;
    observaciones?: string | null;
    creadoEn: string;
    actualizadoEn: string;
    articulo?: {
        id: string;
        codigo: string;
        descripcion: string;
        talle?: string;
        marca?: string;
        modelo?: string;
    };
}

export interface KpisVentas {
    totalPacksPedidas: number;
    totalPacksDespachadas: number;
    totalPacksArmadas: number;
    totalPacksEnTransaccional: number;
    articulosSinEstructuraCount: number;
}

export interface ListarPedidosResponse {
    pedidos: PedidoVenta[];
    total: number;
    kpis: KpisVentas;
}

export interface FiltrosPedidos {
    cliente?: string;
    estado?: string;
    search?: string;
    soloPendientes?: boolean;
    soloSinEstructura?: boolean;
    page?: number;
    limit?: number;
}

export interface MovimientoPedido {
    id: string;
    pedidoId: string;
    numeroPedido: string;
    articuloCodigo: string;
    tipoMovimiento: string;
    cantidadPacks: number;
    paresEquivalentes: number;
    estadioOrigen?: string;
    estadioDestino?: string;
    documentoReferencia?: string;
    numeroRemito?: string;
    usuarioId?: string;
    observaciones?: string;
    fecha: string;
}

export const ventasApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getPedidosVentas: builder.query<ListarPedidosResponse, FiltrosPedidos>({
            query: (params) => {
                const queryParams = new URLSearchParams();
                if (params.cliente && params.cliente !== 'TODOS') queryParams.append('cliente', params.cliente);
                if (params.estado && params.estado !== 'TODOS') queryParams.append('estado', params.estado);
                if (params.search) queryParams.append('search', params.search);
                if (params.soloPendientes) queryParams.append('soloPendientes', 'true');
                if (params.soloSinEstructura) queryParams.append('soloSinEstructura', 'true');
                if (params.page) queryParams.append('page', String(params.page));
                if (params.limit) queryParams.append('limit', String(params.limit));

                return `ventas/pedidos?${queryParams.toString()}`;
            },
            providesTags: ['Ventas'],
        }),

        crearPedidoVenta: builder.mutation<PedidoVenta, Partial<PedidoVenta>>({
            query: (body) => ({
                url: 'ventas/pedidos',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Ventas'],
        }),

        avanzarEstadioPedido: builder.mutation<
            PedidoVenta,
            { id: string; estadio: 'TEJIDO' | 'COCIDO' | 'PLANCHADO' | 'EMPAQUETADO' | 'ARMADO'; cantidadPacks: number; observaciones?: string }
        >({
            query: ({ id, ...body }) => ({
                url: `ventas/pedidos/${id}/avance`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Ventas'],
        }),

        emitirRemitoSalida: builder.mutation<
            PedidoVenta,
            { id: string; numeroRemito: string; cantidadPacks: number; observaciones?: string }
        >({
            query: ({ id, ...body }) => ({
                url: `ventas/pedidos/${id}/remito`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Ventas', 'Stock'],
        }),

        importarPedidosExcel: builder.mutation<{ mensaje: string; importados: number; actualizados: number; articulosSinEstructura: number }, { filePath?: string }>({
            query: (body) => ({
                url: 'ventas/importar-excel',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Ventas'],
        }),

        getArticulosSinEstructura: builder.query<PedidoVenta[], void>({
            query: () => 'ventas/articulos-sin-estructura',
            providesTags: ['Ventas'],
        }),

        getMovimientosVentas: builder.query<{ movimientos: MovimientoPedido[]; total: number }, { pedidoId?: string; search?: string }>({
            query: (params) => {
                const queryParams = new URLSearchParams();
                if (params.pedidoId) queryParams.append('pedidoId', params.pedidoId);
                if (params.search) queryParams.append('search', params.search);
                return `ventas/movimientos?${queryParams.toString()}`;
            },
            providesTags: ['Ventas'],
        }),
    }),
});

export const {
    useGetPedidosVentasQuery,
    useCrearPedidoVentaMutation,
    useAvanzarEstadioPedidoMutation,
    useEmitirRemitoSalidaMutation,
    useImportarPedidosExcelMutation,
    useGetArticulosSinEstructuraQuery,
    useGetMovimientosVentasQuery,
} = ventasApi;
