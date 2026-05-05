import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Box, Typography, Card, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, Chip, TextField, Grid, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, MenuItem, useMediaQuery, useTheme, Divider
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

const responsables = ['Gaston', 'Ruben', 'Daniel', 'Alexis', 'Violeta', 'Leandro', 'Gaspar'];

const statusColors: Record<string, string> = {
    ACTIVA: '#10b981',
    PARADA: '#ef4444',
    REVISAR: '#eab308',
    VELOCIDAD_REDUCIDA: '#f472b6',
    ELECTRONIC: '#3b82f6',
};

const statusLabels: Record<string, string> = {
    ACTIVA: 'Activa',
    PARADA: 'Parada',
    REVISAR: 'En Revisión',
    VELOCIDAD_REDUCIDA: 'Vel. Reducida',
    ELECTRONIC: 'Electrónica',
};

export default function HistorialRegistrosPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [machineNumber, setMachineNumber] = useState('');
    const [plantId, setPlantId] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Deletion state
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

    return (
        <Box sx={{ p: 3, maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader 
                title="Historial de Producción" 
                subtitle="Registro detallado de cambios de estado, novedades y fallas"
                hideTitleOnMobile={true}
            />

            <Card sx={{ bgcolor: '#1a1a1a', borderRadius: 2, mb: 4, p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 2.4 }}>
                        <TextField
                            label="N° Máquina"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={machineNumber}
                            onChange={(e) => setMachineNumber(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': { color: 'white' },
                                '& .MuiInputLabel-root': { color: '#9ca3af' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
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
                    <Grid size={{ xs: 12, md: 2.4 }}>
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
                </Grid>
            </Card>

            {isLoading ? (
                <Spinner />
            ) : isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {logs.length === 0 ? (
                        <Box sx={{ p: 4, textAlign: 'center', color: '#9ca3af' }}>
                            No se encontraron registros en este rango de fechas.
                        </Box>
                    ) : (
                        logs.map((log: any) => (
                            <Card key={log.id} sx={{ bgcolor: '#1a1a1a', borderRadius: 2, border: '1px solid #333', p: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box>
                                        <Typography 
                                            variant="subtitle1" 
                                            onClick={() => handleMachineClick(log)}
                                            sx={{ 
                                                cursor: 'pointer', 
                                                fontWeight: 700,
                                                color: '#3b82f6',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1
                                            }}
                                        >
                                            Máquina {log.machine?.number}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 0.5 }}>
                                            {new Date(log.timestamp).toLocaleString()}
                                        </Typography>
                                    </Box>
                                    <Chip 
                                        label={statusLabels[log.toStatus] || log.toStatus} 
                                        size="small"
                                        sx={{ 
                                            bgcolor: `${statusColors[log.toStatus] || '#6b7280'}20`, 
                                            color: statusColors[log.toStatus] || '#d1d5db',
                                            border: `1px solid ${statusColors[log.toStatus] || '#6b7280'}50`,
                                            fontWeight: 600
                                        }} 
                                    />
                                </Box>
                                
                                <Grid container spacing={2} sx={{ mb: 2 }}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase' }}>Falla</Typography>
                                        <Typography variant="body2" sx={{ color: '#e5e7eb' }}>{log.failureType || '-'}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase' }}>Responsable</Typography>
                                        <Typography variant="body2" sx={{ color: '#e5e7eb' }}>{log.generatedBy || '-'}</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase' }}>Observaciones</Typography>
                                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>{log.observation || '-'}</Typography>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 1.5, borderColor: '#333' }} />
                                
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                    <Button 
                                        size="small" 
                                        startIcon={<EditIcon />} 
                                        onClick={() => setEditLogData(log)}
                                        sx={{ color: '#3b82f6' }}
                                    >
                                        Editar
                                    </Button>
                                    <Button 
                                        size="small" 
                                        startIcon={<DeleteIcon />} 
                                        onClick={() => setDeleteId(log.id)}
                                        sx={{ color: '#ef4444' }}
                                    >
                                        Eliminar
                                    </Button>
                                </Box>
                            </Card>
                        ))
                    )}
                </Box>
            ) : (
                <TableContainer component={Card} sx={{ bgcolor: '#1a1a1a', borderRadius: 2, maxHeight: 'calc(100vh - 300px)' }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ bgcolor: '#27272a', color: '#e5e7eb', fontWeight: 600 }}>Fecha / Hora</TableCell>
                                <TableCell sx={{ bgcolor: '#27272a', color: '#e5e7eb', fontWeight: 600 }}>Planta</TableCell>
                                <TableCell sx={{ bgcolor: '#27272a', color: '#e5e7eb', fontWeight: 600 }}>Máquina</TableCell>
                                <TableCell sx={{ bgcolor: '#27272a', color: '#e5e7eb', fontWeight: 600 }}>Estado</TableCell>
                                <TableCell sx={{ bgcolor: '#27272a', color: '#e5e7eb', fontWeight: 600 }}>Tipo de Falla</TableCell>
                                <TableCell sx={{ bgcolor: '#27272a', color: '#e5e7eb', fontWeight: 600 }}>Responsable</TableCell>
                                <TableCell sx={{ bgcolor: '#27272a', color: '#e5e7eb', fontWeight: 600 }}>Observaciones</TableCell>
                                <TableCell align="center" sx={{ bgcolor: '#27272a', color: '#e5e7eb', fontWeight: 600 }}>Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ color: '#9ca3af', py: 4 }}>
                                        No se encontraron registros en este rango de fechas.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log: any) => (
                                    <TableRow key={log.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: '#27272a' } }}>
                                        <TableCell sx={{ color: '#e5e7eb' }}>
                                            {new Date(log.timestamp).toLocaleString()}
                                        </TableCell>
                                        <TableCell sx={{ color: '#d1d5db' }}>{log.machine?.plant?.name || '-'}</TableCell>
                                        <TableCell sx={{ color: '#d1d5db' }}>
                                            <Typography 
                                                variant="body2" 
                                                onClick={() => handleMachineClick(log)}
                                                sx={{ 
                                                    cursor: 'pointer', 
                                                    fontWeight: 600,
                                                    color: '#3b82f6',
                                                    '&:hover': { textDecoration: 'underline' }
                                                }}
                                            >
                                                Máquina {log.machine?.number}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {log.machine?.codigoInterno}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={statusLabels[log.toStatus] || log.toStatus} 
                                                size="small"
                                                sx={{ 
                                                    bgcolor: `${statusColors[log.toStatus] || '#6b7280'}20`, 
                                                    color: statusColors[log.toStatus] || '#d1d5db',
                                                    border: `1px solid ${statusColors[log.toStatus] || '#6b7280'}50`
                                                }} 
                                            />
                                        </TableCell>
                                        <TableCell sx={{ color: '#d1d5db' }}>{log.failureType || '-'}</TableCell>
                                        <TableCell sx={{ color: '#d1d5db' }}>{log.generatedBy || '-'}</TableCell>
                                        <TableCell sx={{ color: '#9ca3af', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.observation}>
                                            {log.observation || '-'}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Editar Registro">
                                                <IconButton 
                                                    size="small" 
                                                    color="primary"
                                                    onClick={() => setEditLogData(log)}
                                                    sx={{ '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.1)' } }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Eliminar Registro">
                                                <IconButton 
                                                    size="small" 
                                                    color="error"
                                                    onClick={() => setDeleteId(log.id)}
                                                    sx={{ '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
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
                            label="Nuevo Estado"
                            variant="outlined"
                            value={editLogData?.toStatus || ''}
                            onChange={(e) => setEditLogData({ ...editLogData, toStatus: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiInputLabel-root': { color: '#9ca3af' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' } }}
                        >
                            {Object.keys(statusLabels).map((key) => (
                                <MenuItem key={key} value={key}>{statusLabels[key]}</MenuItem>
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
