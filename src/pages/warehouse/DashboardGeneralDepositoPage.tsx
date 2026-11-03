import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Btn, Spinner, useIsMobile } from '../../shared/ui';
import {
    useGetCapacityDashboardQuery,
    useGetCapacityTimelineQuery,
    useGetVolumesDashboardQuery,
} from '../../features/warehouse/capacity/api/capacity.api';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { useGetAlertsQuery } from '../../features/warehouse/stock/api/stock.api';
import { useGetMovimientosQuery } from '../../features/warehouse/movimientos/api/movimientos.api';
import {
    ResponsiveContainer,
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ReferenceLine,
} from 'recharts';

export default function DashboardGeneralDepositoPage() {
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    // Fecha de hoy local en formato YYYY-MM-DD
    const todayStr = useMemo(() => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    }, []);

    // 1. Capacidad por depósito
    const { data: capacityData = [], isLoading: loadingCapacity, refetch: refetchCapacity } = useGetCapacityDashboardQuery();

    // 2. Timeline de capacidad (30 días y proyección)
    const { data: timelineData = [] } = useGetCapacityTimelineQuery();

    // 3. Volúmenes y materiales en stock
    const { data: volumesData = [], isLoading: loadingVolumes } = useGetVolumesDashboardQuery();

    // 4. Depósitos y posiciones físicas
    const { data: depotsData = [] } = useGetDepotsQuery();

    // 5. Alertas de stock crítico
    const { data: alertsData = [] } = useGetAlertsQuery();

    // 6. Movimientos de hoy
    const { data: movimientosHoy = [] } = useGetMovimientosQuery({ desde: todayStr });

    const [selectedDepotFilter, setSelectedDepotFilter] = useState<string>('ALL');

    // Cómputo global de capacidad (m³ ocupados vs totales)
    const capacitySummary = useMemo(() => {
        let totalM3 = 0;
        let occupiedM3 = 0;

        capacityData.forEach((dep: any) => {
            dep.categories?.forEach((cat: any) => {
                totalM3 += Number(cat.totalCapacity) || 0;
                occupiedM3 += Number(cat.occupiedVolume) || 0;
            });
        });

        const percentage = totalM3 > 0 ? (occupiedM3 / totalM3) * 100 : 0;
        return {
            totalM3: Math.round(totalM3 * 100) / 100,
            occupiedM3: Math.round(occupiedM3 * 100) / 100,
            freeM3: Math.round(Math.max(0, totalM3 - occupiedM3) * 100) / 100,
            percentage: Math.round(percentage * 10) / 10,
        };
    }, [capacityData]);

    // Cómputo global de kilos y bultos
    const stockSummary = useMemo(() => {
        let totalKilos = 0;
        let totalBoxes = 0;
        let itemsCount = volumesData.length;
        let overstockCount = 0;

        volumesData.forEach((it: any) => {
            totalKilos += Number(it.currentKilos) || 0;
            totalBoxes += Number(it.currentBoxes) || 0;
            if (it.isOverStock) overstockCount++;
        });

        return {
            totalKilos: Math.round(totalKilos),
            totalBoxes: Math.round(totalBoxes),
            itemsCount,
            overstockCount,
        };
    }, [volumesData]);

    // Cómputo de posiciones físicas (Slots)
    const positionsSummary = useMemo(() => {
        let totalPositions = 0;
        const activeDepots = depotsData.filter((d: any) => d.activo !== false);

        activeDepots.forEach((d: any) => {
            if (d.positions) {
                totalPositions += d.positions.filter((p: any) => p.activo !== false).length;
            }
        });

        return {
            totalDepots: activeDepots.length,
            totalPositions,
        };
    }, [depotsData]);

    // Resumen de movimientos de hoy
    const movementsTodaySummary = useMemo(() => {
        let entradasKg = 0;
        let salidasKg = 0;
        let entradasCount = 0;
        let salidasCount = 0;
        let transferenciasCount = 0;

        movimientosHoy.forEach((m: any) => {
            const deltaK = Math.abs(Number(m.deltaKilos) || 0);
            if (m.tipo === 'REMITO_ENTRADA') {
                entradasKg += deltaK;
                entradasCount++;
            } else if (m.tipo === 'REMITO_SALIDA') {
                salidasKg += deltaK;
                salidasCount++;
            } else if (m.tipo === 'MOVE_ENTRADA' || m.tipo === 'MOVE_SALIDA') {
                transferenciasCount++;
            }
        });

        return {
            entradasKg: Math.round(entradasKg),
            salidasKg: Math.round(salidasKg),
            entradasCount,
            salidasCount,
            transferenciasCount: Math.round(transferenciasCount / 2),
            totalMovs: movimientosHoy.length,
        };
    }, [movimientosHoy]);

    // Datos del gráfico de evolución
    const chartData = useMemo(() => {
        return timelineData.map((d: any) => ({
            date: d.date,
            historical: d.type === 'historical' || d.type === 'today' ? d.volume : null,
            projected: d.type === 'projected' || d.type === 'today' ? d.volume : null,
            type: d.type,
            volume: d.volume,
        }));
    }, [timelineData]);

    // Filtrar depósitos para vista de cards
    const displayedDepots = useMemo(() => {
        if (selectedDepotFilter === 'ALL') return capacityData;
        return capacityData.filter((d: any) => d.depotId === selectedDepotFilter);
    }, [capacityData, selectedDepotFilter]);

    const isLoading = loadingCapacity || loadingVolumes;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={{ padding: isMobile ? '12px' : '20px', maxWidth: '1600px', margin: '0 auto' }}>
            {/* CSS para impresión ejecutiva */}
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    .printable-content, .printable-content * { visibility: visible !important; }
                    .printable-content {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                    }
                    .no-print { display: none !important; }
                    table { border-collapse: collapse !important; width: 100% !important; font-size: 11px !important; }
                    th, td { border: 1px solid #ddd !important; padding: 6px !important; color: #000 !important; }
                }
            `}</style>

            {/* ENCABEZADO Y ACCIONES PRINCIPALES (Regla de 1 clic para accesos rápidos) */}
            <div
                className="no-print"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '14px',
                    marginBottom: '20px',
                }}
            >
                <PageHeader
                    title="📊 Dashboard General de Depósitos & Logística"
                    subtitle="Control de capacidad de almacenamiento, slots físicos, flujo diario de mercadería y alertas operativas"
                />

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Btn
                        onClick={() => navigate('/deposito/centro-comando')}
                        style={{
                            background: '#f59e0b',
                            color: '#111827',
                            fontSize: '13px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <span>🎯</span> Centro de Comando
                    </Btn>

                    <Btn
                        onClick={() => navigate('/deposito/picking')}
                        style={{
                            background: '#38bdf8',
                            color: '#0f172a',
                            fontSize: '13px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <span>🧶</span> Picking de Hoy
                    </Btn>

                    <Btn
                        variant="secondary"
                        onClick={() => navigate('/remitos-entrada')}
                        style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span>📥</span> Entrada Mercadería
                    </Btn>

                    <Btn
                        variant="secondary"
                        onClick={() => navigate('/remitos-salida')}
                        style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span>📤</span> Salida Mercadería
                    </Btn>

                    <Btn
                        variant="secondary"
                        onClick={handlePrint}
                        style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span>🖨️</span> Imprimir
                    </Btn>

                    <Btn
                        variant="secondary"
                        onClick={() => {
                            refetchCapacity();
                        }}
                        style={{ fontSize: '13px' }}
                        title="Refrescar datos"
                    >
                        🔄
                    </Btn>
                </div>
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#9ca3af' }}>
                    <Spinner /> <span style={{ marginLeft: '12px' }}>Cargando métricas logísticas...</span>
                </div>
            ) : (
                <div className="printable-content">
                    {/* 5 MACRO KPIS LOGÍSTICOS (Respiración 16-20px, gaps 14-16px, Paleta Design System) */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                            gap: '14px',
                            marginBottom: '20px',
                        }}
                    >
                        {/* KPI 1: Ocupación Global de Capacidad */}
                        <Card
                            onClick={() => navigate('/deposito/capacidad')}
                            style={{
                                padding: '16px 18px',
                                background: 'var(--bg-secondary, #1a1d2e)',
                                border: '1px solid var(--border-color, #2a2d3e)',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: capacitySummary.percentage > 90 ? '#ef4444' : capacitySummary.percentage > 75 ? '#f59e0b' : '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                                    📦 Ocupación Global Depósitos
                                </span>
                                <span style={{ fontSize: '11px', color: '#6366f1' }}>Ver Racks ↗️</span>
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: capacitySummary.percentage > 90 ? '#ef4444' : capacitySummary.percentage > 75 ? '#f59e0b' : '#10b981', marginTop: '6px' }}>
                                {capacitySummary.percentage}%
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                <strong>{capacitySummary.occupiedM3.toLocaleString('es-AR')} m³</strong> ocupados de {capacitySummary.totalM3.toLocaleString('es-AR')} m³
                            </div>
                            {/* Barra de progreso visual */}
                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                                <div
                                    style={{
                                        height: '100%',
                                        width: `${Math.min(100, capacitySummary.percentage)}%`,
                                        background: capacitySummary.percentage > 90 ? '#ef4444' : capacitySummary.percentage > 75 ? '#f59e0b' : '#10b981',
                                        borderRadius: '3px',
                                    }}
                                />
                            </div>
                        </Card>

                        {/* KPI 2: Kilos Totales en Stock */}
                        <Card
                            onClick={() => navigate('/stock')}
                            style={{
                                padding: '16px 18px',
                                background: 'var(--bg-secondary, #1a1d2e)',
                                border: '1px solid var(--border-color, #2a2d3e)',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
                                    ⚖️ Stock Total Almacenado
                                </span>
                                <span style={{ fontSize: '11px', color: '#38bdf8' }}>Ver Stock ↗️</span>
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: '#f3f4f6', marginTop: '6px' }}>
                                {stockSummary.totalKilos.toLocaleString('es-AR')} kg
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                ~{stockSummary.totalBoxes.toLocaleString('es-AR')} cajas en {stockSummary.itemsCount} materiales
                            </div>
                            {stockSummary.overstockCount > 0 && (
                                <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px', fontWeight: 600 }}>
                                    ⚠️ {stockSummary.overstockCount} ítems en sobrestock
                                </div>
                            )}
                        </Card>

                        {/* KPI 3: Flujo de Movimientos del Día */}
                        <Card
                            onClick={() => navigate('/movimientos')}
                            style={{
                                padding: '16px 18px',
                                background: 'var(--bg-secondary, #1a1d2e)',
                                border: '1px solid var(--border-color, #2a2d3e)',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 700, textTransform: 'uppercase' }}>
                                    🚚 Actividad Logística Hoy
                                </span>
                                <span style={{ fontSize: '11px', color: '#8b5cf6' }}>Historial ↗️</span>
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: '#f3f4f6', marginTop: '6px' }}>
                                {movementsTodaySummary.totalMovs} movs.
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', display: 'flex', gap: '8px' }}>
                                <span style={{ color: '#10b981' }}>+{movementsTodaySummary.entradasKg.toLocaleString('es-AR')} kg (In)</span>
                                <span>|</span>
                                <span style={{ color: '#ef4444' }}>-{movementsTodaySummary.salidasKg.toLocaleString('es-AR')} kg (Out)</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#a78bfa', marginTop: '4px' }}>
                                {movementsTodaySummary.transferenciasCount} transferencias internas
                            </div>
                        </Card>

                        {/* KPI 4: Infraestructura y Posiciones */}
                        <Card
                            onClick={() => navigate('/deposito')}
                            style={{
                                padding: '16px 18px',
                                background: 'var(--bg-secondary, #1a1d2e)',
                                border: '1px solid var(--border-color, #2a2d3e)',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase' }}>
                                    🏢 Infraestructura & Slots
                                </span>
                                <span style={{ fontSize: '11px', color: '#6366f1' }}>Gestionar ↗️</span>
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: '#f3f4f6', marginTop: '6px' }}>
                                {positionsSummary.totalPositions} slots
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                Distribuidos en {positionsSummary.totalDepots} naves de depósito
                            </div>
                            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>
                                Capacidad libre: {capacitySummary.freeM3.toLocaleString('es-AR')} m³
                            </div>
                        </Card>

                        {/* KPI 5: Alertas de Stock Crítico */}
                        <Card
                            onClick={() => navigate('/stock?tab=alertas')}
                            style={{
                                padding: '16px 18px',
                                background: alertsData.length > 0 ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary, #1a1d2e)',
                                border: alertsData.length > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color, #2a2d3e)',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: alertsData.length > 0 ? '#ef4444' : '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                                    ⚠️ Alertas de Almacén
                                </span>
                                <span style={{ fontSize: '11px', color: '#ef4444' }}>Ver Alertas ↗️</span>
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: alertsData.length > 0 ? '#ef4444' : '#10b981', marginTop: '6px' }}>
                                {alertsData.length} alertas
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                {alertsData.length > 0 ? 'Materiales bajo stock de seguridad / quiebre' : 'Stock de seguridad óptimo'}
                            </div>
                        </Card>
                    </div>

                    {/* SECCIÓN 1: ESTADO Y CAPACIDAD POR DEPÓSITO */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#f3f4f6' }}>
                                    🏢 Estado de Capacidad por Depósito
                                </h3>
                                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                    Ocupación volumétrica (m³) por nave y categorías de almacenamiento
                                </div>
                            </div>

                            {/* Selector filtro de depósito */}
                            <select
                                value={selectedDepotFilter}
                                onChange={(e) => setSelectedDepotFilter(e.target.value)}
                                style={{
                                    padding: '6px 12px',
                                    background: 'var(--bg-secondary, #1a1d2e)',
                                    border: '1px solid var(--border-color, #2a2d3e)',
                                    borderRadius: '8px',
                                    color: '#f3f4f6',
                                    fontSize: '13px',
                                    outline: 'none',
                                }}
                            >
                                <option value="ALL">Todas las naves ({capacityData.length})</option>
                                {capacityData.map((d: any) => (
                                    <option key={d.depotId} value={d.depotId}>
                                        {d.depotNombre} {d.planta ? `(${d.planta})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Grid de depósitos */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                                gap: '14px',
                            }}
                        >
                            {displayedDepots.map((depot: any) => {
                                // Sumar volumen del depósito
                                let depTotal = 0;
                                let depOccupied = 0;
                                depot.categories?.forEach((c: any) => {
                                    depTotal += Number(c.totalCapacity) || 0;
                                    depOccupied += Number(c.occupiedVolume) || 0;
                                });
                                const depPct = depTotal > 0 ? (depOccupied / depTotal) * 100 : 0;
                                const statusColor = depPct > 90 ? '#ef4444' : depPct > 75 ? '#f59e0b' : '#10b981';

                                return (
                                    <Card
                                        key={depot.depotId}
                                        style={{
                                            padding: '18px',
                                            background: 'var(--bg-secondary, #1a1d2e)',
                                            border: `1px solid ${depPct > 90 ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color, #2a2d3e)'}`,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                <div>
                                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#f3f4f6' }}>
                                                        {depot.depotNombre}
                                                    </h4>
                                                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                                        {depot.planta || 'Planta Principal'}
                                                    </span>
                                                </div>
                                                <span
                                                    style={{
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        background: `${statusColor}22`,
                                                        color: statusColor,
                                                        fontSize: '12px',
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    {depPct.toFixed(1)}% Ocupado
                                                </span>
                                            </div>

                                            {/* Barra de progreso */}
                                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', margin: '10px 0 14px 0' }}>
                                                <div
                                                    style={{
                                                        height: '100%',
                                                        width: `${Math.min(100, depPct)}%`,
                                                        background: statusColor,
                                                        borderRadius: '4px',
                                                        transition: 'width 0.5s ease',
                                                    }}
                                                />
                                            </div>

                                            {/* Desglose por categoría de posición */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                                                {depot.categories?.map((cat: any) => {
                                                    const catPct = cat.percentage || 0;
                                                    const catColor = catPct > 90 ? '#ef4444' : catPct > 75 ? '#f59e0b' : '#38bdf8';
                                                    return (
                                                        <div key={cat.name} style={{ fontSize: '12px', background: 'rgba(0,0,0,0.15)', padding: '6px 10px', borderRadius: '6px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                                <span style={{ color: '#d1d5db', textTransform: 'capitalize', fontWeight: 600 }}>{cat.name}</span>
                                                                <span style={{ color: catColor, fontWeight: 700 }}>{catPct.toFixed(1)}%</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
                                                                <span>{cat.occupiedVolume.toFixed(2)} m³ ocupados</span>
                                                                <span>de {cat.totalCapacity.toFixed(2)} m³</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Botón de acceso directo en 1 clic */}
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                            <button
                                                onClick={() => navigate(`/deposito/centro-comando?depot=${depot.depotId}`)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #f59e0b',
                                                    background: 'rgba(245, 158, 11, 0.12)',
                                                    color: '#f59e0b',
                                                    fontWeight: 700,
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                🎯 Abrir en Centro de Comando
                                            </button>
                                            <button
                                                onClick={() => navigate(`/stock?depot=${depot.depotId}`)}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-color, #2a2d3e)',
                                                    background: 'transparent',
                                                    color: '#9ca3af',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Stock
                                            </button>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECCIÓN 2: GRÁFICO DE EVOLUCIÓN HISTÓRICA & PROYECCIÓN + ÚLTIMOS MOVIMIENTOS */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr',
                            gap: '16px',
                            marginBottom: '24px',
                        }}
                    >
                        {/* Evolución y Proyección de Capacidad (30 días) */}
                        <Card style={{ padding: '20px', background: 'var(--bg-secondary, #1a1d2e)', border: '1px solid var(--border-color, #2a2d3e)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#f3f4f6' }}>
                                        📈 Evolución y Proyección de Capacidad (30 Días)
                                    </h4>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                        Volumen histórico vs tendencia proyectada basada en ritmo de consumo
                                    </div>
                                </div>
                                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>🟢 Histórico | 🔵 Proyectado</span>
                            </div>

                            <div style={{ height: '300px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #2a2d3e)" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#6b7280"
                                            tick={{ fill: '#6b7280', fontSize: 11 }}
                                            tickFormatter={(val) => {
                                                const d = new Date(val);
                                                return `${d.getDate()}/${d.getMonth() + 1}`;
                                            }}
                                        />
                                        <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} />
                                        <RechartsTooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', padding: '10px 14px', borderRadius: '8px' }}>
                                                            <div style={{ color: '#9ca3af', fontSize: '12px' }}>{d.date}</div>
                                                            <div style={{ color: d.type === 'projected' ? '#38bdf8' : '#10b981', fontWeight: 800, fontSize: '14px', marginTop: '4px' }}>
                                                                {Number(d.volume || 0).toFixed(2)} m³
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                                                {d.type === 'today' ? 'Hoy (Actual)' : d.type === 'historical' ? 'Histórico' : 'Proyectado'}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <ReferenceLine y={1558.48} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Cap. Máx (1558 m³)', fill: '#ef4444', fontSize: 10 }} />
                                        <Line
                                            type="monotone"
                                            dataKey="historical"
                                            stroke="#10b981"
                                            strokeWidth={2.5}
                                            dot={false}
                                            connectNulls={false}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="projected"
                                            stroke="#38bdf8"
                                            strokeWidth={2.5}
                                            strokeDasharray="4 4"
                                            dot={false}
                                            connectNulls={false}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        {/* Flujo de Movimientos Recientes de Hoy */}
                        <Card style={{ padding: '20px', background: 'var(--bg-secondary, #1a1d2e)', border: '1px solid var(--border-color, #2a2d3e)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#f3f4f6' }}>
                                        🔄 Movimientos Recientes de Hoy
                                    </h4>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                        Últimas transacciones registradas
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/movimientos')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#6366f1',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                    }}
                                >
                                    Ver todos ↗️
                                </button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {movimientosHoy.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '30px 10px', color: '#9ca3af', fontSize: '13px' }}>
                                        Aún no se han registrado movimientos hoy.
                                    </div>
                                ) : (
                                    movimientosHoy.slice(0, 8).map((m: any) => {
                                        const isEntrada = m.tipo === 'REMITO_ENTRADA';
                                        const isSalida = m.tipo === 'REMITO_SALIDA';
                                        const badgeColor = isEntrada ? '#10b981' : isSalida ? '#ef4444' : '#8b5cf6';
                                        const delta = Number(m.deltaKilos) || 0;

                                        return (
                                            <div
                                                key={m.id}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '8px 12px',
                                                    background: 'rgba(0,0,0,0.2)',
                                                    borderRadius: '8px',
                                                    borderLeft: `3px solid ${badgeColor}`,
                                                    fontSize: '12px',
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 700, color: '#f3f4f6' }}>
                                                        {m.item?.descripcion || m.item?.codigoInterno || 'Material'}
                                                    </div>
                                                    <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '2px' }}>
                                                        {m.tipo} • Lote {m.batch?.lotNumber || '-'} • Pos. {m.posicion?.codigo || '-'}
                                                    </div>
                                                </div>

                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ fontWeight: 800, color: badgeColor, fontSize: '13px' }}>
                                                        {delta > 0 ? `+${delta}` : delta} kg
                                                    </span>
                                                    {m.deltaUnidades && (
                                                        <div style={{ color: '#6b7280', fontSize: '11px' }}>
                                                            {m.deltaUnidades} u.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* SECCIÓN 3: ACCIONES RÁPIDAS & INFORMES COMPLEMENTARIOS */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '14px',
                        }}
                    >
                        <Card
                            onClick={() => navigate('/deposito/capacidad')}
                            style={{
                                padding: '16px 20px',
                                background: 'rgba(99, 102, 241, 0.08)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                            }}
                        >
                            <div style={{ fontSize: '28px' }}>📦</div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#f3f4f6' }}>
                                    Medidores Detallados de Capacidad
                                </h4>
                                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                    Gauges por categoría y análisis de volumen por material
                                </div>
                            </div>
                        </Card>

                        <Card
                            onClick={() => navigate('/deposito/materiales-estancados')}
                            style={{
                                padding: '16px 20px',
                                background: 'rgba(56, 189, 248, 0.08)',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                            }}
                        >
                            <div style={{ fontSize: '28px' }}>🧊</div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#f3f4f6' }}>
                                    Materiales Estancados
                                </h4>
                                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                    Identificar stock inmovilizado sin rotación
                                </div>
                            </div>
                        </Card>

                        <Card
                            onClick={() => navigate('/reporte-consumo-detallado')}
                            style={{
                                padding: '16px 20px',
                                background: 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                            }}
                        >
                            <div style={{ fontSize: '28px' }}>📊</div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#f3f4f6' }}>
                                    Consumo de Materiales
                                </h4>
                                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                    Reporte detallado de salidas y consumo por fecha
                                </div>
                            </div>
                        </Card>

                        <Card
                            onClick={() => navigate('/deposito/completitud-materiales')}
                            style={{
                                padding: '16px 20px',
                                background: 'rgba(245, 158, 11, 0.08)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                            }}
                        >
                            <div style={{ fontSize: '28px' }}>✅</div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#f3f4f6' }}>
                                    Completitud de Materiales
                                </h4>
                                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                    Auditoría de datos maestros (cajas, metros cúbicos, pesos)
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
