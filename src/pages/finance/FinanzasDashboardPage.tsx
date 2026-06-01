import React from 'react';
import { Box, Grid, Paper, Typography, LinearProgress } from '@mui/material';

const FinanzasDashboardPage: React.FC = () => {
    // Mock Data
    const metrics = [
        { label: 'Saldo Caja y Bancos', value: '$2,850,000', color: '#10b981' },
        { label: 'Resultado del Mes', value: '+$420,000', color: '#6366f1' },
        { label: 'Margen Bruto', value: '32', unit: '%', color: '#8b5cf6' },
        { label: 'Costo Unidad Prod.', value: '$42.50', color: '#f59e0b' },
    ];

    const projections = [
        { label: 'Cuentas por Cobrar', value: '$840,000', color: '#10b981' },
        { label: 'Cuentas por Pagar', value: '$320,000', color: '#ef4444' },
    ];

    return (
        <Box sx={{ p: 4, background: '#0f1117', minHeight: '100vh', color: '#f3f4f6' }}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 800, color: '#10b981' }}>
                Dashboard Financiero
            </Typography>

            <Grid container spacing={3}>
                {/* Main Cash Stats */}
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
                            <Typography variant="h5" sx={{ fontWeight: 800, color: m.color }}>{m.value}{m.unit}</Typography>
                        </Paper>
                    </Grid>
                ))}

                {/* Projection Chart Placeholder */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ 
                        p: 4, 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        height: '100%'
                    }}>
                        <Typography variant="h6" sx={{ mb: 4, fontWeight: 700 }}>Flujo de Caja Proyectado</Typography>
                        <Box sx={{ display: 'flex', gap: 2, height: 200, alignItems: 'flex-end', justifyContent: 'space-around' }}>
                            {[40, 60, 45, 80, 55, 70, 90].map((v, i) => (
                                <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 40, height: v * 2, bgcolor: '#6366f1', borderRadius: '4px 4px 0 0', opacity: 0.7 + (i * 0.05) }} />
                                    <Typography sx={{ fontSize: '10px', color: '#6b7280' }}>Día {i + 1}</Typography>
                                </Box>
                            ))}
                        </Box>
                        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 12, height: 12, bgcolor: '#6366f1', borderRadius: '2px' }} />
                                <Typography sx={{ fontSize: '12px', color: '#9ca3af' }}>Ingresos Proyectados</Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>

                {/* Receivables/Payables Summary */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ 
                        p: 4, 
                        background: 'rgba(255, 255, 255, 0.03)', 
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        height: '100%'
                    }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>Resumen de Deudas</Typography>
                        {projections.map((p) => (
                            <Box key={p.label} sx={{ mb: 4 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>{p.label}</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: p.color }}>{p.value}</Typography>
                                </Box>
                                <LinearProgress 
                                    variant="determinate" 
                                    value={70} 
                                    sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { bgcolor: p.color } }}
                                />
                            </Box>
                        ))}
                        <Typography variant="caption" sx={{ color: '#6b7280', fontStyle: 'italic' }}>
                            * Datos proyectados a 30 días según vencimientos de facturas.
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default FinanzasDashboardPage;
