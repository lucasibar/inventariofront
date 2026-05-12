import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
    Box, Typography, Button, TextField, MenuItem, Card as MuiCard, 
    CardContent, Divider, Autocomplete, IconButton, List, ListItem, 
    ListItemText, ListItemSecondaryAction, Paper, Chip, Grid, FormControlLabel, Checkbox
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
    'Sin Asignar', 'Ninguna', 'Cosedora Cilindro', 'Cosedora Brazo', 'Cosedora Cierre', 'Error electronico',
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
    machineId?: string;
    machineLabel?: string;
}

export default function RegistroMaquinasPage() {
    const user = useSelector(selectCurrentUser);
    const location = useLocation();
    const machineSearchRef = useRef<HTMLInputElement>(null);
    
    // Selectors state
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
    const [machineInputValue, setMachineInputValue] = useState<string>('');
    const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);

    const [enableSecondState, setEnableSecondState] = useState<boolean>(false);

    const defaultNightStart = useMemo(() => {
        const d = new Date();
        d.setHours(5, 0, 0, 0);
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    }, []);

    const [secondStatus, setSecondStatus] = useState('ACTIVA');
    const [secondTimestamp, setSecondTimestamp] = useState(defaultNightStart);
    const [secondFailure, setSecondFailure] = useState('Ninguna');
    const [secondObservation, setSecondObservation] = useState('');
    
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

    const { control, reset, setValue, getValues } = useForm({
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
        let machineIdToUse = selectedMachineId;
        // Fallback resolution if they typed the machine number directly
        if (!machineIdToUse && machineInputValue.trim()) {
            const matched = machineOptions.find((m: any) => String(m.number) === machineInputValue.trim());
            if (matched) {
                machineIdToUse = matched.value;
                setSelectedMachineId(matched.value);
            }
        }

        if (!machineIdToUse) {
            return alert('Por favor seleccione o escriba un número de máquina válido primero.');
        }

        const matchedMachine = machineOptions.find((m: any) => m.value === machineIdToUse);
        const machineLabelVal = matchedMachine ? matchedMachine.label : `Máquina ID: ${machineIdToUse}`;

        const values = getValues();
        const generatedByVal = values.generatedBy;

        const event1: PendingEvent = {
            id: Math.random().toString(36).substr(2, 9),
            ...values,
            machineId: machineIdToUse,
            machineLabel: machineLabelVal
        };

        const newEventsList = [event1];

        if (enableSecondState) {
            const event2: PendingEvent = {
                id: Math.random().toString(36).substr(2, 9),
                targetStatus: secondStatus,
                failureType: secondFailure,
                observation: secondObservation,
                generatedBy: generatedByVal,
                timestamp: secondTimestamp,
                machineId: machineIdToUse,
                machineLabel: machineLabelVal
            };
            newEventsList.push(event2);
        }

        setPendingEvents(prev => [...prev, ...newEventsList].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
        
        // Reset fields
        setValue('observation', '');
        setSecondObservation('');
    };

    const removeEvent = (id: string) => {
        setPendingEvents(prev => prev.filter(e => e.id !== id));
    };

    const submitAll = async () => {
        if (pendingEvents.length === 0) return;
        
        try {
            for (const event of pendingEvents) {
                await updateStatus({
                    id: event.machineId || selectedMachineId,
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
                                    inputValue={machineInputValue}
                                    onInputChange={(_e, newInputValue) => setMachineInputValue(newInputValue)}
                                    loading={loadingMachines}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            inputRef={machineSearchRef}
                                            label="Número de Máquina"
                                            variant="outlined"
                                            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
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
                                2. Eventos de Mantenimiento
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                {/* Evento Principal */}
                                <Box sx={{ p: 2, bgcolor: '#1f293740', borderRadius: 2, border: '1px solid #374151' }}>
                                    <Typography variant="subtitle2" sx={{ color: '#3b82f6', mb: 2, fontWeight: 700 }}>
                                        Primer Cambio de Estado (Obligatorio)
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Controller
                                            name="targetStatus"
                                            control={control}
                                            render={({ field }) => (
                                                <TextField {...field} select fullWidth size="small" label="Estado" variant="outlined" sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }}>
                                                    {targetStatuses.map((opt) => (
                                                        <MenuItem key={opt.value} value={opt.value}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: opt.color }} />
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
                                                <TextField {...field} fullWidth size="small" type="datetime-local" label="Fecha/Hora del evento" variant="outlined" InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }} />
                                            )}
                                        />

                                        <Controller
                                            name="generatedBy"
                                            control={control}
                                            render={({ field }) => (
                                                <TextField {...field} select fullWidth size="small" label="Responsable" variant="outlined" sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }}>
                                                    {responsables.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                                </TextField>
                                            )}
                                        />

                                        <Controller
                                            name="failureType"
                                            control={control}
                                            render={({ field }) => (
                                                <TextField {...field} select fullWidth size="small" label="Tipo de Falla" variant="outlined" sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }}>
                                                    {failureTypes.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                                </TextField>
                                            )}
                                        />

                                        <Controller
                                            name="observation"
                                            control={control}
                                            render={({ field }) => (
                                                <TextField {...field} fullWidth size="small" multiline rows={2} label="Observación" variant="outlined" sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }} />
                                            )}
                                        />
                                    </Box>
                                </Box>

                                {/* Checkbox Opcional */}
                                <Box sx={{ bgcolor: '#111827', p: 1, borderRadius: 1, border: '1px dashed #374151' }}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox 
                                                checked={enableSecondState} 
                                                onChange={(e) => setEnableSecondState(e.target.checked)} 
                                                sx={{ color: '#6b7280', '&.Mui-checked': { color: '#10b981' } }}
                                            />
                                        }
                                        label={
                                            <Typography variant="body2" sx={{ color: enableSecondState ? '#10b981' : '#9ca3af', fontWeight: enableSecondState ? 700 : 400 }}>
                                                Añadir segundo cambio de estado secuencial (Ej. Reactivación / Fin de Parada)
                                            </Typography>
                                        }
                                    />
                                </Box>

                                {/* Evento Secundario Opcional */}
                                {enableSecondState && (
                                    <Box sx={{ p: 2, bgcolor: '#10b98110', borderRadius: 2, border: '1px solid #10b98130' }}>
                                        <Typography variant="subtitle2" sx={{ color: '#10b981', mb: 2, fontWeight: 700 }}>
                                            Segundo Cambio de Estado (Consecutivo)
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <TextField 
                                                select 
                                                fullWidth 
                                                size="small"
                                                label="Estado Posterior" 
                                                value={secondStatus} 
                                                onChange={(e) => setSecondStatus(e.target.value)}
                                                sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }}
                                            >
                                                {targetStatuses.map((opt) => (
                                                    <MenuItem key={opt.value} value={opt.value}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: opt.color }} />
                                                            {opt.label}
                                                        </Box>
                                                    </MenuItem>
                                                ))}
                                            </TextField>

                                            <TextField 
                                                fullWidth 
                                                size="small"
                                                type="datetime-local" 
                                                label="Fecha/Hora posterior" 
                                                value={secondTimestamp} 
                                                onChange={(e) => setSecondTimestamp(e.target.value)}
                                                InputLabelProps={{ shrink: true }} 
                                                sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }} 
                                            />

                                            <TextField 
                                                select 
                                                fullWidth 
                                                size="small"
                                                label="Tipo de Falla" 
                                                value={secondFailure} 
                                                onChange={(e) => setSecondFailure(e.target.value)}
                                                sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }}
                                            >
                                                {failureTypes.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                            </TextField>

                                            <TextField 
                                                fullWidth 
                                                size="small"
                                                multiline 
                                                rows={2} 
                                                label="Observación Posterior" 
                                                value={secondObservation} 
                                                onChange={(e) => setSecondObservation(e.target.value)}
                                                sx={{ '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' } }} 
                                            />
                                        </Box>
                                    </Box>
                                )}

                                <Button 
                                    variant="contained" 
                                    color="secondary" 
                                    fullWidth 
                                    startIcon={<AddIcon />}
                                    onClick={addEvent}
                                    sx={{ py: 1.5, borderRadius: 2, fontWeight: 800, bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
                                >
                                    {enableSecondState ? 'Añadir Ambos Estados a la Secuencia' : 'Añadir a la Secuencia'}
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
                                {pendingEvents.map((event) => (
                                    <ListItem key={event.id} sx={{ mb: 2, bgcolor: '#1f293750', borderRadius: 2, border: '1px solid #37415140' }}>
                                        <ListItemText 
                                            primary={
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    <Typography variant="caption" sx={{ color: '#e5e7eb', fontWeight: 700 }}>
                                                        {event.machineLabel || 'Máquina Seleccionada'}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Chip 
                                                            size="small" 
                                                            label={targetStatuses.find(s => s.value === event.targetStatus)?.label} 
                                                            sx={{ bgcolor: `${targetStatuses.find(s => s.value === event.targetStatus)?.color}20`, color: targetStatuses.find(s => s.value === event.targetStatus)?.color, fontWeight: 700 }}
                                                        />
                                                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                                                            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                        </Typography>
                                                    </Box>
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
