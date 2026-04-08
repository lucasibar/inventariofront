import { useState, useMemo, useEffect } from 'react';
import { 
    useGetStockQuery, 
    useQuickAddStockMutation, 
    useDeleteStockMutation, 
    useDeleteAllItemStockMutation 
} from '../features/stock/api/stock.api';
import { useNavigate } from 'react-router-dom';
import { useGetDepotsQuery } from '../features/depots/api/depots.api';
import { useGetItemsQuery } from '../features/items/api/items.api';
import { useGetPartnersQuery } from '../features/partners/api/partners.api';
import { PageHeader, Select, Badge, Spinner, Btn, Modal, Input } from './common/ui';
import { CreateItemDialog } from '../features/remitos/ui/CreateItemDialog';
import { CreatePartnerDialog } from '../features/remitos/ui/CreatePartnerDialog';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectAllowedDepots } from '../entities/auth/model/authSlice';

/* ─── UI COMPONENTS (Local or from common/ui) ─── */

export default function StockPage() {
    const user = useSelector(selectCurrentUser);
    const allowedDepots = useSelector(selectAllowedDepots);
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

    const navigate = useNavigate();
    const [depotId, setDepotId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');

    const { data: rawDepots = [] } = useGetDepotsQuery();

    // Filtered depots based on user permissions
    const availableDepots = useMemo(() => {
        if (isAdmin) return rawDepots;
        return rawDepots.filter(d => allowedDepots.includes(d.id));
    }, [rawDepots, allowedDepots, isAdmin]);

    // Auto-set depot if only one option is available
    useEffect(() => {
        if (!depotId && availableDepots.length === 1) {
            setDepotId(availableDepots[0].id);
        }
    }, [availableDepots, depotId]);

    const { data: items = [] } = useGetItemsQuery({});
    const { data: partners = [] } = useGetPartnersQuery({});
    const [quickAddStock] = useQuickAddStockMutation();
    const [deleteStock] = useDeleteStockMutation();
    const [deleteAllStock] = useDeleteAllItemStockMutation();

    const [quickAddModal, setQuickAddModal] = useState(false);
    const [qaDepot, setQaDepot] = useState('');
    const [qaPosition, setQaPosition] = useState('');
    const [qaItem, setQaItem] = useState('');
    const [qaSupplier, setQaSupplier] = useState('');
    const [qaLot, setQaLot] = useState('');
    const [qaPrincipal, setQaPrincipal] = useState('');
    const [qaSecundaria, setQaSecundaria] = useState('');

    // Dialog States
    const [createItemModal, setCreateItemModal] = useState(false);
    const [createPartnerModal, setCreatePartnerModal] = useState(false);

    const qaFilteredItems = useMemo(() => {
        if (!qaSupplier) return items;
        return items.filter((i: any) => i.supplierId === qaSupplier);
    }, [items, qaSupplier]);

    const qaSelectedItem = useMemo(() => items.find((i: any) => i.id === qaItem), [items, qaItem]);

    const handleQuickAddSubmit = async () => {
        if (!qaDepot || !qaPosition || !qaItem || !qaSupplier || !qaLot || !qaPrincipal) {
            alert('Completá todos los campos obligatorios para agregar mercadería.');
            return;
        }
        try {
            await quickAddStock({
                depositoId: qaDepot,
                posicionId: qaPosition,
                itemId: qaItem,
                supplierId: qaSupplier,
                lotNumber: qaLot,
                qtyPrincipal: Number(qaPrincipal),
                qtySecundaria: qaSecundaria ? Number(qaSecundaria) : undefined,
                fecha: new Date().toISOString()
            }).unwrap();
            setQuickAddModal(false);
            setQaItem(''); setQaLot(''); setQaPrincipal(''); setQaSecundaria('');
        } catch (e: any) {
            alert(e?.data?.message || 'Error en adición rápida');
        }
    };

    const handleDeleteLine = async (entry: any) => {
        if (!window.confirm(`¿Estás seguro de eliminar el stock de la partida ${entry.batch.lotNumber} en la posición ${entry.posicion?.codigo}?`)) return;
        try {
            await deleteStock({
                depositoId: entry.posicion.depot.id,
                posicionId: entry.posicion.id,
                itemId: entry.batch.item.id,
                lotId: entry.batch.id,
                fecha: new Date().toISOString()
            }).unwrap();
        } catch (e: any) {
            alert(e?.data?.message || 'Error al eliminar línea');
        }
    };

    const handleDeleteAll = async (itemId: string, itemDesc: string) => {
        if (!window.confirm(`¡ATENCIÓN! ¿Estás seguro de eliminar TODO el stock del material "${itemDesc}"? Esta acción no se puede deshacer de forma masiva.`)) return;
        try {
            await deleteAllStock({
                itemId,
                fecha: new Date().toISOString()
            }).unwrap();
        } catch (e: any) {
            alert(e?.data?.message || 'Error al eliminar stock total');
        }
    };

    // Fetch stock only if a depot is selected. 
    // We bring a limit to avoid massive data transfer.
    const { data: rawStock = [], isFetching } = useGetStockQuery(
        { depotId: depotId || undefined, limit: 1000 },
        { skip: !depotId }
    );

    // Grouping & Analysis Logic
    const { groupedData, generalMetrics } = useMemo(() => {
        const general = { kilos: 0, units: 0, positions: new Set<string>() };

        if (!rawStock.length) return { groupedData: [], generalMetrics: null };

        const groups: Record<string, any> = {};
        
        // Multi-word cumulative filtering logic
        const searchWords = searchTerm.toLowerCase().split(' ').filter(w => w.length > 0);
        
        const filteredStock = rawStock.filter((entry: any) => {
            if (searchWords.length === 0) return true;
            
            // For each word in the search, at least one field must contain it
            return searchWords.every(word => {
                const itemDesc = (entry.batch?.item?.descripcion || '').toLowerCase();
                const itemCode = (entry.batch?.item?.codigoInterno || '').toLowerCase();
                const lotNum = (entry.batch?.lotNumber || '').toLowerCase();
                const supplierName = (entry.batch?.supplier?.name || '').toLowerCase();
                const posCode = (entry.posicion?.codigo || '').toLowerCase();
                
                return itemDesc.includes(word) || 
                       itemCode.includes(word) || 
                       lotNum.includes(word) || 
                       supplierName.includes(word) || 
                       posCode.includes(word);
            });
        });

        filteredStock.forEach((entry: any) => {
            const itemId = entry.batch?.item?.id;
            if (!itemId) return;

            // Update general metrics
            general.kilos += Number(entry.qtyPrincipal || 0);
            if (entry.qtySecundaria) general.units += Number(entry.qtySecundaria);
            if (entry.posicionId) general.positions.add(entry.posicionId);

            if (!groups[itemId]) {
                groups[itemId] = {
                    item: entry.batch.item,
                    supplier: entry.batch.supplier,
                    entries: [],
                    minLotNumber: entry.batch.lotNumber,
                    metrics: { kilos: 0, units: 0 }
                };
            }

            groups[itemId].entries.push(entry);
            groups[itemId].metrics.kilos += Number(entry.qtyPrincipal || 0);
            if (entry.qtySecundaria) groups[itemId].metrics.units += Number(entry.qtySecundaria);

            // Update min lot number (string comparison for correlative batches)
            if (entry.batch.lotNumber < groups[itemId].minLotNumber) {
                groups[itemId].minLotNumber = entry.batch.lotNumber;
            }
        });

        return {
            groupedData: Object.values(groups).sort((a: any, b: any) => a.item.descripcion.localeCompare(b.item.descripcion)),
            generalMetrics: { ...general, positionsCount: general.positions.size }
        };
    }, [rawStock, searchTerm]);

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
                .aging-warning {
                    color: #f87171;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 11px;
                    margin-left: 8px;
                    font-weight: 600;
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
            >
                <Btn onClick={() => setQuickAddModal(true)}>+ Adición Rápida</Btn>
            </PageHeader>

            <div className="search-bar-container">
                <div style={{ width: '250px' }}>
                    <Select
                        label="Depósito"
                        value={depotId}
                        onChange={setDepotId}
                        disabled={!isAdmin && availableDepots.length === 1}
                        options={[
                            { value: '', label: 'Seleccionar depósito...' },
                            ...availableDepots.map(d => ({ value: d.id, label: d.nombre }))
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

            {/* General Metrics Banner */}
            {!isFetching && generalMetrics && rawStock.length > 0 && (
                <div style={{
                    display: 'flex', gap: '32px', padding: '16px 24px',
                    background: 'rgba(99, 102, 241, 0.04)',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                    borderRadius: '12px', marginBottom: '8px'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Total Kilos</span>
                        <span style={{ fontSize: '20px', color: '#6366f1', fontWeight: 800 }}>{generalMetrics.kilos.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '13px', fontWeight: 500, color: '#a5b4fc' }}>kg</span></span>
                    </div>
                    {generalMetrics.units > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Total Unidades</span>
                            <span style={{ fontSize: '20px', color: '#10b981', fontWeight: 800 }}>{generalMetrics.units.toLocaleString('es-AR')} <span style={{ fontSize: '13px', fontWeight: 500, color: '#6ee7b7' }}>un</span></span>
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Posiciones Asignadas</span>
                        <span style={{ fontSize: '20px', color: '#f3f4f6', fontWeight: 800 }}>{generalMetrics.positionsCount}</span>
                    </div>
                </div>
            )}

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
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <Badge color={group.item.categoria === 'Importacion' ? '#6366f1' : '#10b981'}>
                                            {group.item.categoria}
                                        </Badge>
                                        {isAdmin && (
                                            <button 
                                                onClick={() => handleDeleteAll(group.item.id, group.item.descripcion)}
                                                title="Eliminar todo el stock de este material"
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                                    borderRadius: '4px',
                                                    color: '#ef4444',
                                                    fontSize: '10px',
                                                    padding: '2px 6px',
                                                    cursor: 'pointer',
                                                    fontWeight: 600
                                                }}
                                            >
                                                ELIMINAR TODO
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <span>Cod: <code style={{ color: '#a5b4fc', fontSize: '11px' }}>{group.item.codigoInterno}</code></span>
                                    {group.supplier && <span>Prov: <span style={{ color: '#9ca3af' }}>{group.supplier.name}</span></span>}
                                    <span style={{
                                        marginLeft: 'auto',
                                        background: 'rgba(255,255,255,0.06)',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        color: '#f3f4f6',
                                        fontWeight: 600,
                                        fontSize: '11px'
                                    }}>
                                        {group.metrics.kilos.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                                        {group.metrics.units > 0 && ` / ${group.metrics.units.toLocaleString('es-AR')} un`}
                                    </span>
                                </div>
                            </div>
                            <table className="positions-table">
                                <thead>
                                    <tr>
                                        <th>Posición</th>
                                        <th>Partida</th>
                                        <th style={{ textAlign: 'right' }}>Stock Principal</th>
                                        <th style={{ textAlign: 'right' }}>Secundario</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.entries.map((entry: any) => {
                                        const isMinBatch = entry.batch.lotNumber === group.minLotNumber;
                                        const createdAt = new Date(entry.batch.createdAt);
                                        const now = new Date();
                                        const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24));
                                        const isOld = diffDays > 180;

                                        return (
                                            <tr key={entry.id} className={isMinBatch ? 'highlight-row' : ''}>
                                                <td style={{ fontWeight: 600 }}>{entry.posicion?.codigo || 'S/P'}</td>
                                                <td>
                                                    <code>{entry.batch.lotNumber}</code>
                                                    {isMinBatch && <span style={{ marginLeft: '8px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>★ Min</span>}
                                                    {isOld && (
                                                        <span className="aging-warning" title={`Esta partida ingresó hace ${diffDays} días`}>
                                                            ⚠️ {diffDays}d
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                                    {Number(entry.qtyPrincipal).toFixed(2)} <span style={{ fontSize: '11px', opacity: 0.7 }}>{entry.batch.item.unidadPrincipal}</span>
                                                </td>
                                                <td style={{ textAlign: 'right', color: '#9ca3af' }}>
                                                    {entry.qtySecundaria != null ? `${Number(entry.qtySecundaria).toFixed(0)} ${entry.batch.item.unidadSecundaria || ''}` : '-'}
                                                </td>
                                                <td style={{ textAlign: 'right', paddingRight: '12px' }}>
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                        <button 
                                                            onClick={() => navigate('/movimientos', { 
                                                                state: { 
                                                                    depositoId: entry.posicion?.depot?.id, 
                                                                    posicionId: entry.posicion?.id,
                                                                    itemId: entry.batch?.item?.id
                                                                } 
                                                            })}
                                                            style={{
                                                                background: 'none', border: '1px solid #2a2d3e', borderRadius: '4px',
                                                                color: '#6366f1', fontSize: '11px', padding: '2px 6px', cursor: 'pointer'
                                                            }}
                                                        >
                                                            ➔
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteLine(entry)}
                                                            title="Eliminar este registro"
                                                            style={{
                                                                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', 
                                                                borderRadius: '4px', color: '#ef4444', fontSize: '11px', padding: '2px 6px', cursor: 'pointer'
                                                            }}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
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

            {/* Quick Add Modal */}
            {quickAddModal && (
                <Modal title="Adición Rápida de Mercadería" onClose={() => setQuickAddModal(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Select 
                                label="Depósito Destino" 
                                value={qaDepot || (availableDepots.length === 1 ? availableDepots[0].id : '')} 
                                onChange={val => { setQaDepot(val); setQaPosition(''); }} 
                                disabled={!isAdmin && availableDepots.length === 1}
                                options={[{ value: '', label: 'Seleccionar...' }, ...availableDepots.map((d: any) => ({ value: d.id, label: d.nombre }))]} 
                                style={{ flex: 1 }} 
                            />
                            <Select label="Posición" value={qaPosition} onChange={setQaPosition} options={[{ value: '', label: 'Seleccionar...' }, ...(availableDepots.find((d: any) => d.id === (qaDepot || (availableDepots.length === 1 ? availableDepots[0].id : '')))?.positions?.map((p: any) => ({ value: p.id, label: p.codigo })) || [])]} style={{ flex: 1 }} />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                            <Select label="Proveedor" value={qaSupplier} onChange={val => { setQaSupplier(val); setQaItem(''); }} options={[{ value: '', label: 'Seleccionar...' }, ...partners.filter((p: any) => p.isSupplier).map((p: any) => ({ value: p.id, label: p.name }))]} style={{ flex: 1 }} />
                            <Btn variant="secondary" onClick={() => setCreatePartnerModal(true)} style={{ whiteSpace: 'nowrap' }}>+ Nuevo Proveedor</Btn>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                            <Select label="Material" value={qaItem} onChange={setQaItem} options={[{ value: '', label: 'Seleccionar...' }, ...qaFilteredItems.map((i: any) => ({ value: i.id, label: `${i.codigoInterno} - ${i.descripcion}` }))]} style={{ flex: 1 }} />
                            <Btn variant="secondary" onClick={() => setCreateItemModal(true)} style={{ whiteSpace: 'nowrap' }}>+ Nuevo Material</Btn>
                        </div>

                        <Input label="Número de Partida (Lote)" value={qaLot} onChange={setQaLot} />

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Input label={`Cantidad (${qaSelectedItem?.unidadPrincipal || 'Principal'})`} type="number" value={qaPrincipal} onChange={setQaPrincipal} style={{ flex: 1 }} />
                            <Input label={`Secundaria (${qaSelectedItem?.unidadSecundaria || 'Bolsas/Un'})`} type="number" value={qaSecundaria} onChange={setQaSecundaria} style={{ flex: 1 }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <Btn variant="secondary" onClick={() => setQuickAddModal(false)}>Cancelar</Btn>
                        <Btn onClick={handleQuickAddSubmit}>Confirmar</Btn>
                    </div>
                </Modal>
            )}

            {/* Dialogs */}
            <CreateItemDialog
                open={createItemModal}
                onClose={() => setCreateItemModal(false)}
                onSuccess={(newItem: any) => { setQaItem(newItem.id); }}
            />

            <CreatePartnerDialog
                open={createPartnerModal}
                onClose={() => setCreatePartnerModal(false)}
                onSuccess={(newPartner: any) => { setQaSupplier(newPartner.id); }}
            />
        </div>
    );
}
