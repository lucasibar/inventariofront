import { useState, useEffect, useCallback } from 'react';
import type { OrdenCompra } from './types';
import excelSeedRaw from './ordenesExcelSeed.json';
export type { OrdenCompra, OrdenCompraLinea, EstadoOrdenCompra, EstadoLineaOrdenCompra } from './types';

const STORAGE_KEY = 'erp_ordenes_compra';
const EVENT_KEY = 'erp_ordenes_compra_changed';

export const EXCEL_SEED_DATA: OrdenCompra[] = excelSeedRaw as unknown as OrdenCompra[];

export const getOrdenesCompra = (): OrdenCompra[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(EXCEL_SEED_DATA));
            return EXCEL_SEED_DATA;
        }
        const parsed = JSON.parse(raw);
        // Si el storage tiene los datos dummy de prueba iniciales, auto-migrar al conjunto completo de Excel
        if (Array.isArray(parsed) && (parsed.length <= 3 && parsed.some(o => o.id === 'oc-seed-001'))) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(EXCEL_SEED_DATA));
            return EXCEL_SEED_DATA;
        }
        return parsed;
    } catch (e) {
        console.error('Error al leer órdenes de compra de storage:', e);
        return EXCEL_SEED_DATA;
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

export const getArribosProgramadosPorCategoria = (
    categoryName?: string,
    itemIds: string[] = [],
    itemCodes: string[] = []
): ArriboProgramado[] => {
    const list = getOrdenesCompra();
    const arribos: ArriboProgramado[] = [];
    const normCategory = categoryName ? categoryName.trim().toUpperCase() : null;
    const itemIdsSet = new Set(itemIds);
    const itemCodesSet = new Set(itemCodes.map(c => c.trim().toUpperCase()));

    list.forEach(oc => {
        if (oc.estado !== 'EN_CAMINO' && oc.estado !== 'PARCIAL') return;

        oc.lineas.forEach(l => {
            const pendiente = Math.max(0, l.cantidadPedidaKg - (l.cantidadRecibidaKg || 0));
            if (pendiente <= 0) return;

            const codeNorm = l.codigoInterno ? l.codigoInterno.trim().toUpperCase() : '';
            const catNorm = l.categoriaNombre ? l.categoriaNombre.trim().toUpperCase() : '';

            const match = (normCategory && (catNorm.includes(normCategory) || normCategory.includes(catNorm)))
                || (l.itemId && itemIdsSet.has(l.itemId))
                || (codeNorm && itemCodesSet.has(codeNorm));

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

// 5. Cargar / Resetear datos desde el Registro de Compras (Excel)
export const cargarDatosDesdeExcel = (): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(EXCEL_SEED_DATA));
    emitChangeEvent();
};

export const importarOrdenesDesdeArray = (nuevas: OrdenCompra[], reemplazar: boolean = true): void => {
    if (reemplazar) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevas));
    } else {
        const actuales = getOrdenesCompra();
        const numerosExistentes = new Set(actuales.map(o => o.numero.trim().toUpperCase()));
        const combinadas = [...actuales];

        nuevas.forEach(n => {
            const numNorm = n.numero.trim().toUpperCase();
            if (!numerosExistentes.has(numNorm)) {
                combinadas.push(n);
                numerosExistentes.add(numNorm);
            }
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(combinadas));
    }
    emitChangeEvent();
};

if (typeof window !== 'undefined') {
    (window as any).cargarOrdenesExcel = cargarDatosDesdeExcel;
}

// 6. Hook reactivo para componentes
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
        cargarDesdeExcel: cargarDatosDesdeExcel,
        importarOrdenes: importarOrdenesDesdeArray,
        kilosPendientesMap: getKilosPendientesByItem()
    };
};
