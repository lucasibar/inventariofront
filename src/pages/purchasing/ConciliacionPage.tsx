import { useState } from 'react';
import { 
    useGetUnlinkedMovementsQuery, 
    useLinkMovementReceiptMutation 
} from '../../features/purchasing/purchase-orders/api/purchase-orders.api';
import { PageHeader, Card, Btn, Spinner } from '../../shared/ui';
import PurchaseOrderLinkDialog from '../../features/purchasing/purchase-orders/ui/PurchaseOrderLinkDialog';

export default function ConciliacionPage() {
    const { data: unlinkedMovements = [], isLoading: loadingMovs, refetch } = useGetUnlinkedMovementsQuery();
    const [linkMovementReceipt, { isLoading: linking }] = useLinkMovementReceiptMutation();

    const [selectedMov, setSelectedMov] = useState<any>(null);
    const [showLinkDialog, setShowLinkDialog] = useState(false);

    const handleLinkConfirm = async (links: { purchaseOrderLineId: string; qtyAplicada: number }[]) => {
        if (!selectedMov) return;
        try {
            await linkMovementReceipt({
                movimientoId: selectedMov.id,
                links: links.map(l => ({
                    purchaseOrderLineId: l.purchaseOrderLineId,
                    qtyPrincipal: l.qtyAplicada
                }))
            }).unwrap();
            setSelectedMov(null);
            setShowLinkDialog(false);
            refetch();
            alert('¡Vinculación exitosa!');
        } catch (e: any) {
            alert(e?.data?.message ?? 'Error al vincular');
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
                    <h3 style={{ color: '#f3f4f6', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>🔗 Acción de Conciliación</h3>
                    {!selectedMov ? (
                        <Card style={{ textAlign: 'center', padding: '40px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <p style={{ color: '#6b7280' }}>Selecciona una entrada de la izquierda para buscar coincidencias.</p>
                        </Card>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ padding: '16px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                <span style={{ fontSize: '11px', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 700 }}>Buscando para:</span>
                                <div style={{ color: 'white', fontWeight: 600, fontSize: '15px', marginTop: '4px' }}>{selectedMov.item?.descripcion}</div>
                                <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>Proveedor: {selectedMov.supplier?.name}</div>
                                <div style={{ color: '#9ca3af', fontSize: '12px' }}>Cantidad total recibida: <strong>{Number(selectedMov.qtyPrincipal).toFixed(2)} kg</strong></div>
                            </div>

                            <Card style={{ padding: '20px', textAlign: 'center' }}>
                                <p style={{ color: '#cbd5e1', fontSize: '13px', marginBottom: '16px' }}>
                                    Hacé click abajo para abrir el panel de vinculación e imputar este ingreso de material a las Órdenes de Compra abiertas de este proveedor.
                                </p>
                                <Btn 
                                    onClick={() => setShowLinkDialog(true)}
                                    disabled={linking}
                                    style={{ width: '100%' }}
                                >
                                    {linking ? 'Procesando...' : 'Vincular a Orden de Compra'}
                                </Btn>
                            </Card>
                            
                            <Btn variant="secondary" onClick={() => setSelectedMov(null)}>Cancelar selección</Btn>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de vinculación comercial */}
            {showLinkDialog && selectedMov && (
                <PurchaseOrderLinkDialog
                    supplierId={selectedMov.supplierId}
                    itemId={selectedMov.itemId}
                    itemName={selectedMov.item?.descripcion || ''}
                    qtyAvailable={Number(selectedMov.qtyPrincipal)}
                    onClose={() => setShowLinkDialog(false)}
                    onConfirm={handleLinkConfirm}
                />
            )}
        </div>
    );
}
