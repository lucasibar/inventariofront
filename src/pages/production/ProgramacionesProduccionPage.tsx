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
    Grid,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { Add, Block, CheckCircle, Edit, Save } from '@mui/icons-material';
import { Card, PageHeader, PageLoader } from '../../shared/ui';
import {
    type ProductionScheduleLine,
    type ProductionScheduleStatus,
    useCreateProductionScheduleLineMutation,
    useCreateActualProductionMutation,
    useGetProductionActualsQuery,
    useGetProductionScheduleQuery,
    useGetProductionSchedulesQuery,
    useUpdateProductionScheduleLineMutation,
    useUpdateProductionScheduleStatusMutation,
} from '../../entities/production/api/production.api';
import { PaginationControls, useClientPagination } from '../../shared/pagination';

const localDate = (days = 0) => {
    const value = new Date();
    value.setDate(value.getDate() + days);
    const offset = value.getTimezoneOffset() * 60_000;
    return new Date(value.getTime() - offset).toISOString().slice(0, 10);
};

const statusLabels: Record<ProductionScheduleStatus, string> = {
    DRAFT: 'Borrador',
    VALIDATED: 'Validada',
    RELEASED: 'Liberada',
    IN_PROGRESS: 'En producción',
    CLOSED: 'Cerrada',
    ANNULLED: 'Anulada',
};

interface LineDraft {
    plannedHours: string;
    changeMinutes: string;
    plannedDozens: string;
}

function draftFromLine(line: ProductionScheduleLine): LineDraft {
    return {
        plannedHours: line.plannedSeconds === null ? '' : String(Math.round((line.plannedSeconds / 3600) * 100) / 100),
        changeMinutes: String(Math.round((line.plannedChangeSeconds / 60) * 100) / 100),
        plannedDozens: line.plannedGoodSocks === null ? '' : String(Math.round((line.plannedGoodSocks / 24) * 100) / 100),
    };
}

export default function ProgramacionesProduccionPage() {
    const [from, setFrom] = useState(localDate(-7));
    const [to, setTo] = useState(localDate(14));
    const [selectedId, setSelectedId] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<LineDraft>({ plannedHours: '', changeMinutes: '', plannedDozens: '' });
    const [addOpen, setAddOpen] = useState(false);
    const [newLine, setNewLine] = useState({ machineNumber: '', shift: 'M', articleCode: '', area: '', plannedHours: '12', changeMinutes: '0' });

    const { data: schedules = [], isLoading: isLoadingList } = useGetProductionSchedulesQuery({ from, to });
    const { data: schedule, isLoading: isLoadingDetail } = useGetProductionScheduleQuery(selectedId, { skip: !selectedId });
    const { data: actuals = [] } = useGetProductionActualsQuery(selectedId, { skip: !selectedId });
    const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateProductionScheduleStatusMutation();
    const [updateLine, { isLoading: isUpdatingLine }] = useUpdateProductionScheduleLineMutation();
    const [createLine, { isLoading: isCreatingLine }] = useCreateProductionScheduleLineMutation();
    const [createActual, { isLoading: isConfirmingActual }] = useCreateActualProductionMutation();
    const schedulePagination = useClientPagination(schedules, 10);

    useEffect(() => {
        if (!selectedId && schedules.length > 0) setSelectedId(schedules[0].id);
        if (selectedId && schedules.length > 0 && !schedules.some((item) => item.id === selectedId)) setSelectedId(schedules[0].id);
    }, [schedules, selectedId]);

    const activeLines = useMemo(() => schedule?.lines?.filter((line) => line.active) ?? [], [schedule]);
    const pendingMatches = activeLines.filter((line) => line.matchStatus === 'NEEDS_REVIEW').length;
    const readOnly = schedule?.status === 'CLOSED' || schedule?.status === 'ANNULLED';
    const actualByLine = useMemo(() => {
        const result = new Map<string, number>();
        actuals.forEach((actual) => {
            if (actual.scheduleLineId) result.set(actual.scheduleLineId, (result.get(actual.scheduleLineId) ?? 0) + actual.goodSocks);
        });
        return result;
    }, [actuals]);

    const beginEdit = (line: ProductionScheduleLine) => {
        setEditingId(line.id);
        setDraft(draftFromLine(line));
    };

    const saveLine = async (line: ProductionScheduleLine) => {
        await updateLine({
            id: line.id,
            plannedSeconds: draft.plannedHours === '' ? null : Math.max(0, Math.round(Number(draft.plannedHours) * 3600)),
            plannedChangeSeconds: Math.max(0, Math.round(Number(draft.changeMinutes || 0) * 60)),
            plannedGoodSocks: draft.plannedDozens === '' ? null : Math.max(0, Math.round(Number(draft.plannedDozens) * 24)),
        }).unwrap();
        setEditingId(null);
    };

    const toggleLine = async (line: ProductionScheduleLine) => {
        if (line.active && !window.confirm(`¿Anular la línea de la máquina ${line.machineNumberSnapshot}? No se borrará el historial.`)) return;
        await updateLine({ id: line.id, active: !line.active }).unwrap();
    };

    const submitNewLine = async () => {
        if (!schedule || !newLine.machineNumber || !newLine.shift) return;
        await createLine({
            scheduleId: schedule.id,
            machineNumber: Number(newLine.machineNumber),
            shift: newLine.shift,
            articleCode: newLine.articleCode || null,
            area: newLine.area || null,
            plannedSeconds: newLine.plannedHours === '' ? null : Math.round(Number(newLine.plannedHours) * 3600),
            plannedChangeSeconds: Math.round(Number(newLine.changeMinutes || 0) * 60),
        }).unwrap();
        setAddOpen(false);
        setNewLine({ machineNumber: '', shift: 'M', articleCode: '', area: '', plannedHours: '12', changeMinutes: '0' });
    };

    const confirmAsPlanned = async (line: ProductionScheduleLine) => {
        if (!schedule || line.plannedGoodSocks === null) return;
        if (!window.confirm(`¿Confirmar que la máquina ${line.machineNumberSnapshot} produjo lo planificado (${(line.plannedGoodSocks / 24).toFixed(2)} docenas)?`)) return;
        await createActual({
            recordDate: schedule.planDate,
            shift: line.shift,
            machineNumber: line.machineNumberSnapshot,
            scheduleLineId: line.id,
            articleId: line.articleId,
            goodSocks: line.plannedGoodSocks,
            secondSocks: 0,
            secondMechanicalSocks: 0,
            sourceType: 'PLAN_CONFIRMATION',
            sourceReference: `schedule:${schedule.id}:line:${line.id}`,
            notes: 'Confirmado desde la programación como producido según plan.',
        }).unwrap();
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title="Programaciones de Tejeduría"
                subtitle="Historial, corrección y anulación controlada de las órdenes cargadas. Nada se elimina físicamente."
            />

            <Grid container spacing={2}>
                <Grid size={{ xs: 12, lg: 3 }}>
                    <Card style={{ padding: '16px' }}>
                        <Grid container spacing={1.5} sx={{ mb: 2 }}>
                            <Grid size={{ xs: 6 }}><TextField label="Desde" type="date" value={from} onChange={(event) => setFrom(event.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid size={{ xs: 6 }}><TextField label="Hasta" type="date" value={to} onChange={(event) => setTo(event.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} /></Grid>
                        </Grid>
                        {isLoadingList ? <PageLoader text="Cargando programaciones..." /> : schedules.length === 0 ? (
                            <Alert severity="info">No hay programaciones en este período.</Alert>
                        ) : schedulePagination.pageItems.map((item) => (
                            <Button
                                key={item.id}
                                fullWidth
                                onClick={() => setSelectedId(item.id)}
                                sx={{
                                    display: 'block', textAlign: 'left', mb: 1, p: 1.5, borderRadius: 2,
                                    bgcolor: selectedId === item.id ? 'rgba(99,102,241,.18)' : 'var(--bg-alt-row, rgba(255,255,255,.03))',
                                    border: selectedId === item.id ? '1px solid #6366f1' : '1px solid transparent',
                                    color: 'inherit', textTransform: 'none',
                                }}
                            >
                                <Typography fontWeight={800}>{item.planDate}</Typography>
                                <Typography variant="caption" color="text.secondary">Revisión {item.revision} · {statusLabels[item.status]} · {item.linesCount ?? 0} líneas</Typography>
                            </Button>
                        ))}
                        <PaginationControls count={schedules.length} page={schedulePagination.page} pageSize={schedulePagination.pageSize} onPageChange={schedulePagination.setPage} onPageSizeChange={(value) => { schedulePagination.setPageSize(value); schedulePagination.setPage(0); }} />
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, lg: 9 }}>
                    {isLoadingDetail ? <PageLoader text="Cargando detalle..." /> : !schedule ? (
                        <Card style={{ padding: '24px' }}><Alert severity="info">Elegí una programación para ver el detalle.</Alert></Card>
                    ) : (
                        <Card style={{ padding: '18px' }}>
                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={800}>Fecha {schedule.planDate} · revisión {schedule.revision}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {activeLines.length} líneas activas · {pendingMatches} artículo(s) por revisar
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <TextField
                                        select
                                        size="small"
                                        label="Estado"
                                        value={schedule.status}
                                        disabled={schedule.status === 'ANNULLED' || isUpdatingStatus}
                                        onChange={(event) => updateStatus({ id: schedule.id, status: event.target.value as ProductionScheduleStatus })}
                                        sx={{ minWidth: 165 }}
                                    >
                                        {(Object.keys(statusLabels) as ProductionScheduleStatus[]).map((status) => <MenuItem key={status} value={status}>{statusLabels[status]}</MenuItem>)}
                                    </TextField>
                                    <Button startIcon={<Add />} variant="contained" disabled={readOnly} onClick={() => setAddOpen(true)}>Agregar línea</Button>
                                </Box>
                            </Box>

                            {schedule.notes && <Alert severity="warning" sx={{ mb: 2 }}>{schedule.notes}</Alert>}
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                Origen: {schedule.sourceFiles?.map((file) => file.fileName).join(', ') || 'carga manual'}
                            </Typography>

                            <TableContainer>
                                <Table size="small" sx={{ minWidth: 980 }}>
                                    <TableHead><TableRow>
                                        <TableCell>Máquina</TableCell><TableCell>Área / turno</TableCell><TableCell>Artículo</TableCell><TableCell>Horas plan</TableCell><TableCell>Cambio min</TableCell><TableCell>Docenas plan</TableCell><TableCell>Producción real</TableCell><TableCell>Match</TableCell><TableCell align="right">Acciones</TableCell>
                                    </TableRow></TableHead>
                                    <TableBody>{schedule.lines?.map((line) => {
                                        const editing = editingId === line.id;
                                        return (
                                            <TableRow key={line.id} sx={{ opacity: line.active ? 1 : 0.45 }}>
                                                <TableCell><strong>{line.machineNumberSnapshot}</strong></TableCell>
                                                <TableCell>Área {line.area || '—'} · {line.shift}</TableCell>
                                                <TableCell>{line.articleCodeSnapshot || 'Sin artículo'}<br /><Typography variant="caption" color="text.secondary">{line.articleDescriptionSnapshot || ''}</Typography></TableCell>
                                                <TableCell>{editing ? <TextField size="small" type="number" value={draft.plannedHours} onChange={(event) => setDraft({ ...draft, plannedHours: event.target.value })} sx={{ width: 90 }} /> : ((line.plannedSeconds ?? 0) / 3600).toFixed(2)}</TableCell>
                                                <TableCell>{editing ? <TextField size="small" type="number" value={draft.changeMinutes} onChange={(event) => setDraft({ ...draft, changeMinutes: event.target.value })} sx={{ width: 90 }} /> : (line.plannedChangeSeconds / 60).toFixed(1)}</TableCell>
                                                <TableCell>{editing ? <TextField size="small" type="number" value={draft.plannedDozens} onChange={(event) => setDraft({ ...draft, plannedDozens: event.target.value })} sx={{ width: 100 }} /> : line.plannedGoodSocks === null ? '—' : (line.plannedGoodSocks / 24).toFixed(2)}</TableCell>
                                                <TableCell>
                                                    {actualByLine.has(line.id) ? (
                                                        <Chip size="small" color="success" icon={<CheckCircle />} label={`${((actualByLine.get(line.id) ?? 0) / 24).toFixed(2)} doc.`} />
                                                    ) : (
                                                        <Button size="small" disabled={readOnly || !line.active || line.plannedGoodSocks === null || isConfirmingActual} onClick={() => confirmAsPlanned(line)}>Confirmar plan</Button>
                                                    )}
                                                </TableCell>
                                                <TableCell><Chip size="small" color={line.matchStatus === 'EXACT' ? 'success' : line.matchStatus === 'HEURISTIC' ? 'warning' : 'error'} label={line.matchStatus === 'EXACT' ? 'Exacto' : line.matchStatus === 'HEURISTIC' ? 'Revisar' : 'Sin match'} /></TableCell>
                                                <TableCell align="right">
                                                    {editing ? (
                                                        <Button size="small" startIcon={<Save />} disabled={isUpdatingLine} onClick={() => saveLine(line)}>Guardar</Button>
                                                    ) : (
                                                        <Button size="small" startIcon={<Edit />} disabled={readOnly || !line.active} onClick={() => beginEdit(line)}>Editar</Button>
                                                    )}
                                                    <Button size="small" color={line.active ? 'error' : 'success'} startIcon={<Block />} disabled={readOnly || isUpdatingLine} onClick={() => toggleLine(line)}>{line.active ? 'Anular' : 'Reactivar'}</Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}</TableBody>
                                </Table>
                            </TableContainer>
                        </Card>
                    )}
                </Grid>
            </Grid>

            <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Agregar línea a la programación</DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>Si el código de artículo existe, se vinculará su estructura de materiales automáticamente. Si no existe, quedará marcado para revisar.</Alert>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}><TextField label="Máquina" type="number" fullWidth value={newLine.machineNumber} onChange={(event) => setNewLine({ ...newLine, machineNumber: event.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField select label="Turno" fullWidth value={newLine.shift} onChange={(event) => setNewLine({ ...newLine, shift: event.target.value })}><MenuItem value="M">Día / Mañana</MenuItem><MenuItem value="N">Noche</MenuItem></TextField></Grid>
                        <Grid size={{ xs: 8 }}><TextField label="Código de artículo" fullWidth value={newLine.articleCode} onChange={(event) => setNewLine({ ...newLine, articleCode: event.target.value })} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField label="Área" fullWidth value={newLine.area} onChange={(event) => setNewLine({ ...newLine, area: event.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField label="Horas planificadas" type="number" fullWidth value={newLine.plannedHours} onChange={(event) => setNewLine({ ...newLine, plannedHours: event.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField label="Cambio (minutos)" type="number" fullWidth value={newLine.changeMinutes} onChange={(event) => setNewLine({ ...newLine, changeMinutes: event.target.value })} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions><Button onClick={() => setAddOpen(false)}>Cancelar</Button><Button variant="contained" disabled={!newLine.machineNumber || isCreatingLine} onClick={submitNewLine}>Agregar</Button></DialogActions>
            </Dialog>
        </Box>
    );
}
