import { useState, useMemo } from 'react';
import { useGetStockQuery, useSubmitPickingAuditMutation } from '../features/stock/api/stock.api';
import { useGetDepotsQuery } from '../features/depots/api/depots.api';
import { PageHeader, Card, Btn, Badge } from './common/ui';

export default function AuditoriaPickingPage() {
    const { data: depots = [] } = useGetDepotsQuery();
    const [selectedDepot, setSelectedDepot] = useState<string>('');

    const { data: stock = [], isLoading, isError, refetch } = useGetStockQuery({ 
        categoria: 'picking', 
        ...(selectedDepot ? { depotId: selectedDepot } : {}) 
    });
    const [submitAudit, { isLoading: isSubmitting }] = useSubmitPickingAuditMutation();

    // Map: compositeKey -> number
    const [physicalQty, setPhysicalQty] = useState<Record<string, number | ''>>({});

    const handleQtyChange = (key: string, value: string, maxSystem: number) => {
        if (value === '') {
            setPhysicalQty(prev => ({ ...prev, [key]: '' }));
            return;
        }
        let num = Number(value);
        if (isNaN(num)) return;
        if (num < 0) num = 0;
        if (num > maxSystem) num = maxSystem; // Validation strictly enforced here
        setPhysicalQty(prev => ({ ...prev, [key]: num }));
    };

    const handleSetFull = (key: string, maxSystem: number) => {
        setPhysicalQty(prev => ({ ...prev, [key]: maxSystem }));
    };

    const sortedStock = useMemo(() => {
        return [...stock].sort((a, b) => {
            const posA = a.posicion?.codigo || '';
            const posB = b.posicion?.codigo || '';
            return posA.localeCompare(posB);
        });
    }, [stock]);

    const handleSubmit = async () => {
        const itemsToSubmit = [];

        for (const bal of sortedStock) {
            const key = `${bal.depositoId}-${bal.posicionId}-${bal.itemId}-${bal.lotId}`;
            const sysQty = Number(bal.qtyPrincipal);
            const userQty = physicalQty[key] === '' || physicalQty[key] === undefined ? sysQty : Number(physicalQty[key]);

            const faltante = sysQty - userQty;
            if (faltante > 0) {
                itemsToSubmit.push({
                    depositoId: bal.depositoId,
                    posicionId: bal.posicionId,
                    itemId: bal.itemId,
                    lotId: bal.lotId,
                    faltanteKilos: faltante
                });
            }
        }

        if (itemsToSubmit.length === 0) {
            alert('No hay diferencias reportadas para enviar.');
            return;
        }

        if (!confirm(`Se reportarán diferencias en ${itemsToSubmit.length} posiciones, lo cual generará automáticamente un remito de salida para descontarlas. ¿Continuar?`)) {
            return;
        }

        try {
            await submitAudit({ items: itemsToSubmit, fecha: new Date().toISOString() }).unwrap();
            alert('Auditoría enviada correctamente. El Remito de Salida se generó automáticamente.');
            setPhysicalQty({});
            refetch();
        } catch (err: any) {
            console.error('Error enviando auditoría', err);
            alert(`Error: ${err?.data?.message || 'Error desconocido'}`);
        }
    };

    if (isLoading) return <div style={{ padding: '24px', color: '#9ca3af' }}>Cargando stock de picking...</div>;
    if (isError) return <div style={{ padding: '24px', color: '#f87171' }}>Error cargando stock de picking.</div>;

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <PageHeader 
                title="Auditoría de Picking" 
                subtitle="Verifica las cantidades físicas reales en las posiciones de picking. Las diferencias se registrarán en un remito de salida consolidado." 
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>Filtrar por Depósito:</span>
                    <select 
                        value={selectedDepot} 
                        onChange={e => setSelectedDepot(e.target.value)}
                        style={{ 
                            background: '#0f1117', border: '1px solid #4b5563', color: '#f3f4f6', 
                            borderRadius: '6px', padding: '6px 12px', fontSize: '14px', outline: 'none' 
                        }}
                    >
                        <option value="">Todos los depósitos (Picking)</option>
                        {depots.filter((d: any) => d.activo).map((d: any) => (
                            <option key={d.id} value={d.id}>{d.nombre}</option>
                        ))}
                    </select>
                </div>

                <Btn onClick={handleSubmit} disabled={isSubmitting || sortedStock.length === 0}>
                    {isSubmitting ? 'Enviando...' : 'Confirmar Auditoría'}
                </Btn>
            </div>

            {sortedStock.length === 0 ? (
                <Card>
                    <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                        No hay mercadería actualmente en posiciones de picking.
                    </div>
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {sortedStock.map((bal: any) => {
                        const key = `${bal.depositoId}-${bal.posicionId}-${bal.itemId}-${bal.lotId}`;
                        const sysQty = Number(bal.qtyPrincipal);
                        const currentInput = physicalQty[key];
                        // If unchanged, difference is 0. If changed, calculate.
                        const diff = currentInput !== undefined && currentInput !== '' ? sysQty - Number(currentInput) : 0;

                        return (
                            <Card key={key} style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: diff > 0 ? '1px solid #f87171' : '1px solid #2a2d3e' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Badge color="#34d399">Pos: {bal.posicion?.codigo || 'N/A'}</Badge>
                                    <Badge color="#a5b4fc">Lote: {bal.batch?.lotNumber || bal.lotId || 'S/L'}</Badge>
                                </div>
                                <div style={{ fontSize: '15px', fontWeight: 600, color: '#f3f4f6' }}>
                                    {bal.batch?.item?.descripcion || 'Item Desconocido'}
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1d2e', padding: '8px 12px', borderRadius: '6px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>Sistema</div>
                                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#e5e7eb' }}>{sysQty} kg</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '4px' }}>Físico Real</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input 
                                                type="number" 
                                                min={0}
                                                max={sysQty}
                                                value={currentInput !== undefined ? currentInput : ''}
                                                placeholder={String(sysQty)}
                                                onChange={(e) => handleQtyChange(key, e.target.value, sysQty)}
                                                style={{ 
                                                    width: '80px', background: '#0f1117', border: diff > 0 ? '1px solid #f87171' : '1px solid #4b5563',
                                                    color: '#f3f4f6', borderRadius: '4px', padding: '4px 8px', outline: 'none',
                                                    textAlign: 'right'
                                                }}
                                            />
                                            <button 
                                                title="Marcar OK"
                                                onClick={() => handleSetFull(key, sysQty)}
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#34d399', fontSize: '16px' }}
                                            >✔</button>
                                        </div>
                                    </div>
                                </div>

                                {diff > 0 && (
                                    <div style={{ fontSize: '12px', color: '#f87171', textAlign: 'right' }}>
                                        Faltante detectado: {diff.toFixed(2)} kg
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
