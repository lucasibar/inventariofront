import type { WorkBook } from 'xlsx';
import { utils } from 'xlsx';

export const normalizeHeader = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const components = [
    { label: 'Base', rol: 'COLOR_BASE', groups: 4 },
    { label: 'Logo', rol: 'LOGO', groups: 1 },
    { label: 'Goma', rol: 'GOMA', groups: 1 },
    { label: 'Lycra', rol: 'LYCRA', groups: 1 },
    { label: 'Detalle', rol: 'DETALLE_MEDIA', groups: 1 },
    { label: 'Talle', rol: 'COLOR_TALLE', groups: 1 },
    { label: 'Triángulo', rol: 'TRIANGULO', groups: 1 },
    { label: 'Talón puntera', rol: 'TALON_PUNTERA', groups: 1 },
];
const details: Record<string, string> = {
    activo: 'activo', consumogramos: 'consumoGramos', desperdicio: 'desperdicio', conospreparacion: 'conosPreparacion',
};
const detailLabels = ['Activo', 'Consumo gramos', 'Desperdicio', 'Conos preparación'];
const present = (value: unknown) => value != null && String(value).trim() !== '';

function materialColumn(header: string) {
    const normalized = normalizeHeader(header);
    for (const component of components) {
        const match = normalized.match(new RegExp(`^${normalizeHeader(component.label)}([1-9][0-9]*)(?:alternativa([1-9][0-9]*)(activo|consumogramos|desperdicio|conospreparacion)?|(color|enuso))$`));
        if (match) return { ...component, grupo: Number(match[1]), orden: match[2] ? Number(match[2]) : undefined, field: match[4] ?? (match[3] ? details[match[3]] : 'itemCode') };
    }
    return null;
}

export function isMaterialDetailColumn(header: string) {
    const column = materialColumn(header);
    return Boolean(column?.orden && column.field !== 'itemCode');
}

/** One article per row; numbered components are colors, numbered alternatives are items. */
export function exportMaterialColumns(articles: any[]) {
    const headers: string[] = [];
    const layouts = components.flatMap((component) => {
        const refs = articles.flatMap((article) => article.itemRefs ?? []).filter((ref) => ref.rol === component.rol);
        const groups = [...new Set<number>([...Array.from({ length: component.groups }, (_, i) => i + 1), ...refs.map((ref) => ref.grupo ?? 1)])].sort((a, b) => a - b);
        return groups.map((grupo) => {
            const orders = [...new Set<number>([1, 2, ...refs.filter((ref) => (ref.grupo ?? 1) === grupo).map((ref) => ref.orden ?? 1)])].sort((a, b) => a - b);
            const prefix = `${component.label} ${grupo}`;
            headers.push(...orders.map((orden) => `${prefix} / Alternativa ${orden}`), `${prefix} / Color`, `${prefix} / En uso`);
            return { ...component, grupo, orders, prefix };
        });
    });
    // Retain technical fields in the same row, grouped at the end and collapsed in Excel.
    for (const layout of layouts) for (const orden of layout.orders) {
        headers.push(...detailLabels.map((label) => `${layout.prefix} / Alternativa ${orden} / ${label}`));
    }
    const rows = articles.map((article) => {
        const row: Record<string, unknown> = Object.fromEntries(headers.map((header) => [header, '']));
        for (const layout of layouts) {
            const refs = (article.itemRefs ?? []).filter((ref: any) => ref.rol === layout.rol && (ref.grupo ?? 1) === layout.grupo);
            row[`${layout.prefix} / Color`] = refs[0]?.colorNombre ?? '';
            row[`${layout.prefix} / En uso`] = refs.find((ref: any) => ref.esPreferenciaActual)?.orden ?? '';
            for (const ref of refs) {
                const prefix = `${layout.prefix} / Alternativa ${ref.orden ?? 1}`;
                row[prefix] = ref.item?.codigoInterno ?? '';
                row[`${prefix} / Activo`] = ref.activo !== false ? 'Sí' : 'No';
                row[`${prefix} / Consumo gramos`] = ref.consumoGramos ?? '';
                row[`${prefix} / Desperdicio`] = ref.desperdicio ?? '';
                row[`${prefix} / Conos preparación`] = ref.conosPreparacion ?? '';
            }
        }
        return row;
    });
    return { headers, rows };
}

export function readArticleWorkbook(workbook: WorkBook, articleAliases: Record<string, string>) {
    if (workbook.SheetNames.some((name) => normalizeHeader(name) === 'materiales')) throw new Error('Descargá el nuevo formato de una sola hoja: Base 1 / Alternativa 1, Base 1 / Alternativa 2, etc.');
    const name = workbook.SheetNames.find((sheet) => normalizeHeader(sheet) === 'articulos') ?? workbook.SheetNames[0];
    if (!name) throw new Error('El archivo no tiene hojas.');
    const sheet = workbook.Sheets[name];
    const headers = (utils.sheet_to_json<unknown[]>(sheet, { header: 1 })[0] ?? []).map(String);
    const normalizedHeaders = headers.map(normalizeHeader);
    if (new Set(normalizedHeaders).size !== normalizedHeaders.length) throw new Error('Hay encabezados repetidos en el archivo.');
    for (const header of headers) {
        if (/^(base|logo|goma|lycra)\d+$/.test(normalizeHeader(header))) throw new Error('El formato anterior Base 1–4 es ambiguo. Usá Base 1 / Alternativa 1, Base 1 / Alternativa 2, etc.');
        if (normalizeHeader(header).includes('alternativa') && !materialColumn(header)) throw new Error(`Columna de material inválida: ${header}`);
    }
    if (!headers.some((header) => materialColumn(header)?.field === 'itemCode')) throw new Error('Faltan las columnas de materiales, por ejemplo Base 1 / Alternativa 1. Descargá el nuevo formato.');
    return utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null }).map((raw, index) => {
        const row: Record<string, any> = { itemRefsByCode: [] };
        const groups = new Map<string, { color: unknown; selected: unknown; refs: Map<number, Record<string, any>> }>();
        for (const [header, value] of Object.entries(raw)) {
            const column = materialColumn(header);
            if (!column) {
                const field = articleAliases[normalizeHeader(header)];
                if (field && value !== null && value !== '') row[field] = value;
                continue;
            }
            const key = `${column.rol}:${column.grupo}`;
            const group = groups.get(key) ?? { color: null, selected: null, refs: new Map() };
            groups.set(key, group);
            if (!column.orden) {
                if (column.field === 'color') group.color = value;
                else group.selected = value;
                continue;
            }
            const ref = group.refs.get(column.orden) ?? { rol: column.rol, grupo: column.grupo, orden: column.orden };
            ref[column.field] = value;
            group.refs.set(column.orden, ref);
        }
        for (const [key, group] of groups) {
            const refs = [...group.refs.values()].filter((ref) => present(ref.itemCode)).sort((a, b) => a.orden - b.orden);
            for (const ref of refs) {
                const active = normalizeHeader(ref.activo);
                if (active && !['si', 'no', 'true', 'false', '1', '0'].includes(active)) throw new Error(`Fila ${index + 2}, ${key}: Activo debe ser Sí o No.`);
                ref.activo = !active || ['si', 'true', '1'].includes(active);
                ref.itemCode = String(ref.itemCode).trim();
                ref.colorNombre = present(group.color) ? String(group.color).trim() : null;
            }
            const selected = present(group.selected) ? Number(group.selected) : refs.find((ref) => ref.activo)?.orden;
            if (present(group.selected) && (!Number.isSafeInteger(selected) || !refs.some((ref) => ref.orden === selected && ref.activo))) throw new Error(`Fila ${index + 2}, ${key}: En uso debe indicar el número de una alternativa cargada y activa.`);
            refs.forEach((ref) => { ref.esPreferenciaActual = ref.orden === selected; });
            row.itemRefsByCode.push(...refs);
        }
        row.codigo = String(row.codigo ?? '').trim().toUpperCase();
        return row;
    });
}
