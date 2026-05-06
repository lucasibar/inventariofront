import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Card as MuiCard, CardContent, useMediaQuery, useTheme, Button, List, ListItem, Collapse } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Spinner, Select } from '../../../shared/ui';
import { 
    useGetPlantsQuery, 
    useGetMachineTypesQuery,
    useGetMetricsQuery,
    useGetPlantKPIsQuery,
    useGetMachinesQuery,
    useUpdateMachineStatusMutation,
    useUpdateLogMutation,
    useGetLogsQuery
} from '../api/maintenance.api';
import type { Machine } from '../api/maintenance.api';

const statusColors: Record<string, string> = {
    ACTIVA: '#10b981',
    PARADA: '#ef4444',
    REVISAR: '#eab308',
    VELOCIDAD_REDUCIDA: '#f97316',
    ELECTRONIC: '#3b82f6',
    FALTA_COSTURA: '#8b5cf6',
    FALTA_PROGRAMA: '#06b6d4',
};

const responsables = ['Gaston', 'Ruben', 'Daniel', 'Alexis', 'Violeta', 'Leandro', 'Gaspar', 'Ramón', 'Tejedor'];

const InteractiveMachineItem = ({ machine }: { machine: Machine }) => {
    const [updateStatus] = useUpdateMachineStatusMutation();
    const [updateLog] = useUpdateLogMutation();
    const { data: logs } = useGetLogsQuery({ machineId: machine.id }, { skip: !machine.id });

    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [isEditingMechanic, setIsEditingMechanic] = useState(false);
    const [mechanicName, setMechanicName] = useState(machine.lastChangeBy || '');

    const timeAgo = useMemo(() => {
        const date = machine.lastStatusChange ? new Date(machine.lastStatusChange) : new Date(machine.createdAt);
        const diff = Date.now() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}h`;
        const mins = Math.floor(diff / (1000 * 60));
        return `${mins}m`;
    }, [machine.lastStatusChange, machine.createdAt, machine.status]);

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        if (newStatus !== machine.status) {
            await updateStatus({
                id: machine.id,
                plantId: machine.plantId,
                typeId: machine.typeId,
                status: newStatus,
                generatedBy: machine.lastChangeBy || 'Sistema',
            });
        }
        setIsEditingStatus(false);
    };

    const handleMechanicSave = async () => {
        if (mechanicName !== machine.lastChangeBy && logs && logs.length > 0) {
            const lastLog = logs[0];
            await updateLog({ id: lastLog.id, generatedBy: mechanicName });
        }
        setIsEditingMechanic(false);
    };

    return (
        <ListItem sx={{ bgcolor: 'rgba(255,255,255,0.05)', mb: 1, borderRadius: 1, p: 1.5, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'white', lineHeight: 1.2 }}>Máquina {machine.number}</Typography>
                {isEditingMechanic ? (
                    <select
                        autoFocus
                        value={mechanicName}
                        onChange={(e) => setMechanicName(e.target.value)}
                        onBlur={handleMechanicSave}
                        style={{ width: '120px', padding: '2px 4px', background: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', outline: 'none', fontSize: '0.75rem', marginTop: '4px' }}
                    >
                        <option value="">Sin asignar</option>
                        {responsables.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                ) : (
                    <Typography 
                        variant="caption" 
                        onClick={() => setIsEditingMechanic(true)}
                        sx={{ 
                            color: machine.lastChangeBy ? '#9ca3af' : '#ef4444', 
                            cursor: 'pointer', 
                            mt: 0.5,
                            lineHeight: 1,
                            textDecoration: 'underline',
                            textDecorationStyle: 'dashed',
                            textUnderlineOffset: '2px'
                        }}
                    >
                        {machine.lastChangeBy || 'Sin asignar'}
                    </Typography>
                )}
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                {isEditingStatus ? (
                    <select 
                        autoFocus
                        defaultValue={machine.status}
                        onBlur={() => setIsEditingStatus(false)}
                        onChange={handleStatusChange}
                        style={{ padding: '2px 4px', background: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', outline: 'none', fontSize: '0.75rem', marginBottom: '4px' }}
                    >
                        {Object.keys(statusColors).map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                ) : (
                    <Typography 
                        variant="caption" 
                        onClick={() => setIsEditingStatus(true)}
                        sx={{ 
                            color: statusColors[machine.status] || '#fff', 
                            fontWeight: 'bold', 
                            cursor: 'pointer', 
                            px: 1, 
                            py: 0.25, 
                            bgcolor: 'rgba(0,0,0,0.2)', 
                            borderRadius: 1,
                            mb: 0.5,
                            border: `1px solid ${statusColors[machine.status] || '#fff'}40`
                        }}
                    >
                        {machine.status}
                    </Typography>
                )}
                <Typography variant="caption" sx={{ color: '#6b7280', lineHeight: 1, mt: 0.5, textAlign: 'right' }}>
                    {logs && logs[0]?.failureType ? `${logs[0].failureType} · ` : ''}{timeAgo}
                </Typography>
            </Box>
        </ListItem>
    );
};

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
    
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

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
            if (derWill) setSelectedPlantId(derWill.id);
        }
    }, [plants, selectedPlantId]);

    useEffect(() => {
        if (machineTypes.length > 0 && !selectedTypeId) {
            const tejeduria = machineTypes.find((t: any) => t.name.toLowerCase().includes('tejedur'));
            if (tejeduria) setSelectedTypeId(tejeduria.id);
        }
    }, [machineTypes, selectedTypeId]);

    useEffect(() => {
        const handleOpenFilters = () => setShowFilters(prev => !prev);
        document.addEventListener('open-maintenance-filters', handleOpenFilters);
        return () => document.removeEventListener('open-maintenance-filters', handleOpenFilters);
    }, []);

    const { data: metrics, isLoading: loadingMetrics } = useGetMetricsQuery(
        { plantId: selectedPlantId || '', typeId: selectedTypeId || '' },
        { skip: !selectedPlantId }
    );

    const { data: kpis, isLoading: loadingKpis } = useGetPlantKPIsQuery(
        { plantId: selectedPlantId || '', startDate, endDate, typeId: selectedTypeId || '' },
        { skip: !selectedPlantId }
    );

    const { data: allMachines = [] } = useGetMachinesQuery(
        { plantId: selectedPlantId || '', typeId: selectedTypeId || '' },
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

    if (loadingPlants || loadingTypes) return <Spinner />;

    const FilterContent = () => (
        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, mb: 3, p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
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
            {!isMobile && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                    <Button 
                        variant="outlined" 
                        onClick={() => setShowFilters(!showFilters)}
                        startIcon={<FilterListIcon />}
                        sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                    >
                        Filtros
                    </Button>
                </Box>
            )}

            <Collapse in={showFilters}>
                <FilterContent />
            </Collapse>

            {(loadingMetrics || loadingKpis) ? (
                <Spinner />
            ) : (
                <Box>
                    {isMobile ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <MetricCard horizontal title="Disponibilidad Planta" value={kpis?.availability || '0%'} color="#3b82f6" />
                            <MetricCard horizontal title="MTBF" value={kpis?.mtbf || '0s'} color="#10b981" />
                            <MetricCard horizontal title="MTTR" value={kpis?.mttr || '0s'} color="#ef4444" />
                            
                            {[
                                { key: 'ACTIVA', title: "Máquinas Activas", color: "#10b981", value: statusCounts.ACTIVA },
                                { key: 'PARADA', title: "Parada", color: "#ef4444", value: statusCounts.PARADA },
                                { key: 'REVISAR', title: "Revisar", color: "#eab308", value: statusCounts.REVISAR },
                                { key: 'ELECTRONIC', title: "Electrónica", color: "#3b82f6", value: statusCounts.ELECTRONIC },
                                { key: 'VELOCIDAD_REDUCIDA', title: "Vel. Reducida", color: "#f97316", value: statusCounts.VELOCIDAD_REDUCIDA },
                                { key: 'FALTA_COSTURA', title: "Falta Costura", color: "#8b5cf6", value: statusCounts.FALTA_COSTURA },
                                { key: 'FALTA_PROGRAMA', title: "Falta Programa", color: "#06b6d4", value: statusCounts.FALTA_PROGRAMA }
                            ].map(s => (
                                <MetricCard 
                                    key={s.key}
                                    horizontal 
                                    title={s.title} 
                                    value={s.value} 
                                    color={s.color} 
                                />
                            ))}
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
                                    <MetricCard title="Activas" value={statusCounts.ACTIVA} color="#10b981" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <MetricCard title="Paradas" value={statusCounts.PARADA} color="#ef4444" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <MetricCard title="Revisar" value={statusCounts.REVISAR} color="#eab308" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                    <MetricCard title="Electrónica" value={statusCounts.ELECTRONIC} color="#3b82f6" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <MetricCard title="Vel. Reducida" value={statusCounts.VELOCIDAD_REDUCIDA} color="#f97316" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <MetricCard title="Falta Costura" value={statusCounts.FALTA_COSTURA} color="#8b5cf6" />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <MetricCard title="Falta Programa" value={statusCounts.FALTA_PROGRAMA} color="#06b6d4" />
                                </Grid>
                            </Grid>
                        </>
                    )}

                    <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #333' }}>
                        <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                            Máquinas con Novedades (No Activas)
                        </Typography>
                        <List disablePadding>
                            {allMachines.filter((m: Machine) => m.status !== 'ACTIVA').length > 0 ? 
                                allMachines.filter((m: Machine) => m.status !== 'ACTIVA').map((machine: Machine) => (
                                <InteractiveMachineItem key={machine.id} machine={machine} />
                            )) : (
                                <Typography variant="body2" sx={{ color: '#9ca3af', p: 1 }}>Todas las máquinas están operando normalmente.</Typography>
                            )}
                        </List>
                    </Box>
                </Box>
            )}
        </Box>
    );
}
