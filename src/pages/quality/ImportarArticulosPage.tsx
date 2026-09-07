import { useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { PageHeader, PageLoader } from '../../shared/ui';
import { useGetArticulosQuery, useImportArticulosBulkMutation, usePreviewArticulosBulkImportMutation } from '../../features/quality/articulos/api/articulos.api';

const normalizeHeader = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases: Record<string, string> = {
    codigo: 'codigo', codigointerno: 'codigo', articulo: 'codigo', codarticulo: 'codigo',
    descripcion: 'descripcion', detalle: 'descripcion', marca: 'marca', clienteid: 'clienteId', categoria: 'categoria',
    ssn: 'ssn', im: 'im', talle: 'talle', tallecliente: 'talle', talledelcliente: 'talle',
    talledemedia: 'talleDMedia', tallemedia: 'talleDMedia', workingnumber: 'workingNumber',
    tipoprenda: 'tipoPrenda', colorbase: 'colorBase', colorlogo: 'colorLogo',
    talonpuntera: 'talonPuntera', triangulo: 'triangulo', tipotejido: 'tipoTejido',
    pesounitario: 'pesoUnitario', pesodocena: 'pesoDocena', unidadesporpack: 'unidadesPorPack',
    tiempotejidoseg: 'tiempoTejidoSeg', tiempotejido: 'tiempoTejidoSeg', tiempodocenamin: 'tiempoDocenaMin',
    porcentajealgodon: 'porcentajeAlgodon', algodon: 'porcentajeAlgodon', porcentajenylon: 'porcentajeNylon', nylon: 'porcentajeNylon',
    porcentajelycra: 'porcentajeLycra', lycra: 'porcentajeLycra', porcentajegoma: 'porcentajeGoma', goma: 'porcentajeGoma',
    porcentajeotros: 'porcentajeOtros', otros: 'porcentajeOtros', desperdicio: 'desperdicio', programas: 'programas',
    observacion: 'observacion', observaciones: 'observacion', estadorevision: 'estadoRevision',
};

const MATERIAL_COLUMNS = [
    ...Array.from({ length: 4 }, (_, index) => ({ header: `Base ${index + 1}`, key: `base${index + 1}`, rol: 'COLOR_BASE', orden: index + 1 })),
    ...Array.from({ length: 3 }, (_, index) => ({ header: `Logo ${index + 1}`, key: `logo${index + 1}`, rol: 'LOGO', orden: index + 1 })),
    ...Array.from({ length: 2 }, (_, index) => ({ header: `Lycra ${index + 1}`, key: `lycra${index + 1}`, rol: 'LYCRA', orden: index + 1 })),
    ...Array.from({ length: 4 }, (_, index) => ({ header: `Goma ${index + 1}`, key: `goma${index + 1}`, rol: 'GOMA', orden: index + 1 })),
    { header: 'Color detalle', key: 'colordetalle', rol: 'DETALLE_MEDIA', orden: 1 },
    { header: 'Color talle', key: 'colortalle', rol: 'COLOR_TALLE', orden: 1 },
    { header: 'Triángulo material', key: 'triangulomaterial', rol: 'TRIANGULO', orden: 1 },
    { header: 'Talón puntera material', key: 'talonpunteramaterial', rol: 'TALON_PUNTERA', orden: 1 },
] as const;
const materialColumnByKey = new Map<string, (typeof MATERIAL_COLUMNS)[number]>(
    MATERIAL_COLUMNS.map((column) => [column.key, column]),
);
materialColumnByKey.set('colortallematerial', { header: 'Color talle', key: 'colortalle', rol: 'COLOR_TALLE', orden: 1 });
materialColumnByKey.set('detallemedia', { header: 'Color detalle', key: 'colordetalle', rol: 'DETALLE_MEDIA', orden: 1 });

const HEADER_GROUP_COLORS: Record<string, { bg: string; fontColor: string }> = {
    // 1. Información de la media (Azul)
    'Código': { bg: '1F4E78', fontColor: 'FFFFFF' },
    'Descripción': { bg: '1F4E78', fontColor: 'FFFFFF' },
    'Marca': { bg: '1F4E78', fontColor: 'FFFFFF' },
    'Categoría': { bg: '1F4E78', fontColor: 'FFFFFF' },
    'SSN': { bg: '1F4E78', fontColor: 'FFFFFF' },
    'IM': { bg: '1F4E78', fontColor: 'FFFFFF' },
    'Talle cliente': { bg: '1F4E78', fontColor: 'FFFFFF' },
    'Talle de media': { bg: '1F4E78', fontColor: 'FFFFFF' },
    'Working number': { bg: '1F4E78', fontColor: 'FFFFFF' },
    'Tipo prenda': { bg: '1F4E78', fontColor: 'FFFFFF' },
    'Tipo tejido': { bg: '1F4E78', fontColor: 'FFFFFF' },
    'Programas': { bg: '1F4E78', fontColor: 'FFFFFF' },
    'Observación': { bg: '1F4E78', fontColor: 'FFFFFF' },
    'Estado revisión': { bg: '1F4E78', fontColor: 'FFFFFF' },

    // 2. Colores que hay que matchear a un item (Púrpura / Violeta)
    'Color base': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Base 1': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Base 2': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Base 3': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Base 4': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Color logo': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Logo 1': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Logo 2': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Logo 3': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Color detalle': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Color talle': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Triángulo': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Triángulo material': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Talón puntera': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Talón puntera material': { bg: '5B2C6F', fontColor: 'FFFFFF' },

    // 3. Lycra y Goma (Verde)
    'Lycra 1': { bg: '196F3D', fontColor: 'FFFFFF' },
    'Lycra 2': { bg: '196F3D', fontColor: 'FFFFFF' },
    'Goma 1': { bg: '196F3D', fontColor: 'FFFFFF' },
    'Goma 2': { bg: '196F3D', fontColor: 'FFFFFF' },
    'Goma 3': { bg: '196F3D', fontColor: 'FFFFFF' },
    'Goma 4': { bg: '196F3D', fontColor: 'FFFFFF' },

    // 4. Porcentajes y pesos (Naranja / Bronce)
    'Peso unitario': { bg: 'C55A11', fontColor: 'FFFFFF' },
    'Peso docena': { bg: 'C55A11', fontColor: 'FFFFFF' },
    'Unidades por pack': { bg: 'C55A11', fontColor: 'FFFFFF' },
    'Tiempo tejido seg': { bg: 'C55A11', fontColor: 'FFFFFF' },
    'Tiempo docena min': { bg: 'C55A11', fontColor: 'FFFFFF' },
    'Porcentaje algodón': { bg: 'C55A11', fontColor: 'FFFFFF' },
    'Porcentaje nylon': { bg: 'C55A11', fontColor: 'FFFFFF' },
    'Porcentaje lycra': { bg: 'C55A11', fontColor: 'FFFFFF' },
    'Porcentaje goma': { bg: 'C55A11', fontColor: 'FFFFFF' },
    'Porcentaje otros': { bg: 'C55A11', fontColor: 'FFFFFF' },
    'Desperdicio': { bg: 'C55A11', fontColor: 'FFFFFF' },
};

function mapRows(rawRows: Record<string, unknown>[]) {
    return rawRows.map((raw) => {
        const mapped: Record<string, unknown> = {};
        const itemRefsByCode: any[] = [];
        Object.entries(raw).forEach(([header, value]) => {
            const normalized = normalizeHeader(header);
            const materialColumn = materialColumnByKey.get(normalized);
            if (materialColumn && value !== undefined && value !== null && String(value).trim() !== '') {
                itemRefsByCode.push({
                    itemCode: String(value).trim(), rol: materialColumn.rol, grupo: 1,
                    orden: materialColumn.orden, esPreferenciaActual: false, activo: true,
                });
                return;
            }
            const field = aliases[normalized];
            if (field && value !== undefined && value !== null && value !== '') mapped[field] = value;
        });
        for (const rol of new Set(itemRefsByCode.map((ref) => ref.rol))) {
            const first = itemRefsByCode.filter((ref) => ref.rol === rol).sort((left, right) => left.orden - right.orden)[0];
            if (first) first.esPreferenciaActual = true;
        }
        mapped.itemRefsByCode = itemRefsByCode;
        return mapped;
    }).filter((row) => Object.keys(row).some((key) => key !== 'itemRefsByCode'));
}

export default function ImportarArticulosPage() {
    const inputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');
    const [rows, setRows] = useState<any[]>([]);
    const [preview, setPreview] = useState<any>(null);
    const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [previewImport, previewState] = usePreviewArticulosBulkImportMutation();
    const [runImport, importState] = useImportArticulosBulkMutation();
    const { data: articles = [], isFetching: isExportLoading } = useGetArticulosQuery();

    const readFile = async (file: File) => {
        setMessage(null); setPreview(null); setRows([]); setFileName(file.name);
        try {
            const XLSX = await import('xlsx');
            const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const mapped = mapRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: null }));
            if (!mapped.length) throw new Error('La primera hoja no tiene datos reconocibles.');
            const result = await previewImport({ rows: mapped, synchronize: true }).unwrap();
            setRows(mapped); setPreview(result);
        } catch (error: any) {
            setMessage({ severity: 'error', text: error?.data?.message ?? error?.message ?? 'No se pudo leer el archivo.' });
        }
    };

    const importRows = async () => {
        try {
            const result = await runImport({ rows, synchronize: true }).unwrap();
            setMessage({ severity: 'success', text: `Sincronización terminada: ${result.rowsToCreate} altas, ${result.rowsToUpdate} actualizaciones y ${result.rowsToDeactivate} desactivados.` });
            setPreview(null); setRows([]); setFileName('');
            if (inputRef.current) inputRef.current.value = '';
        } catch (error: any) {
            const text = typeof error?.data?.message === 'string' ? error.data.message : error?.data?.message?.message;
            setMessage({ severity: 'error', text: text ?? 'No se pudo completar la importación.' });
        }
    };

    const downloadArticles = async () => {
        const XLSXModule = await import('xlsx-js-style');
        const XLSX = (XLSXModule as any).default || XLSXModule;

        const getMaterialCode = (article: any, rol: string, orden = 1) => {
            const ref = (article.itemRefs ?? [])
                .filter((entry: any) => entry.activo !== false && entry.rol === rol && (entry.grupo ?? 1) === 1)
                .find((entry: any) => (entry.orden ?? 1) === orden);
            return ref?.item?.codigoInterno ?? '';
        };

        const rowsToExport = articles.map((article: any) => ({
            // ── 1. Información de la media (Azul) ──
            Código: article.codigo,
            Descripción: article.descripcion,
            Marca: article.marca ?? '',
            Categoría: article.categoria?.nombre ?? '',
            SSN: article.ssn ?? '',
            IM: article.im ?? '',
            'Talle cliente': article.talle ?? '',
            'Talle de media': article.talleDMedia ?? '',
            'Working number': article.workingNumber ?? '',
            'Tipo prenda': article.tipoPrenda ?? '',
            'Tipo tejido': article.tipoTejido ?? '',
            Programas: article.programas ?? '',
            Observación: article.observacion ?? '',
            'Estado revisión': article.estadoRevision ?? 'PENDIENTE',

            // ── 2. Colores que hay que matchear a un item (Púrpura / Violeta) ──
            'Color base': article.colorBase ?? '',
            'Base 1': getMaterialCode(article, 'COLOR_BASE', 1),
            'Base 2': getMaterialCode(article, 'COLOR_BASE', 2),
            'Base 3': getMaterialCode(article, 'COLOR_BASE', 3),
            'Base 4': getMaterialCode(article, 'COLOR_BASE', 4),
            'Color logo': article.colorLogo ?? '',
            'Logo 1': getMaterialCode(article, 'LOGO', 1),
            'Logo 2': getMaterialCode(article, 'LOGO', 2),
            'Logo 3': getMaterialCode(article, 'LOGO', 3),
            'Color detalle': getMaterialCode(article, 'DETALLE_MEDIA', 1),
            'Color talle': getMaterialCode(article, 'COLOR_TALLE', 1),
            Triángulo: article.triangulo ?? '',
            'Triángulo material': getMaterialCode(article, 'TRIANGULO', 1),
            'Talón puntera': article.talonPuntera ?? '',
            'Talón puntera material': getMaterialCode(article, 'TALON_PUNTERA', 1),

            // ── 3. Lycra y Goma (Verde) ──
            'Lycra 1': getMaterialCode(article, 'LYCRA', 1),
            'Lycra 2': getMaterialCode(article, 'LYCRA', 2),
            'Goma 1': getMaterialCode(article, 'GOMA', 1),
            'Goma 2': getMaterialCode(article, 'GOMA', 2),
            'Goma 3': getMaterialCode(article, 'GOMA', 3),
            'Goma 4': getMaterialCode(article, 'GOMA', 4),

            // ── 4. Porcentajes y pesos (Naranja / Bronce) ──
            'Peso unitario': article.pesoUnitario ?? '',
            'Peso docena': article.pesoDocena ?? '',
            'Unidades por pack': article.unidadesPorPack ?? '',
            'Tiempo tejido seg': article.tiempoTejidoSeg ?? '',
            'Tiempo docena min': article.tiempoDocenaMin ?? '',
            'Porcentaje algodón': article.porcentajeAlgodon ?? '',
            'Porcentaje nylon': article.porcentajeNylon ?? '',
            'Porcentaje lycra': article.porcentajeLycra ?? '',
            'Porcentaje goma': article.porcentajeGoma ?? '',
            'Porcentaje otros': article.porcentajeOtros ?? '',
            Desperdicio: article.desperdicio ?? '',
        }));

        const sheet = XLSX.utils.json_to_sheet(rowsToExport);
        sheet['!freeze'] = { xSplit: 2, ySplit: 1 };
        sheet['!autofilter'] = { ref: sheet['!ref'] || 'A1:A1' };
        sheet['!rows'] = [{ hpt: 26 }];

        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
            const cell = sheet[cellRef];
            if (!cell) continue;
            const header = String(cell.v ?? '');
            const colorConfig = HEADER_GROUP_COLORS[header] || { bg: '1F4E78', fontColor: 'FFFFFF' };
            cell.s = {
                fill: {
                    patternType: 'solid',
                    fgColor: { rgb: colorConfig.bg },
                },
                font: {
                    name: 'Calibri',
                    sz: 11,
                    bold: true,
                    color: { rgb: colorConfig.fontColor },
                },
                alignment: {
                    vertical: 'center',
                    horizontal: 'center',
                },
                border: {
                    top: { style: 'thin', color: { rgb: 'D9D9D9' } },
                    bottom: { style: 'medium', color: { rgb: '333333' } },
                    left: { style: 'thin', color: { rgb: 'D9D9D9' } },
                    right: { style: 'thin', color: { rgb: 'D9D9D9' } },
                },
            };
        }

        sheet['!cols'] = Object.keys(rowsToExport[0] ?? { Código: '', Descripción: '' }).map((header) => ({
            wch: Math.min(30, Math.max(12, header.length + 3)),
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, 'Artículos');
        XLSX.writeFile(workbook, 'articulos_completos.xlsx');
    };

    return <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1150, mx: 'auto' }}>
        <PageHeader title="Sincronización masiva de artículos" subtitle="Descargá todos los artículos, completá la información y volvé a subir el mismo archivo. El código identifica cada artículo." />
        {message && <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>}
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <Button variant="contained" startIcon={<UploadFileOutlinedIcon />} onClick={() => inputRef.current?.click()}>Elegir Excel</Button>
                <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} disabled={isExportLoading || !articles.length} onClick={downloadArticles}>{isExportLoading ? 'Preparando...' : 'Descargar todos'}</Button>
                <Typography variant="body2" color="text.secondary">{fileName || 'Formatos admitidos: .xlsx, .xls y .csv'}</Typography>
                <input ref={inputRef} hidden type="file" accept=".xlsx,.xls,.csv" onChange={(event) => event.target.files?.[0] && void readFile(event.target.files[0])} />
            </Stack>
        </Paper>
        {previewState.isLoading ? <PageLoader text="Validando artículos..." /> : preview && <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1 }}>
                {[['Filas', preview.totalRows, 'default'], ['Nuevos', preview.rowsToCreate, 'primary'], ['Actualizaciones', preview.rowsToUpdate, 'warning'], ['A desactivar', preview.rowsToDeactivate, preview.rowsToDeactivate ? 'error' : 'success'], ['Con errores', preview.invalidRows, preview.invalidRows ? 'error' : 'success']].map(([label, value, color]) => <Paper key={String(label)} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h5" fontWeight={900}>{value}</Typography><Chip size="small" color={color as any} label={String(label)} /></Paper>)}
            </Box>
            {preview.errors?.length > 0 && <Alert severity="error"><Typography fontWeight={800}>Hay filas para corregir:</Typography>{preview.errors.map((entry: any) => <Typography key={`${entry.sourceRow}-${entry.codigo}`} variant="body2">Fila {entry.sourceRow}{entry.codigo ? ` (${entry.codigo})` : ''}: {entry.errors.join(', ')}</Typography>)}</Alert>}
            {preview.canImport && <Alert severity={preview.rowsToDeactivate ? 'warning' : 'success'} icon={<CheckCircleOutlineIcon />}>Todas las filas son válidas. Los artículos que no estén en el archivo se desactivarán, no se borrarán.</Alert>}
            <Button size="large" variant="contained" color="success" disabled={!preview.canImport || importState.isLoading} onClick={importRows}>{importState.isLoading ? 'Sincronizando...' : `Sincronizar ${preview.validRows} artículos`}</Button>
        </Stack>}
    </Box>;
}
