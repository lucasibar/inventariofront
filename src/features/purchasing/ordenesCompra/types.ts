export type EstadoOrdenCompra = 'BORRADOR' | 'EN_CAMINO' | 'PARCIAL' | 'COMPLETADA' | 'CANCELADA';
export type EstadoLineaOrdenCompra = 'PENDIENTE' | 'PARCIAL' | 'ENTREGADO';

export interface RecepcionRemitoRef {
    id: string;
    remitoId: string;
    remitoNumero: string;
    fecha: string;
    cantidadKg: number;
    notas?: string;
    creadoEn: string;
}

export interface RecepcionManualRef {
    id: string;
    fecha: string;
    cantidadKg: number;
    notas?: string;
    creadoEn: string;
}

export interface OrdenCompraLinea {
    id: string;
    itemId: string;
    codigoInterno: string;
    descripcion: string;
    categoriaId?: string;
    categoriaNombre?: string;
    cantidadPedidaKg: number;
    cantidadRecibidaKg: number;
    fechaArriboEstimada: string; // YYYY-MM-DD
    estado: EstadoLineaOrdenCompra;
    precioUnitarioUsd?: number;
    remitosAsociados: RecepcionRemitoRef[];
    recepcionesManuales: RecepcionManualRef[];
}

export interface OrdenCompra {
    id: string;
    numero: string; // e.g. OC-2026-001
    partnerId: string;
    partnerNombre: string;
    fechaEmision: string; // YYYY-MM-DD
    fechaArriboEstimada: string; // YYYY-MM-DD (fecha límite o estimada global)
    estado: EstadoOrdenCompra;
    observaciones?: string;
    lineas: OrdenCompraLinea[];
    creadoEn: string;
    actualizadoEn: string;
}
