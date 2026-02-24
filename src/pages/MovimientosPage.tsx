import { useState, useMemo } from 'react';
import { useGetMovimientosQuery } from '../features/movimientos/api/movimientos.api';
import { useGetDepotsQuery } from '../features/depots/api/depots.api';
import { PageHeader, Card, Table, Badge, Select, Input } from './common/ui';

const TIPO_LABELS: Record<string, string> = {
    REMITO_ENTRADA: 'Entrada',
    REMITO_SALIDA: 'Salida',
    AJUSTE_SUMA: 'Ajuste (+)',
    AJUSTE_RESTA: 'Ajuste (-)',
    MOVE_ENTRADA: 'Reubicación (E)',
    MOVE_SALIDA: 'Reubicación (S)',
};

const TIPO_COLORS: Record<string, string> = {
    REMITO_ENTRADA: '#34d399',
    REMITO_SALIDA: '#f87171',
    AJUSTE_SUMA: '#6366f1',
    AJUSTE_RESTA: '#fbbf24',
    MOVE_ENTRADA: '#a5b4fc',
    MOVE_SALIDA: '#6b7280',
};

export default function MovimientosPage() {
    const { data: depots = [] } = useGetDepotsQuery();

    // Filters
    const [depositoId, setDepositoId] = useState('');
    const [tipo, setTipo] = useState('');
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');

    const { data: movimientos = [], isLoading } = useGetMovimientosQuery({
        depositoId: depositoId || undefined,
        tipo: tipo || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
    });

    const rows = useMemo(() => {
        return [...movimientos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map(m => [
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#f3f4f6', fontSize: '13px' }}>{new Date(m.fecha).toLocaleDateString('es-AR')}</span>
                <span style={{ color: '#6b7280', fontSize: '11px' }}>{new Date(m.fecha).toLocaleTimeString('es-AR', { hour: '2xl', minute: '2xl' })}</span>
            </div>,
            <Badge color={TIPO_COLORS[m.tipo]}>{TIPO_LABELS[m.tipo] || m.tipo}</Badge>,
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#f3f4f6' }}>{m.item?.descripcion || '—'}</span>
                <code style={{ color: '#a5b4fc', fontSize: '11px' }}>{m.item?.codigoInterno || '—'}</code>
            </div>,
            <code style={{ color: '#fbbf24', fontSize: '12px' }}>{m.batch?.lotNumber || '—'}</code>,
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#d1d5db' }}>{m.deposito?.nombre || '—'}</span>
                <Badge color="#4b5563">{m.posicion?.codigo || '—'}</Badge>
            </div>,
            <span style={{
                color: m.deltaKilos > 0 ? '#34d399' : m.deltaKilos < 0 ? '#f87171' : '#d1d5db',
                fontWeight: 600
            }}>
                {m.deltaKilos > 0 ? '+' : ''}{Number(m.deltaKilos).toFixed(2)} kg
            </span>,
            <span style={{ color: '#9ca3af' }}>{m.deltaUnidades != null ? `${m.deltaUnidades > 0 ? '+' : ''}${m.deltaUnidades} un.` : '—'}</span>,
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#6b7280', fontSize: '11px' }}>{m.userId || 'Sistema'}</span>
                {m.observaciones && <span style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic' }}>{m.observaciones}</span>}
            </div>
        ]);
    }, [movimientos]);

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Historial de Movimientos" subtitle="Registro completo e inmutable de todas las transacciones de stock" />

            {/* Filters Bar */}
            <Card style={{ marginBottom: '20px' }}>
                <div style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'end' }}>
                    <Select
                        label="Depósito"
                        value={depositoId}
                        onChange={setDepositoId}
                        options={[{ value: '', label: 'Todos los depósitos' }, ...depots.map((d: any) => ({ value: d.id, label: d.nombre }))]}
                        style={{ width: '200px' }}
                    />
                    <Select
                        label="Tipo de Movimiento"
                        value={tipo}
                        onChange={setTipo}
                        options={[
                            { value: '', label: 'Todos los tipos' },
                            ...Object.entries(TIPO_LABELS).map(([k, v]) => ({ value: k, label: v }))
                        ]}
                        style={{ width: '180px' }}
                    />
                    <Input label="Desde" type="date" value={desde} onChange={setDesde} style={{ width: '150px' }} />
                    <Input label="Hasta" type="date" value={hasta} onChange={setHasta} style={{ width: '150px' }} />
                    <Btn variant="secondary" onClick={() => { setDepositoId(''); setTipo(''); setDesde(''); setHasta(''); }}>Limpiar</Btn>
                </div>
            </Card>

            {/* Results Table */}
            <Card>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2d3e', color: '#9ca3af', fontSize: '13px' }}>
                    {isLoading ? 'Cargando movimientos...' : `Mostrando ${movimientos.length} registros`}
                </div>
                <Table
                    loading={isLoading}
                    cols={['Fecha', 'Tipo', 'Material', 'Partida', 'Depósito / Pos', 'Δ Kilos', 'Δ Unid.', 'Usuario / Obs.']}
                    rows={rows}
                />
            </Card>
        </div>
    );
}
