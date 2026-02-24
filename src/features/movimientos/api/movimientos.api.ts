import { api } from '../../../shared/api';

export interface Movimiento {
    id: string;
    tipo: 'REMITO_ENTRADA' | 'REMITO_SALIDA' | 'AJUSTE_SUMA' | 'AJUSTE_RESTA' | 'MOVE_SALIDA' | 'MOVE_ENTRADA';
    depositoId: string;
    posicionId: string;
    itemId: string;
    lotId: string;
    deltaKilos: number;
    deltaUnidades: number | null;
    referenciaId: string | null;
    referenciaTipo: string | null;
    fecha: string;
    userId: string | null;
    observaciones: string | null;
    // Relations joined by backend (if any)
    item?: { descripcion: string; codigoInterno: string };
    batch?: { lotNumber: string };
    posicion?: { codigo: string };
    deposito?: { nombre: string };
}

export const movimientosApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getMovimientos: builder.query<Movimiento[], {
            depositoId?: string;
            itemId?: string;
            lotId?: string;
            tipo?: string;
            desde?: string;
            hasta?: string;
        }>({
            query: (f = {}) => {
                const p = new URLSearchParams();
                Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v as string); });
                return `movimientos?${p.toString()}`;
            },
            providesTags: ['Stock'], // Link with Stock to refresh when actions happen
        }),
    }),
});

export const { useGetMovimientosQuery } = movimientosApi;
