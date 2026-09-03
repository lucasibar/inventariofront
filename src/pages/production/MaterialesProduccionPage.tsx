import { useEffect, useMemo, useState } from 'react';
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
    Step,
    StepLabel,
    Stepper,
    TextField,
    Typography,
} from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../entities/auth/model/authSlice';
import { PageHeader, PageLoader, useIsMobile } from '../../shared/ui';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import {
    type ProductionMaterialRequestStatus,
    useCloseProductionScheduleMutation,
    useConsumeProductionMaterialsMutation,
    useCreateProductionMaterialRequestMutation,
    useDeliverProductionMaterialsMutation,
    useGetProductionMaterialRequestQuery,
    useGetProductionSchedulesQuery,
    useReadyProductionMaterialsMutation,
    useReserveProductionMaterialsMutation,
    useStartProductionPreparationMutation,
} from '../../entities/production/api/production.api';

const steps: Array<{ status: ProductionMaterialRequestStatus; label: string }> = [
    { status: 'REQUESTED', label: 'Solicitado' },
    { status: 'RESERVED', label: 'Reservado FIFO' },
    { status: 'PREPARING', label: 'Preparando' },
    { status: 'READY', label: 'Listo' },
    { status: 'DELIVERED', label: 'Entregado' },
    { status: 'CONSUMED', label: 'Consumido' },
];

const scheduleLabel = (schedule: any) => `${new Date(`${schedule.planDate}T12:00:00`).toLocaleDateString('es-AR')} · Rev. ${schedule.revision} · ${schedule.status}`;

export default function MaterialesProduccionPage() {
    const isMobile = useIsMobile();
    const user = useSelector(selectCurrentUser);
    const sector = user?.sector?.toUpperCase();
    const isProduction = user?.role?.toUpperCase() === 'ADMIN' || sector === 'PRODUCCION';
    const isWarehouse = user?.role?.toUpperCase() === 'ADMIN' || sector === 'DEPOSITO';
    const schedulesQuery = useGetProductionSchedulesQuery();
    const openSchedules = useMemo(() => (schedulesQuery.data ?? []).filter((schedule) => !['ANNULLED'].includes(schedule.status)), [schedulesQuery.data]);
    const [scheduleId, setScheduleId] = useState('');
    const [sourceDepotId, setSourceDepotId] = useState('');
    const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [consumptionOpen, setConsumptionOpen] = useState(false);
    const [consumption, setConsumption] = useState<Record<string, number>>({});
    const depotsQuery = useGetDepotsQuery();

    useEffect(() => {
        if (!scheduleId && openSchedules.length) setScheduleId(openSchedules[0].id);
    }, [openSchedules, scheduleId]);
    useEffect(() => {
        const depots = (depotsQuery.data ?? []).filter((depot: any) => depot.activo !== false);
        if (!sourceDepotId && depots.length === 1) setSourceDepotId(depots[0].id);
    }, [depotsQuery.data, sourceDepotId]);

    const requestQuery = useGetProductionMaterialRequestQuery(scheduleId, { skip: !scheduleId });
    const request = requestQuery.data;
    const selectedSchedule = openSchedules.find((schedule) => schedule.id === scheduleId);
    const [createRequest, createState] = useCreateProductionMaterialRequestMutation();
    const [reserve, reserveState] = useReserveProductionMaterialsMutation();
    const [startPreparation, preparationState] = useStartProductionPreparationMutation();
    const [markReady, readyState] = useReadyProductionMaterialsMutation();
    const [deliver, deliveryState] = useDeliverProductionMaterialsMutation();
    const [consume, consumeState] = useConsumeProductionMaterialsMutation();
    const [closeSchedule, closeState] = useCloseProductionScheduleMutation();
    const busy = createState.isLoading || reserveState.isLoading || preparationState.isLoading || readyState.isLoading || deliveryState.isLoading || consumeState.isLoading || closeState.isLoading;

    const run = async (operation: () => Promise<any>, success: string) => {
        setMessage(null);
        try { await operation(); setMessage({ severity: 'success', text: success }); }
        catch (error: any) { setMessage({ severity: 'error', text: error?.data?.message ?? 'No se pudo completar la operación.' }); }
    };

    const primaryAction = () => {
        if (!scheduleId) return null;
        if (!request) return isProduction
            ? <Button fullWidth={isMobile} variant="contained" disabled={busy || !sourceDepotId} startIcon={<Inventory2OutlinedIcon />} onClick={() => run(() => createRequest({ scheduleId, sourceDepotId }).unwrap(), 'Solicitud creada para Depósito.')}>Solicitar materiales</Button>
            : <Chip label="Esperando solicitud de Producción" />;
        if (request.status === 'REQUESTED') return isWarehouse ? <Button fullWidth={isMobile} variant="contained" disabled={busy} onClick={() => run(() => reserve(request.id).unwrap(), 'Stock reservado usando FIFO.')}>Reservar lotes FIFO</Button> : <Chip label="Esperando reserva de Depósito" />;
        if (request.status === 'RESERVED') return isWarehouse ? <Button fullWidth={isMobile} variant="contained" disabled={busy} onClick={() => run(() => startPreparation(request.id).unwrap(), 'Preparación iniciada.')}>Comenzar preparación</Button> : <Chip label="Reservado por Depósito" color="info" />;
        if (request.status === 'PREPARING') return isWarehouse ? <Button fullWidth={isMobile} variant="contained" color="success" disabled={busy} onClick={() => run(() => markReady(request.id).unwrap(), 'Materiales listos para entregar.')}>Marcar preparación lista</Button> : <Chip label="Depósito está preparando" color="info" />;
        if (request.status === 'READY') return isWarehouse ? <Button fullWidth={isMobile} variant="contained" color="success" disabled={busy} startIcon={<LocalShippingOutlinedIcon />} onClick={() => run(() => deliver(request.id).unwrap(), 'Materiales entregados a Producción y descontados del depósito.')}>Entregar a Producción</Button> : <Chip label="Listo para entregar" color="success" />;
        if (request.status === 'DELIVERED') return isProduction ? <Button fullWidth={isMobile} variant="contained" disabled={busy} onClick={() => { setConsumption(Object.fromEntries(request.lines.map((line) => [line.itemId, Number(line.deliveredKg)]))); setConsumptionOpen(true); }}>Registrar consumo real</Button> : <Chip label="Entregado a Producción" color="success" />;
        if (request.status === 'CONSUMED' && selectedSchedule?.status !== 'CLOSED') return isProduction ? <Button fullWidth={isMobile} variant="contained" color="success" disabled={busy} startIcon={<TaskAltOutlinedIcon />} onClick={() => run(() => closeSchedule(scheduleId).unwrap(), 'Orden cerrada y lotes producidos enviados a cuarentena de Calidad.')}>Cerrar orden y generar lotes</Button> : <Chip label="Consumo registrado" color="success" />;
        return <Chip color="success" icon={<TaskAltOutlinedIcon />} label="Recorrido completo" />;
    };

    const activeStep = request ? Math.max(0, steps.findIndex((step) => step.status === request.status)) : -1;
    return (
        <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1350, mx: 'auto' }}>
            <PageHeader title="Materiales para Producción" subtitle="Solicitud, reserva FIFO, preparación, entrega, consumo y cierre de la orden en un solo recorrido." />
            {message && <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>}
            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 3, mb: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
                    <TextField select fullWidth label="Programación / orden" value={scheduleId} onChange={(event) => { setScheduleId(event.target.value); setMessage(null); }}>
                        {openSchedules.map((schedule) => <MenuItem key={schedule.id} value={schedule.id}>{scheduleLabel(schedule)}</MenuItem>)}
                    </TextField>
                    {!request && <TextField select fullWidth label="Depósito que prepara" value={sourceDepotId} onChange={(event) => setSourceDepotId(event.target.value)}>
                        {(depotsQuery.data ?? []).filter((depot: any) => depot.activo !== false).map((depot: any) => <MenuItem key={depot.id} value={depot.id}>{depot.nombre}</MenuItem>)}
                    </TextField>}
                    <Box sx={{ minWidth: { md: 250 } }}>{primaryAction()}</Box>
                </Stack>
            </Paper>

            {schedulesQuery.isLoading || requestQuery.isLoading ? <PageLoader text="Cargando recorrido..." /> : !selectedSchedule ? <Alert severity="info">No hay programaciones disponibles.</Alert> : (
                <>
                    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3, mb: 2, overflowX: 'auto' }}>
                        <Stepper activeStep={activeStep} alternativeLabel={!isMobile} orientation={isMobile ? 'vertical' : 'horizontal'}>
                            {steps.map((step) => <Step key={step.status} completed={activeStep > steps.findIndex((candidate) => candidate.status === step.status)}><StepLabel>{step.label}</StepLabel></Step>)}
                        </Stepper>
                    </Paper>
                    {!request ? <Alert severity="info">Creá la solicitud para congelar la necesidad calculada y enviarla a Depósito.</Alert> : (
                        <Stack spacing={1.25}>
                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}><Typography variant="body2"><strong>Depósito:</strong> {request.sourceDepot?.nombre} · <strong>Estado:</strong> {steps.find((step) => step.status === request.status)?.label ?? request.status}</Typography></Paper>
                            {request.lines.map((line) => {
                                const progress = Number(line.requestedKg) > 0 ? Math.min(100, (Number(line.reservedKg) / Number(line.requestedKg)) * 100) : 0;
                                return <Paper key={line.id} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3 }}>
                                    <Stack direction="row" justifyContent="space-between" spacing={1}><Box><Typography fontWeight={900}>{line.item.codigoInterno} · {line.item.descripcion}</Typography><Typography variant="caption" color="text.secondary">Pedido {Number(line.requestedKg).toFixed(3)} kg · Entregado {Number(line.deliveredKg).toFixed(3)} kg · Consumido {Number(line.consumedKg).toFixed(3)} kg · Pendiente devolución {Number(line.pendingReturnKg ?? 0).toFixed(3)} kg</Typography></Box><Chip size="small" label={`${Number(line.reservedKg).toFixed(2)} kg reservados`} color={Number(line.reservedKg) >= Number(line.requestedKg) ? 'success' : 'default'} /></Stack>
                                    <LinearProgress variant="determinate" value={progress} sx={{ my: 1.25, height: 7, borderRadius: 5 }} />
                                    {line.allocations?.length > 0 && <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>{line.allocations.map((allocation) => <Chip key={allocation.id} size="small" variant="outlined" label={`FIFO ${allocation.lotNumberSnapshot}: ${Number(allocation.reservedKg).toFixed(3)} kg${allocation.position?.codigo ? ` · ${allocation.position.codigo}` : ''}`} />)}</Box>}
                                </Paper>;
                            })}
                        </Stack>
                    )}
                </>
            )}

            <Dialog open={consumptionOpen} onClose={() => !consumeState.isLoading && setConsumptionOpen(false)} fullScreen={isMobile} fullWidth maxWidth="sm">
                <DialogTitle>Registrar consumo real</DialogTitle>
                <DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}><Alert severity="info">Ingresá lo efectivamente consumido. No puede superar lo entregado.</Alert>{request?.lines.map((line) => <TextField key={line.id} label={`${line.item.codigoInterno} · kg consumidos`} type="number" value={consumption[line.itemId] ?? 0} onChange={(event) => setConsumption((current) => ({ ...current, [line.itemId]: Number(event.target.value) }))} inputProps={{ min: 0, max: Number(line.deliveredKg), step: 0.001 }} helperText={`Entregado: ${Number(line.deliveredKg).toFixed(3)} kg`} />)}</Stack></DialogContent>
                <DialogActions><Button onClick={() => setConsumptionOpen(false)}>Cancelar</Button><Button variant="contained" disabled={consumeState.isLoading || !request} onClick={() => request && run(() => consume({ id: request.id, lines: request.lines.map((line) => ({ itemId: line.itemId, consumedKg: Number(consumption[line.itemId] ?? 0) })) }).unwrap().then(() => setConsumptionOpen(false)), 'Consumo real registrado.')}>{consumeState.isLoading ? 'Guardando...' : 'Confirmar consumo'}</Button></DialogActions>
            </Dialog>
        </Box>
    );
}
