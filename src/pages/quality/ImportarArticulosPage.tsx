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
    ssn: 'ssn', im: 'im', talle: 'talle', talledemedia: 'talleDMedia', workingnumber: 'workingNumber',
    tipoprenda: 'tipoPrenda', colorbase: 'colorBase', colorlogo: 'colorLogo', colortalle: 'colorTalle',
    colordetalle: 'colorDetalle', talonpuntera: 'talonPuntera', triangulo: 'triangulo', tipotejido: 'tipoTejido',
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
    { header: 'Detalle media', key: 'detallemedia', rol: 'DETALLE_MEDIA', orden: 1 },
    { header: 'Color talle material', key: 'colortallematerial', rol: 'COLOR_TALLE', orden: 1 },
    { header: 'Triángulo material', key: 'triangulomaterial', rol: 'TRIANGULO', orden: 1 },
    { header: 'Talón puntera material', key: 'talonpunteramaterial', rol: 'TALON_PUNTERA', orden: 1 },
] as const;
const materialColumnByKey = new Map(MATERIAL_COLUMNS.map((column) => [column.key, column]));

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
        const XLSX = await import('xlsx');
        const rowsToExport = articles.map((article: any) => {
            const row: Record<string, unknown> = {
                Código: article.codigo, Descripción: article.descripcion, Marca: article.marca ?? '',
                Categoría: article.categoria?.nombre ?? '', SSN: article.ssn ?? '', IM: article.im ?? '',
                Talle: article.talle ?? '', 'Talle de media': article.talleDMedia ?? '', 'Working number': article.workingNumber ?? '',
                'Tipo prenda': article.tipoPrenda ?? '', 'Color base': article.colorBase ?? '', 'Color logo': article.colorLogo ?? '',
                'Color talle': article.colorTalle ?? '', 'Color detalle': article.colorDetalle ?? '', 'Talón puntera': article.talonPuntera ?? '',
                Triángulo: article.triangulo ?? '', 'Tipo tejido': article.tipoTejido ?? '', 'Peso unitario': article.pesoUnitario ?? '',
                'Peso docena': article.pesoDocena ?? '', 'Unidades por pack': article.unidadesPorPack ?? '',
                'Tiempo tejido seg': article.tiempoTejidoSeg ?? '', 'Tiempo docena min': article.tiempoDocenaMin ?? '',
                'Porcentaje algodón': article.porcentajeAlgodon ?? '', 'Porcentaje nylon': article.porcentajeNylon ?? '',
                'Porcentaje lycra': article.porcentajeLycra ?? '', 'Porcentaje goma': article.porcentajeGoma ?? '',
                'Porcentaje otros': article.porcentajeOtros ?? '', Desperdicio: article.desperdicio ?? '',
                Programas: article.programas ?? '', Observación: article.observacion ?? '', 'Estado revisión': article.estadoRevision ?? 'PENDIENTE',
            };
            for (const column of MATERIAL_COLUMNS) {
                const ref = (article.itemRefs ?? [])
                    .filter((entry: any) => entry.activo !== false && entry.rol === column.rol && (entry.grupo ?? 1) === 1)
                    .find((entry: any) => (entry.orden ?? 1) === column.orden);
                row[column.header] = ref?.item?.codigoInterno ?? '';
            }
            return row;
        });
        const sheet = XLSX.utils.json_to_sheet(rowsToExport);
        sheet['!freeze'] = { xSplit: 2, ySplit: 1 };
        sheet['!autofilter'] = { ref: sheet['!ref'] || 'A1:A1' };
        sheet['!cols'] = Object.keys(rowsToExport[0] ?? { Código: '', Descripción: '' }).map((header) => ({ wch: Math.min(28, Math.max(12, header.length + 2)) }));
        const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Artículos');
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
