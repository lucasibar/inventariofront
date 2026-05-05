import { useState } from 'react';
import { useGetItemsQuery } from '../../config/items/api/items.api';
import { useGetConsumptionAnalyticsQuery } from '../stock/api/stock.api';
import { PageHeader, Card, SearchSelect, Input, Spinner, Badge } from '../../../shared/ui';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

export default function ReporteSalidasPage() {
    const [itemId, setItemId] = useState('');
    const [desde, setDesde] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);

    const { data: items = [] } = useGetItemsQuery({});
    const { data: analytics, isFetching } = useGetConsumptionAnalyticsQuery(
        { itemId, desde, hasta },
        { skip: !itemId }
    );

    const selectedItem = items.find(i => i.id === itemId);

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <PageHeader title="Reporte de Salidas" subtitle="Análisis histórico de consumo de materiales" />

            <Card style={{ padding: '20px', marginBottom: '24px', overflow: 'visible' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', alignItems: 'end' }}>
                    <SearchSelect
                        label="Seleccionar Material"
                        value={itemId}
                        onChange={setItemId}
                        options={items.map(i => ({ value: i.id, label: `${i.codigoInterno} — ${i.descripcion}` }))}
                        placeholder="Buscar material..."
                    />
                    <Input label="Desde" type="date" value={desde} onChange={setDesde} />
                    <Input label="Hasta" type="date" value={hasta} onChange={setHasta} />
                </div>
            </Card>

            {!itemId ? (
                <div style={{ textAlign: 'center', padding: '100px', color: '#4b5563', border: '2px dashed #1e2133', borderRadius: '16px' }}>
                    <span style={{ fontSize: '40px', display: 'block', marginBottom: '16px' }}>📊</span>
                    Seleccione un material para ver su historial de consumo
                </div>
            ) : isFetching ? (
                <Spinner />
            ) : analytics ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* KPIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <Card style={{ padding: '20px', textAlign: 'center' }}>
                            <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>KILOS TOTALES SALIDA</div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>
                                {analytics.total.toFixed(2)} <small style={{ fontSize: '14px', color: '#6b7280' }}>{selectedItem?.unidadPrincipal}</small>
                            </div>
                        </Card>
                        <Card style={{ padding: '20px', textAlign: 'center' }}>
                            <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>PROMEDIO DIARIO</div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: '#a5b4fc' }}>
                                {analytics.dailyAvg.toFixed(2)} <small style={{ fontSize: '14px', color: '#6b7280' }}>{selectedItem?.unidadPrincipal}/día</small>
                            </div>
                        </Card>
                        <Card style={{ padding: '20px', textAlign: 'center' }}>
                            <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>DÍAS ANALIZADOS</div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>{analytics.periodDays}</div>
                        </Card>
                    </div>

                    {/* Chart */}
                    <Card style={{ padding: '24px', height: '400px' }}>
                        <h3 style={{ color: '#f3f4f6', fontSize: '16px', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            📈 Consumo Progresivo 
                            <Badge color="#6366f1">{selectedItem?.descripcion}</Badge>
                        </h3>
                        <ResponsiveContainer width="100%" height="90%">
                            <AreaChart data={analytics.timeline}>
                                <defs>
                                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                                <XAxis 
                                    dataKey="fecha" 
                                    stroke="#4b5563" 
                                    fontSize={11}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                                />
                                <YAxis stroke="#4b5563" fontSize={11} />
                                <Tooltip 
                                    contentStyle={{ background: '#1a1d2e', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#a5b4fc' }}
                                    labelFormatter={(val) => new Date(val).toLocaleDateString('es-AR', { dateStyle: 'full' })}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="qty" 
                                    name="Cantidad"
                                    stroke="#6366f1" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorQty)" 
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>

                    {/* Breakdown Table (Optional but useful) */}
                    <Card style={{ padding: '0' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e2133', color: '#f3f4f6', fontWeight: 600 }}>
                            Desglose Diario
                        </div>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#1a1d2e', zIndex: 1 }}>
                                    <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
                                        <th style={{ padding: '12px 20px', textAlign: 'left', color: '#6b7280', fontSize: '11px', textTransform: 'uppercase' }}>Fecha</th>
                                        <th style={{ padding: '12px 20px', textAlign: 'right', color: '#6b7280', fontSize: '11px', textTransform: 'uppercase' }}>Cantidad ({selectedItem?.unidadPrincipal})</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.timeline.filter(d => d.qty > 0).reverse().map((d, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #1e2133' }}>
                                            <td style={{ padding: '10px 20px', color: '#d1d5db', fontSize: '13px' }}>
                                                {new Date(d.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </td>
                                            <td style={{ padding: '10px 20px', textAlign: 'right', color: '#fff', fontWeight: 600, fontSize: '13px' }}>
                                                {d.qty.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            ) : null}
        </div>
    );
}
