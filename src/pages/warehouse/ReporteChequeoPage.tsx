import { useState, useMemo, useCallback } from 'react';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import {
    useGetInventoryChecksQuery,
    useGetCheckReportQuery,
} from '../../features/warehouse/inventoryCheck/api/inventory-check.api';
import { Card, Btn, Spinner, useIsMobile } from '../../shared/ui';

type Tag = 'PENDIENTE' | 'CORRECTO' | 'A_CHEQUEAR' | 'POSICION_INCORRECTA';

const TAG_CONFIG: Record<Tag, { label: string; icon: string; color: string; bg: string; border: string }> = {
    PENDIENTE: { label: 'Pendiente', icon: '⏳', color: 'var(--text-muted, #9ca3af)', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.25)' },
    CORRECTO: { label: 'Correcto', icon: '✅', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)' },
    A_CHEQUEAR: { label: 'A Chequear', icon: '⚠️', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)' },
    POSICION_INCORRECTA: { label: 'Pos. Incorrecta', icon: '❌', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' },
};

export default function ReporteChequeoPage() {
    const isMobile = useIsMobile();
    const [depotId, setDepotId] = useState('');
    const [selectedTagFilter, setSelectedTagFilter] = useState<'ALL' | Tag>('ALL');

    // Queries
    const { data: depots = [] } = useGetDepotsQuery();
    
    // Polling active/latest checks for the chosen depot every 3 seconds for real-time collaboration
    const { data: checks = [], refetch: refetchChecks } = useGetInventoryChecksQuery(
        depotId ? { depositoId: depotId } : {},
        { pollingInterval: 3000 }
    );

    const activeCheck = useMemo(() => {
        if (!checks || checks.length === 0) return null;
        return checks[0]; // latest check (ordered DESC by backend)
    }, [checks]);

    const activeCheckId = activeCheck?.id;

    // Fetch report data with polling as well
    const { data: report } = useGetCheckReportQuery(activeCheckId!, {
        skip: !activeCheckId,
        pollingInterval: 3000,
    });

    const activeDepots = useMemo(() =>
        depots.filter((d: any) => d.activo).map((d: any) => ({ value: d.id, label: d.nombre })),
        [depots]
    );

    const stats = report?.summary || {};
    const allItems: any[] = report?.items || [];

    const filteredReportItems = useMemo(() => {
        if (selectedTagFilter === 'ALL') return allItems;
        return allItems.filter((i: any) => i.tag === selectedTagFilter);
    }, [allItems, selectedTagFilter]);

    const statCards: { label: string; tagKey: 'ALL' | Tag; value: number; color: string; icon: string }[] = [
        { label: 'Todas', tagKey: 'ALL', value: stats.total || 0, color: '#a5b4fc', icon: '📊' },
        { label: 'Correctas', tagKey: 'CORRECTO', value: stats.correcto || 0, color: '#34d399', icon: '✅' },
        { label: 'A Chequear', tagKey: 'A_CHEQUEAR', value: stats.aChequear || 0, color: '#fbbf24', icon: '⚠️' },
        { label: 'Incorrectas', tagKey: 'POSICION_INCORRECTA', value: stats.incorrecta || 0, color: '#f87171', icon: '❌' },
        { label: 'Pendientes', tagKey: 'PENDIENTE', value: stats.pendiente || 0, color: 'var(--text-subtle, #6b7280)', icon: '⏳' },
    ];

    const handleDownloadCSV = useCallback(() => {
        if (!report) return;
        const dateStr = new Date(report.completedAt || report.startedAt).toLocaleDateString('es-AR').replace(/\//g, '-');
        const filename = `chequeo_inventario_${report.deposito?.nombre || 'deposito'}_${dateStr}.csv`;
        
        const headers = ['Posicion', 'Estado / Tag', 'Observacion Predefinida', 'Nota Adicional', 'Stock Registrado'];
        const rows = (report.items || []).map((item: any) => {
            const tagLabel = TAG_CONFIG[item.tag as Tag]?.label || item.tag;
            const obs = item.observacion || '';
            const nota = item.notaLibre || '';
            const stockStr = (item.stockSnapshot || []).map((s: any) =>
                `${s.itemName || s.itemCodigo || 'Material'}${s.lotNumber ? ` (Lote: ${s.lotNumber})` : ''} - ${Number(s.qtyPrincipal)}`
            ).join(' | ');

            return [
                `"${item.posicionCodigo}"`,
                `"${tagLabel}"`,
                `"${obs.replace(/"/g, '""')}"`,
                `"${nota.replace(/"/g, '""')}"`,
                `"${stockStr.replace(/"/g, '""')}"`
            ].join(';');
        });

        const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [report]);

    return (
        <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '900px', margin: '0 auto' }}>
            {/* Header card with Depot Selector & Live Indicator */}
            <Card style={{ padding: isMobile ? '16px' : '20px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <h1 style={{ color: 'var(--text-primary, #f3f4f6)', fontSize: '18px', fontWeight: 800, margin: 0 }}>
                            📋 Reporte de Chequeo
                        </h1>
                        <p style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '12px', margin: '2px 0 0' }}>
                            Estado y detalle del chequeo por depósito
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {report && (
                            <Btn small onClick={handleDownloadCSV} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'var(--text-white-dynamic, #fff)' }}>
                                📥 Descargar Excel (CSV)
                            </Btn>
                        )}
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', color: 'var(--text-muted, #9ca3af)', fontSize: '12px', marginBottom: '6px' }}>
                        Seleccionar Depósito a Monitorear
                    </label>
                    <select
                        value={depotId}
                        onChange={e => setDepotId(e.target.value)}
                        style={{
                            width: '100%', background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-strong, #374151)', borderRadius: '10px',
                            padding: '12px', color: 'var(--text-primary, #f3f4f6)', fontSize: '14px', outline: 'none',
                            boxSizing: 'border-box', colorScheme: 'dark',
                        }}
                    >
                        <option value="">— Elegir depósito —</option>
                        {activeDepots.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                </div>
            </Card>

            {!depotId && (
                <Card style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏭</div>
                    <h3 style={{ color: 'var(--text-primary, #f3f4f6)', fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>
                        Seleccioná un depósito para ver su reporte
                    </h3>
                    <p style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '13px', margin: 0 }}>
                        Los cambios realizados desde la app de chequeo se actualizarán automáticamente acá.
                    </p>
                </Card>
            )}

            {depotId && !activeCheck && (
                <Card style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
                    <h3 style={{ color: 'var(--text-primary, #f3f4f6)', fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>
                        No hay chequeos para este depósito
                    </h3>
                    <p style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '13px', margin: 0 }}>
                        Iniciá un chequeo desde la pantalla "Chequeo Inventario" para comenzar a recibir datos.
                    </p>
                </Card>
            )}

            {depotId && activeCheck && !report && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <Spinner />
                </div>
            )}

            {depotId && report && (
                <>
                    {/* Status badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '13px' }}>
                            Estado del chequeo: <strong style={{ color: activeCheck.status === 'COMPLETADO' ? '#34d399' : '#fbbf24' }}>
                                {activeCheck.status === 'COMPLETADO' ? '✅ COMPLETADO' : '⏳ EN PROGRESO'}
                            </strong>
                        </span>
                        <button
                            onClick={() => refetchChecks()}
                            style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                        >
                            🔄 Refrescar manualmente
                        </button>
                    </div>

                    {/* Interactive Stats Filter Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
                        gap: '10px', marginBottom: '20px',
                    }}>
                        {statCards.map((s) => {
                            const isSelected = selectedTagFilter === s.tagKey;
                            return (
                                <Card
                                    key={s.label}
                                    onClick={() => setSelectedTagFilter(s.tagKey)}
                                    style={{
                                        padding: '14px', textAlign: 'center', cursor: 'pointer',
                                        border: `2px solid ${isSelected ? s.color : 'var(--border-color, #2a2d3e)'}`,
                                        background: isSelected ? 'var(--bg-hover-row, rgba(255,255,255,0.03))' : 'var(--bg-secondary, #1a1d2e)',
                                        transition: 'all 0.15s ease',
                                        transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                                    }}
                                >
                                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
                                    <div style={{ color: s.color, fontSize: '24px', fontWeight: 800 }}>{s.value}</div>
                                    <div style={{ color: isSelected ? 'var(--text-primary, #f3f4f6)' : 'var(--text-subtle, #6b7280)', fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>
                                        {s.label}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Position details list according to filter */}
                    {filteredReportItems.length > 0 ? (
                        <Card style={{ padding: '0', overflow: 'hidden' }}>
                            <div style={{
                                padding: '14px 16px', borderBottom: '1px solid var(--border-color, #2a2d3e)',
                                background: 'var(--bg-alt-row, rgba(255,255,255,0.02))', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <h3 style={{ color: 'var(--text-primary, #f3f4f6)', fontSize: '15px', fontWeight: 700, margin: 0 }}>
                                    📌 Posiciones ({filteredReportItems.length})
                                </h3>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                                    Filtrado por: <strong>{statCards.find(s => s.tagKey === selectedTagFilter)?.label}</strong>
                                </span>
                            </div>
                            {filteredReportItems.map((item: any, i: number) => {
                                const tag: Tag = item.tag;
                                const cfg = TAG_CONFIG[tag];
                                return (
                                    <div key={item.id || i} style={{
                                        padding: '14px 16px', borderBottom: i < filteredReportItems.length - 1 ? '1px solid #1f2233' : 'none',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <span style={{ color: 'var(--text-primary, #f3f4f6)', fontFamily: 'monospace', fontWeight: 700, fontSize: '16px' }}>
                                                {item.posicionCodigo}
                                            </span>
                                            <span style={{
                                                fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                                                background: cfg.bg, color: cfg.color, border: '1px solid ' + cfg.border,
                                                fontWeight: 600,
                                            }}>
                                                {cfg.icon} {cfg.label}
                                            </span>
                                        </div>
                                        {item.observacion && (
                                            <div style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>
                                                📌 {item.observacion}
                                            </div>
                                        )}
                                        {item.notaLibre && (
                                            <div style={{ color: 'var(--text-secondary, #d1d5db)', fontSize: '12px', fontStyle: 'italic', marginBottom: '4px' }}>
                                                💬 {item.notaLibre}
                                            </div>
                                        )}
                                        {item.stockSnapshot && item.stockSnapshot.length > 0 ? (
                                            <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted, #9ca3af)', background: 'var(--bg-primary, #0f1117)', padding: '6px 10px', borderRadius: '6px' }}>
                                                <strong>Stock registrado:</strong> {item.stockSnapshot.map((s: any) =>
                                                    `${s.itemName || s.itemCodigo || 'Material'}${s.lotNumber ? ` (Lote: ${s.lotNumber})` : ''} - ${Number(s.qtyPrincipal).toLocaleString('es-AR')} ${s.unidadPrincipal || 'kg'}${s.qtySecundaria ? ` (${Number(s.qtySecundaria).toLocaleString('es-AR')} ${s.unidadSecundaria || 'unid.'})` : ''}`
                                                ).join(' | ')}
                                            </div>
                                        ) : (
                                            <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-subtle, #6b7280)' }}>
                                                <em>Sin stock registrado en sistema</em>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </Card>
                    ) : (
                        <Card style={{ padding: '40px', textAlign: 'center' }}>
                            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
                            <h3 style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '16px', fontWeight: 600, margin: 0 }}>
                                No hay posiciones con la etiqueta "{statCards.find(s => s.tagKey === selectedTagFilter)?.label}"
                            </h3>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
