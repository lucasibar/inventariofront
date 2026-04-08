import { useState, useMemo } from 'react';
import { 
    useGetRecentMovementsQuery, 
    useReverseMovementMutation 
} from '../features/stock/api/stock.api';
import { useGetDepotsQuery } from '../features/depots/api/depots.api';
import { useGetItemsQuery } from '../features/items/api/items.api';
import { PageHeader, Card, Table, Badge, Spinner, Btn, Select, Input } from './common/ui';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../entities/auth/model/authSlice';

export default function AdminMovementsPage() {
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

    const cols = ['Fecha', 'Tipo', 'Depósito', 'Material / Partida', 'Posición', 'Cantidad', 'Estado', 'Usuario', 'Observaciones', 'Acción'];

    const sortedMovements = [...movements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const rows = sortedMovements.map(m => {
        const isAnulado = m.status === 'ANULADO';
        
        // Colors and labels for movement types
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

        const style = typeStyles[m.tipo] || { color: '#9ca3af', label: m.tipo };

        return [
            <span style={{ fontSize: '13px' }}>{new Date(m.fecha).toLocaleDateString('es-AR')}</span>,
            <Badge color={style.color}>{style.label}</Badge>,
            <span style={{ fontWeight: 600 }}>{m.deposito?.nombre || '—'}</span>,
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, color: '#f3f4f6' }}>{m.item?.descripcion || '—'}</span>
                <code style={{ fontSize: '11px', color: '#a5b4fc' }}>Lote: {m.batch?.lotNumber || '—'}</code>
            </div>,
            <span style={{ fontWeight: 600 }}>{m.posicion?.codigo || 'S/P'}</span>,
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ color: '#f3f4f6', fontWeight: 600 }}>{Number(m.qtyPrincipal).toFixed(2)} {m.item?.unidadPrincipal}</span>
                {m.qtySecundaria != null && <span style={{ fontSize: '11px', color: '#9ca3af' }}>{m.qtySecundaria} {m.item?.unidadSecundaria || ''}</span>}
            </div>,
            <Badge color={isAnulado ? '#6b7280' : '#10b981'}>{isAnulado ? 'ANULADO' : 'ACTIVO'}</Badge>,
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>{m.user?.username || 'Sistema'}</span>,
            <div style={{ maxWidth: '200px', fontSize: '11px', color: '#6b7280', whiteSpace: 'normal' }}>{m.observaciones || '—'}</div>,
            <div>
                {!isAnulado && (
                    <Btn small variant="secondary" onClick={() => handleReverse(m.id)}>Revertir</Btn>
                )}
            </div>
        ];
    });

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader
                title="Panel de Control de Movimientos"
                subtitle="Auditoría y reversión de movimientos de los últimos 14 días"
            />

            <Card style={{ marginBottom: '24px', padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', background: '#1a1d2e' }}>
                <div style={{ flex: '1 1 150px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#9ca3af' }}>Desde</label>
                    <input 
                        type="date" 
                        value={desde} 
                        onChange={(e) => setDesde(e.target.value)} 
                        style={{ background: '#0f111a', border: '1px solid #2a2d3e', borderRadius: '4px', color: 'white', padding: '8px', width: '100%' }}
                    />
                </div>
                <div style={{ flex: '1 1 150px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#9ca3af' }}>Hasta</label>
                    <input 
                        type="date" 
                        value={hasta} 
                        onChange={(e) => setHasta(e.target.value)} 
                        style={{ background: '#0f111a', border: '1px solid #2a2d3e', borderRadius: '4px', color: 'white', padding: '8px', width: '100%' }}
                    />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                    <Select
                        label="Depósito"
                        value={depositoId}
                        onChange={setDepositoId}
                        options={[{ value: '', label: 'Todos' }, ...rawDepots.map((d: any) => ({ value: d.id, label: d.nombre }))]}
                    />
                </div>
                <div style={{ flex: '1 1 250px' }}>
                    <Select
                        label="Material"
                        value={itemId}
                        onChange={setItemId}
                        options={[{ value: '', label: 'Todos' }, ...rawItems.map((i: any) => ({ value: i.id, label: `${i.codigoInterno} - ${i.descripcion}` }))]}
                    />
                </div>
                <div style={{ flex: '1 1 150px' }}>
                    <Input
                        label="Lote/Partida"
                        placeholder="Buscar lote..."
                        value={lotNumber}
                        onChange={setLotNumber}
                    />
                </div>
                <Btn onClick={refetch}>Filtrar 🔍</Btn>
            </Card>

            <Card style={{ background: '#0f111a' }}>
                {isFetching ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <Spinner />
                        <p style={{ marginTop: '16px', color: '#6b7280' }}>Cargando movimientos...</p>
                    </div>
                ) : movements.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#4b5563' }}>
                        No se encontraron movimientos en este período.
                    </div>
                ) : (
                    <Table cols={cols} rows={rows} />
                )}
            </Card>
        </div>
    );
}
