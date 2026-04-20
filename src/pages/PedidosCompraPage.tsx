import { useState, useMemo } from 'react';
import { 
    useGetPurchaseOrdersQuery, 
    useCreatePurchaseOrderMutation, 
    useDeletePurchaseOrderMutation,
    useUpdatePurchaseOrderStatusMutation
} from '../features/purchase-orders/api/purchase-orders.api';
import { useGetPartnersQuery } from '../features/partners/api/partners.api';
import { useGetItemsQuery } from '../features/items/api/items.api';
import { PageHeader, Card, Btn, Input, SearchSelect, Modal, Table, Badge, Spinner } from './common/ui';

export default function PedidosCompraPage() {
    const { data: orders = [], isLoading } = useGetPurchaseOrdersQuery();
    const { data: suppliers = [] } = useGetPartnersQuery({ type: 'SUPPLIER' });
    const { data: items = [] } = useGetItemsQuery({});

    const [createOrder] = useCreatePurchaseOrderMutation();
    const [deleteOrder] = useDeletePurchaseOrderMutation();
    const [updateStatus] = useUpdatePurchaseOrderStatusMutation();

    const [showForm, setShowForm] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [supplierId, setSupplierId] = useState('');
    const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);
    const [fechaEntregaEsperada, setFechaEntregaEsperada] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [lines, setLines] = useState<{ itemId: string; qtyPedido: string }[]>([{ itemId: '', qtyPedido: '' }]);
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
            const dto: any = {
                supplierId,
                fechaEmision,
                fechaEntregaEsperada: fechaEntregaEsperada || null,
                observaciones,
                lines: lines.filter(l => l.itemId).map(l => ({ itemId: l.itemId, qtyPedido: Number(l.qtyPedido) })),
            };
            await createOrder(dto).unwrap();
            setShowForm(false);
            setLines([{ itemId: '', qtyPedido: '' }]);
            setSupplierId(''); setObservaciones(''); setFechaEntregaEsperada('');
        } catch (e: any) { setError(e?.data?.message ?? 'Error al guardar'); }
        setSaving(false);
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Pedidos de Compra" subtitle="Gestión de compras a proveedores">
                <Btn onClick={() => setShowForm(true)}>+ Nuevo Pedido</Btn>
            </PageHeader>

            {isLoading ? <Spinner /> : grouped.length === 0 ? (
                <p style={{ color: '#4b5563', textAlign: 'center', padding: '32px', fontSize: '14px' }}>Todavía no hay compras cargadas</p>
            ) : grouped.map(group => (
                <div key={group.supplierName} style={{ marginBottom: '24px' }}>
                    <h3 style={{ color: '#a5b4fc', fontSize: '14px', fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🏭 {group.supplierName}
                        <Badge>{group.orders.length} pedido{group.orders.length !== 1 ? 's' : ''}</Badge>
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
                                    <Badge color={o.estado === 'PENDIENTE' ? '#f59e0b' : '#3b82f6'}>{o.estado}</Badge>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ color: '#6b7280' }}>{selectedOrderId === o.id ? '▲' : '▼'}</span>
                                    <Btn small variant="danger" onClick={e => { e.stopPropagation(); if (window.confirm('¿Eliminar este pedido?')) deleteOrder(o.id); }}>🗑</Btn>
                                </div>
                            </div>
                            {selectedOrderId === o.id && (
                                <div style={{ borderTop: '1px solid #2a2d3e', padding: '16px' }}>
                                    
                                    <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                                        <Btn small variant="secondary" onClick={() => updateStatus({ id: o.id, status: 'PENDIENTE' })}>Marcar Pendiente</Btn>
                                        <Btn small onClick={() => updateStatus({ id: o.id, status: 'COMPLETADO' })}>Marcar Completado</Btn>
                                    </div>

                                    <Table
                                        cols={['Material', 'Esperado', 'Unidad']}
                                        rows={(o.lines ?? []).map((l: any) => {
                                            return [
                                                l.item?.descripcion ?? l.itemId,
                                                <strong>{Number(l.qtyPedido).toFixed(2)}</strong>,
                                                l.item?.unidadPrincipal ?? 'kg',
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
                <Modal title="Nuevo Pedido de Compra" onClose={() => setShowForm(false)} wide>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ color: '#9ca3af', fontSize: '12px' }}>Proveedor</label>
                            <div style={{ marginTop: '6px' }}>
                                <SearchSelect value={supplierId} onChange={setSupplierId}
                                    options={[{ value: '', label: 'Seleccionar...' }, ...suppliers.map((c: any) => ({ value: c.id, label: c.name }))]} placeholder="Buscar proveedor..." />
                            </div>
                        </div>
                        <Input label="Fecha Emisión" type="date" value={fechaEmision} onChange={setFechaEmision} />
                        <Input label="Fecha Llegada (Aprox)" type="date" value={fechaEntregaEsperada} onChange={setFechaEntregaEsperada} />
                    </div>
                    <Input label="Observaciones" value={observaciones} onChange={setObservaciones} style={{ marginBottom: '16px' }} />

                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label style={{ color: '#9ca3af', fontSize: '12px' }}>Materiales Solicitados</label>
                            <Btn small onClick={() => setLines(p => [...p, { itemId: '', qtyPedido: '' }])}>+ Lote a pedir</Btn>
                        </div>
                        {lines.map((l, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
                                <SearchSelect label="Material" value={l.itemId} onChange={v => setLines(p => p.map((x, j) => j === i ? { ...x, itemId: v } : x))}
                                    options={[{ value: '', label: 'Seleccionar...' }, ...filteredItems.map((it: any) => ({ value: it.id, label: `${it.codigoInterno} — ${it.descripcion}` }))]} placeholder="Buscar material..." />
                                <Input label="Cantidad Requerida" type="number" value={l.qtyPedido} onChange={v => setLines(p => p.map((x, j) => j === i ? { ...x, qtyPedido: v } : x))} />
                                <Btn small variant="danger" onClick={() => setLines(p => p.filter((_, j) => j !== i))} style={{ alignSelf: 'flex-end' }}>✕</Btn>
                            </div>
                        ))}
                    </div>
                    {error && <p style={{ color: '#f87171' }}>{error}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
                        <Btn onClick={save} disabled={saving || !supplierId}>{saving ? 'Guardando...' : 'Generar Orden de Compra'}</Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}
