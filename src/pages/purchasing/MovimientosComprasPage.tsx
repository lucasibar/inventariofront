import { useState, useMemo } from 'react';
import { useGetPurchaseOrdersQuery } from '../../features/purchasing/purchase-orders/api/purchase-orders.api';
import { useGetRemitosEntradaQuery } from '../../features/warehouse/remitosEntrada/api/remitos-entrada.api';
import { useGetRemitosSalidaQuery, useLazyGetRemitoSalidaQuery } from '../../features/warehouse/remitosSalida/api/remitos-salida.api';
import { useLazyGetRemitoEntradaQuery } from '../../features/warehouse/remitosEntrada/api/remitos-entrada.api';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { PageHeader, Card, Badge, SearchBar, Spinner, Select } from '../../shared/ui';
import { RemitoDetailModal } from '../../features/warehouse/remitos/ui/RemitoDetailModal';
import OrdenCompraDetailModal from '../../features/purchasing/purchase-orders/ui/OrdenCompraDetailModal';
import { useSelector } from 'react-redux';
import { selectAllowedDepots } from '../../entities/auth/model/authSlice';

type DocType = 'TODOS' | 'OC' | 'REMITO_ENTRADA' | 'REMITO_SALIDA';

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    OC:            { label: 'Orden de Compra', color: '#818cf8', icon: '🛒' },
    REMITO_ENTRADA:{ label: 'Remito Entrada',  color: '#10b981', icon: '📥' },
    REMITO_SALIDA: { label: 'Remito Salida',   color: '#f87171', icon: '📤' },
};

export default function MovimientosComprasPage() {
    const allowedDepots = useSelector(selectAllowedDepots);
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => {
        const active = rawDepots.filter((d: any) => d.activo !== false);
        if (!allowedDepots) return active;
        return active.filter((d: any) => allowedDepots.includes(d.id));
    }, [rawDepots, allowedDepots]);




    // ── Filtros ──
    const [tipoDoc, setTipoDoc] = useState<DocType>('TODOS');
    const [depositoId, setDepositoId] = useState('');
    const [search, setSearch] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    // ── Datos ──
    const { data: ocs = [], isLoading: loadingOC } = useGetPurchaseOrdersQuery(depositoId || undefined);
    const { data: remitosEntrada = [], isLoading: loadingRE } = useGetRemitosEntradaQuery();
    const { data: remitosSalida = [], isLoading: loadingRS } = useGetRemitosSalidaQuery();

    const [triggerGetRE] = useLazyGetRemitoEntradaQuery();
    const [triggerGetRS] = useLazyGetRemitoSalidaQuery();

    // ── Modales de detalle ──
    const [selectedRemito, setSelectedRemito] = useState<any>(null);
    const [showRemitoDetail, setShowRemitoDetail] = useState(false);
    const [selectedOCId, setSelectedOCId] = useState<string | null>(null);

    const isLoading = loadingOC || loadingRE || loadingRS;

    // ── Normalizar todos los documentos en un formato común ──
    const allDocuments = useMemo(() => {
        const docs: any[] = [];

        // Órdenes de Compra
        if (tipoDoc === 'TODOS' || tipoDoc === 'OC') {
            ocs.forEach((o: any) => {
                docs.push({
                    _type: 'OC',
                    id: o.id,
                    numero: o.numero,
                    fecha: o.fechaEmision,
                    fechaEntrega: o.fechaEntregaEsperada,
                    supplier: o.supplier?.name || '—',
                    supplierId: o.supplierId,
                    depositoId: o.depositoId,
                    depositoNombre: depots.find((d: any) => d.id === o.depositoId)?.nombre || '—',
                    estado: o.estado,
                    itemsCount: o.lines?.length || 0,
                    totalKg: (o.lines || []).reduce((s: number, l: any) => s + Number(l.qtyPedido || 0), 0),
                    raw: o,
                });
            });
        }

        // Remitos de Entrada
        if (tipoDoc === 'TODOS' || tipoDoc === 'REMITO_ENTRADA') {
            remitosEntrada.forEach((r: any) => {
                const depotMatch = !depositoId || r.depositoId === depositoId || r.deposito?.id === depositoId;
                if (!depotMatch) return;
                docs.push({
                    _type: 'REMITO_ENTRADA',
                    id: r.id,
                    numero: r.numero || r.documentId,
                    fecha: r.fecha || r.date,
                    fechaEntrega: null,
                    supplier: r.partner?.name || r.supplier?.name || '—',
                    supplierId: r.partnerId || r.supplierId,
                    depositoId: r.depositoId || r.deposito?.id,
                    depositoNombre: r.deposito?.nombre || depots.find((d: any) => d.id === r.depositoId)?.nombre || '—',
                    estado: r.status === 'ANULADO' ? 'ANULADO' : 'ACTIVO',
                    itemsCount: r.lines?.length || 0,
                    totalKg: (r.lines || []).reduce((s: number, l: any) => s + Number(l.qtyPrincipal || 0), 0),
                    raw: r,
                });
            });
        }

        // Remitos de Salida
        if (tipoDoc === 'TODOS' || tipoDoc === 'REMITO_SALIDA') {
            remitosSalida.forEach((r: any) => {
                const depotMatch = !depositoId || r.depositoId === depositoId || r.deposito?.id === depositoId;
                if (!depotMatch) return;
                docs.push({
                    _type: 'REMITO_SALIDA',
                    id: r.id,
                    numero: r.numero || r.documentId,
                    fecha: r.fecha || r.date,
                    fechaEntrega: null,
                    supplier: r.partner?.name || r.client?.name || r.clientName || '—',
                    supplierId: r.partnerId || r.clientId,
                    depositoId: r.depositoId || r.deposito?.id,
                    depositoNombre: r.deposito?.nombre || depots.find((d: any) => d.id === r.depositoId)?.nombre || '—',
                    estado: r.status === 'ANULADO' ? 'ANULADO' : 'ACTIVO',
                    itemsCount: r.lines?.length || 0,
                    totalKg: (r.lines || []).reduce((s: number, l: any) => s + Number(l.qtyPrincipal || 0), 0),
                    raw: r,
                });
            });
        }

        return docs;
    }, [ocs, remitosEntrada, remitosSalida, tipoDoc, depositoId, depots]);

    // ── Filtros adicionales ──
    const filtered = useMemo(() => {
        let list = allDocuments;

        if (fechaDesde) {
            list = list.filter(d => d.fecha && new Date(d.fecha) >= new Date(fechaDesde + 'T00:00:00'));
        }
        if (fechaHasta) {
            list = list.filter(d => d.fecha && new Date(d.fecha) <= new Date(fechaHasta + 'T23:59:59'));
        }
        if (search.trim()) {
            const q = search.toLowerCase().trim();
            list = list.filter(d =>
                (d.numero || '').toLowerCase().includes(q) ||
                (d.supplier || '').toLowerCase().includes(q) ||
                (d.depositoNombre || '').toLowerCase().includes(q)
            );
        }

        // Ordenar por fecha desc
        return [...list].sort((a, b) => {
            const fa = a.fecha ? new Date(a.fecha).getTime() : 0;
            const fb = b.fecha ? new Date(b.fecha).getTime() : 0;
            return fb - fa;
        });
    }, [allDocuments, fechaDesde, fechaHasta, search]);

    const handleRowClick = async (doc: any) => {
        if (doc._type === 'OC') {
            setSelectedOCId(doc.id);
        } else if (doc._type === 'REMITO_ENTRADA') {
            try {
                const full = await triggerGetRE(doc.id).unwrap();
                setSelectedRemito(full);
            } catch {
                setSelectedRemito(doc.raw);
            }
            setShowRemitoDetail(true);
        } else if (doc._type === 'REMITO_SALIDA') {
            try {
                const full = await triggerGetRS(doc.id).unwrap();
                setSelectedRemito(full);
            } catch {
                setSelectedRemito(doc.raw);
            }
            setShowRemitoDetail(true);
        }
    };

    const estadoColor: Record<string, string> = {
        PENDIENTE: '#f59e0b',
        RECIBIDO_PARCIAL: '#3b82f6',
        COMPLETADO: '#10b981',
        CANCELADO: '#ef4444',
        ANULADO: '#ef4444',
        ACTIVO: '#10b981',
    };

    const dateInputStyle: React.CSSProperties = {
        height: '42px', padding: '0 10px',
        background: 'var(--bg-secondary, #111827)',
        border: '1px solid var(--border-strong, #374151)',
        borderRadius: '8px', color: 'var(--text-primary, #f3f4f6)',
        fontSize: '13px', outline: 'none',
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Documentos de Compras" subtitle="Vista unificada de órdenes de compra, remitos de entrada y salida" />

            {/* ── Filtros ── */}
            <Card style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {/* Tabs de tipo */}
                <div style={{ display: 'flex', gap: '6px' }}>
                    {(['TODOS', 'OC', 'REMITO_ENTRADA', 'REMITO_SALIDA'] as DocType[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTipoDoc(t)}
                            style={{
                                padding: '6px 14px', borderRadius: '20px',
                                border: '1px solid',
                                borderColor: tipoDoc === t ? (TYPE_CONFIG[t]?.color || '#6366f1') : 'var(--border-color, #2a2d3e)',
                                background: tipoDoc === t ? `${TYPE_CONFIG[t]?.color || '#6366f1'}22` : 'transparent',
                                color: tipoDoc === t ? (TYPE_CONFIG[t]?.color || '#818cf8') : 'var(--text-muted, #9ca3af)',
                                cursor: 'pointer', fontSize: '12px', fontWeight: tipoDoc === t ? 700 : 400,
                            }}
                        >
                            {t === 'TODOS' ? 'Todos' : `${TYPE_CONFIG[t].icon} ${TYPE_CONFIG[t].label}`}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                    <SearchBar value={search} onChange={setSearch} placeholder="Buscar por número, proveedor, depósito..." />
                </div>

                <div style={{ minWidth: '180px' }}>
                    <Select
                        label=""
                        value={depositoId}
                        onChange={setDepositoId}
                        options={[{ value: '', label: 'Todos los depósitos' }, ...depots.map((d: any) => ({ value: d.id, label: d.nombre }))]}
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={dateInputStyle} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>al</span>
                    <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={dateInputStyle} />
                    {(fechaDesde || fechaHasta) && (
                        <button onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px' }}>
                            ✕
                        </button>
                    )}
                </div>
            </Card>

            {/* ── Conteo ── */}
            <div style={{ marginBottom: '12px', color: 'var(--text-muted, #9ca3af)', fontSize: '13px' }}>
                {filtered.length} documento{filtered.length !== 1 ? 's' : ''}
            </div>

            {/* ── Tabla ── */}
            {isLoading ? (
                <Card style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <Spinner />
                </Card>
            ) : filtered.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: '60px' }}>
                    <p style={{ color: 'var(--text-muted, #9ca3af)' }}>No hay documentos que coincidan con los filtros.</p>
                </Card>
            ) : (
                <Card style={{ padding: 0 }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                    {['Tipo', 'Número', 'Fecha', 'Proveedor / Destino', 'Depósito', 'Ítems', 'Kg Total', 'Estado', 'Entrega Est.'].map(col => (
                                        <th key={col} style={{
                                            padding: '10px 16px', textAlign: 'left',
                                            fontSize: '11px', fontWeight: 700,
                                            color: 'var(--text-muted, #9ca3af)',
                                            textTransform: 'uppercase', whiteSpace: 'nowrap',
                                        }}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((doc, i) => {
                                    const cfg = TYPE_CONFIG[doc._type];
                                    return (
                                        <tr
                                            key={`${doc._type}-${doc.id}`}
                                            onClick={() => handleRowClick(doc)}
                                            style={{
                                                borderBottom: '1px solid var(--border-color, #2a2d3e)',
                                                cursor: 'pointer',
                                                background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover-row, rgba(255,255,255,0.02))',
                                                transition: 'background 0.12s',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover-row, rgba(255,255,255,0.05))')}
                                            onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'var(--bg-hover-row, rgba(255,255,255,0.02))')}
                                        >
                                            <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                    padding: '3px 10px', borderRadius: '12px',
                                                    background: `${cfg.color}18`,
                                                    color: cfg.color, fontSize: '11px', fontWeight: 700,
                                                }}>
                                                    {cfg.icon} {cfg.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 16px' }}>
                                                <span style={{ color: cfg.color, fontWeight: 700, fontSize: '13px' }}>{doc.numero}</span>
                                            </td>
                                            <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-muted, #9ca3af)', whiteSpace: 'nowrap' }}>
                                                {doc.fecha ? new Date(doc.fecha).toLocaleDateString('es-AR') : '—'}
                                            </td>
                                            <td style={{ padding: '10px 16px', fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {doc.supplier}
                                            </td>
                                            <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                                                {doc.depositoNombre}
                                            </td>
                                            <td style={{ padding: '10px 16px' }}>
                                                <Badge>{doc.itemsCount}</Badge>
                                            </td>
                                            <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: '#38bdf8', whiteSpace: 'nowrap' }}>
                                                {doc.totalKg.toLocaleString('es-AR', { maximumFractionDigits: 1 })} kg
                                            </td>
                                            <td style={{ padding: '10px 16px' }}>
                                                <Badge color={estadoColor[doc.estado] || '#6b7280'}>{doc.estado}</Badge>
                                            </td>
                                            <td style={{ padding: '10px 16px', fontSize: '12px', color: '#10b981', whiteSpace: 'nowrap' }}>
                                                {doc.fechaEntrega ? new Date(doc.fechaEntrega).toLocaleDateString('es-AR') : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* ── Modales de detalle ── */}
            <RemitoDetailModal
                open={showRemitoDetail}
                onClose={() => { setShowRemitoDetail(false); setSelectedRemito(null); }}
                remito={selectedRemito}
            />
            {selectedOCId && (
                <OrdenCompraDetailModal
                    orderId={selectedOCId}
                    onClose={() => setSelectedOCId(null)}
                />
            )}
        </div>
    );
}
