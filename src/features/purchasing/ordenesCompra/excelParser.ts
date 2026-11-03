import * as XLSX from 'xlsx';
import type { OrdenCompra, OrdenCompraLinea } from './types';

export interface ParseExcelResult {
    success: boolean;
    error?: string;
    warnings: string[];
    ordenes: OrdenCompra[];
    stats?: {
        totalOrdenes: number;
        totalLineas: number;
        totalKg: number;
        completadas: number;
        enCamino: number;
        canceladas: number;
        proveedores: string[];
        hojasProcesadas: string[];
    };
}

function parseNum(val: any): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    const s = String(val).trim();
    const match = s.replace(',', '.').match(/[-+]?\d*\.?\d+/);
    return match ? parseFloat(match[0]) : 0;
}

function formatDate(val: any, defaultStr = '2026-06-01'): string {
    if (!val) return defaultStr;
    if (val instanceof Date) {
        return val.toISOString().split('T')[0];
    }
    const s = String(val).trim();
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[0];
    const m2 = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m2) {
        const d = m2[1].padStart(2, '0');
        const m = m2[2].padStart(2, '0');
        let y = m2[3];
        if (y.length === 2) y = '20' + y;
        return `${y}-${m}-${d}`;
    }
    return defaultStr;
}

export async function parseExcelCompras(file: File): Promise<ParseExcelResult> {
    const warnings: string[] = [];

    // 1. Validar extensión
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
        return {
            success: false,
            error: `El archivo "${file.name}" no es una planilla Excel válida (.xlsx o .xls).`,
            warnings,
            ordenes: []
        };
    }

    let workbook: XLSX.WorkBook;
    try {
        const buffer = await file.arrayBuffer();
        workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    } catch (err: any) {
        return {
            success: false,
            error: `Error al leer el archivo Excel: ${err?.message || 'Archivo dañado o formato ilegible'}.`,
            warnings,
            ordenes: []
        };
    }

    const sheetNames = workbook.SheetNames || [];

    // 2. Validar existencia de hojas requeridas
    const impoSheetName = sheetNames.find(s => s.trim().toUpperCase() === 'COMPRAS IMPO');
    const c26SheetName = sheetNames.find(s => s.trim().toUpperCase() === 'COMPRAS 2026');

    if (!impoSheetName && !c26SheetName) {
        return {
            success: false,
            error: `El archivo no contiene las hojas requeridas del Registro de Compras.\nSe esperaba al menos una de las hojas: "COMPRAS IMPO" o "COMPRAS 2026".\nHojas encontradas en su archivo: [${sheetNames.join(', ')}].\nVerifique haber seleccionado el archivo correcto.`,
            warnings,
            ordenes: []
        };
    }

    const ordenes: OrdenCompra[] = [];
    const proveedoresSet = new Set<string>();
    const hojasProcesadas: string[] = [];
    let ocCounter = 1;

    // 3. Procesar COMPRAS IMPO (si existe)
    if (impoSheetName) {
        const ws = workbook.Sheets[impoSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rows.length < 2) {
            warnings.push(`La hoja "${impoSheetName}" no contiene registros de datos.`);
        } else {
            const headerRow = (rows[0] || []).map(c => String(c || '').trim().toUpperCase());
            // Validar cabeceras clave
            const hasProveedor = headerRow.some(h => h.includes('PROVEEDOR'));
            const hasProducto = headerRow.some(h => h.includes('PRODUCTO') || h.includes('ARTICULO') || h.includes('INSUMO'));
            const hasKg = headerRow.some(h => h.includes('KG') || h.includes('CANTIDAD'));

            if (!hasProveedor || !hasProducto || !hasKg) {
                return {
                    success: false,
                    error: `La estructura de columnas de la hoja "${impoSheetName}" no coincide con el formato esperado.\nSe requieren columnas de PROVEEDOR, PRODUCTO/INSUMO y KG.\nColumnas encontradas: [${rows[0]?.slice(0, 8).join(', ')}].`,
                    warnings,
                    ordenes: []
                };
            }

            // Agrupar filas en órdenes
            const impoGroups = new Map<string, any[]>();
            for (let r = 1; r < rows.length; r++) {
                const row = rows[r];
                if (!row || !row[0]) continue;

                const prov = String(row[0] || '').trim();
                const proforma = String(row[1] || '').trim();
                const invoice = String(row[2] || '').trim();
                const producto = String(row[4] || '').trim();
                const kg = parseNum(row[5]);
                const precio = parseNum(row[6]);
                const incoterm = String(row[7] || '').trim();
                const arribo = formatDate(row[10], '2025-10-01');
                const fechaIngreso = formatDate(row[12], arribo);
                const ingresoReal = row[13] !== undefined && row[13] !== null
                    ? parseNum(row[13])
                    : (String(row[14] || '').toUpperCase().includes('ENTREG') ? kg : 0);
                const estadoRaw = String(row[14] || '').trim().toUpperCase();
                const observaciones = String(row[15] || '').trim();
                const contenedor = String(row[16] || '').trim();

                const key = invoice || proforma || `IMPO-${prov}-${r}`;
                if (!impoGroups.has(key)) impoGroups.set(key, []);

                impoGroups.get(key)!.push({
                    prov, proforma, invoice, producto, kg, precio, incoterm, arribo, fechaIngreso, ingresoReal, estadoRaw, observaciones, contenedor
                });
            }

            impoGroups.forEach((items, key) => {
                const prov = items[0].prov;
                const partnerNombre = prov.split('/')[0].trim();
                proveedoresSet.add(partnerNombre);

                const isCompletada = items.every(it => it.estadoRaw === 'ENTREGADO');
                const isCancelada = items.every(it => it.estadoRaw === 'DEVOLUCION');
                const estadoGlobal = isCompletada ? 'COMPLETADA' : (isCancelada ? 'CANCELADA' : 'EN_CAMINO');

                const arribos = items.map(it => it.arribo);
                const fechaArribo = arribos.sort().pop() || '2025-10-01';
                let fechaEmision = '2025-06-01';
                try {
                    const d = new Date(fechaArribo);
                    d.setDate(d.getDate() - 45);
                    fechaEmision = d.toISOString().split('T')[0];
                } catch (_) {}

                const notas: string[] = [];
                if (items[0].proforma) notas.push(`PI: ${items[0].proforma}`);
                if (items[0].invoice) notas.push(`CI: ${items[0].invoice}`);
                if (items[0].incoterm) notas.push(`Incoterm: ${items[0].incoterm}`);
                if (items[0].contenedor) notas.push(`Contenedor: ${items[0].contenedor}`);
                if (items[0].observaciones) notas.push(items[0].observaciones);

                const ocNum = `OC-IMPO-${items[0].invoice || items[0].proforma || String(ocCounter).padStart(4, '0')}`;

                const lineas: OrdenCompraLinea[] = items.map((it, idx) => {
                    const lineaId = `linea-impo-${ocCounter}-${idx + 1}`;
                    const lEstado = it.estadoRaw === 'ENTREGADO' ? 'ENTREGADO' : (it.ingresoReal === 0 ? 'PENDIENTE' : 'PARCIAL');
                    const prodClean = it.producto.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 25);

                    const remitos: any[] = [];
                    if (it.ingresoReal > 0) {
                        remitos.push({
                            id: `rec-${lineaId}`,
                            remitoId: `rem-${key}`,
                            remitoNumero: `REC-${it.contenedor || key}`,
                            fecha: it.fechaIngreso,
                            cantidadKg: it.ingresoReal,
                            notas: `Ingreso registrado de ${it.producto}`,
                            creadoEn: `${it.fechaIngreso}T12:00:00.000Z`
                        });
                    }

                    return {
                        id: lineaId,
                        itemId: `item-impo-${prodClean}`,
                        codigoInterno: prodClean,
                        descripcion: it.producto,
                        categoriaNombre: 'Hilado Importación',
                        cantidadPedidaKg: it.kg,
                        cantidadRecibidaKg: it.ingresoReal,
                        fechaArriboEstimada: it.arribo,
                        estado: lEstado,
                        precioUnitarioUsd: it.precio || 5.0,
                        remitosAsociados: remitos,
                        recepcionesManuales: []
                    };
                });

                ordenes.push({
                    id: `oc-impo-${ocCounter}`,
                    numero: ocNum,
                    partnerId: `partner-${partnerNombre.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    partnerNombre: partnerNombre,
                    fechaEmision,
                    fechaArriboEstimada: fechaArribo,
                    estado: estadoGlobal,
                    observaciones: notas.join(' | '),
                    lineas,
                    creadoEn: `${fechaEmision}T10:00:00.000Z`,
                    actualizadoEn: new Date().toISOString()
                });
                ocCounter++;
            });

            hojasProcesadas.push(impoSheetName);
        }
    }

    // 4. Procesar COMPRAS 2026 (si existe)
    if (c26SheetName) {
        const ws = workbook.Sheets[c26SheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rows.length >= 3) {
            const monthCols = ['ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE', 'ENERO', 'FEBRERO', 'MARZO'];
            const monthMap: Record<string, [string, string]> = {
                'ABRIL': ['2026-04-15', '2026-03-01'],
                'MAYO': ['2026-05-15', '2026-03-15'],
                'JUNIO': ['2026-06-15', '2026-04-01'],
                'JULIO': ['2026-07-15', '2026-05-01'],
                'AGOSTO': ['2026-08-15', '2026-06-01'],
                'SEPTIEMBRE': ['2026-09-15', '2026-07-01'],
                'OCTUBRE': ['2026-10-15', '2026-08-01'],
                'NOVIEMBRE': ['2026-11-15', '2026-09-01'],
                'DICIEMBRE': ['2026-12-15', '2026-10-01'],
                'ENERO': ['2027-01-15', '2026-11-01'],
                'FEBRERO': ['2027-02-15', '2026-12-01'],
                'MARZO': ['2027-03-15', '2027-01-01'],
            };

            const c26Groups = new Map<string, any[]>();

            for (let r = 2; r < rows.length; r++) {
                const row = rows[r];
                if (!row || !row[1]) continue;

                const fechaEnvio = formatDate(row[0], undefined);
                const prov = String(row[1] || '').trim();
                const articulo = String(row[2] || '').trim();
                const descripcion = String(row[3] || '').trim();
                const precio = parseNum(row[17]);

                proveedoresSet.add(prov);

                monthCols.forEach((mName, mIdx) => {
                    const qty = parseNum(row[4 + mIdx]);
                    if (qty > 0) {
                        const groupKey = `${prov}__${mName}`;
                        if (!c26Groups.has(groupKey)) c26Groups.set(groupKey, []);
                        c26Groups.get(groupKey)!.push({
                            articulo, descripcion, cantidad: qty, precio, fechaEnvio, mes: mName, prov
                        });
                    }
                });
            }

            c26Groups.forEach((items, groupKey) => {
                const [prov, mes] = groupKey.split('__');
                const [arriboEst, emisionDef] = monthMap[mes] || ['2026-06-15', '2026-04-01'];
                const emisionEst = items[0].fechaEnvio || emisionDef;

                const ocNum = `OC-2026-${prov.slice(0, 4).toUpperCase()}-${mes.slice(0, 3)}-${String(ocCounter).padStart(3, '0')}`;

                const lineas: OrdenCompraLinea[] = items.map((it, idx) => {
                    const lineaId = `linea-c26-${ocCounter}-${idx + 1}`;
                    const codeEst = `${it.articulo.slice(0, 8)}-${it.descripcion.slice(0, 15)}`.toUpperCase().replace(/[^A-Z0-9]/g, '-');

                    return {
                        id: lineaId,
                        itemId: `item-${codeEst}`,
                        codigoInterno: codeEst,
                        descripcion: `${it.articulo} - ${it.descripcion}`,
                        categoriaNombre: it.articulo,
                        cantidadPedidaKg: it.cantidad,
                        cantidadRecibidaKg: 0,
                        fechaArriboEstimada: arriboEst,
                        estado: 'PENDIENTE',
                        precioUnitarioUsd: it.precio || 5.0,
                        remitosAsociados: [],
                        recepcionesManuales: []
                    };
                });

                ordenes.push({
                    id: `oc-plan-${ocCounter}`,
                    numero: ocNum,
                    partnerId: `partner-${prov.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    partnerNombre: prov,
                    fechaEmision: emisionEst,
                    fechaArriboEstimada: arriboEst,
                    estado: 'EN_CAMINO',
                    observaciones: `Plan Compras 2026 - Entrega estimada Mes de ${mes}`,
                    lineas,
                    creadoEn: `${emisionEst}T09:00:00.000Z`,
                    actualizadoEn: new Date().toISOString()
                });
                ocCounter++;
            });

            hojasProcesadas.push(c26SheetName);
        }
    }

    if (ordenes.length === 0) {
        return {
            success: false,
            error: 'No se encontraron filas con órdenes o cantidades válidas en las hojas del archivo.',
            warnings,
            ordenes: []
        };
    }

    const totalLineas = ordenes.reduce((acc, o) => acc + o.lineas.length, 0);
    const totalKg = ordenes.reduce((acc, o) => acc + o.lineas.reduce((lAcc, l) => lAcc + Number(l.cantidadPedidaKg || 0), 0), 0);
    const completadas = ordenes.filter(o => o.estado === 'COMPLETADA').length;
    const enCamino = ordenes.filter(o => o.estado === 'EN_CAMINO' || o.estado === 'PARCIAL').length;
    const canceladas = ordenes.filter(o => o.estado === 'CANCELADA').length;

    return {
        success: true,
        warnings,
        ordenes,
        stats: {
            totalOrdenes: ordenes.length,
            totalLineas,
            totalKg,
            completadas,
            enCamino,
            canceladas,
            proveedores: Array.from(proveedoresSet),
            hojasProcesadas
        }
    };
}
