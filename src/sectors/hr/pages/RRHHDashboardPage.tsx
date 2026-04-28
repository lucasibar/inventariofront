import React from 'react';
import { Box, Grid, Paper, Typography, LinearProgress, Avatar } from '@mui/material';

const RRHHDashboardPage: React.FC = () => {
    // Mock Data
    const metrics = [
        { label: 'Presentismo Hoy', value: '96', unit: '%', color: '#10b981' },
        { label: 'Ausencias', value: '4', unit: 'pers', color: '#ef4444' },
        { label: 'Horas Extras Hoy', value: '12', unit: 'hs', color: '#f59e0b' },
        { label: 'Rotación Mensual', value: '1.2', unit: '%', color: '#3b82f6' },
    ];

    const productivity = [
        { name: 'Juan Pérez', value: 98, color: '#10b981' },
        { name: 'María García', value: 95, color: '#10b981' },
        { name: 'Carlos López', value: 88, color: '#f59e0b' },
        { name: 'Ana Martínez', value: 72, color: '#ef4444' },
    ];

    return (
        <Box sx={{ p: 4, background: '#0f1117', minHeight: '100vh', color: '#f3f4f6' }}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 800, color: '#3b82f6' }}>
                Dashboard de Recursos Humanos
            </Typography>

            <Grid container spacing={3}>
                {/* General Stats */}
                {metrics.map((m) => (
                    <Grid item xs={12} sm={6} md={3} key={m.label}>
                        <Paper sx={{ 
                            p: 3, 
                            background: 'rgba(255, 255, 255, 0.03)', 
                            borderRadius: '16px',
                            textAlign: 'center'
                        }}>
                            <Typography variant="subtitle2" sx={{ color: '#9ca3af', mb: 1, textTransform: 'uppercase', fontSize: '10px', fontWeight: 700 }}>
                                {m.label}
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: m.color }}>{m.value}{m.unit}</Typography>
                        </Paper>
                    </Grid>
                ))}

                {/* Productivity Ranking */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ 
                        p: 4, 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>Productividad por Operario</Typography>
                        {productivity.map((op) => (
                            <Box key={op.name} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                                <Avatar sx={{ bgcolor: op.color, width: 32, height: 32, fontSize: '12px' }}>{op.name[0]}</Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="body2">{op.name}</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{op.value}%</Typography>
                                    </Box>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={op.value} 
                                        sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { bgcolor: op.color } }}
                                    />
                                </Box>
                            </Box>
                        ))}
                    </Paper>
                </Grid>

                {/* Labor Cost vs Productivity Placeholder */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ 
                        p: 4, 
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)', 
                        borderRadius: '24px',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Análisis de Costo Laboral</Typography>
                        <Typography variant="body2" sx={{ color: '#9ca3af', mb: 4 }}>Relación entre horas trabajadas y producción total.</Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 2 }}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h4" sx={{ fontWeight: 800 }}>$14.2k</Typography>
                                <Typography variant="caption" sx={{ color: '#9ca3af' }}>Costo Total Hoy</Typography>
                            </Box>
                            <Box sx={{ height: 60, width: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: '#10b981' }}>$3.34</Typography>
                                <Typography variant="caption" sx={{ color: '#9ca3af' }}>Costo por Unidad</Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default RRHHDashboardPage;
