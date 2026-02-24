import { useState, useMemo } from 'react';
import { useGetStockSummaryQuery } from '../features/stock/api/stock.api';
import { useGetPartnersQuery } from '../features/partners/api/partners.api';
import { useGetItemsQuery } from '../features/items/api/items.api';
import { useGetDepotsQuery } from '../features/depots/api/depots.api';
import { PageHeader, Card, Btn, Select, Table, Badge, Spinner } from './common/ui';

/* ─── Shared Components ─── */

function QueryLine({
    id,
    onRemove,
    suppliers,
    items,
    depots
}: {
    id: string;
    onRemove: () => void;
    suppliers: any[];
    items: any[];
    depots: any[];
}) {
    const [supplierId, setSupplierId] = useState('');
    const [itemId, setItemId] = useState('');

    // Filter items by supplier if selected
    const filteredItems = useMemo(() => {
        if (!supplierId) return items;
        // This assumes items don't have supplierId directly but we can infer from current stock?
        // For simplicity in this UI, we show all if supplier not specific, 
        // but in a real case we'd fetch items of that supplier.
        return items;
    }, [supplierId, items]);

    const { data: summary, isFetching } = useGetStockSummaryQuery({
        supplierId: supplierId || undefined,
        itemId: itemId || undefined,
    });

    return (
        <div style={{
            display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.2fr 1.2fr auto',
            gap: '12px', padding: '16px', background: '#0f1117',
            borderRadius: '12px', marginBottom: '10px', alignItems: 'end',
            border: '1px solid #1e2133'
        }}>
            <Select
                label="Proveedor"
                value={supplierId}
                onChange={v => { setSupplierId(v); setItemId(''); }}
                options={[{ value: '', label: 'Cualquier proveedor' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]}
            />
            <Select
                label="Material"
                value={itemId}
                onChange={setItemId}
                options={[{ value: '', label: 'Cualquier material' }, ...filteredItems.map(it => ({ value: it.id, label: it.descripcion }))]}
            />

            <div style={{ textAlign: 'right', paddingBottom: '8px' }}>
                <div style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase' }}>Kilos</div>
                <div style={{ color: '#34d399', fontSize: '16px', fontWeight: 700 }}>
                    {isFetching ? '...' : (summary?.totalKilos?.toFixed(2) ?? '0.00')} <span style={{ fontSize: '11px' }}>kg</span>
                </div>
            </div>

            <div style={{ textAlign: 'right', paddingBottom: '8px' }}>
                <div style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase' }}>Unid.</div>
                <div style={{ color: '#a5b4fc', fontSize: '16px', fontWeight: 700 }}>
                    {isFetching ? '...' : (summary?.totalUnidades ?? 0)}
                </div>
            </div>

            <button
                onClick={onRemove}
                style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '18px', paddingBottom: '8px' }}
                title="Quitar consulta"
            >✕</button>
        </div>
    );
}

/* ─── Main Page ─── */

export default function StockQueryPage() {
    const [tab, setTab] = useState<'free' | 'import' | 'rotation'>('free');
    const { data: suppliers = [] } = useGetPartnersQuery({ type: 'SUPPLIER' });
    const { data: items = [] } = useGetItemsQuery({});
    const { data: depots = [] } = useGetDepotsQuery();

    // Free Query State
    const [lines, setLines] = useState<string[]>(['initial']);

    // Reports Logic
    const { data: importReport = [], isFetching: loadingImport } = useGetStockSummaryQuery(
        { categoria: 'Importacion', groupBy: 'batch' },
        { skip: tab !== 'import' }
    );

    const { data: rotationReport = [], isFetching: loadingRotation } = useGetStockSummaryQuery(
        { rotacion: 'ALTA', groupBy: 'item' },
        { skip: tab !== 'rotation' }
    );

    const categories = useMemo(() => [...new Set(items.map((it: any) => it.categoria))], [items]);

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Centro de Inteligencia" subtitle="Análisis de stock, reportes dinámicos y métricas avanzadas" />

            {/* Tabs Navigation */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #2a2d3e', paddingBottom: '1px' }}>
                <button
                    onClick={() => setTab('free')}
                    style={{
                        padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
                        color: tab === 'free' ? '#a5b4fc' : '#6b7280',
                        borderBottom: tab === 'free' ? '2px solid #a5b4fc' : '2px solid transparent',
                        fontSize: '14px', fontWeight: 600, transition: 'all 0.2s'
                    }}
                >🏗️ Comparador Libre</button>
                <button
                    onClick={() => setTab('import')}
                    style={{
                        padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
                        color: tab === 'import' ? '#a5b4fc' : '#6b7280',
                        borderBottom: tab === 'import' ? '2px solid #a5b4fc' : '2px solid transparent',
                        fontSize: '14px', fontWeight: 600, transition: 'all 0.2s'
                    }}
                >🚢 Importaciones</button>
                <button
                    onClick={() => setTab('rotation')}
                    style={{
                        padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
                        color: tab === 'rotation' ? '#a5b4fc' : '#6b7280',
                        borderBottom: tab === 'rotation' ? '2px solid #a5b4fc' : '2px solid transparent',
                        fontSize: '14px', fontWeight: 600, transition: 'all 0.2s'
                    }}
                >⚡ Alta Rotación</button>
            </div>

            {/* TAB: FREE QUERY */}
            {tab === 'free' && (
                <div>
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#9ca3af', fontSize: '13px' }}>Compará múltiples materiales o proveedores agregando líneas de consulta.</span>
                        <Btn small onClick={() => setLines(p => [...p, Date.now().toString()])}>+ Agregar Línea</Btn>
                    </div>
                    {lines.map(id => (
                        <QueryLine
                            key={id}
                            id={id}
                            suppliers={suppliers}
                            items={items}
                            depots={depots}
                            onRemove={() => setLines(p => p.filter(l => l !== id))}
                        />
                    ))}
                    {lines.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '48px', color: '#4b5563', border: '2px dashed #1e2133', borderRadius: '16px' }}>
                            No hay consultas activas. Hacé click en "+ Agregar Línea" para empezar.
                        </div>
                    )}
                </div>
            )}

            {/* TAB: IMPORT REPORT */}
            {tab === 'import' && (
                <Card>
                    <div style={{ padding: '16px', borderBottom: '1px solid #2a2d3e', display: 'flex', justifyContent: 'space-between' }}>
                        <h3 style={{ margin: 0, color: '#f3f4f6', fontSize: '15px' }}>Stock de Materiales Importados</h3>
                        <Badge color="#34d399">{importReport.length} partidas encontradas</Badge>
                    </div>
                    {loadingImport ? <Spinner /> : (
                        <Table
                            cols={['Material', 'Partida', 'Total Kilos', 'Total Unidades']}
                            rows={importReport.map((r: any) => [
                                r.itemDescripcion,
                                <code style={{ color: '#fbbf24' }}>{r.lotNumber}</code>,
                                <strong style={{ color: '#34d399' }}>{r.totalKilos.toFixed(2)} kg</strong>,
                                r.totalUnidades
                            ])}
                        />
                    )}
                </Card>
            )}

            {/* TAB: ROTATION REPORT */}
            {tab === 'rotation' && (
                <Card>
                    <div style={{ padding: '16px', borderBottom: '1px solid #2a2d3e', display: 'flex', justifyContent: 'space-between' }}>
                        <h3 style={{ margin: 0, color: '#f3f4f6', fontSize: '15px' }}>Resumen de Materiales - Alta Rotación</h3>
                        <Badge color="#fbbf24">Prioridad de Abastecimiento</Badge>
                    </div>
                    {loadingRotation ? <Spinner /> : (
                        <Table
                            cols={['Material', 'Código', 'Stock Global (Kg)', 'Stock Global (Unid.)']}
                            rows={rotationReport.map((r: any) => [
                                r.descripcion,
                                <code style={{ color: '#a5b4fc' }}>{r.codigoInterno}</code>,
                                <strong style={{ color: '#34d399' }}>{r.totalKilos.toFixed(2)} kg</strong>,
                                r.totalUnidades
                            ])}
                        />
                    )}
                </Card>
            )}
        </div>
    );
}
