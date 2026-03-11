import { useState, useMemo, useRef, useEffect } from 'react';
import { useGetDepotsQuery, useCreateDepotMutation, useUpdateDepotMutation, useDeleteDepotMutation, useCreatePositionMutation, useUpdatePositionMutation } from '../features/depots/api/depots.api';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../entities/auth/model/authSlice';
import { PageHeader, Card, Btn, Input, Modal, Badge } from './common/ui';

/* ─── Inline-editable cell ─── */
function EditableCell({ value, onSave, label }: { value: string; onSave: (v: string) => Promise<void>; label?: string }) {
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
        <div onClick={() => { setDraft(value); setEditing(true); }} style={{ cursor: 'pointer', padding: '4px 0' }}>
            <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
            <div style={{ color: '#f3f4f6', fontWeight: 500 }}>{value || '—'}</div>
        </div>
    );

    return (
        <div style={{ padding: '4px 0' }}>
            <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
            <input
                ref={ref}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
                disabled={saving}
                style={{
                    width: '100%', background: '#0f1117', border: '1px solid #6366f1',
                    borderRadius: '6px', padding: '4px 8px', color: '#f3f4f6',
                    fontSize: '13px', outline: 'none',
                }}
            />
        </div>
    );
}

export default function DepositoPage() {
    const user = useSelector(selectCurrentUser);
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

    // API Hooks
    const { data: depots = [], isLoading: loadingDepots, isError: errorDepots, error: depotErrorDetail } = useGetDepotsQuery();
    const [createDepot] = useCreateDepotMutation();
    const [updateDepot] = useUpdateDepotMutation();
    const [deleteDepot] = useDeleteDepotMutation();
    const [createPosition] = useCreatePositionMutation();
    const [updatePosition] = useUpdatePositionMutation();
    
    // Management State
    const [selectedDepotForPos, setSelectedDepotForPos] = useState<any>(null);
    const [isSavingDepot, setIsSavingDepot] = useState(false);
    const [showNewDepot, setShowNewDepot] = useState(false);
    const [newDepotForm, setNewDepotForm] = useState({ nombre: '', planta: '', tipo: 'STORAGE' });

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
        } catch (e) { console.error(e); }
    };

    const handleUpdateDepot = async (id: string, field: string, value: string) => {
        try {
            await updateDepot({ id, data: { [field]: value } }).unwrap();
        } catch (e) { console.error(e); }
    };

    const handleTogglePosStatus = async (pos: any) => {
        try {
            await updatePosition({ id: pos.id, data: { activo: !pos.activo } }).unwrap();
        } catch (e) { console.error(e); }
    };

    const handleCreateDepot = async () => {
        if (!newDepotForm.nombre) return;
        setIsSavingDepot(true);
        try {
            await createDepot(newDepotForm).unwrap();
            setShowNewDepot(false);
            setNewDepotForm({ nombre: '', planta: '', tipo: 'STORAGE' });
        } catch (e) { console.error(e); }
        setIsSavingDepot(false);
    };

    const handleAddPosition = async (depotId: string) => {
        const codigo = prompt('Ingrese el código de la nueva posición:');
        if (!codigo) return;
        try {
            await createPosition({ depotId, data: { codigo, tipo: 'STORAGE' } }).unwrap();
        } catch (e) { console.error(e); }
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Infraestructura" subtitle="Gestión de Plantas, Depósitos y Posiciones">
                <Btn small onClick={() => setShowNewDepot(true)}>+ Nuevo Depósito</Btn>
            </PageHeader>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ color: '#9ca3af', fontSize: '14px' }}>Configura los depósitos y sus posiciones físicas para cada planta.</div>

                <Card>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
                                {['Deposito / Nombre', 'Planta', 'Estado', 'Posiciones', 'Acciones'].map(h => (
                                    <th key={h} style={{ padding: '12px 16px', color: '#6b7280', fontSize: '11px', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loadingDepots && (
                                <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Cargando infraestructura...</td></tr>
                            )}
                            {errorDepots && (
                                <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#f87171' }}>
                                    Error al cargar infraestructura: {JSON.stringify(depotErrorDetail)}
                                </td></tr>
                            )}
                            {!loadingDepots && !errorDepots && depots.map((d: any) => (
                                <tr key={d.id} style={{ borderBottom: '1px solid #1e2133', opacity: d.activo ? 1 : 0.6 }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <EditableCell label="Nombre" value={d.nombre} onSave={v => handleUpdateDepot(d.id, 'nombre', v)} />
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <EditableCell label="Planta" value={d.planta || 'Sin planta'} onSave={v => handleUpdateDepot(d.id, 'planta', v)} />
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <button 
                                            onClick={() => handleToggleDepotStatus(d)}
                                            style={{ 
                                                background: d.activo ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                                                border: `1px solid ${d.activo ? '#34d399' : '#f87171'}`,
                                                color: d.activo ? '#34d399' : '#f87171',
                                                borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            {d.activo ? 'ACTIVO' : 'INACTIVO'}
                                        </button>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <Badge 
                                            onClick={() => setSelectedDepotForPos(d)}
                                            color="#a5b4fc" 
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {d.positions?.length || 0} posiciones
                                        </Badge>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <Btn small variant="secondary" title="Deshabilitar depósito" onClick={() => { if(confirm('¿Deshabilitar depósito?')) deleteDepot(d.id); }}>✕</Btn>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>

                {/* Position Manager Slider/Modal */}
                {selectedDepotForPos && (
                    <Modal 
                        title={`Posiciones de ${selectedDepotForPos.nombre}`} 
                        onClose={() => setSelectedDepotForPos(null)}
                        wide
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ color: '#9ca3af', fontSize: '13px' }}>Habilitá, deshabilitá o añadí posiciones físicas.</div>
                            <Btn small onClick={() => handleAddPosition(selectedDepotForPos.id)}>+ Añadir Posición</Btn>
                        </div>
                        <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #2a2d3e', borderRadius: '8px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#1a1d2e', zIndex: 1 }}>
                                    <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
                                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280' }}>CÓDIGO</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280' }}>TIPO</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '11px', color: '#6b7280' }}>ESTADO</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(depots.find((x:any) => x.id === selectedDepotForPos.id)?.positions || []).map((p: any) => (
                                        <tr key={p.id} style={{ borderBottom: '1px solid #1e2133', opacity: p.activo ? 1 : 0.5 }}>
                                            <td style={{ padding: '8px 16px', color: '#f3f4f6', fontSize: '13px' }}>{p.codigo}</td>
                                            <td style={{ padding: '8px 16px', color: '#9ca3af', fontSize: '12px' }}>{p.tipo}</td>
                                            <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={p.activo} 
                                                    onChange={() => handleTogglePosStatus(p)}
                                                    style={{ width: '16px', height: '16px', accentColor: '#34d399' }}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Modal>
                )}

                {showNewDepot && (
                    <Modal title="Nuevo Depósito" onClose={() => setShowNewDepot(false)}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <Input label="Nombre del Depósito" value={newDepotForm.nombre} onChange={v => setNewDepotForm(p => ({...p, nombre: v}))} />
                            <Input label="Planta" value={newDepotForm.planta} onChange={v => setNewDepotForm(p => ({...p, planta: v}))} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', mt: '10px' }}>
                                <Btn variant="secondary" onClick={() => setShowNewDepot(false)}>Cancelar</Btn>
                                <Btn onClick={handleCreateDepot} disabled={isSavingDepot}>{isSavingDepot ? 'Guardando...' : 'Crear Depósito'}</Btn>
                            </div>
                        </div>
                    </Modal>
                )}
            </div>
        </div>
    );
}