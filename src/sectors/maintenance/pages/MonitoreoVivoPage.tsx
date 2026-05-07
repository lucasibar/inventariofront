import { useState, useMemo, useEffect, Fragment, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Tooltip } from '@mui/material';
import {
    useGetPlantsQuery,
    useGetMachinesQuery,
    useGetMetricsQuery,
    useGetMachineTypesQuery
} from '../api/maintenance.api';
import { Spinner } from '../../../shared/ui';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton } from '@mui/material';

const STATUS_COLORS: Record<string, string> = {
    ACTIVA: '#4ade80',         // Verde
    REVISAR: '#fbbf24',        // Amarillo
    VELOCIDAD_REDUCIDA: '#92400e', // Marrón
    PARADA: '#f87171',         // Rojo
    ELECTRONIC: '#22d3ee',     // Azul Cyan
    FALTA_COSTURA: '#a855f7',  // Violeta
    FALTA_PROGRAMA: '#ffffff', // Blanco
    REPUESTOS: '#f472b6',      // Rosa
    OTRO: '#94a3b8',           // Gris
    SIN_DATOS: '#94a3b8'       // Gris
};

const STATUS_LABELS: Record<string, string> = {
    ACTIVA: 'Activa',
    REVISAR: 'En Revisión',
    VELOCIDAD_REDUCIDA: 'Velocidad Reducida',
    PARADA: 'Parada',
    ELECTRONIC: 'Electrónica',
    FALTA_COSTURA: 'Falta Costura',
    FALTA_PROGRAMA: 'Falta Programa',
    REPUESTOS: 'Repuestos',
    OTRO: 'Otro',
    SIN_DATOS: 'Sin Datos'
};

const MachineNode = ({ number, status, onClick }: {
    number: number | null,
    status: string,
    onClick?: () => void
}) => {
    if (number === null) return <Box sx={{ width: 42, height: 42 }} />;

    const statusColor = STATUS_COLORS[status] || STATUS_COLORS.SIN_DATOS;
    const isSpecialStatus = status !== 'ACTIVA' && status !== 'SIN_DATOS';

    return (
        <Tooltip title={`Máquina ${number} - ${STATUS_LABELS[status] || status}`} arrow>
            <Box
                onClick={onClick}
                sx={{
                    width: 42,
                    height: 42,
                    border: `2px solid ${statusColor}${isSpecialStatus ? '' : '40'}`,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: statusColor,
                    bgcolor: 'transparent',
                    fontSize: '18px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSpecialStatus ? `0 0 10px ${statusColor}40` : 'none',
                    zIndex: 1,
                    '&:hover': {
                        transform: 'scale(1.2)',
                        bgcolor: `${statusColor}15`,
                        zIndex: 20,
                        boxShadow: `0 0 20px ${statusColor}80`,
                        borderColor: '#fff'
                    }
                }}
            >
                {number}
            </Box>
        </Tooltip>
    );
};

const StatusBar = ({ label, value, color, max }: { label: string, value: number, color: string, max: number }) => {
    const width = `${Math.max(2, (value / (max || 1)) * 100)}%`;
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '11px', fontWeight: 900, width: 160, textTransform: 'uppercase', lineHeight: 1 }}>{label}</Typography>
            <Typography sx={{ color: color, fontSize: '12px', fontWeight: 1000, width: 35, textAlign: 'right' }}>{value}</Typography>
            <Box sx={{ flex: 1, height: 4, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 4, overflow: 'hidden' }}>
                <Box sx={{ width: width, height: '100%', bgcolor: color, borderRadius: 4 }} />
            </Box>
        </Box>
    );
};

const FusedModule = ({ title, count, total, color, breakdown, subtitle }: any) => {
    const chartData = [
        { value: total - count, color: 'rgba(255,255,255,0.05)' },
        { value: count, color: color }
    ];

    return (
        <Box sx={{ flex: 1, display: 'flex', height: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Box sx={{ flex: '0 0 42%', bgcolor: '#151921', p: { xs: 1, md: 1.5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                        <Typography sx={{ color: color, fontWeight: 1000, fontSize: { xs: '30px', sm: '40px', md: '65px' }, lineHeight: 0.85 }}>{count}</Typography>
                        <Typography sx={{ color: color, fontWeight: 1000, fontSize: { xs: '9px', md: '12px' }, mt: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Typography>
                    </Box>
                    <Box sx={{ width: { xs: 45, sm: 60, md: 85 }, height: { xs: 45, sm: 60, md: 85 }, flexShrink: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={chartData} innerRadius="78%" outerRadius="100%" startAngle={90} endAngle={450} dataKey="value" stroke="none">
                                    {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                </Box>
            </Box>
            <Box sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.01)', p: { xs: 1, md: 1.5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography sx={{ color: '#475569', fontWeight: 1000, textTransform: 'uppercase', fontSize: '11px', mb: 0.5, letterSpacing: 2 }}>{subtitle}</Typography>
                {breakdown.map((item: any, i: number) => (
                    <StatusBar key={i} label={item.label} value={item.value} color={item.color || color} max={count} />
                ))}
            </Box>
        </Box>
    );
};


export default function MonitoreoVivoPage() {
    const navigate = useNavigate();

    const { data: plants = [] } = useGetPlantsQuery();
    const { data: machineTypes = [] } = useGetMachineTypesQuery();
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


    const layout = useMemo(() => [
        {
            left: [[190, 189, 188, 187, 186, 185, 184, 183, 182, 181, 180, 179], [170, 169, 168, 167, 160, 159, 158, 157, 151, 150, 149, 148]],
            right: [[null, 178, 177, 176, 175, 174, 173, 172, 171], [142, 141, 140, 139, 138, 132, 131, 130, 129, 128]]
        },
        {
            left: [[166, 165, 164, 163, 162, 161, 156, 155, 154, 153, 152, 147, 146, 145, 144, 143], [73, 74, 75, 76, 77, 83, 84, 85, 86, 87, 93, 94, 95, 96, 97]],
            right: [[137, 136, 135, 134, 133, 127, 126, 125, 124, 123], [103, 104, 105, 106, 107, 113, 114, 115, 116, 117]]
        },
        {
            left: [[78, 79, 80, 81, 82, 88, 89, 90, 91, 92, 98, 99, 100, 101, 102], [23, 24, 25, 26, 27, 33, 34, 35, 36, 37, 43, 44, 45, 46, 47]],
            right: [[108, 109, 110, 111, 112, 118, 119, 120, 122, 121], [53, 54, 55, 56, 57, 63, 64, 65, 66, 67]]
        },
        {
            left: [[28, 29, 30, 31, 32, 38, 39, 40, 41, 42, 48, 49, 50, 51, 52], [null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]],
            right: [[58, 59, 60, 61, 62, 68, 69, 70, 71, 72], [13, 14, 15, 16, 17, 18, 19, 20, 21, 22]]
        }
    ], []);

    const machineMap = useMemo(() => {
        const map: Record<number, any> = {};
        machines.forEach((m: any) => map[m.number] = m);
        return map;
    }, [machines]);

    const statusCounts = useMemo(() => {
        const counts: any = { ACTIVA: 0, REVISAR: 0, VELOCIDAD_REDUCIDA: 0, PARADA: 0, ELECTRONIC: 0, FALTA_COSTURA: 0, FALTA_PROGRAMA: 0, REPUESTOS: 0, OTRO: 0, SIN_DATOS: 0 };
        if (metrics?.byStatus) {
            metrics.byStatus.forEach((s: any) => { counts[s.status] = parseInt(s.count); });
        }
        return counts;
    }, [metrics]);

    const totalMachines = metrics?.total || 190;
    const totalActivas = statusCounts.ACTIVA + statusCounts.REVISAR + statusCounts.VELOCIDAD_REDUCIDA + statusCounts.FALTA_COSTURA;

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapContentRef = useRef<HTMLDivElement>(null);
    const [mapScale, setMapScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            if (!mapContainerRef.current || !mapContentRef.current) return;

            const containerWidth = mapContainerRef.current.clientWidth - 48;
            const containerHeight = mapContainerRef.current.clientHeight - 48;

            const contentWidth = mapContentRef.current.scrollWidth;
            const contentHeight = mapContentRef.current.scrollHeight;

            if (contentWidth > 0 && contentHeight > 0) {
                const scaleW = containerWidth / contentWidth;
                const scaleH = containerHeight / contentHeight;

                // Detection: landscape (TV/PC) vs portrait (Tablet/Mobile)
                const isPortrait = containerHeight > containerWidth;

                if (isPortrait) {
                    // Portrait: Fit height, allow horizontal scroll
                    setMapScale(scaleH * 0.98);
                } else {
                    // Landscape: Fit both (no scroll)
                    setMapScale(Math.min(scaleW, scaleH) * 0.98);
                }
            }
        };

        const resizeObserver = new ResizeObserver(updateScale);
        if (mapContainerRef.current) resizeObserver.observe(mapContainerRef.current);
        if (mapContentRef.current) resizeObserver.observe(mapContentRef.current);

        updateScale();
        const timer = setTimeout(updateScale, 300);

        return () => {
            resizeObserver.disconnect();
            clearTimeout(timer);
        };
    }, [machines]);

    const handleMachineClick = (machine: any) => {
        navigate('/mantenimiento/registro', {
            state: {
                preselectedMachine: machine,
                plantId: selectedPlantId
            }
        });
    };

    const activasBreakdown = [
        { label: 'Activa', value: statusCounts.ACTIVA, color: STATUS_COLORS.ACTIVA },
        { label: 'En Revisión', value: statusCounts.REVISAR, color: STATUS_COLORS.REVISAR },
        { label: 'Vel. Reducida', value: statusCounts.VELOCIDAD_REDUCIDA, color: STATUS_COLORS.VELOCIDAD_REDUCIDA },
        { label: 'Costura', value: statusCounts.FALTA_COSTURA, color: STATUS_COLORS.FALTA_COSTURA },
    ];

    const paradasBreakdown = [
        { label: 'Parada', value: statusCounts.PARADA, color: STATUS_COLORS.PARADA },
        { label: 'Electrónica', value: statusCounts.ELECTRONIC, color: STATUS_COLORS.ELECTRONIC },
        { label: 'Repuesto', value: statusCounts.REPUESTOS, color: STATUS_COLORS.REPUESTOS },
        { label: 'Programa', value: statusCounts.FALTA_PROGRAMA, color: STATUS_COLORS.FALTA_PROGRAMA },
        { label: 'Otro', value: statusCounts.OTRO, color: STATUS_COLORS.OTRO },
    ];

    if (loadingMachines) return <Spinner />;

    return (
        <Box sx={{
            bgcolor: '#0b0e14', height: '100vh', width: '100vw', maxHeight: '100vh',
            color: '#fff', display: 'flex', flexDirection: 'column', p: 3, gap: 2.5, overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Discreet Menu Toggle */}
            <IconButton
                onClick={() => document.dispatchEvent(new Event('open-sidebar-menu'))}
                sx={{
                    position: 'absolute', top: 8, left: 8, color: 'rgba(255,255,255,0.2)',
                    zIndex: 1000, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }
                }}
            >
                <MoreVertIcon fontSize="small" />
            </IconButton>

            {/* Fused KPI Row - Proportional Height */}
            <Box sx={{ display: 'flex', gap: 2.5, flexShrink: 0, height: '15vh', minHeight: 140 }}>
                <FusedModule
                    title="Máquinas Activas"
                    count={totalActivas}
                    total={totalMachines}
                    color={STATUS_COLORS.ACTIVA}
                    breakdown={activasBreakdown}
                    subtitle="Composición Activas"
                />
                <FusedModule
                    title="Máquinas Paradas"
                    count={totalMachines - totalActivas}
                    total={totalMachines}
                    color={STATUS_COLORS.PARADA}
                    breakdown={paradasBreakdown}
                    subtitle="Composición Paradas"
                />
            </Box>

            {/* Bottom Operations Area */}
            <Box sx={{ flex: 1, display: 'flex', gap: 2.5, minHeight: 0 }}>
                {/* Map Area */}
                <Box
                    ref={mapContainerRef}
                    sx={{
                        flex: 1,
                        bgcolor: '#151921',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        justifyContent: mapContainerRef.current && mapContainerRef.current.clientHeight > mapContainerRef.current.clientWidth ? 'flex-start' : 'center',
                        alignItems: 'center',
                        minWidth: 0,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        position: 'relative',
                        '&::-webkit-scrollbar': { height: '6px' },
                        '&::-webkit-scrollbar-track': { background: 'transparent' },
                        '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: '4px' },
                        '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(255,255,255,0.2)' }
                    }}
                >
                    <Box
                        ref={mapContentRef}
                        sx={{
                            transform: `scale(${mapScale})`,
                            transformOrigin: mapContainerRef.current && mapContainerRef.current.clientHeight > mapContainerRef.current.clientWidth ? 'left center' : 'center center',
                            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'inline-flex',
                            flexDirection: 'column',
                            width: 'fit-content',
                            height: 'fit-content',
                            pr: mapContainerRef.current && mapContainerRef.current.clientHeight > mapContainerRef.current.clientWidth ? 20 : 0
                        }}
                    >
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 12 }}>
                            {layout.map((section, idx) => (
                                <Fragment key={idx}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 4, alignItems: 'flex-end' }}>
                                        {section.left.map((row, i) => (
                                            <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                                                {row.map((n, j) => {
                                                    const machine = n !== null ? machineMap[n] : null;
                                                    return (
                                                        <MachineNode
                                                            key={`${idx}-left-${i}-${n ?? `e-${j}`}`}
                                                            number={n}
                                                            status={machine?.status || 'SIN_DATOS'}
                                                            onClick={() => machine && handleMachineClick(machine)}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        ))}
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 4, alignItems: 'flex-start' }}>
                                        {section.right.map((row, i) => (
                                            <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                                                {row.map((n, j) => {
                                                    const machine = n !== null ? machineMap[n] : null;
                                                    return (
                                                        <MachineNode
                                                            key={`${idx}-right-${i}-${n ?? `e-${j}`}`}
                                                            number={n}
                                                            status={machine?.status || 'SIN_DATOS'}
                                                            onClick={() => machine && handleMachineClick(machine)}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        ))}
                                    </Box>
                                </Fragment>
                            ))}
                        </Box>
                    </Box>
                </Box>

            </Box>

            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </Box>
    );
}
