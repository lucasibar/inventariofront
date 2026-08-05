import { useState, useMemo, useEffect } from 'react';
import { useGetRecentMovementsQuery, useGetCombosQuery, useUpdateComboMutation } from '../../features/warehouse/stock/api/stock.api';
import { useLazyGetRemitoSalidaQuery } from '../../features/warehouse/remitosSalida/api/remitos-salida.api';
import { useGetItemsQuery } from '../../features/warehouse/materiales/api/items.api';
import { RemitoDetailModal } from '../../features/warehouse/remitos/ui/RemitoDetailModal';
import { EditComboModal } from '../purchasing/MaterialesCriticosPage';
import { PageHeader, Card, Input, Spinner, Btn } from '../../shared/ui';
import { useIsMobile } from '../../shared/ui';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line 
} from 'recharts';

interface DebouncedSearchInputProps {
    value: string;
    onChange: (val: string) => void;
    delay?: number;
    label?: string;
    placeholder?: string;
}

function DebouncedSearchInput({ value, onChange, delay = 300, ...props }: DebouncedSearchInputProps) {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    useEffect(() => {
        const handler = setTimeout(() => {
            onChange(localValue);
        }, delay);
        return () => clearTimeout(handler);
    }, [localValue, onChange, delay]);

    return (
        <Input
            {...props}
            value={localValue}
            onChange={setLocalValue}
        />
    );
}

export default function ReporteConsumoDetalladoPage() {
    const isMobile = useIsMobile();
    
    // Date range defaults to the last 30 days
    const [desde, setDesde] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [hasta, setHasta] = useState(() => new Date().toISOString().split('T')[0]);

    const { data: movements = [], isFetching } = useGetRecentMovementsQuery({ desde, hasta, tipo: 'REMITO_SALIDA' });
    const [triggerGetRemitoDetail] = useLazyGetRemitoSalidaQuery();

    const [searchQuery, setSearchQuery] = useState('');
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [selectedRemito, setSelectedRemito] = useState<any>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [excludedMaterialIds, setExcludedMaterialIds] = useState<Record<string, boolean>>({});

    // States and queries for Materials Groups ("Combos")
    const [viewByGroup, setViewByGroup] = useState(false);
    const [editComboId, setEditComboId] = useState<string | null>(null);
    const [excludedComboIds, setExcludedComboIds] = useState<Record<string, boolean>>({});

    const { data: combos = [] } = useGetCombosQuery(undefined, { skip: !viewByGroup });
    const { data: items = [] } = useGetItemsQuery({}, { skip: !viewByGroup });
    const [updateCombo] = useUpdateComboMutation();

    const toggleItemExpanded = (itemId: string) => {
        setExpandedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    // Filter movements dynamically by search query (multi-word and category matching)
    const filteredMovements = useMemo(() => {
        const searchWords = searchQuery.toLowerCase().split(' ').filter(w => w.length > 0);
        if (searchWords.length === 0) return movements;
        
        return movements.filter(m => {
            return searchWords.every(word => {
                const materialCode = (m.item?.codigoInterno || '').toLowerCase();
                const materialDesc = (m.item?.descripcion || '').toLowerCase();
                const lotNumber = (m.batch?.lotNumber || '').toLowerCase();
                const categoryName = (m.item?.category?.nombre || m.item?.categoria || '').toLowerCase();
                
                const supplierName = (
                    m.supplier?.name || 
                    m.batchSupplier?.name || 
                    m.batch?.supplier?.name || 
                    ''
                ).toLowerCase();

                return materialCode.includes(word) || 
                       materialDesc.includes(word) || 
                       lotNumber.includes(word) || 
                       supplierName.includes(word) ||
                       categoryName.includes(word);
            });
        });
    }, [movements, searchQuery]);

    // Calculate items breakdown (list of all materials found in the period)
    const itemsBreakdown = useMemo(() => {
        const groups: Record<string, {
            item: { id: string; codigoInterno: string; descripcion: string; unidadPrincipal: string };
            totalQty: number;
            movements: any[];
        }> = {};

        filteredMovements.forEach(m => {
            if (!m.item) return;
            const itemId = m.item.id;
            const qty = Math.abs(Number(m.qtyPrincipal || 0));

            if (!groups[itemId]) {
                groups[itemId] = {
                    item: m.item,
                    totalQty: 0,
                    movements: []
                };
            }
            groups[itemId].totalQty += qty;
            groups[itemId].movements.push(m);
        });

        return Object.values(groups).sort((a, b) => b.totalQty - a.totalQty);
    }, [filteredMovements]);

    // Calculate aggregated metrics and charts data based on filtered (non-excluded) materials/groups
    const { timelineData, barChartData, totalKilos } = useMemo(() => {
        let sumKilos = 0;
        const dailyTotals: Record<string, number> = {};
        const dailyGroupTotals: Record<string, Record<string, number>> = {};
        const groupTotals: Record<string, number> = {};

        if (viewByGroup) {
            filteredMovements.forEach(m => {
                if (!m.item) return;
                const itemId = m.item.id;
                const qty = Math.abs(Number(m.qtyPrincipal || 0));
                
                let matchesAnyActive = false;
                combos.forEach(grupo => {
                    if (excludedComboIds[grupo.id]) return;
                    if (grupo.itemIds && grupo.itemIds.includes(itemId)) {
                        matchesAnyActive = true;
                        
                        const dateStr = m.fecha;
                        if (!dailyGroupTotals[dateStr]) dailyGroupTotals[dateStr] = {};
                        dailyGroupTotals[dateStr][grupo.id] = (dailyGroupTotals[dateStr][grupo.id] || 0) + qty;
                        
                        groupTotals[grupo.id] = (groupTotals[grupo.id] || 0) + qty;
                    }
                });

                if (matchesAnyActive) {
                    sumKilos += qty;
                }
            });
        } else {
            filteredMovements.forEach(m => {
                if (!m.item) return;
                const itemId = m.item.id;
                
                // Skip calculations for excluded materials
                if (excludedMaterialIds[itemId]) return;

                const qty = Math.abs(Number(m.qtyPrincipal || 0));
                sumKilos += qty;

                // Group by date for progressive chart
                const dateStr = m.fecha;
                dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + qty;
            });
        }

        // Build daily consumption data filling missing dates with 0
        const start = new Date(desde + 'T12:00:00');
        const end = new Date(hasta + 'T12:00:00');
        const timeline: any[] = [];
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            
            if (viewByGroup) {
                const dayObj: any = { fecha: dateStr };
                combos.forEach(grupo => {
                    if (excludedComboIds[grupo.id]) return;
                    const val = dailyGroupTotals[dateStr]?.[grupo.id] || 0;
                    dayObj[grupo.id] = Number(val.toFixed(2));
                });
                timeline.push(dayObj);
            } else {
                const qty = dailyTotals[dateStr] || 0;
                timeline.push({
                    fecha: dateStr,
                    qty: Number(qty.toFixed(2))
                });
            }
        }

        // Build vertical/horizontal bar chart data
        let bars: any[] = [];
        if (viewByGroup) {
            bars = combos
                .filter(grupo => !excludedComboIds[grupo.id])
                .map(grupo => ({
                    name: grupo.title,
                    kilos: Number((groupTotals[grupo.id] || 0).toFixed(2)),
                    descripcion: grupo.supplier?.name || 'Mixto'
                }))
                .sort((a, b) => b.kilos - a.kilos)
                .slice(0, 10);
        } else {
            bars = itemsBreakdown
                .filter(g => !excludedMaterialIds[g.item.id])
                .map(g => ({
                    name: g.item.codigoInterno,
                    kilos: Number(g.totalQty.toFixed(2)),
                    descripcion: g.item.descripcion
                })).slice(0, 10); // top 10 selected materials
        }

        return {
            timelineData: timeline,
            barChartData: bars,
            totalKilos: sumKilos
        };
    }, [filteredMovements, excludedMaterialIds, excludedComboIds, itemsBreakdown, combos, viewByGroup, desde, hasta]);

    const toggleMaterialSelection = (itemId: string) => {
        setExcludedMaterialIds(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    const selectAllMaterials = () => {
        setExcludedMaterialIds({});
    };

    const deselectAllMaterials = () => {
        const allExcluded: Record<string, boolean> = {};
        itemsBreakdown.forEach(g => {
            allExcluded[g.item.id] = true;
        });
        setExcludedMaterialIds(allExcluded);
    };

    const toggleComboSelection = (comboId: string) => {
        setExcludedComboIds(prev => ({
            ...prev,
            [comboId]: !prev[comboId]
        }));
    };

    const selectAllCombos = () => {
        setExcludedComboIds({});
    };

    const deselectAllCombos = () => {
        const allExcluded: Record<string, boolean> = {};
        combos.forEach(g => {
            allExcluded[g.id] = true;
        });
        setExcludedComboIds(allExcluded);
    };

    // Handle clicking a remito link
    const handleRemitoClick = async (e: React.MouseEvent, docId: string | null, docNum: string | null) => {
        e.stopPropagation();
        if (!docId) {
            alert('Este movimiento no tiene un ID de remito asociado para ver detalle.');
            return;
        }
        try {
            const fullRemito = await triggerGetRemitoDetail(docId).unwrap();
            setSelectedRemito(fullRemito);
            setShowDetailModal(true);
        } catch (err) {
            console.error('Error loading remito details', err);
            // Fallback visualization if API call fails
            setSelectedRemito({
                numero: docNum || 'S/N',
                fecha: '',
                partner: { name: 'Desconocido' },
                lines: []
            });
            setShowDetailModal(true);
        }
    };

    return (
        <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <PageHeader 
                title="Consumo Detallado" 
                subtitle="Informe dinámico de egreso de materiales mediante remitos de salida" 
            >
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Btn 
                        variant={viewByGroup ? "secondary" : "primary"}
                        onClick={() => setViewByGroup(false)}
                        small={isMobile}
                    >
                        Consumo Individual
                    </Btn>
                    <Btn 
                        variant={viewByGroup ? "primary" : "secondary"}
                        onClick={() => setViewByGroup(true)}
                        small={isMobile}
                    >
                        Consumo por Grupos
                    </Btn>
                </div>
            </PageHeader>

            {/* Filters */}
            <Card style={{ padding: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                        <Input 
                            label="Desde" 
                            type="date" 
                            value={desde} 
                            onChange={setDesde} 
                        />
                        <Input 
                            label="Hasta" 
                            type="date" 
                            value={hasta} 
                            onChange={setHasta} 
                        />
                    </div>
                    <DebouncedSearchInput 
                        label="Buscar por proveedor, lote, material, descripción, categoría o código (múltiples palabras)" 
                        placeholder="Ej: algodon rontaltex..." 
                        value={searchQuery} 
                        onChange={setSearchQuery} 
                    />
                </div>
            </Card>

            {isFetching ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <Spinner />
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* General Summary Card */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '20px' }}>
                        <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', background: 'var(--bg-report-gradient, linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%))', border: '1px solid var(--border-report-strong, #312e81)' }}>
                            <div style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Consumo Total del Período
                            </div>
                            <div style={{ fontSize: '36px', fontWeight: 800, color: '#38bdf8' }}>
                                {totalKilos.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span style={{ fontSize: '18px', color: '#94a3b8', marginLeft: '6px' }}>Kg</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                                Basado en {filteredMovements.length === movements.length ? `${movements.length}` : `${filteredMovements.length} de ${movements.length}`} transacciones registradas
                            </div>
                        </Card>

                        {/* Desktop Daily Consumption Chart */}
                        {!isMobile && (
                            <Card style={{ padding: '20px', height: '240px' }}>
                                <h3 style={{ color: 'var(--text-primary, #f3f4f6)', fontSize: '14px', margin: '0 0 15px 0', fontWeight: 700 }}>
                                    📈 Consumo Diario {viewByGroup ? 'por Grupo de Materiales' : '(Kilos)'}
                                </h3>
                                {timelineData.length === 0 ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80%', color: '#64748b' }}>
                                        No hay datos en el rango seleccionado
                                    </div>
                                ) : viewByGroup ? (
                                    <ResponsiveContainer width="100%" height="80%">
                                        <LineChart data={timelineData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong, #1e293b)" vertical={false} />
                                            <XAxis 
                                                dataKey="fecha" 
                                                stroke="#64748b" 
                                                fontSize={11}
                                                tickFormatter={(val) => new Date(val).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                                            />
                                            <YAxis stroke="#64748b" fontSize={11} />
                                            <Tooltip 
                                                contentStyle={{ background: 'var(--bg-primary, #0f172a)', border: '1px solid var(--border-strong, #334155)', borderRadius: '8px', color: '#fff' }}
                                                labelFormatter={(val) => new Date(val).toLocaleDateString('es-AR', { dateStyle: 'medium' })}
                                            />
                                            {combos.filter(grupo => !excludedComboIds[grupo.id]).map((grupo, idx) => {
                                                const colorsList = ['#38bdf8', '#fb7185', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#2dd4bf'];
                                                return (
                                                    <Line 
                                                        key={grupo.id}
                                                        type="monotone"
                                                        dataKey={grupo.id}
                                                        name={grupo.title}
                                                        stroke={colorsList[idx % colorsList.length]}
                                                        strokeWidth={2}
                                                        dot={false}
                                                        activeDot={{ r: 4 }}
                                                    />
                                                );
                                            })}
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <ResponsiveContainer width="100%" height="80%">
                                        <AreaChart data={timelineData}>
                                            <defs>
                                                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong, #1e293b)" vertical={false} />
                                            <XAxis 
                                                dataKey="fecha" 
                                                stroke="#64748b" 
                                                fontSize={11}
                                                tickFormatter={(val) => new Date(val).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                                            />
                                            <YAxis stroke="#64748b" fontSize={11} />
                                            <Tooltip 
                                                contentStyle={{ background: 'var(--bg-primary, #0f172a)', border: '1px solid var(--border-strong, #334155)', borderRadius: '8px', color: '#fff' }}
                                                itemStyle={{ color: '#38bdf8' }}
                                                labelFormatter={(val) => new Date(val).toLocaleDateString('es-AR', { dateStyle: 'medium' })}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="qty" 
                                                name="Consumo Diario" 
                                                stroke="#0ea5e9" 
                                                strokeWidth={2}
                                                fillOpacity={1} 
                                                fill="url(#colorCumulative)" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </Card>
                        )}
                    </div>

                    {/* Material List with accordions */}
                    <Card style={{ padding: '0px', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-strong, #1e293b)', background: 'var(--bg-secondary, #111827)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary, #f3f4f6)' }}>
                                {viewByGroup ? 'Grupos de Materiales' : 'Materiales Consumidos'}
                            </span>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <button 
                                    onClick={viewByGroup ? selectAllCombos : selectAllMaterials}
                                    style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    ✓ Seleccionar Todos
                                </button>
                                <button 
                                    onClick={viewByGroup ? deselectAllCombos : deselectAllMaterials}
                                    style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    ✗ Desmarcar Todos
                                </button>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>| Ordenado por Kilos</span>
                            </div>
                        </div>

                        {viewByGroup ? (
                            combos.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                    No se encontraron grupos configurados.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {combos.map((grupo) => {
                                        const isExpanded = !!expandedItems[grupo.id];
                                        const isSelected = !excludedComboIds[grupo.id];
                                        
                                        // Calcular consumo total del grupo en el periodo
                                        const groupConsumoTotal = filteredMovements.reduce((sum, m) => {
                                            if (m.item && grupo.itemIds?.includes(m.item.id)) {
                                                return sum + Math.abs(Number(m.qtyPrincipal || 0));
                                            }
                                            return sum;
                                        }, 0);

                                        // Agrupar movimientos de este grupo por material para el desglose
                                        const groupItemsBreakdown = (() => {
                                            const breakdown: Record<string, {
                                                item: any;
                                                totalQty: number;
                                                movements: any[];
                                            }> = {};

                                            filteredMovements.forEach(m => {
                                                if (m.item && grupo.itemIds?.includes(m.item.id)) {
                                                    const itemId = m.item.id;
                                                    if (!breakdown[itemId]) {
                                                        breakdown[itemId] = {
                                                            item: m.item,
                                                            totalQty: 0,
                                                            movements: []
                                                        };
                                                    }
                                                    const qty = Math.abs(Number(m.qtyPrincipal || 0));
                                                    breakdown[itemId].totalQty += qty;
                                                    breakdown[itemId].movements.push(m);
                                                }
                                            });

                                            return Object.values(breakdown).sort((a, b) => b.totalQty - a.totalQty);
                                        })();

                                        return (
                                            <div key={grupo.id} style={{ borderBottom: '1px solid var(--border-strong, #1e293b)' }}>
                                                
                                                {/* Accordion Trigger Row */}
                                                <div 
                                                    onClick={() => toggleItemExpanded(grupo.id)}
                                                    style={{ 
                                                        padding: '16px 20px', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'space-between', 
                                                        cursor: 'pointer',
                                                        background: isExpanded ? 'rgba(15, 23, 42, 0.4)' : 'transparent',
                                                        transition: 'background 0.2s ease'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                                        <input 
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={() => toggleComboSelection(grupo.id)}
                                                            style={{ 
                                                                cursor: 'pointer', 
                                                                width: '18px', 
                                                                height: '18px', 
                                                                accentColor: '#38bdf8' 
                                                            }}
                                                        />
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                                                            <span style={{ fontWeight: 700, color: isSelected ? '#fff' : '#64748b', fontSize: '15px', textDecoration: isSelected ? 'none' : 'line-through' }}>
                                                                {grupo.title}
                                                            </span>
                                                            <span style={{ color: isSelected ? 'var(--text-muted, #9ca3af)' : '#475569', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                Proveedor: {grupo.supplier?.name || 'Varios / Mixto'} | {grupo.itemIds?.length || 0} materiales
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditComboId(grupo.id);
                                                            }}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#38bdf8',
                                                                fontSize: '13px',
                                                                cursor: 'pointer',
                                                                fontWeight: 600,
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                transition: 'background 0.2s'
                                                            }}
                                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                                                            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                                        >
                                                            ✏️ Configurar
                                                        </button>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <span style={{ fontWeight: 800, color: isSelected ? '#38bdf8' : '#475569', fontSize: '16px' }}>
                                                                {groupConsumoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                            <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '4px' }}>
                                                                Kg
                                                            </span>
                                                        </div>
                                                        <span style={{ fontSize: '18px', color: '#64748b', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                                            ▼
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Accordion Detail Content */}
                                                {isExpanded && (
                                                    <div style={{ padding: '20px', background: 'var(--bg-primary, #0b0f19)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                        {groupItemsBreakdown.length === 0 ? (
                                                            <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '10px' }}>
                                                                No se registraron consumos para los materiales de este grupo en el período seleccionado.
                                                            </div>
                                                        ) : (
                                                            groupItemsBreakdown.map((itemGroup) => (
                                                                <div key={itemGroup.item.id} style={{ border: '1px solid var(--border-strong, #1e293b)', borderRadius: '8px', overflow: 'hidden' }}>
                                                                    <div style={{ padding: '10px 14px', background: 'var(--bg-secondary, #111827)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                            <strong style={{ color: '#fff', fontSize: '14px' }}>{itemGroup.item.descripcion}</strong>
                                                                            <span style={{ fontSize: '11px', color: '#64748b' }}>Cód: {itemGroup.item.codigoInterno}</span>
                                                                        </div>
                                                                        <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '14px' }}>
                                                                            {itemGroup.totalQty.toLocaleString('es-AR', { minimumFractionDigits: 2 })} {itemGroup.item.unidadPrincipal}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ overflowX: 'auto' }}>
                                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                                            <thead>
                                                                                <tr style={{ borderBottom: '1px solid var(--border-strong, #1e293b)', background: 'rgba(0,0,0,0.15)' }}>
                                                                                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b' }}>Fecha</th>
                                                                                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b' }}>Cliente</th>
                                                                                    <th style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>Cantidad</th>
                                                                                    <th style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>Remito / Documento</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {itemGroup.movements.map((mov: any, index: number) => {
                                                                                    const docNum = mov.documento?.numero || mov.documentoNumero;
                                                                                    const clientName = mov.documento?.partner?.name || '—';
                                                                                    return (
                                                                                        <tr key={mov.id || index} style={{ borderBottom: index < itemGroup.movements.length - 1 ? '1px solid var(--border-strong, #1e293b)' : 'none' }}>
                                                                                            <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>
                                                                                                {new Date(mov.fecha).toLocaleDateString('es-AR')}
                                                                                            </td>
                                                                                            <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>
                                                                                                {clientName}
                                                                                            </td>
                                                                                            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#38bdf8', fontWeight: 600 }}>
                                                                                                {Math.abs(Number(mov.qtyPrincipal)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                                                            </td>
                                                                                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                                                                {mov.documentoId ? (
                                                                                                    <button 
                                                                                                        onClick={(e) => handleRemitoClick(e, mov.documentoId, docNum)}
                                                                                                        style={{ 
                                                                                                            background: 'rgba(56, 189, 248, 0.1)', 
                                                                                                            border: '1px solid rgba(56, 189, 248, 0.3)', 
                                                                                                            color: '#38bdf8', 
                                                                                                            padding: '2px 6px', 
                                                                                                            borderRadius: '4px', 
                                                                                                            fontSize: '10px',
                                                                                                            fontWeight: 600,
                                                                                                            cursor: 'pointer'
                                                                                                        }}
                                                                                                    >
                                                                                                        📄 {docNum || 'Ver Detalle'}
                                                                                                    </button>
                                                                                                ) : (
                                                                                                    <span style={{ color: '#64748b' }}>{docNum || '—'}</span>
                                                                                                )}
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ) : (
                            itemsBreakdown.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                    No se encontraron salidas registradas en el período.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {itemsBreakdown.map((group) => {
                                        const isExpanded = !!expandedItems[group.item.id];
                                        const isSelected = !excludedMaterialIds[group.item.id];
                                        return (
                                            <div key={group.item.id} style={{ borderBottom: '1px solid var(--border-strong, #1e293b)' }}>
                                                
                                                {/* Accordion Trigger Row */}
                                                <div 
                                                    onClick={() => toggleItemExpanded(group.item.id)}
                                                    style={{ 
                                                        padding: '16px 20px', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'space-between', 
                                                        cursor: 'pointer',
                                                        background: isExpanded ? 'rgba(15, 23, 42, 0.4)' : 'transparent',
                                                        transition: 'background 0.2s ease'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                                        <input 
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={() => toggleMaterialSelection(group.item.id)}
                                                            style={{ 
                                                                cursor: 'pointer', 
                                                                width: '18px', 
                                                                height: '18px', 
                                                                accentColor: '#38bdf8' 
                                                            }}
                                                        />
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                                                            <span style={{ fontWeight: 700, color: isSelected ? '#fff' : '#64748b', fontSize: '15px', textDecoration: isSelected ? 'none' : 'line-through' }}>
                                                                {group.item.codigoInterno}
                                                            </span>
                                                            <span style={{ color: isSelected ? 'var(--text-muted, #9ca3af)' : '#475569', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {group.item.descripcion}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <span style={{ fontWeight: 800, color: isSelected ? '#38bdf8' : '#475569', fontSize: '16px' }}>
                                                                {group.totalQty.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                            <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '4px' }}>
                                                                {group.item.unidadPrincipal}
                                                            </span>
                                                        </div>
                                                        <span style={{ fontSize: '18px', color: '#64748b', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                                            ▼
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Accordion Detail Content */}
                                                {isExpanded && (
                                                    <div style={{ padding: '0 20px 20px 20px', background: 'var(--bg-primary, #0b0f19)' }}>
                                                        <div style={{ overflowX: 'auto', border: '1px solid var(--border-strong, #1e293b)', borderRadius: '8px' }}>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                                <thead>
                                                                    <tr style={{ borderBottom: '1px solid var(--border-strong, #1e293b)', background: 'var(--bg-secondary, #111827)' }}>
                                                                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b' }}>Fecha</th>
                                                                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b' }}>Cliente</th>
                                                                        <th style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>Cantidad</th>
                                                                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>Remito / Documento</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {group.movements.map((mov: any, index: number) => {
                                                                        const docNum = mov.documento?.numero || mov.documentoNumero;
                                                                        const clientName = mov.documento?.partner?.name || '—';
                                                                        return (
                                                                            <tr key={mov.id || index} style={{ borderBottom: index < group.movements.length - 1 ? '1px solid var(--border-strong, #1e293b)' : 'none' }}>
                                                                                <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>
                                                                                    {new Date(mov.fecha).toLocaleDateString('es-AR')}
                                                                                </td>
                                                                                <td style={{ padding: '10px 12px', color: '#e2e8f0', fontWeight: 500 }}>
                                                                                    {clientName}
                                                                                </td>
                                                                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#38bdf8', fontWeight: 600 }}>
                                                                                    {Math.abs(Number(mov.qtyPrincipal)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                                                </td>
                                                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                                                    {mov.documentoId ? (
                                                                                        <button 
                                                                                            onClick={(e) => handleRemitoClick(e, mov.documentoId, docNum)}
                                                                                            style={{ 
                                                                                                background: 'rgba(56, 189, 248, 0.1)', 
                                                                                                border: '1px solid rgba(56, 189, 248, 0.3)', 
                                                                                                color: '#38bdf8', 
                                                                                                padding: '4px 8px', 
                                                                                                borderRadius: '6px', 
                                                                                                fontSize: '11px',
                                                                                                fontWeight: 600,
                                                                                                cursor: 'pointer',
                                                                                                transition: 'all 0.2s'
                                                                                            }}
                                                                                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)' }}
                                                                                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)' }}
                                                                                        >
                                                                                            📄 {docNum || 'Ver Detalle'}
                                                                                        </button>
                                                                                    ) : (
                                                                                        <span style={{ color: '#64748b' }}>{docNum || '—'}</span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </Card>

                    {/* Mobile Horizontal Bar Chart at the Bottom */}
                    {isMobile && barChartData.length > 0 && (
                        <Card style={{ padding: '20px', marginTop: '10px' }}>
                            <h3 style={{ color: 'var(--text-primary, #f3f4f6)', fontSize: '14px', margin: '0 0 15px 0', fontWeight: 700 }}>
                                📊 Consumo por {viewByGroup ? 'Grupo' : 'Material'} (Kilos)
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart 
                                    data={barChartData} 
                                    layout="vertical"
                                    margin={{ left: 10, right: 20, top: 0, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong, #1e293b)" horizontal={false} />
                                    <XAxis type="number" stroke="#64748b" fontSize={11} />
                                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={80} />
                                    <Tooltip 
                                        cursor={{ fill: 'var(--border-strong, #1e293b)' }}
                                        contentStyle={{ background: 'var(--bg-primary, #0f172a)', border: '1px solid var(--border-strong, #334155)', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Bar dataKey="kilos" fill="#38bdf8" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    )}

                    {showDetailModal && (
                        <RemitoDetailModal 
                            open={showDetailModal}
                            onClose={() => {
                                setShowDetailModal(false);
                                setSelectedRemito(null);
                            }}
                            remito={selectedRemito}
                        />
                    )}

                    {editComboId && (
                        <EditComboModal 
                            combo={combos.find((c: any) => c.id === editComboId)} 
                            items={items} 
                            onClose={() => setEditComboId(null)} 
                            onSave={async (ids: string[]) => { 
                                await updateCombo({ id: editComboId, itemIds: ids }); 
                                setEditComboId(null); 
                            }} 
                        />
                    )}
                </div>
            )}
        </div>
    );
}
