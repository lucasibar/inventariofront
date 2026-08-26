import { useState, useMemo } from 'react';
import { useGetCombosQuery, useGetComboBreakdownQuery } from '../../features/warehouse/stock/api/stock.api';
import { useGetStockQuery } from '../../features/warehouse/stock/api/stock.api';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { useGetItemsQuery } from '../../features/warehouse/materiales/api/items.api';
import { PageHeader, Card, Badge, Btn, Select, SearchSelect, Spinner, Table } from '../../shared/ui';

export default function ConvertidorPedidosPage() {
    const [depositoId, setDepositoId] = useState('');
    const [selectedComboId, setSelectedComboId] = useState('');
    const [cantidadProducto, setCantidadProducto] = useState('1');
    const [showResult, setShowResult] = useState(false);

    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => rawDepots.filter((d: any) => d.activo !== false), [rawDepots]);

    const { data: rawItems = [] } = useGetItemsQuery({});
    const itemsMap = useMemo(() => {
        const map = new Map<string, any>();
        rawItems.forEach((it: any) => map.set(it.id, it));
        return map;
    }, [rawItems]);

    const { data: combos = [], isLoading: loadingCombos } = useGetCombosQuery(depositoId || undefined);
    const { data: breakdownRaw = [], isLoading: loadingBreakdown } = useGetComboBreakdownQuery(
        selectedComboId,
        { skip: !selectedComboId }
    );
    const { data: stockEntries = [] } = useGetStockQuery(
        { depotId: depositoId || undefined },
        { skip: !depositoId }
    );

    const comboSeleccionado = useMemo(
        () => (combos as any[]).find((c) => c.id === selectedComboId),
        [combos, selectedComboId]
    );

    const breakdown = Array.isArray(breakdownRaw) ? breakdownRaw : [];
    const cantidad = Number(cantidadProducto) || 1;

    // Calcular materiales necesarios vs stock disponible
    const lineas = useMemo(() => {
        if (!breakdown.length) return [];
        return breakdown.map((item: any) => {
            const itemInfo = itemsMap.get(item.itemId) || item.item || {};
            const descripcion = item.description || item.descripcion || itemInfo.descripcion || item.name || item.itemId;
            const codigoInterno = item.code || item.codigoInterno || itemInfo.codigoInterno || '';
            const unidad = item.unitLabel || item.unidad || itemInfo.unidadPrincipal || 'kg';
            const necesario = (item.stockMinimo || item.stockMaximo || 1) * cantidad;
            const stockActual = stockEntries
                .filter((s: any) => s.itemId === item.itemId || s.item?.id === item.itemId)
                .reduce((sum: number, s: any) => sum + Number(s.qtyPrincipal || 0), 0);
            const faltante = Math.max(0, necesario - stockActual);
            return {
                ...item,
                descripcion,
                codigoInterno,
                unidad,
                necesario,
                stockActual,
                faltante,
                cubiertoConStock: faltante === 0,
            };
        });
    }, [breakdown, cantidad, stockEntries, itemsMap]);

    const totalFaltante = lineas.filter(l => l.faltante > 0);

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader
                title="Convertidor de Pedidos"
                subtitle="Transformá un pedido de cliente en los materiales necesarios para abastecerlo"
            >
                <Badge color="#f59e0b">Demo</Badge>
            </PageHeader>

            {/* Aviso demo */}
            <Card style={{ marginBottom: '24px', borderColor: '#f59e0b', background: 'rgba(245,158,11,0.06)', padding: '14px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>🧪</span>
                    <div>
                        <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '14px' }}>Modo demostrativo</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted, #9ca3af)' }}>
                            Esta pantalla es funcional para visualizar la necesidad de materiales. La generación automática de Pedidos de Compra estará disponible próximamente.
                        </div>
                    </div>
                </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
                {/* ── Panel Izquierdo: Parámetros ── */}
                <Card style={{ padding: '24px' }}>
                    <h3 style={{ margin: '0 0 20px', color: 'var(--text-primary, #f3f4f6)', fontSize: '15px' }}>
                        📋 Parámetros del Pedido
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <Select
                                label="Depósito / Planta"
                                value={depositoId}
                                onChange={v => { setDepositoId(v); setSelectedComboId(''); setShowResult(false); }}
                                options={[
                                    { value: '', label: 'Todos los depósitos' },
                                    ...depots.map((d: any) => ({ value: d.id, label: d.nombre + (d.planta ? ` (${d.planta})` : '') }))
                                ]}
                            />
                        </div>

                        <div>
                            <label style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                                Grupo de Materiales (Producto)
                            </label>
                            {loadingCombos ? <Spinner /> : (
                                <SearchSelect
                                    value={selectedComboId}
                                    onChange={v => { setSelectedComboId(v); setShowResult(false); }}
                                    options={[
                                        { value: '', label: 'Seleccionar grupo...' },
                                        ...(combos as any[]).map((c) => ({ value: c.id, label: c.title }))
                                    ]}
                                    placeholder="Buscar grupo de materiales..."
                                />
                            )}
                        </div>

                        <div>
                            <label style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                                Cantidad de Pedido (unidades de producto)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={cantidadProducto}
                                onChange={e => { setCantidadProducto(e.target.value); setShowResult(false); }}
                                style={{
                                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                                    background: 'var(--bg-secondary, #111827)',
                                    border: '1px solid var(--border-strong, #374151)',
                                    color: 'var(--text-primary, #f3f4f6)', fontSize: '16px',
                                    outline: 'none', boxSizing: 'border-box',
                                    fontWeight: 700,
                                }}
                            />
                        </div>

                        <Btn
                            onClick={() => setShowResult(true)}
                            disabled={!selectedComboId || cantidad <= 0 || loadingBreakdown}
                            style={{ marginTop: '8px' }}
                        >
                            {loadingBreakdown ? 'Calculando...' : '→ Calcular Materiales'}
                        </Btn>

                        <div
                            style={{
                                marginTop: '16px',
                                padding: '16px',
                                borderRadius: '8px',
                                border: '2px dashed #6366f1',
                                background: 'rgba(99, 102, 241, 0.05)',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onClick={() => alert('📥 Carga rápida de pedidos por Excel (.xlsx / .csv)\n\nEsta funcionalidad permitirá importar planillas de pedidos de clientes para convertirlos automáticamente en requerimientos de compra.')}
                        >
                            <div style={{ fontSize: '24px', marginBottom: '4px' }}>📊</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#818cf8' }}>Cargar Excel de Pedidos</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                Importación rápida de pedidos de clientes (.xlsx / .csv)
                            </div>
                        </div>
                    </div>
                </Card>

                {/* ── Panel Derecho: Resultado ── */}
                <div>
                    {!showResult && (
                        <Card style={{ textAlign: 'center', padding: '60px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
                            <h3 style={{ color: 'var(--text-primary, #f3f4f6)', marginBottom: '8px' }}>
                                Completá los parámetros
                            </h3>
                            <p style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '14px' }}>
                                Seleccioná el grupo de materiales y la cantidad del pedido para ver qué hay que comprar.
                            </p>
                        </Card>
                    )}

                    {showResult && loadingBreakdown && (
                        <Card style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                            <Spinner />
                        </Card>
                    )}

                    {showResult && !loadingBreakdown && (
                        <>
                            {/* Resumen */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                <Card style={{ padding: '16px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Materiales necesarios</div>
                                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#818cf8' }}>{lineas.length}</div>
                                </Card>
                                <Card style={{ padding: '16px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Materiales a comprar</div>
                                    <div style={{ fontSize: '28px', fontWeight: 800, color: totalFaltante.length > 0 ? '#ef4444' : '#10b981' }}>
                                        {totalFaltante.length}
                                    </div>
                                </Card>
                            </div>

                            <Card>
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #2a2d3e)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '14px' }}>
                                        {comboSeleccionado?.title} × {cantidad}
                                    </h3>
                                    <Btn
                                        disabled
                                        title="Próximamente: generar pedido de compra automáticamente"
                                    >
                                        📄 Generar Pedido de Compra (próximamente)
                                    </Btn>
                                </div>

                                <Table
                                    cols={['Material', 'Necesario', 'En Stock', 'A Comprar', 'Estado']}
                                    rows={lineas.map((l) => [
                                        <div key={l.itemId}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{l.descripcion}</div>
                                            {l.codigoInterno && <code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.codigoInterno}</code>}
                                        </div>,
                                        <span key="nec" style={{ fontWeight: 700, color: '#818cf8' }}>
                                            {l.necesario.toLocaleString('es-AR', { maximumFractionDigits: 1 })} {l.unidad}
                                        </span>,
                                        <span key="stock" style={{ color: l.stockActual >= l.necesario ? '#10b981' : '#f59e0b' }}>
                                            {l.stockActual.toLocaleString('es-AR', { maximumFractionDigits: 1 })} {l.unidad}
                                        </span>,
                                        <span key="falt" style={{ fontWeight: 700, color: l.faltante > 0 ? '#ef4444' : '#10b981' }}>
                                            {l.faltante > 0 ? `${l.faltante.toLocaleString('es-AR', { maximumFractionDigits: 1 })} ${l.unidad}` : '—'}
                                        </span>,
                                        l.cubiertoConStock
                                            ? <Badge key="ok" color="#10b981">✓ Cubierto</Badge>
                                            : <Badge key="nok" color="#ef4444">Falta comprar</Badge>
                                    ])}
                                />
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
