import { useState, useMemo } from 'react';
import { useGetStockQuery } from '../features/stock/api/stock.api';
import { useGetDepotsQuery, useCreateDepotMutation, useUpdateDepotMutation, useDeleteDepotMutation, useCreatePositionMutation, useUpdatePositionMutation, useDeletePositionMutation } from '../features/depots/api/depots.api';
import { PageHeader, Card, Btn, Input, Select, Modal, Table, Badge, SearchBar } from './common/ui';

const ROTACION_COLORS: Record<string, string> = { ALTA: '#34d399', MEDIA: '#fbbf24', BAJA: '#6b7280' };
// Used in sub-components if needed in future


export default function DepositoPage() {
    const { data: depots = [], isLoading: loadingDepots } = useGetDepotsQuery();
    const [createDepot] = useCreateDepotMutation();
    const [updateDepot] = useUpdateDepotMutation();
    const [deleteDepot] = useDeleteDepotMutation();
    const [createPosition] = useCreatePositionMutation();
    const [updatePosition] = useUpdatePositionMutation();
    const [deletePosition] = useDeletePositionMutation();

    const [activeDepotId, setActiveDepotId] = useState<string>('');
    const activeDepot = depots.find((d: any) => d.id === activeDepotId);

    // Stock filters
    const [q, setQ] = useState('');
    const [filterSupplier, setFilterSupplier] = useState('');
    const { data: stock = [], isLoading: loadingStock } = useGetStockQuery({ depotId: activeDepotId || undefined, q: q || undefined, supplierId: filterSupplier || undefined });

    // Depot form
    const [showDepotForm, setShowDepotForm] = useState(false);
    const [editDepot, setEditDepot] = useState<any>(null);
    const [depotForm, setDepotForm] = useState({ nombre: '', planta: '', tipo: 'STORAGE' });
    const [depotError, setDepotError] = useState('');
    const [depotSaving, setDepotSaving] = useState(false);

    // Position form
    const [showPosForm, setShowPosForm] = useState(false);
    const [editPos, setEditPos] = useState<any>(null);
    const [posForm, setPosForm] = useState({ codigo: '', tipo: 'STORAGE' });
    const [posError, setPosError] = useState('');
    const [posSaving, setPosSaving] = useState(false);

    const saveDepot = async () => {
        if (!depotForm.nombre.trim()) { setDepotError('El nombre es obligatorio'); return; }
        setDepotSaving(true); setDepotError('');
        try {
            if (editDepot) {
                await updateDepot({ id: editDepot.id, data: depotForm }).unwrap();
            } else {
                const newDepot = await createDepot(depotForm).unwrap();
                if (newDepot?.id) setActiveDepotId(newDepot.id);
            }
            setShowDepotForm(false); setEditDepot(null); setDepotForm({ nombre: '', planta: '', tipo: 'STORAGE' });
        } catch (e: any) { setDepotError(e?.data?.message ?? 'Error al guardar el depósito'); }
        setDepotSaving(false);
    };

    const savePosition = async () => {
        if (!activeDepotId) return;
        if (!posForm.codigo.trim()) { setPosError('El código es obligatorio'); return; }
        setPosSaving(true); setPosError('');
        try {
            if (editPos) await updatePosition({ id: editPos.id, data: posForm }).unwrap();
            else await createPosition({ depotId: activeDepotId, data: posForm }).unwrap();
            setShowPosForm(false); setEditPos(null); setPosForm({ codigo: '', tipo: 'STORAGE' });
        } catch (e: any) { setPosError(e?.data?.message ?? 'Error al guardar la posición'); }
        setPosSaving(false);
    };

    // Unique suppliers for filter from stock
    const suppliers = useMemo(() => {
        const map = new Map<string, string>();
        stock.forEach((s: any) => { if (s.batch?.supplier) map.set(s.batch.supplier.id, s.batch.supplier.name); });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [stock]);

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Depósito" subtitle="Gestión de depósitos, posiciones y stock">
                <Btn small variant="secondary" onClick={() => { setEditDepot(null); setDepotForm({ nombre: '', planta: '', tipo: 'STORAGE' }); setShowDepotForm(true); }}>+ Depósito</Btn>
                {activeDepotId && <Btn small onClick={() => { setEditPos(null); setPosForm({ codigo: '', tipo: 'STORAGE' }); setShowPosForm(true); }}>+ Posición</Btn>}
            </PageHeader>

            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '16px' }}>
                {/* Depot list */}
                <Card style={{ padding: '8px' }}>
                    {loadingDepots ? <p style={{ color: '#9ca3af', padding: '12px' }}>Cargando...</p> : (
                        <>
                            <div
                                onClick={() => setActiveDepotId('')}
                                style={{ padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: !activeDepotId ? 'rgba(165,180,252,0.1)' : 'transparent', color: !activeDepotId ? '#a5b4fc' : '#9ca3af', fontSize: '13px', marginBottom: '4px' }}
                            >
                                📦 Todos los depósitos
                            </div>
                            {depots.map((d: any) => (
                                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: activeDepotId === d.id ? 'rgba(165,180,252,0.1)' : 'transparent', marginBottom: '2px' }}
                                    onClick={() => setActiveDepotId(d.id)}>
                                    <div>
                                        <div style={{ color: activeDepotId === d.id ? '#a5b4fc' : '#d1d5db', fontSize: '13px', fontWeight: 600 }}>{d.nombre}</div>
                                        <div style={{ color: '#6b7280', fontSize: '11px' }}>{d.planta} · {d.tipo}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <Btn small variant="secondary" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEditDepot(d); setDepotForm({ nombre: d.nombre, planta: d.planta ?? '', tipo: d.tipo }); setShowDepotForm(true); }}>✏️</Btn>
                                        <Btn small variant="danger" onClick={(e: React.MouseEvent) => { e.stopPropagation(); deleteDepot(d.id); }}>🗑</Btn>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </Card>

                {/* Stock view */}
                <div>
                    {/* Positions panel if depot selected */}
                    {activeDepot && (
                        <Card style={{ marginBottom: '16px', padding: '12px' }}>
                            <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Posiciones de {activeDepot.nombre}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {(activeDepot.positions ?? []).map((p: any) => (
                                    <div key={p.id} style={{ background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div>
                                            <div style={{ color: '#d1d5db', fontSize: '13px', fontWeight: 600 }}>{p.codigo}</div>
                                            <Badge color={p.tipo === 'PICKING' ? '#34d399' : '#a5b4fc'}>{p.tipo}</Badge>
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <Btn small variant="secondary" onClick={() => { setEditPos(p); setPosForm({ codigo: p.codigo, tipo: p.tipo }); setShowPosForm(true); }}>✏️</Btn>
                                            <Btn small variant="danger" onClick={() => deletePosition(p.id)}>🗑</Btn>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Stock table */}
                    <Card>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2d3e', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <SearchBar value={q} onChange={setQ} placeholder="Material, código, proveedor, partida..." />
                            <Select value={filterSupplier} onChange={setFilterSupplier}
                                options={[{ value: '', label: 'Todos los proveedores' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]}
                                style={{ width: '200px' }} />
                        </div>
                        {loadingStock ? <p style={{ color: '#9ca3af', padding: '24px' }}>Cargando stock...</p> : (
                            <Table
                                cols={['Depósito', 'Posición', 'Material', 'Código', 'Partida', 'Proveedor', 'Kilos', 'Unidades']}
                                rows={stock.map((s: any) => [
                                    s.posicion?.depot?.nombre ?? '—',
                                    <Badge color={s.posicion?.tipo === 'PICKING' ? '#34d399' : '#a5b4fc'}>{s.posicion?.codigo ?? '—'}</Badge>,
                                    s.batch?.item?.descripcion ?? '—',
                                    <code style={{ color: '#a5b4fc', fontSize: '11px' }}>{s.batch?.item?.codigoInterno ?? '—'}</code>,
                                    <code style={{ fontSize: '11px', color: '#fbbf24' }}>{s.batch?.lotNumber ?? '—'}</code>,
                                    s.batch?.supplier?.name ?? '—',
                                    <strong style={{ color: '#34d399' }}>{Number(s.qtyPrincipal).toFixed(2)} kg</strong>,
                                    s.qtySecundaria != null ? s.qtySecundaria : '—',
                                ])}
                            />
                        )}
                    </Card>
                </div>
            </div>

            {showDepotForm && (
                <Modal title={editDepot ? 'Editar Depósito' : 'Nuevo Depósito'} onClose={() => { setShowDepotForm(false); setDepotError(''); }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Input label="Nombre *" value={depotForm.nombre} onChange={v => setDepotForm(p => ({ ...p, nombre: v }))} placeholder="Ej: Depósito Central" />
                        <Input label="Planta (opcional)" value={depotForm.planta} onChange={v => setDepotForm(p => ({ ...p, planta: v }))} placeholder="Ej: Planta 1" />
                        <Select label="Tipo" value={depotForm.tipo} onChange={v => setDepotForm(p => ({ ...p, tipo: v }))}
                            options={[{ value: 'STORAGE', label: 'Almacenamiento' }, { value: 'PICKING', label: 'Picking' }, { value: 'MIXED', label: 'Mixto' }]} />
                        {depotError && <p style={{ color: '#f87171', margin: 0, fontSize: '13px' }}>{depotError}</p>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <Btn variant="secondary" onClick={() => { setShowDepotForm(false); setDepotError(''); }}>Cancelar</Btn>
                            <Btn onClick={saveDepot} disabled={depotSaving}>{depotSaving ? 'Guardando...' : 'Guardar'}</Btn>
                        </div>
                    </div>
                </Modal>
            )}

            {showPosForm && (
                <Modal title={editPos ? 'Editar Posición' : 'Nueva Posición'} onClose={() => { setShowPosForm(false); setPosError(''); }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Input label="Código de posición *" value={posForm.codigo} onChange={v => setPosForm(p => ({ ...p, codigo: v }))} placeholder="Ej: R1-F2-A" />
                        <Select label="Tipo" value={posForm.tipo} onChange={v => setPosForm(p => ({ ...p, tipo: v }))}
                            options={[{ value: 'STORAGE', label: 'Almacenamiento' }, { value: 'PICKING', label: 'Picking' }]} />
                        {posError && <p style={{ color: '#f87171', margin: 0, fontSize: '13px' }}>{posError}</p>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <Btn variant="secondary" onClick={() => { setShowPosForm(false); setPosError(''); }}>Cancelar</Btn>
                            <Btn onClick={savePosition} disabled={posSaving}>{posSaving ? 'Guardando...' : 'Guardar'}</Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
