import { useState, useMemo } from 'react';
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
    const { data: items = [] } = useGetItemsQuery();
    
    const [createCombo] = useCreateComboMutation();
    const [deleteCombo] = useDeleteComboMutation();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBreakdownId, setShowBreakdownId] = useState<string | null>(null);
    
    // Create Combo State
    const [newCombo, setNewCombo] = useState({ title: '', supplierId: '', itemIds: [] as string[] });

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

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('¿Eliminar este combo?')) {
            await deleteCombo(id);
        }
    };

    return (
        <div className="dashboard-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <style>{`
                .combos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px; }
                .combo-card { 
                    cursor: pointer; transition: transform 0.2s, border-color 0.2s; 
                    position: relative; padding: 20px; display: flex; flex-direction: column; gap: 12px;
                }
                .combo-card:hover { transform: translateY(-4px); border-color: #6366f1; }
                .delete-btn { position: absolute; top: 12px; right: 12px; opacity: 0; transition: opacity 0.2s; }
                .combo-card:hover .delete-btn { opacity: 1; }
                
                .item-chip { 
                    display: inline-flex; align-items: center; gap: 6px; background: #0f1117; 
                    border: 1px solid #374151; border-radius: 6px; padding: 4px 8px; font-size: 11px; color: #d1d5db;
                }
                .item-chip button { background: none; border: none; color: #ef4444; cursor: pointer; padding: 0 2px; }
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
                            <button className="delete-btn" onClick={(e) => handleDelete(combo.id, e)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '14px' }}>✕</button>
                            
                            <div>
                                <h4 style={{ color: '#f3f4f6', fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>{combo.title}</h4>
                                {combo.supplier && <span style={{ color: '#6366f1', fontSize: '12px', fontWeight: 600 }}>{combo.supplier.name}</span>}
                            </div>

                            <div style={{ background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                                <span style={{ color: '#d1d5db', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Total de Kilos en Stock</span>
                                <span style={{ color: '#34d399', fontSize: '28px', fontWeight: 800 }}>{Number(combo.totalStock || 0).toFixed(1)} <small style={{ fontSize: '14px' }}>kg</small></span>
                            </div>

                            <div style={{ color: '#6b7280', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{combo.itemIds.length} materiales</span>
                                <span style={{ color: '#6366f1' }}>Ver desglose →</span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid #1e2133', margin: '40px 0' }} />

            <h3 style={{ color: '#f3f4f6', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>⚠️ Alertas de Reposición</h3>
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
                        <Input label="Título del Combo (ej: Algodón Blanco)" value={newCombo.title} onChange={(v) => setNewCombo({ ...newCombo, title: v })} placeholder="Asigna un nombre..." />
                        
                        <Select 
                            label="Proveedor (opcional)" 
                            value={newCombo.supplierId || ''} 
                            onChange={(v) => setNewCombo({ ...newCombo, supplierId: v })}
                            options={[{ value: '', label: 'Cualquier proveedor' }, ...partners.map(p => ({ value: p.id, label: p.name }))]}
                        />

                        <div>
                            <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>Seleccionar Materiales</label>
                            <div style={{ maxHeight: '200px', overflow: 'auto', background: '#0f1117', borderRadius: '8px', border: '1px solid #374151', padding: '10px' }}>
                                {items.map(item => (
                                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #1e2133', cursor: 'pointer', color: '#d1d5db', fontSize: '13px' }}>
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
                                        <span>{item.descripcion} <code style={{ fontSize: '11px', color: '#6b7280' }}>({item.codigoInterno})</code></span>
                                    </label>
                                ))}
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
                            <Btn onClick={handleCreate} style={{ flex: 1 }} disabled={!newCombo.title || newCombo.itemIds.length === 0}>Crear Combo</Btn>
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
        <Modal title="Desglose por Partidas" onClose={onClose} wide>
            {isLoading ? <Spinner /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {breakdown.map((item: any) => (
                        <div key={item.itemId}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px', borderBottom: '1px solid #2a2d3e', paddingBottom: '8px' }}>
                                <h4 style={{ color: '#f3f4f6', fontSize: '15px', fontWeight: 700, margin: 0 }}>
                                    {item.description} <code style={{ fontWeight: 400, fontSize: '12px', marginLeft: '8px', color: '#6b7280' }}>{item.code}</code>
                                </h4>
                                <span style={{ color: '#34d399', fontWeight: 700 }}>{Number(item.total).toFixed(1)} kg</span>
                            </div>
                            <Table 
                                cols={['Partida/Lote', 'Depósito', 'Posición', 'Cantidad']}
                                rows={item.batches.map((b: any) => [
                                    <code style={{ color: '#a5b4fc', fontSize: '13px' }}>{b.lotNumber}</code>,
                                    b.depot,
                                    b.position,
                                    <strong>{Number(b.qty).toFixed(1)} kg</strong>
                                ]).sort((a: any, b: any) => b[0] - a[0])}
                            />
                        </div>
                    ))}
                    {breakdown.length === 0 && <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>No hay stock disponible para los materiales de este combo.</p>}
                    <Btn variant="secondary" onClick={onClose} style={{ alignSelf: 'flex-end' }}>Cerrar</Btn>
                </div>
            )}
        </Modal>
    );
}
