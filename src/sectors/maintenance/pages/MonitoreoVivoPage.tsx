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
    REVISAR: '#3b82f6', // Blue
    VELOCIDAD_REDUCIDA: '#f59e0b', // Amber/Orange
    PARADA: '#ef4444', // Red
    ELECTRONIC: '#ef4444', // Red
    FALTA_COSTURA: '#8b5cf6', // Violet
    FALTA_PROGRAMA: '#ec4899', // Pink
    REPUESTOS: '#f97316', // Orange
    OTRO: '#64748b', // Slate
    SIN_DATOS: '#1e293b' // Darker Slate
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

const MachineNode = ({ number, status, isSelected, onClick, onDoubleClick }: { 
    number: number | null, 
    status: string, 
    isSelected?: boolean, 
    onClick?: () => void,
    onDoubleClick?: () => void
}) => {
    if (number === null) return <Box sx={{ width: { xs: 18, sm: 26, md: 32, lg: 42, xl: 52 }, height: { xs: 18, sm: 26, md: 32, lg: 42, xl: 52 } }} />;

    const statusColor = STATUS_COLORS[status] || STATUS_COLORS.SIN_DATOS;
    const isSpecialStatus = status !== 'ACTIVA' && status !== 'SIN_DATOS';

    return (
        <Tooltip title={`Máquina ${number} - ${STATUS_LABELS[status] || status}`} arrow>
            <Box 
                onClick={onClick} 
                onDoubleClick={onDoubleClick}
                sx={{ 
                    width: { xs: 18, sm: 26, md: 32, lg: 42, xl: 52 },
                    height: { xs: 18, sm: 26, md: 32, lg: 42, xl: 52 },
                    border: `2px solid ${isSelected ? '#fff' : `${statusColor}${isSpecialStatus ? '' : '40'}`}`,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isSpecialStatus || isSelected ? '#fff' : statusColor,
                    bgcolor: isSelected ? statusColor : (isSpecialStatus ? `${statusColor}30` : 'transparent'),
                    fontSize: { xs: '8px', sm: '10px', md: '12px', lg: '16px', xl: '22px' },
                    fontWeight: 900,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? `0 0 20px ${statusColor}` : (isSpecialStatus ? `0 0 10px ${statusColor}60` : 'none'),
                    zIndex: isSelected ? 10 : 1,
                    '&:hover': {
                        transform: 'scale(1.2)',
                        bgcolor: `${statusColor}40`,
                        zIndex: 20,
                        boxShadow: `0 0 20px ${statusColor}`,
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.2 }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '14px', fontWeight: 900, width: 170, textTransform: 'uppercase', lineHeight: 1 }}>{label}</Typography>
            <Typography sx={{ color: color, fontSize: '15px', fontWeight: 1000, width: 35, textAlign: 'right' }}>{value}</Typography>
            <Box sx={{ flex: 1, height: 8, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 4, overflow: 'hidden' }}>
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
        <Box sx={{ flex: 1, display: 'flex', minHeight: 260, borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Box sx={{ flex: '0 0 42%', bgcolor: '#151921', p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                        <Typography sx={{ color: color, fontWeight: 1000, fontSize: { xs: '65px', xl: '95px' }, lineHeight: 0.85 }}>{count}</Typography>
                        <Typography sx={{ color: color, fontWeight: 1000, fontSize: '14px', mt: 1, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Typography>
                    </Box>
                    <Box sx={{ width: 120, height: 120, flexShrink: 0 }}>
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
            <Box sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.01)', p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography sx={{ color: '#475569', fontWeight: 1000, textTransform: 'uppercase', fontSize: '14px', mb: 2, letterSpacing: 2 }}>{subtitle}</Typography>
                {breakdown.map((item: any, i: number) => (
                    <StatusBar key={i} label={item.label} value={item.value} color={item.color || color} max={count} />
                ))}
            </Box>
        </Box>
    );
};

const SelectedMachineDetail = ({ machine }: any) => {
    if (!machine) return (
        <Box sx={{ width: 420, bgcolor: '#151921', borderRadius: '12px', p: 3, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: '#475569', fontSize: '14px', fontStyle: 'italic', textAlign: 'center', fontWeight: 900 }}>Toca una máquina para ver detalle</Typography>
        </Box>
    );

    return (
        <Box sx={{ width: 420, bgcolor: '#151921', borderRadius: '12px', p: 3, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 3, alignItems: 'center' }}>
            <Box>
                <Typography sx={{ color: STATUS_COLORS[machine.status], fontWeight: 1000, fontSize: '80px', lineHeight: 1 }}>{machine.number}</Typography>
                <Typography sx={{ color: '#fff', fontWeight: 1000, fontSize: '15px', mt: 0.5, textTransform: 'uppercase' }}>{STATUS_LABELS[machine.status]}</Typography>
            </Box>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                 <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', pb: 0.8 }}>
                    <Typography sx={{ color: '#475569', fontSize: '14px', fontWeight: 1000 }}>LÍNEA</Typography>
                    <Typography sx={{ color: '#fff', fontSize: '15px', fontWeight: 1000 }}>LÍNEA 6</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', pb: 0.8 }}>
                    <Typography sx={{ color: '#475569', fontSize: '14px', fontWeight: 1000 }}>SECTOR</Typography>
                    <Typography sx={{ color: '#fff', fontSize: '15px', fontWeight: 1000 }}>CORTE</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#475569', fontSize: '14px', fontWeight: 1000 }}>MECÁNICO</Typography>
                    <Typography sx={{ color: '#fff', fontSize: '15px', fontWeight: 1000 }}>{machine.lastChangeBy || 'Sin Asignar'}</Typography>
                </Box>
            </Box>
        </Box>
    );
};

const CompactStoppedList = ({ machines }: { machines: any[] }) => {
    const stopped = machines.filter(m => m.status !== 'ACTIVA').sort((a, b) => a.number - b.number);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 0 }}>
            <Typography sx={{ color: '#475569', fontWeight: 1000, textTransform: 'uppercase', fontSize: '14px', letterSpacing: 2, mb: 1, px: 2, pt: 2 }}>Mantenimiento en Curso</Typography>
            <Box sx={{ 
                overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 3, rowGap: 1.2, px: 2, pb: 2,
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: '4px' },
                '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(255,255,255,0.2)' }
            }}>
                {stopped.map(m => (
                    <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid rgba(255,255,255,0.03)', pb: 0.6 }}>
                        <Typography sx={{ color: STATUS_COLORS[m.status], fontWeight: 1000, fontSize: '24px', width: 45, lineHeight: 1 }}>{m.number}</Typography>
                        <Typography sx={{ color: '#fff', fontSize: '15px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.lastChangeBy || 'Sin Asignar'}</Typography>
                    </Box>
                ))}
                {stopped.length === 0 && (
                    <Typography sx={{ color: '#475569', fontSize: '14px', fontStyle: 'italic', py: 2, gridColumn: 'span 2', fontWeight: 800 }}>No hay máquinas paradas</Typography>
                )}
            </Box>
        </Box>
    );
};

export default function MonitoreoVivoPage() {
    const navigate = useNavigate();
    const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);

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

    useEffect(() => {
        if (machines.length > 0 && !selectedMachineId) {
            const m21 = machines.find((m: any) => m.number === 21);
            if (m21) {
                setSelectedMachineId(m21.id);
            }
        }
    }, [machines, selectedMachineId]);

    const layout = useMemo(() => [
  {
    left: [[190, 189, 188, 187, 186, 185, 184, 183, 182, 181, 180, 179], [170, 169, 168, 167, 160, 159, 158, 151, 150, 149, 148]],
    right: [[null, 178, 177, 176, 175, 174, 173, 172, 171], [142, 141, 140, 139, 138, 132, 131, 130, 129, 128]]
  },
  {
    left: [[166, 165, 164, 163, 162, 161, 160, 159, 158, 157, 156, 155, 154, 153, 152, 151], [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88]],
    right: [[137, 136, 135, 134, 133, 132, 131, 130, 129, 128], [103, 104, 105, 106, 107, 108, 109, 110, 111, 112]]
  },
  {
    left: [[78, 79, 80, 81, 82, 88, 89, 90, 91, 92, 98, 99, 100, 101, 102], [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34]],
    right: [[null, 108, 109, 110, 111, 112, 118, 119, 120, 122, 121], [53, 54, 55, 56, 57, 58, 59, 60, 61, 62]]
  },
  {
    left: [[28, 29, 30, 31, 32, 38, 39, 40, 41, 42, 48, 49, 50, 51, 52], [null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12]],
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
    const totalActivas = statusCounts.ACTIVA + statusCounts.REVISAR + statusCounts.VELOCIDAD_REDUCIDA;

    const selectedMachine = useMemo(() => machines.find((m: any) => m.id === selectedMachineId), [machines, selectedMachineId]);

    const handleMachineDoubleClick = (machine: any) => {
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
    ];

    const paradasBreakdown = [
        { label: 'Electrónica', value: statusCounts.ELECTRONIC, color: STATUS_COLORS.ELECTRONIC },
        { label: 'Repuesto', value: statusCounts.REPUESTOS, color: STATUS_COLORS.REPUESTOS },
        { label: 'Costura', value: statusCounts.FALTA_COSTURA, color: STATUS_COLORS.FALTA_COSTURA },
        { label: 'Programa', value: statusCounts.FALTA_PROGRAMA, color: STATUS_COLORS.FALTA_PROGRAMA },
        { label: 'Otro', value: statusCounts.OTRO, color: STATUS_COLORS.OTRO },
    ];

    if (loadingMachines) return <Spinner />;

    return (
        <Box sx={{ 
            bgcolor: '#0b0e14', height: '100vh', width: '100vw', maxHeight: '100vh',
            color: '#fff', display: 'flex', flexDirection: 'column', p: 3, gap: 2.5, overflow: 'hidden'
        }}>
            {/* Fused KPI Row */}
            <Box sx={{ display: 'flex', gap: 2.5, flexShrink: 0 }}>
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
                <SelectedMachineDetail machine={selectedMachine} />
            </Box>

            {/* Bottom Operations Area */}
            <Box sx={{ flex: 1, display: 'flex', gap: 2.5, minHeight: 0 }}>
                {/* Map Area */}
                <Box sx={{ flex: 1, bgcolor: '#151921', borderRadius: '12px', p: 2, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                    <Box sx={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        transform: { xs: 'scale(0.5)', sm: 'scale(0.65)', md: 'scale(0.85)', lg: 'scale(1)', xl: 'scale(1.2)' },
                        transformOrigin: 'top center',
                        width: '100%',
                        minHeight: 0
                    }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: { xs: 4, md: 8, xl: 12 } }}>
                            {layout.map((section, idx) => (
                                <Fragment key={idx}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 4, alignItems: 'flex-end' }}>
                                        {section.left.map((row, i) => (
                                            <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                                                {row.map((n, j) => {
                                                    const machine = n !== null ? machineMap[n] : null;
                                                    return (
                                                        <MachineNode 
                                                            key={n ?? `e-${j}`} 
                                                            number={n} 
                                                            status={machine?.status || 'SIN_DATOS'} 
                                                            isSelected={machine?.id === selectedMachineId}
                                                            onClick={() => machine && setSelectedMachineId(machine.id)} 
                                                            onDoubleClick={() => machine && handleMachineDoubleClick(machine)}
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
                                                            key={n ?? `e-${j}`} 
                                                            number={n} 
                                                            status={machine?.status || 'SIN_DATOS'} 
                                                            isSelected={machine?.id === selectedMachineId}
                                                            onClick={() => machine && setSelectedMachineId(machine.id)} 
                                                            onDoubleClick={() => machine && handleMachineDoubleClick(machine)}
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

                {/* Operations Sidebar */}
                <Box sx={{ width: 450, bgcolor: '#151921', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', p: 2, gap: 2, overflow: 'hidden' }}>
                    <CompactStoppedList machines={machines} />

                    <Box sx={{ mt: 'auto', p: 2, pt: 3, borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                        <Typography sx={{ color: '#475569', fontWeight: 900, textTransform: 'uppercase', fontSize: '11px', mb: 2, letterSpacing: 1.5 }}>Resumen de Estados</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                            {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                <Box key={key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_COLORS[key] }} />
                                        <Typography sx={{ color: '#64748b', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>{label}</Typography>
                                    </Box>
                                    <Typography sx={{ color: STATUS_COLORS[key], fontWeight: 900, fontSize: '13px' }}>{statusCounts[key] || 0}</Typography>
                                </Box>
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
