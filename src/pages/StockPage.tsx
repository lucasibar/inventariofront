import { useState, useMemo, useEffect } from 'react';
import { useGetStockQuery } from '../features/stock/api/stock.api';
import { useGetDepotsQuery } from '../features/depots/api/depots.api';
import { PageHeader, Card, Select, Badge, Spinner } from './common/ui';

/* ─── UI COMPONENTS (Local or from common/ui) ─── */

export default function StockPage() {
    const [depotId, setDepotId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');

    // Debounce search to optimize API calls
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { data: depots = [] } = useGetDepotsQuery();
    
    // Fetch stock only if a depot is selected. 
    // We bring a limit to avoid massive data transfer.
    const { data: rawStock = [], isFetching, isError } = useGetStockQuery(
        { depotId: depotId || undefined, q: debouncedSearch || undefined, limit: 1000 },
        { skip: !depotId && !debouncedSearch } 
    );

    // Grouping & Analysis Logic
    const groupedData = useMemo(() => {
        if (!rawStock.length) return [];

        const groups: Record<string, any> = {};

        rawStock.forEach(entry => {
            const itemId = entry.batch?.item?.id;
            if (!itemId) return;

            if (!groups[itemId]) {
                groups[itemId] = {
                    item: entry.batch.item,
                    supplier: entry.batch.supplier,
                    entries: [],
                    minLotNumber: entry.batch.lotNumber,
                };
            }

            groups[itemId].entries.push(entry);

            // Update min lot number (string comparison for correlative batches)
            if (entry.batch.lotNumber < groups[itemId].minLotNumber) {
                groups[itemId].minLotNumber = entry.batch.lotNumber;
            }
        });

        return Object.values(groups).sort((a, b) => a.item.descripcion.localeCompare(b.item.descripcion));
    }, [rawStock]);

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <style>{`
                .stock-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
                    gap: 20px;
                    margin-top: 24px;
                }
                .material-card {
                    background: #1a1d2e;
                    border: 1px solid #2a2d3e;
                    border-radius: 12px;
                    overflow: hidden;
                    transition: transform 0.2s, border-color 0.2s;
                }
                .material-card:hover {
                    border-color: #6366f1;
                }
                .material-header {
                    padding: 16px;
                    border-bottom: 1px solid #2a2d3e;
                    background: rgba(255,255,255,0.02);
                }
                .material-title {
                    margin: 0;
                    color: #f3f4f6;
                    font-size: 15px;
                    font-weight: 600;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .positions-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                }
                .positions-table th {
                    text-align: left;
                    padding: 8px 16px;
                    color: #6b7280;
                    font-weight: 500;
                    border-bottom: 1px solid #2a2d3e;
                    background: rgba(0,0,0,0.1);
                }
                .positions-table td {
                    padding: 10px 16px;
                    border-bottom: 1px solid #23263a;
                }
                .highlight-row {
                    background: rgba(245, 158, 11, 0.08);
                    border-left: 3px solid #f59e0b;
                }
                .highlight-row td {
                     color: #fbbf24;
                }
                .search-bar-container {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 24px;
                    align-items: flex-end;
                    flex-wrap: wrap;
                }
                .search-input {
                    background: #1a1d2e;
                    border: 1px solid #2a2d3e;
                    border-radius: 8px;
                    padding: 10px 16px;
                    color: white;
                    width: 100%;
                    max-width: 400px;
                    transition: border-color 0.2s;
                }
                .search-input:focus {
                    outline: none;
                    border-color: #6366f1;
                }
                .empty-state {
                    text-align: center;
                    padding: 80px 20px;
                    color: #4b5563;
                    border: 2px dashed #2a2d3e;
                    border-radius: 16px;
                    grid-column: 1 / -1;
                }
                @media (max-width: 600px) {
                    .stock-grid { grid-template-columns: 1fr; }
                }
            `}</style>

            <PageHeader 
                title="Gestión de Stock" 
                subtitle="Consulta de inventario físico, posiciones y rotación de partidas" 
            />

            <div className="search-bar-container">
                <div style={{ width: '250px' }}>
                    <Select
                        label="Depósito"
                        value={depotId}
                        onChange={setDepotId}
                        options={[
                            { value: '', label: 'Seleccionar depósito...' },
                            ...depots.map(d => ({ value: d.id, label: d.name }))
                        ]}
                    />
                </div>
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>
                        Buscador (Material, Proveedor, Partida, Color, Posición)
                    </label>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Escribe para buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {isFetching ? (
                <div style={{ textAlign: 'center', padding: '100px' }}>
                    <Spinner />
                    <p style={{ color: '#6b7280', marginTop: '16px' }}>Calculando inventarios...</p>
                </div>
            ) : (
                <div className="stock-grid">
                    {groupedData.map((group) => (
                        <div key={group.item.id} className="material-card">
                            <div className="material-header">
                                <div className="material-title">
                                    <span>{group.item.descripcion}</span>
                                    <Badge color={group.item.categoria === 'Importacion' ? '#6366f1' : '#10b981'}>
                                        {group.item.categoria}
                                    </Badge>
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'flex', gap: '12px' }}>
                                    <span>Cod: <code style={{ color: '#a5b4fc' }}>{group.item.codigoInterno}</code></span>
                                    {group.supplier && <span>Prov: {group.supplier.name}</span>}
                                </div>
                            </div>
                            
                            <table className="positions-table">
                                <thead>
                                    <tr>
                                        <th>Posición</th>
                                        <th>Partida</th>
                                        <th style={{ textAlign: 'right' }}>Stock Principal</th>
                                        <th style={{ textAlign: 'right' }}>Secundario</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.entries.map((entry: any) => {
                                        const isMinBatch = entry.batch.lotNumber === group.minLotNumber;
                                        return (
                                            <tr key={entry.id} className={isMinBatch ? 'highlight-row' : ''}>
                                                <td style={{ fontWeight: 600 }}>{entry.posicion?.codigo || 'S/P'}</td>
                                                <td>
                                                    <code>{entry.batch.lotNumber}</code>
                                                    {isMinBatch && <span style={{ marginLeft: '8px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>★ Min</span>}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                                    {Number(entry.qtyPrincipal).toFixed(2)} <span style={{ fontSize: '11px', opacity: 0.7 }}>{entry.batch.item.unidadPrincipal}</span>
                                                </td>
                                                <td style={{ textAlign: 'right', color: '#9ca3af' }}>
                                                    {entry.qtySecundaria != null ? `${Number(entry.qtySecundaria).toFixed(0)} ${entry.batch.item.unidadSecundaria || ''}` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}

                    {!depotId && !searchTerm && (
                        <div className="empty-state">
                            <h3 style={{ margin: '0 0 8px 0', color: '#9ca3af' }}>🔍 Listo para comenzar</h3>
                            <p style={{ margin: 0 }}>Selecciona un depósito o escribe un criterio de búsqueda para ver el stock.</p>
                        </div>
                    )}

                    {depotId && rawStock.length === 0 && !isFetching && (
                        <div className="empty-state">
                            <h3 style={{ margin: '0 0 8px 0', color: '#9ca3af' }}>📭 Sin resultados</h3>
                            <p style={{ margin: 0 }}>No se encontraron materiales en este depósito con los filtros aplicados.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
