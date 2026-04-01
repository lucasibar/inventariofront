import { useState } from 'react';
import { useGetDepotsQuery } from '../features/depots/api/depots.api';
import { 
    useGetStockQuery, 
    useMoveStockMutation, 
    useAdjustStockMutation, 
    useUpdateBatchNumberMutation 
} from '../features/stock/api/stock.api';
import { useUpdateItemMutation } from '../features/items/api/items.api';
import { PageHeader, Card, Table, Select, Input, Btn, Modal, EditableCell } from './common/ui';

export default function MovimientosPage() {
    const { data: depots = [] } = useGetDepotsQuery();

    // Left Panel State
    const [depositoIdLeft, setDepositoIdLeft] = useState('');
    const [posicionIdLeft, setPosicionIdLeft] = useState('');

    // Right Panel State
    const [depositoIdRight, setDepositoIdRight] = useState('');
    const [posicionIdRight, setPosicionIdRight] = useState('');

    const { data: stockLeft = [], isLoading: loadingLeft } = useGetStockQuery({ 
        depotId: depositoIdLeft, positionId: posicionIdLeft 
    }, { skip: !depositoIdLeft || !posicionIdLeft });

    const { data: stockRight = [], isLoading: loadingRight } = useGetStockQuery({ 
        depotId: depositoIdRight, positionId: posicionIdRight 
    }, { skip: !depositoIdRight || !posicionIdRight });

    const [moveStock] = useMoveStockMutation();
    const [adjustStock] = useAdjustStockMutation();
    const [updateBatchNumber] = useUpdateBatchNumberMutation();
    const [updateItem] = useUpdateItemMutation();

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
                itemId: item.item.id,
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

    // Inline edit handlers
    const handleEditPrincipal = async (val: string, row: any) => {
        const newQty = Number(val);
        const delta = newQty - row.qtyPrincipal;
        if (delta === 0) return;
        await adjustStock({
            depositoId: row.deposito.id,
            posicionId: row.posicion.id,
            itemId: row.item.id,
            lotId: row.batch.id,
            deltaPrincipal: delta,
            deltaSecundaria: 0,
            fecha: new Date().toISOString(),
            observaciones: 'Ajuste rápido desde Movimientos'
        }).unwrap();
    };

    const handleEditSecundaria = async (val: string, row: any) => {
        const newQty = Number(val);
        const oldQty = row.qtySecundaria || 0;
        const delta = newQty - oldQty;
        if (delta === 0) return;
        await adjustStock({
            depositoId: row.deposito.id,
            posicionId: row.posicion.id,
            itemId: row.item.id,
            lotId: row.batch.id,
            deltaPrincipal: 0,
            deltaSecundaria: delta,
            fecha: new Date().toISOString(),
            observaciones: 'Ajuste rápido desde Movimientos'
        }).unwrap();
    };

    const handleEditLotNumber = async (val: string, row: any) => {
        if (val === row.batch.lotNumber) return;
        await updateBatchNumber({ batchId: row.batch.id, newLotNumber: val }).unwrap();
    };

    const handleEditItemName = async (val: string, row: any) => {
        if (val === row.item.descripcion) return;
        if (!window.confirm(`¿Estás seguro que querés cambiar el nombre del material para todo el sistema a "${val}"?`)) return;
        await updateItem({ id: row.item.id, data: { descripcion: val } }).unwrap();
    };

    // Columns builder
    const buildCols = () => [
        'Material', 'Partida', 'Stock Principal', 'Secundario', ''
    ];

    const buildRows = (stock: any[], source: 'left' | 'right') => stock.map(m => [
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#f3f4f6', fontWeight: 600 }}>
                <EditableCell value={m.item?.descripcion || ''} onSave={val => handleEditItemName(val, m)} />
            </span>
            <code style={{ color: '#a5b4fc', fontSize: '11px' }}>{m.item?.codigoInterno || '—'}</code>
        </div>,
        <div style={{ color: '#fbbf24', fontWeight: 600 }}>
            <EditableCell value={m.batch?.lotNumber || ''} onSave={val => handleEditLotNumber(val, m)} />
        </div>,
        <div style={{ color: '#34d399', fontWeight: 600 }}>
            <EditableCell numeric value={String(m.qtyPrincipal)} onSave={val => handleEditPrincipal(val, m)} /> {m.item.unidadPrincipal}
        </div>,
        <div style={{ color: '#9ca3af' }}>
            <EditableCell numeric value={String(m.qtySecundaria || 0)} onSave={val => handleEditSecundaria(val, m)} /> {m.item.unidadSecundaria || ''}
        </div>,
        <Btn small onClick={() => handleTransferClick(m, source)} style={{ padding: '4px 8px' }}>
            {source === 'left' ? 'Mover ➔' : '⬅ Mover'}
        </Btn>
    ]);

    const posOptionsLeft = depots.find((d: any) => d.id === depositoIdLeft)?.positions?.map((p: any) => ({ value: p.id, label: p.codigo })) || [];
    const posOptionsRight = depots.find((d: any) => d.id === depositoIdRight)?.positions?.map((p: any) => ({ value: p.id, label: p.codigo })) || [];

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Manejo de Movimientos" subtitle="Transferencias entre posiciones y edición rápida" />

            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                {/* Left Panel */}
                <Card style={{ flex: 1 }}>
                    <div style={{ padding: '16px', background: '#1e2133', borderBottom: '1px solid #2a2d3e', display: 'flex', gap: '12px' }}>
                        <Select
                            value={depositoIdLeft}
                            onChange={val => { setDepositoIdLeft(val); setPosicionIdLeft(''); }}
                            options={[{ value: '', label: 'Seleccionar depósito' }, ...depots.map((d: any) => ({ value: d.id, label: d.nombre }))]}
                            style={{ flex: 1 }}
                        />
                        <Select
                            value={posicionIdLeft}
                            onChange={setPosicionIdLeft}
                            options={[{ value: '', label: 'Seleccionar posición' }, ...posOptionsLeft]}
                            style={{ flex: 1 }}
                        />
                    </div>
                    {depositoIdLeft && posicionIdLeft ? (
                        <Table
                            loading={loadingLeft}
                            cols={buildCols()}
                            rows={buildRows(stockLeft, 'left')}
                        />
                    ) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Seleccioná depósito y posición</div>
                    )}
                </Card>

                {/* Right Panel */}
                <Card style={{ flex: 1 }}>
                    <div style={{ padding: '16px', background: '#1e2133', borderBottom: '1px solid #2a2d3e', display: 'flex', gap: '12px' }}>
                        <Select
                            value={depositoIdRight}
                            onChange={val => { setDepositoIdRight(val); setPosicionIdRight(''); }}
                            options={[{ value: '', label: 'Seleccionar depósito' }, ...depots.map((d: any) => ({ value: d.id, label: d.nombre }))]}
                            style={{ flex: 1 }}
                        />
                        <Select
                            value={posicionIdRight}
                            onChange={setPosicionIdRight}
                            options={[{ value: '', label: 'Seleccionar posición' }, ...posOptionsRight]}
                            style={{ flex: 1 }}
                        />
                    </div>
                    {depositoIdRight && posicionIdRight ? (
                        <Table
                            loading={loadingRight}
                            cols={buildCols()}
                            rows={buildRows(stockRight, 'right')}
                        />
                    ) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Seleccioná depósito y posición</div>
                    )}
                </Card>
            </div>

            {/* Transfer Modal */}
            {transferModal && (
                <Modal title="Transferir Mercadería" onClose={() => setTransferModal(null)}>
                    <div style={{ marginBottom: '20px', color: '#9ca3af', fontSize: '14px' }}>
                        Moviendo <strong>{transferModal.item.item.descripcion}</strong> (Partida {transferModal.item.batch.lotNumber})
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                        <Input 
                            label={`Cant. Principal a mover (Disp: ${transferModal.item.qtyPrincipal}${transferModal.item.item.unidadPrincipal})`}
                            type="number" 
                            value={transferPrincipal} 
                            onChange={setTransferPrincipal} 
                            style={{ flex: 1 }}
                        />
                        <Input 
                                label={`Secundaria a mover (Disp: ${transferModal.item.qtySecundaria || 0}${transferModal.item.item.unidadSecundaria || ''})`}
                                type="number" 
                                value={transferSecundaria} 
                                onChange={setTransferSecundaria} 
                                style={{ flex: 1 }}
                            />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <Btn variant="secondary" onClick={() => setTransferModal(null)}>Cancelar</Btn>
                        <Btn onClick={confirmTransfer}>Confirmar Transferencia</Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}
