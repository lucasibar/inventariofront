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
import { useImportArticulosBulkMutation, usePreviewArticulosBulkImportMutation } from '../../features/quality/articulos/api/articulos.api';

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

function mapRows(rawRows: Record<string, unknown>[]) {
    return rawRows.map((raw) => {
        const mapped: Record<string, unknown> = {};
        Object.entries(raw).forEach(([header, value]) => {
            const field = aliases[normalizeHeader(header)];
            if (field && value !== undefined && value !== null && value !== '') mapped[field] = value;
        });
        return mapped;
    }).filter((row) => Object.keys(row).length > 0);
}

export default function ImportarArticulosPage() {
    const inputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');
    const [rows, setRows] = useState<any[]>([]);
    const [preview, setPreview] = useState<any>(null);
    const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [previewImport, previewState] = usePreviewArticulosBulkImportMutation();
    const [runImport, importState] = useImportArticulosBulkMutation();

    const readFile = async (file: File) => {
        setMessage(null); setPreview(null); setRows([]); setFileName(file.name);
        try {
            const XLSX = await import('xlsx');
            const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const mapped = mapRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: null }));
            if (!mapped.length) throw new Error('La primera hoja no tiene datos reconocibles.');
            const result = await previewImport({ rows: mapped }).unwrap();
            setRows(mapped); setPreview(result);
        } catch (error: any) {
            setMessage({ severity: 'error', text: error?.data?.message ?? error?.message ?? 'No se pudo leer el archivo.' });
        }
    };

    const importRows = async () => {
        try {
            const result = await runImport({ rows }).unwrap();
            setMessage({ severity: 'success', text: `Importación terminada: ${result.rowsToCreate} altas y ${result.rowsToUpdate} actualizaciones.` });
            setPreview(null); setRows([]); setFileName('');
            if (inputRef.current) inputRef.current.value = '';
        } catch (error: any) {
            const text = typeof error?.data?.message === 'string' ? error.data.message : error?.data?.message?.message;
            setMessage({ severity: 'error', text: text ?? 'No se pudo completar la importación.' });
        }
    };

    const downloadTemplate = async () => {
        const XLSX = await import('xlsx');
        const sheet = XLSX.utils.json_to_sheet([{ Código: 'ART-001', Descripción: 'Media ejemplo', Marca: 'MARCA', Categoría: '', Talle: 'M', 'Tipo prenda': 'CREW', 'Color base': 'NEGRO', 'Tipo tejido': 'LISO', 'Tiempo tejido seg': 45, 'Peso unitario': 30, 'Porcentaje algodón': 80, 'Porcentaje nylon': 15, 'Porcentaje lycra': 5, Desperdicio: 3, Observación: '' }]);
        const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Artículos'); XLSX.writeFile(workbook, 'plantilla_importacion_articulos.xlsx');
    };

    return <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1150, mx: 'auto' }}>
        <PageHeader title="Importación masiva de artículos" subtitle="Vista previa obligatoria; el código identifica el artículo y permite actualizarlo sin duplicarlo." />
        {message && <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>}
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <Button variant="contained" startIcon={<UploadFileOutlinedIcon />} onClick={() => inputRef.current?.click()}>Elegir Excel</Button>
                <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={downloadTemplate}>Descargar plantilla</Button>
                <Typography variant="body2" color="text.secondary">{fileName || 'Formatos admitidos: .xlsx, .xls y .csv'}</Typography>
                <input ref={inputRef} hidden type="file" accept=".xlsx,.xls,.csv" onChange={(event) => event.target.files?.[0] && void readFile(event.target.files[0])} />
            </Stack>
        </Paper>
        {previewState.isLoading ? <PageLoader text="Validando artículos..." /> : preview && <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1 }}>
                {[['Filas', preview.totalRows, 'default'], ['Nuevos', preview.rowsToCreate, 'primary'], ['Actualizaciones', preview.rowsToUpdate, 'warning'], ['Con errores', preview.invalidRows, preview.invalidRows ? 'error' : 'success']].map(([label, value, color]) => <Paper key={String(label)} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h5" fontWeight={900}>{value}</Typography><Chip size="small" color={color as any} label={String(label)} /></Paper>)}
            </Box>
            {preview.errors?.length > 0 && <Alert severity="error"><Typography fontWeight={800}>Hay filas para corregir:</Typography>{preview.errors.map((entry: any) => <Typography key={`${entry.sourceRow}-${entry.codigo}`} variant="body2">Fila {entry.sourceRow}{entry.codigo ? ` (${entry.codigo})` : ''}: {entry.errors.join(', ')}</Typography>)}</Alert>}
            {preview.canImport && <Alert severity="success" icon={<CheckCircleOutlineIcon />}>Todas las filas son válidas. Los campos vacíos no borrarán información existente.</Alert>}
            <Button size="large" variant="contained" color="success" disabled={!preview.canImport || importState.isLoading} onClick={importRows}>{importState.isLoading ? 'Importando...' : `Importar ${preview.validRows} artículos`}</Button>
        </Stack>}
    </Box>;
}
