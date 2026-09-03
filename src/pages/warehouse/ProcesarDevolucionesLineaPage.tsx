import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    Paper,
    Stack,
    TablePagination,
    TextField,
    Typography,
} from '@mui/material';
import MoveToInboxOutlinedIcon from '@mui/icons-material/MoveToInboxOutlined';
import {
    type ProductionLineReturn,
    type ProductionLineReturnStatus,
    useCancelProductionLineReturnMutation,
    useGetProductionLineReturnsQuery,
    useReceiveProductionLineReturnsMutation,
} from '../../entities/production/api/production.api';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { selectCurrentUser } from '../../entities/auth/model/authSlice';
import { PageHeader, PageLoader, useIsMobile } from '../../shared/ui';

const statusLabel: Record<ProductionLineReturnStatus, string> = {
    DECLARED: 'Pendiente',
    POSTED: 'Ingresada a stock',
    CANCELLED: 'Anulada',
};

const errorText = (error: any) => error?.data?.message ?? 'No se pudo procesar la operación.';

export default function ProcesarDevolucionesLineaPage() {
    const isMobile = useIsMobile();
    const user = useSelector(selectCurrentUser);
    const canCancel = ['ADMIN', 'SUPERVISOR'].includes(user?.role?.toUpperCase() ?? '');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [status, setStatus] = useState<ProductionLineReturnStatus | ''>('DECLARED');
    const [query, setQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [destinations, setDestinations] = useState<Record<string, string>>({});
    const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);
    const [cancelTarget, setCancelTarget] = useState<ProductionLineReturn | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const returnsQuery = useGetProductionLineReturnsQuery({ page: page + 1, pageSize, status: status || undefined, q: query || undefined });
    const depotsQuery = useGetDepotsQuery();
    const [receive, receiveState] = useReceiveProductionLineReturnsMutation();
    const [cancelReturn, cancelState] = useCancelProductionLineReturnMutation();
    const entries = returnsQuery.data?.data ?? [];
    const depots = depotsQuery.data ?? [];

    const entriesById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
    const selectableEntries = entries.filter((entry) => entry.status === 'DECLARED');
    const allSelected = selectableEntries.length > 0 && selectableEntries.every((entry) => selectedIds.includes(entry.id));

    const destinationOptions = (entry: ProductionLineReturn) => {
        const depot = depots.find((candidate: any) => candidate.id === entry.returnPosition.depositoId);
        return (depot?.positions ?? []).filter((position: any) => position.activo !== false && position.id !== entry.returnPositionId);
    };

    const toggle = (id: string) => {
        setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    };

    const submit = async () => {
        const selected = selectedIds.map((id) => entriesById.get(id)).filter(Boolean) as ProductionLineReturn[];
        if (!selected.length) {
            setMessage({ severity: 'error', text: 'Marcá al menos un material que esté físicamente en la zona de devolución.' });
            return;
        }
        const missing = selected.find((entry) => !entry.suggestedPosition && !destinations[entry.id]);
        if (missing) {
            setMessage({ severity: 'error', text: `${missing.item.codigoInterno} ya no está en Picking. Elegí su posición destino.` });
            return;
        }
        try {
            await receive({
                lines: selected.map((entry) => ({
                    returnId: entry.id,
                    destinationPositionId: entry.suggestedPosition?.id ?? destinations[entry.id],
                })),
            }).unwrap();
            setSelectedIds([]);
            setDestinations({});
            setMessage({ severity: 'success', text: `${selected.length} devolución${selected.length === 1 ? '' : 'es'} ingresada${selected.length === 1 ? '' : 's'} al stock.` });
        } catch (error: any) {
            setMessage({ severity: 'error', text: errorText(error) });
        }
    };

    const confirmCancellation = async () => {
        if (!cancelTarget || !cancelReason.trim()) return;
        try {
            await cancelReturn({ id: cancelTarget.id, reason: cancelReason.trim() }).unwrap();
            setCancelTarget(null);
            setCancelReason('');
            setMessage({ severity: 'success', text: 'Devolución anulada y stock compensado.' });
        } catch (error: any) {
            setMessage({ severity: 'error', text: errorText(error) });
        }
    };

    return <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1150, mx: 'auto' }}>
        <PageHeader title="Control de devoluciones" subtitle="Depósito confirma lo encontrado en la zona de devolución y recién entonces lo incorpora al stock." />
        {message && <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>}

        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, mb: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <TextField fullWidth size="small" label="Buscar material, lote o remito" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} />
                <TextField select size="small" label="Estado" value={status} onChange={(event) => { setStatus(event.target.value as ProductionLineReturnStatus | ''); setPage(0); setSelectedIds([]); }} sx={{ minWidth: 210 }}>
                    <MenuItem value="DECLARED">Pendientes</MenuItem>
                    <MenuItem value="POSTED">Ingresadas a stock</MenuItem>
                    <MenuItem value="CANCELLED">Anuladas</MenuItem>
                    <MenuItem value="">Todas</MenuItem>
                </TextField>
            </Stack>
        </Paper>

        {status === 'DECLARED' && selectableEntries.length > 0 && <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 3, mb: 1.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
                <FormControlLabel control={<Checkbox checked={allSelected} onChange={() => setSelectedIds(allSelected ? [] : selectableEntries.map((entry) => entry.id))} />} label="Marcar todo lo que está físicamente" />
                <Button variant="contained" startIcon={<MoveToInboxOutlinedIcon />} disabled={receiveState.isLoading || !selectedIds.length} onClick={submit}>
                    {receiveState.isLoading ? 'Ingresando...' : `Confirmar ${selectedIds.length || ''}`}
                </Button>
            </Stack>
        </Paper>}

        {returnsQuery.isLoading ? <PageLoader text="Cargando devoluciones..." /> : !entries.length ? <Alert severity="success">No hay devoluciones para este filtro.</Alert> : <Stack spacing={1.25}>
            {entries.map((entry) => {
                const pending = entry.status === 'DECLARED';
                return <Paper key={entry.id} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3 }}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                        {pending && <Checkbox checked={selectedIds.includes(entry.id)} onChange={() => toggle(entry.id)} sx={{ p: 0.5 }} />}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                                <Box>
                                    <Typography fontWeight={900}>{entry.item.codigoInterno} · {entry.item.descripcion}</Typography>
                                    <Typography variant="body2" color="text.secondary">{Number(entry.quantity).toFixed(3)} {entry.item.unidadPrincipal} · Lote {entry.batch.lotNumber}</Typography>
                                    <Typography variant="caption" color="text.secondary">Remito {entry.sourceDocument.numero} · Declaró {entry.declaredBy || 'Usuario'} · {new Date(entry.createdAt).toLocaleString('es-AR')}</Typography>
                                </Box>
                                <Chip size="small" color={entry.status === 'POSTED' ? 'success' : entry.status === 'CANCELLED' ? 'default' : 'warning'} label={statusLabel[entry.status]} />
                            </Stack>

                            {pending && <Box sx={{ mt: 1.5 }}>
                                {entry.suggestedPosition ? <Alert severity="success" icon={false}>Destino automático: <strong>{entry.suggestedPosition.codigo}</strong>, porque ahí ya existe el material.</Alert> : <TextField
                                    fullWidth
                                    select
                                    required
                                    size="small"
                                    label="Posición destino"
                                    value={destinations[entry.id] ?? ''}
                                    onChange={(event) => setDestinations((current) => ({ ...current, [entry.id]: event.target.value }))}
                                    helperText="No queda este material en Picking; elegí dónde guardarlo."
                                >
                                    {destinationOptions(entry).map((position: any) => <MenuItem key={position.id} value={position.id}>{position.codigo} · {position.categoriaPrincipal || position.categoria}</MenuItem>)}
                                </TextField>}
                            </Box>}
                            {entry.status === 'POSTED' && <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>Ingresada en {entry.destinationPosition?.codigo || 'posición'} por {entry.postedBy || 'Depósito'} el {entry.postedAt ? new Date(entry.postedAt).toLocaleString('es-AR') : ''}.</Typography>}
                            {entry.status === 'CANCELLED' && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Motivo: {entry.cancellationReason || 'Sin detalle'}.</Typography>}
                            {canCancel && entry.status !== 'CANCELLED' && <Button size="small" color="error" sx={{ mt: 1 }} onClick={() => { setCancelTarget(entry); setCancelReason(''); }}>Anular</Button>}
                        </Box>
                    </Stack>
                </Paper>;
            })}
        </Stack>}

        <TablePagination
            component="div"
            count={returnsQuery.data?.total ?? 0}
            page={page}
            onPageChange={(_, value) => { setPage(value); setSelectedIds([]); }}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); setSelectedIds([]); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Por página"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />

        <Dialog open={Boolean(cancelTarget)} onClose={() => !cancelState.isLoading && setCancelTarget(null)} fullScreen={isMobile} fullWidth maxWidth="sm">
            <DialogTitle>Anular devolución</DialogTitle>
            <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
                <Alert severity="warning">Si ya ingresó a stock, el sistema descontará la misma cantidad de {cancelTarget?.destinationPosition?.codigo}. Si el material ya fue movido, la anulación será rechazada.</Alert>
                <TextField required multiline minRows={3} label="Motivo" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
            </Stack></DialogContent>
            <DialogActions><Button onClick={() => setCancelTarget(null)}>Cancelar</Button><Button color="error" variant="contained" disabled={cancelState.isLoading || !cancelReason.trim()} onClick={confirmCancellation}>{cancelState.isLoading ? 'Anulando...' : 'Confirmar anulación'}</Button></DialogActions>
        </Dialog>
    </Box>;
}
