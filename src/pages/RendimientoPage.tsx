import React, { useState, useMemo } from 'react';
import { Box, Typography, Tabs, Tab, CircularProgress, Divider } from '@mui/material';
import { PageHeader, Card, Select, Badge, Spinner } from './common/ui';
import { 
    useGetPlantsQuery, 
    useGetMachineTypesQuery, 
    useGetMachinesQuery, 
    useGetMetricsQuery,
    useGetLogsQuery,
} from '../entities/performance/api/performanceApi';

import type { Machine } from '../entities/performance/api/performanceApi';

import { MachineGrid } from '../widgets/rendimiento/MachineGrid';
import { FailureFormModal } from '../features/rendimiento/FailureFormModal';
import { SolveConfirmationModal } from '../features/rendimiento/SolveConfirmationModal';
import { MachineDetailModal } from '../widgets/rendimiento/MachineDetailModal';
import { calculatePlantKPIs } from '../features/rendimiento/utils/kpiUtils';




export default function RendimientoPage() {
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showFailureModal, setShowFailureModal] = useState(false);
    const [showSolveModal, setShowSolveModal] = useState(false);

    // Global Date Range
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);



    // Queries
    const { data: plants = [], isLoading: loadingPlants } = useGetPlantsQuery();
    const { data: machineTypes = [], isLoading: loadingTypes } = useGetMachineTypesQuery();

    // Auto-select first plant
    React.useEffect(() => {
        if (plants.length > 0 && !selectedPlantId) {
            setSelectedPlantId(plants[0].id);
        }
    }, [plants, selectedPlantId]);

    const activeType = machineTypes[activeTab];

    const { data: machines = [], isLoading: loadingMachines } = useGetMachinesQuery(
        { plantId: selectedPlantId || '', typeId: activeType?.id || '' },
        { skip: !selectedPlantId || !activeType }
    );

    const { data: metrics, isLoading: loadingMetrics } = useGetMetricsQuery(
        { plantId: selectedPlantId || '' },
        { skip: !selectedPlantId }
    );

    const handleMachineClick = (machine: Machine) => {
        setSelectedMachine(machine);
        setShowDetailModal(true);
    };

    const handleOpenReport = (machine: Machine) => {
        setSelectedMachine(machine);
        setShowFailureModal(true);
    };

    const handleOpenSolve = (machine: Machine) => {
        setSelectedMachine(machine);
        setShowSolveModal(true);
    };


    const { data: plantLogs = [], isLoading: loadingPlantLogs, isFetching: fetchingPlantLogs, error: plantLogsError } = useGetLogsQuery(
        { 
            plantId: selectedPlantId || '', 
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString()
        },
        { skip: !selectedPlantId, refetchOnMountOrArgChange: true }
    );


    const plantKPIs = useMemo(() => {
        if (!selectedPlantId || !metrics) return null;
        const start = new Date(startDate);
        const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));

        
        // Return empty KPIs instead of null if we have finished loading but have no logs
        if (!plantLogs.length && !loadingPlantLogs && !fetchingPlantLogs) {
             return { availability: '100%', oee: '0%', mtbf: '0s', mttr: '0s' };
        }
        
        try {
            // Use the new plant-wide balanced calculation
            return calculatePlantKPIs(plantLogs, metrics.total, start, end); 
        } catch (e) {

            console.error("Error calculating plant KPIs:", e);
            return { availability: 'Error', oee: 'Error', mtbf: 'Error', mttr: 'Error' };
        }
    }, [plantLogs, selectedPlantId, loadingPlantLogs, fetchingPlantLogs, metrics]);



    const plantOptions = useMemo(() => 
        plants.map(p => ({ value: p.id, label: p.name })), 
    [plants]);


    if (loadingPlants || loadingTypes) return <Spinner />;

    return (
        <Box sx={{ p: 3, maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader 
                title="Rendimiento de Producción" 
                subtitle="Monitoreo y análisis de indicadores industriales"
            >
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Desde</Typography>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{ background: '#0f1117', border: '1px solid #374151', padding: '8px', color: 'white', borderRadius: '8px' }}
                        />
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Hasta</Typography>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{ background: '#0f1117', border: '1px solid #374151', padding: '8px', color: 'white', borderRadius: '8px' }}
                        />
                    </Box>
                    <Box sx={{ minWidth: '180px', pt: 2 }}>
                        <Select 
                            label="Planta"
                            value={selectedPlantId || ''}
                            onChange={setSelectedPlantId}
                            options={plantOptions}
                        />
                    </Box>
                </Box>
            </PageHeader>



            {/* Metrics Dashboard */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Estado Actual (Tiempo Real)
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 4 }}>
                    <StatusCard 
                        label="En Funcionamiento" 
                        value={metrics?.running || 0} 
                        icon="✅" 
                        color="linear-gradient(135deg, #10b981, #059669)" 
                        loading={loadingMetrics} 
                    />
                    <StatusCard 
                        label="Con Inconveniente" 
                        value={metrics?.failed || 0} 
                        icon="⚠️" 
                        color="linear-gradient(135deg, #ef4444, #dc2626)" 
                        loading={loadingMetrics} 
                    />
                    <StatusCard 
                        label="Total Máquinas" 
                        value={metrics?.total || 0} 
                        icon="🏭" 
                        color="linear-gradient(135deg, #6366f1, #4f46e5)" 
                        loading={loadingMetrics} 
                    />
                    <StatusCard 
                        label="Disponibilidad Actual" 
                        value={metrics?.total ? `${((metrics.running / metrics.total) * 100).toFixed(1)}%` : '0%'} 
                        icon="📈" 
                        color="linear-gradient(135deg, #f59e0b, #d97706)" 
                        loading={loadingMetrics} 
                    />

                </Box>

                <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Inteligencia de Planta (Últimos 30 días)
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2 }}>
                    <KPICard label="Disponibilidad Global" value={plantKPIs?.availability || '0.0%'} subtext="Tiempo productivo real" color="#10b981" loading={loadingPlantLogs || fetchingPlantLogs} error={!!plantLogsError} />
                    <KPICard label="OEE (Plant-wide)" value={plantKPIs?.oee || '0.0%'} subtext="Efectividad total" color="#8b5cf6" loading={loadingPlantLogs || fetchingPlantLogs} error={!!plantLogsError} />
                    <KPICard label="Confiabilidad (MTBF)" value={plantKPIs?.mtbf || '0s'} subtext="Tiempo promedio entre fallas" color="#60a5fa" loading={loadingPlantLogs || fetchingPlantLogs} error={!!plantLogsError} />
                    <KPICard label="Capacidad de Repuesta (MTTR)" value={plantKPIs?.mttr || '0s'} subtext="Tiempo promedio de reparación" color="#f87171" loading={loadingPlantLogs || fetchingPlantLogs} error={!!plantLogsError} />
                </Box>


            </Box>


            <Card style={{ padding: 0 }}>

                <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'rgba(255,255,255,0.02)' }}>
                    <Tabs 
                        value={activeTab} 
                        onChange={(_, v) => setActiveTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            '& .MuiTabs-indicator': { backgroundColor: '#6366f1' },
                            '& .MuiTab-root': { color: '#6b7280', fontSize: '13px', fontWeight: 600 },
                            '& .Mui-selected': { color: '#6366f1 !important' },
                        }}
                    >
                        {machineTypes.map((type) => (
                            <Tab key={type.id} label={type.name} />
                        ))}
                    </Tabs>
                </Box>

                <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Mostrando {machines.length} máquinas de {activeType?.name || '...'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Badge color="#10b981">Funcionando</Badge>
                            <Badge color="#ef4444">Falla</Badge>
                        </Box>
                    </Box>
                    <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.05)' }} />
                    
                    <MachineGrid 
                        machines={machines} 
                        isLoading={loadingMachines} 
                        onMachineClick={handleMachineClick} 
                    />
                </Box>
            </Card>

            {/* Modals */}
            <MachineDetailModal
                open={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                machine={selectedMachine}
                onReportFailure={handleOpenReport}
                onSolve={handleOpenSolve}
                globalStartDate={startDate}
                globalEndDate={endDate}
            />


            <FailureFormModal 
                open={showFailureModal} 
                onClose={() => setShowFailureModal(false)}
                machine={selectedMachine}
            />

            <SolveConfirmationModal
                open={showSolveModal}
                onClose={() => setShowSolveModal(false)}
                machine={selectedMachine}
            />
        </Box>
    );
}

const StatusCard = ({ label, value, icon, color, loading }: any) => (
    <Card style={{ 
        padding: '24px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        background: '#1a1d2e',
        position: 'relative',
        overflow: 'hidden'
    }}>
        <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '4px', 
            height: '100%', 
            background: color 
        }} />
        <Typography variant="h3" sx={{ mb: 1 }}>{icon}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700, mb: 1 }}>{label}</Typography>
        <Typography variant="h3" sx={{ fontWeight: 900, color: '#fff' }}>
            {loading ? <CircularProgress size={24} /> : value}
        </Typography>
    </Card>
);

const KPICard = ({ label, value, subtext, color, loading, error }: any) => (
    <Card style={{ 
        padding: '24px', 
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        transition: 'all 0.3s ease',
        position: 'relative'
    }}>
        <Typography variant="caption" sx={{ color: color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', mb: 2 }}>
            {label}
        </Typography>
        <Typography variant="h2" sx={{ fontWeight: 800, color: error ? '#ef4444' : '#fff', mb: 1 }}>
            {loading ? <CircularProgress size={24} /> : error ? 'Error' : value}
        </Typography>
        <Typography variant="caption" color="text.secondary">{subtext}</Typography>
        {loading && <Box sx={{ position: 'absolute', top: 10, right: 10 }}><CircularProgress size={12} /></Box>}
    </Card>
);


