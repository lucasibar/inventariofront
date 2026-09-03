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
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';

export default function LotesProducidosCalidadPage() {
    const isMobile = useIsMobile();
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [status, setStatus] = useState('QUARANTINE');
    const [query, setQuery] = useState('');
    const [target, setTarget] = useState<ProductionOutputLot | null>(null);
    const [notes, setNotes] = useState('');
    const [targetDepotId, setTargetDepotId] = useState('');
    const [targetPositionId, setTargetPositionId] = useState('');
    const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);
    const lots = useGetProductionOutputLotsQuery({ page: page + 1, pageSize, status: status || undefined, q: query || undefined });
    const depotsQuery = useGetDepotsQuery();
    const depots = useMemo(() => (depotsQuery.data ?? []).filter((depot: any) => depot.activo !== false), [depotsQuery.data]);
    const positions = useMemo(() => (depots.find((depot: any) => depot.id === targetDepotId)?.positions ?? []).filter((position: any) => position.activo !== false), [depots, targetDepotId]);
    const [release, releaseState] = useReleaseProductionOutputLotMutation();

    const submit = async () => {
        if (!target || !targetDepotId || !targetPositionId) return;
        try {
            await release({ id: target.id, notes: notes.trim() || undefined, targetDepotId, targetPositionId }).unwrap();
            setTarget(null);
            setNotes('');
            setMessage({ severity: 'success', text: 'Lote producido liberado e ingresado a stock.' });
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mt: 1.5 }}><Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">Primera calidad</Typography><Typography fontWeight={900}>{Number(lot.goodSocks).toLocaleString('es-AR')} medias</Typography></Box><Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">Segunda</Typography><Typography fontWeight={900}>{Number(lot.secondSocks).toLocaleString('es-AR')} medias</Typography></Box>{!lot.stockPostedAt && <Button fullWidth={isMobile} variant="contained" color="success" startIcon={<VerifiedOutlinedIcon />} onClick={() => { const firstDepot = depots[0]; const firstPosition = firstDepot?.positions?.find((position: any) => position.activo !== false); setTarget(lot); setNotes(''); setTargetDepotId(firstDepot?.id ?? ''); setTargetPositionId(firstPosition?.id ?? ''); }}>{lot.qualityStatus === 'RELEASED' ? 'Ingresar a stock' : 'Testear y liberar'}</Button>}</Stack>
            {lot.qualityTestedAt && <Typography variant="caption" color="text.secondary">Liberado por {lot.qualityTestedBy || 'Usuario'} el {new Date(lot.qualityTestedAt).toLocaleString('es-AR')}</Typography>}
            {lot.stockPostedAt && <Typography variant="caption" color="success.main" display="block">Ingresado en {lot.targetDepot?.nombre || 'Depósito'} / {lot.targetPosition?.codigo || 'posición'} · {lot.finishedItem?.codigoInterno}{lot.secondItem ? ` + ${lot.secondItem.codigoInterno}` : ''}</Typography>}
        </Paper>)}</Stack>}
        <TablePagination component="div" count={lots.data?.total ?? 0} page={page} onPageChange={(_, value) => setPage(value)} rowsPerPage={pageSize} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} rowsPerPageOptions={[10, 25, 50, 100]} labelRowsPerPage="Por página" labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`} />
        <Dialog open={Boolean(target)} onClose={() => !releaseState.isLoading && setTarget(null)} fullScreen={isMobile} fullWidth maxWidth="sm"><DialogTitle>{target?.qualityStatus === 'RELEASED' ? 'Ingresar a stock' : 'Liberar'} {target?.lotNumber}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><Alert severity="info">{target?.qualityStatus === 'RELEASED' ? 'Este lote ya estaba liberado. Seleccioná dónde ingresarlo físicamente.' : 'Confirmás que el lote fue testeado.'} Primera y segunda calidad ingresarán como artículos de stock separados.</Alert><TextField select required label="Depósito de producto terminado" value={targetDepotId} onChange={(event) => { const depotId = event.target.value; const firstPosition = depots.find((depot: any) => depot.id === depotId)?.positions?.find((position: any) => position.activo !== false); setTargetDepotId(depotId); setTargetPositionId(firstPosition?.id ?? ''); }}>{depots.map((depot: any) => <MenuItem key={depot.id} value={depot.id}>{depot.nombre}</MenuItem>)}</TextField><TextField select required label="Posición física" value={targetPositionId} onChange={(event) => setTargetPositionId(event.target.value)}>{positions.map((position: any) => <MenuItem key={position.id} value={position.id}>{position.codigo}</MenuItem>)}</TextField><TextField label="Resultado / observación" value={notes} onChange={(event) => setNotes(event.target.value)} multiline minRows={3} /></Stack></DialogContent><DialogActions><Button onClick={() => setTarget(null)}>Cancelar</Button><Button variant="contained" color="success" disabled={releaseState.isLoading || !targetDepotId || !targetPositionId} onClick={submit}>{releaseState.isLoading ? 'Procesando...' : target?.qualityStatus === 'RELEASED' ? 'Ingresar a stock' : 'Liberar e ingresar a stock'}</Button></DialogActions></Dialog>
    </Box>;
}
