import React from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';

const StockDashboardPage: React.FC = () => {
    // Mock Data
    const metrics = [
        { label: 'Capacidad Utilizada', value: '88', unit: '%', color: '#6366f1' },
        { label: 'Items en Stock', value: '1,420', unit: 'uds', color: '#10b981' },
        { label: 'Movimientos Hoy', value: '45', unit: 'regs', color: '#f59e0b' },
        { label: 'Alertas Stock Bajo', value: '12', unit: 'items', color: '#ef4444' },
    ];

    return (
        <Box sx={{ p: 4, background: '#0f1117', minHeight: '100vh', color: '#f3f4f6' }}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 800, color: '#3b82f6' }}>
                Dashboard de Inventariado
            </Typography>

            <Grid container spacing={3}>
                {metrics.map((m) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={m.label}>
                        <Paper sx={{ 
                            p: 3, 
                            background: 'rgba(255, 255, 255, 0.03)', 
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                        }}>
                            <Typography variant="subtitle2" sx={{ color: '#9ca3af', mb: 1, textTransform: 'uppercase', fontSize: '11px', fontWeight: 700 }}>
                                {m.label}
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: m.color }}>{m.value}{m.unit}</Typography>
                        </Paper>
                    </Grid>
                ))}

                <Grid size={{ xs: 12 }}>
                    <Paper sx={{ 
                        p: 4, 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        minHeight: 300,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Typography sx={{ color: '#6b7280' }}>Gráfico de ocupación por sectores en desarrollo...</Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default StockDashboardPage;
