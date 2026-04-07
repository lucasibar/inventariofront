import { useState } from 'react';
import { 
    useGetAlertsQuery, 
    useGetCombosQuery, 
    useCreateComboMutation, 
    useDeleteComboMutation,
    useGetComboBreakdownQuery
} from '../features/stock/api/stock.api';
import { useGetPartnersQuery } from '../features/partners/api/partners.api';
import { useGetItemsQuery } from '../features/items/api/items.api';
import { PageHeader, Card, Badge, Btn, Modal, Table, Spinner, Input, Select } from './common/ui';

export default function DashboardComprasPage() {
    const { data: combos = [], isLoading: loadingCombos } = useGetCombosQuery();
    const { data: alerts = [] } = useGetAlertsQuery();
    const { data: partners = [] } = useGetPartnersQuery({ type: 'SUPPLIER' });
    const { data: items = [] } = useGetItemsQuery({});
    
    const [createCombo] = useCreateComboMutation();
    const [deleteCombo] = useDeleteComboMutation();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBreakdownId, setShowBreakdownId] = useState<string | null>(null);
    
    // Create Combo State
    const [newCombo, setNewCombo] = useState({ title: '', supplierId: '', itemIds: [] as string[] });
    const [materialSearch, setMaterialSearch] = useState('');

    const filteredItems = items.filter(i => 
        i.descripcion.toLowerCase().includes(materialSearch.toLowerCase()) ||
        i.codigoInterno.toLowerCase().includes(materialSearch.toLowerCase())
    );

    const handleCreate = async () => {
        if (!newCombo.title || newCombo.itemIds.length === 0) return;
        await createCombo({
            title: newCombo.title,
            supplierId: newCombo.supplierId || null,
            itemIds: newCombo.itemIds
        });
        setShowCreateModal(false);
        setNewCombo({ title: '', supplierId: '', itemIds: [] });
        setMaterialSearch('');
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('¿Eliminar este combo?')) {
            await deleteCombo(id);
        }
    };

    return (
        <div className="dashboard-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <style>{`
                .combos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; margin-bottom: 40px; }
                .combo-card { 
                    cursor: pointer; transition: transform 0.2s, border-color 0.2s; 
                    position: relative; padding: 20px; display: flex; flex-direction: column; gap: 14px;
                }
                .combo-card:hover { transform: translateY(-4px); border-color: #6366f1; }
                .delete-btn { position: absolute; top: 12px; right: 12px; opacity: 0; transition: opacity 0.2s; }
                .combo-card:hover .delete-btn { opacity: 1; }
                
                .item-chip { 
                    display: inline-flex; align-items: center; gap: 6px; background: #0f1117; 
                    border: 1px solid #374151; border-radius: 6px; padding: 4px 8px; font-size: 11px; color: #d1d5db;
                }
                .item-chip button { background: none; border: none; color: #ef4444; cursor: pointer; padding: 0 2px; }

                .search-mini {
                    background: #111827; border: 1px solid #374151; border-radius: 6px; padding: 6px 12px; color: white; font-size: 13px; width: 100%; box-sizing: border-box; outline: none; margin-bottom: 10px;
                }
                .search-mini:focus { border-color: #6366f1; }
            `}</style>

            <PageHeader title="Dashboard de Compras" subtitle="Control de stock por combos y materiales críticos">
                <Btn onClick={() => setShowCreateModal(true)}>+ Nuevo Combo</Btn>
            </PageHeader>

            <h3 style={{ color: '#f3f4f6', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>📦 Mis Combos</h3>
            
            {loadingCombos ? <Spinner /> : (
                <div className="combos-grid">
                    {combos.length === 0 && (
                        <p style={{ color: '#6b7280', gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
                            No has creado ningún combo de compra todavía.
                        </p>
                    )}
                    {combos.map((combo: any) => (
                        <Card key={combo.id} className="combo-card" style={{ cursor: 'pointer' }} onClick={() => setShowBreakdownId(combo.id)}>
                            <button className="delete-btn" onClick={(e) => handleDelete(combo.id, e)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '14px', cursor: 'pointer', zIndex: 10 }}>✕</button>
                            
                            <div>
                                <h4 style={{ color: '#f3f4f6', fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>{combo.title}</h4>
                                {combo.supplier && <span style={{ color: '#6366f1', fontSize: '12px', fontWeight: 600 }}>{combo.supplier.name}</span>}
                            </div>

                            <div style={{ 
                                background: combo.deficit > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(99, 102, 241, 0.05)', 
                                borderRadius: '12px', padding: '16px', textAlign: 'center', 
                                border: `1px solid ${combo.deficit > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.1)'}` 
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                                    <div>
                                        <span style={{ color: '#9ca3af', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>{combo.unitLabel || 'Principal'}</span>
                                        <span style={{ color: combo.deficit > 0 ? '#f87171' : '#34d399', fontSize: '18px', fontWeight: 800 }}>{Number(combo.totalStock || 0).toFixed(1)}</span>
                                    </div>
                                    <div style={{ borderLeft: '1px solid #2a2d3e' }}>
                                        <span style={{ color: '#9ca3af', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>{combo.secondaryUnitLabel || 'Secundario'}</span>
                                        <span style={{ color: '#d1d5db', fontSize: '18px', fontWeight: 800 }}>{Number(combo.totalSecondaryStock || 0).toFixed(0)}</span>
                                    </div>
                                </div>
                                <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#6b7280', fontSize: '11px' }}>Mínimo Sugerido: {Number(combo.totalMinStock || 0).toFixed(1)} {combo.unitLabel}</span>
                                    {combo.deficit > 0 && (
                                        <div style={{ marginTop: '4px' }}>
                                            <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700 }}>⚠️ Sugerido de Compra: {Number(combo.deficit).toFixed(1)} {combo.unitLabel}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ color: '#6b7280', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{combo.itemIds.length} materiales</span>
                                <span style={{ color: '#6366f1' }}>Ver detalles →</span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid #1e2133', margin: '40px 0' }} />

            <h3 style={{ color: '#f3f4f6', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>⚠️ Alertas de Reposición (Materiales Críticos)</h3>
            {alerts.length > 0 ? (
                <Card style={{ padding: '0' }}>
                    <Table 
                        cols={['Material', 'Código', 'Stock Actual', 'Mínimo', 'Déficit']}
                        rows={alerts.map(a => [
                            <strong style={{ color: '#f3f4f6' }}>{a.descripcion}</strong>,
                            <code>{a.codigoInterno}</code>,
                            <span style={{ color: '#f87171', fontWeight: 600 }}>{Number(a.stockActual).toFixed(1)} kg</span>,
                            <span style={{ color: '#6b7280' }}>{Number(a.stockMinimo).toFixed(1)} kg</span>,
                            <Badge color="#ef4444">{Number(a.deficit).toFixed(1)} kg faltantes</Badge>
                        ])}
                    />
                </Card>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(52, 211, 153, 0.05)', borderRadius: '12px', border: '1px dashed rgba(52, 211, 153, 0.3)' }}>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>Todo en orden.</span>
                    <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0 0' }}>No hay materiales por debajo del stock mínimo.</p>
                </div>
            )}

            {/* Create Combo Modal */}
            {showCreateModal && (
                <Modal title="Nuevo Combo de Compra" onClose={() => setShowCreateModal(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <Input label="Título del Combo" value={newCombo.title} onChange={(v) => setNewCombo({ ...newCombo, title: v })} placeholder="Ej: Algodones, Hilos 40/2, Elásticos..." />
                        
                        <Select 
                            label="Proveedor Asociado (Ayuda visual)" 
                            value={newCombo.supplierId || ''} 
                            onChange={(v) => setNewCombo({ ...newCombo, supplierId: v })}
                            options={[{ value: '', label: 'Cualquier proveedor / Mixto' }, ...partners.map(p => ({ value: p.id, label: p.name }))]}
                        />

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 500 }}>Seleccionar Materiales</label>
                                <span style={{ color: '#6366f1', fontSize: '11px' }}>{newCombo.itemIds.length} seleccionados</span>
                            </div>
                            
                            <input 
                                type="text" 
                                className="search-mini" 
                                placeholder="Filtrar materiales por nombre o código..." 
                                value={materialSearch}
                                onChange={e => setMaterialSearch(e.target.value)}
                            />

                            <div style={{ maxHeight: '200px', overflow: 'auto', background: '#0f1117', borderRadius: '8px', border: '1px solid #374151', padding: '10px' }}>
                                {filteredItems.map(item => (
                                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid #1e2133', cursor: 'pointer', color: '#d1d5db', fontSize: '13px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={newCombo.itemIds.includes(item.id)}
                                            onChange={(e) => {
                                                const ids = e.target.checked 
                                                    ? [...newCombo.itemIds, item.id]
                                                    : newCombo.itemIds.filter(id => id !== item.id);
                                                setNewCombo({ ...newCombo, itemIds: ids });
                                            }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 500 }}>{item.descripcion}</div>
                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>{item.codigoInterno} • {item.unidadPrincipal}</div>
                                        </div>
                                    </label>
                                ))}
                                {filteredItems.length === 0 && <p style={{ color: '#4b5563', textAlign: 'center', padding: '10px', fontSize: '12px' }}>No se encontraron materiales.</p>}
                            </div>
                            
                            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {newCombo.itemIds.map(id => {
                                    const item = items.find(i => i.id === id);
                                    return (
                                        <span key={id} className="item-chip">
                                            {item?.codigoInterno}
                                            <button onClick={() => setNewCombo({ ...newCombo, itemIds: newCombo.itemIds.filter(x => x !== id) })}>✕</button>
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                            <Btn onClick={handleCreate} style={{ flex: 1 }} disabled={!newCombo.title || newCombo.itemIds.length === 0}>Generar Combo</Btn>
                            <Btn variant="secondary" onClick={() => setShowCreateModal(false)}>Cancelar</Btn>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Breakdown Modal */}
            {showBreakdownId && (
                <BreakdownModal id={showBreakdownId} onClose={() => setShowBreakdownId(null)} />
            )}
        </div>
    );
}

function BreakdownModal({ id, onClose }: { id: string, onClose: () => void }) {
    const { data: breakdown = [], isLoading } = useGetComboBreakdownQuery(id);

    return (
        <Modal title="Desglose de Stock por Material" onClose={onClose} wide>
            {isLoading ? <Spinner /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {breakdown.map((item: any) => (
                        <div key={item.itemId} style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '12px', padding: '16px', border: '1px solid #2a2d3e' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #2a2d3e', paddingBottom: '10px' }}>
                                <div>
                                    <h4 style={{ color: '#f3f4f6', fontSize: '15px', fontWeight: 700, margin: 0 }}>{item.description}</h4>
                                    <code style={{ fontWeight: 400, fontSize: '12px', color: '#6b7280' }}>{item.code}</code>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: '#34d399', fontWeight: 700, fontSize: '16px' }}>{Number(item.total).toFixed(1)} <small>{item.unitLabel}</small></div>
                                    <div style={{ color: '#9ca3af', fontSize: '13px' }}>{Number(item.totalSecondary).toFixed(0)} <small>{item.secondaryUnitLabel}</small></div>
                                </div>
                            </div>
                            <Table 
                                cols={['Partida/Lote', 'Depósito', 'Posición', 'Stock Princ.', 'Secundario']}
                                rows={item.batches.map((b: any) => [
                                    <code style={{ color: '#a5b4fc', fontSize: '13px' }}>{b.lotNumber}</code>,
                                    b.depot,
                                    b.position,
                                    <strong style={{ color: '#f3f4f6' }}>{Number(b.qty).toFixed(1)} {item.unitLabel}</strong>,
                                    <span style={{ color: '#9ca3af' }}>{Number(b.qtySecondary).toFixed(0)} {item.secondaryUnitLabel}</span>
                                ]).sort((a: any, b: any) => String(b[0]).localeCompare(String(a[0])))}
                            />
                        </div>
                    ))}
                    {breakdown.length === 0 && <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>No se encontró stock físico para los materiales de este combo.</p>}
                    <Btn variant="secondary" onClick={onClose} style={{ alignSelf: 'flex-end' }}>Cerrar Vista</Btn>
                </div>
            )}
        </Modal>
    );
}
