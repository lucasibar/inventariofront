import React from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Typography, Box, Divider, CircularProgress, 
    List, ListItem, ListItemText, Chip
} from '@mui/material';
import type { Machine } from '../../entities/performance/api/performanceApi';
import { useGetLogsQuery } from '../../entities/performance/api/performanceApi';
import { calculateKPIs } from './utils/kpiUtils';


interface MachineDetailModalProps {
    open: boolean;
    onClose: () => void;
    machine: Machine | null;
    onReportFailure: (machine: Machine) => void;
    onSolve: (machine: Machine) => void;
}


export const MachineDetailModal: React.FC<MachineDetailModalProps> = ({ open, onClose, machine, onReportFailure, onSolve }) => {
    // Default range: Last Month
    const startDate = new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = new Date();

    const { data: logs, isLoading } = useGetLogsQuery(
        { 
            machineId: machine?.id || '', 
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        }, 
        { skip: !machine }
    );

    if (!machine) return null;

    // Calculate KPIs locally in the Frontend
    const kpis = logs ? calculateKPIs(logs, startDate, endDate, machine.id) : null;


    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SOLVED': return '#10b981';
            case 'MECHANICAL': return '#ef4444';
            case 'ELECTRICAL': return '#f59e0b';
            default: return '#6366f1';
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ 
                bgcolor: '#1a1d2e', 
                borderBottom: '1px solid #2a2d3e',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center'
            }}>
                <Box>
                    <Typography variant="h5" color="white" sx={{ fontWeight: 800 }}>MÁQUINA {machine.number}</Typography>
                    <Typography variant="caption" color="text.secondary">ID: {machine.id}</Typography>
                </Box>
                <Chip 
                    label={machine.status} 
                    sx={{ 
                        bgcolor: getStatusColor(machine.status) + '22', 
                        color: getStatusColor(machine.status),
                        fontWeight: 800,
                        border: `1px solid ${getStatusColor(machine.status)}44`
                    }} 
                />
            </DialogTitle>
            
            <DialogContent sx={{ bgcolor: '#0f111a', pt: 3, pb: 4 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 300px' }, gap: 4 }}>
                    
                    {/* Main Metrics Area */}
                    <Box>
                        <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Indicadores Clave (KPIs) - Último Mes
                        </Typography>

                        {isLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                        ) : (
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                <MetricCard label="Disponibilidad" value={kpis?.availability || '0%'} color="#34d399" />
                                <MetricCard label="OEE (Calculado)" value={kpis?.oee || '0%'} color="#60a5fa" subLabel="Disponibilidad x Rendimiento x Calidad" />
                                <MetricCard label="MTBF" value={kpis?.mtbf || '0s'} color="#818cf8" subLabel="Tiempo entre fallas" />
                                <MetricCard label="MTTR" value={kpis?.mttr || '0s'} color="#f87171" subLabel="Tiempo de reparación" />
                                <MetricCard label="MTTF" value={kpis?.mttf || '0s'} color="#fbbf24" subLabel="Tiempo hasta falla" />
                                <MetricCard label="Fallas Totales" value={kpis?.failures.toString() || '0'} color="#94a3b8" />
                            </Box>
                        )}

                        <Box sx={{ mt: 4 }}>
                            <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Historial Reciente
                            </Typography>
                            <List sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {kpis?.history.length === 0 && (
                                    <ListItem><ListItemText primary="Sin eventos registrados" /></ListItem>
                                )}
                                {kpis?.history.map((log: any) => (
                                    <ListItem key={log.id} divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                        <ListItemText 
                                            primary={
                                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                        {log.fromStatus} → {log.toStatus}
                                                    </Typography>
                                                    {log.failureType && <Chip label={log.failureType} size="small" variant="outlined" />}
                                                </Box>
                                            }
                                            secondary={
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(log.timestamp).toLocaleString()} | Por: {log.generatedBy}
                                                </Typography>
                                            }
                                        />
                                        {log.observation && (
                                            <Typography variant="caption" sx={{ fontStyle: 'italic', maxWidth: '150px' }} noWrap>
                                                "{log.observation}"
                                            </Typography>
                                        )}
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    </Box>

                    {/* Sidebar Area */}
                    <Box sx={{ borderLeft: '1px solid rgba(255,255,255,0.05)', pl: 3 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>CÓDIGO INTERNO</Typography>
                        <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>{machine.codigoInterno}</Typography>

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>TIEMPOS TOTALES</Typography>
                        <Box sx={{ mb: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="body2" color="text.secondary">Uptime:</Typography>
                                <Typography variant="body2" color="#34d399" sx={{ fontWeight: 700 }}>{kpis?.uptime}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Downtime:</Typography>
                                <Typography variant="body2" color="#f87171" sx={{ fontWeight: 700 }}>{kpis?.downtime}</Typography>
                            </Box>
                        </Box>

                        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.05)' }} />

                        {machine.lastObservation && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>ÚLTIMA OBSERVACIÓN</Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
                                    "{machine.lastObservation}"
                                </Typography>
                            </Box>
                        )}
                        
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>RESPONSABLE</Typography>
                        <Typography variant="body2" sx={{ color: 'white' }}>{machine.lastChangeBy || 'N/A'}</Typography>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ bgcolor: '#1a1d2e', p: 3, borderTop: '1px solid #2a2d3e', justifyContent: 'space-between' }}>
                <Button onClick={onClose} variant="outlined" sx={{ color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.1)' }}>Cerrar</Button>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button 
                        variant="outlined" 
                        color="secondary" 
                        disabled 
                    >
                        Cargar Producción
                    </Button>
                    
                    {machine.status === 'SOLVED' ? (
                        <Button 
                            variant="contained" 
                            color="error"
                            onClick={() => { onReportFailure(machine); onClose(); }}
                            sx={{ px: 4, fontWeight: 800, borderRadius: '8px', boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.39)' }}
                        >
                            Reportar Falla
                        </Button>
                    ) : (
                        <Button 
                            variant="contained" 
                            color="success"
                            onClick={() => { onSolve(machine); onClose(); }}
                            sx={{ px: 4, fontWeight: 800, borderRadius: '8px', boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)' }}
                        >
                            Solucionar Falla
                        </Button>
                    )}
                </Box>
            </DialogActions>
        </Dialog>
    );
};

const MetricCard: React.FC<{ label: string; value: string; color: string; subLabel?: string }> = ({ label, value, color, subLabel }) => (
    <Box sx={{ 
        p: 2.5, 
        bgcolor: 'rgba(255,255,255,0.03)', 
        borderRadius: '16px', 
        border: '1px solid rgba(255,255,255,0.05)',
        transition: 'all 0.2s',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: `${color}44` }
    }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{label}</Typography>
        <Typography variant="h4" sx={{ color: color, fontWeight: 800, mb: 0.5 }}>{value}</Typography>
        {subLabel && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{subLabel}</Typography>}
    </Box>
);

