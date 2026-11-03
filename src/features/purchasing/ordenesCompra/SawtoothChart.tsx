import { useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Card,
    Chip,
    TextField,
    MenuItem,
    Button,
    ButtonGroup
} from '@mui/material';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine
} from 'recharts';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { getArribosProgramados } from './ordenesCompraStorage';

interface SawtoothChartProps {
    items: any[];
    categories: any[];
    stockTotalsByItem: Map<string, number>;
    consumptionByItem: Map<string, number>;
    initialItemCode?: string;
}

export default function SawtoothChart({
    items,
    stockTotalsByItem,
    consumptionByItem,
    initialItemCode
}: SawtoothChartProps) {
    const [selectedItemCode, setSelectedItemCode] = useState<string>(() => {
        if (initialItemCode) return initialItemCode;
        if (items.length > 0) return items[0].codigoInterno;
        return '';
    });

    const [horizonDays, setHorizonDays] = useState<number>(60);

    const activeItem = useMemo(() => {
        return items.find(i => i.codigoInterno === selectedItemCode) || items[0] || null;
    }, [items, selectedItemCode]);

    // Arribos de órdenes de compra para el ítem seleccionado
    const arribos = useMemo(() => {
        if (!activeItem) return [];
        return getArribosProgramados(activeItem.codigoInterno);
    }, [activeItem]);

    // Cálculo del stock actual, consumo diario y mínimo
    const stockActual = useMemo(() => {
        if (!activeItem) return 0;
        return Number(stockTotalsByItem.get(activeItem.id) || 0);
    }, [activeItem, stockTotalsByItem]);

    const consumo90d = useMemo(() => {
        if (!activeItem) return 0;
        const norm = activeItem.codigoInterno?.trim().toUpperCase();
        return (consumptionByItem.get(activeItem.id) || (norm ? consumptionByItem.get(norm) : 0) || 0);
    }, [activeItem, consumptionByItem]);

    const consumoDiario = useMemo(() => {
        const d = consumo90d / 90;
        return d > 0 ? Math.round(d * 10) / 10 : 15; // default 15 kg/día si es nuevo para proyectar
    }, [consumo90d]);

    const stockMinimo = useMemo(() => {
        return activeItem?.stockMinimo ? Number(activeItem.stockMinimo) : Math.round(consumoDiario * 15);
    }, [activeItem, consumoDiario]);

    // Simulación día por día (Diente de Sierra)
    const simulation = useMemo(() => {
        const data: any[] = [];
        let currentStock = stockActual;
        let fechaQuiebre: string | null = null;
        let fechaRiesgoMinimo: string | null = null;
        let stockMinimoAlcanzado = currentStock;

        // Mapear arribos por fecha
        const arribosByDate = new Map<string, { qty: number; ordenes: string[] }>();
        arribos.forEach(a => {
            const cur = arribosByDate.get(a.fecha) || { qty: 0, ordenes: [] };
            cur.qty += a.cantidadKg;
            cur.ordenes.push(`${a.ordenNumero} (+${a.cantidadKg.toLocaleString()} kg)`);
            arribosByDate.set(a.fecha, cur);
        });

        const today = new Date();

        for (let i = 0; i <= horizonDays; i++) {
            const dateObj = new Date(today);
            dateObj.setDate(today.getDate() + i);
            const dateStr = dateObj.toISOString().split('T')[0];
            const displayDate = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;

            // 1. Arribos que entran en este día
            const arriboHoy = arribosByDate.get(dateStr);
            const entregaKg = arriboHoy ? arriboHoy.qty : 0;
            const ordenesDetalle = arriboHoy ? arriboHoy.ordenes.join(', ') : null;

            // 2. Si entra entrega, el stock pega el salto positivo
            if (entregaKg > 0) {
                currentStock += entregaKg;
            }

            // 3. Consumo del día (excepto el día 0 que es el punto de partida)
            if (i > 0) {
                currentStock = Math.max(-500, Math.round(currentStock - consumoDiario));
            }

            if (currentStock < stockMinimoAlcanzado) {
                stockMinimoAlcanzado = currentStock;
            }

            // Detección de quiebres
            if (currentStock <= 0 && !fechaQuiebre) {
                fechaQuiebre = displayDate;
            }
            if (currentStock < stockMinimo && !fechaRiesgoMinimo) {
                fechaRiesgoMinimo = displayDate;
            }

            data.push({
                dia: i,
                fecha: displayDate,
                fullFecha: dateStr,
                stock: currentStock,
                minimo: stockMinimo,
                quiebre: 0,
                entregaKg,
                ordenesDetalle
            });
        }

        return {
            points: data,
            fechaQuiebre,
            fechaRiesgoMinimo,
            stockMinimoAlcanzado,
            totalPorLlegar: arribos.reduce((acc, a) => acc + a.cantidadKg, 0)
        };
    }, [stockActual, consumoDiario, stockMinimo, arribos, horizonDays]);

    const colors = {
        bg: '#0f172a',
        surface: '#1e293b',
        border: 'rgba(255, 255, 255, 0.08)',
        primary: '#f59e0b',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#38bdf8',
        text: '#f8fafc',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
    };

    return (
        <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 2, p: 2 }}>
            {/* Header del Gráfico de Sierra */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: colors.text, display: 'flex', alignItems: 'center', gap: 1, fontSize: '17px' }}>
                        <span>📈 Proyección Diente de Sierra (Stock vs Arribos)</span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                        Simulación de consumo continuo y reposición por órdenes de compra programadas
                    </Typography>
                </Box>

                {/* Controles: Selector de Material y Horizonte de Tiempo */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <TextField
                        select
                        size="small"
                        label="Material / Hilado"
                        value={selectedItemCode}
                        onChange={(e) => setSelectedItemCode(e.target.value)}
                        sx={{
                            minWidth: 260,
                            '& .MuiOutlinedInput-root': {
                                height: 36,
                                fontSize: '13px',
                                bgcolor: 'rgba(255,255,255,0.03)',
                                color: colors.text,
                                borderRadius: 1.5
                            },
                            '& .MuiInputLabel-root': { fontSize: '12px', color: colors.textMuted }
                        }}
                    >
                        {items.slice(0, 40).map((it: any) => (
                            <MenuItem key={it.id} value={it.codigoInterno} sx={{ fontSize: '13px' }}>
                                <strong>{it.codigoInterno}</strong> - {it.descripcion.substring(0, 30)}
                            </MenuItem>
                        ))}
                    </TextField>

                    <ButtonGroup size="small" variant="outlined" sx={{ height: 36 }}>
                        <Button
                            onClick={() => setHorizonDays(30)}
                            sx={{
                                bgcolor: horizonDays === 30 ? colors.primary : 'transparent',
                                color: horizonDays === 30 ? '#000' : colors.textSecondary,
                                fontWeight: 700,
                                borderColor: colors.border
                            }}
                        >
                            30d
                        </Button>
                        <Button
                            onClick={() => setHorizonDays(60)}
                            sx={{
                                bgcolor: horizonDays === 60 ? colors.primary : 'transparent',
                                color: horizonDays === 60 ? '#000' : colors.textSecondary,
                                fontWeight: 700,
                                borderColor: colors.border
                            }}
                        >
                            60d
                        </Button>
                        <Button
                            onClick={() => setHorizonDays(90)}
                            sx={{
                                bgcolor: horizonDays === 90 ? colors.primary : 'transparent',
                                color: horizonDays === 90 ? '#000' : colors.textSecondary,
                                fontWeight: 700,
                                borderColor: colors.border
                            }}
                        >
                            90d
                        </Button>
                    </ButtonGroup>
                </Box>
            </Box>

            {/* Diagnóstico Predictivo / Banner de Alerta de Quiebre */}
            {simulation.fechaQuiebre ? (
                <Box sx={{
                    p: 1.5,
                    mb: 2,
                    bgcolor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid #ef4444',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <WarningAmberIcon sx={{ color: colors.danger, fontSize: 26 }} />
                        <Box>
                            <Typography sx={{ fontWeight: 800, color: colors.danger, fontSize: '13px' }}>
                                🚨 Quiebre de stock proyectado para el día {simulation.fechaQuiebre}
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                El stock actual se agota antes de que ingresen suficientes reposiciones. Se recomienda adelantar el despacho de la orden o emitir una compra urgente.
                            </Typography>
                        </Box>
                    </Box>
                    <Chip
                        label={`Stock toca 0 kg el ${simulation.fechaQuiebre}`}
                        size="small"
                        sx={{ bgcolor: colors.danger, color: '#fff', fontWeight: 800, fontSize: '11px' }}
                    />
                </Box>
            ) : simulation.fechaRiesgoMinimo ? (
                <Box sx={{
                    p: 1.5,
                    mb: 2,
                    bgcolor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid #f59e0b',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <WarningAmberIcon sx={{ color: colors.warning, fontSize: 24 }} />
                        <Box>
                            <Typography sx={{ fontWeight: 800, color: colors.warning, fontSize: '13px' }}>
                                ⚠️ El stock descenderá por debajo del nivel de seguridad el {simulation.fechaRiesgoMinimo}
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                Los arribos programados evitan el quiebre a cero, pero consumen el colchón de seguridad ({stockMinimo.toLocaleString()} kg).
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            ) : (
                <Box sx={{
                    p: 1.2,
                    mb: 2,
                    bgcolor: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid #10b981',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.2
                }}>
                    <CheckCircleOutlineIcon sx={{ color: colors.success, fontSize: 22 }} />
                    <Typography sx={{ fontWeight: 700, color: colors.success, fontSize: '12px' }}>
                        🟢 Abastecimiento Seguro: Los pedidos programados cubren el consumo previsto durante los próximos {horizonDays} días sin quebrar stock.
                    </Typography>
                </Box>
            )}

            {/* Strip de Parámetros de la Sierra */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 1.5,
                mb: 2
            }}>
                <Box sx={{ p: 1.2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 1.5, border: `1px solid ${colors.border}` }}>
                    <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '11px' }}>
                        Stock Inicial
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: colors.text }}>
                        {stockActual.toLocaleString()} kg
                    </Typography>
                </Box>

                <Box sx={{ p: 1.2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 1.5, border: `1px solid ${colors.border}` }}>
                    <Typography variant="caption" sx={{ color: colors.warning, fontSize: '11px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TrendingDownIcon sx={{ fontSize: 13 }} />
                        Consumo Proyectado
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: colors.warning }}>
                        ~{consumoDiario.toLocaleString()} kg/día
                    </Typography>
                </Box>

                <Box sx={{ p: 1.2, bgcolor: 'rgba(56, 189, 248, 0.04)', borderRadius: 1.5, border: `1px solid rgba(56, 189, 248, 0.2)` }}>
                    <Typography variant="caption" sx={{ color: colors.info, fontSize: '11px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocalShippingIcon sx={{ fontSize: 13 }} />
                        En Órdenes de Compra
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: colors.info }}>
                        +{simulation.totalPorLlegar.toLocaleString()} kg
                    </Typography>
                </Box>

                <Box sx={{ p: 1.2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 1.5, border: `1px solid ${colors.border}` }}>
                    <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '11px' }}>
                        Piso Mínimo de Seguridad
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: colors.textSecondary }}>
                        {stockMinimo.toLocaleString()} kg
                    </Typography>
                </Box>
            </Box>

            {/* Gráfico Recharts Diente de Sierra */}
            <Box sx={{ height: 320, width: '100%', mt: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={simulation.points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="fecha"
                            stroke={colors.textMuted}
                            fontSize={11}
                            tickLine={false}
                            interval={Math.floor(horizonDays / 8)}
                        />
                        <YAxis
                            stroke={colors.textMuted}
                            fontSize={11}
                            tickLine={false}
                            tickFormatter={(v) => `${v}kg`}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    const isUnderZero = d.stock <= 0;
                                    const isUnderMin = d.stock < d.minimo;

                                    return (
                                        <Box sx={{
                                            bgcolor: '#0f172a',
                                            border: `1px solid ${isUnderZero ? colors.danger : colors.border}`,
                                            p: 1.5,
                                            borderRadius: 1.5,
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                            fontSize: '12px'
                                        }}>
                                            <Typography sx={{ fontWeight: 800, color: colors.text, mb: 0.5 }}>
                                                📅 Día {d.dia} ({d.fecha})
                                            </Typography>
                                            <Box sx={{ color: isUnderZero ? colors.danger : isUnderMin ? colors.warning : colors.success, fontWeight: 800 }}>
                                                Stock: {d.stock.toLocaleString()} kg
                                            </Box>
                                            <Box sx={{ color: colors.textMuted, fontSize: '11px' }}>
                                                Mínimo fijado: {d.minimo.toLocaleString()} kg
                                            </Box>
                                            {d.entregaKg > 0 && (
                                                <Box sx={{ mt: 0.8, p: 0.6, bgcolor: 'rgba(56, 189, 248, 0.15)', borderRadius: 1, color: colors.info, fontWeight: 700 }}>
                                                    🚚 Arribo programado: +{d.entregaKg.toLocaleString()} kg
                                                    {d.ordenesDetalle && (
                                                        <div style={{ fontSize: '10px', color: colors.textSecondary }}>
                                                            {d.ordenesDetalle}
                                                        </div>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>
                                    );
                                }
                                return null;
                            }}
                        />
                        {/* Línea horizontal: Quiebre (0 kg) */}
                        <ReferenceLine y={0} stroke={colors.danger} strokeWidth={1.5} label={{ value: 'Quiebre (0 kg)', fill: colors.danger, fontSize: 10, position: 'insideBottomRight' }} />
                        
                        {/* Línea horizontal: Stock Mínimo */}
                        <ReferenceLine y={stockMinimo} stroke={colors.warning} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `Mínimo (${stockMinimo} kg)`, fill: colors.warning, fontSize: 10, position: 'insideTopRight' }} />

                        {/* Línea Diente de Sierra de Stock Proyectado */}
                        <Line
                            type="stepAfter"
                            dataKey="stock"
                            stroke={simulation.fechaQuiebre ? colors.danger : colors.info}
                            strokeWidth={2.5}
                            dot={(props) => {
                                const { cx, cy, payload } = props;
                                if (payload.entregaKg > 0) {
                                    return (
                                        <g key={`dot-${payload.dia}`}>
                                            <circle cx={cx} cy={cy} r={6} fill={colors.info} stroke="#fff" strokeWidth={2} />
                                        </g>
                                    );
                                }
                                return <g key={`dot-empty-${payload.dia}`} />;
                            }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Box>

            {/* Pie de gráfica con leyenda */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, px: 1, fontSize: '11px', color: colors.textSecondary }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: colors.info, display: 'inline-block' }}></span>
                        Puntos con salto: Arribo de Órdenes de Compra
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: 14, height: 2, backgroundColor: colors.warning, display: 'inline-block' }}></span>
                        Límite Mínimo de Seguridad
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: 14, height: 2, backgroundColor: colors.danger, display: 'inline-block' }}></span>
                        Línea de Quiebre
                    </span>
                </Box>
                <span>Curva escalonada tipo sierra</span>
            </Box>
        </Card>
    );
}
