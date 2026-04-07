import React, { useState, useMemo } from 'react';
import { 
    useGetBoxTypesQuery, 
    useCreateBoxTypeMutation, 
    useUpdateBoxTypeMutation, 
    useDeleteBoxTypeMutation 
} from '../features/items/api/box-types.api';
import { useGetPartnersQuery } from '../features/partners/api/partners.api';
import { useBulkAssignBoxTypeMutation, useGetItemsQuery, useUpdateItemMutation } from '../features/items/api/items.api';
import { PageHeader, Card, Btn, Input, Spinner, Badge, Modal, Select } from './common/ui';

/* ─── Box Preview Component ─── */
const BoxPreview = ({ l, w, h }: { l: number, w: number, h: number }) => {
    const maxDim = Math.max(l, w, h, 1);
    const scale = 100 / maxDim; 
    const sL = Math.max(20, l * scale);
    const sW = Math.max(20, w * scale);
    const sH = Math.max(20, h * scale);

    return (
        <div style={{ 
            height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: '800px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, rgba(15, 17, 23, 0) 70%)',
            borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.1)', marginBottom: '24px', overflow: 'visible'
        }}>
            <div style={{
                width: `${sL}px`, height: `${sH}px`, position: 'relative', transformStyle: 'preserve-3d',
                transform: 'rotateX(-25deg) rotateY(45deg)', transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                <div style={{ position: 'absolute', inset: 0, background: '#6366f1', border: '1px solid #ffffff40', transform: `translateZ(${sW/2}px)`, boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)' }} />
                <div style={{ position: 'absolute', inset: 0, background: '#4338ca', border: '1px solid #ffffff20', transform: `translateZ(${-sW/2}px) rotateY(180deg)` }} />
                <div style={{ position: 'absolute', inset: 0, width: `${sW}px`, left: `calc(50% - ${sW/2}px)`, background: '#4f46e5', border: '1px solid #ffffff30', transform: `rotateY(90deg) translateZ(${sL/2}px)` }} />
                <div style={{ position: 'absolute', inset: 0, width: `${sW}px`, left: `calc(50% - ${sW/2}px)`, background: '#3730a3', border: '1px solid #ffffff20', transform: `rotateY(-90deg) translateZ(${sL/2}px)` }} />
                <div style={{ position: 'absolute', inset: 0, height: `${sW}px`, top: `calc(50% - ${sW/2}px)`, background: '#818cf8', border: '1px solid #ffffff50', transform: `rotateX(90deg) translateZ(${sH/2}px)` }} />
                <div style={{ position: 'absolute', inset: 0, height: `${sW}px`, top: `calc(50% - ${sW/2}px)`, background: '#312e81', border: '1px solid #00000040', transform: `rotateX(-90deg) translateZ(${sH/2}px)` }} />
            </div>
        </div>
    );
};

/* ─── Assigned Items Modal ─── */
const AssignedItemsModal = ({ boxId, boxName, onClose }: { boxId: string, boxName: string, onClose: () => void }) => {
    const { data: items = [], isLoading } = useGetItemsQuery({ boxTypeId: boxId });
    const [updateItem] = useUpdateItemMutation();

    const handleUnlink = async (id: string) => {
        if (!confirm('¿Desvincular este material de esta caja?')) return;
        try {
            await updateItem({ id, data: { boxTypeId: null } }).unwrap();
        } catch (e) {
            alert('Error al desvincular');
        }
    };

    return (
        <Modal title={`Materiales con: ${boxName}`} onClose={onClose}>
            <div style={{ minWidth: '400px' }}>
                {isLoading ? <Spinner /> : items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>No hay materiales asignados a esta caja.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                        {items.map((it: any) => (
                            <div key={it.id} style={{ 
                                background: '#0f1117', padding: '12px 16px', borderRadius: '8px', 
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                border: '1px solid #1e2133'
                            }}>
                                <div>
                                    <div style={{ color: '#f3f4f6', fontSize: '14px', fontWeight: 600 }}>{it.descripcion}</div>
                                    <div style={{ color: '#6b7280', fontSize: '11px' }}>{it.codigoInterno} • {it.supplier?.name || 'S/P'}</div>
                                </div>
                                <Btn small variant="danger" onClick={() => handleUnlink(it.id)}>Desvincular</Btn>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

/* ─── Bulk Assign Modal ─── */
const BulkAssignModal = ({ onClose, boxTypes }: { onClose: () => void, boxTypes: any[] }) => {
    const { data: suppliers = [] } = useGetPartnersQuery({ type: 'SUPPLIER' });
    const [bulkAssign] = useBulkAssignBoxTypeMutation();
    const [targetBoxId, setTargetBoxId] = useState(boxTypes[0]?.id || '');
    const [supplierId, setSupplierId] = useState('');
    const [category, setCategory] = useState('');
    const [selectedItemId, setSelectedItemId] = useState('');
    const [processing, setProcessing] = useState(false);

    const { data: allItems = [], isLoading: loadingItems } = useGetItemsQuery({ categoria: category || undefined });
    const filteredItems = useMemo(() => allItems.filter(it => !supplierId || it.supplierId === supplierId), [allItems, supplierId]);
    const categories = useMemo(() => Array.from(new Set(allItems.map(it => it.categoria))).map(c => ({ value: c, label: c })), [allItems]);

    const handleBulk = async (single?: boolean) => {
        if (!targetBoxId) return alert('Selecciona una caja');
        if (single && !selectedItemId) return alert('Selecciona un item');
        setProcessing(true);
        try {
            const count = await bulkAssign({ 
                boxTypeId: targetBoxId, 
                supplierId: single ? undefined : (supplierId || undefined), 
                category: single ? undefined : (category || undefined),
                itemId: single ? selectedItemId : undefined
            }).unwrap();
            alert(`¡Éxito! Se actualizaron ${count} materiales.`);
            onClose();
        } catch (e) { alert('Error en la asignación'); } finally { setProcessing(false); }
    };

    return (
        <Modal title="Gestión de Embalaje por Reglas" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
                <section>
                    <h4 style={{ color: '#f3f4f6', fontSize: '14px', marginBottom: '8px' }}>1. Formato Destino</h4>
                    <Select value={targetBoxId} onChange={setTargetBoxId} options={boxTypes.map(b => ({ value: b.id, label: `${b.nombre} (${parseFloat(b.volumenM3).toFixed(3)} m³)` }))} />
                </section>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <section>
                        <h4 style={{ color: '#f3f4f6', fontSize: '14px', marginBottom: '8px' }}>2. Proveedor</h4>
                        <Select value={supplierId} onChange={v => { setSupplierId(v); setSelectedItemId(''); }} options={[{ value: '', label: 'Todos' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]} />
                    </section>
                    <section>
                        <h4 style={{ color: '#f3f4f6', fontSize: '14px', marginBottom: '8px' }}>3. Categoría</h4>
                        <Select value={category} onChange={v => { setCategory(v); setSelectedItemId(''); }} options={[{ value: '', label: 'Todas' }, ...categories]} />
                    </section>
                </div>
                <section>
                    <h4 style={{ color: '#f3f4f6', fontSize: '14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>4. Ítems <span style={{ fontSize: '11px', color: '#6b7280' }}>{filteredItems.length}</span></h4>
                    <div style={{ background: '#0f1117', borderRadius: '8px', border: '1px solid #1e2133', maxHeight: '180px', overflowY: 'auto' }}>
                        {loadingItems ? <Spinner /> : filteredItems.map(it => (
                            <div key={it.id} onClick={() => setSelectedItemId(it.id === selectedItemId ? '' : it.id)} style={{ padding: '8px 12px', borderBottom: '1px solid #1e2133', cursor: 'pointer', background: it.id === selectedItemId ? 'rgba(99, 102, 241, 0.2)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '12px', color: '#d1d5db' }}>{it.descripcion}</span><span style={{ fontSize: '10px', color: '#4b5563' }}>{it.codigoInterno}</span></div>
                                {it.boxType && (
                                    <Badge color={it.boxTypeId === targetBoxId ? '#34d399' : '#6b7280'}>
                                        {it.boxType.nombre}
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Btn variant="secondary" style={{ flex: 1 }} onClick={() => handleBulk(false)} disabled={processing || filteredItems.length === 0}>Vincular Filtrados</Btn>
                    <Btn style={{ flex: 1 }} onClick={() => handleBulk(true)} disabled={processing || !selectedItemId}>Vincular Único</Btn>
                </div>
            </div>
        </Modal>
    );
};

const BoxTypesPage: React.FC = () => {
    const { data: boxTypes = [], isLoading } = useGetBoxTypesQuery();
    const [createBoxType] = useCreateBoxTypeMutation();
    const [updateBoxType] = useUpdateBoxTypeMutation();
    const [deleteBoxType] = useDeleteBoxTypeMutation();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ nombre: '', largoCm: 0, anchoCm: 0, altoCm: 0, capacidadKilos: 0 });
    const [showBulk, setShowBulk] = useState(false);
    const [viewItemsBox, setViewItemsBox] = useState<{ id: string, name: string } | null>(null);

    const handleNumericChange = (key: string, value: string) => {
        const processed = value.replace(',', '.');
        setForm({ ...form, [key]: parseFloat(processed) || 0 });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) await updateBoxType({ id: editingId, data: form }).unwrap();
            else await createBoxType(form).unwrap();
            setEditingId(null); 
            setForm({ nombre: '', largoCm: 0, anchoCm: 0, altoCm: 0, capacidadKilos: 0 });
        } catch (err) { alert('Error al guardar'); }
    };

    if (isLoading) return <Spinner />;

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
            <PageHeader title="Tipos de Embalaje" subtitle="Gestiona formatos y asignaciones de materiales">
                <Btn variant="secondary" onClick={() => setShowBulk(true)}>📋 Reglas de Asignación</Btn>
            </PageHeader>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '32px', alignItems: 'start' }}>
                <Card style={{ padding: '24px', position: 'sticky', top: '24px' }}>
                    <h3 style={{ margin: '0 0 20px', color: '#f3f4f6', fontSize: '16px' }}>{editingId ? 'Editar Formato' : 'Nuevo Formato'}</h3>
                    <BoxPreview l={form.largoCm} w={form.anchoCm} h={form.altoCm} />
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <Input label="Nombre" value={form.nombre} onChange={v => setForm({...form, nombre: v})} />
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <Input label="Largo (cm)" value={String(form.largoCm)} onChange={v => handleNumericChange('largoCm', v)} />
                            <Input label="Ancho (cm)" value={String(form.anchoCm)} onChange={v => handleNumericChange('anchoCm', v)} />
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <Input label="Alto (cm)" value={String(form.altoCm)} onChange={v => handleNumericChange('altoCm', v)} />
                            <Input label="Capacidad (kg)" value={String(form.capacidadKilos)} onChange={v => handleNumericChange('capacidadKilos', v)} />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <Btn style={{ flex: 1 }}>{editingId ? 'Guardar' : 'Crear Formato'}</Btn>
                            {editingId && <Btn variant="secondary" onClick={() => { setEditingId(null); setForm({nombre:'', largoCm:0, anchoCm:0, altoCm:0, capacidadKilos:0}); }}>X</Btn>}
                        </div>
                    </form>
                </Card>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {boxTypes.map((bt: any) => (
                        <Card key={bt.id}>
                            <div style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                    <div>
                                        <h4 style={{ margin: 0, color: '#f3f4f6', fontSize: '15px' }}>{bt.nombre}</h4>
                                        <div style={{ color: '#34d399', fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>
                                            Capacidad: {Number(bt.capacidadKilos || 0).toFixed(1)} kg
                                        </div>
                                    </div>
                                    <Badge color="#818cf8">{parseFloat(bt.volumenM3).toFixed(4)} m³</Badge>
                                </div>
                                <div style={{ background: '#0f1117', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', color: '#4b5563' }}>Largo</div><div style={{ color: '#d1d5db', fontSize: '13px', fontWeight: 600 }}>{bt.largoCm}</div></div>
                                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', color: '#4b5563' }}>Ancho</div><div style={{ color: '#d1d5db', fontSize: '13px', fontWeight: 600 }}>{bt.anchoCm}</div></div>
                                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', color: '#4b5563' }}>Alto</div><div style={{ color: '#d1d5db', fontSize: '13px', fontWeight: 600 }}>{bt.altoCm}</div></div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #2a2d3e', paddingTop: '16px' }}>
                                    <Btn small variant="secondary" onClick={() => setViewItemsBox({ id: bt.id, name: bt.nombre })} style={{ flex: 1 }}>📦 Items</Btn>
                                    <Btn small variant="secondary" onClick={() => { 
                                        setEditingId(bt.id); 
                                        setForm({ 
                                            nombre: bt.nombre, 
                                            largoCm: bt.largoCm, 
                                            anchoCm: bt.anchoCm, 
                                            altoCm: bt.altoCm,
                                            capacidadKilos: bt.capacidadKilos || 0
                                        }); 
                                        window.scrollTo({ top: 0, behavior: 'smooth' }); 
                                    }}>✏️</Btn>
                                    <Btn small variant="secondary" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => { if(confirm('¿Eliminar este formato de embalaje?')) deleteBoxType(bt.id); }}>🗑</Btn>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {showBulk && <BulkAssignModal boxTypes={boxTypes} onClose={() => setShowBulk(false)} />}
            {viewItemsBox && <AssignedItemsModal boxId={viewItemsBox.id} boxName={viewItemsBox.name} onClose={() => setViewItemsBox(null)} />}
        </div>
    );
};

export default BoxTypesPage;
export { BoxTypesPage };
