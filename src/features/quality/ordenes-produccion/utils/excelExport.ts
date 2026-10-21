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
        'Códigos Susana (PDF)': a.codigosSusi?.join(' / ') || '-',
        'Marca / Cliente': a.marca,
        'Descripción': a.descripcion,
        'Talles': a.talles.join(', '),
        'Colores Programados': a.colores.join(' / '),
        'N° Máquinas': a.maquinasCount,
        'Máquinas Asignadas': a.maquinas.map((m) => `M${m}`).join(', '),
        'Horas Netas Tejido': a.totalHorasTejido,
        'Seg / Media (Ciclo)': a.cycleTimePromedioSeconds,
        'Docenas Estimadas': a.totalDocenasEstimadas,
        'Pares Estimados': a.totalParesEstimados,
        'Medias Indiv. Estimadas': a.totalMediasEstimadas,
        'Hilado Total Estimado (KG)': a.totalKgHiladoEstimado,
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
        'Estado Stock': m.alertaFaltante ? '🚨 FALTANTE COMPRAR' : m.aPasarAPickingKg > 0 ? '⚡ BAJAR A PICKING' : '🟢 OK EN PICKING',
        'Código Insumo': m.codigoInterno,
        'Descripción': m.descripcion,
        'Categoría': m.categoriaNombre || '-',
        'Rol / Función': m.rol,
        'Tono / Variante': m.tono || m.colorNombre || '-',
        'Proveedor': m.proveedor || '-',
        'Consumo Requerido (KG)': m.consumoTotalKg,
        'Conos Estimados': m.conosEstimados,
        'Stock en Picking (KG)': m.stockEnPickingKg,
        'Stock en Reserva (KG)': m.stockEnReservaKg,
        'Stock Total Actual (KG)': m.stockActualKg,
        'A Pasar a Picking (KG)': m.aPasarAPickingKg,
        'Posiciones Picking Sugeridas': m.posicionesPickingSugeridas?.join(', ') || '-',
        'Stock Restante Post-Tejido (KG)': m.stockRestanteKg,
        'Faltante a Comprar (KG)': m.aComprarKg,
        'N° Máquinas Asignadas': m.maquinasCount,
        'Máquinas': m.maquinas.map((maq) => `M${maq}`).join(', '),
        'Artículos que lo usan': m.articulosAsignados.map((a) => `${a.codigoArticulo} (${a.consumoKg} kg)`).join(' | '),
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
        'Códigos Susana': item.codigosSusi?.join(' / ') || '-',
        'Descripción Prenda': item.descripcionArticulo,
        'Talle': item.talle,
        'Color Variante': item.color,
        'Docenas a Tejer': item.docenasEstimadas,
        'Pares a Tejer': item.paresEstimados,
        'Hilados / Insumos a Llevar': item.materiales
            .map((m) => `${m.rol}: ${m.codigo} (${m.consumoKg} kg / ~${m.conosEstimados} conos)`)
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
        'Acción Depósito': item.alertaFaltante
            ? '🚨 FALTA STOCK GENERAL'
            : item.aPasarAPickingKg > 0
              ? `⚡ BAJAR ${item.aPasarAPickingKg} KG A PICKING`
              : '🟢 CUBIERTO EN PICKING',
        'Código Insumo': item.codigoMaterial,
        'Descripción Insumo': item.descripcionMaterial,
        'Categoría': item.categoriaNombre || '-',
        'Rol': item.rol,
        'Tono / Color': item.tono || item.colorNombre || '-',
        'Proveedor': item.proveedor || '-',
        'Consumo del Día (KG)': item.consumoTotalKg,
        'Conos Estimados': item.conosEstimados,
        'Stock en Picking (KG)': item.stockEnPickingKg,
        'Stock en Reserva (KG)': item.stockEnReservaKg,
        'A Bajar a Picking (KG)': item.aPasarAPickingKg,
        'Posiciones Picking Destino': item.posicionesPickingSugeridas?.join(', ') || '-',
        'Posiciones Picking Actuales': item.posicionesPickingActuales?.join(', ') || '-',
        'Posiciones Reserva Actuales': item.posicionesReservaActuales?.join(', ') || '-',
        'Stock Restante Total (KG)': item.stockRestanteKg,
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
        'Tipo Máquina': m.machineTypeCode || '-',
        'Agujas': m.needles || '-',
        'Turno': m.shift === 'M' ? 'Mañana (06-18h)' : m.shift === 'N' ? 'Noche (18-06h)' : m.shift,
        'Fecha': m.date || '-',
        'Código Susana (PDF)': m.articleRaw || '-',
        'Código Nuestro (TEJIDO)': m.articleCode || 'Sin asignar',
        'Talle': m.talle || '-',
        'Descripción': m.matchedArticle?.descripcion || m.descRaw || '-',
        'Color': m.colorRaw || '-',
        'Cambio en Turno': m.hasChangeInShift
            ? `${m.changeRole === 'SALIENTE' ? 'Saliente 08:00' : 'Entrante 08:00'} (${m.changeType} - ${m.changeDurationHours}h)`
            : 'Sin cambio (12h)',
        'Horas Netas Tejido': m.netRunHours,
        'Seg / Media (Ciclo)': m.cycleTimeSeconds,
        'Docenas Estimadas': m.estimatedDozens,
        'Pares Estimados': m.estimatedPairs,
        'Medias Indiv. Estimadas': m.estimatedSocks,
        'Revisión Calidad': m.isUnreviewed ? '⚠️ No Revisado' : '🟢 Chequeado',
        'Archivo Origen': m.file,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz Máquinas');
    XLSX.writeFile(wb, filename);
}
