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
    Collapse,
    Checkbox,
    FormControlLabel
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import BarChartIcon from '@mui/icons-material/BarChart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
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
    const [searchQuery, setSearchQuery] = useState('');
    const [viewByGroup, setViewByGroup] = useState(false);
    const [showCharts, setShowCharts] = useState(false);

    // ── Destildar Clientes y Destildar Materiales ──
    const [excludedClientNames, setExcludedClientNames] = useState<Record<string, boolean>>({});
    const [excludedMaterialIds, setExcludedMaterialIds] = useState<Record<string, boolean>>({});
    const [clientFilterModalOpen, setClientFilterModalOpen] = useState(false);
    const [clientSearchInModal, setClientSearchInModal] = useState('');

    // ── Consultas Backend ──
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => rawDepots.filter((d: any) => d.activo !== false), [rawDepots]);

    // Filtrar estrictamente solo REMITO_SALIDA en backend
    const { data: rawMovements = [], isFetching: isFetchingMovements } = useGetRecentMovementsQuery({
        desde,
        hasta,
        depositoId: depositoId || undefined,
        tipo: 'REMITO_SALIDA'
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

    // ── Resolver cliente de cada movimiento ──
    const getClientNameFromMovement = (m: any): string => {
        return m.documento?.partner?.name || m.partner?.name || 'Consumidor Final / Sin Asignar';
    };

    // ── Extraer todos los clientes únicos en el período cargado ──
    const allUniqueClients = useMemo(() => {
        const set = new Set<string>();
        rawMovements.forEach((m: any) => {
            if (m.tipo === 'REMITO_SALIDA' && m.status !== 'ANULADO') {
                set.add(getClientNameFromMovement(m));
            }
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [rawMovements]);

    // Cantidad de clientes filtrados/activos
    const activeClientsCount = useMemo(() => {
        return allUniqueClients.filter(c => !excludedClientNames[c]).length;
    }, [allUniqueClients, excludedClientNames]);

    // ── Movimientos filtrados válidos (solo REMITO_SALIDA, no anulados, y sin clientes excluidos) ──
    const validMovements = useMemo(() => {
        return rawMovements.filter((m: any) => {
            if (m.status === 'ANULADO') return false;
            if (m.tipo !== 'REMITO_SALIDA') return false;

            const clientName = getClientNameFromMovement(m);
            if (excludedClientNames[clientName]) return false;

            return true;
        });
    }, [rawMovements, excludedClientNames]);

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
            clientsMap: Record<string, number>;
        }> = {};

        validMovements.forEach((m: any) => {
            if (!m.item) return;
            const itemId = m.item.id;
            const qty = Math.abs(Number(m.qtyPrincipal || 0));
            const bultos = Math.abs(Number(m.qtySecundaria || 0));
            const client = getClientNameFromMovement(m);

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
                    movements: [],
                    clientsMap: {}
                };
            }
            groups[itemId].totalQty += qty;
            groups[itemId].totalBultos += bultos;
            groups[itemId].movements.push(m);
            groups[itemId].clientsMap[client] = (groups[itemId].clientsMap[client] || 0) + qty;
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
            const clientsMap: Record<string, number> = {};

            comboItemIds.forEach((itemId: string) => {
                comboStock += stockMap.get(itemId) || 0;
            });

            validMovements.forEach((m: any) => {
                if (m.item && comboItemIds.includes(m.item.id)) {
                    // Si el material individual está destildado, no sumarlo
                    if (excludedMaterialIds[m.item.id]) return;

                    const qty = Math.abs(Number(m.qtyPrincipal || 0));
                    const bultos = Math.abs(Number(m.qtySecundaria || 0));
                    const client = getClientNameFromMovement(m);

                    comboQty += qty;
                    comboBultos += bultos;
                    comboMovements.push(m);
                    clientsMap[client] = (clientsMap[client] || 0) + qty;
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
                movements: comboMovements,
                clientsMap
            };
        }).sort((a, b) => b.totalQty - a.totalQty);
    }, [viewByGroup, combos, validMovements, stockMap, totalDays, excludedMaterialIds]);

    // ── Filtrado por búsqueda en tiempo real y exclusión de materiales ──
    const filteredRows: any[] = useMemo(() => {
        const query = normalizeText(searchQuery);
        const tokens = query.split(/\s+/).filter(Boolean);

        if (viewByGroup) {
            let list = groupsData;
            if (tokens.length) {
                list = list.filter((g: any) => {
                    const clientsList = Object.keys(g.clientsMap).join(' ');
                    const searchStr = normalizeText(`${g.title} ${g.supplierName} ${clientsList}`);
                    return tokens.every(t => searchStr.includes(t));
                });
            }
            return list;
        }

        let list = itemsData;
        if (tokens.length) {
            list = list.filter((i: any) => {
                const clientsList = Object.keys(i.clientsMap).join(' ');
                const searchStr = normalizeText(`${i.codigoInterno} ${i.descripcion} ${i.supplierName} ${i.categoryName} ${clientsList}`);
                return tokens.every(t => searchStr.includes(t));
            });
        }
        return list;
    }, [viewByGroup, groupsData, itemsData, searchQuery]);

    const pagination = useClientPagination(filteredRows, 15);

    // Reset de página al cambiar filtros
    useEffect(() => {
        pagination.setPage(0);
    }, [desde, hasta, depositoId, searchQuery, viewByGroup, excludedClientNames, excludedMaterialIds]);

    // ── Métricas KPIs (Solo toma en cuenta materiales que NO estén destildados) ──
    const kpis = useMemo(() => {
        let totalKilos = 0;
        let totalBultos = 0;
        let criticos = 0;
        let atencion = 0;
        let stockTotalAnalizado = 0;
        let activeMaterialsCount = 0;

        itemsData.forEach((item) => {
            if (excludedMaterialIds[item.id]) return; // Destildado por el usuario
            activeMaterialsCount++;
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
            activeMaterialsCount,
            totalMovimientos: validMovements.filter(m => !excludedMaterialIds[m.itemId || m.item?.id]).length
        };
    }, [itemsData, totalDays, validMovements, excludedMaterialIds]);

    // ── Datos para Gráficos de Análisis ──
    const chartData = useMemo(() => {
        if (!showCharts) return { timeline: [], top5: [] };

        // Evolución diaria
        const dailyMap: Record<string, number> = {};
        validMovements.forEach((m: any) => {
            if (excludedMaterialIds[m.itemId || m.item?.id]) return;
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
        const top5 = itemsData
            .filter(i => !excludedMaterialIds[i.id])
            .slice(0, 5)
            .map((i) => ({
                name: i.codigoInterno,
                kilos: Number(i.totalQty.toFixed(1)),
                desc: i.descripcion
            }));

        return { timeline, top5 };
    }, [showCharts, validMovements, desde, hasta, itemsData, excludedMaterialIds]);

    // ── Exportación a Excel ──
    const handleExportExcel = () => {
        const rows = filteredRows
            .filter((r: any) => !excludedMaterialIds[r.id])
            .map((r: any) => {
                if (viewByGroup) {
                    return {
                        'Grupo / Combo': r.title,
                        'Proveedor': r.supplierName,
                        'Materiales Incluidos': r.itemCount,
                        'Consumo Período (kg)': Number(r.totalQty.toFixed(2)),
                        'Consumo Diario (kg/d)': Number(r.consumoDiario.toFixed(2)),
                        'Stock Actual (kg)': Number(r.stockActual.toFixed(2)),
                        'Días Cobertura': r.consumoDiario > 0 ? Number(r.diasCobertura.toFixed(1)) : 'Sin consumo',
                        'Clientes': Object.keys(r.clientsMap).join(', ')
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
                    'Clientes': Object.keys(r.clientsMap).join(', ')
                };
            });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Consumo_Remitos_Salida');
        XLSX.writeFile(wb, `Consumo_RemitosSalida_${desde}_al_${hasta}.xlsx`);
    };

    // ── Manejo de tildar / destildar materiales ──
    const toggleMaterialExcluded = (id: string) => {
        setExcludedMaterialIds(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const selectAllMaterials = () => {
        setExcludedMaterialIds({});
    };

    const deselectAllMaterials = () => {
        const next: Record<string, boolean> = {};
        itemsData.forEach(i => { next[i.id] = true; });
        setExcludedMaterialIds(next);
    };

    // ── Manejo de tildar / destildar clientes ──
    const toggleClientExcluded = (clientName: string) => {
        setExcludedClientNames(prev => ({
            ...prev,
            [clientName]: !prev[clientName]
        }));
    };

    const selectAllClients = () => {
        setExcludedClientNames({});
    };

    const deselectAllClients = () => {
        const next: Record<string, boolean> = {};
        allUniqueClients.forEach(c => { next[c] = true; });
        setExcludedClientNames(next);
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

    // Clientes filtrados para el modal de clientes
    const filteredClientsInModal = useMemo(() => {
        const q = normalizeText(clientSearchInModal);
        if (!q) return allUniqueClients;
        return allUniqueClients.filter(c => normalizeText(c).includes(q));
    }, [allUniqueClients, clientSearchInModal]);

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5, bgcolor: colors.bg, minHeight: '100vh', color: colors.text }}>
            
            {/* Header Conciso */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.primary, letterSpacing: '-0.5px' }}>
                            📊 Consumo de Materiales (Remitos de Salida)
                        </Typography>
                        <Chip label="Solo Remitos de Salida" size="small" sx={{ bgcolor: 'rgba(56, 189, 248, 0.15)', color: colors.info, fontWeight: 800, fontSize: '0.68rem' }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: colors.textDim }}>
                        Análisis de egresos a clientes, ritmo de salida y proyección de agotamiento
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
                        Total Despachado ({totalDays} días)
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: colors.primary }}>
                        {kpis.totalKilos.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                        <small style={{ fontSize: '0.8rem', fontWeight: 500 }}>kg</small>
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.72rem' }}>
                        {kpis.totalBultos > 0 ? `${kpis.totalBultos.toLocaleString('es-AR')} bultos en ` : ''}{kpis.totalMovimientos} remitos de salida
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
                        Stock Actual de Materiales Activos
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: colors.text }}>
                        {kpis.stockTotalAnalizado.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                        <small style={{ fontSize: '0.8rem', fontWeight: 500 }}>kg</small>
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.72rem' }}>
                        {kpis.activeMaterialsCount} materiales tildados
                    </Typography>
                </Paper>
            </Box>

            {/* Gráficos Compactos Opcionales (Colapsables con 1 Click) */}
            <Collapse in={showCharts}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 1.5 }}>
                    <Paper sx={{ p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, height: '220px' }}>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem', display: 'block', mb: 1 }}>
                            📈 Picos de Salidas por Remito (kg)
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
                            🏆 Top 5 Materiales Más Despachados
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

                    {/* Botón para Filtro / Destildar Clientes */}
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FilterListIcon />}
                        onClick={() => setClientFilterModalOpen(true)}
                        sx={{
                            height: '34px',
                            borderRadius: 2,
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            textTransform: 'none',
                            color: activeClientsCount < allUniqueClients.length ? colors.primary : colors.text,
                            borderColor: activeClientsCount < allUniqueClients.length ? colors.primary : colors.border,
                            bgcolor: activeClientsCount < allUniqueClients.length ? 'rgba(245, 158, 11, 0.1)' : 'transparent'
                        }}
                    >
                        Clientes ({activeClientsCount}/{allUniqueClients.length})
                    </Button>

                    {/* Buscador Multipalabra */}
                    <TextField
                        size="small"
                        placeholder="Buscar por código, material, cliente o proveedor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ color: colors.textDim, mr: 0.5, fontSize: '1.1rem' }} />
                        }}
                        sx={{ flex: '1 1 220px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2, fontSize: '0.8rem', height: '34px' } }}
                    />
                </Box>

                {/* Barra de control rápido de tildar/destildar materiales */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.5, borderTop: `1px solid ${colors.border}` }}>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.72rem' }}>
                        Podés tildar o destildar materiales en la primera columna para excluirlos del cálculo y gráficos.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button 
                            size="small" 
                            onClick={selectAllMaterials} 
                            sx={{ color: colors.info, fontSize: '0.72rem', textTransform: 'none', p: 0, fontWeight: 700 }}
                        >
                            ✓ Tildar Todos
                        </Button>
                        <Button 
                            size="small" 
                            onClick={deselectAllMaterials} 
                            sx={{ color: colors.textDim, fontSize: '0.72rem', textTransform: 'none', p: 0, fontWeight: 700 }}
                        >
                            ✗ Destildar Todos
                        </Button>
                    </Box>
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
                        No se encontraron remitos de salida en el período con los filtros seleccionados.
                    </Typography>
                </Paper>
            ) : (
                <Paper sx={{ bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, overflow: 'hidden' }}>
                    <TableContainer>
                        <MuiTable size="small">
                            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.25)' }}>
                                <TableRow sx={{ '& th': { color: colors.textDim, fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', py: 1.2 } }}>
                                    <TableCell sx={{ width: '40px', textAlign: 'center' }}>Incluir</TableCell>
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
                                    <TableCell align="right">Despachado Período</TableCell>
                                    <TableCell align="right">Ritmo Diario</TableCell>
                                    <TableCell align="right">Stock Actual</TableCell>
                                    <TableCell align="center">Cobertura Estimada</TableCell>
                                    <TableCell align="center">Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pagination.pageItems.map((row: any) => {
                                    const isExcluded = !!excludedMaterialIds[row.id];
                                    const isCritical = row.stockActual <= 0 || row.diasCobertura < 7;
                                    const isWarning = !isCritical && row.diasCobertura < 15;

                                    return (
                                        <TableRow 
                                            key={row.id} 
                                            className="hoverable-row" 
                                            sx={{ 
                                                borderBottom: `1px solid ${colors.border}`, 
                                                opacity: isExcluded ? 0.45 : 1,
                                                '& td': { py: 0.9 } 
                                            }}
                                        >
                                            {/* Checkbox para tildar/destildar este material */}
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                <Checkbox
                                                    size="small"
                                                    checked={!isExcluded}
                                                    onChange={() => toggleMaterialExcluded(row.id)}
                                                    sx={{ 
                                                        color: colors.textDim,
                                                        p: 0.2,
                                                        '&.Mui-checked': { color: colors.info }
                                                    }}
                                                />
                                            </TableCell>

                                            {viewByGroup ? (
                                                <>
                                                    <TableCell sx={{ fontWeight: 800, color: isExcluded ? colors.textDim : colors.primary, fontSize: '0.85rem', textDecoration: isExcluded ? 'line-through' : 'none' }}>
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
                                                    <TableCell sx={{ fontWeight: 800, color: isExcluded ? colors.textDim : colors.primary, fontSize: '0.82rem', textDecoration: isExcluded ? 'line-through' : 'none' }}>
                                                        {row.codigoInterno}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography sx={{ fontWeight: 600, color: isExcluded ? colors.textDim : '#fff', fontSize: '0.82rem', lineHeight: 1.2 }}>
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
                                            <TableCell align="right" sx={{ fontWeight: 800, color: isExcluded ? colors.textDim : colors.info, fontSize: '0.85rem' }}>
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
                                                    <Chip label="Sin salidas" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: colors.textDim, fontSize: '0.65rem', height: '22px' }} />
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
                                                    <Tooltip title="Ver detalle de remitos por cliente">
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

            {/* Modal para Tildar / Destildar Clientes */}
            <Dialog
                open={clientFilterModalOpen}
                onClose={() => setClientFilterModalOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { bgcolor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 3 }
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: `1px solid ${colors.border}` }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: colors.primary }}>
                            Filtrar Clientes
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textDim }}>
                            {activeClientsCount} de {allUniqueClients.length} clientes incluidos en el reporte
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setClientFilterModalOpen(false)} sx={{ color: colors.textDim }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                        <TextField
                            size="small"
                            placeholder="Buscar cliente..."
                            value={clientSearchInModal}
                            onChange={(e) => setClientSearchInModal(e.target.value)}
                            sx={{ flex: 1, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: '#fff', borderRadius: 2, fontSize: '0.85rem' } }}
                        />
                        <Button size="small" onClick={selectAllClients} sx={{ color: colors.info, fontWeight: 700, textTransform: 'none' }}>
                            Tildar Todos
                        </Button>
                        <Button size="small" onClick={deselectAllClients} sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'none' }}>
                            Destildar Todos
                        </Button>
                    </Box>

                    <Box sx={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5, pr: 1 }}>
                        {filteredClientsInModal.length === 0 ? (
                            <Typography variant="body2" sx={{ color: colors.textDim, p: 2, textAlign: 'center' }}>
                                No se encontraron clientes con esa búsqueda
                            </Typography>
                        ) : (
                            filteredClientsInModal.map((clientName) => {
                                const isChecked = !excludedClientNames[clientName];
                                return (
                                    <Paper
                                        key={clientName}
                                        onClick={() => toggleClientExcluded(clientName)}
                                        sx={{
                                            p: 1,
                                            px: 1.5,
                                            bgcolor: isChecked ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.3)',
                                            border: `1px solid ${isChecked ? 'rgba(56, 189, 248, 0.2)' : colors.border}`,
                                            borderRadius: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={isChecked}
                                                    onChange={() => toggleClientExcluded(clientName)}
                                                    sx={{ color: colors.textDim, '&.Mui-checked': { color: colors.info } }}
                                                />
                                            }
                                            label={
                                                <Typography variant="body2" sx={{ fontWeight: isChecked ? 700 : 400, color: isChecked ? '#fff' : colors.textDim }}>
                                                    {clientName}
                                                </Typography>
                                            }
                                            sx={{ m: 0, pointerEvents: 'none' }}
                                        />
                                    </Paper>
                                );
                            })
                        )}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2, borderTop: `1px solid ${colors.border}` }}>
                    <Button onClick={() => setClientFilterModalOpen(false)} variant="contained" sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, borderRadius: 2 }}>
                        Listo
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Flotante de Transacciones Detalladas con Clientes */}
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
                                {viewByGroup ? `${selectedItemMovements.itemCount} materiales agrupados` : selectedItemMovements.descripcion} • Total: {selectedItemMovements.totalQty.toFixed(1)} kg en {selectedItemMovements.movements.length} remitos
                            </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => setSelectedItemMovements(null)} sx={{ color: colors.textDim }}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent sx={{ py: 2 }}>
                        {/* Resumen por Cliente */}
                        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, border: `1px solid ${colors.border}` }}>
                            <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.68rem', display: 'block', mb: 0.8 }}>
                                👥 Desglose por Cliente:
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {Object.entries(selectedItemMovements.clientsMap as Record<string, number>).map(([cName, cQty]) => (
                                    <Chip
                                        key={cName}
                                        label={`${cName}: ${cQty.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`}
                                        size="small"
                                        sx={{ bgcolor: 'rgba(56, 189, 248, 0.12)', color: colors.info, fontWeight: 700, fontSize: '0.72rem' }}
                                    />
                                ))}
                            </Box>
                        </Box>

                        <TableContainer sx={{ maxHeight: '380px' }}>
                            <MuiTable size="small" stickyHeader>
                                <TableHead>
                                    <TableRow sx={{ '& th': { bgcolor: '#111827', color: colors.textDim, fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase' } }}>
                                        <TableCell>Fecha</TableCell>
                                        <TableCell>Cliente</TableCell>
                                        <TableCell>Lote / Partida</TableCell>
                                        <TableCell align="right">Cantidad</TableCell>
                                        <TableCell align="center">Comprobante</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {selectedItemMovements.movements.map((mov: any, idx: number) => {
                                        const docNum = mov.documento?.numero || mov.documentoNumero;
                                        const docId = mov.documentoId;
                                        const clientName = getClientNameFromMovement(mov);

                                        return (
                                            <TableRow key={mov.id || idx} sx={{ borderBottom: `1px solid ${colors.border}`, '& td': { py: 1 } }}>
                                                <TableCell sx={{ color: '#fff', fontSize: '0.8rem' }}>
                                                    {formatDate(mov.fecha)}
                                                </TableCell>
                                                <TableCell sx={{ color: colors.info, fontSize: '0.82rem', fontWeight: 700 }}>
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
