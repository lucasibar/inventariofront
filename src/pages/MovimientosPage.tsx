import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useGetDepotsQuery } from '../features/depots/api/depots.api';
import {
    useGetStockQuery,
    useMoveStockMutation,
    useBulkMoveStockMutation,
    useAdjustStockMutation,
    useUpdateBatchNumberMutation,
    useQuickAddStockMutation,
    useDeleteStockMutation
} from '../features/stock/api/stock.api';
import { useUpdateItemMutation, useGetItemsQuery } from '../features/items/api/items.api';
import { useGetPartnersQuery } from '../features/partners/api/partners.api';
import { PageHeader, Card, Table, Select, Input, Btn, Modal, EditableCell, useIsMobile, ActionMenu } from './common/ui';
import { CreateItemDialog } from '../features/remitos/ui/CreateItemDialog';
import { CreatePartnerDialog } from '../features/remitos/ui/CreatePartnerDialog';

import { useSelector } from 'react-redux';
import { selectCurrentUser, selectAllowedDepots } from '../entities/auth/model/authSlice';

export default function MovimientosPage() {
    const isMobile = useIsMobile();
    const user = useSelector(selectCurrentUser);
    const allowedDepots = useSelector(selectAllowedDepots);
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

    const [depositoIdLeft, setDepositoIdLeft] = useState('');
    const [posicionIdLeft, setPosicionIdLeft] = useState('');
    const [selectedLeft, setSelectedLeft] = useState<string[]>([]);

    const [depositoIdRight, setDepositoIdRight] = useState('');
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

    const { data: stockLeft = [], isLoading: loadingLeft } = useGetStockQuery({
        depotId: depositoIdLeft, positionId: posicionIdLeft
    }, { skip: !depositoIdLeft || !posicionIdLeft });

    const { data: stockRight = [], isLoading: loadingRight } = useGetStockQuery({
        depotId: depositoIdRight, positionId: posicionIdRight
    }, { skip: !depositoIdRight || !posicionIdRight });

    const [moveStock] = useMoveStockMutation();
    const [bulkMoveStock] = useBulkMoveStockMutation();
    const [adjustStock] = useAdjustStockMutation();
    const [updateBatchNumber] = useUpdateBatchNumberMutation();
    const [updateItem] = useUpdateItemMutation();
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
        return items.filter((i: any) => i.supplierId === qaSupplier);
    }, [items, qaSupplier]);

    const qaSelectedItem = useMemo(() => items.find((i: any) => i.id === qaItem), [items, qaItem]);

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

        const itemsToMove = stockItems
            .filter((m: any) => selectedIds.includes(m.batch.id))
            .map((m: any) => ({
                depositoId: destDepot,
                posicionIdOrigen: m.posicion.id,
                posicionIdDestino: destPos,
                itemId: m.batch.item.id,
                lotId: m.batch.id,
                qtyPrincipal: m.qtyPrincipal,
                qtySecundaria: m.qtySecundaria
            }));

        try {
            await bulkMoveStock({
                items: itemsToMove,
                fecha: new Date().toISOString(),
                observaciones: `Traslado masivo para ${selectedIds.length} ítems`
            }).unwrap();
            
            if (source === 'left') setSelectedLeft([]);
            else setSelectedRight([]);
            
            alert('Transferencia completada con éxito.');
        } catch (e: any) {
            alert(e?.data?.message || 'Error en transferencia grupal');
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
        if (!window.confirm('¿Estás seguro de eliminar TODO este balance?')) return;
        try {
            await deleteStock({
                depositoId: row.posicion.depotId,
                posicionId: row.posicion.id,
                itemId: row.batch.item.id,
                lotId: row.batch.id,
                fecha: new Date().toISOString()
            }).unwrap();
        } catch (e: any) { alert(e?.data?.message || 'Error eliminando stock'); }
    };

    const handleAdjustQty = async (row: any, val: string) => {
        const newQty = Number(val);
        const delta = newQty - row.qtyPrincipal;
        if (delta === 0) return;
        try {
            await adjustStock({
                depositoId: row.posicion.depotId, posicionId: row.posicion.id,
                itemId: row.batch.item.id, lotId: row.batch.id,
                qtyPrincipal: delta, qtySecundaria: 0, fecha: new Date().toISOString(),
                observaciones: 'Ajuste rápido desde Movimientos'
            }).unwrap();
        } catch (e: any) { alert(e?.data?.message || 'Error ajustando stock'); }
    };

    const handleUpdateBatch = async (row: any, val: string) => {
        if (val === row.batch.lotNumber) return;
        try {
            await updateBatchNumber({ batchId: row.batch.id, newLotNumber: val }).unwrap();
        } catch (e: any) { alert(e?.data?.message || 'Error actualizando lote'); }
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
        'Material', 'Lote', 'Stock', ''
    ];

    const buildRows = (stock: any[], side: 'left' | 'right') => stock.map(entry => {
        const isSelected = (side === 'left' ? selectedLeft : selectedRight).includes(entry.batch.id);
        return [
            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(entry.batch.id, side)} />,
            <div style={{ fontSize: '12px' }}>
                <div style={{ fontWeight: 600, color: '#f3f4f6' }}>{entry.batch.item.descripcion}</div>
                <code style={{ fontSize: '10px', color: '#6366f1' }}>{entry.batch.item.codigoInterno}</code>
            </div>,
            <EditableCell value={entry.batch.lotNumber} onSave={(val) => handleUpdateBatch(entry, val)} />,
            <div style={{ textAlign: 'right', fontWeight: 700 }}>
                <EditableCell numeric value={Number(entry.qtyPrincipal).toFixed(1)} onSave={(val) => handleAdjustQty(entry, val)} />
                <span style={{fontSize: '9px', opacity: 0.6, marginLeft: '4px'}}>{entry.batch.item.unidadPrincipal}</span>
            </div>,
            <ActionMenu options={[
                { label: 'Ajustar Cantidad', icon: '✏️', onClick: () => {
                    const newQty = prompt('Nueva cantidad:', entry.qtyPrincipal.toString());
                    if (newQty) handleAdjustQty(entry, newQty);
                }},
                ...(isAdmin ? [{ label: 'Eliminar Registro', icon: '🗑️', color: '#ef4444', onClick: () => handleDeleteLine(entry) }] : [])
            ]} />
        ];
    });

    const posOptionsLeft = availableDepots.find((d: any) => d.id === depositoIdLeft)?.posiciones?.map((p: any) => ({ value: p.id, label: p.codigo })) || [];
    const posOptionsRight = availableDepots.find((d: any) => d.id === depositoIdRight)?.posiciones?.map((p: any) => ({ value: p.id, label: p.codigo })) || [];
    const posOptionsLeftModal = availableDepots.find((d: any) => d.id === (qaDepot || (availableDepots.length === 1 ? availableDepots[0].id : '')))?.posiciones?.map((p: any) => ({ value: p.id, label: p.codigo })) || [];

    return (
        <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '1600px', margin: '0 auto' }}>
            <style>{`
                .movimientos-grid { 
                    display: grid; 
                    grid-template-columns: ${isMobile ? '1fr' : '1fr 40px 1fr'}; 
                    gap: 12px; 
                    align-items: start;
                }
                .side-panel { display: flex; flex-direction: column; gap: 12px; }
                .move-arrow-container { 
                    display: flex; align-items: center; justify-content: center; height: 100%; 
                    flex-direction: ${isMobile ? 'row' : 'column'}; gap: 12px; padding: ${isMobile ? '20px 0' : '160px 0'};
                }
                .move-btn {
                    background: #6366f1; border: none; border-radius: 50%; width: 48px; height: 48px;
                    color: white; cursor: pointer; transition: all 0.2s;
                    display: flex; align-items: center; justify-content: center; font-size: 20px;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
                }
                .move-btn:disabled { background: #1e2133; color: #4b5563; cursor: not-allowed; }
                .move-btn:hover:not(:disabled) { transform: scale(1.1); background: #4f46e5; }
            `}</style>

            <PageHeader title="Manejo de Movimientos" subtitle="Transferencias entre posiciones y edición rápida">
                <Btn onClick={() => setQuickAddModal(true)}>+ Adición Rápida</Btn>
            </PageHeader>

            <div className="movimientos-grid">
                {/* PANEL IZQUIERDO */}
                <div className="side-panel">
                    <Card style={{ padding: '12px' }}>
                        <h3 style={{ color: '#a5b4fc', fontSize: '13px', margin: '0 0 12px 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📤 Origen</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Select
                                label="Depósito"
                                value={depositoIdLeft}
                                onChange={val => { setDepositoIdLeft(val); setPosicionIdLeft(''); setSelectedLeft([]); }}
                                options={[{ value: '', label: 'Seleccionar' }, ...availableDepots.map((d: any) => ({ value: d.id, label: d.nombre }))]}
                                style={{ flex: 1 }}
                            />
                            <Select
                                rowLabel={false}
                                label="Posición"
                                value={posicionIdLeft}
                                onChange={val => { setPosicionIdLeft(val); setSelectedLeft([]); }}
                                options={[{ value: '', label: 'Seleccionar' }, ...posOptionsLeft]}
                                style={{ flex: 1 }}
                            />
                        </div>
                    </Card>

                    <Card style={{ padding: '0', overflow: 'hidden' }}>
                        {depositoIdLeft && posicionIdLeft ? (
                            <Table loading={loadingLeft} cols={buildCols('left')} rows={buildRows(stockLeft, 'left')} />
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#4b5563', fontSize: '13px' }}>Seleccioná origen para ver stock</div>
                        )}
                    </Card>
                </div>

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

                {/* PANEL DERECHO */}
                <div className="side-panel">
                    <Card style={{ padding: '12px' }}>
                        <h3 style={{ color: '#34d399', fontSize: '13px', margin: '0 0 12px 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📥 Destino</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Select
                                label="Depósito"
                                value={depositoIdRight}
                                onChange={val => { setDepositoIdRight(val); setPosicionIdRight(''); setSelectedRight([]); }}
                                options={[{ value: '', label: 'Seleccionar' }, ...availableDepots.map((d: any) => ({ value: d.id, label: d.nombre }))]}
                                style={{ flex: 1 }}
                            />
                            <Select
                                label="Posición"
                                value={posicionIdRight}
                                onChange={val => { setPosicionIdRight(val); setSelectedRight([]); }}
                                options={[{ value: '', label: 'Seleccionar' }, ...posOptionsRight]}
                                style={{ flex: 1 }}
                            />
                        </div>
                    </Card>

                    <Card style={{ padding: '0', overflow: 'hidden' }}>
                        {depositoIdRight && posicionIdRight ? (
                            <Table loading={loadingRight} cols={buildCols('right')} rows={buildRows(stockRight, 'right')} />
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#4b5563', fontSize: '13px' }}>Seleccioná destino para ver stock</div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Modals */}
            {quickAddModal && (
                <Modal title="Adición Rápida" onClose={() => setQuickAddModal(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Select label="Depósito" value={qaDepot} onChange={val => { setQaDepot(val); setQaPosition(''); }} options={[{ value: '', label: 'Seleccionar' }, ...availableDepots.map((d: any) => ({ value: d.id, label: d.nombre }))]} style={{ flex: 1 }} />
                            <Select label="Posición" value={qaPosition} onChange={setQaPosition} options={[{ value: '', label: 'Seleccionar' }, ...posOptionsLeftModal]} style={{ flex: 1 }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                            <Select label="Proveedor" value={qaSupplier} onChange={val => { setQaSupplier(val); setQaItem(''); }} options={[{ value: '', label: 'Seleccionar' }, ...partners.filter((p: any) => p.isSupplier).map((p: any) => ({ value: p.id, label: p.name }))]} style={{ flex: 1 }} />
                            <Btn variant="secondary" onClick={() => setCreatePartnerModal(true)}>+</Btn>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                            <Select label="Material" value={qaItem} onChange={setQaItem} options={[{ value: '', label: 'Seleccionar' }, ...qaFilteredItems.map((i: any) => ({ value: i.id, label: `${i.codigoInterno} - ${i.descripcion}` }))]} style={{ flex: 1 }} />
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

            <CreateItemDialog open={createItemModal} onClose={() => setCreateItemModal(false)} onSuccess={(newItem: any) => { setQaItem(newItem.id); }} />
            <CreatePartnerDialog open={createPartnerModal} onClose={() => setCreatePartnerModal(false)} onSuccess={(newPartner: any) => { setQaSupplier(newPartner.id); }} />
        </div>
    );
}
