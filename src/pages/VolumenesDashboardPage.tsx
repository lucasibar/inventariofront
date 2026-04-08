import { useMemo } from 'react';
import { useGetVolumesDashboardQuery } from '../features/dashboard/api/dashboard.api';
import { PageHeader, Card, Spinner, Badge, Table } from './common/ui';

export default function VolumenesDashboardPage() {
    const { data: volumes = [], isLoading } = useGetVolumesDashboardQuery();

    const overStockItems = useMemo(() => {
        return volumes.filter(v => v.isOverStock);
    }, [volumes]);

    const totalBoxes = useMemo(() => {
        return Math.ceil(volumes.reduce((acc, v) => acc + (v.currentBoxes || 0), 0));
    }, [volumes]);

    return (
        <div style={{ padding: '24px', maxWidth: '1240px', margin: '0 auto' }}>
            <PageHeader title="Dashboard de Volúmenes" subtitle="Control de cajas y capacidades por material" />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                <Card>
                    <p style={{ color: '#9ca3af', marginBottom: '8px' }}>Total de Cajas Ocupadas (Aprox)</p>
                    <h2 style={{ fontSize: '32px', color: '#f3f4f6', margin: 0 }}>{totalBoxes} <span style={{fontSize:'16px', color:'#6b7280'}}>cajas físicas estimadas</span></h2>
                </Card>
                <Card>
                    <p style={{ color: '#9ca3af', marginBottom: '8px' }}>Alertas de Sobre-Stock</p>
                    <h2 style={{ fontSize: '32px', color: overStockItems.length > 0 ? '#ef4444' : '#10b981', margin: 0 }}>
                        {overStockItems.length} <span style={{fontSize:'16px', color:'#6b7280'}}>materiales excedidos</span>
                    </h2>
                </Card>
            </div>

            {overStockItems.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <Card style={{ borderColor: '#7f1d1d', background: 'rgba(127, 29, 29, 0.1)' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#ef4444' }}>Alerta de Sobre-Stock (Superan Límite de Máximo)</h3>
                        <Table
                            cols={['Material', 'Límite Máximo', 'Stock Actual', 'Sobran Cajas']}
                            rows={overStockItems.map(it => [
                                <div>
                                    <span style={{ fontWeight: 600 }}>{it.descripcion}</span>
                                    <br /><code style={{ fontSize: '12px', color: '#9ca3af' }}>{it.codigoInterno}</code>
                                </div>,
                                <span style={{ color: '#10b981' }}>{it.stockMaximo} kg (aprox {Math.ceil(it.maxBoxes)} cajas)</span>,
                                <span style={{ color: '#ef4444' }}>{it.currentKilos} kg (aprox {Math.ceil(it.currentBoxes)} cajas)</span>,
                                <Badge color="#ef4444">+{Math.ceil(it.currentBoxes - it.maxBoxes)} cajas extra</Badge>
                            ])}
                        />
                    </Card>
                </div>
            )}

            <Card>
                <h3 style={{ margin: '0 0 16px 0' }}>Detalle de ocupación por Material (Todos)</h3>
                <Table
                    loading={isLoading}
                    cols={['Material', 'Configuración de Cajas (Kg/Caja)', 'Límite Configurado', 'Stock / Cajas Actual']}
                    rows={volumes.map(it => [
                        <div>
                            <span style={{ fontWeight: 600 }}>{it.descripcion}</span>
                            <br /><code style={{ fontSize: '12px', color: '#9ca3af' }}>{it.codigoInterno}</code>
                        </div>,
                        it.kilosPorCaja ? (
                            <Badge color="#6366f1">{it.kilosPorCaja} kg = 1 Caja</Badge>
                        ) : (
                            <span style={{ opacity: 0.5 }}>No configurado</span>
                        ),
                        it.stockMaximo ? (
                            <span style={{ color: '#9ca3af' }}>Max: {it.stockMaximo} kg ({Math.ceil(it.maxBoxes)} cajas)</span>
                        ) : (
                            <span style={{ opacity: 0.5 }}>Sin límite</span>
                        ),
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span style={{ color: '#f3f4f6', fontWeight: 600 }}>{it.currentKilos} kg</span>
                            <span style={{ color: '#6b7280' }}>({Math.ceil(it.currentBoxes)} cajas)</span>
                            {it.isOverStock && <Badge color="#ef4444">Excedido</Badge>}
                        </div>
                    ])}
                />
            </Card>
        </div>
    );
}
