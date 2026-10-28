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
    TableBody,
    Snackbar,
    Alert,
    Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CategoryIcon from '@mui/icons-material/Category';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DeleteIcon from '@mui/icons-material/Delete';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import { 
    useGetStockQuery, 
    useQuickAddStockMutation, 
    useDeleteStockMutation,
    useAdjustStockMutation,
    useReassignBatchMutation,
    useLazyCheckBatchQuery,
    useUpdateBatchObservationsMutation,
    useMoveStockMutation,
} from '../../features/warehouse/stock/api/stock.api';
import { useDespachoDirectoMutation } from '../../features/warehouse/remitosSalida/api/remitos-salida.api';
import { useSearchParams } from 'react-router-dom';
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
    secondary: 'var(--text-mui-secondary, #475569)', // Slate
    bg: 'var(--bg-primary, #0f1117)',
    cardBg: 'var(--bg-hover-row, rgba(255,255,255,0.03))',
    border: 'rgba(255, 255, 255, 0.08)',
    text: 'var(--text-primary, #f3f4f6)',
    textDim: 'var(--text-muted, #9ca3af)',
    danger: '#ef4444',
    success: '#10b981',
    info: '#3b82f6',
    inputBg: 'var(--bg-action-btn, rgba(255,255,255,0.05))'
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

export default function DashboardDepositoPage() {
    const user = useSelector(selectCurrentUser);
    const allowedDepots = useSelector(selectAllowedDepots);
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    const isMobile = useIsMobile();

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

    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => {
        const active = rawDepots.filter((d: any) => d.activo !== false);
        if (!allowedDepots) return active;
        return active.filter((d: any) => allowedDepots.includes(d.id));
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

    // Movimiento Rápido state
    const [moveStockMutation, { isLoading: isMovingStock }] = useMoveStockMutation();
    const [moveModal, setMoveModal] = useState(false);
    const [moveEntry, setMoveEntry] = useState<any>(null);
    const [moveDestDepot, setMoveDestDepot] = useState<string>('');
    const [moveDestPos, setMoveDestPos] = useState<string>('');
    const [moveCajas, setMoveCajas] = useState<string>('');
    const [moveKilos, setMoveKilos] = useState<string>('');
    const [isManualKilosEdited, setIsManualKilosEdited] = useState<boolean>(false);
    const [moveSuccessToast, setMoveSuccessToast] = useState<string | null>(null);

    const getKilosPorCajaRatio = (entry: any) => {
        if (!entry) return null;
        const itemKpc = entry.batch?.item?.kilosPorCaja;
        if (itemKpc != null && Number(itemKpc) > 0) return Number(itemKpc);
        const sec = Number(entry.qtySecundaria);
        const princ = Number(entry.qtyPrincipal);
        if (sec > 0 && princ > 0) return princ / sec;
        return null;
    };

    const openQuickMove = (entry: any) => {
        setMoveEntry(entry);
        const entryDepot = entry.depositoId || depotId;
        setMoveDestDepot(entryDepot);
        setMoveDestPos('');
        setMoveCajas('');
        setMoveKilos('');
        setIsManualKilosEdited(false);
        setMoveModal(true);
    };

    const handleCajasChange = (valStr: string) => {
        setMoveCajas(valStr);
        const cajasNum = parseFloat(valStr.replace(',', '.'));
        if (!isNaN(cajasNum) && cajasNum > 0 && moveEntry) {
            const ratio = getKilosPorCajaRatio(moveEntry);
            const maxSec = Number(moveEntry.qtySecundaria || 0);
            const maxPrinc = Number(moveEntry.qtyPrincipal || 0);

            if (maxSec > 0 && Math.abs(cajasNum - maxSec) < 0.001) {
                setMoveKilos(String(maxPrinc));
            } else if (ratio != null) {
                const calculated = Math.round(cajasNum * ratio * 100) / 100;
                const capped = maxPrinc > 0 ? Math.min(calculated, maxPrinc) : calculated;
                setMoveKilos(String(capped));
            }
            setIsManualKilosEdited(false);
        } else if (!valStr.trim() && !isManualKilosEdited) {
            setMoveKilos('');
        }
    };

    const handleKilosChange = (valStr: string) => {
        setMoveKilos(valStr);
        setIsManualKilosEdited(true);
    };

    const handleMoveAll = () => {
        if (!moveEntry) return;
        const maxSec = moveEntry.qtySecundaria ? String(moveEntry.qtySecundaria) : '';
        setMoveCajas(maxSec);
        setMoveKilos(String(moveEntry.qtyPrincipal));
        setIsManualKilosEdited(true);
    };

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

    const destPositions = useMemo(() => {
        if (!moveDestDepot) return [];
        const targetDepot = depots.find((d: any) => d.id === moveDestDepot);
        if (!targetDepot || !targetDepot.positions) return [];
        const occupiedIds = new Set(rawStock.map((s: any) => s.posicionId).filter(Boolean));
        return targetDepot.positions
            .filter((p: any) => p.activo && p.id !== moveEntry?.posicionId)
            .map((p: any) => ({
                ...p,
                isOccupied: occupiedIds.has(p.id),
                label: `${p.codigo}${!occupiedIds.has(p.id) ? ' (Vacía)' : ''}`
            }));
    }, [depots, moveDestDepot, moveEntry, rawStock]);

    const handleConfirmMove = async () => {
        if (!moveEntry || !moveDestDepot || !moveDestPos) {
            alert('Por favor seleccioná una posición de destino.');
            return;
        }
        const kilos = parseFloat(String(moveKilos).replace(',', '.'));
        if (isNaN(kilos) || kilos <= 0) {
            alert('Ingresá una cantidad de kilos válida.');
            return;
        }
        const maxKilos = Number(moveEntry.qtyPrincipal);
        if (kilos > maxKilos + 0.001) {
            alert(`No podés mover más de los ${maxKilos} disponibles.`);
            return;
        }
        const cajas = moveCajas ? parseFloat(String(moveCajas).replace(',', '.')) : null;
        if (cajas !== null && !isNaN(cajas)) {
            const maxCajas = Number(moveEntry.qtySecundaria || 0);
            if (maxCajas > 0 && cajas > maxCajas) {
                alert(`No podés mover más de las ${maxCajas} cajas disponibles.`);
                return;
            }
        }

        try {
            await moveStockMutation({
                depositoId: moveDestDepot,
                posicionIdOrigen: moveEntry.posicionId,
                posicionIdDestino: moveDestPos,
                itemId: moveEntry.batch?.item?.id || moveEntry.itemId,
                lotId: moveEntry.lotId || moveEntry.batch?.id,
                qtyPrincipal: kilos,
                qtySecundaria: cajas && !isNaN(cajas) ? cajas : null,
                fecha: new Date().toISOString(),
            }).unwrap();

            const destPosName = destPositions.find((p: any) => p.id === moveDestPos)?.codigo || 'la nueva posición';
            setMoveSuccessToast(`✅ Movimiento completado: ${kilos} kg a ${destPosName}`);
            setMoveModal(false);
            setMoveEntry(null);
        } catch (err: any) {
            alert(err?.data?.message || err?.message || 'Error al realizar el movimiento');
        }
    };

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
                    <Typography variant="h5" sx={{ fontWeight: 900, color: colors.text, letterSpacing: '-0.5px' }}>Centro de Comando de Depósito</Typography>
                    <Typography variant="caption" sx={{ color: colors.textDim }}>Control operativo de stock, ubicaciones y movimientos en tiempo real</Typography>
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
                        sx={{ flex: '1 1 200px', '& .MuiInputLabel-root': { color: colors.textDim }, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
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
                        sx={{ flex: '2 1 300px', '& .MuiInputLabel-root': { color: colors.textDim }, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                    />

                    <Autocomplete
                        options={(depotId && depots.find((d: any) => d.id === depotId)?.positions || []).filter((p: any) => p.activo)}
                        getOptionLabel={(option: any) => option.codigo || ''}
                        value={(depotId && depots.find((d: any) => d.id === depotId)?.positions || []).find((p: any) => p.id === positionId) || null}
                        onChange={(_e, val: any) => setPositionId(val?.id || '')}
                        disabled={!depotId}
                        size="small"
                        sx={{ flex: '1 1 200px', '& .MuiInputLabel-root': { color: colors.textDim }, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                        renderInput={(params) => <TextField {...params} label="Posición" />}
                    />

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
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                                {groupedData.map((group: any) => {
                                    const categoryName = group.item.category?.nombre || group.item.categoria || 'General';
                                    const codeText = group.item.codigoInterno;

                                    return (
                                        <div 
                                            key={group.item.id} 
                                            className="material-card-hover"
                                            style={{ 
                                                background: colors.cardBg, 
                                                border: `1px solid ${colors.border}`, 
                                                borderRadius: '14px', 
                                                padding: '16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                gap: '12px',
                                                transition: 'all 0.15s ease-in-out',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => setDetailGroupId(group.item.id)}
                                        >
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                    <div>
                                                        <span style={{ color: colors.primary, fontWeight: 800, fontSize: '11px', letterSpacing: '0.5px' }}>{codeText}</span>
                                                        <div style={{ fontWeight: 800, color: 'var(--text-white-dynamic, #fff)', fontSize: '15px', lineHeight: 1.25, marginTop: '2px' }}>{group.item.descripcion}</div>
                                                    </div>
                                                    <Chip 
                                                        icon={<CategoryIcon style={{ fontSize: 13, color: colors.textDim }} />} 
                                                        label={categoryName} 
                                                        size="small" 
                                                        sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: colors.textDim, fontSize: '0.7rem', fontWeight: 700, height: '24px' }}
                                                    />
                                                </div>
                                                
                                                {group.supplier?.name && (
                                                    <div style={{ color: colors.textDim, fontSize: '11px', marginBottom: '8px' }}>
                                                        Prov: <span style={{ color: 'var(--text-white-dynamic, #fff)', fontWeight: 600 }}>{group.supplier.name}</span>
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '12px', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                                                    <div>
                                                        <div style={{ fontSize: '10px', color: colors.textDim, fontWeight: 700, textTransform: 'uppercase' }}>Stock Total</div>
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                            <span style={{ fontSize: '22px', fontWeight: 900, color: colors.primary }}>
                                                                {group.metrics.kilos.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                            </span>
                                                            <span style={{ fontSize: '12px', color: colors.textDim, fontWeight: 700 }}>{group.item.unidadPrincipal || 'kg'}</span>
                                                        </div>
                                                    </div>
                                                    {group.metrics.units > 0 && (
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '10px', color: colors.textDim, fontWeight: 700, textTransform: 'uppercase' }}>Bultos / Unidades</div>
                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: 'flex-end' }}>
                                                                <span style={{ fontSize: '18px', fontWeight: 800, color: colors.success }}>
                                                                    {group.metrics.units.toLocaleString('es-AR')}
                                                                </span>
                                                                <span style={{ fontSize: '11px', color: colors.textDim, fontWeight: 700 }}>{group.item.unidadSecundaria || 'un'}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: `1px solid ${colors.border}`, marginTop: '4px' }}>
                                                <div style={{ color: colors.info, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                                                    <LocationOnIcon style={{ fontSize: 14 }} /> {group.entries.length} {group.entries.length === 1 ? 'ubicación' : 'ubicaciones'}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.primary, fontSize: '12px', fontWeight: 800 }}>
                                                    Ver y Mover <ArrowForwardIcon style={{ fontSize: 14 }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: '12px', overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead style={{ background: 'var(--bg-alt-row, rgba(0,0,0,0.2))' }}>
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
                                                    <td style={{ padding: '12px 16px' }}><span style={{ fontWeight: 800, color: 'var(--text-white-dynamic, #fff)' }}>{group.item.descripcion}</span></td>
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
                            background-color: var(--bg-alt-row, rgba(255,255,255,0.02)) !important;
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
                            InputProps={{ sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
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
                            InputProps={{ sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
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
                            renderInput={(params) => <TextField {...params} label="Proveedor" InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }} />} 
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
                            renderInput={(params) => <TextField {...params} label="Material" InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }} />} 
                        />
                        <Button variant="outlined" sx={{ color: colors.primary, borderColor: colors.primary, height: '40px', minWidth: '40px', p: 0, borderRadius: 2 }} onClick={() => setCreateItemModal(true)}>+</Button>
                    </Box>

                    <TextField 
                        label="Número de Lote" 
                        fullWidth 
                        value={qaLot} 
                        onChange={(e) => setQaLot(e.target.value)} 
                        InputLabelProps={{ sx: { color: colors.textDim } }} 
                        InputProps={{ sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }} 
                    />

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField 
                            label={`Kilos (${qaSelectedItem?.unidadPrincipal || 'kg'})`} 
                            type="number" 
                            fullWidth 
                            value={qaPrincipal} 
                            onChange={(e) => setQaPrincipal(e.target.value)} 
                            InputLabelProps={{ sx: { color: colors.textDim } }} 
                            InputProps={{ sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }} 
                        />
                        <TextField 
                            label={`Unidades (${qaSelectedItem?.unidadSecundaria || 'un'})`} 
                            type="number" 
                            fullWidth 
                            value={qaSecundaria} 
                            onChange={(e) => setQaSecundaria(e.target.value)} 
                            InputLabelProps={{ sx: { color: colors.textDim } }} 
                            InputProps={{ sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }} 
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

            {/* Detail Modal for Material (List & Grid View) */}
            {detailGroup && (
                <Modal 
                    open={!!detailGroupId} 
                    onClose={() => setDetailGroupId(null)}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Paper sx={{ width: '92%', maxWidth: 850, bgcolor: colors.bg, border: `1px solid ${colors.primary}`, borderRadius: 4, p: 3, outline: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box>
                                <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 800, letterSpacing: '0.5px' }}>
                                    {detailGroup.item.codigoInterno}
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 900, color: 'var(--text-white-dynamic, #fff)', lineHeight: 1.2 }}>
                                    {detailGroup.item.descripcion}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5, alignItems: 'center' }}>
                                    <Typography variant="caption" sx={{ color: colors.textDim }}>
                                        Proveedor: <strong>{detailGroup.supplier?.name || 'Sin proveedor'}</strong>
                                    </Typography>
                                    <span style={{ color: colors.textDim }}>&middot;</span>
                                    <Typography variant="caption" sx={{ color: colors.textDim }}>
                                        Categoría: <strong>{detailGroup.item.category?.nombre || detailGroup.item.categoria || 'General'}</strong>
                                    </Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip 
                                    label={`Total: ${detailGroup.metrics.kilos.toLocaleString('es-AR', { minimumFractionDigits: 1 })} ${detailGroup.item.unidadPrincipal || 'kg'}`}
                                    sx={{ bgcolor: `${colors.primary}20`, color: colors.primary, fontWeight: 800, fontSize: '0.8rem' }}
                                />
                                {detailGroup.metrics.units > 0 && (
                                    <Chip 
                                        label={`${detailGroup.metrics.units.toLocaleString('es-AR')} ${detailGroup.item.unidadSecundaria || 'un'}`}
                                        sx={{ bgcolor: `${colors.success}20`, color: colors.success, fontWeight: 800, fontSize: '0.8rem' }}
                                    />
                                )}
                                <IconButton onClick={() => setDetailGroupId(null)} sx={{ color: colors.textDim, ml: 1 }}><CloseIcon /></IconButton>
                            </Box>
                        </Box>
                        
                        <TableContainer sx={{ maxHeight: 450, overflowY: 'auto', border: `1px solid ${colors.border}`, borderRadius: 2 }}>
                            <MuiTable size="small">
                                <TableHead sx={{ bgcolor: 'var(--bg-alt-row, rgba(0,0,0,0.2))' }}>
                                    <TableRow sx={{ '& th': { color: colors.textDim, fontWeight: 800 } }}>
                                        <TableCell>Ubicación</TableCell>
                                        <TableCell>Lote</TableCell>
                                        <TableCell align="right">Kilos</TableCell>
                                        <TableCell align="right">Bultos / Unidades</TableCell>
                                        <TableCell align="center">Acciones</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {detailGroup.entries.map((entry: any) => {
                                        const isOldest = entry.batch.lotNumber === detailGroup.minLotNumber;
                                        const isDeleting = deletingKeys.includes(getEntryKey(entry));
                                        return (
                                            <TableRow key={entry.id} sx={{ opacity: isDeleting ? 0.5 : 1, '& td': { color: 'var(--text-white-dynamic, #fff)', py: 1.2 } }}>
                                                <TableCell>
                                                    <Tooltip title="Toca para mover stock desde esta posición">
                                                        <Chip 
                                                            icon={<LocationOnIcon style={{ fontSize: 14, color: colors.info }} />}
                                                            label={entry.posicion?.codigo || 'S/P'}
                                                            onClick={() => openQuickMove(entry)}
                                                            clickable
                                                            sx={{ 
                                                                bgcolor: 'rgba(59, 130, 246, 0.12)', 
                                                                color: colors.info, 
                                                                fontWeight: 800, 
                                                                fontSize: '0.8rem',
                                                                border: `1px solid rgba(59, 130, 246, 0.3)`,
                                                                cursor: 'pointer',
                                                                '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.25)', transform: 'scale(1.02)' }
                                                            }}
                                                        />
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Typography 
                                                            variant="body2" 
                                                            onClick={() => inlineEditLot(entry, entry.batch?.lotNumber || '')}
                                                            sx={{ 
                                                                cursor: 'pointer', 
                                                                textDecoration: 'underline dashed',
                                                                color: isOldest ? colors.primary : 'var(--text-white-dynamic, #fff)',
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
                                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center' }}>
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            startIcon={<SwapHorizIcon />}
                                                            onClick={() => openQuickMove(entry)}
                                                            sx={{ 
                                                                bgcolor: colors.info, 
                                                                color: '#fff', 
                                                                fontWeight: 800, 
                                                                fontSize: '0.72rem', 
                                                                textTransform: 'none', 
                                                                borderRadius: 1.5,
                                                                py: 0.4,
                                                                px: 1.2,
                                                                '&:hover': { bgcolor: '#2563eb' }
                                                            }}
                                                        >
                                                            Mover
                                                        </Button>
                                                        <IconButton size="small" onClick={() => openDespacho(entry)} sx={{ color: colors.textDim, '&:hover': { color: colors.primary } }} title="Despachar">
                                                            <LocalShippingIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                        {isAdmin && (
                                                            <IconButton size="small" onClick={() => handleDeleteLine(entry)} sx={{ color: colors.textDim, '&:hover': { color: colors.danger } }} title="Eliminar">
                                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                                            </IconButton>
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

            {/* Quick Move Modal */}
            {moveModal && moveEntry && (
                <Modal
                    open={moveModal}
                    onClose={() => { if (!isMovingStock) { setMoveModal(false); setMoveEntry(null); } }}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Paper sx={{ 
                        width: '92%', 
                        maxWidth: 520, 
                        bgcolor: colors.bg, 
                        border: `1px solid ${colors.info}`, 
                        borderRadius: 4, 
                        p: 3, 
                        outline: 'none', 
                        boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
                        maxHeight: '92vh',
                        overflowY: 'auto'
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SwapHorizIcon sx={{ color: colors.info, fontSize: '1.6rem' }} />
                                <Typography variant="h6" sx={{ fontWeight: 900, color: 'var(--text-white-dynamic, #fff)' }}>
                                    Mover de Ubicación
                                </Typography>
                            </Box>
                            <IconButton onClick={() => { setMoveModal(false); setMoveEntry(null); }} sx={{ color: colors.textDim }}>
                                <CloseIcon />
                            </IconButton>
                        </Box>

                        {/* Detalle del origen */}
                        <Box sx={{ p: 2, bgcolor: 'var(--bg-alt-row, rgba(255,255,255,0.03))', borderRadius: 3, border: `1px solid ${colors.border}`, mb: 2.5 }}>
                            <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 800, letterSpacing: '0.5px' }}>
                                {moveEntry.batch?.item?.codigoInterno}
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-white-dynamic, #fff)', lineHeight: 1.25, mb: 1 }}>
                                {moveEntry.batch?.item?.descripcion}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 1 }}>
                                <Chip 
                                    size="small" 
                                    label={`📍 Origen: ${moveEntry.posicion?.codigo || 'S/P'}`}
                                    sx={{ bgcolor: 'rgba(59, 130, 246, 0.15)', color: colors.info, fontWeight: 800 }}
                                />
                                <Chip 
                                    size="small" 
                                    label={`Lote: ${moveEntry.batch?.lotNumber}`}
                                    sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'var(--text-white-dynamic, #fff)', fontWeight: 700 }}
                                />
                                <Chip 
                                    size="small" 
                                    label={`Disponible: ${moveEntry.qtyPrincipal} ${moveEntry.batch?.item?.unidadPrincipal || 'kg'}${moveEntry.qtySecundaria ? ` (${moveEntry.qtySecundaria} ${moveEntry.batch?.item?.unidadSecundaria || 'cajas'})` : ''}`}
                                    sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: colors.success, fontWeight: 800 }}
                                />
                            </Box>
                        </Box>

                        {/* Destino */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2.5 }}>
                            <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                                1. ¿A qué posición lo querés mover?
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                {depots.length > 1 && (
                                    <TextField
                                        select
                                        label="Depósito Destino"
                                        size="small"
                                        value={moveDestDepot}
                                        onChange={(e) => { setMoveDestDepot(e.target.value); setMoveDestPos(''); }}
                                        sx={{ flex: '1 1 180px', '& .MuiInputLabel-root': { color: colors.textDim }, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                    >
                                        {depots.map((d: any) => (
                                            <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
                                        ))}
                                    </TextField>
                                )}

                                <Autocomplete
                                    options={destPositions}
                                    getOptionLabel={(option: any) => option.label || option.codigo || ''}
                                    value={destPositions.find((p: any) => p.id === moveDestPos) || null}
                                    onChange={(_e, val: any) => setMoveDestPos(val?.id || '')}
                                    size="small"
                                    sx={{ flex: '2 1 220px', '& .MuiInputLabel-root': { color: colors.textDim }, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                    renderInput={(params) => <TextField {...params} label="Posición Destino *" placeholder="Escribí código de ubicación..." />}
                                />
                            </Box>
                        </Box>

                        {/* Cantidades */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                                    2. ¿Cuánto querés mover?
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<FlashOnIcon sx={{ fontSize: 14 }} />}
                                    onClick={handleMoveAll}
                                    sx={{ color: colors.primary, fontWeight: 800, fontSize: '0.72rem', textTransform: 'none', p: 0.5 }}
                                >
                                    Mover Todo el Pallet
                                </Button>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                {/* Cajas / Unidad Secundaria */}
                                <TextField
                                    label={`Cajas (${moveEntry.batch?.item?.unidadSecundaria || 'Cajas'})`}
                                    type="number"
                                    size="small"
                                    fullWidth
                                    placeholder={moveEntry.qtySecundaria ? `Disp: ${moveEntry.qtySecundaria}` : '0'}
                                    value={moveCajas}
                                    onChange={(e) => handleCajasChange(e.target.value)}
                                    InputLabelProps={{ shrink: true, sx: { color: colors.textDim } }}
                                    InputProps={{ sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                />

                                {/* Kilos / Unidad Principal */}
                                <TextField
                                    label={`Kilos * (${moveEntry.batch?.item?.unidadPrincipal || 'kg'})`}
                                    type="number"
                                    size="small"
                                    fullWidth
                                    placeholder={`Disp: ${moveEntry.qtyPrincipal}`}
                                    value={moveKilos}
                                    onChange={(e) => handleKilosChange(e.target.value)}
                                    InputLabelProps={{ shrink: true, sx: { color: colors.textDim } }}
                                    InputProps={{ sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                />
                            </Box>

                            {/* Recomendación de equivalencia de kilos */}
                            {(() => {
                                const ratio = getKilosPorCajaRatio(moveEntry);
                                const cajasNum = parseFloat(moveCajas.replace(',', '.'));
                                if (ratio && !isNaN(cajasNum) && cajasNum > 0) {
                                    return (
                                        <Box sx={{ p: 1.2, bgcolor: 'rgba(59, 130, 246, 0.08)', border: `1px dashed rgba(59, 130, 246, 0.3)`, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="caption" sx={{ color: colors.info, fontSize: '0.74rem' }}>
                                                💡 Estimado: <strong>~{ratio.toFixed(2)} kg/caja</strong>. Podés editar los kilos si el peso real difiere.
                                            </Typography>
                                            {isManualKilosEdited && (
                                                <Button 
                                                    size="small" 
                                                    onClick={() => handleCajasChange(moveCajas)} 
                                                    sx={{ fontSize: '0.68rem', color: colors.info, textTransform: 'none', p: 0.2, minWidth: 'auto', ml: 1 }}
                                                >
                                                    Recalcular
                                                </Button>
                                            )}
                                        </Box>
                                    );
                                }
                                return null;
                            })()}
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3, borderTop: `1px solid ${colors.border}`, pt: 2 }}>
                            <Button 
                                variant="text" 
                                disabled={isMovingStock}
                                onClick={() => { setMoveModal(false); setMoveEntry(null); }} 
                                sx={{ color: colors.textDim }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="contained"
                                disabled={isMovingStock || !moveDestPos || !moveKilos || parseFloat(moveKilos) <= 0}
                                onClick={handleConfirmMove}
                                startIcon={isMovingStock ? <CircularProgress size={18} color="inherit" /> : <SwapHorizIcon />}
                                sx={{ 
                                    bgcolor: colors.info, 
                                    color: '#fff', 
                                    fontWeight: 800, 
                                    borderRadius: 2, 
                                    px: 3,
                                    '&:hover': { bgcolor: '#2563eb' } 
                                }}
                            >
                                {isMovingStock ? 'Moviendo...' : 'Confirmar Movimiento'}
                            </Button>
                        </Box>
                    </Paper>
                </Modal>
            )}

            {/* Toast feedback */}
            <Snackbar
                open={!!moveSuccessToast}
                autoHideDuration={4000}
                onClose={() => setMoveSuccessToast(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setMoveSuccessToast(null)} severity="success" sx={{ bgcolor: '#064e3b', color: '#ecfdf5', fontWeight: 700, borderRadius: 2, border: `1px solid #059669` }}>
                    {moveSuccessToast}
                </Alert>
            </Snackbar>

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
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
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
                                renderInput={(params) => <TextField {...params} label="Cliente" InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }} />}
                            />

                            {despachoNewClient && isAdmin && (
                                <TextField 
                                    label="Nombre del nuevo cliente" 
                                    fullWidth 
                                    value={despachoClientName} 
                                    onChange={(e) => setDespachoClientName(e.target.value)} 
                                    InputLabelProps={{ sx: { color: colors.textDim } }} 
                                    InputProps={{ sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }} 
                                />
                            )}

                            <TextField 
                                label="Fecha" 
                                type="date" 
                                fullWidth 
                                value={despachoFecha} 
                                onChange={(e) => setDespachoFecha(e.target.value)} 
                                InputLabelProps={{ shrink: true, sx: { color: colors.textDim } }} 
                                InputProps={{ sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }} 
                            />

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField 
                                    label={`Cantidad (${despachoEntry.batch.item.unidadPrincipal})`} 
                                    type="number" 
                                    fullWidth 
                                    value={despachoQty} 
                                    onChange={(e) => setDespachoQty(e.target.value)} 
                                    InputLabelProps={{ sx: { color: colors.textDim } }} 
                                    InputProps={{ sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }} 
                                />
                                {despachoEntry.batch.item.unidadSecundaria && (
                                    <TextField 
                                        label={`Secundaria (${despachoEntry.batch.item.unidadSecundaria})`} 
                                        type="number" 
                                        fullWidth 
                                        value={despachoQtySec} 
                                        onChange={(e) => setDespachoQtySec(e.target.value)} 
                                        InputLabelProps={{ sx: { color: colors.textDim } }} 
                                        InputProps={{ sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }} 
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
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: '300px', overflowY: 'auto', p: 1, bgcolor: 'var(--bg-alt-row, rgba(0,0,0,0.2))', borderRadius: 2 }}>
                            {emptyPositions.length === 0 ? (
                                <Typography variant="body2" sx={{ color: colors.textDim, p: 2 }}>No hay posiciones vacías en este depósito.</Typography>
                            ) : (
                                emptyPositions.map((p: any) => (
                                    <Box 
                                        key={p.id} 
                                        sx={{ 
                                            px: 1.5, 
                                            py: 0.5, 
                                            bgcolor: 'var(--bg-action-btn, rgba(255,255,255,0.05))', 
                                            border: `1px solid ${colors.border}`, 
                                            borderRadius: 2, 
                                            color: 'var(--text-white-dynamic, #fff)', 
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
