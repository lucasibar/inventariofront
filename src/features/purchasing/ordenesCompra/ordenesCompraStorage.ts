import { useState, useEffect, useCallback } from 'react';
import type { OrdenCompra } from './types';
export type { OrdenCompra, OrdenCompraLinea, EstadoOrdenCompra, EstadoLineaOrdenCompra } from './types';

const STORAGE_KEY = 'erp_ordenes_compra';
const EVENT_KEY = 'erp_ordenes_compra_changed';

// Función para calcular fecha relativa (ej. hoy + N días)
const getDateOffset = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
};

const SEED_DATA: OrdenCompra[] = [
    {
        id: 'oc-seed-001',
        numero: 'OC-2026-001',
        partnerId: 'partner-tn-platex',
        partnerNombre: 'TN Platex S.A.',
        fechaEmision: getDateOffset(-5),
        fechaArriboEstimada: getDateOffset(7),
        estado: 'EN_CAMINO',
        observaciones: 'Lote hilado blanco para programa de invierno. Despacho confirmado por transporte expreso.',
        creadoEn: new Date(Date.now() - 5 * 86400000).toISOString(),
        actualizadoEn: new Date().toISOString(),
        lineas: [
            {
                id: 'linea-001',
                itemId: 'item-alg-24-1-bco',
                codigoInterno: 'ALG-24-1-BCO',
                descripcion: 'Algodón 24/1 Peinado Blanco Crudo',
                categoriaNombre: 'Algodón 24/1 Blanco',
                cantidadPedidaKg: 2500,
                cantidadRecibidaKg: 0,
                fechaArriboEstimada: getDateOffset(7),
                estado: 'PENDIENTE',
                precioUnitarioUsd: 4.85,
                remitosAsociados: [],
                recepcionesManuales: []
            },
            {
                id: 'linea-002',
                itemId: 'item-alg-24-1-neg',
                codigoInterno: 'ALG-24-1-NEG',
                descripcion: 'Algodón 24/1 Teñido Negro Intenso',
                categoriaNombre: 'Algodón 24/1 Negro',
                cantidadPedidaKg: 1200,
                cantidadRecibidaKg: 0,
                fechaArriboEstimada: getDateOffset(9),
                estado: 'PENDIENTE',
                precioUnitarioUsd: 5.20,
                remitosAsociados: [],
                recepcionesManuales: []
            }
        ]
    },
    {
        id: 'oc-seed-002',
        numero: 'OC-2026-002',
        partnerId: 'partner-enod',
        partnerNombre: 'ENOD Hilandería',
        fechaEmision: getDateOffset(-12),
        fechaArriboEstimada: getDateOffset(3),
        estado: 'PARCIAL',
        observaciones: 'Entrega en 2 tramos. Primer tramo ingresó con remito R-0004-0019283.',
        creadoEn: new Date(Date.now() - 12 * 86400000).toISOString(),
        actualizadoEn: new Date().toISOString(),
        lineas: [
            {
                id: 'linea-003',
                itemId: 'item-spun-30-1',
                codigoInterno: 'SPUN-30-1-GRIS',
                descripcion: 'Poliester Spun 30/1 Gris Melange',
                categoriaNombre: 'Spun 30/1 Melange',
                cantidadPedidaKg: 3000,
                cantidadRecibidaKg: 1500,
                fechaArriboEstimada: getDateOffset(3),
                estado: 'PARCIAL',
                precioUnitarioUsd: 3.40,
                remitosAsociados: [
                    {
                        id: 'rec-rem-001',
                        remitoId: 'rem-ent-982',
                        remitoNumero: 'R-0004-0019283',
                        fecha: getDateOffset(-2),
                        cantidadKg: 1500,
                        notas: 'Primer tramo recibido conforme en planta central.',
                        creadoEn: new Date(Date.now() - 2 * 86400000).toISOString()
                    }
                ],
                recepcionesManuales: []
            }
        ]
    },
    {
        id: 'oc-seed-003',
        numero: 'OC-2026-003',
        partnerId: 'partner-textil-norte',
        partnerNombre: 'Textil Norte Hilados',
        fechaEmision: getDateOffset(-2),
        fechaArriboEstimada: getDateOffset(18),
        estado: 'EN_CAMINO',
        observaciones: 'Pedido programado para cubrir producción del mes próximo.',
        creadoEn: new Date(Date.now() - 2 * 86400000).toISOString(),
        actualizadoEn: new Date().toISOString(),
        lineas: [
            {
                id: 'linea-004',
                itemId: 'item-licra-40',
                codigoInterno: 'ELAST-40-REC',
                descripcion: 'Elastano 40 Recubierto con Poliamida',
                categoriaNombre: 'Elastano / Lycra',
                cantidadPedidaKg: 800,
                cantidadRecibidaKg: 0,
                fechaArriboEstimada: getDateOffset(18),
                estado: 'PENDIENTE',
                precioUnitarioUsd: 8.90,
                remitosAsociados: [],
                recepcionesManuales: []
            }
        ]
    }
];

export const getOrdenesCompra = (): OrdenCompra[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
            return SEED_DATA;
        }
        return JSON.parse(raw);
    } catch (e) {
        console.error('Error al leer órdenes de compra de storage:', e);
        return SEED_DATA;
    }
};

const emitChangeEvent = () => {
    window.dispatchEvent(new CustomEvent(EVENT_KEY));
};

export const saveOrdenCompra = (oc: OrdenCompra): void => {
    const list = getOrdenesCompra();
    const index = list.findIndex(o => o.id === oc.id);
    
    // Recalcular estado de la orden según sus líneas
    const totalPed = oc.lineas.reduce((acc, l) => acc + Number(l.cantidadPedidaKg || 0), 0);
    const totalRec = oc.lineas.reduce((acc, l) => acc + Number(l.cantidadRecibidaKg || 0), 0);

    if (oc.estado !== 'CANCELADA' && oc.estado !== 'BORRADOR') {
        if (totalRec >= totalPed && totalPed > 0) {
            oc.estado = 'COMPLETADA';
        } else if (totalRec > 0) {
            oc.estado = 'PARCIAL';
        } else {
            oc.estado = 'EN_CAMINO';
        }
    }

    oc.actualizadoEn = new Date().toISOString();

    if (index >= 0) {
        list[index] = oc;
    } else {
        list.unshift(oc);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    emitChangeEvent();
};

export const deleteOrdenCompra = (id: string): void => {
    const list = getOrdenesCompra().filter(o => o.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    emitChangeEvent();
};

// 1. Vincular Remito de Entrada a una Línea de OC
export const asociarRemitoEntradaALinea = (
    ocId: string,
    lineaId: string,
    remitoData: { remitoId: string; remitoNumero: string; fecha: string; cantidadKg: number; notas?: string }
): void => {
    const list = getOrdenesCompra();
    const oc = list.find(o => o.id === ocId);
    if (!oc) return;

    const linea = oc.lineas.find(l => l.id === lineaId);
    if (!linea) return;

    linea.remitosAsociados.push({
        id: `rec-rem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        remitoId: remitoData.remitoId,
        remitoNumero: remitoData.remitoNumero,
        fecha: remitoData.fecha || new Date().toISOString().split('T')[0],
        cantidadKg: remitoData.cantidadKg,
        notas: remitoData.notas,
        creadoEn: new Date().toISOString()
    });

    linea.cantidadRecibidaKg = (linea.cantidadRecibidaKg || 0) + remitoData.cantidadKg;
    if (linea.cantidadRecibidaKg >= linea.cantidadPedidaKg) {
        linea.estado = 'ENTREGADO';
    } else {
        linea.estado = 'PARCIAL';
    }

    saveOrdenCompra(oc);
};

// 2. Declarar Entrega Manual Directa (Desacoplada del remito físico)
export const declararEntregaManualALinea = (
    ocId: string,
    lineaId: string,
    cantidadKg: number,
    notas?: string
): void => {
    const list = getOrdenesCompra();
    const oc = list.find(o => o.id === ocId);
    if (!oc) return;

    const linea = oc.lineas.find(l => l.id === lineaId);
    if (!linea) return;

    linea.recepcionesManuales.push({
        id: `rec-man-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        fecha: new Date().toISOString().split('T')[0],
        cantidadKg,
        notas: notas || 'Recepción directa declarada por Compras',
        creadoEn: new Date().toISOString()
    });

    linea.cantidadRecibidaKg = (linea.cantidadRecibidaKg || 0) + cantidadKg;
    if (linea.cantidadRecibidaKg >= linea.cantidadPedidaKg) {
        linea.estado = 'ENTREGADO';
    } else {
        linea.estado = 'PARCIAL';
    }

    saveOrdenCompra(oc);
};

// 3. Obtener Kilos Pendientes agrupados por ItemId / Código (Impacto en "Por Venir")
export const getKilosPendientesByItem = (): Map<string, number> => {
    const map = new Map<string, number>();
    const list = getOrdenesCompra();

    list.forEach(oc => {
        // Solo computan órdenes activas
        if (oc.estado !== 'EN_CAMINO' && oc.estado !== 'PARCIAL') return;

        oc.lineas.forEach(l => {
            const pendiente = Math.max(0, l.cantidadPedidaKg - (l.cantidadRecibidaKg || 0));
            if (pendiente > 0) {
                if (l.itemId) {
                    map.set(l.itemId, (map.get(l.itemId) || 0) + pendiente);
                }
                if (l.codigoInterno) {
                    const norm = l.codigoInterno.trim().toUpperCase();
                    map.set(norm, (map.get(norm) || 0) + pendiente);
                }
            }
        });
    });

    return map;
};

// 4. Obtener cronograma de arribos para el Gráfico Diente de Sierra
export interface ArriboProgramado {
    fecha: string;
    cantidadKg: number;
    ordenNumero: string;
    partnerNombre: string;
    itemId: string;
    codigoInterno: string;
    descripcion: string;
}

export const getArribosProgramados = (itemIdentifier?: string): ArriboProgramado[] => {
    const list = getOrdenesCompra();
    const arribos: ArriboProgramado[] = [];
    const normSearch = itemIdentifier ? itemIdentifier.trim().toUpperCase() : null;

    list.forEach(oc => {
        if (oc.estado !== 'EN_CAMINO' && oc.estado !== 'PARCIAL') return;

        oc.lineas.forEach(l => {
            const pendiente = Math.max(0, l.cantidadPedidaKg - (l.cantidadRecibidaKg || 0));
            if (pendiente <= 0) return;

            const match = !normSearch
                || l.itemId === normSearch
                || (l.codigoInterno && l.codigoInterno.trim().toUpperCase() === normSearch)
                || (l.categoriaNombre && l.categoriaNombre.trim().toUpperCase().includes(normSearch));

            if (match) {
                arribos.push({
                    fecha: l.fechaArriboEstimada || oc.fechaArriboEstimada,
                    cantidadKg: pendiente,
                    ordenNumero: oc.numero,
                    partnerNombre: oc.partnerNombre,
                    itemId: l.itemId,
                    codigoInterno: l.codigoInterno,
                    descripcion: l.descripcion
                });
            }
        });
    });

    return arribos.sort((a, b) => a.fecha.localeCompare(b.fecha));
};

// 5. Hook reactivo para componentes
export const useOrdenesCompra = () => {
    const [ordenes, setOrdenes] = useState<OrdenCompra[]>(getOrdenesCompra);

    const refresh = useCallback(() => {
        setOrdenes(getOrdenesCompra());
    }, []);

    useEffect(() => {
        const handler = () => refresh();
        window.addEventListener(EVENT_KEY, handler);
        return () => window.removeEventListener(EVENT_KEY, handler);
    }, [refresh]);

    return {
        ordenes,
        refresh,
        save: saveOrdenCompra,
        remove: deleteOrdenCompra,
        asociarRemito: asociarRemitoEntradaALinea,
        declararEntrega: declararEntregaManualALinea,
        kilosPendientesMap: getKilosPendientesByItem()
    };
};
