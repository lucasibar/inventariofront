import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    Chip,
    Button,
    ButtonGroup,
    Slider,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableContainer,
    Divider,
    Collapse
} from '@mui/material';
import {
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ReferenceLine,
    Area,
    Line,
    ComposedChart
} from 'recharts';

import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TuneIcon from '@mui/icons-material/Tune';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LayersIcon from '@mui/icons-material/Layers';
import SpeedIcon from '@mui/icons-material/Speed';

import { useGetItemCategoriesQuery, useGetItemsQuery } from '../../features/warehouse/materiales/api/items.api';
import { useGetStockQuery, useGetRecentMovementsQuery } from '../../features/warehouse/stock/api/stock.api';
import { useOrdenesCompra, getArribosProgramadosPorCategoria } from '../../features/purchasing/ordenesCompra/ordenesCompraStorage';

export default function DienteSierraCategoriaPage() {
    const navigate = useNavigate();

    // 1. Consultas Maestras
    const { data: categories = [] } = useGetItemCategoriesQuery(undefined);
    const { data: items = [] } = useGetItemsQuery({});
    const { data: allStock = [] } = useGetStockQuery({});
    const { ordenes } = useOrdenesCompra();

    // 2. Historial de Consumos (90 días)
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

    // Mapeo de Stock Físico por ItemId
    const stockTotalsByItem = useMemo(() => {
        const map = new Map<string, number>();
        allStock.forEach((sb: any) => {
            const current = map.get(sb.itemId) || 0;
            map.set(sb.itemId, current + Number(sb.qtyPrincipal || 0));
        });
        return map;
    }, [allStock]);

    // Mapeo de Consumo por ItemId y Código
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

    // 3. Estados de Selección y Simulación ("What-if")
    const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('');
    const [horizonDays, setHorizonDays] = useState<number>(90);
    const [simulatorOpen, setSimulatorOpen] = useState<boolean>(false);
    const [demandaVariacionPercent, setDemandaVariacionPercent] = useState<number>(0); // -50% a +50%
    const [retrasoProveedorDias, setRetrasoProveedorDias] = useState<number>(0); // 0 a 30 días

    // 4. Consolidación de Categorías y Familias de Materiales
    const consolidatedCategories = useMemo(() => {
        const catMap = new Map<string, {
            id: string;
            key: string;
            nombre: string;
            items: any[];
            stockFisico: number;
            consumo90d: number;
            consumoDiarioBase: number;
            stockMinimo: number;
            stockMaximo: number | null;
            arribos: any[];
            totalPorVenir: number;
        }>();

        // A. Agregar categorías formales del catálogo
        categories.forEach((cat: any) => {
            const key = cat.id;
            catMap.set(key, {
                id: cat.id,
                key,
                nombre: cat.nombre,
                items: [],
                stockFisico: 0,
                consumo90d: 0,
                consumoDiarioBase: 0,
                stockMinimo: Number(cat.minimo || 0),
                stockMaximo: cat.maximo ? Number(cat.maximo) : null,
                arribos: [],
                totalPorVenir: 0
            });
        });

        // B. Asignar ítems a sus categorías
        items.forEach((item: any) => {
            const catId = item.categoryId || item.category?.id;
            const catNombre = item.category?.nombre || item.categoria || 'Sin Categoría';
            const key = catId || catNombre.toUpperCase().trim();

            if (!catMap.has(key)) {
                catMap.set(key, {
                    id: catId || key,
                    key,
                    nombre: catNombre,
                    items: [],
                    stockFisico: 0,
                    consumo90d: 0,
                    consumoDiarioBase: 0,
                    stockMinimo: 0,
                    stockMaximo: null,
                    arribos: [],
                    totalPorVenir: 0
                });
            }

            const catObj = catMap.get(key)!;
            catObj.items.push(item);

            const s = Number(stockTotalsByItem.get(item.id) || 0);
            catObj.stockFisico += s;

            const normCode = item.codigoInterno ? String(item.codigoInterno).trim().toUpperCase() : null;
            const c = (consumptionByItem.get(item.id) || (normCode ? consumptionByItem.get(normCode) : 0) || 0);
            catObj.consumo90d += c;

            if (!catObj.stockMinimo && item.stockMinimo) {
                catObj.stockMinimo += Number(item.stockMinimo);
            }
            if (!catObj.stockMaximo && item.stockMaximo) {
                catObj.stockMaximo = (catObj.stockMaximo || 0) + Number(item.stockMaximo);
            }
        });

        // C. Vincular Órdenes de Compra y Arribos por Categoría
        const list: any[] = [];
        catMap.forEach(cat => {
            const daily = cat.consumo90d / 90;
            cat.consumoDiarioBase = daily > 0 ? Math.round(daily * 10) / 10 : Math.max(10, Math.round(cat.stockFisico / 60));

            if (cat.stockMinimo === 0) {
                cat.stockMinimo = Math.round(cat.consumoDiarioBase * 15);
            }

            const itemIds = cat.items.map(i => i.id);
            const itemCodes = cat.items.map(i => i.codigoInterno).filter(Boolean);

            const arribosCat = getArribosProgramadosPorCategoria(cat.nombre, itemIds, itemCodes);
            cat.arribos = arribosCat;
            cat.totalPorVenir = arribosCat.reduce((acc, a) => acc + a.cantidadKg, 0);

            list.push(cat);
        });

        return list.sort((a, b) => {
            const activityA = a.stockFisico + a.totalPorVenir + a.consumo90d;
            const activityB = b.stockFisico + b.totalPorVenir + b.consumo90d;
            return activityB - activityA;
        });
    }, [categories, items, stockTotalsByItem, consumptionByItem, ordenes]);

    // Seleccionar automáticamente la primera categoría activa
    useEffect(() => {
        if (!selectedCategoryKey && consolidatedCategories.length > 0) {
            setSelectedCategoryKey(consolidatedCategories[0].key);
        }
    }, [selectedCategoryKey, consolidatedCategories]);

    // Categoría Activa Seleccionada
    const activeCategory = useMemo(() => {
        return consolidatedCategories.find(c => c.key === selectedCategoryKey) || consolidatedCategories[0] || null;
    }, [consolidatedCategories, selectedCategoryKey]);

    // 5. CÁLCULO DE LA CURVA DIENTE DE SIERRA (DÍA POR DÍA CON SIMULACIÓN WHAT-IF)
    const sawtoothData = useMemo(() => {
        if (!activeCategory) {
            return { points: [], fechaQuiebre: null, fechaMinimo: null, quiebreAntesDeArribo: false, diasEnQuiebre: 0, coberturaDias: 0, consumoAjustado: 0 };
        }

        const points: any[] = [];
        let currentStock = activeCategory.stockFisico;
        const consumoAjustado = Math.max(1, activeCategory.consumoDiarioBase * (1 + demandaVariacionPercent / 100));
        const stockMinimo = activeCategory.stockMinimo;
        const stockMaximo = activeCategory.stockMaximo;

        // Mapeo de Arribos aplicando el retraso del proveedor simulado
        const arribosMap = new Map<string, { qty: number; ordenes: string[]; provs: string[] }>();
        activeCategory.arribos.forEach(a => {
            let fechaEfectiva = a.fecha;
            if (retrasoProveedorDias !== 0) {
                try {
                    const d = new Date(a.fecha);
                    d.setDate(d.getDate() + retrasoProveedorDias);
                    fechaEfectiva = d.toISOString().split('T')[0];
                } catch (_) {}
            }

            const cur = arribosMap.get(fechaEfectiva) || { qty: 0, ordenes: [], provs: [] };
            cur.qty += a.cantidadKg;
            cur.ordenes.push(`${a.ordenNumero} (${a.cantidadKg.toLocaleString()} kg)`);
            if (!cur.provs.includes(a.partnerNombre)) cur.provs.push(a.partnerNombre);
            arribosMap.set(fechaEfectiva, cur);
        });

        let fechaQuiebre: string | null = null;
        let fechaMinimo: string | null = null;
        let primerArriboDespuesQuiebre: string | null = null;
        let quiebreAntesDeArribo = false;
        let diasEnQuiebre = 0;

        const today = new Date();

        for (let i = 0; i <= horizonDays; i++) {
            const dateObj = new Date(today);
            dateObj.setDate(today.getDate() + i);
            const dateStr = dateObj.toISOString().split('T')[0];
            const displayDate = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;

            const arriboHoy = arribosMap.get(dateStr);
            const llegadaKg = arriboHoy ? arriboHoy.qty : 0;
            const detalleArribo = arriboHoy ? `${arriboHoy.provs.join(', ')} • ${arriboHoy.ordenes.join(', ')}` : null;

            if (llegadaKg > 0) {
                currentStock += llegadaKg;
            }

            if (i > 0) {
                currentStock = Math.round(currentStock - consumoAjustado);
            }

            if (currentStock <= 0) {
                diasEnQuiebre++;
                if (!fechaQuiebre) {
                    fechaQuiebre = `${displayDate} (${dateStr})`;
                }
            }

            if (currentStock < stockMinimo && !fechaMinimo) {
                fechaMinimo = `${displayDate} (${dateStr})`;
            }

            if (fechaQuiebre && llegadaKg > 0 && !primerArriboDespuesQuiebre) {
                primerArriboDespuesQuiebre = displayDate;
                quiebreAntesDeArribo = true;
            }

            points.push({
                dia: i,
                fecha: displayDate,
                fullDate: dateStr,
                stock: Math.max(-1000, currentStock),
                stockRealSinTope: currentStock,
                minimo: stockMinimo,
                maximo: stockMaximo || undefined,
                quiebre: 0,
                llegadaKg,
                detalleArribo,
                isDanger: currentStock <= 0,
                isWarning: currentStock > 0 && currentStock < stockMinimo
            });
        }

        const coberturaDias = consumoAjustado > 0 ? Math.round(activeCategory.stockFisico / consumoAjustado) : 999;

        return {
            points,
            fechaQuiebre,
            fechaMinimo,
            quiebreAntesDeArribo,
            primerArriboDespuesQuiebre,
            diasEnQuiebre,
            coberturaDias,
            consumoAjustado
        };
    }, [activeCategory, horizonDays, demandaVariacionPercent, retrasoProveedorDias]);

    const colors = {
        bg: '#0f172a',
        surface: '#1e293b',
        border: 'rgba(255, 255, 255, 0.08)',
        primary: '#f59e0b',
        info: '#38bdf8',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        text: '#f8fafc',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: colors.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* 1. HEADER */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                pb: 2,
                borderBottom: `1px solid ${colors.border}`
            }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Button
                            variant="text"
                            size="small"
                            startIcon={<ArrowBackIcon fontSize="small" />}
                            onClick={() => navigate('/compras/ordenes-compra')}
                            sx={{ color: colors.textSecondary, textTransform: 'none', px: 1 }}
                        >
                            Órdenes de Compra
                        </Button>
                        <Divider orientation="vertical" flexItem sx={{ borderColor: colors.border, height: 16, my: 'auto' }} />
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.text, fontSize: { xs: '18px', sm: '22px' } }}>
                            📈 Proyección Diente de Sierra por Categoría
                        </Typography>
                        <Chip
                            label="Consolidado Compras"
                            size="small"
                            sx={{ bgcolor: 'rgba(56, 189, 248, 0.15)', color: colors.info, fontWeight: 800, fontSize: '11px' }}
                        />
                    </Box>
                    <Typography variant="caption" sx={{ color: colors.textSecondary, mt: 0.5, display: 'block' }}>
                        Simulación continua de consumo fabril vs reposiciones por Órdenes de Compra para prevenir quiebres de línea.
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate('/compras/materiales-criticos-dashboard')}
                        startIcon={<ShoppingCartIcon fontSize="small" />}
                        sx={{
                            borderColor: 'rgba(245, 158, 11, 0.4)',
                            color: colors.primary,
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '12px',
                            '&:hover': { borderColor: colors.primary, bgcolor: 'rgba(245, 158, 11, 0.1)' }
                        }}
                    >
                        ⚡ Tablero de Compras
                    </Button>

                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => setSimulatorOpen(!simulatorOpen)}
                        startIcon={<TuneIcon fontSize="small" />}
                        sx={{
                            bgcolor: simulatorOpen ? colors.primary : 'rgba(255,255,255,0.06)',
                            color: simulatorOpen ? '#000' : colors.text,
                            textTransform: 'none',
                            fontWeight: 800,
                            fontSize: '12px',
                            '&:hover': { bgcolor: simulatorOpen ? '#d97706' : 'rgba(255,255,255,0.12)' }
                        }}
                    >
                        {simulatorOpen ? 'Ocultar Simulador' : '🎛️ Simulador What-If'}
                    </Button>
                </Box>
            </Box>

            {/* 2. PANEL SIMULADOR "WHAT-IF" */}
            <Collapse in={simulatorOpen}>
                <Card sx={{ bgcolor: 'rgba(30, 41, 59, 0.7)', border: `1px solid rgba(245, 158, 11, 0.3)`, borderRadius: 2, p: 2.5, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.primary, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SpeedIcon fontSize="small" />
                            Simulador de Estrés y Contingencias de Compras (What-If)
                        </Typography>
                        {(demandaVariacionPercent !== 0 || retrasoProveedorDias !== 0) && (
                            <Button
                                size="small"
                                onClick={() => { setDemandaVariacionPercent(0); setRetrasoProveedorDias(0); }}
                                sx={{ color: colors.textMuted, fontSize: '11px', textTransform: 'none' }}
                            >
                                Reestablecer a Valores Reales
                            </Button>
                        )}
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700 }}>
                                    Variación de Consumo / Demanda de Tejeduría:
                                </Typography>
                                <Chip
                                    label={`${demandaVariacionPercent > 0 ? '+' : ''}${demandaVariacionPercent}%`}
                                    size="small"
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: '11px',
                                        bgcolor: demandaVariacionPercent > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                        color: demandaVariacionPercent > 0 ? colors.danger : colors.success
                                    }}
                                />
                            </Box>
                            <Slider
                                value={demandaVariacionPercent}
                                min={-50}
                                max={50}
                                step={5}
                                onChange={(_, v) => setDemandaVariacionPercent(v as number)}
                                sx={{ color: colors.primary }}
                            />
                            <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                                Consumo diario simulado: <strong>{sawtoothData.consumoAjustado} kg/día</strong> (Base: {activeCategory?.consumoDiarioBase} kg/día).
                            </Typography>
                        </Box>

                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700 }}>
                                    Retraso de Arribo de Embarques / Aduana:
                                </Typography>
                                <Chip
                                    label={`${retrasoProveedorDias} días de demora`}
                                    size="small"
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: '11px',
                                        bgcolor: retrasoProveedorDias > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.05)',
                                        color: retrasoProveedorDias > 0 ? colors.warning : colors.textMuted
                                    }}
                                />
                            </Box>
                            <Slider
                                value={retrasoProveedorDias}
                                min={0}
                                max={30}
                                step={3}
                                onChange={(_, v) => setRetrasoProveedorDias(v as number)}
                                sx={{ color: colors.warning }}
                            />
                            <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                                Desplaza todas las fechas de arribo de OCs pendientes para evaluar riesgo de bache de producción.
                            </Typography>
                        </Box>
                    </Box>
                </Card>
            </Collapse>

            {/* 3. SELECTOR DE CATEGORÍA & HORIZONTE DE TIEMPO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto', py: 0.5, maxWidth: '100%' }}>
                    {consolidatedCategories.map(cat => {
                        const isSelected = cat.key === selectedCategoryKey;
                        return (
                            <Chip
                                key={cat.key}
                                label={`${cat.nombre} (${cat.stockFisico.toLocaleString()} kg)`}
                                onClick={() => setSelectedCategoryKey(cat.key)}
                                sx={{
                                    bgcolor: isSelected ? colors.primary : colors.surface,
                                    color: isSelected ? '#000' : colors.text,
                                    fontWeight: isSelected ? 800 : 600,
                                    fontSize: '12px',
                                    border: `1px solid ${isSelected ? colors.primary : colors.border}`,
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: isSelected ? colors.primary : 'rgba(255,255,255,0.08)' }
                                }}
                            />
                        );
                    })}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: colors.textMuted, fontWeight: 700 }}>
                        Horizonte:
                    </Typography>
                    <ButtonGroup size="small">
                        {[30, 60, 90, 180, 365].map(days => (
                            <Button
                                key={days}
                                onClick={() => setHorizonDays(days)}
                                sx={{
                                    bgcolor: horizonDays === days ? colors.primary : colors.surface,
                                    color: horizonDays === days ? '#000' : colors.textSecondary,
                                    fontWeight: horizonDays === days ? 800 : 600,
                                    borderColor: colors.border,
                                    fontSize: '11px',
                                    '&:hover': { bgcolor: horizonDays === days ? '#d97706' : 'rgba(255,255,255,0.05)' }
                                }}
                            >
                                {days}d
                            </Button>
                        ))}
                    </ButtonGroup>
                </Box>
            </Box>

            {/* 4. KPI STRIP */}
            {activeCategory && (
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' },
                    gap: 1.5
                }}>
                    <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 2, p: 1.5 }}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>
                            📦 Stock Físico Actual
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.text, mt: 0.3 }}>
                            {activeCategory.stockFisico.toLocaleString()} kg
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                            En {activeCategory.items.length} materiales activos
                        </Typography>
                    </Card>

                    <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 2, p: 1.5 }}>
                        <Typography variant="caption" sx={{ color: colors.warning, fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>
                            🔥 Consumo Promedio
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.warning, mt: 0.3 }}>
                            {sawtoothData.consumoAjustado.toLocaleString()} kg/día
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                            ~{Math.round(sawtoothData.consumoAjustado * 30).toLocaleString()} kg/mes
                        </Typography>
                    </Card>

                    <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 2, p: 1.5 }}>
                        <Typography variant="caption" sx={{ color: colors.info, fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>
                            ⏳ Cobertura sin Compras
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.info, mt: 0.3 }}>
                            {sawtoothData.coberturaDias} días
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                            Hasta agotar stock físico existente
                        </Typography>
                    </Card>

                    <Card sx={{ bgcolor: colors.surface, border: `1px solid rgba(56, 189, 248, 0.3)`, borderRadius: 2, p: 1.5 }}>
                        <Typography variant="caption" sx={{ color: colors.info, fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocalShippingIcon sx={{ fontSize: 13 }} />
                            Kilos en Tránsito
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.info, mt: 0.3 }}>
                            +{activeCategory.totalPorVenir.toLocaleString()} kg
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                            En {activeCategory.arribos.length} entregas pautadas
                        </Typography>
                    </Card>

                    <Card sx={{
                        bgcolor: sawtoothData.fechaQuiebre ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        border: `1px solid ${sawtoothData.fechaQuiebre ? colors.danger : colors.success}`,
                        borderRadius: 2,
                        p: 1.5
                    }}>
                        <Typography variant="caption" sx={{ color: sawtoothData.fechaQuiebre ? colors.danger : colors.success, fontWeight: 800, fontSize: '10px', textTransform: 'uppercase' }}>
                            {sawtoothData.fechaQuiebre ? '⚠️ Fecha de Quiebre' : '✓ Cobertura Saludable'}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: sawtoothData.fechaQuiebre ? colors.danger : colors.success, mt: 0.3, fontSize: '16px' }}>
                            {sawtoothData.fechaQuiebre ? sawtoothData.fechaQuiebre.split(' ')[0] : 'Sin quiebres'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                            {sawtoothData.fechaQuiebre ? `${sawtoothData.diasEnQuiebre} días en zona de déficit` : `Abastecido por ${horizonDays} días`}
                        </Typography>
                    </Card>
                </Box>
            )}

            {/* 5. DIAGNÓSTICO EJECUTIVO DE COMPRAS */}
            {activeCategory && (
                <Card sx={{
                    bgcolor: sawtoothData.quiebreAntesDeArribo
                        ? 'rgba(239, 68, 68, 0.15)'
                        : (sawtoothData.fechaQuiebre ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.08)'),
                    border: `1px solid ${sawtoothData.quiebreAntesDeArribo ? colors.danger : (sawtoothData.fechaQuiebre ? colors.warning : colors.success)}`,
                    borderRadius: 2,
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                }}>
                    {sawtoothData.quiebreAntesDeArribo ? (
                        <ErrorOutlineIcon sx={{ color: colors.danger, fontSize: 32 }} />
                    ) : sawtoothData.fechaQuiebre ? (
                        <WarningAmberIcon sx={{ color: colors.warning, fontSize: 32 }} />
                    ) : (
                        <CheckCircleOutlineIcon sx={{ color: colors.success, fontSize: 32 }} />
                    )}

                    <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.text, fontSize: '14px' }}>
                            {sawtoothData.quiebreAntesDeArribo
                                ? `🚨 ALERTA CRÍTICA: Descalce de Abastecimiento en "${activeCategory.nombre}"`
                                : (sawtoothData.fechaQuiebre
                                    ? `⚠️ ATENCIÓN: El stock se agotará el ${sawtoothData.fechaQuiebre.split(' ')[0]} sin arribos posteriores`
                                    : `✅ Abastecimiento Óptimo: Línea de producción garantizada en "${activeCategory.nombre}"`)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: colors.textSecondary, fontSize: '12px', mt: 0.3 }}>
                            {sawtoothData.quiebreAntesDeArribo
                                ? `El stock físico de ${activeCategory.nombre} llegará a 0 el ${sawtoothData.fechaQuiebre?.split(' ')[0]}, pero el próximo embarque programado arriba recién el ${sawtoothData.primerArriboDespuesQuiebre}. Habrá un bache sin material de ${sawtoothData.diasEnQuiebre} días. Se aconseja adelantar la orden o coordinar un lote local urgente.`
                                : (sawtoothData.fechaQuiebre
                                    ? `La tasa de consumo consumirá las existencias en ${sawtoothData.coberturaDias} días. No se registran órdenes de compra posteriores. Emitir pedido antes del ${sawtoothData.fechaMinimo?.split(' ')[0]} para respetar el lead time.`
                                    : `Los ${activeCategory.totalPorVenir.toLocaleString()} kg en camino cubren la demanda proyectada manteniéndose por encima del stock de seguridad (${activeCategory.stockMinimo.toLocaleString()} kg).`)}
                        </Typography>
                    </Box>

                    <Button
                        variant="contained"
                        size="small"
                        onClick={() => navigate('/compras/ordenes-compra')}
                        sx={{
                            bgcolor: sawtoothData.quiebreAntesDeArribo ? colors.danger : colors.primary,
                            color: '#000',
                            fontWeight: 800,
                            textTransform: 'none',
                            fontSize: '12px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Gestionar Órdenes
                    </Button>
                </Card>
            )}

            {/* 6. GRÁFICO DIENTE DE SIERRA PRINCIPAL */}
            <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 2, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: colors.text, fontSize: '16px' }}>
                            Curva de Stock Dinámico vs Arribos ({activeCategory?.nombre})
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textMuted }}>
                            Picos ascendentes = Ingresos por Órdenes de Compra • Pendiente descendente = Consumo continuo diario
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 12, height: 3, bgcolor: colors.info, borderRadius: 1 }} />
                            <Typography variant="caption" sx={{ color: colors.textSecondary, fontSize: '11px' }}>Stock Proyectado</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 12, height: 2, bgcolor: colors.warning, borderStyle: 'dashed' }} />
                            <Typography variant="caption" sx={{ color: colors.warning, fontSize: '11px' }}>Stock Mínimo ({activeCategory?.stockMinimo.toLocaleString()} kg)</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 12, height: 2, bgcolor: colors.danger }} />
                            <Typography variant="caption" sx={{ color: colors.danger, fontSize: '11px' }}>Línea Quiebre (0 kg)</Typography>
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ width: '100%', height: 380 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={sawtoothData.points} margin={{ top: 15, right: 30, left: 10, bottom: 25 }}>
                            <defs>
                                <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.info} stopOpacity={0.35} />
                                    <stop offset="95%" stopColor={colors.info} stopOpacity={0.0} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />

                            <XAxis
                                dataKey="fecha"
                                stroke={colors.textMuted}
                                tick={{ fill: colors.textMuted, fontSize: 11 }}
                                interval={Math.floor(horizonDays / 12)}
                            />

                            <YAxis
                                stroke={colors.textMuted}
                                tick={{ fill: colors.textMuted, fontSize: 11 }}
                                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                            />

                            <RechartsTooltip
                                content={({ active, payload }) => {
                                    if (!active || !payload || !payload.length) return null;
                                    const d = payload[0].payload;
                                    return (
                                        <Card sx={{ bgcolor: '#0f172a', border: `1px solid ${colors.border}`, p: 1.5, borderRadius: 2, boxShadow: 6 }}>
                                            <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, display: 'block' }}>
                                                📅 Día {d.dia} • {d.fullDate}
                                            </Typography>
                                            <Typography variant="h6" sx={{
                                                fontWeight: 900,
                                                color: d.isDanger ? colors.danger : (d.isWarning ? colors.warning : colors.info),
                                                mt: 0.3
                                            }}>
                                                {d.stockRealSinTope.toLocaleString()} kg
                                            </Typography>

                                            {d.llegadaKg > 0 && (
                                                <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(56, 189, 248, 0.15)', borderRadius: 1 }}>
                                                    <Typography variant="caption" sx={{ color: colors.info, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <LocalShippingIcon sx={{ fontSize: 12 }} />
                                                        + {d.llegadaKg.toLocaleString()} kg recibidos
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: colors.text, display: 'block', fontSize: '10px' }}>
                                                        {d.detalleArribo}
                                                    </Typography>
                                                </Box>
                                            )}

                                            <Box sx={{ display: 'flex', gap: 1.5, mt: 1, pt: 1, borderTop: `1px solid ${colors.border}` }}>
                                                <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                                                    Mínimo: {d.minimo?.toLocaleString()} kg
                                                </Typography>
                                                {d.maximo && (
                                                    <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                                                        Máximo: {d.maximo.toLocaleString()} kg
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Card>
                                    );
                                }}
                            />

                            <Area
                                type="monotone"
                                dataKey="stock"
                                stroke="none"
                                fill="url(#stockGradient)"
                            />

                            <Line
                                type="monotone"
                                dataKey="stock"
                                stroke={colors.info}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 6, fill: colors.primary }}
                            />

                            <ReferenceLine
                                y={activeCategory?.stockMinimo}
                                stroke={colors.warning}
                                strokeDasharray="4 4"
                                strokeWidth={1.5}
                            />

                            <ReferenceLine
                                y={0}
                                stroke={colors.danger}
                                strokeWidth={2}
                            />

                            {activeCategory?.stockMaximo && (
                                <ReferenceLine
                                    y={activeCategory.stockMaximo}
                                    stroke="rgba(147, 51, 234, 0.7)"
                                    strokeDasharray="4 4"
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </Box>
            </Card>

            {/* 7. DETALLE DOBLE: PRÓXIMOS ARRIBOS Y MATERIALES DE LA CATEGORÍA */}
            {activeCategory && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
                    <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 2, p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.text, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocalShippingIcon sx={{ fontSize: 18, color: colors.info }} />
                                Órdenes de Compra por Arribar ({activeCategory.arribos.length})
                            </Typography>
                            <Chip
                                label={`Total: +${activeCategory.totalPorVenir.toLocaleString()} kg`}
                                size="small"
                                sx={{ bgcolor: 'rgba(56, 189, 248, 0.15)', color: colors.info, fontWeight: 700, fontSize: '11px' }}
                            />
                        </Box>

                        {activeCategory.arribos.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography variant="body2" sx={{ color: colors.textMuted }}>
                                    No hay órdenes de compra en tránsito registradas para esta categoría.
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ maxHeight: 260 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ '& th': { color: colors.textMuted, fontSize: '11px', fontWeight: 700 } }}>
                                            <TableCell>Fecha Estimada</TableCell>
                                            <TableCell>Orden / Proveedor</TableCell>
                                            <TableCell>Material</TableCell>
                                            <TableCell align="right">Kilos</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {activeCategory.arribos.map((a: any, idx: number) => (
                                            <TableRow key={idx} sx={{ '& td': { color: colors.text, fontSize: '12px' } }}>
                                                <TableCell sx={{ color: colors.info, fontWeight: 700 }}>
                                                    {a.fecha}
                                                </TableCell>
                                                <TableCell>
                                                    <strong>{a.ordenNumero}</strong>
                                                    <Typography variant="caption" sx={{ display: 'block', color: colors.textMuted, fontSize: '10px' }}>
                                                        {a.partnerNombre}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ color: colors.textSecondary }}>
                                                    {a.descripcion || a.codigoInterno}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800, color: colors.info }}>
                                                    +{a.cantidadKg.toLocaleString()} kg
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Card>

                    <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 2, p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.text, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LayersIcon sx={{ fontSize: 18, color: colors.primary }} />
                                Materiales en esta Categoría ({activeCategory.items.length})
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.textMuted }}>
                                Stock físico consolidado
                            </Typography>
                        </Box>

                        {activeCategory.items.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography variant="body2" sx={{ color: colors.textMuted }}>
                                    Categoría creada por compras o sin materiales catalogados individualmente.
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ maxHeight: 260 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ '& th': { color: colors.textMuted, fontSize: '11px', fontWeight: 700 } }}>
                                            <TableCell>Código</TableCell>
                                            <TableCell>Descripción</TableCell>
                                            <TableCell align="right">Stock Físico</TableCell>
                                            <TableCell align="right">Consumo 90d</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {activeCategory.items.map((it: any) => {
                                            const s = Number(stockTotalsByItem.get(it.id) || 0);
                                            const normCode = it.codigoInterno ? String(it.codigoInterno).trim().toUpperCase() : null;
                                            const c = (consumptionByItem.get(it.id) || (normCode ? consumptionByItem.get(normCode) : 0) || 0);
                                            return (
                                                <TableRow key={it.id} sx={{ '& td': { color: colors.text, fontSize: '12px' } }}>
                                                    <TableCell sx={{ fontWeight: 700 }}>
                                                        {it.codigoInterno}
                                                    </TableCell>
                                                    <TableCell sx={{ color: colors.textSecondary, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {it.descripcion}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, color: s > 0 ? colors.text : colors.danger }}>
                                                        {s.toLocaleString()} kg
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ color: colors.textMuted }}>
                                                        {c.toLocaleString()} kg
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Card>
                </Box>
            )}
        </Box>
    );
}
