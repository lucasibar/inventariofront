import { useState } from 'react';
import { useGetItemsQuery, useCreateItemMutation, useUpdateItemMutation, useDeleteItemMutation } from '../features/items/api/items.api';
import { PageHeader, Card, Btn, Input, Select, Modal, Table, Badge, SearchBar, Spinner } from './common/ui';
import { useGetPartnersQuery } from '../features/partners/api/partners.api';

const ROTACIONES = [
    { value: 'ALTA', label: '🔴 Alta' },
    { value: 'MEDIA', label: '🟡 Media' },
    { value: 'BAJA', label: '⚫ Baja' },
    { value: 'TEMPORAL', label: '⏳ Temporal' },
];
const ROT_COLORS: Record<string, string> = { ALTA: '#ef4444', MEDIA: '#f59e0b', BAJA: '#6b7280', TEMPORAL: '#a855f7' };

const TONOS = [
    { value: '', label: '— Sin tono —' },
    { value: 'AMARILLO', label: '🟡 Amarillo' },
    { value: 'NARANJA', label: '🟠 Naranja' },
    { value: 'AZUL', label: '🔵 Azul' },
    { value: 'ROJO', label: '🔴 Rojo' },
    { value: 'VERDE', label: '🟢 Verde' },
    { value: 'MARRÓN', label: '🟫 Marrón' },
    { value: 'GRIS', label: '🔘 Gris' },
    { value: 'VIOLETA', label: '🟣 Violeta' },
    { value: 'ROSA', label: '🌸 Rosa' },
    { value: 'CELESTE', label: '🩵 Celeste' },
    { value: 'BLANCO', label: '⬜ Blanco' },
    { value: 'NEGRO', label: '⬛ Negro' },
];

const emptyForm = () => ({ codigoInterno: '', descripcion: '', categoria: 'MATERIA PRIMA', rotacion: 'MEDIA', stockMinimo: '', unidadPrincipal: 'KG', unidadSecundaria: '', tono: '', supplierId: '' });

export default function MaterialesPage() {
    const [q, setQ] = useState('');
    const { data: items = [], isLoading } = useGetItemsQuery({ q: q || undefined });
    const { data: suppliers = [] } = useGetPartnersQuery({ type: 'SUPPLIER' });
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
        setForm({ codigoInterno: item.codigoInterno, descripcion: item.descripcion, categoria: item.categoria, rotacion: item.rotacion, stockMinimo: item.stockMinimo ?? '', unidadPrincipal: item.unidadPrincipal, unidadSecundaria: item.unidadSecundaria ?? '', tono: item.tono ?? '', supplierId: item.supplierId ?? '' });
        setEditTarget(item); setModal('edit');
    };

    const save = async () => {
        setSaving(true); setError('');
        const dto = { ...form, stockMinimo: form.stockMinimo ? Number(form.stockMinimo) : undefined, tono: form.tono || null };
        try {
            if (modal === 'edit') await updateItem({ id: editTarget.id, data: dto }).unwrap();
            else await createItem(dto).unwrap();
            setModal(null);
        } catch (e: any) { setError(e?.data?.message ?? 'Error'); }
        setSaving(false);
    };

    return (
        <div className="materiales-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <style>{`
                .materiales-container { font-family: 'Inter', sans-serif; }
                .mobile-card-grid { display: none; grid-template-columns: 1fr; gap: 16px; }
                .desktop-table { display: table; width: 100%; border-collapse: collapse; }
                
                @media (max-width: 900px) {
                    .desktop-table { display: none; }
                    .mobile-card-grid { display: grid; }
                    .header-top { flex-direction: column; align-items: stretch !important; gap: 16px !important; }
                    .materiales-container { padding: 16px !important; }
                }

                .material-card {
                    background: #1a1d2e;
                    border: 1px solid #2a2d3e;
                    border-radius: 12px;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    transition: transform 0.2s, border-color 0.2s;
                }
                .material-card:hover { border-color: #6366f1; transform: translateY(-2px); }
            `}</style>

            <div className="header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <PageHeader title="Materiales" subtitle="Catálogo y gestión de ítems" />
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <SearchBar value={q} onChange={setQ} />
                    <Btn onClick={openCreate} style={{ whiteSpace: 'nowrap' }}>+ Nuevo Ítem</Btn>
                </div>
            </div>

            {/* Desktop View */}
            <div className="desktop-table">
                <Card>
                <Table
                    loading={isLoading}
                    cols={['Material', 'Proveedor', 'Rotación', 'Min. Stock', 'Unid.', 'Tono', '']}
                    rows={items.map((it: any) => [
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#f3f4f6', fontWeight: 600 }}>{it.descripcion}</span>
                            <code style={{ color: '#a5b4fc', fontSize: '11px' }}>{it.codigoInterno}</code>
                        </div>,
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{it.supplier?.name || <span style={{ opacity: 0.5 }}>S/P</span>}</div>,
                        <Badge color={ROT_COLORS[it.rotacion] ?? '#6b7280'}>{it.rotacion}</Badge>,
                        it.stockMinimo ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{it.stockMinimo}</span> : <span style={{ color: '#4b5563' }}>—</span>,
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {it.unidadPrincipal}
                            {it.unidadSecundaria && <span style={{ opacity: 0.6 }}> / {it.unidadSecundaria}</span>}
                        </div>,
                        it.tono ? <Badge color="#7c3aed">{it.tono}</Badge> : <span style={{ color: '#4b5563' }}>—</span>,
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Btn small variant="secondary" onClick={() => openEdit(it)}>✏️</Btn>
                            <Btn small variant="danger" onClick={() => { if (window.confirm('¿Eliminar material?')) deleteItem(it.id); }}>🗑</Btn>
                        </div>,
                    ])}
                />
                </Card>
            </div>

            {/* Mobile View */}
            <div className="mobile-card-grid">
                {isLoading ? <Spinner /> : items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#4b5563' }}>No se encontraron materiales.</div>
                ) : items.map((it: any) => (
                    <div key={it.id} className="material-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: '#f3f4f6', fontWeight: 600, fontSize: '15px' }}>{it.descripcion}</span>
                                <code style={{ color: '#a5b4fc', fontSize: '12px' }}>{it.codigoInterno}</code>
                            </div>
                            <Badge color={ROT_COLORS[it.rotacion] ?? '#6b7280'}>{it.rotacion}</Badge>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <Badge color="#34d399">{it.supplier?.name || 'Sin Proveedor'}</Badge>
                            <Badge>{it.categoria}</Badge>
                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>{it.unidadPrincipal} {it.unidadSecundaria ? ` / ${it.unidadSecundaria}` : ''}</span>
                        </div>
                        <div style={{ borderTop: '1px solid #1e2133', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '12px' }}>
                                <span style={{ color: '#6b7280' }}>Mín. Stock: </span>
                                {it.stockMinimo ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{it.stockMinimo}</span> : '—'}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Btn small variant="secondary" onClick={() => openEdit(it)}>✏️ Editar</Btn>
                                <Btn small variant="danger" onClick={() => { if (window.confirm('¿Eliminar?')) deleteItem(it.id); }}>🗑</Btn>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {modal && (
                <Modal title={modal === 'edit' ? 'Editar Material' : 'Nuevo Material'} onClose={() => setModal(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <Input label="Código interno" value={form.codigoInterno} onChange={v => setForm(p => ({ ...p, codigoInterno: v }))} placeholder="Ej: MAT-001" />
                            <Input label="Descripción" value={form.descripcion} onChange={v => setForm(p => ({ ...p, descripcion: v }))} placeholder="Ej: Adhesivo Vinílico" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <Select label="Rotación" value={form.rotacion} onChange={v => setForm(p => ({ ...p, rotacion: v }))} options={ROTACIONES} />
                            <Input label="Stock Mínimo" type="number" value={String(form.stockMinimo)} onChange={v => setForm(p => ({ ...p, stockMinimo: v }))} placeholder="0" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <Input label="Unid. Principal" value={form.unidadPrincipal} onChange={v => setForm(p => ({ ...p, unidadPrincipal: v }))} placeholder="KG" />
                            <Input label="Unid. Secundaria" value={form.unidadSecundaria} onChange={v => setForm(p => ({ ...p, unidadSecundaria: v }))} placeholder="Opcional: Unidades" />
                        </div>
                        <Select label="Tono (opcional)" value={form.tono} onChange={v => setForm(p => ({ ...p, tono: v }))} options={TONOS} />
                        <Select 
                            label="Proveedor (opcional)" 
                            value={form.supplierId} 
                            onChange={v => setForm(p => ({ ...p, supplierId: v }))} 
                            options={[
                                { value: '', label: '— Sin proveedor —' },
                                ...suppliers.map((s: any) => ({ value: s.id, label: s.name }))
                            ]} 
                        />
                        {error && <p style={{ color: '#f87171', fontSize: '13px', margin: 0 }}>⚠️ {error}</p>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #2a2d3e', paddingTop: '16px' }}>
                            <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
                            <Btn onClick={save} disabled={saving}>{saving ? '...' : 'Guardar Material'}</Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );

}
