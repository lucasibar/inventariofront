import { useState, useMemo, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    IconButton, 
    TextField, 
    Button,
    Drawer,
    Dialog,
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
    Chip,
    Fab,
    Checkbox,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

import { 
    useGetStockQuery, 
    useQuickAddStockMutation, 
    useDeleteStockMutation,
    useAdjustStockMutation,
    useReassignBatchMutation,
    useLazyCheckBatchQuery,
    useUpdateBatchObservationsMutation,
    useMoveStockMutation,
    useBulkMoveStockMutation,
} from '../../features/warehouse/stock/api/stock.api';
import { useDespachoDirectoMutation } from '../../features/warehouse/remitosSalida/api/remitos-salida.api';
import { useSearchParams } from 'react-router-dom';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { useGetItemsQuery, useGetItemCategoriesQuery } from '../../features/warehouse/materiales/api/items.api';
import { useGetPartnersQuery } from '../../features/config/partners/api/partners.api';
import { CreateItemDialog } from '../../features/warehouse/materiales/components/CreateItemDialog';
import { CreatePartnerDialog } from '../../features/config/CreatePartnerDialog';
import { PositionActionSheet } from '../../features/warehouse/stock/ui/PositionActionSheet';
import { AdjustStockDialog } from '../../features/warehouse/stock/ui/AdjustStockDialog';
import { EditLotDialog } from '../../features/warehouse/stock/ui/EditLotDialog';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectAllowedDepots } from '../../entities/auth/model/authSlice';
import { useIsMobile } from '../../shared/ui';
import { PaginationControls, useClientPagination } from '../../shared/pagination';

// Sistema de colores consistente
const colors = {
    primary: '#f59e0b', // Amber para llamadas a la acción
    bg: 'var(--bg-primary, #0f1117)',
    cardBg: 'var(--bg-hover-row, rgba(255,255,255,0.03))',
    border: 'rgba(255, 255, 255, 0.08)',
    text: 'var(--text-primary, #f3f4f6)',
    textDim: 'var(--text-muted, #9ca3af)',
    danger: '#ef4444',
    success: '#10b981',
    info: '#38bdf8',
    inputBg: 'var(--bg-action-btn, rgba(255,255,255,0.05))'
};

const normalizeText = (text: string) =>
    (text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const getLocalDateString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const local = new Date(now.getTime() - offset);
    return local.toISOString().split('T')[0];
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

function DebouncedSearchInput({ value, onChange, delay = 250, ...props }: DebouncedSearchInputProps) {
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

    // Vista Grilla vs Lista
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        return (sessionStorage.getItem('stockViewMode') as 'grid' | 'list') || (isMobile ? 'list' : 'grid');
    });

    useEffect(() => {
        sessionStorage.setItem('stockViewMode', viewMode);
    }, [viewMode]);

    const [depotId, setDepotId] = useState<string>(() => sessionStorage.getItem('selectedDepotId') || '');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [deletingKeys, setDeletingKeys] = useState<string[]>([]);
    const [detailGroupId, setDetailGroupId] = useState<string | null>(null);
    const [emptyPositionsModal, setEmptyPositionsModal] = useState<boolean>(false);
    const [editItemTarget, setEditItemTarget] = useState<any | null>(null);

    const [searchParams, setSearchParams] = useSearchParams();
    
    useEffect(() => {
        if (depotId) sessionStorage.setItem('selectedDepotId', depotId);
    }, [depotId]);

    // Búsqueda desde URL
    useEffect(() => {
        const q = searchParams.get('q');
        if (q) setSearchTerm(q);
    }, [searchParams]);

    // Quick Add desde URL
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

    // Modales de adición rápida
    const [quickAddStock, { isLoading: isQuickAdding }] = useQuickAddStockMutation();
    const [deleteStock] = useDeleteStockMutation();
    const [quickAddModal, setQuickAddModal] = useState(false);
    const [qaDepot, setQaDepot] = useState('');
    const [qaPosition, setQaPosition] = useState('');
    const [qaItem, setQaItem] = useState('');
    const [qaSupplier, setQaSupplier] = useState('');
    const [qaLot, setQaLot] = useState('');
    const [qaPrincipal, setQaPrincipal] = useState('');
    const [qaSecundaria, setQaSecundaria] = useState('');

    useEffect(() => {
        if (quickAddModal && depotId && !qaDepot) {
            setQaDepot(depotId);
        }
    }, [quickAddModal, depotId, qaDepot]);

    const [createItemModal, setCreateItemModal] = useState(false);
    const [createPartnerModal, setCreatePartnerModal] = useState(false);

    // Mutaciones Stock
    const [adjustStock] = useAdjustStockMutation();
    const [reassignBatch] = useReassignBatchMutation();
    const [checkBatch] = useLazyCheckBatchQuery();
    const [updateBatchObservations] = useUpdateBatchObservationsMutation();
    const [despachoDirecto] = useDespachoDirectoMutation();

    // Modales unificados
    const [actionSheetEntry, setActionSheetEntry] = useState<any | null>(null);
    const [adjustStockEntry, setAdjustStockEntry] = useState<any | null>(null);
    const [editLotEntry, setEditLotEntry] = useState<any | null>(null);
    const [obsModal, setObsModal] = useState({ open: false, batchId: '', text: '' });
    const [obsSaving, setObsSaving] = useState(false);

    // Movimiento Rápido / Pallet Completo state
    const [moveStockMutation] = useMoveStockMutation();
    const [bulkMoveStockMutation, { isLoading: isMovingStock }] = useBulkMoveStockMutation();
    const [moveModal, setMoveModal] = useState(false);
    const [moveEntry, setMoveEntry] = useState<any>(null);
    const [moveDestDepot, setMoveDestDepot] = useState<string>('');
    const [moveDestPos, setMoveDestPos] = useState<string>('');
    const [moveItemsState, setMoveItemsState] = useState<Record<string, { selected: boolean; kilos: string; cajas: string; isManualKilos: boolean }>>({});
    const [feedbackToast, setFeedbackToast] = useState<{ msg: string; severity: 'success' | 'info' | 'error' } | null>(null);

    // Exclusión dinámica de materiales de los cómputos de métricas (ojito)
    const [excludedItemIds, setExcludedItemIds] = useState<Record<string, boolean>>({});

    const toggleItemInclusion = (e: React.MouseEvent, itemId: string) => {
        e.stopPropagation();
        setExcludedItemIds(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    const handleIncludeAll = () => {
        setExcludedItemIds({});
    };

    const excludedCount = useMemo(() => {
        return Object.values(excludedItemIds).filter(Boolean).length;
    }, [excludedItemIds]);

    const getKilosPorCajaRatio = (entry: any) => {
        if (!entry) return null;
        const itemKpc = entry.batch?.item?.kilosPorCaja;
        if (itemKpc != null && Number(itemKpc) > 0) return Number(itemKpc);
        const sec = Number(entry.qtySecundaria);
        const princ = Number(entry.qtyPrincipal);
        if (sec > 0 && princ > 0) return princ / sec;
        return null;
    };

    const handleLineCajasChange = (entry: any, valStr: string) => {
        const cajasNum = parseFloat(valStr.replace(',', '.'));
        const maxSec = Number(entry.qtySecundaria || 0);
        const maxPrinc = Number(entry.qtyPrincipal || 0);
        const ratio = getKilosPorCajaRatio(entry);

        let calculatedKilos = moveItemsState[entry.id]?.kilos || '';

        if (!isNaN(cajasNum) && cajasNum > 0) {
            if (maxSec > 0 && Math.abs(cajasNum - maxSec) < 0.001) {
                calculatedKilos = String(maxPrinc);
            } else if (ratio != null) {
                const calculated = Math.round(cajasNum * ratio * 100) / 100;
                const capped = maxPrinc > 0 ? Math.min(calculated, maxPrinc) : calculated;
                calculatedKilos = String(capped);
            }
        } else if (!valStr.trim() && !moveItemsState[entry.id]?.isManualKilos) {
            calculatedKilos = '';
        }

        setMoveItemsState(prev => ({
            ...prev,
            [entry.id]: {
                ...prev[entry.id],
                cajas: valStr,
                kilos: calculatedKilos,
                isManualKilos: false
            }
        }));
    };

    const handleLineKilosChange = (entryId: string, valStr: string) => {
        setMoveItemsState(prev => ({
            ...prev,
            [entryId]: {
                ...prev[entryId],
                kilos: valStr,
                isManualKilos: true
            }
        }));
    };

    const handleLineToggle = (entryId: string) => {
        setMoveItemsState(prev => {
            const current = prev[entryId];
            const willBeSelected = !current?.selected;
            const originItem = originStockItems.find((s: any) => s.id === entryId);
            const defaultKilos = originItem ? String(originItem.qtyPrincipal || 0) : '0';
            const defaultCajas = originItem && originItem.qtySecundaria ? String(originItem.qtySecundaria) : '';

            return {
                ...prev,
                [entryId]: {
                    ...current,
                    selected: willBeSelected,
                    kilos: willBeSelected && (!current?.kilos || current.kilos === '0') ? defaultKilos : (current?.kilos || defaultKilos),
                    cajas: willBeSelected && !current?.cajas ? defaultCajas : (current?.cajas || defaultCajas),
                }
            };
        });
    };

    const handleSelectAllLines = (selectAll: boolean = true) => {
        const next: Record<string, any> = {};
        originStockItems.forEach((item: any) => {
            next[item.id] = {
                selected: selectAll,
                kilos: selectAll ? String(item.qtyPrincipal || 0) : '0',
                cajas: selectAll ? (item.qtySecundaria ? String(item.qtySecundaria) : '') : '',
                isManualKilos: false
            };
        });
        setMoveItemsState(next);
    };

    const openQuickMove = (entry: any) => {
        setMoveEntry(entry);
        const entryDepot = entry.depositoId || depotId;
        setMoveDestDepot(entryDepot);
        setMoveDestPos('');

        const pool = globalStock.length > 0 ? globalStock : rawStock;
        const positionItems = entry.posicionId 
            ? pool.filter((s: any) => s.posicionId === entry.posicionId && Number(s.qtyPrincipal) > 0)
            : [entry];
        const itemsToInit = positionItems.length > 0 ? positionItems : [entry];

        const initialMap: Record<string, { selected: boolean; kilos: string; cajas: string; isManualKilos: boolean }> = {};
        itemsToInit.forEach((item: any) => {
            const isTarget = item.id === entry.id;
            initialMap[item.id] = {
                selected: isTarget,
                kilos: String(item.qtyPrincipal || 0),
                cajas: item.qtySecundaria ? String(item.qtySecundaria) : '',
                isManualKilos: false
            };
        });
        setMoveItemsState(initialMap);
        setMoveModal(true);
    };

    // Despacho Directo state
    const [despachoModal, setDespachoModal] = useState(false);
    const [despachoEntry, setDespachoEntry] = useState<any>(null);
    const [despachoQty, setDespachoQty] = useState('');
    const [despachoQtySec, setDespachoQtySec] = useState('');
    const [despachoClient, setDespachoClient] = useState('');
    const [despachoClientName, setDespachoClientName] = useState('');
    const [despachoNewClient, setDespachoNewClient] = useState(false);
    const [despachoFecha, setDespachoFecha] = useState(getLocalDateString());
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
        setDespachoFecha(getLocalDateString());
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
            setFeedbackToast({ msg: `✅ Despachado con éxito. Remito: ${result.numero}`, severity: 'success' });
            setDespachoModal(false);
        } catch (e: any) {
            alert(e?.data?.message || 'Error al despachar');
        } finally {
            setDespachoSaving(false);
        }
    };

    // Ajuste de stock tipado (llamado desde AdjustStockDialog)
    const handleConfirmAdjustQty = async (entry: any, newPrincipal: number, newSecundaria: number | null) => {
        const currentP = Number(entry.qtyPrincipal || 0);
        const currentS = Number(entry.qtySecundaria || 0);
        const diffP = newPrincipal - currentP;
        const diffS = newSecundaria !== null ? newSecundaria - currentS : null;

        if (diffP === 0 && (diffS === null || diffS === 0)) return;

        try {
            await adjustStock({
                depositoId: entry.depositoId || depotId,
                posicionId: entry.posicionId,
                itemId: entry.batch.item.id,
                lotId: entry.lotId,
                qtyPrincipal: diffP,
                qtySecundaria: diffS,
                fecha: new Date().toISOString(),
                observaciones: `Ajuste manual: ${currentP} → ${newPrincipal} ${entry.batch.item.unidadPrincipal || 'kg'}`,
            }).unwrap();
            setFeedbackToast({ msg: '✅ Stock ajustado correctamente', severity: 'success' });
        } catch (e: any) {
            alert(e?.data?.message || 'Error al ajustar stock');
            throw e;
        }
    };

    // Reasignación de lote (llamado desde EditLotDialog)
    const handleConfirmReassignBatch = async (entry: any, newLotNumber: string) => {
        const entryDepotId = entry.depositoId || depotId;
        try {
            const result = await checkBatch({ itemId: entry.batch.item.id, lotNumber: newLotNumber, supplierId: entry.batch.supplier?.id }).unwrap();
            if (result.exists) {
                if (!window.confirm(`La partida "${newLotNumber}" ya existe. ¿Querés fusionar el stock con esa partida?`)) return;
            } else {
                if (!window.confirm(`La partida "${newLotNumber}" no existe aún. Se creará una nueva partida. ¿Continuar?`)) return;
            }
            await reassignBatch({
                depositoId: entryDepotId,
                posicionId: entry.posicionId,
                itemId: entry.batch.item.id,
                currentLotId: entry.lotId,
                newLotNumber: newLotNumber.trim(),
                fecha: new Date().toISOString(),
            }).unwrap();
            setFeedbackToast({ msg: `✅ Partida reasignada a "${newLotNumber}"`, severity: 'success' });
        } catch (e: any) {
            alert(e?.data?.message || 'Error al reasignar partida');
            throw e;
        }
    };

    const handleUpdateObs = async () => {
        setObsSaving(true);
        try {
            await updateBatchObservations({ id: obsModal.batchId, observaciones: obsModal.text }).unwrap();
            setFeedbackToast({ msg: '✅ Observación guardada', severity: 'success' });
            setObsModal({ open: false, batchId: '', text: '' });
        } catch (e: any) { 
            alert(e?.data?.message || 'Error al guardar observación'); 
        } finally {
            setObsSaving(false);
        }
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
            setFeedbackToast({ msg: '✅ Stock cargado correctamente', severity: 'success' });
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
            setFeedbackToast({ msg: 'Registro de stock eliminado', severity: 'info' });
        } catch (e: any) { 
            alert(e?.data?.message || 'Error al eliminar línea de stock'); 
            setDeletingKeys(prev => prev.filter(k => k !== key));
        }
    };

    // Consulta de stock del depósito seleccionado (para la tabla principal)
    const { data: rawStock = [], isLoading } = useGetStockQuery({ 
        depotId: depotId || undefined
    }, { skip: !depotId });

    // Consulta de stock global (sin filtro de depósito) para saber con certeza total la ocupación de cualquier posición de destino
    const { data: globalStock = [] } = useGetStockQuery({});

    const destPositions = useMemo(() => {
        if (!moveDestDepot) return [];
        const targetDepot = depots.find((d: any) => d.id === moveDestDepot);
        if (!targetDepot || !targetDepot.positions) return [];
        
        // Mapear ocupación usando globalStock
        const stockByPos: Record<string, any[]> = {};
        globalStock.forEach((s: any) => {
            if (s.posicionId && Number(s.qtyPrincipal) > 0) {
                if (!stockByPos[s.posicionId]) stockByPos[s.posicionId] = [];
                stockByPos[s.posicionId].push(s);
            }
        });

        return targetDepot.positions
            .filter((p: any) => p.activo && p.id !== moveEntry?.posicionId)
            .map((p: any) => {
                const currentStock = stockByPos[p.id] || [];
                const isOccupied = currentStock.length > 0;
                
                let contentsSummary = '';
                if (isOccupied) {
                    contentsSummary = currentStock.map((s: any) => {
                        const itemCode = s.batch?.item?.codigoInterno || '';
                        const itemDesc = s.batch?.item?.descripcion || '';
                        const lote = s.batch?.lotNumber ? `(L:${s.batch.lotNumber})` : '';
                        const kg = `${Number(s.qtyPrincipal).toFixed(1)} ${s.batch?.item?.unidadPrincipal || 'kg'}`;
                        const un = s.qtySecundaria ? ` / ${s.qtySecundaria} ${s.batch?.item?.unidadSecundaria || 'un'}` : '';
                        return `${itemCode ? `[${itemCode}] ` : ''}${itemDesc} ${lote} - ${kg}${un}`;
                    }).join(' | ');
                }

                return {
                    ...p,
                    isOccupied,
                    currentStock,
                    contentsSummary,
                    label: `${p.codigo} ${isOccupied ? `— [Ocupada: ${contentsSummary}]` : '— [Vacía]'}`
                };
            });
    }, [depots, moveDestDepot, moveEntry, globalStock]);

    const selectedDestPosData = useMemo(() => {
        if (!moveDestPos) return null;
        return destPositions.find((p: any) => p.id === moveDestPos) || null;
    }, [destPositions, moveDestPos]);

    // Ítems presentes en la posición de origen del movimiento
    const originStockItems = useMemo(() => {
        if (!moveEntry) return [];
        if (!moveEntry.posicionId) return [moveEntry];
        const pool = globalStock.length > 0 ? globalStock : rawStock;
        const found = pool.filter((s: any) => s.posicionId === moveEntry.posicionId && Number(s.qtyPrincipal) > 0);
        return found.length > 0 ? found : [moveEntry];
    }, [globalStock, rawStock, moveEntry]);

    // Ítems presentes en la posición de destino seleccionada (para ver qué contiene)
    const selectedDestStock = useMemo(() => {
        if (!moveDestPos) return [];
        const pool = globalStock.length > 0 ? globalStock : rawStock;
        return pool.filter((s: any) => s.posicionId === moveDestPos && Number(s.qtyPrincipal) > 0);
    }, [globalStock, rawStock, moveDestPos]);

    const selectedLinesToMove = useMemo(() => {
        return originStockItems.filter((entry: any) => {
            const state = moveItemsState[entry.id];
            if (!state?.selected) return false;
            const kilos = parseFloat(String(state.kilos).replace(',', '.'));
            return !isNaN(kilos) && kilos > 0;
        }).map((entry: any) => {
            const state = moveItemsState[entry.id];
            const kilos = parseFloat(String(state.kilos).replace(',', '.'));
            const cajas = state.cajas ? parseFloat(String(state.cajas).replace(',', '.')) : null;
            return {
                entry,
                kilos,
                cajas: cajas !== null && !isNaN(cajas) ? cajas : null
            };
        });
    }, [originStockItems, moveItemsState]);

    const totalKilosToMove = useMemo(() => {
        return selectedLinesToMove.reduce((acc, curr) => acc + curr.kilos, 0);
    }, [selectedLinesToMove]);

    const totalCajasToMove = useMemo(() => {
        return selectedLinesToMove.reduce((acc, curr) => acc + (curr.cajas || 0), 0);
    }, [selectedLinesToMove]);

    const allLinesSelected = useMemo(() => {
        return originStockItems.length > 0 && originStockItems.every((item: any) => !!moveItemsState[item.id]?.selected);
    }, [originStockItems, moveItemsState]);

    const handleToggleAllLinesOrTarget = () => {
        if (allLinesSelected) {
            const next: Record<string, any> = {};
            originStockItems.forEach((item: any) => {
                const isTarget = item.id === moveEntry?.id;
                next[item.id] = {
                    selected: isTarget,
                    kilos: String(item.qtyPrincipal || 0),
                    cajas: item.qtySecundaria ? String(item.qtySecundaria) : '',
                    isManualKilos: false
                };
            });
            setMoveItemsState(next);
        } else {
            handleSelectAllLines(true);
        }
    };

    const handleConfirmMove = async () => {
        if (!moveEntry || !moveDestDepot || !moveDestPos) {
            alert('Por favor seleccioná una posición de destino.');
            return;
        }
        if (selectedLinesToMove.length === 0) {
            alert('Seleccioná al menos un ítem con kilos válidos para mover.');
            return;
        }

        // Validación de stock disponible
        for (const line of selectedLinesToMove) {
            const maxKilos = Number(line.entry.qtyPrincipal || 0);
            if (line.kilos > maxKilos + 0.001) {
                alert(`Para el ítem ${line.entry.batch?.item?.codigoInterno} no podés mover más de los ${maxKilos} kg disponibles.`);
                return;
            }
            const maxCajas = Number(line.entry.qtySecundaria || 0);
            if (line.cajas !== null && maxCajas > 0 && line.cajas > maxCajas) {
                alert(`Para el ítem ${line.entry.batch?.item?.codigoInterno} no podés mover más de las ${maxCajas} cajas disponibles.`);
                return;
            }
        }

        try {
            const destPosName = destPositions.find((p: any) => p.id === moveDestPos)?.codigo || 'la nueva posición';
            const originPosName = moveEntry.posicion?.codigo || 'S/P';

            if (selectedLinesToMove.length === 1) {
                const single = selectedLinesToMove[0];
                await moveStockMutation({
                    depositoId: moveDestDepot,
                    posicionIdOrigen: single.entry.posicionId,
                    posicionIdDestino: moveDestPos,
                    itemId: single.entry.batch?.item?.id || single.entry.itemId,
                    lotId: single.entry.lotId || single.entry.batch?.id,
                    qtyPrincipal: single.kilos,
                    qtySecundaria: single.cajas,
                    fecha: new Date().toISOString(),
                }).unwrap();
            } else {
                await bulkMoveStockMutation({
                    items: selectedLinesToMove.map(line => ({
                        depositoId: moveDestDepot,
                        posicionIdOrigen: line.entry.posicionId,
                        posicionIdDestino: moveDestPos,
                        itemId: line.entry.batch?.item?.id || line.entry.itemId,
                        lotId: line.entry.lotId || line.entry.batch?.id,
                        qtyPrincipal: line.kilos,
                        qtySecundaria: line.cajas,
                    })),
                    fecha: new Date().toISOString(),
                    observaciones: `Transferencia de pallet de ${originPosName} a ${destPosName}`
                }).unwrap();
            }

            setFeedbackToast({ 
                msg: `✅ Movimiento completado: ${totalKilosToMove.toFixed(1)} kg (${selectedLinesToMove.length} lote/s) movidos a ${destPosName}`, 
                severity: 'success' 
            });
            setMoveModal(false);
            setMoveEntry(null);
        } catch (err: any) {
            alert(err?.data?.message || err?.message || 'Error al realizar el movimiento');
        }
    };

    // Posiciones vacías calculadas con stock real del depósito
    const emptyPositions = useMemo(() => {
        if (!depotId) return [];
        const allDepotPositions = (depots.find((d: any) => d.id === depotId)?.positions || []).filter((p: any) => p.activo);
        const occupiedPositionIds = new Set(rawStock.filter((e: any) => Number(e.qtyPrincipal) > 0).map((e: any) => e.posicionId).filter(Boolean));
        return allDepotPositions.filter((p: any) => !occupiedPositionIds.has(p.id));
    }, [depotId, depots, rawStock]);

    useEffect(() => {
        if (deletingKeys.length > 0) {
            setDeletingKeys([]);
        }
    }, [rawStock]);

    // Pre-normalizar índice de búsqueda de stock una sola vez en memoria
    const indexedStock = useMemo(() => {
        return rawStock.map((entry: any) => ({
            entry,
            searchStr: normalizeText(`${entry.batch?.item?.codigoInterno} ${entry.batch?.item?.descripcion} ${entry.batch?.lotNumber} ${entry.batch?.supplier?.name} ${entry.posicion?.codigo} ${entry.batch?.item?.category?.nombre || entry.batch?.item?.categoria || ''}`)
        }));
    }, [rawStock]);

    // Agrupación y Métricas de Alto Rendimiento basadas exclusivamente en el stock del balance del depósito
    const { groupedData, generalMetrics } = useMemo(() => {
        const general = { kilos: 0, units: 0, positions: new Set<string>() };
        if (!depotId) return { groupedData: [], generalMetrics: null };
        const groups: Record<string, any> = {};
        const searchWords = normalizeText(searchTerm).split(' ').filter(w => w.length > 0);

        // Procesar exclusivamente el stock existente del depósito seleccionado
        indexedStock.forEach(({ entry, searchStr }) => {
            const itemId = entry.batch?.item?.id;
            if (!itemId) return;

            if (searchWords.length > 0) {
                const matches = searchWords.every(word => searchStr.includes(word));
                if (!matches) return;
            }

            // Exclusión de métricas si el ojito está apagado
            if (!excludedItemIds[itemId]) {
                general.kilos += Number(entry.qtyPrincipal || 0);
                if (entry.qtySecundaria) general.units += Number(entry.qtySecundaria);
                if (entry.posicionId) general.positions.add(entry.posicionId);
            }

            if (!groups[itemId]) {
                groups[itemId] = {
                    item: entry.batch.item,
                    supplier: entry.batch.supplier,
                    entries: [],
                    oldestBatchDate: '9999-12-31',
                    oldestBatchLot: null,
                    oldestBatchPosition: null,
                    oldestBatchEntry: null,
                    metrics: { kilos: 0, units: 0 },
                    uniquePositions: new Set<string>()
                };
            }
            groups[itemId].entries.push(entry);
            const entryKilos = Number(entry.qtyPrincipal || 0);
            groups[itemId].metrics.kilos += entryKilos;
            if (entry.qtySecundaria) groups[itemId].metrics.units += Number(entry.qtySecundaria);
            if (entry.posicion?.codigo) groups[itemId].uniquePositions.add(entry.posicion.codigo);
            
            // FIFO real
            if (entryKilos > 0) {
                const batchDate = entry.batch?.createdAt || entry.batch?.productionDate || '9999-12-31';
                if (batchDate < groups[itemId].oldestBatchDate) {
                    groups[itemId].oldestBatchDate = batchDate;
                    groups[itemId].oldestBatchLot = entry.batch?.lotNumber;
                    groups[itemId].oldestBatchPosition = entry.posicion?.codigo || 'S/P';
                    groups[itemId].oldestBatchEntry = entry;
                }
            }
        });

        const allGroups = Object.values(groups);

        // Ordenar por kilos DESC y luego alfabéticamente
        allGroups.sort((a: any, b: any) => {
            if (b.metrics.kilos !== a.metrics.kilos) return b.metrics.kilos - a.metrics.kilos;
            return (a.item.descripcion || '').localeCompare(b.item.descripcion || '');
        });

        return {
            groupedData: allGroups,
            generalMetrics: { ...general, positionsCount: general.positions.size }
        };
    }, [indexedStock, searchTerm, excludedItemIds, depotId]);

    // Paginación de alto rendimiento en cliente (24 tarjetas por página para 60 FPS garantizados)
    const pagination = useClientPagination(groupedData, viewMode === 'grid' ? 24 : 25);

    // Resetear a la primera página al cambiar cualquier filtro
    useEffect(() => {
        pagination.setPage(0);
    }, [searchTerm, depotId]);

    const detailGroup = useMemo(() => groupedData.find((g: any) => g.item.id === detailGroupId), [groupedData, detailGroupId]);

    const totalPositionsCount = (depots.find((d: any) => d.id === depotId)?.positions || []).filter((p: any) => p.activo).length;

    return (
        <Box sx={{ p: isMobile ? 1.5 : 3.5, maxWidth: '1440px', margin: '0 auto', color: colors.text, minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            
            {/* Header Conciso */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                        🎯 Centro de Comando de Depósito
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textDim }}>
                        Gestión física de inventario, stock por pallet y reubicación de posiciones
                    </Typography>
                </Box>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={() => setQuickAddModal(true)}
                    sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, borderRadius: 2, px: 2, '&:hover': { bgcolor: '#d97706' } }}
                >
                    Carga Rápida
                </Button>
            </Box>

            {/* KPIs Concisos (Tira compacta con métrica de ocupación combinada) */}
            {depotId && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                    <Paper sx={{ p: 1.8, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>Stock Kilos</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.primary }}>
                            {(generalMetrics?.kilos || 0).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                            <small style={{ fontSize: '0.8rem', fontWeight: 500 }}>kg</small>
                        </Typography>
                    </Paper>

                    <Paper sx={{ p: 1.8, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>Bultos / Unidades</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.success }}>
                            {(generalMetrics?.units || 0).toLocaleString('es-AR')}{' '}
                            <small style={{ fontSize: '0.8rem', fontWeight: 500 }}>un</small>
                        </Typography>
                    </Paper>

                    {/* KPI Ocupación de Posiciones Combinado */}
                    <Paper sx={{ p: 1.8, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>Ocupación de Posiciones</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.info }}>
                            {generalMetrics?.positionsCount || 0} <span style={{ fontSize: '0.85rem', color: colors.textDim, fontWeight: 600 }}>/ {totalPositionsCount}</span>
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.72rem' }}>
                            {totalPositionsCount > 0 ? `${Math.round(((generalMetrics?.positionsCount || 0) / totalPositionsCount) * 100)}% ocupado` : '—'}
                        </Typography>
                    </Paper>

                    <Paper 
                        onClick={() => { if (emptyPositions.length > 0) setEmptyPositionsModal(true); }}
                        sx={{ 
                            p: 1.8, 
                            bgcolor: colors.cardBg, 
                            border: `1px solid ${colors.border}`, 
                            borderRadius: 2.5, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 0.5,
                            cursor: emptyPositions.length > 0 ? 'pointer' : 'default',
                            transition: 'all 0.15s ease-in-out',
                            '&:hover': emptyPositions.length > 0 ? { borderColor: colors.info, transform: 'translateY(-1px)' } : {}
                        }}
                    >
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', display: 'flex', justifyContent: 'space-between' }}>
                            Posiciones Libres
                            {emptyPositions.length > 0 && <span style={{ color: colors.info, fontWeight: 800 }}>Ver</span>}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.success }}>
                            {emptyPositions.length}{' '}
                            <small style={{ fontSize: '0.8rem', fontWeight: 500 }}>libres</small>
                        </Typography>
                    </Paper>
                </Box>
            )}

            {/* Banner de Materiales Excluidos con el Ojito */}
            {excludedCount > 0 && (
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    bgcolor: 'rgba(245, 158, 11, 0.08)', 
                    border: '1px solid rgba(245, 158, 11, 0.25)', 
                    borderRadius: 2.5, 
                    px: 2, 
                    py: 1,
                    gap: 1.5,
                    flexWrap: 'wrap'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VisibilityOffIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                        <Typography variant="body2" sx={{ color: '#f59e0b', fontWeight: 700 }}>
                            Hay <strong>{excludedCount}</strong> material{excludedCount > 1 ? 'es' : ''} excluido{excludedCount > 1 ? 's' : ''} del cálculo de métricas (kilos y ocupación).
                        </Typography>
                    </Box>
                    <Button 
                        size="small" 
                        variant="outlined" 
                        onClick={handleIncludeAll}
                        sx={{ 
                            color: '#f59e0b', 
                            borderColor: 'rgba(245, 158, 11, 0.5)', 
                            fontWeight: 800, 
                            borderRadius: 1.5,
                            textTransform: 'none',
                            py: 0.3,
                            px: 1.5,
                            '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.15)', borderColor: '#f59e0b' }
                        }}
                    >
                        Reactivar todos los ojos
                    </Button>
                </Box>
            )}

            {/* Barra de Filtros Sticky en Mobile */}
            <Paper sx={{ 
                p: 1.5, 
                bgcolor: colors.cardBg, 
                border: `1px solid ${colors.border}`, 
                borderRadius: 2.5, 
                position: isMobile ? 'sticky' : 'relative',
                top: isMobile ? 8 : 'auto',
                zIndex: isMobile ? 10 : 1,
                backdropFilter: 'blur(12px)'
            }}>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        select
                        label="Depósito"
                        value={depotId}
                        onChange={(e) => setDepotId(e.target.value)}
                        disabled={!isAdmin && depots.length === 1}
                        size="small"
                        sx={{ width: { xs: '100%', sm: '220px' }, '& .MuiInputLabel-root': { color: colors.textDim }, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                    >
                        <MenuItem value=""><em>Seleccionar depósito...</em></MenuItem>
                        {depots.map((d: any) => (
                            <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
                        ))}
                    </TextField>

                    <DebouncedSearchInput
                        label="Buscar material, código, lote o posición..."
                        placeholder="Ej: algodon 24/1, L-2026, A-01..."
                        value={searchTerm}
                        onChange={setSearchTerm}
                        size="small"
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ color: colors.textDim, mr: 1, fontSize: '1.2rem' }} />
                        }}
                        sx={{ flex: '1 1 280px', '& .MuiInputLabel-root': { color: colors.textDim }, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                    />

                    {/* Conteo de Materiales con Stock */}
                    <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center' }}>
                        <Chip
                            size="small"
                            label={`${groupedData.length} ${groupedData.length === 1 ? 'material' : 'materiales'} en stock`}
                            sx={{
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                bgcolor: 'rgba(255, 255, 255, 0.06)',
                                color: colors.textDim,
                                border: `1px solid ${colors.border}`
                            }}
                        />
                    </Box>

                    {/* Selector Grilla / Lista */}
                    <Box sx={{ display: 'flex', bgcolor: colors.inputBg, borderRadius: 2, p: 0.4, border: `1px solid ${colors.border}` }}>
                        <IconButton 
                            onClick={() => setViewMode('grid')} 
                            size="small"
                            sx={{ color: viewMode === 'grid' ? colors.primary : colors.textDim, borderRadius: 1.5 }}
                        >
                            <GridViewIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                            onClick={() => setViewMode('list')} 
                            size="small"
                            sx={{ color: viewMode === 'list' ? colors.primary : colors.textDim, borderRadius: 1.5 }}
                        >
                            <ViewListIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>
            </Paper>

            {/* Listado / Grilla de Materiales */}
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress sx={{ color: colors.primary }} /></Box>
            ) : !depotId ? (
                <Paper sx={{ p: 6, textAlign: 'center', bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 4 }}>
                    <Typography sx={{ color: colors.textDim, fontWeight: 700 }}>Seleccioná un depósito para ver el stock</Typography>
                </Paper>
            ) : groupedData.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center', bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 4 }}>
                    <Typography sx={{ color: colors.textDim }}>No se encontraron registros de stock que coincidan con la búsqueda</Typography>
                </Paper>
            ) : viewMode === 'grid' ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                        {pagination.pageItems.map((group: any) => {
                        const categoryName = group.item.category?.nombre || group.item.categoria || 'General';
                        const positionsList = Array.from(group.uniquePositions as Set<string>);
                        const isExcluded = !!excludedItemIds[group.item.id];

                        return (
                            <div 
                                key={group.item.id} 
                                className="material-card-hover"
                                style={{ 
                                    background: colors.cardBg, 
                                    border: isExcluded ? '1px dashed rgba(239, 68, 68, 0.45)' : `1px solid ${colors.border}`, 
                                    borderRadius: '14px', 
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    transition: 'all 0.15s ease-in-out',
                                    cursor: 'pointer',
                                    opacity: isExcluded ? 0.48 : 1,
                                }}
                                onClick={() => setDetailGroupId(group.item.id)}
                            >
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                        <div style={{ flex: 1, paddingRight: '8px' }}>
                                            {/* Clic en código para editar ficha del material */}
                                            <Tooltip title="Toca para editar ficha y datos técnicos del material">
                                                <Typography
                                                    component="span"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditItemTarget(group.item);
                                                    }}
                                                    sx={{ 
                                                        color: colors.primary, 
                                                        fontWeight: 800, 
                                                        fontSize: '0.75rem', 
                                                        letterSpacing: '0.5px',
                                                        textDecoration: 'underline dotted',
                                                        cursor: 'pointer',
                                                        '&:hover': { color: '#fbbf24' }
                                                    }}
                                                >
                                                    {group.item.codigoInterno} ✎
                                                </Typography>
                                            </Tooltip>
                                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.8, mt: 0.3 }}>
                                                <Typography variant="body1" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.25, textDecoration: isExcluded ? 'line-through' : 'none' }}>
                                                    {group.item.descripcion}
                                                </Typography>
                                                {isExcluded && (
                                                    <Chip 
                                                        label="Excluido de métricas" 
                                                        size="small" 
                                                        sx={{ 
                                                            height: 18, 
                                                            fontSize: '0.62rem', 
                                                            bgcolor: 'rgba(239, 68, 68, 0.15)', 
                                                            color: '#f87171', 
                                                            fontWeight: 800, 
                                                            border: '1px solid rgba(239, 68, 68, 0.3)' 
                                                        }} 
                                                    />
                                                )}
                                            </Box>
                                        </div>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.6 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                                    {categoryName}
                                                </Typography>
                                                <Tooltip title={isExcluded ? "Material excluido de las métricas. Toca el ojo para volver a incluirlo en la cuenta" : "Material incluido en las métricas. Toca el ojo para excluirlo del cálculo"}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => toggleItemInclusion(e, group.item.id)}
                                                        sx={{
                                                            p: 0.4,
                                                            color: isExcluded ? '#ef4444' : colors.textDim,
                                                            bgcolor: isExcluded ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                                            borderRadius: 1.5,
                                                            border: isExcluded ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent',
                                                            '&:hover': {
                                                                color: isExcluded ? '#f87171' : '#fff',
                                                                bgcolor: isExcluded ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.1)'
                                                            }
                                                        }}
                                                    >
                                                        {isExcluded ? <VisibilityOffIcon sx={{ fontSize: 17 }} /> : <VisibilityIcon sx={{ fontSize: 17 }} />}
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>

                                            {/* Próxima partida FIFO y posición de donde se agarra (Directamente debajo de la categoría) */}
                                            {group.oldestBatchLot ? (
                                                <Tooltip title={`Próxima partida a consumir: ${group.oldestBatchLot} en 📍 ${group.oldestBatchPosition || 'S/P'}. Toca para abrir las posiciones y partidas`}>
                                                    <Box 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDetailGroupId(group.item.id);
                                                        }}
                                                        sx={{ 
                                                            display: 'inline-flex', 
                                                            alignItems: 'center', 
                                                            gap: 0.6,
                                                            bgcolor: 'rgba(245, 158, 11, 0.1)',
                                                            border: '1px solid rgba(245, 158, 11, 0.25)',
                                                            borderRadius: 1.5,
                                                            px: 0.8,
                                                            py: 0.25,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease',
                                                            '&:hover': {
                                                                bgcolor: 'rgba(245, 158, 11, 0.22)',
                                                                borderColor: colors.primary
                                                            }
                                                        }}
                                                    >
                                                        <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 800, fontSize: '0.68rem', letterSpacing: '0.3px' }}>
                                                            ⏳ {group.oldestBatchLot}
                                                        </Typography>
                                                        <Chip 
                                                            size="small"
                                                            label={`📍 ${group.oldestBatchPosition || 'S/P'}${positionsList.length > 1 ? ` (+${positionsList.length - 1})` : ''}`}
                                                            sx={{ 
                                                                height: 18, 
                                                                fontSize: '0.65rem', 
                                                                fontWeight: 900, 
                                                                bgcolor: 'rgba(59, 130, 246, 0.2)', 
                                                                color: colors.info,
                                                                cursor: 'pointer'
                                                            }}
                                                        />
                                                    </Box>
                                                </Tooltip>
                                            ) : (
                                                <Chip 
                                                    size="small" 
                                                    label="Sin stock" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDetailGroupId(group.item.id);
                                                    }}
                                                    sx={{ 
                                                        height: 18, 
                                                        fontSize: '0.62rem', 
                                                        bgcolor: 'rgba(255, 255, 255, 0.05)', 
                                                        color: colors.textDim, 
                                                        fontWeight: 700,
                                                        cursor: 'pointer'
                                                    }} 
                                                />
                                            )}
                                        </Box>
                                    </div>
                                    
                                    {group.supplier?.name && (
                                        <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.72rem', display: 'block', mb: 0.5 }}>
                                            Prov: <strong style={{ color: '#fff' }}>{group.supplier.name}</strong>
                                        </Typography>
                                    )}

                                    {/* Cantidades Totalizadas Integradas (sin caja negra pesada) */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mt: 1 }}>
                                        <div>
                                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stock Total</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 900, color: group.metrics.kilos > 0 ? '#fff' : colors.textDim, lineHeight: 1.1 }}>
                                                {group.metrics.kilos.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                                                <small style={{ fontSize: '0.75rem', color: colors.textDim, fontWeight: 500 }}>{group.item.unidadPrincipal || 'kg'}</small>
                                            </Typography>
                                        </div>
                                        {group.metrics.units > 0 && (
                                            <div style={{ textAlign: 'right' }}>
                                                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bultos</Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 800, color: colors.success, lineHeight: 1.1 }}>
                                                    {group.metrics.units.toLocaleString('es-AR')}{' '}
                                                    <small style={{ fontSize: '0.7rem', color: colors.textDim }}>{group.item.unidadSecundaria || 'un'}</small>
                                                </Typography>
                                            </div>
                                        )}
                                    </Box>
                                </div>
                            </div>
                        );
                    })}
                    </div>
                    <Box sx={{ p: 1, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, display: 'flex', justifyContent: 'center' }}>
                        <PaginationControls
                            count={groupedData.length}
                            page={pagination.page}
                            pageSize={pagination.pageSize}
                            onPageChange={pagination.setPage}
                            onPageSizeChange={pagination.setPageSize}
                        />
                    </Box>
                </Box>
            ) : (
                /* Vista Lista Clickeable */
                <Paper sx={{ bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, overflowX: 'auto' }}>
                    <MuiTable size="small">
                        <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.25)' }}>
                            <TableRow sx={{ '& th': { color: colors.textDim, fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', py: 1.2 } }}>
                                <TableCell align="center" sx={{ width: 44 }}>Métrica</TableCell>
                                <TableCell>Código</TableCell>
                                <TableCell>Descripción</TableCell>
                                <TableCell>Categoría</TableCell>
                                <TableCell>Ubicaciones</TableCell>
                                <TableCell align="right">Stock Total</TableCell>
                                <TableCell align="right">Bultos</TableCell>
                                <TableCell align="center">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pagination.pageItems.map((group: any) => {
                                const categoryName = group.item.category?.nombre || group.item.categoria || 'General';
                                const positionsList = Array.from(group.uniquePositions as Set<string>);
                                const isExcluded = !!excludedItemIds[group.item.id];

                                return (
                                    <TableRow 
                                        key={group.item.id} 
                                        onClick={() => setDetailGroupId(group.item.id)}
                                        className="hoverable-row"
                                        sx={{ 
                                            cursor: 'pointer', 
                                            borderBottom: `1px solid ${colors.border}`, 
                                            opacity: isExcluded ? 0.45 : 1,
                                            '& td': { py: 1 } 
                                        }}
                                    >
                                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                            <Tooltip title={isExcluded ? "Excluido de métricas. Clic para volver a incluirlo" : "Incluido en métricas. Clic para excluir del cálculo"}>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => toggleItemInclusion(e, group.item.id)}
                                                    sx={{
                                                        p: 0.4,
                                                        color: isExcluded ? '#ef4444' : colors.textDim,
                                                        bgcolor: isExcluded ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                                        borderRadius: 1.5,
                                                        '&:hover': { color: isExcluded ? '#f87171' : '#fff' }
                                                    }}
                                                >
                                                    {isExcluded ? <VisibilityOffIcon sx={{ fontSize: 17 }} /> : <VisibilityIcon sx={{ fontSize: 17 }} />}
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell onClick={(e) => { e.stopPropagation(); setEditItemTarget(group.item); }}>
                                            <Tooltip title="Toca para editar ficha del material">
                                                <Typography sx={{ color: colors.primary, fontWeight: 800, fontSize: '0.78rem', textDecoration: 'underline dotted' }}>
                                                    {group.item.codigoInterno}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#fff', fontSize: '0.82rem', textDecoration: isExcluded ? 'line-through' : 'none' }}>
                                            {group.item.descripcion}
                                            {isExcluded && (
                                                <Chip 
                                                    label="Excluido" 
                                                    size="small" 
                                                    sx={{ 
                                                        height: 16, 
                                                        fontSize: '0.6rem', 
                                                        bgcolor: 'rgba(239, 68, 68, 0.15)', 
                                                        color: '#f87171', 
                                                        fontWeight: 800, 
                                                        ml: 1 
                                                    }} 
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ color: colors.textDim, fontSize: '0.75rem' }}>
                                            {categoryName}
                                            {group.oldestBatchLot && (
                                                <Box sx={{ mt: 0.3 }}>
                                                    <Chip 
                                                        size="small" 
                                                        label={`⏳ ${group.oldestBatchLot} (📍 ${group.oldestBatchPosition || 'S/P'})`} 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDetailGroupId(group.item.id);
                                                        }}
                                                        sx={{ 
                                                            height: 18, 
                                                            fontSize: '0.62rem', 
                                                            fontWeight: 800, 
                                                            bgcolor: 'rgba(245, 158, 11, 0.15)', 
                                                            color: colors.primary,
                                                            cursor: 'pointer' 
                                                        }} 
                                                    />
                                                </Box>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {positionsList.length === 0 ? (
                                                <Typography variant="caption" sx={{ color: colors.textDim, fontStyle: 'italic' }}>—</Typography>
                                            ) : (
                                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                    {positionsList.slice(0, 3).map((p, idx) => (
                                                        <Chip key={idx} size="small" label={p} sx={{ fontSize: '0.68rem', height: '20px', bgcolor: 'rgba(59, 130, 246, 0.12)', color: colors.info, fontWeight: 700 }} />
                                                    ))}
                                                    {positionsList.length > 3 && (
                                                        <Chip size="small" label={`+${positionsList.length - 3}`} sx={{ fontSize: '0.68rem', height: '20px' }} />
                                                    )}
                                                </Box>
                                            )}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 900, color: '#fff', fontSize: '0.85rem' }}>
                                            {group.metrics.kilos.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <small style={{ color: colors.textDim }}>{group.item.unidadPrincipal}</small>
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: colors.success, fontSize: '0.8rem' }}>
                                            {group.metrics.units > 0 ? `${group.metrics.units.toLocaleString('es-AR')} ${group.item.unidadSecundaria || 'un'}` : '—'}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Button 
                                                size="small" 
                                                variant="outlined" 
                                                onClick={(e) => { e.stopPropagation(); setDetailGroupId(group.item.id); }}
                                                sx={{ fontSize: '0.7rem', py: 0.3, px: 1.2, color: colors.primary, borderColor: colors.primary, borderRadius: 1.5, fontWeight: 800 }}
                                            >
                                                Detalle
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </MuiTable>
                    <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${colors.border}` }}>
                        <PaginationControls
                            count={groupedData.length}
                            page={pagination.page}
                            pageSize={pagination.pageSize}
                            onPageChange={pagination.setPage}
                            onPageSizeChange={pagination.setPageSize}
                        />
                    </Box>
                </Paper>
            )}

            {/* FAB para Mobile */}
            {isMobile && (
                <Fab 
                    color="primary" 
                    onClick={() => setQuickAddModal(true)} 
                    sx={{ position: 'fixed', bottom: 20, right: 20, bgcolor: colors.primary, color: '#000', zIndex: 100 }}
                >
                    <AddIcon />
                </Fab>
            )}

            {/* Listado de Posiciones / Detalle de Material (Emerge desde abajo como Bottom Sheet - Fullscreen en Mobile) */}
            {detailGroup && (
                <Drawer 
                    anchor="bottom"
                    open={!!detailGroupId} 
                    onClose={() => setDetailGroupId(null)}
                    PaperProps={{
                        sx: {
                            bgcolor: colors.bg,
                            color: colors.text,
                            borderTop: { xs: 'none', sm: `2px solid ${colors.primary}` },
                            borderRadius: { xs: 0, sm: '24px 24px 0 0' },
                            p: { xs: 1.5, sm: 3 },
                            pb: { xs: 2, sm: 4 },
                            height: { xs: '100vh', sm: 'auto' },
                            maxHeight: { xs: '100vh', sm: '88vh' },
                            maxWidth: { xs: '100%', sm: 1040 },
                            margin: '0 auto',
                            width: '100%',
                            boxShadow: '0 -10px 40px rgba(0,0,0,0.8)',
                            outline: 'none',
                            display: 'flex',
                            flexDirection: 'column'
                        }
                    }}
                >
                    {/* Tirita / drag pill superior (solo en desktop) */}
                    <Box sx={{ display: { xs: 'none', sm: 'block' }, width: 44, height: 4, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2, mx: 'auto', mb: 2 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexShrink: 0 }}>
                        <Box sx={{ flex: 1, pr: 1 }}>
                            <Typography 
                                variant="caption" 
                                onClick={() => setEditItemTarget(detailGroup.item)}
                                sx={{ color: colors.primary, fontWeight: 800, cursor: 'pointer', textDecoration: 'underline dotted' }}
                            >
                                {detailGroup.item.codigoInterno} ✎
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 900, color: '#fff', lineHeight: 1.2, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                                {detailGroup.item.descripcion}
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.textDim, display: 'block', mt: 0.3 }}>
                                Prov: <strong style={{ color: '#fff' }}>{detailGroup.supplier?.name || '—'}</strong> • Cat: <strong style={{ color: '#fff' }}>{detailGroup.item.category?.nombre || 'General'}</strong>
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                                label={`Total: ${detailGroup.metrics.kilos.toLocaleString('es-AR', { minimumFractionDigits: 1 })} ${detailGroup.item.unidadPrincipal || 'kg'}`}
                                sx={{ bgcolor: 'rgba(245, 158, 11, 0.15)', color: colors.primary, fontWeight: 800, fontSize: { xs: '0.72rem', sm: '0.78rem' } }}
                            />
                            <IconButton 
                                onClick={() => setDetailGroupId(null)} 
                                sx={{ 
                                    color: colors.textDim,
                                    bgcolor: 'rgba(255,255,255,0.06)',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }
                                }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                    
                    {detailGroup.entries.length === 0 ? (
                        <Box sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2.5, border: `1px dashed ${colors.border}`, my: 'auto' }}>
                            <Typography variant="body1" sx={{ color: '#fff', fontWeight: 800, mb: 0.5 }}>
                                Material sin stock físico
                            </Typography>
                            <Typography variant="body2" sx={{ color: colors.textDim, mb: 2.5, maxWidth: 420, mx: 'auto' }}>
                                Este material forma parte del catálogo pero actualmente no posee pallets ni partidas en este depósito.
                            </Typography>
                            <Button 
                                variant="contained" 
                                startIcon={<AddIcon />} 
                                onClick={() => {
                                    setDetailGroupId(null);
                                    setQaItem(detailGroup.item.id);
                                    setQaSupplier(detailGroup.supplier?.id || '');
                                    setQuickAddModal(true);
                                }}
                                sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, borderRadius: 2, px: 2.5 }}
                            >
                                Cargar Stock de este Material
                            </Button>
                        </Box>
                    ) : (
                        <TableContainer sx={{ 
                            flex: 1, 
                            maxHeight: { xs: 'calc(100vh - 130px)', sm: 480 }, 
                            overflowY: 'auto', 
                            border: `1px solid ${colors.border}`, 
                            borderRadius: 2 
                        }}>
                            <MuiTable size="small" stickyHeader>
                                <TableHead>
                                    <TableRow sx={{ '& th': { bgcolor: '#161922', color: colors.textDim, fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase' } }}>
                                        <TableCell>Ubicación</TableCell>
                                        <TableCell>Lote / Partida</TableCell>
                                        <TableCell align="right">Kilos</TableCell>
                                        <TableCell align="right">Bultos</TableCell>
                                        <TableCell align="center">Despacho</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {detailGroup.entries.map((entry: any) => {
                                        const isOldest = entry.batch?.lotNumber === detailGroup.oldestBatchLot;
                                        const isDeleting = deletingKeys.includes(getEntryKey(entry));

                                        return (
                                            <TableRow key={entry.id} sx={{ opacity: isDeleting ? 0.5 : 1, '& td': { color: '#fff', py: 1.2 } }}>
                                                {/* 1. Posición: Al tocarla abre directamente el módulo de mover mercadería */}
                                                <TableCell>
                                                    <Tooltip title="Toca para mover o reubicar este pallet a otra posición">
                                                        <Chip 
                                                            icon={<SwapHorizIcon style={{ fontSize: 15, color: colors.info }} />}
                                                            label={entry.posicion?.codigo || 'S/P'}
                                                            onClick={() => openQuickMove(entry)}
                                                            clickable
                                                            sx={{ 
                                                                bgcolor: 'rgba(59, 130, 246, 0.15)', 
                                                                color: colors.info, 
                                                                fontWeight: 800, 
                                                                fontSize: '0.78rem',
                                                                border: `1px solid rgba(59, 130, 246, 0.3)`,
                                                                cursor: 'pointer',
                                                                minHeight: '30px',
                                                                '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.28)' }
                                                            }}
                                                        />
                                                    </Tooltip>
                                                </TableCell>

                                                {/* 2. Lote con manipulación directa: tocarlo cambia o acopla la partida */}
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                        <Tooltip title="Toca para renombrar, corregir o acoplar esta partida">
                                                            <Typography 
                                                                variant="body2" 
                                                                onClick={() => setEditLotEntry(entry)}
                                                                sx={{ 
                                                                    cursor: 'pointer', 
                                                                    textDecoration: 'underline dotted', 
                                                                    color: isOldest ? colors.primary : '#fff', 
                                                                    fontWeight: isOldest ? 800 : 600,
                                                                    '&:hover': { color: colors.primary }
                                                                }}
                                                            >
                                                                {entry.batch?.lotNumber} ✎
                                                            </Typography>
                                                        </Tooltip>
                                                        {isOldest && (
                                                            <Tooltip title="Partida más antigua de este material en stock (Prioridad de salida FIFO)">
                                                                <Chip label="FIFO" size="small" sx={{ height: '18px', fontSize: '0.62rem', fontWeight: 900, bgcolor: 'rgba(245, 158, 11, 0.2)', color: colors.primary }} />
                                                            </Tooltip>
                                                        )}
                                                        {entry.batch?.observaciones && (
                                                            <Tooltip title={`Observación: ${entry.batch.observaciones}. Toca para editar nota.`}>
                                                                <IconButton 
                                                                    size="small" 
                                                                    onClick={() => setObsModal({ open: true, batchId: entry.batch?.id, text: entry.batch?.observaciones || '' })}
                                                                    sx={{ p: 0.2, color: colors.primary }}
                                                                >
                                                                    <WarningAmberIcon sx={{ fontSize: 16 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                </TableCell>

                                                {/* 3. Kilos con manipulación directa: tocarlo abre ajuste de peso */}
                                                <TableCell align="right">
                                                    <Tooltip title="Toca para ajustar o corregir el pesaje de este pallet">
                                                        <Typography 
                                                            variant="body2" 
                                                            onClick={() => setAdjustStockEntry(entry)}
                                                            sx={{ 
                                                                cursor: 'pointer', 
                                                                textDecoration: 'underline dotted', 
                                                                color: colors.primary, 
                                                                fontWeight: 800,
                                                                '&:hover': { color: '#fbbf24' }
                                                            }}
                                                        >
                                                            {Number(entry.qtyPrincipal).toFixed(1)} <small style={{ color: colors.textDim }}>{detailGroup.item.unidadPrincipal}</small> ✎
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>

                                                {/* 4. Bultos con manipulación directa */}
                                                <TableCell align="right">
                                                    {entry.qtySecundaria ? (
                                                        <Tooltip title="Toca para ajustar la cantidad de bultos">
                                                            <Typography 
                                                                variant="body2" 
                                                                onClick={() => setAdjustStockEntry(entry)}
                                                                sx={{ 
                                                                    cursor: 'pointer', 
                                                                    textDecoration: 'underline dotted', 
                                                                    color: colors.success, 
                                                                    fontWeight: 700,
                                                                    '&:hover': { color: '#34d399' }
                                                                }}
                                                            >
                                                                {entry.qtySecundaria} <small style={{ color: colors.textDim }}>{detailGroup.item.unidadSecundaria}</small> ✎
                                                            </Typography>
                                                        </Tooltip>
                                                    ) : (
                                                        <Typography 
                                                            variant="caption" 
                                                            onClick={() => setAdjustStockEntry(entry)}
                                                            sx={{ color: colors.textDim, cursor: 'pointer', textDecoration: 'underline dotted', '&:hover': { color: '#fff' } }}
                                                        >
                                                            + Bultos ✎
                                                        </Typography>
                                                    )}
                                                </TableCell>

                                                {/* 5. Camioncito para Remito de Salida */}
                                                <TableCell align="center">
                                                    <Tooltip title="Despachar con Remito de Salida">
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => openDespacho(entry)} 
                                                            sx={{ 
                                                                color: colors.primary, 
                                                                bgcolor: 'rgba(245, 158, 11, 0.12)', 
                                                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                                                '&:hover': { 
                                                                    bgcolor: 'rgba(245, 158, 11, 0.28)',
                                                                    transform: 'scale(1.08)'
                                                                },
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                        >
                                                            <LocalShippingIcon sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </MuiTable>
                        </TableContainer>
                    )}
                </Drawer>
            )}

            {/* Hoja Táctil de Acciones Unificada para Ubicación */}
            <PositionActionSheet
                open={!!actionSheetEntry}
                onClose={() => setActionSheetEntry(null)}
                entry={actionSheetEntry}
                isAdmin={isAdmin}
                onMove={(e) => openQuickMove(e)}
                onDespacho={(e) => openDespacho(e)}
                onAdjustQty={(e) => setAdjustStockEntry(e)}
                onEditLot={(e) => setEditLotEntry(e)}
                onObservations={(e) => setObsModal({ open: true, batchId: e.batch?.id, text: e.batch?.observaciones || '' })}
                onDelete={(e) => handleDeleteLine(e)}
            />

            {/* Diálogo Seguro de Ajuste de Stock (Reemplaza prompt) */}
            <AdjustStockDialog
                open={!!adjustStockEntry}
                onClose={() => setAdjustStockEntry(null)}
                entry={adjustStockEntry}
                onConfirm={handleConfirmAdjustQty}
            />

            {/* Diálogo Seguro de Reasignación de Lote (Reemplaza prompt) */}
            <EditLotDialog
                open={!!editLotEntry}
                onClose={() => setEditLotEntry(null)}
                entry={editLotEntry}
                onConfirm={handleConfirmReassignBatch}
            />

            {/* Diálogo para Editar Ficha de Material */}
            {editItemTarget && (
                <CreateItemDialog
                    open={!!editItemTarget}
                    onClose={() => setEditItemTarget(null)}
                    editTarget={editItemTarget}
                    depositoId={depotId}
                    onSuccess={() => {
                        setFeedbackToast({ msg: '✅ Ficha del material actualizada', severity: 'success' });
                        setEditItemTarget(null);
                    }}
                />
            )}

            {/* Modal Rediseñado de Movimiento de Mercadería / Pallet Completo */}
            {moveModal && moveEntry && (
                <Dialog
                    open={moveModal}
                    onClose={() => { if (!isMovingStock) { setMoveModal(false); setMoveEntry(null); } }}
                    fullScreen={isMobile}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                        sx: {
                            bgcolor: colors.bg,
                            color: colors.text,
                            border: { xs: 'none', sm: `1px solid ${colors.info}` },
                            borderRadius: { xs: 0, sm: 3.5 },
                            boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
                            outline: 'none',
                            maxHeight: { xs: '100vh', sm: '92vh' },
                            display: 'flex',
                            flexDirection: 'column'
                        }
                    }}
                >
                    {/* Header */}
                    <DialogTitle sx={{ p: { xs: 2, sm: 2.5 }, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                            <SwapHorizIcon sx={{ color: colors.info, fontSize: '1.8rem' }} />
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 900, color: '#fff', lineHeight: 1.15 }}>
                                    Mover Mercadería / Pallet
                                </Typography>
                                <Typography variant="caption" sx={{ color: colors.textDim }}>
                                    Transferencia de ubicación entre racks y posiciones
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton onClick={() => { setMoveModal(false); setMoveEntry(null); }} sx={{ color: colors.textDim }}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    {/* Content */}
                    <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        
                        {/* 1. SECCIÓN ORIGEN: Lo que sacás */}
                        <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, border: `1px solid ${colors.border}` }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="subtitle2" sx={{ color: colors.info, fontWeight: 900, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                        📍 Origen: Posición {moveEntry.posicion?.codigo || 'S/P'}
                                    </Typography>
                                    <Chip 
                                        size="small" 
                                        label={`${originStockItems.length} ${originStockItems.length === 1 ? 'lote' : 'lotes'} en pallet`} 
                                        sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800, bgcolor: 'rgba(59, 130, 246, 0.15)', color: colors.info }} 
                                    />
                                </Box>
                                {originStockItems.length > 1 && (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<FlashOnIcon sx={{ fontSize: 14 }} />}
                                        onClick={handleToggleAllLinesOrTarget}
                                        sx={{ 
                                            color: allLinesSelected ? colors.info : colors.primary, 
                                            borderColor: allLinesSelected ? colors.info : colors.primary, 
                                            fontWeight: 800, 
                                            fontSize: '0.72rem', 
                                            textTransform: 'none',
                                            py: 0.3,
                                            px: 1.2,
                                            borderRadius: 2,
                                            bgcolor: allLinesSelected ? 'rgba(59, 130, 246, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                                            '&:hover': { bgcolor: allLinesSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)' }
                                        }}
                                    >
                                        {allLinesSelected ? 'Solo ítem seleccionado' : 'Mover Todo el Pallet'}
                                    </Button>
                                )}
                            </Box>

                            <Typography variant="caption" sx={{ color: colors.textDim, display: 'block', mb: 1.5, fontSize: '0.72rem' }}>
                                Seleccioná y confirmá las cantidades a transferir de este pallet:
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, maxHeight: { xs: 260, sm: 300 }, overflowY: 'auto', pr: 0.5 }}>
                                {originStockItems.map((entry: any) => {
                                    const lineState = moveItemsState[entry.id] || { selected: false, kilos: '', cajas: '', isManualKilos: false };
                                    const isSelected = !!lineState.selected;
                                    const maxKilos = Number(entry.qtyPrincipal || 0);
                                    const maxCajas = Number(entry.qtySecundaria || 0);

                                    return (
                                        <Box 
                                            key={entry.id} 
                                            sx={{ 
                                                p: 1.5, 
                                                borderRadius: 2.5, 
                                                border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.5)' : colors.border}`,
                                                bgcolor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.02)',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flex: 1 }}>
                                                    <Checkbox 
                                                        size="small"
                                                        checked={isSelected}
                                                        onChange={() => handleLineToggle(entry.id)}
                                                        sx={{ p: 0.2, mt: 0.2, color: colors.textDim, '&.Mui-checked': { color: colors.info } }}
                                                    />
                                                    <Box sx={{ flex: 1 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                            <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 900, letterSpacing: '0.4px' }}>
                                                                {entry.batch?.item?.codigoInterno}
                                                            </Typography>
                                                            <Chip 
                                                                size="small" 
                                                                label={`Lote: ${entry.batch?.lotNumber || '—'}`} 
                                                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800, bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' }} 
                                                            />
                                                        </Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.25, mt: 0.3 }}>
                                                            {entry.batch?.item?.descripcion}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.72rem', display: 'block', mt: 0.4 }}>
                                                            Disponible en pallet: <strong style={{ color: colors.success }}>{maxKilos.toFixed(1)} {entry.batch?.item?.unidadPrincipal || 'kg'}</strong>
                                                            {maxCajas > 0 && ` • ${maxCajas} ${entry.batch?.item?.unidadSecundaria || 'cajas'}`}
                                                            {entry.batch?.supplier?.name && ` • Prov: ${entry.batch.supplier.name}`}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Box>

                                            {isSelected && (
                                                <Box sx={{ mt: 1.2, pt: 1.2, borderTop: `1px dashed ${colors.border}`, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <TextField
                                                        label={`Cajas a mover (${entry.batch?.item?.unidadSecundaria || 'un'})`}
                                                        type="number"
                                                        size="small"
                                                        placeholder={maxCajas > 0 ? `Máx: ${maxCajas}` : '0'}
                                                        value={lineState.cajas}
                                                        onChange={(e) => handleLineCajasChange(entry, e.target.value)}
                                                        sx={{ flex: '1 1 130px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                                                    />
                                                    <TextField
                                                        label={`Kilos a mover * (${entry.batch?.item?.unidadPrincipal || 'kg'})`}
                                                        type="number"
                                                        size="small"
                                                        placeholder={`Máx: ${maxKilos}`}
                                                        value={lineState.kilos}
                                                        onChange={(e) => handleLineKilosChange(entry.id, e.target.value)}
                                                        sx={{ flex: '1 1 130px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                                                    />
                                                </Box>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>

                        {/* 2. SECCIÓN DESTINO: A dónde mandás y qué tiene actualmente */}
                        <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, border: `1px solid ${colors.border}` }}>
                            <Typography variant="subtitle2" sx={{ color: colors.textDim, fontWeight: 900, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', mb: 1.5 }}>
                                2. Posición de Destino
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
                                {depots.length > 1 && (
                                    <TextField
                                        select
                                        label="Depósito Destino"
                                        size="small"
                                        value={moveDestDepot}
                                        onChange={(e) => { setMoveDestDepot(e.target.value); setMoveDestPos(''); }}
                                        sx={{ flex: '1 1 180px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                                    >
                                        {depots.map((d: any) => (
                                            <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
                                        ))}
                                    </TextField>
                                )}

                                <Autocomplete
                                    options={destPositions}
                                    getOptionLabel={(option: any) => option.codigo || ''}
                                    filterOptions={(options, state) => {
                                        const query = normalizeText(state.inputValue);
                                        if (!query) return options;
                                        return options.filter((opt: any) => 
                                            normalizeText(opt.codigo || '').includes(query) ||
                                            normalizeText(opt.contentsSummary || '').includes(query)
                                        );
                                    }}
                                    renderOption={(props, option: any) => (
                                        <Box component="li" {...props} key={option.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', py: 1, px: 1.5, borderBottom: `1px solid ${colors.border}`, width: '100%' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                                <Typography variant="body2" sx={{ fontWeight: 800, color: '#fff' }}>
                                                    📍 {option.codigo}
                                                </Typography>
                                                {option.isOccupied ? (
                                                    <Chip size="small" label={`${option.currentStock.length} lote(s)`} sx={{ bgcolor: 'rgba(245, 158, 11, 0.15)', color: colors.primary, fontSize: '0.68rem', fontWeight: 700, height: '20px' }} />
                                                ) : (
                                                    <Chip size="small" label="Vacía" sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: colors.success, fontSize: '0.68rem', fontWeight: 700, height: '20px' }} />
                                                )}
                                            </Box>
                                            {option.isOccupied && (
                                                <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.72rem', mt: 0.5, lineHeight: 1.25 }}>
                                                    {option.contentsSummary}
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                    value={destPositions.find((p: any) => p.id === moveDestPos) || null}
                                    onChange={(_e, val: any) => setMoveDestPos(val?.id || '')}
                                    size="small"
                                    sx={{ flex: '2 1 240px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                                    renderInput={(params) => <TextField {...params} label="Posición Destino *" placeholder="Escribí o seleccioná posición..." />}
                                />
                            </Box>

                            {/* Detalle visual de lo que tiene la posición de destino elegida */}
                            {selectedDestPosData ? (
                                selectedDestStock.length === 0 ? (
                                    <Box sx={{ p: 1.5, bgcolor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 2.5, display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: colors.success, flexShrink: 0 }} />
                                        <Box>
                                            <Typography variant="body2" sx={{ color: colors.success, fontWeight: 800 }}>
                                                Posición {selectedDestPosData.codigo} Vacía y Disponible
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: colors.textDim }}>
                                                Esta posición no contiene mercadería. El pallet se ubicará de forma limpia y exclusiva.
                                            </Typography>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box sx={{ p: 1.5, bgcolor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 2.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: colors.primary, flexShrink: 0 }} />
                                            <Typography variant="subtitle2" sx={{ color: colors.primary, fontWeight: 900 }}>
                                                Posición {selectedDestPosData.codigo} Ocupada ({selectedDestStock.length} lote/s existentes)
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" sx={{ color: colors.textDim, display: 'block', mb: 1 }}>
                                            Mercadería que ya está en esta posición (el nuevo pallet se acoplará aquí):
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, maxHeight: 180, overflowY: 'auto' }}>
                                            {selectedDestStock.map((s: any, idx: number) => (
                                                <Box key={idx} sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 1.5, border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                                                    <Box>
                                                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#fff', display: 'block' }}>
                                                            [{s.batch?.item?.codigoInterno}] {s.batch?.item?.descripcion}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.7rem' }}>
                                                            Lote: <strong style={{ color: colors.primary }}>{s.batch?.lotNumber || '—'}</strong> • Prov: {s.batch?.supplier?.name || '—'}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ textAlign: 'right' }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#fff' }}>
                                                            {Number(s.qtyPrincipal).toFixed(1)} <small style={{ color: colors.textDim }}>{s.batch?.item?.unidadPrincipal || 'kg'}</small>
                                                        </Typography>
                                                        {s.qtySecundaria && (
                                                            <Typography variant="caption" sx={{ color: colors.success, fontWeight: 700, display: 'block' }}>
                                                                {s.qtySecundaria} {s.batch?.item?.unidadSecundaria || 'un'}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                )
                            ) : (
                                <Box sx={{ p: 1.2, bgcolor: 'rgba(255,255,255,0.02)', border: `1px dashed ${colors.border}`, borderRadius: 2, textAlign: 'center' }}>
                                    <Typography variant="caption" sx={{ color: colors.textDim }}>
                                        Seleccioná una posición de destino para verificar su disponibilidad y contenido actual.
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </DialogContent>

                    {/* Footer */}
                    <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                                label={`A mover: ${totalKilosToMove.toFixed(1)} kg${totalCajasToMove > 0 ? ` · ${totalCajasToMove} bultos` : ''} (${selectedLinesToMove.length} lote/s)`}
                                sx={{ bgcolor: 'rgba(59, 130, 246, 0.15)', color: colors.info, fontWeight: 800, fontSize: '0.75rem' }}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Button 
                                variant="text" 
                                onClick={() => { setMoveModal(false); setMoveEntry(null); }} 
                                sx={{ color: colors.textDim }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="contained"
                                disabled={isMovingStock || !moveDestPos || selectedLinesToMove.length === 0 || totalKilosToMove <= 0}
                                onClick={handleConfirmMove}
                                startIcon={isMovingStock ? <CircularProgress size={16} color="inherit" /> : <SwapHorizIcon />}
                                sx={{ 
                                    bgcolor: colors.info, 
                                    color: '#fff', 
                                    fontWeight: 800, 
                                    borderRadius: 2, 
                                    px: 2.5, 
                                    '&:hover': { bgcolor: '#2563eb' } 
                                }}
                            >
                                {isMovingStock ? 'Moviendo...' : 'Confirmar Movimiento'}
                            </Button>
                        </Box>
                    </DialogActions>
                </Dialog>
            )}

            {/* Toast feedback unificado */}
            <Snackbar
                open={!!feedbackToast}
                autoHideDuration={4000}
                onClose={() => setFeedbackToast(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setFeedbackToast(null)} severity={feedbackToast?.severity || 'success'} sx={{ bgcolor: '#064e3b', color: '#ecfdf5', fontWeight: 700, borderRadius: 2, border: `1px solid #059669` }}>
                    {feedbackToast?.msg}
                </Alert>
            </Snackbar>

            {/* Observations Modal */}
            {obsModal.open && (
                <Modal 
                    open={obsModal.open} 
                    onClose={() => setObsModal({ open: false, batchId: '', text: '' })}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Paper sx={{ width: '90%', maxWidth: 450, bgcolor: colors.bg, border: `1px solid ${colors.primary}`, borderRadius: 3, p: 2.5, outline: 'none' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5, color: colors.primary }}>Observación de Partida</Typography>
                        <TextField
                            multiline
                            rows={3}
                            fullWidth
                            value={obsModal.text}
                            onChange={(e) => setObsModal(p => ({ ...p, text: e.target.value }))}
                            placeholder="Escribí aquí observaciones relativas a la partida..."
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 2 }}>
                            <Button variant="text" onClick={() => setObsModal({ open: false, batchId: '', text: '' })} sx={{ color: colors.textDim }}>Cancelar</Button>
                            <Button variant="contained" disabled={obsSaving} onClick={handleUpdateObs} sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, borderRadius: 2 }}>
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
                    <Paper sx={{ width: '90%', maxWidth: 480, bgcolor: colors.bg, border: `1px solid ${colors.primary}`, borderRadius: 3, p: 2.5, outline: 'none' }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, color: colors.primary }}>Despacho Directo</Typography>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8 }}>
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
                                renderInput={(params) => <TextField {...params} label="Cliente" InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} />}
                            />

                            {despachoNewClient && isAdmin && (
                                <TextField 
                                    label="Nombre del nuevo cliente" 
                                    fullWidth 
                                    value={despachoClientName} 
                                    onChange={(e) => setDespachoClientName(e.target.value)} 
                                    InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} 
                                />
                            )}

                            <TextField 
                                label="Fecha" 
                                type="date" 
                                fullWidth 
                                value={despachoFecha} 
                                onChange={(e) => setDespachoFecha(e.target.value)} 
                                InputLabelProps={{ shrink: true }} 
                                InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} 
                            />

                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <TextField 
                                    label={`Cantidad (${despachoEntry.batch.item.unidadPrincipal})`} 
                                    type="number" 
                                    fullWidth 
                                    value={despachoQty} 
                                    onChange={(e) => setDespachoQty(e.target.value)} 
                                    InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} 
                                />
                                {despachoEntry.batch.item.unidadSecundaria && (
                                    <TextField 
                                        label={`Secundaria (${despachoEntry.batch.item.unidadSecundaria})`} 
                                        type="number" 
                                        fullWidth 
                                        value={despachoQtySec} 
                                        onChange={(e) => setDespachoQtySec(e.target.value)} 
                                        InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} 
                                    />
                                )}
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 2.5, borderTop: `1px solid ${colors.border}`, pt: 1.5 }}>
                            <Button variant="text" onClick={() => setDespachoModal(false)} sx={{ color: colors.textDim }}>Cancelar</Button>
                            <Button 
                                variant="contained" 
                                disabled={despachoSaving || !despachoQty} 
                                onClick={handleDespachoSubmit}
                                sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, borderRadius: 2 }}
                            >
                                {despachoSaving ? 'Despachando...' : 'Confirmar'}
                            </Button>
                        </Box>
                    </Paper>
                </Modal>
            )}

            {/* Listado de Posiciones Libres (Emerge desde abajo como Bottom Sheet) */}
            <Drawer 
                anchor="bottom"
                open={emptyPositionsModal} 
                onClose={() => setEmptyPositionsModal(false)}
                PaperProps={{
                    sx: {
                        bgcolor: colors.bg,
                        color: colors.text,
                        borderTop: `2px solid ${colors.info}`,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        p: { xs: 2.5, sm: 3 },
                        pb: 5,
                        maxWidth: 680,
                        margin: '0 auto',
                        width: '100%',
                        boxShadow: '0 -8px 32px rgba(0,0,0,0.8)'
                    }
                }}
            >
                <Box sx={{ width: 44, height: 4, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2, mx: 'auto', mb: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: colors.info }}>Posiciones Libres ({emptyPositions.length})</Typography>
                    <IconButton onClick={() => setEmptyPositionsModal(false)} sx={{ color: colors.textDim }}><CloseIcon /></IconButton>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: '380px', overflowY: 'auto', p: 1.5, bgcolor: 'rgba(0,0,0,0.25)', borderRadius: 2.5 }}>
                    {emptyPositions.length === 0 ? (
                        <Typography variant="body2" sx={{ color: colors.textDim, p: 2 }}>No hay posiciones vacías en este depósito.</Typography>
                    ) : (
                        emptyPositions.map((p: any) => (
                            <Box 
                                key={p.id} 
                                sx={{ 
                                    px: 1.4, 
                                    py: 0.6, 
                                    bgcolor: 'rgba(255,255,255,0.06)', 
                                    border: `1px solid ${colors.border}`, 
                                    borderRadius: 2, 
                                    color: '#fff', 
                                    fontSize: '0.85rem', 
                                    fontWeight: 700 
                                }}
                            >
                                📍 {p.codigo}
                            </Box>
                        ))
                    )}
                </Box>
            </Drawer>

            {/* Carga Rápida (Ventana Flotante Centrada) */}
            <Dialog 
                open={quickAddModal} 
                onClose={() => setQuickAddModal(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ 
                    sx: { 
                        bgcolor: colors.bg, 
                        color: colors.text, 
                        border: `1px solid ${colors.border}`, 
                        borderRadius: 3.5, 
                        p: { xs: 2.5, sm: 3 },
                        boxShadow: '0 20px 60px rgba(0,0,0,0.85)'
                    } 
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: colors.primary, letterSpacing: '-0.3px' }}>
                        ⚡ CARGA RÁPIDA DE STOCK
                    </Typography>
                    <IconButton onClick={() => setQuickAddModal(false)} sx={{ color: colors.textDim }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8, width: '100%' }}>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <TextField 
                            select 
                            label="Depósito" 
                            fullWidth 
                            size="small"
                            value={qaDepot} 
                            onChange={(e) => { setQaDepot(e.target.value); setQaPosition(''); }} 
                            InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                        >
                            <MenuItem value=""><em>Seleccionar...</em></MenuItem>
                            {depots.map((d: any) => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}
                        </TextField>

                        <TextField 
                            select 
                            label="Posición" 
                            fullWidth 
                            size="small"
                            value={qaPosition} 
                            disabled={!qaDepot} 
                            onChange={(e) => setQaPosition(e.target.value)} 
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
                            size="small"
                            onChange={(_e, val: any) => { setQaSupplier(val?.id || ''); setQaItem(''); }}
                            renderInput={(params) => <TextField {...params} label="Proveedor" InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} />} 
                        />
                        <Button variant="outlined" sx={{ color: colors.primary, borderColor: colors.primary, height: '38px', minWidth: '38px', p: 0, borderRadius: 2 }} onClick={() => setCreatePartnerModal(true)}>+</Button>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Autocomplete 
                            options={qaFilteredItems} 
                            getOptionLabel={(option: any) => `${option.codigoInterno} - ${option.descripcion}`} 
                            value={items.find(i => i.id === qaItem) || null}
                            fullWidth
                            size="small"
                            onChange={(_e, val: any) => setQaItem(val?.id || '')}
                            renderInput={(params) => <TextField {...params} label="Material" InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} />} 
                        />
                        <Button variant="outlined" sx={{ color: colors.primary, borderColor: colors.primary, height: '38px', minWidth: '38px', p: 0, borderRadius: 2 }} onClick={() => setCreateItemModal(true)}>+</Button>
                    </Box>

                    <TextField 
                        label="Número de Lote" 
                        fullWidth 
                        size="small"
                        value={qaLot} 
                        onChange={(e) => setQaLot(e.target.value)} 
                        InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} 
                    />

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <TextField 
                            label={`Kilos (${qaSelectedItem?.unidadPrincipal || 'kg'})`} 
                            type="number" 
                            fullWidth 
                            size="small"
                            value={qaPrincipal} 
                            onChange={(e) => setQaPrincipal(e.target.value)} 
                            InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} 
                        />
                        <TextField 
                            label={`Unidades (${qaSelectedItem?.unidadSecundaria || 'un'})`} 
                            type="number" 
                            fullWidth 
                            size="small"
                            value={qaSecundaria} 
                            onChange={(e) => setQaSecundaria(e.target.value)} 
                            InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }} 
                        />
                    </Box>

                    <Button 
                        fullWidth 
                        variant="contained" 
                        size="large" 
                        disabled={isQuickAdding} 
                        startIcon={isQuickAdding ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />} 
                        sx={{ mt: 1, bgcolor: colors.primary, color: '#000', fontWeight: 900, borderRadius: 2.5, py: 1.2, '&:hover': { bgcolor: '#d97706' } }} 
                        onClick={handleQuickAddSubmit}
                    >
                        {isQuickAdding ? 'REGISTRANDO...' : 'REGISTRAR STOCK'}
                    </Button>
                </Box>
            </Dialog>

            {/* Subdialogs para creación al vuelo */}
            <CreateItemDialog open={createItemModal} onClose={() => setCreateItemModal(false)} onSuccess={(item: any) => { setQaItem(item.id); setCreateItemModal(false); }} depositoId={qaDepot} />
            <CreatePartnerDialog open={createPartnerModal} onClose={() => setCreatePartnerModal(false)} onSuccess={(supplier: any) => { setQaSupplier(supplier.id); setCreatePartnerModal(false); }} defaultType="SUPPLIER" />
            
            <style>{`
                .hoverable-row:hover {
                    background-color: var(--bg-alt-row, rgba(255,255,255,0.02)) !important;
                }
                .material-card-hover:hover {
                    border-color: ${colors.primary} !important;
                    transform: translateY(-1px);
                }
            `}</style>
        </Box>
    );
}
