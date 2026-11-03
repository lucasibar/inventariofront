import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    Chip,
    Button,
    TextField,
    InputAdornment,
    IconButton,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableContainer,
    Paper,
    LinearProgress,
    Collapse
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import { useOrdenesCompra } from '../../features/purchasing/ordenesCompra/ordenesCompraStorage';
import type { OrdenCompra, OrdenCompraLinea } from '../../features/purchasing/ordenesCompra/types';
import NuevaOrdenCompraModal from '../../features/purchasing/ordenesCompra/NuevaOrdenCompraModal';
import RecepcionOrdenCompraModal from '../../features/purchasing/ordenesCompra/RecepcionOrdenCompraModal';
import ImportarExcelModal from '../../features/purchasing/ordenesCompra/ImportarExcelModal';

import { useGetPartnersQuery } from '../../features/config/partners/api/partners.api';
import { useGetItemsQuery } from '../../features/warehouse/materiales/api/items.api';

export default function OrdenesCompraPage() {
    const navigate = useNavigate();
    const { ordenes, remove } = useOrdenesCompra();

    // Consultas de datos maestros para creación
    const { data: partners = [] } = useGetPartnersQuery({});
    const { data: items = [] } = useGetItemsQuery({});

    // Estados de navegación y filtros
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'EN_CAMINO' | 'PARCIAL' | 'COMPLETADA'>('ALL');
    const [search, setSearch] = useState<string>('');
    const [expandedOcId, setExpandedOcId] = useState<string | null>(null);

    // Modales
    const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
    const [importExcelModalOpen, setImportExcelModalOpen] = useState(false);
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
            {/* 1. CABECERA & ACCIONES PRINCIPALES */}
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
                        Emisión tipo remito • Estimados de arribo • Recepción con remitos o directa • Historial y auditoría
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    {/* Botón 1: Subir Excel de Pedidos */}
                    <Button
                        variant="outlined"
                        onClick={() => setImportExcelModalOpen(true)}
                        startIcon={<UploadFileIcon />}
                        sx={{
                            borderColor: 'rgba(56, 189, 248, 0.4)',
                            color: colors.info,
                            fontWeight: 700,
                            textTransform: 'none',
                            fontSize: '13px',
                            px: 1.8,
                            '&:hover': {
                                borderColor: colors.info,
                                bgcolor: 'rgba(56, 189, 248, 0.1)'
                            }
                        }}
                    >
                        📁 Subir Excel de Pedidos
                    </Button>

                    {/* Botón 2: Ver Gráfico Diente de Sierra */}
                    <Button
                        variant="outlined"
                        onClick={() => navigate('/compras/diente-de-sierra')}
                        startIcon={<TrendingUpIcon />}
                        sx={{
                            borderColor: 'rgba(245, 158, 11, 0.4)',
                            color: colors.primary,
                            fontWeight: 700,
                            textTransform: 'none',
                            fontSize: '13px',
                            px: 1.8,
                            '&:hover': {
                                borderColor: colors.primary,
                                bgcolor: 'rgba(245, 158, 11, 0.1)'
                            }
                        }}
                    >
                        📈 Gráfico Diente de Sierra
                    </Button>

                    {/* Botón 3: Nueva Orden Manual */}
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

            {/* 3. BARRA DE BÚSQUEDA Y FILTROS */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
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
                        minWidth: 280,
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
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
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

            {/* 4. LISTADO Y GESTIÓN DE ÓRDENES DE COMPRA */}
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
                                    No se encontraron órdenes de compra registradas con los filtros actuales.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOrdenes.map(oc => {
                                const isExpanded = expandedOcId === oc.id;
                                const totPed = oc.lineas.reduce((acc, l) => acc + Number(l.cantidadPedidaKg || 0), 0);
                                const totRec = oc.lineas.reduce((acc, l) => acc + Number(l.cantidadRecibidaKg || 0), 0);
                                const totPend = Math.max(0, totPed - totRec);
                                const pct = totPed > 0 ? Math.min(100, Math.round((totRec / totPed) * 100)) : 0;

                                return (
                                    <>
                                        <TableRow
                                            key={oc.id}
                                            hover
                                            sx={{
                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                                                borderBottom: isExpanded ? 'none' : `1px solid ${colors.border}`
                                            }}
                                        >
                                            <TableCell>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setExpandedOcId(isExpanded ? null : oc.id)}
                                                    sx={{ color: colors.textMuted }}
                                                >
                                                    {isExpanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                                                </IconButton>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 800, color: colors.text }}>
                                                    {oc.numero}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '11px' }}>
                                                    Emitida: {oc.fechaEmision}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: colors.textSecondary }}>
                                                    {oc.partnerNombre}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                                                    {oc.lineas.length} {oc.lineas.length === 1 ? 'material' : 'materiales'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    icon={<LocalShippingIcon sx={{ fontSize: 13 }} />}
                                                    label={oc.fechaArriboEstimada}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: 'rgba(56, 189, 248, 0.1)',
                                                        color: colors.info,
                                                        fontWeight: 700,
                                                        fontSize: '11px'
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ width: 140 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={pct}
                                                        sx={{
                                                            flex: 1,
                                                            height: 6,
                                                            borderRadius: 3,
                                                            bgcolor: 'rgba(255,255,255,0.05)',
                                                            '& .MuiLinearProgress-bar': {
                                                                bgcolor: pct === 100 ? colors.success : (pct > 0 ? colors.warning : colors.info)
                                                            }
                                                        }}
                                                    />
                                                    <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '11px', minWidth: 30 }}>
                                                        {pct}%
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                {totPed.toLocaleString()} kg
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, color: colors.success }}>
                                                {totRec.toLocaleString()} kg
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, color: totPend > 0 ? colors.info : colors.textMuted }}>
                                                {totPend > 0 ? `+${totPend.toLocaleString()} kg` : '0 kg'}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={oc.estado}
                                                    size="small"
                                                    sx={{
                                                        fontSize: '10px',
                                                        fontWeight: 800,
                                                        bgcolor: oc.estado === 'COMPLETADA'
                                                            ? 'rgba(16, 185, 129, 0.2)'
                                                            : (oc.estado === 'PARCIAL'
                                                                ? 'rgba(245, 158, 11, 0.2)'
                                                                : 'rgba(56, 189, 248, 0.2)'),
                                                        color: oc.estado === 'COMPLETADA'
                                                            ? colors.success
                                                            : (oc.estado === 'PARCIAL' ? colors.warning : colors.info)
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        if (window.confirm(`¿Eliminar orden ${oc.numero}?`)) {
                                                            remove(oc.id);
                                                        }
                                                    }}
                                                    sx={{ color: colors.textMuted, '&:hover': { color: colors.danger } }}
                                                >
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>

                                        {/* FILA EXPANDIBLE CON LÍNEAS DE ARTÍCULOS */}
                                        <TableRow key={`${oc.id}-exp`}>
                                            <TableCell colSpan={10} sx={{ p: 0, borderBottom: `1px solid ${colors.border}` }}>
                                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                    <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', pl: 7 }}>
                                                        {oc.observaciones && (
                                                            <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block', mb: 1.5 }}>
                                                                <strong>Observaciones:</strong> {oc.observaciones}
                                                            </Typography>
                                                        )}

                                                        <TableContainer component={Paper} sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 1.5 }}>
                                                            <Table size="small">
                                                                <TableHead>
                                                                    <TableRow sx={{ '& th': { color: colors.textMuted, fontSize: '10px', fontWeight: 700 } }}>
                                                                        <TableCell>Código</TableCell>
                                                                        <TableCell>Descripción</TableCell>
                                                                        <TableCell>Categoría</TableCell>
                                                                        <TableCell align="right">Pedido</TableCell>
                                                                        <TableCell align="right">Recibido</TableCell>
                                                                        <TableCell align="right">Pendiente</TableCell>
                                                                        <TableCell>Arribo Est.</TableCell>
                                                                        <TableCell align="center">Acción de Recepción</TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {oc.lineas.map(linea => {
                                                                        const lPed = Number(linea.cantidadPedidaKg || 0);
                                                                        const lRec = Number(linea.cantidadRecibidaKg || 0);
                                                                        const lPend = Math.max(0, lPed - lRec);

                                                                        return (
                                                                            <TableRow key={linea.id} sx={{ '& td': { color: colors.text, fontSize: '12px' } }}>
                                                                                <TableCell sx={{ fontWeight: 700 }}>
                                                                                    {linea.codigoInterno}
                                                                                </TableCell>
                                                                                <TableCell sx={{ color: colors.textSecondary }}>
                                                                                    {linea.descripcion}
                                                                                </TableCell>
                                                                                <TableCell sx={{ color: colors.textMuted }}>
                                                                                    {linea.categoriaNombre || 'Hilado'}
                                                                                </TableCell>
                                                                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                                                    {lPed.toLocaleString()} kg
                                                                                </TableCell>
                                                                                <TableCell align="right" sx={{ fontWeight: 800, color: colors.success }}>
                                                                                    {lRec.toLocaleString()} kg
                                                                                </TableCell>
                                                                                <TableCell align="right" sx={{ fontWeight: 800, color: lPend > 0 ? colors.info : colors.textMuted }}>
                                                                                    {lPend > 0 ? `+${lPend.toLocaleString()} kg` : '0 kg'}
                                                                                </TableCell>
                                                                                <TableCell sx={{ color: colors.info, fontSize: '11px' }}>
                                                                                    {linea.fechaArriboEstimada}
                                                                                </TableCell>
                                                                                <TableCell align="center">
                                                                                    {lPend > 0 ? (
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

            {/* MODAL 1: SUBIR PLANILLA EXCEL (DESDE CUALQUIER COMPUTADORA) */}
            {importExcelModalOpen && (
                <ImportarExcelModal
                    open={importExcelModalOpen}
                    onClose={() => setImportExcelModalOpen(false)}
                />
            )}

            {/* MODAL 2: NUEVA ORDEN DE COMPRA MANUAL */}
            {newOrderModalOpen && (
                <NuevaOrdenCompraModal
                    open={newOrderModalOpen}
                    onClose={() => setNewOrderModalOpen(false)}
                    partners={partners}
                    items={items}
                />
            )}

            {/* MODAL 3: RECEPCIÓN DE ORDEN (VINCULAR REMITO O DIRECTA MANUAL) */}
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
