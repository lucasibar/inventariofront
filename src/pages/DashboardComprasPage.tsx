import { useGetDashboardComprasQuery, useGetAlertsQuery } from '../features/stock/api/stock.api';
import { PageHeader, Card, Badge, SearchBar, Spinner } from './common/ui';
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
        <div className="dashboard-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <style>{`
                .dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
                @media (max-width: 900px) {
                    .dashboard-grid { grid-template-columns: 1fr; }
                    .dashboard-container { padding: 16px !important; }
                    .header-top { flex-direction: column; align-items: stretch !important; gap: 16px !important; }
                }
                .stock-bar-container {
                    padding: 16px;
                    border-bottom: 1px solid #1e2133;
                    transition: background 0.2s;
                }
                .stock-bar-container:last-child { border-bottom: none; }
                .stock-bar-container:hover { background: rgba(255,255,255,0.02); }
            `}</style>

            <div className="header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <PageHeader title="Abastecimiento" subtitle="Estado de stock y alertas de reposición" />
                <SearchBar value={q} onChange={setQ} />
            </div>

            {alerts.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '24px', animation: 'pulse 2s infinite' }}>
                    <style>{`@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.2); } 70% { box-shadow: 0 0 0 10px rgba(239,68,68,0); } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } }`}</style>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '18px' }}>⚠️</span>
                        <span style={{ color: '#f87171', fontWeight: 700, fontSize: '15px' }}>Materiales por debajo del mínimo crítico ({alerts.length})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {alerts.map((a: any) => (
                            <span key={a.itemId} style={{ color: '#fca5a5', fontSize: '12px', background: 'rgba(239,68,68,0.15)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.1)' }}>
                                <strong>{a.descripcion}</strong>: {Number(a.stockActual).toFixed(1)} kg
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {isLoading ? <Spinner /> : (
                <div className="dashboard-grid">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px rgba(239,68,68,0.4)' }} />
                            <h3 style={{ color: '#f3f4f6', fontSize: '16px', fontWeight: 700, margin: 0 }}>Alta Rotación</h3>
                            <Badge color="#ef4444">{alta.length}</Badge>
                        </div>
                        <Card style={{ overflow: 'hidden' }}>
                            {alta.length === 0 ? <p style={{ padding: '32px', textAlign: 'center', color: '#4b5563' }}>Sin datos</p> : alta.map((item: any) => (
                                <div key={item.itemId} className="stock-bar-container">
                                    <StockBar item={item} />
                                </div>
                            ))}
                        </Card>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 10px rgba(245,158,11,0.4)' }} />
                            <h3 style={{ color: '#f3f4f6', fontSize: '16px', fontWeight: 700, margin: 0 }}>Media Rotación</h3>
                            <Badge color="#f59e0b">{media.length}</Badge>
                        </div>
                        <Card style={{ overflow: 'hidden' }}>
                            {media.length === 0 ? <p style={{ padding: '32px', textAlign: 'center', color: '#4b5563' }}>Sin datos</p> : media.map((item: any) => (
                                <div key={item.itemId} className="stock-bar-container">
                                    <StockBar item={item} />
                                </div>
                            ))}
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );

}
