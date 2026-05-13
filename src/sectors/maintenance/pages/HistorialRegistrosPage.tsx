import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Box, Typography, Card, Chip, TextField, Grid, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, MenuItem, Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PageHeader, Spinner, Select } from '../../../shared/ui';
import { useDispatch, useSelector } from 'react-redux';
import { 
    useGetLogsQuery, 
    useGetPlantsQuery, 
    useDeleteLogMutation,
    useUpdateLogMutation
} from '../api/maintenance.api';
import { 
    selectHistoryFilters, 
    setHistoryFilters, 
    resetHistoryFilters 
} from '../model/maintenanceSlice';

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
    const location = useLocation();
    const dispatch = useDispatch();

    // Redux filters state triggers the actual query
    const filters = useSelector(selectHistoryFilters);

    // Local state for blazing fast inputs without triggering API calls on typing
    const [localMachineNumber, setLocalMachineNumber] = useState(filters.machineNumber);
    const [localStartDate, setLocalStartDate] = useState(filters.startDate);
    const [localEndDate, setLocalEndDate] = useState(filters.endDate);
    const [localPlantId, setLocalPlantId] = useState(filters.plantId);
    const [localStatusFilter, setLocalStatusFilter] = useState(filters.statusFilter);
    const [localUseTimeFilter, setLocalUseTimeFilter] = useState(filters.useTimeFilter);
    const [localStartTime, setLocalStartTime] = useState(filters.startTime);
    const [localEndTime, setLocalEndTime] = useState(filters.endTime);

    // Synchronize local state if filters change externally
    useEffect(() => {
        setLocalMachineNumber(filters.machineNumber);
        setLocalStartDate(filters.startDate);
        setLocalEndDate(filters.endDate);
        setLocalPlantId(filters.plantId);
        setLocalStatusFilter(filters.statusFilter);
        setLocalUseTimeFilter(filters.useTimeFilter);
        setLocalStartTime(filters.startTime);
        setLocalEndTime(filters.endTime);
    }, [filters]);

    // Handle pre-selection from location state (navigation from specific machines)
    useEffect(() => {
        const state = location.state as { machineNumber?: number | string } | null;
        if (state?.machineNumber) {
            const numStr = String(state.machineNumber);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const startStr = thirtyDaysAgo.toISOString().split('T')[0];

            setLocalMachineNumber(numStr);
            setLocalStartDate(startStr);
            
            // Dispatch automatically to search immediately
            dispatch(setHistoryFilters({
                machineNumber: numStr,
                startDate: startStr
            }));
        }
    }, [location.state, dispatch]);

    // Actual RTK Query API fetch using Redux store parameters
    const { data: plants = [] } = useGetPlantsQuery();
    const { data: logs = [], isLoading, isFetching } = useGetLogsQuery({ 
        startDate: filters.startDate, 
        endDate: filters.endDate,
        plantId: filters.plantId || undefined,
        status: filters.statusFilter || undefined,
        machineNumber: filters.machineNumber || undefined
    });

    // Deletion state
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteLog, { isLoading: isDeleting }] = useDeleteLogMutation();

    // Edit state
    const [editLogData, setEditLogData] = useState<any | null>(null);
    const [updateLog, { isLoading: isUpdating }] = useUpdateLogMutation();

    const plantOptions = [
        { value: '', label: 'Todas las Plantas' },
        ...plants.map((p: any) => ({ value: p.id, label: p.name }))
    ];

    const statusOptions = [
        { value: '', label: 'Todos los Movimientos' },
        ...Object.keys(statusLabels).map(key => ({ value: key, label: statusLabels[key] }))
    ];

    // Trigger update to Redux store
    const handleApplyFilters = () => {
        dispatch(setHistoryFilters({
            machineNumber: localMachineNumber.trim(),
            startDate: localStartDate,
            endDate: localEndDate,
            plantId: localPlantId,
            statusFilter: localStatusFilter,
            useTimeFilter: localUseTimeFilter,
            startTime: localStartTime,
            endTime: localEndTime
        }));
    };

    const handleResetFilters = () => {
        dispatch(resetHistoryFilters());
    };

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
        if (!log.machine) return;
        navigate('/mantenimiento/buscador', {
            state: {
                machine: log.machine,
                plantId: log.machine?.plantId
            }
        });
    };

    // Fast local memory filter for specific hours if time filter is enabled
    const filteredLogs = useMemo(() => {
        if (!filters.useTimeFilter) return logs;
        return logs.filter((log: any) => {
            const timeStr = new Date(log.timestamp).toTimeString().slice(0, 5);
            return timeStr >= filters.startTime && timeStr <= filters.endTime;
        });
    }, [logs, filters.useTimeFilter, filters.startTime, filters.endTime]);

    const LogItem = ({ log }: { log: any }) => (
        <Card sx={{ 
            bgcolor: 'rgba(255,255,255,0.02)', 
            mb: 1.5, 
            borderRadius: 2, 
            p: 2, 
            border: '1px solid rgba(255,255,255,0.05)',
            transition: 'all 0.2s ease',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(59, 130, 246, 0.3)' }
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                    <Typography 
                        variant="h6" 
                        onClick={() => handleMachineClick(log)}
                        sx={{ fontWeight: 900, color: '#3b82f6', cursor: log.machine ? 'pointer' : 'default', lineHeight: 1, '&:hover': { textDecoration: log.machine ? 'underline' : 'none' } }}
                    >
                        MÁQUINA {log.machine?.number || log.machineId?.slice(0,6)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 700, fontSize: '0.7rem', display: 'block', mt: 0.5 }}>
                        {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short', hour12: false })}
                    </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                        label={statusLabels[log.fromStatus] || log.fromStatus} 
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#6b7280', fontSize: '0.65rem', fontWeight: 700 }} 
                    />
                    <Typography sx={{ color: '#4b5563', fontSize: '0.8rem', fontWeight: 900 }}>→</Typography>
                    <Chip 
                        label={statusLabels[log.toStatus] || log.toStatus} 
                        size="small"
                        sx={{ bgcolor: `${statusColors[log.toStatus] || '#6b7280'}20`, color: statusColors[log.toStatus] || '#9ca3af', border: `1px solid ${statusColors[log.toStatus] || '#6b7280'}40`, fontWeight: 900, fontSize: '0.7rem' }} 
                    />
                </Box>
            </Box>

            <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                    <Typography variant="caption" sx={{ color: '#4b5563', display: 'block', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.6rem' }}>Duración</Typography>
                    <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 800 }}>{log.durationFormatted || '-'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Typography variant="caption" sx={{ color: '#4b5563', display: 'block', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.6rem' }}>Falla</Typography>
                    <Typography variant="body2" sx={{ color: '#d1d5db', fontWeight: 700 }}>{log.failureType || 'Ninguna'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Typography variant="caption" sx={{ color: '#4b5563', display: 'block', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.6rem' }}>Responsable</Typography>
                    <Typography variant="body2" sx={{ color: '#d1d5db', fontWeight: 700 }}>{log.generatedBy || '-'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="Editar detalles locales">
                            <IconButton size="small" sx={{ color: '#3b82f6' }} onClick={() => setEditLogData(log)}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar registro">
                            <IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => setDeleteId(log.id)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Grid>
                <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: '#4b5563', display: 'block', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.6rem', mb: 0.5 }}>Observaciones</Typography>
                    <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.01)', borderRadius: 1, border: '1px solid rgba(255,255,255,0.03)' }}>
                        <Typography variant="body2" sx={{ color: '#9ca3af', fontStyle: log.observation ? 'normal' : 'italic', whiteSpace: 'pre-line' }}>
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
                title="Historial de Mantenimiento" 
                subtitle="Consulta optimizada de novedades del último mes. Escribe con total fluidez y presiona Buscar para aplicar."
                hideTitleOnMobile={true}
            />

            <Card sx={{ bgcolor: '#111827', borderRadius: 2, mb: 4, p: 2.5, border: '1px solid #1f2937', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={2}>
                        <TextField
                            label="N° Máquina"
                            variant="outlined"
                            fullWidth
                            size="small"
                            placeholder="Ej. 12"
                            value={localMachineNumber}
                            onChange={(e) => setLocalMachineNumber(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                            sx={{
                                '& .MuiOutlinedInput-root': { color: 'white' },
                                '& .MuiInputLabel-root': { color: '#9ca3af' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' },
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={2.5}>
                        <Select 
                            label="Planta"
                            value={localPlantId}
                            onChange={(val) => setLocalPlantId(val)}
                            options={plantOptions}
                        />
                    </Grid>
                    <Grid item xs={12} md={2.5}>
                        <Select 
                            label="Movimiento / Estado"
                            value={localStatusFilter}
                            onChange={(val) => setLocalStatusFilter(val)}
                            options={statusOptions}
                        />
                    </Grid>
                    <Grid item xs={12} md={2.5}>
                        <TextField
                            label="Fecha Inicio"
                            type="date"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={localStartDate}
                            onChange={(e) => setLocalStartDate(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiOutlinedInput-root': { color: 'white' },
                                '& .MuiInputLabel-root': { color: '#9ca3af' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={2.5}>
                        <TextField
                            label="Fecha Fin"
                            type="date"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={localEndDate}
                            onChange={(e) => setLocalEndDate(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiOutlinedInput-root': { color: 'white' },
                                '& .MuiInputLabel-root': { color: '#9ca3af' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
                            }}
                        />
                    </Grid>

                    {/* Fila de Filtros de Hora y Botones de Acción */}
                    <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Button 
                                    variant={localUseTimeFilter ? "contained" : "outlined"}
                                    size="small"
                                    color={localUseTimeFilter ? "secondary" : "primary"}
                                    onClick={() => setLocalUseTimeFilter(!localUseTimeFilter)}
                                    sx={{ height: '36px', fontSize: '0.75rem', fontWeight: 700, borderRadius: 1.5 }}
                                >
                                    {localUseTimeFilter ? 'Filtrar por Hora: Activado' : 'Añadir Filtro de Hora'}
                                </Button>

                                {localUseTimeFilter && (
                                    <>
                                        <TextField
                                            label="Hora Inicio"
                                            type="time"
                                            variant="outlined"
                                            size="small"
                                            value={localStartTime}
                                            onChange={(e) => setLocalStartTime(e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                            sx={{ width: 130, '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiInputLabel-root': { color: '#9ca3af' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' } }}
                                        />
                                        <TextField
                                            label="Hora Fin"
                                            type="time"
                                            variant="outlined"
                                            size="small"
                                            value={localEndTime}
                                            onChange={(e) => setLocalEndTime(e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                            sx={{ width: 130, '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiInputLabel-root': { color: '#9ca3af' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' } }}
                                        />
                                    </>
                                )}
                            </Box>

                            <Box sx={{ display: 'flex', gap: 1.5, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
                                <Button 
                                    variant="outlined" 
                                    color="inherit" 
                                    onClick={() => {
                                        handleResetFilters();
                                    }}
                                    startIcon={<RefreshIcon />}
                                    sx={{ color: '#9ca3af', borderColor: '#374151', '&:hover': { borderColor: '#6b7280', color: 'white' } }}
                                >
                                    Limpiar
                                </Button>
                                <Button 
                                    variant="contained" 
                                    color="primary" 
                                    onClick={handleApplyFilters}
                                    disabled={isFetching}
                                    startIcon={<SearchIcon />}
                                    sx={{ px: 4, py: 1, fontWeight: 800, borderRadius: 1.5, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}
                                >
                                    {isFetching ? 'Buscando...' : 'Aplicar Filtros / Buscar'}
                                </Button>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </Card>

            {isLoading ? (
                <Spinner />
            ) : (
                <Box sx={{ mt: 2 }}>
                    {filteredLogs.length === 0 ? (
                        <Box sx={{ p: 10, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.01)', borderRadius: 2, border: '1px dashed #1f2937' }}>
                            <Typography sx={{ color: '#4b5563', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>
                                No se encontraron registros para estos filtros
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="caption" sx={{ color: '#6b7280', mb: 1, display: 'block', fontWeight: 700 }}>
                                Mostrando {filteredLogs.length} resultados ordenados del más reciente al más antiguo
                            </Typography>
                            {filteredLogs.map((log: any) => (
                                <LogItem key={log.id} log={log} />
                            ))}
                        </Box>
                    )}
                </Box>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} PaperProps={{ sx: { bgcolor: '#1f1f1f', color: 'white', border: '1px solid #374151', borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>¿Eliminar registro del historial?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                        Esta acción quitará el movimiento permanentemente. La memoria caché local se actualizará al instante.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteId(null)} sx={{ color: '#9ca3af', fontWeight: 700 }}>Cancelar</Button>
                    <Button onClick={handleDelete} color="error" variant="contained" disabled={isDeleting} sx={{ fontWeight: 800 }}>
                        {isDeleting ? 'Eliminando...' : 'Eliminar Local y Servidor'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editLogData} onClose={() => setEditLogData(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: '#1f1f1f', color: 'white', border: '1px solid #374151', borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>Editar Movimiento en el Historial</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                        <TextField
                            label="Fecha / Hora del Movimiento"
                            type="datetime-local"
                            fullWidth
                            size="small"
                            variant="outlined"
                            InputLabelProps={{ shrink: true }}
                            value={editLogData?.timestamp ? new Date(new Date(editLogData.timestamp).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                            onChange={(e) => setEditLogData({ ...editLogData, timestamp: new Date(e.target.value).toISOString() })}
                            sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiInputLabel-root': { color: '#9ca3af' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' } }}
                        />
                        <TextField
                            select
                            fullWidth
                            size="small"
                            disabled
                            label="Estado Registrado (Lectura)"
                            variant="outlined"
                            value={editLogData?.toStatus || ''}
                            sx={{ '& .MuiOutlinedInput-root': { color: 'white', opacity: 0.6 }, '& .MuiInputLabel-root': { color: '#9ca3af' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' } }}
                        >
                            {Object.keys(statusLabels).map((key) => (
                                <MenuItem key={key} value={key}>{statusLabels[key]}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            fullWidth
                            size="small"
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
                            size="small"
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
                            size="small"
                            rows={3}
                            label="Observaciones"
                            variant="outlined"
                            value={editLogData?.observation || ''}
                            onChange={(e) => setEditLogData({ ...editLogData, observation: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiInputLabel-root': { color: '#9ca3af' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' } }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setEditLogData(null)} sx={{ color: '#9ca3af', fontWeight: 700 }}>Cancelar</Button>
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
                        sx={{ fontWeight: 800 }}
                    >
                        {isUpdating ? 'Guardando...' : 'Aplicar Cambio Local y Servidor'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
