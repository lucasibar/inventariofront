import { useState, useMemo } from 'react';
import { useGetPurchaseOrdersQuery, useGenerateRemitoFromPOMutation } from '../../../purchasing/purchase-orders/api/purchase-orders.api';
import { useCreateRemitoEntradaMutation } from '../api/remitos-entrada.api';
import { useGetDepotsQuery } from '../../deposito/api/deposito.api';
import { useGetPartnersQuery } from '../../../config/partners/api/partners.api';
import { useGetItemsQuery } from '../../materiales/api/items.api';
import { Modal, Btn, Input, SearchSelect, Select, Badge } from '../../../../shared/ui';

interface Line {
    lineId?: string;
    itemId: string;
    itemDesc: string;
    itemCode: string;
    lotNumber: string;
    qtyPrincipal: string;
    qtySecundaria: string;
    observaciones: string;
    pendingOC?: number;
}

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

export function NuevoRemitoEntradaModal({ onClose, onSuccess }: Props) {
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => rawDepots.filter((d: any) => d.activo !== false), [rawDepots]);
    const { data: suppliers = [] } = useGetPartnersQuery({ type: 'SUPPLIER' });
    const { data: items = [] } = useGetItemsQuery({});

    // ── Datos del remito ──
    const [depositoId, setDepositoId] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [nroExterno, setNroExterno] = useState('');
    const [observaciones, setObservaciones] = useState('');

    // ── Vinculación a OC ──
    const [mode, setMode] = useState<'libre' | 'oc'>('libre');
    const [selectedOCId, setSelectedOCId] = useState('');

    const { data: allOCs = [] } = useGetPurchaseOrdersQuery(undefined);
    const ocsActivas = useMemo(() =>
        (allOCs as any[]).filter(o => o.estado !== 'CANCELADO' && o.estado !== 'COMPLETADO'),
        [allOCs]
    );

    // ── Líneas ──
    const [lines, setLines] = useState<Line[]>([
        { itemId: '', itemDesc: '', itemCode: '', lotNumber: '', qtyPrincipal: '', qtySecundaria: '', observaciones: '' }
    ]);

    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const [createRemitoEntrada] = useCreateRemitoEntradaMutation();
    const [generateRemitoFromPO] = useGenerateRemitoFromPOMutation();

    // ── Cuando se selecciona una OC, pre-llenar las líneas ──
    const selectedOC = useMemo(() =>
        ocsActivas.find((o: any) => o.id === selectedOCId),
        [ocsActivas, selectedOCId]
    );

    const handleSelectOC = (ocId: string) => {
        setSelectedOCId(ocId);
        if (!ocId) {
            setLines([{ itemId: '', itemDesc: '', itemCode: '', lotNumber: '', qtyPrincipal: '', qtySecundaria: '', observaciones: '' }]);
            return;
        }
        const oc = ocsActivas.find((o: any) => o.id === ocId);
        if (!oc) return;

        // Pre-completar depósito y proveedor si no están seteados
        if (!depositoId && oc.depositoId) setDepositoId(oc.depositoId);
        if (!supplierId && oc.supplierId) setSupplierId(oc.supplierId);

        // Pre-completar líneas con pendiente de la OC
        const preFilled: Line[] = (oc.lines || []).map((l: any) => {
            const pending = Math.max(0, Number(l.qtyPedido) - Number(l.qtyRecibida || 0));
            return {
                lineId: l.id,
                itemId: l.itemId,
                itemDesc: l.item?.descripcion || '',
                itemCode: l.item?.codigoInterno || '',
                lotNumber: `LOTE-${oc.numero?.replace(/^OC-/, '') || ''}`,
                qtyPrincipal: pending > 0 ? String(pending) : '',
                qtySecundaria: '',
                observaciones: '',
                pendingOC: pending,
            };
        });
        setLines(preFilled.length ? preFilled : [
            { itemId: '', itemDesc: '', itemCode: '', lotNumber: '', qtyPrincipal: '', qtySecundaria: '', observaciones: '' }
        ]);
    };

    const addLine = () => {
        setLines(prev => [...prev, { itemId: '', itemDesc: '', itemCode: '', lotNumber: '', qtyPrincipal: '', qtySecundaria: '', observaciones: '' }]);
    };

    const removeLine = (i: number) => {
        setLines(prev => prev.filter((_, j) => j !== i));
    };

    const updateLine = (i: number, field: keyof Line, value: string) => {
        setLines(prev => prev.map((l, j) => {
            if (j !== i) return l;
            if (field === 'itemId') {
                const item = (items as any[]).find(it => it.id === value);
                return { ...l, itemId: value, itemDesc: item?.descripcion || '', itemCode: item?.codigoInterno || '' };
            }
            return { ...l, [field]: value };
        }));
    };

    const handleSave = async () => {
        setError('');
        if (!depositoId) { setError('Seleccioná un depósito de destino'); return; }

        const validLines = lines.filter(l => l.itemId && Number(l.qtyPrincipal) > 0);
        if (validLines.length === 0) { setError('Ingresá al menos una línea con material y cantidad'); return; }

        setSaving(true);
        try {
            if (mode === 'oc' && selectedOCId) {
                // Generar remito vinculado a la OC
                await generateRemitoFromPO({
                    id: selectedOCId,
                    body: {
                        depositoId,
                        fecha,
                        observaciones: observaciones || nroExterno,
                        lines: validLines.map(l => ({
                            lineId: l.lineId,
                            lotNumber: l.lotNumber || `REM-${Date.now()}`,
                            qtyPrincipal: Number(l.qtyPrincipal),
                            qtySecundaria: l.qtySecundaria ? Number(l.qtySecundaria) : undefined,
                        })),
                    }
                }).unwrap();
            } else {
                // Remito libre sin OC
                const partner = (suppliers as any[]).find(s => s.id === supplierId);
                await createRemitoEntrada({
                    depositoId,
                    depotId: depositoId,
                    supplierId: supplierId || undefined,
                    supplierName: partner?.name || undefined,
                    fecha,
                    numero: nroExterno?.trim() || undefined,
                    documentoNumero: nroExterno?.trim() || undefined,
                    observaciones: observaciones || undefined,
                    lines: validLines.map(l => ({
                        itemId: l.itemId,
                        lotNumber: l.lotNumber || `REM-${Date.now()}`,
                        qtyPrincipal: Number(l.qtyPrincipal),
                        qtySecundaria: l.qtySecundaria ? Number(l.qtySecundaria) : undefined,
                        observaciones: l.observaciones || undefined,
                    })),
                }).unwrap();
            }
            onSuccess();
        } catch (e: any) {
            setError(e?.data?.message || 'Error al guardar el remito');
        }
        setSaving(false);
    };

    return (
        <Modal title="📥 Nuevo Remito de Entrada" onClose={onClose} wide>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* ── Modo ── */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => { setMode('libre'); setSelectedOCId(''); setLines([{ itemId: '', itemDesc: '', itemCode: '', lotNumber: '', qtyPrincipal: '', qtySecundaria: '', observaciones: '' }]); }}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '8px', border: '2px solid',
                            borderColor: mode === 'libre' ? '#6366f1' : 'var(--border-color, #2a2d3e)',
                            background: mode === 'libre' ? 'rgba(99,102,241,0.1)' : 'transparent',
                            color: mode === 'libre' ? '#818cf8' : 'var(--text-muted, #9ca3af)',
                            cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                        }}
                    >
                        📋 Remito Libre<br />
                        <span style={{ fontSize: '11px', fontWeight: 400 }}>Sin vinculación a OC</span>
                    </button>
                    <button
                        onClick={() => setMode('oc')}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '8px', border: '2px solid',
                            borderColor: mode === 'oc' ? '#10b981' : 'var(--border-color, #2a2d3e)',
                            background: mode === 'oc' ? 'rgba(16,185,129,0.1)' : 'transparent',
                            color: mode === 'oc' ? '#10b981' : 'var(--text-muted, #9ca3af)',
                            cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                        }}
                    >
                        🔗 Vinculado a OC<br />
                        <span style={{ fontSize: '11px', fontWeight: 400 }}>Pre-completa desde Orden de Compra</span>
                    </button>
                </div>

                {/* ── Búsqueda de OC ── */}
                {mode === 'oc' && (
                    <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '14px' }}>
                        <label style={{ color: '#10b981', fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                            Buscar Orden de Compra
                        </label>
                        <SearchSelect
                            value={selectedOCId}
                            onChange={handleSelectOC}
                            options={[
                                { value: '', label: 'Seleccionar OC...' },
                                ...ocsActivas.map((o: any) => ({
                                    value: o.id,
                                    label: `${o.numero} — ${o.supplier?.name || 'Sin proveedor'} — ${new Date(o.fechaEmision).toLocaleDateString('es-AR')}`
                                }))
                            ]}
                            placeholder="Buscar por número o proveedor..."
                        />
                        {selectedOC && (
                            <div style={{ marginTop: '10px', display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                                <span>📦 {selectedOC.lines?.length} ítems</span>
                                <span>🏭 {depots.find((d: any) => d.id === selectedOC.depositoId)?.nombre || '—'}</span>
                                {selectedOC.fechaEntregaEsperada && (
                                    <span>📅 Entrega est.: {new Date(selectedOC.fechaEntregaEsperada).toLocaleDateString('es-AR')}</span>
                                )}
                                <Badge color="#f59e0b">{selectedOC.estado}</Badge>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Datos del remito ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                        <label style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px' }}>Depósito Destino *</label>
                        <div style={{ marginTop: '4px' }}>
                            <Select
                                value={depositoId}
                                onChange={setDepositoId}
                                options={[{ value: '', label: 'Seleccionar...' }, ...depots.map((d: any) => ({ value: d.id, label: d.nombre + (d.planta ? ` (${d.planta})` : '') }))]}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px' }}>Proveedor</label>
                        <div style={{ marginTop: '4px' }}>
                            <SearchSelect
                                value={supplierId}
                                onChange={setSupplierId}
                                options={[{ value: '', label: 'Sin especificar' }, ...(suppliers as any[]).map(s => ({ value: s.id, label: s.name }))]}
                                placeholder="Buscar proveedor..."
                            />
                        </div>
                    </div>
                    <Input label="Fecha de Recepción *" type="date" value={fecha} onChange={setFecha} />
                    <Input label="N° Remito Externo" placeholder="Ej: R-0001" value={nroExterno} onChange={setNroExterno} />
                </div>

                <Input label="Observaciones del Remito" placeholder="Ej: Factura A-1234, parcialidad, etc." value={observaciones} onChange={setObservaciones} />

                {/* ── Líneas ── */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <label style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                            Líneas del Remito
                        </label>
                        <Btn small onClick={addLine}>+ Agregar línea</Btn>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                        {lines.map((l, i) => (
                            <div key={i} style={{
                                display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 1fr 1fr 1.5fr auto',
                                gap: '8px', alignItems: 'flex-end',
                                background: 'var(--bg-secondary, #111827)', padding: '10px 12px',
                                borderRadius: '8px', border: '1px solid var(--border-color, #2a2d3e)',
                            }}>
                                {/* Material */}
                                <div>
                                    {l.itemDesc ? (
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{l.itemDesc}</div>
                                            <code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.itemCode}</code>
                                            {l.pendingOC !== undefined && (
                                                <div style={{ fontSize: '11px', color: '#f59e0b' }}>Pendiente OC: {l.pendingOC.toFixed(1)} kg</div>
                                            )}
                                        </div>
                                    ) : (
                                        <SearchSelect
                                            value={l.itemId}
                                            onChange={v => updateLine(i, 'itemId', v)}
                                            options={[
                                                { value: '', label: 'Seleccionar material...' },
                                                ...(items as any[]).map(it => ({ value: it.id, label: `${it.codigoInterno} — ${it.descripcion}` }))
                                            ]}
                                            placeholder="Buscar material..."
                                        />
                                    )}
                                </div>
                                <Input
                                    label="Partida / Lote"
                                    value={l.lotNumber}
                                    onChange={v => updateLine(i, 'lotNumber', v)}
                                    placeholder="Ej: LOTE-001"
                                />
                                <Input
                                    label="Kg Recibidos *"
                                    type="number"
                                    value={l.qtyPrincipal}
                                    onChange={v => updateLine(i, 'qtyPrincipal', v)}
                                />
                                <Input
                                    label="Unidades (Opcional)"
                                    type="number"
                                    value={l.qtySecundaria}
                                    onChange={v => updateLine(i, 'qtySecundaria', v)}
                                />
                                <Input
                                    label="Observaciones"
                                    value={l.observaciones}
                                    onChange={v => updateLine(i, 'observaciones', v)}
                                    placeholder="Notas de esta línea..."
                                />
                                <Btn small variant="danger" onClick={() => removeLine(i)} style={{ alignSelf: 'flex-end' }}>✕</Btn>
                            </div>
                        ))}
                    </div>
                </div>

                {error && (
                    <p style={{ color: '#f87171', fontSize: '13px', margin: 0 }}>⚠️ {error}</p>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Btn>
                    <Btn onClick={handleSave} disabled={saving || !depositoId}>
                        {saving ? 'Guardando...' : '✓ Confirmar Ingreso'}
                    </Btn>
                </div>
            </div>
        </Modal>
    );
}
