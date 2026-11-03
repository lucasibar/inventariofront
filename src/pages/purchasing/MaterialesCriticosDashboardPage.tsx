import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    Switch,
    FormControlLabel,
    Snackbar,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Card,
    Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EditIcon from '@mui/icons-material/Edit';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LayersIcon from '@mui/icons-material/Layers';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ViewListIcon from '@mui/icons-material/ViewList';
import TuneIcon from '@mui/icons-material/Tune';
import BlockIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';

import { useSelector } from 'react-redux';
import { selectAllowedDepots } from '../../entities/auth/model/authSlice';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import {
    useGetItemsQuery,
    useGetItemCategoriesQuery,
    useUpdateItemMutation,
    useUpdateItemCategoryMutation
} from '../../features/warehouse/materiales/api/items.api';
import { useGetStockQuery } from '../../features/warehouse/stock/api/stock.api';
import { useListarPedidosProduccionQuery } from '../../features/quality/ordenes-produccion/api/ordenesProduccion.api';
import { useGetArticulosSinEstructuraQuery } from '../../features/ventas/api/ventas.api';
import { useIsMobile } from '../../shared/ui';

// Paleta cromática corporativa unificada
const colors = {
    primary: '#f59e0b',       // Amber cálido para compras
    primaryHover: '#d97706',
    bg: '#0f1117',            // Fondo general oscuro de la app
    surface: '#161922',       // Superficie de tarjetas
    surfaceElevated: '#1e2230',// Tarjetas elevadas / seleccionadas
    surfaceHover: '#232838',
    border: 'rgba(255, 255, 255, 0.08)',
    borderActive: '#f59e0b',
    text: '#f3f4f6',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',
    danger: '#ef4444',
    dangerBg: 'rgba(239, 68, 68, 0.12)',
    warning: '#f59e0b',
    warningBg: 'rgba(245, 158, 11, 0.12)',
    success: '#10b981',
    successBg: 'rgba(16, 185, 129, 0.12)',
    info: '#38bdf8',
    infoBg: 'rgba(56, 189, 248, 0.12)',
    purple: '#a855f7'
};

const normalizeText = (text: string) =>
    (text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

export default function MaterialesCriticosDashboardPage() {
    const isMobile = useIsMobile();
    const navigate = useNavigate();
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

    // 2. Consultas API
    const { data: categories = [], isLoading: loadingCategories } = useGetItemCategoriesQuery(depotId || undefined);
    const { data: items = [] } = useGetItemsQuery({ depositoId: depotId || undefined });
    const { data: allStock = [], isLoading: loadingStock } = useGetStockQuery({ depotId: depotId || undefined });
    const { data: pedidosProduccion = [] } = useListarPedidosProduccionQuery();
    const { data: articulosSinEstructura = [] } = useGetArticulosSinEstructuraQuery();

    // Mutaciones
    const [updateItem] = useUpdateItemMutation();
    const [updateItemCategory] = useUpdateItemCategoryMutation();

    // 3. Estados de Filtros y Navegación
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'OK' | 'SOBRANTES'>('ALL');
    const [hideZeroStockSuppliers, setHideZeroStockSuppliers] = useState(true);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false);
    const [feedbackToast, setFeedbackToast] = useState<{ msg: string; severity: 'success' | 'info' | 'error' | 'warning' } | null>(null);

    // Diálogos de acción rápida (2 clics)
    const [editCategoryLimitsOpen, setEditCategoryLimitsOpen] = useState(false);
    const [catMinInput, setCatMinInput] = useState('');
    const [catMaxInput, setCatMaxInput] = useState('');

    const [editItemLimitsTarget, setEditItemLimitsTarget] = useState<any | null>(null);
    const [itemMinInput, setItemMinInput] = useState('');
    const [itemMaxInput, setItemMaxInput] = useState('');
    const [itemPorVenirInput, setItemPorVenirInput] = useState('');

    const [quickOrderTarget, setQuickOrderTarget] = useState<any | null>(null);
    const [quickOrderQty, setQuickOrderQty] = useState('');
    const [quickOrderSupplierId, setQuickOrderSupplierId] = useState('');

    // Mapeo de Stock Total por ItemId
    const stockTotalsByItem = useMemo(() => {
        const map = new Map<string, number>();
        allStock.forEach((sb: any) => {
            const current = map.get(sb.itemId) || 0;
            map.set(sb.itemId, current + Number(sb.qtyPrincipal || 0));
        });
        return map;
    }, [allStock]);

    // Ítems enriquecidos con métricas de stock computable vs sobrantes
    const enrichedItems = useMemo(() => {
        return items.map((item: any) => {
            const stockActual = stockTotalsByItem.get(item.id) || 0;
            const stockMinimo = item.stockMinimo !== null && item.stockMinimo !== undefined ? Number(item.stockMinimo) : null;
            const stockMaximo = item.stockMaximo !== null && item.stockMaximo !== undefined ? Number(item.stockMaximo) : null;
            const porVenir = Number(item.meta?.porVenir || item.porVenir || 0);
            const esSobrante = Boolean(item.meta?.excluirDeCompras || item.meta?.esSobrante);
            const stockComputable = esSobrante ? 0 : stockActual;
            const stockProyectado = stockComputable + porVenir;
            const isIgnored = Boolean(item.meta?.ignorarStockMinimo);

            let status: 'CRITICAL' | 'WARNING' | 'OVERSTOCK' | 'OK' = 'OK';
            let deficitBruto = 0;
            let deficitNeto = 0;

            if (stockMinimo !== null && stockMinimo > 0 && !isIgnored && !esSobrante) {
                if (stockComputable < stockMinimo) {
                    deficitBruto = stockMinimo - stockComputable;
                    deficitNeto = Math.max(0, stockMinimo - stockProyectado);
                    status = deficitNeto > 0 ? 'CRITICAL' : 'WARNING';
                } else if (stockComputable <= stockMinimo * 1.25) {
                    status = 'WARNING';
                }
            }

            if (stockMaximo !== null && stockMaximo > 0 && stockComputable > stockMaximo) {
                status = 'OVERSTOCK';
            }

            const isZeroActivity = stockActual === 0 && porVenir === 0 && (stockMinimo === null || stockMinimo === 0);

            return {
                ...item,
                stockActual,
                stockComputable,
                stockMinimo,
                stockMaximo,
                porVenir,
                stockProyectado,
                esSobrante,
                isZeroActivity,
                deficitBruto,
                deficitNeto,
                deficit: deficitNeto > 0 ? deficitNeto : deficitBruto,
                status,
                isIgnored,
                searchStr: normalizeText(`${item.codigoInterno} ${item.descripcion} ${item.category?.nombre || item.categoria || ''} ${item.supplier?.name || ''}`)
            };
        });
    }, [items, stockTotalsByItem]);

    // Agrupación ejecutiva por categoría
    const categoryGroups = useMemo(() => {
        const searchWords = normalizeText(search).split(' ').filter(w => w.length > 0);
        const groupsMap = new Map<string, {
            id: string;
            nombre: string;
            minimo: number | null;
            maximo: number | null;
            items: any[];
            activeItems: any[];
            zeroItems: any[];
            totalStock: number;          // Stock computable
            totalStockFisico: number;    // Físico real
            totalSobrante: number;       // Remanentes aislados
            totalPorVenir: number;       // En camino
            categoryDeficit: number;     // Déficit a comprar
            categoryStatus: 'CRITICAL' | 'WARNING' | 'OVERSTOCK' | 'OK';
            activeSuppliers: { name: string; stock: number; porVenir: number; isSobrante: boolean }[];
        }>();

        // 1. Categorías del catálogo
        categories.forEach((cat: any) => {
            groupsMap.set(cat.id, {
                id: cat.id,
                nombre: cat.nombre,
                minimo: cat.minimo !== null && cat.minimo !== undefined ? Number(cat.minimo) : null,
                maximo: cat.maximo !== null && cat.maximo !== undefined ? Number(cat.maximo) : null,
                items: [],
                activeItems: [],
                zeroItems: [],
                totalStock: 0,
                totalStockFisico: 0,
                totalSobrante: 0,
                totalPorVenir: 0,
                categoryDeficit: 0,
                categoryStatus: 'OK',
                activeSuppliers: []
            });
        });

        // 2. Distribuir ítems
        enrichedItems.forEach((item: any) => {
            const catId = item.categoryId || item.category?.id || 'SIN_CATEGORIA';
            if (!groupsMap.has(catId)) return;

            const group = groupsMap.get(catId)!;
            group.items.push(item);

            if (item.isZeroActivity) {
                group.zeroItems.push(item);
            } else {
                group.activeItems.push(item);
            }

            group.totalStockFisico += item.stockActual;
            if (item.esSobrante) {
                group.totalSobrante += item.stockActual;
            } else {
                group.totalStock += item.stockComputable;
            }
            group.totalPorVenir += item.porVenir;
        });

        // 3. Métricas de cada categoría
        groupsMap.forEach(group => {
            // Proveedores activos
            const supMap = new Map<string, { name: string; stock: number; porVenir: number; isSobrante: boolean }>();
            group.items.forEach(i => {
                const sName = i.supplier?.name || 'Proveedor no asignado';
                const cur = supMap.get(sName) || { name: sName, stock: 0, porVenir: 0, isSobrante: false };
                cur.stock += i.stockActual;
                cur.porVenir += i.porVenir;
                if (i.esSobrante) cur.isSobrante = true;
                supMap.set(sName, cur);
            });
            group.activeSuppliers = Array.from(supMap.values()).filter(s => s.stock > 0 || s.porVenir > 0);

            // Cálculo de Déficit de Categoría
            if (group.minimo !== null && group.minimo > 0) {
                const proyectado = group.totalStock + group.totalPorVenir;
                if (proyectado < group.minimo) {
                    group.categoryDeficit = group.minimo - proyectado;
                    group.categoryStatus = 'CRITICAL';
                } else if (group.totalStock < group.minimo) {
                    group.categoryDeficit = 0;
                    group.categoryStatus = 'WARNING';
                }
            }

            if (group.maximo !== null && group.maximo > 0 && group.totalStock > group.maximo) {
                group.categoryStatus = 'OVERSTOCK';
            }
        });

        // 4. Filtrar por búsqueda y estado
        return Array.from(groupsMap.values())
            .filter(group => {
                // Filtro búsqueda
                if (searchWords.length > 0) {
                    const matchCat = searchWords.every(w => normalizeText(group.nombre).includes(w));
                    const matchItem = group.items.some(i => searchWords.every(w => i.searchStr.includes(w)));
                    if (!matchCat && !matchItem) return false;
                }

                // Filtro estado
                if (statusFilter === 'CRITICAL') return group.categoryStatus === 'CRITICAL';
                if (statusFilter === 'WARNING') return group.categoryStatus === 'WARNING';
                if (statusFilter === 'OK') return group.categoryStatus === 'OK' && group.categoryDeficit === 0;
                if (statusFilter === 'SOBRANTES') return group.totalSobrante > 0;

                return true;
            })
            .sort((a, b) => {
                // Prioridad: 1° con déficit de categoría (descendente), 2° en warning, 3° alfabético
                if (b.categoryDeficit !== a.categoryDeficit) return b.categoryDeficit - a.categoryDeficit;
                if (a.categoryStatus === 'CRITICAL' && b.categoryStatus !== 'CRITICAL') return -1;
                if (b.categoryStatus === 'CRITICAL' && a.categoryStatus !== 'CRITICAL') return 1;
                return a.nombre.localeCompare(b.nombre);
            });
    }, [categories, enrichedItems, search, statusFilter]);

    // KPI Globales de la barra superior
    const globalStats = useMemo(() => {
        let totalDeficit = 0;
        let totalPorVenir = 0;
        let totalStockComputable = 0;
        let totalSobrantes = 0;
        let criticalCategoriesCount = 0;
        let warningCategoriesCount = 0;

        categoryGroups.forEach(g => {
            totalDeficit += g.categoryDeficit;
            totalPorVenir += g.totalPorVenir;
            totalStockComputable += g.totalStock;
            totalSobrantes += g.totalSobrante;
            if (g.categoryStatus === 'CRITICAL') criticalCategoriesCount++;
            if (g.categoryStatus === 'WARNING') warningCategoriesCount++;
        });

        return {
            totalDeficit,
            totalPorVenir,
            totalStockComputable,
            totalSobrantes,
            criticalCategoriesCount,
            warningCategoriesCount,
            totalCategories: categoryGroups.length
        };
    }, [categoryGroups]);

    // Seleccionar automáticamente la primera categoría crítica o la primera disponible para evitar vacío visual
    useEffect(() => {
        if (!selectedCategoryId && categoryGroups.length > 0) {
            setSelectedCategoryId(categoryGroups[0].id);
        } else if (selectedCategoryId && !categoryGroups.some(g => g.id === selectedCategoryId)) {
            setSelectedCategoryId(categoryGroups.length > 0 ? categoryGroups[0].id : null);
        }
    }, [categoryGroups, selectedCategoryId]);

    // Categoría actualmente seleccionada para el panel de detalle
    const selectedGroup = useMemo(() => {
        return categoryGroups.find(g => g.id === selectedCategoryId) || null;
    }, [categoryGroups, selectedCategoryId]);

    // Alertas externas (pedidos con faltante y artículos sin estructura)
    const externalAlerts = useMemo(() => {
        const list: { id: string; tipo: 'PEDIDO_SIN_STOCK' | 'SIN_ESTRUCTURA'; titulo: string; detalle: string }[] = [];

        pedidosProduccion.forEach((p: any) => {
            if (p.estado === 'PENDIENTE_MATERIAL' || p.faltantesHilado?.length > 0) {
                list.push({
                    id: `ped-${p.id}`,
                    tipo: 'PEDIDO_SIN_STOCK',
                    titulo: `Pedido #${p.id} (${p.articuloNombre || 'Sin nombre'})`,
                    detalle: `Faltan insumos/hilado para iniciar tejido.`
                });
            }
        });

        articulosSinEstructura.forEach((art: any) => {
            list.push({
                id: `art-${art.id}`,
                tipo: 'SIN_ESTRUCTURA',
                titulo: `Artículo sin ficha técnica: ${art.nombre || art.codigo}`,
                detalle: `No se pueden calcular hilados requeridos.`
            });
        });

        return list;
    }, [pedidosProduccion, articulosSinEstructura]);

    // ACCIONES RÁPIDAS (2 CLICS)

    // 1. Guardar Mín/Máx de Categoría
    const handleSaveCategoryLimits = async () => {
        if (!selectedGroup) return;
        const minVal = catMinInput.trim() === '' ? null : Number(catMinInput);
        const maxVal = catMaxInput.trim() === '' ? null : Number(catMaxInput);

        try {
            await updateItemCategory({
                id: selectedGroup.id,
                data: { minimo: minVal, maximo: maxVal }
            }).unwrap();

            setFeedbackToast({ msg: `Límites de categoría "${selectedGroup.nombre}" actualizados.`, severity: 'success' });
            setEditCategoryLimitsOpen(false);
        } catch (e) {
            setFeedbackToast({ msg: 'Error al actualizar límites de categoría', severity: 'error' });
        }
    };

    // 2. Conmutar Sobrante/Remanente de un ítem
    const handleToggleSobrante = async (item: any) => {
        const nuevoEstado = !item.esSobrante;
        try {
            await updateItem({
                id: item.id,
                data: {
                    meta: {
                        ...(item.meta || {}),
                        excluirDeCompras: nuevoEstado,
                        esSobrante: nuevoEstado
                    }
                }
            }).unwrap();

            setFeedbackToast({
                msg: nuevoEstado
                    ? `Item marcado como SOBRANTE (excluido de compras sin contaminar stock)`
                    : `Item reintegrado al stock computable de compras`,
                severity: 'info'
            });
        } catch (e) {
            setFeedbackToast({ msg: 'Error al actualizar estado de sobrante', severity: 'error' });
        }
    };

    // 3. Guardar Por Venir / Límites individuales de ítem
    const handleSaveItemLimits = async () => {
        if (!editItemLimitsTarget) return;
        const minVal = itemMinInput.trim() === '' ? null : Number(itemMinInput);
        const maxVal = itemMaxInput.trim() === '' ? null : Number(itemMaxInput);
        const porVenirVal = itemPorVenirInput.trim() === '' ? 0 : Number(itemPorVenirInput);

        try {
            await updateItem({
                id: editItemLimitsTarget.id,
                data: {
                    stockMinimo: minVal,
                    stockMaximo: maxVal,
                    meta: {
                        ...(editItemLimitsTarget.meta || {}),
                        porVenir: porVenirVal
                    }
                }
            }).unwrap();

            setFeedbackToast({ msg: `Datos de ${editItemLimitsTarget.descripcion} actualizados`, severity: 'success' });
            setEditItemLimitsTarget(null);
        } catch (e) {
            setFeedbackToast({ msg: 'Error al actualizar ítem', severity: 'error' });
        }
    };

    // 4. Confirmar Requerimiento / Pedido Rápido de Compra
    const handleConfirmQuickOrder = async () => {
        if (!quickOrderTarget) return;
        const qty = Number(quickOrderQty);
        if (!qty || qty <= 0) {
            setFeedbackToast({ msg: 'Ingrese una cantidad válida mayor a 0 kg', severity: 'warning' });
            return;
        }

        // Buscamos o creamos el porVenir en el ítem principal seleccionado
        const targetItem = quickOrderTarget.items.find((i: any) => i.supplierId === quickOrderSupplierId) || quickOrderTarget.items[0];
        if (targetItem) {
            try {
                const nuevoPorVenir = (targetItem.porVenir || 0) + qty;
                await updateItem({
                    id: targetItem.id,
                    data: {
                        meta: {
                            ...(targetItem.meta || {}),
                            porVenir: nuevoPorVenir
                        }
                    }
                }).unwrap();

                setFeedbackToast({
                    msg: `¡Pedido registrado! Se sumaron ${qty.toLocaleString()} kg a "Por Venir" para ${quickOrderTarget.nombre}.`,
                    severity: 'success'
                });
                setQuickOrderTarget(null);
            } catch (e) {
                setFeedbackToast({ msg: 'Error al asentar el pedido por venir', severity: 'error' });
            }
        }
    };

    return (
        <Box sx={{
            height: isMobile ? 'auto' : 'calc(100vh - 68px)',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: colors.bg,
            color: colors.text,
            overflow: 'hidden',
            p: { xs: 1.5, sm: 2 }
        }}>
            {/* 1. TOP BAR HUD (Heads-Up Display Compacto) */}
            <Box sx={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1.5,
                mb: 1.5,
                pb: 1.5,
                borderBottom: `1px solid ${colors.border}`
            }}>
                {/* Título & Selector Depósito */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        bgcolor: colors.primary,
                        color: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900
                    }}>
                        ⚡
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '15px', sm: '18px' }, lineHeight: 1.1 }}>
                            Centro de Compras & Abastecimiento
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                            Decisiones directas en 2 clics • Control de quiebres y remanentes
                        </Typography>
                    </Box>

                    {/* Selector de Depósito */}
                    {depots.length > 1 && (
                        <TextField
                            select
                            size="small"
                            value={depotId}
                            onChange={(e) => setDepotId(e.target.value)}
                            SelectProps={{ native: true }}
                            sx={{
                                ml: 1,
                                minWidth: 150,
                                '& .MuiOutlinedInput-root': {
                                    fontSize: '13px',
                                    bgcolor: colors.surface,
                                    color: colors.text,
                                    borderRadius: 1.5,
                                    height: 36
                                }
                            }}
                        >
                            <option value="">🌐 Todos los depósitos</option>
                            {depots.map((d: any) => (
                                <option key={d.id} value={d.id}>{d.nombre}</option>
                            ))}
                        </TextField>
                    )}
                </Box>

                {/* Acciones Superiores: Alertas & Cambio de Vista */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* Botón de Alertas Externas */}
                    <Tooltip title="Alertas de Producción y Fichas Técnicas">
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setAlertsDrawerOpen(true)}
                            startIcon={
                                <Badge badgeContent={externalAlerts.length} color="error">
                                    <NotificationsIcon fontSize="small" />
                                </Badge>
                            }
                            sx={{
                                height: 36,
                                borderColor: externalAlerts.length > 0 ? colors.danger : colors.border,
                                color: externalAlerts.length > 0 ? colors.danger : colors.textSecondary,
                                bgcolor: externalAlerts.length > 0 ? colors.dangerBg : 'transparent',
                                fontSize: '12px',
                                textTransform: 'none',
                                fontWeight: 700
                            }}
                        >
                            {isMobile ? '' : 'Alertas'}
                        </Button>
                    </Tooltip>

                    {/* Botón Switch a Vista Clásica */}
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate('/compras/materiales-criticos')}
                        startIcon={<ViewListIcon fontSize="small" />}
                        sx={{
                            height: 36,
                            borderColor: colors.border,
                            color: colors.textSecondary,
                            fontSize: '12px',
                            textTransform: 'none',
                            '&:hover': { borderColor: colors.primary, color: colors.primary }
                        }}
                    >
                        {isMobile ? 'Clásica' : 'Vista Clásica'}
                    </Button>
                </Box>
            </Box>

            {/* 2. STATS STRIP (Indicadores Clave en 1 Sola Línea) */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                gap: 1.5,
                mb: 1.5
            }}>
                {/* 1. Déficit a Comprar */}
                <Card sx={{
                    bgcolor: globalStats.totalDeficit > 0 ? colors.dangerBg : colors.surface,
                    border: `1px solid ${globalStats.totalDeficit > 0 ? colors.danger : colors.border}`,
                    borderRadius: 2,
                    p: 1.2
                }}>
                    <Typography variant="caption" sx={{ color: globalStats.totalDeficit > 0 ? colors.danger : colors.textSecondary, fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>
                        🔴 Déficit a Comprar
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: globalStats.totalDeficit > 0 ? colors.danger : colors.text }}>
                            {globalStats.totalDeficit.toLocaleString()} kg
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textMuted }}>
                            ({globalStats.criticalCategoriesCount} cat. en quiebre)
                        </Typography>
                    </Box>
                </Card>

                {/* 2. Por Venir */}
                <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 2, p: 1.2 }}>
                    <Typography variant="caption" sx={{ color: colors.info, fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>
                        🚚 En Tránsito / Pedido
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.info }}>
                            {globalStats.totalPorVenir.toLocaleString()} kg
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textMuted }}>
                            por recibir
                        </Typography>
                    </Box>
                </Card>

                {/* 3. Stock Computable */}
                <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 2, p: 1.2 }}>
                    <Typography variant="caption" sx={{ color: colors.success, fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>
                        📦 Stock Computable
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.text }}>
                            {globalStats.totalStockComputable.toLocaleString()} kg
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textMuted }}>
                            disponibles
                        </Typography>
                    </Box>
                </Card>

                {/* 4. Remanentes / Sobrantes Aislados */}
                <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 2, p: 1.2 }}>
                    <Typography variant="caption" sx={{ color: colors.purple, fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>
                        🧊 Sobrantes Aislados
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.purple }}>
                            {globalStats.totalSobrantes.toLocaleString()} kg
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textMuted }}>
                            sin contaminar
                        </Typography>
                    </Box>
                </Card>
            </Box>

            {/* 3. BARRA DE FILTROS RÁPIDOS Y BÚSQUEDA */}
            <Box sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                mb: 1.5
            }}>
                {/* Segmented Filter Chips */}
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip
                        label={`Todas (${globalStats.totalCategories})`}
                        size="small"
                        clickable
                        onClick={() => setStatusFilter('ALL')}
                        sx={{
                            bgcolor: statusFilter === 'ALL' ? colors.primary : colors.surface,
                            color: statusFilter === 'ALL' ? '#000' : colors.textSecondary,
                            fontWeight: 700,
                            borderRadius: 1.5
                        }}
                    />
                    <Chip
                        icon={<ErrorOutlineIcon style={{ color: statusFilter === 'CRITICAL' ? '#000' : colors.danger }} />}
                        label={`Quiebres (${globalStats.criticalCategoriesCount})`}
                        size="small"
                        clickable
                        onClick={() => setStatusFilter('CRITICAL')}
                        sx={{
                            bgcolor: statusFilter === 'CRITICAL' ? colors.danger : colors.surface,
                            color: statusFilter === 'CRITICAL' ? '#fff' : colors.danger,
                            fontWeight: 700,
                            borderRadius: 1.5
                        }}
                    />
                    <Chip
                        icon={<WarningAmberIcon style={{ color: statusFilter === 'WARNING' ? '#000' : colors.warning }} />}
                        label={`En Riesgo (${globalStats.warningCategoriesCount})`}
                        size="small"
                        clickable
                        onClick={() => setStatusFilter('WARNING')}
                        sx={{
                            bgcolor: statusFilter === 'WARNING' ? colors.warning : colors.surface,
                            color: statusFilter === 'WARNING' ? '#000' : colors.warning,
                            fontWeight: 700,
                            borderRadius: 1.5
                        }}
                    />
                    <Chip
                        label="🧊 Sobrantes"
                        size="small"
                        clickable
                        onClick={() => setStatusFilter('SOBRANTES')}
                        sx={{
                            bgcolor: statusFilter === 'SOBRANTES' ? colors.purple : colors.surface,
                            color: statusFilter === 'SOBRANTES' ? '#fff' : colors.textSecondary,
                            fontWeight: 700,
                            borderRadius: 1.5
                        }}
                    />
                </Box>

                {/* Buscador Rápido y Toggle 0 kg */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: { xs: '1 1 100%', sm: 'none' } }}>
                    <TextField
                        size="small"
                        placeholder="Buscar hilado o proveedor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" sx={{ color: colors.textMuted }} />
                                </InputAdornment>
                            ),
                            endAdornment: search && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearch('')}>
                                        <CloseIcon fontSize="small" sx={{ color: colors.textMuted }} />
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                        sx={{
                            minWidth: { xs: '100%', sm: 260 },
                            '& .MuiOutlinedInput-root': {
                                height: 34,
                                fontSize: '13px',
                                bgcolor: colors.surface,
                                color: colors.text,
                                borderRadius: 1.5
                            }
                        }}
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={hideZeroStockSuppliers}
                                onChange={(e) => setHideZeroStockSuppliers(e.target.checked)}
                                sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': { color: colors.primary },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: colors.primary }
                                }}
                            />
                        }
                        label={<Typography sx={{ fontSize: '12px', color: colors.textSecondary }}>Ocultar 0 kg</Typography>}
                        sx={{ m: 0, display: { xs: 'none', md: 'flex' } }}
                    />
                </Box>
            </Box>

            {/* 4. MAIN SPLIT DASHBOARD (Master List + Detail Action Cockpit) */}
            <Box sx={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '58% 42%' },
                gap: 2,
                minHeight: 0,
                overflow: 'hidden'
            }}>
                {/* 4A. PANEL IZQUIERDO: MATRIZ DE CATEGORÍAS (Master View) */}
                <Paper sx={{
                    bgcolor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {/* Header de la Lista */}
                    <Box sx={{
                        p: 1.5,
                        borderBottom: `1px solid ${colors.border}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        bgcolor: 'rgba(255,255,255,0.02)'
                    }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.text, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>📋 Categorías de Materiales</span>
                            <Chip label={categoryGroups.length} size="small" sx={{ height: 20, fontSize: '11px', fontWeight: 700 }} />
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textMuted }}>
                            Click para abrir detalle operativo ➔
                        </Typography>
                    </Box>

                    {/* Contenedor con Scroll de Categorías */}
                    <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {loadingCategories || loadingStock ? (
                            <Box sx={{ p: 4, textAlign: 'center', color: colors.textMuted }}>
                                <LinearProgress sx={{ mb: 2, bgcolor: colors.surfaceHover, '& .MuiLinearProgress-bar': { bgcolor: colors.primary } }} />
                                Sincronizando stock computable y categorías...
                            </Box>
                        ) : categoryGroups.length === 0 ? (
                            <Box sx={{ p: 6, textAlign: 'center', color: colors.textMuted }}>
                                <Typography variant="h6" sx={{ color: colors.textSecondary, mb: 1 }}>
                                    🔍 No se encontraron categorías
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 2 }}>
                                    Prueba cambiando el filtro de estado o limpiando la búsqueda.
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => { setSearch(''); setStatusFilter('ALL'); }}
                                    sx={{ borderColor: colors.border, color: colors.text }}
                                >
                                    Restablecer filtros
                                </Button>
                            </Box>
                        ) : (
                            categoryGroups.map((group) => {
                                const isSelected = group.id === selectedCategoryId;
                                const isCritical = group.categoryStatus === 'CRITICAL';
                                const isWarning = group.categoryStatus === 'WARNING';
                                const coveragePercent = group.minimo && group.minimo > 0
                                    ? Math.min(100, Math.round(((group.totalStock + group.totalPorVenir) / group.minimo) * 100))
                                    : 100;

                                return (
                                    <Box
                                        key={group.id}
                                        onClick={() => setSelectedCategoryId(group.id)}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease-in-out',
                                            bgcolor: isSelected ? 'rgba(245, 158, 11, 0.08)' : colors.surfaceElevated,
                                            border: `1.5px solid ${isSelected ? colors.primary : isCritical ? 'rgba(239, 68, 68, 0.4)' : colors.border}`,
                                            '&:hover': {
                                                bgcolor: isSelected ? 'rgba(245, 158, 11, 0.12)' : colors.surfaceHover,
                                                borderColor: isSelected ? colors.primary : colors.textMuted
                                            }
                                        }}
                                    >
                                        {/* Fila 1: Nombre de Categoría + Badge de Estado */}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography sx={{ fontWeight: 800, fontSize: '14px', color: isSelected ? colors.primary : colors.text }}>
                                                    {group.nombre}
                                                </Typography>
                                                {group.totalSobrante > 0 && (
                                                    <Tooltip title={`${group.totalSobrante} kg en remanentes aislados que no contaminan compras`}>
                                                        <Chip
                                                            label={`🧊 +${group.totalSobrante.toLocaleString()} kg excl.`}
                                                            size="small"
                                                            sx={{ height: 18, fontSize: '10px', bgcolor: 'rgba(168, 85, 247, 0.15)', color: colors.purple, fontWeight: 700 }}
                                                        />
                                                    </Tooltip>
                                                )}
                                            </Box>

                                            {/* Badge de Criticidad / Déficit */}
                                            {isCritical ? (
                                                <Chip
                                                    label={`🔴 Falta: ${group.categoryDeficit.toLocaleString()} kg`}
                                                    size="small"
                                                    sx={{ height: 22, fontSize: '11px', bgcolor: colors.dangerBg, color: colors.danger, fontWeight: 800 }}
                                                />
                                            ) : isWarning ? (
                                                <Chip
                                                    label="🟡 Cubierto en Tránsito"
                                                    size="small"
                                                    sx={{ height: 22, fontSize: '11px', bgcolor: colors.warningBg, color: colors.warning, fontWeight: 700 }}
                                                />
                                            ) : (
                                                <Chip
                                                    label="🟢 Abastecido"
                                                    size="small"
                                                    sx={{ height: 22, fontSize: '11px', bgcolor: colors.successBg, color: colors.success, fontWeight: 700 }}
                                                />
                                            )}
                                        </Box>

                                        {/* Fila 2: Barra de Progreso de Cobertura */}
                                        <Box sx={{ mb: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textSecondary, mb: 0.4 }}>
                                                <span>
                                                    Stock: <strong>{group.totalStock.toLocaleString()} kg</strong>
                                                    {group.totalPorVenir > 0 && (
                                                        <span style={{ color: colors.info, marginLeft: '6px' }}>
                                                            (+{group.totalPorVenir.toLocaleString()} kg ped.)
                                                        </span>
                                                    )}
                                                </span>
                                                <span>
                                                    Objetivo Mín: <strong>{group.minimo ? `${group.minimo.toLocaleString()} kg` : 'Sin fijar'}</strong> ({coveragePercent}%)
                                                </span>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={coveragePercent}
                                                sx={{
                                                    height: 6,
                                                    borderRadius: 1,
                                                    bgcolor: 'rgba(255,255,255,0.06)',
                                                    '& .MuiLinearProgress-bar': {
                                                        bgcolor: isCritical ? colors.danger : isWarning ? colors.warning : colors.success
                                                    }
                                                }}
                                            />
                                        </Box>

                                        {/* Fila 3: Proveedores con Stock */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                                            <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                                                Proveedores:
                                            </Typography>
                                            {group.activeSuppliers.length === 0 ? (
                                                <Typography variant="caption" sx={{ color: colors.textMuted, fontStyle: 'italic' }}>
                                                    Sin stock activo en proveedores
                                                </Typography>
                                            ) : (
                                                group.activeSuppliers.slice(0, 3).map((sup, idx) => (
                                                    <Chip
                                                        key={idx}
                                                        label={`${sup.name}: ${sup.stock.toLocaleString()} kg`}
                                                        size="small"
                                                        sx={{
                                                            height: 18,
                                                            fontSize: '10px',
                                                            bgcolor: 'rgba(255,255,255,0.04)',
                                                            color: colors.textSecondary,
                                                            border: `1px solid ${colors.border}`
                                                        }}
                                                    />
                                                ))
                                            )}
                                            {group.activeSuppliers.length > 3 && (
                                                <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                                                    +{group.activeSuppliers.length - 3} más
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                );
                            })
                        )}
                    </Box>
                </Paper>

                {/* 4B. PANEL DERECHO: COCKPIT DE DECISIÓN Y ACCIÓN (Detail View) */}
                <Paper sx={{
                    bgcolor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {selectedGroup ? (
                        <>
                            {/* Cabecera del Detalle de Categoría */}
                            <Box sx={{
                                p: 2,
                                borderBottom: `1px solid ${colors.border}`,
                                bgcolor: 'rgba(255,255,255,0.02)'
                            }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 900, color: colors.text, fontSize: '18px' }}>
                                            {selectedGroup.nombre}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                            Ficha Ejecutiva de Abastecimiento • {selectedGroup.items.length} SKUs asociados
                                        </Typography>
                                    </Box>

                                    {/* Botón Acción 1: Ajustar Mín/Máx de Categoría */}
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => {
                                            setCatMinInput(selectedGroup.minimo !== null ? String(selectedGroup.minimo) : '');
                                            setCatMaxInput(selectedGroup.maximo !== null ? String(selectedGroup.maximo) : '');
                                            setEditCategoryLimitsOpen(true);
                                        }}
                                        startIcon={<TuneIcon fontSize="small" />}
                                        sx={{
                                            fontSize: '11px',
                                            borderColor: colors.border,
                                            color: colors.primary,
                                            textTransform: 'none',
                                            '&:hover': { borderColor: colors.primary }
                                        }}
                                    >
                                        Editar Mín/Máx
                                    </Button>
                                </Box>

                                {/* Indicadores Rápidos de la Categoría */}
                                <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 1,
                                    mt: 1.5,
                                    p: 1.2,
                                    bgcolor: 'rgba(0,0,0,0.2)',
                                    borderRadius: 1.5,
                                    border: `1px solid ${colors.border}`
                                }}>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                                            Stock Computable
                                        </Typography>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: colors.text }}>
                                            {selectedGroup.totalStock.toLocaleString()} kg
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" sx={{ color: colors.info, fontSize: '10px' }}>
                                            Por Venir
                                        </Typography>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: colors.info }}>
                                            +{selectedGroup.totalPorVenir.toLocaleString()} kg
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" sx={{ color: selectedGroup.categoryDeficit > 0 ? colors.danger : colors.success, fontSize: '10px' }}>
                                            {selectedGroup.categoryDeficit > 0 ? 'Déficit a Comprar' : 'Estado'}
                                        </Typography>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: selectedGroup.categoryDeficit > 0 ? colors.danger : colors.success }}>
                                            {selectedGroup.categoryDeficit > 0 ? `-${selectedGroup.categoryDeficit.toLocaleString()} kg` : '✓ Óptimo'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Banner de Decisión Inmediata de Compra (si hay quiebre) */}
                                {selectedGroup.categoryDeficit > 0 && (
                                    <Box sx={{
                                        mt: 1.5,
                                        p: 1.2,
                                        bgcolor: colors.dangerBg,
                                        border: `1px solid ${colors.danger}`,
                                        borderRadius: 1.5,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: 1
                                    }}>
                                        <Box>
                                            <Typography sx={{ fontWeight: 800, color: colors.danger, fontSize: '12px' }}>
                                                🚨 Quiebre Detectado: Comprar {selectedGroup.categoryDeficit.toLocaleString()} kg
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                                Llegarás al mínimo sugerido de {selectedGroup.minimo?.toLocaleString()} kg.
                                            </Typography>
                                        </Box>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() => {
                                                setQuickOrderTarget(selectedGroup);
                                                setQuickOrderQty(String(selectedGroup.categoryDeficit));
                                                setQuickOrderSupplierId(selectedGroup.items[0]?.supplierId || '');
                                            }}
                                            startIcon={<AddShoppingCartIcon fontSize="small" />}
                                            sx={{
                                                bgcolor: colors.danger,
                                                color: '#fff',
                                                fontWeight: 800,
                                                fontSize: '11px',
                                                textTransform: 'none',
                                                whiteSpace: 'nowrap',
                                                '&:hover': { bgcolor: '#dc2626' }
                                            }}
                                        >
                                            Comprar Ya
                                        </Button>
                                    </Box>
                                )}
                            </Box>

                            {/* Tabla Operativa de Proveedores & SKUs */}
                            <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
                                <Typography variant="caption" sx={{ color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                                    Proveedores de la Categoría ({selectedGroup.items.length})
                                </Typography>

                                <TableContainer sx={{ border: `1px solid ${colors.border}`, borderRadius: 1.5 }}>
                                    <Table size="small">
                                        <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}>
                                            <TableRow>
                                                <TableCell sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Proveedor / SKU</TableCell>
                                                <TableCell align="right" sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Stock</TableCell>
                                                <TableCell align="right" sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Por Venir</TableCell>
                                                <TableCell align="center" sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Tratamiento</TableCell>
                                                <TableCell align="center" sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Acciones</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {selectedGroup.items
                                                .filter(item => !hideZeroStockSuppliers || !item.isZeroActivity)
                                                .map(item => {
                                                    const isExcluded = item.esSobrante;

                                                    return (
                                                        <TableRow
                                                            key={item.id}
                                                            sx={{
                                                                bgcolor: isExcluded ? 'rgba(168, 85, 247, 0.04)' : 'transparent',
                                                                '&:hover': { bgcolor: colors.surfaceHover }
                                                            }}
                                                        >
                                                            {/* Proveedor y Código */}
                                                            <TableCell sx={{ color: colors.text }}>
                                                                <Typography sx={{ fontWeight: 700, fontSize: '12px', color: isExcluded ? colors.purple : colors.text }}>
                                                                    {item.supplier?.name || 'Proveedor no asignado'}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                                                                    {item.codigoInterno}
                                                                </Typography>
                                                            </TableCell>

                                                            {/* Stock */}
                                                            <TableCell align="right">
                                                                <Typography sx={{
                                                                    fontWeight: 800,
                                                                    fontSize: '12px',
                                                                    color: isExcluded ? colors.purple : item.stockActual > 0 ? colors.text : colors.textMuted
                                                                }}>
                                                                    {item.stockActual.toLocaleString()} kg
                                                                </Typography>
                                                                {isExcluded && (
                                                                    <Typography variant="caption" sx={{ color: colors.purple, fontSize: '9px', display: 'block' }}>
                                                                        [Sobrante]
                                                                    </Typography>
                                                                )}
                                                            </TableCell>

                                                            {/* Por Venir */}
                                                            <TableCell align="right">
                                                                <Typography sx={{
                                                                    fontWeight: 700,
                                                                    fontSize: '12px',
                                                                    color: item.porVenir > 0 ? colors.info : colors.textMuted
                                                                }}>
                                                                    {item.porVenir > 0 ? `+${item.porVenir.toLocaleString()} kg` : '0'}
                                                                </Typography>
                                                            </TableCell>

                                                            {/* Toggle Remanente / Sobrante */}
                                                            <TableCell align="center">
                                                                <Tooltip title={isExcluded ? "Reintegrar al stock computable de compras" : "Marcar como remanente/sobrante para no contaminar compras"}>
                                                                    <Button
                                                                        size="small"
                                                                        onClick={() => handleToggleSobrante(item)}
                                                                        startIcon={isExcluded ? <CheckIcon fontSize="small" /> : <BlockIcon fontSize="small" />}
                                                                        sx={{
                                                                            fontSize: '10px',
                                                                            height: 24,
                                                                            p: '2px 8px',
                                                                            textTransform: 'none',
                                                                            fontWeight: 700,
                                                                            color: isExcluded ? colors.purple : colors.textMuted,
                                                                            bgcolor: isExcluded ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.03)',
                                                                            border: `1px solid ${isExcluded ? colors.purple : colors.border}`,
                                                                            '&:hover': {
                                                                                bgcolor: isExcluded ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255,255,255,0.08)'
                                                                            }
                                                                        }}
                                                                    >
                                                                        {isExcluded ? 'Excluido' : 'Computable'}
                                                                    </Button>
                                                                </Tooltip>
                                                            </TableCell>

                                                            {/* Acciones del Ítem */}
                                                            <TableCell align="center">
                                                                <Tooltip title="Editar Mín/Máx y Pedido por venir del ítem">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => {
                                                                            setEditItemLimitsTarget(item);
                                                                            setItemMinInput(item.stockMinimo !== null ? String(item.stockMinimo) : '');
                                                                            setItemMaxInput(item.stockMaximo !== null ? String(item.stockMaximo) : '');
                                                                            setItemPorVenirInput(String(item.porVenir || 0));
                                                                        }}
                                                                        sx={{ color: colors.textSecondary, '&:hover': { color: colors.primary } }}
                                                                    >
                                                                        <EditIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </>
                    ) : (
                        <Box sx={{ p: 6, textAlign: 'center', color: colors.textMuted, m: 'auto' }}>
                            <LayersIcon sx={{ fontSize: 48, color: colors.textMuted, mb: 1, opacity: 0.5 }} />
                            <Typography variant="subtitle1" sx={{ color: colors.textSecondary, fontWeight: 700 }}>
                                Selecciona una categoría
                            </Typography>
                            <Typography variant="caption">
                                Haz clic en cualquier categoría de la izquierda para ver su tablero de decisión y proveedores.
                            </Typography>
                        </Box>
                    )}
                </Paper>
            </Box>

            {/* MODAL 1: EDITAR LÍMITES DE CATEGORÍA (MÍN / MÁX) */}
            <Dialog
                open={editCategoryLimitsOpen}
                onClose={() => setEditCategoryLimitsOpen(false)}
                PaperProps={{
                    sx: { bgcolor: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, minWidth: 360, borderRadius: 2 }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, fontSize: '16px' }}>
                    ⚙️ Stock Mínimo y Máximo de Categoría
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 2 }}>
                        Categoría: <strong>{selectedGroup?.nombre}</strong>
                        <br />
                        Este límite engloba a todos los proveedores activos de la categoría.
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Stock Mínimo Objetivo (kg)"
                            type="number"
                            size="small"
                            value={catMinInput}
                            onChange={(e) => setCatMinInput(e.target.value)}
                            helperText="Si el stock computable cae por debajo, se disparará la alerta de quiebre."
                            InputProps={{
                                endAdornment: <InputAdornment position="end">kg</InputAdornment>
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': { bgcolor: colors.bg, color: colors.text },
                                '& .MuiInputLabel-root': { color: colors.textSecondary }
                            }}
                        />

                        <TextField
                            label="Stock Máximo de Seguridad (kg)"
                            type="number"
                            size="small"
                            value={catMaxInput}
                            onChange={(e) => setCatMaxInput(e.target.value)}
                            helperText="Opcional. Para evitar sobre-stock y capital inmovilizado."
                            InputProps={{
                                endAdornment: <InputAdornment position="end">kg</InputAdornment>
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': { bgcolor: colors.bg, color: colors.text },
                                '& .MuiInputLabel-root': { color: colors.textSecondary }
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: `1px solid ${colors.border}` }}>
                    <Button onClick={() => setEditCategoryLimitsOpen(false)} sx={{ color: colors.textMuted }}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveCategoryLimits}
                        sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, '&:hover': { bgcolor: colors.primaryHover } }}
                    >
                        Guardar Límites
                    </Button>
                </DialogActions>
            </Dialog>

            {/* MODAL 2: EDITAR ÍTEM INDIVIDUAL (MÍN / MÁX / POR VENIR) */}
            <Dialog
                open={Boolean(editItemLimitsTarget)}
                onClose={() => setEditItemLimitsTarget(null)}
                PaperProps={{
                    sx: { bgcolor: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, minWidth: 360, borderRadius: 2 }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, fontSize: '16px' }}>
                    ✏️ Ajustar Material: {editItemLimitsTarget?.supplier?.name || editItemLimitsTarget?.descripcion}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 2 }}>
                        Código: <code>{editItemLimitsTarget?.codigoInterno}</code>
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Kilos Por Venir (Pedido colocado)"
                            type="number"
                            size="small"
                            value={itemPorVenirInput}
                            onChange={(e) => setItemPorVenirInput(e.target.value)}
                            helperText="Kilos ya pedidos al proveedor que están en tránsito."
                            InputProps={{
                                endAdornment: <InputAdornment position="end">kg</InputAdornment>
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': { bgcolor: colors.bg, color: colors.text },
                                '& .MuiInputLabel-root': { color: colors.textSecondary }
                            }}
                        />

                        <TextField
                            label="Stock Mínimo Individual (kg)"
                            type="number"
                            size="small"
                            value={itemMinInput}
                            onChange={(e) => setItemMinInput(e.target.value)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">kg</InputAdornment>
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': { bgcolor: colors.bg, color: colors.text },
                                '& .MuiInputLabel-root': { color: colors.textSecondary }
                            }}
                        />

                        <TextField
                            label="Stock Máximo Individual (kg)"
                            type="number"
                            size="small"
                            value={itemMaxInput}
                            onChange={(e) => setItemMaxInput(e.target.value)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">kg</InputAdornment>
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': { bgcolor: colors.bg, color: colors.text },
                                '& .MuiInputLabel-root': { color: colors.textSecondary }
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: `1px solid ${colors.border}` }}>
                    <Button onClick={() => setEditItemLimitsTarget(null)} sx={{ color: colors.textMuted }}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveItemLimits}
                        sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, '&:hover': { bgcolor: colors.primaryHover } }}
                    >
                        Guardar Cambios
                    </Button>
                </DialogActions>
            </Dialog>

            {/* MODAL 3: INICIAR ORDEN RÁPIDA DE COMPRA */}
            <Dialog
                open={Boolean(quickOrderTarget)}
                onClose={() => setQuickOrderTarget(null)}
                PaperProps={{
                    sx: { bgcolor: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, minWidth: 400, borderRadius: 2 }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, fontSize: '16px', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ShoppingCartIcon sx={{ color: colors.primary }} />
                    Registrar Orden de Compra Sugerida
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 2 }}>
                        Categoría: <strong>{quickOrderTarget?.nombre}</strong>
                        <br />
                        Se asentará la cantidad indicada como <strong>Por Venir (en tránsito)</strong> para cubrir el quiebre de stock.
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            select
                            label="Proveedor a comprar"
                            size="small"
                            value={quickOrderSupplierId}
                            onChange={(e) => setQuickOrderSupplierId(e.target.value)}
                            SelectProps={{ native: true }}
                            sx={{
                                '& .MuiOutlinedInput-root': { bgcolor: colors.bg, color: colors.text },
                                '& .MuiInputLabel-root': { color: colors.textSecondary }
                            }}
                        >
                            {quickOrderTarget?.items.map((i: any) => (
                                <option key={i.id} value={i.supplierId || i.id}>
                                    {i.supplier?.name || i.descripcion} ({i.codigoInterno})
                                </option>
                            ))}
                        </TextField>

                        <TextField
                            label="Kilos a Comprar"
                            type="number"
                            size="small"
                            value={quickOrderQty}
                            onChange={(e) => setQuickOrderQty(e.target.value)}
                            helperText="Cantidad calculada automáticamente para alcanzar el mínimo."
                            InputProps={{
                                endAdornment: <InputAdornment position="end">kg</InputAdornment>
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': { bgcolor: colors.bg, color: colors.text },
                                '& .MuiInputLabel-root': { color: colors.textSecondary }
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: `1px solid ${colors.border}` }}>
                    <Button onClick={() => setQuickOrderTarget(null)} sx={{ color: colors.textMuted }}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmQuickOrder}
                        sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, '&:hover': { bgcolor: colors.primaryHover } }}
                    >
                        Confirmar y Asentar Pedido
                    </Button>
                </DialogActions>
            </Dialog>

            {/* DRAWER LATERAL: ALERTAS EXTERNAS (Pedidos y Fichas) */}
            <Drawer
                anchor="right"
                open={alertsDrawerOpen}
                onClose={() => setAlertsDrawerOpen(false)}
                PaperProps={{
                    sx: { width: { xs: '100%', sm: 380 }, bgcolor: colors.surface, color: colors.text, p: 2 }
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '16px' }}>
                        🔔 Alertas de Producción ({externalAlerts.length})
                    </Typography>
                    <IconButton size="small" onClick={() => setAlertsDrawerOpen(false)} sx={{ color: colors.textMuted }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Divider sx={{ borderColor: colors.border, mb: 2 }} />

                {externalAlerts.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', color: colors.success }}>
                        ✓ No hay alertas pendientes de producción ni artículos sin ficha técnica.
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {externalAlerts.map(a => (
                            <Box
                                key={a.id}
                                sx={{
                                    p: 1.5,
                                    borderRadius: 1.5,
                                    bgcolor: colors.surfaceElevated,
                                    border: `1px solid ${a.tipo === 'PEDIDO_SIN_STOCK' ? colors.danger : colors.warning}`
                                }}
                            >
                                <Typography sx={{ fontWeight: 700, fontSize: '13px', color: a.tipo === 'PEDIDO_SIN_STOCK' ? colors.danger : colors.warning }}>
                                    {a.titulo}
                                </Typography>
                                <Typography variant="caption" sx={{ color: colors.textSecondary, mt: 0.5, display: 'block' }}>
                                    {a.detalle}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}
            </Drawer>

            {/* TOAST FEEDBACK */}
            <Snackbar
                open={Boolean(feedbackToast)}
                autoHideDuration={3500}
                onClose={() => setFeedbackToast(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setFeedbackToast(null)}
                    severity={feedbackToast?.severity || 'info'}
                    sx={{ width: '100%', fontWeight: 700 }}
                >
                    {feedbackToast?.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
