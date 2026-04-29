import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, useTheme, useMediaQuery, Tooltip } from '@mui/material';
import { 
    useGetPlantsQuery, 
    useGetMachinesQuery, 
    useGetMetricsQuery,
    useGetLogsQuery
} from '../api/maintenance.api';
import { Spinner } from '../../../shared/ui';
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
    Remove as MinusIcon
} from '@mui/icons-material';

const STATUS_COLORS: Record<string, string> = {
    ACTIVA: '#10b981',
    REVISAR: '#eab308',
    VELOCIDAD_REDUCIDA: '#f97316',
    PARADA: '#ef4444',
    ELECTRONIC: '#3b82f6',
    SIN_DATOS: '#9ca3af'
};

const STATUS_LABELS: Record<string, string> = {
    ACTIVA: 'Activa',
    REVISAR: 'A Revisar',
    VELOCIDAD_REDUCIDA: 'Velocidad Reducida',
    PARADA: 'Parada',
    ELECTRONIC: 'Electrónica',
    SIN_DATOS: 'Sin Datos'
};

const MachineNode = ({ machine }: { machine: any }) => {
    const statusColor = STATUS_COLORS[machine?.status || 'SIN_DATOS'];
    
    return (
        <Tooltip title={`Máquina ${machine?.number || '?'}: ${STATUS_LABELS[machine?.status || 'SIN_DATOS']}`}>
            <Box
                sx={{
                    width: '38px',
                    height: '38px',
                    bgcolor: statusColor,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    '&:hover': {
                        transform: 'scale(1.1)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        zIndex: 10
                    }
                }}
            >
                {machine?.number}
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
    const theme = useTheme();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const { data: plants = [] } = useGetPlantsQuery();
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);

    useEffect(() => {
        if (plants.length > 0 && !selectedPlantId) {
            const dw = plants.find((p: any) => p.name.toLowerCase().includes('der will'));
            setSelectedPlantId(dw?.id || plants[0].id);
        }
    }, [plants]);

    const { data: machines = [], isLoading: loadingMachines } = useGetMachinesQuery(
        { plantId: selectedPlantId || '' },
        { skip: !selectedPlantId, pollingInterval: 30000 }
    );

    const { data: metrics } = useGetMetricsQuery(
        { plantId: selectedPlantId || '' },
        { skip: !selectedPlantId, pollingInterval: 30000 }
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

    const renderRow = (nums: (number | null)[]) => (
        <Box sx={{ display: 'flex', gap: '4px' }}>
            {nums.map((n, i) => (
                n === null ? (
                    <Box key={i} sx={{ width: '38px', height: '38px' }} />
                ) : (
                    <MachineNode key={n} machine={machineMap[n] || { number: n, status: 'SIN_DATOS' }} />
                )
            ))}
        </Box>
    );

    const renderSection = (section: any, idx: number) => (
        <Box key={idx} sx={{ display: 'flex', gap: 6, mb: 4, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {section.left.map((row: any) => renderRow(row))}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {section.right.map((row: any) => renderRow(row))}
            </Box>
        </Box>
    );

    const statusCounts = useMemo(() => {
        const counts: any = { ACTIVA: 0, REVISAR: 0, VELOCIDAD_REDUCIDA: 0, PARADA: 0, ELECTRONIC: 0, SIN_DATOS: 0 };
        if (metrics?.byStatus) {
            metrics.byStatus.forEach((s: any) => {
                counts[s.status] = parseInt(s.count);
            });
        }
        return counts;
    }, [metrics]);

    if (loadingMachines) return <Spinner />;

    return (
        <Box sx={{ p: 3, bgcolor: '#0f1117', minHeight: '100vh', color: '#fff' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                            Monitoreo en Tiempo Real
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, bgcolor: 'rgba(16, 185, 129, 0.1)', borderRadius: 1 }}>
                            <Box sx={{ width: 6, height: 6, bgcolor: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                            <Typography sx={{ color: '#10b981', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>En Vivo</Typography>
                        </Box>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>Planta Principal • Sector Tejeduría</Typography>
                </Box>

                <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: -0.5 }}>
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        {currentTime.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </Typography>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Main Content: Map */}
                <Grid xs={12} lg={9}>
                    <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)', mb: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Mapa de Máquinas - Tejeduría</Typography>
                                
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Box sx={{ display: 'flex', bgcolor: 'rgba(255,255,255,0.05)', p: 0.5, borderRadius: 1.5 }}>
                                        <Box sx={{ p: 1, bgcolor: '#3b82f6', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
                                            <LayoutGridIcon sx={{ fontSize: 16, color: 'white' }} />
                                            <Typography sx={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>Vista Planta</Typography>
                                        </Box>
                                        <Box sx={{ p: 1, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
                                            <ListIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                                            <Typography sx={{ color: '#9ca3af', fontSize: '12px', fontWeight: 600 }}>Vista Lista</Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', bgcolor: 'rgba(255,255,255,0.05)', p: 0.5, borderRadius: 1.5 }}>
                                        <Box sx={{ p: 1, cursor: 'pointer', display: 'flex' }}><MinusIcon sx={{ fontSize: 16, color: '#9ca3af' }} /></Box>
                                        <Box sx={{ p: 1, cursor: 'pointer', display: 'flex' }}><PlusIcon sx={{ fontSize: 16, color: '#9ca3af' }} /></Box>
                                    </Box>
                                </Box>
                            </Box>

                            {/* Legend */}
                            <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
                                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                                    <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 10, height: 10, bgcolor: STATUS_COLORS[status], borderRadius: '50%' }} />
                                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>{label}</Typography>
                                    </Box>
                                ))}
                            </Box>

                            {/* Map Content */}
                            <Box sx={{ overflowX: 'auto', pb: 2, className: 'custom-scrollbar' }}>
                                <Box sx={{ minWidth: '900px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    {layout.map((section, idx) => renderSection(section, idx))}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Lower Status Cards */}
                    <Grid container spacing={2}>
                        <Grid xs={12} sm={6} md={2.4}>
                            <StatCard title="Activas" value={statusCounts.ACTIVA} percentage={((statusCounts.ACTIVA / metrics?.total || 1) * 100).toFixed(1)} icon={CheckCircleIcon} color="#10b981" />
                        </Grid>
                        <Grid xs={12} sm={6} md={2.4}>
                            <StatCard title="A Revisar" value={statusCounts.REVISAR} percentage={((statusCounts.REVISAR / metrics?.total || 1) * 100).toFixed(1)} icon={HelpIcon} color="#eab308" />
                        </Grid>
                        <Grid xs={12} sm={6} md={2.4}>
                            <StatCard title="Vel. Reducida" value={statusCounts.VELOCIDAD_REDUCIDA} percentage={((statusCounts.VELOCIDAD_REDUCIDA / metrics?.total || 1) * 100).toFixed(1)} icon={ClockIcon} color="#f97316" />
                        </Grid>
                        <Grid xs={12} sm={6} md={2.4}>
                            <StatCard title="Paradas" value={statusCounts.PARADA} percentage={((statusCounts.PARADA / metrics?.total || 1) * 100).toFixed(1)} icon={PauseCircleIcon} color="#ef4444" />
                        </Grid>
                        <Grid xs={12} sm={6} md={2.4}>
                            <StatCard title="Electrónica" value={statusCounts.ELECTRONIC} percentage={((statusCounts.ELECTRONIC / metrics?.total || 1) * 100).toFixed(1)} icon={ZapIcon} color="#3b82f6" />
                        </Grid>
                    </Grid>
                </Grid>

                {/* Right Sidebar: Summaries & Activity */}
                <Grid xs={12} lg={3}>
                    {/* General Summary (Donut) */}
                    <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)', mb: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 3 }}>Resumen General</Typography>
                            
                            <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', mb: 4 }}>
                                <svg width="160" height="160" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                                    {/* Simple Donut Simulation - One arc for Activas */}
                                    <circle 
                                        cx="50" cy="50" r="40" 
                                        fill="none" 
                                        stroke="#10b981" 
                                        strokeWidth="10" 
                                        strokeDasharray={`${(statusCounts.ACTIVA / (metrics?.total || 1)) * 251.2} 251.2`}
                                        transform="rotate(-90 50 50)"
                                        strokeLinecap="round"
                                    />
                                    <text x="50" y="45" textAnchor="middle" fill="white" fontSize="14" fontWeight="800">{metrics?.total || 0}</text>
                                    <text x="50" y="60" textAnchor="middle" fill="#9ca3af" fontSize="8">Máquinas</text>
                                </svg>
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                                    <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box sx={{ width: 8, height: 8, bgcolor: STATUS_COLORS[status], borderRadius: 1 }} />
                                            <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>{label}</Typography>
                                        </Box>
                                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 700 }}>
                                            {statusCounts[status]} <span style={{ color: '#6b7280', marginLeft: '4px' }}>({((statusCounts[status] / (metrics?.total || 1)) * 100).toFixed(1)}%)</span>
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Active Alerts */}
                    <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)', mb: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Alertas Activas</Typography>
                                <Box sx={{ bgcolor: '#ef4444', color: 'white', px: 0.8, py: 0.2, borderRadius: 1, fontSize: '10px', fontWeight: 800 }}>3</Box>
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', gap: 1.5 }}>
                                    <Box sx={{ color: '#ef4444', pt: 0.5, display: 'flex' }}><ErrorIcon sx={{ fontSize: 16 }} /></Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, display: 'block' }}>5 máquinas paradas en Línea 2</Typography>
                                        <Typography variant="caption" sx={{ color: '#6b7280' }}>hace 12 min</Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1.5 }}>
                                    <Box sx={{ color: '#f97316', pt: 0.5, display: 'flex' }}><ClockIcon sx={{ fontSize: 16 }} /></Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, display: 'block' }}>Velocidad reducida en 3 máquinas</Typography>
                                        <Typography variant="caption" sx={{ color: '#6b7280' }}>hace 45 min</Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 3 }}>Actividad Reciente</Typography>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {recentLogs.slice(0, 5).map((log: any, idx: number) => (
                                    <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                                            <Box sx={{ width: 8, height: 8, bgcolor: STATUS_COLORS[log.toStatus], borderRadius: '50%', mt: 0.8 }} />
                                            <Box>
                                                <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, display: 'block' }}>
                                                    Máquina {log.machine?.number || log.machineId.slice(0,4)}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#9ca3af' }}>{STATUS_LABELS[log.toStatus]}</Typography>
                                            </Box>
                                        </Box>
                                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Bottom KPI Bar */}
            <Box sx={{ 
                mt: 4, pt: 3, borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap'
            }}>
                <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, display: 'block', mb: 0.5 }}>Disponibilidad</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>92.1%</Typography>
                    <Box sx={{ width: '120px', height: '4px', bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, mt: 1 }}>
                        <Box sx={{ width: '92%', height: '100%', bgcolor: '#10b981', borderRadius: 1 }} />
                    </Box>
                </Box>
                <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, display: 'block', mb: 0.5 }}>Eficiencia</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>87.3%</Typography>
                    <Box sx={{ width: '120px', height: '4px', bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, mt: 1 }}>
                        <Box sx={{ width: '87%', height: '100%', bgcolor: '#3b82f6', borderRadius: 1 }} />
                    </Box>
                </Box>
                <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, display: 'block', mb: 0.5 }}>Producción Actual</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>14,200 <span style={{ fontSize: '12px', color: '#6b7280' }}>pares/hora</span></Typography>
                </Box>
                <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, display: 'block', mb: 0.5 }}>Producción Plan</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>15,800 <span style={{ fontSize: '12px', color: '#6b7280' }}>pares/hora</span></Typography>
                </Box>
                <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, display: 'block', mb: 0.5 }}>Cumplimiento</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>89.9%</Typography>
                    <Box sx={{ width: '120px', height: '4px', bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, mt: 1 }}>
                        <Box sx={{ width: '90%', height: '100%', bgcolor: '#8b5cf6', borderRadius: 1 }} />
                    </Box>
                </Box>
            </Box>

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
