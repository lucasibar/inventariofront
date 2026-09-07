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

import { readArticleWorkbook, exportMaterialColumns, isMaterialDetailColumn } from '../../features/quality/articulos/articulosWorkbook';

const aliases: Record<string, string> = {
    codigo: 'codigo', codigointerno: 'codigo', articulo: 'codigo', codarticulo: 'codigo',
    descripcion: 'descripcion', detalle: 'descripcion', marca: 'marca', clienteid: 'clienteId', categoria: 'categoria',
    ssn: 'ssn', im: 'im', talle: 'talle', tallecliente: 'talle', talledelcliente: 'talle',
    talledemedia: 'talleDMedia', tallemedia: 'talleDMedia', workingnumber: 'workingNumber',
    tipoprenda: 'tipoPrenda', colorbase: 'colorBase', colorlogo: 'colorLogo', colordetalle: 'colorDetalle', colortalle: 'colorTalle',
    talonpuntera: 'talonPuntera', triangulo: 'triangulo', tipotejido: 'tipoTejido',
    pesounitario: 'pesoUnitario', pesodocena: 'pesoDocena', unidadesporpack: 'unidadesPorPack',
    tiempotejidoseg: 'tiempoTejidoSeg', tiempotejido: 'tiempoTejidoSeg', tiempodocenamin: 'tiempoDocenaMin',
    porcentajealgodon: 'porcentajeAlgodon', algodon: 'porcentajeAlgodon', porcentajenylon: 'porcentajeNylon', nylon: 'porcentajeNylon',
    porcentajelycra: 'porcentajeLycra', lycra: 'porcentajeLycra', porcentajegoma: 'porcentajeGoma', goma: 'porcentajeGoma',
    porcentajeotros: 'porcentajeOtros', otros: 'porcentajeOtros', desperdicio: 'desperdicio', programas: 'programas',
    observacion: 'observacion', observaciones: 'observacion', estadorevision: 'estadoRevision',
};

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

    // 2. Descripciones de colores (Púrpura / Violeta)
    'Color base': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Color logo': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Color detalle': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Color talle': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Triángulo': { bg: '5B2C6F', fontColor: 'FFFFFF' },
    'Talón puntera': { bg: '5B2C6F', fontColor: 'FFFFFF' },

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
            const mapped = readArticleWorkbook(workbook, aliases);
            if (!mapped.length) throw new Error('La hoja Artículos no tiene datos reconocibles.');
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

        const materials = exportMaterialColumns(articles);
        const rowsToExport = articles.map((article: any, index: number) => ({
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
            'Color logo': article.colorLogo ?? '',
            'Color detalle': article.colorDetalle ?? '',
            'Color talle': article.colorTalle ?? '',
            Triángulo: article.triangulo ?? '',
            'Talón puntera': article.talonPuntera ?? '',

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
            ...materials.rows[index],
        }));

        const sheet = XLSX.utils.json_to_sheet(rowsToExport);
        sheet['!freeze'] = { xSplit: 2, ySplit: 1 };
        sheet['!autofilter'] = { ref: sheet['!ref'] || 'A1:A1' };
        sheet['!rows'] = [{ hpt: 44 }];

        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
            const cell = sheet[cellRef];
            if (!cell) continue;
            const header = String(cell.v ?? '');
            const colorConfig = HEADER_GROUP_COLORS[header] || { bg: header.startsWith('Goma ') || header.startsWith('Lycra ') ? '196F3D' : '5B2C6F', fontColor: 'FFFFFF' };
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
                    wrapText: true,
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
            hidden: isMaterialDetailColumn(header),
            level: isMaterialDetailColumn(header) ? 1 : 0,
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
                <Typography variant="body2" color="text.secondary">{fileName || 'Excel de una hoja: Base 1 / Alternativa 1, Base 1 / Alternativa 2…'}</Typography>
                <input ref={inputRef} hidden type="file" accept=".xlsx,.xls" onChange={(event) => event.target.files?.[0] && void readFile(event.target.files[0])} />
            </Stack>
        </Paper>
        <Alert severity="info" sx={{ mb: 2 }}>Una fila por artículo. En “Base 1 / Alternativa 1” y “Base 1 / Alternativa 2” cargá códigos de ítems del mismo color; “Base 2” corresponde a otro color. En “Base 1 / En uso” indicá 1 o 2; si queda vacío, se usa la primera alternativa activa. Podés agregar más columnas siguiendo esos nombres. Los campos de consumo, desperdicio, conos y Activo se conservan en columnas agrupadas al final, que podés mostrar en Excel. La sincronización reemplaza los materiales de cada artículo incluido: borrar sus códigos los quita del artículo.</Alert>
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
