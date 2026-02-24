import { useState } from 'react';
import { useGetPartnersQuery, useCreatePartnerMutation, useUpdatePartnerMutation, useDeletePartnerMutation } from '../features/partners/api/partners.api';
import { PageHeader, Card, Btn, Input, Select, Modal, Table, Badge, SearchBar } from './common/ui';

const TYPES = [
    { value: 'SUPPLIER', label: '📦 Proveedor' },
    { value: 'CLIENT', label: '🤝 Cliente' },
    { value: 'BOTH', label: '🔄 Ambos' },
];
const TYPE_COLORS: Record<string, string> = { SUPPLIER: '#a5b4fc', CLIENT: '#34d399', BOTH: '#fbbf24' };
const emptyForm = () => ({ name: '', type: 'BOTH', taxId: '', email: '', phone: '', address: '' });

export default function SociosPage() {
    const [q, setQ] = useState('');
    const [filterType, setFilterType] = useState('');
    const { data: partners = [], isLoading } = useGetPartnersQuery({ q: q || undefined, type: filterType || undefined });
    const [createPartner] = useCreatePartnerMutation();
    const [updatePartner] = useUpdatePartnerMutation();
    const [deletePartner] = useDeletePartnerMutation();

    const [modal, setModal] = useState<'create' | 'edit' | null>(null);
    const [editTarget, setEditTarget] = useState<any>(null);
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const openCreate = () => { setForm(emptyForm()); setEditTarget(null); setModal('create'); };
    const openEdit = (p: any) => { setForm({ name: p.name, type: p.type, taxId: p.taxId ?? '', email: p.email ?? '', phone: p.phone ?? '', address: p.address ?? '' }); setEditTarget(p); setModal('edit'); };

    const save = async () => {
        setSaving(true); setError('');
        try {
            if (modal === 'edit') await updatePartner({ id: editTarget.id, data: form }).unwrap();
            else await createPartner(form).unwrap();
            setModal(null);
        } catch (e: any) { setError(e?.data?.message ?? 'Error'); }
        setSaving(false);
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Proveedores y Clientes" subtitle="Gestión de socios comerciales">
                <Select value={filterType} onChange={setFilterType}
                    options={[{ value: '', label: 'Todos' }, ...TYPES]}
                    style={{ width: '160px' }} />
                <SearchBar value={q} onChange={setQ} />
                <Btn onClick={openCreate}>+ Socio</Btn>
            </PageHeader>

            <Card>
                <Table
                    loading={isLoading}
                    cols={['Nombre', 'Tipo', 'CUIT/CUIL', 'Email', 'Teléfono', '']}
                    rows={partners.map((p: any) => [
                        <span style={{ color: '#d1d5db', fontWeight: 600 }}>{p.name}</span>,
                        <Badge color={TYPE_COLORS[p.type]}>{TYPES.find(t => t.value === p.type)?.label ?? p.type}</Badge>,
                        p.taxId ?? '—',
                        p.email ?? '—',
                        p.phone ?? '—',
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <Btn small variant="secondary" onClick={() => openEdit(p)}>✏️</Btn>
                            <Btn small variant="danger" onClick={() => deletePartner(p.id)}>🗑</Btn>
                        </div>,
                    ])}
                />
            </Card>

            {modal && (
                <Modal title={modal === 'edit' ? 'Editar Socio' : 'Nuevo Socio'} onClose={() => setModal(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Input label="Nombre / Razón Social" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} />
                        <Select label="Tipo" value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))} options={TYPES} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <Input label="CUIT / CUIL" value={form.taxId} onChange={v => setForm(p => ({ ...p, taxId: v }))} />
                            <Input label="Email" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} />
                            <Input label="Teléfono" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} />
                            <Input label="Dirección" value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} />
                        </div>
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
