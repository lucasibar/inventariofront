import { useState, useMemo, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    IconButton, 
    TextField, 
    Button,
    Drawer,
    MenuItem,
    CircularProgress,
    Autocomplete,
    Paper,
    Modal,
    Tooltip,
    TableContainer,
    Table as MuiTable,
    TableHead,
    TableRow,
    TableCell,
    TableBody
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CategoryIcon from '@mui/icons-material/Category';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DeleteIcon from '@mui/icons-material/Delete';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';

import { 
    useGetStockQuery, 
    useQuickAddStockMutation, 
    useDeleteStockMutation,
    useAdjustStockMutation,
    useReassignBatchMutation,
    useLazyCheckBatchQuery,
    useUpdateBatchObservationsMutation,
} from '../../features/warehouse/stock/api/stock.api';
import { useDespachoDirectoMutation } from '../../features/warehouse/remitosSalida/api/remitos-salida.api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { useGetItemsQuery, useGetItemCategoriesQuery } from '../../features/warehouse/materiales/api/items.api';
import { useGetPartnersQuery } from '../../features/config/partners/api/partners.api';
import { CreateItemDialog } from '../../features/warehouse/materiales/components/CreateItemDialog';
import { CreatePartnerDialog } from '../../features/config/CreatePartnerDialog';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectAllowedDepots } from '../../entities/auth/model/authSlice';
import { useIsMobile } from '../../shared/ui';

// Design System Colors
const colors = {
    primary: '#f59e0b', // Amber
    secondary: '#475569', // Slate
    bg: '#0f1117',
    cardBg: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
    text: '#f3f4f6',
    textDim: '#9ca3af',
    danger: '#ef4444',
    success: '#10b981',
    info: '#3b82f6',
    inputBg: 'rgba(255, 255, 255, 0.05)'
};

interface DebouncedSearchInputProps {
    value: string;
    onChange: (val: string) => void;
    delay?: number;
    label?: string;
    placeholder?: string;
    size?: 'small' | 'medium';
    sx?: any;
    InputProps?: any;
}

function DebouncedSearchInput({ value, onChange, delay = 300, ...props }: DebouncedSearchInputProps) {
    const [localVal, setLocalVal] = useState(value);
    
    useEffect(() => {
        setLocalVal(value);
    }, [value]);

    useEffect(() => {
        const timer = setTimeout(() => {
            onChange(localVal);
        }, delay);
        return () => clearTimeout(timer);
    }, [localVal, delay, onChange]);

    return (
        <TextField
            {...props}
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
        />
    );
}

export default function Stock1Page() {
    const user = useSelector(selectCurrentUser);
    const allowedDepots = useSelector(selectAllowedDepots);
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    // View switcher (grid / list)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        return (sessionStorage.getItem('stockViewMode') as 'grid' | 'list') || (isMobile ? 'list' : 'grid');
    });

    useEffect(() => {
        sessionStorage.setItem('stockViewMode', viewMode);
    }, [viewMode]);

    const [depotId, setDepotId] = useState<string>(() => sessionStorage.getItem('selectedDepotId') || '');
    const [positionId, setPositionId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [expandedMaterials, setExpandedMaterials] = useState<string[]>([]);
    const [deletingKeys, setDeletingKeys] = useState<string[]>([]);
    const [detailGroupId, setDetailGroupId] = useState<string | null>(null);
    const [emptyPositionsModal, setEmptyPositionsModal] = useState<boolean>(false);

    const [searchParams, setSearchParams] = useSearchParams();
    
    useEffect(() => {
        if (depotId) sessionStorage.setItem('selectedDepotId', depotId);
    }, [depotId]);

    useEffect(() => {
        setPositionId('');
    }, [depotId]);

    // Search query from URL
    useEffect(() => {
        const q = searchParams.get('q');
        if (q) setSearchTerm(q);
    }, [searchParams]);

    // Quick Add trigger from URL
    useEffect(() => {
        if (searchParams.get('qa') === '1') {
            setQuickAddModal(true);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('qa');
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams]);

    const toggleMaterial = (id: string, e?: React.MouseEvent) => {
        if(e) e.stopPropagation();
        setExpandedMaterials(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => {
        if (!allowedDepots) return rawDepots;
        return rawDepots.filter((d: any) => allowedDepots.includes(d.id));
    }, [rawDepots, allowedDepots]);

    useEffect(() => {
        if (!depotId && depots.length === 1) {
            setDepotId(depots[0].id);
        }
    }, [depots, depotId]);

    const { data: items = [] } = useGetItemsQuery({});
    const { data: partners = [] } = useGetPartnersQuery({});
    useGetItemCategoriesQuery(depotId || '', { skip: !depotId });
    const [quickAddStock, { isLoading: isQuickAdding }] = useQuickAddStockMutation();
    const [deleteStock] = useDeleteStockMutation();

    // Dialog state
    const [quickAddModal, setQuickAddModal] = useState(false);
    const [qaDepot, setQaDepot] = useState('');
    const [qaPosition, setQaPosition] = useState('');
    const [qaItem, setQaItem] = useState('');
    const [qaSupplier, setQaSupplier] = useState('');
    const [qaLot, setQaLot] = useState('');
    const [qaPrincipal, setQaPrincipal] = useState('');
    const [qaSecundaria, setQaSecundaria] = useState('');

    const [createItemModal, setCreateItemModal] = useState(false);
    const [createPartnerModal, setCreatePartnerModal] = useState(false);

    const [adjustStock] = useAdjustStockMutation();
    const [reassignBatch] = useReassignBatchMutation();
    const [checkBatch] = useLazyCheckBatchQuery();
    const [updateBatchObservations] = useUpdateBatchObservationsMutation();
    const [despachoDirecto] = useDespachoDirectoMutation();

    const [obsModal, setObsModal] = useState({ open: false, batchId: '', text: '' });
    const [obsSaving, setObsSaving] = useState(false);

    // Despacho Directo state
    const [despachoModal, setDespachoModal] = useState(false);
    const [despachoEntry, setDespachoEntry] = useState<any>(null);
    const [despachoQty, setDespachoQty] = useState('');
    const [despachoQtySec, setDespachoQtySec] = useState('');
    const [despachoClient, setDespachoClient] = useState('');
    const [despachoClientName, setDespachoClientName] = useState('');
    const [despachoNewClient, setDespachoNewClient] = useState(false);
    const [despachoFecha, setDespachoFecha] = useState(new Date().toISOString().split('T')[0]);
    const [despachoSaving, setDespachoSaving] = useState(false);

    const clientOptions = useMemo(() => [
        { value: '', label: 'Seleccionar cliente...' },
        ...(isAdmin ? [{ value: '__new__', label: '+ Nuevo cliente' }] : []),
        ...partners.filter((p: any) => p.type === 'CLIENT' || p.type === 'BOTH').map((p: any) => ({ value: p.id, label: p.name }))
    ], [partners, isAdmin]);

    const openDespacho = (entry: any) => {
        setDespachoEntry(entry);
        setDespachoQty('');
        setDespachoQtySec('');
        setDespachoClient('');
        setDespachoClientName('');
        setDespachoNewClient(false);
        setDespachoFecha(new Date().toISOString().split('T')[0]);
        setDespachoModal(true);
    };

    const handleDespachoSubmit = async () => {
        if (!despachoEntry || !despachoQty) return;
        if (!despachoClient && !despachoClientName) { alert('Seleccioná un cliente'); return; }
        setDespachoSaving(true);
        try {
            const result = await despachoDirecto({
                fecha: despachoFecha,
                clientId: despachoNewClient ? undefined : despachoClient,
                clientName: despachoNewClient ? despachoClientName : undefined,
                depositoId: despachoEntry.depositoId || depotId,
                posicionId: despachoEntry.posicionId,
                itemId: despachoEntry.batch.item.id,
                lotId: despachoEntry.lotId,
                qtyPrincipal: Number(despachoQty),
                qtySecundaria: despachoQtySec ? Number(despachoQtySec) : undefined,
            }).unwrap();
            alert(`✅ Despachado con éxito. Remito: ${result.numero}`);
            setDespachoModal(false);
        } catch (e: any) {
            alert(e?.data?.message || 'Error al despachar');
        } finally {
            setDespachoSaving(false);
        }
    };

    const handleAdjustQty = async (entry: any, newValue: string, field: 'principal' | 'secundaria') => {
        const newQty = Number(newValue);
        if (isNaN(newQty) || newQty < 0) { alert('Valor inválido'); return; }
        const currentQty = field === 'principal' ? Number(entry.qtyPrincipal) : Number(entry.qtySecundaria || 0);
        const diff = newQty - currentQty;
        if (diff === 0) return;
        try {
            await adjustStock({
                depositoId: entry.depositoId || depotId,
                posicionId: entry.posicionId,
                itemId: entry.batch.item.id,
                lotId: entry.lotId,
                qtyPrincipal: field === 'principal' ? diff : 0,
                qtySecundaria: field === 'secundaria' ? diff : null,
                fecha: new Date().toISOString(),
                observaciones: `Ajuste manual: ${currentQty} → ${newQty} (${field === 'principal' ? entry.batch.item.unidadPrincipal : entry.batch.item.unidadSecundaria})`,
            }).unwrap();
        } catch (e: any) { alert(e?.data?.message || 'Error al ajustar'); }
    };

    const handleReassignBatch = async (entry: any, newLotNumber: string) => {
        if (!newLotNumber.trim()) return;
        if (newLotNumber === entry.batch.lotNumber) return;
        const entryDepotId = entry.depositoId || depotId;
        try {
            const result = await checkBatch({ itemId: entry.batch.item.id, lotNumber: newLotNumber, supplierId: entry.batch.supplier?.id }).unwrap();
            if (result.exists) {
                if (!window.confirm(`La partida "${newLotNumber}" ya existe. ¿Querés fusionar el stock con esa partida?`)) return;
            } else {
                if (!window.confirm(`La partida "${newLotNumber}" no existe. Se va a crear una nueva. ¿Continuar?`)) return;
            }
            await reassignBatch({
                depositoId: entryDepotId,
                posicionId: entry.posicionId,
                itemId: entry.batch.item.id,
                currentLotId: entry.lotId,
                newLotNumber: newLotNumber.trim(),
                fecha: new Date().toISOString(),
            }).unwrap();
        } catch (e: any) { alert(e?.data?.message || 'Error al reasignar partida'); }
    };

    const handleUpdateObs = async () => {
        setObsSaving(true);
        try {
            await updateBatchObservations({ id: obsModal.batchId, observaciones: obsModal.text }).unwrap();
            setObsModal({ open: false, batchId: '', text: '' });
        } catch (e: any) { alert(e?.data?.message || 'Error al guardar observación'); }
        setObsSaving(false);
    };

    const qaFilteredItems = useMemo(() => {
        if (!qaSupplier) return items;
        return items.filter((i: any) => i.supplierId === qaSupplier);
    }, [items, qaSupplier]);

    const qaSelectedItem = useMemo(() => items.find((i: any) => i.id === qaItem), [items, qaItem]);

    const handleQuickAddSubmit = async () => {
        if (isQuickAdding) return;
        if (!qaDepot || !qaPosition || !qaItem || !qaSupplier || !qaLot || !qaPrincipal) {
            alert('Completá todos los campos obligatorios.');
            return;
        }
        try {
            await quickAddStock({
                depositoId: qaDepot, posicionId: qaPosition, itemId: qaItem, supplierId: qaSupplier,
                lotNumber: qaLot, qtyPrincipal: Number(qaPrincipal), qtySecundaria: qaSecundaria ? Number(qaSecundaria) : undefined,
                fecha: new Date().toISOString()
            }).unwrap();
            setQuickAddModal(false);
            setQaItem(''); setQaLot(''); setQaPrincipal(''); setQaSecundaria('');
        } catch (e: any) { alert(e?.data?.message || 'Error en adición rápida'); }
    };

    const getEntryKey = (entry: any) => `${entry.depositoId || depotId}-${entry.posicionId}-${entry.batch.item.id}-${entry.lotId}`;

    const handleDeleteLine = async (entry: any) => {
        if (!window.confirm(`¿Eliminar esta línea de stock (${entry.qtyPrincipal} ${entry.batch.item.unidadPrincipal})?`)) return;
        const key = getEntryKey(entry);
        setDeletingKeys(prev => [...prev, key]);
        try {
            await deleteStock({
                depositoId: entry.depositoId || depotId,
                posicionId: entry.posicionId,
                itemId: entry.batch.item.id,
                lotId: entry.lotId,
                fecha: new Date().toISOString()
            }).unwrap();
        } catch (e: any) { 
            alert(e?.data?.message || 'Error al eliminar línea de stock'); 
            setDeletingKeys(prev => prev.filter(k => k !== key));
        }
    };

    const { data: rawStock = [], isFetching, isLoading } = useGetStockQuery({ 
        depotId: depotId || undefined,
        positionId: positionId || undefined
    }, { skip: !depotId });

    const emptyPositions = useMemo(() => {
        if (!depotId) return [];
        const allDepotPositions = (depots.find((d: any) => d.id === depotId)?.positions || []).filter((p: any) => p.activo);
        const occupiedPositionIds = new Set(rawStock.map((e: any) => e.posicionId).filter(Boolean));
        return allDepotPositions.filter((p: any) => !occupiedPositionIds.has(p.id));
    }, [depotId, depots, rawStock]);

    useEffect(() => {
        if (deletingKeys.length > 0) {
            setDeletingKeys([]);
        }
    }, [rawStock]);

    const { groupedData, generalMetrics } = useMemo(() => {
        const general = { kilos: 0, units: 0, positions: new Set<string>() };
        if (!rawStock.length) return { groupedData: [], generalMetrics: null };
        const groups: Record<string, any> = {};
        const searchWords = searchTerm.toLowerCase().split(' ').filter(w => w.length > 0);
        
        const filteredStock = rawStock.filter((entry: any) => {
            if (searchWords.length === 0) return true;
            return searchWords.every(word => {
                const itemDesc = (entry.batch?.item?.descripcion || '').toLowerCase();
                const itemCode = (entry.batch?.item?.codigoInterno || '').toLowerCase();
                const lotNum = (entry.batch?.lotNumber || '').toLowerCase();
                const supplierName = (entry.batch?.supplier?.name || '').toLowerCase();
                const posCode = (entry.posicion?.codigo || '').toLowerCase();
                const categoryName = (entry.batch?.item?.category?.nombre || '').toLowerCase();
                return itemDesc.includes(word) || itemCode.includes(word) || lotNum.includes(word) || supplierName.includes(word) || posCode.includes(word) || categoryName.includes(word);
            });
        });

        filteredStock.forEach((entry: any) => {
            const itemId = entry.batch?.item?.id;
            if (!itemId) return;
            general.kilos += Number(entry.qtyPrincipal || 0);
            if (entry.qtySecundaria) general.units += Number(entry.qtySecundaria);
            if (entry.posicionId) general.positions.add(entry.posicionId);

            if (!groups[itemId]) {
                groups[itemId] = {
                    item: entry.batch.item,
                    supplier: entry.batch.supplier,
                    entries: [],
                    minLotNumber: entry.batch.lotNumber,
                    metrics: { kilos: 0, units: 0 }
                };
            }
            groups[itemId].entries.push(entry);
            groups[itemId].metrics.kilos += Number(entry.qtyPrincipal || 0);
            if (entry.qtySecundaria) groups[itemId].metrics.units += Number(entry.qtySecundaria);
            
            if (entry.batch.lotNumber < groups[itemId].minLotNumber) {
                groups[itemId].minLotNumber = entry.batch.lotNumber;
            }
        });

        return {
            groupedData: Object.values(groups).sort((a: any, b: any) => a.item.descripcion.localeCompare(b.item.descripcion)),
            generalMetrics: { ...general, positionsCount: general.positions.size }
        };
    }, [rawStock, searchTerm]);

    const detailGroup = useMemo(() => groupedData.find((g: any) => g.item.id === detailGroupId), [groupedData, detailGroupId]);

    const inlineEditLot = (entry: any, currentValue: string) => {
        const val = window.prompt('Editar número de lote:', currentValue);
        if (val !== null) handleReassignBatch(entry, val);
    };

    const inlineEditQty = (entry: any, currentValue: number, field: 'principal' | 'secundaria', label: string) => {
        const val = window.prompt(`Ajustar stock (${label}):`, String(currentValue));
        if (val !== null) handleAdjustQty(entry, val, field);
    };

    return (
        <Box sx={{ p: isMobile ? 2 : 4, maxWidth: '1400px', margin: '0 auto', color: colors.text, minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: colors.text, letterSpacing: '-0.5px' }}>Gestión de Stock</Typography>
                    <Typography variant="caption" sx={{ color: colors.textDim }}>Inventario físico y distribución de partidas en posiciones</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                        variant="contained" 
                        startIcon={<AddIcon />} 
                        onClick={() => setQuickAddModal(true)}
                        sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, borderRadius: 2, '&:hover': { bgcolor: '#d97706' } }}
                    >
                        Carga Rápida
                    </Button>
                </Box>
            </Box>

            {/* KPIs */}
            {!isFetching && depotId && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Paper sx={{ flex: '1 1 200px', p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>Stock Kilos</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.primary }}>{(generalMetrics?.kilos || 0).toLocaleString('es-AR', { minimumFractionDigits: 1 })} <small style={{ fontSize: '0.8rem', fontWeight: 500 }}>kg</small></Typography>
                    </Paper>
                    <Paper sx={{ flex: '1 1 200px', p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>Stock Unidades</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.success }}>{(generalMetrics?.units || 0).toLocaleString('es-AR')} <small style={{ fontSize: '0.8rem', fontWeight: 500 }}>un</small></Typography>
                    </Paper>
                    <Paper sx={{ flex: '1 1 200px', p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>Ubicaciones Activas</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.info }}>{generalMetrics?.positionsCount || 0} <small style={{ fontSize: '0.8rem', fontWeight: 500 }}>pos</small></Typography>
                    </Paper>
                    <Paper 
                        onClick={() => { if (emptyPositions.length > 0) setEmptyPositionsModal(true); }}
                        sx={{ 
                            flex: '1 1 200px', 
                            p: 2, 
                            bgcolor: colors.cardBg, 
                            border: `1px solid ${colors.border}`, 
                            borderRadius: 3, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 0.5,
                            cursor: emptyPositions.length > 0 ? 'pointer' : 'default',
                            transition: 'all 0.15s ease-in-out',
                            '&:hover': emptyPositions.length > 0 ? { borderColor: colors.info, transform: 'translateY(-1px)' } : {}
                        }}
                    >
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Posiciones Vacías
                            {emptyPositions.length > 0 && <span style={{ color: colors.info, fontSize: '0.65rem', fontWeight: 800 }}>Ver todas</span>}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.info }}>{emptyPositions.length} <small style={{ fontSize: '0.8rem', fontWeight: 500 }}>vacías</small></Typography>
                    </Paper>
                </Box>
            )}

            {/* Filters Row */}
            <Paper sx={{ p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        select
                        label="Depósito"
                        value={depotId}
                        onChange={(e) => setDepotId(e.target.value)}
                        disabled={!isAdmin && depots.length === 1}
                        size="small"
                        sx={{ flex: '1 1 200px', '& .MuiInputLabel-root': { color: colors.textDim }, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                    >
                        <MenuItem value=""><em>Seleccionar depósito...</em></MenuItem>
                        {depots.map((d: any) => (
                            <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
                        ))}
                    </TextField>

                    <DebouncedSearchInput
                        label="Buscar..."
                        placeholder="Código, Lote, Material o Ubicación..."
                        value={searchTerm}
                        onChange={setSearchTerm}
                        size="small"
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ color: colors.textDim, mr: 1, fontSize: '1.2rem' }} />
                        }}
                        sx={{ flex: '2 1 300px', '& .MuiInputLabel-root': { color: colors.textDim }, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                    />

                    <TextField
                        select
                        label="Posición"
                        value={positionId}
                        onChange={(e) => setPositionId(e.target.value)}
                        size="small"
                        sx={{ flex: '1 1 200px', '& .MuiInputLabel-root': { color: colors.textDim }, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                    >
                        <MenuItem value="">Todos los racks</MenuItem>
                        {depotId && (depots.find((d: any) => d.id === depotId)?.positions || []).filter((p: any) => p.activo).map((p: any) => (
                            <MenuItem key={p.id} value={p.id}>{p.codigo}</MenuItem>
                        ))}
                    </TextField>

                    {/* View Switcher */}
                    <Box sx={{ display: 'flex', bgcolor: colors.inputBg, borderRadius: 2, p: 0.5, border: `1px solid ${colors.border}` }}>
                        <IconButton 
                            onClick={() => setViewMode('grid')} 
                            sx={{ color: viewMode === 'grid' ? colors.primary : colors.textDim, borderRadius: 1.5, p: 1 }}
                        >
                            <GridViewIcon />
                        </IconButton>
                        <IconButton 
                            onClick={() => setViewMode('list')} 
                            sx={{ color: viewMode === 'list' ? colors.primary : colors.textDim, borderRadius: 1.5, p: 1 }}
                        >
                            <ViewListIcon />
                        </IconButton>
                    </Box>
                </Box>
            </Paper>

            {/* List / Grid content */}
            {isFetching || isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress sx={{ color: colors.primary }} /></Box>
            ) : (
                <>
                    {groupedData.length === 0 ? (
                        <Paper sx={{ p: 6, textAlign: 'center', bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 4 }}>
                            <Typography sx={{ color: colors.textDim }}>No se encontraron registros de stock</Typography>
                        </Paper>
                    ) : (
                        viewMode === 'grid' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
                                {groupedData.map((group: any) => {
                                    const isExpanded = expandedMaterials.includes(group.item.id);
                                    const categoryName = group.item.category?.nombre || group.item.categoria || 'General';
                                    const codeText = group.item.codigoInterno;

                                    return (
                                        <div 
                                            key={group.item.id} 
                                            className="material-card-hover"
                                            style={{ 
                                                background: colors.cardBg, 
                                                border: `1px solid ${isExpanded ? colors.primary : colors.border}`, 
                                                borderRadius: '12px', 
                                                overflow: 'hidden', 
                                                transition: 'all 0.15s ease-in-out',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => toggleMaterial(group.item.id)}
                                        >
                                            {/* Header */}
                                            <div style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                    <div>
                                                        <div style={{ color: colors.primary, fontWeight: 800, fontSize: '11px', letterSpacing: '0.5px' }}>{codeText}</div>
                                                        <div style={{ fontWeight: 800, color: '#fff', fontSize: '15px', lineHeight: 1.2, marginTop: '2px' }}>{group.item.descripcion}</div>
                                                    </div>
                                                    <IconButton size="small" sx={{ color: colors.textDim }}>
                                                        {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                                    </IconButton>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                        <span style={{ fontSize: '20px', fontWeight: 900, color: colors.primary }}>{group.metrics.kilos.toFixed(1)}</span>
                                                        <span style={{ fontSize: '11px', color: colors.textDim, fontWeight: 700 }}>{group.item.unidadPrincipal || 'kg'}</span>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ color: colors.textDim, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}>
                                                            <CategoryIcon style={{ fontSize: 12 }} /> {categoryName}
                                                        </div>
                                                        <div style={{ color: colors.textDim, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '11px', fontWeight: 600 }}>
                                                            <LocationOnIcon style={{ fontSize: 12 }} /> {group.entries.length} registros
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded content */}
                                            {isExpanded && (
                                                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.15)', borderTop: `1px solid ${colors.border}` }} onClick={(e) => e.stopPropagation()}>
                                                    {group.entries.map((entry: any, index: number) => {
                                                        const isDeleting = deletingKeys.includes(getEntryKey(entry));
                                                        return (
                                                            <div 
                                                                key={entry.id} 
                                                                style={{ 
                                                                    display: 'flex', 
                                                                    justifyContent: 'space-between', 
                                                                    alignItems: 'center', 
                                                                    padding: '8px 4px',
                                                                    borderBottom: index === group.entries.length - 1 ? 'none' : `1px solid ${colors.border}`,
                                                                    opacity: isDeleting ? 0.5 : 1,
                                                                    pointerEvents: isDeleting ? 'none' : 'auto'
                                                                }}
                                                            >
                                                                <div>
                                                                    <div 
                                                                        onClick={() => navigate('/movimientos', { state: { depositoId: entry.depositoId || depotId, posicionId: entry.posicionId, itemId: entry.batch?.item?.id } })}
                                                                        style={{ fontWeight: 800, color: colors.info, textDecoration: 'underline', cursor: 'pointer', fontSize: '13px', display: 'inline-block' }}
                                                                    >
                                                                        {entry.posicion?.codigo || 'S/P'}
                                                                    </div>
                                                                    <div style={{ color: colors.textDim, display: 'block', marginTop: '2px', fontSize: '11px' }}>
                                                                        Lote: <strong style={{ color: '#fff', cursor: 'pointer', textDecoration: 'underline dashed' }} onClick={() => inlineEditLot(entry, entry.batch?.lotNumber || '')}>{entry.batch?.lotNumber}</strong>
                                                                        {entry.batch?.observaciones && (
                                                                            <Tooltip title={`Ver obs: ${entry.batch.observaciones}`}>
                                                                                <IconButton size="small" onClick={() => alert(`Observación: ${entry.batch.observaciones}`)} sx={{ color: colors.danger, p: 0, ml: 0.5 }}><InfoIcon sx={{ fontSize: 14 }} /></IconButton>
                                                                            </Tooltip>
                                                                        )}
                                                                        <IconButton size="small" onClick={() => setObsModal({ open: true, batchId: entry.batch?.id, text: entry.batch?.observaciones || '' })} sx={{ color: colors.textDim, p: 0, ml: 0.5 }}><EditIcon sx={{ fontSize: 12 }} /></IconButton>
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    <div style={{ textAlign: 'right' }}>
                                                                        <div style={{ fontWeight: 800, color: colors.primary, cursor: 'pointer', textDecoration: 'underline dashed', fontSize: '13px' }} onClick={() => inlineEditQty(entry, entry.qtyPrincipal, 'principal', entry.batch.item.unidadPrincipal)}>
                                                                            {entry.qtyPrincipal} <small style={{ fontWeight: 400, color: colors.textDim }}>{group.item.unidadPrincipal}</small>
                                                                        </div>
                                                                        {entry.qtySecundaria && (
                                                                            <div style={{ color: colors.textDim, cursor: 'pointer', textDecoration: 'underline dashed', fontSize: '11px', marginTop: '2px' }} onClick={() => inlineEditQty(entry, entry.qtySecundaria, 'secundaria', entry.batch.item.unidadSecundaria)}>
                                                                                {entry.qtySecundaria} <small>{group.item.unidadSecundaria}</small>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '2px' }}>
                                                                        <IconButton size="small" onClick={() => openDespacho(entry)} sx={{ color: colors.info }} title="Despachar"><LocalShippingIcon sx={{ fontSize: 16 }} /></IconButton>
                                                                        {isAdmin && (
                                                                            <IconButton size="small" onClick={() => handleDeleteLine(entry)} sx={{ color: colors.danger }} title="Eliminar"><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: '12px', overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
                                        <tr style={{ textAlign: 'left', color: colors.textDim }}>
                                            <th style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, fontWeight: 800 }}>Código</th>
                                            <th style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, fontWeight: 800 }}>Material / Descripción</th>
                                            <th style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, fontWeight: 800 }}>Categoría</th>
                                            <th style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, fontWeight: 800, textAlign: 'right' }}>Stock Total</th>
                                            <th style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, fontWeight: 800 }}>Unidades</th>
                                            <th style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, fontWeight: 800, textAlign: 'center' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupedData.map((group: any) => {
                                            const categoryName = group.item.category?.nombre || group.item.categoria || 'General';

                                            return (
                                                <tr key={group.item.id} style={{ borderBottom: `1px solid ${colors.border}`, transition: 'background-color 0.15s' }} className="hoverable-row">
                                                    <td style={{ padding: '12px 16px' }}><span style={{ color: colors.primary, fontWeight: 800, fontSize: '11px' }}>{group.item.codigoInterno}</span></td>
                                                    <td style={{ padding: '12px 16px' }}><span style={{ fontWeight: 800, color: '#fff' }}>{group.item.descripcion}</span></td>
                                                    <td style={{ padding: '12px 16px' }}><span style={{ color: colors.textDim }}>{categoryName}</span></td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                        <span style={{ fontWeight: 800, color: colors.primary }}>
                                                            {group.metrics.kilos.toLocaleString('es-AR', { minimumFractionDigits: 1 })} <small style={{ fontWeight: 400, color: colors.textDim }}>{group.item.unidadPrincipal}</small>
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        {group.metrics.units > 0 ? (
                                                            <span style={{ color: colors.success, fontWeight: 700 }}>
                                                                {group.metrics.units.toLocaleString('es-AR')} <small style={{ color: colors.textDim }}>{group.item.unidadSecundaria}</small>
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <Button 
                                                            size="small" 
                                                            onClick={() => setDetailGroupId(group.item.id)}
                                                            variant="outlined"
                                                            sx={{ 
                                                                borderColor: colors.primary, 
                                                                color: colors.primary, 
                                                                fontWeight: 800, 
                                                                fontSize: '0.7rem', 
                                                                textTransform: 'none',
                                                                borderRadius: 1.5,
                                                                '&:hover': { bgcolor: `${colors.primary}10`, borderColor: colors.primary }
                                                            }}
                                                        >
                                                            Detalles
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                    <style>{`
                        .hoverable-row:hover {
                            background-color: rgba(255, 255, 255, 0.02) !important;
                        }
                        .material-card-hover:hover {
                            border-color: ${colors.primary} !important;
                            transform: translateY(-1px);
                        }
                    `}</style>
                </>
            )}

            {/* Carga Rápida Drawer */}
            <Drawer 
                anchor="bottom" 
                open={quickAddModal} 
                onClose={() => setQuickAddModal(false)}
                PaperProps={{ sx: { bgcolor: colors.bg, color: colors.text, borderTop: `1px solid ${colors.primary}`, borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 3, pb: 6 } }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: colors.primary }}>CARGA RÁPIDA</Typography>
                    <IconButton onClick={() => setQuickAddModal(false)} sx={{ color: colors.textDim }}><CloseIcon /></IconButton>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600, margin: '0 auto', width: '100%' }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField 
                            select 
                            label="Depósito" 
                            fullWidth 
                            value={qaDepot} 
                            onChange={(e) => { setQaDepot(e.target.value); setQaPosition(''); }} 
                            InputLabelProps={{ sx: { color: colors.textDim } }} 
                            InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                        >
                            <MenuItem value=""><em>Seleccionar...</em></MenuItem>
                            {depots.map((d: any) => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}
                        </TextField>

                        <TextField 
                            select 
                            label="Posición" 
                            fullWidth 
                            value={qaPosition} 
                            disabled={!qaDepot} 
                            onChange={(e) => setQaPosition(e.target.value)} 
                            InputLabelProps={{ sx: { color: colors.textDim } }} 
                            InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                        >
                            <MenuItem value=""><em>Seleccionar...</em></MenuItem>
                            {(depots.find((d: any) => d.id === qaDepot)?.positions || []).filter((p: any) => p.activo).map((p: any) => <MenuItem key={p.id} value={p.id}>{p.codigo}</MenuItem>)}
                        </TextField>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Autocomplete 
                            options={partners.filter((p: any) => p.type === 'SUPPLIER' || p.type === 'BOTH')} 
                            getOptionLabel={(option: any) => option.name} 
                            value={partners.find(p => p.id === qaSupplier) || null}
                            fullWidth
                            onChange={(_e, val: any) => { setQaSupplier(val?.id || ''); setQaItem(''); }}
                            renderInput={(params) => <TextField {...params} label="Proveedor" InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} />} 
                        />
                        <Button variant="outlined" sx={{ color: colors.primary, borderColor: colors.primary, height: '40px', minWidth: '40px', p: 0, borderRadius: 2 }} onClick={() => setCreatePartnerModal(true)}>+</Button>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Autocomplete 
                            options={qaFilteredItems} 
                            getOptionLabel={(option: any) => `${option.codigoInterno} - ${option.descripcion}`} 
                            value={items.find(i => i.id === qaItem) || null}
                            fullWidth
                            onChange={(_e, val: any) => setQaItem(val?.id || '')}
                            renderInput={(params) => <TextField {...params} label="Material" InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} />} 
                        />
                        <Button variant="outlined" sx={{ color: colors.primary, borderColor: colors.primary, height: '40px', minWidth: '40px', p: 0, borderRadius: 2 }} onClick={() => setCreateItemModal(true)}>+</Button>
                    </Box>

                    <TextField 
                        label="Número de Lote" 
                        fullWidth 
                        value={qaLot} 
                        onChange={(e) => setQaLot(e.target.value)} 
                        InputLabelProps={{ sx: { color: colors.textDim } }} 
                        InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} 
                    />

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField 
                            label={`Kilos (${qaSelectedItem?.unidadPrincipal || 'kg'})`} 
                            type="number" 
                            fullWidth 
                            value={qaPrincipal} 
                            onChange={(e) => setQaPrincipal(e.target.value)} 
                            InputLabelProps={{ sx: { color: colors.textDim } }} 
                            InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} 
                        />
                        <TextField 
                            label={`Unidades (${qaSelectedItem?.unidadSecundaria || 'un'})`} 
                            type="number" 
                            fullWidth 
                            value={qaSecundaria} 
                            onChange={(e) => setQaSecundaria(e.target.value)} 
                            InputLabelProps={{ sx: { color: colors.textDim } }} 
                            InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} 
                        />
                    </Box>

                    <Button 
                        fullWidth 
                        variant="contained" 
                        size="large" 
                        disabled={isQuickAdding} 
                        startIcon={isQuickAdding ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />} 
                        sx={{ mt: 2, bgcolor: colors.primary, color: '#000', fontWeight: 900, borderRadius: 3, py: 1.5, '&:hover': { bgcolor: '#d97706' } }} 
                        onClick={handleQuickAddSubmit}
                    >
                        {isQuickAdding ? 'REGISTRANDO...' : 'REGISTRAR STOCK'}
                    </Button>
                </Box>
            </Drawer>

            {/* Detail Modal for List View */}
            {detailGroup && (
                <Modal 
                    open={!!detailGroupId} 
                    onClose={() => setDetailGroupId(null)}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Paper sx={{ width: '90%', maxWidth: 700, bgcolor: colors.bg, border: `1px solid ${colors.primary}`, borderRadius: 4, p: 3, outline: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 900, color: colors.primary, lineHeight: 1.2 }}>{detailGroup.item.descripcion}</Typography>
                                <Typography variant="caption" sx={{ color: colors.textDim }}>Proveedor: {detailGroup.supplier?.name || 'Sin proveedor'}</Typography>
                            </Box>
                            <IconButton onClick={() => setDetailGroupId(null)} sx={{ color: colors.textDim }}><CloseIcon /></IconButton>
                        </Box>
                        
                        <TableContainer sx={{ maxHeight: 400, overflowY: 'auto', border: `1px solid ${colors.border}`, borderRadius: 2 }}>
                            <MuiTable size="small">
                                <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
                                    <TableRow sx={{ '& th': { color: colors.textDim, fontWeight: 800 } }}>
                                        <TableCell>Ubicación</TableCell>
                                        <TableCell>Lote</TableCell>
                                        <TableCell align="right">Kilos</TableCell>
                                        <TableCell align="right">Unidades</TableCell>
                                        <TableCell align="center">Acción</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {detailGroup.entries.map((entry: any) => {
                                        const isOldest = entry.batch.lotNumber === detailGroup.minLotNumber;
                                        const isDeleting = deletingKeys.includes(getEntryKey(entry));
                                        return (
                                            <TableRow key={entry.id} sx={{ opacity: isDeleting ? 0.5 : 1, '& td': { color: '#fff', py: 1 } }}>
                                                <TableCell>
                                                    <Typography 
                                                        variant="body2" 
                                                        onClick={() => { setDetailGroupId(null); navigate('/movimientos', { state: { depositoId: entry.depositoId || depotId, posicionId: entry.posicionId, itemId: entry.batch?.item?.id } }); }}
                                                        sx={{ fontWeight: 800, color: colors.info, textDecoration: 'underline', cursor: 'pointer' }}
                                                    >
                                                        {entry.posicion?.codigo || 'S/P'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Typography 
                                                            variant="body2" 
                                                            onClick={() => inlineEditLot(entry, entry.batch?.lotNumber || '')}
                                                            sx={{ 
                                                                cursor: 'pointer', 
                                                                textDecoration: 'underline dashed',
                                                                color: isOldest ? colors.primary : '#fff',
                                                                fontWeight: isOldest ? 800 : 400
                                                            }}
                                                        >
                                                            {entry.batch?.lotNumber}
                                                        </Typography>
                                                        {entry.batch?.observaciones && (
                                                            <IconButton size="small" onClick={() => alert(`Observación: ${entry.batch.observaciones}`)} sx={{ color: colors.danger, p: 0 }}><InfoIcon sx={{ fontSize: 14 }} /></IconButton>
                                                        )}
                                                        <IconButton size="small" onClick={() => setObsModal({ open: true, batchId: entry.batch?.id, text: entry.batch?.observaciones || '' })} sx={{ color: colors.textDim, p: 0 }}><EditIcon sx={{ fontSize: 12 }} /></IconButton>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" onClick={() => inlineEditQty(entry, entry.qtyPrincipal, 'principal', entry.batch.item.unidadPrincipal)} sx={{ cursor: 'pointer', textDecoration: 'underline dashed', color: colors.primary, fontWeight: 800 }}>
                                                        {entry.qtyPrincipal} <small style={{ color: colors.textDim }}>{detailGroup.item.unidadPrincipal}</small>
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    {entry.qtySecundaria ? (
                                                        <Typography variant="body2" onClick={() => inlineEditQty(entry, entry.qtySecundaria, 'secundaria', entry.batch.item.unidadSecundaria)} sx={{ cursor: 'pointer', textDecoration: 'underline dashed', color: colors.success, fontWeight: 700 }}>
                                                            {entry.qtySecundaria} <small style={{ color: colors.textDim }}>{detailGroup.item.unidadSecundaria}</small>
                                                        </Typography>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                        <IconButton size="small" onClick={() => openDespacho(entry)} sx={{ color: colors.info }} title="Despachar"><LocalShippingIcon sx={{ fontSize: 16 }} /></IconButton>
                                                        {isAdmin && (
                                                            <IconButton size="small" onClick={() => handleDeleteLine(entry)} sx={{ color: colors.danger }} title="Eliminar"><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </MuiTable>
                        </TableContainer>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, borderTop: `1px solid ${colors.border}`, pt: 2 }}>
                            <Button variant="outlined" onClick={() => setDetailGroupId(null)} sx={{ color: colors.textDim, borderColor: colors.border, borderRadius: 2 }}>
                                Cerrar
                            </Button>
                        </Box>
                    </Paper>
                </Modal>
            )}

            {/* Observations Modal */}
            {obsModal.open && (
                <Modal 
                    open={obsModal.open} 
                    onClose={() => setObsModal({ open: false, batchId: '', text: '' })}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Paper sx={{ width: '90%', maxWidth: 450, bgcolor: colors.bg, border: `1px solid ${colors.danger}`, borderRadius: 4, p: 3, outline: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: colors.danger }}>Observación de Partida</Typography>
                        <TextField
                            multiline
                            rows={4}
                            fullWidth
                            value={obsModal.text}
                            onChange={(e) => setObsModal(p => ({ ...p, text: e.target.value }))}
                            placeholder="Escribí aquí observaciones relativas a la partida..."
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
                            <Button variant="text" onClick={() => setObsModal({ open: false, batchId: '', text: '' })} sx={{ color: colors.textDim }}>Cancelar</Button>
                            <Button variant="contained" disabled={obsSaving} onClick={handleUpdateObs} sx={{ bgcolor: colors.danger, color: '#fff', fontWeight: 800, borderRadius: 2, '&:hover': { bgcolor: '#dc2626' } }}>
                                {obsSaving ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </Box>
                    </Paper>
                </Modal>
            )}

            {/* Despacho Directo Modal */}
            {despachoModal && despachoEntry && (
                <Modal 
                    open={despachoModal} 
                    onClose={() => setDespachoModal(false)}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Paper sx={{ width: '90%', maxWidth: 480, bgcolor: colors.bg, border: `1px solid ${colors.info}`, borderRadius: 4, p: 3, outline: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, color: colors.info }}>Despacho Directo</Typography>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Autocomplete 
                                options={clientOptions} 
                                getOptionLabel={(option: any) => option.label}
                                value={clientOptions.find(o => o.value === despachoClient) || null}
                                onChange={(_e, val: any) => {
                                    if (val?.value === '__new__') {
                                        setDespachoNewClient(true);
                                        setDespachoClient('');
                                    } else {
                                        setDespachoNewClient(false);
                                        setDespachoClient(val?.value || '');
                                    }
                                }}
                                renderInput={(params) => <TextField {...params} label="Cliente" InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} />}
                            />

                            {despachoNewClient && isAdmin && (
                                <TextField 
                                    label="Nombre del nuevo cliente" 
                                    fullWidth 
                                    value={despachoClientName} 
                                    onChange={(e) => setDespachoClientName(e.target.value)} 
                                    InputLabelProps={{ sx: { color: colors.textDim } }} 
                                    InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} 
                                />
                            )}

                            <TextField 
                                label="Fecha" 
                                type="date" 
                                fullWidth 
                                value={despachoFecha} 
                                onChange={(e) => setDespachoFecha(e.target.value)} 
                                InputLabelProps={{ shrink: true, sx: { color: colors.textDim } }} 
                                InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} 
                            />

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField 
                                    label={`Cantidad (${despachoEntry.batch.item.unidadPrincipal})`} 
                                    type="number" 
                                    fullWidth 
                                    value={despachoQty} 
                                    onChange={(e) => setDespachoQty(e.target.value)} 
                                    InputLabelProps={{ sx: { color: colors.textDim } }} 
                                    InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} 
                                />
                                {despachoEntry.batch.item.unidadSecundaria && (
                                    <TextField 
                                        label={`Secundaria (${despachoEntry.batch.item.unidadSecundaria})`} 
                                        type="number" 
                                        fullWidth 
                                        value={despachoQtySec} 
                                        onChange={(e) => setDespachoQtySec(e.target.value)} 
                                        InputLabelProps={{ sx: { color: colors.textDim } }} 
                                        InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} 
                                    />
                                )}
                            </Box>

                            {Number(despachoQtySec) > 0 && Number(despachoEntry.qtySecundaria) > 0 && (
                                <Typography variant="caption" sx={{ color: colors.info, textAlign: 'right', display: 'block' }}>
                                    ≈ {((Number(despachoEntry.qtyPrincipal) / Number(despachoEntry.qtySecundaria)) * Number(despachoQtySec)).toFixed(2)} {despachoEntry.batch.item.unidadPrincipal}
                                </Typography>
                            )}

                            <Typography variant="caption" sx={{ color: colors.textDim, fontStyle: 'italic' }}>
                                💡 Si ya existe un remito de salida para esta fecha y cliente, se agregará automáticamente como línea.
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3, borderTop: `1px solid ${colors.border}`, pt: 2 }}>
                            <Button variant="text" onClick={() => setDespachoModal(false)} sx={{ color: colors.textDim }}>Cancelar</Button>
                            <Button 
                                variant="contained" 
                                disabled={despachoSaving || !despachoQty} 
                                onClick={handleDespachoSubmit}
                                sx={{ bgcolor: colors.info, color: '#fff', fontWeight: 800, borderRadius: 2, '&:hover': { bgcolor: '#2563eb' } }}
                            >
                                {despachoSaving ? 'Despachando...' : 'Confirmar'}
                            </Button>
                        </Box>
                    </Paper>
                </Modal>
            )}

            {/* Empty Positions Modal */}
            {emptyPositionsModal && (
                <Modal 
                    open={emptyPositionsModal} 
                    onClose={() => setEmptyPositionsModal(false)}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Paper sx={{ width: '90%', maxWidth: 450, bgcolor: colors.bg, border: `1px solid ${colors.info}`, borderRadius: 4, p: 3, outline: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 900, color: colors.info }}>Posiciones Vacías ({emptyPositions.length})</Typography>
                            <IconButton onClick={() => setEmptyPositionsModal(false)} sx={{ color: colors.textDim }}><CloseIcon /></IconButton>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: '300px', overflowY: 'auto', p: 1, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                            {emptyPositions.length === 0 ? (
                                <Typography variant="body2" sx={{ color: colors.textDim, p: 2 }}>No hay posiciones vacías en este depósito.</Typography>
                            ) : (
                                emptyPositions.map((p: any) => (
                                    <Box 
                                        key={p.id} 
                                        sx={{ 
                                            px: 1.5, 
                                            py: 0.5, 
                                            bgcolor: 'rgba(255, 255, 255, 0.05)', 
                                            border: `1px solid ${colors.border}`, 
                                            borderRadius: 2, 
                                            color: '#fff', 
                                            fontSize: '0.8rem', 
                                            fontWeight: 700 
                                        }}
                                    >
                                        📍 {p.codigo}
                                    </Box>
                                ))
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, borderTop: `1px solid ${colors.border}`, pt: 2 }}>
                            <Button variant="outlined" onClick={() => setEmptyPositionsModal(false)} sx={{ color: colors.textDim, borderColor: colors.border, borderRadius: 2 }}>
                                Cerrar
                            </Button>
                        </Box>
                    </Paper>
                </Modal>
            )}

            {/* Subdialogs */}
            <CreateItemDialog open={createItemModal} onClose={() => setCreateItemModal(false)} onSuccess={(item: any) => { setQaItem(item.id); setCreateItemModal(false); }} depositoId={qaDepot} />
            <CreatePartnerDialog open={createPartnerModal} onClose={() => setCreatePartnerModal(false)} onSuccess={(supplier: any) => { setQaSupplier(supplier.id); setCreatePartnerModal(false); }} defaultType="SUPPLIER" />
        </Box>
    );
}
