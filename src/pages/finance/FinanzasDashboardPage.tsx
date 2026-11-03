import { useState, useMemo } from 'react';
import {
    useGetFinanceCockpitQuery,
    type ParetoItem,
} from '../../features/finance/api/finance.api';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { PageHeader, Card, Table, Btn, Modal, Badge } from '../../shared/ui';

export default function FinanzasDashboardPage() {
    // Exchange rate state (USD to ARS)
    const [tipoCambio, setTipoCambio] = useState<number>(1250);
    const [currencyMode, setCurrencyMode] = useState<'USD' | 'ARS'>('USD');

    // Filters
    const [selectedDepot, setSelectedDepot] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');

    // Fetch depots for filter
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => rawDepots.filter((d: any) => d.activo !== false), [rawDepots]);

    // Fetch cockpit data
    const { data: cockpit, isLoading, refetch } = useGetFinanceCockpitQuery({
        tipoCambio,
        depositoId: selectedDepot || undefined,
        categoryId: selectedCategory || undefined,
    });

    // Modal detail for Pareto item
    const [selectedItem, setSelectedItem] = useState<ParetoItem | null>(null);

    // Format currency helpers
    const formatMoney = (usdVal: number, arsVal: number) => {
        if (currencyMode === 'USD') {
            return `U$S ${usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `$ ${arsVal.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const summary = cockpit?.summary;
    const aging = cockpit?.aging;

    // Pareto table columns
    const paretoCols = [
        'Pos.',
        'Material / Código',
        'Categoría & Rotación',
        'Stock en Depósito',
        'Costo Unit. (USD)',
        `Valor Inmovilizado (${currencyMode})`,
        'Antigüedad Máx.',
        'Estado de Aging',
    ];

    const paretoRows = useMemo(() => {
        if (!cockpit?.topPareto) return [];
        return cockpit.topPareto.map((it, idx) => {
            const agingBadge = it.statusAging === 'ESTANCADO_CRITICO' ? (
                <Badge color="#ef4444">🚨 +180 días (Estancado)</Badge>
            ) : it.statusAging === 'ALERTA_AMARILLA' ? (
                <Badge color="#f59e0b">⚠️ 90-180 días (Alerta)</Badge>
            ) : (
                <Badge color="#10b981">🟢 &lt; 90 días (Circulante)</Badge>
            );

            return [
                <span key="pos" style={{ fontWeight: 800, color: idx < 3 ? '#fbbf24' : 'var(--text-muted, #9ca3af)', fontSize: '14px' }}>
                    #{idx + 1}
                </span>,
                <div key="item" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary, #f3f4f6)' }}>{it.descripcion}</span>
                    <code style={{ fontSize: '11px', color: '#818cf8' }}>{it.codigoInterno}</code>
                </div>,
                <div key="cat" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #f3f4f6)' }}>{it.categoria}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-subtle, #9ca3af)' }}>Rotación: {it.rotacion}</span>
                </div>,
                <div key="qty" style={{ fontWeight: 600, color: 'var(--text-primary, #f3f4f6)' }}>
                    {it.stockQty.toLocaleString()} <span style={{ fontSize: '11px', color: 'var(--text-subtle, #9ca3af)' }}>{it.unidad}</span>
                </div>,
                <div key="cost" style={{ color: it.costoUnitarioUsd > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {it.costoUnitarioUsd > 0 ? `U$S ${it.costoUnitarioUsd.toFixed(2)}` : 'Sin asignar'}
                </div>,
                <div key="val" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary, #f3f4f6)' }}>
                        {formatMoney(it.valuationUsd, it.valuationArs)}
                    </span>
                    <span style={{ fontSize: '11px', color: '#818cf8' }}>
                        {it.pctOfTotalValuation}% del inventario
                    </span>
                </div>,
                <div key="days" style={{ fontSize: '12px', color: 'var(--text-primary, #f3f4f6)', fontWeight: 600 }}>
                    {it.maxDaysInStock} días
                </div>,
                agingBadge,
            ];
        });
    }, [cockpit?.topPareto, currencyMode]);

    return (
        <div style={{ padding: '24px', background: 'var(--bg-primary, #0f1117)', minHeight: '100vh', boxSizing: 'border-box' }}>
            {/* Page Header */}
            <PageHeader
                title="Cockpit Financiero: Valuación y Rotación de Stock"
                subtitle="Monitoreo del capital inmovilizado, semáforo de antigüedad (Aging) y rotación de activos corrientes"
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Currency Mode Switch */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color, #2a2d3e)' }}>
                        <button
                            onClick={() => setCurrencyMode('USD')}
                            style={{
                                padding: '6px 12px',
                                background: currencyMode === 'USD' ? '#10b981' : 'transparent',
                                color: currencyMode === 'USD' ? '#fff' : 'var(--text-muted, #9ca3af)',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                            }}
                        >
                            💵 USD
                        </button>
                        <button
                            onClick={() => setCurrencyMode('ARS')}
                            style={{
                                padding: '6px 12px',
                                background: currencyMode === 'ARS' ? '#6366f1' : 'transparent',
                                color: currencyMode === 'ARS' ? '#fff' : 'var(--text-muted, #9ca3af)',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                            }}
                        >
                            🇦🇷 $ ARS
                        </button>
                    </div>

                    {/* Exchange Rate Input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary, #1a1d2e)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #2a2d3e)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', fontWeight: 600 }}>TC USD:</span>
                        <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>$</span>
                        <input
                            type="number"
                            value={tipoCambio}
                            onChange={(e) => setTipoCambio(Math.max(1, Number(e.target.value)))}
                            style={{
                                width: '75px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary, #f3f4f6)',
                                fontWeight: 700,
                                fontSize: '13px',
                                outline: 'none',
                            }}
                        />
                    </div>

                    <Btn variant="secondary" onClick={() => refetch()} title="Recalcular métricas">
                        🔄 Recalcular
                    </Btn>
                </div>
            </PageHeader>

            {/* Filters Bar */}
            <Card style={{ padding: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                    <div style={{ flex: '1 1 220px' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                            Filtrar por Depósito / Planta
                        </label>
                        <select
                            value={selectedDepot}
                            onChange={(e) => setSelectedDepot(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'var(--bg-primary, #0f1117)',
                                border: '1px solid var(--border-color, #2a2d3e)',
                                color: 'var(--text-primary, #f3f4f6)',
                                borderRadius: '8px',
                                padding: '9px',
                                fontSize: '13px',
                            }}
                        >
                            <option value="">🏢 Todos los depósitos</option>
                            {depots.map((d: any) => (
                                <option key={d.id} value={d.id}>
                                    {d.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ flex: '1 1 220px' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                            Filtrar por Categoría de Material
                        </label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'var(--bg-primary, #0f1117)',
                                border: '1px solid var(--border-color, #2a2d3e)',
                                color: 'var(--text-primary, #f3f4f6)',
                                borderRadius: '8px',
                                padding: '9px',
                                fontSize: '13px',
                            }}
                        >
                            <option value="">🏷️ Todas las categorías</option>
                            {cockpit?.categories?.map((c) => (
                                <option key={c.categoryId || c.categoria} value={c.categoryId || ''}>
                                    {c.categoria} ({c.totalItems} mats.)
                                </option>
                            ))}
                        </select>
                    </div>

                    {(selectedDepot || selectedCategory) && (
                        <div style={{ paddingTop: '20px' }}>
                            <button
                                onClick={() => { setSelectedDepot(''); setSelectedCategory(''); }}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--border-color, #2a2d3e)',
                                    color: 'var(--text-muted, #9ca3af)',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                }}
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Main KPI Cards */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                gap: '16px', 
                marginBottom: '24px' 
            }}>
                {/* Total Inventory Value */}
                <Card style={{ padding: '20px', borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                        Valuación Total de Inventario
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary, #f3f4f6)' }}>
                        {formatMoney(summary?.totalValuationUsd ?? 0, summary?.totalValuationArs ?? 0)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '8px' }}>
                        <span>Físico: <strong>{(summary?.totalKilos ?? 0).toLocaleString()} kg/u</strong></span>
                        <span>{summary?.totalItemsCount ?? 0} artículos</span>
                    </div>
                </Card>

                {/* Capital Circulante (< 3 meses) */}
                <Card style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
                    <div style={{ color: '#10b981', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                        🟢 Capital Circulante (&lt; 3 meses)
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>
                        {formatMoney(aging?.circulante?.usd ?? 0, aging?.circulante?.ars ?? 0)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '8px' }}>
                        <span>{aging?.circulante?.pctOfValuation ?? 0}% del capital</span>
                        <span>{(aging?.circulante?.kilos ?? 0).toLocaleString()} kg/u</span>
                    </div>
                </Card>

                {/* Alerta Amarilla (3 a 6 meses) */}
                <Card style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                        🟡 Alerta Amarilla (3 a 6 meses)
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>
                        {formatMoney(aging?.alertaAmarilla?.usd ?? 0, aging?.alertaAmarilla?.ars ?? 0)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '8px' }}>
                        <span>{aging?.alertaAmarilla?.pctOfValuation ?? 0}% del capital</span>
                        <span>Inmovilización temprana</span>
                    </div>
                </Card>

                {/* Estancado Crítico (> 6 meses) */}
                <Card style={{ padding: '20px', borderLeft: '4px solid #ef4444' }}>
                    <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                        🔴 Estancado Crítico (&gt; 6 meses)
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444' }}>
                        {formatMoney(aging?.estancadoCritico?.usd ?? 0, aging?.estancadoCritico?.ars ?? 0)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '8px' }}>
                        <span style={{ color: '#f87171', fontWeight: 700 }}>{aging?.estancadoCritico?.pctOfValuation ?? 0}% en riesgo</span>
                        <span>Ocupa espacio ocioso</span>
                    </div>
                </Card>
            </div>

            {/* Aging Semaphore Visual Bar */}
            <Card style={{ padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary, #f3f4f6)' }}>
                            Semáforo de Antigüedad del Capital Inmovilizado (Aging de Stock)
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                            Distribución del dinero congelado según la fecha real de ingreso de las partidas en depósito
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                        Cobertura de precios: <strong style={{ color: (summary?.coberturaCosteoPct ?? 0) >= 80 ? '#10b981' : '#f59e0b' }}>{summary?.coberturaCosteoPct ?? 0}%</strong> de artículos valorizados
                    </div>
                </div>

                {/* Tricolor visual progress bar */}
                <div style={{ 
                    height: '24px', 
                    borderRadius: '8px', 
                    background: 'rgba(255,255,255,0.05)', 
                    display: 'flex', 
                    overflow: 'hidden',
                    marginBottom: '16px' 
                }}>
                    <div 
                        style={{ 
                            width: `${Math.max(0, aging?.circulante?.pctOfValuation ?? 0)}%`, 
                            background: '#10b981', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#fff',
                            transition: 'width 0.3s ease'
                        }}
                        title={`Circulante: ${aging?.circulante?.pctOfValuation}%`}
                    >
                        {(aging?.circulante?.pctOfValuation ?? 0) > 8 ? `${aging?.circulante?.pctOfValuation}%` : ''}
                    </div>
                    <div 
                        style={{ 
                            width: `${Math.max(0, aging?.alertaAmarilla?.pctOfValuation ?? 0)}%`, 
                            background: '#f59e0b', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#fff',
                            transition: 'width 0.3s ease'
                        }}
                        title={`Alerta Amarilla: ${aging?.alertaAmarilla?.pctOfValuation}%`}
                    >
                        {(aging?.alertaAmarilla?.pctOfValuation ?? 0) > 8 ? `${aging?.alertaAmarilla?.pctOfValuation}%` : ''}
                    </div>
                    <div 
                        style={{ 
                            width: `${Math.max(0, aging?.estancadoCritico?.pctOfValuation ?? 0)}%`, 
                            background: '#ef4444', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#fff',
                            transition: 'width 0.3s ease'
                        }}
                        title={`Estancado Crítico: ${aging?.estancadoCritico?.pctOfValuation}%`}
                    >
                        {(aging?.estancadoCritico?.pctOfValuation ?? 0) > 8 ? `${aging?.estancadoCritico?.pctOfValuation}%` : ''}
                    </div>
                </div>

                {/* Aging 3 Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                    <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, fontSize: '13px' }}>
                            <span>🟢</span>
                            <span>Menos de 3 meses (0 - 90 días)</span>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary, #f3f4f6)', marginTop: '8px' }}>
                            {formatMoney(aging?.circulante?.usd ?? 0, aging?.circulante?.ars ?? 0)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '4px' }}>
                            {aging?.circulante?.kilos.toLocaleString()} kg/u • {aging?.circulante?.itemsCount} materiales
                        </div>
                        <div style={{ fontSize: '11px', color: '#34d399', marginTop: '6px' }}>
                            Stock operativo en rotación regular
                        </div>
                    </div>

                    <div style={{ padding: '14px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 700, fontSize: '13px' }}>
                            <span>🟡</span>
                            <span>De 3 a 6 meses (91 - 180 días)</span>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary, #f3f4f6)', marginTop: '8px' }}>
                            {formatMoney(aging?.alertaAmarilla?.usd ?? 0, aging?.alertaAmarilla?.ars ?? 0)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '4px' }}>
                            {aging?.alertaAmarilla?.kilos.toLocaleString()} kg/u • {aging?.alertaAmarilla?.itemsCount} materiales
                        </div>
                        <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '6px' }}>
                            Alerta: sin consumo en el último trimestre
                        </div>
                    </div>

                    <div style={{ padding: '14px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 700, fontSize: '13px' }}>
                            <span>🔴</span>
                            <span>Más de 6 meses (+180 días)</span>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary, #f3f4f6)', marginTop: '8px' }}>
                            {formatMoney(aging?.estancadoCritico?.usd ?? 0, aging?.estancadoCritico?.ars ?? 0)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '4px' }}>
                            {aging?.estancadoCritico?.kilos.toLocaleString()} kg/u • {aging?.estancadoCritico?.itemsCount} materiales
                        </div>
                        <div style={{ fontSize: '11px', color: '#f87171', marginTop: '6px' }}>
                            Estancado: ocupa espacio físico y genera costo financiero
                        </div>
                    </div>
                </div>
            </Card>

            {/* Two Column Section: Category Distribution & Rotation / Depot */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                {/* Valuación por Categoría */}
                <Card style={{ padding: '20px' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary, #f3f4f6)', marginBottom: '4px' }}>
                        Valuación por Categoría de Material
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginBottom: '16px' }}>
                        Concentración del capital de trabajo en cada familia de insumos
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                        {cockpit?.categories?.map((cat) => (
                            <div 
                                key={cat.categoryId || cat.categoria}
                                style={{ 
                                    padding: '10px 12px', 
                                    background: 'var(--bg-hover-row, rgba(255,255,255,0.03))', 
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color, rgba(255,255,255,0.05))' 
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                                    <div>
                                        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary, #f3f4f6)' }}>{cat.categoria}</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-subtle, #9ca3af)', marginLeft: '8px' }}>
                                            {cat.costedItems}/{cat.totalItems} mats valorizados
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontWeight: 800, color: '#10b981', fontSize: '14px' }}>
                                            {formatMoney(cat.valuationUsd, cat.valuationArs)}
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#818cf8', marginLeft: '6px' }}>
                                            ({cat.pctOfTotalValuation}%)
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>
                                    <span>Stock: <strong>{cat.kilos.toLocaleString()} kg/u</strong></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Stock Rotativo vs Inmovilizado y Depósitos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Rotación */}
                    <Card style={{ padding: '20px' }}>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary, #f3f4f6)', marginBottom: '4px' }}>
                            Capital según Clasificación de Rotación
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginBottom: '16px' }}>
                            Rotación teórica asignada al catálogo de artículos
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                            {cockpit?.rotacion?.map((r) => {
                                const color = r.rotacion === 'ALTA' ? '#10b981' : r.rotacion === 'MEDIA' ? '#3b82f6' : r.rotacion === 'BAJA' ? '#ef4444' : '#8b5cf6';
                                return (
                                    <div 
                                        key={r.rotacion} 
                                        style={{ 
                                            padding: '12px', 
                                            background: 'var(--bg-hover-row, rgba(255,255,255,0.03))', 
                                            borderRadius: '8px', 
                                            borderLeft: `4px solid ${color}` 
                                        }}
                                    >
                                        <div style={{ fontSize: '11px', fontWeight: 700, color, textTransform: 'uppercase' }}>
                                            Rotación {r.rotacion}
                                        </div>
                                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary, #f3f4f6)', marginTop: '4px' }}>
                                            {formatMoney(r.usd, r.ars)}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                            {r.pctOfValuation}% • {r.kilos.toLocaleString()} kg/u
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Depósitos */}
                    <Card style={{ padding: '20px' }}>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary, #f3f4f6)', marginBottom: '4px' }}>
                            Capital Inmovilizado por Depósito / Ubicación
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                            {cockpit?.depots?.map((d) => (
                                <div key={d.depositoId || d.deposito} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <div>
                                        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary, #f3f4f6)' }}>🏛️ {d.deposito}</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-subtle, #9ca3af)', marginLeft: '8px' }}>({d.kilos.toLocaleString()} kg/u)</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontWeight: 700, color: '#10b981' }}>{formatMoney(d.valuationUsd, d.valuationArs)}</span>
                                        <span style={{ fontSize: '11px', color: '#818cf8', marginLeft: '6px' }}>({d.pctOfTotalValuation}%)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Ranking Pareto Top 15 Capital Inmovilizado */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                    <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary, #f3f4f6)' }}>
                        Top 15: Materiales con Mayor Capital Inmovilizado (Ley de Pareto 80/20)
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                        Los artículos que concentran la mayor cantidad de dinero en piso y su estado de envejecimiento
                    </div>
                </div>

                <Table
                    loading={isLoading}
                    cols={paretoCols}
                    rows={paretoRows}
                    onRowClick={(index) => {
                        if (cockpit?.topPareto?.[index]) {
                            setSelectedItem(cockpit.topPareto[index]);
                        }
                    }}
                />

                {!isLoading && (cockpit?.topPareto?.length ?? 0) === 0 && (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-subtle, #6b7280)' }}>
                        No hay materiales en stock para los filtros seleccionados.
                    </div>
                )}
            </Card>

            {/* Modal Detalle Material */}
            {selectedItem && (
                <Modal title={`Detalle Financiero: ${selectedItem.descripcion}`} onClose={() => setSelectedItem(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                            <div style={{ fontSize: '12px', color: '#818cf8', fontFamily: 'monospace', fontWeight: 700 }}>
                                {selectedItem.codigoInterno}
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #f3f4f6)', marginTop: '2px' }}>
                                {selectedItem.descripcion}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '4px' }}>
                                Categoría: {selectedItem.categoria} • Rotación: {selectedItem.rotacion}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>Valor Total en Dólares</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                                    U$S {selectedItem.valuationUsd.toLocaleString()}
                                </div>
                            </div>
                            <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase' }}>Valor en Pesos (TC {tipoCambio})</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#818cf8', marginTop: '4px' }}>
                                    $ {selectedItem.valuationArs.toLocaleString()}
                                </div>
                            </div>
                            <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', fontWeight: 700, textTransform: 'uppercase' }}>Stock Físico en Depósito</div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #f3f4f6)', marginTop: '4px' }}>
                                    {selectedItem.stockQty.toLocaleString()} {selectedItem.unidad}
                                </div>
                            </div>
                            <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', fontWeight: 700, textTransform: 'uppercase' }}>Costo Unitario de Referencia</div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                                    U$S {selectedItem.costoUnitarioUsd.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '12px', background: selectedItem.statusAging === 'ESTANCADO_CRITICO' ? 'rgba(239, 68, 68, 0.1)' : selectedItem.statusAging === 'ALERTA_AMARILLA' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: selectedItem.statusAging === 'ESTANCADO_CRITICO' ? '#ef4444' : selectedItem.statusAging === 'ALERTA_AMARILLA' ? '#f59e0b' : '#10b981' }}>
                                Antigüedad del lote más viejo: {selectedItem.maxDaysInStock} días
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '4px' }}>
                                {selectedItem.statusAging === 'ESTANCADO_CRITICO'
                                    ? '🚨 Este material supera los 180 días en depósito. Representa capital inmovilizado con alto costo de oportunidad. Se sugiere coordinar con Producción o Comercial para darle salida prioritaria.'
                                    : selectedItem.statusAging === 'ALERTA_AMARILLA'
                                    ? '⚠️ El lote tiene entre 90 y 180 días. En estado de alerta por inmovilización.'
                                    : '🟢 El lote tiene menos de 90 días de ingreso. Rotación saludable.'}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Btn variant="secondary" onClick={() => setSelectedItem(null)}>
                            Cerrar
                        </Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}
