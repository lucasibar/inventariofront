import React from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Typography, Box, Grid, Divider 
} from '@mui/material';
import { Machine } from '../../entities/performance/api/performanceApi';

interface MachineDetailModalProps {
    open: boolean;
    onClose: () => void;
    machine: Machine | null;
    onReportFailure: (machine: Machine) => void;
    onSolve: (machine: Machine) => void;
}


export const MachineDetailModal: React.FC<MachineDetailModalProps> = ({ open, onClose, machine, onReportFailure, onSolve }) => {

    if (!machine) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ bgcolor: '#1a1a1a', borderBottom: '1px solid #333' }}>
                Detalles de Máquina {machine.number}
            </DialogTitle>
            <DialogContent sx={{ bgcolor: '#1a1a1a', pt: 3 }}>
                <Grid container spacing={3}>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">CÓDIGO INTERNO</Typography>
                        <Typography variant="h6">{machine.codigoInterno}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">ESTADO ACTUAL</Typography>
                        <Typography variant="h6" sx={{ color: machine.status === 'SOLVED' ? '#10b981' : '#ef4444' }}>
                            {machine.status}
                        </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>Métricas de Rendimiento</Typography>
                        <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                            <Typography variant="body2" color="text.secondary">Tiempo de actividad (últimas 24h): 98%</Typography>
                            <Typography variant="body2" color="text.secondary">Fallas reportadas este mes: 2</Typography>
                        </Box>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">ÚLTIMO CAMBIO POR</Typography>
                        <Typography variant="body1">{machine.lastChangeBy || 'No registrado'}</Typography>
                    </Grid>

                    {machine.lastObservation && (
                        <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">ÚLTIMA OBSERVACIÓN</Typography>
                            <Typography variant="body2">{machine.lastObservation}</Typography>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions sx={{ bgcolor: '#1a1a1a', p: 2, borderTop: '1px solid #333', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                        variant="outlined" 
                        color="primary" 
                        disabled 
                        title="Funcionalidad no disponible aún"
                    >
                        Cargar Producción
                    </Button>
                    
                    {machine.status === 'SOLVED' ? (
                        <Button 
                            variant="contained" 
                            color="error"
                            onClick={() => { onReportFailure(machine); onClose(); }}
                        >
                            Reportar Falla
                        </Button>
                    ) : (
                        <Button 
                            variant="contained" 
                            color="success"
                            onClick={() => { onSolve(machine); onClose(); }}
                        >
                            Solucionar
                        </Button>
                    )}
                </Box>
                <Button onClick={onClose} variant="contained" color="inherit">Cerrar</Button>
            </DialogActions>
        </Dialog>

    );
};
