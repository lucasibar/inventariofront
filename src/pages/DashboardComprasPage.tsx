import { useGetDashboardComprasQuery, useGetAlertsQuery } from '../features/stock/api/stock.api';
import { PageHeader, Card, Badge, SearchBar } from './common/ui';
import { useState } from 'react';

export default function DashboardComprasPage() {
    const { data: compras = [], isLoading } = useGetDashboardComprasQuery();
    const { data: alerts = [] } = useGetAlertsQuery();
    const [q, setQ] = useState('');

    const filtered = compras.filter((c: any) =>
        !q || c.descripcion?.toLowerCase().includes(q.toLowerCase()) || c.codigoInterno?.toLowerCase().includes(q.toLowerCase())
    );
    const alta = filtered.filter((c: any) => c.rotacion === 'ALTA');
    const media = filtered.filter((c: any) => c.rotacion === 'MEDIA');

    const StockBar = ({ item }: { item: any }) => {
        const pct = item.alertaKilos ? Math.min(100, (item.stockActual / item.alertaKilos) * 100) : 100;
        const color = pct < 50 ? '#ef4444' : pct < 80 ? '#f59e0b' : '#34d399';
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#d1d5db', fontSize: '13px', fontWeight: 600 }}>{item.descripcion}</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <code style={{ color: '#6b7280', fontSize: '11px' }}>{item.codigoInterno}</code>
                        {item.enAlerta && <Badge color="#f87171">⚠️ Bajo</Badge>}
                    </div>
                </div>
                <div style={{ height: '8px', background: '#1e2133', borderRadius: '99px', overflow: 'hidden', marginBottom: '4px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                    <span style={{ color }}>{Number(item.stockActual).toFixed(1)} kg</span>
                    {item.alertaKilos && <span>mín: {Number(item.alertaKilos).toFixed(1)} kg</span>}
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Dashboard de Compras" subtitle="Stock de materiales de alta y media rotación">
                <SearchBar value={q} onChange={setQ} />
            </PageHeader>

            {alerts.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ color: '#f87171', fontWeight: 700, fontSize: '13px' }}>🔴 {alerts.length} material{alerts.length !== 1 ? 'es' : ''} bajo mínimo</span>
                    {alerts.slice(0, 4).map((a: any) => (
                        <span key={a.itemId} style={{ color: '#fca5a5', fontSize: '12px', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                            {a.descripcion}: {Number(a.stockActual).toFixed(1)} kg
                        </span>
                    ))}
                    {alerts.length > 4 && <span style={{ color: '#f87171', fontSize: '12px' }}>+{alerts.length - 4} más</span>}
                </div>
            )}

            {isLoading ? <p style={{ color: '#9ca3af' }}>Cargando...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                            <h3 style={{ color: '#f3f4f6', fontSize: '15px', fontWeight: 700, margin: 0 }}>Alta Rotación</h3>
                            <Badge color="#ef4444">{alta.length}</Badge>
                        </div>
                        <Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {alta.length === 0 ? <p style={{ color: '#4b5563', fontSize: '13px' }}>Sin materiales</p> : alta.map((item: any) => <StockBar key={item.itemId} item={item} />)}
                        </Card>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                            <h3 style={{ color: '#f3f4f6', fontSize: '15px', fontWeight: 700, margin: 0 }}>Media Rotación</h3>
                            <Badge color="#f59e0b">{media.length}</Badge>
                        </div>
                        <Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {media.length === 0 ? <p style={{ color: '#4b5563', fontSize: '13px' }}>Sin materiales</p> : media.map((item: any) => <StockBar key={item.itemId} item={item} />)}
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
