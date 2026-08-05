import { useState, useMemo } from 'react';
import { Modal, Btn } from '../../shared/ui';

export function EditComboModal({ combo, items, onClose, onSave }: any) {
    const [selectedIds, setSelectedIds] = useState<string[]>(combo?.itemIds || []);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    if (!combo) return null;

    const filtered = useMemo(() => {
        const searchWords = search.toLowerCase().split(' ').filter(w => w.length > 0);
        return items.filter((i: any) => {
            if (searchWords.length === 0) return true;
            return searchWords.every(word => {
                const desc = (i.descripcion || '').toLowerCase();
                const code = (i.codigoInterno || '').toLowerCase();
                const supplier = (i.supplier?.name || i.supplierName || '').toLowerCase();
                const category = (i.category?.nombre || i.categoria || '').toLowerCase();
                return desc.includes(word) || code.includes(word) || supplier.includes(word) || category.includes(word);
            });
        });
    }, [items, search]);

    return (
        <Modal title={`Configurar Grupo — ${combo.title}`} onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input 
                    type="text" 
                    className="search-mini" 
                    placeholder="Buscar por descripción, código o proveedor..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                />
                
                {selectedIds.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto', padding: '10px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
                        {items.filter((i: any) => selectedIds.includes(i.id)).map((item: any) => (
                            <span key={item.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                                {item.descripcion} ({item.codigoInterno})
                                <button 
                                    type="button"
                                    onClick={() => setSelectedIds(selectedIds.filter(id => id !== item.id))}
                                    style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', fontWeight: 'bold', padding: 0, display: 'flex', alignItems: 'center', fontSize: '10px' }}
                                >
                                    ✕
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                <div style={{ maxHeight: '300px', overflow: 'auto', background: 'var(--bg-secondary, #111827)', borderRadius: '8px', padding: '10px', border: '1px solid var(--border-strong, #374151)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '30px 2fr 1fr 1.5fr', padding: '8px 0', borderBottom: '1px solid var(--border-strong, #374151)', fontSize: '11px', color: 'var(--text-muted, #9ca3af)', fontWeight: 'bold', position: 'sticky', top: 0, background: 'var(--bg-secondary, #111827)', zIndex: 1 }}>
                        <div></div>
                        <div>Descripción</div>
                        <div>Código</div>
                        <div>Proveedor</div>
                    </div>
                    {filtered.map((item: any) => (
                        <label key={item.id} style={{ display: 'grid', gridTemplateColumns: '30px 2fr 1fr 1.5fr', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle, #1e2133)', color: 'var(--text-secondary, #d1d5db)', cursor: 'pointer', fontSize: '12px' }}>
                            <input 
                                type="checkbox" 
                                checked={selectedIds.includes(item.id)} 
                                onChange={e => e.target.checked ? setSelectedIds([...selectedIds, item.id]) : setSelectedIds(selectedIds.filter(id => id !== item.id))} 
                                style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                            />
                            <div style={{ paddingRight: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.descripcion}>{item.descripcion}</div>
                            <div style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{item.codigoInterno}</div>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted, #9ca3af)' }} title={item.supplier?.name || item.supplierName || '—'}>{item.supplier?.name || item.supplierName || '—'}</div>
                        </label>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
                    <Btn onClick={async () => { setSaving(true); await onSave(selectedIds); setSaving(false); }} disabled={saving}>Guardar</Btn>
                </div>
            </div>
        </Modal>
    );
}
