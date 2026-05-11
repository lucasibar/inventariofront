import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, IconButton, List, ListItem, Collapse, Fade, Chip, TextField, Button, Menu, MenuItem } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import MemoryIcon from '@mui/icons-material/Memory';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import CodeIcon from '@mui/icons-material/Code';
import MapIcon from '@mui/icons-material/Map';
import EngineeringIcon from '@mui/icons-material/Engineering';
import TimerIcon from '@mui/icons-material/Timer';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Spinner, Select } from '../../../shared/ui';
import { 
    useGetPlantsQuery, 
    useGetMachineTypesQuery,
    useGetMetricsQuery,
    useGetPlantKPIsQuery,
    useGetMachinesQuery,
    useUpdateMachineStatusMutation
} from '../api/maintenance.api';
import type { Machine } from '../api/maintenance.api';

const statusColors: Record<string, string> = {
    ACTIVA: '#10b981',
    PARADA: '#ef4444',
    REVISAR: '#f59e0b',
    VELOCIDAD_REDUCIDA: '#f97316',
    ELECTRONIC: '#3b82f6',
    FALTA_COSTURA: '#8b5cf6',
    FALTA_PROGRAMA: '#06b6d4',
};

const statusIcons: Record<string, React.ReactNode> = {
    ACTIVA: <CheckCircleIcon sx={{ fontSize: '0.8rem' }} />,
    PARADA: <CancelIcon sx={{ fontSize: '0.8rem' }} />,
    REVISAR: <VisibilityIcon sx={{ fontSize: '0.8rem' }} />,
    VELOCIDAD_REDUCIDA: <TrendingDownIcon sx={{ fontSize: '0.8rem' }} />,
    ELECTRONIC: <MemoryIcon sx={{ fontSize: '0.8rem' }} />,
    FALTA_COSTURA: <ContentCutIcon sx={{ fontSize: '0.8rem' }} />,
    FALTA_PROGRAMA: <CodeIcon sx={{ fontSize: '0.8rem' }} />,
};

const responsables = ['Sin Asignar', 'Gaston', 'Ruben', 'Daniel', 'Alexis', 'Violeta', 'Leandro', 'Gaspar', 'Ramón', 'Tejedor'];
const failureTypes = [
    'Sin Asignar', 'Ninguna', 'Cosedora Cilindro', 'Cosedora Brazo', 'Cosedora Cierre', 'Error electronico',
    'Error Puesta 0', 'Error Motores', 'Mal vanizado', 'Logo contaminado',
    'Tejido(Muerde/revienta/pica/tirones)', 'Goma', 'Puntada', 'Transferencia',
    'Aguja', 'Platina', 'Menguados', 'Corta', 'Electronico', 'Lubricacion',
    'Mancha', 'Corte', 'REPUESTO', 'Corte de luz.', 'Programacion'
];

const formatStatus = (status: string) => {
    if (status === 'VELOCIDAD_REDUCIDA') return 'Vel. Reducida';
    return status.replace('_', ' ');
};

const InteractiveMachineItem = ({ machine, sortMode }: { machine: Machine, sortMode: 'mtbf' | 'mttr' | null }) => {
    const navigate = useNavigate();
    const [updateStatus] = useUpdateMachineStatusMutation();

    const [anchorElStatus, setAnchorElStatus] = useState<null | HTMLElement>(null);
    const [anchorElFailure, setAnchorElFailure] = useState<null | HTMLElement>(null);
    const [anchorElMechanic, setAnchorElMechanic] = useState<null | HTMLElement>(null);
    const [isEditingObservation, setIsEditingObservation] = useState(false);
    const [obsText, setObsText] = useState(machine.lastObservation || '');

    const timeAgo = useMemo(() => {
        const date = machine.lastStatusChange ? new Date(machine.lastStatusChange) : new Date(machine.createdAt);
        const diff = Date.now() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}h`;
        const mins = Math.floor(diff / (1000 * 60));
        return `${mins}m`;
    }, [machine.lastStatusChange, machine.createdAt]);

    const handleQuickUpdate = async (updates: Partial<{ status: string, failureType: string, generatedBy: string, observation: string }>) => {
        await updateStatus({
            id: machine.id,
            status: (updates.status || machine.status) as any,
            failureType: updates.failureType || machine.lastFailureType || 'Ninguna',
            generatedBy: updates.generatedBy || machine.lastChangeBy || 'Sin Asignar',
            observation: updates.observation !== undefined ? updates.observation : (machine.lastObservation || ''),
            timestamp: new Date().toISOString()
        });
        setAnchorElStatus(null);
        setAnchorElFailure(null);
        setAnchorElMechanic(null);
        setIsEditingObservation(false);
    };
    return (
        <ListItem sx={{ 
            bgcolor: 'rgba(255,255,255,0.02)', 
            mb: 0.5, 
            borderRadius: 0, 
            p: 1.8, 
            borderBottom: '1px solid rgba(255,255,255,0.05)', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '100%'
        }}>
            {/* Main Row */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                {/* LEFT SIDE: Machine Number and Responsible */}
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography 
                        variant="h5" 
                        onClick={() => navigate('/mantenimiento/buscador', { state: { machine, plantId: machine.plantId } })}
                        sx={{ fontWeight: 900, color: '#fff', lineHeight: 1, cursor: 'pointer', '&:hover': { color: '#3b82f6' } }}
                    >
                        {machine.number}
                    </Typography>
                    
                    <Typography 
                        variant="caption" 
                        onClick={(e) => setAnchorElMechanic(e.currentTarget)}
                        sx={{ color: machine.lastChangeBy ? '#6b7280' : '#ef4444', cursor: 'pointer', mt: 0.5, fontSize: '0.75rem', fontWeight: 700 }}
                    >
                        {machine.lastChangeBy || 'Sin asignar'}
                    </Typography>

                    <Menu
                        anchorEl={anchorElMechanic}
                        open={Boolean(anchorElMechanic)}
                        onClose={() => setAnchorElMechanic(null)}
                        PaperProps={{ sx: { bgcolor: '#1a1d24', color: 'white', border: '1px solid #374151', maxHeight: 300 } }}
                    >
                        {responsables.map(r => (
                            <MenuItem 
                                key={r} 
                                onClick={() => handleQuickUpdate({ generatedBy: r })}
                                sx={{ fontSize: '0.75rem', py: 0.5, '&:hover': { bgcolor: '#3b82f6' } }}
                            >
                                {r}
                            </MenuItem>
                        ))}
                    </Menu>
                </Box>
                
                {/* RIGHT SIDE: Status, Failure Type, Time and Edit Observation */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                        {sortMode ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: sortMode === 'mtbf' ? '#10b981' : '#f87171' }}>
                                {sortMode === 'mtbf' ? <EngineeringIcon sx={{ fontSize: 14 }} /> : <TimerIcon sx={{ fontSize: 14 }} />}
                                <Typography sx={{ fontWeight: 900, fontSize: '1.2rem' }}>
                                    {sortMode === 'mtbf' ? `${machine.mtbf || 0}d` : `${machine.mttr || 0}h`}
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <Box 
                                    onClick={(e) => setAnchorElStatus(e.currentTarget)}
                                    sx={{ 
                                        display: 'flex', alignItems: 'center', gap: 0.5,
                                        color: statusColors[machine.status], 
                                        fontWeight: 900, 
                                        cursor: 'pointer', 
                                        px: 1, 
                                        py: 0.3, 
                                        bgcolor: `${statusColors[machine.status]}15`, 
                                        borderRadius: '4px',
                                        border: `1px solid ${statusColors[machine.status]}30`,
                                        fontSize: '0.65rem',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    {statusIcons[machine.status]}
                                    {formatStatus(machine.status)}
                                </Box>
                                <Menu
                                    anchorEl={anchorElStatus}
                                    open={Boolean(anchorElStatus)}
                                    onClose={() => setAnchorElStatus(null)}
                                    PaperProps={{ sx: { bgcolor: '#1a1d24', color: 'white', border: '1px solid #374151' } }}
                                >
                                    {Object.keys(statusColors).map(s => (
                                        <MenuItem 
                                            key={s} 
                                            onClick={() => handleQuickUpdate({ status: s })}
                                            sx={{ fontSize: '0.75rem', py: 0.5, color: statusColors[s], '&:hover': { bgcolor: `${statusColors[s]}15` } }}
                                        >
                                            {formatStatus(s)}
                                        </MenuItem>
                                    ))}
                                </Menu>

                                <Typography 
                                    variant="caption" 
                                    onClick={(e) => setAnchorElFailure(e.currentTarget)}
                                    sx={{ color: '#9ca3af', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', mt: 0.3, display: 'flex', alignItems: 'center', gap: 0.3 }}
                                >
                                    <ErrorOutlineIcon sx={{ fontSize: 10 }} />
                                    {machine.lastFailureType || 'Sin fallo'}
                                </Typography>

                                <Menu
                                    anchorEl={anchorElFailure}
                                    open={Boolean(anchorElFailure)}
                                    onClose={() => setAnchorElFailure(null)}
                                    PaperProps={{ sx: { bgcolor: '#1a1d24', color: 'white', border: '1px solid #374151', maxHeight: 300 } }}
                                >
                                    {failureTypes.map(f => (
                                        <MenuItem 
                                            key={f} 
                                            onClick={() => handleQuickUpdate({ failureType: f })}
                                            sx={{ fontSize: '0.75rem', py: 0.5, '&:hover': { bgcolor: '#3b82f6' } }}
                                        >
                                            {f}
                                        </MenuItem>
                                    ))}
                                </Menu>
                            </Box>
                        )}
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                            <IconButton 
                                size="small" 
                                onClick={() => setIsEditingObservation(!isEditingObservation)}
                                sx={{ 
                                    p: 0, 
                                    color: machine.lastObservation ? '#3b82f6' : '#4b5563', 
                                    '&:hover': { color: '#fff' } 
                                }}
                            >
                                <VisibilityIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <Typography variant="caption" sx={{ color: '#4b5563', fontWeight: 800, fontSize: '0.6rem' }}>
                                Hace {timeAgo}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Observation Edit Overlay / Expansion */}
            <Collapse in={isEditingObservation} sx={{ width: '100%' }}>
                <Box sx={{ mt: 1, p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Escribe una observación..."
                        value={obsText}
                        onChange={(e) => setObsText(e.target.value)}
                        variant="standard"
                        InputProps={{
                            disableUnderline: true,
                            sx: { color: 'white', fontSize: '0.8rem', fontStyle: 'italic' }
                        }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                        <Button size="small" onClick={() => { setIsEditingObservation(false); setObsText(machine.lastObservation || ''); }} sx={{ color: '#6b7280', fontSize: '0.6rem' }}>Cancelar</Button>
                        <Button size="small" onClick={() => handleQuickUpdate({ observation: obsText })} sx={{ color: '#10b981', fontWeight: 900, fontSize: '0.6rem' }}>Guardar</Button>
                    </Box>
                </Box>
            </Collapse>
        </ListItem>

    );
};

const StatusButton = ({ status, count, active, onClick }: { status: string, count: number, active: boolean, onClick: () => void }) => {
    const color = statusColors[status];
    return (
        <Box 
            onClick={onClick}
            sx={{ 
                flex: '1 1 0',
                minWidth: 70,
                height: 70,
                p: 1, 
                borderRadius: 3, 
                bgcolor: active ? `${color}25` : 'rgba(255,255,255,0.03)',
                border: '1px solid',
                borderColor: active ? color : 'rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
            }}
        >
            <Box sx={{ color: color, mb: 0.3, opacity: active ? 1 : 0.6, display: 'flex' }}>
                {statusIcons[status]}
            </Box>
            <Typography sx={{ color: active ? '#fff' : color, fontWeight: 900, mb: 0.1, lineHeight: 1, fontSize: '1.2rem' }}>
                {count}
            </Typography>
            <Typography variant="caption" sx={{ 
                color: active ? '#fff' : '#6b7280', 
                fontSize: '0.45rem', 
                fontWeight: 800, 
                textAlign: 'center',
                lineHeight: 1,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                maxWidth: '100%',
                overflow: 'hidden'
            }}>
                {formatStatus(status)}
            </Typography>
            {active && (
                <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, bgcolor: color }} />
            )}
        </Box>
    );
};

export default function DashboardMantenimientoPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortMode, setSortMode] = useState<'mtbf' | 'mttr' | null>(null);

    // Consume navigation state
    useEffect(() => {
        const state = location.state as { machineNumber?: number | string; plantId?: string; status?: string } | null;
        if (state) {
            if (state.plantId) setSelectedPlantId(state.plantId);
            if (state.machineNumber) setSearchQuery(String(state.machineNumber));
            if (state.status) {
                setSelectedStatus(state.status);
                setSortMode(null);
            }
            setShowFilters(true);
        }
    }, [location.state]);

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

    const { data: metrics, isLoading: loadingMetrics } = useGetMetricsQuery(
        { plantId: selectedPlantId || '', typeId: selectedTypeId || '' },
        { skip: !selectedPlantId }
    );

    const { data: kpis, isLoading: loadingKpis } = useGetPlantKPIsQuery(
        { plantId: selectedPlantId || '', typeId: selectedTypeId || '' },
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
        const counts: Record<string, number> = {};
        Object.keys(statusColors).forEach(s => counts[s] = 0);
        if (metrics?.byStatus) {
            metrics.byStatus.forEach((s: any) => counts[s.status] = parseInt(s.count, 10));
        }
        return counts;
    }, [metrics]);

    const filteredMachines = useMemo(() => {
        let result = [...allMachines];
        
        if (sortMode === 'mtbf') {
            result.sort((a, b) => (b.mtbf || 0) - (a.mtbf || 0));
        } else if (sortMode === 'mttr') {
            result.sort((a, b) => (b.mttr || 0) - (a.mttr || 0));
        } else {
            if (selectedStatus) {
                result = result.filter((m: Machine) => m.status === selectedStatus);
            } else {
                result = result.filter(m => m.status !== 'ACTIVA');
            }
        }

        if (searchQuery) {
            result = result.filter(m => m.number.toString() === searchQuery);
        }
        return result;
    }, [allMachines, selectedStatus, searchQuery, sortMode]);

    const handleSortToggle = (mode: 'mtbf' | 'mttr') => {
        if (sortMode === mode) {
            setSortMode(null);
        } else {
            setSortMode(mode);
            setSelectedStatus(null);
        }
    };

    const toggleSidebar = () => {
        const event = new CustomEvent('open-sidebar-menu');
        document.dispatchEvent(event);
    };

    if (loadingPlants || loadingTypes) return <Spinner />;

    return (
        <Box sx={{ p: 0, maxWidth: '1400px', margin: '0 auto', color: 'white', pb: 10 }}>
            
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 1, 
                bgcolor: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
                <IconButton size="medium" onClick={toggleSidebar} sx={{ color: '#6b7280', mr: 1 }}>
                    <MoreVertIcon />
                </IconButton>

                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Box 
                        onClick={() => handleSortToggle('mtbf')}
                        sx={{ 
                            flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 1, 
                            cursor: 'pointer', opacity: sortMode === 'mttr' ? 0.3 : 1, transition: 'all 0.2s',
                            bgcolor: sortMode === 'mtbf' ? 'rgba(16,185,129,0.1)' : 'transparent', borderRadius: 2, py: 0.5
                        }}
                    >
                        <Typography sx={{ color: sortMode === 'mtbf' ? '#10b981' : '#4b5563', fontWeight: 900, fontSize: '1.4rem', textTransform: 'uppercase' }}>MTBF</Typography>
                        <Typography sx={{ color: sortMode === 'mtbf' ? '#10b981' : '#fff', fontWeight: 950, fontSize: '1.6rem', letterSpacing: '-0.03em' }}>{kpis?.mtbf?.split(' ')[0] || '0d'}</Typography>
                    </Box>
                    <Box sx={{ width: '1px', height: '24px', bgcolor: 'rgba(255,255,255,0.1)', mx: 0.5 }} />
                    <Box 
                        onClick={() => handleSortToggle('mttr')}
                        sx={{ 
                            flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 1, 
                            cursor: 'pointer', opacity: sortMode === 'mtbf' ? 0.3 : 1, transition: 'all 0.2s',
                            bgcolor: sortMode === 'mttr' ? 'rgba(248,113,113,0.1)' : 'transparent', borderRadius: 2, py: 0.5
                        }}
                    >
                        <Typography sx={{ color: sortMode === 'mttr' ? '#f87171' : '#4b5563', fontWeight: 900, fontSize: '1.4rem', textTransform: 'uppercase' }}>MTTR</Typography>
                        <Typography sx={{ color: sortMode === 'mttr' ? '#f87171' : '#fff', fontWeight: 950, fontSize: '1.6rem', letterSpacing: '-0.03em' }}>{kpis?.mttr?.split(' ')[0] || '0h'}</Typography>
                    </Box>
                </Box>
                
                <IconButton size="medium" onClick={() => setShowFilters(!showFilters)} sx={{ color: showFilters ? '#10b981' : '#6b7280', ml: 1 }}>
                    <FilterListIcon />
                </IconButton>
            </Box>

            <Collapse in={showFilters}>
                <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <TextField
                        placeholder="N° de máquina..."
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        fullWidth
                        InputProps={{
                            startAdornment: (
                                <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                                    <SearchIcon sx={{ color: '#4b5563', fontSize: '1.1rem' }} />
                                </Box>
                            ),
                            sx: { bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 2, color: 'white', fontSize: '0.85rem' }
                        }}
                        sx={{ mb: 1.5 }}
                    />
                    <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                        <Select label="Planta" value={selectedPlantId || ''} onChange={setSelectedPlantId} options={plantOptions} />
                        <Select label="Tipo" value={selectedTypeId || 'ALL'} onChange={setSelectedTypeId} options={typeOptions} />
                    </Box>
                </Box>
            </Collapse>

            {(loadingMetrics || loadingKpis) ? (
                <Spinner />
            ) : (
                <Box sx={{ p: 0 }}>
                    <Box sx={{ 
                        display: 'flex', 
                        overflowX: 'auto', 
                        gap: 0.8, 
                        p: 1.5,
                        '&::-webkit-scrollbar': { display: 'none' },
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none'
                    }}>
                        {Object.keys(statusColors).map(status => (
                            <StatusButton 
                                key={status}
                                status={status} 
                                count={statusCounts[status] || 0} 
                                active={selectedStatus === status}
                                onClick={() => {
                                    setSelectedStatus(selectedStatus === status ? null : status);
                                    setSortMode(null);
                                }}
                            />
                        ))}
                    </Box>

                    <Fade in timeout={300}>
                        <Box>
                            <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.8rem', color: '#4b5563', textTransform: 'uppercase' }}>
                                    {sortMode ? `ORDENADO POR ${sortMode}` : (selectedStatus ? formatStatus(selectedStatus) : 'INCIDENCIAS')}
                                    <Chip label={filteredMachines.length} size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800, bgcolor: 'rgba(255,255,255,0.05)' }} />
                                </Typography>
                                
                                <Button 
                                    size="small"
                                    startIcon={<MapIcon />}
                                    onClick={() => navigate('/mantenimiento/monitoreo')}
                                    sx={{ 
                                        color: '#6b7280', 
                                        fontWeight: 800, 
                                        fontSize: '0.65rem',
                                        textTransform: 'uppercase',
                                        '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }
                                    }}
                                >
                                    Volver al Mapa
                                </Button>
                            </Box>

                            <List disablePadding sx={{ width: '100%' }}>
                                {filteredMachines.length > 0 ? (
                                    filteredMachines.map((machine: Machine) => (
                                        <InteractiveMachineItem key={machine.id} machine={machine} sortMode={sortMode} />
                                    ))
                                ) : (
                                    <Box sx={{ p: 6, textAlign: 'center' }}>
                                        <Typography variant="caption" sx={{ color: '#374151', fontWeight: 800 }}>SIN NOVEDADES</Typography>
                                    </Box>
                                )}
                            </List>
                        </Box>
                    </Fade>
                </Box>
            )}
        </Box>
    );
}
