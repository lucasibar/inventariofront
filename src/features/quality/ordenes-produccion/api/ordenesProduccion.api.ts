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
        getUltimaPlanillaProduccion: builder.query<ProduccionParseResult | null, void>({
            query: () => 'articulos/ordenes-produccion/ultima',
        }),
        listarPlanillasProduccion: builder.query<any[], void>({
            query: () => 'articulos/ordenes-produccion/planillas',
        }),
        getPlanillaProduccionById: builder.query<ProduccionParseResult | null, string>({
            query: (id) => `articulos/ordenes-produccion/planillas/${id}`,
        }),
        getDepositosArticulos: builder.query<{ depositos: any[]; resumenStockPorArticulo: any[] }, void>({
            query: () => 'articulos/ordenes-produccion/depositos-articulos',
        }),
        crearPosicionArticulo: builder.mutation<any, { depositoId: string; codigo: string; descripcion?: string; capacidadDocenas?: number }>({
            query: (body) => ({
                url: 'articulos/ordenes-produccion/posiciones-articulos',
                method: 'POST',
                body,
            }),
        }),
        listarPedidosProduccion: builder.query<any[], void>({
            query: () => 'articulos/ordenes-produccion/pedidos',
        }),
        crearPedidoProduccion: builder.mutation<any, any>({
            query: (body) => ({
                url: 'articulos/ordenes-produccion/pedidos',
                method: 'POST',
                body,
            }),
        }),
        actualizarPedidoProduccion: builder.mutation<any, { id: string; data: any }>({
            query: ({ id, data }) => ({
                url: `articulos/ordenes-produccion/pedidos/${id}`,
                method: 'PATCH',
                body: data,
            }),
        }),
        sincronizarPlanillaConPedidos: builder.mutation<{ creados: number; actualizados: number }, void>({
            query: () => ({
                url: 'articulos/ordenes-produccion/pedidos/sincronizar',
                method: 'POST',
            }),
        }),
        getCorteProveedor: builder.query<{
            categoriasDisponibles: string[];
            categoriaSeleccionada: string;
            mesesAnalizados: number;
            mensajeCorte: string;
            diasParaCorte: number | null;
            fechaProyectadaCorte: string | null;
            alertaCritica: boolean;
            materialActual: any;
            proximoMaterial: any;
            cadenaPrioridades: any[];
        }, { categoria?: string; meses?: number }>({
            query: (params = {}) => {
                const p = new URLSearchParams();
                if (params.categoria) p.set('categoria', params.categoria);
                if (params.meses) p.set('meses', String(params.meses));
                return `articulos/ordenes-produccion/corte-proveedor?${p.toString()}`;
            },
        }),
    }),
});

export const {
    useParseOrdenesProduccionMutation,
    useGetUltimaPlanillaProduccionQuery,
    useListarPlanillasProduccionQuery,
    useLazyGetPlanillaProduccionByIdQuery,
    useGetDepositosArticulosQuery,
    useCrearPosicionArticuloMutation,
    useListarPedidosProduccionQuery,
    useCrearPedidoProduccionMutation,
    useActualizarPedidoProduccionMutation,
    useSincronizarPlanillaConPedidosMutation,
    useGetCorteProveedorQuery,
} = ordenesProduccionApi;
