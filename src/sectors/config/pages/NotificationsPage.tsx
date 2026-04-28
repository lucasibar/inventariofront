import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useGetAlertsQuery } from '../../warehouse/stock/api/stock.api';
import { markAsSeen, setCurrentAlerts } from '../../../entities/notifications/notificationsSlice';
import { useIsMobile } from '../../../shared/ui';

export default function NotificationsPage() {
    const isMobile = useIsMobile();
    const dispatch = useDispatch();
    const { data: alerts = [], isLoading } = useGetAlertsQuery();

    // Cuando las alertas cargan, actualizar el hash y marcar como leídas
    useEffect(() => {
        if (alerts.length >= 0 && !isLoading) {
            dispatch(setCurrentAlerts(alerts));
            dispatch(markAsSeen());
        }
    }, [alerts, isLoading, dispatch]);

    const getSeverityColor = (deficit: number, stockMinimo: number) => {
        const ratio = deficit / stockMinimo;
        if (ratio > 0.7) return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', text: '#f87171', label: 'Crítico' };
        if (ratio > 0.4) return { bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.4)', text: '#fb923c', label: 'Alto' };
        return { bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.4)', text: '#facc15', label: 'Bajo' };
    };

    const formatKg = (v: number) => {
        if (v >= 1000) return `${(v / 1000).toFixed(1)}t`;
        return `${Math.round(v)} kg`;
    };

    return (
        <div style={{ padding: isMobile ? '16px' : '24px 32px', maxWidth: '900px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{
                    fontSize: isMobile ? '20px' : '24px',
                    fontWeight: 800,
                    color: '#f3f4f6',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <span style={{ fontSize: '28px' }}>🔔</span>
                    Notificaciones
                </h1>
                <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '6px' }}>
                    Alertas de stock por debajo del mínimo configurado
                </p>
            </div>

            {isLoading ? (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '60px 0', color: '#6b7280', fontSize: '14px',
                }}>
                    <div style={{
                        width: '20px', height: '20px', border: '2px solid #374151',
                        borderTopColor: '#6366f1', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite', marginRight: '10px',
                    }} />
                    Cargando alertas...
                </div>
            ) : alerts.length === 0 ? (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: '80px 20px', textAlign: 'center',
                }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: 'rgba(34,197,94,0.1)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        marginBottom: '20px', fontSize: '36px',
                    }}>
                        ✅
                    </div>
                    <h2 style={{ color: '#22c55e', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
                        Todo en orden
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '300px' }}>
                        No hay materiales con stock por debajo del mínimo configurado.
                    </p>
                </div>
            ) : (
                <>
                    {/* Summary bar */}
                    <div style={{
                        display: 'flex', gap: '12px', marginBottom: '20px',
                        flexWrap: 'wrap',
                    }}>
                        <div style={{
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                            borderRadius: '12px', padding: '12px 18px', flex: 1, minWidth: '140px',
                        }}>
                            <div style={{ color: '#f87171', fontSize: '22px', fontWeight: 800 }}>{alerts.length}</div>
                            <div style={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Materiales en alerta
                            </div>
                        </div>
                        <div style={{
                            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                            borderRadius: '12px', padding: '12px 18px', flex: 1, minWidth: '140px',
                        }}>
                            <div style={{ color: '#a5b4fc', fontSize: '22px', fontWeight: 800 }}>
                                {formatKg(alerts.reduce((s: number, a: any) => s + (a.deficit || 0), 0))}
                            </div>
                            <div style={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Déficit total
                            </div>
                        </div>
                    </div>

                    {/* Alert cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[...alerts]
                            .sort((a: any, b: any) => (b.deficit || 0) - (a.deficit || 0))
                            .map((alert: any) => {
                                const severity = getSeverityColor(alert.deficit, alert.stockMinimo);
                                const pct = Math.min(100, (alert.stockActual / alert.stockMinimo) * 100);

                                return (
                                    <div key={alert.itemId} style={{
                                        background: '#1a1d2e',
                                        border: `1px solid ${severity.border}`,
                                        borderRadius: '12px',
                                        padding: isMobile ? '14px' : '16px 20px',
                                        transition: 'all 0.2s',
                                    }}>
                                        {/* Top row */}
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'flex-start', marginBottom: '10px',
                                        }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    color: '#f3f4f6', fontWeight: 700,
                                                    fontSize: isMobile ? '14px' : '15px',
                                                    whiteSpace: 'nowrap', overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}>
                                                    {alert.descripcion}
                                                </div>
                                                <div style={{
                                                    color: '#6b7280', fontSize: '12px', marginTop: '2px',
                                                    display: 'flex', gap: '8px', alignItems: 'center',
                                                }}>
                                                    <span>{alert.codigoInterno}</span>
                                                    {alert.categoria && (
                                                        <span style={{
                                                            background: 'rgba(99,102,241,0.15)',
                                                            color: '#a5b4fc',
                                                            padding: '1px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '10px',
                                                            fontWeight: 600,
                                                        }}>
                                                            {alert.categoria}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{
                                                background: severity.bg,
                                                color: severity.text,
                                                padding: '3px 10px',
                                                borderRadius: '8px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap',
                                                marginLeft: '12px',
                                            }}>
                                                {severity.label}
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div style={{
                                            background: '#0f1117', borderRadius: '6px',
                                            height: '6px', overflow: 'hidden', marginBottom: '8px',
                                        }}>
                                            <div style={{
                                                height: '100%', borderRadius: '6px',
                                                background: severity.text,
                                                width: `${pct}%`,
                                                transition: 'width 0.5s ease',
                                            }} />
                                        </div>

                                        {/* Bottom stats */}
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            fontSize: '12px',
                                        }}>
                                            <span style={{ color: '#9ca3af' }}>
                                                Actual: <strong style={{ color: severity.text }}>{formatKg(alert.stockActual)}</strong>
                                            </span>
                                            <span style={{ color: '#9ca3af' }}>
                                                Mínimo: <strong style={{ color: '#d1d5db' }}>{formatKg(alert.stockMinimo)}</strong>
                                            </span>
                                            <span style={{ color: '#9ca3af' }}>
                                                Faltante: <strong style={{ color: '#f87171' }}>-{formatKg(alert.deficit)}</strong>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </>
            )}

            {/* Spin animation */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
