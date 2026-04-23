import React, { useState, useMemo } from 'react';
import { Box, Typography, Tabs, Tab, Divider } from '@mui/material';
import { PageHeader, Card, Select, Badge, Spinner } from './common/ui';
import { 
    useGetPlantsQuery, 
    useGetMachineTypesQuery, 
    useGetMachinesQuery, 
} from '../entities/performance/api/performanceApi';

import type { Machine } from '../entities/performance/api/performanceApi';

import { MachineGrid } from '../widgets/rendimiento/MachineGrid';
import { FailureFormModal } from '../features/rendimiento/FailureFormModal';
import { SolveConfirmationModal } from '../features/rendimiento/SolveConfirmationModal';
import { MachineDetailModal } from '../widgets/rendimiento/MachineDetailModal';



export default function RendimientoPage() {
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showFailureModal, setShowFailureModal] = useState(false);
    const [showSolveModal, setShowSolveModal] = useState(false);


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


    const plantOptions = useMemo(() => 
        plants.map(p => ({ value: p.id, label: p.name })), 
    [plants]);


    if (loadingPlants || loadingTypes) return <Spinner />;

    return (
        <Box sx={{ p: 3, maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader 
                title="Rendimiento de Producción" 
                subtitle="Monitoreo y reporte de estado de maquinaria en tiempo real"
            >
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ minWidth: '200px' }}>
                        <Select 
                            label="Planta Seleccionada"
                            value={selectedPlantId || ''}
                            onChange={setSelectedPlantId}
                            options={plantOptions}
                        />
                    </Box>
                </Box>
            </PageHeader>



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
                // Default to last 30 days for machine-specific history in the modal
                globalStartDate={new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]}
                globalEndDate={new Date().toISOString().split('T')[0]}
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
