import { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Card,
    Chip,
    Button,
    TextField,
    InputAdornment,
    IconButton,
    Tabs,
    Tab,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableContainer,
    Paper,
    LinearProgress,
    Collapse,
    Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LinkIcon from '@mui/icons-material/Link';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { useOrdenesCompra } from '../../features/purchasing/ordenesCompra/ordenesCompraStorage';
import type { OrdenCompra, OrdenCompraLinea } from '../../features/purchasing/ordenesCompra/types';
import NuevaOrdenCompraModal from '../../features/purchasing/ordenesCompra/NuevaOrdenCompraModal';
import RecepcionOrdenCompraModal from '../../features/purchasing/ordenesCompra/RecepcionOrdenCompraModal';
import SawtoothChart from '../../features/purchasing/ordenesCompra/SawtoothChart';

import { useGetPartnersQuery } from '../../features/config/partners/api/partners.api';
import { useGetItemsQuery } from '../../features/warehouse/materiales/api/items.api';
import { useGetStockQuery, useGetRecentMovementsQuery } from '../../features/warehouse/stock/api/stock.api';

export default function OrdenesCompraPage() {
    const { ordenes, remove } = useOrdenesCompra();

    // Consultas de datos maestros para creación y cálculo de sierra
    const { data: partners = [] } = useGetPartnersQuery({});
    const { data: items = [] } = useGetItemsQuery({});
    const { data: allStock = [] } = useGetStockQuery({});

    // Mapeo de Stock Total por ItemId
    const stockTotalsByItem = useMemo(() => {
        const map = new Map<string, number>();
        allStock.forEach((sb: any) => {
            const current = map.get(sb.itemId) || 0;
            map.set(sb.itemId, current + Number(sb.qtyPrincipal || 0));
        });
        return map;
    }, [allStock]);

    // Consumo de los últimos 90 días
    const { desde90d, hastaHoy } = useMemo(() => {
        const today = new Date();
        const d90 = new Date();
        d90.setDate(today.getDate() - 90);
        return {
            desde90d: d90.toISOString().split('T')[0],
            hastaHoy: today.toISOString().split('T')[0]
        };
    }, []);

    const { data: recentMovements = [] } = useGetRecentMovementsQuery({ desde: desde90d, hasta: hastaHoy });

    const consumptionByItem = useMemo(() => {
        const map = new Map<string, number>();
        recentMovements.forEach((m: any) => {
            if (m.status === 'ANULADO') return;
            const tipo = String(m.tipo || '').toUpperCase();
            if (tipo === 'REMITO_SALIDA' || tipo === 'ENTREGA_PRODUCCION' || tipo === 'AJUSTE_RESTA' || tipo === 'SALIDA') {
                const itemId = m.itemId || m.item?.id;
                const itemCode = m.item?.codigoInterno ? String(m.item.codigoInterno).trim().toUpperCase() : null;
                const qty = Math.abs(Number(m.qtyPrincipal || m.cantidadPrincipal || m.cantidad || 0));

                if (itemId) map.set(itemId, (map.get(itemId) || 0) + qty);
                if (itemCode) map.set(itemCode, (map.get(itemCode) || 0) + qty);
            }
        });
        return map;
    }, [recentMovements]);

    // Estados de navegación y filtros
    const [tab, setTab] = useState<'LISTA' | 'SIERRA'>('LISTA');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'EN_CAMINO' | 'PARCIAL' | 'COMPLETADA'>('ALL');
    const [search, setSearch] = useState<string>('');
    const [expandedOcId, setExpandedOcId] = useState<string | null>(null);

    // Modales
    const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
    const [recepcionTarget, setRecepcionTarget] = useState<{ orden: OrdenCompra; linea: OrdenCompraLinea } | null>(null);

    // Estadísticas globales de Órdenes de Compra
    const stats = useMemo(() => {
        let totalPed = 0;
        let totalRec = 0;
        let totalPend = 0;
        let activasCount = 0;
        let proximoArribo: { fecha: string; orden: string; partner: string } | null = null;

        ordenes.forEach(oc => {
            if (oc.estado === 'EN_CAMINO' || oc.estado === 'PARCIAL') {
                activasCount++;
                if (!proximoArribo || oc.fechaArriboEstimada < proximoArribo.fecha) {
                    proximoArribo = { fecha: oc.fechaArriboEstimada, orden: oc.numero, partner: oc.partnerNombre };
                }
            }

            oc.lineas.forEach(l => {
                const p = Number(l.cantidadPedidaKg || 0);
                const r = Number(l.cantidadRecibidaKg || 0);
                totalPed += p;
                totalRec += r;
                if (oc.estado === 'EN_CAMINO' || oc.estado === 'PARCIAL') {
                    totalPend += Math.max(0, p - r);
                }
            });
        });

        return {
            totalPed,
            totalRec,
            totalPend,
            activasCount,
            proximoArribo: proximoArribo as { fecha: string; orden: string; partner: string } | null
        };
    }, [ordenes]);

    // Filtrar órdenes
    const filteredOrdenes = useMemo(() => {
        const q = search.trim().toLowerCase();
        return ordenes.filter(oc => {
            if (statusFilter !== 'ALL' && oc.estado !== statusFilter) return false;
            if (!q) return true;

            const matchesPartner = oc.partnerNombre.toLowerCase().includes(q);
            const matchesNumero = oc.numero.toLowerCase().includes(q);
            const matchesLineas = oc.lineas.some(l =>
                l.codigoInterno.toLowerCase().includes(q) || l.descripcion.toLowerCase().includes(q)
            );

            return matchesPartner || matchesNumero || matchesLineas;
        });
    }, [ordenes, statusFilter, search]);

    const colors = {
        bg: '#0f172a',
        surface: '#1e293b',
        border: 'rgba(255, 255, 255, 0.08)',
        primary: '#f59e0b',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#38bdf8',
        purple: '#a855f7',
        text: '#f8fafc',
        textSecondary: '#94a3b8',
        textMuted: '#64748b'
    };

    return (
        <Box sx={{
            minHeight: 'calc(100vh - 68px)',
            bgcolor: colors.bg,
            color: colors.text,
            p: { xs: 1.5, sm: 2.5 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2
        }}>
            {/* 1. CABECERA & ACCIÓN PRINCIPAL */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1.5,
                pb: 1.5,
                borderBottom: `1px solid ${colors.border}`
            }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.text, fontSize: { xs: '18px', sm: '22px' } }}>
                            📋 Órdenes de Compra & Arribos
                        </Typography>
                        <Chip
                            label={`${stats.activasCount} órdenes en curso`}
                            size="small"
                            sx={{ bgcolor: 'rgba(245, 158, 11, 0.15)', color: colors.primary, fontWeight: 800, fontSize: '11px' }}
                        />
                    </Box>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                        Emisión tipo remito • Estimados de arribo • Recepción con remitos o directa • Gráfico Diente de Sierra
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Button
                        variant="contained"
                        onClick={() => setNewOrderModalOpen(true)}
                        startIcon={<AddIcon />}
                        sx={{
                            bgcolor: colors.primary,
                            color: '#000',
                            fontWeight: 800,
                            textTransform: 'none',
                            fontSize: '13px',
                            px: 2,
                            '&:hover': { bgcolor: '#d97706' }
                        }}
                    >
                        Nueva Orden de Compra
                    </Button>
                </Box>
            </Box>

            {/* 2. STATS STRIP (Indicadores Clave de Abastecimiento) */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                gap: 1.5
            }}>
                {/* 1. Total en Tránsito / Pendiente */}
                <Card sx={{ bgcolor: colors.surface, border: `1px solid rgba(56, 189, 248, 0.3)`, borderRadius: 2, p: 1.5 }}>
                    <Typography variant="caption" sx={{ color: colors.info, fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocalShippingIcon sx={{ fontSize: 13 }} />
                        Kilos en Tránsito (Por Venir)
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: colors.info, mt: 0.3 }}>
                        +{stats.totalPend.toLocaleString()} kg
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                        Pendientes de arribar al depósito
                    </Typography>
                </Card>

                {/* 2. Próximo Arribo Programado */}
                <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 2, p: 1.5 }}>
                    <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PendingActionsIcon sx={{ fontSize: 13 }} />
                        Próximo Arribo Estimado
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: colors.text, mt: 0.3, fontSize: '16px' }}>
                        {stats.proximoArribo ? stats.proximoArribo.fecha : 'Sin arribos'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px', display: 'block' }}>
                        {stats.proximoArribo ? `${stats.proximoArribo.orden} • ${stats.proximoArribo.partner}` : 'Todas entregadas'}
                    </Typography>
                </Card>

                {/* 3. Kilos Ya Recibidos */}
                <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 2, p: 1.5 }}>
                    <Typography variant="caption" sx={{ color: colors.success, fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CheckCircleIcon sx={{ fontSize: 13 }} />
                        Kilos Entregados / Recibidos
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: colors.success, mt: 0.3 }}>
                        {stats.totalRec.toLocaleString()} kg
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                        Ingresados físicamente
                    </Typography>
                </Card>

                {/* 4. Total Histórico Contratado */}
                <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 2, p: 1.5 }}>
                    <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>
                        Total Pedido Acumulado
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: colors.text, mt: 0.3 }}>
                        {stats.totalPed.toLocaleString()} kg
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                        En {ordenes.length} órdenes registradas
                    </Typography>
                </Card>
            </Box>

            {/* 3. SELECTOR DE VISTA: GESTIÓN VS GRÁFICO DIENTE DE SIERRA */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{
                        bgcolor: 'rgba(255,255,255,0.02)',
                        borderRadius: 1.5,
                        p: 0.5,
                        '& .MuiTab-root': {
                            color: colors.textSecondary,
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '13px',
                            minHeight: 36,
                            borderRadius: 1
                        },
                        '& .Mui-selected': {
                            color: '#000',
                            bgcolor: colors.primary,
                            fontWeight: 800
                        },
                        '& .MuiTabs-indicator': { display: 'none' }
                    }}
                >
                    <Tab value="LISTA" label="📋 Órdenes de Compra (Gestión y Recepción)" />
                    <Tab value="SIERRA" icon={<TrendingUpIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="📈 Gráfico Diente de Sierra (Quiebres y Arribos)" />
                </Tabs>

                {tab === 'LISTA' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <TextField
                            size="small"
                            placeholder="Buscar orden, proveedor o material..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ color: colors.textMuted }} />
                                    </InputAdornment>
                                )
                            }}
                            sx={{
                                minWidth: 260,
                                '& .MuiOutlinedInput-root': {
                                    height: 36,
                                    fontSize: '13px',
                                    bgcolor: colors.surface,
                                    color: colors.text,
                                    borderRadius: 1.5
                                }
                            }}
                        />

                        {/* Filtros de Estado */}
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Chip
                                label="Todas"
                                size="small"
                                clickable
                                onClick={() => setStatusFilter('ALL')}
                                sx={{
                                    bgcolor: statusFilter === 'ALL' ? colors.primary : colors.surface,
                                    color: statusFilter === 'ALL' ? '#000' : colors.textSecondary,
                                    fontWeight: 700
                                }}
                            />
                            <Chip
                                label="En Camino"
                                size="small"
                                clickable
                                onClick={() => setStatusFilter('EN_CAMINO')}
                                sx={{
                                    bgcolor: statusFilter === 'EN_CAMINO' ? colors.info : colors.surface,
                                    color: statusFilter === 'EN_CAMINO' ? '#000' : colors.info,
                                    fontWeight: 700
                                }}
                            />
                            <Chip
                                label="Parciales"
                                size="small"
                                clickable
                                onClick={() => setStatusFilter('PARCIAL')}
                                sx={{
                                    bgcolor: statusFilter === 'PARCIAL' ? colors.warning : colors.surface,
                                    color: statusFilter === 'PARCIAL' ? '#000' : colors.warning,
                                    fontWeight: 700
                                }}
                            />
                            <Chip
                                label="Completas"
                                size="small"
                                clickable
                                onClick={() => setStatusFilter('COMPLETADA')}
                                sx={{
                                    bgcolor: statusFilter === 'COMPLETADA' ? colors.success : colors.surface,
                                    color: statusFilter === 'COMPLETADA' ? '#000' : colors.success,
                                    fontWeight: 700
                                }}
                            />
                        </Box>
                    </Box>
                )}
            </Box>

            {/* 4. CONTENIDO SEGÚN PESTAÑA */}
            {tab === 'SIERRA' ? (
                /* TAB 2: GRÁFICO DIENTE DE SIERRA */
                <SawtoothChart
                    items={items}
                    categories={[]}
                    stockTotalsByItem={stockTotalsByItem}
                    consumptionByItem={consumptionByItem}
                />
            ) : (
                /* TAB 1: LISTADO Y GESTIÓN DE ÓRDENES DE COMPRA */
                <TableContainer component={Paper} sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 2 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                            <TableRow>
                                <TableCell sx={{ width: 40 }}></TableCell>
                                <TableCell sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>N° Orden / Emisión</TableCell>
                                <TableCell sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Proveedor</TableCell>
                                <TableCell sx={{ color: colors.info, fontSize: '11px', fontWeight: 700 }}>Estimado de Arribo</TableCell>
                                <TableCell sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Progreso de Entrega</TableCell>
                                <TableCell align="right" sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Total Pedido</TableCell>
                                <TableCell align="right" sx={{ color: colors.success, fontSize: '11px', fontWeight: 700 }}>Recibido</TableCell>
                                <TableCell align="right" sx={{ color: colors.info, fontSize: '11px', fontWeight: 700 }}>Pendiente</TableCell>
                                <TableCell align="center" sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Estado</TableCell>
                                <TableCell align="center" sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredOrdenes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} sx={{ textAlign: 'center', py: 6, color: colors.textMuted }}>
                                        No se encontraron órdenes de compra con los filtros seleccionados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOrdenes.map(oc => {
                                    const isExpanded = expandedOcId === oc.id;
                                    const totalPed = oc.lineas.reduce((acc, l) => acc + Number(l.cantidadPedidaKg || 0), 0);
                                    const totalRec = oc.lineas.reduce((acc, l) => acc + Number(l.cantidadRecibidaKg || 0), 0);
                                    const totalPend = Math.max(0, totalPed - totalRec);
                                    const percent = totalPed > 0 ? Math.min(100, Math.round((totalRec / totalPed) * 100)) : 0;

                                    return (
                                        <>
                                            <TableRow
                                                key={oc.id}
                                                sx={{
                                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => setExpandedOcId(isExpanded ? null : oc.id)}
                                            >
                                                {/* Expand chevron */}
                                                <TableCell onClick={(e) => { e.stopPropagation(); setExpandedOcId(isExpanded ? null : oc.id); }}>
                                                    <IconButton size="small" sx={{ color: colors.textSecondary }}>
                                                        {isExpanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                                                    </IconButton>
                                                </TableCell>

                                                {/* Número y Fecha */}
                                                <TableCell>
                                                    <Typography sx={{ fontWeight: 800, fontSize: '13px', color: colors.primary }}>
                                                        {oc.numero}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '11px' }}>
                                                        Emisión: {oc.fechaEmision}
                                                    </Typography>
                                                </TableCell>

                                                {/* Proveedor */}
                                                <TableCell>
                                                    <Typography sx={{ fontWeight: 700, fontSize: '13px', color: colors.text }}>
                                                        {oc.partnerNombre}
                                                    </Typography>
                                                    {oc.observaciones && (
                                                        <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px', display: 'block' }}>
                                                            {oc.observaciones.substring(0, 35)}...
                                                        </Typography>
                                                    )}
                                                </TableCell>

                                                {/* Estimado de Arribo */}
                                                <TableCell>
                                                    <Typography sx={{ fontWeight: 800, fontSize: '13px', color: colors.info, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <LocalShippingIcon sx={{ fontSize: 14 }} />
                                                        {oc.fechaArriboEstimada}
                                                    </Typography>
                                                </TableCell>

                                                {/* Progreso */}
                                                <TableCell sx={{ minWidth: 140 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', mb: 0.4 }}>
                                                        <span style={{ color: colors.textSecondary }}>Completitud</span>
                                                        <strong style={{ color: percent === 100 ? colors.success : colors.text }}>{percent}%</strong>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={percent}
                                                        sx={{
                                                            height: 6,
                                                            borderRadius: 1,
                                                            bgcolor: 'rgba(255,255,255,0.06)',
                                                            '& .MuiLinearProgress-bar': {
                                                                bgcolor: percent === 100 ? colors.success : colors.info
                                                            }
                                                        }}
                                                    />
                                                </TableCell>

                                                {/* Kilos Pedidos */}
                                                <TableCell align="right">
                                                    <Typography sx={{ fontWeight: 800, fontSize: '13px', color: colors.text }}>
                                                        {totalPed.toLocaleString()} kg
                                                    </Typography>
                                                </TableCell>

                                                {/* Kilos Recibidos */}
                                                <TableCell align="right">
                                                    <Typography sx={{ fontWeight: 800, fontSize: '13px', color: colors.success }}>
                                                        {totalRec.toLocaleString()} kg
                                                    </Typography>
                                                </TableCell>

                                                {/* Kilos Pendientes */}
                                                <TableCell align="right">
                                                    <Typography sx={{ fontWeight: 800, fontSize: '13px', color: totalPend > 0 ? colors.info : colors.textMuted }}>
                                                        {totalPend > 0 ? `+${totalPend.toLocaleString()} kg` : '0 kg'}
                                                    </Typography>
                                                </TableCell>

                                                {/* Estado */}
                                                <TableCell align="center">
                                                    {oc.estado === 'EN_CAMINO' ? (
                                                        <Chip label="En Camino" size="small" sx={{ height: 22, fontSize: '11px', bgcolor: 'rgba(56, 189, 248, 0.15)', color: colors.info, fontWeight: 800 }} />
                                                    ) : oc.estado === 'PARCIAL' ? (
                                                        <Chip label="Parcial" size="small" sx={{ height: 22, fontSize: '11px', bgcolor: 'rgba(245, 158, 11, 0.15)', color: colors.warning, fontWeight: 800 }} />
                                                    ) : oc.estado === 'COMPLETADA' ? (
                                                        <Chip label="Completada" size="small" sx={{ height: 22, fontSize: '11px', bgcolor: 'rgba(16, 185, 129, 0.15)', color: colors.success, fontWeight: 800 }} />
                                                    ) : (
                                                        <Chip label={oc.estado} size="small" sx={{ height: 22, fontSize: '11px', bgcolor: 'rgba(255,255,255,0.05)', color: colors.textSecondary }} />
                                                    )}
                                                </TableCell>

                                                {/* Acciones */}
                                                <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                                    <Tooltip title="Eliminar orden de compra">
                                                        <IconButton size="small" onClick={() => remove(oc.id)} sx={{ color: colors.danger, opacity: 0.7 }}>
                                                            <DeleteOutlineIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>

                                            {/* Sub-tabla desplegable de líneas con botón de recepción (remito o manual) */}
                                            <TableRow>
                                                <TableCell colSpan={10} sx={{ p: 0, borderBottom: isExpanded ? `1px solid ${colors.border}` : 'none' }}>
                                                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                        <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.25)' }}>
                                                            <Typography variant="caption" sx={{ color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                                                                Detalle de Hilados Pedidos en la Orden ({oc.lineas.length} líneas)
                                                            </Typography>

                                                            <TableContainer sx={{ border: `1px solid ${colors.border}`, borderRadius: 1.5, bgcolor: colors.surface }}>
                                                                <Table size="small">
                                                                    <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                                                                        <TableRow>
                                                                            <TableCell sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Código / Material</TableCell>
                                                                            <TableCell sx={{ color: colors.info, fontSize: '11px', fontWeight: 700 }}>Arribo Estimado</TableCell>
                                                                            <TableCell align="right" sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Pedido (kg)</TableCell>
                                                                            <TableCell align="right" sx={{ color: colors.success, fontSize: '11px', fontWeight: 700 }}>Recibido (kg)</TableCell>
                                                                            <TableCell align="right" sx={{ color: colors.info, fontSize: '11px', fontWeight: 700 }}>Saldo Pendiente</TableCell>
                                                                            <TableCell sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Entregas Asentadas</TableCell>
                                                                            <TableCell align="center" sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Acciones de Recepción</TableCell>
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <TableBody>
                                                                        {oc.lineas.map(linea => {
                                                                            const pend = Math.max(0, linea.cantidadPedidaKg - linea.cantidadRecibidaKg);

                                                                            return (
                                                                                <TableRow key={linea.id}>
                                                                                    <TableCell>
                                                                                        <Typography sx={{ fontWeight: 700, fontSize: '12px', color: colors.text }}>
                                                                                            {linea.codigoInterno}
                                                                                        </Typography>
                                                                                        <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                                                                                            {linea.descripcion}
                                                                                        </Typography>
                                                                                    </TableCell>

                                                                                    <TableCell sx={{ color: colors.info, fontWeight: 700, fontSize: '12px' }}>
                                                                                        {linea.fechaArriboEstimada}
                                                                                    </TableCell>

                                                                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '12px', color: colors.text }}>
                                                                                        {linea.cantidadPedidaKg.toLocaleString()} kg
                                                                                    </TableCell>

                                                                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '12px', color: colors.success }}>
                                                                                        {linea.cantidadRecibidaKg.toLocaleString()} kg
                                                                                    </TableCell>

                                                                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '12px', color: pend > 0 ? colors.info : colors.textMuted }}>
                                                                                        {pend > 0 ? `+${pend.toLocaleString()} kg` : '0 kg'}
                                                                                    </TableCell>

                                                                                    <TableCell>
                                                                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                                                            {linea.remitosAsociados.map(r => (
                                                                                                <Chip
                                                                                                    key={r.id}
                                                                                                    icon={<LinkIcon sx={{ fontSize: 12 }} />}
                                                                                                    label={`${r.remitoNumero}: ${r.cantidadKg}kg`}
                                                                                                    size="small"
                                                                                                    sx={{ height: 20, fontSize: '10px', bgcolor: 'rgba(16, 185, 129, 0.1)', color: colors.success }}
                                                                                                />
                                                                                            ))}
                                                                                            {linea.recepcionesManuales.map(m => (
                                                                                                <Chip
                                                                                                    key={m.id}
                                                                                                    icon={<FlashOnIcon sx={{ fontSize: 12 }} />}
                                                                                                    label={`Directo: ${m.cantidadKg}kg`}
                                                                                                    size="small"
                                                                                                    sx={{ height: 20, fontSize: '10px', bgcolor: 'rgba(56, 189, 248, 0.1)', color: colors.info }}
                                                                                                />
                                                                                            ))}
                                                                                            {linea.remitosAsociados.length === 0 && linea.recepcionesManuales.length === 0 && (
                                                                                                <Typography variant="caption" sx={{ color: colors.textMuted, fontStyle: 'italic' }}>
                                                                                                    Sin entregas
                                                                                                </Typography>
                                                                                            )}
                                                                                        </Box>
                                                                                    </TableCell>

                                                                                    {/* Botón de recepción (Vincular remito o manual) */}
                                                                                    <TableCell align="center">
                                                                                        {pend > 0 ? (
                                                                                            <Button
                                                                                                size="small"
                                                                                                variant="outlined"
                                                                                                onClick={() => setRecepcionTarget({ orden: oc, linea })}
                                                                                                sx={{
                                                                                                    fontSize: '11px',
                                                                                                    fontWeight: 800,
                                                                                                    borderColor: colors.info,
                                                                                                    color: colors.info,
                                                                                                    textTransform: 'none',
                                                                                                    height: 26,
                                                                                                    '&:hover': { bgcolor: 'rgba(56, 189, 248, 0.1)' }
                                                                                                }}
                                                                                            >
                                                                                                Registrar Entrega
                                                                                            </Button>
                                                                                        ) : (
                                                                                            <Chip label="✓ Entregado" size="small" sx={{ height: 22, fontSize: '10px', bgcolor: colors.success, color: '#000', fontWeight: 800 }} />
                                                                                        )}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            );
                                                                        })}
                                                                    </TableBody>
                                                                </Table>
                                                            </TableContainer>
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        </>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* MODAL 1: NUEVA ORDEN DE COMPRA */}
            {newOrderModalOpen && (
                <NuevaOrdenCompraModal
                    open={newOrderModalOpen}
                    onClose={() => setNewOrderModalOpen(false)}
                    partners={partners}
                    items={items}
                />
            )}

            {/* MODAL 2: RECEPCIÓN DE ORDEN (VINCULAR REMITO O DIRECTA MANUAL) */}
            {recepcionTarget && (
                <RecepcionOrdenCompraModal
                    open={Boolean(recepcionTarget)}
                    onClose={() => setRecepcionTarget(null)}
                    orden={recepcionTarget.orden}
                    linea={recepcionTarget.linea}
                />
            )}
        </Box>
    );
}
