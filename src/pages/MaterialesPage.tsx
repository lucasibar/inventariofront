import { useState } from 'react';
import { useGetItemsQuery, useCreateItemMutation, useUpdateItemMutation, useDeleteItemMutation } from '../features/items/api/items.api';
import { PageHeader, Card, Btn, Input, Select, Modal, Table, Badge, SearchBar } from './common/ui';

const CATEGORIAS = ['MATERIA PRIMA', 'INSUMO', 'PRODUCTO TERMINADO', 'REPUESTO', 'GENERAL'];
const ROTACIONES = [{ value: 'ALTA', label: '🔴 Alta' }, { value: 'MEDIA', label: '🟡 Media' }, { value: 'BAJA', label: '⚫ Baja' }];
const ROT_COLORS: Record<string, string> = { ALTA: '#ef4444', MEDIA: '#f59e0b', BAJA: '#6b7280' };

const emptyForm = () => ({ codigoInterno: '', descripcion: '', categoria: 'GENERAL', rotacion: 'MEDIA', alertaKilos: '', unidadPrincipal: 'KG', unidadSecundaria: '', trackLot: false });

export default function MaterialesPage() {
    const [q, setQ] = useState('');
    const { data: items = [], isLoading } = useGetItemsQuery({ q: q || undefined });
    const [createItem] = useCreateItemMutation();
    const [updateItem] = useUpdateItemMutation();
    const [deleteItem] = useDeleteItemMutation();

    const [modal, setModal] = useState<'create' | 'edit' | null>(null);
    const [editTarget, setEditTarget] = useState<any>(null);
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const openCreate = () => { setForm(emptyForm()); setEditTarget(null); setModal('create'); };
    const openEdit = (item: any) => {
        setForm({ codigoInterno: item.codigoInterno, descripcion: item.descripcion, categoria: item.categoria, rotacion: item.rotacion, alertaKilos: item.alertaKilos ?? '', unidadPrincipal: item.unidadPrincipal, unidadSecundaria: item.unidadSecundaria ?? '', trackLot: item.trackLot });
        setEditTarget(item); setModal('edit');
    };

    const save = async () => {
        setSaving(true); setError('');
        const dto = { ...form, alertaKilos: form.alertaKilos ? Number(form.alertaKilos) : undefined };
        try {
            if (modal === 'edit') await updateItem({ id: editTarget.id, data: dto }).unwrap();
            else await createItem(dto).unwrap();
            setModal(null);
        } catch (e: any) { setError(e?.data?.message ?? 'Error'); }
        setSaving(false);
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Materiales" subtitle="Catálogo de ítems">
                <SearchBar value={q} onChange={setQ} />
                <Btn onClick={openCreate}>+ Material</Btn>
            </PageHeader>

            <Card>
                <Table
                    loading={isLoading}
                    cols={['Código', 'Descripción', 'Categoría', 'Rotación', 'Alerta kg', 'Unidad', 'Lote', '']}
                    rows={items.map((it: any) => [
                        <code style={{ color: '#a5b4fc', fontSize: '11px' }}>{it.codigoInterno}</code>,
                        it.descripcion,
                        <Badge>{it.categoria}</Badge>,
                        <Badge color={ROT_COLORS[it.rotacion] ?? '#6b7280'}>{it.rotacion}</Badge>,
                        it.alertaKilos ? `${it.alertaKilos} kg` : '—',
                        it.unidadPrincipal,
                        it.trackLot ? <Badge color="#34d399">Sí</Badge> : <Badge color="#6b7280">No</Badge>,
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <Btn small variant="secondary" onClick={() => openEdit(it)}>✏️</Btn>
                            <Btn small variant="danger" onClick={() => deleteItem(it.id)}>🗑</Btn>
                        </div>,
                    ])}
                />
            </Card>

            {modal && (
                <Modal title={modal === 'edit' ? 'Editar Material' : 'Nuevo Material'} onClose={() => setModal(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <Input label="Código interno" value={form.codigoInterno} onChange={v => setForm(p => ({ ...p, codigoInterno: v }))} />
                            <Select label="Categoría" value={form.categoria} onChange={v => setForm(p => ({ ...p, categoria: v }))} options={CATEGORIAS.map(c => ({ value: c, label: c }))} />
                        </div>
                        <Input label="Descripción" value={form.descripcion} onChange={v => setForm(p => ({ ...p, descripcion: v }))} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <Select label="Rotación" value={form.rotacion} onChange={v => setForm(p => ({ ...p, rotacion: v }))} options={ROTACIONES} />
                            <Input label="Alerta en kilos" type="number" value={String(form.alertaKilos)} onChange={v => setForm(p => ({ ...p, alertaKilos: v }))} placeholder="Ej: 100" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <Input label="Unidad principal" value={form.unidadPrincipal} onChange={v => setForm(p => ({ ...p, unidadPrincipal: v }))} placeholder="KG" />
                            <Input label="Unidad secundaria" value={form.unidadSecundaria} onChange={v => setForm(p => ({ ...p, unidadSecundaria: v }))} placeholder="Unidades, bolsas..." />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.trackLot} onChange={e => setForm(p => ({ ...p, trackLot: e.target.checked }))} />
                            Seguimiento por lote / partida
                        </label>
                        {error && <p style={{ color: '#f87171' }}>{error}</p>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
                            <Btn onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
