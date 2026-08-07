import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { useGetItemsQuery, useUpdateItemMutation } from '../../features/warehouse/materiales/api/items.api';
import { useGetStockQuery, useGetRecentMovementsQuery } from '../../features/warehouse/stock/api/stock.api';
import { useGetCombosQuery, useGetPurchaseOrdersQuery, useImportProyectadoMutation } from '../../features/purchasing/purchase-orders/api/purchase-orders.api';
import * as xlsx from 'xlsx';
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
    ToggleButtonGroup,
    Switch,
    FormControlLabel,
    Paper,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tabs,
    Tab,
    Tooltip as MuiTooltip,
    Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

// Theme colors matching dashboard
const colors = {
    primary: '#818cf8', // Indigo
    secondary: 'var(--text-mui-secondary, #475569)',
    bg: 'var(--bg-primary, #0f1117)',
    cardBg: 'var(--bg-hover-row, rgba(255,255,255,0.03))',
    border: 'rgba(255, 255, 255, 0.08)',
    text: 'var(--text-primary, #f3f4f6)',
    textDim: 'var(--text-muted, #9ca3af)',
    danger: '#f87171',
    success: '#34d399',
    warning: '#fbbf24',
    info: '#60a5fa',
    purple: '#c084fc',
    amber: '#f59e0b'
};

const KPI_CARD_STYLE = {
    background: colors.cardBg,
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center' as const,
    minHeight: '105px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
};

const normalizeUnit = (unitStr: string): string => {
    if (!unitStr) return 'unidades';
    const u = unitStr.toLowerCase().trim().replace(/\./g, '');
    if (['kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos', 'gr', 'gramos'].includes(u)) {
        return 'kg';
    }
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
    const { data: combos = [], isLoading: loadingCombos } = useGetCombosQuery(undefined);
    const { data: purchaseOrders = [], isLoading: loadingPOs } = useGetPurchaseOrdersQuery(depotId || undefined);

    // Fetch movements for the last 60 days to have enough historical depth
    const rangeStartDate = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 60);
        return d.toISOString().split('T')[0];
    }, []);

    const { data: movements = [], isLoading: loadingMovs } = useGetRecentMovementsQuery({
        depositoId: depotId || undefined,
        desde: rangeStartDate
    });

    const [updateItem] = useUpdateItemMutation();
    const [importProyectado, { isLoading: importing }] = useImportProyectadoMutation();
    const [importStatusMsg, setImportStatusMsg] = useState<string | null>(null);

    const handleImportExcelRows = async (rows: any[]) => {
        try {
            const res = await importProyectado({
                depositoId: depotId || undefined,
                rows
            }).unwrap();

            setImportStatusMsg(`✅ ¡Éxito! Se crearon ${res.createdOrders} Órdenes de Compra y ${res.createdItems} ítems.`);
        } catch (err: any) {
            console.error('Error importando compras:', err);
            setImportStatusMsg(`❌ Error al importar compras: ${err?.data?.message || err.message}`);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = xlsx.read(bstr, { type: 'binary' });
                const sheet = wb.Sheets[wb.SheetNames[0]];
                const jsonRows: any[] = xlsx.utils.sheet_to_json(sheet, { raw: false });

                const formattedRows = jsonRows.map(r => ({
                    proveedor: r['PROVEEDOR/PAIS'] || r['PROVEEDOR'] || r['Proveedor'] || 'PROVEEDOR IMPORTACION',
                    codigoInterno: r['CODIGO INTERNO'] || r['Codigo Interno'] || r['CODIGO'],
                    titulo: r['TITULO'] || r['Titulo'],
                    producto: r['PRODUCTO/INSUMO'] || r['PRODUCTO'] || r['Producto'],
                    kg: parseFloat(String(r['KG'] || r['kg'] || r['Kg'] || '0').replace(/,/g, '')),
                    arriboEstimado: r['ARRIBO ESTIMADO'] || r['ARRIBO'] || r['FECHA ARRIBO'] || r['Fecha Arribo']
                })).filter(r => r.codigoInterno && r.kg > 0 && r.arriboEstimado);

                await handleImportExcelRows(formattedRows);
            } catch (err) {
                console.error('Error leyendo archivo excel:', err);
            }
        };
        reader.readAsBinaryString(file);
    };

    const loadProyectadoComprasDefault = async () => {
        const defaultRows = [
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-negro", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Black 8DY50903", kg: 14800, arriboEstimado: "2026-10-15" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-blanco", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Optical White 0DY54720", kg: 7400, arriboEstimado: "2026-10-15" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-negro", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Black 8DY50903", kg: 7400, arriboEstimado: "2026-10-15" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-blanco", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Optical White 0DY54720", kg: 14800, arriboEstimado: "2026-11-11" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-negro", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Black 8DY50903", kg: 14800, arriboEstimado: "2026-11-22" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-blanco", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Optical White 0DY54720", kg: 14800, arriboEstimado: "2026-11-30" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-negro", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Black 8DY50903", kg: 14800, arriboEstimado: "2026-12-09" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-blanco", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Optical White 0DY54720", kg: 7400, arriboEstimado: "2026-12-19" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-negro", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Black 8DY50903", kg: 7400, arriboEstimado: "2026-12-19" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-negro", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Black 8DY50903", kg: 14800, arriboEstimado: "2026-12-29" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-blanco", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Optical White 0DY54720", kg: 14800, arriboEstimado: "2026-01-03" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-negro", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Black 8DY50903", kg: 14800, arriboEstimado: "2026-01-28" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-blanco", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Optical White 0DY54720", kg: 14800, arriboEstimado: "2026-02-02" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-blanco", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Optical White 0DY54720", kg: 14800, arriboEstimado: "2026-02-23" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-negro", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Black 8DY50903", kg: 14800, arriboEstimado: "2026-02-23" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-blanco", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Optical White 0DY54720", kg: 7400, arriboEstimado: "2026-02-23" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1KC-negro", titulo: "ALGODON 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Black 8DY50903", kg: 7400, arriboEstimado: "2026-02-23" },
            { proveedor: "WINSOME - KCTEX", codigoInterno: "A16/1BG-melange5%", titulo: "MELANGE 16/1 5%", producto: "95% cotton + 5% black polyester melange yarn ne 16/1", kg: 19800, arriboEstimado: "2026-11-24" },
            { proveedor: "SAO JOAO", codigoInterno: "A16/1SJ-blanco", titulo: "ALGODÓN 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Optical White 0DY54720", kg: 9000, arriboEstimado: "2026-09-15" },
            { proveedor: "SAO JOAO", codigoInterno: "A16/1SJ-negro", titulo: "ALGODÓN 16/1", producto: "Ne 16/1 100% Cotton Carded BCI Black 8DY50903", kg: 9000, arriboEstimado: "2026-09-15" }
        ];
        await handleImportExcelRows(defaultRows);
    };

    // Controls & Selection States
    const [selectionCategory, setSelectionCategory] = useState<'items' | 'combos'>('items');
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [selectedComboIds, setSelectedComboIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'individual' | 'sum'>('individual');
    const [timeRange, setTimeRange] = useState<number>(30); // Historical 15, 30, 60 days
    const [futureHorizon, setFutureHorizon] = useState<number>(45); // Future projection 30, 45, 60, 90 days
    const [globalLeadTime, setGlobalLeadTime] = useState<number>(7);
    const [simulateAutoReorder, setSimulateAutoReorder] = useState<boolean>(true);
    const [includeIncomingPOs, setIncludeIncomingPOs] = useState<boolean>(true);

    // Modal state for viewing combo breakdown
    const [activeComboDetail, setActiveComboDetail] = useState<any | null>(null);

    // Aggregate current stock per item
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

    // Pending Purchase Orders per item
    const pendingPOsMap = useMemo(() => {
        const map = new Map<string, Array<{ id: string; numero: string; qty: number; expectedDate: string; supplierName: string }>>();
        
        purchaseOrders.forEach((po: any) => {
            if (['CANCELADO', 'RECIBIDO'].includes(po.estado)) return;
            const expectedDate = po.fechaEntregaEsperada ? po.fechaEntregaEsperada.substring(0, 10) : '';
            if (!expectedDate) return;

            const supplierName = po.supplier?.name || po.proveedorNombre || 'Proveedor';
            const lines = po.lines || po.detalles || [];

            lines.forEach((line: any) => {
                const itemId = line.itemId;
                if (!itemId) return;
                const qtyPending = Number(line.qtyPrincipal || line.cantidad || 0) - Number(line.qtyRecibida || 0);
                if (qtyPending <= 0) return;

                if (!map.has(itemId)) map.set(itemId, []);
                map.get(itemId)!.push({
                    id: po.id,
                    numero: po.numero || `PO-${po.id.substring(0, 5)}`,
                    qty: qtyPending,
                    expectedDate,
                    supplierName
                });
            });
        });
        return map;
    }, [purchaseOrders]);

    // Active items derived from selection (Items mode vs Combos mode)
    const activeSelectedItems = useMemo(() => {
        if (selectionCategory === 'items') {
            return items.filter((it: any) => selectedItemIds.includes(it.id));
        } else {
            // Combos mode: extract all item IDs belonging to selected combos
            const selectedCombosList = combos.filter((c: any) => selectedComboIds.includes(c.id));
            const comboItemIds = Array.from(new Set(selectedCombosList.flatMap((c: any) => c.itemIds || [])));
            return items.filter((it: any) => comboItemIds.includes(it.id));
        }
    }, [selectionCategory, selectedItemIds, selectedComboIds, items, combos]);

    // Filter items and combos based on search query
    const filteredItems = useMemo(() => {
        return items.filter((item: any) => {
            return searchQuery === '' || 
                item.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.codigoInterno.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.supplier?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [items, searchQuery]);

    const filteredCombos = useMemo(() => {
        return combos.filter((combo: any) => {
            return searchQuery === '' || 
                combo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (combo.supplier?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [combos, searchQuery]);

    // Auto-select defaults on initial load
    useEffect(() => {
        if (items.length > 0 && selectedItemIds.length === 0) {
            setSelectedItemIds(items.slice(0, 3).map((it: any) => it.id));
        }
    }, [items]);

    useEffect(() => {
        if (combos.length > 0 && selectedComboIds.length === 0) {
            setSelectedComboIds([combos[0].id]);
        }
    }, [combos]);

    // Check if active selected items have heterogeneous units
    const isHeterogeneous = useMemo(() => {
        if (activeSelectedItems.length <= 1) return false;
        const firstUnitNormalized = normalizeUnit(activeSelectedItems[0]?.unidadPrincipal);
        return activeSelectedItems.some((it: any) => normalizeUnit(it.unidadPrincipal) !== firstUnitNormalized);
    }, [activeSelectedItems]);

    // Auto switch to individual if units are mixed
    useEffect(() => {
        if (isHeterogeneous && viewMode === 'sum') {
            setViewMode('individual');
        }
    }, [isHeterogeneous, viewMode]);

    // --- SAWTOOTH ENGINE (HISTORICAL & PROJECTION SIMULATION) ---
    const { chartData, kpis, comboBreakdownMap } = useMemo(() => {
        if (activeSelectedItems.length === 0) {
            return { 
                chartData: [], 
                kpis: { totalStock: 0, avgDailyConsumption: 0, coverageDays: 0, itemsAlert: 0, avgLeadTime: 7, totalIncomingPOs: 0 },
                comboBreakdownMap: {}
            };
        }

        // 1. Setup Historical Date Axis (Past timeRange days)
        const pastDatesArray: string[] = [];
        for (let i = timeRange; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            pastDatesArray.push(d.toISOString().split('T')[0]);
        }

        // 2. Compute historical daily consumption and stock levels going backwards per item
        const itemStockHistory: Record<string, Record<string, number>> = {};
        const dailyConsumptionMap: Record<string, number> = {};

        activeSelectedItems.forEach((item: any) => {
            const currentStock = stockMap.get(item.id) || 0;
            itemStockHistory[item.id] = {};

            // Sort movements newest to oldest
            const itemMovs = movements
                .filter((m: any) => m.itemId === item.id && m.status !== 'ANULADO')
                .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

            // Compute consumption in last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const totalOut30d = itemMovs
                .filter((m: any) => new Date(m.fecha) >= thirtyDaysAgo && ['REMITO_SALIDA', 'AJUSTE_RESTA', 'ANULACION_AJUSTE_SUMA', 'ANULACION_ENTRADA'].includes(m.tipo))
                .reduce((sum: number, m: any) => sum + Number(m.qtyPrincipal || 0), 0);

            dailyConsumptionMap[item.id] = totalOut30d / 30;

            // Map movements by date
            const movsByDate: Record<string, any[]> = {};
            itemMovs.forEach((m: any) => {
                const datePart = m.fecha ? m.fecha.substring(0, 10) : '';
                if (datePart) {
                    if (!movsByDate[datePart]) movsByDate[datePart] = [];
                    movsByDate[datePart].push(m);
                }
            });

            // Reconstruct past stock backwards from current stock
            let tempStock = currentStock;
            for (let i = pastDatesArray.length - 1; i >= 0; i--) {
                const dateStr = pastDatesArray[i];
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

                tempStock = Math.max(0, tempStock - entrances + departures);
            }
        });

        // 3. Perform Future Sawtooth Simulation per Item
        const futureDatesArray: string[] = [];
        const itemFutureStock: Record<string, Record<string, { stock: number; event?: string }>> = {};
        const todayStr = new Date().toISOString().split('T')[0];

        activeSelectedItems.forEach((item: any) => {
            itemFutureStock[item.id] = {};
            let simulatedStock = stockMap.get(item.id) || 0;
            const consumption = dailyConsumptionMap[item.id] || 0;
            const leadTimeVal = item.leadTime ?? globalLeadTime;
            const minStock = Number(item.stockMinimo || 0);
            const maxStock = Number(item.stockMaximo || 0);
            const rPoint = minStock + (consumption * leadTimeVal);
            const batchQ = Math.max(maxStock - minStock, consumption * 30, 50);

            // Queue for pending simulated orders: array of { arrivalDateStr, qty }
            const pendingSimulatedOrders: Array<{ arrivalDateStr: string; qty: number }> = [];

            for (let dayIdx = 1; dayIdx <= futureHorizon; dayIdx++) {
                const d = new Date();
                d.setDate(d.getDate() + dayIdx);
                const dateStr = d.toISOString().split('T')[0];
                if (!futureDatesArray.includes(dateStr)) futureDatesArray.push(dateStr);

                let dayEvent: string | undefined = undefined;

                // 1) Consume daily stock
                simulatedStock = Math.max(0, simulatedStock - consumption);

                // 2) Check if real pending PO arrives today
                if (includeIncomingPOs) {
                    const posToday = pendingPOsMap.get(item.id)?.filter(p => p.expectedDate === dateStr) || [];
                    if (posToday.length > 0) {
                        const addedQty = posToday.reduce((s, p) => s + p.qty, 0);
                        simulatedStock += addedQty;
                        dayEvent = `Ingreso OC Real (+${Math.round(addedQty)})`;
                    }
                }

                // 3) Check if simulated order arrives today
                const simulatedArrivals = pendingSimulatedOrders.filter(o => o.arrivalDateStr === dateStr);
                if (simulatedArrivals.length > 0) {
                    const arrivedQty = simulatedArrivals.reduce((s, o) => s + o.qty, 0);
                    simulatedStock += arrivedQty;
                    dayEvent = dayEvent ? `${dayEvent} + Reabastecimiento Sim. (+${Math.round(arrivedQty)})` : `Reabastecimiento Sim. (+${Math.round(arrivedQty)})`;
                }

                // 4) Check if stock triggered Reorder Point (ROP) today and simulate placing PO
                if (simulateAutoReorder && simulatedStock <= rPoint) {
                    // Calculate arrival date (today + leadTimeVal)
                    const arrivalDate = new Date(d);
                    arrivalDate.setDate(arrivalDate.getDate() + leadTimeVal);
                    const arrDateStr = arrivalDate.toISOString().split('T')[0];

                    // Avoid duplicate order triggers for the exact same date
                    const exists = pendingSimulatedOrders.some(o => o.arrivalDateStr === arrDateStr);
                    if (!exists) {
                        pendingSimulatedOrders.push({ arrivalDateStr: arrDateStr, qty: batchQ });
                        if (!dayEvent) dayEvent = `Punto de Pedido Alcanzado (Disparo OC)`;
                    }
                }

                itemFutureStock[item.id][dateStr] = {
                    stock: Number(simulatedStock.toFixed(1)),
                    event: dayEvent
                };
            }
        });

        // 4. Compile Combined Timeline (Past + Future)
        const compiledData: any[] = [];
        const allTimelineDates = [...pastDatesArray, ...futureDatesArray];

        allTimelineDates.forEach((dateStr) => {
            const isProjection = dateStr > todayStr;
            const dObj = new Date(dateStr + 'T12:00:00');
            const displayDate = dObj.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

            const entry: any = {
                date: displayDate,
                formattedDate: dateStr,
                isProjection
            };

            // Per Item metrics
            activeSelectedItems.forEach((item: any) => {
                let stockVal = 0;
                if (!isProjection) {
                    stockVal = itemStockHistory[item.id]?.[dateStr] ?? 0;
                } else {
                    stockVal = itemFutureStock[item.id]?.[dateStr]?.stock ?? 0;
                    if (itemFutureStock[item.id]?.[dateStr]?.event) {
                        entry[`event_${item.id}`] = itemFutureStock[item.id][dateStr].event;
                    }
                }

                entry[`stock_${item.id}`] = Number(stockVal.toFixed(1));
                entry[`min_${item.id}`] = Number(Number(item.stockMinimo || 0).toFixed(1));
                entry[`max_${item.id}`] = Number(Number(item.stockMaximo || 0).toFixed(1));

                const leadTimeValue = item.leadTime ?? globalLeadTime;
                const rPoint = Number(item.stockMinimo || 0) + (dailyConsumptionMap[item.id] || 0) * leadTimeValue;
                entry[`rpoint_${item.id}`] = Number(Number(rPoint).toFixed(1));
            });

            // Per Combo metrics (if in Combos Mode)
            if (selectionCategory === 'combos') {
                combos.filter((c: any) => selectedComboIds.includes(c.id)).forEach((combo: any) => {
                    const comboItems = activeSelectedItems.filter((it: any) => (combo.itemIds || []).includes(it.id));
                    const comboStock = comboItems.reduce((sum: number, it: any) => sum + (entry[`stock_${it.id}`] || 0), 0);
                    const comboMin = comboItems.reduce((sum: number, it: any) => sum + Number(it.stockMinimo || 0), 0);
                    const comboMax = comboItems.reduce((sum: number, it: any) => sum + Number(it.stockMaximo || 0), 0);
                    const comboRPoint = comboItems.reduce((sum: number, it: any) => sum + (entry[`rpoint_${it.id}`] || 0), 0);

                    entry[`combo_stock_${combo.id}`] = Number(comboStock.toFixed(1));
                    entry[`combo_min_${combo.id}`] = Number(comboMin.toFixed(1));
                    entry[`combo_max_${combo.id}`] = Number(comboMax.toFixed(1));
                    entry[`combo_rpoint_${combo.id}`] = Number(comboRPoint.toFixed(1));
                });
            }

            // Consolidated Totals (for Sum Mode)
            if (viewMode === 'sum') {
                entry.totalStock = Number(activeSelectedItems.reduce((sum, item) => sum + (entry[`stock_${item.id}`] || 0), 0).toFixed(1));
                entry.totalMin = Number(activeSelectedItems.reduce((sum, item) => sum + (entry[`min_${item.id}`] || 0), 0).toFixed(1));
                entry.totalMax = Number(activeSelectedItems.reduce((sum, item) => sum + (entry[`max_${item.id}`] || 0), 0).toFixed(1));
                entry.totalRPoint = Number(activeSelectedItems.reduce((sum, item) => sum + (entry[`rpoint_${item.id}`] || 0), 0).toFixed(1));
            }

            compiledData.push(entry);
        });

        // 5. KPIs Calculation
        const totalStock = activeSelectedItems.reduce((sum, item) => sum + (stockMap.get(item.id) || 0), 0);
        const combinedConsumption = activeSelectedItems.reduce((sum, item) => sum + (dailyConsumptionMap[item.id] || 0), 0);
        const coverageDays = combinedConsumption > 0 ? totalStock / combinedConsumption : null;

        let itemsAlert = 0;
        activeSelectedItems.forEach((item: any) => {
            const actual = stockMap.get(item.id) || 0;
            const min = Number(item.stockMinimo || 0);
            if (actual < min) itemsAlert++;
        });

        const avgLeadTime = activeSelectedItems.reduce((sum, item) => sum + (item.leadTime ?? globalLeadTime), 0) / activeSelectedItems.length;

        let totalIncomingPOs = 0;
        activeSelectedItems.forEach((item: any) => {
            const pos = pendingPOsMap.get(item.id) || [];
            totalIncomingPOs += pos.reduce((s, p) => s + p.qty, 0);
        });

        // Compute Breakdown data map per combo for modal/cards
        const comboBreakdowns: Record<string, any> = {};
        combos.forEach((combo: any) => {
            const cItems = items.filter((it: any) => (combo.itemIds || []).includes(it.id));
            const cStock = cItems.reduce((s: number, it: any) => s + (stockMap.get(it.id) || 0), 0);
            const cConsumption = cItems.reduce((s: number, it: any) => s + (dailyConsumptionMap[it.id] || 0), 0);
            const cMin = cItems.reduce((s: number, it: any) => s + Number(it.stockMinimo || 0), 0);
            const cMax = cItems.reduce((s: number, it: any) => s + Number(it.stockMaximo || 0), 0);
            const cCoverage = cConsumption > 0 ? cStock / cConsumption : null;

            comboBreakdowns[combo.id] = {
                title: combo.title,
                items: cItems,
                stockTotal: cStock,
                dailyConsumption: cConsumption,
                stockMinimo: cMin,
                stockMaximo: cMax,
                daysOfSupply: cCoverage,
                unit: cItems[0]?.unidadPrincipal || 'unidades'
            };
        });

        return {
            chartData: compiledData,
            kpis: {
                totalStock,
                avgDailyConsumption: combinedConsumption,
                coverageDays,
                itemsAlert,
                avgLeadTime,
                totalIncomingPOs
            },
            comboBreakdownMap: comboBreakdowns
        };
    }, [
        activeSelectedItems, 
        stockMap, 
        movements, 
        timeRange, 
        futureHorizon, 
        globalLeadTime, 
        simulateAutoReorder, 
        includeIncomingPOs, 
        pendingPOsMap, 
        selectionCategory, 
        selectedComboIds, 
        combos, 
        viewMode, 
        items
    ]);

    // Item Selection Toggle Handlers
    const handleToggleSelectAllItems = () => {
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

    // Combo Selection Toggle Handlers
    const handleToggleSelectAllCombos = () => {
        if (selectedComboIds.length === filteredCombos.length) {
            setSelectedComboIds([]);
        } else {
            setSelectedComboIds(filteredCombos.map(c => c.id));
        }
    };

    const handleToggleSelectCombo = (id: string) => {
        setSelectedComboIds(prev => 
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
            console.error('Error guardando celda:', err);
        }
    };

    const isLoading = loadingItems || loadingStock || loadingMovs || loadingCombos || loadingPOs;

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: colors.text }}>
            <PageHeader 
                title="📈 Gráfico de Sierra (Diente de Sierra)" 
                subtitle="Simulador de nivel de inventario, consumo diario, puntos de pedido y reabastecimiento"
            />

            {/* Import Excel Banner / Action Controls */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', bgcolor: 'rgba(129, 140, 248, 0.08)', p: 2, borderRadius: 3, border: `1px solid rgba(129, 140, 248, 0.2)` }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: colors.primary, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalShippingIcon fontSize="small" /> Cargar Datos Reales de Importación desde Excel:
                </Typography>

                <Button
                    variant="contained"
                    size="small"
                    disabled={importing}
                    onClick={loadProyectadoComprasDefault}
                    sx={{ bgcolor: colors.primary, color: '#fff', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                    ⚡ Cargar 'PROYECTADO DE COMPRAS.xlsx' (20 Importaciones)
                </Button>

                <Button
                    variant="outlined"
                    size="small"
                    component="label"
                    disabled={importing}
                    sx={{ color: colors.text, borderColor: colors.border, textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                    📁 Seleccionar otro archivo Excel
                    <input type="file" hidden accept=".xlsx, .xls" onChange={handleFileUpload} />
                </Button>

                {importStatusMsg && (
                    <Chip 
                        label={importStatusMsg} 
                        onDelete={() => setImportStatusMsg(null)}
                        sx={{ bgcolor: colors.cardBg, color: colors.text, fontWeight: 700, ml: 'auto' }} 
                    />
                )}
            </Box>

            {/* Main Mode & Warehouse Bar */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center', bgcolor: colors.cardBg, p: 2, borderRadius: 3, border: `1px solid ${colors.border}` }}>
                {/* Mode Selector */}
                <Tabs
                    value={selectionCategory}
                    onChange={(_e, val) => setSelectionCategory(val)}
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{
                        '& .MuiTab-root': { color: colors.textDim, fontWeight: 700, textTransform: 'none', fontSize: '0.95rem' },
                        '& .Mui-selected': { color: colors.primary }
                    }}
                >
                    <Tab label="📦 Por Material / Ítem" value="items" />
                    <Tab label="🏷️ Por Grupos / Combos de Compras" value="combos" />
                </Tabs>

                {/* Warehouse Dropdown */}
                <TextField
                    select
                    label="Depósito"
                    size="small"
                    value={depotId}
                    onChange={(e) => setDepotId(e.target.value)}
                    disabled={!isAdmin && depots.length <= 1}
                    sx={{
                        minWidth: 180,
                        ml: 'auto',
                        '& .MuiSelect-select': { color: 'var(--text-white-dynamic, white)' },
                        '& .MuiInputLabel-root': { color: colors.textDim },
                        '& .MuiOutlinedInput-root': {
                            bgcolor: colors.bg,
                            borderRadius: 2,
                            '& fieldset': { borderColor: colors.border }
                        }
                    }}
                    SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: colors.bg, color: colors.text } } } }}
                >
                    {depots.map((d: any) => (
                        <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
                    ))}
                </TextField>

                {/* View Mode Toggle */}
                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_e, v) => v && setViewMode(v)}
                    size="small"
                    sx={{ bgcolor: colors.bg, border: `1px solid ${colors.border}` }}
                >
                    <ToggleButton value="individual" sx={{ color: colors.textDim, '&.Mui-selected': { color: '#fff', bgcolor: `${colors.primary}40` } }}>
                        Líneas Individuales
                    </ToggleButton>
                    <ToggleButton value="sum" disabled={isHeterogeneous} sx={{ color: colors.textDim, '&.Mui-selected': { color: '#fff', bgcolor: `${colors.primary}40` } }}>
                        Suma Consolidada
                    </ToggleButton>
                </ToggleButtonGroup>

                {/* Time Range Pickers */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700 }}>Histórico:</Typography>
                    <ToggleButtonGroup
                        value={timeRange}
                        exclusive
                        onChange={(_e, v) => v && setTimeRange(v)}
                        size="small"
                        sx={{ bgcolor: colors.bg, border: `1px solid ${colors.border}` }}
                    >
                        <ToggleButton value={15} sx={{ color: colors.textDim, '&.Mui-selected': { color: '#fff', bgcolor: `${colors.primary}40` } }}>15D</ToggleButton>
                        <ToggleButton value={30} sx={{ color: colors.textDim, '&.Mui-selected': { color: '#fff', bgcolor: `${colors.primary}40` } }}>30D</ToggleButton>
                        <ToggleButton value={60} sx={{ color: colors.textDim, '&.Mui-selected': { color: '#fff', bgcolor: `${colors.primary}40` } }}>60D</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700 }}>Proyección:</Typography>
                    <ToggleButtonGroup
                        value={futureHorizon}
                        exclusive
                        onChange={(_e, v) => v && setFutureHorizon(v)}
                        size="small"
                        sx={{ bgcolor: colors.bg, border: `1px solid ${colors.border}` }}
                    >
                        <ToggleButton value={30} sx={{ color: colors.textDim, '&.Mui-selected': { color: '#fff', bgcolor: `${colors.primary}40` } }}>+30D</ToggleButton>
                        <ToggleButton value={45} sx={{ color: colors.textDim, '&.Mui-selected': { color: '#fff', bgcolor: `${colors.primary}40` } }}>+45D</ToggleButton>
                        <ToggleButton value={90} sx={{ color: colors.textDim, '&.Mui-selected': { color: '#fff', bgcolor: `${colors.primary}40` } }}>+90D</ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            </Box>

            {isLoading ? (
                <Spinner />
            ) : (
                <>
                    {/* KPI Cards */}
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                            <div style={KPI_CARD_STYLE}>
                                <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase' }}>
                                    Stock Total Activo
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: colors.primary }}>
                                    {Number(kpis.totalStock || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })}
                                </Typography>
                            </div>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                            <div style={KPI_CARD_STYLE}>
                                <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase' }}>
                                    Consumo Diario Promedio
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: colors.info }}>
                                    {Number(kpis.avgDailyConsumption || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })} / día
                                </Typography>
                            </div>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                            <div style={KPI_CARD_STYLE}>
                                <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase' }}>
                                    Días de Cobertura
                                </Typography>
                                <Typography 
                                    variant="h5" 
                                    sx={{ 
                                        fontWeight: 800, 
                                        mt: 0.5, 
                                        color: kpis.coverageDays === null ? colors.textDim : kpis.coverageDays < 10 ? colors.danger : kpis.coverageDays < 20 ? colors.warning : colors.success 
                                    }}
                                >
                                    {kpis.coverageDays === null ? '—' : `${Math.round(kpis.coverageDays)} días`}
                                </Typography>
                            </div>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                            <div style={KPI_CARD_STYLE}>
                                <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase' }}>
                                    Materiales en Alerta
                                </Typography>
                                <Typography 
                                    variant="h5" 
                                    sx={{ 
                                        fontWeight: 800, 
                                        mt: 0.5, 
                                        color: kpis.itemsAlert > 0 ? colors.danger : colors.success 
                                    }}
                                >
                                    {kpis.itemsAlert} bajo mínimo
                                </Typography>
                            </div>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                            <div style={KPI_CARD_STYLE}>
                                <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase' }}>
                                    OCs Confirmadas en Camino
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: colors.purple }}>
                                    +{Number(kpis.totalIncomingPOs || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                </Typography>
                            </div>
                        </Grid>
                    </Grid>

                    {/* Heterogeneous warning if applicable */}
                    {isHeterogeneous && (
                        <Box sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', p: 2, borderRadius: 2, mb: 3 }}>
                            <Typography sx={{ color: colors.danger, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                ⚠️ Advertencia de Unidades Heterogéneas
                            </Typography>
                            <Typography variant="body2" sx={{ color: colors.textDim, mt: 0.5 }}>
                                Los elementos seleccionados combinan distintas unidades (ej: kg y unidades). La suma consolidada se ha cambiado a "Líneas Individuales" para evitar acumulaciones irreales.
                            </Typography>
                        </Box>
                    )}

                    {/* Main Chart Container */}
                    <Card style={{ padding: '24px', marginBottom: '24px' }}>
                        {/* Simulation Controls Toolbar */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-white-dynamic, #fff)' }}>
                                    Evolución y Simulación Diente de Sierra
                                </Typography>
                                <Typography variant="caption" sx={{ color: colors.textDim }}>
                                    Visualización de consumo histórico (izq.) y simulación de ciclos de reabastecimiento futuro (der.)
                                </Typography>
                            </Box>

                            {/* Interactive Simulation Switches */}
                            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={simulateAutoReorder}
                                            onChange={(e) => setSimulateAutoReorder(e.target.checked)}
                                            size="small"
                                            color="primary"
                                        />
                                    }
                                    label={
                                        <Typography variant="caption" sx={{ color: colors.text, fontWeight: 700 }}>
                                            🔄 Simular Reabastecimiento Automático (Sierra)
                                        </Typography>
                                    }
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={includeIncomingPOs}
                                            onChange={(e) => setIncludeIncomingPOs(e.target.checked)}
                                            size="small"
                                            color="secondary"
                                        />
                                    }
                                    label={
                                        <Typography variant="caption" sx={{ color: colors.text, fontWeight: 700 }}>
                                            🚚 Incluir OCs Reales en Camino
                                        </Typography>
                                    }
                                />

                                {activeSelectedItems.length > 0 && (
                                    <Box sx={{ width: 220, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700 }}>
                                            Lead Time Global: {globalLeadTime} días
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
                        </Box>

                        {/* Sawtooth Recharts Chart */}
                        {activeSelectedItems.length === 0 ? (
                            <Box sx={{ p: 8, textAlign: 'center', border: '1px dashed var(--border-dynamic-transparent, rgba(255,255,255,0.1))', borderRadius: 3 }}>
                                <Typography sx={{ color: colors.textDim }}>
                                    Selecciona materiales o combos en la tabla inferior para generar el gráfico de sierra.
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ width: '100%', height: 420 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 10, right: 90, left: -15, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-action-btn, rgba(255,255,255,0.05))" />
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
                                            content={({ active, payload, label }) => {
                                                if (!active || !payload || !payload.length) return null;
                                                const dataPoint = payload[0]?.payload;
                                                return (
                                                    <Paper sx={{ p: 2, bgcolor: colors.bg, border: `1px solid ${colors.border}`, color: '#fff', borderRadius: 2 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.primary }}>
                                                            {label} {dataPoint?.isProjection ? '(Proyección Simulación)' : '(Histórico Real)'}
                                                        </Typography>
                                                        <Divider sx={{ my: 1, borderColor: colors.border }} />
                                                        {payload.map((p: any, idx: number) => (
                                                            <Typography key={idx} variant="body2" sx={{ color: p.color, fontWeight: 600 }}>
                                                                {p.name}: {Number(p.value).toLocaleString('es-AR')}
                                                            </Typography>
                                                        ))}
                                                        {dataPoint && Object.keys(dataPoint).some(k => k.startsWith('event_')) && (
                                                            <Box sx={{ mt: 1, pt: 1, borderTop: `1px dashed ${colors.border}` }}>
                                                                {Object.keys(dataPoint).filter(k => k.startsWith('event_')).map(k => (
                                                                    <Chip 
                                                                        key={k} 
                                                                        label={dataPoint[k]} 
                                                                        size="small" 
                                                                        sx={{ bgcolor: `${colors.warning}25`, color: colors.warning, fontWeight: 700, fontSize: '0.7rem', mt: 0.5 }} 
                                                                    />
                                                                ))}
                                                            </Box>
                                                        )}
                                                    </Paper>
                                                );
                                            }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />

                                        {/* Sum mode plotting */}
                                        {viewMode === 'sum' && (
                                            <>
                                                <ReferenceLine y={chartData[0]?.totalRPoint} label={{ value: 'Punto de Pedido (ROP)', fill: colors.warning, position: 'right', fontSize: 10 }} stroke={colors.warning} strokeDasharray="4 4" />
                                                <ReferenceLine y={chartData[0]?.totalMin} label={{ value: 'Stock Mínimo (Seguridad)', fill: colors.danger, position: 'right', fontSize: 10 }} stroke={colors.danger} strokeDasharray="3 3" />
                                                <ReferenceLine y={chartData[0]?.totalMax} label={{ value: 'Stock Máximo', fill: colors.success, position: 'right', fontSize: 10 }} stroke={colors.success} strokeDasharray="3 3" />

                                                <Line
                                                    type="monotone"
                                                    dataKey="totalStock"
                                                    name="Stock Total (Sierra)"
                                                    stroke={colors.primary}
                                                    strokeWidth={3}
                                                    dot={false}
                                                />
                                            </>
                                        )}

                                        {/* Combos Mode Plotting */}
                                        {selectionCategory === 'combos' && viewMode === 'individual' && combos.filter((c: any) => selectedComboIds.includes(c.id)).map((combo: any, idx: number) => {
                                            const comboColor = [colors.primary, colors.info, colors.warning, colors.success, colors.purple, colors.amber][idx % 6];
                                            return (
                                                <Line
                                                    key={combo.id}
                                                    type="monotone"
                                                    dataKey={`combo_stock_${combo.id}`}
                                                    name={`Grupo: ${combo.title}`}
                                                    stroke={comboColor}
                                                    strokeWidth={3}
                                                    dot={false}
                                                />
                                            );
                                        })}

                                        {/* Individual Items Mode Plotting */}
                                        {selectionCategory === 'items' && viewMode === 'individual' && activeSelectedItems.map((item: any, idx: number) => {
                                            const itemColor = [colors.primary, colors.info, colors.warning, colors.success, colors.danger, colors.purple, '#f472b6', '#38bdf8'][idx % 8];
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

                                        {/* Reference Lines for single selection */}
                                        {viewMode === 'individual' && selectionCategory === 'items' && activeSelectedItems.length === 1 && (
                                            <>
                                                <ReferenceLine
                                                    y={chartData[0]?.[`min_${activeSelectedItems[0].id}`]}
                                                    label={{ value: 'Stock Mínimo', fill: colors.danger, position: 'right', fontSize: 10 }}
                                                    stroke={colors.danger}
                                                    strokeDasharray="3 3"
                                                />
                                                <ReferenceLine
                                                    y={chartData[0]?.[`max_${activeSelectedItems[0].id}`]}
                                                    label={{ value: 'Stock Máximo', fill: colors.success, position: 'right', fontSize: 10 }}
                                                    stroke={colors.success}
                                                    strokeDasharray="3 3"
                                                />
                                                <ReferenceLine
                                                    y={chartData[0]?.[`rpoint_${activeSelectedItems[0].id}`]}
                                                    label={{ value: 'Punto de Pedido (ROP)', fill: colors.warning, position: 'right', fontSize: 10 }}
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

                    {/* Selector Table / Grid based on Selection Category */}
                    {selectionCategory === 'combos' ? (
                        /* COMBOS SELECTOR TABLE & CARDS */
                        <Card style={{ padding: '20px' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                    Grupos / Combos de Compras Configurados
                                </Typography>
                                <Box sx={{ width: 300 }}>
                                    <SearchBar 
                                        value={searchQuery} 
                                        onChange={setSearchQuery} 
                                        placeholder="Buscar grupo o proveedor..." 
                                    />
                                </Box>
                            </Box>

                            <Table
                                cols={[
                                    <Checkbox 
                                        key="sel-all-c"
                                        checked={filteredCombos.length > 0 && selectedComboIds.length === filteredCombos.length}
                                        indeterminate={selectedComboIds.length > 0 && selectedComboIds.length < filteredCombos.length}
                                        onChange={handleToggleSelectAllCombos}
                                        sx={{ p: 0, color: 'rgba(255,255,255,0.3)', '&.Mui-checked': { color: colors.primary } }}
                                    />,
                                    'Nombre del Grupo',
                                    'Materiales Integrantes',
                                    'Stock Consolidado',
                                    'Consumo Diario',
                                    'Días de Cobertura',
                                    'OCs en Camino',
                                    'Acciones'
                                ]}
                                rows={filteredCombos.map((combo: any) => {
                                    const isSelected = selectedComboIds.includes(combo.id);
                                    const bd = comboBreakdownMap[combo.id] || {};
                                    const incomingForCombo = (combo.itemIds || []).reduce((sum: number, itId: string) => {
                                        const pos = pendingPOsMap.get(itId) || [];
                                        return sum + pos.reduce((s, p) => s + p.qty, 0);
                                    }, 0);

                                    return [
                                        <Checkbox
                                            key={`sel-c-${combo.id}`}
                                            checked={isSelected}
                                            onChange={() => handleToggleSelectCombo(combo.id)}
                                            sx={{ p: 0, color: 'rgba(255,255,255,0.3)', '&.Mui-checked': { color: colors.primary } }}
                                        />,
                                        <Box key="t">
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>
                                                {combo.title}
                                            </Typography>
                                            {combo.supplier?.name && (
                                                <Typography variant="caption" sx={{ color: colors.textDim }}>
                                                    {combo.supplier.name}
                                                </Typography>
                                            )}
                                        </Box>,
                                        <Badge key="cnt" color={colors.secondary}>
                                            {(combo.itemIds || []).length} materiales
                                        </Badge>,
                                        <span key="st" style={{ fontWeight: 700, color: colors.primary }}>
                                            {Number(bd.stockTotal || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })} {bd.unit}
                                        </span>,
                                        <span key="cons" style={{ color: colors.textDim }}>
                                            {Number(bd.dailyConsumption || 0).toFixed(1)} / día
                                        </span>,
                                        <Badge 
                                            key="cov" 
                                            color={bd.daysOfSupply === null ? colors.secondary : bd.daysOfSupply < 10 ? colors.danger : bd.daysOfSupply < 20 ? colors.warning : colors.success}
                                        >
                                            {bd.daysOfSupply === null ? '—' : `${Math.round(bd.daysOfSupply)} días`}
                                        </Badge>,
                                        incomingForCombo > 0 ? (
                                            <Chip 
                                                key="inc" 
                                                label={`+${Math.round(incomingForCombo)}`} 
                                                size="small" 
                                                sx={{ bgcolor: `${colors.purple}25`, color: colors.purple, fontWeight: 700 }} 
                                            />
                                        ) : (
                                            <span key="inc" style={{ color: colors.textDim }}>—</span>
                                        ),
                                        <Button
                                            key="act"
                                            size="small"
                                            variant="outlined"
                                            startIcon={<VisibilityIcon />}
                                            onClick={() => setActiveComboDetail(combo)}
                                            sx={{ color: colors.primary, borderColor: colors.border, textTransform: 'none', borderRadius: 2 }}
                                        >
                                            Ver Desglose
                                        </Button>
                                    ];
                                })}
                            />
                        </Card>
                    ) : (
                        /* MATERIALS ITEMS TABLE */
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
                                        onChange={handleToggleSelectAllItems}
                                        sx={{ p: 0, color: 'rgba(255,255,255,0.3)', '&.Mui-checked': { color: colors.primary } }}
                                    />,
                                    'Código',
                                    'Material',
                                    'Proveedor',
                                    'Stock Actual',
                                    'Stock Mínimo (Editar)',
                                    'Stock Máximo (Editar)',
                                    'Lead Time / Entrega (días)',
                                    'OCs en Camino',
                                    'Unidad'
                                ]}
                                rows={filteredItems.map((item: any) => {
                                    const stock = stockMap.get(item.id) || 0;
                                    const isSelected = selectedItemIds.includes(item.id);
                                    const pendingPOs = pendingPOsMap.get(item.id) || [];
                                    const incomingTotal = pendingPOs.reduce((s, p) => s + p.qty, 0);

                                    return [
                                        <Checkbox
                                            key={`sel-${item.id}`}
                                            checked={isSelected}
                                            onChange={() => handleToggleSelectItem(item.id)}
                                            sx={{ p: 0, color: 'rgba(255,255,255,0.3)', '&.Mui-checked': { color: colors.primary } }}
                                        />,
                                        <code key="code" style={{ color: colors.primary, fontWeight: 700 }}>{item.codigoInterno}</code>,
                                        <span key="desc" style={{ color: 'var(--text-white-dynamic, #fff)', fontWeight: 600 }}>{item.descripcion}</span>,
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
                                            value={item.leadTime != null ? String(item.leadTime) : String(globalLeadTime)}
                                            numeric
                                            onSave={(val) => handleSaveCell(item.id, 'leadTime', val)}
                                        />,
                                        incomingTotal > 0 ? (
                                            <MuiTooltip key="inc" title={pendingPOs.map(p => `${p.numero}: +${p.qty} (${p.expectedDate})`).join('\n')}>
                                                <Chip label={`+${incomingTotal}`} size="small" sx={{ bgcolor: `${colors.purple}25`, color: colors.purple, fontWeight: 700 }} />
                                            </MuiTooltip>
                                        ) : (
                                            <span key="inc" style={{ color: colors.textDim }}>—</span>
                                        ),
                                        <Badge key="unit" color={colors.secondary}>{item.unidadPrincipal}</Badge>
                                    ];
                                })}
                            />
                        </Card>
                    )}
                </>
            )}

            {/* COMBO BREAKDOWN MODAL */}
            {activeComboDetail && (
                <Dialog
                    open={Boolean(activeComboDetail)}
                    onClose={() => setActiveComboDetail(null)}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                        sx: { bgcolor: colors.bg, color: colors.text, borderRadius: 3, border: `1px solid ${colors.border}` }
                    }}
                >
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: colors.primary }}>
                                🏷️ Desglose del Grupo: {activeComboDetail.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.textDim }}>
                                Materiales componentes asignados por el sector de compras
                            </Typography>
                        </Box>
                        <IconButton onClick={() => setActiveComboDetail(null)} sx={{ color: colors.textDim }}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent dividers sx={{ borderColor: colors.border }}>
                        <Table
                            cols={['Código', 'Material', 'Stock Actual', 'Stock Mínimo', 'Stock Máximo', 'Lead Time', 'Estado']}
                            rows={(items.filter((it: any) => (activeComboDetail.itemIds || []).includes(it.id))).map((item: any) => {
                                const stock = stockMap.get(item.id) || 0;
                                const min = Number(item.stockMinimo || 0);
                                const isLow = stock < min;

                                return [
                                    <code key="c" style={{ color: colors.primary, fontWeight: 700 }}>{item.codigoInterno}</code>,
                                    <span key="d" style={{ color: '#fff', fontWeight: 600 }}>{item.descripcion}</span>,
                                    <span key="s" style={{ fontWeight: 700, color: isLow ? colors.danger : colors.success }}>
                                        {Number(stock).toFixed(1)} {item.unidadPrincipal}
                                    </span>,
                                    <span key="min" style={{ color: colors.textDim }}>{item.stockMinimo ?? '—'}</span>,
                                    <span key="max" style={{ color: colors.textDim }}>{item.stockMaximo ?? '—'}</span>,
                                    <span key="lt" style={{ color: colors.textDim }}>{item.leadTime ?? globalLeadTime} días</span>,
                                    <Badge key="st" color={isLow ? colors.danger : colors.success}>
                                        {isLow ? 'Bajo Mínimo' : 'Saludable'}
                                    </Badge>
                                ];
                            })}
                        />
                    </DialogContent>

                    <DialogActions sx={{ p: 2 }}>
                        <Button
                            onClick={() => {
                                setSelectedComboIds([activeComboDetail.id]);
                                setSelectionCategory('combos');
                                setActiveComboDetail(null);
                            }}
                            variant="contained"
                            sx={{ bgcolor: colors.primary, '&:hover': { bgcolor: colors.primary } }}
                        >
                            Visualizar este Grupo en el Gráfico
                        </Button>
                        <Button onClick={() => setActiveComboDetail(null)} sx={{ color: colors.textDim }}>
                            Cerrar
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </div>
    );
}
