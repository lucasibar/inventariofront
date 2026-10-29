import { useState, useMemo, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    TextField,
    MenuItem,
    IconButton,
    Chip,
    Table as MuiTable,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Collapse
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import BarChartIcon from '@mui/icons-material/BarChart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import * as XLSX from 'xlsx';
import {
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, BarChart, Bar, AreaChart, Area
} from 'recharts';

import { useGetRecentMovementsQuery, useGetCombosQuery, useUpdateComboMutation, useGetStockQuery } from '../../features/warehouse/stock/api/stock.api';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { useGetItemsQuery } from '../../features/warehouse/materiales/api/items.api';
import { useLazyGetRemitoSalidaQuery } from '../../features/warehouse/remitosSalida/api/remitos-salida.api';
import { RemitoDetailModal } from '../../features/warehouse/remitos/ui/RemitoDetailModal';
import { EditComboModal } from '../../features/warehouse/stock/ui/EditComboModal';
import { PaginationControls, useClientPagination } from '../../shared/pagination';

const colors = {
    primary: '#f59e0b', // Amber
    secondary: 'var(--text-mui-secondary, #475569)',
    bg: 'var(--bg-primary, #0f1117)',
    cardBg: 'var(--bg-hover-row, rgba(255,255,255,0.03))',
    border: 'rgba(255, 255, 255, 0.08)',
    text: 'var(--text-primary, #f3f4f6)',
    textDim: 'var(--text-muted, #9ca3af)',
    danger: '#ef4444',
    warning: '#f59e0b',
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

const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const clean = String(dateStr).slice(0, 10);
    const parts = clean.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return clean;
};

export default function ReporteConsumoDetalladoPage() {
    // ── Fechas y presets ──
    const [desde, setDesde] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [hasta, setHasta] = useState(() => new Date().toISOString().split('T')[0]);
    const [activePreset, setActivePreset] = useState<'7D' | '15D' | '30D' | 'MES' | 'CUSTOM'>('30D');

    const handlePreset = (preset: '7D' | '15D' | '30D' | 'MES') => {
        setActivePreset(preset);
        const today = new Date();
        const endStr = today.toISOString().split('T')[0];
        setHasta(endStr);

        if (preset === '7D') {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            setDesde(d.toISOString().split('T')[0]);
        } else if (preset === '15D') {
            const d = new Date();
            d.setDate(d.getDate() - 15);
            setDesde(d.toISOString().split('T')[0]);
        } else if (preset === '30D') {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            setDesde(d.toISOString().split('T')[0]);
        } else if (preset === 'MES') {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            setDesde(startOfMonth.toISOString().split('T')[0]);
        }
    };

    // ── Filtros generales ──
    const [depositoId, setDepositoId] = useState<string>('');
    const [tipoConsumo, setTipoConsumo] = useState<'ALL' | 'REMITO_SALIDA' | 'ENTREGA_PRODUCCION' | 'AJUSTE_RESTA'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewByGroup, setViewByGroup] = useState(false);
    const [showCharts, setShowCharts] = useState(false);

    // ── Consultas Backend ──
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => rawDepots.filter((d: any) => d.activo !== false), [rawDepots]);

    const { data: rawMovements = [], isFetching: isFetchingMovements } = useGetRecentMovementsQuery({
        desde,
        hasta,
        depositoId: depositoId || undefined,
        tipo: tipoConsumo === 'ALL' ? undefined : tipoConsumo
    });

    const { data: rawStock = [], isFetching: isFetchingStock } = useGetStockQuery({});
    const { data: combos = [] } = useGetCombosQuery(undefined, { skip: !viewByGroup });
    const { data: items = [] } = useGetItemsQuery({}, { skip: !viewByGroup });
    const [updateCombo] = useUpdateComboMutation();

    // ── Modales secundarios ──
    const [selectedItemMovements, setSelectedItemMovements] = useState<any | null>(null);
    const [selectedRemito, setSelectedRemito] = useState<any | null>(null);
    const [showRemitoModal, setShowRemitoModal] = useState(false);
    const [editCombo, setEditCombo] = useState<any | null>(null);
    const [triggerGetRemitoDetail] = useLazyGetRemitoSalidaQuery();

    // ── Mapa de Stock Actual Disponible ──
    const stockMap = useMemo(() => {
        const map = new Map<string, number>();
        rawStock.forEach((s: any) => {
            if (!depositoId || s.depositoId === depositoId) {
                const current = map.get(s.itemId) || 0;
                map.set(s.itemId, current + Math.max(0, Number(s.qtyPrincipal || 0)));
            }
        });
        return map;
    }, [rawStock, depositoId]);

    // ── Movimientos filtrados válidos (excluye anulados y tipos no-consumo) ──
    const validMovements = useMemo(() => {
        const allowedTypes = ['REMITO_SALIDA', 'ENTREGA_PRODUCCION', 'AJUSTE_RESTA'];
        return rawMovements.filter((m: any) => {
            if (m.status === 'ANULADO') return false;
            if (tipoConsumo !== 'ALL') {
                if (m.tipo !== tipoConsumo) return false;
            } else {
                if (!allowedTypes.includes(m.tipo)) return false;
            }
            return true;
        });
    }, [rawMovements, tipoConsumo]);

    // ── Días totales del período ──
    const totalDays = useMemo(() => {
        if (!desde || !hasta) return 30;
        const start = new Date(desde + 'T12:00:00');
        const end = new Date(hasta + 'T12:00:00');
        const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return Math.max(1, diff);
    }, [desde, hasta]);

    // ── Desglose por Material (Consumo Individual) ──
    const itemsData = useMemo(() => {
        const groups: Record<string, {
            id: string;
            codigoInterno: string;
            descripcion: string;
            unidadPrincipal: string;
            supplierName: string;
            categoryName: string;
            totalQty: number;
            totalBultos: number;
            movements: any[];
        }> = {};

        validMovements.forEach((m: any) => {
            if (!m.item) return;
            const itemId = m.item.id;
            const qty = Math.abs(Number(m.qtyPrincipal || 0));
            const bultos = Math.abs(Number(m.qtySecundaria || 0));

            if (!groups[itemId]) {
                groups[itemId] = {
                    id: itemId,
                    codigoInterno: m.item.codigoInterno || 'S/C',
                    descripcion: m.item.descripcion || m.item.codigoInterno || 'Material',
                    unidadPrincipal: m.item.unidadPrincipal || 'KG',
                    supplierName: m.item.supplier?.name || m.supplier?.name || m.batch?.supplier?.name || '—',
                    categoryName: m.item.category?.nombre || m.item.categoria || '—',
                    totalQty: 0,
                    totalBultos: 0,
                    movements: []
                };
            }
            groups[itemId].totalQty += qty;
            groups[itemId].totalBultos += bultos;
            groups[itemId].movements.push(m);
        });

        // Completar métricas de cobertura y consumo diario
        return Object.values(groups).map((g) => {
            const stockActual = stockMap.get(g.id) || 0;
            const consumoDiario = g.totalQty / totalDays;
            const diasCobertura = consumoDiario > 0 ? (stockActual / consumoDiario) : Infinity;

            return {
                ...g,
                stockActual,
                consumoDiario,
                diasCobertura
            };
        }).sort((a, b) => b.totalQty - a.totalQty);
    }, [validMovements, stockMap, totalDays]);

    // ── Desglose por Grupos / Combos ──
    const groupsData = useMemo(() => {
        if (!viewByGroup) return [];

        return combos.map((combo: any) => {
            const comboItemIds = combo.itemIds || [];
            let comboQty = 0;
            let comboBultos = 0;
            let comboStock = 0;
            const comboMovements: any[] = [];

            comboItemIds.forEach((itemId: string) => {
                comboStock += stockMap.get(itemId) || 0;
            });

            validMovements.forEach((m: any) => {
                if (m.item && comboItemIds.includes(m.item.id)) {
                    const qty = Math.abs(Number(m.qtyPrincipal || 0));
                    const bultos = Math.abs(Number(m.qtySecundaria || 0));
                    comboQty += qty;
                    comboBultos += bultos;
                    comboMovements.push(m);
                }
            });

            const consumoDiario = comboQty / totalDays;
            const diasCobertura = consumoDiario > 0 ? (comboStock / consumoDiario) : Infinity;

            return {
                id: combo.id,
                comboRef: combo,
                title: combo.title,
                supplierName: combo.supplier?.name || 'Varios / Mixto',
                itemCount: comboItemIds.length,
                totalQty: comboQty,
                totalBultos: comboBultos,
                stockActual: comboStock,
                consumoDiario,
                diasCobertura,
                movements: comboMovements
            };
        }).sort((a, b) => b.totalQty - a.totalQty);
    }, [viewByGroup, combos, validMovements, stockMap, totalDays]);

    // ── Filtrado por búsqueda en tiempo real ──
    const filteredRows: any[] = useMemo(() => {
        const query = normalizeText(searchQuery);
        const tokens = query.split(/\s+/).filter(Boolean);

        if (viewByGroup) {
            if (!tokens.length) return groupsData;
            return groupsData.filter((g: any) => {
                const searchStr = normalizeText(`${g.title} ${g.supplierName}`);
                return tokens.every(t => searchStr.includes(t));
            });
        }

        if (!tokens.length) return itemsData;
        return itemsData.filter((i: any) => {
            const searchStr = normalizeText(`${i.codigoInterno} ${i.descripcion} ${i.supplierName} ${i.categoryName}`);
            return tokens.every(t => searchStr.includes(t));
        });
    }, [viewByGroup, groupsData, itemsData, searchQuery]);

    const pagination = useClientPagination(filteredRows, 15);

    // Reset de página al cambiar filtros
    useEffect(() => {
        pagination.setPage(0);
    }, [desde, hasta, depositoId, tipoConsumo, searchQuery, viewByGroup]);

    // ── Métricas KPIs ──
    const kpis = useMemo(() => {
        let totalKilos = 0;
        let totalBultos = 0;
        let criticos = 0;
        let atencion = 0;
        let stockTotalAnalizado = 0;

        itemsData.forEach((item) => {
            totalKilos += item.totalQty;
            totalBultos += item.totalBultos;
            stockTotalAnalizado += item.stockActual;

            if (item.stockActual <= 0 || item.diasCobertura < 7) {
                criticos++;
            } else if (item.diasCobertura < 15) {
                atencion++;
            }
        });

        const ritmoDiario = totalDays > 0 ? (totalKilos / totalDays) : 0;
        const proyeccionMensual = ritmoDiario * 30;

        return {
            totalKilos,
            totalBultos,
            ritmoDiario,
            proyeccionMensual,
            criticos,
            atencion,
            stockTotalAnalizado,
            totalMovimientos: validMovements.length
        };
    }, [itemsData, totalDays, validMovements]);

    // ── Datos para Gráficos de Análisis ──
    const chartData = useMemo(() => {
        if (!showCharts) return { timeline: [], top5: [] };

        // Evolución diaria
        const dailyMap: Record<string, number> = {};
        validMovements.forEach((m: any) => {
            const f = String(m.fecha || '').slice(0, 10);
            if (f) {
                dailyMap[f] = (dailyMap[f] || 0) + Math.abs(Number(m.qtyPrincipal || 0));
            }
        });

        const start = new Date(desde + 'T12:00:00');
        const end = new Date(hasta + 'T12:00:00');
        const timeline: any[] = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const f = d.toISOString().split('T')[0];
            timeline.push({
                fecha: formatDate(f),
                kilos: Number((dailyMap[f] || 0).toFixed(1))
            });
        }

        // Top 5 más consumidos
        const top5 = itemsData.slice(0, 5).map((i) => ({
            name: i.codigoInterno,
            kilos: Number(i.totalQty.toFixed(1)),
            desc: i.descripcion
        }));

        return { timeline, top5 };
    }, [showCharts, validMovements, desde, hasta, itemsData]);

    // ── Exportación a Excel ──
    const handleExportExcel = () => {
        const rows = filteredRows.map((r: any) => {
            if (viewByGroup) {
                return {
                    'Grupo / Combo': r.title,
                    'Proveedor': r.supplierName,
                    'Materiales Incluidos': r.itemCount,
                    'Consumo Período (kg)': Number(r.totalQty.toFixed(2)),
                    'Consumo Diario (kg/d)': Number(r.consumoDiario.toFixed(2)),
                    'Stock Actual (kg)': Number(r.stockActual.toFixed(2)),
                    'Días Cobertura': r.consumoDiario > 0 ? Number(r.diasCobertura.toFixed(1)) : 'Sin consumo',
                    'Estado': r.stockActual <= 0 ? 'Sin stock' : (r.diasCobertura < 7 ? 'Crítico (<7d)' : (r.diasCobertura < 15 ? 'Atención (7-15d)' : 'Óptimo (>15d)'))
                };
            }
            return {
                'Código': r.codigoInterno,
                'Descripción': r.descripcion,
                'Proveedor': r.supplierName,
                'Categoría': r.categoryName,
                'Consumo Período (kg)': Number(r.totalQty.toFixed(2)),
                'Bultos': r.totalBultos,
                'Consumo Diario (kg/d)': Number(r.consumoDiario.toFixed(2)),
                'Stock Actual (kg)': Number(r.stockActual.toFixed(2)),
                'Días Cobertura': r.consumoDiario > 0 ? Number(r.diasCobertura.toFixed(1)) : 'Sin consumo',
                'Estado': r.stockActual <= 0 ? 'Sin stock' : (r.diasCobertura < 7 ? 'Crítico (<7d)' : (r.diasCobertura < 15 ? 'Atención (7-15d)' : 'Óptimo (>15d)'))
            };
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Consumo');
        XLSX.writeFile(wb, `Consumo_Materiales_${desde}_al_${hasta}.xlsx`);
    };

    // ── Clic en remito para ver comprobante formal ──
    const handleViewRemito = async (docId: string | null) => {
        if (!docId) {
            alert('Este movimiento no tiene remito formal asociado.');
            return;
        }
        try {
            const doc = await triggerGetRemitoDetail(docId).unwrap();
            setSelectedRemito(doc);
            setShowRemitoModal(true);
        } catch {
            alert('Error al obtener el remito.');
        }
    };

    const isLoading = isFetchingMovements || isFetchingStock;

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5, bgcolor: colors.bg, minHeight: '100vh', color: colors.text }}>
            
            {/* Header Conciso */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: colors.primary, letterSpacing: '-0.5px' }}>
                        📊 Consumo de Materiales
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textDim }}>
                        Análisis de egresos, ritmo de abastecimiento y proyección de agotamiento de stock
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button
                        size="small"
                        variant={viewByGroup ? "contained" : "outlined"}
                        onClick={() => setViewByGroup(!viewByGroup)}
                        sx={{ 
                            borderRadius: 2, 
                            fontWeight: 700, 
                            textTransform: 'none',
                            bgcolor: viewByGroup ? colors.primary : 'transparent',
                            color: viewByGroup ? '#000' : colors.text,
                            borderColor: colors.border
                        }}
                    >
                        {viewByGroup ? '📦 Ver Individuales' : '🏷️ Ver por Combos'}
                    </Button>

                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<BarChartIcon />}
                        onClick={() => setShowCharts(!showCharts)}
                        sx={{ 
                            borderRadius: 2, 
                            fontWeight: 700, 
                            textTransform: 'none',
                            color: showCharts ? colors.info : colors.textDim,
                            borderColor: showCharts ? colors.info : colors.border
                        }}
                    >
                        {showCharts ? 'Ocultar Gráficos' : 'Ver Gráficos'}
                    </Button>

                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleExportExcel}
                        sx={{ bgcolor: '#10b981', color: '#fff', fontWeight: 800, borderRadius: 2, textTransform: 'none', '&:hover': { bgcolor: '#059669' } }}
                    >
                        Exportar Excel
                    </Button>
                </Box>
            </Box>

            {/* KPIs Concisos (4 Tarjetas fijas) */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                <Paper sx={{ p: 1.8, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                        Total Consumido ({totalDays} días)
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: colors.primary }}>
                        {kpis.totalKilos.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                        <small style={{ fontSize: '0.8rem', fontWeight: 500 }}>kg</small>
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.72rem' }}>
                        {kpis.totalBultos > 0 ? `${kpis.totalBultos.toLocaleString('es-AR')} bultos en ` : ''}{kpis.totalMovimientos} operaciones
                    </Typography>
                </Paper>

                <Paper sx={{ p: 1.8, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                        Ritmo Diario de Salida
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: colors.info }}>
                        {kpis.ritmoDiario.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                        <small style={{ fontSize: '0.8rem', fontWeight: 500 }}>kg/día</small>
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.72rem' }}>
                        Proyección mensual: ~{kpis.proyeccionMensual.toLocaleString('es-AR', { maximumFractionDigits: 0 })} kg/mes
                    </Typography>
                </Paper>

                <Paper sx={{ p: 1.8, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                        Alerta de Agotamiento
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: kpis.criticos > 0 ? colors.danger : colors.success }}>
                            {kpis.criticos}
                        </Typography>
                        <Typography variant="caption" sx={{ color: kpis.criticos > 0 ? colors.danger : colors.textDim, fontWeight: 700, fontSize: '0.75rem' }}>
                            {kpis.criticos === 1 ? 'material crítico (<7d)' : 'materiales críticos (<7d)'}
                        </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: colors.warning, fontSize: '0.72rem' }}>
                        {kpis.atencion} adicionales en atención (7 a 15d)
                    </Typography>
                </Paper>

                <Paper sx={{ p: 1.8, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                        Stock Actual Disponible
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: colors.text }}>
                        {kpis.stockTotalAnalizado.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                        <small style={{ fontSize: '0.8rem', fontWeight: 500 }}>kg</small>
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.72rem' }}>
                        Presente en los depósitos analizados
                    </Typography>
                </Paper>
            </Box>

            {/* Gráficos Compactos Opcionales (Colapsables con 1 Click) */}
            <Collapse in={showCharts}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 1.5 }}>
                    <Paper sx={{ p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, height: '220px' }}>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem', display: 'block', mb: 1 }}>
                            📈 Picos de Consumo Diario (kg)
                        </Typography>
                        <ResponsiveContainer width="100%" height="82%">
                            <AreaChart data={chartData.timeline}>
                                <defs>
                                    <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={colors.info} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={colors.info} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                <XAxis dataKey="fecha" stroke="var(--text-muted, #64748b)" fontSize={10} />
                                <YAxis stroke="var(--text-muted, #64748b)" fontSize={10} />
                                <RechartsTooltip 
                                    contentStyle={{ background: '#0b0f19', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                                />
                                <Area type="monotone" dataKey="kilos" name="Kilos" stroke={colors.info} fill="url(#areaColor)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Paper>

                    <Paper sx={{ p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, height: '220px' }}>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem', display: 'block', mb: 1 }}>
                            🏆 Top 5 Materiales Más Consumidos
                        </Typography>
                        <ResponsiveContainer width="100%" height="82%">
                            <BarChart data={chartData.top5} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                                <XAxis type="number" stroke="var(--text-muted, #64748b)" fontSize={10} />
                                <YAxis dataKey="name" type="category" stroke="var(--text-muted, #64748b)" fontSize={10} width={75} />
                                <RechartsTooltip 
                                    contentStyle={{ background: '#0b0f19', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                                />
                                <Bar dataKey="kilos" name="Kilos" fill={colors.primary} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Box>
            </Collapse>

            {/* Barra de Filtros Compacta */}
            <Paper sx={{ p: 1.5, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Botones Presets Rápidos */}
                    <Box sx={{ display: 'flex', gap: 0.5, bgcolor: 'rgba(255,255,255,0.03)', p: 0.4, borderRadius: 2, border: `1px solid ${colors.border}` }}>
                        {(['7D', '15D', '30D', 'MES'] as const).map((p) => (
                            <Chip
                                key={p}
                                label={p === 'MES' ? 'Este Mes' : `${p}`}
                                size="small"
                                onClick={() => handlePreset(p)}
                                sx={{
                                    cursor: 'pointer',
                                    fontWeight: activePreset === p ? 800 : 600,
                                    fontSize: '0.7rem',
                                    bgcolor: activePreset === p ? colors.primary : 'transparent',
                                    color: activePreset === p ? '#000' : colors.textDim,
                                    '&:hover': { bgcolor: activePreset === p ? colors.primary : 'rgba(255,255,255,0.08)' }
                                }}
                            />
                        ))}
                    </Box>

                    {/* Rango de Fechas */}
                    <TextField
                        type="date"
                        size="small"
                        value={desde}
                        onChange={(e) => { setDesde(e.target.value); setActivePreset('CUSTOM'); }}
                        sx={{ width: '135px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2, fontSize: '0.8rem', height: '34px' } }}
                    />
                    <Typography variant="caption" sx={{ color: colors.textDim }}>al</Typography>
                    <TextField
                        type="date"
                        size="small"
                        value={hasta}
                        onChange={(e) => { setHasta(e.target.value); setActivePreset('CUSTOM'); }}
                        sx={{ width: '135px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2, fontSize: '0.8rem', height: '34px' } }}
                    />

                    {/* Selector de Depósito */}
                    <TextField
                        select
                        size="small"
                        value={depositoId}
                        onChange={(e) => setDepositoId(e.target.value)}
                        sx={{ width: '160px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2, fontSize: '0.8rem', height: '34px' } }}
                    >
                        <MenuItem value=""><em>Todos los depósitos</em></MenuItem>
                        {depots.map((d: any) => (
                            <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
                        ))}
                    </TextField>

                    {/* Tipo de Consumo */}
                    <TextField
                        select
                        size="small"
                        value={tipoConsumo}
                        onChange={(e) => setTipoConsumo(e.target.value as any)}
                        sx={{ width: '175px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2, fontSize: '0.8rem', height: '34px' } }}
                    >
                        <MenuItem value="ALL">Todos los egresos</MenuItem>
                        <MenuItem value="REMITO_SALIDA">Remitos a Clientes</MenuItem>
                        <MenuItem value="ENTREGA_PRODUCCION">Entregas a Fábrica</MenuItem>
                        <MenuItem value="AJUSTE_RESTA">Mermas / Ajustes</MenuItem>
                    </TextField>

                    {/* Buscador Multipalabra */}
                    <TextField
                        size="small"
                        placeholder="Buscar por código, material, proveedor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ color: colors.textDim, mr: 0.5, fontSize: '1.1rem' }} />
                        }}
                        sx={{ flex: '1 1 200px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2, fontSize: '0.8rem', height: '34px' } }}
                    />
                </Box>
            </Paper>

            {/* Tabla Concisa de Resultados */}
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                    <CircularProgress sx={{ color: colors.primary }} />
                </Box>
            ) : filteredRows.length === 0 ? (
                <Paper sx={{ p: 5, textAlign: 'center', bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 3 }}>
                    <Typography variant="body1" sx={{ color: colors.textDim }}>
                        No se registraron consumos en el período con los filtros seleccionados.
                    </Typography>
                </Paper>
            ) : (
                <Paper sx={{ bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, overflow: 'hidden' }}>
                    <TableContainer>
                        <MuiTable size="small">
                            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.25)' }}>
                                <TableRow sx={{ '& th': { color: colors.textDim, fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', py: 1.2 } }}>
                                    {viewByGroup ? (
                                        <>
                                            <TableCell>Grupo / Combo</TableCell>
                                            <TableCell>Proveedor</TableCell>
                                            <TableCell align="center">Materiales</TableCell>
                                        </>
                                    ) : (
                                        <>
                                            <TableCell>Código</TableCell>
                                            <TableCell>Descripción & Proveedor</TableCell>
                                            <TableCell>Categoría</TableCell>
                                        </>
                                    )}
                                    <TableCell align="right">Consumo Período</TableCell>
                                    <TableCell align="right">Ritmo Diario</TableCell>
                                    <TableCell align="right">Stock Actual</TableCell>
                                    <TableCell align="center">Cobertura Estimada</TableCell>
                                    <TableCell align="center">Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pagination.pageItems.map((row: any) => {
                                    const isCritical = row.stockActual <= 0 || row.diasCobertura < 7;
                                    const isWarning = !isCritical && row.diasCobertura < 15;

                                    return (
                                        <TableRow key={row.id} className="hoverable-row" sx={{ borderBottom: `1px solid ${colors.border}`, '& td': { py: 1 } }}>
                                            {viewByGroup ? (
                                                <>
                                                    <TableCell sx={{ fontWeight: 800, color: colors.primary, fontSize: '0.85rem' }}>
                                                        {row.title}
                                                    </TableCell>
                                                    <TableCell sx={{ color: colors.textDim, fontSize: '0.8rem' }}>
                                                        {row.supplierName}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip label={`${row.itemCount} ítems`} size="small" sx={{ fontSize: '0.7rem', height: '20px', bgcolor: 'rgba(255,255,255,0.05)', color: colors.text }} />
                                                    </TableCell>
                                                </>
                                            ) : (
                                                <>
                                                    <TableCell sx={{ fontWeight: 800, color: colors.primary, fontSize: '0.82rem' }}>
                                                        {row.codigoInterno}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography sx={{ fontWeight: 600, color: '#fff', fontSize: '0.82rem', lineHeight: 1.2 }}>
                                                            {row.descripcion}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.7rem' }}>
                                                            {row.supplierName}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ color: colors.textDim, fontSize: '0.75rem' }}>
                                                        {row.categoryName}
                                                    </TableCell>
                                                </>
                                            )}

                                            {/* Consumo Período */}
                                            <TableCell align="right" sx={{ fontWeight: 800, color: colors.info, fontSize: '0.85rem' }}>
                                                {row.totalQty.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
                                                {row.totalBultos > 0 && (
                                                    <Typography variant="caption" sx={{ color: colors.textDim, display: 'block', fontSize: '0.68rem' }}>
                                                        {row.totalBultos} bultos
                                                    </Typography>
                                                )}
                                            </TableCell>

                                            {/* Ritmo Diario */}
                                            <TableCell align="right" sx={{ fontWeight: 600, color: colors.text, fontSize: '0.82rem' }}>
                                                {row.consumoDiario.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg/d
                                            </TableCell>

                                            {/* Stock Actual */}
                                            <TableCell align="right" sx={{ fontWeight: 700, color: row.stockActual <= 0 ? colors.danger : colors.text, fontSize: '0.82rem' }}>
                                                {row.stockActual.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
                                            </TableCell>

                                            {/* Semáforo Cobertura */}
                                            <TableCell align="center">
                                                {row.stockActual <= 0 ? (
                                                    <Chip label="SIN STOCK" size="small" color="error" sx={{ fontWeight: 800, fontSize: '0.65rem', height: '22px' }} />
                                                ) : row.consumoDiario <= 0 ? (
                                                    <Chip label="Sin consumo" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: colors.textDim, fontSize: '0.65rem', height: '22px' }} />
                                                ) : isCritical ? (
                                                    <Tooltip title="Stock en riesgo inminente de quiebre (< 7 días)">
                                                        <Chip label={`🔴 ${Math.round(row.diasCobertura)} días`} size="small" sx={{ bgcolor: 'rgba(239, 68, 68, 0.15)', color: colors.danger, fontWeight: 800, fontSize: '0.7rem', height: '22px' }} />
                                                    </Tooltip>
                                                ) : isWarning ? (
                                                    <Tooltip title="Nivel de atención (7 a 15 días de stock)">
                                                        <Chip label={`🟡 ${Math.round(row.diasCobertura)} días`} size="small" sx={{ bgcolor: 'rgba(245, 158, 11, 0.15)', color: colors.warning, fontWeight: 800, fontSize: '0.7rem', height: '22px' }} />
                                                    </Tooltip>
                                                ) : (
                                                    <Chip label={`🟢 ${Math.round(row.diasCobertura)} días`} size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: colors.success, fontWeight: 800, fontSize: '0.7rem', height: '22px' }} />
                                                )}
                                            </TableCell>

                                            {/* Acciones */}
                                            <TableCell align="center">
                                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                                    {viewByGroup && (
                                                        <Tooltip title="Editar componentes del combo">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setEditCombo(row.comboRef)}
                                                                sx={{ color: colors.primary, '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.15)' } }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip title="Ver transacciones detalladas">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => setSelectedItemMovements(row)}
                                                            sx={{ color: colors.info, '&:hover': { bgcolor: 'rgba(56, 189, 248, 0.15)' } }}
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </MuiTable>
                    </TableContainer>

                    {/* Paginación */}
                    <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${colors.border}` }}>
                        <PaginationControls
                            count={filteredRows.length}
                            page={pagination.page}
                            pageSize={pagination.pageSize}
                            onPageChange={pagination.setPage}
                            onPageSizeChange={(value) => {
                                pagination.setPageSize(value);
                                pagination.setPage(0);
                            }}
                        />
                    </Box>
                </Paper>
            )}

            {/* Modal Flotante de Transacciones Detalladas (Mantiene la página concisa sin estiramientos) */}
            {selectedItemMovements && (
                <Dialog
                    open
                    onClose={() => setSelectedItemMovements(null)}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                        sx: { bgcolor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 3 }
                    }}
                >
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: `1px solid ${colors.border}` }}>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 900, color: colors.primary }}>
                                {viewByGroup ? selectedItemMovements.title : selectedItemMovements.codigoInterno}
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.textDim }}>
                                {viewByGroup ? `${selectedItemMovements.itemCount} materiales agrupados` : selectedItemMovements.descripcion} • Total: {selectedItemMovements.totalQty.toFixed(1)} kg en {selectedItemMovements.movements.length} movimientos
                            </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => setSelectedItemMovements(null)} sx={{ color: colors.textDim }}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent sx={{ py: 2 }}>
                        <TableContainer sx={{ maxHeight: '420px' }}>
                            <MuiTable size="small" stickyHeader>
                                <TableHead>
                                    <TableRow sx={{ '& th': { bgcolor: '#111827', color: colors.textDim, fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase' } }}>
                                        <TableCell>Fecha</TableCell>
                                        <TableCell>Tipo</TableCell>
                                        <TableCell>Cliente / Destino</TableCell>
                                        <TableCell>Lote / Partida</TableCell>
                                        <TableCell align="right">Cantidad</TableCell>
                                        <TableCell align="center">Comprobante</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {selectedItemMovements.movements.map((mov: any, idx: number) => {
                                        const docNum = mov.documento?.numero || mov.documentoNumero;
                                        const docId = mov.documentoId;
                                        const clientName = mov.documento?.partner?.name || mov.partner?.name || '—';

                                        return (
                                            <TableRow key={mov.id || idx} sx={{ borderBottom: `1px solid ${colors.border}`, '& td': { py: 1 } }}>
                                                <TableCell sx={{ color: '#fff', fontSize: '0.8rem' }}>
                                                    {formatDate(mov.fecha)}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={mov.tipo === 'REMITO_SALIDA' ? 'Remito Salida' : (mov.tipo === 'ENTREGA_PRODUCCION' ? 'A Producción' : mov.tipo)}
                                                        size="small"
                                                        sx={{ 
                                                            fontSize: '0.65rem', 
                                                            height: '20px', 
                                                            fontWeight: 700,
                                                            bgcolor: mov.tipo === 'REMITO_SALIDA' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                            color: mov.tipo === 'REMITO_SALIDA' ? colors.info : colors.primary
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ color: '#fff', fontSize: '0.8rem', fontWeight: 500 }}>
                                                    {clientName}
                                                </TableCell>
                                                <TableCell>
                                                    {mov.batch?.lotNumber ? (
                                                        <Chip label={mov.batch.lotNumber} size="small" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', height: '20px' }} />
                                                    ) : '—'}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800, color: colors.primary, fontSize: '0.82rem' }}>
                                                    {Math.abs(Number(mov.qtyPrincipal || 0)).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg
                                                </TableCell>
                                                <TableCell align="center">
                                                    {docId ? (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => handleViewRemito(docId)}
                                                            sx={{ fontSize: '0.68rem', py: 0.2, px: 1, color: colors.info, borderColor: 'rgba(56, 189, 248, 0.4)', borderRadius: 1.5 }}
                                                        >
                                                            📄 {docNum || 'Ver Remito'}
                                                        </Button>
                                                    ) : (
                                                        <Typography variant="caption" sx={{ color: colors.textDim }}>{docNum || '—'}</Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </MuiTable>
                        </TableContainer>
                    </DialogContent>

                    <DialogActions sx={{ p: 2, borderTop: `1px solid ${colors.border}` }}>
                        <Button onClick={() => setSelectedItemMovements(null)} sx={{ color: colors.textDim, fontWeight: 700 }}>
                            Cerrar
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            {/* Modal de Remito Original */}
            {showRemitoModal && selectedRemito && (
                <RemitoDetailModal
                    open={showRemitoModal}
                    onClose={() => {
                        setShowRemitoModal(false);
                        setSelectedRemito(null);
                    }}
                    remito={selectedRemito}
                />
            )}

            {/* Modal de Configurar Combo */}
            {editCombo && (
                <EditComboModal
                    combo={editCombo}
                    items={items}
                    onClose={() => setEditCombo(null)}
                    onSave={async (itemIds: string[]) => {
                        await updateCombo({ id: editCombo.id, itemIds }).unwrap();
                        setEditCombo(null);
                    }}
                />
            )}
        </Box>
    );
}
