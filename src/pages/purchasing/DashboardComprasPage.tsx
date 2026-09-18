import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAlertsQuery } from '../../features/warehouse/stock/api/stock.api';
import { useGetCombosQuery } from '../../features/purchasing/combos/api/combos.api';
import { useGetItemsQuery } from '../../features/warehouse/materiales/api/items.api';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { PageHeader, Card, Badge, Btn, Table, Spinner, Select, useIsMobile } from '../../shared/ui';

export default function DashboardComprasPage() {
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    const [selectedDepotId, setSelectedDepotId] = useState<string>('');
    const { data: depots = [] } = useGetDepotsQuery();
    const { data: alerts = [], isLoading: loadingAlerts } = useGetAlertsQuery({ all: true });
    const { data: combos = [], isLoading: loadingCombos } = useGetCombosQuery(selectedDepotId || undefined);
    const { data: items = [], isLoading: loadingItems } = useGetItemsQuery({ depositoId: selectedDepotId || undefined });

    // Filtered and calculated metrics
    const stats = useMemo(() => {
        let criticalAlerts = 0;
        let warningAlerts = 0;
        let ignoredAlerts = 0;
        let totalDeficitKg = 0;

        alerts.forEach(a => {
            const isIgnored = Boolean(a.ignorarStockMinimo || a.meta?.ignorarStockMinimo);
            const actual = Number(a.stockActual || 0);
            const min = Number(a.stockMinimo || 0);

            if (isIgnored) {
                ignoredAlerts++;
            } else if (actual < min) {
                criticalAlerts++;
                totalDeficitKg += Math.max(0, min - actual);
            } else if (actual <= min * 1.25) {
                warningAlerts++;
            }
        });

        const combosWithDeficit = combos.filter((c: any) => Number(c.deficit || 0) > 0).length;

        return {
            criticalAlerts,
            warningAlerts,
            ignoredAlerts,
            totalDeficitKg,
            combosTotal: combos.length,
            combosWithDeficit,
            totalItems: items.length,
        };
    }, [alerts, combos, items]);

    const criticalList = useMemo(() => {
        return alerts
            .filter(a => !a.ignorarStockMinimo && !a.meta?.ignorarStockMinimo && Number(a.stockActual || 0) < Number(a.stockMinimo || 0))
            .slice(0, 8);
    }, [alerts]);

    const isLoading = loadingAlerts || loadingCombos || loadingItems;

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader
                title="Dashboard de Compras"
                subtitle="Monitoreo ejecutivo de abastecimiento, criticidad de materiales y alertas de stock"
            />

            {/* Top Navigation Shortcuts & Filter */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Btn
                        variant="primary"
                        onClick={() => navigate('/compras/alertas-stock')}
                        style={{ background: '#ef4444', borderColor: '#ef4444' }}
                    >
                        🚦 Ver Alertas de Stock ({stats.criticalAlerts})
                    </Btn>
                <Btn
                    variant="primary"
                    onClick={() => navigate('/compras/materiales-criticos-v2')}
                    style={{ background: '#6366f1', borderColor: '#6366f1' }}
                >
                    🔥 Materiales Críticos 2.0 (por Categoría)
                </Btn>
                    <Btn
                        variant="secondary"
                        onClick={() => navigate('/compras/materiales-criticos')}
                    >
                        ⚠️ Combos de Compra ({stats.combosTotal})
                    </Btn>
                </div>

                <div style={{ minWidth: '200px' }}>
                    <Select
                        value={selectedDepotId}
                        onChange={setSelectedDepotId}
                        options={[
                            { value: '', label: '🌐 Todos los depósitos' },
                            ...depots.map((d: any) => ({ value: d.id, label: d.nombre }))
                        ]}
                    />
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '28px' }}>
                <Card
                    style={{
                        padding: '18px',
                        background: stats.criticalAlerts > 0 ? 'rgba(239, 68, 68, 0.08)' : undefined,
                        border: stats.criticalAlerts > 0 ? '1.5px solid rgba(239, 68, 68, 0.35)' : undefined,
                        cursor: 'pointer',
                    }}
                    onClick={() => navigate('/compras/alertas-stock')}
                >
                    <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>
                        🔴 Materiales en Quiebre
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '6px', color: '#ef4444' }}>
                        {stats.criticalAlerts}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '4px' }}>
                        {stats.totalDeficitKg.toFixed(1)} kg bajo el mínimo
                    </div>
                </Card>

                <Card
                    style={{
                        padding: '18px',
                        cursor: 'pointer',
                    }}
                    onClick={() => navigate('/compras/alertas-stock')}
                >
                    <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
                        🟡 Cerca del Mínimo
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '6px', color: '#f59e0b' }}>
                        {stats.warningAlerts}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '4px' }}>
                        Materiales a monitorear
                    </div>
                </Card>

                <Card
                    style={{
                        padding: '18px',
                        cursor: 'pointer',
                    }}
                    onClick={() => navigate('/compras/materiales-criticos')}
                >
                    <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase' }}>
                        ⚠️ Combos con Déficit
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '6px', color: '#818cf8' }}>
                        {stats.combosWithDeficit} / {stats.combosTotal}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '4px' }}>
                        Grupos de compra configurados
                    </div>
                </Card>

                <Card
                    style={{
                        padding: '18px',
                    }}
                >
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', fontWeight: 700, textTransform: 'uppercase' }}>
                        🏷️ Total Materiales Activos
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '6px', color: 'var(--text-primary, #f3f4f6)' }}>
                        {stats.totalItems}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '4px' }}>
                        En el catálogo general
                    </div>
                </Card>
            </div>

            {/* Quick Overview Tables */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr', gap: '24px' }}>
                {/* Urgent Stock Deficit Table */}
                <Card style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary, #f3f4f6)' }}>
                            🚨 Materiales más urgentes a reponer
                        </h3>
                        <Btn
                            small
                            variant="secondary"
                            onClick={() => navigate('/compras/alertas-stock')}
                        >
                            Ver todos ↗
                        </Btn>
                    </div>

                    {isLoading ? (
                        <Spinner />
                    ) : criticalList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#10b981' }}>
                            ✓ No hay materiales con alerta crítica de stock actualmente.
                        </div>
                    ) : (
                        <Table
                            cols={['Material', 'Stock Actual', 'Mínimo', 'Faltan']}
                            rows={criticalList.map(item => [
                                <div key="m">
                                    <strong style={{ color: 'var(--text-primary, #f3f4f6)', display: 'block' }}>{item.descripcion}</strong>
                                    <code style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>{item.codigoInterno}</code>
                                </div>,
                                <span key="st" style={{ color: '#ef4444', fontWeight: 800 }}>
                                    {Number(item.stockActual || 0).toFixed(1)} kg
                                </span>,
                                <span key="min" style={{ color: 'var(--text-muted, #9ca3af)' }}>
                                    {Number(item.stockMinimo || 0).toFixed(1)} kg
                                </span>,
                                <Badge key="def" color="#ef4444">
                                    -{(Number(item.stockMinimo || 0) - Number(item.stockActual || 0)).toFixed(1)} kg
                                </Badge>
                            ])}
                        />
                    )}
                </Card>

                {/* Combos Status Summary */}
                <Card style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary, #f3f4f6)' }}>
                            📦 Grupos de Compra con Déficit
                        </h3>
                        <Btn
                            small
                            variant="secondary"
                            onClick={() => navigate('/compras/materiales-criticos')}
                        >
                            Ver todos ↗
                        </Btn>
                    </div>

                    {isLoading ? (
                        <Spinner />
                    ) : combos.filter((c: any) => Number(c.deficit || 0) > 0).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#10b981' }}>
                            ✓ Todos los combos configurados tienen stock suficiente.
                        </div>
                    ) : (
                        <Table
                            cols={['Grupo / Combo', 'Stock Total', 'Déficit']}
                            rows={combos
                                .filter((c: any) => Number(c.deficit || 0) > 0)
                                .slice(0, 6)
                                .map((c: any) => [
                                    <div key="c">
                                        <strong style={{ color: 'var(--text-primary, #f3f4f6)', display: 'block' }}>{c.title}</strong>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>{c.itemIds?.length || 0} ítems</span>
                                    </div>,
                                    <span key="st" style={{ fontWeight: 700, color: 'var(--text-primary, #f3f4f6)' }}>
                                        {Number(c.totalStock || 0).toFixed(1)} {c.unitLabel || 'kg'}
                                    </span>,
                                    <Badge key="def" color="#ef4444">
                                        -{Number(c.deficit || 0).toFixed(1)} {c.unitLabel || 'kg'}
                                    </Badge>
                                ])}
                        />
                    )}
                </Card>
            </div>
        </div>
    );
}
