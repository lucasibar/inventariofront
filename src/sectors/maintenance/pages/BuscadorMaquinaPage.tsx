import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Card, TextField, Button, Divider, Chip, Avatar, Tooltip, Drawer, IconButton, useMediaQuery, useTheme } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { PageHeader, Spinner, Select } from '../../../shared/ui';
import SearchIcon from '@mui/icons-material/Search';
import BuildIcon from '@mui/icons-material/Build';
import HistoryIcon from '@mui/icons-material/History';
import SpeedIcon from '@mui/icons-material/Speed';
import EngineeringIcon from '@mui/icons-material/Engineering';
import TimerIcon from '@mui/icons-material/Timer';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { 
    useGetPlantsQuery, 
    useGetMachinesQuery,
    useGetMachineTypesQuery,
    useGetMachineKPIsQuery,
    useGetLogsQuery
} from '../api/maintenance.api';
import type { Machine } from '../api/maintenance.api';

import { 
    MAINTENANCE_STATUS_COLORS as statusColors,
    MAINTENANCE_STATUS_LABELS as statusLabels
} from '../constants/maintenanceConstants';

const LogItem = ({ log, idx }: { log: any; idx: number }) => (
    <Box sx={{ 
        p: 2.5, 
        bgcolor: idx === 0 ? '#1e293b40' : 'transparent', 
        borderRadius: 2, 
        border: '1px solid #374151',
        display: 'flex',
        alignItems: 'center',
        gap: 3
    }}>
        <Box sx={{ minWidth: 100 }}>
            <Typography variant="body2" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                {new Date(log.timestamp).toLocaleDateString()}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
            <Chip 
                size="small" 
                label={statusLabels[log.fromStatus] || log.fromStatus} 
                variant="outlined" 
                sx={{ color: '#6b7280', borderColor: '#374151', fontSize: '0.7rem' }} 
            />
            <Typography sx={{ color: '#4b5563' }}>→</Typography>
            <Chip 
                size="small" 
                label={statusLabels[log.toStatus] || log.toStatus} 
                sx={{ bgcolor: `${statusColors[log.toStatus]}20`, color: statusColors[log.toStatus], fontWeight: 700 }} 
            />
        </Box>

        <Box sx={{ flex: 2 }}>
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                {log.generatedBy}
            </Typography>
            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                {log.failureType ? `${log.failureType}: ` : ''}{log.observation || 'Sin observación'}
            </Typography>
        </Box>
    </Box>
);

export default function BuscadorMaquinaPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchedMachine, setSearchedMachine] = useState<Machine | null>(null);
    const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

    // Fetch Machine Specific Data
    const { data: kpis, isLoading: loadingKPIs } = useGetMachineKPIsQuery(
        { id: searchedMachine?.id || '' },
        { skip: !searchedMachine }
    );

    const { data: logsData, isLoading: loadingLogs } = useGetLogsQuery(
        { machineId: searchedMachine?.id, limit: 10 },
        { skip: !searchedMachine }
    );

    const history = logsData || [];

    // If navigated from Dashboard or History with a machine pre-selected
    useEffect(() => {
        const state = location.state as { machine?: Machine; plantId?: string } | null;
        if (state?.machine) {
            if (state.plantId) setSelectedPlantId(state.plantId);
            if (state.machine.typeId) setSelectedTypeId(state.machine.typeId);
            setSearchedMachine(state.machine);
            setSearchTerm(String(state.machine.number));
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

        const term = searchTerm.trim().toLowerCase();
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

    const handleAction = () => {
        if (!searchedMachine) return;
        navigate('/mantenimiento/dashboard', {
            state: {
                machineNumber: searchedMachine.number,
                plantId: selectedPlantId,
                status: searchedMachine.status
            }
        });
    };

    if (loadingPlants || loadingTypes) return <Spinner />;

    return (
        <Box sx={{ p: 3, maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader 
                title="Gestión Detallada de Máquina" 
                subtitle="Información técnica, rendimiento (MTBF/MTTR) e historial de intervenciones"
            />

            <Card sx={{ bgcolor: '#111827', borderRadius: 2, p: 3, mb: 4, border: '1px solid #1f2937' }}>
                <form onSubmit={handleSearch}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 3 }}>
                            <Select 
                                label="Planta"
                                value={selectedPlantId || ''}
                                onChange={(val) => { setSelectedPlantId(val); setSearchedMachine(null); }}
                                options={plantOptions}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <Select 
                                label="Tipo"
                                value={selectedTypeId || ''}
                                onChange={(val) => { setSelectedTypeId(val || null); setSearchedMachine(null); }}
                                options={typeOptions}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                label="Número de Máquina o Código"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                                sx={{
                                    '& .MuiOutlinedInput-root': { color: 'white' },
                                    '& .MuiInputLabel-root': { color: '#9ca3af' },
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#374151' },
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 2 }}>
                            <Button 
                                type="submit"
                                variant="contained" 
                                color="primary" 
                                fullWidth 
                                sx={{ height: '56px', borderRadius: 2, fontWeight: 700 }}
                                disabled={loadingMachines}
                                startIcon={<SearchIcon />}
                            >
                                Consultar
                            </Button>
                        </Grid>
                    </Grid>
                </form>
            </Card>

            {searchedMachine && (
                <Grid container spacing={3}>
                    {/* Main Info & Actions */}
                    <Grid size={{ xs: 12, lg: 8 }}>
                        <Card sx={{ 
                            bgcolor: '#111827', 
                            borderRadius: 3, 
                            p: { xs: 2, md: 4 }, 
                            border: '1px solid #1f2937', 
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                        <Typography variant="h3" sx={{ color: 'white', fontWeight: 800 }}>
                                            {searchedMachine.number}
                                        </Typography>
                                        <Chip 
                                            label={statusLabels[searchedMachine.status] || searchedMachine.status} 
                                            sx={{ 
                                                bgcolor: `${statusColors[searchedMachine.status] || '#6b7280'}20`, 
                                                color: statusColors[searchedMachine.status] || '#d1d5db',
                                                border: `1px solid ${statusColors[searchedMachine.status] || '#6b7280'}`,
                                                fontWeight: 800,
                                                fontSize: '0.875rem',
                                                px: 1
                                            }} 
                                        />
                                    </Box>
                                    <Typography variant="h6" sx={{ color: '#9ca3af', fontWeight: 400 }}>
                                        {searchedMachine.codigoInterno} • {searchedMachine.nombre}
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1.5 }}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<BuildIcon />}
                                        onClick={() => handleAction()}
                                        sx={{ borderRadius: 2, fontWeight: 700, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    >
                                        Editar
                                    </Button>
                                </Box>
                            </Box>

                            <Grid container spacing={2} sx={{ mb: 4 }}>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Box sx={{ p: 2, bgcolor: '#1f293750', borderRadius: 2, border: '1px solid #37415140' }}>
                                        <Typography variant="caption" sx={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <TimerIcon sx={{ fontSize: 14 }} /> ÚLTIMO CAMBIO
                                        </Typography>
                                        <Typography variant="h6" sx={{ color: 'white', mt: 0.5 }}>
                                            {searchedMachine.lastStatusChange ? new Date(searchedMachine.lastStatusChange).toLocaleString([], { hour12: false }) : 'Sin registros'}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Box sx={{ p: 2, bgcolor: '#1f293750', borderRadius: 2, border: '1px solid #37415140' }}>
                                        <Typography variant="caption" sx={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <EngineeringIcon sx={{ fontSize: 14 }} /> RESPONSABLE ACTUAL
                                        </Typography>
                                        <Typography variant="h6" sx={{ color: 'white', mt: 0.5 }}>
                                            {searchedMachine.lastChangeBy || 'No asignado'}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <Box sx={{ p: 2, bgcolor: '#1f293750', borderRadius: 2, border: '1px solid #37415140' }}>
                                        <Typography variant="caption" sx={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <ErrorOutlineIcon sx={{ fontSize: 14 }} /> MOTIVO / FALLA
                                        </Typography>
                                        <Typography variant="h6" sx={{ color: 'white', mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {searchedMachine.lastFailureType || 'N/A'}
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 4, borderColor: '#374151' }} />

                            {!isMobile ? (
                                <>
                                    <Typography variant="h6" sx={{ color: 'white', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <HistoryIcon color="primary" /> Historial de Intervenciones
                                    </Typography>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: 2, 
                                        flex: 1,
                                        overflowY: 'auto',
                                        pr: 1,
                                        '&::-webkit-scrollbar': { width: '6px' },
                                        '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                                        '&::-webkit-scrollbar-thumb': { bgcolor: '#374151', borderRadius: '10px' },
                                        '&::-webkit-scrollbar-thumb:hover': { bgcolor: '#4b5563' }
                                    }}>
                                        {loadingLogs ? <Spinner /> : history.length === 0 ? (
                                            <Typography sx={{ color: '#6b7280', fontStyle: 'italic' }}>No hay registros recientes para esta máquina.</Typography>
                                        ) : history.map((log: any, idx: number) => (
                                            <LogItem key={log.id} log={log} idx={idx} />
                                        ))}
                                    </Box>
                                </>
                            ) : (
                                <>
                                    <Box 
                                        onClick={() => setIsHistoryDrawerOpen(true)}
                                        sx={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            mb: 3, 
                                            cursor: 'pointer',
                                            '&:hover': { opacity: 0.8 }
                                        }}
                                    >
                                        <Typography variant="h6" sx={{ color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <HistoryIcon color="primary" /> Historial de Intervenciones
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#3b82f6' }}>
                                            <Typography variant="caption" sx={{ fontWeight: 700 }}>VER TODO</Typography>
                                            <OpenInFullIcon sx={{ fontSize: 16 }} />
                                        </Box>
                                    </Box>
                                    <Box sx={{ p: 2, bgcolor: '#1e293b40', borderRadius: 2, border: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setIsHistoryDrawerOpen(true)}>
                                        <Box>
                                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>Última intervención</Typography>
                                            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                                                {history[0] ? `${new Date(history[0].timestamp).toLocaleDateString()} - ${history[0].generatedBy}` : 'Sin registros'}
                                            </Typography>
                                        </Box>
                                        <ArrowForwardIosIcon sx={{ color: '#4b5563', fontSize: 16 }} />
                                    </Box>
                                </>
                            )}

                            {/* Mobile History Drawer */}
                            <Drawer
                                anchor="bottom"
                                open={isHistoryDrawerOpen}
                                onClose={() => setIsHistoryDrawerOpen(false)}
                                PaperProps={{
                                    sx: {
                                        bgcolor: '#111827',
                                        color: 'white',
                                        borderTop: '1px solid #374151',
                                        borderTopLeftRadius: 20,
                                        borderTopRightRadius: 20,
                                        height: '80vh',
                                        p: 3,
                                        zIndex: 2000
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Historial de Intervenciones</Typography>
                                    <IconButton onClick={() => setIsHistoryDrawerOpen(false)} sx={{ color: '#9ca3af' }}>
                                        <CloseIcon />
                                    </IconButton>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', pb: 4 }}>
                                    {loadingLogs ? <Spinner /> : history.length === 0 ? (
                                        <Typography sx={{ color: '#6b7280', fontStyle: 'italic' }}>No hay registros para esta máquina.</Typography>
                                    ) : history.map((log: any, idx: number) => (
                                        <LogItem key={log.id} log={log} idx={idx} />
                                    ))}
                                </Box>
                            </Drawer>
                        </Card>
                    </Grid>

                    {/* Stats & Tech Info */}
                    <Grid size={{ xs: 12, lg: 4 }}>
                        <Grid container spacing={3}>
                            {/* Performance Card */}
                            <Grid size={{ xs: 12 }}>
                                <Card sx={{ bgcolor: '#111827', borderRadius: 3, p: 3, border: '1px solid #1f2937' }}>
                                    <Typography variant="h6" sx={{ color: 'white', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <SpeedIcon color="secondary" /> Indicadores de Rendimiento
                                    </Typography>
                                    
                                    {loadingKPIs ? <Spinner /> : (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>DISPONIBILIDAD (OEE)</Typography>
                                                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 800 }}>{kpis?.availability || '0%'}</Typography>
                                                </Box>
                                                <Avatar sx={{ bgcolor: '#10b98120', color: '#10b981', width: 56, height: 56 }}>
                                                    {kpis?.availability}
                                                </Avatar>
                                            </Box>
                                            
                                            <Divider sx={{ borderColor: '#1f2937' }} />
                                            
                                            <Grid container spacing={2}>
                                                <Grid size={{ xs: 6 }}>
                                                    <Tooltip title="Mean Time Between Failures: Promedio de tiempo entre fallas">
                                                        <Box>
                                                            <Typography variant="caption" sx={{ color: '#9ca3af' }}>MTBF</Typography>
                                                            <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>{kpis?.mtbf || '0h'}</Typography>
                                                        </Box>
                                                    </Tooltip>
                                                </Grid>
                                                <Grid size={{ xs: 6 }}>
                                                    <Tooltip title="Mean Time To Repair: Promedio de tiempo de reparación">
                                                        <Box>
                                                            <Typography variant="caption" sx={{ color: '#9ca3af' }}>MTTR</Typography>
                                                            <Typography variant="h5" sx={{ color: '#f87171', fontWeight: 700 }}>{kpis?.mttr || '0h'}</Typography>
                                                        </Box>
                                                    </Tooltip>
                                                </Grid>
                                            </Grid>
                                            
                                            <Box sx={{ p: 2, bgcolor: '#1f293750', borderRadius: 2 }}>
                                                <Typography variant="caption" sx={{ color: '#9ca3af' }}>FALLAS REGISTRADAS</Typography>
                                                <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>{kpis?.failures || 0}</Typography>
                                            </Box>
                                        </Box>
                                    )}
                                </Card>
                            </Grid>

                            {/* Technical Specs */}
                            <Grid size={{ xs: 12 }}>
                                <Card sx={{ bgcolor: '#111827', borderRadius: 3, p: 3, border: '1px solid #1f2937' }}>
                                    <Typography variant="h6" sx={{ color: 'white', mb: 2.5 }}>Ficha Técnica</Typography>
                                    
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {[
                                            { label: 'Agujas', value: searchedMachine.metadata?.cantidadAgujas },
                                            { label: 'Cilindro', value: searchedMachine.metadata?.tipoCilindro },
                                            { label: 'Trimer', value: searchedMachine.metadata?.tipoTrimer },
                                            { label: 'Marca/Modelo', value: searchedMachine.nombre },
                                        ].map((spec, i) => (
                                            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1f2937', pb: 1 }}>
                                                <Typography variant="body2" sx={{ color: '#9ca3af' }}>{spec.label}</Typography>
                                                <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>{spec.value || 'N/A'}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Card>
                            </Grid>

                            {/* Media Compatibility Mock Card */}
                            <Grid size={{ xs: 12 }}>
                                <Card sx={{ bgcolor: '#111827', borderRadius: 3, p: 3, border: '1px solid #1f2937' }}>
                                    <Typography variant="h6" sx={{ color: 'white', mb: 2.5 }}>Compatibilidad de Artículos</Typography>
                                    
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 900, textTransform: 'uppercase' }}>Soporta</Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                                            {['Media Corta', 'Media Invisble', 'Media de Tenis', 'Media de Compresión'].map(item => (
                                                <Chip key={item} label={item} size="small" sx={{ bgcolor: '#10b98115', color: '#10b981', fontWeight: 700, fontSize: '0.65rem' }} />
                                            ))}
                                        </Box>
                                        
                                        <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 900, textTransform: 'uppercase' }}>No Soporta</Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {['Media de Fútbol', 'Media Térmica Pesada', 'Media con Felpa Total'].map(item => (
                                                <Chip key={item} label={item} size="small" sx={{ bgcolor: '#ef444415', color: '#ef4444', fontWeight: 700, fontSize: '0.65rem' }} />
                                            ))}
                                        </Box>
                                    </Box>
                                </Card>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}
