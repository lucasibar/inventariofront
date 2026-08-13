import { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, TextField, Card as MuiCard, CardContent,
    Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, IconButton, Collapse, Dialog, DialogTitle, DialogContent,
    DialogActions, Button, FormGroup, FormControlLabel, Checkbox, Grid, Tooltip
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { PageHeader, Spinner, Select } from '../../shared/ui';
import {
    useGetPlantsQuery,
    useGetMachineChangeReportQuery,
    useUpdateMachineChangeMutation,
    useDeleteMachineChangeMutation,
} from '../../entities/maintenance/api/maintenance.api';
import { CHANGE_TYPES, CHANGE_TYPE_COLORS } from '../../features/maintenance/constants/maintenanceConstants';

interface EditData {
    id: string;
    changeTypes: string[];
    startTime: string;
    endTime: string;
    observation: string;
    generatedBy: string;
}

function CombinationRow({ row, onEdit, onDelete }: { row: any; onEdit: (d: EditData) => void; onDelete: (id: string) => void }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <TableRow
                hover
                onClick={() => setOpen(!open)}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#1a2332' }, bgcolor: open ? '#1a2332' : 'transparent' }}
            >
                <TableCell sx={{ borderBottom: '1px solid var(--border-dynamic, #1f2937)', width: 40, p: 1 }}>
                    <IconButton size="small" sx={{ color: 'var(--text-white-dynamic, white)' }}>
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ borderBottom: '1px solid var(--border-dynamic, #1f2937)' }}>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {row.combination.map((ct: string) => (
                            <Chip key={ct}
                                label={CHANGE_TYPES.find(c => c.value === ct)?.label || ct}
                                size="small"
                                sx={{
                                    bgcolor: (CHANGE_TYPE_COLORS[ct] || '#666') + '33',
                                    color: CHANGE_TYPE_COLORS[ct] || 'var(--text-white-dynamic, #fff)',
                                    fontWeight: 600, fontSize: '0.75rem'
                                }}
                            />
                        ))}
                    </Box>
                </TableCell>
                <TableCell align="center" sx={{ borderBottom: '1px solid var(--border-dynamic, #1f2937)', color: 'var(--text-white-dynamic, white)', fontWeight: 700, fontSize: '1.1rem' }}>
                    {row.count}
                </TableCell>
                <TableCell align="center" sx={{ borderBottom: '1px solid var(--border-dynamic, #1f2937)' }}>
                    <Chip label={`${row.percentage}%`} size="small" sx={{
                        bgcolor: row.percentage > 20 ? '#ef444433' : row.percentage > 10 ? '#f59e0b33' : '#10b98133',
                        color: row.percentage > 20 ? '#ef4444' : row.percentage > 10 ? '#f59e0b' : '#10b981',
                        fontWeight: 700
                    }} />
                </TableCell>
                <TableCell align="center" sx={{ borderBottom: '1px solid var(--border-dynamic, #1f2937)', color: '#60a5fa', fontWeight: 600 }}>
                    {row.avgDurationFormatted}
                </TableCell>
                <TableCell align="center" sx={{ borderBottom: '1px solid var(--border-dynamic, #1f2937)', color: '#a855f7', fontWeight: 600 }}>
                    {row.medianDurationFormatted}
                </TableCell>
                <TableCell align="center" sx={{ borderBottom: '1px solid var(--border-dynamic, #1f2937)', color: 'rgba(255,255,255,0.5)' }}>
                    {row.minDurationFormatted}
                </TableCell>
                <TableCell align="center" sx={{ borderBottom: '1px solid var(--border-dynamic, #1f2937)', color: 'rgba(255,255,255,0.5)' }}>
                    {row.maxDurationFormatted}
                </TableCell>
            </TableRow>

            <TableRow>
                <TableCell colSpan={8} sx={{ p: 0, borderBottom: open ? '1px solid var(--border-dynamic, #1f2937)' : 'none' }}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, bgcolor: '#0d1520' }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(255,255,255,0.7)' }}>
                                Detalle de cambios — {row.combinationLabel}
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid var(--border-dynamic, #1f2937)' }}>Máquina</TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid var(--border-dynamic, #1f2937)' }}>Planta</TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid var(--border-dynamic, #1f2937)' }}>Inicio</TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid var(--border-dynamic, #1f2937)' }}>Arranque</TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid var(--border-dynamic, #1f2937)' }}>Duración</TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid var(--border-dynamic, #1f2937)' }}>Obs.</TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid var(--border-dynamic, #1f2937)' }}>Por</TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid var(--border-dynamic, #1f2937)', width: 80 }}>Acciones</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {row.details.map((d: any) => (
                                        <TableRow key={d.id} hover sx={{ '&:hover': { bgcolor: 'var(--bg-secondary, #111827)' } }}>
                                            <TableCell sx={{ color: 'var(--text-white-dynamic, white)', borderBottom: '1px solid #1a2332', fontWeight: 600 }}>
                                                Máq. {d.machineNumber}
                                            </TableCell>
                                            <TableCell sx={{ color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid #1a2332' }}>
                                                {d.plantName}
                                            </TableCell>
                                            <TableCell sx={{ color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid #1a2332' }}>
                                                {new Date(d.startTime).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                                            </TableCell>
                                            <TableCell sx={{ color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid #1a2332' }}>
                                                {new Date(d.endTime).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                                            </TableCell>
                                            <TableCell sx={{ color: '#60a5fa', borderBottom: '1px solid #1a2332', fontWeight: 600 }}>
                                                {d.durationFormatted}
                                            </TableCell>
                                            <TableCell sx={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid #1a2332', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {d.observation || '—'}
                                            </TableCell>
                                            <TableCell sx={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid #1a2332' }}>
                                                {d.generatedBy}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #1a2332' }}>
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <Tooltip title="Editar">
                                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(d); }} sx={{ color: '#60a5fa' }}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Eliminar">
                                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(d.id); }} sx={{ color: '#ef4444' }}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
}

export default function InformeCambiosPage() {
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const defaultEnd = useMemo(() => new Date().toISOString().split('T')[0], []);
    const defaultStart = useMemo(() => {
        const d = new Date(); d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    }, []);
    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(defaultEnd);

    // Edit modal state
    const [editOpen, setEditOpen] = useState(false);
    const [editData, setEditData] = useState<EditData | null>(null);
    const [editChangeTypes, setEditChangeTypes] = useState<string[]>([]);
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [editObservation, setEditObservation] = useState('');
    const [editGeneratedBy, setEditGeneratedBy] = useState('');

    const { data: plants = [], isLoading: loadingPlants } = useGetPlantsQuery();
    const { data: reportData, isLoading: loadingReport } = useGetMachineChangeReportQuery(
        { plantId: selectedPlantId || undefined, startDate, endDate },
        { skip: false }
    );
    const [updateChange, { isLoading: isUpdating }] = useUpdateMachineChangeMutation();
    const [deleteChange] = useDeleteMachineChangeMutation();

    useEffect(() => {
        if (plants.length > 0 && !selectedPlantId) {
            const derWill = plants.find((p: any) => p.name.toLowerCase().includes('der will'));
            setSelectedPlantId(derWill?.id || plants[0].id);
        }
    }, [plants, selectedPlantId]);

    const plantOptions = useMemo(() => [
        { value: '', label: 'Todas las plantas' },
        ...plants.map((p: any) => ({ value: p.id, label: p.name }))
    ], [plants]);

    const report = reportData?.report || [];
    const totalChanges = reportData?.totalChanges || 0;

    const totalAvgMs = useMemo(() => {
        if (report.length === 0) return 0;
        const totalMs = report.reduce((sum: number, r: any) => sum + r.avgDurationMs * r.count, 0);
        return totalChanges > 0 ? Math.round(totalMs / totalChanges) : 0;
    }, [report, totalChanges]);

    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const hrs = Math.floor(mins / 60);
        if (hrs > 0) return `${hrs}h ${mins % 60}m`;
        if (mins > 0) return `${mins}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    const mostCommon = report.length > 0 ? report[0] : null;

    // Edit handlers
    const openEdit = (d: EditData) => {
        setEditData(d);
        setEditChangeTypes([...d.changeTypes]);
        setEditStartTime(new Date(d.startTime).toISOString().slice(0, 16));
        setEditEndTime(new Date(d.endTime).toISOString().slice(0, 16));
        setEditObservation(d.observation || '');
        setEditGeneratedBy(d.generatedBy || '');
        setEditOpen(true);
    };

    const handleEditSave = async () => {
        if (!editData) return;
        try {
            await updateChange({
                id: editData.id,
                changeTypes: editChangeTypes,
                startTime: new Date(editStartTime).toISOString(),
                endTime: new Date(editEndTime).toISOString(),
                observation: editObservation,
                generatedBy: editGeneratedBy,
            }).unwrap();
            setEditOpen(false);
            setEditData(null);
        } catch (e) {
            console.error('Error updating change:', e);
            alert('Error al actualizar el cambio.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este cambio?')) return;
        try {
            await deleteChange(id).unwrap();
        } catch (e) {
            console.error('Error deleting change:', e);
        }
    };

    const toggleEditChangeType = (value: string) => {
        setEditChangeTypes(prev =>
            prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]
        );
    };

    if (loadingPlants) return <Spinner />;

    return (
        <Box sx={{ p: 3, maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader
                title="Informe de Cambios de Artículo"
                subtitle="Análisis de tiempos por combinación de cambio. Hacé click en una fila para ver el detalle."
            />

            {/* Filters */}
            <MuiCard sx={{ bgcolor: 'var(--bg-secondary, #111827)', borderRadius: 2, border: '1px solid var(--border-dynamic, #1f2937)', mb: 3 }}>
                <CardContent sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Select
                                label="Planta"
                                value={selectedPlantId || ''}
                                onChange={(val) => setSelectedPlantId(val || null)}
                                options={plantOptions}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField type="date" label="Desde" value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField type="date" label="Hasta" value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 2 }}>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                                {totalChanges} cambios
                            </Typography>
                        </Grid>
                    </Grid>
                </CardContent>
            </MuiCard>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <MuiCard sx={{ bgcolor: 'var(--bg-secondary, #111827)', borderRadius: 2, border: '1px solid var(--border-dynamic, #1f2937)' }}>
                        <CardContent>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1 }}>Total Cambios</Typography>
                            <Typography variant="h4" sx={{ color: 'var(--text-white-dynamic, white)', fontWeight: 700 }}>{totalChanges}</Typography>
                        </CardContent>
                    </MuiCard>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <MuiCard sx={{ bgcolor: 'var(--bg-secondary, #111827)', borderRadius: 2, border: '1px solid var(--border-dynamic, #1f2937)' }}>
                        <CardContent>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1 }}>Combinación Frecuente</Typography>
                            {mostCommon ? (
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                                    {mostCommon.combination.map((ct: string) => (
                                        <Chip key={ct} label={CHANGE_TYPES.find(c => c.value === ct)?.label || ct} size="small"
                                            sx={{ bgcolor: (CHANGE_TYPE_COLORS[ct] || '#666') + '33', color: CHANGE_TYPE_COLORS[ct] || 'var(--text-white-dynamic, #fff)' }} />
                                    ))}
                                </Box>
                            ) : (
                                <Typography variant="h6" sx={{ color: 'var(--text-white-dynamic, white)' }}>N/A</Typography>
                            )}
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                {mostCommon ? `${mostCommon.count} veces (${mostCommon.percentage}%)` : ''}
                            </Typography>
                        </CardContent>
                    </MuiCard>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <MuiCard sx={{ bgcolor: 'var(--bg-secondary, #111827)', borderRadius: 2, border: '1px solid var(--border-dynamic, #1f2937)' }}>
                        <CardContent>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1 }}>Promedio General</Typography>
                            <Typography variant="h4" sx={{ color: '#60a5fa', fontWeight: 700 }}>{formatDuration(totalAvgMs)}</Typography>
                        </CardContent>
                    </MuiCard>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <MuiCard sx={{ bgcolor: 'var(--bg-secondary, #111827)', borderRadius: 2, border: '1px solid var(--border-dynamic, #1f2937)' }}>
                        <CardContent>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1 }}>Mediana General</Typography>
                            <Typography variant="h4" sx={{ color: '#a855f7', fontWeight: 700 }}>{reportData?.totalMedianDurationFormatted || '0s'}</Typography>
                        </CardContent>
                    </MuiCard>
                </Grid>
            </Grid>

            {/* Table */}
            <TableContainer component={Paper} sx={{ bgcolor: 'var(--bg-secondary, #111827)', borderRadius: 2, border: '1px solid var(--border-dynamic, #1f2937)' }}>
                {loadingReport ? (
                    <Box sx={{ p: 4 }}><Spinner /></Box>
                ) : report.length === 0 ? (
                    <Typography variant="body1" sx={{ color: 'var(--text-white-dynamic, white)', textAlign: 'center', py: 4 }}>
                        No hay datos para el período seleccionado.
                    </Typography>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#0d1520' }}>
                                <TableCell sx={{ width: 40 }} />
                                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Combinación</TableCell>
                                <TableCell align="center" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Cantidad</TableCell>
                                <TableCell align="center" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>% Total</TableCell>
                                <TableCell align="center" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Tiempo Promedio</TableCell>
                                <TableCell align="center" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Mediana</TableCell>
                                <TableCell align="center" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Mínimo</TableCell>
                                <TableCell align="center" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Máximo</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {report.map((row: any, i: number) => (
                                <CombinationRow key={i} row={row} onEdit={openEdit} onDelete={handleDelete} />
                            ))}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>

            {/* Edit Modal */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'var(--bg-secondary, #111827)', color: 'var(--text-white-dynamic, white)' } }}>
                <DialogTitle>Editar Cambio</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <Box>
                            <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.7)' }}>Tipos de Cambio</Typography>
                            <FormGroup row sx={{ gap: 0.5 }}>
                                {CHANGE_TYPES.map((ct) => (
                                    <FormControlLabel
                                        key={ct.value}
                                        control={
                                            <Checkbox
                                                checked={editChangeTypes.includes(ct.value)}
                                                onChange={() => toggleEditChangeType(ct.value)}
                                                sx={{ color: CHANGE_TYPE_COLORS[ct.value], '&.Mui-checked': { color: CHANGE_TYPE_COLORS[ct.value] } }}
                                                size="small"
                                            />
                                        }
                                        label={
                                            <Chip label={ct.label} size="small" sx={{
                                                bgcolor: editChangeTypes.includes(ct.value) ? CHANGE_TYPE_COLORS[ct.value] + '33' : 'transparent',
                                                color: CHANGE_TYPE_COLORS[ct.value],
                                                border: `1px solid ${CHANGE_TYPE_COLORS[ct.value]}44`,
                                            }} />
                                        }
                                    />
                                ))}
                            </FormGroup>
                        </Box>
                        <TextField label="Inicio" type="datetime-local" value={editStartTime} onChange={e => setEditStartTime(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                        <TextField label="Arranque" type="datetime-local" value={editEndTime} onChange={e => setEditEndTime(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                        <TextField label="Observación" value={editObservation} onChange={e => setEditObservation(e.target.value)} multiline rows={2} fullWidth />
                        <TextField label="Registrado por" value={editGeneratedBy} onChange={e => setEditGeneratedBy(e.target.value)} fullWidth />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid var(--border-dynamic, #1f2937)' }}>
                    <Button onClick={() => setEditOpen(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>Cancelar</Button>
                    <Button variant="contained" onClick={handleEditSave} disabled={isUpdating} sx={{ bgcolor: '#1f6feb', '&:hover': { bgcolor: '#1a5cc7' } }}>
                        {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
