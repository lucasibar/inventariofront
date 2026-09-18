import { useState, useMemo } from 'react';
import { useGetAlertsQuery } from '../../features/warehouse/stock/api/stock.api';
import { useUpdateItemMutation } from '../../features/warehouse/materiales/api/items.api';
import { PageHeader, Card, Table, Badge, Spinner, Btn, Input } from '../../shared/ui';

export default function AlertaStockPage() {
    const { data: rawAlerts = [], isLoading, refetch } = useGetAlertsQuery({ all: true });
    const [updateItem, { isLoading: isUpdating }] = useUpdateItemMutation();

    const [filterTab, setFilterTab] = useState<'CRITICAL' | 'WARNING' | 'OK' | 'IGNORED' | 'ALL'>('CRITICAL');
    const [search, setSearch] = useState('');

    // State for in-place editing
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editMinStock, setEditMinStock] = useState<string>('');
    const [editMaxStock, setEditMaxStock] = useState<string>('');

    const startEditing = (item: any) => {
        setEditingItemId(item.itemId);
        setEditMinStock(item.stockMinimo !== null ? String(item.stockMinimo) : '');
        setEditMaxStock(item.stockMaximo !== null ? String(item.stockMaximo) : '');
    };

    const cancelEditing = () => {
        setEditingItemId(null);
        setEditMinStock('');
        setEditMaxStock('');
    };

    const handleSaveLimits = async (itemId: string) => {
        const minVal = editMinStock.trim() === '' ? null : Number(editMinStock);
        const maxVal = editMaxStock.trim() === '' ? null : Number(editMaxStock);

        if (minVal !== null && isNaN(minVal)) {
            alert('Por favor ingresá un número válido para el stock mínimo.');
            return;
        }
        if (maxVal !== null && isNaN(maxVal)) {
            alert('Por favor ingresá un número válido para el stock máximo.');
            return;
        }

        try {
            await updateItem({
                id: itemId,
                data: {
                    stockMinimo: minVal,
                    stockMaximo: maxVal,
                }
            }).unwrap();
            cancelEditing();
            refetch();
        } catch (err: any) {
            alert(err?.data?.message || 'No se pudieron actualizar los límites de stock.');
        }
    };

    const handleToggleIgnoreMin = async (item: any) => {
        const currentIgnored = Boolean(item.ignorarStockMinimo || item.meta?.ignorarStockMinimo);
        const nextIgnored = !currentIgnored;

        try {
            await updateItem({
                id: item.itemId,
                data: {
                    meta: {
                        ...(item.meta || {}),
                        ignorarStockMinimo: nextIgnored,
                    }
                }
            }).unwrap();
            refetch();
        } catch (err: any) {
            alert(err?.data?.message || 'No se pudo cambiar el estado de la alerta.');
        }
    };

    // Calculate traffic-light status for each alert item
    const processedAlerts = useMemo(() => {
        return rawAlerts.map(a => {
            const actual = Number(a.stockActual || 0);
            const min = a.stockMinimo !== null ? Number(a.stockMinimo) : null;
            const isIgnored = Boolean(a.ignorarStockMinimo || a.meta?.ignorarStockMinimo);

            let semaforo: 'RED' | 'YELLOW' | 'GREEN' = 'GREEN';
            if (isIgnored) {
                semaforo = 'GREEN';
            } else if (min !== null && actual < min) {
                semaforo = 'RED';
            } else if (min !== null && actual <= min * 1.25) {
                semaforo = 'YELLOW';
            } else {
                semaforo = 'GREEN';
            }

            return {
                ...a,
                stockActual: actual,
                stockMinimo: min,
                stockMaximo: a.stockMaximo !== null ? Number(a.stockMaximo) : null,
                isIgnored,
                semaforo,
            };
        });
    }, [rawAlerts]);

    // Counters for top tabs
    const counts = useMemo(() => {
        let critical = 0;
        let warning = 0;
        let ok = 0;
        let ignored = 0;

        processedAlerts.forEach(a => {
            if (a.isIgnored) ignored++;
            else if (a.semaforo === 'RED') critical++;
            else if (a.semaforo === 'YELLOW') warning++;
            else ok++;
        });

        return { critical, warning, ok, ignored, all: processedAlerts.length };
    }, [processedAlerts]);

    // Filtered by tab and search
    const filteredAlerts = useMemo(() => {
        const q = search.trim().toLowerCase();

        return processedAlerts.filter(a => {
            if (filterTab === 'CRITICAL' && (a.semaforo !== 'RED' || a.isIgnored)) return false;
            if (filterTab === 'WARNING' && (a.semaforo !== 'YELLOW' || a.isIgnored)) return false;
            if (filterTab === 'OK' && (a.semaforo !== 'GREEN' || a.isIgnored)) return false;
            if (filterTab === 'IGNORED' && !a.isIgnored) return false;

            if (!q) return true;
            return (
                (a.descripcion || '').toLowerCase().includes(q) ||
                (a.codigoInterno || '').toLowerCase().includes(q) ||
                (a.categoria || '').toLowerCase().includes(q)
            );
        });
    }, [processedAlerts, filterTab, search]);

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader
                title="Alertas de Stock"
                subtitle="Semáforo de materiales y control rápido de stock mínimo y máximo"
            />

            {/* Quick Status Tabs */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <Btn
                    variant={filterTab === 'CRITICAL' ? 'primary' : 'secondary'}
                    onClick={() => setFilterTab('CRITICAL')}
                    style={{
                        background: filterTab === 'CRITICAL' ? '#ef4444' : undefined,
                        borderColor: filterTab === 'CRITICAL' ? '#ef4444' : undefined,
                    }}
                >
                    🔴 Críticos ({counts.critical})
                </Btn>

                <Btn
                    variant={filterTab === 'WARNING' ? 'primary' : 'secondary'}
                    onClick={() => setFilterTab('WARNING')}
                    style={{
                        background: filterTab === 'WARNING' ? '#d97706' : undefined,
                        borderColor: filterTab === 'WARNING' ? '#d97706' : undefined,
                    }}
                >
                    🟡 Cerca del Mínimo ({counts.warning})
                </Btn>

                <Btn
                    variant={filterTab === 'OK' ? 'primary' : 'secondary'}
                    onClick={() => setFilterTab('OK')}
                    style={{
                        background: filterTab === 'OK' ? '#059669' : undefined,
                        borderColor: filterTab === 'OK' ? '#059669' : undefined,
                    }}
                >
                    🟢 En Regla ({counts.ok})
                </Btn>

                <Btn
                    variant={filterTab === 'IGNORED' ? 'primary' : 'secondary'}
                    onClick={() => setFilterTab('IGNORED')}
                    style={{
                        background: filterTab === 'IGNORED' ? '#4b5563' : undefined,
                        borderColor: filterTab === 'IGNORED' ? '#4b5563' : undefined,
                    }}
                >
                    🔇 Ignorados ({counts.ignored})
                </Btn>

                <Btn
                    variant={filterTab === 'ALL' ? 'primary' : 'secondary'}
                    onClick={() => setFilterTab('ALL')}
                >
                    📋 Todos ({counts.all})
                </Btn>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: '20px', maxWidth: '400px' }}>
                <Input
                    placeholder="Buscar por código, descripción o categoría..."
                    value={search}
                    onChange={setSearch}
                />
            </div>

            {isLoading ? (
                <div style={{ padding: '60px', textAlign: 'center' }}>
                    <Spinner />
                </div>
            ) : filteredAlerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-secondary, #1a1d2e)', borderRadius: '12px', border: '1px dashed var(--border-color, #2a2d3e)' }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '14px' }}>
                        {filterTab === 'CRITICAL' ? '🎉' : '🔍'}
                    </span>
                    <h3 style={{ color: 'var(--text-primary, #f3f4f6)', fontWeight: 700, fontSize: '18px' }}>
                        {filterTab === 'CRITICAL' ? '¡Sin materiales en estado crítico!' : 'No hay materiales para este filtro'}
                    </h3>
                    <p style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '13px', marginTop: '6px' }}>
                        {filterTab === 'CRITICAL'
                            ? 'Todos los materiales con stock mínimo configurado tienen stock suficiente o han sido ignorados.'
                            : 'Probá seleccionando otra pestaña o ajustando el buscador.'}
                    </p>
                </div>
            ) : (
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                    <Table
                        cols={['Semáforo', 'Material', 'Stock Actual', 'Stock Mínimo', 'Stock Máximo', 'Déficit', 'Acciones']}
                        rows={filteredAlerts.map((item: any) => {
                            const isEditing = editingItemId === item.itemId;

                            // Traffic light color & label
                            let semaforoBadge = <Badge color="#10b981">🟢 Óptimo</Badge>;
                            if (item.isIgnored) {
                                semaforoBadge = <Badge color="#6b7280">🔇 Ignorado</Badge>;
                            } else if (item.semaforo === 'RED') {
                                semaforoBadge = <Badge color="#ef4444">🔴 Crítico</Badge>;
                            } else if (item.semaforo === 'YELLOW') {
                                semaforoBadge = <Badge color="#f59e0b">🟡 Advertencia</Badge>;
                            }

                            return [
                                /* Semáforo */
                                <div key="sem" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {semaforoBadge}
                                </div>,

                                /* Material */
                                <div key="mat" style={{ maxWidth: '300px' }}>
                                    <strong style={{ color: 'var(--text-primary, #f3f4f6)', display: 'block', fontSize: '13px' }}>
                                        {item.descripcion}
                                    </strong>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                                        <code style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>{item.codigoInterno}</code>
                                        {item.categoria && <Badge color="var(--bg-hover-row, rgba(255,255,255,0.06))">{item.categoria}</Badge>}
                                    </div>
                                </div>,

                                /* Stock Actual */
                                <span
                                    key="act"
                                    style={{
                                        fontWeight: 800,
                                        fontSize: '15px',
                                        color: item.isIgnored
                                            ? 'var(--text-muted, #9ca3af)'
                                            : item.semaforo === 'RED'
                                                ? '#ef4444'
                                                : item.semaforo === 'YELLOW'
                                                    ? '#f59e0b'
                                                    : '#10b981',
                                    }}
                                >
                                    {item.stockActual.toFixed(1)} kg
                                </span>,

                                /* Stock Mínimo (In-Place Edit) */
                                <div key="min" style={{ minWidth: '130px' }}>
                                    {isEditing ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <input
                                                type="number"
                                                step="any"
                                                value={editMinStock}
                                                onChange={e => setEditMinStock(e.target.value)}
                                                placeholder="Mín kg"
                                                style={{
                                                    width: '80px',
                                                    padding: '5px 8px',
                                                    borderRadius: '6px',
                                                    background: 'var(--bg-primary, #0f1117)',
                                                    border: '1px solid var(--primary, #6366f1)',
                                                    color: '#fff',
                                                    fontSize: '12px',
                                                }}
                                            />
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>kg</span>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => startEditing(item)}
                                            style={{
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                background: 'var(--bg-hover-row, rgba(255,255,255,0.03))',
                                                border: '1px dashed rgba(255,255,255,0.15)',
                                            }}
                                            title="Click para modificar stock mínimo"
                                        >
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary, #f3f4f6)' }}>
                                                {item.stockMinimo !== null ? `${item.stockMinimo.toFixed(1)} kg` : 'Sin definir'}
                                            </span>
                                            <span style={{ fontSize: '11px', opacity: 0.6 }}>✏️</span>
                                        </div>
                                    )}
                                </div>,

                                /* Stock Máximo (In-Place Edit) */
                                <div key="max" style={{ minWidth: '130px' }}>
                                    {isEditing ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <input
                                                type="number"
                                                step="any"
                                                value={editMaxStock}
                                                onChange={e => setEditMaxStock(e.target.value)}
                                                placeholder="Máx kg"
                                                style={{
                                                    width: '80px',
                                                    padding: '5px 8px',
                                                    borderRadius: '6px',
                                                    background: 'var(--bg-primary, #0f1117)',
                                                    border: '1px solid var(--primary, #6366f1)',
                                                    color: '#fff',
                                                    fontSize: '12px',
                                                }}
                                            />
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>kg</span>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => startEditing(item)}
                                            style={{
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                background: 'var(--bg-hover-row, rgba(255,255,255,0.03))',
                                                border: '1px dashed rgba(255,255,255,0.15)',
                                            }}
                                            title="Click para modificar stock máximo"
                                        >
                                            <span style={{ color: 'var(--text-muted, #9ca3af)' }}>
                                                {item.stockMaximo !== null ? `${item.stockMaximo.toFixed(1)} kg` : 'Sin definir'}
                                            </span>
                                            <span style={{ fontSize: '11px', opacity: 0.6 }}>✏️</span>
                                        </div>
                                    )}
                                </div>,

                                /* Déficit */
                                <div key="def">
                                    {item.isIgnored ? (
                                        <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px' }}>Ignorado</span>
                                    ) : item.stockActual < (item.stockMinimo || 0) ? (
                                        <Badge color="#ef4444">
                                            -{((item.stockMinimo || 0) - item.stockActual).toFixed(1)} kg
                                        </Badge>
                                    ) : (
                                        <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>Cubierto</span>
                                    )}
                                </div>,

                                /* Acciones */
                                <div key="actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {isEditing ? (
                                        <>
                                            <Btn
                                                small
                                                variant="primary"
                                                onClick={() => handleSaveLimits(item.itemId)}
                                                disabled={isUpdating}
                                            >
                                                ✓ Guardar
                                            </Btn>
                                            <Btn
                                                small
                                                variant="secondary"
                                                onClick={cancelEditing}
                                                disabled={isUpdating}
                                            >
                                                ✕
                                            </Btn>
                                        </>
                                    ) : (
                                        <Btn
                                            small
                                            variant={item.isIgnored ? 'secondary' : 'secondary'}
                                            onClick={() => handleToggleIgnoreMin(item)}
                                            style={{
                                                fontSize: '11px',
                                                padding: '4px 10px',
                                                borderColor: item.isIgnored ? 'rgba(52, 211, 153, 0.4)' : undefined,
                                                color: item.isIgnored ? '#34d399' : 'var(--text-secondary, #d1d5db)',
                                            }}
                                            title={item.isIgnored ? "Hacer click para volver a activar las alertas de este material" : "Hacer click para ignorar y no alertar más sobre este material"}
                                        >
                                            {item.isIgnored ? '🔔 Reactivar alerta' : '🔇 No tener en cuenta mínimo'}
                                        </Btn>
                                    )}
                                </div>
                            ];
                        })}
                    />
                </Card>
            )}
        </div>
    );
}
