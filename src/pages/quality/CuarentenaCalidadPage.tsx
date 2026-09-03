import { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    MenuItem,
    Paper,
    Stack,
    TablePagination,
    TextField,
    Typography,
} from '@mui/material';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { PageHeader, PageLoader, useIsMobile } from '../../shared/ui';
import { type QualityLot, useGetQualityLotsQuery, useReleaseQualityLotMutation } from '../../features/quality/lots/quality-lots.api';

export default function CuarentenaCalidadPage() {
    const isMobile = useIsMobile();
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [status, setStatus] = useState('QUARANTINE');
    const [query, setQuery] = useState('');
    const [target, setTarget] = useState<QualityLot | null>(null);
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const lots = useGetQualityLotsQuery({ page: page + 1, pageSize, status: status || undefined, q: query || undefined });
    const [release, { isLoading: releasing }] = useReleaseQualityLotMutation();

    const submit = async () => {
        if (!target) return;
        try {
            await release({ id: target.id, notes: notes.trim() || undefined }).unwrap();
            setTarget(null);
            setNotes('');
            setMessage({ type: 'success', text: 'Lote liberado. Ya está disponible para Producción.' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error?.data?.message ?? 'No se pudo liberar el lote.' });
        }
    };

    const summary = lots.data?.summary ?? { quarantine: 0, released: 0, total: 0 };
    const releasedPct = summary.total ? Math.round((summary.released / summary.total) * 100) : 100;
    return (
        <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1300, mx: 'auto' }}>
            <PageHeader title="Cuarentena y liberación" subtitle="Los lotes históricos ya se consideran testeados. Aquí sólo aparecen para liberar los nuevos ingresos." />
            {message && <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }, gap: 1.25, mb: 2 }}>
                <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 3 }}><Typography variant="caption" color="text.secondary">Esperando testeo</Typography><Typography variant="h4" fontWeight={900} color="warning.main">{summary.quarantine}</Typography></Paper>
                <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 3 }}><Typography variant="caption" color="text.secondary">Liberados</Typography><Typography variant="h4" fontWeight={900} color="success.main">{summary.released}</Typography></Paper>
                <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 3, gridColumn: { xs: '1 / -1', sm: 'auto' } }}><Typography variant="caption" color="text.secondary">Disponibilidad aprobada</Typography><Typography variant="h4" fontWeight={900}>{releasedPct}%</Typography><LinearProgress variant="determinate" value={releasedPct} color="success" sx={{ mt: 0.75, height: 7, borderRadius: 5 }} /></Paper>
            </Box>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, mb: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                    <TextField size="small" fullWidth label="Buscar lote o material" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} />
                    <TextField size="small" select label="Estado" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} sx={{ minWidth: 190 }}><MenuItem value="QUARANTINE">En cuarentena</MenuItem><MenuItem value="RELEASED">Liberados</MenuItem><MenuItem value="">Todos</MenuItem></TextField>
                </Stack>
            </Paper>

            {lots.isLoading ? <PageLoader text="Cargando lotes..." /> : !lots.data?.data.length ? <Alert severity="success">No hay lotes pendientes para este filtro.</Alert> : (
                <Stack spacing={1.25} sx={{ opacity: lots.isFetching ? 0.7 : 1 }}>
                    {lots.data.data.map((lot) => (
                        <Paper key={lot.id} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3 }}>
                            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography fontWeight={900}>{lot.item?.codigoInterno} · {lot.item?.descripcion}</Typography>
                                    <Typography variant="body2" color="text.secondary">Lote {lot.lotNumber} · {lot.supplier?.name || 'Sin proveedor'}</Typography>
                                </Box>
                                <Chip icon={lot.qualityStatus === 'RELEASED' ? <VerifiedOutlinedIcon /> : <ScienceOutlinedIcon />} label={lot.qualityStatus === 'RELEASED' ? 'Liberado' : 'Cuarentena'} color={lot.qualityStatus === 'RELEASED' ? 'success' : 'warning'} size="small" />
                            </Stack>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mt: 1.5 }}>
                                <Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">Stock físico</Typography><Typography fontWeight={900}>{Number(lot.totalQtyPrincipal).toLocaleString('es-AR')} {lot.item?.unidadPrincipal}</Typography></Box>
                                <Box sx={{ flex: 2 }}><Typography variant="caption" color="text.secondary">Ubicación</Typography><Typography variant="body2">{lot.locations.map((location) => `${location.deposito || 'Depósito'} / ${location.posicion || 's/p'}`).join(' · ')}</Typography></Box>
                                {lot.qualityStatus === 'QUARANTINE' && <Button fullWidth={isMobile} variant="contained" color="success" startIcon={<VerifiedOutlinedIcon />} onClick={() => { setTarget(lot); setNotes(''); setMessage(null); }}>Marcar testeado y liberar</Button>}
                            </Stack>
                            {lot.qualityTestedAt && <Typography variant="caption" color="text.secondary">Liberado por {lot.qualityTestedBy || 'Usuario'} el {new Date(lot.qualityTestedAt).toLocaleString('es-AR')}</Typography>}
                        </Paper>
                    ))}
                </Stack>
            )}
            <TablePagination component="div" count={lots.data?.total ?? 0} page={page} onPageChange={(_, value) => setPage(value)} rowsPerPage={pageSize} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} rowsPerPageOptions={[10, 25, 50, 100]} labelRowsPerPage="Por página" labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`} />

            <Dialog open={Boolean(target)} onClose={() => !releasing && setTarget(null)} fullScreen={isMobile} fullWidth maxWidth="sm">
                <DialogTitle>Liberar lote {target?.lotNumber}</DialogTitle>
                <DialogContent><Stack spacing={2} sx={{ pt: 1 }}><Alert severity="info">Confirmás que este lote fue testeado. Desde ese momento Producción podrá consumirlo.</Alert><TextField label="Resultado / observación (opcional)" value={notes} onChange={(event) => setNotes(event.target.value)} multiline minRows={3} /></Stack></DialogContent>
                <DialogActions><Button onClick={() => setTarget(null)}>Cancelar</Button><Button variant="contained" color="success" disabled={releasing} onClick={submit}>{releasing ? 'Liberando...' : 'Confirmar liberación'}</Button></DialogActions>
            </Dialog>
        </Box>
    );
}
