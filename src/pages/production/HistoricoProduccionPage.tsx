import { useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../entities/auth/model/authSlice';
import { PageHeader, PageLoader, useIsMobile } from '../../shared/ui';
import {
    type CreateActualProductionRequest,
    type ProductionActualEntry,
    useAnnulActualProductionMutation,
    useCorrectActualProductionMutation,
    useGetProductionActualHistoryQuery,
} from '../../entities/production/api/production.api';

const statusLabels: Record<ProductionActualEntry['status'], string> = {
    DRAFT: 'Borrador',
    CONFIRMED: 'Confirmado',
    CORRECTED: 'Corregido',
    ANNULLED: 'Anulado',
};

const statusColors: Record<ProductionActualEntry['status'], 'default' | 'success' | 'warning' | 'error'> = {
    DRAFT: 'default',
    CONFIRMED: 'success',
    CORRECTED: 'warning',
    ANNULLED: 'error',
};

const today = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

type CorrectionForm = CreateActualProductionRequest & { notes: string };

function buildCorrection(entry: ProductionActualEntry): CorrectionForm {
    return {
        recordDate: entry.recordDate,
        shift: entry.shift,
        machineNumber: entry.machineNumberSnapshot,
        employeeLegajo: entry.employeeLegajoSnapshot,
        articleCode: entry.articleCodeSnapshot,
        goodSocks: Number(entry.goodSocks),
        secondSocks: Number(entry.secondSocks),
        secondMechanicalSocks: Number(entry.secondMechanicalSocks),
        runSeconds: entry.runSeconds,
        sourceType: 'MANUAL',
        sourceReference: `Corrección de ${entry.id}`,
        notes: entry.notes ?? '',
    };
}

export default function HistoricoProduccionPage() {
    const isMobile = useIsMobile();
    const user = useSelector(selectCurrentUser);
    const canCorrect = ['ADMIN', 'SUPERVISOR'].includes(user?.role?.toUpperCase() ?? '');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [filters, setFilters] = useState({ from: '', to: today(), status: '', shift: '', machineNumber: '', q: '' });
    const [correctionTarget, setCorrectionTarget] = useState<ProductionActualEntry | null>(null);
    const [correction, setCorrection] = useState<CorrectionForm | null>(null);
    const [annulTarget, setAnnulTarget] = useState<ProductionActualEntry | null>(null);
    const [annulReason, setAnnulReason] = useState('');
    const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);

    const queryArgs = useMemo(() => ({
        page: page + 1,
        pageSize,
        from: filters.from || undefined,
        to: filters.to || undefined,
        status: (filters.status || undefined) as ProductionActualEntry['status'] | undefined,
        shift: filters.shift || undefined,
        machineNumber: filters.machineNumber ? Number(filters.machineNumber) : undefined,
        q: filters.q.trim() || undefined,
    }), [filters, page, pageSize]);

    const { data, isLoading, isFetching, refetch } = useGetProductionActualHistoryQuery(queryArgs);
    const [correctActual, { isLoading: correcting }] = useCorrectActualProductionMutation();
    const [annulActual, { isLoading: annulling }] = useAnnulActualProductionMutation();
    const rows = data?.data ?? [];

    const updateFilter = (field: keyof typeof filters, value: string) => {
        setFilters((current) => ({ ...current, [field]: value }));
        setPage(0);
    };

    const openCorrection = (entry: ProductionActualEntry) => {
        setCorrectionTarget(entry);
        setCorrection(buildCorrection(entry));
        setFeedback(null);
    };

    const submitCorrection = async () => {
        if (!correctionTarget || !correction) return;
        try {
            await correctActual({ id: correctionTarget.id, body: correction }).unwrap();
            setCorrectionTarget(null);
            setCorrection(null);
            setFeedback({ severity: 'success', text: 'La corrección quedó guardada sin borrar el registro original.' });
        } catch (error: any) {
            setFeedback({ severity: 'error', text: error?.data?.message ?? 'No se pudo corregir el registro.' });
        }
    };

    const submitAnnul = async () => {
        if (!annulTarget || !annulReason.trim()) return;
        try {
            await annulActual({ id: annulTarget.id, reason: annulReason.trim() }).unwrap();
            setAnnulTarget(null);
            setAnnulReason('');
            setFeedback({ severity: 'success', text: 'El registro quedó anulado y continúa visible en el historial.' });
        } catch (error: any) {
            setFeedback({ severity: 'error', text: error?.data?.message ?? 'No se pudo anular el registro.' });
        }
    };

    const actions = (entry: ProductionActualEntry) => canCorrect && entry.status === 'CONFIRMED' ? (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <Tooltip title="Corregir conservando el original">
                <IconButton size="small" color="primary" onClick={() => openCorrection(entry)}><EditOutlinedIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title="Anular conservando el historial">
                <IconButton size="small" color="error" onClick={() => { setAnnulTarget(entry); setAnnulReason(''); setFeedback(null); }}><BlockOutlinedIcon fontSize="small" /></IconButton>
            </Tooltip>
        </Stack>
    ) : null;

    return (
        <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1500, mx: 'auto' }}>
            <PageHeader title="Histórico de Producción" subtitle="Registros más recientes primero; las correcciones y anulaciones mantienen la trazabilidad." />

            {feedback && <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>{feedback.text}</Alert>}

            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                    <TextField size="small" label="Buscar" value={filters.q} onChange={(e) => updateFilter('q', e.target.value)} placeholder="Máquina, artículo, legajo..." fullWidth />
                    <TextField size="small" label="Desde" type="date" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField size="small" label="Hasta" type="date" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField size="small" select label="Turno" value={filters.shift} onChange={(e) => updateFilter('shift', e.target.value)} sx={{ minWidth: 130 }}>
                        <MenuItem value="">Todos</MenuItem><MenuItem value="M">Mañana</MenuItem><MenuItem value="N">Noche</MenuItem>
                    </TextField>
                    <TextField size="small" select label="Estado" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} sx={{ minWidth: 150 }}>
                        <MenuItem value="">Todos</MenuItem>
                        {Object.entries(statusLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                    </TextField>
                    <Tooltip title="Actualizar"><IconButton onClick={() => refetch()} disabled={isFetching}><RefreshIcon /></IconButton></Tooltip>
                </Stack>
            </Paper>

            {isLoading ? <PageLoader text="Cargando histórico..." /> : rows.length === 0 ? (
                <Alert severity="info">No hay registros para los filtros elegidos.</Alert>
            ) : isMobile ? (
                <Stack spacing={1.25}>
                    {rows.map((entry) => (
                        <Paper key={entry.id} variant="outlined" sx={{ p: 1.75, borderRadius: 3, opacity: entry.status === 'ANNULLED' ? 0.68 : 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                <Box>
                                    <Typography fontWeight={900}>Máquina {entry.machineNumberSnapshot} · {entry.shift === 'N' ? 'Noche' : 'Mañana'}</Typography>
                                    <Typography variant="body2" color="text.secondary">{new Date(`${entry.recordDate}T12:00:00`).toLocaleDateString('es-AR')} · {entry.articleCodeSnapshot || 'Sin artículo'}</Typography>
                                </Box>
                                <Chip size="small" label={statusLabels[entry.status]} color={statusColors[entry.status]} />
                            </Stack>
                            <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                                <Box><Typography variant="caption" color="text.secondary">Primera</Typography><Typography fontWeight={800}>{Number(entry.goodSocks).toLocaleString('es-AR')}</Typography></Box>
                                <Box><Typography variant="caption" color="text.secondary">Segunda</Typography><Typography fontWeight={800}>{Number(entry.secondSocks).toLocaleString('es-AR')}</Typography></Box>
                                <Box><Typography variant="caption" color="text.secondary">Tejedor</Typography><Typography fontWeight={800}>{entry.employeeLegajoSnapshot || '—'}</Typography></Box>
                                <Box sx={{ ml: 'auto!important' }}>{actions(entry)}</Box>
                            </Stack>
                        </Paper>
                    ))}
                </Stack>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                    <Table size="small">
                        <TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Turno</TableCell><TableCell>Máquina</TableCell><TableCell>Artículo</TableCell><TableCell>Tejedor</TableCell><TableCell align="right">Primera</TableCell><TableCell align="right">Segunda</TableCell><TableCell>Estado</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
                        <TableBody>{rows.map((entry) => (
                            <TableRow key={entry.id} hover sx={{ opacity: entry.status === 'ANNULLED' ? 0.65 : 1 }}>
                                <TableCell>{new Date(`${entry.recordDate}T12:00:00`).toLocaleDateString('es-AR')}</TableCell><TableCell>{entry.shift}</TableCell><TableCell>{entry.machineNumberSnapshot}</TableCell><TableCell>{entry.articleCodeSnapshot || '—'}</TableCell><TableCell>{entry.employeeLegajoSnapshot || '—'}</TableCell><TableCell align="right">{Number(entry.goodSocks).toLocaleString('es-AR')}</TableCell><TableCell align="right">{Number(entry.secondSocks).toLocaleString('es-AR')}</TableCell><TableCell><Chip size="small" label={statusLabels[entry.status]} color={statusColors[entry.status]} /></TableCell><TableCell align="right">{actions(entry)}</TableCell>
                            </TableRow>
                        ))}</TableBody>
                    </Table>
                </TableContainer>
            )}

            <TablePagination component="div" count={data?.total ?? 0} page={page} onPageChange={(_, value) => setPage(value)} rowsPerPage={pageSize} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} rowsPerPageOptions={[10, 25, 50, 100]} labelRowsPerPage="Por página" labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`} />

            <Dialog open={Boolean(correctionTarget)} onClose={() => !correcting && setCorrectionTarget(null)} fullScreen={isMobile} fullWidth maxWidth="sm">
                <DialogTitle>Corregir registro</DialogTitle>
                <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
                    <Alert severity="info">Se creará una versión nueva y el original quedará marcado como corregido.</Alert>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        <TextField label="Fecha" type="date" value={correction?.recordDate ?? ''} onChange={(e) => setCorrection((v) => v && ({ ...v, recordDate: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
                        <TextField select label="Turno" value={correction?.shift ?? 'M'} onChange={(e) => setCorrection((v) => v && ({ ...v, shift: e.target.value }))} fullWidth><MenuItem value="M">Mañana</MenuItem><MenuItem value="N">Noche</MenuItem></TextField>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        <TextField label="Máquina" type="number" value={correction?.machineNumber ?? ''} onChange={(e) => setCorrection((v) => v && ({ ...v, machineNumber: Number(e.target.value) }))} fullWidth />
                        <TextField label="Artículo" value={correction?.articleCode ?? ''} onChange={(e) => setCorrection((v) => v && ({ ...v, articleCode: e.target.value }))} fullWidth />
                        <TextField label="Legajo" value={correction?.employeeLegajo ?? ''} onChange={(e) => setCorrection((v) => v && ({ ...v, employeeLegajo: e.target.value }))} fullWidth />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        <TextField label="Medias primera" type="number" value={correction?.goodSocks ?? 0} onChange={(e) => setCorrection((v) => v && ({ ...v, goodSocks: Number(e.target.value) }))} fullWidth />
                        <TextField label="Medias segunda" type="number" value={correction?.secondSocks ?? 0} onChange={(e) => setCorrection((v) => v && ({ ...v, secondSocks: Number(e.target.value) }))} fullWidth />
                        <TextField label="Segunda mecánica" type="number" value={correction?.secondMechanicalSocks ?? 0} onChange={(e) => setCorrection((v) => v && ({ ...v, secondMechanicalSocks: Number(e.target.value) }))} fullWidth />
                    </Stack>
                    <TextField label="Motivo / observación" multiline minRows={2} value={correction?.notes ?? ''} onChange={(e) => setCorrection((v) => v && ({ ...v, notes: e.target.value }))} />
                </Stack></DialogContent>
                <DialogActions><Button onClick={() => setCorrectionTarget(null)}>Cancelar</Button><Button variant="contained" onClick={submitCorrection} disabled={correcting}>{correcting ? 'Guardando...' : 'Guardar corrección'}</Button></DialogActions>
            </Dialog>

            <Dialog open={Boolean(annulTarget)} onClose={() => !annulling && setAnnulTarget(null)} fullWidth maxWidth="xs">
                <DialogTitle>Anular registro</DialogTitle>
                <DialogContent><Alert severity="warning" sx={{ mb: 2 }}>No se borrará: seguirá visible y auditado.</Alert><TextField autoFocus fullWidth required label="Motivo de anulación" multiline minRows={3} value={annulReason} onChange={(e) => setAnnulReason(e.target.value)} /></DialogContent>
                <DialogActions><Button onClick={() => setAnnulTarget(null)}>Cancelar</Button><Button color="error" variant="contained" disabled={annulling || !annulReason.trim()} onClick={submitAnnul}>{annulling ? 'Anulando...' : 'Anular'}</Button></DialogActions>
            </Dialog>
        </Box>
    );
}
