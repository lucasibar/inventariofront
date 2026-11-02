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
    Chip,
    Fab
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

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
import { PositionActionSheet } from '../../features/warehouse/stock/ui/PositionActionSheet';
import { AdjustStockDialog } from '../../features/warehouse/stock/ui/AdjustStockDialog';
import { EditLotDialog } from '../../features/warehouse/stock/ui/EditLotDialog';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectAllowedDepots } from '../../entities/auth/model/authSlice';
import { useIsMobile } from '../../shared/ui';

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

    // Movimiento Rápido state
    const [moveStockMutation, { isLoading: isMovingStock }] = useMoveStockMutation();
    const [moveModal, setMoveModal] = useState(false);
    const [moveEntry, setMoveEntry] = useState<any>(null);
    const [moveDestDepot, setMoveDestDepot] = useState<string>('');
    const [moveDestPos, setMoveDestPos] = useState<string>('');
    const [moveCajas, setMoveCajas] = useState<string>('');
    const [moveKilos, setMoveKilos] = useState<string>('');
    const [isManualKilosEdited, setIsManualKilosEdited] = useState<boolean>(false);
    const [feedbackToast, setFeedbackToast] = useState<{ msg: string; severity: 'success' | 'info' | 'error' } | null>(null);

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
            setFeedbackToast({ msg: `✅ Movimiento completado: ${kilos} kg a ${destPosName}`, severity: 'success' });
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

    // Agrupación y Métricas
    const { groupedData, generalMetrics } = useMemo(() => {
        const general = { kilos: 0, units: 0, positions: new Set<string>() };
        if (!rawStock.length) return { groupedData: [], generalMetrics: null };
        const groups: Record<string, any> = {};
        const searchWords = normalizeText(searchTerm).split(' ').filter(w => w.length > 0);
        
        // Filtrado insensible a acentos y mayúsculas
        const filteredStock = rawStock.filter((entry: any) => {
            if (searchWords.length === 0) return true;
            return searchWords.every(word => {
                const itemDesc = normalizeText(entry.batch?.item?.descripcion || '');
                const itemCode = normalizeText(entry.batch?.item?.codigoInterno || '');
                const lotNum = normalizeText(entry.batch?.lotNumber || '');
                const supplierName = normalizeText(entry.batch?.supplier?.name || '');
                const posCode = normalizeText(entry.posicion?.codigo || '');
                const categoryName = normalizeText(entry.batch?.item?.category?.nombre || entry.batch?.item?.categoria || '');
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
                    oldestBatchDate: entry.batch?.createdAt || entry.batch?.productionDate || '9999-12-31',
                    oldestBatchLot: entry.batch?.lotNumber,
                    metrics: { kilos: 0, units: 0 },
                    uniquePositions: new Set<string>()
                };
            }
            groups[itemId].entries.push(entry);
            groups[itemId].metrics.kilos += Number(entry.qtyPrincipal || 0);
            if (entry.qtySecundaria) groups[itemId].metrics.units += Number(entry.qtySecundaria);
            if (entry.posicion?.codigo) groups[itemId].uniquePositions.add(entry.posicion.codigo);
            
            // FIFO real por fecha de ingreso
            const batchDate = entry.batch?.createdAt || entry.batch?.productionDate || '9999-12-31';
            if (batchDate < groups[itemId].oldestBatchDate) {
                groups[itemId].oldestBatchDate = batchDate;
                groups[itemId].oldestBatchLot = entry.batch?.lotNumber;
            }
        });

        return {
            groupedData: Object.values(groups).sort((a: any, b: any) => a.item.descripcion.localeCompare(b.item.descripcion)),
            generalMetrics: { ...general, positionsCount: general.positions.size }
        };
    }, [rawStock, searchTerm]);

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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                    {groupedData.map((group: any) => {
                        const categoryName = group.item.category?.nombre || group.item.categoria || 'General';
                        const positionsList = Array.from(group.uniquePositions as Set<string>);

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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                        <div>
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
                                            <Typography variant="body1" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.25, mt: 0.3 }}>
                                                {group.item.descripcion}
                                            </Typography>
                                        </div>
                                        <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.7rem' }}>
                                            {categoryName}
                                        </Typography>
                                    </div>
                                    
                                    {group.supplier?.name && (
                                        <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.72rem', display: 'block', mb: 1 }}>
                                            Prov: <strong style={{ color: '#fff' }}>{group.supplier.name}</strong>
                                        </Typography>
                                    )}

                                    {/* Cantidades Totalizadas */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mt: 1, p: 1.2, bgcolor: 'rgba(0,0,0,0.25)', borderRadius: 2, border: `1px solid ${colors.border}` }}>
                                        <div>
                                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: colors.textDim, fontWeight: 700, textTransform: 'uppercase' }}>Stock Total</Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                                                {group.metrics.kilos.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                                                <small style={{ fontSize: '0.75rem', color: colors.textDim }}>{group.item.unidadPrincipal || 'kg'}</small>
                                            </Typography>
                                        </div>
                                        {group.metrics.units > 0 && (
                                            <div style={{ textAlign: 'right' }}>
                                                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: colors.textDim, fontWeight: 700, textTransform: 'uppercase' }}>Bultos</Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 800, color: colors.success, lineHeight: 1 }}>
                                                    {group.metrics.units.toLocaleString('es-AR')}{' '}
                                                    <small style={{ fontSize: '0.7rem', color: colors.textDim }}>{group.item.unidadSecundaria || 'un'}</small>
                                                </Typography>
                                            </div>
                                        )}
                                    </Box>

                                    {/* Ubicaciones Resumidas Elegantes */}
                                    <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                                        {positionsList.slice(0, 3).map((posCode, pIdx) => (
                                            <Chip
                                                key={pIdx}
                                                size="small"
                                                label={`📍 ${posCode}`}
                                                sx={{ 
                                                    bgcolor: 'rgba(59, 130, 246, 0.12)', 
                                                    color: colors.info, 
                                                    fontWeight: 800, 
                                                    fontSize: '0.72rem', 
                                                    height: '22px' 
                                                }}
                                            />
                                        ))}
                                        {positionsList.length > 3 && (
                                            <Chip
                                                size="small"
                                                label={`+${positionsList.length - 3} más`}
                                                sx={{ 
                                                    bgcolor: 'rgba(255, 255, 255, 0.06)', 
                                                    color: colors.textDim, 
                                                    fontWeight: 700, 
                                                    fontSize: '0.7rem', 
                                                    height: '22px' 
                                                }}
                                            />
                                        )}
                                    </Box>
                                </div>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: `1px solid ${colors.border}` }}>
                                    <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.7rem' }}>
                                        {group.entries.length} {group.entries.length === 1 ? 'partida' : 'partidas'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        Detalle y Acciones <ArrowForwardIcon sx={{ fontSize: 13 }} />
                                    </Typography>
                                </Box>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Vista Lista Clickeable */
                <Paper sx={{ bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, overflowX: 'auto' }}>
                    <MuiTable size="small">
                        <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.25)' }}>
                            <TableRow sx={{ '& th': { color: colors.textDim, fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', py: 1.2 } }}>
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
                            {groupedData.map((group: any) => {
                                const categoryName = group.item.category?.nombre || group.item.categoria || 'General';
                                const positionsList = Array.from(group.uniquePositions as Set<string>);

                                return (
                                    <TableRow 
                                        key={group.item.id} 
                                        onClick={() => setDetailGroupId(group.item.id)}
                                        className="hoverable-row"
                                        sx={{ cursor: 'pointer', borderBottom: `1px solid ${colors.border}`, '& td': { py: 1 } }}
                                    >
                                        <TableCell onClick={(e) => { e.stopPropagation(); setEditItemTarget(group.item); }}>
                                            <Tooltip title="Toca para editar ficha del material">
                                                <Typography sx={{ color: colors.primary, fontWeight: 800, fontSize: '0.78rem', textDecoration: 'underline dotted' }}>
                                                    {group.item.codigoInterno}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#fff', fontSize: '0.82rem' }}>
                                            {group.item.descripcion}
                                        </TableCell>
                                        <TableCell sx={{ color: colors.textDim, fontSize: '0.75rem' }}>
                                            {categoryName}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {positionsList.slice(0, 3).map((p, idx) => (
                                                    <Chip key={idx} size="small" label={p} sx={{ fontSize: '0.68rem', height: '20px', bgcolor: 'rgba(59, 130, 246, 0.12)', color: colors.info, fontWeight: 700 }} />
                                                ))}
                                                {positionsList.length > 3 && (
                                                    <Chip size="small" label={`+${positionsList.length - 3}`} sx={{ fontSize: '0.68rem', height: '20px' }} />
                                                )}
                                            </Box>
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

            {/* Modal de Detalle de Material */}
            {detailGroup && (
                <Modal 
                    open={!!detailGroupId} 
                    onClose={() => setDetailGroupId(null)}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Paper sx={{ width: '94%', maxWidth: 860, bgcolor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 3.5, p: 2.5, outline: 'none', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', maxHeight: '92vh', overflowY: 'auto' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box>
                                <Typography 
                                    variant="caption" 
                                    onClick={() => setEditItemTarget(detailGroup.item)}
                                    sx={{ color: colors.primary, fontWeight: 800, cursor: 'pointer', textDecoration: 'underline dotted' }}
                                >
                                    {detailGroup.item.codigoInterno} ✎
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>
                                    {detailGroup.item.descripcion}
                                </Typography>
                                <Typography variant="caption" sx={{ color: colors.textDim }}>
                                    Proveedor: <strong>{detailGroup.supplier?.name || '—'}</strong> • Categoría: <strong>{detailGroup.item.category?.nombre || 'General'}</strong>
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip 
                                    label={`Total: ${detailGroup.metrics.kilos.toLocaleString('es-AR', { minimumFractionDigits: 1 })} ${detailGroup.item.unidadPrincipal || 'kg'}`}
                                    sx={{ bgcolor: 'rgba(245, 158, 11, 0.15)', color: colors.primary, fontWeight: 800, fontSize: '0.78rem' }}
                                />
                                <IconButton onClick={() => setDetailGroupId(null)} sx={{ color: colors.textDim }}><CloseIcon /></IconButton>
                            </Box>
                        </Box>
                        
                        <TableContainer sx={{ maxHeight: 460, overflowY: 'auto', border: `1px solid ${colors.border}`, borderRadius: 2 }}>
                            <MuiTable size="small">
                                <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.3)' }}>
                                    <TableRow sx={{ '& th': { color: colors.textDim, fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase' } }}>
                                        <TableCell>Ubicación</TableCell>
                                        <TableCell>Lote / Partida</TableCell>
                                        <TableCell align="right">Kilos</TableCell>
                                        <TableCell align="right">Bultos</TableCell>
                                        <TableCell align="center">Acciones</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {detailGroup.entries.map((entry: any) => {
                                        const isOldest = entry.batch?.lotNumber === detailGroup.oldestBatchLot;
                                        const isDeleting = deletingKeys.includes(getEntryKey(entry));

                                        return (
                                            <TableRow key={entry.id} sx={{ opacity: isDeleting ? 0.5 : 1, '& td': { color: '#fff', py: 1.1 } }}>
                                                {/* Chip táctil de Ubicación abre menú de acciones */}
                                                <TableCell>
                                                    <Tooltip title="Toca para abrir menú de acciones de esta ubicación">
                                                        <Chip 
                                                            icon={<SwapHorizIcon style={{ fontSize: 15, color: colors.info }} />}
                                                            label={entry.posicion?.codigo || 'S/P'}
                                                            onClick={() => setActionSheetEntry(entry)}
                                                            clickable
                                                            sx={{ 
                                                                bgcolor: 'rgba(59, 130, 246, 0.15)', 
                                                                color: colors.info, 
                                                                fontWeight: 800, 
                                                                fontSize: '0.78rem',
                                                                border: `1px solid rgba(59, 130, 246, 0.3)`,
                                                                cursor: 'pointer',
                                                                minHeight: '32px'
                                                            }}
                                                        />
                                                    </Tooltip>
                                                </TableCell>

                                                {/* Lote con indicador FIFO real */}
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                        <Typography 
                                                            variant="body2" 
                                                            onClick={() => setEditLotEntry(entry)}
                                                            sx={{ cursor: 'pointer', textDecoration: 'underline dashed', color: isOldest ? colors.primary : '#fff', fontWeight: isOldest ? 800 : 500 }}
                                                        >
                                                            {entry.batch?.lotNumber}
                                                        </Typography>
                                                        {isOldest && (
                                                            <Tooltip title="Partida más antigua de este material en stock (Prioridad de salida FIFO)">
                                                                <Chip label="FIFO" size="small" sx={{ height: '18px', fontSize: '0.62rem', fontWeight: 900, bgcolor: 'rgba(245, 158, 11, 0.2)', color: colors.primary }} />
                                                            </Tooltip>
                                                        )}
                                                        {entry.batch?.observaciones && (
                                                            <Tooltip title={entry.batch.observaciones}>
                                                                <WarningAmberIcon sx={{ fontSize: 15, color: colors.primary }} />
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                </TableCell>

                                                {/* Kilos ajustables con diálogo seguro */}
                                                <TableCell align="right">
                                                    <Typography 
                                                        variant="body2" 
                                                        onClick={() => setAdjustStockEntry(entry)}
                                                        sx={{ cursor: 'pointer', textDecoration: 'underline dashed', color: colors.primary, fontWeight: 800 }}
                                                    >
                                                        {Number(entry.qtyPrincipal).toFixed(1)} <small style={{ color: colors.textDim }}>{detailGroup.item.unidadPrincipal}</small>
                                                    </Typography>
                                                </TableCell>

                                                <TableCell align="right">
                                                    {entry.qtySecundaria ? (
                                                        <Typography 
                                                            variant="body2" 
                                                            onClick={() => setAdjustStockEntry(entry)}
                                                            sx={{ cursor: 'pointer', textDecoration: 'underline dashed', color: colors.success, fontWeight: 700 }}
                                                        >
                                                            {entry.qtySecundaria} <small style={{ color: colors.textDim }}>{detailGroup.item.unidadSecundaria}</small>
                                                        </Typography>
                                                    ) : '—'}
                                                </TableCell>

                                                {/* Botón Acción Rápida */}
                                                <TableCell align="center">
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => setActionSheetEntry(entry)}
                                                        sx={{ fontSize: '0.7rem', py: 0.2, px: 1, color: colors.info, borderColor: 'rgba(56, 189, 248, 0.4)', borderRadius: 1.5 }}
                                                    >
                                                        Acciones
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </MuiTable>
                        </TableContainer>
                    </Paper>
                </Modal>
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

            {/* Quick Move Modal */}
            {moveModal && moveEntry && (
                <Modal
                    open={moveModal}
                    onClose={() => { if (!isMovingStock) { setMoveModal(false); setMoveEntry(null); } }}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Paper sx={{ 
                        width: '94%', 
                        maxWidth: 520, 
                        bgcolor: colors.bg, 
                        border: `1px solid ${colors.info}`, 
                        borderRadius: 3.5, 
                        p: 2.5, 
                        outline: 'none', 
                        boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
                        maxHeight: '92vh',
                        overflowY: 'auto'
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SwapHorizIcon sx={{ color: colors.info, fontSize: '1.6rem' }} />
                                <Typography variant="h6" sx={{ fontWeight: 900, color: '#fff' }}>
                                    Mover de Ubicación
                                </Typography>
                            </Box>
                            <IconButton onClick={() => { setMoveModal(false); setMoveEntry(null); }} sx={{ color: colors.textDim }}>
                                <CloseIcon />
                            </IconButton>
                        </Box>

                        {/* Detalle del origen */}
                        <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2.5, border: `1px solid ${colors.border}`, mb: 2 }}>
                            <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 800 }}>
                                {moveEntry.batch?.item?.codigoInterno}
                            </Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.2, mb: 1 }}>
                                {moveEntry.batch?.item?.descripcion}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, alignItems: 'center' }}>
                                <Chip size="small" label={`📍 Origen: ${moveEntry.posicion?.codigo || 'S/P'}`} sx={{ bgcolor: 'rgba(59, 130, 246, 0.15)', color: colors.info, fontWeight: 800 }} />
                                <Chip size="small" label={`Lote: ${moveEntry.batch?.lotNumber}`} sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 700 }} />
                                <Chip size="small" label={`Disponible: ${moveEntry.qtyPrincipal} ${moveEntry.batch?.item?.unidadPrincipal || 'kg'}`} sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: colors.success, fontWeight: 800 }} />
                            </Box>
                        </Box>

                        {/* Destino con consulta global de ocupación */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
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
                                    sx={{ flex: '2 1 220px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                                    renderInput={(params) => <TextField {...params} label="Posición Destino *" placeholder="Buscar posición..." />}
                                />
                            </Box>

                            {selectedDestPosData && (
                                !selectedDestPosData.isOccupied ? (
                                    <Box sx={{ p: 1.2, bgcolor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 2 }}>
                                        <Typography variant="body2" sx={{ color: colors.success, fontSize: '0.78rem', fontWeight: 700 }}>
                                            ✅ Posición {selectedDestPosData.codigo} libre y disponible.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box sx={{ p: 1.2, bgcolor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 2 }}>
                                        <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.68rem', display: 'block', mb: 0.5 }}>
                                            📦 Mercadería en {selectedDestPosData.codigo}:
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.75rem', lineHeight: 1.3, display: 'block' }}>
                                            {selectedDestPosData.contentsSummary}
                                        </Typography>
                                    </Box>
                                )
                            )}
                        </Box>

                        {/* Cantidades */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
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

                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <TextField
                                    label={`Cajas (${moveEntry.batch?.item?.unidadSecundaria || 'Cajas'})`}
                                    type="number"
                                    size="small"
                                    fullWidth
                                    placeholder={moveEntry.qtySecundaria ? `Disp: ${moveEntry.qtySecundaria}` : '0'}
                                    value={moveCajas}
                                    onChange={(e) => handleCajasChange(e.target.value)}
                                    InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                                />

                                <TextField
                                    label={`Kilos * (${moveEntry.batch?.item?.unidadPrincipal || 'kg'})`}
                                    type="number"
                                    size="small"
                                    fullWidth
                                    placeholder={`Disp: ${moveEntry.qtyPrincipal}`}
                                    value={moveKilos}
                                    onChange={(e) => handleKilosChange(e.target.value)}
                                    InputProps={{ sx: { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                                />
                            </Box>

                            {/* Recomendación de equivalencia de kilos */}
                            {(() => {
                                const ratio = getKilosPorCajaRatio(moveEntry);
                                const cajasNum = parseFloat(moveCajas.replace(',', '.'));
                                if (ratio && !isNaN(cajasNum) && cajasNum > 0) {
                                    return (
                                        <Box sx={{ p: 1, bgcolor: 'rgba(59, 130, 246, 0.08)', border: `1px dashed rgba(59, 130, 246, 0.3)`, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="caption" sx={{ color: colors.info, fontSize: '0.74rem' }}>
                                                💡 Estimado: <strong>~{ratio.toFixed(2)} kg/caja</strong>
                                            </Typography>
                                            {isManualKilosEdited && (
                                                <Button 
                                                    size="small" 
                                                    onClick={() => handleCajasChange(moveCajas)} 
                                                    sx={{ fontSize: '0.68rem', color: colors.info, textTransform: 'none', p: 0.2 }}
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

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 2, borderTop: `1px solid ${colors.border}`, pt: 1.5 }}>
                            <Button variant="text" onClick={() => { setMoveModal(false); setMoveEntry(null); }} sx={{ color: colors.textDim }}>
                                Cancelar
                            </Button>
                            <Button
                                variant="contained"
                                disabled={isMovingStock || !moveDestPos || !moveKilos || parseFloat(moveKilos) <= 0}
                                onClick={handleConfirmMove}
                                startIcon={isMovingStock ? <CircularProgress size={16} color="inherit" /> : <SwapHorizIcon />}
                                sx={{ bgcolor: colors.info, color: '#fff', fontWeight: 800, borderRadius: 2, px: 2.5, '&:hover': { bgcolor: '#2563eb' } }}
                            >
                                {isMovingStock ? 'Moviendo...' : 'Confirmar Movimiento'}
                            </Button>
                        </Box>
                    </Paper>
                </Modal>
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

            {/* Empty Positions Modal */}
            {emptyPositionsModal && (
                <Modal 
                    open={emptyPositionsModal} 
                    onClose={() => setEmptyPositionsModal(false)}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Paper sx={{ width: '90%', maxWidth: 450, bgcolor: colors.bg, border: `1px solid ${colors.info}`, borderRadius: 3, p: 2.5, outline: 'none' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography variant="h6" sx={{ fontWeight: 900, color: colors.info }}>Posiciones Libres ({emptyPositions.length})</Typography>
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
                                            px: 1.2, 
                                            py: 0.4, 
                                            bgcolor: 'rgba(255,255,255,0.05)', 
                                            border: `1px solid ${colors.border}`, 
                                            borderRadius: 1.5, 
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
                    </Paper>
                </Modal>
            )}

            {/* Carga Rápida Drawer */}
            <Drawer 
                anchor="bottom" 
                open={quickAddModal} 
                onClose={() => setQuickAddModal(false)}
                PaperProps={{ sx: { bgcolor: colors.bg, color: colors.text, borderTop: `1px solid ${colors.primary}`, borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 3, pb: 6 } }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: colors.primary }}>CARGA RÁPIDA DE STOCK</Typography>
                    <IconButton onClick={() => setQuickAddModal(false)} sx={{ color: colors.textDim }}><CloseIcon /></IconButton>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8, maxWidth: 540, margin: '0 auto', width: '100%' }}>
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
            </Drawer>

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
