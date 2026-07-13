import { useState, useEffect } from 'react';
import { useGetPendingForItemQuery } from '../api/purchase-orders.api';
import { Modal, Btn, Input, Spinner, Card } from '../../../../shared/ui';

interface PurchaseOrderLinkDialogProps {
    supplierId: string;
    itemId: string;
    itemName: string;
    qtyAvailable: number; // Qty from remito line
    initialLinks?: { purchaseOrderLineId: string; qtyAplicada: number }[];
    onClose: () => void;
    onConfirm: (links: { purchaseOrderLineId: string; qtyAplicada: number }[]) => void;
}

export default function PurchaseOrderLinkDialog({
    supplierId,
    itemId,
    itemName,
    qtyAvailable,
    initialLinks = [],
    onClose,
    onConfirm
}: PurchaseOrderLinkDialogProps) {
    const { data: pendingLines = [], isLoading } = useGetPendingForItemQuery({ supplierId, itemId });
    const [allocations, setAllocations] = useState<{ [lineId: string]: string }>({});
    const [error, setError] = useState('');

    // Pre-populate allocations with initialLinks or try to smart-allocate
    useEffect(() => {
        if (pendingLines.length > 0) {
            const initialMap: { [lineId: string]: string } = {};
            
            // First load initial links if they exist
            initialLinks.forEach(link => {
                initialMap[link.purchaseOrderLineId] = String(link.qtyAplicada);
            });

            // If empty initial links, perform automatic smart allocation
            if (initialLinks.length === 0) {
                let remaining = qtyAvailable;
                for (const pl of pendingLines) {
                    if (remaining <= 0) break;
                    const pending = Number(pl.qtyPedido) - Number(pl.qtyRecibida);
                    if (pending > 0) {
                        const allocate = Math.min(remaining, pending);
                        initialMap[pl.id] = allocate.toFixed(2);
                        remaining -= allocate;
                    }
                }
            }

            setAllocations(initialMap);
        }
    }, [pendingLines, initialLinks, qtyAvailable]);

    const handleQtyChange = (lineId: string, val: string) => {
        setAllocations(prev => ({
            ...prev,
            [lineId]: val
        }));
    };

    const totalAllocated = Object.values(allocations)
        .reduce((sum, val) => sum + (Number(val) || 0), 0);

    const remainingToAllocate = qtyAvailable - totalAllocated;

    const handleConfirm = () => {
        setError('');
        
        // Filter out empty or zero allocations
        const links = Object.entries(allocations)
            .filter(([_, val]) => Number(val) > 0)
            .map(([lineId, val]) => ({
                purchaseOrderLineId: lineId,
                qtyAplicada: Number(val)
            }));

        const total = links.reduce((sum, l) => sum + l.qtyAplicada, 0);
        
        if (total > qtyAvailable + 0.01) {
            setError(`No podés vincular más de la cantidad del remito (${qtyAvailable.toFixed(2)} kg)`);
            return;
        }

        // Validate that we don't allocate negative values
        if (links.some(l => l.qtyAplicada <= 0)) {
            setError('Las cantidades imputadas deben ser mayores a 0');
            return;
        }

        onConfirm(links);
    };

    return (
        <Modal title="Vincular a Orden de Compra" onClose={onClose} wide>
            <div style={{ marginBottom: '16px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 700 }}>Material en Remito</div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '15px', marginTop: '4px' }}>{itemName}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px' }}>
                    <div>Cantidad en remito: <strong>{qtyAvailable.toFixed(2)} kg</strong></div>
                    <div style={{ color: remainingToAllocate < -0.01 ? '#ef4444' : remainingToAllocate > 0.01 ? '#f59e0b' : '#10b981' }}>
                        Sin asignar: <strong>{remainingToAllocate.toFixed(2)} kg</strong>
                    </div>
                </div>
            </div>

            <h4 style={{ color: '#f3f4f6', fontSize: '13px', margin: '0 0 12px 0' }}>Órdenes de Compra abiertas</h4>

            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><Spinner /></div>
            ) : pendingLines.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444', border: '1px dashed rgba(239, 68, 68, 0.2)', borderRadius: '8px', fontSize: '13px' }}>
                    No hay órdenes de compra abiertas para este proveedor y material.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                    {pendingLines.map((pl: any) => {
                        const pending = Number(pl.qtyPedido) - Number(pl.qtyRecibida);
                        const assigned = Number(allocations[pl.id]) || 0;
                        
                        return (
                            <Card key={pl.id} style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: assigned > 0 ? 'rgba(16, 185, 129, 0.03)' : '#111827', border: assigned > 0 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid #2a2d3e' }}>
                                <div style={{ flex: 1, marginRight: '16px' }}>
                                    <div style={{ color: '#a5b4fc', fontWeight: 700, fontSize: '13px' }}>{pl.order?.numero}</div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                                        Pedido: {Number(pl.qtyPedido).toFixed(1)} kg • 
                                        Recibido: <span style={{ color: '#10b981' }}>{Number(pl.qtyRecibida).toFixed(1)} kg</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '2px', fontWeight: 600 }}>
                                        Pendiente: {pending.toFixed(2)} kg
                                    </div>
                                </div>
                                <div style={{ width: '120px' }}>
                                    <Input
                                        label="Imputar (kg)"
                                        type="number"
                                        value={allocations[pl.id] || ''}
                                        onChange={v => handleQtyChange(pl.id, v)}
                                        placeholder="0.00"
                                    />
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {error && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '12px' }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
                <Btn onClick={handleConfirm} disabled={pendingLines.length === 0}>Confirmar Vinculación</Btn>
            </div>
        </Modal>
    );
}
