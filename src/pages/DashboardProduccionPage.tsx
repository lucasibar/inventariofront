import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Card as MuiCard, CardContent, useMediaQuery, useTheme, Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemButton, ListItemText, Chip } from '@mui/material';
import { Spinner, Select } from './common/ui';
import { 
    useGetPlantsQuery, 
    useGetMachineTypesQuery,
    useGetMetricsQuery,
    useGetPlantKPIsQuery,
    useGetMachinesQuery,
} from '../entities/performance/api/performanceApi';
import type { Machine } from '../entities/performance/api/performanceApi';

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

// Reusable Metric Card
const MetricCard = ({ title, value, color = '#6366f1', horizontal = false, onClick }: { title: string, value: string | number, color?: string, horizontal?: boolean, onClick?: () => void }) => {
    const clickable = !!onClick;
    if (horizontal) {
        return (
            <MuiCard 
                onClick={onClick}
                sx={{ 
                    bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, mb: 1, borderLeft: `4px solid ${color}`,
                    cursor: clickable ? 'pointer' : 'default',
                    transition: 'opacity 0.15s',
                    '&:hover': clickable ? { opacity: 0.8 } : {},
                }}
            >
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '16px !important' }}>
                    <Typography variant="subtitle2" sx={{ color: '#9ca3af', fontWeight: 600 }}>{title}</Typography>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>{value}</Typography>
                </CardContent>
            </MuiCard>
        );
    }
    
    return (
        <MuiCard 
            onClick={onClick}
            sx={{ 
                bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, height: '100%', borderTop: `4px solid ${color}`,
                cursor: clickable ? 'pointer' : 'default',
                transition: 'transform 0.15s, opacity 0.15s',
                '&:hover': clickable ? { transform: 'translateY(-2px)', opacity: 0.85 } : {},
            }}
        >
            <CardContent>
                <Typography variant="subtitle2" sx={{ color: '#9ca3af', mb: 1 }}>{title}</Typography>
                <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700 }}>{value}</Typography>
                {clickable && (
                    <Typography variant="caption" sx={{ color: color, mt: 1, display: 'block' }}>Ver listado →</Typography>
                )}
            </CardContent>
        </MuiCard>
    );
};

export default function DashboardProduccionPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    
    // Machine list modal state
    const [machineListStatus, setMachineListStatus] = useState<string | null>(null);

    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const handleOpen = () => setFilterModalOpen(true);
        document.addEventListener('open-production-filters', handleOpen);
        return () => document.removeEventListener('open-production-filters', handleOpen);
    }, []);

    // Queries
    const { data: plants = [], isLoading: loadingPlants } = useGetPlantsQuery();
    const { data: machineTypes = [], isLoading: loadingTypes } = useGetMachineTypesQuery();

    useEffect(() => {
        if (plants.length > 0 && !selectedPlantId) {
            const derWill = plants.find(p => p.name.toLowerCase().includes('der will') || p.name.toLowerCase().includes('derwill'));
            setSelectedPlantId(derWill?.id || plants[0].id);
        }
    }, [plants, selectedPlantId]);

    const { data: metrics, isLoading: loadingMetrics } = useGetMetricsQuery(
        { plantId: selectedPlantId || '' },
        { skip: !selectedPlantId }
    );

    const { data: kpis, isLoading: loadingKpis } = useGetPlantKPIsQuery(
        { plantId: selectedPlantId || '', startDate, endDate },
        { skip: !selectedPlantId }
    );

    // Load all machines for the selected plant (for status list)
    const { data: allMachines = [] } = useGetMachinesQuery(
        { plantId: selectedPlantId || '' },
        { skip: !selectedPlantId }
    );

    const plantOptions = useMemo(() => plants.map(p => ({ value: p.id, label: p.name })), [plants]);
    const typeOptions = useMemo(() => {
        const options = machineTypes.map(t => ({ value: t.id, label: t.name }));
        return [{ value: 'ALL', label: 'Todos los tipos' }, ...options];
    }, [machineTypes]);

    const statusCounts = useMemo(() => {
        const counts = { ACTIVA: 0, PARADA: 0, REVISAR: 0, VELOCIDAD_REDUCIDA: 0, ELECTRONIC: 0 };
        if (metrics?.byStatus) {
            metrics.byStatus.forEach((s: any) => {
                counts[s.status as keyof typeof counts] = parseInt(s.count, 10);
            });
        }
        return counts;
    }, [metrics]);

    // Machines filtered by the selected status
    const machinesInStatus = useMemo(() => {
        if (!machineListStatus) return [];
        return allMachines.filter((m: Machine) => m.status === machineListStatus);
    }, [allMachines, machineListStatus]);

    const openMachineList = (status: string) => setMachineListStatus(status);

    const handleMachineClick = (machine: Machine) => {
        setMachineListStatus(null);
        navigate('/produccion/buscador', { state: { machine, plantId: selectedPlantId } });
    };

    if (loadingPlants || loadingTypes) return <Spinner />;

    const FilterContent = () => (
        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, minWidth: isMobile ? '100%' : '800px' }}>
            <Box sx={{ flex: 1 }}>
                <Select 
                    label="Planta"
                    value={selectedPlantId || ''}
                    onChange={setSelectedPlantId}
                    options={plantOptions}
                />
            </Box>
            <Box sx={{ flex: 1 }}>
                <Select 
                    label="Tipo de Máquina"
                    value={selectedTypeId || 'ALL'}
                    onChange={setSelectedTypeId}
                    options={typeOptions}
                />
            </Box>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>Desde</label>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                        width: '100%', background: '#0f1117', border: '1px solid #374151', borderRadius: '8px',
                        padding: '8px 10px', color: '#f3f4f6', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                        colorScheme: 'dark'
                    }}
                />
            </Box>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>Hasta</label>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                        width: '100%', background: '#0f1117', border: '1px solid #374151', borderRadius: '8px',
                        padding: '8px 10px', color: '#f3f4f6', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                        colorScheme: 'dark'
                    }}
                />
            </Box>
        </Box>
    );

    return (
        <Box sx={{ p: isMobile ? 2 : 4, maxWidth: '1400px', margin: '0 auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                {!isMobile && (
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Dashboard de Producción</Typography>
                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>Indicadores globales de la planta</Typography>
                    </Box>
                )}
                {!isMobile && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <FilterContent />
                    </Box>
                )}
            </Box>

            {(loadingMetrics || loadingKpis) ? (
                <Spinner />
            ) : (
                <Box>
                    {isMobile ? (
                        // MOBILE LAYOUT
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase', mt: 1, mb: 0.5, fontWeight: 700 }}>
                                Indicadores de Eficiencia (KPIs)
                            </Typography>
                            <MetricCard horizontal title="Disponibilidad Planta" value={kpis?.availability || '0%'} color="#3b82f6" />
                            <MetricCard horizontal title="OEE Global" value={kpis?.oee || '0%'} color="#8b5cf6" />
                            <MetricCard horizontal title="MTBF (Promedio)" value={kpis?.mtbf || '0s'} color="#10b981" />
                            <MetricCard horizontal title="MTTR (Promedio)" value={kpis?.mttr || '0s'} color="#ef4444" />
                            
                            <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase', mt: 3, mb: 0.5, fontWeight: 700 }}>
                                Estado Actual — Tocá para ver el listado
                            </Typography>
                            <MetricCard horizontal title="Máquinas Activas" value={statusCounts.ACTIVA} color="#10b981" onClick={() => openMachineList('ACTIVA')} />
                            <MetricCard horizontal title="Parada" value={statusCounts.PARADA} color="#ef4444" onClick={() => openMachineList('PARADA')} />
                            <MetricCard horizontal title="En Revisión" value={statusCounts.REVISAR} color="#eab308" onClick={() => openMachineList('REVISAR')} />
                            <MetricCard horizontal title="Electrónica" value={statusCounts.ELECTRONIC} color="#3b82f6" onClick={() => openMachineList('ELECTRONIC')} />
                            <MetricCard horizontal title="Vel. Reducida" value={statusCounts.VELOCIDAD_REDUCIDA} color="#f472b6" onClick={() => openMachineList('VELOCIDAD_REDUCIDA')} />
                        </Box>
                    ) : (
                        // DESKTOP LAYOUT
                        <>
                            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Indicadores Globales</Typography>
                            <Grid container spacing={3} sx={{ mb: 4 }}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <MetricCard title="Disponibilidad" value={kpis?.availability || '0%'} color="#3b82f6" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <MetricCard title="OEE" value={kpis?.oee || '0%'} color="#8b5cf6" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <MetricCard title="MTBF" value={kpis?.mtbf || '0s'} color="#10b981" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <MetricCard title="MTTR" value={kpis?.mttr || '0s'} color="#ef4444" />
                                </Grid>
                            </Grid>

                            <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>Distribución de Estados — <Typography component="span" variant="body2" sx={{ color: '#6b7280' }}>Hacé click para ver el listado de máquinas</Typography></Typography>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                                    <MetricCard title="Activas" value={statusCounts.ACTIVA} color="#10b981" onClick={() => openMachineList('ACTIVA')} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                                    <MetricCard title="Paradas" value={statusCounts.PARADA} color="#ef4444" onClick={() => openMachineList('PARADA')} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                                    <MetricCard title="Revisar" value={statusCounts.REVISAR} color="#eab308" onClick={() => openMachineList('REVISAR')} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                                    <MetricCard title="Electrónica" value={statusCounts.ELECTRONIC} color="#3b82f6" onClick={() => openMachineList('ELECTRONIC')} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                                    <MetricCard title="Vel. Reducida" value={statusCounts.VELOCIDAD_REDUCIDA} color="#f472b6" onClick={() => openMachineList('VELOCIDAD_REDUCIDA')} />
                                </Grid>
                            </Grid>
                        </>
                    )}
                </Box>
            )}

            {/* Machine List Modal */}
            <Dialog
                open={!!machineListStatus}
                onClose={() => setMachineListStatus(null)}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { bgcolor: '#1a1a1a', color: 'white' } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    Máquinas en estado{' '}
                    {machineListStatus && (
                        <Chip
                            label={statusLabels[machineListStatus] || machineListStatus}
                            size="small"
                            sx={{
                                bgcolor: `${statusColors[machineListStatus] || '#6b7280'}20`,
                                color: statusColors[machineListStatus] || '#d1d5db',
                                border: `1px solid ${statusColors[machineListStatus] || '#6b7280'}50`,
                                fontWeight: 700,
                            }}
                        />
                    )}
                    <Typography variant="caption" sx={{ color: '#6b7280', ml: 'auto' }}>
                        {machinesInStatus.length} máquinas
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ p: 0, maxHeight: '60vh', overflowY: 'auto' }}>
                    {machinesInStatus.length === 0 ? (
                        <Typography sx={{ p: 3, color: '#6b7280', textAlign: 'center' }}>
                            No hay máquinas en este estado.
                        </Typography>
                    ) : (
                        <List disablePadding>
                            {machinesInStatus.map((machine: Machine) => (
                                <ListItem key={machine.id} disablePadding divider sx={{ '& .MuiDivider-root': { borderColor: '#2a2d3e' } }}>
                                    <ListItemButton
                                        onClick={() => handleMachineClick(machine)}
                                        sx={{ '&:hover': { bgcolor: 'rgba(99,102,241,0.1)' } }}
                                    >
                                        <ListItemText
                                            primary={
                                                <Typography sx={{ color: '#f3f4f6', fontWeight: 600 }}>
                                                    Máquina {machine.number}
                                                    {machine.codigoInterno && (
                                                        <Typography component="span" variant="caption" sx={{ color: '#6b7280', ml: 1 }}>
                                                            ({machine.codigoInterno})
                                                        </Typography>
                                                    )}
                                                </Typography>
                                            }
                                            secondary={
                                                machine.lastObservation && (
                                                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                                                        {machine.lastObservation}
                                                    </Typography>
                                                )
                                            }
                                        />
                                        <Typography variant="caption" sx={{ color: '#6366f1' }}>Ver →</Typography>
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setMachineListStatus(null)} variant="outlined" sx={{ color: '#9ca3af', borderColor: '#374151' }}>
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Mobile Filter Modal */}
            <Dialog 
                open={filterModalOpen} 
                onClose={() => setFilterModalOpen(false)}
                fullWidth
                maxWidth="xs"
                PaperProps={{ sx: { bgcolor: '#1a1a1a', color: 'white' } }}
            >
                <DialogTitle>Filtros del Dashboard</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                        <FilterContent />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setFilterModalOpen(false)} variant="contained" fullWidth>
                        Aplicar Filtros
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}
