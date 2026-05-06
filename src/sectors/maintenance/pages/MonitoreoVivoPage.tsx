import { useState, useMemo, useEffect, Fragment } from 'react';
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

const STATUS_COLORS: Record<string, string> = {
    ACTIVA: '#10b981', // Emerald
    REVISAR: '#f59e0b', // Amber
    VELOCIDAD_REDUCIDA: '#f97316', // Orange
    PARADA: '#ef4444', // Red
    ELECTRONIC: '#06b6d4', // Cyan
    FALTA_COSTURA: '#8b5cf6', // Violet
    FALTA_PROGRAMA: '#0d9488', // Teal
    REPUESTOS: '#ec4899', // Pink
    SIN_DATOS: '#475569' // Slate
};

const STATUS_LABELS: Record<string, string> = {
    ACTIVA: 'Activa',
    REVISAR: 'A Revisar',
    VELOCIDAD_REDUCIDA: 'Velocidad Reducida',
    PARADA: 'Parada',
    ELECTRONIC: 'Electrónica',
    FALTA_COSTURA: 'Falta Costura',
    FALTA_PROGRAMA: 'Falta Programa',
    REPUESTOS: 'Repuestos',
    SIN_DATOS: 'Sin Datos'
};

const MachineNode = ({ number, status, onClick }: { number: number | null, status: string, onClick?: () => void }) => {
    if (number === null) return <Box sx={{ width: { xs: 20, sm: 28, md: 36, lg: 48, xl: 64 }, height: { xs: 20, sm: 28, md: 36, lg: 48, xl: 64 } }} />;

    const statusColor = STATUS_COLORS[status] || STATUS_COLORS.SIN_DATOS;

    return (
        <Tooltip title={`Máquina ${number} - ${STATUS_LABELS[status] || status}`} arrow>
            <Box onClick={onClick} sx={{ 
                width: { xs: 20, sm: 28, md: 36, lg: 48, xl: 64 },
                height: { xs: 20, sm: 28, md: 36, lg: 48, xl: 64 },
                bgcolor: 'transparent',
                border: `2px solid ${statusColor}`,
                borderRadius: { xs: 0.8, md: 2 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: statusColor,
                fontSize: { xs: '9px', sm: '12px', md: '14px', lg: '18px', xl: '22px' },
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: 1,
                transform: 'scale(1)',
                boxShadow: `0 0 10px ${statusColor}40`,
                zIndex: 1,
                textShadow: `0 0 4px ${statusColor}30`,
                '&:hover': {
                    transform: 'scale(1.2) translateY(-4px)',
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



const HalfDonut = ({ title, data, total }: any) => (
    <Box sx={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
        <Box sx={{ width: '100%', height: 280, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="100%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius="88%"
                        outerRadius="100%"
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            {/* Horizontal Floor Line */}
            <Box sx={{ 
                position: 'absolute', bottom: 0, left: '-10%', right: '-10%', 
                height: '4px', bgcolor: 'rgba(255,255,255,0.15)', borderRadius: '10px' 
            }} />
            <Box sx={{ 
                position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', 
                textAlign: 'center', width: '100%'
            }}>
                <Typography variant="h1" sx={{ color: '#fff', fontWeight: 1000, fontSize: '160px', lineHeight: 0.8, letterSpacing: '-10px' }}>
                    {total}
                </Typography>
            </Box>
        </Box>
        <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase', fontSize: '24px', letterSpacing: '6px', mt: 1.5 }}>
            {title}
        </Typography>
    </Box>
);

const MiniStat = ({ label, value, color }: any) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
        <Typography sx={{ color: color, fontWeight: 1000, fontSize: '72px', lineHeight: 1, letterSpacing: '-4px' }}>
            {value}
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '2px' }}>
            {label}
        </Typography>
    </Box>
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
        const counts: any = { ACTIVA: 0, REVISAR: 0, VELOCIDAD_REDUCIDA: 0, PARADA: 0, ELECTRONIC: 0, FALTA_COSTURA: 0, FALTA_PROGRAMA: 0, REPUESTOS: 0, SIN_DATOS: 0 };
        if (metrics?.byStatus) {
            metrics.byStatus.forEach((s: any) => {
                counts[s.status] = parseInt(s.count);
            });
        }
        return counts;
    }, [metrics]);

    const activeChartData = useMemo(() => [
        { name: 'Activa', value: statusCounts.ACTIVA, color: STATUS_COLORS.ACTIVA },
        { name: 'A Revisar', value: statusCounts.REVISAR, color: STATUS_COLORS.REVISAR },
        { name: 'Vel. Reducida', value: statusCounts.VELOCIDAD_REDUCIDA, color: STATUS_COLORS.VELOCIDAD_REDUCIDA }
    ], [statusCounts]);

    const stoppedChartData = useMemo(() => [
        { name: 'Parada', value: statusCounts.PARADA, color: STATUS_COLORS.PARADA },
        { name: 'Electrónica', value: statusCounts.ELECTRONIC, color: STATUS_COLORS.ELECTRONIC },
        { name: 'Costura', value: statusCounts.FALTA_COSTURA, color: STATUS_COLORS.FALTA_COSTURA },
        { name: 'Programa', value: statusCounts.FALTA_PROGRAMA, color: STATUS_COLORS.FALTA_PROGRAMA },
        { name: 'Repuestos', value: statusCounts.REPUESTOS, color: STATUS_COLORS.REPUESTOS },
        { name: 'Sin Datos', value: statusCounts.SIN_DATOS, color: STATUS_COLORS.SIN_DATOS }
    ], [statusCounts]);

    const aggregatedActivas = statusCounts.ACTIVA + statusCounts.REVISAR + statusCounts.VELOCIDAD_REDUCIDA;
    const aggregatedParadas = statusCounts.PARADA + statusCounts.ELECTRONIC + statusCounts.FALTA_COSTURA + statusCounts.FALTA_PROGRAMA + statusCounts.REPUESTOS + statusCounts.SIN_DATOS;


    if (!selectedPlantId || !tejeduriaTypeId || loadingMachines) return <Spinner />;

    return (
        <Box sx={{ 
            p: 2, bgcolor: '#0f1117', height: '100vh', width: '100vw', 
            color: '#fff', display: 'flex', flexDirection: 'column', gap: 0, 
            overflow: 'hidden' 
        }}>
            {/* 1. Header: Branding and Info (Fixed Height) */}
            <Box sx={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.05)' 
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box sx={{ 
                        width: 50, height: 50, borderRadius: '50%', bgcolor: '#000080', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid #fff', boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                    }}>
                        <Typography sx={{ color: '#ff0000', fontSize: '30px', fontWeight: 950, fontStyle: 'italic', fontFamily: 'serif' }}>W</Typography>
                    </Box>
                    <Typography variant="h1" sx={{ fontWeight: 1000, color: '#fff', letterSpacing: '-3px', textTransform: 'uppercase', fontStyle: 'italic', lineHeight: 1, fontSize: '48px' }}>
                        DERWILL
                    </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                    <Typography sx={{ color: '#94a3b8', fontWeight: 900, letterSpacing: '4px', fontSize: '18px', textTransform: 'uppercase' }}>
                        VIVO — {currentTime.toLocaleTimeString()}
                    </Typography>
                </Box>
            </Box>

            {/* 2. Middle Section: Map (Flexible) */}
            <Box sx={{ 
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                overflow: 'hidden', p: 1
            }}>
                <Box sx={{ 
                    transform: 'scale(0.85)', // Slight scale to ensure zero scrolls on most screens
                    transformOrigin: 'center center',
                    display: 'grid', 
                    gridTemplateColumns: 'max-content max-content',
                    columnGap: { xs: 4, sm: 6, md: 8, xl: 12 },
                }}>
                    {layout.map((section, idx) => renderSection(section, idx))}
                </Box>
            </Box>

            {/* 3. Footer: Metrics (Fixed Height) */}
            <Box sx={{ 
                height: 380, display: 'flex', gap: 4, alignItems: 'center', 
                px: 4, pt: 1, pb: 2, borderTop: '1px solid rgba(255,255,255,0.05)',
                bgcolor: 'rgba(255,255,255,0.01)'
            }}>
                {/* 1/3 - Active Charts */}
                <Box sx={{ flex: 1 }}>
                    <HalfDonut title="Máquinas Activas" data={activeChartData} total={aggregatedActivas} />
                </Box>

                {/* 1/3 - Stopped Charts */}
                <Box sx={{ flex: 1 }}>
                    <HalfDonut title="Máquinas Paradas" data={stoppedChartData} total={aggregatedParadas} />
                </Box>

                {/* 1/3 - Detailed Metrics Grid */}
                <Box sx={{ 
                    flex: 1,
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: 3, 
                    px: 6, 
                    borderLeft: '2px solid rgba(255,255,255,0.1)'
                }}>
                    <MiniStat label="Parada" value={statusCounts.PARADA} color={STATUS_COLORS.PARADA} />
                    <MiniStat label="Electrón." value={statusCounts.ELECTRONIC} color={STATUS_COLORS.ELECTRONIC} />
                    <MiniStat label="Costura" value={statusCounts.FALTA_COSTURA} color={STATUS_COLORS.FALTA_COSTURA} />
                    <MiniStat label="Programa" value={statusCounts.FALTA_PROGRAMA} color={STATUS_COLORS.FALTA_PROGRAMA} />
                    <MiniStat label="Repuesto" value={statusCounts.REPUESTOS} color={STATUS_COLORS.REPUESTOS} />
                    <MiniStat label="Total Paradas" value={aggregatedParadas} color="#fff" />
                </Box>
            </Box>

            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(1.2); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </Box>
    );
}
