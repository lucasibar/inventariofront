import { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useGetItemsQuery } from '../features/items/api/items.api';
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

/* ─── Restriction Manager ─── */
function RestrictionManager({ restrictions, itemCategories, onUpdate, onClose }: { 
    restrictions: { type: string; value: string }[], 
    itemCategories: string[], 
    onUpdate: (r: { type: string; value: string }[]) => Promise<void>,
    onClose: () => void 
}) {
    const [materialSearch, setMaterialSearch] = useState('');
    const { data: searchResults = [] } = useGetItemsQuery({ q: materialSearch }, { skip: materialSearch.length < 2 });

    const addRestriction = (type: string, value: string) => {
        const current = Array.isArray(restrictions) ? restrictions : [];
        if (current.find(r => r.type === type && r.value === value)) return;
        onUpdate([...current, { type, value }]);
    };

    const removeRestriction = (index: number) => {
        const next = [...(Array.isArray(restrictions) ? restrictions : [])];
        next.splice(index, 1);
        onUpdate(next);
    };

    const currentRestrictions = Array.isArray(restrictions) ? restrictions : [];

    return (
        <div style={{ 
            display: 'flex', flexDirection: 'column', gap: '8px', background: '#0f1117', 
            padding: '12px', borderRadius: '12px', border: '1px solid #1e2133', minWidth: '320px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', position: 'relative', zIndex: 100
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Restricciones de Posición</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Tags Actuales */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', minHeight: '24px' }}>
                {currentRestrictions.length === 0 && <span style={{ fontSize: '12px', color: '#4b5563', fontStyle: 'italic' }}>Sin restricciones (Libre)</span>}
                {currentRestrictions.map((r, i) => (
                    <div key={i} style={{ 
                        background: r.type === 'MATERIAL' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                        border: `1px solid ${r.type === 'MATERIAL' ? '#a855f7' : '#6366f1'}`,
                        color: r.type === 'MATERIAL' ? '#d8b4fe' : '#a5b4fc',
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <span>{r.type === 'MATERIAL' ? `📦 ${r.value?.split('-')[0]}` : r.value}</span>
                        <span onClick={() => removeRestriction(i)} style={{ cursor: 'pointer', opacity: 0.6 }}>✕</span>
                    </div>
                ))}
            </div>

            {/* Añadir Categoría */}
            <div style={{ marginTop: '4px' }}>
                <select 
                    onChange={e => { if(e.target.value) { addRestriction('CATEGORY', e.target.value); e.target.value = ''; } }}
                    style={{ width: '100%', background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '6px', padding: '6px', color: '#f3f4f6', fontSize: '12px', outline: 'none' }}
                >
                    <option value="">+ Añadir Categoría...</option>
                    {itemCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>

            {/* Añadir Material (Search) */}
            <div style={{ position: 'relative' }}>
                <input 
                    placeholder="+ Añadir Material específico..."
                    value={materialSearch}
                    onChange={e => setMaterialSearch(e.target.value)}
                    style={{ width: '100%', background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '6px', padding: '6px', color: '#f3f4f6', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                />
                {materialSearch.length >= 2 && searchResults && Array.isArray(searchResults) && searchResults.length > 0 && (
                    <div style={{ 
                        position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1d2e', 
                        border: '1px solid #2a2d3e', borderRadius: '6px', marginTop: '4px', 
                        maxHeight: '150px', overflowY: 'auto', zIndex: 101, boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}>
                        {searchResults.map((item: any) => (
                            <div 
                                key={item.id} 
                                onClick={() => { addRestriction('MATERIAL', `${item.codigoInterno} - ${item.descripcion}`); setMaterialSearch(''); }}
                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #2a2d3e', transition: 'background 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#2a2d3e'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{ fontSize: '12px', color: '#f3f4f6', fontWeight: 600 }}>{item.codigoInterno}</div>
                                <div style={{ fontSize: '10px', color: '#9ca3af' }}>{item.descripcion}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
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
    const { data: items = [] } = useGetItemsQuery({});
    
    // Extract unique categories from items
    const itemCategories = [...new Set((Array.isArray(items) ? items : []).map(i => i.categoria))].filter(Boolean).sort();
    
    // Management State
    const [selectedDepotId, setSelectedDepotId] = useState<string | null>(null);
    const [isSavingDepot, setIsSavingDepot] = useState(false);
    const [showNewDepot, setShowNewDepot] = useState(false);
    const [showNewPosition, setShowNewPosition] = useState<string | null>(null);
    const [newDepotForm, setNewDepotForm] = useState({ nombre: '', planta: '', tipo: 'STORAGE' });
    const [newPosForm, setNewPosForm] = useState({ codigo: '', categoria: 'STOCK', categoria_item_primario: '', categoria_item_secundario: '', metrosCubicos: '' });

    // Position Filtering
    const [posSearch, setPosSearch] = useState('');
    const [posFilterCat, setPosFilterCat] = useState('');
    const [posFilterItem, setPosFilterItem] = useState('');
    const [expandedPosId, setExpandedPosId] = useState<string | null>(null);

    const selectedDepot = Array.isArray(depots) ? depots.find(d => d.id === selectedDepotId) : null;
    
    const filteredPositions = (selectedDepot?.positions || []).filter((p: any) => {
        const matchSearch = p.codigo?.toLowerCase().includes(posSearch.toLowerCase()) || false;
        const matchCat = !posFilterCat || p.categoria === posFilterCat;
        
        // Filter by any restriction matching the category
        const matchItem = !posFilterItem || (p.restrictions || []).some((r: any) => r.type === 'CATEGORY' && r.value === posFilterItem);
        
        return matchSearch && matchCat && matchItem;
    });

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
            refetch();
        } catch (e) { console.error(e); }
        setIsSavingDepot(false);
    };

    const handleAddPosition = async () => {
        if (!showNewPosition || !newPosForm.codigo) return;
        try {
            await createPosition({ 
                depotId: showNewPosition, 
                data: { 
                    ...newPosForm, 
                    metrosCubicos: newPosForm.metrosCubicos ? parseFloat(newPosForm.metrosCubicos) : null 
                } 
            }).unwrap();
            setShowNewPosition(null);
            setNewPosForm({ codigo: '', categoria: 'STOCK', categoria_item_primario: '', categoria_item_secundario: '', metrosCubicos: '' });
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
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); handleToggleDepotStatus(d); }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <Badge color={d.activo ? '#10b981' : '#ef4444'}>
                                            {d.activo ? 'ACTIVO' : 'INACTIVO'}
                                        </Badge>
                                    </div>
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
                                        <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '13px' }}>Gestiona los tipos de zona y las categorías de materiales asignadas.</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <Btn small variant="secondary" onClick={() => { setPosFilterCat(''); setPosFilterItem(''); setPosSearch(''); }}>Limpiar Filtros</Btn>
                                        <Btn small onClick={() => setShowNewPosition(selectedDepot.id)}>+ Añadir Posición</Btn>
                                    </div>
                                </div>

                                {/* Filtros de Búsqueda */}
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', background: '#0f1117', padding: '16px', borderRadius: '12px', border: '1px solid #1e2133' }}>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ display: 'block', fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '6px' }}>Buscar por Código</label>
                                        <input 
                                            placeholder="Ej: 1-1-A..."
                                            value={posSearch}
                                            onChange={e => setPosSearch(e.target.value)}
                                            style={{ width: '100%', background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '8px', padding: '8px 12px', color: '#f3f4f6', outline: 'none' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '6px' }}>Zona / Categoría</label>
                                        <select 
                                            value={posFilterCat}
                                            onChange={e => setPosFilterCat(e.target.value)}
                                            style={{ width: '100%', background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '8px', padding: '8px 12px', color: '#f3f4f6', outline: 'none' }}
                                        >
                                            <option value="">Todas las zonas</option>
                                            <option value="STOCK">Stock</option>
                                            <option value="PICKING">Picking</option>
                                            <option value="PASILLO">Pasillo</option>
                                            <option value="ENTRADA">Entrada</option>
                                            <option value="CUARENTENA">Cuarentena</option>
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '6px' }}>Cat. Material</label>
                                        <select 
                                            value={posFilterItem}
                                            onChange={e => setPosFilterItem(e.target.value)}
                                            style={{ width: '100%', background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '8px', padding: '8px 12px', color: '#f3f4f6', outline: 'none' }}
                                        >
                                            <option value="">Todos los materiales</option>
                                            {itemCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ position: 'sticky', top: 0, background: '#1a1d2e', zIndex: 10 }}>
                                            <tr>
                                                {['Código', 'Volumen (m³)', 'Tipo / Zona', 'Items Asignados', 'Estado'].map(h => (
                                                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #1e2133' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPositions.length === 0 ? (
                                                <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#4b5563' }}>No se encontraron posiciones con los filtros seleccionados.</td></tr>
                                            ) : filteredPositions.slice(0, 200).map((p: any) => (
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
                                                            value={p.categoria?.toUpperCase() || 'STOCK'} 
                                                            onChange={async (e) => {
                                                                await updatePosition({ id: p.id, data: { categoria: e.target.value } }).unwrap(); 
                                                                refetch();
                                                            }}
                                                            style={{ background: '#0f1117', border: '1px solid #2a2d3e', color: '#f3f4f6', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}
                                                        >
                                                            <option value="STOCK">Stock General</option>
                                                            <option value="PICKING">Picking</option>
                                                            <option value="PASILLO">Pasillo</option>
                                                            <option value="ENTRADA">Entrada / Recepción</option>
                                                            <option value="CUARENTENA">Cuarentena</option>
                                                            <option value="EXTERNO">Externo / Depo Terceros</option>
                                                            <option value="STORAGE">Almacenamiento (Legacy)</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '8px 16px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {expandedPosId === p.id ? (
                                                                <RestrictionManager 
                                                                    restrictions={p.restrictions || []}
                                                                    itemCategories={itemCategories}
                                                                    onUpdate={async (newRestrictions) => {
                                                                        await updatePosition({ id: p.id, data: { restrictions: newRestrictions } }).unwrap();
                                                                        refetch();
                                                                    }}
                                                                    onClose={() => setExpandedPosId(null)}
                                                                />
                                                            ) : (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setExpandedPosId(p.id); }}
                                                                    style={{ 
                                                                        display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.1)', 
                                                                        border: '1px solid rgba(99, 102, 241, 0.2)', color: '#818cf8', borderRadius: '4px', 
                                                                        padding: '4px 10px', fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    <span style={{ fontSize: '14px' }}>🏷️</span>
                                                                    {p.restrictions && p.restrictions.length > 0 ? (
                                                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                                            {p.restrictions.slice(0, 2).map((r: any, idx: number) => (
                                                                                <span key={idx} style={{ background: r.type === 'MATERIAL' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(99, 102, 241, 0.2)', padding: '1px 6px', borderRadius: '3px', fontSize: '10px' }}>
                                                                                    {r.type === 'MATERIAL' ? '📦 Material' : r.value}
                                                                                </span>
                                                                            ))}
                                                                            {p.restrictions.length > 2 && <span style={{ opacity: 0.6 }}>+{p.restrictions.length - 2}</span>}
                                                                        </div>
                                                                    ) : (
                                                                        <span style={{ opacity: 0.6 }}>Sin restricciones</span>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
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
                                            {filteredPositions.length > 200 && (
                                                <tr>
                                                    <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#6366f1', fontSize: '12px' }}>
                                                        Mostrando los primeros 200 resultados de {filteredPositions.length}. Usá los filtros para refinar la búsqueda.
                                                    </td>
                                                </tr>
                                            )}
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
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                            <Input label="Código de Posición" value={newPosForm.codigo} onChange={v => setNewPosForm(p => ({...p, codigo: v}))} placeholder="Ej: A-01-01" />
                            <Input label="m³" type="number" value={newPosForm.metrosCubicos} onChange={v => setNewPosForm(p => ({...p, metrosCubicos: v}))} placeholder="0.0" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>Tipo / Categoría</label>
                                <select 
                                    value={newPosForm.categoria} 
                                    onChange={e => setNewPosForm(p => ({...p, categoria: e.target.value}))}
                                    style={{ width: '100%', background: '#0f1117', border: '1px solid #374151', borderRadius: '8px', padding: '8px 10px', color: '#f3f4f6', fontSize: '13px', outline: 'none' }}
                                >
                                    <option value="STOCK">Stock General</option>
                                    <option value="PICKING">Picking</option>
                                    <option value="PASILLO">Pasillo</option>
                                    <option value="ENTRADA">Entrada / Recepción</option>
                                    <option value="CUARENTENA">Cuarentena</option>
                                    <option value="EXTERNO">Externo</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>Cat. Inicial (Opcional)</label>
                                <select 
                                    value={newPosForm.categoria_item_primario} 
                                    onChange={e => setNewPosForm(p => ({...p, categoria_item_primario: e.target.value}))}
                                    style={{ width: '100%', background: '#0f1117', border: '1px solid #374151', borderRadius: '8px', padding: '8px 10px', color: '#f3f4f6', fontSize: '13px', outline: 'none' }}
                                >
                                    <option value="">— Ninguna —</option>
                                    {itemCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #1e2133', paddingTop: '16px' }}>
                            <Btn variant="secondary" onClick={() => setShowNewPosition(null)}>Cancelar</Btn>
                            <Btn onClick={async () => {
                                if (!showNewPosition || !newPosForm.codigo) return;
                                try {
                                    const restrictions = newPosForm.categoria_item_primario 
                                        ? [{ type: 'CATEGORY', value: newPosForm.categoria_item_primario }] 
                                        : [];
                                    await createPosition({ 
                                        depotId: showNewPosition, 
                                        data: { 
                                            codigo: newPosForm.codigo,
                                            categoria: newPosForm.categoria,
                                            restrictions,
                                            metrosCubicos: newPosForm.metrosCubicos ? parseFloat(newPosForm.metrosCubicos) : undefined 
                                        } 
                                    }).unwrap();
                                    setShowNewPosition(null);
                                    setNewPosForm({ codigo: '', categoria: 'STOCK', categoria_item_primario: '', categoria_item_secundario: '', metrosCubicos: '' });
                                    refetch();
                                } catch (e) { console.error(e); }
                            }}>Crear Posición</Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}