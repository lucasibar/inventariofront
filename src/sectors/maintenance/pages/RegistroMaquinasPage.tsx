import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
    Box, Typography, Button, TextField, MenuItem, Card as MuiCard, 
    CardContent, Divider, Autocomplete, IconButton, List, ListItem, 
    ListItemText, ListItemSecondaryAction, Paper, Chip, Grid 
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { PageHeader, Spinner, Select } from '../../../shared/ui';
import { selectCurrentUser } from '../../../entities/auth/model/authSlice';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import HistoryIcon from '@mui/icons-material/History';
import { 
    useGetPlantsQuery, 
    useGetMachineTypesQuery, 
    useGetMachinesQuery,
    useUpdateMachineStatusMutation
} from '../api/maintenance.api';

const responsables = ['Sin Asignar', 'Gaston', 'Ruben', 'Daniel', 'Alexis', 'Violeta', 'Leandro', 'Gaspar', 'Ramón', 'Tejedor'];

const failureTypes = [
    'Ninguna', 'Cosedora Cilindro', 'Cosedora Brazo', 'Cosedora Cierre', 'Error electronico',
    'Error Puesta 0', 'Error Motores', 'Mal vanizado', 'Logo contaminado',
    'Tejido(Muerde/revienta/pica/tirones)', 'Goma', 'Puntada', 'Transferencia',
    'Aguja', 'Platina', 'Menguados', 'Corta', 'Electronico', 'Lubricacion',
    'Mancha', 'Corte', 'REPUESTO', 'Corte de luz.', 'Programacion'
];

const targetStatuses = [
    { value: 'ACTIVA', label: 'Activa', color: '#10b981' },
    { value: 'REVISAR', label: 'Revisar', color: '#eab308' },
    { value: 'VELOCIDAD_REDUCIDA', label: 'Velocidad Reducida', color: '#f472b6' },
    { value: 'FALTA_COSTURA', label: 'Falta Costura', color: '#a855f7' },
    { value: 'PARADA', label: 'Parada', color: '#ef4444' },
    { value: 'ELECTRONIC', label: 'Electronic', color: '#3b82f6' },
    { value: 'FALTA_PROGRAMA', label: 'Falta Programa', color: '#fb923c' },
    { value: 'REPUESTOS', label: 'Repuestos', color: '#94a3b8' },
];

interface PendingEvent {
    id: string;
    targetStatus: string;
    failureType: string;
    observation: string;
    generatedBy: string;
    timestamp: string;
}

export default function RegistroMaquinasPage() {
    const user = useSelector(selectCurrentUser);
    const location = useLocation();
    const machineSearchRef = useRef<HTMLInputElement>(null);
    
    // Selectors state
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
    const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
    
    // Queries
    const { data: plants = [], isLoading: loadingPlants } = useGetPlantsQuery();
    const { data: machineTypes = [], isLoading: loadingTypes } = useGetMachineTypesQuery();
    const { data: machines = [], isLoading: loadingMachines } = useGetMachinesQuery(
        { plantId: selectedPlantId || '', typeId: selectedTypeId || '' },
        { skip: !selectedPlantId || !selectedTypeId }
    );
    const [updateStatus, { isLoading: isUpdating }] = useUpdateMachineStatusMutation();

    // Defaults
    useEffect(() => {
        if (plants.length > 0 && !selectedPlantId) {
            const derWill = plants.find((p: any) => p.name.toLowerCase().includes('der will') || p.name.toLowerCase().includes('derwill'));
            setSelectedPlantId(derWill?.id || plants[0].id);
        }
    }, [plants, selectedPlantId]);

    useEffect(() => {
        if (machineTypes.length > 0 && !selectedTypeId) {
            const tej = machineTypes.find((t: any) => t.name.toLowerCase().includes('tejedur'));
            setSelectedTypeId(tej?.id || machineTypes[0].id);
        }
    }, [machineTypes, selectedTypeId]);

    const { control, handleSubmit, reset, setValue, watch, getValues } = useForm({
        defaultValues: {
            targetStatus: 'PARADA',
            failureType: 'Ninguna',
            observation: '',
            generatedBy: (user as any)?.name || (user as any)?.username || '',
            timestamp: new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16),
        }
    });

    // Auto-focus on machine search
    useEffect(() => {
        if (machineSearchRef.current) {
            machineSearchRef.current.focus();
        }
    }, [loadingMachines]);

    // Handle pre-selection from location state
    useEffect(() => {
        const state = location.state as { preselectedMachine?: any; plantId?: string; focusField?: string } | null;
        if (state?.preselectedMachine && machines.length > 0) {
            setSelectedMachineId(state.preselectedMachine.id);
            if (state.preselectedMachine.lastChangeBy) {
                setValue('generatedBy', state.preselectedMachine.lastChangeBy);
            }
        }
    }, [location.state, machines, setValue]);

    const plantOptions = useMemo(() => plants.map((p: any) => ({ value: p.id, label: p.name })), [plants]);
    const typeOptions = useMemo(() => machineTypes.map((t: any) => ({ value: t.id, label: t.name })), [machineTypes]);
    const machineOptions = useMemo(() => machines.map((m: any) => ({ value: m.id, label: `Máquina ${m.number} - ${m.codigoInterno || ''}`, number: m.number })), [machines]);

    const addEvent = () => {
        const values = getValues();
        if (!selectedMachineId) return alert('Seleccione una máquina primero');

        const newEvent: PendingEvent = {
            id: Math.random().toString(36).substr(2, 9),
            ...values
        };

        // Add and sort by timestamp
        setPendingEvents(prev => [...prev, newEvent].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
        
        // Reset only values that usually change
        setValue('observation', '');
        // Keep status and mechanic as they might be the starting point for the next event
    };

    const removeEvent = (id: string) => {
        setPendingEvents(prev => prev.filter(e => e.id !== id));
    };

    const submitAll = async () => {
        if (pendingEvents.length === 0) return;
        
        try {
            for (const event of pendingEvents) {
                await updateStatus({
                    id: selectedMachineId,
                    plantId: selectedPlantId,
                    typeId: selectedTypeId,
                    status: event.targetStatus,
                    failureType: event.failureType,
                    observation: event.observation,
                    generatedBy: event.generatedBy,
                    timestamp: event.timestamp
                }).unwrap();
            }
            
            alert(`Se registraron ${pendingEvents.length} cambios correctamente.`);
            setPendingEvents([]);
            setSelectedMachineId(null);
            reset({
                targetStatus: 'PARADA',
                failureType: 'Ninguna',
                observation: '',
                generatedBy: (user as any)?.name || (user as any)?.username || '',
                timestamp: new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16),
            });
            
        } catch (error) {
            console.error('Error submitting events:', error);
            alert('Error al procesar algunos cambios. Revise el historial.');
        }
    };

    if (loadingPlants || loadingTypes) return <Spinner />;

    return (
        <Box sx={{ p: 3, maxWidth: '1000px', margin: '0 auto' }}>
            <PageHeader 
                title="Carga de Novedades" 
                subtitle="Registra cambios de estado individuales o múltiples (turno noche)"
            />

            <Grid container spacing={3}>
                {/* Form Side */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <MuiCard sx={{ bgcolor: '#111827', borderRadius: 2, border: '1px solid #1f2937' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2, color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                                1. Identificar Máquina
                            </Typography>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                                <Select 
                                    label="Planta"
                                    value={selectedPlantId || ''}
                                    onChange={(val) => { setSelectedPlantId(val); setSelectedMachineId(null); }}
                                    options={plantOptions}
                                />
                                
                                <Select 
                                    label="Tipo"
                                    value={selectedTypeId || ''}
                                    onChange={(val) => { setSelectedTypeId(val); setSelectedMachineId(null); }}
                                    options={typeOptions}
                                />
                                
                                <Autocomplete
                                    options={machineOptions}
                                    getOptionLabel={(opt) => opt.label}
                                    value={machineOptions.find((o: any) => o.value === selectedMachineId) || null}
                                    onChange={(_e, newVal) => setSelectedMachineId(newVal?.value || null)}
                                    loading={loadingMachines}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            inputRef={machineSearchRef}
                                            label="Número de Máquina"
                                            variant="outlined"
                                            sx={{
                                                '& .MuiOutlinedInput-root': { color: 'white' },
                                                '& .MuiInputLabel-root': { color: '#9ca3af' },
                                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' },
                                            }}
                                        />
                                    )}
                                    slotProps={{
                                        paper: { sx: { bgcolor: '#111827', color: 'white', border: '1px solid #374151' } }
                                    }}
                                />
                            </Box>

                            <Divider sx={{ my: 3, borderColor: '#1f2937' }} />

                            <Typography variant="h6" sx={{ mb: 2, color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                                2. Evento de Mantenimiento
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                <Controller
                                    name="targetStatus"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} select fullWidth label="Estado" variant="outlined" sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }}>
                                            {targetStatuses.map((opt) => (
                                                <MenuItem key={opt.value} value={opt.value}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: opt.color }} />
                                                        {opt.label}
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                />

                                <Controller
                                    name="timestamp"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth type="datetime-local" label="Fecha/Hora del evento" variant="outlined" InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }} />
                                    )}
                                />

                                <Controller
                                    name="generatedBy"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} select fullWidth label="Responsable" variant="outlined" sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }}>
                                            {responsables.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                        </TextField>
                                    )}
                                />

                                <Controller
                                    name="failureType"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} select fullWidth label="Tipo de Falla" variant="outlined" sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }}>
                                            {failureTypes.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                        </TextField>
                                    )}
                                />

                                <Controller
                                    name="observation"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth multiline rows={2} label="Observación" variant="outlined" sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }} />
                                    )}
                                />

                                <Button 
                                    variant="outlined" 
                                    color="secondary" 
                                    fullWidth 
                                    startIcon={<AddIcon />}
                                    onClick={addEvent}
                                    sx={{ mt: 1, py: 1.5, borderRadius: 2, fontWeight: 700, borderWidth: 2 }}
                                >
                                    Añadir a la secuencia
                                </Button>
                            </Box>
                        </CardContent>
                    </MuiCard>
                </Grid>

                {/* Queue Side */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ bgcolor: '#111827', borderRadius: 2, p: 3, border: '1px solid #1f2937', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ color: 'white', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <HistoryIcon /> Secuencia a Procesar
                        </Typography>

                        {pendingEvents.length === 0 ? (
                            <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', placeContent: 'center', opacity: 0.5 }}>
                                <Typography sx={{ color: '#9ca3af', textAlign: 'center' }}>
                                    Añade cambios de estado para ver la secuencia cronológica aquí.
                                </Typography>
                            </Box>
                        ) : (
                            <List sx={{ flex: 1 }}>
                                {pendingEvents.map((event, idx) => (
                                    <ListItem key={event.id} sx={{ mb: 2, bgcolor: '#1f293750', borderRadius: 2, border: '1px solid #37415140' }}>
                                        <ListItemText 
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Chip 
                                                        size="small" 
                                                        label={targetStatuses.find(s => s.value === event.targetStatus)?.label} 
                                                        sx={{ bgcolor: `${targetStatuses.find(s => s.value === event.targetStatus)?.color}20`, color: targetStatuses.find(s => s.value === event.targetStatus)?.color, fontWeight: 700 }}
                                                    />
                                                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                                                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.5 }}>
                                                    {event.generatedBy} • {event.failureType}
                                                    {event.observation && ` • ${event.observation}`}
                                                </Typography>
                                            }
                                        />
                                        <ListItemSecondaryAction>
                                            <IconButton edge="end" onClick={() => removeEvent(event.id)} sx={{ color: '#f87171' }}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                ))}
                            </List>
                        )}

                        <Box sx={{ mt: 'auto', pt: 3 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                fullWidth
                                size="large"
                                disabled={pendingEvents.length === 0 || isUpdating}
                                startIcon={<SendIcon />}
                                onClick={submitAll}
                                sx={{ py: 2, borderRadius: 2, fontWeight: 800, boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}
                            >
                                {isUpdating ? 'Procesando...' : `Confirmar y Registrar ${pendingEvents.length} cambios`}
                            </Button>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
