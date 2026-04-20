import React, { useState } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, IconButton, 
    TextField, MenuItem, Button, Chip, Dialog, 
    DialogTitle, DialogContent, DialogActions, Alert,
    CircularProgress
} from '@mui/material';
import { Delete, Edit, Refresh, FilterList } from '@mui/icons-material';
import { 
    useGetLogsQuery, 
    useGetPlantsQuery, 
    useUpdateLogMutation, 
    useDeleteLogMutation 
} from '../entities/performance/api/performanceApi';
import { useSelector } from 'react-redux';
import { selectIsAdmin } from '../entities/auth/model/authSlice';

export const HistorialRendimientoPage: React.FC = () => {
    const isAdmin = useSelector(selectIsAdmin);
    
    // Filters State
    const [selectedPlantId, setSelectedPlantId] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Data Queries
    const { data: plants } = useGetPlantsQuery();
    const { data: logs, isLoading, refetch } = useGetLogsQuery({
        plantId: selectedPlantId,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
    }, { skip: !selectedPlantId });

    // Mutations
    const [updateLog] = useUpdateLogMutation();
    const [deleteLog] = useDeleteLogMutation();

    // UI State
    const [editModal, setEditModal] = useState<{ open: boolean; logId: string; observation: string; failureType: string }>({
        open: false, logId: '', observation: '', failureType: ''
    });

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este registro? Esto afectará las métricas calculadas.')) {
            await deleteLog(id);
        }
    };

    const handleSaveEdit = async () => {
        await updateLog({ 
            id: editModal.logId, 
            observation: editModal.observation, 
            failureType: editModal.failureType 
        });
        setEditModal({ ...editModal, open: false });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SOLVED': return '#10b981';
            case 'MECHANICAL': return '#ef4444';
            case 'ELECTRICAL': return '#f59e0b';
            default: return '#6366f1';
        }
    };

    return (
        <Box sx={{ p: 4, bgcolor: '#0f111a', minHeight: '100vh', color: 'white' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Historial de Producción</Typography>
                    <Typography variant="body2" color="text.secondary">Auditoría y gestión de eventos de máquinas</Typography>
                </Box>
                <Button 
                    startIcon={<Refresh />} 
                    variant="outlined" 
                    onClick={() => refetch()}
                    sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}
                >
                    Refrescar
                </Button>
            </Box>

            {/* Filters Bar */}
            <Paper sx={{ p: 3, mb: 4, bgcolor: '#1a1d2e', borderRadius: '16px', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                    select
                    label="Planta"
                    value={selectedPlantId}
                    onChange={(e) => setSelectedPlantId(e.target.value)}
                    sx={{ minWidth: 200 }}
                    size="small"
                >
                    {plants ? plants.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>) : <MenuItem value="" disabled>Cargando...</MenuItem>}
                </TextField>


                <TextField
                    label="Desde"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                />

                <TextField
                    label="Hasta"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                />

                <IconButton color="primary"><FilterList /></IconButton>
            </Paper>

            {/* Logs Table */}
            <TableContainer component={Paper} sx={{ bgcolor: '#1a1d2e', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
                ) : !selectedPlantId ? (
                    <Box sx={{ p: 8, textAlign: 'center' }}>
                        <Typography color="text.secondary">Selecciona una planta para ver los registros</Typography>
                    </Box>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                                <TableCell sx={{ color: '#6b7280', fontWeight: 800 }}>MÁQUINA</TableCell>
                                <TableCell sx={{ color: '#6b7280', fontWeight: 800 }}>TIEMPO</TableCell>
                                <TableCell sx={{ color: '#6b7280', fontWeight: 800 }}>ESTADOS</TableCell>
                                <TableCell sx={{ color: '#6b7280', fontWeight: 800 }}>FALLA</TableCell>
                                <TableCell sx={{ color: '#6b7280', fontWeight: 800 }}>OBSERVACIÓN</TableCell>
                                <TableCell sx={{ color: '#6b7280', fontWeight: 800 }}>OPERARIO</TableCell>
                                <TableCell sx={{ color: '#6b7280', fontWeight: 800 }}>ACCIONES</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs?.map((log) => (
                                <TableRow key={log.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                    <TableCell sx={{ color: 'white', fontWeight: 700 }}>
                                        #{log.machine?.number} ({log.machine?.codigoInterno})
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                        {new Date(log.timestamp).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip size="small" label={log.fromStatus} sx={{ bgcolor: getStatusColor(log.fromStatus) + '22', color: getStatusColor(log.fromStatus) }} />
                                            <Typography variant="caption">→</Typography>
                                            <Chip size="small" label={log.toStatus} sx={{ bgcolor: getStatusColor(log.toStatus) + '22', color: getStatusColor(log.toStatus) }} />
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        {log.failureType ? <Chip label={log.failureType} variant="outlined" size="small" color="error" /> : '-'}
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', maxWidth: '200px' }}>
                                        {log.observation || ''}
                                    </TableCell>
                                    <TableCell sx={{ color: 'white' }}>{log.generatedBy}</TableCell>
                                    <TableCell>
                                        <IconButton size="small" color="primary" onClick={() => setEditModal({ open: true, logId: log.id, observation: log.observation || '', failureType: log.failureType || '' })}>
                                            <Edit fontSize="small" />
                                        </IconButton>
                                        {isAdmin && (
                                            <IconButton size="small" color="error" onClick={() => handleDelete(log.id)}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>

            {/* Edit Modal */}
            <Dialog open={editModal.open} onClose={() => setEditModal({ ...editModal, open: false })} fullWidth maxWidth="xs">
                <DialogTitle sx={{ bgcolor: '#1a1d2e', borderBottom: '1px solid #2a2d3e' }}>Editar Registro</DialogTitle>
                <DialogContent sx={{ bgcolor: '#1a1d2e', pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <TextField
                            label="Tipo de Falla"
                            value={editModal.failureType}
                            onChange={(e) => setEditModal({ ...editModal, failureType: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            label="Observación"
                            multiline
                            rows={4}
                            value={editModal.observation}
                            onChange={(e) => setEditModal({ ...editModal, observation: e.target.value })}
                            fullWidth
                        />
                        <Alert severity="info" sx={{ bgcolor: 'rgba(2, 136, 209, 0.1)', color: '#03a9f4' }}>
                            Solo puedes editar la descripción y el tipo de falla. Los cambios de estado son inmutables para proteger la integridad del cálculo de KPIs.
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ bgcolor: '#1a1d2e', p: 3, borderTop: '1px solid #2a2d3e' }}>
                    <Button onClick={() => setEditModal({ ...editModal, open: false })}>Cancelar</Button>
                    <Button variant="contained" onClick={handleSaveEdit}>Guardar Cambios</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
