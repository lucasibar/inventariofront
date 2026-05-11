import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Box, Typography, Card, Chip, TextField, Grid, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, MenuItem, useTheme
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { PageHeader, Spinner, Select } from '../../../shared/ui';
import { 
    useGetLogsQuery, 
    useGetPlantsQuery, 
    useDeleteLogMutation,
    useUpdateLogMutation
} from '../api/maintenance.api';

const failureTypes = [
    'Sin Asignar', 'Ninguna', 'Cosedora Cilindro', 'Cosedora Brazo', 'Cosedora Cierre', 'Error electronico',
    'Error Puesta 0', 'Error Motores', 'Mal vanizado', 'Logo contaminado',
    'Tejido(Muerde/revienta/pica/tirones)', 'Goma', 'Puntada', 'Transferencia',
    'Aguja', 'Platina', 'Menguados', 'Corta', 'Electronico', 'Lubricacion',
    'Mancha', 'Corte', 'REPUESTO', 'Corte de luz.', 'Programacion'
];

const responsables = ['Sin Asignar', 'Gaston', 'Ruben', 'Daniel', 'Alexis', 'Violeta', 'Leandro', 'Gaspar', 'Ramón', 'Tejedor'];

const statusColors: Record<string, string> = {
    ACTIVA: '#10b981',
    REVISAR: '#eab308',
    VELOCIDAD_REDUCIDA: '#f472b6',
    PARADA: '#ef4444',
    ELECTRONIC: '#3b82f6',
    FALTA_COSTURA: '#a855f7',
    FALTA_PROGRAMA: '#fb923c',
    REPUESTOS: '#94a3b8',
    OTRO: '#6b7280',
};

const statusLabels: Record<string, string> = {
    ACTIVA: 'Activa',
    REVISAR: 'En Revisión',
    VELOCIDAD_REDUCIDA: 'Vel. Reducida',
    FALTA_COSTURA: 'Costura',
    PARADA: 'Parada',
    ELECTRONIC: 'Electrónica',
    FALTA_PROGRAMA: 'Programa',
    REPUESTOS: 'Repuestos',
    OTRO: 'Otro',
};

export default function HistorialRegistrosPage() {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('06:00');
    const [endTime, setEndTime] = useState('18:00');
    const [useTimeFilter, setUseTimeFilter] = useState(false);
    const [machineNumber, setMachineNumber] = useState('');
    const [plantId, setPlantId] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Deletion state
    const location = useLocation();
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteLog, { isLoading: isDeleting }] = useDeleteLogMutation();

    // Edit state
    const [editLogData, setEditLogData] = useState<any | null>(null);
    const [updateLog, { isLoading: isUpdating }] = useUpdateLogMutation();

    const { data: plants = [] } = useGetPlantsQuery();

    const { data: logs = [], isLoading } = useGetLogsQuery({ 
        startDate, 
        endDate,
        plantId: plantId || undefined,
        status: statusFilter || undefined,
        machineNumber: machineNumber || undefined
    });

    // Handle pre-selection from location state
    useEffect(() => {
        const state = location.state as { machineNumber?: number | string } | null;
        if (state?.machineNumber) {
            setMachineNumber(String(state.machineNumber));
            // Also expand date range to find it if it's old
            setStartDate(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
        }
    }, [location.state]);

    const plantOptions = [
        { value: '', label: 'Todas las Plantas' },
        ...plants.map((p: any) => ({ value: p.id, label: p.name }))
    ];

    const statusOptions = [
        { value: '', label: 'Todos los Movimientos' },
        ...Object.keys(statusLabels).map(key => ({ value: key, label: statusLabels[key] }))
    ];

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteLog(deleteId).unwrap();
            setDeleteId(null);
        } catch (error) {
            console.error('Error deleting log:', error);
            alert('Error al eliminar el registro');
        }
    };

    const handleMachineClick = (log: any) => {
        navigate('/mantenimiento/buscador', {
            state: {
                machine: log.machine,
                plantId: log.machine?.plantId
            }
        });
    };

    const LogItem = ({ log }: { log: any }) => (
        <Card sx={{ 
            bgcolor: 'rgba(255,255,255,0.02)', 
            mb: 1.5, 
            borderRadius: 2, 
            p: 2, 
            border: '1px solid rgba(255,255,255,0.05)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                    <Typography 
                        variant="h6" 
                        onClick={() => handleMachineClick(log)}
                        sx={{ fontWeight: 900, color: '#3b82f6', cursor: 'pointer', lineHeight: 1, '&:hover': { textDecoration: 'underline' } }}
                    >
                        MÁQUINA {log.machine?.number}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#4b5563', fontWeight: 800, fontSize: '0.65rem', display: 'block', mt: 0.5 }}>
                        {new Date(log.timestamp).toLocaleString([], { hour12: false })}
                    </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                        label={statusLabels[log.fromStatus] || log.fromStatus} 
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#6b7280', fontSize: '0.6rem', fontWeight: 700 }} 
                    />
                    <Typography sx={{ color: '#374151', fontSize: '0.8rem', fontWeight: 900 }}>→</Typography>
                    <Chip 
                        label={statusLabels[log.toStatus] || log.toStatus} 
                        size="small"
                        sx={{ bgcolor: `${statusColors[log.toStatus]}20`, color: statusColors[log.toStatus], border: `1px solid ${statusColors[log.toStatus]}40`, fontWeight: 900, fontSize: '0.7rem' }} 
                    />
                </Box>
            </Box>

            <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" sx={{ color: '#4b5563', display: 'block', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.6rem' }}>Duración</Typography>
                    <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 800 }}>{log.durationFormatted || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" sx={{ color: '#4b5563', display: 'block', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.6rem' }}>Falla</Typography>
                    <Typography variant="body2" sx={{ color: '#d1d5db', fontWeight: 700 }}>{log.failureType || 'Sin asignar'}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" sx={{ color: '#4b5563', display: 'block', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.6rem' }}>Responsable</Typography>
                    <Typography variant="body2" sx={{ color: '#d1d5db', fontWeight: 700 }}>{log.generatedBy || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <IconButton size="small" sx={{ color: '#3b82f6' }} onClick={() => setEditLogData(log)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => setDeleteId(log.id)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" sx={{ color: '#4b5563', display: 'block', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.6rem', mb: 0.5 }}>Observaciones</Typography>
                    <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.01)', borderRadius: 1, border: '1px solid rgba(255,255,255,0.03)' }}>
                        <Typography variant="body2" sx={{ color: '#9ca3af', fontStyle: log.observation ? 'normal' : 'italic' }}>
                            {log.observation || 'Sin comentarios adicionales.'}
                        </Typography>
                    </Box>
                </Grid>
            </Grid>
        </Card>
    );

    return (
        <Box sx={{ p: 3, maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader 
                title="Historial de Producción" 
                subtitle="Registro detallado de cambios de estado, novedades y fallas"
                hideTitleOnMobile={true}
            />

            <Card sx={{ bgcolor: '#111827', borderRadius: 2, mb: 4, p: 2.5, border: '1px solid #1f2937' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 2.4 }}>
                        <TextField
                            label="N° Máquina"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={machineNumber}
                            onChange={(e) => setMachineNumber(e.target.value)}
                            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                            sx={{
                                '& .MuiOutlinedInput-root': { color: 'white' },
                                '& .MuiInputLabel-root': { color: '#9ca3af' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' },
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2.4 }}>
                        <Select 
                            label="Planta"
                            value={plantId}
                            onChange={(val) => setPlantId(val)}
                            options={plantOptions}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2.4 }}>
                        <Select 
                            label="Movimiento / Estado"
                            value={statusFilter}
                            onChange={(val) => setStatusFilter(val)}
                            options={statusOptions}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2.4 }}>
                        <TextField
                            label="Fecha Inicio"
                            type="date"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiOutlinedInput-root': { color: 'white' },
                                '& .MuiInputLabel-root': { color: '#9ca3af' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                        <TextField
                            label="Fecha Fin"
                            type="date"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiOutlinedInput-root': { color: 'white' },
                                '& .MuiInputLabel-root': { color: '#9ca3af' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 1 }}>
                         <Button 
                            variant={useTimeFilter ? "contained" : "outlined"}
                            fullWidth
                            size="small"
                            onClick={() => setUseTimeFilter(!useTimeFilter)}
                            sx={{ height: '40px', fontSize: '0.7rem' }}
                        >
                            {useTimeFilter ? 'Con Hora' : 'Sin Hora'}
                        </Button>
                    </Grid>
                    {useTimeFilter && (
                        <>
                            <Grid size={{ xs: 6, md: 1.5 }}>
                                <TextField
                                    label="Hora Inicio"
                                    type="time"
                                    variant="outlined"
                                    fullWidth
                                    size="small"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': { color: 'white' },
                                        '& .MuiInputLabel-root': { color: '#9ca3af' },
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
                                    }}
                                />
                            </Grid>
                            <Grid size={{ xs: 6, md: 1.5 }}>
                                <TextField
                                    label="Hora Fin"
                                    type="time"
                                    variant="outlined"
                                    fullWidth
                                    size="small"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': { color: 'white' },
                                        '& .MuiInputLabel-root': { color: '#9ca3af' },
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
                                    }}
                                />
                            </Grid>
                        </>
                    )}
                </Grid>
            </Card>

            {isLoading ? (
                <Spinner />
            ) : (
                <Box sx={{ mt: 2 }}>
                    {logs.length === 0 ? (
                        <Box sx={{ p: 10, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.01)', borderRadius: 2, border: '1px dashed #1f2937' }}>
                            <Typography sx={{ color: '#4b5563', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>
                                No se encontraron registros en este periodo
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            {logs.map((log: any) => (
                                <LogItem key={log.id} log={log} />
                            ))}
                        </Box>
                    )}
                </Box>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} PaperProps={{ sx: { bgcolor: '#1f1f1f', color: 'white' } }}>
                <DialogTitle>¿Eliminar registro?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                        Esta acción eliminará permanentemente el registro de la base de datos. No se puede deshacer.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteId(null)} sx={{ color: '#9ca3af' }}>Cancelar</Button>
                    <Button onClick={handleDelete} color="error" variant="contained" disabled={isDeleting}>
                        {isDeleting ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editLogData} onClose={() => setEditLogData(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: '#1f1f1f', color: 'white' } }}>
                <DialogTitle>Editar Registro</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                        <TextField
                            label="Fecha / Hora"
                            type="datetime-local"
                            fullWidth
                            variant="outlined"
                            InputLabelProps={{ shrink: true }}
                            value={editLogData?.timestamp ? new Date(new Date(editLogData.timestamp).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                            onChange={(e) => setEditLogData({ ...editLogData, timestamp: new Date(e.target.value).toISOString() })}
                            sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiInputLabel-root': { color: '#9ca3af' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' } }}
                        />
                        <TextField
                            select
                            fullWidth
                            disabled
                            label="Nuevo Estado (Solo lectura)"
                            variant="outlined"
                            value={editLogData?.toStatus || ''}
                            onChange={(e) => setEditLogData({ ...editLogData, toStatus: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { color: 'white', opacity: 0.6 }, '& .MuiInputLabel-root': { color: '#9ca3af' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' } }}
                        >
                            {Object.keys(statusLabels).map((key) => (
                                <MenuItem key={key} value={key}>{statusLabels[key]}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            fullWidth
                            label="Tipo de Falla"
                            variant="outlined"
                            value={editLogData?.failureType || ''}
                            onChange={(e) => setEditLogData({ ...editLogData, failureType: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiInputLabel-root': { color: '#9ca3af' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' } }}
                        >
                            {failureTypes.map((f) => (
                                <MenuItem key={f} value={f}>{f}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            fullWidth
                            label="Responsable"
                            variant="outlined"
                            value={editLogData?.generatedBy || ''}
                            onChange={(e) => setEditLogData({ ...editLogData, generatedBy: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiInputLabel-root': { color: '#9ca3af' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' } }}
                        >
                            {responsables.map((r) => (
                                <MenuItem key={r} value={r}>{r}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Observaciones"
                            variant="outlined"
                            value={editLogData?.observation || ''}
                            onChange={(e) => setEditLogData({ ...editLogData, observation: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiInputLabel-root': { color: '#9ca3af' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' } }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditLogData(null)} sx={{ color: '#9ca3af' }}>Cancelar</Button>
                    <Button 
                        onClick={async () => {
                            if (!editLogData) return;
                            try {
                                await updateLog({
                                    id: editLogData.id,
                                    toStatus: editLogData.toStatus,
                                    generatedBy: editLogData.generatedBy,
                                    failureType: editLogData.failureType,
                                    observation: editLogData.observation,
                                    timestamp: editLogData.timestamp
                                }).unwrap();
                                setEditLogData(null);
                            } catch (e) {
                                alert('Error al actualizar el registro');
                            }
                        }} 
                        color="primary" 
                        variant="contained" 
                        disabled={isUpdating}
                    >
                        {isUpdating ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
