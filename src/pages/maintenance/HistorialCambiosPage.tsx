import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Card as MuiCard, CardContent, Chip, TextField,
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Tooltip, Grid, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Checkbox, FormControlLabel, FormGroup,
    Autocomplete
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddIcon from '@mui/icons-material/Add';
import TimerIcon from '@mui/icons-material/Timer';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import EventNoteIcon from '@mui/icons-material/EventNote';

import { PageHeader, Spinner, Select } from '../../shared/ui';
import {
    useGetPlantsQuery,
    useGetMachinesQuery,
    useGetMachineChangesQuery,
    useLazyGetMachineChangesQuery,
    useUpdateMachineChangeMutation,
    useDeleteMachineChangeMutation,
} from '../../entities/maintenance/api/maintenance.api';
import type { MachineChange } from '../../entities/maintenance/api/maintenance.api';
import {
    CHANGE_TYPES,
    CHANGE_TYPE_COLORS,
    RESPONSABLES
} from '../../features/maintenance/constants/maintenanceConstants';

interface EditChangeState {
    id: string;
    plantId: string;
    machineId: string;
    machineNumber: number | string;
    changeTypes: string[];
    startDate: string;
    startHour: string;
    startMinute: string;
    endDate: string;
    endHour: string;
    endMinute: string;
    observation: string;
    generatedBy: string;
}

export default function HistorialCambiosPage() {
    const navigate = useNavigate();

    // Default dates: last 30 days
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const thirtyDaysAgoStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    }, []);

    // Filter fields (Applied state triggers the API query)
    const [appliedFilters, setAppliedFilters] = useState({
        plantId: '',
        machineNumber: '',
        startDate: thirtyDaysAgoStr,
        endDate: todayStr,
        changeType: '',
        generatedBy: '',
        search: '',
    });

    // Local inputs for fast editing before clicking "Buscar"
    const [localPlantId, setLocalPlantId] = useState('');
    const [localMachineNumber, setLocalMachineNumber] = useState('');
    const [localStartDate, setLocalStartDate] = useState(thirtyDaysAgoStr);
    const [localEndDate, setLocalEndDate] = useState(todayStr);
    const [localChangeType, setLocalChangeType] = useState('');
    const [localGeneratedBy, setLocalGeneratedBy] = useState('');
    const [localSearch, setLocalSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(50);

    // Queries
    const { data: plants = [], isLoading: loadingPlants } = useGetPlantsQuery();
    const { data: changes = [], isLoading: loadingChanges, isFetching, refetch } = useGetMachineChangesQuery({
        plantId: appliedFilters.plantId || undefined,
        machineNumber: appliedFilters.machineNumber || undefined,
        startDate: appliedFilters.startDate || undefined,
        endDate: appliedFilters.endDate || undefined,
        changeType: appliedFilters.changeType || undefined,
        generatedBy: appliedFilters.generatedBy || undefined,
        search: appliedFilters.search || undefined,
    });
    const [triggerGetChanges, { isFetching: isExporting }] = useLazyGetMachineChangesQuery();

    // Deletion modal state
    const [deleteItem, setDeleteItem] = useState<MachineChange | null>(null);
    const [deleteMachineChange, { isLoading: isDeleting }] = useDeleteMachineChangeMutation();

    // Edit modal state
    const [editData, setEditData] = useState<EditChangeState | null>(null);
    const [updateMachineChange, { isLoading: isUpdating }] = useUpdateMachineChangeMutation();

    // For editing machine selection
    const { data: editPlantMachines = [], isLoading: loadingEditMachines } = useGetMachinesQuery(
        { plantId: editData?.plantId || '' },
        { skip: !editData?.plantId }
    );

    const plantOptions = useMemo(() => [
        { value: '', label: 'Todas las Plantas' },
        ...plants.map((p: any) => ({ value: p.id, label: p.name }))
    ], [plants]);

    const changeTypeOptions = useMemo(() => [
        { value: '', label: 'Todos los Tipos de Cambio' },
        ...CHANGE_TYPES.map(ct => ({ value: ct.value, label: ct.label }))
    ], []);

    const responsableOptions = useMemo(() => [
        { value: '', label: 'Todos los Responsables' },
        ...RESPONSABLES.filter(r => r !== 'Sin Asignar').map(r => ({ value: r, label: r })),
    ], []);

    // Filter Apply / Reset
    const handleApplyFilters = () => {
        setAppliedFilters({
            plantId: localPlantId,
            machineNumber: localMachineNumber.trim(),
            startDate: localStartDate,
            endDate: localEndDate,
            changeType: localChangeType,
            generatedBy: localGeneratedBy,
            search: localSearch.trim(),
        });
        setVisibleCount(50);
    };

    const handleResetFilters = () => {
        setLocalPlantId('');
        setLocalMachineNumber('');
        setLocalStartDate(thirtyDaysAgoStr);
        setLocalEndDate(todayStr);
        setLocalChangeType('');
        setLocalGeneratedBy('');
        setLocalSearch('');
        setAppliedFilters({
            plantId: '',
            machineNumber: '',
            startDate: thirtyDaysAgoStr,
            endDate: todayStr,
            changeType: '',
            generatedBy: '',
            search: '',
        });
        setVisibleCount(50);
    };

    // Quick Date Range Presets
    const setPreset = (preset: 'today' | '7d' | '30d' | 'thisMonth' | 'all') => {
        const now = new Date();
        const end = now.toISOString().split('T')[0];
        let start = end;

        if (preset === 'today') {
            start = end;
        } else if (preset === '7d') {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            start = d.toISOString().split('T')[0];
        } else if (preset === '30d') {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            start = d.toISOString().split('T')[0];
        } else if (preset === 'thisMonth') {
            const d = new Date(now.getFullYear(), now.getMonth(), 1);
            start = d.toISOString().split('T')[0];
        } else if (preset === 'all') {
            start = '2024-01-01';
        }

        setLocalStartDate(start);
        setLocalEndDate(end);
        setAppliedFilters(prev => ({ ...prev, startDate: start, endDate: end }));
        setVisibleCount(50);
    };

    // Metrics calculations
    const metrics = useMemo(() => {
        const totalChanges = changes.length;
        let totalMs = 0;
        const uniqueMachines = new Set<string>();

        changes.forEach((c: any) => {
            const ms = c.durationMs || (new Date(c.endTime).getTime() - new Date(c.startTime).getTime()) || 0;
            totalMs += ms;
            if (c.machineId) uniqueMachines.add(c.machineId);
        });

        const avgMs = totalChanges > 0 ? Math.round(totalMs / totalChanges) : 0;

        const formatDuration = (ms: number) => {
            if (ms <= 0) return '0m';
            const totalMins = Math.floor(ms / 60000);
            const hours = Math.floor(totalMins / 60);
            const mins = totalMins % 60;
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;

            if (days > 0) return `${days}d ${remainingHours}h ${mins}m`;
            if (hours > 0) return `${hours}h ${mins}m`;
            return `${mins}m`;
        };

        return {
            totalChanges,
            totalTimeFormatted: formatDuration(totalMs),
            avgTimeFormatted: formatDuration(avgMs),
            uniqueMachinesCount: uniqueMachines.size,
        };
    }, [changes]);

    // Handle Edit Open
    const handleOpenEdit = (change: MachineChange) => {
        const startDt = new Date(change.startTime);
        const endDt = new Date(change.endTime);

        const sYear = startDt.getFullYear();
        const sMonth = String(startDt.getMonth() + 1).padStart(2, '0');
        const sDay = String(startDt.getDate()).padStart(2, '0');
        const sHours = String(startDt.getHours()).padStart(2, '0');
        const sMins = String(startDt.getMinutes()).padStart(2, '0');

        const eYear = endDt.getFullYear();
        const eMonth = String(endDt.getMonth() + 1).padStart(2, '0');
        const eDay = String(endDt.getDate()).padStart(2, '0');
        const eHours = String(endDt.getHours()).padStart(2, '0');
        const eMins = String(endDt.getMinutes()).padStart(2, '0');

        const plantId = (change as any).machine?.plantId || (change as any).machine?.plant?.id || plants[0]?.id || '';

        setEditData({
            id: change.id,
            plantId,
            machineId: change.machineId,
            machineNumber: change.machine?.number || '',
            changeTypes: [...(change.changeTypes || [])],
            startDate: `${sYear}-${sMonth}-${sDay}`,
            startHour: sHours,
            startMinute: sMins,
            endDate: `${eYear}-${eMonth}-${eDay}`,
            endHour: eHours,
            endMinute: eMins,
            observation: change.observation || '',
            generatedBy: change.generatedBy || '',
        });
    };

    const toggleEditChangeType = (value: string) => {
        if (!editData) return;
        setEditData(prev => {
            if (!prev) return null;
            const exists = prev.changeTypes.includes(value);
            return {
                ...prev,
                changeTypes: exists
                    ? prev.changeTypes.filter(t => t !== value)
                    : [...prev.changeTypes, value]
            };
        });
    };

    const handleSaveEdit = async () => {
        if (!editData) return;
        if (editData.changeTypes.length === 0) {
            return alert('Seleccioná al menos un tipo de cambio.');
        }

        const sH = parseInt(editData.startHour, 10);
        const sM = parseInt(editData.startMinute, 10);
        const eH = parseInt(editData.endHour, 10);
        const eM = parseInt(editData.endMinute, 10);

        if (isNaN(sH) || sH < 0 || sH > 23 || isNaN(sM) || sM < 0 || sM > 59) {
            return alert('Hora de inicio no válida (00-23 para hora, 00-59 para minutos).');
        }
        if (isNaN(eH) || eH < 0 || eH > 23 || isNaN(eM) || eM < 0 || eM > 59) {
            return alert('Hora de fin no válida (00-23 para hora, 00-59 para minutos).');
        }

        const startStr = `${editData.startDate}T${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}:00`;
        const endStr = `${editData.endDate}T${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}:00`;

        const startDt = new Date(startStr);
        const endDt = new Date(endStr);

        if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
            return alert('Las fechas ingresadas no son válidas.');
        }

        if (endDt <= startDt) {
            return alert('La hora de fin debe ser posterior a la hora de inicio.');
        }

        try {
            await updateMachineChange({
                id: editData.id,
                machineId: editData.machineId,
                changeTypes: editData.changeTypes,
                startTime: startDt.toISOString(),
                endTime: endDt.toISOString(),
                observation: editData.observation || undefined,
                generatedBy: editData.generatedBy || undefined,
            }).unwrap();

            setEditData(null);
        } catch (error) {
            console.error('Error updating machine change:', error);
            alert('Error al actualizar el cambio.');
        }
    };

    // Handle Delete / Dar de baja
    const handleConfirmDelete = async () => {
        if (!deleteItem) return;
        try {
            await deleteMachineChange(deleteItem.id).unwrap();
            setDeleteItem(null);
        } catch (error) {
            console.error('Error deleting machine change:', error);
            alert('Error al dar de baja el cambio.');
        }
    };

    // Excel Export
    const escapeXml = (unsafe: string) => {
        if (!unsafe) return '';
        return unsafe.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
                default: return c;
            }
        });
    };

    const handleExportExcel = async () => {
        try {
            const dataToExport = await triggerGetChanges({
                plantId: appliedFilters.plantId || undefined,
                machineNumber: appliedFilters.machineNumber || undefined,
                startDate: appliedFilters.startDate || undefined,
                endDate: appliedFilters.endDate || undefined,
                changeType: appliedFilters.changeType || undefined,
                generatedBy: appliedFilters.generatedBy || undefined,
                search: appliedFilters.search || undefined,
            }).unwrap();

            if (!dataToExport || dataToExport.length === 0) {
                return alert('No hay cambios para exportar con los filtros seleccionados.');
            }

            let xml = `<?xml version="1.0" encoding="utf-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:navigator"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Sistema de Inventario y Mantenimiento</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#333333"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#ffffff" ss:Bold="1"/>
   <Interior ss:Color="#1f2937" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="RowStyle">
   <Alignment ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Historial de Cambios">
  <Table ss:DefaultColumnWidth="120">
   <Column ss:Width="80"/>  <!-- Máquina -->
   <Column ss:Width="110"/> <!-- Planta -->
   <Column ss:Width="130"/> <!-- Inicio -->
   <Column ss:Width="130"/> <!-- Arranque (Fin) -->
   <Column ss:Width="90"/>  <!-- Duración -->
   <Column ss:Width="160"/> <!-- Tipos de Cambio (Combo) -->
   <Column ss:Width="120"/> <!-- Responsable -->
   <Column ss:Width="250"/> <!-- Observaciones -->
   <Row ss:AutoFitHeight="0" ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Máquina</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Planta</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Fecha Inicio</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Fecha Arranque</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Duración</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Tipos de Cambio</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Responsable</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Observaciones</Data></Cell>
   </Row>`;

            dataToExport.forEach((item: any) => {
                const machineNum = item.machine?.number || '-';
                const plantName = item.machine?.plant?.name || plants.find((p: any) => p.id === item.machine?.plantId)?.name || '-';
                const startStr = new Date(item.startTime).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
                const endStr = new Date(item.endTime).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
                const duration = item.durationFormatted || '-';
                const comboLabels = (item.changeTypes || []).map((ct: string) => CHANGE_TYPES.find(c => c.value === ct)?.label || ct).join(', ');
                const generatedBy = item.generatedBy || '-';
                const observation = item.observation || '';

                xml += `
   <Row ss:AutoFitHeight="1" ss:StyleID="RowStyle">
    <Cell><Data ss:Type="String">${escapeXml(String(machineNum))}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(plantName)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(startStr)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(endStr)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(duration)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(comboLabels)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(generatedBy)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(observation)}</Data></Cell>
   </Row>`;
            });

            xml += `
  </Table>
 </Worksheet>
</Workbook>`;

            const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `historial_cambios_${new Date().toISOString().split('T')[0]}.xls`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Error al generar la exportación a Excel.');
        }
    };

    const formatDateTime = (iso: string) => {
        if (!iso) return '-';
        const d = new Date(iso);
        return d.toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <PageHeader
                title="Historial de Cambios de Artículo"
                subtitle="Consulta, auditoría, modificación y baja de cambios de artículo (combos de cambio) en máquinas."
            >
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => refetch()}
                    disabled={isFetching}
                    sx={{ color: 'var(--text-white-dynamic, #fff)', borderColor: 'var(--border-dynamic, #374151)' }}
                >
                    Recargar
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<FileDownloadIcon />}
                    onClick={handleExportExcel}
                    disabled={isExporting || changes.length === 0}
                    sx={{ color: '#10b981', borderColor: '#10b98166', '&:hover': { borderColor: '#10b981', bgcolor: '#10b98115' } }}
                >
                    {isExporting ? 'Exportando...' : 'Exportar Excel'}
                </Button>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/mantenimiento/cambios')}
                    sx={{ bgcolor: '#1f6feb', '&:hover': { bgcolor: '#1a5cc7' } }}
                >
                    Nuevo Cambio
                </Button>
            </PageHeader>

            {/* Filter Section */}
            <MuiCard sx={{ bgcolor: 'var(--bg-secondary, #111827)', borderRadius: 2, border: '1px solid var(--border-dynamic, #1f2937)', mb: 3 }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <SearchIcon sx={{ color: '#60a5fa', fontSize: 20 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-white-dynamic, white)' }}>
                            Filtros de Búsqueda
                        </Typography>
                    </Box>

                    <Grid container spacing={2}>
                        {/* Plant */}
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Select
                                label="Planta"
                                value={localPlantId}
                                onChange={(val) => setLocalPlantId(val)}
                                options={plantOptions}
                            />
                        </Grid>

                        {/* Machine number */}
                        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                            <TextField
                                label="N° Máquina"
                                value={localMachineNumber}
                                onChange={(e) => setLocalMachineNumber(e.target.value)}
                                placeholder="Ej: 104"
                                variant="outlined"
                                size="small"
                                fullWidth
                                inputProps={{ inputMode: 'numeric' }}
                            />
                        </Grid>

                        {/* Change Type */}
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Select
                                label="Tipo de Cambio (Combo)"
                                value={localChangeType}
                                onChange={(val) => setLocalChangeType(val)}
                                options={changeTypeOptions}
                            />
                        </Grid>

                        {/* Responsable */}
                        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                            <Select
                                label="Responsable"
                                value={localGeneratedBy}
                                onChange={(val) => setLocalGeneratedBy(val)}
                                options={responsableOptions}
                            />
                        </Grid>

                        {/* Quick Text Search */}
                        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                            <TextField
                                label="Buscar texto / obs."
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                placeholder="Buscar..."
                                variant="outlined"
                                size="small"
                                fullWidth
                            />
                        </Grid>

                        {/* Date Range & Presets */}
                        <Grid size={{ xs: 12, md: 7 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <TextField
                                    label="Desde"
                                    type="date"
                                    value={localStartDate}
                                    onChange={(e) => setLocalStartDate(e.target.value)}
                                    size="small"
                                    sx={{ minWidth: '140px' }}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                />
                                <TextField
                                    label="Hasta"
                                    type="date"
                                    value={localEndDate}
                                    onChange={(e) => setLocalEndDate(e.target.value)}
                                    size="small"
                                    sx={{ minWidth: '140px' }}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                />
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    <Chip label="Hoy" size="small" onClick={() => setPreset('today')} clickable sx={{ fontSize: '0.75rem' }} />
                                    <Chip label="7 días" size="small" onClick={() => setPreset('7d')} clickable sx={{ fontSize: '0.75rem' }} />
                                    <Chip label="30 días" size="small" onClick={() => setPreset('30d')} clickable sx={{ fontSize: '0.75rem' }} />
                                    <Chip label="Este Mes" size="small" onClick={() => setPreset('thisMonth')} clickable sx={{ fontSize: '0.75rem' }} />
                                    <Chip label="Todo" size="small" onClick={() => setPreset('all')} clickable sx={{ fontSize: '0.75rem' }} />
                                </Box>
                            </Box>
                        </Grid>

                        {/* Action Buttons */}
                        <Grid size={{ xs: 12, md: 5 }}>
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' }, height: '100%', alignItems: 'center' }}>
                                <Button
                                    variant="outlined"
                                    onClick={handleResetFilters}
                                    sx={{ color: 'var(--text-white-dynamic, white)', borderColor: 'var(--border-dynamic, #374151)' }}
                                >
                                    Limpiar
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<SearchIcon />}
                                    onClick={handleApplyFilters}
                                    sx={{ bgcolor: '#1f6feb', '&:hover': { bgcolor: '#1a5cc7' } }}
                                >
                                    Buscar
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </MuiCard>

            {/* KPI Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <MuiCard sx={{ bgcolor: '#1a2332', border: '1px solid #2d3748', borderRadius: 2 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#60a5fa', mb: 0.5 }}>
                                <SwapHorizIcon fontSize="small" />
                                <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                                    Total Cambios
                                </Typography>
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-white-dynamic, white)' }}>
                                {metrics.totalChanges}
                            </Typography>
                        </CardContent>
                    </MuiCard>
                </Grid>

                <Grid size={{ xs: 6, sm: 3 }}>
                    <MuiCard sx={{ bgcolor: '#1a2332', border: '1px solid #2d3748', borderRadius: 2 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#f59e0b', mb: 0.5 }}>
                                <TimerIcon fontSize="small" />
                                <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                                    Tiempo Total Parada
                                </Typography>
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: '#f59e0b' }}>
                                {metrics.totalTimeFormatted}
                            </Typography>
                        </CardContent>
                    </MuiCard>
                </Grid>

                <Grid size={{ xs: 6, sm: 3 }}>
                    <MuiCard sx={{ bgcolor: '#1a2332', border: '1px solid #2d3748', borderRadius: 2 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#a855f7', mb: 0.5 }}>
                                <EventNoteIcon fontSize="small" />
                                <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                                    Duración Promedio
                                </Typography>
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: '#a855f7' }}>
                                {metrics.avgTimeFormatted}
                            </Typography>
                        </CardContent>
                    </MuiCard>
                </Grid>

                <Grid size={{ xs: 6, sm: 3 }}>
                    <MuiCard sx={{ bgcolor: '#1a2332', border: '1px solid #2d3748', borderRadius: 2 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#10b981', mb: 0.5 }}>
                                <PrecisionManufacturingIcon fontSize="small" />
                                <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                                    Máq. Intervenidas
                                </Typography>
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: '#10b981' }}>
                                {metrics.uniqueMachinesCount}
                            </Typography>
                        </CardContent>
                    </MuiCard>
                </Grid>
            </Grid>

            {/* Changes Table */}
            <MuiCard sx={{ bgcolor: 'var(--bg-secondary, #111827)', borderRadius: 2, border: '1px solid var(--border-dynamic, #1f2937)' }}>
                <CardContent sx={{ p: 0 }}>
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-dynamic, #1f2937)' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--text-white-dynamic, white)' }}>
                            Registros de Cambios ({changes.length})
                        </Typography>
                        {isFetching && <Spinner />}
                    </Box>

                    {loadingChanges ? (
                        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                            <Spinner />
                        </Box>
                    ) : changes.length === 0 ? (
                        <Box sx={{ p: 5, textAlign: 'center' }}>
                            <SwapHorizIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.2)', mb: 1 }} />
                            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                                No se encontraron cambios registrados con los filtros aplicados
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>
                                Probá cambiando las fechas o limpiando los filtros para ver más resultados.
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#0d1520' }}>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, borderBottom: '1px solid var(--border-dynamic, #1f2937)', py: 1.5 }}>
                                            Máquina
                                        </TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, borderBottom: '1px solid var(--border-dynamic, #1f2937)', py: 1.5 }}>
                                            Planta
                                        </TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, borderBottom: '1px solid var(--border-dynamic, #1f2937)', py: 1.5 }}>
                                            Inicio
                                        </TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, borderBottom: '1px solid var(--border-dynamic, #1f2937)', py: 1.5 }}>
                                            Arranque
                                        </TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, borderBottom: '1px solid var(--border-dynamic, #1f2937)', py: 1.5 }}>
                                            Duración
                                        </TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, borderBottom: '1px solid var(--border-dynamic, #1f2937)', py: 1.5 }}>
                                            Tipos de Cambio (Combo)
                                        </TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, borderBottom: '1px solid var(--border-dynamic, #1f2937)', py: 1.5 }}>
                                            Responsable
                                        </TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, borderBottom: '1px solid var(--border-dynamic, #1f2937)', py: 1.5 }}>
                                            Observaciones
                                        </TableCell>
                                        <TableCell align="center" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, borderBottom: '1px solid var(--border-dynamic, #1f2937)', width: 100, py: 1.5 }}>
                                            Acciones
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {changes.slice(0, visibleCount).map((change: any) => {
                                        const machineNumber = change.machine?.number || '—';
                                        const plantName = change.machine?.plant?.name || plants.find((p: any) => p.id === change.machine?.plantId)?.name || '—';

                                        return (
                                            <TableRow
                                                key={change.id}
                                                hover
                                                sx={{
                                                    '&:hover': { bgcolor: '#1a2332' },
                                                    borderBottom: '1px solid #1a2332'
                                                }}
                                            >
                                                {/* Machine */}
                                                <TableCell sx={{ color: 'var(--text-white-dynamic, white)', fontWeight: 700, borderBottom: '1px solid #1a2332' }}>
                                                    Máq. {machineNumber}
                                                </TableCell>

                                                {/* Plant */}
                                                <TableCell sx={{ color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid #1a2332', fontSize: '0.85rem' }}>
                                                    {plantName}
                                                </TableCell>

                                                {/* Start Time */}
                                                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderBottom: '1px solid #1a2332', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                                    {formatDateTime(change.startTime)}
                                                </TableCell>

                                                {/* End Time */}
                                                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderBottom: '1px solid #1a2332', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                                    {formatDateTime(change.endTime)}
                                                </TableCell>

                                                {/* Duration */}
                                                <TableCell sx={{ color: '#60a5fa', fontWeight: 700, borderBottom: '1px solid #1a2332', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                                    {change.durationFormatted || '—'}
                                                </TableCell>

                                                {/* Change Types (Chips) */}
                                                <TableCell sx={{ borderBottom: '1px solid #1a2332' }}>
                                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                        {(change.changeTypes || []).map((ct: string) => {
                                                            const color = CHANGE_TYPE_COLORS[ct] || '#60a5fa';
                                                            const label = CHANGE_TYPES.find(c => c.value === ct)?.label || ct;
                                                            return (
                                                                <Chip
                                                                    key={ct}
                                                                    label={label}
                                                                    size="small"
                                                                    sx={{
                                                                        bgcolor: color + '25',
                                                                        color: color,
                                                                        border: `1px solid ${color}44`,
                                                                        fontWeight: 700,
                                                                        fontSize: '0.7rem',
                                                                        height: 22,
                                                                    }}
                                                                />
                                                            );
                                                        })}
                                                    </Box>
                                                </TableCell>

                                                {/* Responsible */}
                                                <TableCell sx={{ color: 'rgba(255,255,255,0.75)', borderBottom: '1px solid #1a2332', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                                    {change.generatedBy || '—'}
                                                </TableCell>

                                                {/* Observations */}
                                                <TableCell sx={{ color: 'rgba(255,255,255,0.55)', borderBottom: '1px solid #1a2332', fontSize: '0.85rem', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    <Tooltip title={change.observation || ''} arrow>
                                                        <span>{change.observation || '—'}</span>
                                                    </Tooltip>
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell align="center" sx={{ borderBottom: '1px solid #1a2332' }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                                        <Tooltip title="Editar Cambio" arrow>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleOpenEdit(change)}
                                                                sx={{ color: '#60a5fa', '&:hover': { bgcolor: '#60a5fa22' } }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Dar de baja / Eliminar" arrow>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setDeleteItem(change)}
                                                                sx={{ color: '#ef4444', '&:hover': { bgcolor: '#ef444422' } }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {/* Pagination / Load more */}
                    {changes.length > visibleCount && (
                        <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid var(--border-dynamic, #1f2937)' }}>
                            <Button
                                variant="outlined"
                                onClick={() => setVisibleCount(prev => prev + 50)}
                                sx={{ color: '#60a5fa', borderColor: '#60a5fa44' }}
                            >
                                Cargar más ({visibleCount} de {changes.length})
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </MuiCard>

            {/* Edit Modal */}
            <Dialog
                open={!!editData}
                onClose={() => setEditData(null)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { bgcolor: '#111827', color: 'white', borderRadius: 2, border: '1px solid #1f2937' }
                }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #1f2937', pb: 1.5 }}>
                    <EditIcon sx={{ color: '#60a5fa' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Editar Registro de Cambio</Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {editData && (
                        <>
                            {/* Plant & Machine Selection */}
                            <Grid container spacing={2} sx={{ mt: 0.5 }}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Select
                                        label="Planta"
                                        value={editData.plantId}
                                        onChange={(val) => {
                                            setEditData(prev => prev ? { ...prev, plantId: val, machineId: '' } : null);
                                        }}
                                        options={plants.map((p: any) => ({ value: p.id, label: p.name }))}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Autocomplete
                                        options={editPlantMachines}
                                        getOptionLabel={(opt: any) => `Máquina ${opt.number}`}
                                        value={editPlantMachines.find((m: any) => m.id === editData.machineId) || null}
                                        onChange={(_, val: any) => {
                                            if (val) {
                                                setEditData(prev => prev ? { ...prev, machineId: val.id, machineNumber: val.number } : null);
                                            }
                                        }}
                                        loading={loadingEditMachines}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Máquina" variant="outlined" size="small" />
                                        )}
                                        isOptionEqualToValue={(opt: any, val: any) => opt.id === val.id}
                                    />
                                </Grid>
                            </Grid>

                            {/* Change Types (Chips/Checkboxes) */}
                            <Box>
                                <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                                    Tipos de Cambio (Combo) *
                                </Typography>
                                <FormGroup row sx={{ gap: 0.5 }}>
                                    {CHANGE_TYPES.map((ct) => {
                                        const isSelected = editData.changeTypes.includes(ct.value);
                                        const color = CHANGE_TYPE_COLORS[ct.value] || '#60a5fa';
                                        return (
                                            <FormControlLabel
                                                key={ct.value}
                                                control={
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={() => toggleEditChangeType(ct.value)}
                                                        sx={{ color, '&.Mui-checked': { color } }}
                                                        size="small"
                                                    />
                                                }
                                                label={
                                                    <Chip
                                                        label={ct.label}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: isSelected ? color + '33' : 'transparent',
                                                            color: color,
                                                            border: `1px solid ${color}44`,
                                                            cursor: 'pointer',
                                                        }}
                                                    />
                                                }
                                                sx={{ mr: 0.5 }}
                                            />
                                        );
                                    })}
                                </FormGroup>
                            </Box>

                            {/* Start Date & Time */}
                            <Box>
                                <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                                    Fecha y Hora de Inicio
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                        type="date"
                                        value={editData.startDate}
                                        onChange={e => setEditData(prev => prev ? { ...prev, startDate: e.target.value } : null)}
                                        size="small"
                                        sx={{ flex: 2 }}
                                    />
                                    <TextField
                                        label="Hora"
                                        value={editData.startHour}
                                        onChange={e => setEditData(prev => prev ? { ...prev, startHour: e.target.value } : null)}
                                        size="small"
                                        sx={{ flex: 1 }}
                                        inputProps={{ maxLength: 2, inputMode: 'numeric' }}
                                    />
                                    <TextField
                                        label="Min"
                                        value={editData.startMinute}
                                        onChange={e => setEditData(prev => prev ? { ...prev, startMinute: e.target.value } : null)}
                                        size="small"
                                        sx={{ flex: 1 }}
                                        inputProps={{ maxLength: 2, inputMode: 'numeric' }}
                                    />
                                </Box>
                            </Box>

                            {/* End Date & Time */}
                            <Box>
                                <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                                    Fecha y Hora de Arranque (Fin)
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                        type="date"
                                        value={editData.endDate}
                                        onChange={e => setEditData(prev => prev ? { ...prev, endDate: e.target.value } : null)}
                                        size="small"
                                        sx={{ flex: 2 }}
                                    />
                                    <TextField
                                        label="Hora"
                                        value={editData.endHour}
                                        onChange={e => setEditData(prev => prev ? { ...prev, endHour: e.target.value } : null)}
                                        size="small"
                                        sx={{ flex: 1 }}
                                        inputProps={{ maxLength: 2, inputMode: 'numeric' }}
                                    />
                                    <TextField
                                        label="Min"
                                        value={editData.endMinute}
                                        onChange={e => setEditData(prev => prev ? { ...prev, endMinute: e.target.value } : null)}
                                        size="small"
                                        sx={{ flex: 1 }}
                                        inputProps={{ maxLength: 2, inputMode: 'numeric' }}
                                    />
                                </Box>
                            </Box>

                            {/* Responsable */}
                            <Autocomplete
                                freeSolo
                                options={RESPONSABLES.filter(r => r !== 'Sin Asignar')}
                                value={editData.generatedBy}
                                onChange={(_, val) => setEditData(prev => prev ? { ...prev, generatedBy: val || '' } : null)}
                                onInputChange={(_, val) => setEditData(prev => prev ? { ...prev, generatedBy: val } : null)}
                                renderInput={(params) => (
                                    <TextField {...params} label="Responsable / Registrado por" size="small" />
                                )}
                            />

                            {/* Observations */}
                            <TextField
                                label="Observaciones"
                                value={editData.observation}
                                onChange={e => setEditData(prev => prev ? { ...prev, observation: e.target.value } : null)}
                                multiline
                                rows={2}
                                fullWidth
                                variant="outlined"
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid #1f2937' }}>
                    <Button onClick={() => setEditData(null)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveEdit}
                        disabled={isUpdating}
                        sx={{ bgcolor: '#1f6feb', '&:hover': { bgcolor: '#1a5cc7' } }}
                    >
                        {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete / Dar de baja confirmation modal */}
            <Dialog
                open={!!deleteItem}
                onClose={() => setDeleteItem(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: { bgcolor: '#111827', color: 'white', borderRadius: 2, border: '1px solid #1f2937' }
                }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ef4444' }}>
                    <DeleteIcon />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Dar de baja Cambio</Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
                        ¿Estás seguro de que deseás eliminar este registro de cambio de la{' '}
                        <strong>Máquina {deleteItem?.machine?.number || ''}</strong>?
                    </Typography>
                    {deleteItem && (
                        <Box sx={{ p: 1.5, bgcolor: '#0d1520', borderRadius: 1, border: '1px solid #1f2937' }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
                                Inicio: {formatDateTime(deleteItem.startTime)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
                                Arranque: {formatDateTime(deleteItem.endTime)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#60a5fa', fontWeight: 600, display: 'block' }}>
                                Duración: {deleteItem.durationFormatted || '—'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
                                Tipos: {(deleteItem.changeTypes || []).join(', ')}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid #1f2937' }}>
                    <Button onClick={() => setDeleteItem(null)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Eliminando...' : 'Confirmar Baja'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
