import { useState } from 'react';
import { useGetRemitosEntradaQuery, useCreateRemitoEntradaMutation, useDeleteRemitoEntradaMutation } from '../features/remitosEntrada/api/remitos-entrada.api';
import { useGetPartnersQuery, useCreatePartnerMutation } from '../features/partners/api/partners.api';
import { useGetItemsQuery, useCreateItemMutation } from '../features/items/api/items.api';
import { useGetDepotsQuery } from '../features/depots/api/depots.api';
import { PageHeader, Card, Btn, Input, Select, GroupedSelect, Modal, Table, Badge } from './common/ui';

interface LineForm { itemId: string; codigoInterno: string; descripcion: string; lotNumber: string; posicionId: string; kilos: string; unidades: string; }

const emptyLine = (): LineForm => ({ itemId: '', codigoInterno: '', descripcion: '', lotNumber: '', posicionId: '', kilos: '', unidades: '' });

export default function RemitosEntradaPage() {
    const { data: remitos = [], isLoading } = useGetRemitosEntradaQuery();
    const { data: suppliers = [] } = useGetPartnersQuery({ type: 'SUPPLIER' });
    const { data: items = [] } = useGetItemsQuery({});
    const { data: depots = [] } = useGetDepotsQuery();

    const [createRemito] = useCreateRemitoEntradaMutation();
    const [deleteRemito] = useDeleteRemitoEntradaMutation();
    const [createPartner] = useCreatePartnerMutation();
    const [createItem] = useCreateItemMutation();

    const [showForm, setShowForm] = useState(false);
    const [numero, setNumero] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [supplierId, setSupplierId] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [newSupplier, setNewSupplier] = useState(false);
    const [lines, setLines] = useState<LineForm[]>([emptyLine()]);
    const [preview, setPreview] = useState<any>(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const positionGroups = depots.map((d: any) => ({
        groupLabel: d.nombre + (d.planta ? ` · ${d.planta}` : ''),
        options: (d.positions ?? []).map((p: any) => ({ value: p.id, label: `${p.codigo} (${p.tipo})` })),
    })).filter((g: any) => g.options.length > 0);

    const updateLine = (i: number, field: keyof LineForm, val: string) => {
        setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
    };

    const save = async () => {
        setSaving(true); setError('');
        try {
            const dto: any = {
                numero: numero || `RE-${Date.now()}`,
                fecha,
                lines: lines.map(l => ({
                    itemId: l.itemId || undefined,
                    codigoInterno: l.codigoInterno || undefined,
                    descripcion: l.descripcion || undefined,
                    lotNumber: l.lotNumber || undefined,
                    posicionId: l.posicionId || undefined,
                    kilos: Number(l.kilos),
                    unidades: l.unidades ? Number(l.unidades) : undefined,
                })),
            };
            if (newSupplier) { dto.supplierName = supplierName; }
            else { dto.supplierId = supplierId; }
            await createRemito(dto).unwrap();
            setShowForm(false);
            setLines([emptyLine()]); setNumero(''); setSupplierId(''); setSupplierName('');
        } catch (e: any) { setError(e?.data?.message ?? 'Error al guardar'); }
        setSaving(false);
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Remitos de Entrada" subtitle="Ingreso de mercadería">
                <Btn onClick={() => setShowForm(true)}>+ Nuevo Remito</Btn>
            </PageHeader>

            <Card>
                <Table
                    loading={isLoading}
                    cols={['Número', 'Fecha', 'Proveedor', 'Líneas', '']}
                    rows={remitos.map((r: any) => [
                        <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{r.numero}</span>,
                        new Date(r.fecha).toLocaleDateString('es-AR'),
                        r.supplier?.name ?? '—',
                        <Badge>{r.lines?.length ?? 0} ítems</Badge>,
                        <Btn variant="danger" small onClick={() => deleteRemito(r.id)}>🗑</Btn>,
                    ])}
                />
            </Card>

            {showForm && (
                <Modal title="Nuevo Remito de Entrada" onClose={() => setShowForm(false)} wide>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <Input label="Número" value={numero} onChange={setNumero} placeholder="RE-001" />
                        <Input label="Fecha" type="date" value={fecha} onChange={setFecha} />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ color: '#9ca3af', fontSize: '12px' }}>Proveedor</label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            <Select value={newSupplier ? '__new__' : supplierId} onChange={v => { if (v === '__new__') setNewSupplier(true); else { setNewSupplier(false); setSupplierId(v); } }}
                                options={[
                                    { value: '', label: 'Seleccionar...' },
                                    { value: '__new__', label: '+ Nuevo proveedor' },
                                    ...suppliers.map((s: any) => ({ value: s.id, label: s.name })),
                                ]} />
                        </div>
                        {newSupplier && <Input style={{ marginTop: '8px' }} label="Nombre del proveedor" value={supplierName} onChange={setSupplierName} />}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ color: '#9ca3af', fontSize: '12px' }}>Líneas</label>
                            <Btn small onClick={() => setLines(p => [...p, emptyLine()])}>+ Línea</Btn>
                        </div>
                        {lines.map((line, i) => (
                            <div key={i} style={{ background: '#1a1d2e', borderRadius: '8px', padding: '12px', marginBottom: '8px', display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                                <Select label="Material" value={line.itemId} onChange={v => { updateLine(i, 'itemId', v); const it = items.find((x: any) => x.id === v); if (it) updateLine(i, 'descripcion', (it as any).descripcion); }}
                                    options={[{ value: '', label: 'Seleccionar o tipear...' }, ...items.map((it: any) => ({ value: it.id, label: `${it.codigoInterno} - ${it.descripcion}` }))]} />
                                <Input label="Cód interno / Alt" value={line.codigoInterno} onChange={v => updateLine(i, 'codigoInterno', v)} placeholder="Si no existe en lista" />
                                <Input label="Partida / Lote" value={line.lotNumber} onChange={v => updateLine(i, 'lotNumber', v)} />
                                <GroupedSelect label="Depósito › Posición" value={line.posicionId} onChange={v => updateLine(i, 'posicionId', v)}
                                    groups={positionGroups} />
                                <Input label="Kilos" type="number" value={line.kilos} onChange={v => updateLine(i, 'kilos', v)} />
                                <Input label="Unidades" type="number" value={line.unidades} onChange={v => updateLine(i, 'unidades', v)} />
                                <Btn variant="danger" small onClick={() => setLines(p => p.filter((_, j) => j !== i))} style={{ alignSelf: 'flex-end' }}>✕</Btn>
                            </div>
                        ))}
                    </div>

                    {error && <p style={{ color: '#f87171', marginBottom: '8px' }}>{error}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
                        <Btn onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Remito'}</Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}
