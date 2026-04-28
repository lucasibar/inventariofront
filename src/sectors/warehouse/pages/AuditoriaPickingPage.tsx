import { useState, useMemo } from 'react';
import { useGetStockQuery, useSubmitPickingAuditMutation } from '../stock/api/stock.api';
import { useDespachoDirectoMutation } from '../remitosSalida/api/remitos-salida.api';
import { useGetDepotsQuery } from '../deposito/api/deposito.api';
import { useGetPartnersQuery } from '../../config/partners/api/partners.api';
import { PageHeader, Card, Btn, Badge, Modal, SearchSelect, Input } from '../../../shared/ui';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../entities/auth/model/authSlice';

export default function AuditoriaPickingPage() {
    const { data: depots = [] } = useGetDepotsQuery();
    const { data: partners = [] } = useGetPartnersQuery({});
    const user = useSelector(selectCurrentUser);
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

    const [selectedDepot, setSelectedDepot] = useState<string>('');
    const [q, setQ] = useState('');

    const { data: stock = [], isLoading, isError, refetch } = useGetStockQuery({ 
        categoria: 'PICKING', 
        ...(selectedDepot ? { depotId: selectedDepot } : {}) 
    });
    const [submitAudit, { isLoading: isSubmitting }] = useSubmitPickingAuditMutation();
    const [despachoDirecto] = useDespachoDirectoMutation();

    // Despacho Directo state
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
                depositoId: despachoEntry.depositoId,
                posicionId: despachoEntry.posicionId,
                itemId: despachoEntry.itemId,
                lotId: despachoEntry.lotId,
                qtyPrincipal: Number(despachoQty),
                qtySecundaria: despachoQtySec ? Number(despachoQtySec) : undefined,
            }).unwrap();
            alert(`✅ Despachado. Remito: ${result.numero}`);
            setDespachoModal(false);
            refetch();
        } catch (e: any) {
            alert(e?.data?.message || 'Error al despachar');
        } finally {
            setDespachoSaving(false);
        }
    };

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

    const filteredStock = useMemo(() => {
        let result = [...stock];
        if (q) {
            const search = q.toLowerCase();
            result = result.filter((bal: any) => 
                (bal.batch?.item?.descripcion || '').toLowerCase().includes(search) ||
                (bal.batch?.item?.codigoInterno || '').toLowerCase().includes(search) ||
                (bal.posicion?.codigo || '').toLowerCase().includes(search)
            );
        }
        return result.sort((a, b) => {
            const posA = a.posicion?.codigo || '';
            const posB = b.posicion?.codigo || '';
            return posA.localeCompare(posB);
        });
    }, [stock, q]);

    const handleSubmit = async () => {
        const itemsToSubmit: { 
            depositoId: string; 
            posicionId: string; 
            itemId: string; 
            lotId: string | null; 
            faltantePrincipal: number; 
        }[] = [];

        for (const bal of filteredStock) {
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
                    faltantePrincipal: faltante
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
                    <Input 
                        placeholder="Buscar por material o posición..." 
                        value={q} 
                        onChange={setQ} 
                        style={{ width: '300px' }}
                    />
                </div>

                <Btn onClick={handleSubmit} disabled={isSubmitting || filteredStock.length === 0}>
                    {isSubmitting ? 'Enviando...' : 'Confirmar Auditoría'}
                </Btn>
            </div>

            {filteredStock.length === 0 ? (
                <Card>
                    <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                        No hay mercadería actualmente en posiciones de picking.
                    </div>
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {filteredStock.map((bal: any) => {
                        const key = `${bal.depositoId}-${bal.posicionId}-${bal.itemId}-${bal.lotId}`;
                        const sysQty = Number(bal.qtyPrincipal);
                        const currentInput = physicalQty[key];
                        // If unchanged, difference is 0. If changed, calculate.
                        const diff = currentInput !== undefined && currentInput !== '' ? sysQty - Number(currentInput) : 0;

                        return (
                            <Card key={key} style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: diff > 0 ? '1px solid #f87171' : '1px solid #2a2d3e' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <Badge color="#34d399">Pos: {bal.posicion?.codigo || 'N/A'}</Badge>
                                        <Badge color="#a5b4fc">Lote: {bal.batch?.lotNumber || bal.lotId || 'S/L'}</Badge>
                                    </div>
                                    <button 
                                        onClick={() => openDespacho(bal)} 
                                        style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', cursor: 'pointer', borderRadius: '6px', padding: '4px 8px', fontSize: '14px' }}
                                        title="Despachar (remito de salida)"
                                    >📦 Despachar</button>
                                </div>
                                <div style={{ fontSize: '15px', fontWeight: 600, color: '#f3f4f6' }}>
                                    {bal.batch?.item?.category?.nombre ? `${bal.batch.item.category.nombre} - ` : ''}
                                    {bal.batch?.item?.descripcion || 'Item Desconocido'}
                                    {bal.batch?.supplier?.name ? ` - ${bal.batch.supplier.name}` : ''}
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

            {despachoModal && despachoEntry && (
                <Modal title="Despacho Directo (Picking)" onClose={() => setDespachoModal(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '12px' }}>
                            <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Material seleccionado</div>
                            <div style={{ color: '#f3f4f6', fontWeight: 700 }}>
                                {despachoEntry.batch?.item?.category?.nombre ? `${despachoEntry.batch.item.category.nombre} - ` : ''}
                                {despachoEntry.batch?.item?.descripcion || despachoEntry.item?.descripcion}
                                {despachoEntry.batch?.supplier?.name ? ` - ${despachoEntry.batch.supplier.name}` : ''}
                            </div>
                            <div style={{ fontSize: '12px', color: '#a5b4fc', marginTop: '2px' }}>
                                📍 {despachoEntry.posicion?.codigo || 'S/P'} &middot; Lote: {despachoEntry.batch?.lotNumber || '—'} &middot; Disp: {Number(despachoEntry.qtyPrincipal).toFixed(1)} {despachoEntry.batch?.item?.unidadPrincipal || 'Kg'}
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
                            <Input label={`Cantidad (${despachoEntry.batch?.item?.unidadPrincipal || 'Kg'})`} type="number" value={despachoQty} onChange={setDespachoQty} style={{ flex: 1 }} />
                            {(despachoEntry.batch?.item?.unidadSecundaria || despachoEntry.qtySecundaria !== undefined) && (
                                <div style={{ flex: 1 }}>
                                    <Input label={`Sec. (${despachoEntry.batch?.item?.unidadSecundaria || 'Un'})`} type="number" value={despachoQtySec} onChange={setDespachoQtySec} />
                                    {Number(despachoQtySec) > 0 && Number(despachoEntry.qtySecundaria) > 0 && (
                                        <div style={{ fontSize: '10px', color: '#6366f1', marginTop: '4px', textAlign: 'right' }}>
                                            ≈ {((Number(despachoEntry.qtyPrincipal) / Number(despachoEntry.qtySecundaria)) * Number(despachoQtySec)).toFixed(2)} {despachoEntry.batch?.item?.unidadPrincipal || 'Kg'}
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
