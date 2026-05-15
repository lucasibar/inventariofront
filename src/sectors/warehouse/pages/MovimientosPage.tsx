import { useState, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { useGetDepotsQuery } from '../deposito/api/deposito.api';
import { useGetStockQuery, useBulkMoveStockMutation, useAdjustStockMutation, useReassignBatchMutation, useLazyCheckBatchQuery, useQuickAddStockMutation, useDeleteStockMutation } from '../stock/api/stock.api';
import { useDespachoDirectoMutation } from '../remitosSalida/api/remitos-salida.api';
import { useGetItemsQuery } from '../materiales/api/items.api';
import { useGetPartnersQuery } from '../../config/partners/api/partners.api';
import { PageHeader, Card, Table, Select, SearchSelect, Input, Btn, Modal, EditableCell, useIsMobile, Badge } from '../../../shared/ui';
import { CreateItemDialog } from '../materiales/components/CreateItemDialog';
import { CreatePartnerDialog } from '../../config/components/CreatePartnerDialog';

import { useSelector } from 'react-redux';
import { selectCurrentUser, selectAllowedDepots } from '../../../entities/auth/model/authSlice';

export default function MovimientosPage() {
    const isMobile = useIsMobile();
    const user = useSelector(selectCurrentUser);
    const allowedDepots = useSelector(selectAllowedDepots);
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    
    useEffect(() => {
        if (searchParams.get('qa') === '1') {
            setQuickAddModal(true);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('qa');
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams]);

    const [depositoIdLeft, setDepositoIdLeft] = useState<string>('');
    const [posicionIdLeft, setPosicionIdLeft] = useState('');
    const [selectedLeft, setSelectedLeft] = useState<string[]>([]);

    const [depositoIdRight, setDepositoIdRight] = useState<string>('');
    const [posicionIdRight, setPosicionIdRight] = useState('');
    const [selectedRight, setSelectedRight] = useState<string[]>([]);

    const { data: rawDepots = [] } = useGetDepotsQuery();

    const availableDepots = useMemo(() => {
        if (isAdmin) return rawDepots;
        return rawDepots.filter((d: any) => allowedDepots.includes(d.id));
    }, [rawDepots, allowedDepots, isAdmin]);

    useEffect(() => {
        if (!depositoIdLeft && availableDepots.length === 1) {
            setDepositoIdLeft(availableDepots[0].id);
        }
        if (!depositoIdRight && availableDepots.length === 1) {
            setDepositoIdRight(availableDepots[0].id);
        }
    }, [availableDepots, depositoIdLeft, depositoIdRight]);

    const { data: stockLeft = [], isFetching: fetchingLeft, refetch: refetchLeft } = useGetStockQuery({
        depotId: depositoIdLeft, positionId: posicionIdLeft
    }, { skip: !depositoIdLeft || !posicionIdLeft });

    const { data: stockRight = [], isFetching: fetchingRight, refetch: refetchRight } = useGetStockQuery({
        depotId: depositoIdRight, positionId: posicionIdRight
    }, { skip: !depositoIdRight || !posicionIdRight });

    const [adjustStock] = useAdjustStockMutation();
    const [reassignBatch] = useReassignBatchMutation();
    const [checkBatchQuery] = useLazyCheckBatchQuery();
    const [bulkMoveStock] = useBulkMoveStockMutation();
    const [quickAddStock] = useQuickAddStockMutation();
    const [deleteStock] = useDeleteStockMutation();

    const { data: items = [] } = useGetItemsQuery({});
    const { data: partners = [] } = useGetPartnersQuery({});

    // Quick Add Modal State
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
    
    // Partial Move State
    const [partialMoveModal, setPartialMoveModal] = useState(false);
    const [pendingItems, setPendingItems] = useState<any[]>([]);
    const [sourceSide, setSourceSide] = useState<'left' | 'right' | null>(null);

    // Despacho Directo state
    const [despachoDirecto] = useDespachoDirectoMutation();
    const [despachoModal, setDespachoModal] = useState(false);
    const [despachoEntry, setDespachoEntry] = useState<any>(null);
    const [despachoQty, setDespachoQty] = useState('');
    const [despachoQtySec, setDespachoQtySec] = useState('');
    const [despachoClient, setDespachoClient] = useState('');
    const [despachoClientName, setDespachoClientName] = useState('');
    const [despachoNewClient, setDespachoNewClient] = useState(false);
    const [despachoFecha, setDespachoFecha] = useState(new Date().toISOString().split('T')[0]);
    const [despachoSaving, setDespachoSaving] = useState(false);

    const clientOptions = useMemo(() => [
        { value: '', label: 'Seleccionar cliente...' },
        ...(isAdmin ? [{ value: '__new__', label: '+ Nuevo cliente' }] : []),
        ...partners.filter((p: any) => p.type === 'CLIENT' || p.type === 'BOTH').map((p: any) => ({ value: p.id, label: p.name }))
    ], [partners, isAdmin]);

    const openDespacho = (entry: any) => {
        setDespachoEntry(entry);
        setDespachoQty('');
        setDespachoQtySec('');
        setDespachoClient('');
        setDespachoClientName('');
        setDespachoNewClient(false);
        setDespachoFecha(new Date().toISOString().split('T')[0]);
        setDespachoModal(true);
    };

    const handleDespachoSubmit = async () => {
        if (!despachoEntry || !despachoQty) return;
        if (!despachoClient && !despachoClientName) { alert('Seleccioná un cliente'); return; }
        setDespachoSaving(true);
        try {
            const result = await despachoDirecto({
                fecha: despachoFecha,
                clientId: despachoNewClient ? undefined : despachoClient,
                clientName: despachoNewClient ? despachoClientName : undefined,
                depositoId: despachoEntry.depositoId || despachoEntry.posicion?.depotId,
                posicionId: despachoEntry.posicionId || despachoEntry.posicion?.id,
                itemId: despachoEntry.batch.item.id,
                lotId: despachoEntry.batch.id,
                qtyPrincipal: Number(despachoQty),
                qtySecundaria: despachoQtySec ? Number(despachoQtySec) : undefined,
            }).unwrap();
            alert(`✅ Despachado. Remito: ${result.numero}`);
            setDespachoModal(false);
            // Refetch to update UI
            refetchLeft();
            refetchRight();
        } catch (e: any) {
            alert(e?.data?.message || 'Error al despachar');
        } finally {
            setDespachoSaving(false);
        }
    };

    const toggleSelect = (id: string, side: 'left' | 'right') => {
        if (side === 'left') {
            setSelectedLeft(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        } else {
            setSelectedRight(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        }
    };

    const location = useLocation();

    // Pre-populate if navigating from Stock
    useEffect(() => {
        const state = location.state as any;
        if (state && state.depositoId && state.posicionId) {
            setDepositoIdLeft(state.depositoId);
            setPosicionIdLeft(state.posicionId);
        }
    }, [location.state]);

    const qaFilteredItems = useMemo(() => {
        if (!qaSupplier) return items;
        return items.filter((i: any) => !i.supplierId || i.supplierId === qaSupplier);
    }, [items, qaSupplier]);

    const supplierOptions = useMemo(() => [
        { value: '', label: 'Seleccionar' },
        ...partners.filter((p: any) => p.type === 'SUPPLIER' || p.type === 'BOTH').map((p: any) => ({ value: p.id, label: p.name }))
    ], [partners]);



    const handleBulkTransfer = async (source: 'left' | 'right') => {
        const selectedIds = source === 'left' ? selectedLeft : selectedRight;
        const stockItems = source === 'left' ? stockLeft : stockRight;
        const destDepot = source === 'left' ? depositoIdRight : depositoIdLeft;
        const destPos = source === 'left' ? posicionIdRight : posicionIdLeft;

        if (!selectedIds.length) {
            alert('Seleccioná al menos un ítem para mover.');
            return;
        }
        if (!destDepot || !destPos) {
            alert('Seleccioná depósito y posición de destino.');
            return;
        }

        // ALWAYS show partial move modal for one or many items
        const selectedStock = stockItems.filter((m: any) => selectedIds.includes(m.batch.id));
        setPendingItems(selectedStock.map((m: any) => ({
            batchId: m.batch.id,
            itemId: m.batch.item.id,
            posicionIdOrigen: m.posicion.id,
            descripcion: m.batch.item.descripcion,
            lotNumber: m.batch.lotNumber,
            unidadP: m.batch.item.unidadPrincipal,
            unidadS: m.batch.item.unidadSecundaria,
            maxP: Number(m.qtyPrincipal),
            qtyP: String(m.qtyPrincipal),
            qtyS: String(m.qtySecundaria || 0),
            totalPrincipal: m.qtyPrincipal,
            totalSecundaria: m.qtySecundaria || 0
        })));
        setSourceSide(source);
        setPartialMoveModal(true);
    };

    const updatePendingItem = (index: number, field: 'qtyP' | 'qtyS', value: string) => {
        setPendingItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleConfirmPartialMove = async () => {
        if (!sourceSide || !pendingItems.length) return;
        
        const destDepot = sourceSide === 'left' ? depositoIdRight : depositoIdLeft;
        const destPos = sourceSide === 'left' ? posicionIdRight : posicionIdLeft;

        const itemsToMove = pendingItems.map(item => {
            const qp = Number(item.qtyP);
            const qs = Number(item.qtyS);
            
            if (isNaN(qp) || qp <= 0) throw new Error(`Cantidad inválida para ${item.descripcion}`);
            if (qp > item.maxP) throw new Error(`No podés mover más de lo disponible para ${item.descripcion}`);
            
            return {
                depositoId: destDepot,
                posicionIdOrigen: item.posicionIdOrigen,
                posicionIdDestino: destPos,
                itemId: item.itemId,
                lotId: item.batchId,
                qtyPrincipal: qp,
                qtySecundaria: qs || null
            };
        });

        try {
            await bulkMoveStock({
                items: itemsToMove,
                fecha: new Date().toISOString(),
                observaciones: `Traslado confirmado (${itemsToMove.length} ítems)`
            }).unwrap();

            setPartialMoveModal(false);
            if (sourceSide === 'left') setSelectedLeft([]);
            else setSelectedRight([]);
            setSourceSide(null);
            setPendingItems([]);
            
            // Forces manual refetch to ensure immediate cross-panel update
            refetchLeft();
            refetchRight();
        } catch (e: any) {
            alert(e?.message || e?.data?.message || 'Error en traslado');
        }
    };

    const handleQuickAddSubmit = async () => {
        const finalDepot = qaDepot || (availableDepots.length === 1 ? availableDepots[0].id : '');
        if (!finalDepot || !qaPosition || !qaItem || !qaSupplier || !qaLot || !qaPrincipal) {
            alert('Completá todos los campos obligatorios.');
            return;
        }
        try {
            await quickAddStock({
                depositoId: finalDepot,
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

    const handleDeleteLine = async (row: any) => {
        const qtyDesc = `${Number(row.qtyPrincipal).toFixed(1)} ${row.batch.item.unidadPrincipal}`;
        if (!window.confirm(`¿Estás seguro de eliminar este registro de stock?\nSe registrará un movimiento de ajuste negativo por ${qtyDesc} para dejar la posición en cero.`)) return;
        try {
            await deleteStock({
                depositoId: row.depositoId,
                posicionId: row.posicionId,
                itemId: row.batch.item.id,
                lotId: row.batch.id,
                fecha: new Date().toISOString()
            }).unwrap();
        } catch (e: any) { alert(e?.data?.message || 'Error eliminando stock'); }
    };

    const handleAdjustQty = async (row: any, newValue: string, field: 'principal' | 'secundaria') => {
        const newQty = Number(newValue);
        if (isNaN(newQty) || newQty < 0) { alert('Valor inválido'); return; }
        const currentQty = field === 'principal' ? Number(row.qtyPrincipal) : Number(row.qtySecundaria || 0);
        const diff = newQty - currentQty;
        if (diff === 0) return;
        try {
            await adjustStock({
                depositoId: row.depositoId,
                posicionId: row.posicionId,
                itemId: row.batch.item.id,
                lotId: row.batch.id,
                qtyPrincipal: field === 'principal' ? diff : 0,
                qtySecundaria: field === 'secundaria' ? diff : null,
                fecha: new Date().toISOString(),
                observaciones: `Ajuste manual desde Movimientos: ${currentQty} → ${newQty} (${field === 'principal' ? row.batch.item.unidadPrincipal : row.batch.item.unidadSecundaria})`,
            }).unwrap();
        } catch (e: any) { alert(e?.data?.message || 'Error al ajustar'); }
    };

    const handleUpdateBatch = async (row: any, val: string) => {
        if (val === row.batch.lotNumber) return;
        try {
            const result = await checkBatchQuery({ itemId: row.batch.item.id, lotNumber: val, supplierId: row.batch.supplier?.id }).unwrap();
            if (result.exists) {
                if (!window.confirm(`La partida "${val}" ya existe. ¿Fusionar?`)) return;
            } else {
                if (!window.confirm(`La partida "${val}" no existe. Se creará una nueva. ¿Continuar?`)) return;
            }
            await reassignBatch({
                depositoId: row.depositoId,
                posicionId: row.posicionId,
                itemId: row.batch.item.id,
                currentLotId: row.batch.id,
                newLotNumber: val.trim(),
                fecha: new Date().toISOString(),
            }).unwrap();
        } catch (e: any) { alert(e?.data?.message || 'Error reasignando partida'); }
    };

    const buildCols = (side: 'left' | 'right') => [
        <input 
            type="checkbox" 
            onChange={(e) => {
                const stock = side === 'left' ? stockLeft : stockRight;
                if (e.target.checked) (side === 'left' ? setSelectedLeft : setSelectedRight)(stock.map((m: any) => m.batch.id));
                else (side === 'left' ? setSelectedLeft : setSelectedRight)([]);
            }} 
            checked={(side === 'left' ? selectedLeft : selectedRight).length === (side === 'left' ? stockLeft : stockRight).length && (side === 'left' ? stockLeft : stockRight).length > 0} 
        />,
        isMobile ? 'Mat.' : 'Material', 
        'Lote', 
        isMobile ? 'Kg' : 'Stock', 
        isMobile ? 'Un.' : 'Unidades', 
        ''
    ];

    const buildRows = (stock: any[], side: 'left' | 'right') => stock.map(entry => {
        const isSelected = (side === 'left' ? selectedLeft : selectedRight).includes(entry.batch.id);
        return [
            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(entry.batch.id, side)} />,
            <div 
                style={{ fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }} 
                className="clickable-material"
                onClick={() => navigate(`/stock?q=${encodeURIComponent(entry.batch.item.descripcion)}`)}
            >
                <div style={{ fontWeight: 600, color: '#6366f1', whiteSpace: 'normal', maxWidth: isMobile ? '80px' : '150px', lineHeight: '1.2' }}>
                    {entry.batch.item.categoria ? `[${entry.batch.item.categoria}] ` : ''}{entry.batch.item.descripcion}
                </div>
                {!isMobile && <code style={{ fontSize: '10px', opacity: 0.8 }}>{entry.batch.item.codigoInterno}</code>}
            </div>,
            <EditableCell value={entry.batch.lotNumber} onSave={(val) => handleUpdateBatch(entry, val)} inputStyle={isMobile ? { minWidth: '40px' } : undefined} />,
            <div style={{ textAlign: 'right', fontWeight: 700 }}>
                <EditableCell numeric value={Number(entry.qtyPrincipal).toFixed(1)} onSave={(val) => handleAdjustQty(entry, val, 'principal')} inputStyle={isMobile ? { minWidth: '40px' } : undefined} />
                {!isMobile && <span style={{fontSize: '9px', opacity: 0.6, marginLeft: '4px'}}>{entry.batch.item.unidadPrincipal}</span>}
            </div>,
            <div style={{ textAlign: 'right', fontWeight: 700 }}>
                <EditableCell numeric value={Number(entry.qtySecundaria || 0).toFixed(0)} onSave={(val) => handleAdjustQty(entry, val, 'secundaria')} inputStyle={isMobile ? { minWidth: '40px' } : undefined} />
                {!isMobile && <span style={{fontSize: '9px', opacity: 0.6, marginLeft: '4px'}}>{entry.batch.item.unidadSecundaria}</span>}
            </div>,
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                <button 
                    onClick={(e) => { e.stopPropagation(); openDespacho(entry); }} 
                    style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                    title="Despachar (remito de salida)"
                >📦</button>
                {isAdmin && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteLine(entry); }} 
                        style={{ 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            border: '1px solid rgba(239, 68, 68, 0.2)', 
                            color: '#ef4444', 
                            cursor: 'pointer', 
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                        title="Eliminar Registro"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                        </svg>
                    </button>
                )}
            </div>
        ];
    });

    const posOptionsLeft = availableDepots.find((d: any) => d.id === depositoIdLeft)?.positions?.map((p: any) => ({ value: p.id, label: p.codigo })) || [];
    const posOptionsRight = availableDepots.find((d: any) => d.id === depositoIdRight)?.positions?.map((p: any) => ({ value: p.id, label: p.codigo })) || [];
    const posOptionsLeftModal = availableDepots.find((d: any) => d.id === (qaDepot || (availableDepots.length === 1 ? availableDepots[0].id : '')))?.positions?.map((p: any) => ({ value: p.id, label: p.codigo })) || [];

    return (
        <div style={{ 
            padding: isMobile ? '12px' : '24px', 
            maxWidth: '100%', 
            margin: '0 auto',
            boxSizing: 'border-box',
            width: '100%',
            overflowX: 'hidden'
        }}>
            <style>{`
                .movimientos-grid { 
                    display: grid; 
                    grid-template-columns: ${isMobile ? '1fr' : '1fr auto 1fr'}; 
                    gap: ${isMobile ? '4px' : '16px'}; 
                    align-items: start;
                }
                .move-arrow-container { 
                    display: flex; 
                    flex-direction: ${isMobile ? 'row' : 'column'}; 
                    gap: 12px; 
                    align-items: center;
                    justify-content: center;
                    padding: ${isMobile ? '4px 0' : '80px 0 0 0'};
                }
                .move-btn {
                    background: rgba(99, 102, 241, 0.9); 
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(255,255,255,0.1); 
                    border-radius: 12px; 
                    width: 42px; 
                    height: 42px;
                    color: white; 
                    cursor: pointer; 
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-size: 18px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
                }
                .move-btn:disabled { 
                    background: #1e2133; 
                    color: #4b5563; 
                    cursor: not-allowed; 
                    box-shadow: none;
                }
                .move-btn:hover:not(:disabled) { 
                    transform: scale(1.1); 
                    background: #4f46e5; 
                    box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
                }
                .panel-header {
                    padding: 12px 16px;
                    border-bottom: 1px solid #2a2d3e;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .panel-title {
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                @media (max-width: 768px) {
                    table td, table th {
                        padding: 8px 4px !important;
                        font-size: 11px !important;
                    }
                }
                .clickable-material:hover {
                    text-decoration: underline;
                    color: #818cf8;
                }
            `}</style>

            <PageHeader 
                title="Manejo de Movimientos" 
                subtitle="Transferencias entre posiciones y edición rápida"
                hideTitleOnMobile
            >
                {!isMobile && <Btn onClick={() => setQuickAddModal(true)}>+ Adición Rápida</Btn>}
            </PageHeader>

            <div className="movimientos-grid">
                {/* PANEL IZQUIERDO UNIFICADO */}
                <Card style={{ padding: 0, border: '1px solid rgba(165, 180, 252, 0.2)' }}>
                    <div className="panel-header" style={{ background: 'rgba(165, 180, 252, 0.05)' }}>
                        <div className="panel-title" style={{ color: '#a5b4fc' }}>
                            <span style={{ fontSize: '16px' }}>📤</span> Origen
                        </div>
                        {posicionIdLeft && <Badge color="#6366f1">{stockLeft.length} Batchs</Badge>}
                    </div>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2133', display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.1)' }}>
                        <Select
                            label="Depósito"
                            value={depositoIdLeft}
                            onChange={val => { setDepositoIdLeft(val); setPosicionIdLeft(''); setSelectedLeft([]); }}
                            options={[{ value: '', label: 'Seleccionar' }, ...availableDepots.map((d: any) => ({ value: d.id, label: d.nombre }))]}
                            style={{ flex: 1 }}
                        />
                        <SearchSelect
                            label="Posición"
                            value={posicionIdLeft}
                            onChange={val => { setPosicionIdLeft(val); setSelectedLeft([]); }}
                            options={posOptionsLeft}
                            placeholder="Buscar posición..."
                            style={{ flex: 1 }}
                        />
                    </div>
                    <div style={{ opacity: fetchingLeft ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                        {depositoIdLeft && posicionIdLeft ? (
                            <Table loading={fetchingLeft} cols={buildCols('left')} rows={buildRows(stockLeft, 'left')} />
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#4b5563', fontSize: '13px' }}>Seleccioná un depósito y posición</div>
                        )}
                    </div>
                </Card>

                {/* BOTONES DE MOVIMIENTO */}
                <div className="move-arrow-container">
                    <button 
                        className="move-btn"
                        disabled={selectedLeft.length === 0 || !posicionIdRight}
                        onClick={() => handleBulkTransfer('left')}
                        title="Mover seleccionados al destino"
                    >
                        {isMobile ? '↓' : '→'}
                    </button>
                    <button 
                        className="move-btn"
                        disabled={selectedRight.length === 0 || !posicionIdLeft}
                        onClick={() => handleBulkTransfer('right')}
                        title="Mover seleccionados al origen"
                    >
                        {isMobile ? '↑' : '←'}
                    </button>
                </div>

                {/* PANEL DERECHO UNIFICADO */}
                <Card style={{ padding: 0, border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                    <div className="panel-header" style={{ background: 'rgba(52, 211, 153, 0.05)' }}>
                        <div className="panel-title" style={{ color: '#34d399' }}>
                            <span style={{ fontSize: '16px' }}>📥</span> Destino
                        </div>
                        {posicionIdRight && <Badge color="#10b981">{stockRight.length} Batchs</Badge>}
                    </div>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2133', display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.1)' }}>
                        <Select
                            label="Depósito"
                            value={depositoIdRight}
                            onChange={val => { setDepositoIdRight(val); setPosicionIdRight(''); setSelectedRight([]); }}
                            options={[{ value: '', label: 'Seleccionar' }, ...availableDepots.map((d: any) => ({ value: d.id, label: d.nombre }))]}
                            style={{ flex: 1 }}
                        />
                        <SearchSelect
                            label="Posición"
                            value={posicionIdRight}
                            onChange={val => { setPosicionIdRight(val); setSelectedRight([]); }}
                            options={posOptionsRight}
                            placeholder="Buscar posición..."
                            style={{ flex: 1 }}
                        />
                    </div>
                    <div style={{ opacity: fetchingRight ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                        {depositoIdRight && posicionIdRight ? (
                            <Table loading={fetchingRight} cols={buildCols('right')} rows={buildRows(stockRight, 'right')} />
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#4b5563', fontSize: '13px' }}>Seleccioná un depósito y posición</div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Modals */}
            {quickAddModal && (
                <Modal title="Adición Rápida" onClose={() => setQuickAddModal(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Select label="Depósito" value={qaDepot} onChange={val => { setQaDepot(val); setQaPosition(''); }} options={[{ value: '', label: 'Seleccionar' }, ...availableDepots.map((d: any) => ({ value: d.id, label: d.nombre }))]} style={{ flex: 1 }} />
                            <SearchSelect 
                                label="Posición" 
                                value={qaPosition} 
                                onChange={setQaPosition} 
                                options={posOptionsLeftModal} 
                                placeholder="Buscar posición..."
                                style={{ flex: 1 }} 
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                            <SearchSelect label="Proveedor" value={qaSupplier} onChange={val => { setQaSupplier(val); setQaItem(''); }} options={supplierOptions} placeholder="Buscar proveedor..." style={{ flex: 1 }} />
                            <Btn variant="secondary" onClick={() => setCreatePartnerModal(true)}>+</Btn>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                            <SearchSelect label="Material" value={qaItem} onChange={setQaItem} options={[{ value: '', label: 'Seleccionar' }, ...qaFilteredItems.map((i: any) => ({ value: i.id, label: `${i.categoria ? `[${i.categoria}] ` : ''}${i.codigoInterno} - ${i.descripcion}` }))]} placeholder="Buscar material..." style={{ flex: 1 }} />
                            <Btn variant="secondary" onClick={() => setCreateItemModal(true)}>+</Btn>
                        </div>
                        <Input label="Lote" value={qaLot} onChange={setQaLot} />
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Input label="Cantidad Principal" type="number" value={qaPrincipal} onChange={setQaPrincipal} style={{ flex: 1 }} />
                            <Input label="Secundaria" type="number" value={qaSecundaria} onChange={setQaSecundaria} style={{ flex: 1 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                            <Btn variant="secondary" onClick={() => setQuickAddModal(false)}>Cancelar</Btn>
                            <Btn onClick={handleQuickAddSubmit}>Confirmar</Btn>
                        </div>
                    </div>
                </Modal>
            )}

            <CreateItemDialog 
                open={createItemModal} 
                onClose={() => setCreateItemModal(false)} 
                depositoId={qaDepot}
                onSuccess={(newItem: any) => { setQaItem(newItem.id); }} 
            />
            <CreatePartnerDialog open={createPartnerModal} onClose={() => setCreatePartnerModal(false)} onSuccess={(newPartner: any) => { setQaSupplier(newPartner.id); }} />
            {/* Partial Move Modal */}
            {partialMoveModal && (
                <Modal title="Confirmar Traslado" onClose={() => setPartialMoveModal(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '8px' }}>
                        <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Revisá las cantidades antes de confirmar el movimiento:</p>
                        
                        {pendingItems.map((item, idx) => (
                            <div key={item.batchId} style={{ 
                                background: 'rgba(255,255,255,0.02)', 
                                border: '1px solid #2a2d3e', 
                                padding: '12px', 
                                borderRadius: '8px' 
                            }}>
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f3f4f6' }}>{item.descripcion}</div>
                                    <div style={{ fontSize: '11px', color: '#6366f1' }}>Lote: {item.lotNumber}</div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '10px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>
                                            {item.unidadP} (Max: {item.maxP})
                                        </label>
                                        <Input value={item.qtyP} type="number" onChange={(val) => updatePendingItem(idx, 'qtyP', val)} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '10px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>
                                            {item.unidadS}
                                        </label>
                                        <Input value={item.qtyS} type="number" onChange={(val) => updatePendingItem(idx, 'qtyS', val)} />
                                        {Number(item.qtyS) > 0 && Number(item.totalSecundaria) > 0 && (
                                            <div style={{ fontSize: '10px', color: '#6366f1', marginTop: '4px', textAlign: 'right' }}>
                                                ≈ {((Number(item.totalPrincipal) / Number(item.totalSecundaria)) * Number(item.qtyS)).toFixed(2)} {item.unidadP}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                        <Btn style={{ flex: 1, background: '#1f2937' }} onClick={() => setPartialMoveModal(false)}>Cancelar</Btn>
                        <Btn style={{ flex: 1 }} onClick={handleConfirmPartialMove}>Confirmar Movimiento</Btn>
                    </div>
                </Modal>
            )}

            {despachoModal && despachoEntry && (
                <Modal title="Despacho Directo" onClose={() => setDespachoModal(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '12px' }}>
                            <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Material seleccionado</div>
                            <div style={{ color: '#f3f4f6', fontWeight: 700 }}>{despachoEntry.batch.item.descripcion}</div>
                            <div style={{ fontSize: '12px', color: '#a5b4fc', marginTop: '2px' }}>
                                📍 {despachoEntry.posicion?.codigo || 'S/P'} &middot; Lote: {despachoEntry.batch.lotNumber || '—'} &middot; Disp: {Number(despachoEntry.qtyPrincipal).toFixed(1)} {despachoEntry.batch.item.unidadPrincipal}
                            </div>
                        </div>

                        <SearchSelect
                            label="Cliente"
                            value={despachoNewClient ? '__new__' : despachoClient}
                            onChange={v => { 
                                if (v === '__new__') { 
                                    if (!isAdmin) { alert('Solo los administradores pueden crear clientes nuevos'); return; }
                                    setDespachoNewClient(true); 
                                    setDespachoClient(''); 
                                } else { 
                                    setDespachoNewClient(false); 
                                    setDespachoClient(v); 
                                }
                            }}
                            options={clientOptions}
                            placeholder="Buscar cliente..."
                        />
                        {despachoNewClient && isAdmin && <Input label="Nombre del nuevo cliente" value={despachoClientName} onChange={setDespachoClientName} />}

                        <Input label="Fecha" type="date" value={despachoFecha} onChange={setDespachoFecha} />

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Input label={`Cantidad (${despachoEntry.batch.item.unidadPrincipal})`} type="number" value={despachoQty} onChange={setDespachoQty} style={{ flex: 1 }} />
                            {despachoEntry.batch.item.unidadSecundaria && (
                                <div style={{ flex: 1 }}>
                                    <Input label={`Sec. (${despachoEntry.batch.item.unidadSecundaria})`} type="number" value={despachoQtySec} onChange={setDespachoQtySec} />
                                    {Number(despachoQtySec) > 0 && Number(despachoEntry.qtySecundaria) > 0 && (
                                        <div style={{ fontSize: '10px', color: '#6366f1', marginTop: '4px', textAlign: 'right' }}>
                                            ≈ {((Number(despachoEntry.qtyPrincipal) / Number(despachoEntry.qtySecundaria)) * Number(despachoQtySec)).toFixed(2)} {despachoEntry.batch.item.unidadPrincipal}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
                            💡 Si ya existe un remito de salida para esta fecha y cliente, se agregará automáticamente.
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #2a2d3e', paddingTop: '12px' }}>
                            <Btn variant="secondary" onClick={() => setDespachoModal(false)}>Cancelar</Btn>
                            <Btn onClick={handleDespachoSubmit} disabled={despachoSaving || !despachoQty}>
                                {despachoSaving ? 'Despachando...' : '📦 Despachar'}
                            </Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
