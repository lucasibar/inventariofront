import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Typography, Button, TextField, MenuItem, Card as MuiCard, CardContent, Divider, Autocomplete } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { PageHeader, Spinner, Select } from '../../../shared/ui';
import { selectCurrentUser } from '../../../entities/auth/model/authSlice';
import { 
    useGetPlantsQuery, 
    useGetMachineTypesQuery, 
    useGetMachinesQuery,
    useUpdateMachineStatusMutation
} from '../api/maintenance.api';

const failureTypes = [
    'Cosedora Cilindro', 'Cosedora Brazo', 'Cosedora Cierre', 'Error electronico',
    'Error Puesta 0', 'Error Motores', 'Mal vanizado', 'Logo contaminado',
    'Tejido(Muerde/revienta/pica/tirones)', 'Goma', 'Puntada', 'Transferencia',
    'Aguja', 'Platina', 'Menguados', 'Corta', 'Electronico', 'Lubricacion',
    'Mancha', 'Corte', 'REPUESTO', 'Corte de luz.'
];

const targetStatuses = [
    { value: 'ACTIVA', label: 'Activa (Verde)' },
    { value: 'REVISAR', label: 'Revisar (Amarillo)' },
    { value: 'VELOCIDAD_REDUCIDA', label: 'Velocidad Reducida (Rosa)' },
    { value: 'PARADA', label: 'Parada (Rojo)' },
    { value: 'ELECTRONIC', label: 'Electronic (Azul)' },
];

export default function RegistroMaquinasPage() {
    const user = useSelector(selectCurrentUser);
    const location = useLocation();
    
    // Selectors state
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
    
    // Queries
    const { data: plants = [], isLoading: loadingPlants } = useGetPlantsQuery();
    const { data: machineTypes = [], isLoading: loadingTypes } = useGetMachineTypesQuery();
    const { data: machines = [], isLoading: loadingMachines } = useGetMachinesQuery(
        { plantId: selectedPlantId || '', typeId: selectedTypeId || '' },
        { skip: !selectedPlantId || !selectedTypeId }
    );
    const [updateStatus, { isLoading: isUpdating }] = useUpdateMachineStatusMutation();

    // Auto-select Der Will by default, fallback to first
    useEffect(() => {
        if (plants.length > 0 && !selectedPlantId) {
            const derWill = plants.find((p: any) => p.name.toLowerCase().includes('der will') || p.name.toLowerCase().includes('derwill'));
            setSelectedPlantId(derWill?.id || plants[0].id);
        }
    }, [plants, selectedPlantId]);

    // Auto-select Tejeduría by default, fallback to first
    useEffect(() => {
        if (machineTypes.length > 0 && !selectedTypeId) {
            const tej = machineTypes.find((t: any) => t.name.toLowerCase().includes('tejedur'));
            setSelectedTypeId(tej?.id || machineTypes[0].id);
        }
    }, [machineTypes, selectedTypeId]);

    const { control, handleSubmit, reset, setValue } = useForm({
        defaultValues: {
            targetStatus: 'PARADA',
            failureType: 'Cosedora Cilindro',
            observation: '',
            generatedBy: (user as any)?.name || (user as any)?.username || '',
        }
    });

    useEffect(() => {
        if (user) {
            setValue('generatedBy', (user as any).name || (user as any).username || '');
        }
    }, [user, setValue]);

    // Pre-select machine if navigated from BuscadorMaquinaPage
    useEffect(() => {
        const state = location.state as { preselectedMachine?: any; plantId?: string } | null;
        if (state?.preselectedMachine && machines.length > 0) {
            const m = state.preselectedMachine;
            setSelectedMachineId(m.id);
        }
    }, [location.state, machines]);

    const plantOptions = useMemo(() => plants.map((p: any) => ({ value: p.id, label: p.name })), [plants]);
    const typeOptions = useMemo(() => machineTypes.map((t: any) => ({ value: t.id, label: t.name })), [machineTypes]);
    const machineOptions = useMemo(() => machines.map((m: any) => ({ value: m.id, label: `Máquina ${m.number} - ${m.codigoInterno || ''}` })), [machines]);

    const onSubmit = async (data: any) => {
        if (!selectedMachineId) {
            alert('Debe seleccionar una máquina');
            return;
        }
        
        try {
            await updateStatus({
                id: selectedMachineId,
                status: data.targetStatus,
                failureType: data.failureType,
                observation: data.observation,
                generatedBy: data.generatedBy
            }).unwrap();
            
            alert('Estado actualizado correctamente');
            
            // Reset form
            reset({
                targetStatus: 'PARADA',
                failureType: 'Cosedora Cilindro',
                observation: '',
                generatedBy: (user as any)?.name || (user as any)?.username || '',
            });
            setSelectedMachineId(null);
            
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error al actualizar el estado de la máquina');
        }
    };

    if (loadingPlants || loadingTypes) return <Spinner />;

    return (
        <Box sx={{ p: 3, maxWidth: '800px', margin: '0 auto' }}>
            <PageHeader 
                title="Cambio de Estado" 
                subtitle="Formulario para actualizar el estado y registrar novedades de las máquinas"
                hideTitleOnMobile={true}
            />

            <MuiCard sx={{ bgcolor: '#1a1a1a', borderRadius: 2, border: '1px solid #333' }}>
                <CardContent sx={{ p: 4 }}>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Typography variant="h6" sx={{ mb: 3, color: '#e5e7eb' }}>
                            1. Selección de Máquina
                        </Typography>
                        
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 4 }}>
                            <Select 
                                label="Planta"
                                value={selectedPlantId || ''}
                                onChange={(val) => { setSelectedPlantId(val); setSelectedMachineId(null); }}
                                options={plantOptions}
                            />
                            
                            <Select 
                                label="Tipo de Máquina"
                                value={selectedTypeId || ''}
                                onChange={(val) => { setSelectedTypeId(val); setSelectedMachineId(null); }}
                                options={typeOptions}
                            />
                            
                            <Box sx={{ gridColumn: { md: '1 / span 2' } }}>
                                <Autocomplete
                                    options={machineOptions}
                                    getOptionLabel={(opt) => opt.label}
                                    value={machineOptions.find((o: any) => o.value === selectedMachineId) || null}
                                    onChange={(_e, newVal) => setSelectedMachineId(newVal?.value || null)}
                                    loading={loadingMachines}
                                    noOptionsText="Sin máquinas disponibles"
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Máquina (escribí el número para filtrar)"
                                            variant="outlined"
                                            placeholder="Buscar por número..."
                                            sx={{
                                                '& .MuiOutlinedInput-root': { color: 'white' },
                                                '& .MuiInputLabel-root': { color: '#9ca3af' },
                                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
                                                '& .MuiSvgIcon-root': { color: '#9ca3af' },
                                            }}
                                        />
                                    )}
                                    slotProps={{
                                        paper: { sx: { bgcolor: '#1a1a1a', color: 'white', border: '1px solid #374151' } },
                                        listbox: { sx: { '& .MuiAutocomplete-option': { color: '#f3f4f6' }, '& .MuiAutocomplete-option.Mui-focused': { bgcolor: '#374151' } } }
                                    }}
                                />
                            </Box>
                        </Box>

                        <Divider sx={{ my: 4, borderColor: '#333' }} />

                        <Typography variant="h6" sx={{ mb: 3, color: '#e5e7eb' }}>
                            2. Detalles del Registro
                        </Typography>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Controller
                                name="targetStatus"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        select
                                        fullWidth
                                        label="Nuevo Estado"
                                        variant="outlined"
                                        required
                                        sx={{
                                            '& .MuiOutlinedInput-root': { color: 'white' },
                                            '& .MuiInputLabel-root': { color: '#9ca3af' },
                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
                                        }}
                                    >
                                        {targetStatuses.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />

                            <Controller
                                name="failureType"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        select
                                        fullWidth
                                        label="Tipo de Problema"
                                        variant="outlined"
                                        required
                                        sx={{
                                            '& .MuiOutlinedInput-root': { color: 'white' },
                                            '& .MuiInputLabel-root': { color: '#9ca3af' },
                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
                                        }}
                                    >
                                        {failureTypes.map((option) => (
                                            <MenuItem key={option} value={option}>
                                                {option}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />

                            <Controller
                                name="generatedBy"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Responsable (Mecánico/Calidad)"
                                        variant="outlined"
                                        required
                                        placeholder="Nombre del responsable"
                                        sx={{
                                            '& .MuiOutlinedInput-root': { color: 'white' },
                                            '& .MuiInputLabel-root': { color: '#9ca3af' },
                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
                                        }}
                                    />
                                )}
                            />

                            <Controller
                                name="observation"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        multiline
                                        rows={3}
                                        label="Observaciones (Opcional)"
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': { color: 'white' },
                                            '& .MuiInputLabel-root': { color: '#9ca3af' },
                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
                                        }}
                                    />
                                )}
                            />
                        </Box>
                        
                        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button 
                                type="submit" 
                                variant="contained" 
                                color="primary" 
                                disabled={!selectedMachineId || isUpdating}
                                size="large"
                                sx={{ minWidth: 200 }}
                            >
                                {isUpdating ? 'Guardando...' : 'Cambiar Estado'}
                            </Button>
                        </Box>
                    </form>
                </CardContent>
            </MuiCard>
        </Box>
    );
}
