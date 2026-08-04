import { useMemo, useState } from 'react';
import { useGetInventoryCheckAnalyticsQuery } from '../../features/warehouse/inventoryCheck/api/inventory-check.api';
import { PageHeader, Card, Btn, Spinner, useIsMobile } from '../../shared/ui';
import { useNavigate } from 'react-router-dom';

export default function InformesInventariadoPage() {
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETADO' | 'EN_PROGRESO'>('ALL');

    const { data: analytics, isLoading, refetch } = useGetInventoryCheckAnalyticsQuery(undefined, {
        pollingInterval: 5000,
    });

    const metrics = analytics?.summaryMetrics || {};
    const history: any[] = analytics?.history || [];
    const issueBreakdown: Record<string, number> = analytics?.issueBreakdown || {};

    const filteredHistory = useMemo(() => {
        if (statusFilter === 'ALL') return history;
        return history.filter(item => item.status === statusFilter);
    }, [history, statusFilter]);

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <Spinner />
            </div>
        );
    }

    const executiveKpis = [
        {
            title: 'Último Inventariado',
            value: metrics.lastCheckAt ? new Date(metrics.lastCheckAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Sin registros',
            subtitle: 'Fecha de ejecución más reciente',
            color: '#a5b4fc',
            icon: '🗓️',
        },
        {
            title: 'Tiempo Promedio de Chequeo',
            value: metrics.avgDurationMinutes ? `${metrics.avgDurationMinutes} min` : 'N/A',
            subtitle: 'Duración desde inicio a cierre',
            color: '#38bdf8',
            icon: '⏱️',
        },
        {
            title: 'Precisión Global de Stock',
            value: `${metrics.globalAccuracyPct || 0}%`,
            subtitle: 'Posiciones sin discrepancias',
            color: '#34d399',
            icon: '🎯',
        },
        {
            title: 'Cobertura del Depósito',
            value: `${metrics.globalCompletionPct || 0}%`,
            subtitle: 'Promedio de posiciones auditadas',
            color: '#fbbf24',
            icon: '📊',
        },
    ];

    return (
        <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '1100px', margin: '0 auto' }}>
            <PageHeader title="📊 Informe Ejecutivo de Inventariados" subtitle="Métricas para Jefatura de Planta, Logística y Depósito">
                <Btn small onClick={() => refetch()} variant="secondary">
                    🔄 Actualizar Datos
                </Btn>
            </PageHeader>

            {/* Executive KPI Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: '12px', marginBottom: '24px'
            }}>
                {executiveKpis.map((kpi) => (
                    <Card key={kpi.title} style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '20px' }}>{kpi.icon}</span>
                            <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>KPI</span>
                        </div>
                        <div style={{ color: kpi.color, fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>
                            {kpi.value}
                        </div>
                        <div style={{ color: '#f3f4f6', fontSize: '12px', fontWeight: 700 }}>
                            {kpi.title}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>
                            {kpi.subtitle}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Section: Operational Issues Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '16px', marginBottom: '24px' }}>
                <Card style={{ padding: '20px' }}>
                    <h3 style={{ color: '#f3f4f6', fontSize: '15px', fontWeight: 700, margin: '0 0 14px' }}>
                        ⚠️ Principales Anomalías de Planta
                    </h3>
                    {Object.keys(issueBreakdown).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {Object.entries(issueBreakdown).map(([issue, count]) => (
                                <div key={issue} style={{
                                    background: '#0f1117', padding: '10px 12px', borderRadius: '8px',
                                    border: '1px solid #2a2d3e', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <span style={{ color: '#d1d5db', fontSize: '12px', fontWeight: 600 }}>{issue}</span>
                                    <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: '12px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                                        {count} ocurrencia{count > 1 ? 's' : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                            Sin discrepancias recurrentes registradas
                        </div>
                    )}
                </Card>

                {/* Section: Historical Audits List */}
                <Card style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{
                        padding: '16px 20px', borderBottom: '1px solid #2a2d3e',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
                    }}>
                        <div>
                            <h3 style={{ color: '#f3f4f6', fontSize: '15px', fontWeight: 700, margin: 0 }}>
                                📜 Histórico de Auditorías de Inventario
                            </h3>
                            <span style={{ color: '#6b7280', fontSize: '12px' }}>
                                Registro inalterable de ejecuciones
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {(['ALL', 'COMPLETADO', 'EN_PROGRESO'] as const).map(st => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st)}
                                    style={{
                                        background: statusFilter === st ? 'rgba(99,102,241,0.2)' : '#0f1117',
                                        border: `1px solid ${statusFilter === st ? '#6366f1' : '#374151'}`,
                                        color: statusFilter === st ? '#a5b4fc' : '#9ca3af',
                                        fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', cursor: 'pointer'
                                    }}
                                >
                                    {st === 'ALL' ? 'Todos' : st === 'COMPLETADO' ? 'Completados' : 'En curso'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#0f1117', color: '#9ca3af', borderBottom: '1px solid #2a2d3e' }}>
                                    <th style={{ padding: '12px 16px' }}>Depósito</th>
                                    <th style={{ padding: '12px 16px' }}>Inicio</th>
                                    <th style={{ padding: '12px 16px' }}>Duración</th>
                                    <th style={{ padding: '12px 16px' }}>Cobertura</th>
                                    <th style={{ padding: '12px 16px' }}>Precisión</th>
                                    <th style={{ padding: '12px 16px' }}>Estado</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredHistory.length > 0 ? (
                                    filteredHistory.map((item) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #1f2233' }}>
                                            <td style={{ padding: '12px 16px', color: '#f3f4f6', fontWeight: 700 }}>
                                                🏢 {item.depositoNombre}
                                            </td>
                                            <td style={{ padding: '12px 16px', color: '#9ca3af' }}>
                                                {new Date(item.startedAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ padding: '12px 16px', color: '#d1d5db', fontWeight: 600 }}>
                                                ⏱️ {item.durationMinutes ? `${item.durationMinutes} min` : 'En curso'}
                                            </td>
                                            <td style={{ padding: '12px 16px', color: '#fbbf24', fontWeight: 700 }}>
                                                {item.stats.completionPct}% ({item.stats.reviewed}/{item.stats.total})
                                            </td>
                                            <td style={{ padding: '12px 16px', color: item.stats.accuracyPct >= 90 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                                                {item.stats.accuracyPct}% OK
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: 600,
                                                    background: item.status === 'COMPLETADO' ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)',
                                                    color: item.status === 'COMPLETADO' ? '#34d399' : '#fbbf24',
                                                    border: `1px solid ${item.status === 'COMPLETADO' ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}`
                                                }}>
                                                    {item.status === 'COMPLETADO' ? '✅ Finalizado' : '⏳ En progreso'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <Btn small variant="secondary" onClick={() => navigate('/reporte-chequeo')}>
                                                    👁️ Ver Monitoreo
                                                </Btn>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>
                                            No hay registros históricos de inventariado
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
