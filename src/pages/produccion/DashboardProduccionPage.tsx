import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Btn, Badge, Spinner, useIsMobile } from '../../shared/ui';
import { useGetUltimaPlanillaProduccionQuery } from '../../features/quality/ordenes-produccion/api/ordenesProduccion.api';
import {
    useGetMachinesQuery,
    useGetMachineChangeReportQuery,
} from '../../entities/maintenance/api/maintenance.api';

export default function DashboardProduccionPage() {
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    // 1. Datos de Planilla de Producción Diaria
    const { data: activePlanilla, isLoading: loadingPlanilla } = useGetUltimaPlanillaProduccionQuery();

    // 2. Datos del Parque de Máquinas en Vivo
    const { data: allMachines = [], isLoading: loadingMachines } = useGetMachinesQuery({});

    // 3. Tiempos Históricos de Cambios cargados por Marina
    const { data: marinaReport } = useGetMachineChangeReportQuery({});

    // Cálculos del Parque de Máquinas
    const parkMetrics = useMemo(() => {
        const total = allMachines.length || 190;
        const activas = allMachines.filter((m: any) => m.status === 'ACTIVA').length;
        const noActivas = allMachines.filter((m: any) => m.status !== 'ACTIVA');
        const disponibilidadPct = total > 0 ? Math.round((activas / total) * 1000) / 10 : 0;

        // Conteo por estado
        const paradas = noActivas.filter((m: any) => m.status === 'PARADA').length;
        const revisar = noActivas.filter((m: any) => m.status === 'REVISAR').length;
        const muestras = noActivas.filter((m: any) => m.status === 'MUESTRAS').length;
        const repuestos = noActivas.filter((m: any) => m.status === 'REPUESTOS').length;
        const otros = noActivas.length - (paradas + revisar + muestras + repuestos);

        return {
            total,
            activas,
            noActivasCount: noActivas.length,
            noActivas,
            noActivasList: noActivas,
            disponibilidadPct,
            paradas,
            revisar,
            muestras,
            repuestos,
            otros,
        };
    }, [allMachines]);

    // Métricas del Plan Diario y Picking
    const planMetrics = useMemo(() => {
        if (!activePlanilla) {
            return {
                totalDocenas: 0,
                totalPares: 0,
                totalMedias: 0,
                totalCambios: 0,
                cambiosConHilado: 0,
                kilosConsumo: 0,
                kilosABajar: 0,
                coberturaPickingPct: 100,
                articulosCount: 0,
                articulosSinEstructura: 0,
                areasDistribution: [] as { area: string; docenas: number; maquinas: number }[],
            };
        }

        const totalDocenas = activePlanilla.resumenAlertas?.totalDocenasEstimadas || 0;
        const totalPares = activePlanilla.resumenAlertas?.totalParesEstimados || 0;
        const totalMedias = activePlanilla.resumenAlertas?.totalMediasEstimadas || 0;
        const totalCambios = activePlanilla.resumenAlertas?.totalCambiosProgramados08AM || 0;
        const kilosConsumo = activePlanilla.resumenAlertas?.totalKilosHiladoDia || 0;

        // Picking
        let cubiertos = 0;
        let totalItems = 0;
        let kilosABajar = 0;
        (activePlanilla.hojaPicking || []).forEach((it: any) => {
            totalItems++;
            if ((it.aPasarAPickingKg || 0) > 0) {
                kilosABajar += Number(it.aPasarAPickingKg) || 0;
            } else {
                cubiertos++;
            }
        });
        const coberturaPickingPct = totalItems > 0 ? Math.round((cubiertos / totalItems) * 100) : 100;

        // Distribución por Área (1 a 5)
        const areaMap: Record<string, { docenas: number; maquinas: Set<number> }> = {
            '1': { docenas: 0, maquinas: new Set() },
            '2': { docenas: 0, maquinas: new Set() },
            '3': { docenas: 0, maquinas: new Set() },
            '4': { docenas: 0, maquinas: new Set() },
            '5': { docenas: 0, maquinas: new Set() },
        };

        (activePlanilla.maquinas || []).forEach((m: any) => {
            const a = String(m.area || '').trim();
            if (areaMap[a]) {
                areaMap[a].docenas += Number(m.docenasEstimadas) || 0;
                areaMap[a].maquinas.add(m.machine);
            }
        });

        const areasDistribution = Object.entries(areaMap).map(([area, data]) => ({
            area: `Área ${area}`,
            docenas: Math.round(data.docenas),
            maquinas: data.maquinas.size,
        }));

        // Artículos y estructuras
        const articulosCount = activePlanilla.articulos?.length || 0;
        const articulosSinEstructura = activePlanilla.articulos?.filter((a: any) =>
            a.estadoRevision === 'INCOMPLETO' || a.estadoRevision === 'NO_ENCONTRADO' || a.isUnreviewed
        ).length || 0;

        return {
            totalDocenas,
            totalPares,
            totalMedias,
            totalCambios,
            kilosConsumo: Math.round(kilosConsumo),
            kilosABajar: Math.round(kilosABajar * 10) / 10,
            coberturaPickingPct,
            articulosCount,
            articulosSinEstructura,
            areasDistribution,
        };
    }, [activePlanilla]);

    // Métricas de Tiempos de Cambio (Marina)
    const changeTimeMetrics = useMemo(() => {
        const total = planMetrics.totalCambios;
        const medianTotalMin = marinaReport?.totalMedianDurationMs
            ? Math.round(marinaReport.totalMedianDurationMs / 60000)
            : 40;
        const horasTotales = Math.round(((total * medianTotalMin) / 60) * 10) / 10;
        const tasaCambioParque = parkMetrics.total > 0 ? Math.round((total / parkMetrics.total) * 100) : 0;

        return {
            total,
            medianTotalMin,
            horasTotales,
            tasaCambioParque,
        };
    }, [planMetrics.totalCambios, marinaReport, parkMetrics.total]);

    if (loadingPlanilla && loadingMachines) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: '#9ca3af' }}>
                <Spinner /> <span style={{ marginLeft: '12px' }}>Cargando Cockpit Ejecutivo de Producción...</span>
            </div>
        );
    }

    return (
        <div style={{
            padding: isMobile ? '12px' : '18px 24px',
            maxWidth: '1700px',
            margin: '0 auto',
            minHeight: isMobile ? 'auto' : 'calc(100vh - 70px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '16px',
        }}>
            {/* 1. BARRA SUPERIOR: PANORÁMICA & ACCESOS RÁPIDAS A 1 CLIC */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h1 style={{ margin: 0, fontSize: isMobile ? '18px' : '22px', fontWeight: 900, color: '#f3f4f6', letterSpacing: '-0.5px' }}>
                            📊 Cockpit Ejecutivo de Producción
                        </h1>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                            Turno en Marcha
                        </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                        Visión panorámica del sector: salud operativa del parque, metas de tejeduría, abastecimiento y cambios programados
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Btn
                        onClick={() => navigate('/produccion/planificacion')}
                        style={{
                            background: '#6366f1',
                            color: '#ffffff',
                            fontSize: '12px',
                            padding: '8px 14px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <span>📥</span> Carga de Producción del Día
                    </Btn>

                    <Btn
                        variant="secondary"
                        onClick={() => navigate('/produccion/programacion-gantt')}
                        style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span>📅</span> Gantt Máquinas
                    </Btn>

                    <Btn
                        variant="secondary"
                        onClick={() => navigate('/produccion/cambios')}
                        style={{ fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span>📝</span> Registrar Cambio
                    </Btn>
                </div>
            </div>

            {/* 2. FRANJA DE 5 KPIS ESTRATÉGICOS DEL SECTOR (TODO A LA VISTA) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)',
                gap: '12px',
            }}>
                {/* KPI 1: Disponibilidad Operativa */}
                <Card style={{ padding: '14px 16px', background: 'var(--bg-secondary, #1a1d2e)', border: '1px solid var(--border-color, #2a2d3e)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>
                            🏭 OEE Parque Tejeduría
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: parkMetrics.disponibilidadPct >= 90 ? '#10b981' : '#f59e0b' }}>
                            {parkMetrics.disponibilidadPct}%
                        </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#f3f4f6', marginTop: '4px' }}>
                        {parkMetrics.activas} <span style={{ fontSize: '13px', fontWeight: 600, color: '#9ca3af' }}>/ {parkMetrics.total} máq.</span>
                    </div>
                    <div style={{ marginTop: '6px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${parkMetrics.disponibilidadPct}%`, height: '100%', background: parkMetrics.disponibilidadPct >= 90 ? '#10b981' : '#f59e0b' }} />
                    </div>
                </Card>

                {/* KPI 2: Máquinas No Activas */}
                <Card
                    onClick={() => navigate('/produccion/planificacion')}
                    style={{
                        padding: '14px 16px',
                        background: parkMetrics.noActivasCount > 0 ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary, #1a1d2e)',
                        border: parkMetrics.noActivasCount > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color, #2a2d3e)',
                        cursor: 'pointer',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: parkMetrics.noActivasCount > 0 ? '#ef4444' : '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>
                            ⚠️ Máquinas No Activas
                        </span>
                        <span style={{ fontSize: '10px', color: '#9ca3af' }}>Ver ↗️</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: parkMetrics.noActivasCount > 0 ? '#ef4444' : '#10b981', marginTop: '4px' }}>
                        {parkMetrics.noActivasCount} <span style={{ fontSize: '13px', fontWeight: 600, color: '#9ca3af' }}>paradas / fuera</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        {parkMetrics.paradas} roturas • {parkMetrics.revisar} revisión • {parkMetrics.muestras} muestras
                    </div>
                </Card>

                {/* KPI 3: Volumen Programado Día */}
                <Card style={{ padding: '14px 16px', background: 'var(--bg-secondary, #1a1d2e)', border: '1px solid var(--border-color, #2a2d3e)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase' }}>
                            🧦 Meta Neta del Día
                        </span>
                        <Badge color="#38bdf8">Plan 24h</Badge>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#f3f4f6', marginTop: '4px' }}>
                        {planMetrics.totalDocenas.toLocaleString('es-AR')} <span style={{ fontSize: '13px', fontWeight: 600, color: '#9ca3af' }}>doc.</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        {planMetrics.totalPares.toLocaleString('es-AR')} pares • ~{Math.round(planMetrics.totalPares / 24)} pares/h
                    </div>
                </Card>

                {/* KPI 4: Abastecimiento Picking */}
                <Card
                    onClick={() => navigate('/produccion/planificacion')}
                    style={{
                        padding: '14px 16px',
                        background: planMetrics.coberturaPickingPct < 100 ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-secondary, #1a1d2e)',
                        border: planMetrics.coberturaPickingPct < 100 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-color, #2a2d3e)',
                        cursor: 'pointer',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase' }}>
                            🧶 Cobertura Picking
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: planMetrics.kilosABajar > 0 ? '#f59e0b' : '#10b981' }}>
                            {planMetrics.coberturaPickingPct}%
                        </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#f3f4f6', marginTop: '4px' }}>
                        {planMetrics.kilosABajar > 0 ? `${planMetrics.kilosABajar} kg` : 'Cubierto'}
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', marginLeft: '6px' }}>
                            {planMetrics.kilosABajar > 0 ? 'a bajar' : 'en planta'}
                        </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        Consumo total día: {planMetrics.kilosConsumo} kg de hilados
                    </div>
                </Card>

                {/* KPI 5: Intensidad de Cambios 08:00 */}
                <Card
                    onClick={() => navigate('/produccion/historial-cambios')}
                    style={{ padding: '14px 16px', background: 'var(--bg-secondary, #1a1d2e)', border: '1px solid var(--border-color, #2a2d3e)', cursor: 'pointer' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 800, textTransform: 'uppercase' }}>
                            🔄 Cambios Programados
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#a78bfa' }}>
                            {changeTimeMetrics.tasaCambioParque}% parque
                        </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#f3f4f6', marginTop: '4px' }}>
                        {changeTimeMetrics.total} <span style={{ fontSize: '13px', fontWeight: 600, color: '#9ca3af' }}>máquinas</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        {changeTimeMetrics.horasTotales}h estimadas ({changeTimeMetrics.medianTotalMin}m prom. Marina)
                    </div>
                </Card>
            </div>

            {/* 3. VISTA DEL BOSQUE: 3 PANELES VISUALES INTEGRADOS (SIN SCROLL FORZADO) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr 0.9fr',
                gap: '14px',
                flex: 1,
            }}>
                {/* PANEL 1: ESTADO DEL PARQUE DE MÁQUINAS (ENFERMERÍA & SALUD) */}
                <Card style={{ padding: '16px 18px', background: 'var(--bg-secondary, #1a1d2e)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#f3f4f6' }}>
                                🏭 Salud del Parque ({parkMetrics.total} Máquinas)
                            </h3>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                Distribución de estados en vivo y máquinas detenidas
                            </div>
                        </div>
                        <Btn variant="secondary" onClick={() => navigate('/produccion/cambios')} style={{ fontSize: '11px', padding: '4px 8px' }}>
                            + Estado
                        </Btn>
                    </div>

                    {/* Barra Apilada Visual */}
                    <div style={{ height: '14px', width: '100%', display: 'flex', borderRadius: '7px', overflow: 'hidden', marginBottom: '14px' }}>
                        <div style={{ width: `${parkMetrics.disponibilidadPct}%`, background: '#10b981' }} title={`Activas: ${parkMetrics.activas}`} />
                        <div style={{ width: `${parkMetrics.total > 0 ? (parkMetrics.paradas / parkMetrics.total) * 100 : 0}%`, background: '#ef4444' }} title={`Paradas: ${parkMetrics.paradas}`} />
                        <div style={{ width: `${parkMetrics.total > 0 ? (parkMetrics.revisar / parkMetrics.total) * 100 : 0}%`, background: '#f59e0b' }} title={`En revisión: ${parkMetrics.revisar}`} />
                        <div style={{ width: `${parkMetrics.total > 0 ? (parkMetrics.muestras / parkMetrics.total) * 100 : 0}%`, background: '#3b82f6' }} title={`Muestras: ${parkMetrics.muestras}`} />
                        <div style={{ width: `${parkMetrics.total > 0 ? (parkMetrics.repuestos / parkMetrics.total) * 100 : 0}%`, background: '#8b5cf6' }} title={`Sin repuestos: ${parkMetrics.repuestos}`} />
                    </div>

                    {/* Leyenda de la Barra */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '11px', color: '#9ca3af', marginBottom: '12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }} /> Activas ({parkMetrics.activas})</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ef4444' }} /> Paradas ({parkMetrics.paradas})</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b' }} /> Revisar ({parkMetrics.revisar})</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#3b82f6' }} /> Muestras ({parkMetrics.muestras})</span>
                    </div>

                    {/* Lista Rápida de Máquinas No Activas */}
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {parkMetrics.noActivasList.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#10b981', fontSize: '12px' }}>
                                🎉 ¡Excelente! Todo el parque de tejeduría está operando en estado ACTIVA.
                            </div>
                        ) : (
                            parkMetrics.noActivasList.map((m: any) => (
                                <div
                                    key={m.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '6px 10px',
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        borderLeft: m.status === 'PARADA' ? '3px solid #ef4444' : '3px solid #f59e0b',
                                    }}
                                >
                                    <div>
                                        <strong style={{ color: '#f3f4f6' }}>M{m.number}</strong>
                                        <span style={{ color: '#9ca3af', marginLeft: '6px', fontSize: '11px' }}>{m.plant?.name || 'Tejeduría'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '10px', color: '#9ca3af' }}>{m.lastChangeBy ? `Por: ${m.lastChangeBy}` : ''}</span>
                                        <Badge color={m.status === 'PARADA' ? '#ef4444' : '#f59e0b'}>{m.status}</Badge>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* PANEL 2: BALANCE DE CARGA POR ÁREAS (1 A 5) */}
                <Card style={{ padding: '16px 18px', background: 'var(--bg-secondary, #1a1d2e)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#f3f4f6' }}>
                                ⚖️ Distribución de Carga por Áreas
                            </h3>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                Balance de docenas asignadas y densidad de máquinas
                            </div>
                        </div>
                        <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 700 }}>
                            {planMetrics.totalDocenas} doc. total
                        </span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '8px' }}>
                        {planMetrics.areasDistribution.map((item, idx) => {
                            const pctDoc = planMetrics.totalDocenas > 0
                                ? Math.round((item.docenas / planMetrics.totalDocenas) * 100)
                                : 0;

                            return (
                                <div key={idx} style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '4px' }}>
                                        <div>
                                            <strong style={{ color: '#f3f4f6' }}>{item.area}</strong>
                                            <span style={{ color: '#9ca3af', fontSize: '11px', marginLeft: '6px' }}>
                                                ({item.maquinas} máquinas)
                                            </span>
                                        </div>
                                        <div>
                                            <strong style={{ color: '#38bdf8' }}>{item.docenas.toLocaleString('es-AR')} doc.</strong>
                                            <span style={{ color: '#9ca3af', fontSize: '11px', marginLeft: '6px' }}>({pctDoc}%)</span>
                                        </div>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ width: `${pctDoc}%`, height: '100%', background: '#38bdf8', borderRadius: '3px' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* PANEL 3: RADAR DE ALERTAS & ACCIONES OPERATIVAS */}
                <Card style={{ padding: '16px 18px', background: 'var(--bg-secondary, #1a1d2e)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#f3f4f6' }}>
                                🚨 Radar Operativo de Producción
                            </h3>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                Puntos que requieren atención de supervisión hoy
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'space-around' }}>
                        {/* Alerta 1: Bajar Hilados a Picking */}
                        <div
                            onClick={() => navigate('/produccion/planificacion')}
                            style={{
                                padding: '10px 12px',
                                background: planMetrics.kilosABajar > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                                border: planMetrics.kilosABajar > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.2)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: planMetrics.kilosABajar > 0 ? '#f59e0b' : '#10b981' }}>
                                    🧶 Picking Tejeduría
                                </span>
                                <span style={{ fontSize: '10px', color: '#9ca3af' }}>Ir a Vale ↗️</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#d1d5db', marginTop: '3px' }}>
                                {planMetrics.kilosABajar > 0
                                    ? `Hay ${planMetrics.kilosABajar} kg de hilados que Depósito debe transferir al piso de planta.`
                                    : 'Todo el hilado necesario ya está cubierto en la zona de picking.'}
                            </div>
                        </div>

                        {/* Alerta 2: Parada de Máquinas por Cambios */}
                        <div
                            onClick={() => navigate('/produccion/historial-cambios')}
                            style={{
                                padding: '10px 12px',
                                background: 'rgba(167, 139, 250, 0.1)',
                                border: '1px solid rgba(167, 139, 250, 0.3)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa' }}>
                                    ⏱️ Paradas por Cambio 08:00 AM
                                </span>
                                <span style={{ fontSize: '10px', color: '#9ca3af' }}>Historial ↗️</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#d1d5db', marginTop: '3px' }}>
                                {changeTimeMetrics.total} máquinas con cambio hoy (~{changeTimeMetrics.horasTotales}h acumuladas según tiempos Marina).
                            </div>
                        </div>

                        {/* Alerta 3: Artículos del Catálogo BOM */}
                        <div
                            onClick={() => navigate('/desarrollo/articulos')}
                            style={{
                                padding: '10px 12px',
                                background: planMetrics.articulosSinEstructura > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                                border: planMetrics.articulosSinEstructura > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.2)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: planMetrics.articulosSinEstructura > 0 ? '#ef4444' : '#10b981' }}>
                                    🧪 Catálogo BOM
                                </span>
                                <span style={{ fontSize: '10px', color: '#9ca3af' }}>Catálogo ↗️</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#d1d5db', marginTop: '3px' }}>
                                {planMetrics.articulosSinEstructura > 0
                                    ? `⚠️ ${planMetrics.articulosSinEstructura} artículo(s) sin estructura BOM completa.`
                                    : `🟢 Los ${planMetrics.articulosCount} artículos tienen ficha técnica validada.`}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
