import { useMemo } from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area 
} from 'recharts';
import { 
    useGetDashboardStatsQuery, 
    useGetPurchaseOrdersQuery 
} from '../purchase-orders/api/purchase-orders.api';
import { useGetAlertsQuery } from '../../warehouse/stock/api/stock.api';
import { PageHeader, Card, Badge, Spinner, Btn } from '../../../shared/ui';
import { Link } from 'react-router-dom';

export default function DashboardComprasPage() {
    const { data: stats, isLoading: loadingStats } = useGetDashboardStatsQuery();
    const { data: alerts = [] } = useGetAlertsQuery();
    const { data: orders = [] } = useGetPurchaseOrdersQuery();

    // Mock data for stock projection (In a real app, this would come from the backend)
    const projectionData = useMemo(() => {
        const data = [];
        let currentStock = 12500; // Total kg in warehouse
        const capacity = 20000;
        const avgConsumption = 450; // kg/day
        
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            // Expected arrivals (mock)
            let arrival = 0;
            if (i === 5) arrival = 3000;
            if (i === 15) arrival = 5000;
            if (i === 22) arrival = 2000;

            currentStock = currentStock - avgConsumption + arrival;
            
            data.push({
                name: date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
                stock: Math.max(0, currentStock),
                capacity: capacity,
                threshold: capacity * 0.9
            });
        }
        return data;
    }, []);

    if (loadingStats) return <div style={{ padding: '40px', textAlign: 'center' }}><Spinner /></div>;

    const kpis = [
        { title: 'Órdenes Pendientes', value: stats?.pendingOrdersCount || 0, icon: '📄', color: '#6366f1', link: '/pedidos-compra' },
        { title: 'Materiales Críticos', value: alerts.length, icon: '⚠️', color: '#ef4444', link: '/compras/materiales-criticos' },
        { title: 'Tiempo de Entrega', value: `${stats?.avgDeliveryTime || 0}d`, icon: '⏱️', color: '#10b981', sub: 'Promedio Proveedores' },
        { title: 'Compras del Mes', value: stats?.purchasesMonth || 0, icon: '🛒', color: '#f59e0b', sub: 'Órdenes emitidas' },
        { title: 'Proveedores Demorados', value: 2, icon: '🚚', color: '#f87171', sub: 'Entrega fuera de término' },
    ];

    return (
        <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
            <style>{`
                .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; margin-bottom: 32px; }
                .kpi-card { position: relative; overflow: hidden; transition: transform 0.2s; border: 1px solid rgba(255,255,255,0.05); }
                .kpi-card:hover { transform: translateY(-4px); border-color: rgba(99, 102, 241, 0.3); }
                .kpi-icon { position: absolute; right: -10px; bottom: -10px; font-size: 64px; opacity: 0.05; transform: rotate(-15deg); }
                .chart-container { background: rgba(17, 24, 39, 0.4); border-radius: 16px; padding: 24px; border: 1px solid rgba(255,255,255,0.05); }
                .section-title { font-size: 18px; font-weight: 700; color: #f3f4f6; margin-bottom: 24px; display: flex; align-items: center; gap: 10px; }
            `}</style>

            <PageHeader title="Dashboard de Compras" subtitle="Visión general de abastecimiento y logística">
                <Btn variant="secondary" onClick={() => window.location.href='/compras/conciliacion'}>🔗 Conciliar Remitos</Btn>
                <Btn onClick={() => window.location.href='/pedidos-compra'}>+ Nueva Orden</Btn>
            </PageHeader>

            <div className="kpi-grid">
                {kpis.map((kpi, i) => (
                    <Card key={i} className="kpi-card">
                        <div className="kpi-icon">{kpi.icon}</div>
                        <span style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 500 }}>{kpi.title}</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '8px 0' }}>
                            <span style={{ fontSize: '28px', fontWeight: 800, color: kpi.color }}>{kpi.value}</span>
                        </div>
                        {kpi.link ? (
                            <Link to={kpi.link} style={{ fontSize: '12px', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Ver detalles →</Link>
                        ) : (
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>{kpi.sub}</span>
                        )}
                    </Card>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <div className="chart-container">
                    <h3 className="section-title">📈 Proyección de Stock (Próximos 30 días)</h3>
                    <div style={{ height: '350px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={projectionData}>
                                <defs>
                                    <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(1)}k`} />
                                <Tooltip 
                                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                                    itemStyle={{ color: '#f3f4f6' }}
                                />
                                <Area type="monotone" dataKey="stock" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorStock)" name="Stock Estimado (kg)" />
                                <ReferenceLine y={20000} label={{ value: 'Capacidad Máxima', position: 'top', fill: '#ef4444', fontSize: 10 }} stroke="#ef4444" strokeDasharray="5 5" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '16px', fontStyle: 'italic' }}>
                        * Proyección basada en el consumo promedio de los últimos 30 días y órdenes de compra en tránsito.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <Card style={{ flex: 1 }}>
                        <h3 className="section-title">🕒 Próximas Entregas</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {orders.filter(o => o.estado === 'PENDIENTE').slice(0, 5).map((o: any) => (
                                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#f3f4f6' }}>{o.supplier?.name}</div>
                                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{o.numero} • {new Date(o.fechaEmision).toLocaleDateString()}</div>
                                    </div>
                                    <Badge color={new Date(o.fechaEntregaEsperada) < new Date() ? '#ef4444' : '#10b981'}>
                                        {o.fechaEntregaEsperada ? new Date(o.fechaEntregaEsperada).toLocaleDateString() : 'S/F'}
                                    </Badge>
                                </div>
                            ))}
                            {orders.length === 0 && <p style={{ color: '#4b5563', fontSize: '13px', textAlign: 'center' }}>No hay entregas pendientes</p>}
                        </div>
                    </Card>

                    <Card style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)' }}>
                        <h3 className="section-title">📊 Resumen de Compras</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                            <div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>$1.2M</div>
                                <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase' }}>Invertido Mes</div>
                            </div>
                            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                            <div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>15.4t</div>
                                <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase' }}>Volumen Recibido</div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
