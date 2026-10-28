import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Btn, Badge, Spinner, useIsMobile } from '../../shared/ui';
import {
    useGetUltimaPlanillaProduccionQuery,
    useListarPlanillasProduccionQuery,
    useLazyGetPlanillaProduccionByIdQuery,
} from '../../features/quality/ordenes-produccion/api/ordenesProduccion.api';
import {
    useGetPlantsQuery,
    useGetMachineTypesQuery,
    useGetAvailabilityTimelineQuery,
} from '../../entities/maintenance/api/maintenance.api';
import type { ProduccionParseResult } from '../../features/quality/ordenes-produccion/types/ordenesProduccion.types';

export default function DashboardProduccionPage() {
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    // 1. Datos de Planilla de Producción (Susana)
    const { data: ultimaPlanilla, isLoading: loadingPlanilla } = useGetUltimaPlanillaProduccionQuery();
    const { data: historialPlanillas = [] } = useListarPlanillasProduccionQuery();
    const [fetchPlanillaById] = useLazyGetPlanillaProduccionByIdQuery();
    const [selectedPlanilla, setSelectedPlanilla] = useState<ProduccionParseResult | null>(null);

    const activePlanilla = selectedPlanilla || ultimaPlanilla;

    const handleSelectPlanillaHistorica = async (id: string) => {
        if (!id) {
            setSelectedPlanilla(null);
            return;
        }
        try {
            const data = await fetchPlanillaById(id).unwrap();
            if (data) setSelectedPlanilla(data);
        } catch {
            alert('Error al cargar la planilla seleccionada');
        }
    };

    // 2. Datos de Mantenimiento y Paradas de Máquinas
    const { data: plants } = useGetPlantsQuery();
    const { data: types } = useGetMachineTypesQuery();
    const plantId = plants?.[0]?.id || '';
    const typeId = types?.find((t: any) => t.name.toLowerCase().includes('tejedur'))?.id || types?.[0]?.id || '';

    const { data: availabilityData, isLoading: loadingAvailability } = useGetAvailabilityTimelineQuery(
        { plantId, typeId, period: '24h' },
        { skip: !plantId }
    );

    // Filtros de navegación rápida
    const [filtroSeccion, setFiltroSeccion] = useState<'TODOS' | 'CORTES' | 'PARADAS' | 'CAMBIOS'>('TODOS');
    const [filtroTipoMaterial, setFiltroTipoMaterial] = useState<'TODOS' | 'HILADO' | 'INSUMO'>('TODOS');
    const [searchMaterial, setSearchMaterial] = useState('');
    const [filtroTipoCambio, setFiltroTipoCambio] = useState<string>('TODOS');

    // =========================================================================
    // SECCIÓN 1: Faltante y Corte de Materiales (Hilados e Insumos)
    // =========================================================================
    const alertasMateriales = useMemo(() => {
        if (!activePlanilla || !activePlanilla.materiales) return [];

        return activePlanilla.materiales.map((m) => {
            const cat = (m.categoriaNombre || '').toUpperCase();
            const rol = (m.rol || '').toUpperCase();
            const desc = (m.descripcion || '').toUpperCase();
            const isHilado =
                rol === 'HILADO' ||
                cat.includes('HILADO') ||
                cat.includes('ALGODON') ||
                cat.includes('GOMA') ||
                cat.includes('LYCRA') ||
                cat.includes('POLIAMIDA') ||
                desc.includes('HILADO') ||
                m.unidadPrincipal === 'KG';

            const tipoClasif: 'HILADO' | 'INSUMO' = isHilado ? 'HILADO' : 'INSUMO';

            const consumoTotal = Number(m.consumoTotalKg) || 0;
            const consumoManana = Number(m.consumoMananaKg) || 0;
            const stockPicking = Number(m.stockEnPickingKg) || 0;
            const stockReserva = Number(m.stockEnReservaKg) || 0;
            const stockTotal = Number(m.stockActualTotalKg) || (stockPicking + stockReserva);
            const stockMinimo = Number(m.stockMinimoKg) || 0;

            // Ritmo de consumo (24 horas)
            const tasaHora = consumoTotal > 0 ? consumoTotal / 24 : 0;
            const horasAutonomiaPicking = tasaHora > 0 ? stockPicking / tasaHora : 999;
            const horasAutonomiaTotal = tasaHora > 0 ? stockTotal / tasaHora : 999;

            // Diagnóstico de Corte
            let nivelAlerta: 'CRITICO' | 'REPONER' | 'MINIMO' | 'OK' = 'OK';
            let mensajeCorte = 'Producción del día cubierta con stock disponible';
            let horaProyectadaCorte: string | null = null;
            let hayOtroMaterialEnReserva = false;
            let faltanteNeto = 0;

            if (stockTotal < consumoTotal) {
                // CORTE TOTAL DE PRODUCCIÓN
                nivelAlerta = 'CRITICO';
                faltanteNeto = Math.round((consumoTotal - stockTotal) * 100) / 100;
                hayOtroMaterialEnReserva = false;

                const horasEnteras = Math.floor(horasAutonomiaTotal);
                const minutos = Math.round((horasAutonomiaTotal % 1) * 60);
                const horaReloj = (6 + horasEnteras) % 24;
                const horaStr = `${String(horaReloj).padStart(2, '0')}:${String(minutos).padStart(2, '0')} hs`;

                horaProyectadaCorte = horasAutonomiaTotal < 12
                    ? `Turno Mañana (~${horaStr}, a las ${horasEnteras}h ${minutos}m de inicio)`
                    : `Turno Noche (~${horaStr}, a las ${horasEnteras}h ${minutos}m de inicio)`;

                mensajeCorte = `🛑 Se agota el stock antes de terminar la producción. Faltan ${faltanteNeto} ${m.unidadPrincipal || 'kg'}.`;
            } else if (stockPicking < consumoTotal && stockReserva > 0) {
                // SE TERMINA EN PICKING, PERO HAY EN RESERVA (CAMBIO DE LOTE O PROVEEDOR)
                nivelAlerta = 'REPONER';
                hayOtroMaterialEnReserva = true;

                const horasEnteras = Math.floor(horasAutonomiaPicking);
                const minutos = Math.round((horasAutonomiaPicking % 1) * 60);
                const horaReloj = (6 + horasEnteras) % 24;
                const horaStr = `${String(horaReloj).padStart(2, '0')}:${String(minutos).padStart(2, '0')} hs`;

                horaProyectadaCorte = `Picking se agota ~${horaStr} (${horasEnteras}h ${minutos}m)`;
                mensajeCorte = `⚠️ Picking insuficiente para todo el día. Hay ${stockReserva} ${m.unidadPrincipal || 'kg'} en Reserva para pasar o cambiar de lote/proveedor.`;
            } else if (stockTotal - consumoTotal < stockMinimo && stockMinimo > 0) {
                // ALERTA STOCK MÍNIMO
                nivelAlerta = 'MINIMO';
                hayOtroMaterialEnReserva = stockReserva > 0;
                mensajeCorte = `🟡 Alcanza para la producción de hoy, pero el remanente (${Math.round((stockTotal - consumoTotal) * 10) / 10} kg) quedará debajo del stock mínimo (${stockMinimo} kg).`;
            }

            return {
                ...m,
                tipoClasif,
                consumoTotal,
                consumoManana,
                stockPicking,
                stockReserva,
                stockTotal,
                stockMinimo,
                tasaHora: Math.round(tasaHora * 100) / 100,
                horasAutonomiaPicking: Math.round(horasAutonomiaPicking * 10) / 10,
                horasAutonomiaTotal: Math.round(horasAutonomiaTotal * 10) / 10,
                nivelAlerta,
                mensajeCorte,
                horaProyectadaCorte,
                hayOtroMaterialEnReserva,
                faltanteNeto,
            };
        });
    }, [activePlanilla]);

    const materialesFiltrados = useMemo(() => {
        return alertasMateriales.filter((m) => {
            if (filtroTipoMaterial !== 'TODOS' && m.tipoClasif !== filtroTipoMaterial) return false;
            if (filtroSeccion === 'CORTES' && m.nivelAlerta !== 'CRITICO' && m.nivelAlerta !== 'REPONER') return false;

            if (searchMaterial.trim()) {
                const term = searchMaterial.toLowerCase();
                const matchDesc = m.descripcion.toLowerCase().includes(term);
                const matchCod = m.codigoInterno.toLowerCase().includes(term);
                const matchProv = (m.proveedor || '').toLowerCase().includes(term);
                const matchCol = (m.colorNombre || '').toLowerCase().includes(term);
                if (!matchDesc && !matchCod && !matchProv && !matchCol) return false;
            }

            return true;
        }).sort((a, b) => {
            const peso: Record<string, number> = { CRITICO: 1, REPONER: 2, MINIMO: 3, OK: 4 };
            return (peso[a.nivelAlerta] || 5) - (peso[b.nivelAlerta] || 5);
        });
    }, [alertasMateriales, filtroTipoMaterial, filtroSeccion, searchMaterial]);

    // =========================================================================
    // SECCIÓN 2: Máquinas Paradas por Mucho Tiempo
    // =========================================================================
    const maquinasParadas = useMemo(() => {
        if (!availabilityData?.machines) {
            // Si aún no cargó mantenimiento, inferir desde las máquinas de la planilla con horas reducidas o paradas
            if (!activePlanilla || !activePlanilla.maquinas) return [];
            return activePlanilla.maquinas
                .filter((m) => (m.netHours && m.netHours < 10) || m.machineStatus === 'PARADA' || m.machineStatus === 'REVISAR')
                .map((m) => ({
                    number: m.machine,
                    nombre: `Máquina ${m.machine}`,
                    status: m.machineStatus || 'REVISAR',
                    tipo: m.machineTypeName || 'Tejeduría',
                    area: m.area,
                    tiempoParadaHoras: Math.round((12 - (m.netHours || 0)) * 10) / 10,
                    tiempoParadaMs: (12 - (m.netHours || 0)) * 3600000,
                    disponibilidadPct: Math.round(((m.netHours || 0) / 12) * 100),
                    motivo: m.hasChangeover ? `Cambio programado: ${m.changeoverType || '08:00 AM'}` : 'Parada prolongada / velocidad reducida',
                    articulo: m.articleCode || m.articleRaw,
                    talle: m.talle,
                }))
                .sort((a, b) => b.tiempoParadaHoras - a.tiempoParadaHoras);
        }

        // Cruzar con los datos precisos de disponibilidad de mantenimiento
        const list = availabilityData.machines
            .filter((m: any) => {
                const downtimeMs = (m.stats?.downtimeNovedadesMs || 0) + (m.stats?.downtimeChangesMs || 0) + (m.stats?.reducedMs || 0);
                const isParada = m.status === 'PARADA' || m.status === 'REVISAR' || m.status === 'VELOCIDAD_REDUCIDA';
                return isParada || downtimeMs > 3600000; // más de 1 hora parada
            })
            .map((m: any) => {
                const downtimeMs = (m.stats?.downtimeNovedadesMs || 0) + (m.stats?.downtimeChangesMs || 0) + (m.stats?.reducedMs || 0);
                const totalHorasParada = Math.round((downtimeMs / 3600000) * 10) / 10;
                const horasParadaFormateada = `${Math.floor(downtimeMs / 3600000)}h ${Math.round((downtimeMs % 3600000) / 60000)}m`;

                // Buscar qué artículo le tocaba tejer según la planilla de producción
                const planMatch = activePlanilla?.maquinas?.find((pm) => pm.machine === m.number);

                return {
                    number: m.number,
                    nombre: m.nombre || `Máquina ${m.number}`,
                    status: m.status,
                    tipo: m.tipo?.name || 'Tejeduría',
                    tiempoParadaMs: downtimeMs,
                    tiempoParadaHoras: totalHorasParada,
                    horasParadaFormateada,
                    disponibilidadPct: Math.round(Number(m.availabilityPct || 0)),
                    motivo: m.stats?.lastNovedadMotivo || (m.stats?.downtimeChangesMs > 0 ? 'Parada por cambio de artículo' : 'Sin motivo registrado'),
                    articulo: planMatch?.articleCode || planMatch?.articleRaw || 'No asignado',
                    talle: planMatch?.talle || '',
                    area: planMatch?.area || 'Planta',
                };
            })
            .sort((a: any, b: any) => b.tiempoParadaMs - a.tiempoParadaMs);

        return list;
    }, [availabilityData, activePlanilla]);

    // =========================================================================
    // SECCIÓN 3: Tipos de Cambios en Ejecución por Máquina
    // =========================================================================
    const cambiosEnEjecucion = useMemo(() => {
        if (!activePlanilla || !activePlanilla.maquinas) return [];

        const conCambio = activePlanilla.maquinas.filter((m) => m.hasChangeover);

        return conCambio.filter((m) => {
            if (filtroTipoCambio !== 'TODOS' && m.changeoverType !== filtroTipoCambio) return false;
            return true;
        });
    }, [activePlanilla, filtroTipoCambio]);

    const tiposDeCambioUnicos = useMemo(() => {
        if (!activePlanilla || !activePlanilla.maquinas) return [];
        const set = new Set<string>();
        activePlanilla.maquinas.forEach((m) => {
            if (m.changeoverType) set.add(m.changeoverType);
        });
        return Array.from(set);
    }, [activePlanilla]);

    // Conteo de KPIs Ejecutivos
    const kpiCriticosCorte = useMemo(() => alertasMateriales.filter((m) => m.nivelAlerta === 'CRITICO').length, [alertasMateriales]);
    const kpiReponerPicking = useMemo(() => alertasMateriales.filter((m) => m.nivelAlerta === 'REPONER').length, [alertasMateriales]);
    const kpiMaquinasParadas = useMemo(() => maquinasParadas.length, [maquinasParadas]);
    const kpiTotalCambios = useMemo(() => cambiosEnEjecucion.length, [cambiosEnEjecucion]);

    return (
        <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '1680px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '22px' }}>
                <PageHeader
                    title="⚡ Dashboard de Producción — Alertas, Cortes y Máquinas"
                    subtitle="Centro de control integral: cuándo se terminan los materiales y si hay sustituto en depósito, qué máquinas están paradas por mucho tiempo y qué cambios se ejecutan."
                >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {historialPlanillas.length > 0 && (
                            <select
                                value={activePlanilla?.planillaId || ''}
                                onChange={(e) => handleSelectPlanillaHistorica(e.target.value)}
                                style={{
                                    padding: '7px 12px',
                                    background: 'var(--bg-secondary, #1a1d2e)',
                                    border: '1px solid var(--border-color, #2a2d3e)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary, #f3f4f6)',
                                    fontSize: '12px',
                                }}
                            >
                                <option value="">📅 Planilla de Producción Activa</option>
                                {historialPlanillas.map((p: any) => (
                                    <option key={p.id} value={p.id}>
                                        Fecha: {p.fecha} ({new Date(p.creado_en).toLocaleDateString('es-AR')})
                                    </option>
                                ))}
                            </select>
                        )}

                        <Btn
                            variant="secondary"
                            onClick={() => navigate('/produccion/planificacion')}
                            style={{ fontSize: '12px' }}
                        >
                            📑 Cargar Nueva Planilla PDF
                        </Btn>

                        <Btn
                            variant="secondary"
                            onClick={() => navigate('/produccion/informe-tejeduria')}
                            style={{ fontSize: '12px' }}
                        >
                            ⚙️ Plan de Tejeduría Detallado ↗️
                        </Btn>
                    </div>
                </PageHeader>
            </div>

            {loadingPlanilla && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh', gap: '12px', color: '#9ca3af' }}>
                    <Spinner /> <span>Cargando datos del dashboard de producción...</span>
                </div>
            )}

            {!activePlanilla && !loadingPlanilla && (
                <Card style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-secondary, #1a1d2e)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>📑</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6', marginBottom: '8px' }}>
                        No hay ninguna planilla de producción activa cargada
                    </div>
                    <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '20px' }}>
                        Subí las hojas de producción de Susana (PDF) para calcular automáticamente el consumo de hilados, horas de corte y cambios por máquina.
                    </div>
                    <Btn onClick={() => navigate('/produccion/planificacion')}>
                        Ir a Cargar Planilla PDF
                    </Btn>
                </Card>
            )}

            {activePlanilla && (
                <div>
                    {/* Tarjetas de Resumen Ejecutivo y Alertas Clave */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: '14px',
                            marginBottom: '24px',
                        }}
                    >
                        {/* KPI 1: Cortes Críticos */}
                        <Card
                            onClick={() => setFiltroSeccion(filtroSeccion === 'CORTES' ? 'TODOS' : 'CORTES')}
                            style={{
                                padding: '16px 20px',
                                background: kpiCriticosCorte > 0 ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-secondary, #1a1d2e)',
                                border: kpiCriticosCorte > 0 ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--border-color, #2a2d3e)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: kpiCriticosCorte > 0 ? '#f87171' : '#9ca3af', textTransform: 'uppercase' }}>
                                    🛑 Cortes de Producción
                                </span>
                                <Badge color={kpiCriticosCorte > 0 ? '#ef4444' : '#10b981'}>
                                    {kpiCriticosCorte > 0 ? 'Faltante Crítico' : 'Cubierto'}
                                </Badge>
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 900, color: kpiCriticosCorte > 0 ? '#ef4444' : '#10b981', marginTop: '6px' }}>
                                {kpiCriticosCorte} materiales
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                {kpiCriticosCorte > 0 ? 'No alcanzan para terminar el turno' : 'Stock suficiente para todo el día'}
                            </div>
                        </Card>

                        {/* KPI 2: Reposición / Cambio de Lote */}
                        <Card
                            onClick={() => setFiltroSeccion('CORTES')}
                            style={{
                                padding: '16px 20px',
                                background: kpiReponerPicking > 0 ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-secondary, #1a1d2e)',
                                border: kpiReponerPicking > 0 ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid var(--border-color, #2a2d3e)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>
                                    ⚠️ Reposición / Cambio Lote
                                </span>
                                <Badge color="#f59e0b">En Reserva</Badge>
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 900, color: '#f59e0b', marginTop: '6px' }}>
                                {kpiReponerPicking} materiales
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                Se termina el picking pero hay stock en depósito para no cortar
                            </div>
                        </Card>

                        {/* KPI 3: Máquinas Paradas */}
                        <Card
                            onClick={() => setFiltroSeccion(filtroSeccion === 'PARADAS' ? 'TODOS' : 'PARADAS')}
                            style={{
                                padding: '16px 20px',
                                background: kpiMaquinasParadas > 0 ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary, #1a1d2e)',
                                border: kpiMaquinasParadas > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color, #2a2d3e)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase' }}>
                                    ⏸️ Máquinas Paradas / Inactivas
                                </span>
                                <Badge color={kpiMaquinasParadas > 0 ? '#ef4444' : '#10b981'}>
                                    {kpiMaquinasParadas > 0 ? 'Atención' : 'Normal'}
                                </Badge>
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 900, color: '#f87171', marginTop: '6px' }}>
                                {kpiMaquinasParadas} máquinas
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                Con paradas prolongadas o velocidad reducida en el turno
                            </div>
                        </Card>

                        {/* KPI 4: Cambios en Ejecución */}
                        <Card
                            onClick={() => setFiltroSeccion(filtroSeccion === 'CAMBIOS' ? 'TODOS' : 'CAMBIOS')}
                            style={{
                                padding: '16px 20px',
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.4)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase' }}>
                                    🔄 Cambios en Ejecución
                                </span>
                                <Badge color="#8b5cf6">08:00 AM y Turnos</Badge>
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 900, color: '#a78bfa', marginTop: '6px' }}>
                                {kpiTotalCambios} máquinas
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                Cambios de artículo, talle y color programados
                            </div>
                        </Card>
                    </div>

                    {/* Barra de Filtros de Sección */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                        <Btn
                            variant={filtroSeccion === 'TODOS' ? 'primary' : 'secondary'}
                            onClick={() => setFiltroSeccion('TODOS')}
                            style={{ fontSize: '13px' }}
                        >
                            📊 Ver Todo el Dashboard
                        </Btn>
                        <Btn
                            variant={filtroSeccion === 'CORTES' ? 'primary' : 'secondary'}
                            onClick={() => setFiltroSeccion('CORTES')}
                            style={{
                                fontSize: '13px',
                                background: filtroSeccion === 'CORTES' ? '#ef4444' : undefined,
                                borderColor: filtroSeccion === 'CORTES' ? '#ef4444' : undefined,
                            }}
                        >
                            🛑 Alertas de Faltante y Cortes ({kpiCriticosCorte + kpiReponerPicking})
                        </Btn>
                        <Btn
                            variant={filtroSeccion === 'PARADAS' ? 'primary' : 'secondary'}
                            onClick={() => setFiltroSeccion('PARADAS')}
                            style={{
                                fontSize: '13px',
                                background: filtroSeccion === 'PARADAS' ? '#dc2626' : undefined,
                            }}
                        >
                            ⏸️ Máquinas Paradas ({kpiMaquinasParadas})
                        </Btn>
                        <Btn
                            variant={filtroSeccion === 'CAMBIOS' ? 'primary' : 'secondary'}
                            onClick={() => setFiltroSeccion('CAMBIOS')}
                            style={{
                                fontSize: '13px',
                                background: filtroSeccion === 'CAMBIOS' ? '#7c3aed' : undefined,
                            }}
                        >
                            🔄 Cambios en Ejecución ({kpiTotalCambios})
                        </Btn>
                    </div>

                    {/* ========================================================================= */}
                    {/* BLOQUE 1: ALERTAS DE FALTANTE Y CORTE DE MATERIALES (HILADOS E INSUMOS)    */}
                    {/* ========================================================================= */}
                    {(filtroSeccion === 'TODOS' || filtroSeccion === 'CORTES') && (
                        <div style={{ marginBottom: '36px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f3f4f6', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>🛑</span> Alertas de Faltante y Corte de Materiales (Hilados e Insumos)
                                    </h2>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                        Proyección exacta de consumo vs stock: cuándo se corta el hilado o insumo, si se termina la producción y si hay material del otro proveedor en depósito.
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input
                                        type="text"
                                        placeholder="🔍 Buscar hilado, insumo o proveedor..."
                                        value={searchMaterial}
                                        onChange={(e) => setSearchMaterial(e.target.value)}
                                        style={{
                                            padding: '7px 12px',
                                            background: 'var(--bg-secondary, #1a1d2e)',
                                            border: '1px solid var(--border-color, #2a2d3e)',
                                            borderRadius: '8px',
                                            color: '#f3f4f6',
                                            fontSize: '12px',
                                            width: isMobile ? '100%' : '260px',
                                        }}
                                    />

                                    <div style={{ display: 'flex', border: '1px solid var(--border-color, #2a2d3e)', borderRadius: '8px', overflow: 'hidden' }}>
                                        <button
                                            type="button"
                                            onClick={() => setFiltroTipoMaterial('TODOS')}
                                            style={{
                                                padding: '6px 12px',
                                                background: filtroTipoMaterial === 'TODOS' ? 'var(--primary, #3b82f6)' : 'transparent',
                                                color: '#f3f4f6',
                                                border: 'none',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Todos
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFiltroTipoMaterial('HILADO')}
                                            style={{
                                                padding: '6px 12px',
                                                background: filtroTipoMaterial === 'HILADO' ? '#f59e0b' : 'transparent',
                                                color: '#f3f4f6',
                                                border: 'none',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            🧶 Solo Hilados
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFiltroTipoMaterial('INSUMO')}
                                            style={{
                                                padding: '6px 12px',
                                                background: filtroTipoMaterial === 'INSUMO' ? '#ec4899' : 'transparent',
                                                color: '#f3f4f6',
                                                border: 'none',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            📦 Solo Insumos
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {materialesFiltrados.length === 0 ? (
                                <Card style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                                    No se encontraron alertas de materiales con los filtros seleccionados.
                                </Card>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {materialesFiltrados.map((mat) => {
                                        const isCritico = mat.nivelAlerta === 'CRITICO';
                                        const isReponer = mat.nivelAlerta === 'REPONER';
                                        const isMinimo = mat.nivelAlerta === 'MINIMO';

                                        const borderColor = isCritico
                                            ? '#ef4444'
                                            : isReponer
                                            ? '#f59e0b'
                                            : isMinimo
                                            ? '#fbbf24'
                                            : 'var(--border-color, #2a2d3e)';

                                        const bgCard = isCritico
                                            ? 'rgba(239, 68, 68, 0.08)'
                                            : isReponer
                                            ? 'rgba(245, 158, 11, 0.08)'
                                            : 'var(--bg-secondary, #1a1d2e)';

                                        return (
                                            <Card
                                                key={mat.itemId || mat.codigoInterno}
                                                style={{
                                                    padding: '16px 20px',
                                                    background: bgCard,
                                                    border: `1px solid ${borderColor}`,
                                                    borderRadius: '12px',
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                                    {/* Material Info */}
                                                    <div style={{ flex: 1, minWidth: '280px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: '16px', fontWeight: 800, color: '#f3f4f6' }}>
                                                                {mat.codigoInterno}
                                                            </span>
                                                            <Badge color={mat.tipoClasif === 'HILADO' ? '#f59e0b' : '#ec4899'}>
                                                                {mat.tipoClasif === 'HILADO' ? '🧶 Hilado' : '📦 Insumo'}
                                                            </Badge>
                                                            {mat.rol && (
                                                                <Badge color="#6366f1">
                                                                    {mat.rol}
                                                                </Badge>
                                                            )}
                                                            {mat.proveedor && (
                                                                <Badge color="#3b82f6">
                                                                    🏢 {mat.proveedor}
                                                                </Badge>
                                                            )}
                                                            {isCritico && (
                                                                <Badge color="#ef4444">
                                                                    🛑 CORTE INMINENTE
                                                                </Badge>
                                                            )}
                                                            {isReponer && (
                                                                <Badge color="#f59e0b">
                                                                    ⚠️ CAMBIO LOTE / REPONER
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        <div style={{ fontSize: '13px', color: '#d1d5db', marginTop: '4px' }}>
                                                            {mat.descripcion} {mat.colorNombre ? `· Color: ${mat.colorNombre}` : ''}
                                                        </div>

                                                        {/* Alerta de Corte y Diagnóstico */}
                                                        <div
                                                            style={{
                                                                marginTop: '10px',
                                                                padding: '8px 12px',
                                                                borderRadius: '8px',
                                                                background: isCritico ? 'rgba(239, 68, 68, 0.2)' : isReponer ? 'rgba(245, 158, 11, 0.2)' : 'rgba(0,0,0,0.2)',
                                                                border: isCritico ? '1px solid rgba(239, 68, 68, 0.4)' : isReponer ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                                                                fontSize: '12px',
                                                                color: isCritico ? '#fca5a5' : isReponer ? '#fde68a' : '#9ca3af',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px',
                                                                flexWrap: 'wrap',
                                                            }}
                                                        >
                                                            <span>{mat.mensajeCorte}</span>
                                                            {mat.horaProyectadaCorte && (
                                                                <strong style={{ color: isCritico ? '#ef4444' : '#f59e0b' }}>
                                                                    ⏰ {mat.horaProyectadaCorte}
                                                                </strong>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Disponibilidad de sustituto / otro proveedor */}
                                                    <div style={{ minWidth: '220px', textAlign: 'right' }}>
                                                        <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>
                                                            ¿Hay del otro material en Depósito?
                                                        </div>
                                                        <div style={{ marginTop: '4px' }}>
                                                            {mat.hayOtroMaterialEnReserva ? (
                                                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                                                                    ✅ SÍ, {mat.stockReserva} {mat.unidadPrincipal || 'kg'} en Reserva
                                                                </span>
                                                            ) : (
                                                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                                                                    ❌ NO HAY en Reserva (Corte total)
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
                                                            {mat.maquinas.length} máquinas consumiendo ({mat.maquinas.map((m) => `M${m}`).slice(0, 8).join(', ')}{mat.maquinas.length > 8 ? '...' : ''})
                                                        </div>
                                                    </div>

                                                    {/* Stock vs Consumo Matrix */}
                                                    <div style={{ display: 'flex', gap: '16px', background: 'rgba(0,0,0,0.25)', padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <div>
                                                            <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase' }}>Consumo Día</div>
                                                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#f3f4f6' }}>
                                                                {mat.consumoTotal.toLocaleString('es-AR')} {mat.unidadPrincipal || 'kg'}
                                                            </div>
                                                            <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                                                                (~{mat.tasaHora} {mat.unidadPrincipal || 'kg'}/h)
                                                            </div>
                                                        </div>

                                                        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '14px' }}>
                                                            <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase' }}>En Picking</div>
                                                            <div style={{ fontSize: '15px', fontWeight: 800, color: mat.stockPicking < mat.consumoTotal ? '#f59e0b' : '#34d399' }}>
                                                                {mat.stockPicking.toLocaleString('es-AR')} {mat.unidadPrincipal || 'kg'}
                                                            </div>
                                                            <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                                                                {mat.horasAutonomiaPicking < 900 ? `${mat.horasAutonomiaPicking}h autonomía` : 'Sin consumo'}
                                                            </div>
                                                        </div>

                                                        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '14px' }}>
                                                            <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase' }}>En Reserva</div>
                                                            <div style={{ fontSize: '15px', fontWeight: 800, color: mat.stockReserva > 0 ? '#60a5fa' : '#9ca3af' }}>
                                                                {mat.stockReserva.toLocaleString('es-AR')} {mat.unidadPrincipal || 'kg'}
                                                            </div>
                                                            <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                                                                Depósito gral.
                                                            </div>
                                                        </div>

                                                        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '14px' }}>
                                                            <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase' }}>Total Fábrica</div>
                                                            <div style={{ fontSize: '15px', fontWeight: 800, color: mat.stockTotal < mat.consumoTotal ? '#ef4444' : '#34d399' }}>
                                                                {mat.stockTotal.toLocaleString('es-AR')} {mat.unidadPrincipal || 'kg'}
                                                            </div>
                                                            <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                                                                {mat.stockTotal < mat.consumoTotal ? `Faltan ${mat.faltanteNeto}` : 'Alcanza'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* BLOQUE 2: MÁQUINAS PARADAS POR MUCHO TIEMPO                                */}
                    {/* ========================================================================= */}
                    {(filtroSeccion === 'TODOS' || filtroSeccion === 'PARADAS') && (
                        <div style={{ marginBottom: '36px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f3f4f6', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>⏸️</span> Máquinas Paradas o con Pérdida Prolongada de Tiempo
                                    </h2>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                        Ranking de máquinas que registraron mayor inactividad en el turno: horas perdidas, motivo y artículo que dejaron de producir.
                                    </div>
                                </div>

                                <Btn
                                    variant="secondary"
                                    onClick={() => navigate('/mantenimiento/disponibilidad-v2')}
                                    style={{ fontSize: '12px' }}
                                >
                                    📊 Ver Timeline Completo de Máquinas ↗️
                                </Btn>
                            </div>

                            {loadingAvailability && (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
                                    <Spinner /> <span style={{ marginLeft: '8px' }}>Calculando disponibilidad de máquinas...</span>
                                </div>
                            )}

                            {!loadingAvailability && maquinasParadas.length === 0 ? (
                                <Card style={{ padding: '24px', textAlign: 'center', color: '#34d399' }}>
                                    🎉 Excelente: no se detectan máquinas con paradas prolongadas en las últimas horas.
                                </Card>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                                    {maquinasParadas.slice(0, 12).map((maq) => {
                                        const isCritica = maq.tiempoParadaHoras >= 3;
                                        const colorStatus = maq.status === 'PARADA' ? '#ef4444' : maq.status === 'REVISAR' ? '#f59e0b' : '#3b82f6';

                                        return (
                                            <Card
                                                key={maq.number}
                                                style={{
                                                    padding: '16px 18px',
                                                    background: isCritica ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary, #1a1d2e)',
                                                    border: isCritica ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color, #2a2d3e)',
                                                    borderRadius: '12px',
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#f3f4f6' }}>
                                                            M{maq.number}
                                                        </span>
                                                        <Badge color={colorStatus}>
                                                            {maq.status}
                                                        </Badge>
                                                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                                            {maq.area}
                                                        </span>
                                                    </div>

                                                    <div style={{ textAlign: 'right' }}>
                                                        <span style={{ fontSize: '16px', fontWeight: 900, color: '#ef4444' }}>
                                                            {maq.horasParadaFormateada || `${maq.tiempoParadaHoras}h parada`}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Barra visual de disponibilidad */}
                                                <div style={{ marginTop: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                                                        <span>Disponibilidad en turno</span>
                                                        <strong style={{ color: maq.disponibilidadPct < 70 ? '#ef4444' : maq.disponibilidadPct < 85 ? '#f59e0b' : '#34d399' }}>
                                                            {maq.disponibilidadPct}%
                                                        </strong>
                                                    </div>
                                                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div
                                                            style={{
                                                                width: `${Math.min(100, Math.max(0, maq.disponibilidadPct))}%`,
                                                                height: '100%',
                                                                background: maq.disponibilidadPct < 70 ? '#ef4444' : maq.disponibilidadPct < 85 ? '#f59e0b' : '#10b981',
                                                                borderRadius: '3px',
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                <div style={{ marginTop: '12px', fontSize: '12px', color: '#d1d5db' }}>
                                                    <span style={{ color: '#9ca3af' }}>Motivo: </span>
                                                    <strong>{maq.motivo}</strong>
                                                </div>

                                                <div style={{ marginTop: '4px', fontSize: '12px', color: '#d1d5db' }}>
                                                    <span style={{ color: '#9ca3af' }}>Artículo afectado: </span>
                                                    <span style={{ color: '#60a5fa', fontWeight: 600 }}>
                                                        {maq.articulo} {maq.talle ? `[${maq.talle}]` : ''}
                                                    </span>
                                                </div>

                                                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                                                    <Btn
                                                        variant="secondary"
                                                        onClick={() => navigate(`/mantenimiento/maquinas?buscar=${maq.number}`)}
                                                        style={{ fontSize: '11px', padding: '4px 10px' }}
                                                    >
                                                        Ver Máquina M{maq.number} ↗️
                                                    </Btn>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* BLOQUE 3: TIPOS DE CAMBIOS EJECUTÁNDOSE Y EN QUÉ MÁQUINAS                 */}
                    {/* ========================================================================= */}
                    {(filtroSeccion === 'TODOS' || filtroSeccion === 'CAMBIOS') && (
                        <div style={{ marginBottom: '36px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f3f4f6', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>🔄</span> Tipos de Cambios en Ejecución por Máquina
                                    </h2>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                        Control exacto de cambios programados a las 08:00 AM y entre turnos: qué máquina cambia, qué tipo de cambio realiza (artículo, talle, color) y tiempo estimado.
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <select
                                        value={filtroTipoCambio}
                                        onChange={(e) => setFiltroTipoCambio(e.target.value)}
                                        style={{
                                            padding: '7px 12px',
                                            background: 'var(--bg-secondary, #1a1d2e)',
                                            border: '1px solid var(--border-color, #2a2d3e)',
                                            borderRadius: '8px',
                                            color: '#f3f4f6',
                                            fontSize: '12px',
                                        }}
                                    >
                                        <option value="TODOS">Todos los tipos de cambio ({cambiosEnEjecucion.length})</option>
                                        {tiposDeCambioUnicos.map((tipo) => (
                                            <option key={tipo} value={tipo}>
                                                {tipo}
                                            </option>
                                        ))}
                                    </select>

                                    <Btn
                                        variant="secondary"
                                        onClick={() => navigate('/produccion/informe-cambios-dia')}
                                        style={{ fontSize: '12px' }}
                                    >
                                        📄 Ver Informe de Cambios ↗️
                                    </Btn>
                                </div>
                            </div>

                            {cambiosEnEjecucion.length === 0 ? (
                                <Card style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                                    No hay cambios programados con los filtros seleccionados.
                                </Card>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
                                    {cambiosEnEjecucion.map((maq, idx) => {
                                        const duracionMin = maq.changeoverDurationMinutes || 60;
                                        const tipo = maq.changeoverType || 'CAMBIO_PROGRAMADO';

                                        const colorTipo =
                                            tipo.includes('ARTICULO')
                                                ? '#8b5cf6'
                                                : tipo.includes('TALLE')
                                                ? '#3b82f6'
                                                : tipo.includes('COLOR')
                                                ? '#ec4899'
                                                : '#f59e0b';

                                        return (
                                            <Card
                                                key={`${maq.machine}-${maq.shift}-${idx}`}
                                                style={{
                                                    padding: '16px 18px',
                                                    background: 'var(--bg-secondary, #1a1d2e)',
                                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                                    borderRadius: '12px',
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#f3f4f6' }}>
                                                            M{maq.machine}
                                                        </span>
                                                        <Badge color="#6366f1">
                                                            {maq.area || 'Planta'}
                                                        </Badge>
                                                        <Badge color={maq.shift === 'N' ? '#818cf8' : '#f59e0b'}>
                                                            {maq.shift === 'N' ? '🌙 Noche' : '☀️ Mañana'}
                                                        </Badge>
                                                    </div>

                                                    <Badge color={colorTipo}>
                                                        {tipo}
                                                    </Badge>
                                                </div>

                                                {/* Detalle del Cambio */}
                                                <div
                                                    style={{
                                                        marginTop: '12px',
                                                        padding: '10px 14px',
                                                        background: 'rgba(0,0,0,0.25)',
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(255,255,255,0.05)',
                                                    }}
                                                >
                                                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>
                                                        Artículo Entrante (En Máquina)
                                                    </div>
                                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                                                        {maq.articleCode || maq.articleRaw}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#d1d5db', marginTop: '2px' }}>
                                                        {maq.descRaw}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                                        <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 700 }}>
                                                            Talle: {maq.talle || 'Único'}
                                                        </span>
                                                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>•</span>
                                                        <span style={{ fontSize: '11px', color: '#f59e0b' }}>
                                                            Color: {maq.colorRaw || 'Sin color'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Horario y Duración */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '12px', color: '#9ca3af' }}>
                                                    <div>
                                                        <span>Horario: </span>
                                                        <strong style={{ color: '#f3f4f6' }}>08:00 AM</strong>
                                                    </div>
                                                    <div>
                                                        <span>Duración estimada: </span>
                                                        <strong style={{ color: '#a78bfa' }}>{duracionMin} min</strong>
                                                    </div>
                                                    <div>
                                                        <span>Horas netas: </span>
                                                        <strong style={{ color: '#34d399' }}>{maq.netHours || 11}h</strong>
                                                    </div>
                                                </div>

                                                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <Btn
                                                        variant="secondary"
                                                        onClick={() => navigate(`/produccion/planificacion`)}
                                                        style={{ fontSize: '11px', padding: '4px 10px' }}
                                                    >
                                                        Ver Planilla Tejeduría ↗️
                                                    </Btn>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
