import { useState, useMemo } from 'react';
import { 
    useGetRecentMovementsQuery, 
    useReverseMovementMutation 
} from '../features/stock/api/stock.api';
import { useGetDepotsQuery } from '../features/depots/api/depots.api';
import { useGetItemsQuery } from '../features/items/api/items.api';
import { PageHeader, Card, Badge, Btn, Select, SearchSelect, Input, useIsMobile, ActionMenu, ResponsiveTable } from './common/ui';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../entities/auth/model/authSlice';

export default function AdminMovementsPage() {
    const isMobile = useIsMobile();
    const user = useSelector(selectCurrentUser);
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

    // Current date - 14 days
    const defaultDesde = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 14);
        return d.toISOString().split('T')[0];
    }, []);

    const [desde, setDesde] = useState(defaultDesde);
    const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
    const [depositoId, setDepositoId] = useState('');
    const [itemId, setItemId] = useState('');
    const [lotNumber, setLotNumber] = useState('');

    const { data: rawDepots = [] } = useGetDepotsQuery();
    const { data: rawItems = [] } = useGetItemsQuery({});

    const { data: movements = [], isFetching, refetch } = useGetRecentMovementsQuery({ 
        desde, 
        hasta,
        depositoId: depositoId || undefined,
        itemId: itemId || undefined,
        lotNumber: lotNumber || undefined
    });
    const [reverseMovement] = useReverseMovementMutation();

    const handleReverse = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que querés revertir este movimiento? Se generará una contrapartida y el movimiento original quedará anulado.')) return;
        try {
            await reverseMovement(id).unwrap();
            alert('Movimiento revertido con éxito. El stock ha sido ajustado.');
            refetch();
        } catch (e: any) {
            alert(e?.data?.message || 'Error al revertir movimiento');
        }
    };

    if (!isAdmin) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <h2>Acceso Restringido</h2>
                <p>Esta página solo está disponible para administradores.</p>
            </div>
        );
    }

    const typeStyles: Record<string, { color: string, label: string }> = {
        REMITO_ENTRADA: { color: '#10b981', label: 'ENTRADA' },
        REMITO_SALIDA: { color: '#ef4444', label: 'SALIDA' },
        AJUSTE_SUMA: { color: '#3b82f6', label: 'AJUSTE (+)' },
        AJUSTE_RESTA: { color: '#f59e0b', label: 'AJUSTE (-)' },
        MOVE_INTERNO: { color: '#6366f1', label: 'TRASLADO' },
        ANULACION_ENTRADA: { color: '#ec4899', label: 'ANUL. ENTRADA' },
        ANULACION_SALIDA: { color: '#ec4899', label: 'ANUL. SALIDA' },
        ANULACION_AJUSTE_SUMA: { color: '#ec4899', label: 'ANUL. AJUSTE (+)' },
        ANULACION_AJUSTE_RESTA: { color: '#ec4899', label: 'ANUL. AJUSTE (-)' },
    };

    const sortedMovements = useMemo(() => 
        ([...movements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())), 
    [movements]);

    const desktopCols = ['Fecha', 'Tipo', 'Depósito', 'Material / Partida', 'Posición', 'Cantidad', 'Estado', 'Obs', ''];

    const renderDesktopRow = (m: any) => {
        const isAnulado = m.status === 'ANULADO';
        const style = typeStyles[m.tipo] || { color: '#9ca3af', label: m.tipo };
        
        return [
            <span style={{ fontSize: '13px' }}>{new Date(m.fecha).toLocaleDateString('es-AR')}</span>,
            <Badge color={style.color}>{style.label}</Badge>,
            <span style={{ fontWeight: 600 }}>{m.deposito?.nombre || '—'}</span>,
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, color: '#f3f4f6', whiteSpace: 'normal', maxWidth: '180px', lineHeight: '1.2' }}>
                    {m.item?.categoria ? `[${m.item.categoria}] ` : ''}{m.item?.descripcion || '—'}
                </span>
                <code style={{ fontSize: '11px', color: '#a5b4fc' }}>Lote: {m.batch?.lotNumber || '—'}</code>
            </div>,
            <span style={{ fontWeight: 600 }}>{m.posicion?.codigo || 'S/P'}</span>,
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ color: '#f3f4f6', fontWeight: 600 }}>{Number(m.qtyPrincipal).toFixed(2)} {m.item?.unidadPrincipal}</span>
                {m.qtySecundaria != null && <span style={{ fontSize: '11px', color: '#9ca3af' }}>{m.qtySecundaria} {m.item?.unidadSecundaria || ''}</span>}
            </div>,
            <Badge color={isAnulado ? '#6b7280' : '#10b981'}>{isAnulado ? 'ANULADO' : 'ACTIVO'}</Badge>,
            <div style={{ maxWidth: '150px', fontSize: '11px', color: '#6b7280', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.observaciones || '—'}</div>,
            <ActionMenu options={[
                { label: 'Revertir Movimiento', icon: '🔄', color: '#ef4444', onClick: () => handleReverse(m.id) }
            ].filter(() => !isAnulado)} />
        ];
    };

    const renderMobileCard = (m: any) => {
        const isAnulado = m.status === 'ANULADO';
        const style = typeStyles[m.tipo] || { color: '#9ca3af', label: m.tipo };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Badge color={style.color}>{style.label}</Badge>
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>{new Date(m.fecha).toLocaleDateString('es-AR')}</span>
                    </div>
                    {!isAnulado && <ActionMenu options={[{ label: 'Revertir', icon: '🔄', color: '#ef4444', onClick: () => handleReverse(m.id) }]} />}
                </div>

                <div style={{ fontWeight: 700, color: '#f3f4f6', fontSize: '14px' }}>{m.item?.descripcion || '—'}</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                    <div>
                        <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Cantidad</div>
                        <div style={{ fontWeight: 600, color: '#10b981' }}>{Number(m.qtyPrincipal).toFixed(2)} {m.item?.unidadPrincipal}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Lote</div>
                        <code style={{ color: '#a5b4fc' }}>{m.batch?.lotNumber || '—'}</code>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af' }}>
                    <span>📍 {m.deposito?.nombre} - {m.posicion?.codigo || 'S/P'}</span>
                    <span>👤 {m.user?.username || 'Sistema'}</span>
                </div>

                {m.observaciones && <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic', borderTop: '1px solid #1e2133', paddingTop: '8px' }}>"{m.observaciones}"</div>}
                
                <div style={{ marginTop: '4px' }}>
                    <Badge color={isAnulado ? '#4b5563' : '#10b981'}>{isAnulado ? 'MOVIMIENTO ANULADO' : 'ESTADO ACTIVO'}</Badge>
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <style>{`
                .filter-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                    align-items: flex-end;
                }
                @media (max-width: 600px) {
                    .filter-grid { grid-template-columns: 1fr; }
                }
                .date-input {
                    background: #0f111a; border: 1px solid #2a2d3e; border-radius: 8px; color: white; padding: 10px; width: 100%; box-sizing: border-box; outline: none; transition: border-color 0.2s;
                }
                .date-input:focus { border-color: #6366f1; }
            `}</style>

            <PageHeader
                title="Auditoría de Movimientos"
                subtitle="Registro histórico y reversión de stock"
            />

            <Card style={{ marginBottom: '24px', padding: '16px', background: '#1a1d2e' }}>
                <div className="filter-grid">
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#9ca3af' }}>📅 Desde</label>
                        <input type="date" className="date-input" value={desde} onChange={(e) => setDesde(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#9ca3af' }}>📅 Hasta</label>
                        <input type="date" className="date-input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
                    </div>
                    <Select
                        label="📦 Depósito"
                        value={depositoId}
                        onChange={setDepositoId}
                        options={[{ value: '', label: 'Todos los depósitos' }, ...rawDepots.map((d: any) => ({ value: d.id, label: d.nombre }))]}
                    />
                    <SearchSelect
                        label="🏷️ Material"
                        value={itemId}
                        onChange={setItemId}
                        options={[{ value: '', label: 'Todos los materiales' }, ...rawItems.map((i: any) => ({ value: i.id, label: `${i.categoria ? `[${i.categoria}] ` : ''}${i.codigoInterno} - ${i.descripcion}` }))]}
                        placeholder="Buscar material..."
                    />
                    <Input
                        label="🔢 Lote/Partida"
                        placeholder="Buscar lote..."
                        value={lotNumber}
                        onChange={setLotNumber}
                    />
                    <Btn onClick={refetch} style={{ width: '100%' }}>Filtrar Resultados</Btn>
                </div>
            </Card>

            <ResponsiveTable 
                loading={isFetching}
                data={sortedMovements}
                desktopCols={desktopCols}
                renderDesktopRow={renderDesktopRow}
                renderMobileCard={renderMobileCard}
            />
        </div>
    );
}
