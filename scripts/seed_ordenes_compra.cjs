const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const EXCEL_PATH = path.resolve('C:\\Users\\Admin\\Desktop\\integracion MIO-TOTVS\\Copia de Copia de Registro de Compras_.xlsx');
const OUTPUT_PATH = path.resolve(__dirname, '..', 'src', 'features', 'purchasing', 'ordenesCompra', 'ordenesExcelSeed.json');

console.log('📖 Leyendo archivo Excel:', EXCEL_PATH);
const workbook = xlsx.readFile(EXCEL_PATH, { cellDates: true });

function parseNum(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    const s = String(val).trim();
    const match = s.replace(',', '.').match(/[-+]?\d*\.?\d+/);
    return match ? parseFloat(match[0]) : 0;
}

function formatDate(val, defaultStr = '2026-06-01') {
    if (!val) return defaultStr;
    if (val instanceof Date) {
        return val.toISOString().split('T')[0];
    }
    const s = String(val).trim();
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[0];
    return defaultStr;
}

const ordenes = [];
let ocCounter = 1;

// 1. PROCESAR COMPRAS IMPO
const wsImpo = workbook.Sheets['COMPRAS IMPO'];
if (wsImpo) {
    const rows = xlsx.utils.sheet_to_json(wsImpo, { header: 1 });
    const impoGroups = new Map();

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
        const ingresoReal = row[13] !== undefined ? parseNum(row[13]) : (String(row[14]).toUpperCase().includes('ENTREG') ? kg : 0);
        const estadoRaw = String(row[14] || '').trim().toUpperCase();
        const observaciones = String(row[15] || '').trim();
        const contenedor = String(row[16] || '').trim();

        const key = invoice || proforma || `IMPO-${prov}-${r}`;
        if (!impoGroups.has(key)) impoGroups.set(key, []);

        impoGroups.get(key).push({
            prov, proforma, invoice, producto, kg, precio, incoterm, arribo, fechaIngreso, ingresoReal, estadoRaw, observaciones, contenedor
        });
    }

    impoGroups.forEach((items, key) => {
        const prov = items[0].prov;
        const partnerNombre = prov.split('/')[0].trim();
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

        const notas = [];
        if (items[0].proforma) notas.push(`PI: ${items[0].proforma}`);
        if (items[0].invoice) notas.push(`CI: ${items[0].invoice}`);
        if (items[0].incoterm) notas.push(`Incoterm: ${items[0].incoterm}`);
        if (items[0].contenedor) notas.push(`Contenedor: ${items[0].contenedor}`);
        if (items[0].observaciones) notas.push(items[0].observaciones);

        const ocNum = `OC-IMPO-${items[0].invoice || items[0].proforma || String(ocCounter).padStart(4, '0')}`;

        const lineas = items.map((it, idx) => {
            const lineaId = `linea-impo-${ocCounter}-${idx + 1}`;
            const lEstado = it.estadoRaw === 'ENTREGADO' ? 'ENTREGADO' : (it.ingresoReal === 0 ? 'PENDIENTE' : 'PARCIAL');
            const prodClean = it.producto.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 25);

            const remitos = [];
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
}

// 2. PROCESAR COMPRAS 2026 (Plan mensual)
const wsC26 = workbook.Sheets['COMPRAS 2026'];
if (wsC26) {
    const rows = xlsx.utils.sheet_to_json(wsC26, { header: 1 });
    const headerRow = rows[1] || [];
    const monthCols = ['ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE', 'ENERO', 'FEBRERO', 'MARZO'];
    const monthMap = {
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

    const c26Groups = new Map();

    for (let r = 2; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !row[1]) continue;

        const fechaEnvio = formatDate(row[0], null);
        const prov = String(row[1] || '').trim();
        const articulo = String(row[2] || '').trim();
        const descripcion = String(row[3] || '').trim();
        const precio = parseNum(row[17]);

        monthCols.forEach((mName, mIdx) => {
            const qty = parseNum(row[4 + mIdx]);
            if (qty > 0) {
                const groupKey = `${prov}__${mName}`;
                if (!c26Groups.has(groupKey)) c26Groups.set(groupKey, []);
                c26Groups.get(groupKey).push({
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

        const lineas = items.map((it, idx) => {
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
}

    // Ordenar: primero los que van a venir (arriba, por fecha estimada de arribo ascendente),
    // y los entregados abajo (por fecha descendente)
    const isPorVenir = (estado) => estado === 'EN_CAMINO' || estado === 'PARCIAL' || estado === 'BORRADOR';
    ordenes.sort((a, b) => {
        const aActive = isPorVenir(a.estado);
        const bActive = isPorVenir(b.estado);

        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;

        if (aActive && bActive) {
            const fechaA = a.fechaArriboEstimada || a.fechaEmision || '9999-99-99';
            const fechaB = b.fechaArriboEstimada || b.fechaEmision || '9999-99-99';
            return fechaA.localeCompare(fechaB);
        } else {
            const fechaA = a.fechaArriboEstimada || a.fechaEmision || '0000-00-00';
            const fechaB = b.fechaArriboEstimada || b.fechaEmision || '0000-00-00';
            return fechaB.localeCompare(fechaA);
        }
    });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(ordenes, null, 2), 'utf-8');
    console.log(`✅ ¡Éxito! Se generaron ${ordenes.length} Órdenes de Compra ordenadas en: ${OUTPUT_PATH}`);
