import { useState, useMemo, useEffect } from 'react';
import { 
    useGetStockQuery, 
    useQuickAddStockMutation, 
    useDeleteStockMutation,
    useAdjustStockMutation,
    useReassignBatchMutation,
    useLazyCheckBatchQuery,
} from '../features/stock/api/stock.api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGetDepotsQuery } from '../features/depots/api/depots.api';
import { useGetItemsQuery } from '../features/items/api/items.api';
import { useGetPartnersQuery } from '../features/partners/api/partners.api';
import { PageHeader, Select, SearchSelect, Spinner, Btn, Modal, Input, EditableCell, useIsMobile } from './common/ui';
import { CreateItemDialog } from '../features/remitos/ui/CreateItemDialog';
import { CreatePartnerDialog } from '../features/remitos/ui/CreatePartnerDialog';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectAllowedDepots } from '../entities/auth/model/authSlice';

export default function StockPage() {
    const user = useSelector(selectCurrentUser);
    const allowedDepots = useSelector(selectAllowedDepots);
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    const [depotId, setDepotId] = useState<string>(() => sessionStorage.getItem('selectedDepotId') || '');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [expandedMaterials, setExpandedMaterials] = useState<string[]>([]);

    const [searchParams, setSearchParams] = useSearchParams();
    
    useEffect(() => {
        if (depotId) sessionStorage.setItem('selectedDepotId', depotId);
    }, [depotId]);

    // Handle search parameter from URL
    useEffect(() => {
        const q = searchParams.get('q');
        if (q) setSearchTerm(q);
    }, [searchParams]);

    // Handle Quick Add trigger from global Header
    useEffect(() => {
        if (searchParams.get('qa') === '1') {
            setQuickAddModal(true);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('qa');
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams]);

    const toggleMaterial = (id: string, e?: React.MouseEvent) => {
        if(e) e.stopPropagation();
        setExpandedMaterials(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const { data: rawDepots = [] } = useGetDepotsQuery();
    const availableDepots = useMemo(() => {
        if (isAdmin) return rawDepots;
        return rawDepots.filter(d => allowedDepots.includes(d.id));
    }, [rawDepots, allowedDepots, isAdmin]);

    useEffect(() => {
        // Only auto-select if no manual selection exists in session OR if stored selection is no longer available
        if (!depotId && availableDepots.length === 1) {
            setDepotId(availableDepots[0].id);
        }
    }, [availableDepots, depotId]);

    const { data: items = [] } = useGetItemsQuery({});
    const { data: partners = [] } = useGetPartnersQuery({});
    const [quickAddStock] = useQuickAddStockMutation();
    const [deleteStock] = useDeleteStockMutation();

    const [quickAddModal, setQuickAddModal] = useState(false);
    const [qaDepot, setQaDepot] = useState('');
    const [qaPosition, setQaPosition] = useState('');
    const [qaItem, setQaItem] = useState('');
    const [qaSupplier, setQaSupplier] = useState('');
    const [qaLot, setQaLot] = useState('');
    const [qaPrincipal, setQaPrincipal] = useState('');
    const [qaSecundaria, setQaSecundaria] = useState('');

    const [createItemModal, setCreateItemModal] = useState(false);
    const [createPartnerModal, setCreatePartnerModal] = useState(false);

    const [adjustStock] = useAdjustStockMutation();
    const [reassignBatch] = useReassignBatchMutation();
    const [checkBatch] = useLazyCheckBatchQuery();

    const handleAdjustQty = async (entry: any, newValue: string, field: 'principal' | 'secundaria') => {
        const newQty = Number(newValue);
        if (isNaN(newQty) || newQty < 0) { alert('Valor inválido'); return; }
        const currentQty = field === 'principal' ? Number(entry.qtyPrincipal) : Number(entry.qtySecundaria || 0);
        const diff = newQty - currentQty;
        if (diff === 0) return;
        try {
            await adjustStock({
                depositoId: entry.posicion?.depot?.id || depotId,
                posicionId: entry.posicionId,
                itemId: entry.batch.item.id,
                lotId: entry.lotId,
                qtyPrincipal: field === 'principal' ? diff : 0,
                qtySecundaria: field === 'secundaria' ? diff : null,
                fecha: new Date().toISOString(),
                observaciones: `Ajuste manual: ${currentQty} → ${newQty} (${field === 'principal' ? entry.batch.item.unidadPrincipal : entry.batch.item.unidadSecundaria})`,
            }).unwrap();
        } catch (e: any) { alert(e?.data?.message || 'Error al ajustar'); }
    };

    const handleReassignBatch = async (entry: any, newLotNumber: string) => {
        if (!newLotNumber.trim()) return;
        if (newLotNumber === entry.batch.lotNumber) return;
        const entryDepotId = entry.posicion?.depot?.id || depotId;
        try {
            const result = await checkBatch({ itemId: entry.batch.item.id, lotNumber: newLotNumber, supplierId: entry.batch.supplier?.id }).unwrap();
            if (result.exists) {
                if (!window.confirm(`La partida "${newLotNumber}" ya existe. ¿Querés fusionar el stock con esa partida?`)) return;
            } else {
                if (!window.confirm(`La partida "${newLotNumber}" no existe. Se va a crear una nueva. ¿Continuar?`)) return;
            }
            await reassignBatch({
                depositoId: entryDepotId,
                posicionId: entry.posicionId,
                itemId: entry.batch.item.id,
                currentLotId: entry.lotId,
                newLotNumber: newLotNumber.trim(),
                fecha: new Date().toISOString(),
            }).unwrap();
        } catch (e: any) { alert(e?.data?.message || 'Error al reasignar partida'); }
    };

    const qaFilteredItems = useMemo(() => {
        if (!qaSupplier) return items;
        return items.filter((i: any) => !i.supplierId || i.supplierId === qaSupplier);
    }, [items, qaSupplier]);

    const supplierOptions = useMemo(() => [
        { value: '', label: 'Seleccionar...' },
        ...partners.filter((p: any) => p.type === 'SUPPLIER' || p.type === 'BOTH').map((p: any) => ({ value: p.id, label: p.name }))
    ], [partners]);

    const qaSelectedItem = useMemo(() => items.find((i: any) => i.id === qaItem), [items, qaItem]);

    const handleQuickAddSubmit = async () => {
        if (!qaDepot || !qaPosition || !qaItem || !qaSupplier || !qaLot || !qaPrincipal) {
            alert('Completá todos los campos obligatorios.');
            return;
        }
        try {
            await quickAddStock({
                depositoId: qaDepot, posicionId: qaPosition, itemId: qaItem, supplierId: qaSupplier,
                lotNumber: qaLot, qtyPrincipal: Number(qaPrincipal), qtySecundaria: qaSecundaria ? Number(qaSecundaria) : undefined,
                fecha: new Date().toISOString()
            }).unwrap();
            setQuickAddModal(false);
            setQaItem(''); setQaLot(''); setQaPrincipal(''); setQaSecundaria('');
        } catch (e: any) { alert(e?.data?.message || 'Error en adición rápida'); }
    };

    const handleDeleteLine = async (entry: any) => {
        if (!window.confirm(`¿Eliminar esta línea de stock (${entry.qtyPrincipal} ${entry.batch.item.unidadPrincipal})?`)) return;
        try {
            await deleteStock({
                depositoId: entry.posicion?.depot?.id || depotId,
                posicionId: entry.posicionId,
                itemId: entry.batch.item.id,
                lotId: entry.lotId,
                fecha: new Date().toISOString()
            }).unwrap();
        } catch (e: any) { alert(e?.data?.message || 'Error al eliminar línea de stock'); }
    };

    const { data: rawStock = [], isFetching, isLoading } = useGetStockQuery({ depotId: depotId || undefined }, { skip: !depotId });

    const { groupedData, generalMetrics } = useMemo(() => {
        const general = { kilos: 0, units: 0, positions: new Set<string>() };
        if (!rawStock.length) return { groupedData: [], generalMetrics: null };
        const groups: Record<string, any> = {};
        const searchWords = searchTerm.toLowerCase().split(' ').filter(w => w.length > 0);
        
        const filteredStock = rawStock.filter((entry: any) => {
            if (searchWords.length === 0) return true;
            return searchWords.every(word => {
                const itemDesc = (entry.batch?.item?.descripcion || '').toLowerCase();
                const itemCode = (entry.batch?.item?.codigoInterno || '').toLowerCase();
                const lotNum = (entry.batch?.lotNumber || '').toLowerCase();
                const supplierName = (entry.batch?.supplier?.name || '').toLowerCase();
                const posCode = (entry.posicion?.codigo || '').toLowerCase();
                return itemDesc.includes(word) || itemCode.includes(word) || lotNum.includes(word) || supplierName.includes(word) || posCode.includes(word);
            });
        });

        filteredStock.forEach((entry: any) => {
            const itemId = entry.batch?.item?.id;
            if (!itemId) return;
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
            
            // FIFO Logic: smallest lot number is oldest
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
        <div style={{ 
            padding: isMobile ? '12px' : '24px', 
            maxWidth: '1400px', 
            margin: '0 auto',
            boxSizing: 'border-box',
            width: '100%',
            overflowX: 'hidden'
        }}>
            <style>{`
                .stock-grid { 
                    column-width: ${isMobile ? '100%' : '360px'}; 
                    column-gap: 12px; 
                    margin-top: 12px; 
                }
                .material-card { 
                    background: #1a1d2e; 
                    border: 1px solid #2a2d3e; 
                    border-radius: 12px; 
                    overflow: hidden; 
                    display: inline-block; 
                    width: 100%;
                    margin-bottom: 12px;
                    cursor: pointer;
                    transition: transform 0.15s, border-color 0.15s;
                    break-inside: avoid;
                }
                .material-card:hover { transform: translateY(-2px); border-color: #6366f1; }
                .material-header { padding: 14px 16px; background: rgba(255,255,255,0.01); }
                .material-title-line { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
                .positions-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                .positions-table th { text-align: left; padding: 10px 8px; color: #9ca3af; font-weight: 700; border-bottom: 1px solid #2a2d3e; background: rgba(0,0,0,0.2); text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
                .positions-table td { padding: 8px; border-bottom: 1px solid #23263a; }
                .metrics-banner { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px; background: rgba(99, 102, 241, 0.05); border: 1px solid #2a2d3e; border-radius: 12px; margin-bottom: 12px; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2d3e; border-radius: 10px; }
                .hoverable-row:hover { background: rgba(99, 102, 241, 0.05); }
            `}</style>

            <PageHeader title="Gestión de Stock" subtitle="Inventario físico y posiciones" hideTitleOnMobile />

            <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginBottom: '16px', alignItems: 'flex-end' }}>
                <Select
                    label="Depósito"
                    value={depotId}
                    onChange={setDepotId}
                    disabled={!isAdmin && availableDepots.length === 1}
                    options={[{ value: '', label: 'Seleccionar depósito...' }, ...availableDepots.map(d => ({ value: d.id, label: d.nombre }))]}
                    style={{ flex: isMobile ? '1' : '0 0 200px' }}
                />
                <div style={{ flex: 2, display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <Input
                            label="Búsqueda Rápida"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={setSearchTerm}
                        />
                    </div>
                    {!isMobile && (
                        <Btn 
                            onClick={() => setQuickAddModal(true)} 
                            style={{ height: '38px', width: '38px', padding: 0, minWidth: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}
                            title="Adición Rápida"
                        >+</Btn>
                    )}
                </div>
            </div>

            {!isFetching && generalMetrics && rawStock.length > 0 && (
                <div className="metrics-banner" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="metric-item">
                        <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>Total Kilos</div>
                        <div style={{ fontSize: '18px', color: '#6366f1', fontWeight: 800 }}>{generalMetrics.kilos.toLocaleString('es-AR', { minimumFractionDigits: 1 })} <small style={{fontSize:'10px'}}>kg</small></div>
                    </div>
                    <div className="metric-item">
                        <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>Total Unidades</div>
                        <div style={{ fontSize: '18px', color: '#10b981', fontWeight: 800 }}>{generalMetrics.units.toLocaleString('es-AR')} <small style={{fontSize:'10px'}}>un</small></div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '100px' }}><Spinner /></div>
            ) : (
                <div className="stock-grid">
                    {groupedData.map((group) => {
                        const isExpanded = expandedMaterials.includes(group.item.id);
                        const titleText = `${group.item.categoria || '-'} ${group.item.descripcion}`.toLowerCase();
                        const subTitleText = (group.supplier?.name || 'Sin proveedor').toLowerCase();

                        return (
                            <div key={group.item.id} className="material-card" onClick={() => toggleMaterial(group.item.id)}>
                                <div className="material-header">
                                    <div className="material-title-line">
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                                            <span style={{ 
                                                color: '#6366f1', fontSize: '18px', paddingTop: '2px',
                                                transition: 'transform 0.2s', 
                                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' 
                                            }}>▸</span>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ fontWeight: 700, fontSize: '15px', color: '#f3f4f6', lineHeight: 1.2 }}>
                                                    {titleText.charAt(0).toUpperCase() + titleText.slice(1)}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                                    {subTitleText.charAt(0).toUpperCase() + subTitleText.slice(1)}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'right' }}>
                                            <div style={{ fontWeight: 800, color: '#6366f1', fontSize: '18px' }}>
                                                {group.metrics.kilos.toLocaleString('es-AR', { minimumFractionDigits: 1 })}
                                                <small style={{ fontSize: '10px', fontWeight: 400, marginLeft: '2px' }}>kg</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid #2a2d3e' }}>
                                        <div className="custom-scrollbar">
                                            <table className="positions-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: isMobile ? '60px' : '150px' }}>Ubic.</th>
                                                        <th>Lote</th>
                                                        <th style={{ textAlign: 'right', width: isMobile ? '70px' : '120px' }}>Kilos</th>
                                                        <th style={{ textAlign: 'right', width: isMobile ? '55px' : '120px' }}>Un.</th>
                                                        {isAdmin && <th style={{ textAlign: 'center', width: '50px' }}></th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.entries.map((entry: any) => {
                                                        const isOldest = entry.batch.lotNumber === group.minLotNumber;
                                                        return (
                                                            <tr key={entry.id} className="hoverable-row">
                                                                <td 
                                                                    style={{ color: '#6366f1', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation(); 
                                                                        navigate('/movimientos', { state: { depositoId: entry.posicion?.depot?.id || depotId, posicionId: entry.posicion?.id, itemId: entry.batch?.item?.id } });
                                                                    }}
                                                                >
                                                                    {entry.posicion?.codigo || 'S/P'}
                                                                </td>
                                                                <td onClick={(e) => e.stopPropagation()}>
                                                                    <EditableCell value={entry.batch?.lotNumber || ''} onSave={(val) => handleReassignBatch(entry, val)} style={isOldest ? { color: '#fbbf24', fontWeight: 700 } : undefined} />
                                                                </td>
                                                                <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                                                    <EditableCell numeric value={Number(entry.qtyPrincipal).toFixed(1)} onSave={(val) => handleAdjustQty(entry, val, 'principal')} />
                                                                    {!isMobile && <small style={{opacity:0.6, marginLeft: '2px'}}>{group.item.unidadPrincipal}</small>}
                                                                </td>
                                                                <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                                                    <EditableCell numeric value={Number(entry.qtySecundaria || 0).toFixed(0)} onSave={(val) => handleAdjustQty(entry, val, 'secundaria')} />
                                                                    {!isMobile && <small style={{opacity:0.6, marginLeft: '2px'}}>{group.item.unidadSecundaria}</small>}
                                                                </td>
                                                                {isAdmin && (
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); handleDeleteLine(entry); }} 
                                                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                                                                            title="Eliminar esta línea"
                                                                        >🗑️</button>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {quickAddModal && (
                <Modal title="Adición Rápida" onClose={() => setQuickAddModal(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Select label="Depósito" value={qaDepot || (availableDepots.length === 1 ? availableDepots[0].id : '')} onChange={val => { setQaDepot(val); setQaPosition(''); }} disabled={!isAdmin && availableDepots.length === 1} options={[{ value: '', label: 'Seleccionar...' }, ...availableDepots.map((d: any) => ({ value: d.id, label: d.nombre }))]} style={{ flex: 1 }} />
                            <Select label="Posición" value={qaPosition} onChange={setQaPosition} options={[{ value: '', label: 'Seleccionar...' }, ...(availableDepots.find((d: any) => d.id === (qaDepot || (availableDepots.length === 1 ? availableDepots[0].id : '')))?.positions?.map((p: any) => ({ value: p.id, label: p.codigo })) || [])]} style={{ flex: 1 }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                            <SearchSelect label="Proveedor" value={qaSupplier} onChange={val => { setQaSupplier(val); setQaItem(''); }} options={supplierOptions} placeholder="Buscar proveedor..." style={{ flex: 1 }} />
                            <Btn small variant="secondary" onClick={() => setCreatePartnerModal(true)}>+</Btn>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                            <SearchSelect label="Material" value={qaItem} onChange={setQaItem} options={[{ value: '', label: 'Seleccionar...' }, ...qaFilteredItems.map((i: any) => ({ value: i.id, label: `${i.codigoInterno} - ${i.descripcion}` }))]} placeholder="Buscar material..." style={{ flex: 1 }} />
                            <Btn small variant="secondary" onClick={() => setCreateItemModal(true)}>+</Btn>
                        </div>
                        <Input label="Lote" value={qaLot} onChange={setQaLot} />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Input label={`Cant (${qaSelectedItem?.unidadPrincipal || 'Kg'})`} type="number" value={qaPrincipal} onChange={setQaPrincipal} style={{ flex: 1 }} />
                            <Input label={`Sec (${qaSelectedItem?.unidadSecundaria || 'Un'})`} type="number" value={qaSecundaria} onChange={setQaSecundaria} style={{ flex: 1 }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Btn variant="secondary" onClick={() => setQuickAddModal(false)}>Can</Btn>
                        <Btn onClick={handleQuickAddSubmit}>Conf</Btn>
                    </div>
                </Modal>
            )}

            <CreateItemDialog open={createItemModal} onClose={() => setCreateItemModal(false)} onSuccess={(newItem: any) => { setQaItem(newItem.id); }} />
            <CreatePartnerDialog open={createPartnerModal} onClose={() => setCreatePartnerModal(false)} onSuccess={(newPartner: any) => { setQaSupplier(newPartner.id); }} />
        </div>
    );
}
