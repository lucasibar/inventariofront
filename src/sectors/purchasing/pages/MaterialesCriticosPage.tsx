import { useState, useMemo, useEffect } from 'react';
import { 
    useGetCombosQuery, 
    useCreateComboMutation, 
    useDeleteComboMutation,
    useGetComboBreakdownQuery,
    useUpdateComboMutation,
} from '../../warehouse/stock/api/stock.api';
import { useGetStockQuery } from '../../warehouse/stock/api/stock.api';
import { useGetPartnersQuery } from '../../config/partners/api/partners.api';
import { useGetItemsQuery } from '../../config/items/api/items.api';
import { PageHeader, Card, Badge, Btn, Modal, Table, Spinner, Input, Select, ActionMenu, useIsMobile } from '../../../shared/ui';

export default function MaterialesCriticosPage() {
    const isMobile = useIsMobile();
    const { data: combos = [], isLoading: loadingCombos } = useGetCombosQuery();
    const { data: partners = [] } = useGetPartnersQuery({ type: 'SUPPLIER' });
    const { data: items = [] } = useGetItemsQuery({});
    const { data: allStock = [] } = useGetStockQuery({});

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBreakdownId, setShowBreakdownId] = useState<string | null>(null);
    const [editComboId, setEditComboId] = useState<string | null>(null);
    const [comboSearch, setComboSearch] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(isMobile ? 'list' : 'grid');
    
    const [newCombo, setNewCombo] = useState({ title: '', supplierId: '', itemIds: [] as string[] });
    const [materialSearch, setMaterialSearch] = useState('');

    const [createCombo] = useCreateComboMutation();
    const [deleteCombo] = useDeleteComboMutation();
    const [updateCombo] = useUpdateComboMutation();

    const filteredCombos = useMemo(() => {
        return combos
            .filter((c: any) => c.title.toLowerCase().includes(comboSearch.toLowerCase()))
            .sort((a: any, b: any) => {
                if (a.deficit > 0 && b.deficit <= 0) return -1;
                if (a.deficit <= 0 && b.deficit > 0) return 1;
                if (a.daysOfSupply !== null && b.daysOfSupply !== null) return a.daysOfSupply - b.daysOfSupply;
                return 0;
            });
    }, [combos, comboSearch]);

    const filteredItems = items.filter(i => {
        const matchesSearch = 
            i.descripcion.toLowerCase().includes(materialSearch.toLowerCase()) ||
            i.codigoInterno.toLowerCase().includes(materialSearch.toLowerCase());
        const matchesSupplier = !newCombo.supplierId || i.supplierId === newCombo.supplierId;
        return matchesSearch && matchesSupplier;
    });

    const handleCreate = async () => {
        if (!newCombo.title || newCombo.itemIds.length === 0) return;
        await createCombo({
            title: newCombo.title,
            supplierId: newCombo.supplierId || null,
            itemIds: newCombo.itemIds
        });
        setShowCreateModal(false);
        setNewCombo({ title: '', supplierId: '', itemIds: [] });
    };

    const exportToExcel = () => {
        if (allStock.length === 0) return;
        const headers = ['Material', 'Código', 'Categoría', 'Proveedor', 'Partida', 'Stock', 'Unidad'];
        const rows = allStock.map((row: any) => [
            row.batch?.item?.descripcion || '',
            row.batch?.item?.codigoInterno || '',
            row.batch?.item?.category?.nombre || '',
            row.batch?.supplier?.name || '',
            row.batch?.lotNumber || '',
            Number(row.qtyPrincipal || 0).toFixed(2),
            row.batch?.item?.unidadPrincipal || '',
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `stock_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="dashboard-container" style={{ padding: isMobile ? '12px' : '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <style>{`
                .combos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
                .combo-card { 
                    background: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 20px;
                    display: flex; flex-direction: column; gap: 16px; transition: transform 0.2s, border-color 0.2s;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }
                .combo-card:hover { transform: translateY(-2px); border-color: #6366f1; }
                
                .mobile-combo-row {
                    background: #1f2937; border: 1px solid #374151; border-radius: 8px; padding: 12px 16px;
                    display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
                    cursor: pointer;
                }
                .mobile-combo-row:active { background: #374151; }

                .metric-row { display: flex; align-items: center; gap: 12px; color: #d1d5db; }
                .metric-icon { font-size: 18px; width: 24px; text-align: center; }
                .metric-value { font-size: 18px; font-weight: 700; color: #fff; }
                .metric-label { font-size: 12px; color: #9ca3af; margin-left: auto; }
                .editable-title { background: transparent; border: none; color: #fff; font-size: 18px; font-weight: 700; outline: none; width: 100%; border-bottom: 1px dashed transparent; }
                .editable-title:hover, .editable-title:focus { border-bottom-color: #6366f1; }
                .search-mini { background: #111827; border: 1px solid #374151; border-radius: 6px; padding: 8px 12px; color: white; width: 100%; box-sizing: border-box; outline: none; margin-bottom: 12px; }
            `}</style>

            <PageHeader title="Materiales Críticos" subtitle="Control de stock y reposición" hideTitleOnMobile>
                {!isMobile && <Btn variant="secondary" onClick={exportToExcel}>⬇️ Exportar CSV</Btn>}
                <Btn onClick={() => setShowCreateModal(true)} small={isMobile}>+ Nuevo Combo</Btn>
            </PageHeader>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '16px' : '24px' }}>
                <h3 style={{ color: '#f3f4f6', fontSize: isMobile ? '16px' : '18px', fontWeight: 600, margin: 0 }}>📦 Mis Combos</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {!isMobile && <Input placeholder="Buscar combo..." value={comboSearch} onChange={setComboSearch} style={{ width: '250px' }} />}
                    <Btn variant="secondary" small onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
                        {viewMode === 'grid' ? '📋' : '🔲'}
                    </Btn>
                </div>
            </div>

            {isMobile && <Input placeholder="Buscar..." value={comboSearch} onChange={setComboSearch} style={{ marginBottom: '16px' }} />}
            
            {loadingCombos ? <Spinner /> : (
                <>
                    {isMobile ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {filteredCombos.map((combo: any) => (
                                <MobileComboRow 
                                    key={combo.id} 
                                    combo={combo} 
                                    onClick={() => setShowBreakdownId(combo.id)} 
                                />
                            ))}
                        </div>
                    ) : (
                        viewMode === 'grid' ? (
                            <div className="combos-grid">
                                {filteredCombos.map((combo: any) => (
                                    <ComboCard 
                                        key={combo.id} 
                                        combo={combo} 
                                        onClick={() => setShowBreakdownId(combo.id)}
                                        onUpdateTitle={(title: string) => updateCombo({ id: combo.id, title })}
                                        onEdit={() => setEditComboId(combo.id)}
                                        onDelete={() => { if (window.confirm('¿Eliminar combo?')) deleteCombo(combo.id); }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <Card style={{ padding: '0' }}>
                                <Table 
                                    cols={['Combo', 'Proveedor', 'Stock Total', 'Pendiente PO', 'Sustento', 'Acciones']}
                                    rows={filteredCombos.map((combo: any) => [
                                        <strong key="t" onClick={() => setShowBreakdownId(combo.id)} style={{ cursor: 'pointer' }}>{combo.title}</strong>,
                                        combo.supplier?.name || 'Mixto',
                                        `${Number(combo.totalStock || 0).toFixed(1)} ${combo.unitLabel}`,
                                        <span key="p" style={{ color: combo.pendingStock > 0 ? '#f59e0b' : '#6b7280' }}>{Number(combo.pendingStock || 0).toFixed(1)} {combo.unitLabel}</span>,
                                        <span key="s" style={{ color: combo.daysOfSupply < 15 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{combo.daysOfSupply !== null ? `~ ${Math.ceil(combo.daysOfSupply)} días` : 'N/A'}</span>,
                                        <ActionMenu key="a" options={[
                                            { label: 'Detalle', icon: '🔍', onClick: () => setShowBreakdownId(combo.id) },
                                            { label: 'Editar', icon: '✏️', onClick: () => setEditComboId(combo.id) },
                                            { label: 'Eliminar', icon: '🗑️', color: '#ef4444', onClick: () => { if (window.confirm('¿Eliminar?')) deleteCombo(combo.id); } }
                                        ]} />
                                    ])}
                                />
                            </Card>
                        )
                    )}
                </>
            )}

            {showCreateModal && (
                <Modal title="Nuevo Combo" onClose={() => setShowCreateModal(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <Input label="Título" value={newCombo.title} onChange={v => setNewCombo({...newCombo, title: v})} />
                        <Select label="Proveedor (Opcional)" value={newCombo.supplierId} onChange={v => setNewCombo({...newCombo, supplierId: v})} options={[{value: '', label: 'Cualquier proveedor'}, ...partners.map(p => ({value: p.id, label: p.name}))]} />
                        <Input label="Buscar Materiales" value={materialSearch} onChange={setMaterialSearch} />
                        <div style={{ maxHeight: '200px', overflow: 'auto', background: '#111827', borderRadius: '8px', padding: '10px' }}>
                            {filteredItems.map(item => (
                                <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', color: '#d1d5db', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={newCombo.itemIds.includes(item.id)} onChange={e => {
                                        const ids = e.target.checked ? [...newCombo.itemIds, item.id] : newCombo.itemIds.filter(id => id !== item.id);
                                        setNewCombo({...newCombo, itemIds: ids});
                                    }} />
                                    {item.descripcion} ({item.codigoInterno})
                                </label>
                            ))}
                        </div>
                        <Btn onClick={handleCreate} disabled={!newCombo.title || newCombo.itemIds.length === 0}>Crear Combo</Btn>
                    </div>
                </Modal>
            )}

            {showBreakdownId && <BreakdownModal id={showBreakdownId} onClose={() => setShowBreakdownId(null)} />}
            {editComboId && <EditComboModal combo={combos.find((c: any) => c.id === editComboId)} items={items} onClose={() => setEditComboId(null)} onSave={async (ids: string[]) => { await updateCombo({ id: editComboId, itemIds: ids }); setEditComboId(null); }} />}
        </div>
    );
}

function MobileComboRow({ combo, onClick }: any) {
    return (
        <div className="mobile-combo-row" onClick={onClick}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#f3f4f6', fontWeight: 700, fontSize: '15px' }}>{combo.title}</span>
                <span style={{ color: '#6b7280', fontSize: '11px' }}>{combo.supplier?.name || 'Varios Proveedores'}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ color: combo.daysOfSupply < 15 ? '#ef4444' : '#10b981', fontWeight: 800, fontSize: '16px' }}>
                    {Number(combo.totalStock || 0).toLocaleString()} <small style={{ fontSize: '10px' }}>{combo.unitLabel}</small>
                </div>
                <div style={{ fontSize: '10px', color: '#9ca3af' }}>{combo.daysOfSupply !== null ? `${Math.ceil(combo.daysOfSupply)} días` : '---'}</div>
            </div>
        </div>
    );
}

function ComboCard({ combo, onClick, onUpdateTitle, onEdit, onDelete }: any) {
    const [title, setTitle] = useState(combo.title);
    useEffect(() => setTitle(combo.title), [combo.title]);

    return (
        <div className="combo-card" onClick={onClick}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '20px' }}>🧵</span>
                        <input 
                            className="editable-title" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)}
                            onBlur={() => title !== combo.title && onUpdateTitle(title)}
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {combo.supplier && <Badge color="#6366f1">{combo.supplier.name}</Badge>}
                        <Badge color="#4b5563">{combo.itemIds?.length || 0} ITEMS</Badge>
                    </div>
                </div>
                <ActionMenu options={[
                    { label: 'Ver Detalle', icon: '🔍', onClick: () => onClick() },
                    { label: 'Editar Materiales', icon: '✏️', onClick: () => onEdit() },
                    { label: 'Eliminar Combo', icon: '🗑️', color: '#ef4444', onClick: () => onDelete() }
                ]} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="metric-row">
                    <span className="metric-icon">⚖️</span>
                    <span className="metric-value">{Number(combo.totalStock || 0).toLocaleString()}</span>
                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>{combo.unitLabel}</span>
                    <span className="metric-label">STOCK TOTAL</span>
                </div>
                <div className="metric-row">
                    <span className="metric-icon">📦</span>
                    <span className="metric-value">{Number(combo.totalSecondaryStock || 0).toLocaleString()}</span>
                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>{combo.secondaryUnitLabel}</span>
                    <span className="metric-label">UNIDADES</span>
                </div>
                <div className="metric-row">
                    <span className="metric-icon" style={{ color: '#f59e0b' }}>🛒</span>
                    <span className="metric-value" style={{ color: '#f59e0b' }}>{Number(combo.pendingStock || 0).toLocaleString()}</span>
                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>{combo.unitLabel}</span>
                    <span className="metric-label">PEDIDO</span>
                </div>
                <div className="metric-row">
                    <span className="metric-icon" style={{ color: '#10b981' }}>🚚</span>
                    <span className="metric-value" style={{ color: '#10b981' }}>
                        {combo.incomingDate ? new Date(combo.incomingDate).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '--/--'}
                    </span>
                    <span className="metric-label">LLEGADA APROX.</span>
                </div>
            </div>

            <div style={{ marginTop: 'auto', borderTop: '1px solid #374151', paddingTop: '12px', textAlign: 'center' }}>
                <span style={{ 
                    fontSize: '14px', fontWeight: 600, 
                    color: combo.daysOfSupply < 15 ? '#ef4444' : combo.daysOfSupply > 60 ? '#10b981' : '#f59e0b'
                }}>
                    {combo.daysOfSupply !== null ? `~ ${Math.ceil(combo.daysOfSupply)} días de sustento` : 'Sin historial de consumo'}
                </span>
            </div>
        </div>
    );
}

function BreakdownModal({ id, onClose }: { id: string, onClose: () => void }) {
    const isMobile = useIsMobile();
    const { data: breakdown = [], isLoading } = useGetComboBreakdownQuery(id);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    return (
        <Modal title={isMobile ? "Detalle" : "Desglose de Stock"} onClose={onClose} wide={!isMobile}>
            {isLoading ? <Spinner /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {breakdown.map((item: any) => (
                        <div key={item.itemId} style={{ background: '#1f2937', borderRadius: '10px', border: '1px solid #374151', overflow: 'hidden' }}>
                            <div 
                                style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: expandedItem === item.itemId ? '#374151' : 'transparent' }}
                                onClick={() => setExpandedItem(expandedItem === item.itemId ? null : item.itemId)}
                            >
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ color: '#fff', fontSize: '14px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</h4>
                                    <code style={{ fontSize: '11px', color: '#9ca3af' }}>{item.code}</code>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '20px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: '#10b981', fontWeight: 700, fontSize: isMobile ? '14px' : '16px' }}>{Number(item.total).toFixed(1)} {item.unitLabel}</div>
                                        {!isMobile && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{Number(item.totalSecondary).toFixed(0)} {item.secondaryUnitLabel}</div>}
                                    </div>
                                    <span style={{ fontSize: '10px', transition: 'transform 0.2s', transform: expandedItem === item.itemId ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                                </div>
                            </div>
                            
                            {expandedItem === item.itemId && (
                                <div style={{ padding: isMobile ? '0' : '0 16px 16px', background: 'rgba(0,0,0,0.2)' }}>
                                    <Table 
                                        cols={['Partida/Lote', 'Stock Acumulado']}
                                        rows={item.batches.map((b: any) => [
                                            <strong key="l" style={{ color: '#f3f4f6' }}>{b.lotNumber}</strong>,
                                            <span key="q" style={{ color: '#fff', fontWeight: 600 }}>{b.qty.toFixed(1)} {item.unitLabel}</span>
                                        ])}
                                    />
                                    {item.pendingStock > 0 && (
                                        <div style={{ margin: '12px', padding: '10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px' }}>
                                            <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>🛒 Pedido: {item.pendingStock.toFixed(1)}</span>
                                            {item.incomingDate && <div style={{ fontSize: '10px', color: '#d97706' }}>Entrega: {new Date(item.incomingDate).toLocaleDateString()}</div>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}

function EditComboModal({ combo, items, onClose, onSave }: any) {
    const [selectedIds, setSelectedIds] = useState<string[]>(combo?.itemIds || []);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    if (!combo) return null;
    const filtered = items.filter((i: any) => (i.descripcion.toLowerCase().includes(search.toLowerCase()) || i.codigoInterno.toLowerCase().includes(search.toLowerCase())) && (!combo.supplierId || i.supplierId === combo.supplierId));

    return (
        <Modal title={`Configurar — ${combo.title}`} onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input type="text" className="search-mini" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                <div style={{ maxHeight: '300px', overflow: 'auto', background: '#111827', borderRadius: '8px', padding: '8px' }}>
                    {filtered.map((item: any) => (
                        <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderBottom: '1px solid #1e2133', cursor: 'pointer', color: '#d1d5db' }}>
                            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={e => e.target.checked ? setSelectedIds([...selectedIds, item.id]) : setSelectedIds(selectedIds.filter(id => id !== item.id))} />
                            {item.descripcion}
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
