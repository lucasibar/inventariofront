import { useState } from 'react';
import { 
    useGetOrderFulfillmentQuery, 
    useCloseAdjustmentMutation, 
    useUnlinkReceiptMutation 
} from '../api/purchase-orders.api';
import { Modal, Btn, Input, Spinner, Badge, Card } from '../../../../shared/ui';

interface OrdenCompraDetailModalProps {
    orderId: string;
    onClose: () => void;
}

export default function OrdenCompraDetailModal({ orderId, onClose }: OrdenCompraDetailModalProps) {
    const { data: fulfillment, isLoading, refetch } = useGetOrderFulfillmentQuery(orderId);
    const [closeAdjustment, { isLoading: adjusting }] = useCloseAdjustmentMutation();
    const [unlinkReceipt, { isLoading: unlinking }] = useUnlinkReceiptMutation();

    const [adjustingLineId, setAdjustingLineId] = useState<string | null>(null);
    const [adjQty, setAdjQty] = useState('');
    const [adjNotes, setAdjNotes] = useState('');
    const [error, setError] = useState('');

    if (isLoading) {
        return (
            <Modal title="Cargando trazabilidad..." onClose={onClose} wide>
                <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}><Spinner /></div>
            </Modal>
        );
    }

    if (!fulfillment) {
        return (
            <Modal title="Error" onClose={onClose}>
                <div style={{ padding: '20px', color: '#f87171' }}>No se pudo cargar el detalle de la Orden de Compra.</div>
            </Modal>
        );
    }

    const { order, lines, resumen } = fulfillment;

    const handleCloseAdjustment = async (lineId: string, maxQty: number) => {
        setError('');
        if (!adjQty || Number(adjQty) <= 0) {
            setError('La cantidad debe ser mayor a 0');
            return;
        }
        if (Number(adjQty) > maxQty + 0.01) {
            setError(`No podés ajustar más del saldo pendiente (${maxQty.toFixed(2)} kg)`);
            return;
        }
        if (!adjNotes.trim()) {
            setError('El motivo del ajuste es obligatorio');
            return;
        }

        try {
            await closeAdjustment({
                purchaseOrderLineId: lineId,
                qtyPrincipal: Number(adjQty),
                observaciones: adjNotes,
            }).unwrap();
            setAdjustingLineId(null);
            setAdjQty('');
            setAdjNotes('');
            refetch();
        } catch (e: any) {
            setError(e?.data?.message ?? 'Error al aplicar ajuste');
        }
    };

    const handleUnlink = async (receiptId: string, desc: string) => {
        if (!window.confirm(`¿Seguro que querés eliminar esta imputación comercial?\n"${desc}"`)) return;
        try {
            await unlinkReceipt(receiptId).unwrap();
            refetch();
        } catch (e) {
            alert('Error al desvincular');
        }
    };

    return (
        <Modal title={`Detalle y Trazabilidad — ${order.numero}`} onClose={onClose} wide>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <Card style={{ padding: '16px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#a5b4fc', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        📋 Datos Generales
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', fontSize: '13px' }}>
                        <div>
                            <span style={{ color: '#6b7280' }}>Proveedor:</span>
                            <div style={{ color: '#f3f4f6', fontWeight: 600, marginTop: '2px' }}>{order.supplier?.name}</div>
                        </div>
                        <div>
                            <span style={{ color: '#6b7280' }}>Estado actual:</span>
                            <div style={{ marginTop: '2px' }}>
                                <Badge color={
                                    order.estado === 'COMPLETADO' ? '#10b981' : 
                                    order.estado === 'RECIBIDO_PARCIAL' ? '#3b82f6' : 
                                    order.estado === 'CANCELADO' ? '#ef4444' : '#f59e0b'
                                }>{order.estado}</Badge>
                            </div>
                        </div>
                        <div>
                            <span style={{ color: '#6b7280' }}>Fecha Emisión:</span>
                            <div style={{ color: '#f3f4f6', marginTop: '2px' }}>{new Date(order.fechaEmision).toLocaleDateString()}</div>
                        </div>
                        <div>
                            <span style={{ color: '#6b7280' }}>Llegada Esperada:</span>
                            <div style={{ color: '#f3f4f6', marginTop: '2px' }}>
                                {order.fechaEntregaEsperada ? new Date(order.fechaEntregaEsperada).toLocaleDateString() : 'Sin definir'}
                            </div>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <span style={{ color: '#6b7280' }}>Observaciones generales:</span>
                            <div style={{ color: '#9ca3af', marginTop: '2px', fontSize: '12px', fontStyle: 'italic' }}>
                                {order.observaciones || 'Sin observaciones'}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#a5b4fc' }}>📊 Avance de Cumplimiento</h3>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            {resumen.porcentajeGlobal.toFixed(0)}%
                            <span style={{ fontSize: '13px', fontWeight: 400, color: '#6b7280' }}>completado</span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div style={{ width: '100%', height: '8px', background: '#2a2d3e', borderRadius: '4px', marginTop: '8px', overflow: 'hidden', display: 'flex' }}>
                            <div style={{ 
                                width: `${resumen.totalPedidoKg > 0 ? (resumen.totalRecibidoKg / resumen.totalPedidoKg) * 100 : 0}%`, 
                                height: '100%', 
                                background: '#10b981' 
                            }} title={`Recibido físico: ${resumen.totalRecibidoKg.toFixed(1)} kg`} />
                            <div style={{ 
                                width: `${resumen.totalPedidoKg > 0 ? (resumen.totalAjusteKg / resumen.totalPedidoKg) * 100 : 0}%`, 
                                height: '100%', 
                                background: '#f59e0b' 
                            }} title={`Ajustado administrativo: ${resumen.totalAjusteKg.toFixed(1)} kg`} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px', fontSize: '12px', borderTop: '1px solid #2a2d3e', paddingTop: '12px' }}>
                        <div><span style={{ color: '#6b7280' }}>Total Pedido:</span> <strong style={{ color: 'white' }}>{resumen.totalPedidoKg.toFixed(1)} kg</strong></div>
                        <div><span style={{ color: '#6b7280' }}>Recibido:</span> <strong style={{ color: '#10b981' }}>{resumen.totalRecibidoKg.toFixed(1)} kg</strong></div>
                        <div><span style={{ color: '#6b7280' }}>Ajustado:</span> <strong style={{ color: '#f59e0b' }}>{resumen.totalAjusteKg.toFixed(1)} kg</strong></div>
                        <div><span style={{ color: '#6b7280' }}>Pendiente:</span> <strong style={{ color: '#ef4444' }}>{resumen.totalPendienteKg.toFixed(1)} kg</strong></div>
                    </div>
                </Card>
            </div>

            <h3 style={{ fontSize: '14px', color: '#f3f4f6', margin: '0 0 12px 0' }}>📦 Detalle de Materiales Solicitados</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {lines.map((line: any) => (
                    <Card key={line.id} style={{ padding: '16px', border: '1px solid #2a2d3e' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div>
                                <h4 style={{ margin: '0', fontSize: '14px', color: '#a5b4fc', fontWeight: 700 }}>
                                    {line.item?.codigoInterno} — {line.item?.descripcion}
                                </h4>
                                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                                    Pedido: {Number(line.qtyPedido).toFixed(1)} kg 
                                    {line.qtySecundaria && ` (${Number(line.qtySecundaria).toFixed(0)} unid)`}
                                    {line.observaciones && ` • Notas: ${line.observaciones}`}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <Badge color={line.pendiente <= 0 ? '#10b981' : '#f59e0b'}>
                                    {line.pendiente <= 0 ? 'Completo' : `Pendiente: ${line.pendiente.toFixed(1)} kg`}
                                </Badge>
                                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, marginTop: '4px' }}>
                                    {line.porcentaje.toFixed(0)}% cumplido
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ width: '100%', height: '6px', background: '#111827', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden', display: 'flex' }}>
                            <div style={{ 
                                width: `${Number(line.qtyPedido) > 0 ? (line.lineRecibidoKg / Number(line.qtyPedido)) * 100 : 0}%`, 
                                height: '100%', 
                                background: '#10b981' 
                            }} />
                            <div style={{ 
                                width: `${Number(line.qtyPedido) > 0 ? (line.lineAjusteKg / Number(line.qtyPedido)) * 100 : 0}%`, 
                                height: '100%', 
                                background: '#f59e0b' 
                            }} />
                        </div>

                        {/* Historial de vinculaciones */}
                        <div style={{ background: '#111827', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                                Historial de Entregas e Imputaciones
                            </span>
                            {line.receipts.length === 0 ? (
                                <div style={{ fontSize: '12px', color: '#4b5563', fontStyle: 'italic', padding: '4px 0' }}>
                                    No hay entregas registradas para este material.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {line.receipts.map((r: any) => (
                                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {r.tipo === 'RECEPCION' ? (
                                                    <span>📦 <strong>Remito {r.movimiento?.documentoNumero || 'S/N'}</strong> ({new Date(r.movimiento?.fecha || r.createdAt).toLocaleDateString()})</span>
                                                ) : (
                                                    <span style={{ color: '#f59e0b' }}>
                                                        ⚖️ <strong>Ajuste de cierre administrativo</strong> ({new Date(r.createdAt).toLocaleDateString()})
                                                        <br />
                                                        <small style={{ color: '#9ca3af', fontStyle: 'italic' }}>Motivo: "{r.observaciones}"</small>
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <strong style={{ color: r.tipo === 'RECEPCION' ? '#10b981' : '#f59e0b' }}>
                                                    +{Number(r.qtyPrincipal).toFixed(1)} kg
                                                </strong>
                                                <Btn 
                                                    small 
                                                    variant="danger" 
                                                    disabled={unlinking}
                                                    onClick={() => handleUnlink(r.id, r.tipo === 'RECEPCION' ? `Remito ${r.movimiento?.documentoNumero}` : `Ajuste: ${r.observaciones}`)}
                                                    style={{ padding: '2px 6px', fontSize: '10px' }}
                                                >
                                                    🗑
                                                </Btn>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Formulario de Ajuste de Cierre */}
                        {line.pendiente > 0.01 && (
                            <div style={{ textAlign: 'right' }}>
                                {adjustingLineId !== line.id ? (
                                    <Btn small variant="secondary" onClick={() => { setAdjustingLineId(line.id); setAdjQty(line.pendiente.toFixed(2)); setAdjNotes(''); setError(''); }}>
                                        ⚖️ Cerrar saldo pendiente
                                    </Btn>
                                ) : (
                                    <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px dashed rgba(245, 158, 11, 0.2)', borderRadius: '8px', padding: '12px', textAlign: 'left', marginTop: '8px' }}>
                                        <h5 style={{ margin: '0 0 8px 0', color: '#f59e0b', fontSize: '12px', fontWeight: 700 }}>Ajuste administrativo de saldo</h5>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '12px', marginBottom: '8px' }}>
                                            <Input 
                                                label="Kg a ajustar" 
                                                type="number" 
                                                value={adjQty} 
                                                onChange={setAdjQty} 
                                            />
                                            <Input 
                                                label="Motivo del cierre de saldo (Obligatorio)" 
                                                placeholder="Ej: Proveedor quedó corto, saldo cancelado..." 
                                                value={adjNotes} 
                                                onChange={setAdjNotes} 
                                            />
                                        </div>
                                        {error && <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '8px' }}>{error}</div>}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                            <Btn small variant="secondary" onClick={() => setAdjustingLineId(null)}>Cancelar</Btn>
                                            <Btn small disabled={adjusting} onClick={() => handleCloseAdjustment(line.id, line.pendiente)}>
                                                {adjusting ? 'Cerrando...' : 'Confirmar Ajuste'}
                                            </Btn>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <Btn onClick={onClose}>Cerrar</Btn>
            </div>
        </Modal>
    );
}
