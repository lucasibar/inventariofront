import { useState, useMemo, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    IconButton, 
    TextField, 
    Button,
    Chip,
    Paper,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Drawer,
    Badge,
    LinearProgress,
    InputAdornment,
    Menu,
    MenuItem,
    Checkbox,
    FormControlLabel,
    Snackbar,
    Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LayersIcon from '@mui/icons-material/Layers';

import { useSelector } from 'react-redux';
import { selectAllowedDepots } from '../../entities/auth/model/authSlice';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { 
    useGetItemsQuery, 
    useGetItemCategoriesQuery,
    useUpdateItemMutation 
} from '../../features/warehouse/materiales/api/items.api';
import { useGetStockQuery } from '../../features/warehouse/stock/api/stock.api';
import { 
    useGetCombosQuery, 
    useCreateComboMutation, 
    useDeleteComboMutation,
    useUpdateComboMutation 
} from '../../features/purchasing/combos/api/combos.api';
import { useListarPedidosProduccionQuery } from '../../features/quality/ordenes-produccion/api/ordenesProduccion.api';
import { useGetArticulosSinEstructuraQuery } from '../../features/ventas/api/ventas.api';
import { useGetPartnersQuery } from '../../features/config/partners/api/partners.api';
import { EditComboModal } from '../../features/warehouse/stock/ui/EditComboModal';
import { CreateItemDialog } from '../../features/warehouse/materiales/components/CreateItemDialog';
import { useIsMobile } from '../../shared/ui';

// Paleta visual moderna y consistente con el Centro de Comando
const colors = {
    primary: '#f59e0b', // Amber para acentos y compras
    bg: 'var(--bg-primary, #0f1117)',
    cardBg: 'var(--bg-hover-row, rgba(255,255,255,0.03))',
    border: 'rgba(255, 255, 255, 0.08)',
    text: 'var(--text-primary, #f3f4f6)',
    textDim: 'var(--text-muted, #9ca3af)',
    danger: '#ef4444',
    warning: '#f97316',
    success: '#10b981',
    info: '#38bdf8',
    purple: '#a855f7',
    inputBg: 'var(--bg-action-btn, rgba(255,255,255,0.05))'
};

const normalizeText = (text: string) =>
    (text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

export default function MaterialesCriticosPage() {
    const isMobile = useIsMobile();
    const allowedDepots = useSelector(selectAllowedDepots);

    // 1. Depósitos disponibles
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => {
        const active = rawDepots.filter((d: any) => d.activo !== false);
        if (!allowedDepots) return active;
        return active.filter((d: any) => allowedDepots.includes(d.id));
    }, [rawDepots, allowedDepots]);

    const [depotId, setDepotId] = useState<string>(() => sessionStorage.getItem('selectedPurchasingDepotId') || '');

    useEffect(() => {
        if (depotId) sessionStorage.setItem('selectedPurchasingDepotId', depotId);
    }, [depotId]);

    useEffect(() => {
        if (!depotId && depots.length === 1) {
            setDepotId(depots[0].id);
        }
    }, [depots, depotId]);

    // 2. Consultas de API
    const { data: categories = [] } = useGetItemCategoriesQuery(depotId || undefined);
    const { data: items = [] } = useGetItemsQuery({ depositoId: depotId || undefined });
    const { data: allStock = [] } = useGetStockQuery({ depotId: depotId || undefined });
    const { data: pedidosProduccion = [] } = useListarPedidosProduccionQuery();
    const { data: articulosSinEstructura = [] } = useGetArticulosSinEstructuraQuery();
    const { data: combos = [] } = useGetCombosQuery(depotId || undefined);
    const { data: partners = [] } = useGetPartnersQuery({ type: 'SUPPLIER' });

    // Mutaciones
    const [updateItem] = useUpdateItemMutation();
    const [createCombo] = useCreateComboMutation();
    const [deleteCombo] = useDeleteComboMutation();
    const [updateCombo] = useUpdateComboMutation();

    // 3. Estados de vista y navegación
    const [activeTab, setActiveTab] = useState<'CRITICOS' | 'COMBOS'>('CRITICOS');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'OK'>('ALL');
    const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [categoryMenuAnchor, setCategoryMenuAnchor] = useState<null | HTMLElement>(null);
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

    // Diálogos y modales
    const [editLimitsItem, setEditLimitsItem] = useState<any | null>(null);
    const [minLimitInput, setMinLimitInput] = useState<string>('');
    const [maxLimitInput, setMaxLimitInput] = useState<string>('');
    const [porVenirInput, setPorVenirInput] = useState<string>('');
    const [editItemTarget, setEditItemTarget] = useState<any | null>(null);
    const [editComboTarget, setEditComboTarget] = useState<any | null>(null);
    const [newComboModalOpen, setNewComboModalOpen] = useState(false);
    const [feedbackToast, setFeedbackToast] = useState<{ msg: string; severity: 'success' | 'info' | 'error' } | null>(null);

    // Form nuevo combo
    const [newComboTitle, setNewComboTitle] = useState('');
    const [newComboSupplier, setNewComboSupplier] = useState('');
    const [newComboItems, setNewComboItems] = useState<string[]>([]);

    // Inicializar categorías seleccionadas cuando carguen
    useEffect(() => {
        if (categories.length > 0 && selectedCategoryIds.length === 0) {
            setSelectedCategoryIds(categories.map((c: any) => c.id));
        }
    }, [categories]);

    // Mapeo de Stock Total por ItemId
    const stockTotalsByItem = useMemo(() => {
        const map = new Map<string, number>();
        allStock.forEach((sb: any) => {
            const current = map.get(sb.itemId) || 0;
            map.set(sb.itemId, current + Number(sb.qtyPrincipal || 0));
        });
        return map;
    }, [allStock]);

    // Normalizar y enriquecer ítems con métricas de criticidad y abastecimiento
    const enrichedItems = useMemo(() => {
        return items.map((item: any) => {
            const stockActual = stockTotalsByItem.get(item.id) || 0;
            const stockMinimo = item.stockMinimo !== null && item.stockMinimo !== undefined ? Number(item.stockMinimo) : null;
            const stockMaximo = item.stockMaximo !== null && item.stockMaximo !== undefined ? Number(item.stockMaximo) : null;
            const porVenir = Number(item.meta?.porVenir || item.porVenir || 0);
            const stockProyectado = stockActual + porVenir;
            const isIgnored = Boolean(item.meta?.ignorarStockMinimo);

            let status: 'CRITICAL' | 'WARNING' | 'OVERSTOCK' | 'OK' = 'OK';
            let deficitBruto = 0;
            let deficitNeto = 0;

            if (stockMinimo !== null && stockMinimo > 0 && !isIgnored) {
                if (stockActual < stockMinimo) {
                    deficitBruto = stockMinimo - stockActual;
                    deficitNeto = Math.max(0, stockMinimo - stockProyectado);

                    if (deficitNeto > 0) {
                        status = 'CRITICAL';
                    } else {
                        // El stock físico está bajo pero cubierto por lo que viene
                        status = 'WARNING';
                    }
                } else if (stockActual <= stockMinimo * 1.25) {
                    status = 'WARNING';
                }
            }

            if (stockMaximo !== null && stockMaximo > 0 && stockActual > stockMaximo) {
                status = 'OVERSTOCK';
            }

            return {
                ...item,
                stockActual,
                stockMinimo,
                stockMaximo,
                porVenir,
                stockProyectado,
                deficitBruto,
                deficitNeto,
                deficit: deficitNeto > 0 ? deficitNeto : deficitBruto,
                status,
                isIgnored,
                searchStr: normalizeText(`${item.codigoInterno} ${item.descripcion} ${item.category?.nombre || item.categoria || ''} ${item.supplier?.name || ''}`)
            };
        });
    }, [items, stockTotalsByItem]);

    // 4. Sistema Central de Alertas Cruzadas (Costadito)
    const activeAlerts = useMemo(() => {
        const list: Array<{
            id: string;
            type: 'MISSING_COLOR' | 'MISSING_STRUCTURE' | 'UNDER_MIN' | 'OVER_MAX' | 'NEAR_MIN';
            severity: 'danger' | 'warning' | 'info' | 'purple';
            title: string;
            subtitle: string;
            detail: string;
            metric?: string;
            itemRef?: any;
        }> = [];

        // A. Alertas de Pedidos con Colores Faltantes en Stock
        const activePedidos = pedidosProduccion.filter((p: any) => p.color_descripcion && (p.estado !== 'COMPLETADO' && p.estado !== 'FINALIZADO'));
        activePedidos.forEach((p: any) => {
            const colorNorm = normalizeText(p.color_descripcion);
            // Buscar si hay stock de hilado que coincida con este color
            const matchingStock = allStock.filter((s: any) => {
                const desc = normalizeText(s.batch?.item?.descripcion || '');
                return desc.includes(colorNorm) && Number(s.qtyPrincipal) > 0;
            });

            if (matchingStock.length === 0) {
                list.push({
                    id: `pedido-color-${p.numero_pedido}-${p.color_descripcion}`,
                    type: 'MISSING_COLOR',
                    severity: 'danger',
                    title: `Pedido #${p.numero_pedido} (${p.cliente_marca || 'Producción'})`,
                    subtitle: `Falta hilado para color "${p.color_descripcion}"`,
                    detail: `Artículo: ${p.articulo_codigo || 'S/D'} • ${p.docenas_pedidas || 0} docenas requeridas`,
                    metric: 'Sin stock'
                });
            }
        });

        // B. Alertas de Artículos en Pedidos de Venta Sin Estructura
        articulosSinEstructura.slice(0, 5).forEach((pv: any) => {
            list.push({
                id: `sin-estructura-${pv.id || pv.numeroPedido}`,
                type: 'MISSING_STRUCTURE',
                severity: 'purple',
                title: `Pedido Venta #${pv.numeroPedido}`,
                subtitle: `Artículo ${pv.articuloCodigo} sin receta técnica`,
                detail: `Cliente: ${pv.cliente || 'General'} • No se puede estimar consumo de hilado`,
                metric: 'Sin receta'
            });
        });

        // C. Alertas de Quiebre de Stock Mínimo
        enrichedItems.forEach((item: any) => {
            if (item.status === 'CRITICAL' && !item.isIgnored) {
                list.push({
                    id: `under-min-${item.id}`,
                    type: 'UNDER_MIN',
                    severity: 'warning',
                    title: `[${item.codigoInterno}] ${item.descripcion}`,
                    subtitle: `Por debajo del stock mínimo (Hace falta: -${item.deficitNeto.toFixed(1)} ${item.unidadPrincipal || 'kg'})`,
                    detail: `En Stock: ${item.stockActual.toFixed(1)} • Por Venir: ${item.porVenir.toFixed(1)} • Mínimo: ${item.stockMinimo}`,
                    metric: `-${item.deficitNeto.toFixed(1)} ${item.unidadPrincipal || 'kg'}`,
                    itemRef: item
                });
            } else if (item.status === 'OVERSTOCK') {
                const excess = item.stockActual - item.stockMaximo;
                list.push({
                    id: `over-max-${item.id}`,
                    type: 'OVER_MAX',
                    severity: 'info',
                    title: `[${item.codigoInterno}] ${item.descripcion}`,
                    subtitle: `Exceso de stock máximo (+${excess.toFixed(1)} ${item.unidadPrincipal || 'kg'})`,
                    detail: `En Stock: ${item.stockActual.toFixed(1)} • Máximo establecido: ${item.stockMaximo}`,
                    metric: `+${excess.toFixed(1)}`,
                    itemRef: item
                });
            }
        });

        return list;
    }, [pedidosProduccion, allStock, articulosSinEstructura, enrichedItems]);

    // 5. Agrupación de Ítems por Categoría (según filtro de categorías activas)
    const categoryGroups = useMemo(() => {
        const searchWords = normalizeText(search).split(' ').filter(w => w.length > 0);
        const groupsMap = new Map<string, {
            id: string;
            nombre: string;
            items: any[];
            totalStock: number;
            totalPorVenir: number;
            totalDeficit: number;
            criticalCount: number;
            warningCount: number;
            okCount: number;
        }>();

        // Inicializar categorías seleccionadas
        categories.forEach((cat: any) => {
            if (selectedCategoryIds.includes(cat.id)) {
                groupsMap.set(cat.id, {
                    id: cat.id,
                    nombre: cat.nombre,
                    items: [],
                    totalStock: 0,
                    totalPorVenir: 0,
                    totalDeficit: 0,
                    criticalCount: 0,
                    warningCount: 0,
                    okCount: 0
                });
            }
        });

        // Asignar ítems filtrados
        enrichedItems.forEach((item: any) => {
            const catId = item.categoryId || item.category?.id || 'SIN_CATEGORIA';
            if (!groupsMap.has(catId)) return;

            // Filtro de búsqueda
            if (searchWords.length > 0) {
                const matches = searchWords.every(word => item.searchStr.includes(word));
                if (!matches) return;
            }

            // Filtro de estado
            if (statusFilter === 'CRITICAL' && item.status !== 'CRITICAL') return;
            if (statusFilter === 'WARNING' && item.status !== 'WARNING') return;
            if (statusFilter === 'OK' && item.status !== 'OK') return;

            const group = groupsMap.get(catId)!;
            group.items.push(item);
            group.totalStock += item.stockActual;
            group.totalPorVenir += item.porVenir;
            group.totalDeficit += item.deficitNeto;
            if (item.status === 'CRITICAL') group.criticalCount++;
            else if (item.status === 'WARNING') group.warningCount++;
            else group.okCount++;
        });

        // Ordenar categorías: primero aquellas con mayor déficit o materiales críticos
        return Array.from(groupsMap.values())
            .filter(g => g.items.length > 0 || searchWords.length === 0)
            .sort((a, b) => {
                if (b.criticalCount !== a.criticalCount) return b.criticalCount - a.criticalCount;
                if (b.totalDeficit !== a.totalDeficit) return b.totalDeficit - a.totalDeficit;
                return a.nombre.localeCompare(b.nombre);
            });
    }, [categories, selectedCategoryIds, enrichedItems, search, statusFilter]);

    // Resumen Global de KPIs (Bosque)
    const kpiSummary = useMemo(() => {
        let totalItems = 0;
        let criticalItems = 0;
        let totalStock = 0;
        let totalPorVenir = 0;
        let totalDeficit = 0;

        enrichedItems.forEach((item: any) => {
            if (selectedCategoryIds.includes(item.categoryId || item.category?.id)) {
                totalItems++;
                totalStock += item.stockActual;
                totalPorVenir += item.porVenir;
                if (item.deficitNeto > 0) {
                    criticalItems++;
                    totalDeficit += item.deficitNeto;
                }
            }
        });

        return {
            totalItems,
            criticalItems,
            totalStock,
            totalPorVenir,
            totalDeficit,
            alertsCount: activeAlerts.length
        };
    }, [enrichedItems, selectedCategoryIds, activeAlerts]);

    // Manejador de selección de categorías
    const toggleCategorySelection = (catId: string) => {
        setSelectedCategoryIds(prev => 
            prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
        );
    };

    const selectAllCategories = () => {
        setSelectedCategoryIds(categories.map((c: any) => c.id));
    };

    const clearAllCategories = () => {
        setSelectedCategoryIds([]);
    };

    const toggleCollapseCategory = (catId: string) => {
        setCollapsedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
    };

    // Guardado de límites mínimos, máximos y stock por venir en-línea
    const handleSaveLimits = async () => {
        if (!editLimitsItem) return;
        const minVal = minLimitInput.trim() === '' ? null : Number(minLimitInput);
        const maxVal = maxLimitInput.trim() === '' ? null : Number(maxLimitInput);
        const porVenirVal = porVenirInput.trim() === '' ? 0 : Number(porVenirInput);

        try {
            await updateItem({
                id: editLimitsItem.id,
                data: {
                    stockMinimo: minVal,
                    stockMaximo: maxVal,
                    meta: {
                        ...(editLimitsItem.meta || {}),
                        porVenir: porVenirVal
                    }
                }
            }).unwrap();
            setFeedbackToast({ msg: `✅ Abastecimiento actualizado para ${editLimitsItem.descripcion}`, severity: 'success' });
            setEditLimitsItem(null);
        } catch (e: any) {
            alert(e?.data?.message || 'Error al actualizar abastecimiento');
        }
    };

    const handleToggleIgnoreMin = async (item: any) => {
        const nextIgnored = !item.isIgnored;
        try {
            await updateItem({
                id: item.id,
                data: {
                    meta: {
                        ...(item.meta || {}),
                        ignorarStockMinimo: nextIgnored
                    }
                }
            }).unwrap();
            setFeedbackToast({ msg: nextIgnored ? 'Alerta silenciada' : 'Alerta activada', severity: 'info' });
        } catch (e: any) {
            alert(e?.data?.message || 'Error al actualizar estado de alerta');
        }
    };

    // Creación de nuevo combo
    const handleCreateCombo = async () => {
        if (!newComboTitle || !newComboSupplier || newComboItems.length === 0) {
            alert('Completá el título, proveedor y seleccioná al menos un material.');
            return;
        }
        try {
            await createCombo({
                title: newComboTitle,
                supplierId: newComboSupplier,
                depositoId: depotId || undefined,
                itemIds: newComboItems
            }).unwrap();
            setFeedbackToast({ msg: '✅ Combo de compra creado con éxito', severity: 'success' });
            setNewComboModalOpen(false);
            setNewComboTitle('');
            setNewComboSupplier('');
            setNewComboItems([]);
        } catch (e: any) {
            alert(e?.data?.message || 'Error al crear combo');
        }
    };

    const handleDeleteCombo = async (comboId: string) => {
        if (!window.confirm('¿Querés eliminar este combo de compra?')) return;
        try {
            await deleteCombo(comboId).unwrap();
            setFeedbackToast({ msg: 'Combo eliminado', severity: 'info' });
        } catch (e: any) {
            alert(e?.data?.message || 'Error al eliminar combo');
        }
    };

    return (
        <Box sx={{ p: isMobile ? 1.5 : 3.5, maxWidth: '1440px', margin: '0 auto', color: colors.text, minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            
            {/* Header Principal con Selector de Depósito y Acceso a Alertas */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                        Abastecimiento y Materiales Críticos
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textDim }}>
                        Control de compras, umbrales de seguridad, combos de proveedores y alertas operativas
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    {depots.length > 1 && (
                        <TextField
                            select
                            size="small"
                            value={depotId}
                            onChange={(e) => setDepotId(e.target.value)}
                            sx={{ minWidth: 170, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                        >
                            {depots.map((d: any) => (
                                <MenuItem key={d.id} value={d.id}>🏢 {d.nombre}</MenuItem>
                            ))}
                        </TextField>
                    )}

                    {/* Botón Indicador de Alertas (Costadito) */}
                    <Tooltip title="Ver alertas de stock y pedidos en planta">
                        <Button
                            variant="outlined"
                            onClick={() => setAlertsDrawerOpen(true)}
                            startIcon={
                                activeAlerts.length > 0 ? (
                                    <Badge badgeContent={activeAlerts.length} color="error">
                                        <NotificationsIcon sx={{ color: colors.danger, fontSize: 20 }} />
                                    </Badge>
                                ) : (
                                    <CheckCircleOutlineIcon sx={{ color: colors.success, fontSize: 20 }} />
                                )
                            }
                            sx={{ 
                                borderRadius: 2.5, 
                                fontWeight: 800, 
                                fontSize: '0.78rem',
                                color: activeAlerts.length > 0 ? '#fff' : colors.success,
                                borderColor: activeAlerts.length > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)',
                                bgcolor: activeAlerts.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.08)',
                                px: 2,
                                py: 0.8,
                                '&:hover': {
                                    bgcolor: activeAlerts.length > 0 ? 'rgba(239, 68, 68, 0.22)' : 'rgba(16, 185, 129, 0.18)'
                                }
                            }}
                        >
                            {activeAlerts.length > 0 ? `${activeAlerts.length} Alertas Activas` : 'Todo en regla (0)'}
                        </Button>
                    </Tooltip>
                </Box>
            </Box>

            {/* Selector de Categorías Dinámico al Principio */}
            <Paper sx={{ p: 1.5, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LayersIcon sx={{ fontSize: 18, color: colors.primary }} />
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Categorías Visibles ({selectedCategoryIds.length} de {categories.length})
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                            size="small" 
                            onClick={selectAllCategories} 
                            sx={{ fontSize: '0.68rem', color: colors.primary, fontWeight: 800, p: 0.2 }}
                        >
                            Ver Todas
                        </Button>
                        <Button 
                            size="small" 
                            onClick={clearAllCategories} 
                            sx={{ fontSize: '0.68rem', color: colors.textDim, p: 0.2 }}
                        >
                            Ocultar Todas
                        </Button>
                        <IconButton 
                            size="small" 
                            onClick={(e) => setCategoryMenuAnchor(e.currentTarget)} 
                            sx={{ color: colors.textDim }}
                        >
                            <FilterListIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>

                {/* Chips de Categorías Seleccionables */}
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {categories.map((cat: any) => {
                        const isSelected = selectedCategoryIds.includes(cat.id);
                        return (
                            <Chip
                                key={cat.id}
                                label={cat.nombre}
                                onClick={() => toggleCategorySelection(cat.id)}
                                size="small"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    bgcolor: isSelected ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                                    color: isSelected ? colors.primary : colors.textDim,
                                    border: isSelected ? `1px solid ${colors.primary}` : `1px solid ${colors.border}`,
                                    transition: 'all 0.15s ease',
                                    '&:hover': {
                                        bgcolor: isSelected ? 'rgba(245, 158, 11, 0.28)' : 'rgba(255, 255, 255, 0.1)'
                                    }
                                }}
                            />
                        );
                    })}
                </Box>
            </Paper>

            {/* Menú Desplegable para Configurar Categorías */}
            <Menu
                anchorEl={categoryMenuAnchor}
                open={Boolean(categoryMenuAnchor)}
                onClose={() => setCategoryMenuAnchor(null)}
                PaperProps={{
                    sx: { bgcolor: '#161922', color: '#fff', border: `1px solid ${colors.border}`, borderRadius: 2.5, minWidth: 220, maxHeight: 340 }
                }}
            >
                <Box sx={{ p: 1.5, borderBottom: `1px solid ${colors.border}` }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#fff' }}>
                        Filtrar Categorías
                    </Typography>
                </Box>
                {categories.map((cat: any) => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    return (
                        <MenuItem key={cat.id} onClick={() => toggleCategorySelection(cat.id)} sx={{ py: 0.5 }}>
                            <FormControlLabel
                                control={<Checkbox size="small" checked={isSelected} sx={{ color: colors.textDim, '&.Mui-checked': { color: colors.primary } }} />}
                                label={<Typography variant="body2" sx={{ fontWeight: isSelected ? 800 : 500 }}>{cat.nombre}</Typography>}
                                sx={{ m: 0, width: '100%' }}
                            />
                        </MenuItem>
                    );
                })}
            </Menu>

            {/* KPIs Macro (Bosque) */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                <Paper sx={{ p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 3 }}>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>📦 En Stock Físico</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#fff', mt: 0.5 }}>
                        {kpiSummary.totalStock.toLocaleString('es-AR', { maximumFractionDigits: 1 })} <small style={{ fontSize: '0.72rem', color: colors.textDim }}>kg/un</small>
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.68rem', display: 'block', mt: 0.3 }}>
                        {kpiSummary.totalItems} materiales monitoreados
                    </Typography>
                </Paper>
                <Paper sx={{ p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 3 }}>
                    <Typography variant="caption" sx={{ color: colors.info, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>🚚 Por Venir (En Camino)</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: colors.info, mt: 0.5 }}>
                        {kpiSummary.totalPorVenir.toLocaleString('es-AR', { maximumFractionDigits: 1 })} <small style={{ fontSize: '0.72rem', color: colors.textDim }}>kg/un</small>
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.68rem', display: 'block', mt: 0.3 }}>
                        Mercadería en tránsito / pedida
                    </Typography>
                </Paper>
                <Paper sx={{ p: 2, bgcolor: colors.cardBg, border: `1px solid ${kpiSummary.totalDeficit > 0 ? 'rgba(239, 68, 68, 0.3)' : colors.border}`, borderRadius: 3 }}>
                    <Typography variant="caption" sx={{ color: kpiSummary.totalDeficit > 0 ? colors.danger : colors.success, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>🎯 Hace Falta Comprar</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: kpiSummary.totalDeficit > 0 ? colors.danger : colors.success, mt: 0.5 }}>
                        {kpiSummary.totalDeficit.toLocaleString('es-AR', { maximumFractionDigits: 1 })} <small style={{ fontSize: '0.72rem', color: colors.textDim }}>kg/un</small>
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.68rem', display: 'block', mt: 0.3 }}>
                        {kpiSummary.criticalItems > 0 ? `${kpiSummary.criticalItems} materiales en quiebre neto` : 'Todo cubierto'}
                    </Typography>
                </Paper>
                <Paper sx={{ p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 3 }}>
                    <Typography variant="caption" sx={{ color: kpiSummary.alertsCount > 0 ? colors.warning : colors.success, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>🔔 Alertas en Planta</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: kpiSummary.alertsCount > 0 ? colors.warning : colors.success, mt: 0.5 }}>
                        {kpiSummary.alertsCount}
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.68rem', display: 'block', mt: 0.3 }}>
                        {kpiSummary.alertsCount > 0 ? 'Pedidos y stock a revisar' : 'Sin desvíos operativos'}
                    </Typography>
                </Paper>
            </Box>

            {/* Barra de Filtros y Selector de Vista (Materiales Críticos vs Combos) */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                        variant={activeTab === 'CRITICOS' ? 'contained' : 'outlined'}
                        startIcon={<InventoryIcon />}
                        onClick={() => setActiveTab('CRITICOS')}
                        sx={{
                            borderRadius: 2.5,
                            fontWeight: 800,
                            textTransform: 'none',
                            bgcolor: activeTab === 'CRITICOS' ? colors.primary : 'transparent',
                            color: activeTab === 'CRITICOS' ? '#000' : colors.textDim,
                            borderColor: activeTab === 'CRITICOS' ? 'transparent' : colors.border
                        }}
                    >
                        Materiales por Categoría
                    </Button>
                    <Button
                        variant={activeTab === 'COMBOS' ? 'contained' : 'outlined'}
                        startIcon={<ShoppingCartIcon />}
                        onClick={() => setActiveTab('COMBOS')}
                        sx={{
                            borderRadius: 2.5,
                            fontWeight: 800,
                            textTransform: 'none',
                            bgcolor: activeTab === 'COMBOS' ? colors.primary : 'transparent',
                            color: activeTab === 'COMBOS' ? '#000' : colors.textDim,
                            borderColor: activeTab === 'COMBOS' ? 'transparent' : colors.border
                        }}
                    >
                        Combos de Compra ({combos.length})
                    </Button>
                </Box>

                {activeTab === 'CRITICOS' && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                        <TextField
                            size="small"
                            placeholder="Buscar por código, material o proveedor..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: colors.textDim, fontSize: 18 }} />
                                    </InputAdornment>
                                )
                            }}
                            sx={{ minWidth: 260, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                        />

                        {/* Filtros Rápidos de Criticidad */}
                        <Box sx={{ display: 'flex', gap: 0.6 }}>
                            <Chip 
                                size="small" 
                                label="Todos" 
                                onClick={() => setStatusFilter('ALL')}
                                sx={{ fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', bgcolor: statusFilter === 'ALL' ? colors.primary : 'rgba(255,255,255,0.06)', color: statusFilter === 'ALL' ? '#000' : colors.textDim }}
                            />
                            <Chip 
                                size="small" 
                                label="En Quiebre" 
                                onClick={() => setStatusFilter('CRITICAL')}
                                sx={{ fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', bgcolor: statusFilter === 'CRITICAL' ? colors.danger : 'rgba(255,255,255,0.06)', color: statusFilter === 'CRITICAL' ? '#fff' : colors.textDim }}
                            />
                            <Chip 
                                size="small" 
                                label="Advertencia" 
                                onClick={() => setStatusFilter('WARNING')}
                                sx={{ fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', bgcolor: statusFilter === 'WARNING' ? colors.warning : 'rgba(255,255,255,0.06)', color: statusFilter === 'WARNING' ? '#000' : colors.textDim }}
                            />
                            <Chip 
                                size="small" 
                                label="OK" 
                                onClick={() => setStatusFilter('OK')}
                                sx={{ fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', bgcolor: statusFilter === 'OK' ? colors.success : 'rgba(255,255,255,0.06)', color: statusFilter === 'OK' ? '#000' : colors.textDim }}
                            />
                        </Box>
                    </Box>
                )}

                {activeTab === 'COMBOS' && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setNewComboModalOpen(true)}
                        sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, borderRadius: 2, textTransform: 'none' }}
                    >
                        Nuevo Combo de Compra
                    </Button>
                )}
            </Box>

            {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
            {activeTab === 'CRITICOS' ? (
                /* VISTA 1: MATERIALES CRÍTICOS AGRUPADOS POR CATEGORÍA */
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {categoryGroups.length === 0 ? (
                        <Box sx={{ p: 6, textAlign: 'center', bgcolor: colors.cardBg, borderRadius: 3, border: `1px dashed ${colors.border}` }}>
                            <CheckCircleOutlineIcon sx={{ fontSize: 44, color: colors.success, mb: 1.5 }} />
                            <Typography variant="h6" sx={{ fontWeight: 900, color: '#fff' }}>
                                No se encontraron materiales con los filtros actuales
                            </Typography>
                            <Typography variant="body2" sx={{ color: colors.textDim, mt: 0.5 }}>
                                Probá ajustando los términos de búsqueda o activando más categorías desde el panel superior.
                            </Typography>
                        </Box>
                    ) : (
                        categoryGroups.map((group) => {
                            const isCollapsed = Boolean(collapsedCategories[group.id]);

                            return (
                                <Paper 
                                    key={group.id} 
                                    sx={{ 
                                        bgcolor: colors.cardBg, 
                                        border: `1px solid ${group.criticalCount > 0 ? 'rgba(239, 68, 68, 0.3)' : colors.border}`, 
                                        borderRadius: 3, 
                                        overflow: 'hidden' 
                                    }}
                                >
                                    {/* Header de Categoría */}
                                    <Box 
                                        onClick={() => toggleCollapseCategory(group.id)}
                                        sx={{ 
                                            p: 2, 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            cursor: 'pointer',
                                            bgcolor: 'rgba(0,0,0,0.2)',
                                            borderBottom: isCollapsed ? 'none' : `1px solid ${colors.border}`,
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#fff' }}>
                                                {group.nombre}
                                            </Typography>
                                            <Chip 
                                                size="small" 
                                                label={`${group.items.length} materiales`} 
                                                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800, bgcolor: 'rgba(255,255,255,0.06)', color: colors.textDim }} 
                                            />
                                            {group.criticalCount > 0 && (
                                                <Chip 
                                                    size="small" 
                                                    label={`${group.criticalCount} en quiebre`} 
                                                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 900, bgcolor: 'rgba(239, 68, 68, 0.15)', color: colors.danger, border: '1px solid rgba(239, 68, 68, 0.3)' }} 
                                                />
                                            )}
                                        </Box>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                                <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.72rem' }}>
                                                    Stock: <strong style={{ color: '#fff' }}>{group.totalStock.toFixed(1)}</strong>
                                                </Typography>
                                                {group.totalPorVenir > 0 && (
                                                    <Typography variant="caption" sx={{ color: colors.info, fontSize: '0.72rem' }}>
                                                        Por venir: <strong style={{ color: colors.info }}>+{group.totalPorVenir.toFixed(1)}</strong>
                                                    </Typography>
                                                )}
                                                {group.totalDeficit > 0 ? (
                                                    <Typography variant="caption" sx={{ color: colors.danger, fontSize: '0.75rem', fontWeight: 900 }}>
                                                        Faltan: <strong>{group.totalDeficit.toFixed(1)} kg</strong>
                                                    </Typography>
                                                ) : (
                                                    <Typography variant="caption" sx={{ color: colors.success, fontSize: '0.72rem', fontWeight: 800 }}>
                                                        ✓ Cubierto
                                                    </Typography>
                                                )}
                                            </Box>
                                            <IconButton size="small" sx={{ color: colors.textDim }}>
                                                {isCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                                            </IconButton>
                                        </Box>
                                    </Box>

                                    {/* Lista de Materiales dentro de la Categoría */}
                                    {!isCollapsed && (
                                        <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                                            {group.items.map((item: any) => {
                                                const hasMin = item.stockMinimo !== null;

                                                return (
                                                    <Paper 
                                                        key={item.id} 
                                                        sx={{ 
                                                            p: 2, 
                                                            bgcolor: 'rgba(0,0,0,0.25)', 
                                                            borderRadius: 2.5, 
                                                            border: `1px solid ${item.status === 'CRITICAL' ? 'rgba(239, 68, 68, 0.35)' : colors.border}`,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            justifyContent: 'space-between',
                                                            gap: 1.2,
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                                                            {/* Código y Ficha */}
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <Tooltip title="Toca para editar ficha técnica del material">
                                                                    <Typography 
                                                                        variant="caption" 
                                                                        onClick={() => setEditItemTarget(item)}
                                                                        sx={{ color: colors.primary, fontWeight: 900, cursor: 'pointer', textDecoration: 'underline dotted' }}
                                                                    >
                                                                        {item.codigoInterno} ✎
                                                                    </Typography>
                                                                </Tooltip>

                                                                {/* Chip de Estado */}
                                                                {item.status === 'CRITICAL' && (
                                                                    <Chip size="small" label={`Faltan ${item.deficitNeto.toFixed(1)} ${item.unidadPrincipal || 'kg'}`} sx={{ height: 20, fontSize: '0.65rem', fontWeight: 900, bgcolor: 'rgba(239, 68, 68, 0.15)', color: colors.danger }} />
                                                                )}
                                                                {item.status === 'WARNING' && (
                                                                    item.deficitBruto > 0 && item.deficitNeto === 0 ? (
                                                                        <Chip size="small" label="🚚 Cubierto en camino" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: 'rgba(56, 189, 248, 0.15)', color: colors.info }} />
                                                                    ) : (
                                                                        <Chip size="small" label="Cerca de mín" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: 'rgba(249, 115, 22, 0.15)', color: colors.warning }} />
                                                                    )
                                                                )}
                                                                {item.status === 'OVERSTOCK' && (
                                                                    <Chip size="small" label="Sobrestock" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: 'rgba(56, 189, 248, 0.15)', color: colors.info }} />
                                                                )}
                                                                {item.status === 'OK' && (
                                                                    <Chip size="small" label="Stock OK" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: 'rgba(16, 185, 129, 0.15)', color: colors.success }} />
                                                                )}
                                                            </Box>

                                                            {/* Descripción */}
                                                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.25 }}>
                                                                {item.descripcion}
                                                            </Typography>
                                                            {item.supplier?.name && (
                                                                <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.72rem', display: 'block' }}>
                                                                    Prov: <strong style={{ color: '#fff' }}>{item.supplier.name}</strong>
                                                                </Typography>
                                                            )}
                                                        </Box>

                                                        {/* 3 PILARES FUNDAMENTALES: EN STOCK | POR VENIR | HACE FALTA */}
                                                        <Box sx={{ 
                                                            display: 'grid', 
                                                            gridTemplateColumns: 'repeat(3, 1fr)', 
                                                            gap: 0.8, 
                                                            bgcolor: 'rgba(255,255,255,0.025)', 
                                                            p: 1.2, 
                                                            borderRadius: 2, 
                                                            border: `1px solid ${colors.border}`,
                                                            textAlign: 'center'
                                                        }}>
                                                            {/* 1. En Stock */}
                                                            <Box sx={{ borderRight: `1px dashed ${colors.border}`, pr: 0.5 }}>
                                                                <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
                                                                    📦 En Stock
                                                                </Typography>
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: item.stockActual > 0 ? '#fff' : colors.textDim, lineHeight: 1.2, mt: 0.2 }}>
                                                                    {item.stockActual.toLocaleString('es-AR', { maximumFractionDigits: 1 })}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.62rem' }}>
                                                                    {item.unidadPrincipal || 'kg'}
                                                                </Typography>
                                                            </Box>

                                                            {/* 2. Por Venir */}
                                                            <Tooltip title="Toca para registrar o editar mercadería por venir / pedida">
                                                                <Box 
                                                                    onClick={() => {
                                                                        setEditLimitsItem(item);
                                                                        setMinLimitInput(item.stockMinimo !== null ? String(item.stockMinimo) : '');
                                                                        setMaxLimitInput(item.stockMaximo !== null ? String(item.stockMaximo) : '');
                                                                        setPorVenirInput(item.porVenir > 0 ? String(item.porVenir) : '');
                                                                    }}
                                                                    sx={{ 
                                                                        borderRight: `1px dashed ${colors.border}`, 
                                                                        pr: 0.5, 
                                                                        cursor: 'pointer',
                                                                        borderRadius: 1,
                                                                        py: 0.2,
                                                                        transition: 'background 0.15s',
                                                                        '&:hover': { bgcolor: 'rgba(56, 189, 248, 0.12)' }
                                                                    }}
                                                                >
                                                                    <Typography variant="caption" sx={{ color: colors.info, fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
                                                                        🚚 Por Venir ✎
                                                                    </Typography>
                                                                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: item.porVenir > 0 ? colors.info : colors.textDim, lineHeight: 1.2, mt: 0.2 }}>
                                                                        {item.porVenir.toLocaleString('es-AR', { maximumFractionDigits: 1 })}
                                                                    </Typography>
                                                                    <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.62rem' }}>
                                                                        {item.unidadPrincipal || 'kg'}
                                                                    </Typography>
                                                                </Box>
                                                            </Tooltip>

                                                            {/* 3. Hace Falta */}
                                                            <Box sx={{ pl: 0.5 }}>
                                                                <Typography variant="caption" sx={{ 
                                                                    color: item.deficitNeto > 0 ? colors.danger : (item.deficitBruto > 0 ? colors.info : colors.success), 
                                                                    fontSize: '0.62rem', 
                                                                    fontWeight: 800, 
                                                                    textTransform: 'uppercase', 
                                                                    display: 'block' 
                                                                }}>
                                                                    🎯 Hace Falta
                                                                </Typography>
                                                                <Typography 
                                                                    variant="subtitle2" 
                                                                    sx={{ 
                                                                        fontWeight: 900, 
                                                                        color: item.deficitNeto > 0 ? colors.danger : (item.deficitBruto > 0 ? colors.info : colors.success),
                                                                        lineHeight: 1.2,
                                                                        mt: 0.2
                                                                    }}
                                                                >
                                                                    {item.deficitNeto > 0 ? (
                                                                        `-${item.deficitNeto.toLocaleString('es-AR', { maximumFractionDigits: 1 })}`
                                                                    ) : item.deficitBruto > 0 ? (
                                                                        'Cubierto'
                                                                    ) : item.stockMinimo !== null ? (
                                                                        '0'
                                                                    ) : (
                                                                        '—'
                                                                    )}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.62rem' }}>
                                                                    {item.deficitNeto > 0 ? (item.unidadPrincipal || 'kg') : (item.deficitBruto > 0 ? 'en camino' : 'en regla')}
                                                                </Typography>
                                                            </Box>
                                                        </Box>

                                                        {/* Umbrales Mínimo, Máximo y Proyección */}
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.3 }}>
                                                            <Tooltip title="Toca para editar Stock Mínimo">
                                                                <Typography 
                                                                    variant="caption" 
                                                                    onClick={() => {
                                                                        setEditLimitsItem(item);
                                                                        setMinLimitInput(item.stockMinimo !== null ? String(item.stockMinimo) : '');
                                                                        setMaxLimitInput(item.stockMaximo !== null ? String(item.stockMaximo) : '');
                                                                        setPorVenirInput(item.porVenir > 0 ? String(item.porVenir) : '');
                                                                    }}
                                                                    sx={{ color: item.status === 'CRITICAL' ? colors.danger : colors.textDim, cursor: 'pointer', textDecoration: 'underline dotted', fontWeight: 700, fontSize: '0.7rem' }}
                                                                >
                                                                    Mín: {item.stockMinimo !== null ? `${item.stockMinimo} ${item.unidadPrincipal || 'kg'}` : '—'} ✎
                                                                </Typography>
                                                            </Tooltip>

                                                            <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.68rem' }}>
                                                                Proy: <strong style={{ color: item.stockProyectado >= (item.stockMinimo || 0) ? colors.success : colors.danger }}>{item.stockProyectado.toFixed(1)}</strong>
                                                            </Typography>

                                                            <Tooltip title="Toca para editar Stock Máximo">
                                                                <Typography 
                                                                    variant="caption" 
                                                                    onClick={() => {
                                                                        setEditLimitsItem(item);
                                                                        setMinLimitInput(item.stockMinimo !== null ? String(item.stockMinimo) : '');
                                                                        setMaxLimitInput(item.stockMaximo !== null ? String(item.stockMaximo) : '');
                                                                        setPorVenirInput(item.porVenir > 0 ? String(item.porVenir) : '');
                                                                    }}
                                                                    sx={{ color: colors.textDim, cursor: 'pointer', textDecoration: 'underline dotted', fontWeight: 700, fontSize: '0.7rem' }}
                                                                >
                                                                    Máx: {item.stockMaximo !== null ? `${item.stockMaximo}` : '—'} ✎
                                                                </Typography>
                                                            </Tooltip>
                                                        </Box>

                                                        {/* Gauge Bar Proyectada */}
                                                        {hasMin && item.stockMinimo > 0 && (
                                                            <Box sx={{ width: '100%' }}>
                                                                <LinearProgress 
                                                                    variant="determinate" 
                                                                    value={Math.min(100, Math.round((item.stockProyectado / item.stockMinimo) * 100))} 
                                                                    sx={{ 
                                                                        height: 5, 
                                                                        borderRadius: 2.5, 
                                                                        bgcolor: 'rgba(255,255,255,0.06)',
                                                                        '& .MuiLinearProgress-bar': {
                                                                            bgcolor: item.status === 'CRITICAL' ? colors.danger : (item.deficitBruto > 0 && item.deficitNeto === 0 ? colors.info : (item.status === 'WARNING' ? colors.warning : colors.success)),
                                                                            borderRadius: 2.5
                                                                        }
                                                                    }} 
                                                                />
                                                            </Box>
                                                        )}
                                                    </Paper>
                                                );
                                            })}
                                        </Box>
                                    )}
                                </Paper>
                            );
                        })
                    )}
                </Box>
            ) : (
                /* VISTA 2: COMBOS DE COMPRA */
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
                    {combos.length === 0 ? (
                        <Box sx={{ gridColumn: '1 / -1', p: 6, textAlign: 'center', bgcolor: colors.cardBg, borderRadius: 3, border: `1px dashed ${colors.border}` }}>
                            <ShoppingCartIcon sx={{ fontSize: 44, color: colors.primary, mb: 1.5 }} />
                            <Typography variant="h6" sx={{ fontWeight: 900, color: '#fff' }}>
                                Sin combos de compra configurados
                            </Typography>
                            <Typography variant="body2" sx={{ color: colors.textDim, mb: 2 }}>
                                Agrupá materiales del mismo proveedor para calcular días de stock y pedidos automáticos en lote.
                            </Typography>
                            <Button 
                                variant="contained" 
                                startIcon={<AddIcon />} 
                                onClick={() => setNewComboModalOpen(true)}
                                sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, borderRadius: 2 }}
                            >
                                Crear Primer Combo
                            </Button>
                        </Box>
                    ) : (
                        combos.map((combo: any) => (
                            <Paper 
                                key={combo.id} 
                                sx={{ 
                                    p: 2.5, 
                                    bgcolor: colors.cardBg, 
                                    border: `1px solid ${combo.deficit > 0 ? 'rgba(245, 158, 11, 0.35)' : colors.border}`, 
                                    borderRadius: 3,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: 2
                                }}
                            >
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>
                                            {combo.title}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <IconButton size="small" onClick={() => setEditComboTarget(combo)} sx={{ color: colors.textDim }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleDeleteCombo(combo.id)} sx={{ color: colors.danger }}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Box>

                                    <Typography variant="caption" sx={{ color: colors.textDim, display: 'block', mb: 1.5 }}>
                                        Proveedor: <strong style={{ color: '#fff' }}>{combo.supplier?.name || 'Varios'}</strong> • {combo.items?.length || 0} ítems agrupados
                                    </Typography>

                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                                        <Chip 
                                            size="small" 
                                            label={combo.deficit > 0 ? `Déficit: ${combo.deficit.toFixed(1)} kg` : 'Abastecido'} 
                                            sx={{ 
                                                fontWeight: 800, 
                                                bgcolor: combo.deficit > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                color: combo.deficit > 0 ? colors.primary : colors.success 
                                            }} 
                                        />
                                        {combo.daysOfSupply !== null && (
                                            <Chip 
                                                size="small" 
                                                label={`Autonomía: ~${combo.daysOfSupply} días`} 
                                                sx={{ fontWeight: 800, bgcolor: 'rgba(56, 189, 248, 0.15)', color: colors.info }} 
                                            />
                                        )}
                                    </Box>

                                    {/* Lista resumida de ítems del combo */}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, bgcolor: 'rgba(0,0,0,0.2)', p: 1, borderRadius: 2 }}>
                                        {(combo.items || []).slice(0, 4).map((i: any) => (
                                            <Typography key={i.id} variant="caption" sx={{ color: colors.textDim, fontSize: '0.72rem' }}>
                                                • {i.codigoInterno} - {i.descripcion}
                                            </Typography>
                                        ))}
                                        {(combo.items?.length || 0) > 4 && (
                                            <Typography variant="caption" sx={{ color: colors.primary, fontSize: '0.68rem', fontWeight: 800 }}>
                                                +{combo.items.length - 4} más...
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>

                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => setEditComboTarget(combo)}
                                    sx={{ borderRadius: 2, fontWeight: 800, color: colors.primary, borderColor: colors.primary, textTransform: 'none' }}
                                >
                                    Configurar Ítems
                                </Button>
                            </Paper>
                        ))
                    )}
                </Box>
            )}

            {/* PANEL LATERAL DE ALERTAS ("EN UN COSTADITO") */}
            <Drawer
                anchor="right"
                open={alertsDrawerOpen}
                onClose={() => setAlertsDrawerOpen(false)}
                PaperProps={{
                    sx: {
                        width: { xs: '100%', sm: 460 },
                        bgcolor: colors.bg,
                        color: colors.text,
                        borderLeft: `1px solid ${colors.border}`,
                        p: { xs: 2, sm: 3 },
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                    }
                }}
            >
                {/* Header del Panel de Alertas */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1.5, borderBottom: `1px solid ${colors.border}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <NotificationsIcon sx={{ color: activeAlerts.length > 0 ? colors.danger : colors.success }} />
                        <Typography variant="h6" sx={{ fontWeight: 900, color: '#fff' }}>
                            Alertas de Planta y Stock
                        </Typography>
                    </Box>
                    <IconButton onClick={() => setAlertsDrawerOpen(false)} sx={{ color: colors.textDim }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Subtítulo orientativo */}
                <Typography variant="caption" sx={{ color: colors.textDim }}>
                    Reportes automáticos de quiebres de stock, faltantes de hilado en pedidos y desvíos de máximos/mínimos.
                </Typography>

                {/* CONTENIDO DE ALERTAS */}
                {activeAlerts.length === 0 ? (
                    /* ESTADO VACÍO ELEGANTE (TAL COMO SOLICITÓ EL USUARIO) */
                    <Box sx={{ my: 'auto', p: 4, textAlign: 'center', bgcolor: 'rgba(16, 185, 129, 0.05)', borderRadius: 3, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <CheckCircleOutlineIcon sx={{ fontSize: 52, color: colors.success, mb: 1.5 }} />
                        <Typography variant="h6" sx={{ fontWeight: 900, color: '#fff', mb: 0.5 }}>
                            Todo en regla
                        </Typography>
                        <Typography variant="body2" sx={{ color: colors.textDim, lineHeight: 1.4 }}>
                            No hay pedidos desabastecidos de hilado/color ni materiales por debajo del stock de seguridad.
                        </Typography>
                    </Box>
                ) : (
                    /* LISTADO DE ALERTAS CON CÓDIGO DE COLORES */
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto', flex: 1, pr: 0.5 }}>
                        {activeAlerts.map((al) => {
                            let borderColor = 'rgba(255,255,255,0.1)';
                            let bgColor = 'rgba(255,255,255,0.03)';
                            let badgeColor = colors.info;

                            if (al.severity === 'danger') {
                                borderColor = 'rgba(239, 68, 68, 0.4)';
                                bgColor = 'rgba(239, 68, 68, 0.08)';
                                badgeColor = colors.danger;
                            } else if (al.severity === 'warning') {
                                borderColor = 'rgba(249, 115, 22, 0.4)';
                                bgColor = 'rgba(249, 115, 22, 0.08)';
                                badgeColor = colors.warning;
                            } else if (al.severity === 'purple') {
                                borderColor = 'rgba(168, 85, 247, 0.4)';
                                bgColor = 'rgba(168, 85, 247, 0.08)';
                                badgeColor = colors.purple;
                            }

                            return (
                                <Paper 
                                    key={al.id} 
                                    sx={{ 
                                        p: 2, 
                                        borderRadius: 2.5, 
                                        bgcolor: bgColor, 
                                        border: `1px solid ${borderColor}`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 0.8
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 900, color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                            {al.title}
                                        </Typography>
                                        {al.metric && (
                                            <Chip size="small" label={al.metric} sx={{ height: 18, fontSize: '0.65rem', fontWeight: 900, bgcolor: 'rgba(0,0,0,0.3)', color: badgeColor }} />
                                        )}
                                    </Box>

                                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.25 }}>
                                        {al.subtitle}
                                    </Typography>

                                    <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.72rem' }}>
                                        {al.detail}
                                    </Typography>

                                    {/* Acción directa si la alerta referencia a un material */}
                                    {al.itemRef && (
                                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, pt: 0.8, borderTop: `1px dashed ${colors.border}` }}>
                                            <Button
                                                size="small"
                                                onClick={() => {
                                                    setEditLimitsItem(al.itemRef);
                                                    setMinLimitInput(al.itemRef.stockMinimo !== null ? String(al.itemRef.stockMinimo) : '');
                                                    setMaxLimitInput(al.itemRef.stockMaximo !== null ? String(al.itemRef.stockMaximo) : '');
                                                    setPorVenirInput(al.itemRef.porVenir > 0 ? String(al.itemRef.porVenir) : '');
                                                }}
                                                sx={{ fontSize: '0.68rem', fontWeight: 800, color: colors.primary, textTransform: 'none', p: 0.2 }}
                                            >
                                                Ajustar Abastecimiento
                                            </Button>
                                            <Button
                                                size="small"
                                                onClick={() => handleToggleIgnoreMin(al.itemRef)}
                                                sx={{ fontSize: '0.68rem', color: colors.textDim, textTransform: 'none', p: 0.2 }}
                                            >
                                                Silenciar
                                            </Button>
                                        </Box>
                                    )}
                                </Paper>
                            );
                        })}
                    </Box>
                )}
            </Drawer>

            {/* DIÁLOGO PARA EDITAR LÍMITES MÍNIMOS, MÁXIMOS Y STOCK POR VENIR */}
            {editLimitsItem && (
                <Dialog
                    open={Boolean(editLimitsItem)}
                    onClose={() => setEditLimitsItem(null)}
                    maxWidth="xs"
                    fullWidth
                    PaperProps={{
                        sx: { bgcolor: '#161922', color: '#fff', border: `1px solid ${colors.border}`, borderRadius: 3, p: 1 }
                    }}
                >
                    <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>
                        Parámetros de Abastecimiento
                    </DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <Typography variant="body2" sx={{ color: colors.textDim }}>
                            Material: <strong style={{ color: '#fff' }}>[{editLimitsItem.codigoInterno}] {editLimitsItem.descripcion}</strong>
                        </Typography>

                        <TextField
                            label={`Stock Mínimo (${editLimitsItem.unidadPrincipal || 'kg'})`}
                            type="number"
                            size="small"
                            value={minLimitInput}
                            onChange={(e) => setMinLimitInput(e.target.value)}
                            helperText="Punto de reposición: por debajo dispara alerta de compra."
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                        />

                        <TextField
                            label={`Stock Por Venir / En Tránsito (${editLimitsItem.unidadPrincipal || 'kg'})`}
                            type="number"
                            size="small"
                            value={porVenirInput}
                            onChange={(e) => setPorVenirInput(e.target.value)}
                            helperText="Mercadería ya comprada o pedida al proveedor pendiente de ingreso."
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                        />

                        <TextField
                            label={`Stock Máximo (${editLimitsItem.unidadPrincipal || 'kg'})`}
                            type="number"
                            size="small"
                            value={maxLimitInput}
                            onChange={(e) => setMaxLimitInput(e.target.value)}
                            helperText="Límite superior recomendado para evitar sobrestock."
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setEditLimitsItem(null)} sx={{ color: colors.textDim }}>
                            Cancelar
                        </Button>
                        <Button 
                            variant="contained" 
                            onClick={handleSaveLimits}
                            sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, borderRadius: 2 }}
                        >
                            Guardar Límites
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            {/* MODAL EDITAR COMBO EXISTENTE */}
            {editComboTarget && (
                <EditComboModal
                    combo={editComboTarget}
                    items={items}
                    onClose={() => setEditComboTarget(null)}
                    onSave={async (itemIds: string[]) => {
                        try {
                            await updateCombo({ id: editComboTarget.id, data: { itemIds } }).unwrap();
                            setFeedbackToast({ msg: 'Combo actualizado', severity: 'success' });
                            setEditComboTarget(null);
                        } catch (e: any) {
                            alert(e?.data?.message || 'Error al actualizar combo');
                        }
                    }}
                />
            )}

            {/* MODAL CREAR NUEVO COMBO */}
            {newComboModalOpen && (
                <Dialog
                    open={newComboModalOpen}
                    onClose={() => setNewComboModalOpen(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: { bgcolor: '#161922', color: '#fff', border: `1px solid ${colors.border}`, borderRadius: 3, p: 1 }
                    }}
                >
                    <DialogTitle sx={{ fontWeight: 900 }}>
                        Crear Combo de Compra
                    </DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            label="Título del Combo *"
                            size="small"
                            placeholder="Ej: Hilados Algodón 24/1 Hilandería San Martín"
                            value={newComboTitle}
                            onChange={(e) => setNewComboTitle(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                        />

                        <TextField
                            select
                            label="Proveedor *"
                            size="small"
                            value={newComboSupplier}
                            onChange={(e) => setNewComboSupplier(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2 } }}
                        >
                            {partners.map((p: any) => (
                                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                            ))}
                        </TextField>

                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, mt: 1 }}>
                            Seleccioná los materiales que componen este combo:
                        </Typography>

                        <Box sx={{ maxHeight: 200, overflowY: 'auto', border: `1px solid ${colors.border}`, borderRadius: 2, p: 1 }}>
                            {items
                                .filter((i: any) => !newComboSupplier || i.supplierId === newComboSupplier)
                                .map((i: any) => {
                                    const checked = newComboItems.includes(i.id);
                                    return (
                                        <Box 
                                            key={i.id} 
                                            onClick={() => setNewComboItems(prev => checked ? prev.filter(id => id !== i.id) : [...prev, i.id])}
                                            sx={{ display: 'flex', alignItems: 'center', p: 0.6, cursor: 'pointer', borderRadius: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}
                                        >
                                            <Checkbox size="small" checked={checked} sx={{ color: colors.textDim, '&.Mui-checked': { color: colors.primary } }} />
                                            <Typography variant="body2" sx={{ color: '#fff', ml: 1 }}>
                                                [{i.codigoInterno}] {i.descripcion}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setNewComboModalOpen(false)} sx={{ color: colors.textDim }}>
                            Cancelar
                        </Button>
                        <Button 
                            variant="contained" 
                            onClick={handleCreateCombo}
                            sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, borderRadius: 2 }}
                        >
                            Crear Combo
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            {/* MODAL EDITAR FICHA DE MATERIAL */}
            {editItemTarget && (
                <CreateItemDialog
                    open={Boolean(editItemTarget)}
                    onClose={() => setEditItemTarget(null)}
                    editTarget={editItemTarget}
                    depositoId={depotId}
                    onSuccess={() => {
                        setFeedbackToast({ msg: '✅ Ficha del material actualizada', severity: 'success' });
                        setEditItemTarget(null);
                    }}
                />
            )}

            {/* TOAST FEEDBACK */}
            <Snackbar
                open={Boolean(feedbackToast)}
                autoHideDuration={4000}
                onClose={() => setFeedbackToast(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setFeedbackToast(null)} severity={feedbackToast?.severity || 'success'} sx={{ bgcolor: '#064e3b', color: '#ecfdf5', fontWeight: 700, borderRadius: 2, border: '1px solid #059669' }}>
                    {feedbackToast?.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
