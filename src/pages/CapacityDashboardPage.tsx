import { useGetCapacityDashboardQuery } from '../features/dashboard/api/dashboard.api';
import { PageHeader, Card, Spinner } from './common/ui';

/* ─── Gauge Component ─── */
function CapacityGauge({ percentage, label, occupied, total }: { percentage: number; label: string; occupied: number; total: number }) {
    const color = percentage > 90 ? '#ef4444' : percentage > 70 ? '#f59e0b' : '#34d399';
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: '#1a1d2e', borderRadius: '12px', border: '1px solid #2a2d3e' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color }}>{percentage.toFixed(1)}%</span>
            </div>
            
            <div style={{ height: '8px', background: '#0f1117', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                <div 
                    style={{ 
                        height: '100%', 
                        width: `${percentage}%`, 
                        background: color, 
                        transition: 'width 1s ease-in-out',
                        boxShadow: `0 0 10px ${color}88`
                    }} 
                />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                <span>Ocupado: {occupied.toFixed(3)} m³</span>
                <span>Total: {total.toFixed(3)} m³</span>
            </div>
        </div>
    );
}

export default function CapacityDashboardPage() {
    const { data: dashboard = [], isLoading } = useGetCapacityDashboardQuery();

    if (isLoading) return <Spinner />;

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Medidores de Capacidad" subtitle="Estado de ocupación por depósito y categoría de material" />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                {dashboard.map((dep: any) => (
                    <Card key={dep.depotId}>
                        <div style={{ padding: '20px', borderBottom: '1px solid #2a2d3e' }}>
                            <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase' }}>{dep.planta || 'Sin Planta'}</div>
                            <h3 style={{ margin: 0, color: '#f3f4f6' }}>{dep.depotNombre}</h3>
                        </div>
                        
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {dep.categories.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#4b5563', fontSize: '13px' }}>
                                    No hay posiciones configuradas con capacidad en este depósito.
                                </div>
                            ) : dep.categories.map((cat: any) => (
                                <CapacityGauge 
                                    key={cat.name} 
                                    label={cat.name} 
                                    percentage={cat.percentage} 
                                    occupied={cat.occupiedVolume} 
                                    total={cat.totalCapacity} 
                                />
                            ))}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
