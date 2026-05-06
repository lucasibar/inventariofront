import { useState, useMemo, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Card, CardContent, Tooltip, useMediaQuery, useTheme, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { 
    useGetPlantsQuery, 
    useGetMachinesQuery, 
    useGetMetricsQuery,
    useGetLogsQuery,
    useGetMachineTypesQuery
} from '../api/maintenance.api';
import { Spinner, ActionMenu } from '../../../shared/ui';
import { 
    CheckCircle as CheckCircleIcon, 
    Error as ErrorIcon, 
    PauseCircle as PauseCircleIcon, 
    ElectricBolt as ZapIcon, 
    Help as HelpIcon, 
    AccessTime as ClockIcon,
    GridView as LayoutGridIcon,
    List as ListIcon,
    Add as PlusIcon,
    Remove as MinusIcon,
    MoreVert as MoreVertIcon
} from '@mui/icons-material';

const STATUS_COLORS: Record<string, string> = {
    ACTIVA: '#10b981',
    REVISAR: '#eab308',
    VELOCIDAD_REDUCIDA: '#f97316',
    PARADA: '#ef4444',
    ELECTRONIC: '#3b82f6',
    FALTA_COSTURA: '#8b5cf6',
    FALTA_PROGRAMA: '#06b6d4',
    SIN_DATOS: '#9ca3af'
};

const STATUS_LABELS: Record<string, string> = {
    ACTIVA: 'Activa',
    REVISAR: 'A Revisar',
    VELOCIDAD_REDUCIDA: 'Velocidad Reducida',
    PARADA: 'Parada',
    ELECTRONIC: 'Electrónica',
    FALTA_COSTURA: 'Falta Costura',
    FALTA_PROGRAMA: 'Falta Programa',
    SIN_DATOS: 'Sin Datos'
};

const MachineNode = ({ number, status, onClick }: { number: number | null, status: string, onClick?: () => void }) => {
    if (number === null) return <Box sx={{ width: { xs: 15, sm: 22, md: 28, lg: 38, xl: 54 }, height: { xs: 15, sm: 22, md: 28, lg: 38, xl: 54 } }} />;

    const statusColor = STATUS_COLORS[status] || STATUS_COLORS.SIN_DATOS;

    return (
        <Tooltip title={`Máquina ${number} - ${STATUS_LABELS[status] || status}`} arrow>
            <Box onClick={onClick} sx={{ 
                width: { xs: 15, sm: 22, md: 28, lg: 38, xl: 54 },
                height: { xs: 15, sm: 22, md: 28, lg: 38, xl: 54 },
                bgcolor: 'transparent',
                border: `2px solid ${statusColor}`,
                borderRadius: { xs: 0.5, md: 1 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: statusColor,
                fontSize: { xs: '7px', sm: '10px', md: '12px', lg: '14px', xl: '18px' },
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: 1,
                transform: 'scale(1)',
                boxShadow: `0 0 10px ${statusColor}40`,
                zIndex: 1,
                textShadow: `0 0 4px ${statusColor}30`,
                '&:hover': {
                    transform: 'scale(1.25)',
                    bgcolor: `${statusColor}20`,
                    zIndex: 20,
                    boxShadow: `0 0 20px ${statusColor}80`,
                    filter: 'brightness(1.2)'
                }
            }}>
                {number}
            </Box>
        </Tooltip>
    );
};



const StatCard = ({ title, value, percentage, icon: Icon, color }: any) => (
    <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
        <CardContent sx={{ p: '20px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: `${color}15`, color: color, display: 'flex' }}>
                    <Icon sx={{ fontSize: 20 }} />
                </Box>
                <Typography variant="subtitle2" sx={{ color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                    {title}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5 }}>
                <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700 }}>{value}</Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', mb: 0.5 }}>{percentage}%</Typography>
            </Box>
            {/* Sparkline simulation */}
            <Box sx={{ mt: 2, height: '30px', width: '100%', position: 'relative', overflow: 'hidden' }}>
                <svg width="100%" height="30" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <path 
                        d="M0 25 Q 10 15, 20 20 T 40 10 T 60 22 T 80 15 T 100 18" 
                        fill="none" 
                        stroke={color} 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                    />
                </svg>
            </Box>
        </CardContent>
    </Card>
);

export default function MonitoreoVivoPage() {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const { data: plants = [] } = useGetPlantsQuery();
    const { data: machineTypes = [] } = useGetMachineTypesQuery();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);

    useEffect(() => {
        if (plants.length > 0 && !selectedPlantId) {
            const dw = plants.find((p: any) => p.name.toLowerCase().includes('der will'));
            setSelectedPlantId(dw?.id || plants[0].id);
        }
    }, [plants]);

    const tejeduriaTypeId = useMemo(() => {
        const tej = machineTypes.find((t: any) => t.name.toLowerCase().includes('tejedur'));
        return tej?.id || null;
    }, [machineTypes]);

    const { data: machines = [], isLoading: loadingMachines } = useGetMachinesQuery(
        { plantId: selectedPlantId || '' },
        { skip: !selectedPlantId, pollingInterval: 30000 }
    );


    const { data: metrics } = useGetMetricsQuery(
        { plantId: selectedPlantId || '', typeId: tejeduriaTypeId || '' },
        { skip: !selectedPlantId || !tejeduriaTypeId, pollingInterval: 30000 }
    );

    const { data: recentLogs = [] } = useGetLogsQuery(
        { plantId: selectedPlantId || '', limit: 5 },
        { skip: !selectedPlantId, pollingInterval: 30000 }
    );

    // Exact layout from the image
    const layout = useMemo(() => [
        // Bloque Superior
        {
            left: [
                [190, 189, 188, 187, 186, 185, 184, 183, 182, 181, 180, 179],
                [170, 169, 168, 167, 160, 159, 158, 157, 151, 150, 149, 148]
            ],
            right: [
                [null, 178, 177, 176, 175, 174, 173, 172, 171],
                [142, 141, 140, 139, 138, 132, 131, 130, 129, 128]
            ]
        },
        // Bloque Medio Superior
        {
            left: [
                [166, 165, 164, 163, 162, 161, 156, 155, 154, 153, 152, 147, 146, 145, 144, 143],
                [null, 73, 74, 75, 76, 77, 83, 84, 85, 86, 87, 93, 94, 95, 96, 97]
            ],
            right: [
                [137, 136, 135, 134, 133, 127, 126, 125, 124, 123],
                [103, 104, 105, 106, 107, 113, 114, 115, 116, 117]
            ]
        },
        // Bloque Medio Inferior
        {
            left: [
                [78, 79, 80, 81, 82, 88, 89, 90, 91, 92, 98, 99, 100, 101, 102],
                [23, 24, 25, 26, 27, 33, 34, 35, 36, 37, 43, 44, 45, 46, 47]
            ],
            right: [
                [108, 109, 110, 111, 112, 118, 119, 120, 122, 121],
                [53, 54, 55, 56, 57, 63, 64, 65, 66, 67]
            ]
        },
        // Bloque Inferior
        {
            left: [
                [28, 29, 30, 31, 32, 38, 39, 40, 41, 42, 48, 49, 50, 51, 52],
                [null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
            ],
            right: [
                [58, 59, 60, 61, 62, 68, 69, 70, 71, 72],
                [13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
            ]
        }
    ], []);

    // Map machines data to the layout
    const machineMap = useMemo(() => {
        const map: Record<number, any> = {};
        machines.forEach((m: any) => {
            map[m.number] = m;
        });
        return map;
    }, [machines]);

    const renderRow = (nums: (number | null)[], rowIdx: number) => (
        <Box key={rowIdx} sx={{ display: 'flex', gap: { xs: '2px', md: '3px', xl: '4px' } }}>
            {nums.map((n, i) => {
                const machine = n !== null ? machineMap[n] : null;

                return (
                    <MachineNode 
                        key={n ?? `empty-${i}`} 
                        number={n} 
                        status={machine?.estado || machine?.status || 'SIN_DATOS'}
                        onClick={() => {
                            if (machine) {
                                navigate('/mantenimiento/registro', {
                                    state: {
                                        preselectedMachine: machine,
                                        plantId: selectedPlantId
                                    }
                                });
                            }
                        }}
                    />
                );
            })}
        </Box>
    );

    const renderSection = (section: any, idx: number) => (
        <Fragment key={idx}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: '2px', md: '3px', xl: '4px' }, flex: '0 0 auto', alignItems: 'flex-end', mb: { xs: 2, md: 3, lg: 4 } }}>
                {section.left.map((row: any, i: number) => renderRow(row, i))}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: '2px', md: '3px', xl: '4px' }, flex: '0 0 auto', alignItems: 'flex-start', mb: { xs: 2, md: 3, lg: 4 } }}>
                {section.right.map((row: any, i: number) => renderRow(row, i))}
            </Box>
        </Fragment>
    );

    const statusCounts = useMemo(() => {
        const counts: any = { ACTIVA: 0, REVISAR: 0, VELOCIDAD_REDUCIDA: 0, PARADA: 0, ELECTRONIC: 0, FALTA_COSTURA: 0, FALTA_PROGRAMA: 0, SIN_DATOS: 0 };
        if (metrics?.byStatus) {
            metrics.byStatus.forEach((s: any) => {
                counts[s.status] = parseInt(s.count);
            });
        }
        return counts;
    }, [metrics]);

    if (!selectedPlantId || !tejeduriaTypeId || loadingMachines) return <Spinner />;

    return (
        <Box sx={{ p: 3, bgcolor: '#0f1117', minHeight: '100vh', color: '#fff' }}>
            <Grid container spacing={3}>
                {/* Main Content: Map */}
                <Grid size={{ xs: 12 }}>
                    <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)', mb: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box 
                                        onClick={() => document.dispatchEvent(new Event('open-sidebar-menu'))}
                                        sx={{ 
                                            p: 1, borderRadius: 1, cursor: 'pointer', display: 'flex', 
                                            bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } 
                                        }}
                                    >
                                        <MoreVertIcon sx={{ color: '#94a3b8' }} />
                                    </Box>
                                    <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                                                Monitoreo en Tiempo Real
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, bgcolor: 'rgba(16, 185, 129, 0.1)', borderRadius: 1 }}>
                                                <Box sx={{ width: 6, height: 6, bgcolor: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                                                <Typography sx={{ color: '#10b981', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>En Vivo</Typography>
                                            </Box>
                                        </Box>
                                        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                                            {currentTime.toLocaleTimeString()} — {machines.length} máquinas mostradas — Tejeduría
                                        </Typography>
                                    </Box>
                                </Box>
                                
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <ActionMenu 
                                        options={[
                                            { label: 'Refrescar Datos', onClick: () => window.location.reload(), icon: '🔄' },
                                            { label: 'Configurar Layout', onClick: () => {}, icon: '⚙️' },
                                            { label: 'Exportar Reporte', onClick: () => {}, icon: '📊' }
                                        ]} 
                                    />
                                </Box>
                            </Box>

                                    <Box sx={{ 
                                        width: '100%', 
                                        margin: '0 auto', 
                                        display: 'grid', 
                                        gridTemplateColumns: 'max-content max-content',
                                        columnGap: { xs: 2, sm: 3, md: 5, xl: 8 },
                                        justifyContent: 'center'
                                    }}>
                                        {layout.map((section, idx) => renderSection(section, idx))}
                                    </Box>
                        </CardContent>
                    </Card>

                    {/* Status Cards spanning full width */}
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6, md: 1.71 }}>
                            <StatCard title="Activas" value={statusCounts.ACTIVA} percentage={((statusCounts.ACTIVA / metrics?.total || 1) * 100).toFixed(1)} icon={CheckCircleIcon} color="#10b981" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 1.71 }}>
                            <StatCard title="A Revisar" value={statusCounts.REVISAR} percentage={((statusCounts.REVISAR / metrics?.total || 1) * 100).toFixed(1)} icon={HelpIcon} color="#eab308" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 1.71 }}>
                            <StatCard title="Vel. Reducida" value={statusCounts.VELOCIDAD_REDUCIDA} percentage={((statusCounts.VELOCIDAD_REDUCIDA / metrics?.total || 1) * 100).toFixed(1)} icon={ClockIcon} color="#f97316" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 1.71 }}>
                            <StatCard title="Paradas" value={statusCounts.PARADA} percentage={((statusCounts.PARADA / metrics?.total || 1) * 100).toFixed(1)} icon={PauseCircleIcon} color="#ef4444" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 1.71 }}>
                            <StatCard title="Electrónica" value={statusCounts.ELECTRONIC} percentage={((statusCounts.ELECTRONIC / metrics?.total || 1) * 100).toFixed(1)} icon={ZapIcon} color="#3b82f6" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 1.71 }}>
                            <StatCard title="Costura" value={statusCounts.FALTA_COSTURA} percentage={((statusCounts.FALTA_COSTURA / metrics?.total || 1) * 100).toFixed(1)} icon={LayoutGridIcon} color="#8b5cf6" />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 1.71 }}>
                            <StatCard title="Programa" value={statusCounts.FALTA_PROGRAMA} percentage={((statusCounts.FALTA_PROGRAMA / metrics?.total || 1) * 100).toFixed(1)} icon={ListIcon} color="#06b6d4" />
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(1.2); }
                    100% { opacity: 1; transform: scale(1); }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255,255,255,0.02);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                }
            `}</style>
        </Box>
    );
}
