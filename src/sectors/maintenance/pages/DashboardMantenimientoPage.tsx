import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Card as MuiCard, CardContent, useMediaQuery, useTheme, Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { Spinner, Select } from '../../../shared/ui';
import { 
    useGetPlantsQuery, 
    useGetMachineTypesQuery,
    useGetMetricsQuery,
    useGetPlantKPIsQuery,
    useGetMachinesQuery,
} from '../api/maintenance.api';
import type { Machine } from '../api/maintenance.api';



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
                <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>{value}</Typography>
                {clickable && (
                    <Typography variant="caption" sx={{ color: color, mt: 1, display: 'block' }}>Ver listado →</Typography>
                )}
            </CardContent>
        </MuiCard>
    );
};

export default function DashboardMantenimientoPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

    
    const [machineListStatus, setMachineListStatus] = useState<string | null>(null);

    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);



    const { data: plants = [], isLoading: loadingPlants } = useGetPlantsQuery();
    const { data: machineTypes = [], isLoading: loadingTypes } = useGetMachineTypesQuery();

    useEffect(() => {
        if (plants.length > 0 && !selectedPlantId) {
            const derWill = plants.find((p: any) => p.name.toLowerCase().includes('der will') || p.name.toLowerCase().includes('derwill'));
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

    const { data: allMachines = [] } = useGetMachinesQuery(
        { plantId: selectedPlantId || '' },
        { skip: !selectedPlantId }
    );

    const plantOptions = useMemo(() => plants.map((p: any) => ({ value: p.id, label: p.name })), [plants]);
    const typeOptions = useMemo(() => {
        const options = machineTypes.map((t: any) => ({ value: t.id, label: t.name }));
        return [{ value: 'ALL', label: 'Todos los tipos' }, ...options];
    }, [machineTypes]);

    const statusCounts = useMemo(() => {
        const counts = { ACTIVA: 0, PARADA: 0, REVISAR: 0, VELOCIDAD_REDUCIDA: 0, ELECTRONIC: 0, FALTA_COSTURA: 0, FALTA_PROGRAMA: 0 };
        if (metrics?.byStatus) {
            metrics.byStatus.forEach((s: any) => {
                counts[s.status as keyof typeof counts] = parseInt(s.count, 10);
            });
        }
        return counts;
    }, [metrics]);

    const machinesInStatus = useMemo(() => {
        if (!machineListStatus) return [];
        return allMachines.filter((m: Machine) => m.status === machineListStatus);
    }, [allMachines, machineListStatus]);

    const openMachineList = (status: string) => setMachineListStatus(status);

    const handleMachineClick = (machine: Machine) => {
        setMachineListStatus(null);
        navigate('/mantenimiento/buscador', { state: { machine, plantId: selectedPlantId } });
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
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Dashboard de Mantenimiento</Typography>
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
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <MetricCard horizontal title="Disponibilidad Planta" value={kpis?.availability || '0%'} color="#3b82f6" />
                            <MetricCard horizontal title="OEE Global" value={kpis?.oee || '0%'} color="#8b5cf6" />
                            <MetricCard horizontal title="Máquinas Activas" value={statusCounts.ACTIVA} color="#10b981" onClick={() => openMachineList('ACTIVA')} />
                            <MetricCard horizontal title="Parada" value={statusCounts.PARADA} color="#ef4444" onClick={() => openMachineList('PARADA')} />
                            <MetricCard horizontal title="Revisar" value={statusCounts.REVISAR} color="#eab308" onClick={() => openMachineList('REVISAR')} />
                            <MetricCard horizontal title="Electrónica" value={statusCounts.ELECTRONIC} color="#3b82f6" onClick={() => openMachineList('ELECTRONIC')} />
                            <MetricCard horizontal title="Vel. Reducida" value={statusCounts.VELOCIDAD_REDUCIDA} color="#f97316" onClick={() => openMachineList('VELOCIDAD_REDUCIDA')} />
                            <MetricCard horizontal title="Falta Costura" value={statusCounts.FALTA_COSTURA} color="#8b5cf6" onClick={() => openMachineList('FALTA_COSTURA')} />
                            <MetricCard horizontal title="Falta Programa" value={statusCounts.FALTA_PROGRAMA} color="#06b6d4" onClick={() => openMachineList('FALTA_PROGRAMA')} />
                        </Box>
                    ) : (
                        <>
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

                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <MetricCard title="Activas" value={statusCounts.ACTIVA} color="#10b981" onClick={() => openMachineList('ACTIVA')} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <MetricCard title="Paradas" value={statusCounts.PARADA} color="#ef4444" onClick={() => openMachineList('PARADA')} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <MetricCard title="Revisar" value={statusCounts.REVISAR} color="#eab308" onClick={() => openMachineList('REVISAR')} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <MetricCard title="Electrónica" value={statusCounts.ELECTRONIC} color="#3b82f6" onClick={() => openMachineList('ELECTRONIC')} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <MetricCard title="Vel. Reducida" value={statusCounts.VELOCIDAD_REDUCIDA} color="#f97316" onClick={() => openMachineList('VELOCIDAD_REDUCIDA')} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <MetricCard title="Falta Costura" value={statusCounts.FALTA_COSTURA} color="#8b5cf6" onClick={() => openMachineList('FALTA_COSTURA')} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <MetricCard title="Falta Programa" value={statusCounts.FALTA_PROGRAMA} color="#06b6d4" onClick={() => openMachineList('FALTA_PROGRAMA')} />
                                </Grid>
                            </Grid>
                        </>
                    )}
                </Box>
            )}

            <Dialog
                open={!!machineListStatus}
                onClose={() => setMachineListStatus(null)}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { bgcolor: '#1a1a1a', color: 'white' } }}
            >
                <DialogTitle>
                    Máquinas en estado {machineListStatus}
                </DialogTitle>
                <DialogContent>
                    <List>
                        {machinesInStatus.map((machine: Machine) => (
                            <ListItem key={machine.id} disablePadding>
                                <ListItemButton onClick={() => handleMachineClick(machine)}>
                                    <ListItemText primary={`Máquina ${machine.number}`} secondary={machine.lastObservation} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMachineListStatus(null)}>Cerrar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
