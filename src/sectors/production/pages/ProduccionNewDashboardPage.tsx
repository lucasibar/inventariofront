import React from 'react';
import { Box, Grid, Paper, Typography, LinearProgress, Divider } from '@mui/material';

const ProduccionNewDashboardPage: React.FC = () => {
    // Mock Data
    const metrics = [
        { label: 'Producción del día', value: '4,250', unit: 'uds', color: '#6366f1' },
        { label: 'Producción planificada', value: '5,000', unit: 'uds', color: '#94a3b8' },
        { label: 'Cumplimiento del plan', value: 85, unit: '%', color: '#10b981' },
        { label: 'Scrap / Segunda', value: '120', unit: 'uds', color: '#ef4444' },
        { label: 'Eficiencia (OEE)', value: 78, unit: '%', color: '#f59e0b' },
        { label: 'Tiempo de parada', value: '45', unit: 'min', color: '#ef4444' },
    ];

    const productionByLine = [
        { line: 'Línea 1', value: 80, color: '#6366f1' },
        { line: 'Línea 2', value: 65, color: '#8b5cf6' },
        { line: 'Línea 3', value: 92, color: '#10b981' },
        { line: 'Línea 4', value: 45, color: '#f59e0b' },
    ];

    return (
        <Box sx={{ p: 4, background: '#0f1117', minHeight: '100vh', color: '#f3f4f6' }}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 800, color: '#f59e0b' }}>
                Dashboard de Producción Real-Time
            </Typography>

            <Grid container spacing={3}>
                {/* Main Metrics Cards */}
                {metrics.map((m) => (
                    <Grid item xs={12} sm={6} md={4} key={m.label}>
                        <Paper sx={{ 
                            p: 3, 
                            background: 'rgba(255, 255, 255, 0.03)', 
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                        }}>
                            <Typography variant="subtitle2" sx={{ color: '#9ca3af', mb: 1, textTransform: 'uppercase', fontSize: '11px', fontWeight: 700 }}>
                                {m.label}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: m.color }}>{m.value}</Typography>
                                <Typography variant="body2" sx={{ color: '#6b7280' }}>{m.unit}</Typography>
                            </Box>
                            {typeof m.value === 'number' && (
                                <LinearProgress 
                                    variant="determinate" 
                                    value={m.value} 
                                    sx={{ mt: 2, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { bgcolor: m.color } }}
                                />
                            )}
                        </Paper>
                    </Grid>
                ))}

                {/* Production by Line Chart */}
                <Grid item xs={12} md={7}>
                    <Paper sx={{ 
                        p: 4, 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        height: '100%'
                    }}>
                        <Typography variant="h6" sx={{ mb: 4, fontWeight: 700 }}>Producción por Línea</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {productionByLine.map((line) => (
                                <Box key={line.line}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>{line.line}</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{line.value}%</Typography>
                                    </Box>
                                    <Box sx={{ height: 30, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <Box sx={{ height: '100%', width: `${line.value}%`, bgcolor: line.color, transition: 'width 1s ease-in-out' }} />
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>

                {/* Efficiency Gauge / Summary */}
                <Grid item xs={12} md={5}>
                    <Paper sx={{ 
                        p: 4, 
                        background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%)', 
                        borderRadius: '24px',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center'
                    }}>
                        <Box sx={{ 
                            width: 150, height: 150, borderRadius: '50%', 
                            border: '10px solid rgba(245, 158, 11, 0.1)',
                            borderTop: '10px solid #f59e0b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            mb: 3, transform: 'rotate(45deg)'
                        }}>
                            <Typography variant="h3" sx={{ fontWeight: 800, color: '#f59e0b', transform: 'rotate(-45deg)' }}>
                                78%
                            </Typography>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Eficiencia General (OEE)</Typography>
                        <Typography variant="body2" sx={{ color: '#9ca3af', maxWidth: 250, mt: 1 }}>
                            La planta está operando un 12% por debajo del objetivo ideal.
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ProduccionNewDashboardPage;
