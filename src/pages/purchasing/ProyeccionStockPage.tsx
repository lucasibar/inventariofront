import { useState, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectAllowedDepots } from '../../entities/auth/model/authSlice';
import { useGetPurchaseOrdersQuery } from '../../features/purchasing/purchase-orders/api/purchase-orders.api';
import { useGetRecentMovementsQuery, useGetStockQuery, useGetCombosQuery } from '../../features/warehouse/stock/api/stock.api';
import { useGetItemsQuery, useGetItemCategoriesQuery } from '../../features/warehouse/materiales/api/items.api';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { PageHeader, Card, Spinner, Select, Table } from '../../shared/ui';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine
} from 'recharts';

function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function fmtDate(d: Date): string {
    return d.toISOString().split('T')[0];
}

type FilterMode = 'GRUPO' | 'BUSQUEDA' | 'CATEGORIA';

export default function ProyeccionStockPage() {
    const today = useMemo(() => new Date(), []);
    const user = useSelector(selectCurrentUser);
    const allowedDepots = useSelector(selectAllowedDepots);
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

    // ── 1. Depósito ──
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => {
        const active = rawDepots.filter((d: any) => d.activo !== false);
        if (!allowedDepots) return active;
        return active.filter((d: any) => allowedDepots.includes(d.id));
    }, [rawDepots, allowedDepots]);

    const [depositoId, setDepositoId] = useState<string>(() => sessionStorage.getItem('selectedPurchasingDepotId') || '');

    useEffect(() => {
        if (depositoId) sessionStorage.setItem('selectedPurchasingDepotId', depositoId);
    }, [depositoId]);

    useEffect(() => {
        if (!depositoId && depots.length === 1) {
            setDepositoId(depots[0].id);
        }
    }, [depots, depositoId]);

    // ── 2. Modos de Filtro ──
    const [filterMode, setFilterMode] = useState<FilterMode>('GRUPO');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedComboId, setSelectedComboId] = useState('');
    const [horizonte, setHorizonte] = useState<30 | 60 | 90>(60);

    // ── 3. Consultas al Backend ──
    const { data: rawItems = [], isLoading: loadingItems } = useGetItemsQuery({});
    const { data: rawStock = [], isLoading: loadingStock } = useGetStockQuery(
        { depotId: depositoId || undefined },
        { skip: !depositoId }
    );
    const { data: categories = [], isLoading: loadingCategories } = useGetItemCategoriesQuery(
        depositoId || undefined,
        { skip: !depositoId }
    );
    const { data: combos = [], isLoading: loadingCombos } = useGetCombosQuery(
        depositoId || undefined,
        { skip: !depositoId }
    );
    const { data: orders = [], isLoading: loadingOrders } = useGetPurchaseOrdersQuery(
        depositoId || undefined,
        { skip: !depositoId }
    );

    // Movimientos de salida (últimos 90 días) del depósito para consumo real
    const desde90 = useMemo(() => fmtDate(addDays(today, -90)), [today]);
    const { data: salidas = [], isLoading: loadingMovs } = useGetRecentMovementsQuery(
        { tipo: 'REMITO_SALIDA', desde: desde90, depositoId: depositoId || undefined },
        { skip: !depositoId }
    );

    const isLoading = loadingItems || loadingStock || loadingCategories || loadingCombos || loadingOrders || loadingMovs;

    // Helper para normalizar fechas de arribo de OC (si es pasada o nula, ingresa hoy)
    const getDeliveryDateKey = (dateStr: string | null | undefined): string => {
        if (!dateStr) return fmtDate(today);
        const dStr = dateStr.split('T')[0];
        if (dStr < fmtDate(today)) return fmtDate(today);
        return dStr;
    };

    // ── 4. Mapeo de Stock Actual por ItemId en este Depósito ──
    const stockMap = useMemo(() => {
        const map = new Map<string, { kilos: number; units: number; lots: string[]; positions: string[] }>();
        rawStock.forEach((entry: any) => {
            const item = entry.batch?.item || entry.item;
            const itemId = item?.id || entry.itemId;
            if (!itemId) return;

            if (!map.has(itemId)) {
                map.set(itemId, { kilos: 0, units: 0, lots: [], positions: [] });
            }
            const s = map.get(itemId)!;
            s.kilos += Number(entry.qtyPrincipal || 0);
            if (entry.qtySecundaria) s.units += Number(entry.qtySecundaria || 0);
            if (entry.batch?.lotNumber && !s.lots.includes(entry.batch.lotNumber)) {
                s.lots.push(entry.batch.lotNumber);
            }
            if (entry.posicion?.codigo && !s.positions.includes(entry.posicion.codigo)) {
                s.positions.push(entry.posicion.codigo);
            }
        });
        return map;
    }, [rawStock]);

    // ── 5. Mapeo de Consumo Histórico por ItemId (Remitos de Salida) ──
    const consumptionMap = useMemo(() => {
        const map = new Map<string, { totalKg: number; count: number; movements: any[] }>();
        salidas.forEach((m: any) => {
            const itemId = m.itemId || m.item?.id || m.batch?.itemId || m.batch?.item?.id;
            if (!itemId) return;

            if (!map.has(itemId)) {
                map.set(itemId, { totalKg: 0, count: 0, movements: [] });
            }
            const c = map.get(itemId)!;
            const qty = Math.abs(Number(m.qtyPrincipal || 0));
            c.totalKg += qty;
            c.count += 1;
            c.movements.push(m);
        });
        return map;
    }, [salidas]);

    // ── 6. Mapeo de Órdenes de Compra Pendientes por ItemId ──
    const poMap = useMemo(() => {
        const map = new Map<string, { totalPending: number; orders: any[]; arrivals: { fecha: string; kg: number; orderNum: string; supplierName: string }[] }>();
        orders.forEach((o: any) => {
            if (o.estado === 'CANCELADO' || o.estado === 'COMPLETADO') return;

            (o.lines || []).forEach((l: any) => {
                const itemId = l.itemId || l.item?.id;
                if (!itemId) return;
                const pending = Math.max(0, Number(l.qtyPedido) - Number(l.qtyRecibida || 0));
                if (pending <= 0) return;

                if (!map.has(itemId)) {
                    map.set(itemId, { totalPending: 0, orders: [], arrivals: [] });
                }
                const p = map.get(itemId)!;
                p.totalPending += pending;
                if (!p.orders.some(x => x.id === o.id)) {
                    p.orders.push({ ...o, linePending: pending });
                }

                if (Array.isArray(o.arrivals) && o.arrivals.length > 0) {
                    o.arrivals.forEach((a: any) => {
                        if (a.fecha) {
                            const f = getDeliveryDateKey(a.fecha);
                            const kg = a.kgEstimados ? Number(a.kgEstimados) : pending / o.arrivals.length;
                            p.arrivals.push({ fecha: f, kg, orderNum: o.numero, supplierName: o.supplier?.name || '—' });
                        }
                    });
                } else {
                    const f = getDeliveryDateKey(o.fechaEntregaEsperada);
                    p.arrivals.push({ fecha: f, kg: pending, orderNum: o.numero, supplierName: o.supplier?.name || '—' });
                }
            });
        });
        return map;
    }, [orders, today]);

    // ── 7. Catálogo Consolidado de Materiales ──
    const depotMaterialRecords = useMemo(() => {
        const comboItemIds = new Set<string>();
        (combos as any[]).forEach(c => {
            if (!c.depositoId || c.depositoId === depositoId) {
                if (Array.isArray(c.itemIds)) {
                    c.itemIds.forEach((id: any) => comboItemIds.add(typeof id === 'string' ? id : id.id || id.itemId));
                }
                if (Array.isArray(c.items)) {
                    c.items.forEach((ci: any) => comboItemIds.add(ci.itemId || ci.item?.id || ci.id));
                }
            }
        });

        return rawItems.map((item: any) => {
            const stockInfo = stockMap.get(item.id) || { kilos: 0, units: 0, lots: [], positions: [] };
            const consInfo = consumptionMap.get(item.id) || { totalKg: 0, count: 0, movements: [] };
            const poInfo = poMap.get(item.id) || { totalPending: 0, orders: [], arrivals: [] };
            const avgDaily = consInfo.totalKg / 90;
            const daysSupply = avgDaily > 0 ? Math.floor(stockInfo.kilos / avgDaily) : null;

            const isFromDepot = (
                stockInfo.kilos > 0 ||
                stockInfo.lots.length > 0 ||
                item.category?.depositoId === depositoId ||
                item.depositoId === depositoId ||
                comboItemIds.has(item.id)
            );

            return {
                item,
                id: item.id,
                descripcion: item.descripcion || 'Sin descripción',
                codigoInterno: item.codigoInterno || '',
                categoryName: item.category?.nombre || '',
                categoryId: item.categoryId || item.category?.id || '',
                supplierName: item.supplier?.name || '',
                stockMinimo: Number(item.stockMinimo || 0),
                stockKilos: stockInfo.kilos,
                stockUnits: stockInfo.units,
                lots: stockInfo.lots,
                positions: stockInfo.positions,
                avgDailyConsumption: avgDaily,
                daysOfSupply: daysSupply,
                salidasCount: consInfo.count,
                salidasMovements: consInfo.movements,
                pendingPOKilos: poInfo.totalPending,
                pendingOrders: poInfo.orders,
                poArrivals: poInfo.arrivals,
                isFromDepot,
            };
        });
    }, [rawItems, stockMap, consumptionMap, poMap, combos, depositoId]);

    // ── 8. Filtrar Materiales según Modo Activo ──
    const activeMaterials = useMemo(() => {
        if (!depotMaterialRecords.length) return [];

        if (filterMode === 'GRUPO') {
            if (!selectedComboId) return [];
            const combo = (combos as any[]).find(c => c.id === selectedComboId);
            if (!combo) return [];

            const comboIds = new Set<string>();
            if (Array.isArray(combo.itemIds)) {
                combo.itemIds.forEach((id: any) => comboIds.add(typeof id === 'string' ? id : id.id || id.itemId));
            }
            if (Array.isArray(combo.items)) {
                combo.items.forEach((ci: any) => comboIds.add(ci.itemId || ci.item?.id || ci.id));
            }

            return depotMaterialRecords.filter(m => comboIds.has(m.id));
        }

        if (filterMode === 'BUSQUEDA') {
            if (!searchTerm.trim()) {
                const inDepot = depotMaterialRecords.filter(m => m.isFromDepot);
                return inDepot.length > 0 ? inDepot : depotMaterialRecords;
            }

            const words = searchTerm.toLowerCase().split(' ').filter(w => w.length > 0);
            return depotMaterialRecords.filter(m => {
                return words.every(word => {
                    const desc = m.descripcion.toLowerCase();
                    const code = m.codigoInterno.toLowerCase();
                    const sup = m.supplierName.toLowerCase();
                    const cat = m.categoryName.toLowerCase();
                    const lotMatch = m.lots.some(l => l.toLowerCase().includes(word));
                    const posMatch = m.positions.some(p => p.toLowerCase().includes(word));
                    return desc.includes(word) || code.includes(word) || sup.includes(word) || cat.includes(word) || lotMatch || posMatch;
                });
            });
        }

        if (filterMode === 'CATEGORIA') {
            if (!selectedCategoryId) return [];
            return depotMaterialRecords.filter(m => m.categoryId === selectedCategoryId);
        }

        return [];
    }, [depotMaterialRecords, filterMode, searchTerm, selectedCategoryId, selectedComboId, combos]);

    // Auto-seleccionar primer combo si se entra por modo GRUPO y no hay seleccionado
    useEffect(() => {
        if (filterMode === 'GRUPO' && !selectedComboId && combos.length > 0) {
            setSelectedComboId(combos[0].id);
        }
    }, [filterMode, selectedComboId, combos]);

    // ── 9. Totales Agregados de la Selección ──
    const totalStockActual = useMemo(() => {
        return activeMaterials.reduce((sum, m) => sum + m.stockKilos, 0);
    }, [activeMaterials]);

    const totalConsumoDiario = useMemo(() => {
        return activeMaterials.reduce((sum, m) => sum + m.avgDailyConsumption, 0);
    }, [activeMaterials]);

    const totalStockMinimo = useMemo(() => {
        if (filterMode === 'GRUPO' && selectedComboId) {
            const combo = (combos as any[]).find(c => c.id === selectedComboId);
            if (combo && combo.stockMinimo !== null && combo.stockMinimo !== undefined) {
                return Number(combo.stockMinimo);
            }
        }
        return activeMaterials.reduce((sum, m) => sum + m.stockMinimo, 0);
    }, [activeMaterials, filterMode, selectedComboId, combos]);

    const totalPendingPO = useMemo(() => {
        return activeMaterials.reduce((sum, m) => sum + m.pendingPOKilos, 0);
    }, [activeMaterials]);

    const totalSalidasCount = useMemo(() => {
        return activeMaterials.reduce((sum, m) => sum + m.salidasCount, 0);
    }, [activeMaterials]);

    // Consolidar arribos por fecha
    const consolidatedArrivals = useMemo(() => {
        const map: Record<string, number> = {};
        activeMaterials.forEach(m => {
            m.poArrivals.forEach(a => {
                map[a.fecha] = (map[a.fecha] || 0) + a.kg;
            });
        });
        return map;
    }, [activeMaterials]);

    // ── 10. Curva de Proyección Día a Día ──
    const chartData = useMemo(() => {
        if (activeMaterials.length === 0) return [];
        const data: { fecha: string; stock: number; ingreso: number; label: string }[] = [];
        let stockSim = totalStockActual;

        for (let i = 0; i <= horizonte; i++) {
            const d = addDays(today, i);
            const fechaKey = fmtDate(d);
            const ingreso = consolidatedArrivals[fechaKey] || 0;
            // Suma de arribos de OC + resta de consumo diario promedio
            stockSim = Math.max(0, stockSim - totalConsumoDiario + ingreso);

            data.push({
                fecha: fechaKey,
                stock: Math.round(stockSim * 100) / 100,
                ingreso,
                label: i === 0 ? 'Hoy' : `${d.getDate()}/${d.getMonth() + 1}`,
            });
        }
        return data;
    }, [activeMaterials, totalStockActual, totalConsumoDiario, consolidatedArrivals, horizonte, today]);

    // Días hasta quiebre
    const diasHastaRuptura = useMemo(() => {
        if (activeMaterials.length === 0 || totalConsumoDiario === 0) return null;
        const limite = totalStockMinimo > 0 ? totalStockMinimo : 0;
        const point = chartData.find(d => d.stock <= limite);
        if (!point) return null;
        return chartData.indexOf(point);
    }, [chartData, totalStockMinimo, totalConsumoDiario, activeMaterials]);

    // Título descriptivo de lo que se está proyectando
    const activeTitle = useMemo(() => {
        if (filterMode === 'GRUPO') {
            const combo = (combos as any[]).find(c => c.id === selectedComboId);
            return combo ? `Grupo: ${combo.title} (${activeMaterials.length} materiales sumados)` : 'Grupo de Materiales';
        }
        if (filterMode === 'CATEGORIA') {
            const cat = (categories as any[]).find(c => c.id === selectedCategoryId);
            return cat ? `Categoría: ${cat.nombre} (${activeMaterials.length} materiales sumados)` : 'Categoría';
        }
        if (searchTerm.trim()) {
            return `Búsqueda: "${searchTerm}" (${activeMaterials.length} materiales sumados)`;
        }
        return `Todos los materiales (${activeMaterials.length})`;
    }, [filterMode, selectedComboId, selectedCategoryId, searchTerm, combos, categories, activeMaterials]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        const d = payload[0]?.payload;
        return (
            <div style={{
                background: 'var(--bg-secondary, #1a1d2e)',
                border: '1px solid var(--border-color, #2a2d3e)',
                padding: '12px 16px', borderRadius: '8px', fontSize: '13px'
            }}>
                <p style={{ margin: '0 0 6px', color: 'var(--text-muted, #9ca3af)', fontWeight: 700 }}>{d?.label} ({d?.fecha})</p>
                <p style={{ margin: '2px 0', color: '#34d399' }}>
                    Stock proyectado: <strong>{d?.stock?.toLocaleString('es-AR', { maximumFractionDigits: 1 })} kg</strong>
                </p>
                {d?.ingreso > 0 && (
                    <p style={{ margin: '2px 0', color: '#818cf8', fontWeight: 700 }}>
                        ↑ Ingreso OC: <strong>+{d.ingreso.toLocaleString('es-AR', { maximumFractionDigits: 1 })} kg</strong>
                    </p>
                )}
                {totalConsumoDiario > 0 && (
                    <p style={{ margin: '2px 0', color: 'var(--text-subtle, #6b7280)', fontSize: '11px' }}>
                        Consumo diario: ~{totalConsumoDiario.toFixed(1)} kg/día
                    </p>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: '20px' }}>
            <PageHeader
                title="Proyección de Stock"
                subtitle="Fluctuación de stock proyectada: historial de remitos de salida + arribos de órdenes de compra"
            />

            {/* ── Barra de Control Unificada (Depósito + Filtros + Horizonte) ── */}
            <Card style={{ marginBottom: '20px', padding: '16px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: '16px', alignItems: 'flex-end' }}>
                    {/* 1. Depósito */}
                    <div style={{ minWidth: '220px' }}>
                        <Select
                            label="🏭 Depósito"
                            value={depositoId}
                            onChange={v => {
                                setDepositoId(v);
                                setSelectedComboId('');
                                setSelectedCategoryId('');
                            }}
                            disabled={!isAdmin && depots.length === 1}
                            options={[
                                { value: '', label: 'Seleccionar depósito...' },
                                ...depots.map((d: any) => ({
                                    value: d.id,
                                    label: d.nombre + (d.planta ? ` (${d.planta})` : '')
                                }))
                            ]}
                        />
                    </div>

                    {/* 2. Selector de Modo */}
                    <div style={{ minWidth: '180px' }}>
                        <Select
                            label="🔍 Proyectar por"
                            value={filterMode}
                            onChange={(v: any) => {
                                setFilterMode(v);
                                if (v === 'GRUPO' && combos.length > 0) setSelectedComboId(combos[0].id);
                            }}
                            options={[
                                { value: 'GRUPO', label: '🧵 Grupo de Materiales' },
                                { value: 'BUSQUEDA', label: '🔎 Búsqueda de Stock' },
                                { value: 'CATEGORIA', label: '🏷️ Categoría' },
                            ]}
                        />
                    </div>

                    {/* 3. Campo Dinámico de Selección */}
                    <div>
                        {filterMode === 'GRUPO' && (
                            <Select
                                label="Seleccioná el Grupo de Materiales"
                                value={selectedComboId}
                                onChange={setSelectedComboId}
                                options={[
                                    { value: '', label: 'Seleccionar grupo...' },
                                    ...(combos as any[]).map((c: any) => ({
                                        value: c.id,
                                        label: `${c.title} (${c.itemIds?.length || c.items?.length || 0} materiales)`
                                    }))
                                ]}
                            />
                        )}

                        {filterMode === 'BUSQUEDA' && (
                            <div>
                                <label style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                                    Buscar por palabras (descripción, código, lote, proveedor):
                                </label>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Ej: algodon 24 crudo..."
                                    style={{
                                        width: '100%', padding: '9px 12px', borderRadius: '8px',
                                        background: 'var(--bg-secondary, #111827)',
                                        border: '1px solid var(--border-strong, #374151)',
                                        color: 'var(--text-primary, #f3f4f6)', fontSize: '13px', outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        )}

                        {filterMode === 'CATEGORIA' && (
                            <Select
                                label="Seleccioná la Categoría"
                                value={selectedCategoryId}
                                onChange={setSelectedCategoryId}
                                options={[
                                    { value: '', label: 'Seleccionar categoría...' },
                                    ...(categories as any[]).map((c: any) => ({ value: c.id, label: c.nombre }))
                                ]}
                            />
                        )}
                    </div>

                    {/* 4. Selector de Horizonte */}
                    <div>
                        <label style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                            Horizonte
                        </label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {([30, 60, 90] as const).map(h => (
                                <button
                                    key={h}
                                    onClick={() => setHorizonte(h)}
                                    style={{
                                        padding: '7px 12px', borderRadius: '6px', border: '1px solid',
                                        borderColor: horizonte === h ? '#6366f1' : 'var(--border-color, #2a2d3e)',
                                        background: horizonte === h ? 'rgba(99,102,241,0.15)' : 'transparent',
                                        color: horizonte === h ? '#818cf8' : 'var(--text-muted, #9ca3af)',
                                        cursor: 'pointer', fontSize: '12px', fontWeight: horizonte === h ? 700 : 400
                                    }}
                                >
                                    {h}d
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            {/* ── Sin Depósito o Cargando ── */}
            {!depositoId && (
                <Card style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ fontSize: '44px', marginBottom: '12px' }}>🏭</div>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>Seleccioná un Depósito</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Elegí el depósito para proyectar su stock.</p>
                </Card>
            )}

            {depositoId && isLoading && (
                <Card style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <Spinner />
                </Card>
            )}

            {/* ── Sin Materiales Encontrados ── */}
            {depositoId && !isLoading && activeMaterials.length === 0 && (
                <Card style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔎</div>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>No se encontraron materiales</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        {filterMode === 'GRUPO'
                            ? 'Seleccioná un Grupo de Materiales en el desplegable superior.'
                            : 'Probá ajustando la búsqueda o la categoría seleccionada.'}
                    </p>
                </Card>
            )}

            {/* ── Panel Principal: Gráfico (Grande) + KPIs al Costado (Compactos) ── */}
            {depositoId && !isLoading && activeMaterials.length > 0 && (
                <>
                    {/* Alerta de Desabastecimiento si aplica */}
                    {diasHastaRuptura !== null && diasHastaRuptura <= 30 && (
                        <Card style={{
                            marginBottom: '16px',
                            background: diasHastaRuptura <= 10 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            borderColor: diasHastaRuptura <= 10 ? '#ef4444' : '#f59e0b',
                            padding: '12px 18px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '20px' }}>⚠️</span>
                                <div style={{ fontSize: '13px' }}>
                                    <strong style={{ color: diasHastaRuptura <= 10 ? '#f87171' : '#fbbf24' }}>
                                        Riesgo de quiebre en {diasHastaRuptura} días ({fmtDate(addDays(today, diasHastaRuptura))})
                                    </strong>
                                    <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                                        Consumo diario: {totalConsumoDiario.toFixed(1)} kg/día vs Stock: {totalStockActual.toFixed(0)} kg
                                    </span>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Grilla: Gráfico a la izquierda (3fr) y KPIs a la derecha (1fr) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        {/* Gráfico Amplio */}
                        <Card style={{ padding: '20px' }}>
                            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <div>
                                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '15px', fontWeight: 700 }}>
                                        {activeTitle}
                                    </h3>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Proyección a {horizonte} días · Consumo histórico 90d + Ingresos de OC
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span style={{ width: 10, height: 3, background: '#34d399', display: 'inline-block', borderRadius: 2 }} /> Stock Proyectado
                                    </span>
                                    {totalStockMinimo > 0 && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ width: 10, height: 2, background: '#ef4444', display: 'inline-block', borderRadius: 2, borderTop: '2px dashed #ef4444' }} /> Mínimo ({totalStockMinimo.toLocaleString('es-AR')} kg)
                                        </span>
                                    )}
                                </div>
                            </div>

                            <ResponsiveContainer width="100%" height={320}>
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #2a2d3e)" vertical={false} />
                                    <XAxis
                                        dataKey="label"
                                        stroke="var(--text-subtle, #6b7280)"
                                        tick={{ fill: 'var(--text-subtle, #6b7280)', fontSize: 11 }}
                                        interval={chartData.length > 50 ? 8 : 4}
                                    />
                                    <YAxis
                                        stroke="var(--text-subtle, #6b7280)"
                                        tick={{ fill: 'var(--text-subtle, #6b7280)', fontSize: 11 }}
                                        tickFormatter={v => `${v} kg`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    {totalStockMinimo > 0 && (
                                        <ReferenceLine
                                            y={totalStockMinimo}
                                            stroke="#ef4444"
                                            strokeDasharray="4 4"
                                            label={{ value: `Mín: ${totalStockMinimo.toLocaleString('es-AR')} kg`, fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }}
                                        />
                                    )}
                                    <Area
                                        type="monotone"
                                        dataKey="stock"
                                        stroke="#34d399"
                                        strokeWidth={2.5}
                                        fill="url(#projGrad)"
                                        dot={false}
                                        activeDot={{ r: 5, fill: '#34d399', stroke: 'var(--bg-secondary)', strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Card>

                        {/* Columna Lateral de KPIs Compactos */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <Card style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                                    Stock Actual
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                                    {totalStockActual.toLocaleString('es-AR', { maximumFractionDigits: 1 })} <span style={{ fontSize: '12px' }}>kg</span>
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-subtle, #6b7280)' }}>
                                    {activeMaterials.length} material{activeMaterials.length !== 1 ? 'es' : ''} sumados
                                </div>
                            </Card>

                            <Card style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                                    Consumo Diario Promedio
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                                    {totalConsumoDiario.toFixed(1)} <span style={{ fontSize: '12px' }}>kg/día</span>
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-subtle, #6b7280)' }}>
                                    {totalSalidasCount} remitos de salida (90d)
                                </div>
                            </Card>

                            <Card style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                                    Días de Cobertura
                                </div>
                                <div style={{
                                    fontSize: '22px', fontWeight: 800, marginTop: '2px',
                                    color: diasHastaRuptura !== null && diasHastaRuptura < 15 ? '#ef4444' : '#818cf8'
                                }}>
                                    {totalConsumoDiario === 0 ? 'Sin consumo' : diasHastaRuptura !== null ? `${diasHastaRuptura} días` : `+${horizonte} días`}
                                </div>
                            </Card>

                            <Card style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                                    OC por Recibir
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                                    +{totalPendingPO.toLocaleString('es-AR', { maximumFractionDigits: 0 })} <span style={{ fontSize: '12px' }}>kg</span>
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-subtle, #6b7280)' }}>
                                    {Object.keys(consolidatedArrivals).length} entrega{Object.keys(consolidatedArrivals).length !== 1 ? 's' : ''} programada{Object.keys(consolidatedArrivals).length !== 1 ? 's' : ''}
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* ── Desglose de Materiales del Grupo / Selección ── */}
                    {activeMaterials.length > 1 && (
                        <Card style={{ marginBottom: '20px', padding: '16px' }}>
                            <h4 style={{ margin: '0 0 10px', color: 'var(--text-primary)', fontSize: '13px' }}>
                                📋 Detalle de los {activeMaterials.length} materiales que componen esta selección
                            </h4>
                            <Table
                                cols={['Material', 'Código', 'Stock Actual', 'Consumo Diario (90d)', 'Días Stock', 'OC Pendiente']}
                                rows={activeMaterials.map(m => {
                                    const dias = m.avgDailyConsumption > 0 ? Math.floor(m.stockKilos / m.avgDailyConsumption) : null;
                                    return [
                                        <strong key="d" style={{ color: 'var(--text-primary)' }}>{m.descripcion}</strong>,
                                        m.codigoInterno || '—',
                                        <span key="s" style={{ color: '#34d399', fontWeight: 600 }}>{m.stockKilos.toLocaleString('es-AR', { maximumFractionDigits: 1 })} kg</span>,
                                        <span key="c" style={{ color: '#f59e0b' }}>{m.avgDailyConsumption.toFixed(1)} kg/día</span>,
                                        <span key="di" style={{ color: dias !== null && dias < 15 ? '#ef4444' : 'var(--text-primary)' }}>
                                            {dias !== null ? `${dias} días` : '—'}
                                        </span>,
                                        m.pendingPOKilos > 0 ? <span key="po" style={{ color: '#38bdf8', fontWeight: 600 }}>+{m.pendingPOKilos.toFixed(1)} kg</span> : '—'
                                    ];
                                })}
                            />
                        </Card>
                    )}

                    {/* ── Tablas de Trazabilidad: Órdenes y Remitos ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {/* Órdenes de Compra con Arribos */}
                        <Card style={{ padding: '16px' }}>
                            <h4 style={{ margin: '0 0 10px', color: 'var(--text-primary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🛒 Órdenes de Compra Pendientes
                            </h4>
                            {totalPendingPO === 0 ? (
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                                    No hay órdenes de compra pendientes para los materiales de este grupo.
                                </p>
                            ) : (
                                <Table
                                    cols={['Material', 'Orden', 'Proveedor', 'Fecha Arribo', 'Pendiente']}
                                    rows={activeMaterials.flatMap(m =>
                                        m.pendingOrders.map((o, idx) => [
                                            m.descripcion,
                                            <span key={`ord-${idx}`} style={{ color: '#818cf8', fontWeight: 700 }}>{o.numero}</span>,
                                            o.supplier?.name || '—',
                                            o.fechaEntregaEsperada ? new Date(o.fechaEntregaEsperada).toLocaleDateString('es-AR') : 'Inmediato',
                                            <strong key={`kg-${idx}`} style={{ color: '#38bdf8' }}>+{o.linePending?.toFixed(1) || o.pendienteMaterial?.toFixed(1) || '—'} kg</strong>
                                        ])
                                    )}
                                />
                            )}
                        </Card>

                        {/* Remitos de Salida (Consumo real) */}
                        <Card style={{ padding: '16px' }}>
                            <h4 style={{ margin: '0 0 10px', color: 'var(--text-primary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                📤 Remitos de Salida Recientes (90d)
                            </h4>
                            {totalSalidasCount === 0 ? (
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                                    No se registraron remitos de salida para estos materiales en los últimos 90 días.
                                </p>
                            ) : (
                                <Table
                                    cols={['Fecha', 'Documento', 'Cantidad', 'Partida']}
                                    rows={activeMaterials.flatMap(m => m.salidasMovements).slice(0, 8).map((m: any, idx: number) => [
                                        new Date(m.fecha).toLocaleDateString('es-AR'),
                                        m.documentoNumero || m.documentoId || '—',
                                        <span key={`q-${idx}`} style={{ color: '#f87171', fontWeight: 600 }}>
                                            -{Math.abs(Number(m.qtyPrincipal || 0)).toFixed(1)} kg
                                        </span>,
                                        m.batch?.lotNumber || '—'
                                    ])}
                                />
                            )}
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
