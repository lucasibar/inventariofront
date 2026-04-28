import { useState } from 'react';
import { 
    useGetAlertsQuery, 
    useGetCombosQuery, 
    useCreateComboMutation, 
    useDeleteComboMutation,
    useGetComboBreakdownQuery,
    useUpdateComboMutation,
} from '../../warehouse/stock/api/stock.api';
import { useGetStockQuery } from '../../warehouse/stock/api/stock.api';
import { useGetPartnersQuery } from '../../config/partners/api/partners.api';
import { useGetItemsQuery } from '../../config/items/api/items.api';
import { PageHeader, Card, Badge, Btn, Modal, Table, Spinner, Input, Select, ActionMenu, InfoTooltip } from '../../../shared/ui';

export default function DashboardComprasPage() {
    const { data: combos = [], isLoading: loadingCombos } = useGetCombosQuery();
    const { data: alerts = [] } = useGetAlertsQuery();
    const { data: partners = [] } = useGetPartnersQuery({ type: 'SUPPLIER' });
    const { data: items = [] } = useGetItemsQuery({});
    const { data: allStock = [], isFetching: fetchingStock } = useGetStockQuery({});

    const exportToExcel = () => {
        if (allStock.length === 0) return;

        const headers = ['Material', 'Código Interno', 'Categoría', 'Proveedor', 'Partida/Lote', 'Depósito', 'Posición', 'Stock Principal', 'Unidad', 'Stock Secundario', 'Unidad 2'];
        const rows = allStock.map((row: any) => [
            row.batch?.item?.descripcion || '',
            row.batch?.item?.codigoInterno || '',
            row.batch?.item?.category?.nombre || row.batch?.item?.categoria || '',
            row.batch?.supplier?.name || '',
            row.batch?.lotNumber || '',
            row.deposito?.nombre || row.depot?.nombre || '',
            row.posicion?.codigo || '',
            String(Number(row.qtyPrincipal || 0).toFixed(2)),
            row.batch?.item?.unidadPrincipal || '',
            String(Number(row.qtySecundaria || 0).toFixed(2)),
            row.batch?.item?.unidadSecundaria || '',
        ]);

        const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
        const csvContent = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `stock_completo_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };
    
    const [createCombo] = useCreateComboMutation();
    const [deleteCombo] = useDeleteComboMutation();
    const [updateCombo] = useUpdateComboMutation();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBreakdownId, setShowBreakdownId] = useState<string | null>(null);
    const [editComboId, setEditComboId] = useState<string | null>(null);
    
    // Create Combo State
    const [newCombo, setNewCombo] = useState({ title: '', supplierId: '', itemIds: [] as string[] });
    const [materialSearch, setMaterialSearch] = useState('');

    const filteredItems = items.filter(i => {
        const matchesSearch = 
            i.descripcion.toLowerCase().includes(materialSearch.toLowerCase()) ||
            i.codigoInterno.toLowerCase().includes(materialSearch.toLowerCase()) ||
            (i.supplier?.name || '').toLowerCase().includes(materialSearch.toLowerCase()) ||
            (i.category?.nombre || '').toLowerCase().includes(materialSearch.toLowerCase()) ||
            (i.categoria || '').toLowerCase().includes(materialSearch.toLowerCase());
        
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
        setMaterialSearch('');
    };

    return (
        <div className="dashboard-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <style>{`
                .combos-grid { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
                    gap: 16px; 
                    margin-bottom: 32px; 
                }
                .combo-card { 
                    cursor: pointer; 
                    transition: border-color 0.2s; 
                    position: relative; 
                    padding: 16px; 
                    display: flex; 
                    flex-direction: column; 
                    gap: 12px;
                }
                .item-chip { 
                    display: inline-flex; align-items: center; gap: 4px; background: #0f1117; 
                    border: 1px solid #374151; border-radius: 4px; padding: 2px 8px; font-size: 10px; color: #9ca3af;
                }
                .search-mini {
                    background: #111827; border: 1px solid #374151; border-radius: 6px; padding: 10px 12px; color: white; font-size: 13px; width: 100%; box-sizing: border-box; outline: none; margin-bottom: 12px;
                }
                .search-mini:focus { border-color: #6366f1; }
                @media (max-width: 768px) {
                    .combos-grid { grid-template-columns: 1fr; gap: 12px; }
                }
            `}</style>

            <PageHeader title="Dashboard de Compras" subtitle="Control de stock por combos y materiales críticos">
                <Btn variant="secondary" onClick={exportToExcel} disabled={fetchingStock || allStock.length === 0}>
                    {fetchingStock ? 'Cargando...' : '⬇️ Exportar Stock'}
                </Btn>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ color: '#f3f4f6', fontSize: '15px', fontWeight: 700, margin: '0 0 2px 0' }}>{combo.title}</h4>
                                    {combo.supplier && <span style={{ color: '#6366f1', fontSize: '11px', fontWeight: 600 }}>{combo.supplier.name}</span>}
                                </div>
                                <ActionMenu options={[
                                    { label: 'Ver Detalle', icon: '🔍', onClick: () => setShowBreakdownId(combo.id) },
                                    { label: 'Editar Materiales', icon: '✏️', onClick: () => setEditComboId(combo.id) },
                                    { label: 'Eliminar Combo', icon: '🗑️', color: '#ef4444', onClick: () => {
                                        if (window.confirm('¿Eliminar este combo?')) deleteCombo(combo.id);
                                    }}
                                ]} />
                            </div>

                            <div style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: combo.deficit > 0 ? '#fca5a5' : '#a5b4fc', fontSize: '10px', fontWeight: 600 }}>STOCK TOTAL</span>
                                    <span style={{ color: 'white', fontSize: '16px', fontWeight: 800 }}>{Number(combo.totalStock || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })} {combo.unitLabel || 'kg'}</span>
                                </div>
                                <div style={{ height: '30px', width: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
                                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                                    <span style={{ color: combo.deficit > 0 ? '#fca5a5' : '#a5b4fc', fontSize: '10px', fontWeight: 600 }}>{combo.deficit > 0 ? 'DÉFICIT' : 'SUSTENTO'}</span>
                                    <span style={{ color: combo.deficit > 0 ? '#ef4444' : '#10b981', fontSize: '16px', fontWeight: 800 }}>
                                        {combo.deficit > 0 ? `-${Number(combo.deficit).toLocaleString('es-AR', { maximumFractionDigits: 0 })} kg` : `+${combo.stockDays || 0} d`}
                                    </span>
                                </div>
                            </div>

                            {combo.daysOfSupply !== null ? (
                                <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                                    <span style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                                        Inventario Restante (Estimado)
                                        <InfoTooltip text="Calculado en base al consumo promedio de estos materiales (remitos de salida) en los últimos 30 días contra el stock actual." />
                                    </span>
                                    <span style={{ 
                                        fontSize: '16px', fontWeight: 700, 
                                        color: combo.daysOfSupply < 15 ? '#ef4444' : combo.daysOfSupply > 60 ? '#10b981' : '#f59e0b'
                                    }}>
                                        ~ {Math.ceil(combo.daysOfSupply)} días
                                    </span>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                                    <span style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                                        Inventario Restante (Estimado)
                                        <InfoTooltip text="Calculado en base al consumo promedio de estos materiales en los últimos 30 días. Actualmente no hay datos." />
                                    </span>
                                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Sin historial de consumo</span>
                                </div>
                            )}

                            {combo.incomingStock > 0 && (
                                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 600 }}>🚚 Sup. en Tránsito: {Number(combo.incomingStock).toFixed(1)} {combo.unitLabel}</span>
                                    {combo.incomingDate && (
                                        <span style={{ display: 'block', fontSize: '10px', color: '#60a5fa', marginTop: '4px' }}>
                                            Llega aprox: {new Date(combo.incomingDate).toLocaleDateString()}
                                            {combo.daysOfSupply !== null && (
                                                <span style={{ color: new Date(combo.incomingDate) > new Date(Date.now() + combo.daysOfSupply * 86400000) ? '#f87171' : '#34d399', marginLeft: '6px' }}>
                                                    {new Date(combo.incomingDate) > new Date(Date.now() + combo.daysOfSupply * 86400000) ? '(⚠️ Llegaría después de quiebre)' : '(✅ Llega a tiempo)'}
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </div>
                            )}

                            <div style={{ color: '#6b7280', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px' }}>
                                <span>{combo.itemIds?.length || 0} materiales</span>
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
                        rows={alerts.map((a: any) => [
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
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                            <Btn onClick={handleCreate} style={{ flex: 1 }} disabled={!newCombo.title || newCombo.itemIds.length === 0}>Generar Combo</Btn>
                            <Btn variant="secondary" onClick={() => setShowCreateModal(false)}>Cancelar</Btn>
                        </div>
                    </div>
                </Modal>
            )}

            {showBreakdownId && (
                <BreakdownModal id={showBreakdownId} onClose={() => setShowBreakdownId(null)} />
            )}

            {editComboId && (
                <EditComboModal 
                    combo={combos.find((c: any) => c.id === editComboId)} 
                    items={items} 
                    onClose={() => setEditComboId(null)} 
                    onSave={async (itemIds: string[]) => {
                        await updateCombo({ id: editComboId, itemIds });
                        setEditComboId(null);
                    }}
                />
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: '#34d399', fontWeight: 700, fontSize: '16px' }}>{Number(item.total).toFixed(1)} <small>{item.unitLabel}</small></div>
                                        <div style={{ color: '#9ca3af', fontSize: '13px' }}>{Number(item.totalSecondary).toFixed(0)} <small>{item.secondaryUnitLabel}</small></div>
                                    </div>
                                </div>
                            </div>
                            <Table 
                                cols={['Partida/Lote', 'Depósito', 'Posición', 'Stock Princ.', 'Secundario']}
                                rows={item.batches.map((b: any) => [
                                    <code key="lot" style={{ color: '#a5b4fc', fontSize: '13px' }}>{b.lotNumber}</code>,
                                    b.depot,
                                    b.position,
                                    <strong key="qty" style={{ color: '#f3f4f6' }}>{Number(b.qty).toFixed(1)} {item.unitLabel}</strong>,
                                    <span key="qty2" style={{ color: '#9ca3af' }}>{Number(b.qtySecondary).toFixed(0)} {item.secondaryUnitLabel}</span>
                                ])}
                            />
                        </div>
                    ))}
                    <Btn variant="secondary" onClick={onClose} style={{ alignSelf: 'flex-end' }}>Cerrar Vista</Btn>
                </div>
            )}
        </Modal>
    );
}

function EditComboModal({ combo, items, onClose, onSave }: { combo: any; items: any[]; onClose: () => void; onSave: (itemIds: string[]) => Promise<void> }) {
    const [selectedIds, setSelectedIds] = useState<string[]>(combo?.itemIds || []);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    if (!combo) return null;

    const filteredItems = items.filter(i => {
        const matchesSearch = 
            i.descripcion.toLowerCase().includes(search.toLowerCase()) ||
            i.codigoInterno.toLowerCase().includes(search.toLowerCase()) ||
            (i.supplier?.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (i.categoria || '').toLowerCase().includes(search.toLowerCase());
        
        const matchesSupplier = !combo.supplierId || i.supplierId === combo.supplierId;
        return matchesSearch && matchesSupplier;
    });

    const handleSave = async () => {
        setSaving(true);
        await onSave(selectedIds);
        setSaving(false);
    };

    return (
        <Modal title={`Editar Materiales — ${combo.title}`} onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input
                    type="text"
                    className="search-mini"
                    placeholder="Buscar por nombre o código..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                    {filteredItems.map(item => (
                        <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }}>
                            <input 
                                type="checkbox" 
                                checked={selectedIds.includes(item.id)}
                                onChange={e => {
                                    if (e.target.checked) setSelectedIds([...selectedIds, item.id]);
                                    else setSelectedIds(selectedIds.filter(id => id !== item.id));
                                }}
                            />
                            {item.descripcion}
                        </label>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
                    <Btn onClick={handleSave} disabled={saving}>Guardar</Btn>
                </div>
            </div>
        </Modal>
    );
}
