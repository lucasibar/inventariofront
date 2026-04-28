import React from 'react';
import { Box, Grid, Paper, Typography, LinearProgress } from '@mui/material';

const AdminDashboardPage: React.FC = () => {
    // Mock Data
    const sectors = [
        { name: 'Producción', status: '85%', color: '#f59e0b', icon: '⚙️' },
        { name: 'Ventas', status: '$1.2M', color: '#10b981', icon: '📈' },
        { name: 'Finanzas', status: 'Saludable', color: '#6366f1', icon: '💰' },
        { name: 'RRHH', status: '92% Asist.', color: '#ec4899', icon: '👥' },
        { name: 'Inventariado', status: '98% Cap.', color: '#3b82f6', icon: '🏭' },
        { name: 'Mantenimiento', status: '4 Activas', color: '#ef4444', icon: '🛠️' },
    ];

    const stats = [
        { label: 'Eficiencia Global Planta', value: 78, unit: '%' },
        { label: 'Cumplimiento Pedidos', value: 92, unit: '%' },
        { label: 'Disponibilidad Máquinas', value: 88, unit: '%' },
        { label: 'Costo Laboral vs Prod', value: 45, unit: '%' },
    ];

    return (
        <Box sx={{ p: 4, background: '#0f1117', minHeight: '100vh', color: '#f3f4f6' }}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 800, color: '#a5b4fc', letterSpacing: '-0.5px' }}>
                Dashboard General de Administración
            </Typography>

            <Grid container spacing={3}>
                {/* Sector Cards */}
                {sectors.map((sector) => (
                    <Grid item xs={12} sm={6} md={4} lg={2} key={sector.name}>
                        <Paper sx={{ 
                            p: 3, 
                            background: 'rgba(255, 255, 255, 0.03)', 
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '16px',
                            textAlign: 'center',
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'translateY(-5px)', background: 'rgba(255, 255, 255, 0.05)' }
                        }}>
                            <Typography sx={{ fontSize: '24px', mb: 1 }}>{sector.icon}</Typography>
                            <Typography variant="subtitle2" sx={{ color: '#9ca3af', textTransform: 'uppercase', fontSize: '10px', fontWeight: 700 }}>
                                {sector.name}
                            </Typography>
                            <Typography variant="h6" sx={{ color: sector.color, fontWeight: 800 }}>
                                {sector.status}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}

                {/* Global Metrics */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ 
                        p: 4, 
                        height: '100%',
                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '24px'
                    }}>
                        <Typography variant="h6" sx={{ mb: 4, fontWeight: 700 }}>Métricas Globales de Operación</Typography>
                        <Grid container spacing={4}>
                            {stats.map((stat) => (
                                <Grid item xs={12} sm={6} key={stat.label}>
                                    <Box sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="body2" sx={{ color: '#9ca3af' }}>{stat.label}</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{stat.value}{stat.unit}</Typography>
                                        </Box>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={stat.value} 
                                            sx={{ 
                                                height: 8, 
                                                borderRadius: 4, 
                                                bgcolor: 'rgba(255,255,255,0.05)',
                                                '& .MuiLinearProgress-bar': {
                                                    borderRadius: 4,
                                                    background: 'linear-gradient(90deg, #6366f1 0%, #a5b4fc 100%)'
                                                }
                                            }} 
                                        />
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Paper>
                </Grid>

                {/* Recent Activity / Alerts */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ 
                        p: 4, 
                        height: '100%',
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '24px'
                    }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>Alertas de Planta</Typography>
                        {[
                            { msg: 'Retraso en línea 3 - Producción', type: 'error', time: '10m' },
                            { msg: 'Stock crítico: Hilado Algodón', type: 'warning', time: '25m' },
                            { msg: 'Nuevo pedido mayorista ingresado', type: 'info', time: '1h' },
                            { msg: 'Mantenimiento preventivo completo', type: 'success', time: '2h' },
                        ].map((alert, i) => (
                            <Box key={i} sx={{ 
                                display: 'flex', gap: 2, mb: 2, p: 2, 
                                borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.02)',
                                borderLeft: `4px solid ${alert.type === 'error' ? '#ef4444' : alert.type === 'warning' ? '#f59e0b' : '#3b82f6'}`
                            }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" sx={{ fontSize: '13px' }}>{alert.msg}</Typography>
                                    <Typography sx={{ fontSize: '10px', color: '#6b7280' }}>Hace {alert.time}</Typography>
                                </Box>
                            </Box>
                        ))}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AdminDashboardPage;
