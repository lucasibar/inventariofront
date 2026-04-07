import { useState } from 'react';
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
import { PageHeader, Card, Table, Select, Input, Btn, Modal, EditableCell } from './common/ui';
import { CreateItemDialog } from '../features/remitos/ui/CreateItemDialog';
import { CreatePartnerDialog } from '../features/remitos/ui/CreatePartnerDialog';

export default function MovimientosPage() {
    const { data: depots = [] } = useGetDepotsQuery();

    // Left Panel State
    const [depositoIdLeft, setDepositoIdLeft] = useState('');
    const [posicionIdLeft, setPosicionIdLeft] = useState('');
    const [selectedLeft, setSelectedLeft] = useState<string[]>([]);

    // Right Panel State
    const [depositoIdRight, setDepositoIdRight] = useState('');
    const [posicionIdRight, setPosicionIdRight] = useState('');
    const [selectedRight, setSelectedRight] = useState<string[]>([]);

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
            .filter((m: any) => selectedIds.includes(m.id))
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
                observaciones: `Traslado masivo desde ${source === 'left' ? posicionIdLeft : posicionIdRight}`
            }).unwrap();
            
            if (source === 'left') setSelectedLeft([]);
            else setSelectedRight([]);
            
            alert('Transferencia completada con éxito.');
        } catch (e: any) {
            alert(e?.data?.message || 'Error en transferencia grupal');
        }
    };

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

    const handleDeleteBalance = async (row: any) => {
        if (!window.confirm('¿Estás seguro de eliminar TODO este balance de la posición?')) return;
        try {
            await deleteStock({
                depositoId: row.depositoId || row.posicion?.depot?.id || row.deposito?.id,
                posicionId: row.posicionId || row.posicion?.id,
                itemId: row.batch?.item?.id,
                lotId: row.batch.id,
                fecha: new Date().toISOString()
            }).unwrap();
        } catch (e: any) { alert(e?.data?.message || 'Error eliminando stock'); }
    };

    // Transfer Modal State
    const [transferModal, setTransferModal] = useState<{ source: 'left' | 'right', item: any } | null>(null);
    const [transferPrincipal, setTransferPrincipal] = useState('');
    const [transferSecundaria, setTransferSecundaria] = useState('');

    const handleTransferClick = (item: any, source: 'left' | 'right') => {
        const destDepot = source === 'left' ? depositoIdRight : depositoIdLeft;
        const destPos = source === 'left' ? posicionIdRight : posicionIdLeft;

        if (!destDepot || !destPos) {
            alert('Seleccioná un depósito y posición de destino en el otro panel.');
            return;
        }

        setTransferModal({ source, item });
        setTransferPrincipal(String(item.qtyPrincipal));
        setTransferSecundaria(item.qtySecundaria ? String(item.qtySecundaria) : '');
    };

    const confirmTransfer = async () => {
        if (!transferModal) return;
        const { source, item } = transferModal;
        const destDepot = source === 'left' ? depositoIdRight : depositoIdLeft;
        const destPos = source === 'left' ? posicionIdRight : posicionIdLeft;

        try {
            await moveStock({
                depositoId: destDepot,
                posicionIdOrigen: item.posicion.id,
                posicionIdDestino: destPos,
                itemId: item.batch?.item?.id,
                lotId: item.batch.id,
                qtyPrincipal: Number(transferPrincipal),
                qtySecundaria: transferSecundaria ? Number(transferSecundaria) : undefined,
                fecha: new Date().toISOString()
            }).unwrap();
            setTransferModal(null);
        } catch (err: any) {
            alert(err?.data?.message || 'Error al mover stock');
        }
    };

    // Inline edit handlers (igual que antes)
    const handleEditPrincipal = async (val: string, row: any) => {
        const newQty = Number(val);
        const delta = newQty - row.qtyPrincipal;
        if (delta === 0) return;
        await adjustStock({
            depositoId: row.deposito.id, posicionId: row.posicion.id,
            itemId: row.batch?.item?.id, lotId: row.batch.id,
            qtyPrincipal: delta, qtySecundaria: 0, fecha: new Date().toISOString(),
            observaciones: 'Ajuste rápido desde Movimientos'
        }).unwrap();
    };

    const handleEditSecundaria = async (val: string, row: any) => {
        const newQty = Number(val);
        const delta = newQty - (row.qtySecundaria || 0);
        if (delta === 0) return;
        await adjustStock({
            depositoId: row.deposito.id, posicionId: row.posicion.id,
            itemId: row.batch?.item?.id, lotId: row.batch.id,
            qtyPrincipal: 0, qtySecundaria: delta, fecha: new Date().toISOString(),
            observaciones: 'Ajuste rápido desde Movimientos'
        }).unwrap();
    };

    const handleEditLotNumber = async (val: string, row: any) => {
        if (val === row.batch.lotNumber) return;
        await updateBatchNumber({ batchId: row.batch.id, newLotNumber: val }).unwrap();
    };

    const handleEditItemName = async (val: string, row: any) => {
        if (val === row.batch?.item?.descripcion) return;
        if (!window.confirm(`¿Estás seguro que querés cambiar el nombre del material para todo el sistema a "${val}"?`)) return;
        await updateItem({ id: row.batch?.item?.id, data: { descripcion: val } }).unwrap();
    };

    // Columns builder
    const buildCols = (side: 'left' | 'right') => [
        <input type="checkbox" onChange={(e) => {
            const stock = side === 'left' ? stockLeft : stockRight;
            if (e.target.checked) (side === 'left' ? setSelectedLeft : setSelectedRight)(stock.map((m: any) => m.id));
            else (side === 'left' ? setSelectedLeft : setSelectedRight)([]);
        }} checked={(side === 'left' ? selectedLeft : selectedRight).length === (side === 'left' ? stockLeft : stockRight).length && (side === 'left' ? stockLeft : stockRight).length > 0} />,
        'Material', 'Partida', 'Principal', 'Secundario', ''
    ];

    const buildRows = (stock: any[], side: 'left' | 'right') => stock.map(m => [
        <input type="checkbox" checked={(side === 'left' ? selectedLeft : selectedRight).includes(m.id)} onChange={() => toggleSelect(m.id, side)} />,
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#f3f4f6', fontWeight: 600 }}>
                <EditableCell value={m.batch?.item?.descripcion || ''} onSave={val => handleEditItemName(val, m)} />
            </span>
            <code style={{ color: '#a5b4fc', fontSize: '11px' }}>{m.batch?.item?.codigoInterno || '—'}</code>
        </div>,
        <div style={{ color: '#fbbf24', fontWeight: 600 }}>
            <EditableCell value={m.batch?.lotNumber || ''} onSave={val => handleEditLotNumber(val, m)} />
        </div>,
        <div style={{ color: '#34d399', fontWeight: 600, whiteSpace: 'nowrap' }}>
            <EditableCell numeric value={String(m.qtyPrincipal)} onSave={val => handleEditPrincipal(val, m)} /> {m.batch?.item?.unidadPrincipal}
        </div>,
        <div style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>
            <EditableCell numeric value={String(m.qtySecundaria || 0)} onSave={val => handleEditSecundaria(val, m)} /> {m.batch?.item?.unidadSecundaria || ''}
        </div>,
        <div style={{ display: 'flex', gap: '4px' }}>
            <Btn small onClick={() => handleTransferClick(m, side)} title="Mover individual" style={{ padding: '4px' }}>➔</Btn>
            <button onClick={() => handleDeleteBalance(m)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Borrar">🗑</button>
        </div>
    ]);

    const posOptionsLeft = depots.find((d: any) => d.id === depositoIdLeft)?.positions?.map((p: any) => ({ value: p.id, label: p.codigo })) || [];
    const posOptionsRight = depots.find((d: any) => d.id === depositoIdRight)?.positions?.map((p: any) => ({ value: p.id, label: p.codigo })) || [];

    const posOptionsLeftModal = depots.find((d: any) => d.id === qaDepot)?.positions?.map((p: any) => ({ value: p.id, label: p.codigo })) || [];

    return (
        <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
            <PageHeader title="Manejo de Movimientos" subtitle="Transferencias grupales entre posiciones y edición rápida">
                <Btn onClick={() => setQuickAddModal(true)}>+ Adición Rápida</Btn>
            </PageHeader>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Left Panel */}
                <Card style={{ background: '#0f111a' }}>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid #2a2d3e', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Select
                            value={depositoIdLeft}
                            onChange={val => { setDepositoIdLeft(val); setPosicionIdLeft(''); setSelectedLeft([]); }}
                            options={[{ value: '', label: 'Depósito' }, ...depots.map((d: any) => ({ value: d.id, label: d.nombre }))]}
                            style={{ flex: 1 }}
                        />
                        <Select
                            value={posicionIdLeft}
                            onChange={val => { setPosicionIdLeft(val); setSelectedLeft([]); }}
                            options={[{ value: '', label: 'Posición' }, ...posOptionsLeft]}
                            style={{ flex: 1 }}
                        />
                        <Btn 
                            variant="primary" 
                            small 
                            disabled={selectedLeft.length === 0 || !posicionIdRight}
                            onClick={() => handleBulkTransfer('left')}
                            style={{ whiteSpace: 'nowrap' }}
                        >Mover Marcados ➔</Btn>
                    </div>
                    {depositoIdLeft && posicionIdLeft ? (
                        <Table loading={loadingLeft} cols={buildCols('left')} rows={buildRows(stockLeft, 'left')} />
                    ) : (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#4b5563' }}>Filtra origen para ver stock</div>
                    )}
                </Card>

                {/* Right Panel */}
                <Card style={{ background: '#0f111a' }}>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid #2a2d3e', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Btn 
                            variant="primary" 
                            small 
                            disabled={selectedRight.length === 0 || !posicionIdLeft}
                            onClick={() => handleBulkTransfer('right')}
                            style={{ whiteSpace: 'nowrap' }}
                        >⬅ Mover Marcados</Btn>
                        <Select
                            value={depositoIdRight}
                            onChange={val => { setDepositoIdRight(val); setPosicionIdRight(''); setSelectedRight([]); }}
                            options={[{ value: '', label: 'Depósito' }, ...depots.map((d: any) => ({ value: d.id, label: d.nombre }))]}
                            style={{ flex: 1 }}
                        />
                        <Select
                            value={posicionIdRight}
                            onChange={val => { setPosicionIdRight(val); setSelectedRight([]); }}
                            options={[{ value: '', label: 'Posición' }, ...posOptionsRight]}
                            style={{ flex: 1 }}
                        />
                    </div>
                    {depositoIdRight && posicionIdRight ? (
                        <Table loading={loadingRight} cols={buildCols('right')} rows={buildRows(stockRight, 'right')} />
                    ) : (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#4b5563' }}>Filtra origen para ver stock</div>
                    )}
                </Card>
            </div>

            {/* Transfer Modal individual */}
            {transferModal && (
                <Modal title="Transferir Mercadería" onClose={() => setTransferModal(null)}>
                    <div style={{ marginBottom: '20px', color: '#9ca3af', fontSize: '14px' }}>
                        Moviendo <strong>{transferModal.item.batch?.item?.descripcion}</strong> (Partida {transferModal.item.batch?.lotNumber})
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                        <Input label={`Cant. Principal`} type="number" value={transferPrincipal} onChange={setTransferPrincipal} style={{ flex: 1 }} />
                        <Input label={`Secundaria`} type="number" value={transferSecundaria} onChange={setTransferSecundaria} style={{ flex: 1 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <Btn variant="secondary" onClick={() => setTransferModal(null)}>Cancelar</Btn>
                        <Btn onClick={confirmTransfer}>Confirmar</Btn>
                    </div>
                </Modal>
            )}

            {/* Quick Add Modal */}
            {quickAddModal && (
                <Modal title="Adición Rápida" onClose={() => setQuickAddModal(false)}>
                    {/* ... (mismo contenido que antes, omitido por brevedad en el prompt pero debe incluirse en la implementación real) ... */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Select label="Depósito" value={qaDepot} onChange={val => { setQaDepot(val); setQaPosition(''); }} options={[{ value: '', label: 'Seleccionar...' }, ...depots.map((d: any) => ({ value: d.id, label: d.nombre }))]} style={{ flex: 1 }} />
                            <Select label="Posición" value={qaPosition} onChange={setQaPosition} options={[{ value: '', label: 'Seleccionar...' }, ...posOptionsLeftModal]} style={{ flex: 1 }} />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                            <Select label="Material" value={qaItem} onChange={setQaItem} options={[{ value: '', label: 'Seleccionar...' }, ...items.map((i: any) => ({ value: i.id, label: `${i.codigoInterno} - ${i.descripcion}` }))]} style={{ flex: 1 }} />
                            <Btn variant="secondary" onClick={() => setCreateItemModal(true)} style={{ whiteSpace: 'nowrap' }}>+</Btn>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                            <Select label="Proveedor" value={qaSupplier} onChange={setQaSupplier} options={[{ value: '', label: 'Seleccionar...' }, ...partners.filter((p: any) => p.isSupplier).map((p: any) => ({ value: p.id, label: p.name }))]} style={{ flex: 1 }} />
                            <Btn variant="secondary" onClick={() => setCreatePartnerModal(true)} style={{ whiteSpace: 'nowrap' }}>+</Btn>
                        </div>
                        <Input label="Lote" value={qaLot} onChange={setQaLot} />
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Input label="Cant. Principal" type="number" value={qaPrincipal} onChange={setQaPrincipal} style={{ flex: 1 }} />
                            <Input label="Cant. Secundaria" type="number" value={qaSecundaria} onChange={setQaSecundaria} style={{ flex: 1 }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <Btn variant="secondary" onClick={() => setQuickAddModal(false)}>Cancelar</Btn>
                        <Btn onClick={handleQuickAddSubmit}>Aceptar</Btn>
                    </div>
                </Modal>
            )}

            <CreateItemDialog open={createItemModal} onClose={() => setCreateItemModal(false)} onSuccess={(newItem: any) => { setQaItem(newItem.id); }} />
            <CreatePartnerDialog open={createPartnerModal} onClose={() => setCreatePartnerModal(false)} onSuccess={(newPartner: any) => { setQaSupplier(newPartner.id); }} />
        </div>
    );
}
