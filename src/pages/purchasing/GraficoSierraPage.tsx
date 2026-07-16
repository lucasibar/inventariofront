import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { useGetItemsQuery, useUpdateItemMutation } from '../../features/warehouse/materiales/api/items.api';
import { useGetStockQuery, useGetRecentMovementsQuery } from '../../features/warehouse/stock/api/stock.api';
import { selectCurrentUser, selectAllowedDepots } from '../../entities/auth/model/authSlice';
import { PageHeader, Card, Table, Badge, Spinner, EditableCell, SearchBar } from '../../shared/ui';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine
} from 'recharts';
import {
    Box,
    Grid,
    Typography,
    TextField,
    MenuItem,
    Checkbox,
    Slider,
    ToggleButton,
    ToggleButtonGroup
} from '@mui/material';

// Theme colors matching dashboard
const colors = {
    primary: '#818cf8', // Indigo
    secondary: '#475569',
    bg: '#0f1117',
    cardBg: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
    text: '#f3f4f6',
    textDim: '#9ca3af',
    danger: '#f87171',
    success: '#34d399',
    warning: '#fbbf24',
    info: '#60a5fa'
};

const KPI_CARD_STYLE = {
    background: colors.cardBg,
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center' as const,
    minHeight: '100px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
};

const normalizeUnit = (unitStr: string): string => {
    if (!unitStr) return 'unidades';
    const u = unitStr.toLowerCase().trim().replace(/\./g, '');
    
    // Weight-based / Mass-based units
    if (['kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos', 'gr', 'gramos'].includes(u)) {
        return 'kg';
    }
    
    // Any other discrete count unit (etiquetas, perchas, bolsas, plantillas, fajas, unidades, rollos, cajas, etc.)
    // is treated as a count-based unit ('unidades') so they can be summed together.
    return 'unidades';
};

export default function GraficoSierraPage() {
    const user = useSelector(selectCurrentUser);
    const allowedDepots = useSelector(selectAllowedDepots);
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

    // Queries
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => {
        if (!allowedDepots) return rawDepots;
        return rawDepots.filter((d: any) => allowedDepots.includes(d.id));
    }, [rawDepots, allowedDepots]);

    const [depotId, setDepotId] = useState<string>(() => {
        return sessionStorage.getItem('selectedPurchasingDepotId') || '';
    });

    useEffect(() => {
        if (depotId) sessionStorage.setItem('selectedPurchasingDepotId', depotId);
    }, [depotId]);

    useEffect(() => {
        if (!depotId && depots.length > 0) {
            setDepotId(depots[0].id);
        }
    }, [depots, depotId]);

    // Data fetching
    const { data: items = [], isLoading: loadingItems } = useGetItemsQuery({ depositoId: depotId || undefined });
    const { data: allStock = [], isLoading: loadingStock } = useGetStockQuery({ depotId: depotId || undefined });
    
    // We fetch movements for the last 30 days
    const rangeStartDate = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    }, []);

    const { data: movements = [], isLoading: loadingMovs } = useGetRecentMovementsQuery({
        depositoId: depotId || undefined,
        desde: rangeStartDate
    });

    const [updateItem] = useUpdateItemMutation();

    // Local states
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'individual' | 'sum'>('individual');
    const [timeRange, setTimeRange] = useState<number>(30); // 15, 30, 60
    const [globalLeadTime, setGlobalLeadTime] = useState<number>(7);

    // Calculate aggregated current stock per item
    const stockMap = useMemo(() => {
        const map = new Map<string, number>();
        allStock.forEach((entry: any) => {
            const itemId = entry.batch?.item?.id || entry.itemId;
            if (itemId) {
                map.set(itemId, (map.get(itemId) || 0) + Number(entry.qtyPrincipal || 0));
            }
        });
        return map;
    }, [allStock]);

    // Filter items based on search and selected depot
    const filteredItems = useMemo(() => {
        return items.filter((item: any) => {
            const matchesSearch = searchQuery === '' || 
                item.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.codigoInterno.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.supplier?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [items, searchQuery]);

    // Automatically select the first 2 items when depot changes or items load, if nothing is selected
    useEffect(() => {
        if (items.length > 0 && selectedItemIds.length === 0) {
            setSelectedItemIds(items.slice(0, 2).map((it: any) => it.id));
        }
    }, [items]);

    // Check if the selected materials have different units
    const isHeterogeneous = useMemo(() => {
        if (selectedItemIds.length <= 1) return false;
        const selectedItemsList = items.filter((it: any) => selectedItemIds.includes(it.id));
        const firstUnitNormalized = normalizeUnit(selectedItemsList[0]?.unidadPrincipal);
        return selectedItemsList.some((it: any) => normalizeUnit(it.unidadPrincipal) !== firstUnitNormalized);
    }, [selectedItemIds, items]);

    // Automatically switch from sum to individual if units are mixed
    useEffect(() => {
        if (isHeterogeneous && viewMode === 'sum') {
            setViewMode('individual');
        }
    }, [isHeterogeneous, viewMode]);

    // Calculate Consumption and Historical Stock levels going backward
    const { chartData, kpis } = useMemo(() => {
        if (selectedItemIds.length === 0) {
            return { chartData: [], kpis: { totalStock: 0, avgDailyConsumption: 0, coverageDays: 0, itemsAlert: 0, avgLeadTime: 7 } };
        }

        const selectedItemsList = items.filter((it: any) => selectedItemIds.includes(it.id));

        // 1. Generate dates array for timeRange
        const datesArray: string[] = [];
        for (let i = timeRange - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            datesArray.push(d.toISOString().split('T')[0]);
        }

        // 2. Initialize stock history map for each item
        const itemStockHistory: Record<string, Record<string, number>> = {};
        const dailyConsumptionMap: Record<string, number> = {};

        selectedItemsList.forEach((item: any) => {
            const currentStock = stockMap.get(item.id) || 0;
            itemStockHistory[item.id] = {};
            
            // Reconstruct backwards
            let tempStock = currentStock;
            
            // Get item movements sorted newest to oldest
            const itemMovs = movements
                .filter((m: any) => m.itemId === item.id && m.status !== 'ANULADO')
                .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

            // Compute total consumption (departures) in the 30-day period
            const totalOut = itemMovs
                .filter((m: any) => ['REMITO_SALIDA', 'AJUSTE_RESTA', 'ANULACION_AJUSTE_SUMA', 'ANULACION_ENTRADA'].includes(m.tipo))
                .reduce((sum: number, m: any) => sum + Number(m.qtyPrincipal || 0), 0);
            
            dailyConsumptionMap[item.id] = totalOut / 30;

            // Map movements by date
            const movsByDate: Record<string, any[]> = {};
            itemMovs.forEach((m: any) => {
                const datePart = m.fecha ? m.fecha.substring(0, 10) : '';
                if (datePart) {
                    if (!movsByDate[datePart]) movsByDate[datePart] = [];
                    movsByDate[datePart].push(m);
                }
            });

            // Iterate dates backwards from today
            for (let i = datesArray.length - 1; i >= 0; i--) {
                const dateStr = datesArray[i];
                itemStockHistory[item.id][dateStr] = tempStock;

                const dayMovs = movsByDate[dateStr] || [];
                let entrances = 0;
                let departures = 0;

                dayMovs.forEach((m: any) => {
                    const qty = Number(m.qtyPrincipal || 0);
                    if (['REMITO_ENTRADA', 'AJUSTE_SUMA', 'ANULACION_AJUSTE_RESTA', 'ANULACION_SALIDA'].includes(m.tipo)) {
                        entrances += qty;
                    } else if (['REMITO_SALIDA', 'AJUSTE_RESTA', 'ANULACION_AJUSTE_SUMA', 'ANULACION_ENTRADA'].includes(m.tipo)) {
                        departures += qty;
                    }
                });

                // Start stock = End stock - Entrances + Departures
                tempStock = Math.max(0, tempStock - entrances + departures);
            }
        });

        // 3. Compile chart data (Past + Future Projection)
        const compiledData: any[] = [];
        
        // Populate past history
        datesArray.forEach((dateStr) => {
            const displayDate = new Date(dateStr + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
            const entry: any = {
                date: displayDate,
                formattedDate: dateStr,
                isProjection: false
            };

            selectedItemsList.forEach((item: any) => {
                const stock = itemStockHistory[item.id]?.[dateStr] ?? 0;
                entry[`stock_${item.id}`] = Number(stock.toFixed(1));
                entry[`min_${item.id}`] = Number(Number(item.stockMinimo || 0).toFixed(1));
                entry[`max_${item.id}`] = Number(Number(item.stockMaximo || 0).toFixed(1));
                
                // Reorder Point = Min + (Consumption * LeadTime)
                const leadTimeValue = item.leadTime ?? globalLeadTime;
                const rPoint = Number(item.stockMinimo || 0) + (dailyConsumptionMap[item.id] || 0) * leadTimeValue;
                entry[`rpoint_${item.id}`] = Number(Number(rPoint).toFixed(1));
            });

            // Aggregate totals for 'sum' view mode
            if (viewMode === 'sum') {
                entry.totalStock = Number(selectedItemsList.reduce((sum, item) => sum + (entry[`stock_${item.id}`] || 0), 0).toFixed(1));
                entry.totalMin = Number(selectedItemsList.reduce((sum, item) => sum + (entry[`min_${item.id}`] || 0), 0).toFixed(1));
                entry.totalMax = Number(selectedItemsList.reduce((sum, item) => sum + (entry[`max_${item.id}`] || 0), 0).toFixed(1));
                entry.totalRPoint = Number(selectedItemsList.reduce((sum, item) => sum + (entry[`rpoint_${item.id}`] || 0), 0).toFixed(1));
            }

            compiledData.push(entry);
        });

        // Generate future projection dates (next 15 days)
        const projectionDays = 15;
        const lastDateStr = datesArray[datesArray.length - 1];
        let baseStocks: Record<string, number> = {};
        
        selectedItemsList.forEach((item: any) => {
            baseStocks[item.id] = itemStockHistory[item.id]?.[lastDateStr] ?? 0;
        });

        for (let i = 1; i <= projectionDays; i++) {
            const d = new Date(lastDateStr + 'T12:00:00');
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const displayDate = d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

            const entry: any = {
                date: displayDate,
                formattedDate: dateStr,
                isProjection: true
            };

            selectedItemsList.forEach((item: any) => {
                const consumption = dailyConsumptionMap[item.id] || 0;
                // Decline stock based on average consumption
                const projectedVal = Math.max(0, baseStocks[item.id] - (consumption * i));
                entry[`stock_${item.id}`] = Number(Number(projectedVal).toFixed(1));
                entry[`min_${item.id}`] = Number(Number(item.stockMinimo || 0).toFixed(1));
                entry[`max_${item.id}`] = Number(Number(item.stockMaximo || 0).toFixed(1));
                
                const leadTimeValue = item.leadTime ?? globalLeadTime;
                const rPoint = Number(item.stockMinimo || 0) + consumption * leadTimeValue;
                entry[`rpoint_${item.id}`] = Number(Number(rPoint).toFixed(1));
            });

            if (viewMode === 'sum') {
                entry.totalStock = Number(selectedItemsList.reduce((sum, item) => sum + (entry[`stock_${item.id}`] || 0), 0).toFixed(1));
                entry.totalMin = Number(selectedItemsList.reduce((sum, item) => sum + (entry[`min_${item.id}`] || 0), 0).toFixed(1));
                entry.totalMax = Number(selectedItemsList.reduce((sum, item) => sum + (entry[`max_${item.id}`] || 0), 0).toFixed(1));
                entry.totalRPoint = Number(selectedItemsList.reduce((sum, item) => sum + (entry[`rpoint_${item.id}`] || 0), 0).toFixed(1));
            }

            compiledData.push(entry);
        }

        // 4. Calculate KPIs
        const totalStock = selectedItemsList.reduce((sum, item) => sum + (stockMap.get(item.id) || 0), 0);
        const combinedConsumption = selectedItemsList.reduce((sum, item) => sum + (dailyConsumptionMap[item.id] || 0), 0);
        const coverageDays = combinedConsumption > 0 ? totalStock / combinedConsumption : null;

        let itemsAlert = 0;
        selectedItemsList.forEach((item: any) => {
            const actual = stockMap.get(item.id) || 0;
            const min = Number(item.stockMinimo || 0);
            if (actual < min) itemsAlert++;
        });

        // Average Lead Time
        const avgLeadTime = selectedItemsList.reduce((sum, item) => sum + (item.leadTime ?? 7), 0) / selectedItemsList.length;

        return {
            chartData: compiledData,
            kpis: {
                totalStock,
                avgDailyConsumption: combinedConsumption,
                coverageDays,
                itemsAlert,
                avgLeadTime
            }
        };
    }, [selectedItemIds, items, stockMap, movements, timeRange, viewMode, globalLeadTime]);

    const handleToggleSelectAll = () => {
        if (selectedItemIds.length === filteredItems.length) {
            setSelectedItemIds([]);
        } else {
            setSelectedItemIds(filteredItems.map(it => it.id));
        }
    };

    const handleToggleSelectItem = (id: string) => {
        setSelectedItemIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSaveCell = async (itemId: string, field: string, value: string) => {
        try {
            const numericValue = value.trim() === '' ? null : Number(value);
            await updateItem({
                id: itemId,
                data: { [field]: numericValue }
            }).unwrap();
        } catch (err) {
            console.error('Error saving cell changes:', err);
        }
    };

    const isLoading = loadingItems || loadingStock || loadingMovs;

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: colors.text }}>
            <PageHeader 
                title="Gráfico de Sierra" 
                subtitle="Control de inventarios, consumo y puntos de pedido interactivos"
            />

            {/* Warehouse Select & Global Config */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                    select
                    label="Depósito"
                    size="small"
                    value={depotId}
                    onChange={(e) => setDepotId(e.target.value)}
                    disabled={!isAdmin && depots.length <= 1}
                    sx={{
                        minWidth: 200,
                        '& .MuiSelect-select': { color: 'white' },
                        '& .MuiInputLabel-root': { color: colors.textDim },
                        '& .MuiOutlinedInput-root': {
                            bgcolor: colors.cardBg,
                            borderRadius: 2,
                            '& fieldset': { borderColor: colors.border }
                        }
                    }}
                    SelectProps={{
                        MenuProps: {
                            PaperProps: {
                                sx: { bgcolor: colors.bg, color: colors.text }
                            }
                        }
                    }}
                >
                    {depots.map((d: any) => (
                        <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
                    ))}
                </TextField>

                <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_e, v) => v && setViewMode(v)}
                        size="small"
                        sx={{ bgcolor: colors.cardBg, border: `1px solid ${colors.border}` }}
                    >
                        <ToggleButton value="individual" sx={{ color: colors.textDim, '&.Mui-selected': { color: '#fff', bgcolor: `${colors.primary}40` } }}>
                            Líneas Individuales
                        </ToggleButton>
                        <ToggleButton value="sum" disabled={isHeterogeneous} sx={{ color: colors.textDim, '&.Mui-selected': { color: '#fff', bgcolor: `${colors.primary}40` } }}>
                            Suma Consolidada
                        </ToggleButton>
                    </ToggleButtonGroup>

                    <ToggleButtonGroup
                        value={timeRange}
                        exclusive
                        onChange={(_e, v) => v && setTimeRange(v)}
                        size="small"
                        sx={{ bgcolor: colors.cardBg, border: `1px solid ${colors.border}` }}
                    >
                        <ToggleButton value={15} sx={{ color: colors.textDim, '&.Mui-selected': { color: '#fff', bgcolor: `${colors.primary}40` } }}>
                            15D
                        </ToggleButton>
                        <ToggleButton value={30} sx={{ color: colors.textDim, '&.Mui-selected': { color: '#fff', bgcolor: `${colors.primary}40` } }}>
                            30D
                        </ToggleButton>
                        <ToggleButton value={60} sx={{ color: colors.textDim, '&.Mui-selected': { color: '#fff', bgcolor: `${colors.primary}40` } }}>
                            60D
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            </Box>

            {isLoading ? (
                <Spinner />
            ) : (
                <>
                    {/* KPI Cards */}
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <div style={KPI_CARD_STYLE}>
                                <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase' }}>
                                    Stock Total Seleccionado
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: colors.primary }}>
                                    {Number(kpis.totalStock || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })}
                                </Typography>
                            </div>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <div style={KPI_CARD_STYLE}>
                                <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase' }}>
                                    Consumo Diario Promedio
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: colors.info }}>
                                    {Number(kpis.avgDailyConsumption || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })}
                                </Typography>
                            </div>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <div style={KPI_CARD_STYLE}>
                                <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase' }}>
                                    Días de Cobertura
                                </Typography>
                                <Typography 
                                    variant="h4" 
                                    sx={{ 
                                        fontWeight: 800, 
                                        mt: 1, 
                                        color: kpis.coverageDays === null ? colors.textDim : kpis.coverageDays < 10 ? colors.danger : kpis.coverageDays < 20 ? colors.warning : colors.success 
                                    }}
                                >
                                    {kpis.coverageDays === null ? '—' : `${Math.round(kpis.coverageDays)} días`}
                                </Typography>
                            </div>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <div style={KPI_CARD_STYLE}>
                                <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase' }}>
                                    Materiales Críticos Seleccionados
                                </Typography>
                                <Typography 
                                    variant="h4" 
                                    sx={{ 
                                        fontWeight: 800, 
                                        mt: 1, 
                                        color: kpis.itemsAlert > 0 ? colors.danger : colors.success 
                                    }}
                                >
                                    {kpis.itemsAlert}
                                </Typography>
                            </div>
                        </Grid>
                    </Grid>

                    {/* Warning if Heterogeneous units are selected for Sum mode */}
                    {isHeterogeneous && (
                        <Box sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', p: 2, borderRadius: 2, mb: 3 }}>
                            <Typography sx={{ color: colors.danger, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                ⚠️ Advertencia de Unidades Heterogéneas
                            </Typography>
                            <Typography variant="body2" sx={{ color: colors.textDim, mt: 0.5 }}>
                                Los materiales seleccionados tienen diferentes unidades principales (por ejemplo, kg y unidades). La suma consolidada está deshabilitada para evitar distorsiones. Por favor, visualiza el gráfico mediante "Líneas Individuales".
                            </Typography>
                        </Box>
                    )}

                    {/* Chart Container */}
                    <Card style={{ padding: '24px', marginBottom: '24px' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff' }}>
                                    Evolución Histórica y Proyección de Stock
                                </Typography>
                                <Typography variant="caption" sx={{ color: colors.textDim }}>
                                    Línea sólida: Historial de stock (30 días). Línea punteada derecha: Simulación de consumo futuro (15 días).
                                </Typography>
                            </Box>

                            {selectedItemIds.length > 0 && (
                                <Box sx={{ width: 250, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700 }}>
                                        Simular Lead Time Global: {globalLeadTime} días
                                    </Typography>
                                    <Slider
                                        value={globalLeadTime}
                                        onChange={(_e, v) => setGlobalLeadTime(v as number)}
                                        min={1}
                                        max={30}
                                        size="small"
                                        valueLabelDisplay="auto"
                                        sx={{ color: colors.primary }}
                                    />
                                </Box>
                            )}
                        </Box>

                        {selectedItemIds.length === 0 ? (
                            <Box sx={{ p: 8, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 3 }}>
                                <Typography sx={{ color: colors.textDim }}>
                                    Selecciona materiales en la tabla de abajo para visualizarlos en el gráfico de sierra.
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ width: '100%', height: 400 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 10, right: 90, left: -15, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis 
                                            dataKey="date" 
                                            stroke={colors.textDim} 
                                            tick={{ fontSize: 11 }}
                                        />
                                        <YAxis 
                                            stroke={colors.textDim} 
                                            tick={{ fontSize: 11 }}
                                        />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: colors.bg, borderColor: colors.border, borderRadius: '8px', color: '#fff' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />

                                        {/* Sum mode plotting */}
                                        {viewMode === 'sum' && (
                                            <>
                                                {/* Reorder Point Reference Line */}
                                                <ReferenceLine y={chartData[0]?.totalRPoint} label={{ value: 'Punto de Pedido', fill: colors.warning, position: 'right', fontSize: 10 }} stroke={colors.warning} strokeDasharray="4 4" />
                                                {/* Min Stock Reference Line */}
                                                <ReferenceLine y={chartData[0]?.totalMin} label={{ value: 'Mínimo', fill: colors.danger, position: 'right', fontSize: 10 }} stroke={colors.danger} strokeDasharray="3 3" />
                                                {/* Max Stock Reference Line */}
                                                <ReferenceLine y={chartData[0]?.totalMax} label={{ value: 'Máximo', fill: colors.success, position: 'right', fontSize: 10 }} stroke={colors.success} strokeDasharray="3 3" />

                                                {/* Solid Line for Past Stock */}
                                                <Line
                                                    type="monotone"
                                                    dataKey="totalStock"
                                                    name="Stock Total (Real/Proyectado)"
                                                    stroke={colors.primary}
                                                    strokeWidth={2}
                                                    dot={false}
                                                />
                                            </>
                                        )}

                                        {/* Individual lines mode plotting */}
                                        {viewMode === 'individual' && items.filter((it: any) => selectedItemIds.includes(it.id)).map((item: any, idx: number) => {
                                            const itemColor = [colors.primary, colors.info, colors.warning, colors.success, colors.danger, '#a78bfa', '#f472b6', '#38bdf8'][idx % 8];
                                            return (
                                                <Line
                                                    key={item.id}
                                                    type="monotone"
                                                    dataKey={`stock_${item.id}`}
                                                    name={`${item.descripcion} (${item.unidadPrincipal})`}
                                                    stroke={itemColor}
                                                    strokeWidth={2.5}
                                                    dot={false}
                                                />
                                            );
                                        })}

                                        {/* Reference lines for individual mode when exactly 1 material is selected */}
                                        {viewMode === 'individual' && selectedItemIds.length === 1 && (
                                            <>
                                                <ReferenceLine
                                                    y={chartData[0]?.[`min_${selectedItemIds[0]}`]}
                                                    label={{ value: 'Mínimo', fill: colors.danger, position: 'right', fontSize: 10 }}
                                                    stroke={colors.danger}
                                                    strokeDasharray="3 3"
                                                />
                                                <ReferenceLine
                                                    y={chartData[0]?.[`max_${selectedItemIds[0]}`]}
                                                    label={{ value: 'Máximo', fill: colors.success, position: 'right', fontSize: 10 }}
                                                    stroke={colors.success}
                                                    strokeDasharray="3 3"
                                                />
                                                <ReferenceLine
                                                    y={chartData[0]?.[`rpoint_${selectedItemIds[0]}`]}
                                                    label={{ value: 'Punto de Pedido', fill: colors.warning, position: 'right', fontSize: 10 }}
                                                    stroke={colors.warning}
                                                    strokeDasharray="4 4"
                                                />
                                            </>
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                        )}
                    </Card>

                    {/* Materials Table with Checkbox and Inline Edit */}
                    <Card style={{ padding: '20px' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                Materiales en el Depósito
                            </Typography>
                            <Box sx={{ width: 300 }}>
                                <SearchBar 
                                    value={searchQuery} 
                                    onChange={setSearchQuery} 
                                    placeholder="Buscar por código, descripción o proveedor..." 
                                />
                            </Box>
                        </Box>

                        <Table
                            cols={[
                                <Checkbox 
                                    key="sel-all"
                                    checked={filteredItems.length > 0 && selectedItemIds.length === filteredItems.length}
                                    indeterminate={selectedItemIds.length > 0 && selectedItemIds.length < filteredItems.length}
                                    onChange={handleToggleSelectAll}
                                    sx={{ p: 0, color: 'rgba(255,255,255,0.3)', '&.Mui-checked': { color: colors.primary } }}
                                />,
                                'Código',
                                'Material',
                                'Proveedor',
                                'Stock Actual',
                                'Stock Mínimo (Editar)',
                                'Stock Máximo (Editar)',
                                'Lead Time / Entrega (días)',
                                'Unidad'
                            ]}
                            rows={filteredItems.map((item: any) => {
                                const stock = stockMap.get(item.id) || 0;
                                const isSelected = selectedItemIds.includes(item.id);
                                return [
                                    <Checkbox
                                        key={`sel-${item.id}`}
                                        checked={isSelected}
                                        onChange={() => handleToggleSelectItem(item.id)}
                                        sx={{ p: 0, color: 'rgba(255,255,255,0.3)', '&.Mui-checked': { color: colors.primary } }}
                                    />,
                                    <code key="code" style={{ color: colors.primary, fontWeight: 700 }}>{item.codigoInterno}</code>,
                                    <span key="desc" style={{ color: '#fff', fontWeight: 600 }}>{item.descripcion}</span>,
                                    <span key="prov" style={{ color: colors.textDim }}>{item.supplier?.name || '—'}</span>,
                                    <span key="stock" style={{ fontWeight: 700, color: stock < Number(item.stockMinimo || 0) ? colors.danger : colors.success }}>
                                        {Number(stock).toFixed(1)}
                                    </span>,
                                    <EditableCell
                                        key="min"
                                        value={item.stockMinimo != null ? String(item.stockMinimo) : ''}
                                        numeric
                                        onSave={(val) => handleSaveCell(item.id, 'stockMinimo', val)}
                                    />,
                                    <EditableCell
                                        key="max"
                                        value={item.stockMaximo != null ? String(item.stockMaximo) : ''}
                                        numeric
                                        onSave={(val) => handleSaveCell(item.id, 'stockMaximo', val)}
                                    />,
                                    <EditableCell
                                        key="lead"
                                        value={item.leadTime != null ? String(item.leadTime) : '7'}
                                        numeric
                                        onSave={(val) => handleSaveCell(item.id, 'leadTime', val)}
                                    />,
                                    <Badge key="unit" color={colors.secondary}>{item.unidadPrincipal}</Badge>
                                ];
                            })}
                        />
                    </Card>
                </>
            )}
        </div>
    );
}
