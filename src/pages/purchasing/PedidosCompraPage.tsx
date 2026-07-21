import { useState, useMemo, useEffect } from 'react';
import { 
    useGetPurchaseOrdersQuery, 
    useCreatePurchaseOrderMutation, 
    useUpdatePurchaseOrderMutation,
    useDeletePurchaseOrderMutation,
    useUpdatePurchaseOrderStatusMutation,
    useGetNextNumberQuery,
    useGenerateRemitoFromPOMutation
} from '../../features/purchasing/purchase-orders/api/purchase-orders.api';
import { useGetPartnersQuery } from '../../features/config/partners/api/partners.api';
import { useGetItemsQuery } from '../../features/warehouse/materiales/api/items.api';
import { PageHeader, Card, Badge, Btn, Input, SearchSelect, Modal, Table, Spinner, Select } from '../../shared/ui';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectAllowedDepots } from '../../entities/auth/model/authSlice';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import OrdenCompraDetailModal from '../../features/purchasing/purchase-orders/ui/OrdenCompraDetailModal';

export default function PedidosCompraPage() {
    const user = useSelector(selectCurrentUser);
    const allowedDepots = useSelector(selectAllowedDepots);
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => {
        if (!allowedDepots) return rawDepots;
        return rawDepots.filter((d: any) => allowedDepots.includes(d.id));
    }, [rawDepots, allowedDepots]);

    const [depotId, setDepotId] = useState<string>(() => sessionStorage.getItem('selectedPurchasingDepotId') || '');

    useEffect(() => {
        if (depotId) sessionStorage.setItem('selectedPurchasingDepotId', depotId);
    }, [depotId]);

    useEffect(() => {
        if (!depotId && depots.length === 1) {
            setDepotId(depots[0].id);
        }
    }, [depots, depotId]);

    const { data: orders = [], isLoading } = useGetPurchaseOrdersQuery(depotId || undefined);
    const { data: suppliers = [] } = useGetPartnersQuery({ type: 'SUPPLIER' });
    const { data: items = [] } = useGetItemsQuery({ depositoId: depotId || undefined });
    
    // Preview del próximo número (para el formulario de alta)
    const { data: nextNumData } = useGetNextNumberQuery(undefined, { skip: isLoading });

    const [createOrder] = useCreatePurchaseOrderMutation();
    const [updateOrder] = useUpdatePurchaseOrderMutation();
    const [deleteOrder] = useDeletePurchaseOrderMutation();
    const [updateStatus] = useUpdatePurchaseOrderStatusMutation();
    const [generateRemitoFromPO] = useGenerateRemitoFromPOMutation();

    const [showForm, setShowForm] = useState(false);
    const [editOrderId, setEditOrderId] = useState<string | null>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedFulfillmentOrderId, setSelectedFulfillmentOrderId] = useState<string | null>(null);
    
    const [generateRemitoOrder, setGenerateRemitoOrder] = useState<any | null>(null);
    
    const [supplierId, setSupplierId] = useState('');
    const [depositoId, setDepositoId] = useState(depotId || '');

    useEffect(() => {
        if (depotId && !editOrderId) {
            setDepositoId(depotId);
        }
    }, [depotId, editOrderId]);

    const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);
    const [fechaEntregaEsperada, setFechaEntregaEsperada] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [lines, setLines] = useState<{ id?: string; itemId: string; qtyPedido: string; qtySecundaria: string; observaciones: string; minQty?: number }[]>([
        { itemId: '', qtyPedido: '', qtySecundaria: '', observaciones: '' }
    ]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const filteredItems = useMemo(() => {
        if (!supplierId) return items;
        return items.filter((i: any) => !i.supplierId || i.supplierId === supplierId);
    }, [items, supplierId]);

    const grouped = useMemo(() => {
        const map = new Map<string, { supplierName: string; orders: any[] }>();
        orders.forEach((o: any) => {
            const key = o.supplier?.id ?? 'sin-proveedor';
            if (!map.has(key)) map.set(key, { supplierName: o.supplier?.name ?? 'Sin proveedor', orders: [] });
            map.get(key)!.orders.push(o);
        });
        return Array.from(map.values());
    }, [orders]);

    const save = async () => {
        setSaving(true); setError('');
        try {
            const linesPayload = lines
                .filter(l => l.itemId)
                .map(l => ({
                    id: l.id,
                    itemId: l.itemId,
                    qtyPedido: Number(l.qtyPedido),
                    qtySecundaria: l.qtySecundaria ? Number(l.qtySecundaria) : null,
                    observaciones: l.observaciones || null
                }));

            if (linesPayload.length === 0) {
                setError('Debe ingresar al menos un material');
                setSaving(false);
                return;
            }

            const dto: any = {
                supplierId,
                depositoId: depositoId || null,
                fechaEmision,
                fechaEntregaEsperada: fechaEntregaEsperada || null,
                observaciones,
                lines: linesPayload,
            };

            if (editOrderId) {
                await updateOrder({ id: editOrderId, body: dto }).unwrap();
            } else {
                await createOrder(dto).unwrap();
            }

            closeForm();
        } catch (e: any) { 
            setError(e?.data?.message ?? 'Error al guardar'); 
        }
        setSaving(false);
    };

    const openEditForm = (order: any) => {
        setEditOrderId(order.id);
        setSupplierId(order.supplierId);
        setDepositoId(order.depositoId || '');
        setFechaEmision(order.fechaEmision);
        setFechaEntregaEsperada(order.fechaEntregaEsperada || '');
        setObservaciones(order.observaciones || '');
        
        setLines(order.lines.map((l: any) => ({
            id: l.id,
            itemId: l.itemId,
            qtyPedido: String(l.qtyPedido),
            qtySecundaria: l.qtySecundaria ? String(l.qtySecundaria) : '',
            observaciones: l.observaciones || '',
            minQty: Number(l.qtyRecibida) // no se puede bajar de lo ya recibido
        })));
        
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditOrderId(null);
        setLines([{ itemId: '', qtyPedido: '', qtySecundaria: '', observaciones: '' }]);
        setSupplierId(''); 
        setObservaciones(''); 
        setFechaEntregaEsperada('');
        setFechaEmision(new Date().toISOString().split('T')[0]);
        setError('');
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Órdenes de Compra" subtitle="Gestión y trazabilidad de pedidos de compra">
                <Btn onClick={() => setShowForm(true)}>+ Nueva Orden</Btn>
            </PageHeader>

            <Card style={{ marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <Select
                    label="Depósito"
                    value={depotId}
                    onChange={setDepotId}
                    disabled={!isAdmin && depots.length === 1}
                    options={[{ value: '', label: 'Todos los depósitos' }, ...depots.map((d: any) => ({ value: d.id, label: d.nombre }))]}
                    style={{ width: '250px' }}
                />
            </Card>

            {isLoading ? <Spinner /> : grouped.length === 0 ? (
                <p style={{ color: '#4b5563', textAlign: 'center', padding: '32px', fontSize: '14px' }}>Todavía no hay compras cargadas</p>
            ) : grouped.map(group => (
                <div key={group.supplierName} style={{ marginBottom: '24px' }}>
                    <h3 style={{ color: '#a5b4fc', fontSize: '14px', fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🏭 {group.supplierName}
                        <Badge>{group.orders.length} orden{group.orders.length !== 1 ? 'es' : ''}</Badge>
                    </h3>
                    {group.orders.map((o: any) => (
                        <Card key={o.id} style={{ marginBottom: '8px', padding: '0' }}>
                            <div
                                style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                onClick={() => setSelectedOrderId(selectedOrderId === o.id ? null : o.id)}
                            >
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <span style={{ color: '#a5b4fc', fontWeight: 700, fontSize: '13px' }}>{o.numero}</span>
                                    <span style={{ color: '#6b7280', fontSize: '12px' }}>Emitido: {new Date(o.fechaEmision).toLocaleDateString()}</span>
                                    {o.fechaEntregaEsperada && (
                                        <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>Llega: {new Date(o.fechaEntregaEsperada).toLocaleDateString()}</span>
                                    )}
                                    <Badge color={
                                        o.estado === 'COMPLETADO' ? '#10b981' : 
                                        o.estado === 'RECIBIDO_PARCIAL' ? '#3b82f6' : 
                                        o.estado === 'CANCELADO' ? '#ef4444' : '#f59e0b'
                                    }>{o.estado}</Badge>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {o.estado !== 'COMPLETADO' && o.estado !== 'CANCELADO' && (
                                        <Btn small variant="secondary" onClick={e => { e.stopPropagation(); setGenerateRemitoOrder(o); }}>
                                            📦 Ingresar Stock
                                        </Btn>
                                    )}
                                    <Btn small onClick={e => { e.stopPropagation(); setSelectedFulfillmentOrderId(o.id); }}>
                                        🔍 Trazabilidad
                                    </Btn>
                                    <Btn small variant="secondary" onClick={e => { e.stopPropagation(); openEditForm(o); }}>
                                        ✏️
                                    </Btn>
                                    <Btn small variant="danger" onClick={e => { e.stopPropagation(); if (window.confirm('¿Eliminar esta orden de compra?')) deleteOrder(o.id); }}>
                                        🗑
                                    </Btn>
                                    <span style={{ color: '#6b7280', marginLeft: '8px' }}>{selectedOrderId === o.id ? '▲' : '▼'}</span>
                                </div>
                            </div>
                            {selectedOrderId === o.id && (
                                <div style={{ borderTop: '1px solid #2a2d3e', padding: '16px' }}>
                                    
                                    <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {o.estado !== 'COMPLETADO' && o.estado !== 'CANCELADO' && (
                                            <Btn small onClick={() => setGenerateRemitoOrder(o)}>📦 Generar Remito de Entrada</Btn>
                                        )}
                                        <Btn small variant="secondary" onClick={() => updateStatus({ id: o.id, status: 'PENDIENTE' })}>Marcar Pendiente</Btn>
                                        <Btn small variant="secondary" onClick={() => updateStatus({ id: o.id, status: 'RECIBIDO_PARCIAL' })}>Marcar Parcial</Btn>
                                        <Btn small variant="secondary" onClick={() => updateStatus({ id: o.id, status: 'COMPLETADO' })}>Marcar Completado</Btn>
                                        <Btn small variant="danger" onClick={() => updateStatus({ id: o.id, status: 'CANCELADO' })}>Anular Orden</Btn>
                                    </div>

                                    <Table
                                        cols={['Material', 'Pedido (Kg)', 'Recibido (Kg)', 'Pendiente (Kg)', 'Secundario (Unid)', 'Notas']}
                                        rows={(o.lines ?? []).map((l: any) => {
                                            const pedido = Number(l.qtyPedido);
                                            const recibido = Number(l.qtyRecibida);
                                            const pendiente = Math.max(0, pedido - recibido);
                                            return [
                                                l.item?.descripcion ?? l.itemId,
                                                <strong>{pedido.toFixed(2)}</strong>,
                                                <span style={{ color: recibido > 0 ? '#10b981' : '#6b7280' }}>{recibido.toFixed(2)}</span>,
                                                <span style={{ color: pendiente > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{pendiente.toFixed(2)}</span>,
                                                l.qtySecundaria ? `${Number(l.qtySecundaria).toFixed(0)} (${Number(l.qtyRecibidaSecundaria).toFixed(0)} rec)` : '—',
                                                <span style={{ fontSize: '11px', color: '#9ca3af' }}>{l.observaciones || '—'}</span>
                                            ];
                                        })}
                                    />
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            ))}

            {showForm && (
                <Modal title={editOrderId ? "Editar Orden de Compra" : "Nueva Orden de Compra"} onClose={closeForm} wide>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ color: '#9ca3af', fontSize: '12px' }}>Depósito Destino</label>
                            <div style={{ marginTop: '6px' }}>
                                <Select value={depositoId} onChange={setDepositoId}
                                    options={[{ value: '', label: 'Seleccionar...' }, ...depots.map((d: any) => ({ value: d.id, label: d.nombre }))]} />
                            </div>
                        </div>
                        <div>
                            <label style={{ color: '#9ca3af', fontSize: '12px' }}>Proveedor</label>
                            <div style={{ marginTop: '6px' }}>
                                <SearchSelect value={supplierId} onChange={setSupplierId}
                                    options={[{ value: '', label: 'Seleccionar...' }, ...suppliers.map((c: any) => ({ value: c.id, label: c.name }))]} placeholder="Buscar proveedor..." />
                            </div>
                        </div>
                        <Input label="Fecha Emisión" type="date" value={fechaEmision} onChange={setFechaEmision} />
                        <Input label="Fecha Entrega (Aprox)" type="date" value={fechaEntregaEsperada} onChange={setFechaEntregaEsperada} />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
                        <Input label="Observaciones de la Orden" value={observaciones} onChange={setObservaciones} />
                        <div>
                            <label style={{ color: '#9ca3af', fontSize: '12px' }}>Número de Orden (Autogenerado)</label>
                            <div style={{ color: '#a5b4fc', fontWeight: 700, fontSize: '14px', marginTop: '10px' }}>
                                {editOrderId ? orders.find((x: any) => x.id === editOrderId)?.numero : nextNumData?.numero ?? 'Generando consecutivo...'}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 600 }}>Materiales Solicitados</label>
                            <Btn small onClick={() => setLines(p => [...p, { itemId: '', qtyPedido: '', qtySecundaria: '', observaciones: '' }])}>
                                + Agregar Material
                            </Btn>
                        </div>
                        {lines.map((l, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 2fr auto', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
                                <SearchSelect label="Material" value={l.itemId} onChange={v => setLines(p => p.map((x, j) => j === i ? { ...x, itemId: v } : x))}
                                    options={[{ value: '', label: 'Seleccionar...' }, ...filteredItems.map((it: any) => ({ value: it.id, label: `${it.codigoInterno} — ${it.descripcion}` }))]} placeholder="Buscar material..." />
                                
                                <Input label="Cant. Pedida (Kg)" type="number" value={l.qtyPedido} onChange={v => setLines(p => p.map((x, j) => j === i ? { ...x, qtyPedido: v } : x))} />
                                
                                <Input label="Secundario (Unid)" type="number" placeholder="Opcional" value={l.qtySecundaria} onChange={v => setLines(p => p.map((x, j) => j === i ? { ...x, qtySecundaria: v } : x))} />
                                
                                <Input label="Observaciones del material" placeholder="Notas" value={l.observaciones} onChange={v => setLines(p => p.map((x, j) => j === i ? { ...x, observaciones: v } : x))} />
                                
                                <Btn small variant="danger" 
                                    onClick={() => {
                                        if (l.minQty && l.minQty > 0) {
                                            alert(`No podés eliminar este material porque ya tiene ${l.minQty} kg recibidos. Si querés cancelarlo, reducí la cantidad al mínimo y cerrá el saldo pendiente con un ajuste.`);
                                            return;
                                        }
                                        setLines(p => p.filter((_, j) => j !== i));
                                    }} 
                                    style={{ alignSelf: 'flex-end' }}
                                >
                                    ✕
                                </Btn>
                            </div>
                        ))}
                    </div>
                    {error && <p style={{ color: '#f87171', fontSize: '13px', margin: '8px 0' }}>⚠️ {error}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Btn variant="secondary" onClick={closeForm}>Cancelar</Btn>
                        <Btn onClick={save} disabled={saving || !supplierId || !depositoId}>
                            {saving ? 'Guardando...' : editOrderId ? 'Modificar Orden' : 'Generar Orden de Compra'}
                        </Btn>
                    </div>
                </Modal>
            )}

            {/* Modal de Trazabilidad y Cumplimiento detallado */}
            {selectedFulfillmentOrderId && (
                <OrdenCompraDetailModal 
                    orderId={selectedFulfillmentOrderId} 
                    onClose={() => setSelectedFulfillmentOrderId(null)} 
                />
            )}

            {/* Modal para Generar Remito de Entrada de Stock desde OC */}
            {generateRemitoOrder && (
                <GenerateRemitoModal 
                    order={generateRemitoOrder}
                    depots={depots}
                    onClose={() => setGenerateRemitoOrder(null)}
                    onSuccess={() => setGenerateRemitoOrder(null)}
                />
            )}
        </div>
    );
}

function GenerateRemitoModal({ order, depots, onClose, onSuccess }: any) {
    const [generateRemito, { isLoading }] = useGenerateRemitoFromPOMutation();
    const [depositoId, setDepositoId] = useState(order.depositoId || depots[0]?.id || '');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [observaciones, setObservaciones] = useState('');
    const [lines, setLines] = useState(() => (order.lines || []).map((l: any) => {
        const pending = Math.max(0, Number(l.qtyPedido) - Number(l.qtyRecibida));
        const pendingSec = l.qtySecundaria ? Math.max(0, Number(l.qtySecundaria) - Number(l.qtyRecibidaSecundaria || 0)) : 0;
        return {
            lineId: l.id,
            itemDesc: l.item?.descripcion || l.itemId,
            itemCode: l.item?.codigoInterno || '',
            pending,
            qtyPrincipal: String(pending),
            qtySecundaria: pendingSec > 0 ? String(pendingSec) : '',
            lotNumber: `LOTE-${order.numero.replace(/^OC-/, '')}`,
        };
    }));
    const [error, setError] = useState('');

    const handleConfirm = async () => {
        setError('');
        if (!depositoId) {
            setError('Debe seleccionar el depósito de destino.');
            return;
        }

        const validLines = lines
            .filter(l => Number(l.qtyPrincipal) > 0)
            .map(l => ({
                lineId: l.lineId,
                lotNumber: l.lotNumber.trim() || `LOTE-${order.numero}`,
                qtyPrincipal: Number(l.qtyPrincipal),
                qtySecundaria: l.qtySecundaria ? Number(l.qtySecundaria) : undefined,
            }));

        if (validLines.length === 0) {
            setError('Debe ingresar al menos una línea con cantidad mayor a 0.');
            return;
        }

        try {
            await generateRemito({
                id: order.id,
                body: {
                    depositoId,
                    fecha,
                    observaciones,
                    lines: validLines
                }
            }).unwrap();
            alert('¡Remito de Entrada y stock generados exitosamente!');
            onSuccess();
        } catch (e: any) {
            setError(e?.data?.message || 'Error al generar remito de entrada');
        }
    };

    return (
        <Modal title={`📦 Generar Ingreso de Stock — ${order.numero}`} onClose={onClose} wide>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                        <label style={{ color: '#9ca3af', fontSize: '12px' }}>Depósito Destino (Recepción)</label>
                        <Select value={depositoId} onChange={setDepositoId}
                            options={[{ value: '', label: 'Seleccionar depósito...' }, ...depots.map((d: any) => ({ value: d.id, label: d.nombre }))]} />
                    </div>
                    <Input label="Fecha de Recepción" type="date" value={fecha} onChange={setFecha} />
                    <Input label="Observaciones del Remito" placeholder="Ej: Factura A-1234" value={observaciones} onChange={setObservaciones} />
                </div>

                <div style={{ background: '#111827', padding: '12px', borderRadius: '8px', border: '1px solid #1e2133' }}>
                    <div style={{ color: '#a5b4fc', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                        Detalle de Ingreso (Lotes y Cantidades)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                        {lines.map((l: any, idx: number) => (
                            <div key={l.lineId} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1fr', gap: '8px', alignItems: 'center', background: '#1f2937', padding: '8px 12px', borderRadius: '6px' }}>
                                <div>
                                    <div style={{ color: '#f3f4f6', fontWeight: 600, fontSize: '13px' }}>{l.itemDesc}</div>
                                    <small style={{ color: '#9ca3af', fontSize: '11px' }}>{l.itemCode} &middot; Pendiente: {l.pending.toFixed(1)} kg</small>
                                </div>
                                <Input label="N° de Partida / Lote" value={l.lotNumber} onChange={v => setLines((prev: any[]) => prev.map((x, i) => i === idx ? { ...x, lotNumber: v } : x))} />
                                <Input label="Cant. Princ. (Kg)" type="number" value={l.qtyPrincipal} onChange={v => setLines((prev: any[]) => prev.map((x, i) => i === idx ? { ...x, qtyPrincipal: v } : x))} />
                                <Input label="Cant. Sec. (Un)" type="number" placeholder="Opcional" value={l.qtySecundaria} onChange={v => setLines((prev: any[]) => prev.map((x, i) => i === idx ? { ...x, qtySecundaria: v } : x))} />
                            </div>
                        ))}
                    </div>
                </div>

                {error && <p style={{ color: '#f87171', fontSize: '13px', margin: 0 }}>⚠️ {error}</p>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                    <Btn variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Btn>
                    <Btn onClick={handleConfirm} disabled={isLoading || !depositoId}>
                        {isLoading ? 'Generando...' : 'Confirmar Ingreso a Stock'}
                    </Btn>
                </div>
            </div>
        </Modal>
    );
}
