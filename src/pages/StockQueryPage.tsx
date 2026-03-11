import { useState } from 'react';
import { useGetStockSummaryQuery } from '../features/stock/api/stock.api';
import { useGetPartnersQuery } from '../features/partners/api/partners.api';
import { useGetItemsQuery } from '../features/items/api/items.api';
import { PageHeader, Card, Btn, Select, Table, Badge, Spinner } from './common/ui';

/* ─── Main Page ─── */

export default function StockQueryPage() {
    const [tab, setTab] = useState<'free' | 'import'>('free');
    const { data: suppliers = [] } = useGetPartnersQuery({ type: 'SUPPLIER' });
    const { data: items = [] } = useGetItemsQuery({});

    // Free Query State
    const [lines, setLines] = useState<string[]>(['initial']);

    // Reports Logic
    const { data: importReport = [], isFetching: loadingImport } = useGetStockSummaryQuery(
        { categoria: 'Importacion', groupBy: 'batch' },
        { skip: tab !== 'import' }
    );

    return (
        <div className="query-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <style>{`
                .query-line {
                    display: grid;
                    grid-template-columns: 1.5fr 2fr 1.2fr 1.2fr auto;
                    gap: 12px;
                    padding: 20px;
                    background: #1a1d2e;
                    border-radius: 12px;
                    margin-bottom: 16px;
                    align-items: end;
                    border: 1px solid #2a2d3e;
                    transition: border-color 0.2s;
                }
                .query-line:hover { border-color: #6366f1; }
                
                @media (max-width: 800px) {
                    .query-line { grid-template-columns: 1fr; gap: 16px; }
                    .query-container { padding: 16px !important; }
                    .tab-btn { padding: 10px 12px !important; font-size: 13px !important; }
                    .metrics-row { justify-content: space-between; display: flex; width: 100%; }
                }

                .tab-btn {
                    padding: 12px 24px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #6b7280;
                    border-bottom: 2px solid transparent;
                    font-size: 14px;
                    font-weight: 600;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .tab-btn.active {
                    color: #a5b4fc;
                    border-bottom: 2px solid #a5b4fc;
                    background: rgba(99,102,241,0.05);
                }
            `}</style>

            <PageHeader title="Inteligencia de Stock" subtitle="Comparador de materiales y reportes de importación" />

            {/* Tabs Navigation */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid #2a2d3e' }}>
                <button
                    onClick={() => setTab('free')}
                    className={`tab-btn ${tab === 'free' ? 'active' : ''}`}
                >🏗️ Comparador</button>
                <button
                    onClick={() => setTab('import')}
                    className={`tab-btn ${tab === 'import' ? 'active' : ''}`}
                >🚢 Importaciones</button>
            </div>

            {/* TAB: FREE QUERY */}
            {tab === 'free' && (
                <div>
                    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <span style={{ color: '#9ca3af', fontSize: '13px' }}>Agregá líneas para comparar el stock actual de diferentes materiales o proveedores.</span>
                        <Btn small onClick={() => setLines(p => [...p, Date.now().toString()])}>+ Agregar Consulta</Btn>
                    </div>
                    {lines.map(id => (
                        <div key={id} className="query-line">
                            <QueryLineWrapper 
                                suppliers={suppliers} 
                                items={items} 
                                onRemove={() => setLines(p => p.filter(l => l !== id))} 
                            />
                        </div>
                    ))}
                    {lines.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '64px', color: '#4b5563', border: '2px dashed #2a2d3e', borderRadius: '16px' }}>
                            <p style={{ margin: 0 }}>No hay consultas activas.</p>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: IMPORT REPORT */}
            {tab === 'import' && (
                <Card>
                    <div style={{ padding: '20px', borderBottom: '1px solid #2a2d3e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#f3f4f6', fontSize: '16px', fontWeight: 600 }}>Materiales Importados</h3>
                        <Badge color="#34d399">{importReport.length} partidas</Badge>
                    </div>
                    {loadingImport ? <Spinner /> : (
                        <div style={{ overflowX: 'auto' }}>
                            <Table
                                cols={['Material', 'Partida / Lote', 'Stock (Kg)', 'Stock (Unid.)']}
                                rows={importReport.map((r: any) => [
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ color: '#f3f4f6', fontWeight: 500 }}>{r.itemDescripcion}</span>
                                        <code style={{ fontSize: '11px', color: '#6b7280' }}>ID: {r.itemId?.slice(-6)}</code>
                                    </div>,
                                    <code style={{ color: '#fbbf24', fontSize: '12px', background: 'rgba(251,191,36,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{r.lotNumber}</code>,
                                    <strong style={{ color: '#34d399' }}>{Number(r.totalKilos).toFixed(2)} kg</strong>,
                                    <span style={{ color: '#d1d5db' }}>{r.totalUnidades} un.</span>
                                ])}
                            />
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}

function QueryLineWrapper({ onRemove, suppliers, items }: any) {
    const [supplierId, setSupplierId] = useState('');
    const [itemId, setItemId] = useState('');

    const { data: summary, isFetching } = useGetStockSummaryQuery({
        supplierId: supplierId || undefined,
        itemId: itemId || undefined,
    });

    return (
        <>
            <Select
                label="Proveedor"
                value={supplierId}
                onChange={v => { setSupplierId(v); setItemId(''); }}
                options={[{ value: '', label: 'Cualquier proveedor' }, ...suppliers.map((s: any) => ({ value: s.id, label: s.name }))]}
            />
            <Select
                label="Material"
                value={itemId}
                onChange={setItemId}
                options={[{ value: '', label: 'Cualquier material' }, ...items.map((it: any) => ({ value: it.id, label: it.descripcion }))]}
            />

            <div className="metrics-row" style={{ display: 'flex', gap: '24px', paddingBottom: '8px' }}>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>Peso Total</div>
                    <div style={{ color: '#34d399', fontSize: '18px', fontWeight: 700 }}>
                        {isFetching ? '...' : (Number(summary?.totalKilos || 0).toFixed(2))} <span style={{ fontSize: '11px', fontWeight: 400 }}>kg</span>
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>Cantidad</div>
                    <div style={{ color: '#a5b4fc', fontSize: '18px', fontWeight: 700 }}>
                        {isFetching ? '...' : (summary?.totalUnidades ?? 0)} <span style={{ fontSize: '11px', fontWeight: 400 }}>un.</span>
                    </div>
                </div>
            </div>

            <button
                onClick={onRemove}
                style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}
                title="Quitar consulta"
            >✕</button>
        </>
    );
}
