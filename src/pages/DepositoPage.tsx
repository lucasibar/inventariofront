import { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useGetDepotsQuery, useCreateDepotMutation, useUpdateDepotMutation, useCreatePositionMutation, useUpdatePositionMutation } from '../features/depots/api/depots.api';
import { selectCurrentUser } from '../entities/auth/model/authSlice';
import { PageHeader, Card, Btn, Input, Modal, Badge, Spinner } from './common/ui';

/* ─── Inline-editable cell ─── */
function EditableCell({ value, onSave, label, type = 'text' }: { value: string; onSave: (v: string) => Promise<void>; label?: string; type?: string }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

    const commit = async () => {
        if (draft === value) { setEditing(false); return; }
        setSaving(true);
        try { await onSave(draft); setEditing(false); } catch { /* keep open on error */ }
        setSaving(false);
    };

    if (!editing) return (
        <div onClick={() => { setDraft(value); setEditing(true); }} style={{ cursor: 'pointer', padding: '6px 0', borderBottom: '1px dashed transparent', transition: 'all 0.2s' }} className="editable-trigger">
            {label && <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>}
            <div style={{ color: '#f3f4f6', fontWeight: 500 }}>{value || '—'}</div>
        </div>
    );

    return (
        <div style={{ padding: '4px 0' }}>
            {label && <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>}
            <input
                ref={ref}
                type={type}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
                disabled={saving}
                style={{
                    width: '100%', background: '#0f1117', border: '1px solid #6366f1',
                    borderRadius: '6px', padding: '6px 10px', color: '#f3f4f6',
                    fontSize: '13px', outline: 'none', boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)'
                }}
            />
        </div>
    );
}

export default function DepositoPage() {
    const user = useSelector(selectCurrentUser);
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

    // API Hooks
    const { data: depots = [], isLoading: loadingDepots, refetch } = useGetDepotsQuery();
    const [createDepot] = useCreateDepotMutation();
    const [updateDepot] = useUpdateDepotMutation();
    const [createPosition] = useCreatePositionMutation();
    const [updatePosition] = useUpdatePositionMutation();
    
    // Management State
    const [selectedDepotId, setSelectedDepotId] = useState<string | null>(null);
    const [isSavingDepot, setIsSavingDepot] = useState(false);
    const [showNewDepot, setShowNewDepot] = useState(false);
    const [showNewPosition, setShowNewPosition] = useState<string | null>(null);
    const [newDepotForm, setNewDepotForm] = useState({ nombre: '', planta: '', tipo: 'STORAGE' });
    const [newPosForm, setNewPosForm] = useState({ codigo: '', tipo: 'STORAGE', categoriaPrincipal: 'stock' });

    const selectedDepot = depots.find(d => d.id === selectedDepotId);

    if (!isAdmin) {
        return (
            <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
                <h2 style={{ color: '#f3f4f6', marginBottom: '8px' }}>Acceso Restringido</h2>
                <p>Solo los administradores registrados pueden gestionar la infraestructura.</p>
            </div>
        );
    }

    const handleToggleDepotStatus = async (depot: any) => {
        try {
            await updateDepot({ id: depot.id, data: { activo: !depot.activo } }).unwrap();
            refetch();
        } catch (e) { console.error(e); }
    };

    const handleUpdateDepot = async (id: string, field: string, value: string) => {
        try {
            await updateDepot({ id, data: { [field]: value } }).unwrap();
            refetch();
        } catch (e) { console.error(e); }
    };

    const handleTogglePosStatus = async (pos: any) => {
        try {
            await updatePosition({ id: pos.id, data: { activo: !pos.activo } }).unwrap();
            refetch();
        } catch (e) { console.error(e); }
    };

    const handleCreateDepot = async () => {
        if (!newDepotForm.nombre) return;
        setIsSavingDepot(true);
        try {
            const result = await createDepot(newDepotForm).unwrap();
            setShowNewDepot(false);
            setNewDepotForm({ nombre: '', planta: '', tipo: 'STORAGE' });
            setSelectedDepotId(result.id);
        } catch (e) { console.error(e); }
        setIsSavingDepot(false);
    };

    const handleAddPosition = async () => {
        if (!showNewPosition || !newPosForm.codigo) return;
        try {
            await createPosition({ depotId: showNewPosition, data: newPosForm }).unwrap();
            setShowNewPosition(null);
            setNewPosForm({ codigo: '', tipo: 'STORAGE', categoriaPrincipal: 'stock' });
            refetch();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="infra-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <style>{`
                .infra-container { font-family: 'Inter', sans-serif; }
                .depot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 32px; }
                .depot-card { 
                    border: 1px solid #1e2133; background: #1a1d2e; border-radius: 12px; padding: 20px; cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden;
                }
                .depot-card:hover { border-color: #4b5563; transform: translateY(-2px); }
                .depot-card.selected { border-color: #6366f1; background: rgba(99, 102, 241, 0.05); box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2); }
                .depot-card.inactive { opacity: 0.6; filter: grayscale(0.5); }
                
                .pos-table-container { animation: slideUp 0.3s ease-out; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                
                .editable-trigger:hover { border-bottom-color: #4b5563; }
            `}</style>

            <PageHeader title="Infraestructura" subtitle="Gestión de Plantas, Depósitos y Posiciones">
                <Btn small onClick={() => setShowNewDepot(true)}>+ Nuevo Depósito</Btn>
            </PageHeader>

            {loadingDepots ? (
                <div style={{ textAlign: 'center', padding: '48px' }}><Spinner /></div>
            ) : (
                <>
                    <div className="depot-grid">
                        {depots.map((d: any) => (
                            <div 
                                key={d.id} 
                                className={`depot-card ${selectedDepotId === d.id ? 'selected' : ''} ${!d.activo ? 'inactive' : ''}`}
                                onClick={() => setSelectedDepotId(d.id === selectedDepotId ? null : d.id)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <EditableCell 
                                            value={d.nombre} 
                                            onSave={v => handleUpdateDepot(d.id, 'nombre', v)} 
                                            label="Depósito"
                                        />
                                    </div>
                                    <Badge color={d.activo ? '#10b981' : '#ef4444'}>
                                        {d.activo ? 'ACTIVO' : 'INACTIVO'}
                                    </Badge>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <EditableCell 
                                            value={d.planta || 'Sin planta'} 
                                            onSave={v => handleUpdateDepot(d.id, 'planta', v)} 
                                            label="Planta"
                                        />
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Posiciones</div>
                                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>{d.positions?.length || 0}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid #2a2d3e', paddingTop: '12px' }}>
                                    <Btn small variant="secondary" onClick={(e) => { e.stopPropagation(); handleToggleDepotStatus(d); }}>
                                        {d.activo ? 'Desactivar' : 'Activar'}
                                    </Btn>
                                    <Btn small variant={selectedDepotId === d.id ? 'primary' : 'secondary'} style={{ flex: 1 }}>
                                        {selectedDepotId === d.id ? 'Ocultar Posiciones' : 'Ver Posiciones'}
                                    </Btn>
                                </div>
                            </div>
                        ))}
                    </div>

                    {selectedDepot && (
                        <div className="pos-table-container">
                            <Card style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #1e2133', paddingBottom: '16px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, color: '#f3f4f6', fontSize: '18px' }}>Posiciones de {selectedDepot.nombre}</h3>
                                        <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '13px' }}>Editar códigos, capacidades y categorías principales.</p>
                                    </div>
                                    <Btn small onClick={() => setShowNewPosition(selectedDepot.id)}>+ Añadir Posición</Btn>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                {['Código', 'Volumen (m³)', 'Cat. Principal', 'Cat. Secundaria', 'Estado'].map(h => (
                                                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedDepot.positions.length === 0 ? (
                                                <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#4b5563' }}>No hay posiciones definidas para este depósito.</td></tr>
                                            ) : selectedDepot.positions.map((p: any) => (
                                                <tr key={p.id} style={{ borderBottom: '1px solid #1e2133', opacity: p.activo ? 1 : 0.5 }}>
                                                    <td style={{ padding: '8px 16px' }}>
                                                        <EditableCell 
                                                            value={p.codigo} 
                                                            onSave={async (v) => {
                                                                await updatePosition({ id: p.id, data: { codigo: v } }).unwrap();
                                                                refetch();
                                                            }} 
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px 16px', width: '140px' }}>
                                                        <EditableCell 
                                                            value={p.metrosCubicos?.toString() || ''} 
                                                            type="number"
                                                            onSave={async (v) => {
                                                                await updatePosition({ id: p.id, data: { metrosCubicos: parseFloat(v) || null } }).unwrap();
                                                                refetch();
                                                            }} 
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px 16px' }}>
                                                        <select 
                                                            value={p.categoriaPrincipal || 'stock'} 
                                                            onChange={async (e) => {
                                                                await updatePosition({ id: p.id, data: { categoriaPrincipal: e.target.value } }).unwrap(); 
                                                                refetch();
                                                            }}
                                                            style={{ background: '#0f1117', border: '1px solid #2a2d3e', color: '#f3f4f6', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}
                                                        >
                                                            <option value="stock">Stock General</option>
                                                            <option value="picking">Picking</option>
                                                            <option value="entrada">Entrada / Recepción</option>
                                                            <option value="MATERIA PRIMA">Materia Prima</option>
                                                            <option value="PRODUCTO TERMINADO">Producto Terminado</option>
                                                            <option value="INSUMO">Insumo</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '8px 16px' }}>
                                                        <select 
                                                            value={p.categoriaSecundaria || ''} 
                                                            onChange={async (e) => {
                                                                await updatePosition({ id: p.id, data: { categoriaSecundaria: e.target.value || null } }).unwrap(); 
                                                                refetch();
                                                            }}
                                                            style={{ background: '#0f1117', border: '1px solid #2a2d3e', color: '#f3f4f6', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}
                                                        >
                                                            <option value="">— Ninguna —</option>
                                                            <option value="stock">Stock General</option>
                                                            <option value="picking">Picking</option>
                                                            <option value="MATERIA PRIMA">Materia Prima</option>
                                                            <option value="PRODUCTO TERMINADO">Producto Terminado</option>
                                                            <option value="INSUMO">Insumo</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '8px 16px' }}>
                                                        <button 
                                                            onClick={() => handleTogglePosStatus(p)}
                                                            style={{ 
                                                                background: p.activo ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                                                                border: `1px solid ${p.activo ? '#34d399' : '#f87171'}`,
                                                                color: p.activo ? '#34d399' : '#f87171',
                                                                borderRadius: '20px', padding: '4px 12px', fontSize: '10px', fontWeight: 600, cursor: 'pointer'
                                                            }}
                                                        >
                                                            {p.activo ? 'ACTIVO' : 'INACTIVO'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    )}
                </>
            )}

            {showNewDepot && (
                <Modal title="Nuevo Depósito" onClose={() => setShowNewDepot(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Crea un nuevo depósito físico. Se generará automáticamente una posición ENTRADA.</p>
                        <Input label="Nombre del Depósito" value={newDepotForm.nombre} onChange={v => setNewDepotForm(p => ({...p, nombre: v}))} />
                        <Input label="Planta" value={newDepotForm.planta} onChange={v => setNewDepotForm(p => ({...p, planta: v}))} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #1e2133', paddingTop: '16px' }}>
                            <Btn variant="secondary" onClick={() => setShowNewDepot(false)}>Cancelar</Btn>
                            <Btn onClick={handleCreateDepot} disabled={isSavingDepot}>{isSavingDepot ? 'Guardando...' : 'Crear Depósito'}</Btn>
                        </div>
                    </div>
                </Modal>
            )}

            {showNewPosition && (
                <Modal title="Nueva Posición" onClose={() => setShowNewPosition(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Define una nueva ubicación física dentro del depósito.</p>
                        <Input label="Código de Posición" value={newPosForm.codigo} onChange={v => setNewPosForm(p => ({...p, codigo: v}))} placeholder="Ej: A-01-01" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>Categoría</label>
                                <select 
                                    value={newPosForm.categoriaPrincipal} 
                                    onChange={e => setNewPosForm(p => ({...p, categoriaPrincipal: e.target.value}))}
                                    style={{ width: '100%', background: '#0f1117', border: '1px solid #374151', borderRadius: '8px', padding: '8px 10px', color: '#f3f4f6', fontSize: '13px', outline: 'none' }}
                                >
                                    <option value="stock">Stock General</option>
                                    <option value="picking">Picking</option>
                                    <option value="entrada">Entrada / Recepción</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>Tipo</label>
                                <select 
                                    value={newPosForm.tipo} 
                                    onChange={e => setNewPosForm(p => ({...p, tipo: e.target.value}))}
                                    style={{ width: '100%', background: '#0f1117', border: '1px solid #374151', borderRadius: '8px', padding: '8px 10px', color: '#f3f4f6', fontSize: '13px', outline: 'none' }}
                                >
                                    <option value="STORAGE">Almacenamiento</option>
                                    <option value="DOCK">Andén</option>
                                    <option value="VIRTUAL">Virtual</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #1e2133', paddingTop: '16px' }}>
                            <Btn variant="secondary" onClick={() => setShowNewPosition(null)}>Cancelar</Btn>
                            <Btn onClick={handleAddPosition}>Crear Posición</Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}