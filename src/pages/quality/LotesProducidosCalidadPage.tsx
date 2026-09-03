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
    MenuItem,
    Paper,
    Stack,
    TablePagination,
    TextField,
    Typography,
} from '@mui/material';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { PageHeader, PageLoader, useIsMobile } from '../../shared/ui';
import { type ProductionOutputLot, useGetProductionOutputLotsQuery, useReleaseProductionOutputLotMutation } from '../../entities/production/api/production.api';

export default function LotesProducidosCalidadPage() {
    const isMobile = useIsMobile();
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [status, setStatus] = useState('QUARANTINE');
    const [query, setQuery] = useState('');
    const [target, setTarget] = useState<ProductionOutputLot | null>(null);
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);
    const lots = useGetProductionOutputLotsQuery({ page: page + 1, pageSize, status: status || undefined, q: query || undefined });
    const [release, releaseState] = useReleaseProductionOutputLotMutation();

    const submit = async () => {
        if (!target) return;
        try {
            await release({ id: target.id, notes: notes.trim() || undefined }).unwrap();
            setTarget(null);
            setNotes('');
            setMessage({ severity: 'success', text: 'Lote producido testeado y liberado.' });
        } catch (error: any) {
            setMessage({ severity: 'error', text: error?.data?.message ?? 'No se pudo liberar el lote.' });
        }
    };

    return <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1250, mx: 'auto' }}>
        <PageHeader title="Liberación de lotes producidos" subtitle="Los lotes nacen al cerrar la orden productiva y quedan pendientes de testeo de Calidad." />
        {message && <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>}
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, mb: 2 }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}><TextField fullWidth size="small" label="Buscar lote o artículo" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} /><TextField size="small" select label="Estado" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} sx={{ minWidth: 190 }}><MenuItem value="QUARANTINE">Pendientes</MenuItem><MenuItem value="RELEASED">Liberados</MenuItem><MenuItem value="">Todos</MenuItem></TextField></Stack></Paper>
        {lots.isLoading ? <PageLoader text="Cargando lotes producidos..." /> : !lots.data?.data.length ? <Alert severity="success">No hay lotes pendientes.</Alert> : <Stack spacing={1.25}>{lots.data.data.map((lot) => <Paper key={lot.id} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}><Box><Typography fontWeight={900}>{lot.articleCodeSnapshot} · {lot.article?.descripcion || 'Artículo producido'}</Typography><Typography variant="body2" color="text.secondary">Lote {lot.lotNumber} · Orden {lot.schedule?.planDate ? new Date(`${lot.schedule.planDate}T12:00:00`).toLocaleDateString('es-AR') : lot.scheduleId}</Typography></Box><Chip size="small" color={lot.qualityStatus === 'RELEASED' ? 'success' : 'warning'} label={lot.qualityStatus === 'RELEASED' ? 'Liberado' : 'Pendiente'} /></Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mt: 1.5 }}><Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">Primera calidad</Typography><Typography fontWeight={900}>{Number(lot.goodSocks).toLocaleString('es-AR')} medias</Typography></Box><Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">Segunda</Typography><Typography fontWeight={900}>{Number(lot.secondSocks).toLocaleString('es-AR')} medias</Typography></Box>{lot.qualityStatus === 'QUARANTINE' && <Button fullWidth={isMobile} variant="contained" color="success" startIcon={<VerifiedOutlinedIcon />} onClick={() => { setTarget(lot); setNotes(''); }}>Testear y liberar</Button>}</Stack>
            {lot.qualityTestedAt && <Typography variant="caption" color="text.secondary">Liberado por {lot.qualityTestedBy || 'Usuario'} el {new Date(lot.qualityTestedAt).toLocaleString('es-AR')}</Typography>}
        </Paper>)}</Stack>}
        <TablePagination component="div" count={lots.data?.total ?? 0} page={page} onPageChange={(_, value) => setPage(value)} rowsPerPage={pageSize} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} rowsPerPageOptions={[10, 25, 50, 100]} labelRowsPerPage="Por página" labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`} />
        <Dialog open={Boolean(target)} onClose={() => !releaseState.isLoading && setTarget(null)} fullScreen={isMobile} fullWidth maxWidth="sm"><DialogTitle>Liberar {target?.lotNumber}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><Alert severity="info">Confirmás que el lote producido fue testeado.</Alert><TextField label="Resultado / observación" value={notes} onChange={(event) => setNotes(event.target.value)} multiline minRows={3} /></Stack></DialogContent><DialogActions><Button onClick={() => setTarget(null)}>Cancelar</Button><Button variant="contained" color="success" disabled={releaseState.isLoading} onClick={submit}>{releaseState.isLoading ? 'Liberando...' : 'Confirmar liberación'}</Button></DialogActions></Dialog>
    </Box>;
}
