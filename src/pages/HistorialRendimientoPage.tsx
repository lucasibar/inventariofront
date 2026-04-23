import React, { useState } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, IconButton, 
    TextField, Button, Chip, Dialog, 
    DialogTitle, DialogContent, DialogActions, Alert,
    CircularProgress
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { 
    useGetLogsQuery, 
    useGetPlantsQuery, 
    useUpdateLogMutation, 
    useDeleteLogMutation,
    useGetMetricsQuery
} from '../entities/performance/api/performanceApi';
import { useSelector } from 'react-redux';
import { selectIsAdmin } from '../entities/auth/model/authSlice';
import { PageHeader, Card, Btn, Select } from './common/ui';
import { calculatePlantKPIs } from '../features/rendimiento/utils/kpiUtils';


export const HistorialRendimientoPage: React.FC = () => {
    const isAdmin = useSelector(selectIsAdmin);
    
    // Filters State
    const [selectedPlantId, setSelectedPlantId] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 10)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Data Queries
    const { data: plants } = useGetPlantsQuery();
    const { data: logs, isLoading, isFetching, refetch, error: plantLogsError } = useGetLogsQuery({
        plantId: selectedPlantId,
        startDate: startDate ? new Date(startDate + 'T00:00:00').toISOString() : undefined,
        endDate: endDate ? new Date(endDate + 'T23:59:59').toISOString() : undefined,
    }, { skip: !selectedPlantId });

    const { data: metrics, isLoading: loadingMetrics } = useGetMetricsQuery(
        { plantId: selectedPlantId || '' },
        { skip: !selectedPlantId }
    );

    const plantKPIs = React.useMemo(() => {
        if (!selectedPlantId || !metrics || !logs) return { availability: '0.0%', oee: '0.0%', mtbf: '0s', mttr: '0s' };
        
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');

        if (!logs.length && !isLoading && !isFetching) {
             return { availability: '100%', oee: '0%', mtbf: '0s', mttr: '0s' };
        }
        
        try {
            return calculatePlantKPIs(logs, metrics.total, start, end); 
        } catch (e) {
            console.error("Error calculating plant KPIs:", e);
            return { availability: 'Error', oee: 'Error', mtbf: 'Error', mttr: 'Error' };
        }
    }, [logs, selectedPlantId, isLoading, isFetching, metrics, startDate, endDate]);


    // Mutations
    const [updateLog] = useUpdateLogMutation();
    const [deleteLog] = useDeleteLogMutation();

    const plantOptions = React.useMemo(() => 
        (plants || []).map(p => ({ value: p.id, label: p.name })), 
    [plants]);

    const handleExport = () => {
        if (!logs || logs.length === 0) return;
        
        const headers = ['Fecha', 'Maquina', 'Planta', 'Estado Ant', 'Estado Nuevo', 'Falla', 'Responsable', 'Observacion'];
        const csvContent = [
            headers.join(','),
            ...logs.map(log => [
                new Date(log.timestamp).toLocaleString(),
                log.machine?.number,
                log.machine?.plant?.name || 'N/A',
                log.fromStatus,
                log.toStatus,
                log.failureType || 'N/A',
                log.generatedBy,
                `"${(log.observation || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `historial_rendimiento_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
        <Box sx={{ p: 3, maxWidth: '1400px', margin: '0 auto', minHeight: '100vh', color: 'white' }}>
            <PageHeader 
                title="Historial de Producción" 
                subtitle="Auditoría y control de eventos de maquinaria"
            >
                <Btn 
                    variant="secondary" 
                    onClick={handleExport}
                    disabled={!logs || logs.length === 0}
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid #6366f144' }}
                >
                    📥 Exportar CSV
                </Btn>
                <Btn 
                    variant="secondary" 
                    onClick={() => selectedPlantId && refetch()} 
                    disabled={!selectedPlantId || isLoading || isFetching}
                    style={{ padding: '8px 12px' }}
                >
                    🔄 Refrescar
                </Btn>

            </PageHeader>

            {/* Filters Bar */}
            <Card style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', padding: '20px', marginBottom: '32px' }}>
                <Box sx={{ minWidth: '200px' }}>
                    <Select 
                        label="Planta"
                        value={selectedPlantId}
                        onChange={setSelectedPlantId}
                        options={plantOptions}
                    />
                </Box>
                
                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Desde</Typography>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{ background: '#0f1117', border: '1px solid #374151', padding: '8px', color: 'white', borderRadius: '8px', fontSize: '13px' }}
                    />
                </Box>

                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Hasta</Typography>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{ background: '#0f1117', border: '1px solid #374151', padding: '8px', color: 'white', borderRadius: '8px', fontSize: '13px' }}
                    />
                </Box>

                <Box sx={{ ml: 'auto' }}>
                    <Btn variant="secondary" onClick={() => {
                        setStartDate(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
                        setEndDate(new Date().toISOString().split('T')[0]);
                    }} style={{ padding: '8px 15px' }}>
                        Hoy
                    </Btn>
                </Box>
            </Card>


            {/* Metrics Dashboard */}
            <Box sx={{ mb: 6 }}>
                <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Estado Actual (Tiempo Real)
                </Typography>
                <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(4, 1fr)', 
                    gap: 2, 
                    mb: 4 
                }}>
                    <StatusCard 
                        label="En Funcionamiento" 
                        value={metrics?.running || 0} 
                        icon="✅" 
                        color="linear-gradient(135deg, #10b981, #059669)" 
                        loading={loadingMetrics} 
                    />
                    <StatusCard 
                        label="Con Inconveniente" 
                        value={metrics?.failed || 0} 
                        icon="⚠️" 
                        color="linear-gradient(135deg, #ef4444, #dc2626)" 
                        loading={loadingMetrics} 
                    />
                    <StatusCard 
                        label="Total Máquinas" 
                        value={metrics?.total || 0} 
                        icon="🏭" 
                        color="linear-gradient(135deg, #6366f1, #4f46e5)" 
                        loading={loadingMetrics} 
                    />
                    <StatusCard 
                        label="Disponibilidad Actual" 
                        value={metrics?.total ? `${((metrics.running / metrics.total) * 100).toFixed(1)}%` : '0%'} 
                        icon="📈" 
                        color="linear-gradient(135deg, #f59e0b, #d97706)" 
                        loading={loadingMetrics} 
                    />
                </Box>

                <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Analítica del Período Seleccionado
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2 }}>
                    <KPICard label="Disponibilidad Global" value={plantKPIs?.availability || '0.0%'} subtext="Tiempo productivo real" color="#10b981" loading={isLoading || isFetching} error={!!plantLogsError} />
                    <KPICard label="OEE (Plant-wide)" value={plantKPIs?.oee || '0.0%'} subtext="Efectividad total" color="#8b5cf6" loading={isLoading || isFetching} error={!!plantLogsError} />
                    <KPICard label="Confiabilidad (MTBF)" value={plantKPIs?.mtbf || '0s'} subtext="Tiempo promedio entre fallas" color="#60a5fa" loading={isLoading || isFetching} error={!!plantLogsError} />
                    <KPICard label="Capacidad de Repuesta (MTTR)" value={plantKPIs?.mttr || '0s'} subtext="Tiempo promedio de reparación" color="#f87171" loading={isLoading || isFetching} error={!!plantLogsError} />
                </Box>
            </Box>


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
                            {(isLoading || isFetching) ? (
                                <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={24} sx={{ my: 4 }} /></TableCell></TableRow>
                            ) : (logs?.length === 0) ? (
                                <TableRow><TableCell colSpan={7} align="center"><Typography sx={{ my: 4, color: 'text.secondary' }}>No se encontraron registros para este rango.</Typography></TableCell></TableRow>
                            ) : logs?.map((log) => (
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

const StatusCard = ({ label, value, icon, color, loading }: any) => (
    <Card style={{ 
        padding: '16px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1d2e',
        position: 'relative',
        overflow: 'hidden',
        aspectRatio: '1 / 1',
        textAlign: 'center'
    }}>
        <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '4px', 
            height: '100%', 
            background: color 
        }} />
        <Typography variant="h4" sx={{ mb: 1 }}>{icon}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700, mb: 0.5, fontSize: { xs: '10px', sm: '12px' } }}>{label}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#fff', fontSize: { xs: '1.2rem', sm: '1.5rem', md: '2.125rem' } }}>
            {loading ? <CircularProgress size={24} /> : value}
        </Typography>
    </Card>
);

const KPICard = ({ label, value, subtext, color, loading, error }: any) => (
    <Card style={{ 
        padding: '24px', 
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        transition: 'all 0.3s ease',
        position: 'relative'
    }}>
        <Typography variant="caption" sx={{ color: color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', mb: 2 }}>
            {label}
        </Typography>
        <Typography variant="h2" sx={{ fontWeight: 800, color: error ? '#ef4444' : '#fff', mb: 1 }}>
            {loading ? <CircularProgress size={24} /> : error ? 'Error' : value}
        </Typography>
        <Typography variant="caption" color="text.secondary">{subtext}</Typography>
        {loading && <Box sx={{ position: 'absolute', top: 10, right: 10 }}><CircularProgress size={12} /></Box>}
    </Card>
);
