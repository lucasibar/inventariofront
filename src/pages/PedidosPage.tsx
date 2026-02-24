import { useState, useMemo } from 'react';
import { useGetOrdersQuery, useGetOrderQuery, useCreateOrderMutation, useDeleteOrderMutation } from '../features/orders/api/orders.api';
import { useGetPartnersQuery } from '../features/partners/api/partners.api';
import { useGetItemsQuery } from '../features/items/api/items.api';
import { useGetAlertsQuery } from '../features/stock/api/stock.api';
import { PageHeader, Card, Btn, Input, Select, Modal, Table, Badge, Spinner } from './common/ui';

export default function PedidosPage() {
    const { data: orders = [], isLoading } = useGetOrdersQuery();
    const { data: clients = [] } = useGetPartnersQuery({ type: 'CLIENT' });
    const { data: items = [] } = useGetItemsQuery({});
    const { data: alerts = [] } = useGetAlertsQuery();

    const [createOrder] = useCreateOrderMutation();
    const [deleteOrder] = useDeleteOrderMutation();

    const [showForm, setShowForm] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [clientId, setClientId] = useState('');
    const [clientName, setClientName] = useState('');
    const [newClient, setNewClient] = useState(false);
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [observaciones, setObservaciones] = useState('');
    const [lines, setLines] = useState<{ itemId: string; kilosPedidos: string }[]>([{ itemId: '', kilosPedidos: '' }]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Group orders by client
    const grouped = useMemo(() => {
        const map = new Map<string, { clientName: string; orders: any[] }>();
        orders.forEach((o: any) => {
            const key = o.client?.id ?? 'sin-cliente';
            if (!map.has(key)) map.set(key, { clientName: o.client?.name ?? 'Sin cliente', orders: [] });
            map.get(key)!.orders.push(o);
        });
        return Array.from(map.values());
    }, [orders]);

    const alertMap = useMemo(() => {
        const m: Record<string, any> = {};
        alerts.forEach((a: any) => { m[a.itemId] = a; });
        return m;
    }, [alerts]);

    const save = async () => {
        setSaving(true); setError('');
        try {
            const dto: any = {
                fecha, observaciones,
                lines: lines.filter(l => l.itemId).map(l => ({ itemId: l.itemId, kilosPedidos: Number(l.kilosPedidos) })),
            };
            if (newClient) dto.clientName = clientName;
            else dto.clientId = clientId;
            await createOrder(dto).unwrap();
            setShowForm(false);
            setLines([{ itemId: '', kilosPedidos: '' }]);
            setClientId(''); setClientName(''); setObservaciones('');
        } catch (e: any) { setError(e?.data?.message ?? 'Error al guardar'); }
        setSaving(false);
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Pedidos a Depósito" subtitle="Solicitudes de materiales">
                <Btn onClick={() => setShowForm(true)}>+ Nuevo Pedido</Btn>
            </PageHeader>

            {alerts.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#f87171', fontWeight: 700, fontSize: '13px' }}>⚠️ Alertas de stock bajo:</span>
                    {alerts.map((a: any) => (
                        <span key={a.itemId} style={{ color: '#fca5a5', fontSize: '12px' }}>{a.descripcion}: {Number(a.stockActual).toFixed(1)} / {Number(a.alertaKilos).toFixed(1)} kg</span>
                    ))}
                </div>
            )}

            {isLoading ? <Spinner /> : grouped.length === 0 ? (
                <p style={{ color: '#4b5563', textAlign: 'center', padding: '32px', fontSize: '14px' }}>Todavía no hay datos cargados</p>
            ) : grouped.map(group => (
                <div key={group.clientName} style={{ marginBottom: '24px' }}>
                    <h3 style={{ color: '#a5b4fc', fontSize: '14px', fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🤝 {group.clientName}
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
                                    <span style={{ color: '#6b7280', fontSize: '12px' }}>{new Date(o.fecha).toLocaleDateString('es-AR')}</span>
                                    <Badge>{o.lines?.length ?? 0} materiales</Badge>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ color: '#6b7280' }}>{selectedOrderId === o.id ? '▲' : '▼'}</span>
                                    <Btn small variant="danger" onClick={e => { e.stopPropagation(); deleteOrder(o.id); }}>🗑</Btn>
                                </div>
                            </div>
                            {selectedOrderId === o.id && (
                                <div style={{ borderTop: '1px solid #2a2d3e' }}>
                                    <Table
                                        cols={['Material', 'Categoría', 'Kilos pedidos', 'Stock actual', 'Estado']}
                                        rows={(o.lines ?? []).map((l: any) => {
                                            const alert = alertMap[l.itemId];
                                            const stockColor = alert ? '#f87171' : '#34d399';
                                            return [
                                                l.item?.descripcion ?? l.itemId,
                                                l.item?.categoria ?? '—',
                                                <strong>{Number(l.kilosPedidos).toFixed(2)} kg</strong>,
                                                <span style={{ color: stockColor, fontWeight: 600 }}>{Number(l.kilosSnapshot ?? 0).toFixed(2)} kg</span>,
                                                alert
                                                    ? <Badge color="#f87171">⚠️ Bajo stock</Badge>
                                                    : <Badge color="#34d399">✅ OK</Badge>,
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
                <Modal title="Nuevo Pedido" onClose={() => setShowForm(false)} wide>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ color: '#9ca3af', fontSize: '12px' }}>Cliente</label>
                            <div style={{ marginTop: '6px' }}>
                                <Select value={newClient ? '__new__' : clientId} onChange={v => { if (v === '__new__') setNewClient(true); else { setNewClient(false); setClientId(v); } }}
                                    options={[{ value: '', label: 'Seleccionar...' }, { value: '__new__', label: '+ Nuevo cliente' }, ...clients.map((c: any) => ({ value: c.id, label: c.name }))]} />
                                {newClient && <Input style={{ marginTop: '8px' }} label="Nombre" value={clientName} onChange={setClientName} />}
                            </div>
                        </div>
                        <Input label="Fecha" type="date" value={fecha} onChange={setFecha} />
                    </div>
                    <Input label="Observaciones" value={observaciones} onChange={setObservaciones} style={{ marginBottom: '16px' }} />

                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label style={{ color: '#9ca3af', fontSize: '12px' }}>Materiales</label>
                            <Btn small onClick={() => setLines(p => [...p, { itemId: '', kilosPedidos: '' }])}>+ Material</Btn>
                        </div>
                        {lines.map((l, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
                                <Select label="Material" value={l.itemId} onChange={v => setLines(p => p.map((x, j) => j === i ? { ...x, itemId: v } : x))}
                                    options={[{ value: '', label: 'Seleccionar...' }, ...items.map((it: any) => ({ value: it.id, label: `${it.codigoInterno} — ${it.descripcion}` }))]} />
                                <Input label="Kilos" type="number" value={l.kilosPedidos} onChange={v => setLines(p => p.map((x, j) => j === i ? { ...x, kilosPedidos: v } : x))} />
                                <Btn small variant="danger" onClick={() => setLines(p => p.filter((_, j) => j !== i))} style={{ alignSelf: 'flex-end' }}>✕</Btn>
                            </div>
                        ))}
                    </div>
                    {error && <p style={{ color: '#f87171' }}>{error}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
                        <Btn onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Pedido'}</Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}
