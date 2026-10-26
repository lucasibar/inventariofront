import { api } from '../../../shared/api';

export interface BloqueProgramacion {
    id: string;
    pedidoId?: string | null;
    numeroPedido: string;
    cliente: string;
    articuloCodigo: string;
    articuloDescripcion?: string | null;
    talle?: string | null;
    maquinaId: string;
    maquinaNumero: number;
    fechaInicio: string;
    fechaFin: string;
    cantidadProgramadaPacks: number;
    cantidadProducidaPacks: number;
    bloquePadreId?: string | null;
    esFraccion: boolean;
    numeroFraccion: number;
    estado: 'PROGRAMADO' | 'EN_CURSO' | 'COMPLETADO' | 'PAUSADO' | 'CANCELADO';
    colorIdentificador?: string | null;
    observaciones?: string | null;
    creadoEn: string;
    actualizadoEn: string;
}

export interface MaquinaTimeline {
    id: string;
    number: number;
    codigoInterno: string;
    nombre: string;
    status: string;
    type?: {
        id: string;
        nombre: string;
    } | null;
}

export interface TimelineData {
    maquinas: MaquinaTimeline[];
    bloques: BloqueProgramacion[];
    rango: {
        desde: string;
        hasta: string;
    };
}

export interface BacklogPedidoItem {
    id: string;
    numeroPedido: string;
    cliente: string;
    destino: string;
    fechaPedido: string;
    fechaEntrega?: string | null;
    articuloCodigo: string;
    articuloDescripcion?: string | null;
    talle?: string | null;
    paresPorPack: number;
    packsPedidas: number;
    packsTejidas: number;
    saldoPendiente: number;
    prioridad: string;
    totalYaProgramado: number;
    saldoPendienteProgramar: number;
}

export interface AsignarBloquePayload {
    pedidoId?: string;
    numeroPedido: string;
    cliente: string;
    articuloCodigo: string;
    articuloDescripcion?: string;
    talle?: string;
    maquinaId: string;
    fechaInicio: string;
    fechaFin: string;
    cantidadProgramadaPacks: number;
    colorIdentificador?: string;
    observaciones?: string;
}

export interface MoverBloquePayload {
    id: string;
    nuevaMaquinaId?: string;
    nuevaFechaInicio: string;
    nuevaFechaFin: string;
}

export interface SplitBloquePayload {
    id: string;
    cantidadLoteOriginal: number;
    cantidadNuevoLote: number;
    nuevaMaquinaId?: string;
    nuevaFechaInicio?: string;
    nuevaFechaFin?: string;
}

export const programacionApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getTimeline: builder.query<TimelineData, { desde: string; hasta: string }>({
            query: ({ desde, hasta }) => `produccion/programacion/timeline?desde=${desde}&hasta=${hasta}`,
            providesTags: ['Programacion'],
        }),
        getBacklog: builder.query<BacklogPedidoItem[], { cliente?: string; search?: string } | void>({
            query: (params) => {
                const searchParams = new URLSearchParams();
                if (params && params.cliente) searchParams.append('cliente', params.cliente);
                if (params && params.search) searchParams.append('search', params.search);
                const qs = searchParams.toString();
                return `produccion/programacion/backlog${qs ? `?${qs}` : ''}`;
            },
            providesTags: ['Programacion'],
        }),
        asignarBloque: builder.mutation<BloqueProgramacion, AsignarBloquePayload>({
            query: (body) => ({
                url: 'produccion/programacion/asignar',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Programacion', 'Ventas'],
        }),
        moverBloque: builder.mutation<BloqueProgramacion, MoverBloquePayload>({
            query: ({ id, ...body }) => ({
                url: `produccion/programacion/${id}/mover`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Programacion'],
        }),
        splitBloque: builder.mutation<{ bloqueOriginal: BloqueProgramacion; bloqueHijo: BloqueProgramacion }, SplitBloquePayload>({
            query: ({ id, ...body }) => ({
                url: `produccion/programacion/${id}/split`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Programacion'],
        }),
        eliminarBloque: builder.mutation<{ success: boolean; message: string }, string>({
            query: (id) => ({
                url: `produccion/programacion/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Programacion', 'Ventas'],
        }),
        actualizarEstadoBloque: builder.mutation<BloqueProgramacion, { id: string; estado: string }>({
            query: ({ id, estado }) => ({
                url: `produccion/programacion/${id}/estado`,
                method: 'PATCH',
                body: { estado },
            }),
            invalidatesTags: ['Programacion'],
        }),
    }),
});

export const {
    useGetTimelineQuery,
    useGetBacklogQuery,
    useAsignarBloqueMutation,
    useMoverBloqueMutation,
    useSplitBloqueMutation,
    useEliminarBloqueMutation,
    useActualizarEstadoBloqueMutation,
} = programacionApi;
