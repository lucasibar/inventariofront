import { useState } from 'react';
import { useGetRemitosSalidaQuery, usePreviewRemitoSalidaMutation, useCreateRemitoSalidaMutation, useDeleteRemitoSalidaMutation } from '../features/remitosSalida/api/remitos-salida.api';
import { useGetOrdersQuery } from '../features/orders/api/orders.api';
import { useGetPartnersQuery } from '../features/partners/api/partners.api';
import { useGetItemsQuery } from '../features/items/api/items.api';
import { PageHeader, Card, Btn, Input, Select, Modal, Table, Badge } from './common/ui';

export default function RemitosSalidaPage() {
    const { data: remitos = [], isLoading } = useGetRemitosSalidaQuery();
    const { data: orders = [] } = useGetOrdersQuery();
    const { data: clients = [] } = useGetPartnersQuery({ type: 'CLIENT' });
    const { data: items = [] } = useGetItemsQuery({});

    const [previewRemito] = usePreviewRemitoSalidaMutation();
    const [createRemito] = useCreateRemitoSalidaMutation();
    const [deleteRemito] = useDeleteRemitoSalidaMutation();

    const [step, setStep] = useState<'form' | 'preview' | null>(null);
    const [orderId, setOrderId] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientName, setClientName] = useState('');
    const [newClient, setNewClient] = useState(false);
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [observaciones, setObservaciones] = useState('');
    const [lines, setLines] = useState<{ itemId: string; kilos: string; unidades: string }[]>([{ itemId: '', kilos: '', unidades: '' }]);
    const [previewData, setPreviewData] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Load order lines when order selected
    const selectedOrder = orders.find((o: any) => o.id === orderId);
    const loadFromOrder = () => {
        if (!selectedOrder) return;
        setLines((selectedOrder.lines ?? []).map((l: any) => ({ itemId: l.itemId, kilos: String(l.kilosPedidos), unidades: '' })));
        if (selectedOrder.client) { setClientId(selectedOrder.client.id); setNewClient(false); }
    };

    const goPreview = async () => {
        setError('');
        try {
            const result = await previewRemito({ lines: lines.filter(l => l.itemId).map(l => ({ itemId: l.itemId, kilos: Number(l.kilos), unidades: l.unidades ? Number(l.unidades) : undefined })) }).unwrap();
            setPreviewData(result);
            setStep('preview');
        } catch (e: any) { setError(e?.data?.message ?? 'Error al generar preview'); }
    };

    const confirmSave = async () => {
        setSaving(true); setError('');
        try {
            const dto: any = {
                fecha, observaciones,
                orderId: orderId || undefined,
                lines: lines.filter(l => l.itemId).map(l => ({ itemId: l.itemId, kilos: Number(l.kilos), unidades: l.unidades ? Number(l.unidades) : undefined })),
            };
            if (newClient) dto.clientName = clientName;
            else dto.clientId = clientId;
            await createRemito(dto).unwrap();
            setStep(null); setLines([{ itemId: '', kilos: '', unidades: '' }]); setPreviewData(null);
        } catch (e: any) { setError(e?.data?.message ?? 'Error al confirmar'); }
        setSaving(false);
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Remitos de Salida" subtitle="Egreso de mercadería con FIFO desde picking">
                <Btn onClick={() => { setStep('form'); setError(''); }}>+ Nuevo Remito</Btn>
            </PageHeader>

            {isLoading ? <p style={{ color: '#9ca3af' }}>Cargando...</p> : (
                <Card>
                    <Table
                        cols={['Número', 'Fecha', 'Cliente', 'Pedido asociado', 'Líneas', '']}
                        rows={remitos.map((r: any) => [
                            <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{r.numero}</span>,
                            new Date(r.fecha).toLocaleDateString('es-AR'),
                            r.client?.name ?? '—',
                            r.order?.numero ?? '—',
                            <Badge>{r.lines?.length ?? 0} ítems</Badge>,
                            <Btn small variant="danger" onClick={() => deleteRemito(r.id)}>🗑</Btn>,
                        ])}
                    />
                </Card>
            )}

            {/* Step 1: Form */}
            {step === 'form' && (
                <Modal title="Nuevo Remito de Salida" onClose={() => setStep(null)} wide>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ color: '#9ca3af', fontSize: '12px' }}>Pedido (opcional)</label>
                            <Select value={orderId} onChange={v => { setOrderId(v); if (v) setTimeout(loadFromOrder, 100); }}
                                options={[{ value: '', label: 'Sin pedido asociado' }, ...orders.map((o: any) => ({ value: o.id, label: `${o.numero} — ${o.client?.name ?? 'S/C'}` }))]}
                                style={{ marginTop: '6px' }} />
                        </div>
                        <Input label="Fecha" type="date" value={fecha} onChange={setFecha} />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ color: '#9ca3af', fontSize: '12px' }}>Cliente</label>
                        <Select value={newClient ? '__new__' : clientId} onChange={v => { if (v === '__new__') setNewClient(true); else { setNewClient(false); setClientId(v); } }}
                            options={[{ value: '', label: 'Seleccionar...' }, { value: '__new__', label: '+ Nuevo cliente' }, ...clients.map((c: any) => ({ value: c.id, label: c.name }))]}
                            style={{ marginTop: '6px' }} />
                        {newClient && <Input style={{ marginTop: '8px' }} label="Nombre" value={clientName} onChange={setClientName} />}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label style={{ color: '#9ca3af', fontSize: '12px' }}>Materiales a despachar</label>
                            <Btn small onClick={() => setLines(p => [...p, { itemId: '', kilos: '', unidades: '' }])}>+ Línea</Btn>
                        </div>
                        {lines.map((l, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
                                <Select label="Material" value={l.itemId} onChange={v => setLines(p => p.map((x, j) => j === i ? { ...x, itemId: v } : x))}
                                    options={[{ value: '', label: 'Seleccionar...' }, ...items.map((it: any) => ({ value: it.id, label: `${it.codigoInterno} — ${it.descripcion}` }))]} />
                                <Input label="Kilos" type="number" value={l.kilos} onChange={v => setLines(p => p.map((x, j) => j === i ? { ...x, kilos: v } : x))} />
                                <Input label="Unidades" type="number" value={l.unidades} onChange={v => setLines(p => p.map((x, j) => j === i ? { ...x, unidades: v } : x))} />
                                <Btn small variant="danger" onClick={() => setLines(p => p.filter((_, j) => j !== i))} style={{ alignSelf: 'flex-end' }}>✕</Btn>
                            </div>
                        ))}
                    </div>
                    {error && <p style={{ color: '#f87171' }}>{error}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Btn variant="secondary" onClick={() => setStep(null)}>Cancelar</Btn>
                        <Btn onClick={goPreview}>Ver Preview →</Btn>
                    </div>
                </Modal>
            )}

            {/* Step 2: Preview */}
            {step === 'preview' && previewData && (
                <Modal title="Preview de Remito de Salida — FIFO" onClose={() => setStep('form')} wide>
                    {previewData.warnings?.length > 0 && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                            {previewData.warnings.map((w: string, i: number) => <p key={i} style={{ color: '#f87171', margin: '2px 0', fontSize: '13px' }}>⚠️ {w}</p>)}
                        </div>
                    )}
                    <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '12px' }}>Se descontará el stock de las posiciones PICKING con lógica FIFO:</p>
                    <Table
                        cols={['Material', 'Partida', 'Posición', 'Kilos a descontar', 'Stock restante']}
                        rows={(previewData.lines ?? []).map((l: any) => [
                            l.itemDescripcion,
                            <code style={{ color: '#fbbf24', fontSize: '11px' }}>{l.lotNumber}</code>,
                            <Badge color="#34d399">{l.posicionCodigo}</Badge>,
                            <strong style={{ color: '#a5b4fc' }}>{Number(l.kilosDescontados).toFixed(2)} kg</strong>,
                            <span style={{ color: l.kilosRestantesEnPosicion < 5 ? '#f87171' : '#34d399' }}>{Number(l.kilosRestantesEnPosicion).toFixed(2)} kg</span>,
                        ])}
                    />
                    {error && <p style={{ color: '#f87171', marginTop: '8px' }}>{error}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                        <Btn variant="secondary" onClick={() => setStep('form')}>← Volver</Btn>
                        <Btn onClick={confirmSave} disabled={saving}>{saving ? 'Confirmando...' : '✅ Confirmar y Guardar'}</Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}
