import { useState } from 'react';
import { 
    useGetUnlinkedMovementsQuery, 
    useGetPurchaseOrdersQuery,
    useLinkMovementMutation 
} from '../purchase-orders/api/purchase-orders.api';
import { PageHeader, Card, Table, Btn, Badge, Spinner, Modal } from '../../../shared/ui';

export default function ConciliacionPage() {
    const { data: unlinkedMovements = [], isLoading: loadingMovs } = useGetUnlinkedMovementsQuery();
    const { data: purchaseOrders = [], isLoading: loadingOrders } = useGetPurchaseOrdersQuery();
    const [linkMovement, { isLoading: linking }] = useLinkMovementMutation();

    const [selectedMov, setSelectedMov] = useState<any>(null);

    // Filter POs that match the supplier and item of the selected movement
    const suggestedLines = selectedMov ? purchaseOrders
        .filter((o: any) => o.supplierId === selectedMov.supplierId && o.estado !== 'COMPLETADO')
        .flatMap((o: any) => o.lines.map((l: any) => ({ ...l, orderNumero: o.numero, orderId: o.id })))
        .filter((l: any) => l.itemId === selectedMov.itemId)
        : [];

    const handleLink = async (lineId: string) => {
        if (!selectedMov) return;
        try {
            await linkMovement({ 
                movementId: selectedMov.id, 
                purchaseOrderLineId: lineId 
            }).unwrap();
            setSelectedMov(null);
            alert('¡Vinculación exitosa!');
        } catch (e) {
            alert('Error al vincular');
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader title="Conciliación de Remitos" subtitle="Vincula las entradas físicas de depósito con tus órdenes de compra" />

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                <div>
                    <h3 style={{ color: '#f3f4f6', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>📦 Entradas sin vincular</h3>
                    {loadingMovs ? <Spinner /> : unlinkedMovements.length === 0 ? (
                        <Card style={{ textAlign: 'center', padding: '40px' }}>
                            <p style={{ color: '#6b7280' }}>No hay remitos pendientes de conciliación.</p>
                        </Card>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {unlinkedMovements.map((m: any) => (
                                <Card 
                                    key={m.id} 
                                    style={{ 
                                        cursor: 'pointer', 
                                        border: selectedMov?.id === m.id ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.05)',
                                        background: selectedMov?.id === m.id ? 'rgba(99, 102, 241, 0.05)' : 'rgba(17, 24, 39, 0.4)'
                                    }}
                                    onClick={() => setSelectedMov(m)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#f3f4f6', fontSize: '15px' }}>{m.item?.descripcion}</div>
                                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                                🏢 {m.supplier?.name} • 📄 {m.documentoNumero || 'S/N'}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 800, color: '#10b981', fontSize: '18px' }}>{Number(m.qtyPrincipal).toFixed(1)} <small>kg</small></div>
                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>Recibido: {new Date(m.fecha).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <h3 style={{ color: '#f3f4f6', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>🔗 Órdenes de Compra Sugeridas</h3>
                    {!selectedMov ? (
                        <Card style={{ textAlign: 'center', padding: '40px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <p style={{ color: '#6b7280' }}>Selecciona una entrada de la izquierda para buscar coincidencias.</p>
                        </Card>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                <span style={{ fontSize: '11px', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 700 }}>Buscando para:</span>
                                <div style={{ color: 'white', fontWeight: 600 }}>{selectedMov.item?.descripcion}</div>
                                <div style={{ color: '#9ca3af', fontSize: '12px' }}>Proveedor: {selectedMov.supplier?.name}</div>
                            </div>

                            {suggestedLines.length === 0 ? (
                                <p style={{ color: '#f87171', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                                    No se encontraron órdenes de compra abiertas para este proveedor y material.
                                </p>
                            ) : (
                                suggestedLines.map((line: any) => (
                                    <Card key={line.id} style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ color: '#a5b4fc', fontWeight: 700 }}>{line.orderNumero}</div>
                                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                    Pedido: {Number(line.qtyPedido).toFixed(1)} kg • 
                                                    Recibido: <span style={{ color: '#10b981' }}>{Number(line.qtyRecibida).toFixed(1)} kg</span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>
                                                    Pendiente: {(Number(line.qtyPedido) - Number(line.qtyRecibida)).toFixed(1)} kg
                                                </div>
                                            </div>
                                            <Btn 
                                                small 
                                                disabled={linking}
                                                onClick={() => handleLink(line.id)}
                                            >
                                                {linking ? '...' : 'Vincular'}
                                            </Btn>
                                        </div>
                                    </Card>
                                ))
                            )}
                            
                            <Btn variant="secondary" onClick={() => setSelectedMov(null)}>Cancelar selección</Btn>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
