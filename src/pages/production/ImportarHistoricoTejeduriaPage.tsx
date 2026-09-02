import { useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    LinearProgress,
    Paper,
    Typography,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';
import {
    useImportControlGestionMutation,
    usePreviewControlGestionImportMutation,
} from '../../entities/production/api/production.api';
import { PageHeader } from '../../shared/ui';

const formatter = new Intl.NumberFormat('es-AR');

function formatDate(value: string | null): string {
    if (!value) return '—';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
}

function apiErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'data' in error) {
        const data = (error as { data?: { message?: string | string[] } }).data;
        if (Array.isArray(data?.message)) return data.message.join(' ');
        if (typeof data?.message === 'string') return data.message;
    }
    return 'No se pudo procesar el archivo. Revisá que sea el CSV de CARGA correcto.';
}

export default function ImportarHistoricoTejeduriaPage() {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [selectionError, setSelectionError] = useState('');
    const [previewImport, previewState] = usePreviewControlGestionImportMutation();
    const [runImport, importState] = useImportControlGestionMutation();

    const selectFile = (selected?: File) => {
        previewState.reset();
        importState.reset();
        setSelectionError('');
        if (!selected) {
            setFile(null);
            return;
        }
        if (!selected.name.toLowerCase().endsWith('.csv')) {
            setSelectionError('Seleccioná el archivo CONTROL DE GESTION - CARGA.csv.');
            setFile(null);
            return;
        }
        if (selected.size > 35 * 1024 * 1024) {
            setSelectionError('El archivo supera el límite de 35 MB.');
            setFile(null);
            return;
        }
        setFile(selected);
    };

    const buildForm = () => {
        const formData = new FormData();
        if (file) formData.append('file', file);
        return formData;
    };

    const analyze = async () => {
        if (!file) return;
        importState.reset();
        try {
            await previewImport(buildForm()).unwrap();
        } catch {
            // El detalle se muestra desde previewState.error.
        }
    };

    const importRows = async () => {
        if (!file || !previewState.data?.canImport) return;
        const accepted = window.confirm(
            `Se procesarán ${formatter.format(previewState.data.totalRows)} filas. `
            + `${formatter.format(previewState.data.rowsToCreate)} se crearán y `
            + `${formatter.format(previewState.data.rowsToUpdate)} se actualizarán. ¿Continuar?`,
        );
        if (!accepted) return;
        try {
            await runImport(buildForm()).unwrap();
        } catch {
            // El detalle se muestra desde importState.error.
        }
    };

    const preview = previewState.data;
    const result = importState.data;
    const busy = previewState.isLoading || importState.isLoading;

    return (
        <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1150, mx: 'auto' }}>
            <PageHeader
                title="Importar histórico de Tejeduría"
                subtitle="Control de Gestión · Sector 3000 · Datos desde 2026"
            />

            <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2, background: 'var(--bg-secondary, #1a1d2e)', border: '1px solid var(--border-color, #2a2d3e)' }}>
                <Box
                    onClick={() => !busy && inputRef.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                        event.preventDefault();
                        if (!busy) selectFile(event.dataTransfer.files[0]);
                    }}
                    sx={{
                        p: { xs: 3, md: 5 },
                        textAlign: 'center',
                        border: '2px dashed var(--border-strong, #374151)',
                        borderRadius: 2,
                        cursor: busy ? 'wait' : 'pointer',
                        background: 'rgba(99,102,241,.04)',
                        '&:hover': busy ? undefined : { borderColor: '#6366f1', background: 'rgba(99,102,241,.08)' },
                    }}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".csv,text/csv"
                        hidden
                        disabled={busy}
                        onChange={(event) => selectFile(event.target.files?.[0])}
                    />
                    <CloudUploadOutlinedIcon sx={{ fontSize: 46, color: '#818cf8', mb: 1 }} />
                    <Typography sx={{ color: 'var(--text-primary, #f3f4f6)', fontWeight: 700 }}>
                        {file ? file.name : 'Seleccioná o arrastrá el CSV de CARGA'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, color: 'var(--text-muted, #9ca3af)' }}>
                        {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'Primero se analiza; nada se guarda hasta que confirmes la importación.'}
                    </Typography>
                </Box>

                {selectionError ? <Alert severity="error" sx={{ mt: 2 }}>{selectionError}</Alert> : null}
                {previewState.error ? <Alert severity="error" sx={{ mt: 2 }}>{apiErrorMessage(previewState.error)}</Alert> : null}
                {importState.error ? <Alert severity="error" sx={{ mt: 2 }}>{apiErrorMessage(importState.error)}</Alert> : null}

                {busy ? (
                    <Box sx={{ mt: 2 }}>
                        <LinearProgress />
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'var(--text-muted, #9ca3af)' }}>
                            {importState.isLoading ? 'Importando en una operación segura. No cierres esta pantalla...' : 'Analizando las filas y cruzando máquinas, legajos y artículos...'}
                        </Typography>
                    </Box>
                ) : null}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<FactCheckOutlinedIcon />}
                        disabled={!file || busy}
                        onClick={analyze}
                    >
                        Analizar archivo
                    </Button>
                </Box>
            </Paper>

            {preview ? (
                <>
                    <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2, background: 'var(--bg-secondary, #1a1d2e)', border: `1px solid ${preview.canImport ? 'rgba(16,185,129,.45)' : 'rgba(239,68,68,.45)'}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" sx={{ color: 'var(--text-primary, #f3f4f6)', fontWeight: 800 }}>Vista previa</Typography>
                                <Typography variant="body2" sx={{ color: 'var(--text-muted, #9ca3af)' }}>
                                    Filas {preview.sourceRowFrom}–{preview.sourceRowTo} · {formatDate(preview.dateFrom)} al {formatDate(preview.dateTo)}
                                </Typography>
                            </Box>
                            <Chip label={preview.canImport ? 'Lista para importar' : 'Requiere corrección'} color={preview.canImport ? 'success' : 'error'} />
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                            <SummaryCard label="Registros 2026" value={preview.totalRows} detail={`${preview.rowsToCreate} nuevos · ${preview.rowsToUpdate} existentes`} />
                            <SummaryCard label="Máquinas" value={preview.machineCount} detail={preview.missingMachines.length ? `Faltan: ${preview.missingMachines.join(', ')}` : '190 vinculadas'} />
                            <SummaryCard label="Empleados" value={preview.employeeCount} detail={`${preview.newEmployees} nuevos · ${preview.existingEmployees} existentes`} />
                            <SummaryCard label="Artículos" value={preview.articleCount} detail={`${preview.matchedArticles} vinculados · ${preview.unmatchedArticles} pendientes`} />
                        </Box>

                        {preview.warnings.length > 0 ? (
                            <Alert severity="warning" sx={{ mt: 2 }}>
                                {preview.warnings.map((warning) => <div key={warning}>{warning}</div>)}
                            </Alert>
                        ) : null}
                        {preview.invalidRows > 0 ? (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                Hay {preview.invalidRows} filas inválidas. {preview.invalidRowSamples.slice(0, 5).map((row) => `Fila ${row.sourceRow}: ${row.errors.join(', ')}`).join(' · ')}
                            </Alert>
                        ) : null}

                        {preview.unmatchedArticleSamples.length > 0 ? (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" sx={{ color: 'var(--text-muted, #9ca3af)' }}>Ejemplos de artículos todavía no vinculados:</Typography>
                                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
                                    {preview.unmatchedArticleSamples.slice(0, 12).map((article) => <Chip key={article} label={article} size="small" variant="outlined" />)}
                                </Box>
                            </Box>
                        ) : null}

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<PublishOutlinedIcon />}
                                disabled={!preview.canImport || busy}
                                onClick={importRows}
                            >
                                Confirmar importación
                            </Button>
                        </Box>
                    </Paper>
                </>
            ) : null}

            {result ? (
                <Alert severity="success">
                    Se procesaron {formatter.format(result.importedRows)} registros: {formatter.format(result.createdRows)} nuevos y {formatter.format(result.updatedRows)} actualizados. Se crearon {formatter.format(result.createdEmployees)} empleados.
                </Alert>
            ) : null}
        </Box>
    );
}

function SummaryCard({ label, value, detail }: { label: string; value: number; detail: string }) {
    return (
        <Box sx={{ p: 1.75, borderRadius: 2, background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-color, #2a2d3e)' }}>
            <Typography variant="h5" sx={{ color: '#a5b4fc', fontWeight: 800 }}>{formatter.format(value)}</Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-primary, #f3f4f6)', fontWeight: 700 }}>{label}</Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-muted, #9ca3af)' }}>{detail}</Typography>
        </Box>
    );
}
