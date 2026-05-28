import { useState, useMemo } from 'react';
import { useGetRecentMovementsQuery } from '../stock/api/stock.api';
import { useLazyGetRemitoSalidaQuery } from '../remitosSalida/api/remitos-salida.api';
import { RemitoDetailModal } from '../remitos/ui/RemitoDetailModal';
import { PageHeader, Card, Input, Spinner } from '../../../shared/ui';
import { useIsMobile } from '../../../shared/ui';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar 
} from 'recharts';

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

    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [selectedRemito, setSelectedRemito] = useState<any>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const toggleItemExpanded = (itemId: string) => {
        setExpandedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    // Calculate aggregated metrics and charts data
    const { itemsBreakdown, timelineData, barChartData, totalKilos } = useMemo(() => {
        const groups: Record<string, {
            item: { id: string; codigoInterno: string; descripcion: string; unidadPrincipal: string };
            totalQty: number;
            movements: any[];
        }> = {};

        let sumKilos = 0;
        const dailyTotals: Record<string, number> = {};

        movements.forEach(m => {
            if (!m.item) return;
            const itemId = m.item.id;
            const qty = Math.abs(Number(m.qtyPrincipal || 0));
            sumKilos += qty;

            // Group by item
            if (!groups[itemId]) {
                groups[itemId] = {
                    item: m.item,
                    totalQty: 0,
                    movements: []
                };
            }
            groups[itemId].totalQty += qty;
            groups[itemId].movements.push(m);

            // Group by date for progressive chart
            const dateStr = m.fecha;
            dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + qty;
        });

        // Convert to sorted array
        const sortedBreakdown = Object.values(groups).sort((a, b) => b.totalQty - a.totalQty);

        // Build progressive area chart data (timeline sorted ascending)
        const sortedDates = Object.keys(dailyTotals).sort();
        let runningTotal = 0;
        const timeline = sortedDates.map(date => {
            runningTotal += dailyTotals[date];
            return {
                fecha: date,
                qty: Number(runningTotal.toFixed(2))
            };
        });

        // Build vertical/horizontal bar chart data for mobile
        const bars = sortedBreakdown.map(g => ({
            name: g.item.codigoInterno,
            kilos: Number(g.totalQty.toFixed(2)),
            descripcion: g.item.descripcion
        })).slice(0, 10); // top 10 materials to fit nicely

        return {
            itemsBreakdown: sortedBreakdown,
            timelineData: timeline,
            barChartData: bars,
            totalKilos: sumKilos
        };
    }, [movements]);

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
            />

            {/* Filters */}
            <Card style={{ padding: '20px' }}>
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
            </Card>

            {isFetching ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <Spinner />
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* General Summary Card */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '20px' }}>
                        <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', border: '1px solid #312e81' }}>
                            <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Consumo Total del Período
                            </div>
                            <div style={{ fontSize: '36px', fontWeight: 800, color: '#38bdf8' }}>
                                {totalKilos.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span style={{ fontSize: '18px', color: '#94a3b8', marginLeft: '6px' }}>Kg</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                                Basado en {movements.length} transacciones registradas
                            </div>
                        </Card>

                        {/* Desktop Progressive Consumption Chart */}
                        {!isMobile && (
                            <Card style={{ padding: '20px', height: '240px' }}>
                                <h3 style={{ color: '#f3f4f6', fontSize: '14px', margin: '0 0 15px 0', fontWeight: 700 }}>
                                    📈 Consumo Acumulado (Kilos Progresivo)
                                </h3>
                                {timelineData.length === 0 ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80%', color: '#64748b' }}>
                                        No hay datos en el rango seleccionado
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="80%">
                                        <AreaChart data={timelineData}>
                                            <defs>
                                                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis 
                                                dataKey="fecha" 
                                                stroke="#64748b" 
                                                fontSize={11}
                                                tickFormatter={(val) => new Date(val).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                                            />
                                            <YAxis stroke="#64748b" fontSize={11} />
                                            <Tooltip 
                                                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                                                itemStyle={{ color: '#38bdf8' }}
                                                labelFormatter={(val) => new Date(val).toLocaleDateString('es-AR', { dateStyle: 'medium' })}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="qty" 
                                                name="Acumulado" 
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
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', background: '#111827', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: '#f3f4f6' }}>Materiales Consumidos</span>
                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>Ordenado por Kilos</span>
                        </div>

                        {itemsBreakdown.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                No se encontraron salidas registradas en el período.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {itemsBreakdown.map((group) => {
                                    const isExpanded = !!expandedItems[group.item.id];
                                    return (
                                        <div key={group.item.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                            
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
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                                                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>
                                                        {group.item.codigoInterno}
                                                    </span>
                                                    <span style={{ color: '#9ca3af', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {group.item.descripcion}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '16px' }}>
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
                                                <div style={{ padding: '0 20px 20px 20px', background: '#0b0f19' }}>
                                                    <div style={{ overflowX: 'auto', border: '1px solid #1e293b', borderRadius: '8px' }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                            <thead>
                                                                <tr style={{ borderBottom: '1px solid #1e293b', background: '#111827' }}>
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
                                                                        <tr key={mov.id || index} style={{ borderBottom: index < group.movements.length - 1 ? '1px solid #1e293b' : 'none' }}>
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
                        )}
                    </Card>

                    {/* Mobile Horizontal Bar Chart at the Bottom */}
                    {isMobile && barChartData.length > 0 && (
                        <Card style={{ padding: '20px', marginTop: '10px' }}>
                            <h3 style={{ color: '#f3f4f6', fontSize: '14px', margin: '0 0 15px 0', fontWeight: 700 }}>
                                📊 Consumo por Material (Kilos)
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart 
                                    data={barChartData} 
                                    layout="vertical"
                                    margin={{ left: 10, right: 20, top: 0, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                    <XAxis type="number" stroke="#64748b" fontSize={11} />
                                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={80} />
                                    <Tooltip 
                                        cursor={{ fill: '#1e293b' }}
                                        contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Bar dataKey="qty" fill="#38bdf8" radius={[0, 4, 4, 0]} barSize={20} />
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
                </div>
            )}
        </div>
    );
}
