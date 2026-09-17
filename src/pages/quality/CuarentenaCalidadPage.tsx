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
import DoneAllIcon from '@mui/icons-material/DoneAll';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import { PageHeader, PageLoader, useIsMobile } from '../../shared/ui';
import {
    type QualityLot,
    useGetQualityLotsQuery,
    useReleaseQualityLotMutation,
    useGetQualityConfigQuery,
    useToggleQualityConfigMutation,
    useReleaseAllQualityLotsMutation,
} from '../../features/quality/lots/quality-lots.api';

export default function CuarentenaCalidadPage() {
    const isMobile = useIsMobile();
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [status, setStatus] = useState('QUARANTINE');
    const [query, setQuery] = useState('');
    const [target, setTarget] = useState<QualityLot | null>(null);
    const [notes, setNotes] = useState('');
    const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);
    const [confirmReleaseAllOpen, setConfirmReleaseAllOpen] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const lots = useGetQualityLotsQuery({ page: page + 1, pageSize, status: status || undefined, q: query || undefined });
    const { data: config, isLoading: loadingConfig } = useGetQualityConfigQuery();
    const [release, { isLoading: releasing }] = useReleaseQualityLotMutation();
    const [toggleConfig, { isLoading: togglingConfig }] = useToggleQualityConfigMutation();
    const [releaseAll, { isLoading: releasingAll }] = useReleaseAllQualityLotsMutation();

    const isQuarantineEnabled = Boolean(config?.quarantineEnabled);

    const submitReleaseSingle = async () => {
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

    const handleToggleQuarantine = async () => {
        try {
            const nextState = !isQuarantineEnabled;
            await toggleConfig({ enabled: nextState }).unwrap();
            setConfirmToggleOpen(false);
            setMessage({
                type: 'success',
                text: nextState
                    ? 'Cuarentena ACTIVADA. Los nuevos ingresos requerirán testeo previo a su liberación.'
                    : 'Cuarentena DESACTIVADA. La nueva mercadería entrará directamente liberada.',
            });
        } catch (error: any) {
            setMessage({ type: 'error', text: error?.data?.message ?? 'No se pudo actualizar la configuración de cuarentena.' });
        }
    };

    const handleReleaseAll = async () => {
        try {
            const res = await releaseAll().unwrap();
            setConfirmReleaseAllOpen(false);
            setMessage({
                type: 'success',
                text: `Se liberaron ${res.releasedCount} lote(s) correctamente. Ya están disponibles para Producción.`,
            });
        } catch (error: any) {
            setMessage({ type: 'error', text: error?.data?.message ?? 'No se pudo completar la liberación masiva.' });
        }
    };

    const summary = lots.data?.summary ?? { quarantine: 0, released: 0, total: 0 };
    const releasedPct = summary.total ? Math.round((summary.released / summary.total) * 100) : 100;

    return (
        <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1300, mx: 'auto' }}>
            <PageHeader
                title="Cuarentena y liberación"
                subtitle="Gestión del estado de calidad de lotes ingresados al sistema."
            />

            {message && (
                <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
                    {message.text}
                </Alert>
            )}

            {/* Banner de Estado del Módulo de Cuarentena */}
            <Paper
                variant="outlined"
                sx={{
                    p: 2,
                    mb: 2.5,
                    borderRadius: 3,
                    bgcolor: isQuarantineEnabled ? 'rgba(234, 179, 8, 0.05)' : 'rgba(56, 189, 248, 0.05)',
                    border: isQuarantineEnabled ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                }}
            >
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.5 }}>
                        <Chip
                            icon={<PowerSettingsNewIcon />}
                            label={isQuarantineEnabled ? 'Cuarentena: ACTIVADA' : 'Cuarentena: DESACTIVADA'}
                            color={isQuarantineEnabled ? 'warning' : 'info'}
                            size="small"
                            sx={{ fontWeight: 800 }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {isQuarantineEnabled
                                ? 'Control estricto activo'
                                : 'Ingreso directo liberado'}
                        </Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {isQuarantineEnabled
                            ? 'Los nuevos ingresos de mercadería quedan retenidos en cuarentena hasta su liberación manual.'
                            : 'La mercadería nueva entra directamente como testeada y liberada para producción y despachos.'}
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    {summary.quarantine > 0 && (
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<DoneAllIcon />}
                            onClick={() => setConfirmReleaseAllOpen(true)}
                            fullWidth={isMobile}
                            sx={{ fontWeight: 700 }}
                        >
                            Aprobar todos los pendientes ({summary.quarantine})
                        </Button>
                    )}

                    <Button
                        variant={isQuarantineEnabled ? 'outlined' : 'contained'}
                        color={isQuarantineEnabled ? 'warning' : 'primary'}
                        startIcon={<PowerSettingsNewIcon />}
                        onClick={() => setConfirmToggleOpen(true)}
                        disabled={loadingConfig || togglingConfig}
                        fullWidth={isMobile}
                        sx={{ fontWeight: 700 }}
                    >
                        {isQuarantineEnabled ? 'Desactivar Cuarentena' : 'Activar Cuarentena'}
                    </Button>
                </Stack>
            </Paper>

            {/* Métricas Resumen */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }, gap: 1.25, mb: 2 }}>
                <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 3 }}>
                    <Typography variant="caption" color="text.secondary">Esperando testeo</Typography>
                    <Typography variant="h4" fontWeight={900} color={summary.quarantine > 0 ? 'warning.main' : 'text.secondary'}>
                        {summary.quarantine}
                    </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 3 }}>
                    <Typography variant="caption" color="text.secondary">Liberados</Typography>
                    <Typography variant="h4" fontWeight={900} color="success.main">{summary.released}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 3, gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                    <Typography variant="caption" color="text.secondary">Disponibilidad aprobada</Typography>
                    <Typography variant="h4" fontWeight={900}>{releasedPct}%</Typography>
                    <LinearProgress variant="determinate" value={releasedPct} color="success" sx={{ mt: 0.75, height: 7, borderRadius: 5 }} />
                </Paper>
            </Box>

            {/* Filtros */}
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, mb: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                    <TextField
                        size="small"
                        fullWidth
                        label="Buscar lote o material"
                        value={query}
                        onChange={(event) => { setQuery(event.target.value); setPage(0); }}
                    />
                    <TextField
                        size="small"
                        select
                        label="Estado"
                        value={status}
                        onChange={(event) => { setStatus(event.target.value); setPage(0); }}
                        sx={{ minWidth: 190 }}
                    >
                        <MenuItem value="QUARANTINE">En cuarentena</MenuItem>
                        <MenuItem value="RELEASED">Liberados</MenuItem>
                        <MenuItem value="">Todos</MenuItem>
                    </TextField>
                </Stack>
            </Paper>

            {/* Listado de Lotes */}
            {lots.isLoading ? (
                <PageLoader text="Cargando lotes..." />
            ) : !lots.data?.data.length ? (
                <Alert severity="success">No hay lotes pendientes para este filtro.</Alert>
            ) : (
                <Stack spacing={1.25} sx={{ opacity: lots.isFetching ? 0.7 : 1 }}>
                    {lots.data.data.map((lot) => (
                        <Paper key={lot.id} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3 }}>
                            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography fontWeight={900}>{lot.item?.codigoInterno} · {lot.item?.descripcion}</Typography>
                                    <Typography variant="body2" color="text.secondary">Lote {lot.lotNumber} · {lot.supplier?.name || 'Sin proveedor'}</Typography>
                                </Box>
                                <Chip
                                    icon={lot.qualityStatus === 'RELEASED' ? <VerifiedOutlinedIcon /> : <ScienceOutlinedIcon />}
                                    label={lot.qualityStatus === 'RELEASED' ? 'Liberado' : 'Cuarentena'}
                                    color={lot.qualityStatus === 'RELEASED' ? 'success' : 'warning'}
                                    size="small"
                                />
                            </Stack>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mt: 1.5 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary">Stock físico</Typography>
                                    <Typography fontWeight={900}>{Number(lot.totalQtyPrincipal).toLocaleString('es-AR')} {lot.item?.unidadPrincipal}</Typography>
                                </Box>
                                <Box sx={{ flex: 2 }}>
                                    <Typography variant="caption" color="text.secondary">Ubicación</Typography>
                                    <Typography variant="body2">
                                        {lot.locations.map((location) => `${location.deposito || 'Depósito'} / ${location.posicion || 's/p'}`).join(' · ')}
                                    </Typography>
                                </Box>
                                {lot.qualityStatus === 'QUARANTINE' && (
                                    <Button
                                        fullWidth={isMobile}
                                        variant="contained"
                                        color="success"
                                        startIcon={<VerifiedOutlinedIcon />}
                                        onClick={() => { setTarget(lot); setNotes(''); setMessage(null); }}
                                    >
                                        Marcar testeado y liberar
                                    </Button>
                                )}
                            </Stack>
                            {lot.qualityTestedAt && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                    Liberado por {lot.qualityTestedBy || 'Usuario'} el {new Date(lot.qualityTestedAt).toLocaleString('es-AR')}
                                    {lot.qualityNotes ? ` (${lot.qualityNotes})` : ''}
                                </Typography>
                            )}
                        </Paper>
                    ))}
                </Stack>
            )}

            <TablePagination
                component="div"
                count={lots.data?.total ?? 0}
                page={page}
                onPageChange={(_, value) => setPage(value)}
                rowsPerPage={pageSize}
                onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage="Por página"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />

            {/* Modal para Liberar Lote Individual */}
            <Dialog open={Boolean(target)} onClose={() => !releasing && setTarget(null)} fullScreen={isMobile} fullWidth maxWidth="sm">
                <DialogTitle>Liberar lote {target?.lotNumber}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <Alert severity="info">Confirmás que este lote fue testeado. Desde ese momento Producción podrá consumirlo.</Alert>
                        <TextField
                            label="Resultado / observación (opcional)"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            multiline
                            minRows={3}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTarget(null)}>Cancelar</Button>
                    <Button variant="contained" color="success" disabled={releasing} onClick={submitReleaseSingle}>
                        {releasing ? 'Liberando...' : 'Confirmar liberación'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal de Confirmación para Activar / Desactivar Cuarentena */}
            <Dialog open={confirmToggleOpen} onClose={() => !togglingConfig && setConfirmToggleOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {isQuarantineEnabled ? '¿Desactivar Cuarentena de Calidad?' : '¿Activar Cuarentena de Calidad?'}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                        {isQuarantineEnabled
                            ? 'Al desactivar la cuarentena, toda la mercadería nueva que ingrese al sistema por remito de entrada o ajuste entrará directamente testeada y liberada para producción y ventas.'
                            : 'Al activar la cuarentena, toda la mercadería que ingrese a partir de ahora quedará retenida en estado "En cuarentena" hasta que un usuario autorizado la testee y libere.'}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmToggleOpen(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        color={isQuarantineEnabled ? 'warning' : 'primary'}
                        disabled={togglingConfig}
                        onClick={handleToggleQuarantine}
                    >
                        {togglingConfig
                            ? 'Guardando...'
                            : isQuarantineEnabled
                            ? 'Confirmar desactivación'
                            : 'Confirmar activación'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal de Confirmación para Liberación Masiva */}
            <Dialog open={confirmReleaseAllOpen} onClose={() => !releasingAll && setConfirmReleaseAllOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>¿Aprobar todos los lotes pendientes?</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mt: 1, mb: 2 }}>
                        Esta acción marcará como <strong>LIBERADOS</strong> todos los lotes que actualmente se encuentran en cuarentena ({summary.quarantine} lote/s).
                    </Alert>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Toda la mercadería quedará habilitada inmediatamente para consumos de producción y remitos de salida.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmReleaseAllOpen(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        color="success"
                        disabled={releasingAll}
                        onClick={handleReleaseAll}
                    >
                        {releasingAll ? 'Liberando todos...' : 'Aprobar y liberar todos'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
