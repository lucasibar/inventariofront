import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../entities/auth/model/authSlice';
import { 
    useGetRemitosSalidaQuery, 
    usePreviewRemitoSalidaMutation, 
    useCreateRemitoSalidaMutation, 
    useDeleteRemitoSalidaMutation, 
    useLazyGetRemitoSalidaQuery 
} from '../../features/warehouse/remitosSalida/api/remitos-salida.api';
import { RemitoDetailModal } from '../../features/warehouse/remitos/ui/RemitoDetailModal';
import { CreatePartnerDialog } from '../../features/config/CreatePartnerDialog';
import { useGetPartnersQuery } from '../../features/config/partners/api/partners.api';
import { useGetItemsQuery } from '../../features/warehouse/materiales/api/items.api';
import { useGetStockQuery } from '../../features/warehouse/stock/api/stock.api';
import { PageHeader, Card, Btn, Input, SearchSelect, Modal, Table, Badge, HelpTooltip } from '../../shared/ui';

export default function RemitosSalidaPage() {
    const { data: remitos = [], isLoading } = useGetRemitosSalidaQuery();
    const { data: clients = [] } = useGetPartnersQuery({ type: 'CLIENT' });
    const { data: items = [] } = useGetItemsQuery({});
    const { data: stock = [] } = useGetStockQuery({});

    const [previewRemito] = usePreviewRemitoSalidaMutation();
    const [createRemito] = useCreateRemitoSalidaMutation();
    const [deleteRemito] = useDeleteRemitoSalidaMutation();

    const [step, setStep] = useState<'form' | 'preview' | null>(null);
    const [numero, setNumero] = useState('');
    const user = useSelector(selectCurrentUser);
    const isAdmin = (user as any)?.role?.toUpperCase() === 'ADMIN';
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [observaciones, setObservaciones] = useState('');
    const [lines, setLines] = useState<{ itemId: string; lotId: string; posicionId: string; qtyPrincipal: string; qtySecundaria: string }[]>([{ itemId: '', lotId: '', posicionId: '', qtyPrincipal: '', qtySecundaria: '' }]);
    const [previewData, setPreviewData] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [clientId, setClientId] = useState('');
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



    const goPreview = async () => {
        setError('');
        try {
            const result = await previewRemito({ 
                lines: lines.filter(l => l.itemId).map(l => ({ 
                    itemId: l.itemId, 
                    lotId: l.lotId || undefined, 
                    posicionId: l.posicionId || undefined, 
                    qtyPrincipal: Number(l.qtyPrincipal), 
                    qtySecundaria: l.qtySecundaria ? Number(l.qtySecundaria) : undefined 
                })) 
            }).unwrap();
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
                lines: lines.filter(l => l.itemId).map(l => ({ 
                    itemId: l.itemId, 
                    lotId: l.lotId || undefined, 
                    posicionId: l.posicionId || undefined, 
                    qtyPrincipal: Number(l.qtyPrincipal), 
                    qtySecundaria: l.qtySecundaria ? Number(l.qtySecundaria) : undefined 
                })),
            };
            dto.clientId = clientId;
            await createRemito(dto).unwrap();
            setStep(null); setLines([{ itemId: '', lotId: '', posicionId: '', qtyPrincipal: '', qtySecundaria: '' }]); setPreviewData(null);
        } catch (e: any) { setError(e?.data?.message ?? 'Error al confirmar'); }
        setSaving(false);
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Remitos de Salida" subtitle="Egreso de mercadería con FIFO desde picking">
                <HelpTooltip title="Egresos FIFO" content="Al confirmar, el sistema descuenta stock automáticamente de las posiciones PICKING, seleccionando primero las partidas más antiguas cargadas." style={{ marginRight: '12px' }} />
                <Btn onClick={() => { setStep('form'); setError(''); }}>+ Nuevo Remito</Btn>
            </PageHeader>

            <Card>
                <Table
                    loading={isLoading}
                    onRowClick={(i) => handleRowClick(remitos[i])}
                    cols={['Número', 'Fecha', 'Cliente', 'Líneas', '']}
                    rows={remitos.map((r: any) => [
                        <span key="num" style={{ color: '#a5b4fc', fontWeight: 600 }}>{r.numero}</span>,
                        new Date(r.fecha).toLocaleDateString('es-AR'),
                        (r.partner?.name || r.client?.name) ?? '—',
                        <Badge key="badge">{r.lines?.length ?? 0} ítems</Badge>,
                        <Btn key="del" small variant="danger" onClick={(e: any) => { e.stopPropagation(); if (window.confirm('¿Anular este remito de salida?')) deleteRemito(r.id); }}>🗑</Btn>,
                    ])}
                />
            </Card>

            {step === 'form' && (
                <Modal title="Nuevo Remito de Salida" onClose={() => setStep(null)} wide>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <Input label="Número (opcional)" placeholder="Auto-generar si vacío" value={numero} onChange={setNumero} />
                        <Input label="Fecha" type="date" value={fecha} onChange={setFecha} />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ color: '#9ca3af', fontSize: '12px' }}>Cliente</label>
                        <SearchSelect
                            value={clientId}
                            onChange={v => {
                                if (v === '__new__') {
                                    if (!isAdmin) { alert('Solo administradores pueden crear clientes'); return; }
                                    setPartnerModalOpen(true);
                                } else {
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
                            <Btn small onClick={() => setLines(p => [...p, { itemId: '', lotId: '', posicionId: '', qtyPrincipal: '', qtySecundaria: '' }])}>+ Línea</Btn>
                        </div>
                        {lines.map((l: any, i: number) => {
                            const availableLots = l.itemId
                                ? Array.from(
                                    stock
                                        .filter((s: any) => s.itemId === l.itemId && Number(s.qtyPrincipal) > 0)
                                        .reduce((map: Map<string, string>, s: any) => {
                                            map.set(s.lotId, s.batch?.lotNumber || s.lotId);
                                            return map;
                                        }, new Map())
                                        .entries()
                                  ).map(([value, label]) => ({ value, label }))
                                : [];

                            const availablePositions = l.itemId
                                ? Array.from(
                                    stock
                                        .filter((s: any) => s.itemId === l.itemId && (!l.lotId || s.lotId === l.lotId) && Number(s.qtyPrincipal) > 0)
                                        .reduce((map: Map<string, string>, s: any) => {
                                            if (s.posicion) {
                                                map.set(s.posicionId, `${s.posicion.codigo} (Disp: ${Number(s.qtyPrincipal).toFixed(1)})`);
                                            }
                                            return map;
                                        }, new Map())
                                        .entries()
                                  ).map(([value, label]) => ({ value, label }))
                                : [];

                            return (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.5fr 2fr 2fr 1.2fr 1.2fr auto', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
                                    <SearchSelect label="Material" value={l.itemId} onChange={v => setLines(p => p.map((x: any, j: number) => j === i ? { ...x, itemId: v, lotId: '', posicionId: '' } : x))}
                                        options={[{ value: '', label: 'Seleccionar...' }, ...items.map((it: any) => ({ value: it.id, label: `${it.codigoInterno} — ${it.descripcion}` }))]} placeholder="Buscar material..." />
                                    
                                    <SearchSelect label="Lote / Partida" value={l.lotId} onChange={v => setLines(p => p.map((x: any, j: number) => j === i ? { ...x, lotId: v, posicionId: '' } : x))}
                                        options={[{ value: '', label: 'Cualquiera (FIFO)' }, ...availableLots]} placeholder="Lote (Opcional)..." disabled={!l.itemId} />
                                    
                                    <SearchSelect label="Posición" value={l.posicionId} onChange={v => setLines(p => p.map((x: any, j: number) => j === i ? { ...x, posicionId: v } : x))}
                                        options={[{ value: '', label: 'Cualquiera (FIFO)' }, ...availablePositions]} placeholder="Posición (Opcional)..." disabled={!l.itemId} />

                                    <Input label="Cant. Princ." type="number" value={l.qtyPrincipal} onChange={v => setLines(p => p.map((x: any, j: number) => j === i ? { ...x, qtyPrincipal: v } : x))} />
                                    <Input label="Secundaria" type="number" value={l.qtySecundaria} onChange={v => setLines(p => p.map((x: any, j: number) => j === i ? { ...x, qtySecundaria: v } : x))} />
                                    <Btn small variant="danger" onClick={() => setLines(p => p.filter((_: any, j: number) => j !== i))} style={{ alignSelf: 'flex-end' }}>✕</Btn>
                                </div>
                            );
                        })}
                    </div>
                    {error && <p style={{ color: '#f87171' }}>{error}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Btn variant="secondary" onClick={() => setStep(null)}>Cancelar</Btn>
                        <Btn onClick={goPreview}>Ver Preview →</Btn>
                    </div>
                </Modal>
            )}

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
                            <span key="desc">{l.itemDescripcion}</span>,
                            <code key="lot" style={{ color: '#fbbf24', fontSize: '11px' }}>{l.lotNumber}</code>,
                            <Badge key="pos" color="#34d399">{l.posicionCodigo}</Badge>,
                            <strong key="qty" style={{ color: '#a5b4fc' }}>{Number(l.qtyPrincipalDescontada).toFixed(2)} kg</strong>,
                            <span key="rem" style={{ color: l.qtyPrincipalRestanteEnPosicion < 5 ? '#f87171' : '#34d399' }}>{Number(l.qtyPrincipalRestanteEnPosicion).toFixed(2)} kg</span>,
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
                onSuccess={(p: any) => {
                    setClientId(p.id);
                }}
            />
        </div>
    );
}
