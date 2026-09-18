import { useState, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectAllowedDepots } from '../../entities/auth/model/authSlice';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { useGetItemsQuery, useGetItemCategoriesQuery } from '../../features/warehouse/materiales/api/items.api';
import { useGetStockQuery } from '../../features/warehouse/stock/api/stock.api';
import { PageHeader, Card, Badge, Btn, Table, Spinner, Input, Select, useIsMobile } from '../../shared/ui';

export default function MaterialesCriticosV2Page() {
    const isMobile = useIsMobile();
    const allowedDepots = useSelector(selectAllowedDepots);

    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => {
        const active = rawDepots.filter((d: any) => d.activo !== false);
        if (!allowedDepots) return active;
        return active.filter((d: any) => allowedDepots.includes(d.id));
    }, [rawDepots, allowedDepots]);

    const [depotId, setDepotId] = useState<string>(() => sessionStorage.getItem('selectedPurchasingDepotId') || '');

    useEffect(() => {
        if (depotId) sessionStorage.setItem('selectedPurchasingDepotId', depotId);
    }, [depotId]);

    useEffect(() => {
        if (!depotId && depots.length === 1) {
            setDepotId(depots[0].id);
        }
    }, [depots, depotId]);

    const { data: items = [], isLoading: loadingItems } = useGetItemsQuery({ depositoId: depotId || undefined });
    const { data: allStock = [], isLoading: loadingStock } = useGetStockQuery({ depotId: depotId || undefined });
    const { data: categories = [] } = useGetItemCategoriesQuery(depotId || undefined);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'OK'>('ALL');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>(isMobile ? 'cards' : 'cards');
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    const toggleCategory = (catId: string) => {
        setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
    };

    // Build Stock Totals Map by ItemId
    const stockTotalsByItem = useMemo(() => {
        const map = new Map<string, number>();
        allStock.forEach((sb: any) => {
            const current = map.get(sb.itemId) || 0;
            map.set(sb.itemId, current + Number(sb.qtyPrincipal || 0));
        });
        return map;
    }, [allStock]);

    // Group items by category and compute metrics
    const categoryGroups = useMemo(() => {
        const groupsMap = new Map<string, {
            id: string;
            nombre: string;
            depositoNombre?: string;
            items: any[];
            totalStock: number;
            totalMinStock: number;
            totalMaxStock: number;
            deficit: number;
            criticalCount: number;
            warningCount: number;
            okCount: number;
            status: 'CRITICAL' | 'WARNING' | 'OK';
        }>();

        // Initialize from official categories if available
        categories.forEach((cat: any) => {
            groupsMap.set(cat.id, {
                id: cat.id,
                nombre: cat.nombre,
                depositoNombre: cat.deposito?.nombre,
                items: [],
                totalStock: 0,
                totalMinStock: 0,
                totalMaxStock: 0,
                deficit: 0,
                criticalCount: 0,
                warningCount: 0,
                okCount: 0,
                status: 'OK',
            });
        });

        // Group active items
        items.forEach((item: any) => {
            const catId = item.categoryId || item.category?.id || 'SIN_CATEGORIA';
            const catName = item.category?.nombre || item.categoria || 'Sin Categoría';

            if (!groupsMap.has(catId)) {
                groupsMap.set(catId, {
                    id: catId,
                    nombre: catName,
                    items: [],
                    totalStock: 0,
                    totalMinStock: 0,
                    totalMaxStock: 0,
                    deficit: 0,
                    criticalCount: 0,
                    warningCount: 0,
                    okCount: 0,
                    status: 'OK',
                });
            }

            const group = groupsMap.get(catId)!;
            const stockActual = stockTotalsByItem.get(item.id) || 0;
            const stockMinimo = item.stockMinimo ? Number(item.stockMinimo) : null;
            const stockMaximo = item.stockMaximo ? Number(item.stockMaximo) : null;
            const isIgnored = Boolean(item.meta?.ignorarStockMinimo);

            let itemStatus: 'CRITICAL' | 'WARNING' | 'OK' = 'OK';
            if (stockMinimo !== null && stockMinimo > 0 && !isIgnored) {
                if (stockActual < stockMinimo) {
                    itemStatus = 'CRITICAL';
                } else if (stockActual <= stockMinimo * 1.25) {
                    itemStatus = 'WARNING';
                }
            }

            if (itemStatus === 'CRITICAL') group.criticalCount++;
            else if (itemStatus === 'WARNING') group.warningCount++;
            else group.okCount++;

            group.items.push({
                ...item,
                stockActual,
                stockMinimo,
                stockMaximo,
                status: itemStatus,
                isIgnored,
            });

            group.totalStock += stockActual;
            if (stockMinimo !== null) group.totalMinStock += stockMinimo;
            if (stockMaximo !== null) group.totalMaxStock += stockMaximo;
        });

        // Compute group level deficit and status
        const list = Array.from(groupsMap.values()).filter(g => g.items.length > 0);

        list.forEach(g => {
            g.deficit = Math.max(0, g.totalMinStock - g.totalStock);
            if (g.criticalCount > 0 || (g.totalMinStock > 0 && g.totalStock < g.totalMinStock)) {
                g.status = 'CRITICAL';
            } else if (g.warningCount > 0 || (g.totalMinStock > 0 && g.totalStock <= g.totalMinStock * 1.25)) {
                g.status = 'WARNING';
            } else {
                g.status = 'OK';
            }

            // Sort items inside: critical first, then warning, then alphabetical
            g.items.sort((a, b) => {
                const priority = { CRITICAL: 0, WARNING: 1, OK: 2 };
                if (priority[a.status] !== priority[b.status]) {
                    return priority[a.status] - priority[b.status];
                }
                return (a.descripcion || '').localeCompare(b.descripcion || '');
            });
        });

        // Sort groups: CRITICAL first, then WARNING, then OK
        list.sort((a, b) => {
            const priority = { CRITICAL: 0, WARNING: 1, OK: 2 };
            if (priority[a.status] !== priority[b.status]) {
                return priority[a.status] - priority[b.status];
            }
            return b.deficit - a.deficit;
        });

        return list;
    }, [items, stockTotalsByItem, categories]);

    // Filter categories by search and status
    const filteredGroups = useMemo(() => {
        const query = search.trim().toLowerCase();
        return categoryGroups.filter(group => {
            if (statusFilter !== 'ALL' && group.status !== statusFilter) return false;
            if (!query) return true;

            const nameMatches = group.nombre.toLowerCase().includes(query);
            const itemsMatch = group.items.some(it =>
                (it.descripcion || '').toLowerCase().includes(query) ||
                (it.codigoInterno || '').toLowerCase().includes(query)
            );
            return nameMatches || itemsMatch;
        });
    }, [categoryGroups, search, statusFilter]);

    // KPI Counters
    const kpis = useMemo(() => {
        let totalCategories = categoryGroups.length;
        let criticalCount = 0;
        let warningCount = 0;
        let okCount = 0;
        let totalDeficitKg = 0;

        categoryGroups.forEach(g => {
            if (g.status === 'CRITICAL') criticalCount++;
            else if (g.status === 'WARNING') warningCount++;
            else okCount++;
            totalDeficitKg += g.deficit;
        });

        return { totalCategories, criticalCount, warningCount, okCount, totalDeficitKg };
    }, [categoryGroups]);

    const isLoading = loadingItems || loadingStock;

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader
                title="Materiales Críticos 2.0"
                subtitle="Monitoreo y alerta por categoría de material, sin configuraciones complejas"
            />

            {/* Global Depots & Quick Actions */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ minWidth: '220px' }}>
                    <Select
                        label="Depósito"
                        value={depotId}
                        onChange={setDepotId}
                        options={[
                            { value: '', label: '🌐 Todos los depósitos' },
                            ...depots.map(d => ({ value: d.id, label: d.nombre }))
                        ]}
                    />
                </div>

                <div style={{ flex: 1, minWidth: '250px' }}>
                    <Input
                        placeholder="Buscar por categoría o nombre de material..."
                        value={search}
                        onChange={setSearch}
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <Btn
                        small
                        variant={viewMode === 'cards' ? 'primary' : 'secondary'}
                        onClick={() => setViewMode('cards')}
                    >
                        🗂️ Tarjetas
                    </Btn>
                    <Btn
                        small
                        variant={viewMode === 'table' ? 'primary' : 'secondary'}
                        onClick={() => setViewMode('table')}
                    >
                        📑 Tabla
                    </Btn>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <Card
                    style={{
                        padding: '16px',
                        cursor: 'pointer',
                        border: statusFilter === 'ALL' ? '2px solid var(--primary, #6366f1)' : undefined,
                    }}
                    onClick={() => setStatusFilter('ALL')}
                >
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', fontWeight: 700, textTransform: 'uppercase' }}>
                        🏷️ Categorías Totales
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary, #f3f4f6)' }}>
                        {kpis.totalCategories}
                    </div>
                </Card>

                <Card
                    style={{
                        padding: '16px',
                        cursor: 'pointer',
                        background: kpis.criticalCount > 0 ? 'rgba(239, 68, 68, 0.08)' : undefined,
                        border: statusFilter === 'CRITICAL' ? '2px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.25)',
                    }}
                    onClick={() => setStatusFilter(statusFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
                >
                    <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>
                        🔴 En Quiebre / Déficit
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '4px', color: '#ef4444' }}>
                        {kpis.criticalCount}
                    </div>
                    <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }}>
                        {kpis.totalDeficitKg.toFixed(1)} kg faltantes
                    </div>
                </Card>

                <Card
                    style={{
                        padding: '16px',
                        cursor: 'pointer',
                        background: kpis.warningCount > 0 ? 'rgba(245, 158, 11, 0.08)' : undefined,
                        border: statusFilter === 'WARNING' ? '2px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.25)',
                    }}
                    onClick={() => setStatusFilter(statusFilter === 'WARNING' ? 'ALL' : 'WARNING')}
                >
                    <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
                        🟡 Cerca del Mínimo
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '4px', color: '#f59e0b' }}>
                        {kpis.warningCount}
                    </div>
                </Card>

                <Card
                    style={{
                        padding: '16px',
                        cursor: 'pointer',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: statusFilter === 'OK' ? '2px solid #10b981' : '1px solid rgba(16, 185, 129, 0.25)',
                    }}
                    onClick={() => setStatusFilter(statusFilter === 'OK' ? 'ALL' : 'OK')}
                >
                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                        🟢 Stock Óptimo
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '4px', color: '#10b981' }}>
                        {kpis.okCount}
                    </div>
                </Card>
            </div>

            {isLoading ? (
                <div style={{ padding: '60px', textAlign: 'center' }}>
                    <Spinner />
                </div>
            ) : filteredGroups.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-secondary, #1a1d2e)', borderRadius: '12px' }}>
                    <span style={{ fontSize: '40px' }}>📦</span>
                    <h3 style={{ marginTop: '12px' }}>No se encontraron categorías para este filtro</h3>
                    <p style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '13px' }}>Probá cambiando los términos de búsqueda o el depósito seleccionado.</p>
                </div>
            ) : viewMode === 'cards' ? (
                /* Cards View */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                    {filteredGroups.map(group => {
                        const isExpanded = !!expandedCategories[group.id];
                        const badgeColor = group.status === 'CRITICAL' ? '#ef4444' : group.status === 'WARNING' ? '#f59e0b' : '#10b981';
                        const statusLabel = group.status === 'CRITICAL' ? 'Déficit' : group.status === 'WARNING' ? 'Atención' : 'Normal';

                        return (
                            <Card
                                key={group.id}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    border: group.status === 'CRITICAL'
                                        ? '1px solid rgba(239, 68, 68, 0.4)'
                                        : group.status === 'WARNING'
                                            ? '1px solid rgba(245, 158, 11, 0.4)'
                                            : undefined,
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted, #9ca3af)', fontWeight: 700, textTransform: 'uppercase' }}>
                                            {group.depositoNombre ? `🏢 ${group.depositoNombre}` : 'Categoría'}
                                        </div>
                                        <h3 style={{ margin: '4px 0 0 0', color: 'var(--text-primary, #f3f4f6)', fontSize: '18px' }}>
                                            {group.nombre}
                                        </h3>
                                    </div>
                                    <Badge color={badgeColor}>{statusLabel}</Badge>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '12px', background: 'var(--bg-primary, #0f1117)', borderRadius: '8px', marginBottom: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>Stock Total</div>
                                        <div style={{ fontSize: '18px', fontWeight: 800, color: group.status === 'CRITICAL' ? '#ef4444' : 'var(--text-primary, #f3f4f6)' }}>
                                            {group.totalStock.toFixed(1)} <span style={{ fontSize: '12px', fontWeight: 400 }}>kg</span>
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>Mínimo Configurado</div>
                                        <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #f3f4f6)' }}>
                                            {group.totalMinStock.toFixed(1)} <span style={{ fontSize: '12px', fontWeight: 400 }}>kg</span>
                                        </div>
                                    </div>

                                    {group.deficit > 0 && (
                                        <div style={{ gridColumn: 'span 2', paddingTop: '6px', borderTop: '1px dashed rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '12px', fontWeight: 700 }}>
                                            ⚠️ Faltan {group.deficit.toFixed(1)} kg para cubrir el stock mínimo
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-color, #2a2d3e)' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                                        {group.items.length} material(es) · {group.criticalCount} críticos
                                    </span>
                                    <Btn
                                        small
                                        variant="secondary"
                                        onClick={() => toggleCategory(group.id)}
                                    >
                                        {isExpanded ? 'Ocultar Detalle ▲' : 'Ver Detalle ▼'}
                                    </Btn>
                                </div>

                                {/* Expanded Item List */}
                                {isExpanded && (
                                    <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-color, #2a2d3e)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {group.items.map(it => (
                                            <div
                                                key={it.id}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: '8px',
                                                    background: it.status === 'CRITICAL' ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary, #1a1d2e)',
                                                    border: it.status === 'CRITICAL' ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid var(--border-subtle, #2a2d3e)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                }}
                                            >
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary, #f3f4f6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {it.descripcion}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>
                                                        <code>{it.codigoInterno}</code> {it.supplier?.name ? `· ${it.supplier.name}` : ''}
                                                    </div>
                                                </div>

                                                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    <div style={{ fontWeight: 800, fontSize: '13px', color: it.status === 'CRITICAL' ? '#ef4444' : it.status === 'WARNING' ? '#f59e0b' : '#10b981' }}>
                                                        {it.stockActual.toFixed(1)} kg
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted, #9ca3af)' }}>
                                                        Mín: {it.stockMinimo !== null ? `${it.stockMinimo.toFixed(0)} kg` : 'S/C'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            ) : (
                /* Table View */
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                    <Table
                        cols={['Categoría', 'Stock Total', 'Mínimo', 'Déficit', 'Materiales', 'Estado', 'Acción']}
                        rows={filteredGroups.map(group => [
                            <div key="cat">
                                <strong style={{ color: 'var(--text-primary, #f3f4f6)' }}>{group.nombre}</strong>
                                {group.depositoNombre && <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>{group.depositoNombre}</div>}
                            </div>,
                            <span key="st" style={{ fontWeight: 700, color: group.status === 'CRITICAL' ? '#ef4444' : 'var(--text-primary, #f3f4f6)' }}>
                                {group.totalStock.toFixed(1)} kg
                            </span>,
                            <span key="min" style={{ color: 'var(--text-muted, #9ca3af)' }}>
                                {group.totalMinStock.toFixed(1)} kg
                            </span>,
                            group.deficit > 0 ? (
                                <Badge key="def" color="#ef4444">-{group.deficit.toFixed(1)} kg</Badge>
                            ) : (
                                <span key="def" style={{ color: '#10b981', fontSize: '12px' }}>Cubierto</span>
                            ),
                            <span key="it" style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                                {group.items.length} ({group.criticalCount} críticos)
                            </span>,
                            <Badge
                                key="badge"
                                color={group.status === 'CRITICAL' ? '#ef4444' : group.status === 'WARNING' ? '#f59e0b' : '#10b981'}
                            >
                                {group.status === 'CRITICAL' ? 'Déficit' : group.status === 'WARNING' ? 'Atención' : 'Normal'}
                            </Badge>,
                            <Btn
                                key="btn"
                                small
                                variant="secondary"
                                onClick={() => toggleCategory(group.id)}
                            >
                                {expandedCategories[group.id] ? 'Ocultar ▲' : 'Ver ▼'}
                            </Btn>
                        ])}
                    />
                </Card>
            )}
        </div>
    );
}
