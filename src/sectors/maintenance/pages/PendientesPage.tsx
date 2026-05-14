import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Chip, Button, Avatar, Tooltip, Divider, Grid } from '@mui/material';
import { PageHeader, Spinner, Select } from '../../../shared/ui';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BuildIcon from '@mui/icons-material/Build';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { 
    useGetPlantsQuery, 
    useGetMachinesQuery,
    useGetMachineTypesQuery
} from '../api/maintenance.api';

const stoppedStatuses = ['PARADA', 'ELECTRONIC', 'REPUESTOS', 'FALTA_PROGRAMA', 'OTRO'];

import { 
    MAINTENANCE_STATUS_COLORS as statusColors,
    MAINTENANCE_STATUS_LABELS as statusLabels
} from '../constants/maintenanceConstants';

export default function PendientesPage() {
    const navigate = useNavigate();
    const [selectedPlantId, setSelectedPlantId] = React.useState<string | null>(null);
    const [selectedTypeId, setSelectedTypeId] = React.useState<string | null>(null);

    const { data: plants = [], isLoading: loadingPlants } = useGetPlantsQuery();
    const { data: machineTypes = [], isLoading: loadingTypes } = useGetMachineTypesQuery();

    React.useEffect(() => {
        if (plants.length > 0 && !selectedPlantId) {
            setSelectedPlantId(plants[0].id);
        }
    }, [plants, selectedPlantId]);

    const { data: machines = [], isLoading: loadingMachines } = useGetMachinesQuery(
        { plantId: selectedPlantId || '', typeId: selectedTypeId || undefined },
        { skip: !selectedPlantId }
    );

    const plantOptions = useMemo(() => plants.map((p: any) => ({ value: p.id, label: p.name })), [plants]);
    const typeOptions = useMemo(() => [
        { value: '', label: 'Todos los tipos' },
        ...machineTypes.map((t: any) => ({ value: t.id, label: t.name }))
    ], [machineTypes]);

    const pendingMachines = useMemo(() => {
        return machines.filter((m: any) => stoppedStatuses.includes(m.status));
    }, [machines]);

    const unassignedCount = useMemo(() => {
        return pendingMachines.filter((m: any) => !m.lastChangeBy || m.lastChangeBy === 'Sin Asignar' || m.lastChangeBy === 'Tejedor').length;
    }, [pendingMachines]);

    const handleAssign = (machine: any) => {
        navigate('/mantenimiento/registro', {
            state: {
                preselectedMachine: machine,
                plantId: selectedPlantId,
                focusField: 'generatedBy'
            }
        });
    };

    const handleDetail = (machine: any) => {
        navigate('/mantenimiento/buscador', {
            state: { machine, plantId: selectedPlantId }
        });
    };

    if (loadingPlants || loadingTypes) return <Spinner />;

    return (
        <Box sx={{ p: 3, maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader 
                title="Gestión de Pendientes" 
                subtitle="Monitoreo de máquinas paradas y asignación de responsables"
            />

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={8}>
                    <Card sx={{ bgcolor: '#111827', borderRadius: 2, p: 3, border: '1px solid #1f2937' }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6}>
                                <Select 
                                    label="Filtrar por Planta"
                                    value={selectedPlantId || ''}
                                    onChange={setSelectedPlantId}
                                    options={plantOptions}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Select 
                                    label="Filtrar por Tipo"
                                    value={selectedTypeId || ''}
                                    onChange={(v) => setSelectedTypeId(v || null)}
                                    options={typeOptions}
                                />
                            </Grid>
                        </Grid>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: unassignedCount > 0 ? '#7f1d1d' : '#064e3b', borderRadius: 2, p: 3, border: '1px solid #ef444430', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                        <Box>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>SIN RESPONSABLE</Typography>
                            <Typography variant="h3" sx={{ color: 'white', fontWeight: 900 }}>{unassignedCount}</Typography>
                        </Box>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.1)', width: 64, height: 64 }}>
                            {unassignedCount > 0 ? <ErrorOutlineIcon sx={{ fontSize: 40 }} /> : <CheckCircleOutlineIcon sx={{ fontSize: 40 }} />}
                        </Avatar>
                    </Card>
                </Grid>
            </Grid>

            {loadingMachines ? <Spinner /> : pendingMachines.length === 0 ? (
                <Box sx={{ p: 10, textAlign: 'center', bgcolor: '#111827', borderRadius: 3, border: '1px dashed #374151' }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 80, color: '#10b981', mb: 2, opacity: 0.5 }} />
                    <Typography variant="h5" sx={{ color: 'white' }}>No hay máquinas paradas pendientes</Typography>
                    <Typography sx={{ color: '#9ca3af' }}>¡Buen trabajo! Todas las máquinas están activas o en revisión controlada.</Typography>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {pendingMachines.map((m: any) => {
                        const isUnassigned = !m.lastChangeBy || m.lastChangeBy === 'Sin Asignar' || m.lastChangeBy === 'Tejedor';
                        return (
                            <Grid item xs={12} sm={6} lg={4} xl={3} key={m.id}>
                                <Card sx={{ 
                                    bgcolor: '#111827', 
                                    borderRadius: 3, 
                                    border: '1px solid #1f2937',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
                                        borderColor: '#374151'
                                    },
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    {/* Status Indicator Strip */}
                                    <Box sx={{ height: 4, bgcolor: statusColors[m.status] }} />
                                    
                                    <CardContent sx={{ p: 2.5 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                            <Box>
                                                <Typography variant="h5" sx={{ color: 'white', fontWeight: 800 }}>
                                                    {m.number}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                                    {m.codigoInterno}
                                                </Typography>
                                            </Box>
                                            <Chip 
                                                size="small" 
                                                label={statusLabels[m.status]} 
                                                sx={{ bgcolor: `${statusColors[m.status]}20`, color: statusColors[m.status], fontWeight: 700, border: `1px solid ${statusColors[m.status]}40` }} 
                                            />
                                        </Box>

                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Avatar sx={{ width: 24, height: 24, bgcolor: isUnassigned ? '#ef444420' : '#3b82f620' }}>
                                                    <EngineeringIcon sx={{ fontSize: 16, color: isUnassigned ? '#ef4444' : '#3b82f6' }} />
                                                </Avatar>
                                                <Typography variant="body2" sx={{ color: isUnassigned ? '#f87171' : 'white', fontWeight: isUnassigned ? 700 : 500 }}>
                                                    {isUnassigned ? 'SIN MECÁNICO' : m.lastChangeBy}
                                                </Typography>
                                            </Box>
                                            
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Avatar sx={{ width: 24, height: 24, bgcolor: '#1f2937' }}>
                                                    <ErrorOutlineIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                                                </Avatar>
                                                <Typography variant="body2" sx={{ color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {m.lastFailureType || 'Falla no especificada'}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Divider sx={{ mb: 2, borderColor: '#1f2937' }} />

                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Tooltip title="Ver ficha técnica e historial">
                                                <Button 
                                                    variant="outlined" 
                                                    size="small" 
                                                    fullWidth
                                                    onClick={() => handleDetail(m)}
                                                    sx={{ borderRadius: 1.5, borderColor: '#374151', color: '#9ca3af' }}
                                                >
                                                    Detalle
                                                </Button>
                                            </Tooltip>
                                            <Button 
                                                variant="contained" 
                                                size="small" 
                                                fullWidth
                                                color={isUnassigned ? 'error' : 'primary'}
                                                startIcon={isUnassigned ? <AssignmentIndIcon /> : <BuildIcon />}
                                                onClick={() => handleAssign(m)}
                                                sx={{ borderRadius: 1.5, fontWeight: 700 }}
                                            >
                                                {isUnassigned ? 'Asignar' : 'Gestionar'}
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}
        </Box>
    );
}
