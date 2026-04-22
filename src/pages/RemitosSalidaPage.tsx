import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../entities/auth/model/authSlice';
import { useGetRemitosSalidaQuery, usePreviewRemitoSalidaMutation, useCreateRemitoSalidaMutation, useDeleteRemitoSalidaMutation, useLazyGetRemitoSalidaQuery } from '../features/remitosSalida/api/remitos-salida.api';
import { RemitoDetailModal } from '../features/remitos/ui/RemitoDetailModal';
import { CreatePartnerDialog } from '../features/remitos/ui/CreatePartnerDialog';
import { useGetOrdersQuery } from '../features/orders/api/orders.api';
import { useGetPartnersQuery } from '../features/partners/api/partners.api';
import { useGetItemsQuery } from '../features/items/api/items.api';
import { PageHeader, Card, Btn, Input, Select, SearchSelect, Modal, Table, Badge } from './common/ui';

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
    const [numero, setNumero] = useState('');
    const user = useSelector(selectCurrentUser);
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [observaciones, setObservaciones] = useState('');
    const [lines, setLines] = useState<{ itemId: string; qtyPrincipal: string; qtySecundaria: string }[]>([{ itemId: '', qtyPrincipal: '', qtySecundaria: '' }]);
    const [previewData, setPreviewData] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [clientId, setClientId] = useState('');
    const [newClient, setNewClient] = useState(false);
    const [clientName] = useState('');
    const [partnerModalOpen, setPartnerModalOpen] = useState(false);
    const [selectedRemito, setSelectedRemito] = useState<any>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [triggerGetDetail] = useLazyGetRemitoSalidaQuery();

    const handleRowClick = async (remito: any) => {
        try {
            const fullRemito = await triggerGetDetail(remito.id).unwrap();
            setSelectedRemito(fullRemito);
            setShowDetail(true);
        } catch (err) {
            console.error('Error al cargar detalle del remito', err);
            setSelectedRemito(remito);
            setShowDetail(true);
        }
    };

    // Load order lines when order selected
    const selectedOrder = orders.find((o: any) => o.id === orderId);
    const loadFromOrder = () => {
        if (!selectedOrder) return;
        setLines((selectedOrder.lines ?? []).map((l: any) => ({ itemId: l.itemId, qtyPrincipal: String(l.qtyPrincipal || l.kilosPedidos), qtySecundaria: '' })));
        if (selectedOrder.client) { setClientId(selectedOrder.client.id); setNewClient(false); }
    };

    const goPreview = async () => {
        setError('');
        try {
            const result = await previewRemito({ lines: lines.filter(l => l.itemId).map(l => ({ itemId: l.itemId, qtyPrincipal: Number(l.qtyPrincipal), qtySecundaria: l.qtySecundaria ? Number(l.qtySecundaria) : undefined })) }).unwrap();
            setPreviewData(result);
            setStep('preview');
        } catch (e: any) { setError(e?.data?.message ?? 'Error al generar preview'); }
    };

    const confirmSave = async () => {
        setSaving(true); setError('');
        try {
            const dto: any = {
                fecha, observaciones: observaciones || undefined,
                numero: numero || undefined,
                orderId: orderId || undefined,
                lines: lines.filter(l => l.itemId).map(l => ({ itemId: l.itemId, qtyPrincipal: Number(l.qtyPrincipal), qtySecundaria: l.qtySecundaria ? Number(l.qtySecundaria) : undefined })),
            };
            if (newClient) dto.clientName = clientName;
            else dto.clientId = clientId;
            await createRemito(dto).unwrap();
            setStep(null); setLines([{ itemId: '', qtyPrincipal: '', qtySecundaria: '' }]); setPreviewData(null);
        } catch (e: any) { setError(e?.data?.message ?? 'Error al confirmar'); }
        setSaving(false);
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Remitos de Salida" subtitle="Egreso de mercadería con FIFO desde picking">
                <Btn onClick={() => { setStep('form'); setError(''); }}>+ Nuevo Remito</Btn>
            </PageHeader>

            <Card>
                <Table
                    loading={isLoading}
                    cols={['Número', 'Fecha', 'Cliente', 'Pedido asociado', 'Líneas', '']}
                    rows={remitos.map((r: any) => [
                        <span key="num" style={{ color: '#a5b4fc', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleRowClick(r)}>{r.numero}</span>,
                        new Date(r.fecha).toLocaleDateString('es-AR'),
                        (r.partner?.name || r.client?.name) ?? '—',
                        r.order?.numero ?? '—',
                        <Badge key="badge">{r.lines?.length ?? 0} ítems</Badge>,
                        <Btn key="del" small variant="danger" onClick={(e: any) => { e.stopPropagation(); if (window.confirm('¿Anular este remito de salida?')) deleteRemito(r.id); }}>🗑</Btn>,
                    ])}
                />
            </Card>

            {/* Step 1: Form */}
            {step === 'form' && (
                <Modal title="Nuevo Remito de Salida" onClose={() => setStep(null)} wide>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ color: '#9ca3af', fontSize: '12px' }}>Pedido (opcional)</label>
                            <Select value={orderId} onChange={v => { setOrderId(v); if (v) setTimeout(loadFromOrder, 100); }}
                                options={[{ value: '', label: 'Sin pedido asociado' }, ...orders.map((o: any) => ({ value: o.id, label: `${o.numero} — ${o.client?.name ?? 'S/C'}` }))]}
                                style={{ marginTop: '6px' }} />
                        </div>
                        <Input label="Número (opcional)" placeholder="Auto-generar si vacío" value={numero} onChange={setNumero} />
                        <Input label="Fecha" type="date" value={fecha} onChange={setFecha} />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ color: '#9ca3af', fontSize: '12px' }}>Cliente</label>
                        <SearchSelect
                            value={newClient ? '__new__' : clientId}
                            onChange={v => {
                                if (v === '__new__') {
                                    if (!isAdmin) { alert('Solo administradores pueden crear clientes'); return; }
                                    setPartnerModalOpen(true);
                                } else {
                                    setNewClient(false);
                                    setClientId(v);
                                }
                            }}
                            options={[{ value: '', label: 'Seleccionar...' }, ...(isAdmin ? [{ value: '__new__', label: '+ Nuevo cliente' }] : []), ...clients.map((c:any)=>({value:c.id,label:c.name}))]}
                            placeholder="Buscar cliente..."
                            style={{ marginTop: '6px' }}
                        />
                    </div>

                    <Input label="Observaciones (opcional)" value={observaciones} onChange={setObservaciones} style={{ marginBottom: '16px' }} />

                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label style={{ color: '#9ca3af', fontSize: '12px' }}>Materiales a despachar</label>
                            <Btn small onClick={() => setLines(p => [...p, { itemId: '', qtyPrincipal: '', qtySecundaria: '' }])}>+ Línea</Btn>
                        </div>
                        {lines.map((l: any, i: number) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
                                <SearchSelect label="Material" value={l.itemId} onChange={v => setLines(p => p.map((x, j) => j === i ? { ...x, itemId: v } : x))}
                                    options={[{ value: '', label: 'Seleccionar...' }, ...items.map((it: any) => ({ value: it.id, label: `${it.codigoInterno} — ${it.descripcion}` }))]} placeholder="Buscar material..." />
                                <Input label="Cant. Principal" type="number" value={l.qtyPrincipal} onChange={v => setLines(p => p.map((x, j) => j === i ? { ...x, qtyPrincipal: v } : x))} />
                                <Input label="Secundaria" type="number" value={l.qtySecundaria} onChange={v => setLines(p => p.map((x, j) => j === i ? { ...x, qtySecundaria: v } : x))} />
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
                            <strong style={{ color: '#a5b4fc' }}>{Number(l.qtyPrincipalDescontada).toFixed(2)} kg</strong>,
                            <span style={{ color: l.qtyPrincipalRestanteEnPosicion < 5 ? '#f87171' : '#34d399' }}>{Number(l.qtyPrincipalRestanteEnPosicion).toFixed(2)} kg</span>,
                        ])}
                    />
                    {error && <p style={{ color: '#f87171', marginTop: '8px' }}>{error}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                        <Btn variant="secondary" onClick={() => setStep('form')}>← Volver</Btn>
                        <Btn onClick={confirmSave} disabled={saving}>{saving ? 'Confirmando...' : '✅ Confirmar y Guardar'}</Btn>
                    </div>
                </Modal>
            )}

            <RemitoDetailModal 
                open={showDetail} 
                onClose={() => setShowDetail(false)} 
                remito={selectedRemito} 
            />

            <CreatePartnerDialog
                open={partnerModalOpen}
                onClose={() => setPartnerModalOpen(false)}
                defaultType="CLIENT"
                onSuccess={(p) => {
                    setClientId(p.id);
                    setNewClient(false);
                }}
            />
        </div>
    );
}
