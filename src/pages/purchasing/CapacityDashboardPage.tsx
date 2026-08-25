import { useMemo } from 'react';
import { useGetCapacityDashboardQuery, useGetCapacityTimelineQuery, useGetVolumesDashboardQuery } from '../../features/purchasing/dashboard/api/dashboard.api';
import { PageHeader, Card, Spinner, Badge, Table } from '../../shared/ui';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

/* ─── Gauge Component ─── */
function CapacityGauge({ percentage, label, occupied, total }: { percentage: number; label: string; occupied: number; total: number }) {
    const color = percentage > 90 ? '#ef4444' : percentage > 70 ? '#f59e0b' : '#34d399';
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'var(--bg-secondary, #1a1d2e)', borderRadius: '12px', border: '1px solid var(--border-color, #2a2d3e)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color }}>{percentage.toFixed(1)}%</span>
            </div>
            
            <div style={{ height: '8px', background: 'var(--bg-primary, #0f1117)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
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
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-subtle, #6b7280)' }}>
                <span>Ocupado: {occupied.toFixed(3)} m³</span>
                <span>Total: {total.toFixed(3)} m³</span>
            </div>
        </div>
    );
}

function CapacityTimelineChart() {
    const { data: timeline = [], isLoading } = useGetCapacityTimelineQuery();

    if (isLoading) return <Card style={{ marginBottom: '24px', padding: '24px', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></Card>;

    const chartData = timeline.map(d => ({
        date: d.date,
        historical: d.type === 'historical' || d.type === 'today' ? d.volume : null,
        projected: d.type === 'projected' || d.type === 'today' ? d.volume : null,
        type: d.type,
        originalVolume: d.volume
    }));

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const vol = data.originalVolume.toFixed(2);
            const type = data.type;
            let typeLabel = "Histórico";
            if(type === 'today') typeLabel = "Hoy (Actual)";
            else if(type === 'projected') typeLabel = "Proyectado";

            return (
                <div style={{ background: 'var(--bg-secondary, #1a1d2e)', border: '1px solid var(--border-color, #2a2d3e)', padding: '12px', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted, #9ca3af)', fontWeight: 600 }}>{label}</p>
                    <p style={{ margin: 0, color: 'var(--text-primary, #f3f4f6)' }}>
                        Volumen: <span style={{ fontWeight: 'bold', color: type === 'projected' ? '#818cf8' : '#34d399' }}>{vol} m³</span>
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-subtle, #6b7280)' }}>{typeLabel}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card style={{ marginBottom: '24px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-primary, #f3f4f6)' }}>Evolución y Proyección de Capacidad (30 Días)</h3>
            <div style={{ height: '400px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #2a2d3e)" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            stroke="var(--text-subtle, #6b7280)" 
                            tick={{ fill: 'var(--text-subtle, #6b7280)', fontSize: 12 }}
                            tickFormatter={(val) => {
                                const d = new Date(val);
                                return `${d.getDate()}/${d.getMonth()+1}`;
                            }}
                        />
                        <YAxis stroke="var(--text-subtle, #6b7280)" tick={{ fill: 'var(--text-subtle, #6b7280)', fontSize: 12 }} domain={[0, 1600]} />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={1558.48} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Capacidad Máxima (1558.48 m³)', fill: '#ef4444', fontSize: 12 }} />
                        
                        <Line 
                            type="monotone" 
                            dataKey="historical" 
                            stroke="#34d399" 
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, fill: '#34d399', stroke: 'var(--bg-secondary, #1a1d2e)', strokeWidth: 2 }}
                            connectNulls={false}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="projected" 
                            stroke="#818cf8" 
                            strokeDasharray="5 5"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, fill: '#818cf8', stroke: 'var(--bg-secondary, #1a1d2e)', strokeWidth: 2 }}
                            connectNulls={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

export default function CapacityDashboardPage() {
    const { data: dashboard = [], isLoading: isLoadingCapacity } = useGetCapacityDashboardQuery();
    const { data: volumes = [], isLoading: isLoadingVolumes } = useGetVolumesDashboardQuery();

    const overStockItems = useMemo(() => {
        return volumes.filter((v: any) => v.isOverStock);
    }, [volumes]);

    const totalBoxes = useMemo(() => {
        return Math.ceil(volumes.reduce((acc: number, v: any) => acc + (v.currentBoxes || 0), 0));
    }, [volumes]);

    if (isLoadingCapacity) return <Spinner />;

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Medidores de Capacidad" subtitle="Estado de ocupación por depósito y categoría de material" />
            
            <CapacityTimelineChart />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                {dashboard.map((dep: any) => (
                    <Card key={dep.depotId} style={{ display: 'flex', flexDirection: 'column', height: '380px' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                            <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase' }}>{dep.planta || 'Sin Planta'}</div>
                            <h3 style={{ margin: 0, color: 'var(--text-primary, #f3f4f6)' }}>{dep.depotNombre}</h3>
                        </div>
                        
                        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
                            {dep.categories.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dimmed, #4b5563)', fontSize: '13px' }}>
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

            {/* ─── Datos de Volúmenes Integrados ─── */}
            <div style={{ marginTop: '40px' }}>
                <PageHeader title="Control de Volúmenes y Cajas" subtitle="Control de cajas y capacidades por material" />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                    <Card>
                        <p style={{ color: 'var(--text-muted, #9ca3af)', marginBottom: '8px' }}>Total de Cajas Ocupadas (Aprox)</p>
                        <h2 style={{ fontSize: '32px', color: 'var(--text-primary, #f3f4f6)', margin: 0 }}>{totalBoxes} <span style={{ fontSize: '16px', color: 'var(--text-subtle, #6b7280)' }}>cajas físicas estimadas</span></h2>
                    </Card>
                    <Card>
                        <p style={{ color: 'var(--text-muted, #9ca3af)', marginBottom: '8px' }}>Alertas de Sobre-Stock</p>
                        <h2 style={{ fontSize: '32px', color: overStockItems.length > 0 ? '#ef4444' : '#10b981', margin: 0 }}>
                            {overStockItems.length} <span style={{ fontSize: '16px', color: 'var(--text-subtle, #6b7280)' }}>materiales excedidos</span>
                        </h2>
                    </Card>
                </div>

                {overStockItems.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <Card style={{ borderColor: '#7f1d1d', background: 'rgba(127, 29, 29, 0.1)' }}>
                            <h3 style={{ margin: '0 0 16px 0', color: '#ef4444' }}>Alerta de Sobre-Stock (Superan Límite de Máximo)</h3>
                            <Table
                                cols={['Material', 'Límite Máximo', 'Stock Actual', 'Sobran Cajas']}
                                rows={overStockItems.map((it: any) => [
                                    <div key={it.id || it.codigoInterno}>
                                        <span style={{ fontWeight: 600 }}>{it.descripcion}</span>
                                        <br /><code style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>{it.codigoInterno}</code>
                                    </div>,
                                    <span key="max" style={{ color: '#10b981' }}>{it.stockMaximo} kg (aprox {Math.ceil(it.maxBoxes)} cajas)</span>,
                                    <span key="curr" style={{ color: '#ef4444' }}>{it.currentKilos} kg (aprox {Math.ceil(it.currentBoxes)} cajas)</span>,
                                    <Badge key="badge" color="#ef4444">+{Math.ceil(it.currentBoxes - it.maxBoxes)} cajas extra</Badge>
                                ])}
                            />
                        </Card>
                    </div>
                )}

                <Card>
                    <h3 style={{ margin: '0 0 16px 0' }}>Detalle de ocupación por Material (Todos)</h3>
                    <Table
                        loading={isLoadingVolumes}
                        cols={['Material', 'Configuración de Cajas (Kg/Caja)', 'Límite Configurado', 'Stock / Cajas Actual']}
                        rows={volumes.map((it: any) => [
                            <div key={it.id || it.codigoInterno}>
                                <span style={{ fontWeight: 600 }}>{it.descripcion}</span>
                                <br /><code style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>{it.codigoInterno}</code>
                            </div>,
                            it.kilosPorCaja ? (
                                <Badge key="box" color="#6366f1">{it.kilosPorCaja} kg = 1 Caja</Badge>
                            ) : (
                                <span key="nobox" style={{ opacity: 0.5 }}>No configurado</span>
                            ),
                            it.stockMaximo ? (
                                <span key="max" style={{ color: 'var(--text-muted, #9ca3af)' }}>Max: {it.stockMaximo} kg ({Math.ceil(it.maxBoxes)} cajas)</span>
                            ) : (
                                <span key="nomax" style={{ opacity: 0.5 }}>Sin límite</span>
                            ),
                            <div key="curr" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-primary, #f3f4f6)', fontWeight: 600 }}>{it.currentKilos} kg</span>
                                <span style={{ color: 'var(--text-subtle, #6b7280)' }}>({Math.ceil(it.currentBoxes)} cajas)</span>
                                {it.isOverStock && <Badge color="#ef4444">Excedido</Badge>}
                            </div>
                        ])}
                    />
                </Card>
            </div>
        </div>
    );
}
