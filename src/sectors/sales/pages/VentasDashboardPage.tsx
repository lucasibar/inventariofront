import React from 'react';
import { Box, Grid, Paper, Typography, Divider } from '@mui/material';

const VentasDashboardPage: React.FC = () => {
    // Mock Data
    const metrics = [
        { label: 'Ventas del día', value: '$45,200', color: '#10b981' },
        { label: 'Ventas del mes', value: '$1,240,000', color: '#6366f1' },
        { label: 'Pedidos pendientes', value: '24', color: '#f59e0b' },
        { label: 'Facturación Hoy', value: '$38,900', color: '#3b82f6' },
        { label: 'Clientes activos', value: '152', color: '#ec4899' },
        { label: 'Ticket promedio', value: '$1,850', color: '#8b5cf6' },
    ];

    const recentOrders = [
        { id: 'ORD-123', client: 'Distribuidora Norte', total: '$12,400', status: 'Pendiente' },
        { id: 'ORD-124', client: 'Textil Sur S.A.', total: '$8,200', status: 'Facturado' },
        { id: 'ORD-125', client: 'Moda Express', total: '$4,150', status: 'Enviado' },
        { id: 'ORD-126', client: 'Boutique Central', total: '$2,900', status: 'Pendiente' },
    ];

    return (
        <Box sx={{ p: 4, background: '#0f1117', minHeight: '100vh', color: '#f3f4f6' }}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 800, color: '#ec4899' }}>
                Dashboard de Ventas y Pedidos
            </Typography>

            <Grid container spacing={3}>
                {/* Stats Cards */}
                {metrics.map((m) => (
                    <Grid item xs={12} sm={6} md={4} key={m.label}>
                        <Paper sx={{ 
                            p: 3, 
                            background: 'rgba(255, 255, 255, 0.03)', 
                            borderRadius: '16px',
                            borderTop: `4px solid ${m.color}`,
                        }}>
                            <Typography variant="subtitle2" sx={{ color: '#9ca3af', mb: 1, textTransform: 'uppercase', fontSize: '11px', fontWeight: 700 }}>
                                {m.label}
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff' }}>{m.value}</Typography>
                        </Paper>
                    </Grid>
                ))}

                {/* Recent Orders Table Placeholder */}
                <Grid item xs={12}>
                    <Paper sx={{ 
                        p: 4, 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>Últimos Pedidos</Typography>
                        <Box sx={{ width: '100%' }}>
                            {recentOrders.map((order, i) => (
                                <Box key={order.id}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 2, alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>{order.client}</Typography>
                                            <Typography variant="caption" sx={{ color: '#6b7280' }}>{order.id}</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#10b981' }}>{order.total}</Typography>
                                            <Typography variant="caption" sx={{ 
                                                px: 1, borderRadius: '4px', 
                                                bgcolor: order.status === 'Pendiente' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                                                color: order.status === 'Pendiente' ? '#f59e0b' : '#10b981'
                                            }}>
                                                {order.status}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    {i < recentOrders.length - 1 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />}
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default VentasDashboardPage;
