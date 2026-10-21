import * as XLSX from 'xlsx';
import type {
    ArticuloProduccionSummary,
    MaterialAsignadoSummary,
    HojaRepartidorItem,
    HojaPickingItem,
    ParsedMachineEntry,
} from '../types/ordenesProduccion.types';

export function exportArticulosToExcel(articulos: ArticuloProduccionSummary[], filename = 'articulos_a_tejer.xlsx') {
    const data = articulos.map((a) => ({
        'Estado Catálogo': a.isUnreviewed ? `⚠️ ${a.estadoRevision}` : `🟢 ${a.estadoRevision}`,
        'Código Nuestro (TEJIDO)': a.codigo,
        'Código Susana (PDF)': a.codigoSusi || a.codigoOriginalPdf || '-',
        'Marca / Cliente': a.marca,
        'Descripción': a.descripcion,
        'Talles': a.talles.join(', '),
        'Colores Programados': a.colores.join(' / '),
        'N° Máquinas': a.maquinasCount,
        'Máquinas Asignadas': a.maquinas.map((m) => `M${m}`).join(', '),
        'Horas Netas Tejido': a.horasTejidoTotales ?? 0,
        'Seg / Media (Ciclo)': a.cycleTimeSecondsPromedio ?? 0,
        'Docenas Estimadas': a.docenasTotales ?? 0,
        'Pares Estimados': a.paresTotales ?? 0,
        'Medias Indiv. Estimadas': a.mediasTotales ?? 0,
        'Hilado Total Estimado (KG)': a.kilosHiladoTotales ?? 0,
        'Turnos': a.turnos.join(', '),
        'Fechas': a.fechas.join(', '),
        'Alerta / Observación': a.advertencia || 'OK',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Artículos a Tejer');
    XLSX.writeFile(wb, filename);
}

export function exportMaterialesToExcel(materiales: MaterialAsignadoSummary[], filename = 'materiales_y_compras.xlsx') {
    const data = materiales.map((m) => ({
        'Estado Stock':
            m.estadoAbastecimiento === 'CRITICO_COMPRAR' || (m.aComprarKg ?? 0) > 0
                ? '🚨 FALTANTE COMPRAR'
                : (m.aPasarAPickingKg ?? 0) > 0
                  ? '⚡ BAJAR A PICKING'
                  : '🟢 OK EN PICKING',
        'Código Insumo': m.codigoInterno,
        'Descripción': m.descripcion,
        'Categoría': m.categoriaNombre || '-',
        'Rol / Función': m.rol,
        'Tono / Variante': m.tono || m.colorNombre || '-',
        'Proveedor': m.proveedor || '-',
        'Consumo Requerido (KG)': m.consumoTotalKg ?? 0,
        'Conos Estimados': m.conosTotales ?? 0,
        'Stock en Picking (KG)': m.stockEnPickingKg ?? 0,
        'Stock en Reserva (KG)': m.stockEnReservaKg ?? 0,
        'Stock Total Actual (KG)': m.stockActualTotalKg ?? 0,
        'A Pasar a Picking (KG)': m.aPasarAPickingKg ?? 0,
        'Posiciones Picking Sugeridas': m.posicionesPickingSugeridas?.join(', ') || '-',
        'Stock Restante Post-Tejido (KG)': m.stockRestanteTotalKg ?? 0,
        'Faltante a Comprar (KG)': m.aComprarKg ?? 0,
        'N° Máquinas Asignadas': m.maquinasCount,
        'Máquinas': m.maquinas.map((maq) => `M${maq}`).join(', '),
        'Artículos que lo usan': m.articulosAsignados.map((a) => `${a.codigoArticulo} (${a.consumoKg ?? 0} kg)`).join(' | '),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Materiales y Faltantes');
    XLSX.writeFile(wb, filename);
}

export function exportHojaRepartidorToExcel(items: HojaRepartidorItem[], filename = 'hoja_repartidor.xlsx') {
    const data = items.map((item, idx) => ({
        'N°': idx + 1,
        'Área': item.area,
        'N° Máquinas': item.maquinasCount,
        'Máquinas Destino': item.maquinas.map((m) => `M${m}`).join(', '),
        'Código Artículo': item.codigoArticulo,
        'Código Susana': item.codigoOriginalPdf || '-',
        'Descripción Prenda': item.descripcionArticulo,
        'Talle': item.talle,
        'Color Variante': item.color,
        'Docenas a Tejer': item.docenasEstimadas ?? 0,
        'Pares a Tejer': item.paresEstimados ?? 0,
        'Hilados / Insumos a Llevar': item.materiales
            .map((m) => `${m.rol || 'HILADO'}: ${m.codigo} (${m.consumoKg ?? 0} kg / ~${m.conos ?? 0} conos)`)
            .join(' | '),
        'Revisión Calidad': item.isUnreviewed ? '⚠️ OJO: No Revisado' : '🟢 Chequeado',
        'Entregado': '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja Repartidor');
    XLSX.writeFile(wb, filename);
}

export function exportHojaPickingToExcel(items: HojaPickingItem[], filename = 'hoja_picking_deposito.xlsx') {
    const data = items.map((item, idx) => ({
        'N°': idx + 1,
        'Acción Depósito':
            item.estadoAbastecimiento === 'CRITICO_COMPRAR' || (item.aComprarKg ?? 0) > 0
                ? '🚨 FALTA STOCK GENERAL'
                : (item.aPasarAPickingKg ?? 0) > 0
                  ? `⚡ BAJAR ${item.aPasarAPickingKg} KG A PICKING`
                  : '🟢 CUBIERTO EN PICKING',
        'Código Insumo': item.codigoMaterial,
        'Descripción Insumo': item.descripcionMaterial,
        'Categoría': item.categoriaNombre || '-',
        'Rol': item.rol,
        'Tono / Color': item.tono || item.colorNombre || '-',
        'Proveedor': item.proveedor || '-',
        'Consumo del Día (KG)': item.consumoDiaKg ?? 0,
        'Conos Estimados': item.conosNecesarios ?? 0,
        'Stock en Picking (KG)': item.stockEnPickingKg ?? 0,
        'Stock en Reserva (KG)': item.stockEnReservaKg ?? 0,
        'A Bajar a Picking (KG)': item.aPasarAPickingKg ?? 0,
        'Posiciones Picking Destino': item.posicionesPickingSugeridas?.join(', ') || '-',
        'Posiciones Reserva Actuales': item.posicionesStockReserva?.join(', ') || '-',
        'Stock Restante Total (KG)': item.stockRestanteTotalKg ?? 0,
        'N° Máquinas a Abastecer': item.maquinasCount,
        'Áreas Destino': item.areas.join(', '),
        'Máquinas Destino': item.maquinas.map((m) => `M${m}`).join(', '),
        'Artículos': item.articulos.join(', '),
        'Preparado (OK)': '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja Picking Depósito');
    XLSX.writeFile(wb, filename);
}

export function exportMatrizMaquinasToExcel(maquinas: ParsedMachineEntry[], filename = 'matriz_maquinas_planta.xlsx') {
    const data = maquinas.map((m) => ({
        'Máquina': `M${m.machine}`,
        'Área': m.area ? `Área ${m.area}` : '-',
        'Tipo Máquina': m.machineTypeName || '-',
        'Turno': m.shift === 'M' ? 'Mañana (06-18h)' : m.shift === 'N' ? 'Noche (18-06h)' : m.shift,
        'Fecha': m.date || '-',
        'Código Susana (PDF)': m.articleRaw || '-',
        'Código Nuestro (TEJIDO)': m.articleCode || 'Sin asignar',
        'Talle': m.talle || '-',
        'Descripción': m.matchedArticle?.descripcion || m.descRaw || '-',
        'Color': m.colorRaw || '-',
        'Cambio en Turno': m.hasChangeover
            ? `${m.changeoverRole === 'SALIENTE_08AM' ? 'Saliente 08:00' : 'Entrante 08:00'} (${m.changeoverType || 'CAMBIO'} - ${m.changeoverDurationMinutes ?? 0} min)`
            : 'Sin cambio (12h)',
        'Horas Netas Tejido': m.netHours ?? 12,
        'Seg / Media (Ciclo)': m.cycleTimeSeconds ?? 0,
        'Docenas Estimadas': m.docenasEstimadas ?? 0,
        'Pares Estimados': m.paresEstimados ?? 0,
        'Medias Indiv. Estimadas': m.mediasEstimadas ?? 0,
        'Revisión Calidad': m.isUnreviewed ? '⚠️ No Revisado' : '🟢 Chequeado',
        'Archivo Origen': m.file,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz Máquinas');
    XLSX.writeFile(wb, filename);
}
