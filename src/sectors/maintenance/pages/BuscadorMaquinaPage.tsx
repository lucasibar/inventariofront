import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Card, Grid, TextField, Button, Divider, Chip } from '@mui/material';
import { PageHeader, Spinner, Select } from '../../../shared/ui';
import SearchIcon from '@mui/icons-material/Search';
import BuildIcon from '@mui/icons-material/Build';
import { 
    useGetPlantsQuery, 
    useGetMachinesQuery,
    useGetMachineTypesQuery
} from '../api/maintenance.api';
import type { Machine } from '../api/maintenance.api';

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

export default function BuscadorMaquinaPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchedMachine, setSearchedMachine] = useState<Machine | null>(null);

    const { data: plants = [], isLoading: loadingPlants } = useGetPlantsQuery();
    const { data: machineTypes = [], isLoading: loadingTypes } = useGetMachineTypesQuery();

    // Auto-select first plant
    React.useEffect(() => {
        if (plants.length > 0 && !selectedPlantId) {
            setSelectedPlantId(plants[0].id);
        }
    }, [plants, selectedPlantId]);

    const { data: machines = [], isLoading: loadingMachines } = useGetMachinesQuery(
        { 
            plantId: selectedPlantId || '',
            typeId: selectedTypeId || undefined
        },
        { skip: !selectedPlantId }
    );

    // If navigated from Dashboard or History with a machine pre-selected
    useEffect(() => {
        const state = location.state as { machine?: Machine; plantId?: string } | null;
        if (state?.machine) {
            if (state.plantId) setSelectedPlantId(state.plantId);
            if (state.machine.typeId) setSelectedTypeId(state.machine.typeId);
            setSearchedMachine(state.machine);
            setSearchTerm(String(state.machine.number));
            // Clear location state to avoid re-triggering on refresh if needed, 
            // but usually it's fine for simple navigation.
        }
    }, [location.state]);

    const plantOptions = useMemo(() => plants.map((p: any) => ({ value: p.id, label: p.name })), [plants]);
    const typeOptions = useMemo(() => [
        { value: '', label: 'Todos los tipos' },
        ...machineTypes.map((t: any) => ({ value: t.id, label: t.name }))
    ], [machineTypes]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm) return;

        const term = searchTerm.toLowerCase();
        const found = machines.find((m: any) => 
            m.number?.toString() === term || 
            m.codigoInterno?.toLowerCase() === term ||
            m.nombre?.toLowerCase().includes(term)
        );

        setSearchedMachine(found || null);
        if (!found) {
            alert('Máquina no encontrada con los filtros actuales.');
        }
    };

    const handleRegistrarAveria = () => {
        if (!searchedMachine) return;
        navigate('/mantenimiento/registro', {
            state: {
                preselectedMachine: searchedMachine,
                plantId: selectedPlantId,
            }
        });
    };

    if (loadingPlants || loadingTypes) return <Spinner />;

    return (
        <Box sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
            <PageHeader 
                title="Detalle de Máquina" 
                subtitle="Consulta de estado y características técnicas (Agujas, Cilindro, etc.)"
                hideTitleOnMobile={true}
            />

            <Card sx={{ bgcolor: '#1a1a1a', borderRadius: 2, p: 3, mb: 4, border: '1px solid #333' }}>
                <form onSubmit={handleSearch}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 3 }}>
                            <Select 
                                label="Seleccionar Planta"
                                value={selectedPlantId || ''}
                                onChange={(val) => { setSelectedPlantId(val); setSearchedMachine(null); }}
                                options={plantOptions}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <Select 
                                label="Tipo de Máquina"
                                value={selectedTypeId || ''}
                                onChange={(val) => { setSelectedTypeId(val || null); setSearchedMachine(null); }}
                                options={typeOptions}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                label="Número de Máquina o Código Interno"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{
                                    '& .MuiOutlinedInput-root': { color: 'white' },
                                    '& .MuiInputLabel-root': { color: '#9ca3af' },
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 2 }}>
                            <Button 
                                type="submit"
                                variant="contained" 
                                color="primary" 
                                fullWidth 
                                sx={{ height: '56px' }}
                                disabled={loadingMachines}
                                startIcon={<SearchIcon />}
                            >
                                Buscar
                            </Button>
                        </Grid>
                    </Grid>
                </form>
            </Card>

            {searchedMachine && (
                <Card sx={{ bgcolor: '#1a1a1a', borderRadius: 2, p: 4, border: '1px solid #333' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                                Máquina {searchedMachine.number}
                            </Typography>
                            <Typography variant="subtitle1" sx={{ color: '#9ca3af' }}>
                                Código: {searchedMachine.codigoInterno} | Nombre: {searchedMachine.nombre}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Chip 
                                label={statusLabels[searchedMachine.status] || searchedMachine.status} 
                                sx={{ 
                                    bgcolor: `${statusColors[searchedMachine.status] || '#6b7280'}20`, 
                                    color: statusColors[searchedMachine.status] || '#d1d5db',
                                    border: `1px solid ${statusColors[searchedMachine.status] || '#6b7280'}50`,
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    py: 2
                                }} 
                            />
                            <Button
                                variant="contained"
                                color="warning"
                                startIcon={<BuildIcon />}
                                onClick={handleRegistrarAveria}
                                sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}
                            >
                                Cambiar Estado
                            </Button>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 3, borderColor: '#333' }} />

                    <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                        Características Técnicas
                    </Typography>
                    
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 1, border: '1px solid #27272a' }}>
                                <Typography variant="caption" sx={{ color: '#9ca3af', textTransform: 'uppercase' }}>Cantidad de Agujas</Typography>
                                <Typography variant="h6" sx={{ color: 'white' }}>
                                    {searchedMachine.metadata?.cantidadAgujas || 'No registrado'}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 1, border: '1px solid #27272a' }}>
                                <Typography variant="caption" sx={{ color: '#9ca3af', textTransform: 'uppercase' }}>Tipo de Cilindro</Typography>
                                <Typography variant="h6" sx={{ color: 'white' }}>
                                    {searchedMachine.metadata?.tipoCilindro || 'No registrado'}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 1, border: '1px solid #27272a' }}>
                                <Typography variant="caption" sx={{ color: '#9ca3af', textTransform: 'uppercase' }}>Tipo de Trimer</Typography>
                                <Typography variant="h6" sx={{ color: 'white' }}>
                                    {searchedMachine.metadata?.tipoTrimer || 'No registrado'}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 3, borderColor: '#333' }} />

                    <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                        Última Actividad
                    </Typography>
                    
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="body2" sx={{ color: '#9ca3af' }}>Última observación:</Typography>
                            <Typography variant="body1" sx={{ color: 'white' }}>{searchedMachine.lastObservation || 'Ninguna'}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="body2" sx={{ color: '#9ca3af' }}>Actualizado por:</Typography>
                            <Typography variant="body1" sx={{ color: 'white' }}>{searchedMachine.lastChangeBy || 'Desconocido'}</Typography>
                        </Grid>
                    </Grid>

                </Card>
            )}
        </Box>
    );
}
