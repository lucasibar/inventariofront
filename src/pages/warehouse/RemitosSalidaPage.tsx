import { useState, useMemo } from 'react';
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
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { PageHeader, Card, Btn, Input, SearchSelect, Modal, Table, Badge, HelpTooltip, SearchBar } from '../../shared/ui';

export default function RemitosSalidaPage() {
    const { data: remitos = [], isLoading } = useGetRemitosSalidaQuery();
    const { data: depots = [] } = useGetDepotsQuery();
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

    const [search, setSearch] = useState('');
    const [selectedDepotId, setSelectedDepotId] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    const filteredRemitos = useMemo(() => {
        let list = remitos;
        if (selectedDepotId) {
            list = list.filter((r: any) => r.depositoId === selectedDepotId || r.deposito?.id === selectedDepotId);
        }
        if (fechaDesde) {
            list = list.filter((r: any) => new Date(r.fecha || r.date).getTime() >= new Date(fechaDesde + 'T00:00:00').getTime());
        }
        if (fechaHasta) {
            list = list.filter((r: any) => new Date(r.fecha || r.date).getTime() <= new Date(fechaHasta + 'T23:59:59').getTime());
        }

        const query = search.toLowerCase().trim();
        if (!query) return list;
        const tokens = query.split(/\s+/).filter(Boolean);

        return list.filter((r: any) => {
            const linesContent = (r.lines || []).map((l: any) => {
                const itemCode = l.codigoInterno || l.item?.codigoInterno || '';
                const itemDesc = l.descripcion || l.item?.descripcion || '';
                const itemCat = l.categoria || l.item?.categoria || l.item?.category?.nombre || '';
                const lotNum = l.lotNumber || l.batch?.lote || l.batch?.lotNumber || '';
                const itemSupplier = l.item?.supplier?.name || l.item?.supplierName || l.supplierName || '';
                return `${itemCode} ${itemDesc} ${itemCat} ${lotNum} ${itemSupplier}`;
            }).join(' ');

            const searchableContent = [
                r.numero || '',
                r.documentId || '',
                r.id || '',
                r.partner?.name || r.client?.name || r.partnerName || '',
                r.observaciones || '',
                linesContent
            ].join(' ').toLowerCase();

            return tokens.every(token => searchableContent.includes(token));
        });
    }, [remitos, search, selectedDepotId, fechaDesde, fechaHasta]);

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

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Buscar por n° remito, cliente, código, descripción o partida..."
                    />
                </div>
                <div style={{ width: '220px' }}>
                    <select
                        value={selectedDepotId}
                        onChange={e => setSelectedDepotId(e.target.value)}
                        style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 12px',
                            background: 'var(--bg-secondary, #111827)',
                            border: '1px solid var(--border-strong, #374151)',
                            borderRadius: '8px',
                            color: 'var(--text-primary, #f3f4f6)',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="">Todos los depósitos</option>
                        {depots.filter(d => d.activo !== false).map(d => (
                            <option key={d.id} value={d.id}>{d.nombre}</option>
                        ))}
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                        type="date"
                        value={fechaDesde}
                        onChange={e => setFechaDesde(e.target.value)}
                        style={{
                            height: '42px',
                            padding: '0 8px',
                            background: 'var(--bg-secondary, #111827)',
                            border: '1px solid var(--border-strong, #374151)',
                            borderRadius: '8px',
                            color: 'var(--text-primary, #f3f4f6)',
                            fontSize: '13px',
                            outline: 'none'
                        }}
                    />
                    <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '13px' }}>al</span>
                    <input
                        type="date"
                        value={fechaHasta}
                        onChange={e => setFechaHasta(e.target.value)}
                        style={{
                            height: '42px',
                            padding: '0 8px',
                            background: 'var(--bg-secondary, #111827)',
                            border: '1px solid var(--border-strong, #374151)',
                            borderRadius: '8px',
                            color: 'var(--text-primary, #f3f4f6)',
                            fontSize: '13px',
                            outline: 'none'
                        }}
                    />
                    {(fechaDesde || fechaHasta) && (
                        <button
                            onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#fb7185',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                padding: '0 4px'
                            }}
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {filteredRemitos.length === 0 && search.trim() ? (
                <Card style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: 'var(--text-muted, #9ca3af)' }}>No se encontraron remitos de salida que coincidan con "{search}".</p>
                </Card>
            ) : (
                <Card>
                    <Table
                        loading={isLoading}
                        onRowClick={(i) => handleRowClick(filteredRemitos[i])}
                        cols={['Número', 'Fecha', 'Cliente', 'Estado', 'Items', 'Cantidades', '']}
                        rows={filteredRemitos.map((r: any) => {
                            const lines = r.lines || [];
                            const totalPrincipal = lines.reduce((sum: number, l: any) => sum + Number(l.qtyPrincipal || 0), 0);
                            const totalSecundario = lines.reduce((sum: number, l: any) => sum + Number(l.qtySecundaria || 0), 0);
                            const isAnulado = r.status === 'ANULADO';
                            return [
                                <span key="num" style={{ color: isAnulado ? '#f87171' : '#a5b4fc', fontWeight: 600, textDecoration: isAnulado ? 'line-through' : 'none' }}>{r.numero}</span>,
                                new Date(r.fecha).toLocaleDateString('es-AR'),
                                (r.partner?.name || r.client?.name) ?? '—',
                                <Badge key="status" color={isAnulado ? '#ef4444' : '#10b981'}>{isAnulado ? 'ANULADO' : 'ACTIVO'}</Badge>,
                                <Badge key="badge">{lines.length} ítems</Badge>,
                                <div key="qty" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontWeight: 600, color: '#38bdf8', fontSize: '13px' }}>{totalPrincipal.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg</span>
                                    {totalSecundario > 0 && <span style={{ color: '#a78bfa', fontSize: '11px', fontWeight: 500 }}>{totalSecundario.toLocaleString('es-AR', { minimumFractionDigits: 0 })} un</span>}
                                </div>,
                                <div key="actions" style={{ textAlign: 'right' }}>
                                    {!isAnulado && (
                                        <Btn small variant="danger" onClick={(e: any) => { e.stopPropagation(); if (window.confirm('¿Anular este remito de salida?')) deleteRemito(r.id); }}>🗑</Btn>
                                    )}
                                </div>
                            ];
                        })}
                    />
                </Card>
            )}

            {step === 'form' && (
                <Modal title="Nuevo Remito de Salida" onClose={() => setStep(null)} wide>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <Input label="Número (opcional)" placeholder="Auto-generar si vacío" value={numero} onChange={setNumero} />
                        <Input label="Fecha" type="date" value={fecha} onChange={setFecha} />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px' }}>Cliente</label>
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
                            <label style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px' }}>Materiales a despachar</label>
                            <Btn small onClick={() => setLines(p => [...p, { itemId: '', lotId: '', posicionId: '', qtyPrincipal: '', qtySecundaria: '' }])}>+ Línea</Btn>
                        </div>
                        {lines.map((l: any, i: number) => {
                            const availableLots = l.itemId
                                ? (Array.from(
                                    stock
                                        .filter((s: any) => s.itemId === l.itemId && Number(s.qtyPrincipal) > 0)
                                        .reduce((map: Map<string, string>, s: any) => {
                                            map.set(s.lotId, s.batch?.lotNumber || s.lotId);
                                            return map;
                                        }, new Map<string, string>())
                                        .entries()
                                  ) as [string, string][]).map(([value, label]) => ({ value, label }))
                                : [];

                            const availablePositions = l.itemId
                                ? (Array.from(
                                    stock
                                        .filter((s: any) => s.itemId === l.itemId && (!l.lotId || s.lotId === l.lotId) && Number(s.qtyPrincipal) > 0)
                                        .reduce((map: Map<string, string>, s: any) => {
                                            if (s.posicion) {
                                                map.set(s.posicionId, `${s.posicion.codigo} (Disp: ${Number(s.qtyPrincipal).toFixed(1)})`);
                                            }
                                            return map;
                                        }, new Map<string, string>())
                                        .entries()
                                  ) as [string, string][]).map(([value, label]) => ({ value, label }))
                                : [];

                            const selItem = items.find((it: any) => it.id === l.itemId);
                            const unitP = selItem?.unidadPrincipal ? ` (${selItem.unidadPrincipal})` : '';
                            const unitS = selItem?.unidadSecundaria ? ` (${selItem.unidadSecundaria})` : '';

                            return (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.5fr 2fr 2fr 1.2fr 1.2fr auto', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
                                    <SearchSelect label="Material" value={l.itemId} onChange={v => setLines(p => p.map((x: any, j: number) => j === i ? { ...x, itemId: v, lotId: '', posicionId: '' } : x))}
                                        options={[{ value: '', label: 'Seleccionar...' }, ...items.map((it: any) => ({ value: it.id, label: `${it.codigoInterno} — ${it.descripcion}` }))]} placeholder="Buscar material..." />
                                    
                                    <SearchSelect label="Lote / Partida" value={l.lotId} onChange={v => setLines(p => p.map((x: any, j: number) => j === i ? { ...x, lotId: v, posicionId: '' } : x))}
                                        options={[{ value: '', label: 'Cualquiera (FIFO)' }, ...availableLots]} placeholder="Lote (Opcional)..." disabled={!l.itemId} />
                                    
                                    <SearchSelect label="Posición" value={l.posicionId} onChange={v => setLines(p => p.map((x: any, j: number) => j === i ? { ...x, posicionId: v } : x))}
                                        options={[{ value: '', label: 'Cualquiera (FIFO)' }, ...availablePositions]} placeholder="Posición (Opcional)..." disabled={!l.itemId} />

                                    <Input label={`Cant. Princ.${unitP}`} type="number" value={l.qtyPrincipal} disabled={!l.itemId} placeholder={!l.itemId ? 'Seleccionar item' : ''} onChange={v => setLines(p => p.map((x: any, j: number) => j === i ? { ...x, qtyPrincipal: v } : x))} />
                                    <Input label={`Secundaria${unitS}`} type="number" value={l.qtySecundaria} disabled={!l.itemId} placeholder={!l.itemId ? 'Seleccionar item' : ''} onChange={v => setLines(p => p.map((x: any, j: number) => j === i ? { ...x, qtySecundaria: v } : x))} />
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
                    <p style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', marginBottom: '12px' }}>Se descontará el stock de las posiciones PICKING con lógica FIFO:</p>
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
