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
        'Código Artículo': a.codigo,
        'Marca / Cliente': a.marca,
        'Descripción': a.descripcion,
        'Talles': a.talles.join(', '),
        'Colores Programados': a.colores.join(' / '),
        'N° Máquinas': a.maquinasCount,
        'Máquinas Asignadas': a.maquinas.map((m) => `M${m}`).join(', '),
        'Turnos': a.turnos.join(', '),
        'Fechas': a.fechas.join(', '),
        'Alerta / Observación': a.advertencia || 'OK',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Artículos a Tejer');
    XLSX.writeFile(wb, filename);
}

export function exportMaterialesToExcel(materiales: MaterialAsignadoSummary[], filename = 'materiales_asignados.xlsx') {
    const data = materiales.map((m) => ({
        'Código Insumo': m.codigoInterno,
        'Descripción': m.descripcion,
        'Rol / Función': m.rol,
        'Tono / Variante': m.tono || m.colorNombre || '-',
        'Proveedor': m.proveedor || '-',
        'Rotación': m.rotacion || '-',
        'Unidad': m.unidadPrincipal || 'KG',
        'N° Máquinas Asignadas': m.maquinasCount,
        'Máquinas': m.maquinas.map((maq) => `M${maq}`).join(', '),
        'Artículos que lo usan': m.articulosAsignados.map((a) => a.codigoArticulo).join(', '),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Materiales Asignados');
    XLSX.writeFile(wb, filename);
}

export function exportHojaRepartidorToExcel(items: HojaRepartidorItem[], filename = 'hoja_repartidor.xlsx') {
    const data = items.map((item, idx) => ({
        'N°': idx + 1,
        'Área': item.area,
        'N° Máquinas': item.maquinasCount,
        'Máquinas Destino': item.maquinas.map((m) => `M${m}`).join(', '),
        'Código Artículo': item.codigoArticulo,
        'Descripción Prenda': item.descripcionArticulo,
        'Talle': item.talle,
        'Color Variante': item.color,
        'Hilados / Insumos a Llevar': item.materiales.map((m) => `${m.rol}: ${m.codigo} (${m.descripcion})`).join(' | '),
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
        'Código Insumo': item.codigoMaterial,
        'Descripción Insumo': item.descripcionMaterial,
        'Rol': item.rol,
        'Tono / Color': item.tono || item.colorNombre || '-',
        'Proveedor': item.proveedor || '-',
        'N° Máquinas a Abastecer': item.maquinasCount,
        'Áreas Destino': item.areas.join(', '),
        'Máquinas Destino': item.maquinas.map((m) => `M${m}`).join(', '),
        'Artículos': item.articulos.join(', '),
        'Alerta Revisión': item.hasUnreviewedArticles ? '⚠️ Contiene Art. No Revisados' : '🟢 Todo Chequeado',
        'Ubicación / Rack': '',
        'Preparado (OK)': '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja Picking');
    XLSX.writeFile(wb, filename);
}

export function exportMatrizMaquinasToExcel(maquinas: ParsedMachineEntry[], filename = 'matriz_maquinas_planta.xlsx') {
    const data = maquinas.map((m) => ({
        'Máquina': `M${m.machine}`,
        'Área': m.area ? `Área ${m.area}` : '-',
        'Turno': m.shift === 'M' ? 'Mañana' : m.shift === 'N' ? 'Noche' : m.shift,
        'Fecha': m.date || '-',
        'Código Artículo': m.articleCode || m.articleRaw || 'Sin asignar',
        'Talle': m.talle || '-',
        'Descripción': m.matchedArticle?.descripcion || m.descRaw || '-',
        'Color': m.colorRaw || '-',
        'Revisión Calidad': m.isUnreviewed ? '⚠️ No Revisado' : '🟢 Chequeado',
        'Archivo Origen': m.file,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz Máquinas');
    XLSX.writeFile(wb, filename);
}
