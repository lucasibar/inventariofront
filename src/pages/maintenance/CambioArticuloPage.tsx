import { useState, useEffect, useMemo, useRef } from 'react';
import {
    Box, Typography, Button, TextField, Card as MuiCard,
    CardContent, Autocomplete, IconButton, List, ListItem,
    ListItemText, ListItemSecondaryAction, Chip,
    FormGroup, FormControlLabel, Checkbox, Grid
} from '@mui/material';
import { useSelector } from 'react-redux';
import { PageHeader, Spinner, Select } from '../../shared/ui';
import { selectCurrentUser } from '../../entities/auth/model/authSlice';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import {
    useGetPlantsQuery,
    useGetMachineTypesQuery,
    useGetMachinesQuery,
    useCreateMachineChangeMutation,
    useGetMachineChangesQuery,
    useDeleteMachineChangeMutation,
} from '../../entities/maintenance/api/maintenance.api';
import { CHANGE_TYPES, CHANGE_TYPE_COLORS } from '../../features/maintenance/constants/maintenanceConstants';

interface PendingChange {
    id: string;
    machineId: string;
    machineLabel: string;
    changeTypes: string[];
    startTime: string;
    endTime: string;
    observation: string;
    generatedBy: string;
}

export default function CambioArticuloPage() {
    const user = useSelector(selectCurrentUser);
    const machineSearchRef = useRef<HTMLInputElement>(null);

    // Selectors
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [tejTypeId, setTejTypeId] = useState<string | null>(null);
    const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
    const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);

    // Form state
    const [selectedChangeTypes, setSelectedChangeTypes] = useState<string[]>([]);
    const defaultDate = useMemo(() => new Date().toISOString().split('T')[0], []);
    const [startDate, setStartDate] = useState(defaultDate);
    const [startHour, setStartHour] = useState(String(new Date().getHours()).padStart(2, '0'));
    const [startMinute, setStartMinute] = useState('00');
    const [endDate, setEndDate] = useState(defaultDate);
    const [endHour, setEndHour] = useState(String(new Date().getHours()).padStart(2, '0'));
    const [endMinute, setEndMinute] = useState('00');
    const [observation, setObservation] = useState('');
    const [generatedBy, setGeneratedBy] = useState((user as any)?.name || (user as any)?.username || '');

    // Queries
    const { data: plants = [], isLoading: loadingPlants } = useGetPlantsQuery();
    const { data: machineTypes = [], isLoading: loadingTypes } = useGetMachineTypesQuery();
    const { data: machines = [], isLoading: loadingMachines } = useGetMachinesQuery(
        { plantId: selectedPlantId || '', typeId: tejTypeId || '' },
        { skip: !selectedPlantId || !tejTypeId }
    );
    const [createChange, { isLoading: isCreating }] = useCreateMachineChangeMutation();
    const [deleteChange] = useDeleteMachineChangeMutation();

    // Load recent changes for the historial
    const thirtyDaysAgo = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    }, []);
    const { data: recentChanges = [], isLoading: loadingChanges } = useGetMachineChangesQuery(
        { plantId: selectedPlantId || '', startDate: thirtyDaysAgo, endDate: defaultDate },
        { skip: !selectedPlantId }
    );

    // Auto-select defaults
    useEffect(() => {
        if (plants.length > 0 && !selectedPlantId) {
            const derWill = plants.find((p: any) => p.name.toLowerCase().includes('der will'));
            setSelectedPlantId(derWill?.id || plants[0].id);
        }
    }, [plants, selectedPlantId]);

    useEffect(() => {
        if (machineTypes.length > 0 && !tejTypeId) {
            const tej = machineTypes.find((t: any) => t.name.toLowerCase().includes('tejedur'));
            if (tej) setTejTypeId(tej.id);
        }
    }, [machineTypes, tejTypeId]);

    const plantOptions = useMemo(() => plants.map((p: any) => ({ value: p.id, label: p.name })), [plants]);
    const machineOptions = useMemo(() => machines.map((m: any) => ({
        value: m.id, label: `Máquina ${m.number}`, number: m.number
    })), [machines]);

    const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')), []);
    const minutes = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')), []);

    const toggleChangeType = (value: string) => {
        setSelectedChangeTypes(prev =>
            prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]
        );
    };

    const addToQueue = () => {
        if (!selectedMachineId) return alert('Seleccioná una máquina.');
        if (selectedChangeTypes.length === 0) return alert('Seleccioná al menos un tipo de cambio.');

        const matchedMachine = machineOptions.find((m: any) => m.value === selectedMachineId);
        const startTimeISO = new Date(`${startDate}T${startHour}:${startMinute}:00`).toISOString();
        const endTimeISO = new Date(`${endDate}T${endHour}:${endMinute}:00`).toISOString();

        if (new Date(endTimeISO) <= new Date(startTimeISO)) {
            return alert('La hora de fin debe ser posterior a la hora de inicio.');
        }

        const pending: PendingChange = {
            id: Math.random().toString(36).substr(2, 9),
            machineId: selectedMachineId,
            machineLabel: matchedMachine?.label || `ID: ${selectedMachineId}`,
            changeTypes: [...selectedChangeTypes],
            startTime: startTimeISO,
            endTime: endTimeISO,
            observation,
            generatedBy,
        };

        setPendingChanges(prev => [...prev, pending]);
        setSelectedMachineId(null);
        setObservation('');
        setSelectedChangeTypes([]);

        setTimeout(() => machineSearchRef.current?.focus(), 50);
    };

    const removeFromQueue = (id: string) => {
        setPendingChanges(prev => prev.filter(p => p.id !== id));
    };

    const submitAll = async () => {
        if (pendingChanges.length === 0) return;
        try {
            for (const pc of pendingChanges) {
                await createChange({
                    machineId: pc.machineId,
                    changeTypes: pc.changeTypes,
                    startTime: pc.startTime,
                    endTime: pc.endTime,
                    observation: pc.observation || undefined,
                    generatedBy: pc.generatedBy,
                }).unwrap();
            }
            alert(`Se registraron ${pendingChanges.length} cambios correctamente.`);
            setPendingChanges([]);
            setSelectedMachineId(null);
            setSelectedChangeTypes([]);
            setObservation('');
        } catch (error) {
            console.error('Error submitting changes:', error);
            alert('Error al procesar algunos cambios.');
        }
    };

    const handleDeleteChange = async (id: string) => {
        if (!confirm('¿Eliminar este cambio?')) return;
        try {
            await deleteChange(id).unwrap();
        } catch (e) {
            console.error('Error deleting change:', e);
        }
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    };

    if (loadingPlants || loadingTypes) return <Spinner />;

    return (
        <Box sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
            <PageHeader
                title="Cambios de Artículo"
                subtitle="Registrar cambios de artículo en máquinas de tejeduría. Cargá múltiples cambios y envialos todos juntos."
            />

            <Grid container spacing={3}>
                {/* Form Side */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <MuiCard sx={{ bgcolor: '#111827', borderRadius: 2, border: '1px solid #1f2937' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2, color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SwapHorizIcon /> Nuevo Cambio
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {/* Plant selector */}
                                <Select
                                    label="Planta"
                                    value={selectedPlantId || ''}
                                    onChange={(val) => { setSelectedPlantId(val); setSelectedMachineId(null); }}
                                    options={plantOptions}
                                />

                                {/* Machine search */}
                                <Autocomplete
                                    options={machineOptions}
                                    getOptionLabel={(opt: any) => opt.label}
                                    value={machineOptions.find((m: any) => m.value === selectedMachineId) || null}
                                    onChange={(_, val: any) => setSelectedMachineId(val?.value || null)}
                                    loading={loadingMachines}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Buscar Máquina (por número)" variant="outlined"
                                            inputRef={machineSearchRef}
                                            inputProps={{ ...params.inputProps, inputMode: 'numeric' }}
                                        />
                                    )}
                                    isOptionEqualToValue={(opt: any, val: any) => opt.value === val.value}
                                />

                                {/* Change Types checkboxes */}
                                <Box>
                                    <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.7)' }}>
                                        Tipos de Cambio *
                                    </Typography>
                                    <FormGroup row sx={{ gap: 0.5 }}>
                                        {CHANGE_TYPES.map((ct) => (
                                            <FormControlLabel
                                                key={ct.value}
                                                control={
                                                    <Checkbox
                                                        checked={selectedChangeTypes.includes(ct.value)}
                                                        onChange={() => toggleChangeType(ct.value)}
                                                        sx={{ color: CHANGE_TYPE_COLORS[ct.value], '&.Mui-checked': { color: CHANGE_TYPE_COLORS[ct.value] } }}
                                                        size="small"
                                                    />
                                                }
                                                label={
                                                    <Chip
                                                        label={ct.label}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: selectedChangeTypes.includes(ct.value)
                                                                ? CHANGE_TYPE_COLORS[ct.value] + '33'
                                                                : 'transparent',
                                                            color: CHANGE_TYPE_COLORS[ct.value],
                                                            border: `1px solid ${CHANGE_TYPE_COLORS[ct.value]}44`,
                                                            cursor: 'pointer',
                                                        }}
                                                    />
                                                }
                                                sx={{ mr: 0.5 }}
                                            />
                                        ))}
                                    </FormGroup>
                                </Box>

                                {/* Start time */}
                                <Box>
                                    <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.7)' }}>Hora Inicio</Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <TextField type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                            size="small" sx={{ flex: 2 }} />
                                        <TextField select value={startHour} onChange={e => setStartHour(e.target.value)}
                                            size="small" sx={{ flex: 1 }} label="Hora">
                                            {hours.map(h => <option key={h} value={h}>{h}</option>)}
                                        </TextField>
                                        <TextField select value={startMinute} onChange={e => setStartMinute(e.target.value)}
                                            size="small" sx={{ flex: 1 }} label="Min">
                                            {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                                        </TextField>
                                    </Box>
                                </Box>

                                {/* End time */}
                                <Box>
                                    <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.7)' }}>Hora Arranque</Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <TextField type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                            size="small" sx={{ flex: 2 }} />
                                        <TextField select value={endHour} onChange={e => setEndHour(e.target.value)}
                                            size="small" sx={{ flex: 1 }} label="Hora">
                                            {hours.map(h => <option key={h} value={h}>{h}</option>)}
                                        </TextField>
                                        <TextField select value={endMinute} onChange={e => setEndMinute(e.target.value)}
                                            size="small" sx={{ flex: 1 }} label="Min">
                                            {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                                        </TextField>
                                    </Box>
                                </Box>

                                {/* Observation */}
                                <TextField
                                    label="Observación (opcional)"
                                    value={observation}
                                    onChange={e => setObservation(e.target.value)}
                                    multiline rows={2}
                                    variant="outlined" fullWidth
                                />

                                {/* Generated By */}
                                <TextField
                                    label="Registrado por"
                                    value={generatedBy}
                                    onChange={e => setGeneratedBy(e.target.value)}
                                    variant="outlined" fullWidth size="small"
                                />

                                {/* Add to queue */}
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={addToQueue}
                                    sx={{ bgcolor: '#1f6feb', '&:hover': { bgcolor: '#1a5cc7' } }}
                                >
                                    Agregar a Cola
                                </Button>
                            </Box>
                        </CardContent>
                    </MuiCard>
                </Grid>

                {/* Queue Side */}
                <Grid size={{ xs: 12, md: 7 }}>
                    {/* Pending Queue */}
                    <MuiCard sx={{ bgcolor: '#111827', borderRadius: 2, border: '1px solid #1f2937', mb: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" sx={{ color: 'white' }}>
                                    Cola de Cambios ({pendingChanges.length})
                                </Typography>
                                {pendingChanges.length > 0 && (
                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<SendIcon />}
                                        onClick={submitAll}
                                        disabled={isCreating}
                                    >
                                        {isCreating ? 'Enviando...' : `Enviar Todos (${pendingChanges.length})`}
                                    </Button>
                                )}
                            </Box>

                            {pendingChanges.length === 0 ? (
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', py: 3 }}>
                                    No hay cambios en cola. Usá el formulario para agregar.
                                </Typography>
                            ) : (
                                <List dense>
                                    {pendingChanges.map((pc) => (
                                        <ListItem key={pc.id} sx={{
                                            bgcolor: '#1a2332', borderRadius: 1, mb: 1,
                                            border: '1px solid #2d3748'
                                        }}>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'white' }}>
                                                            {pc.machineLabel}
                                                        </Typography>
                                                        {pc.changeTypes.map(ct => (
                                                            <Chip key={ct} label={CHANGE_TYPES.find(c => c.value === ct)?.label || ct}
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: (CHANGE_TYPE_COLORS[ct] || '#666') + '33',
                                                                    color: CHANGE_TYPE_COLORS[ct] || '#fff',
                                                                    fontSize: '0.7rem', height: 20
                                                                }}
                                                            />
                                                        ))}
                                                    </Box>
                                                }
                                                secondary={
                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                                        {formatTime(pc.startTime)} → {formatTime(pc.endTime)}
                                                        {pc.observation ? ` | ${pc.observation}` : ''}
                                                    </Typography>
                                                }
                                            />
                                            <ListItemSecondaryAction>
                                                <IconButton size="small" onClick={() => removeFromQueue(pc.id)} sx={{ color: '#ef4444' }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </CardContent>
                    </MuiCard>

                    {/* Recent History */}
                    <MuiCard sx={{ bgcolor: '#111827', borderRadius: 2, border: '1px solid #1f2937' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                                Últimos Cambios Registrados
                            </Typography>
                            {loadingChanges ? <Spinner /> : (
                                <List dense>
                                    {(recentChanges as any[]).slice(0, 20).map((change: any) => (
                                        <ListItem key={change.id} sx={{
                                            bgcolor: '#0d1520', borderRadius: 1, mb: 0.5,
                                            border: '1px solid #1f2937'
                                        }}>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'white', minWidth: '90px' }}>
                                                            Máq. {change.machine?.number}
                                                        </Typography>
                                                        {(change.changeTypes || []).map((ct: string) => (
                                                            <Chip key={ct} label={CHANGE_TYPES.find(c => c.value === ct)?.label || ct}
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: (CHANGE_TYPE_COLORS[ct] || '#666') + '33',
                                                                    color: CHANGE_TYPE_COLORS[ct] || '#fff',
                                                                    fontSize: '0.65rem', height: 18
                                                                }}
                                                            />
                                                        ))}
                                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', ml: 'auto' }}>
                                                            {change.durationFormatted || ''}
                                                        </Typography>
                                                    </Box>
                                                }
                                                secondary={
                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                                                        {formatTime(change.startTime)} → {formatTime(change.endTime)}
                                                        {change.observation ? ` | ${change.observation}` : ''}
                                                        {' | '}{change.generatedBy}
                                                    </Typography>
                                                }
                                            />
                                            <ListItemSecondaryAction>
                                                <IconButton size="small" onClick={() => handleDeleteChange(change.id)} sx={{ color: '#ef4444' }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                    {(recentChanges as any[]).length === 0 && (
                                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 2 }}>
                                            No hay cambios registrados aún.
                                        </Typography>
                                    )}
                                </List>
                            )}
                        </CardContent>
                    </MuiCard>
                </Grid>
            </Grid>
        </Box>
    );
}
