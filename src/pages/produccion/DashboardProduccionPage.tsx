import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Btn, Badge, Spinner, useIsMobile } from '../../shared/ui';
import {
    useGetUltimaPlanillaProduccionQuery,
    useListarPlanillasProduccionQuery,
    useLazyGetPlanillaProduccionByIdQuery,
} from '../../features/quality/ordenes-produccion/api/ordenesProduccion.api';
import { useGetMachineChangeReportQuery } from '../../entities/maintenance/api/maintenance.api';
import type { ProduccionParseResult } from '../../features/quality/ordenes-produccion/types/ordenesProduccion.types';
import {
    exportHojaPickingToExcel,
    exportInformeCambiosToExcel,
} from '../../features/quality/ordenes-produccion/utils/excelExport';

export default function DashboardProduccionPage() {
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    // 1. Datos de Planilla de Producción
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

    // 2. Tiempos Históricos de Cambios cargados por Marina (Mantenimiento)
    const { data: marinaChangesReport } = useGetMachineChangeReportQuery({});

    // Mapa de tiempos históricos de Marina por tipo/combinación de cambio
    const marinaDurationsMap = useMemo(() => {
        const map = new Map<string, { medianMs: number; formatted: string; count: number }>();
        if (!marinaChangesReport?.report) return map;

        marinaChangesReport.report.forEach((item: any) => {
            const key = (item.combination || []).slice().sort().join('+').toUpperCase();
            if (key) {
                map.set(key, {
                    medianMs: item.medianDurationMs || 0,
                    formatted: item.medianDurationFormatted || item.avgDurationFormatted || `${Math.round((item.medianDurationMs || 0) / 60000)}m`,
                    count: item.count || 0,
                });
            }
        });
        return map;
    }, [marinaChangesReport]);

    // Pestaña activa: 'PICKING' o 'CAMBIOS'
    const [activeTab, setActiveTab] = useState<'PICKING' | 'CAMBIOS'>('PICKING');

    // Filtros de búsqueda rápidos
    const [searchQuery, setSearchQuery] = useState('');
    const [filtroArea, setFiltroArea] = useState('ALL');
    const [filtroEstadoPicking, setFiltroEstadoPicking] = useState<'ALL' | 'BAJAR' | 'FALTANTE' | 'OK'>('ALL');

    // =========================================================================
    // INFORME 1: Picking y Abastecimiento de Hilados para Depósito & Tejeduría
    // =========================================================================
    const itemsPicking = useMemo(() => {
        if (!activePlanilla) return [];

        // Si la planilla ya calculó hojaPicking, la usamos enriquecida
        if (activePlanilla.hojaPicking && activePlanilla.hojaPicking.length > 0) {
            return activePlanilla.hojaPicking;
        }

        // Si no, derivamos de materiales clasificados como hilado
        if (activePlanilla.materiales && activePlanilla.materiales.length > 0) {
            return activePlanilla.materiales
                .filter((m) => {
                    const cat = (m.categoriaNombre || '').toUpperCase();
                    const rol = (m.rol || '').toUpperCase();
                    const desc = (m.descripcion || '').toUpperCase();
                    return (
                        rol === 'HILADO' ||
                        cat.includes('HILADO') ||
                        cat.includes('ALGODON') ||
                        cat.includes('GOMA') ||
                        cat.includes('LYCRA') ||
                        cat.includes('POLIAMIDA') ||
                        cat.includes('NYLON') ||
                        cat.includes('POLYSOFT') ||
                        desc.includes('HILADO') ||
                        m.unidadPrincipal === 'KG'
                    );
                })
                .map((m) => {
                    const consumo = Number(m.consumoTotalKg) || 0;
                    const picking = Number(m.stockEnPickingKg) || 0;
                    const reserva = Number(m.stockEnReservaKg) || 0;
                    const aPasar = Number(m.aPasarAPickingKg) || Math.max(0, Math.min(reserva, consumo - picking));
                    const total = Number(m.stockActualTotalKg) || (picking + reserva);

                    let estadoAbast: 'OK' | 'BAJAR_A_PICKING' | 'CRITICO_COMPRAR' = 'OK';
                    if (total < consumo) {
                        estadoAbast = 'CRITICO_COMPRAR';
                    } else if (picking < consumo) {
                        estadoAbast = 'BAJAR_A_PICKING';
                    }

                    return {
                        codigoMaterial: m.codigoInterno,
                        descripcionMaterial: m.descripcion,
                        categoriaNombre: m.categoriaNombre || 'HILADO',
                        rol: m.rol || 'HILADO',
                        tono: m.tono || '',
                        colorNombre: m.colorNombre || '',
                        proveedor: m.proveedor || '',
                        consumoDiaKg: consumo,
                        conosNecesarios: m.conosTotales || Math.ceil(consumo / 1.5),
                        stockEnPickingKg: picking,
                        stockEnReservaKg: reserva,
                        aPasarAPickingKg: aPasar,
                        posicionesPickingSugeridas: m.posicionesPickingSugeridas || [],
                        posicionesStockReserva: [],
                        stockRestanteTotalKg: Math.max(0, total - consumo),
                        aComprarKg: Math.max(0, consumo - total),
                        estadoAbastecimiento: estadoAbast,
                        maquinasCount: m.maquinasCount || 0,
                        maquinas: m.maquinas || [],
                        areas: [],
                        articulos: (m.articulosAsignados || []).map((a) => a.codigoArticulo),
                    };
                });
        }

        return [];
    }, [activePlanilla]);

    // Filtrado de Picking
    const filteredPicking = useMemo(() => {
        return itemsPicking.filter((it: any) => {
            if (filtroEstadoPicking === 'BAJAR') {
                if (it.aPasarAPickingKg <= 0 && it.estadoAbastecimiento !== 'BAJAR_A_PICKING') return false;
            } else if (filtroEstadoPicking === 'FALTANTE') {
                if (it.estadoAbastecimiento !== 'CRITICO_COMPRAR' && (it.aComprarKg || 0) <= 0) return false;
            } else if (filtroEstadoPicking === 'OK') {
                if (it.estadoAbastecimiento !== 'OK' && it.aPasarAPickingKg > 0) return false;
            }

            if (searchQuery.trim()) {
                const term = searchQuery.toLowerCase();
                const matchCod = (it.codigoMaterial || '').toLowerCase().includes(term);
                const matchDesc = (it.descripcionMaterial || '').toLowerCase().includes(term);
                const matchTono = (it.tono || it.colorNombre || '').toLowerCase().includes(term);
                const matchArt = (it.articulos || []).some((a: string) => a.toLowerCase().includes(term));
                if (!matchCod && !matchDesc && !matchTono && !matchArt) return false;
            }

            return true;
        });
    }, [itemsPicking, filtroEstadoPicking, searchQuery]);

    // Totales Picking
    const statsPicking = useMemo(() => {
        let totalKilosConsumo = 0;
        let totalItems = itemsPicking.length;
        let cubiertosEnPicking = 0;
        let requierenBajar = 0;
        let faltantesCriticos = 0;
        let kilosABajarTotal = 0;

        itemsPicking.forEach((it: any) => {
            totalKilosConsumo += Number(it.consumoDiaKg) || 0;
            const aPasar = Number(it.aPasarAPickingKg) || 0;
            const aComprar = Number(it.aComprarKg) || 0;

            if (it.estadoAbastecimiento === 'CRITICO_COMPRAR' || aComprar > 0) {
                faltantesCriticos++;
            } else if (it.estadoAbastecimiento === 'BAJAR_A_PICKING' || aPasar > 0) {
                requierenBajar++;
                kilosABajarTotal += aPasar;
            } else {
                cubiertosEnPicking++;
            }
        });

        return {
            totalKilosConsumo: Math.round(totalKilosConsumo * 10) / 10,
            totalItems,
            cubiertosEnPicking,
            requierenBajar,
            faltantesCriticos,
            kilosABajarTotal: Math.round(kilosABajarTotal * 10) / 10,
        };
    }, [itemsPicking]);

    // =========================================================================
    // INFORME 2: Matriz de Cambios de Máquina & Hilados Entrantes
    // =========================================================================
    const cambiosDetallados = useMemo(() => {
        if (!activePlanilla || !activePlanilla.maquinas) return [];

        // Agrupar entradas por máquina para reconstruir: Artículo Saliente ➔ Artículo Entrante
        const porMaquina: Record<number, any[]> = {};
        activePlanilla.maquinas.forEach((m) => {
            if (!porMaquina[m.machine]) porMaquina[m.machine] = [];
            porMaquina[m.machine].push(m);
        });

        const listaCambios: any[] = [];

        Object.entries(porMaquina).forEach(([mStr, entries]) => {
            const machineNum = parseInt(mStr, 10);
            const conCambio = entries.find((e) => e.hasChangeover);

            if (!conCambio && entries.length <= 1) return;

            // Identificar saliente y entrante
            let saliente = entries.find((e) => e.changeoverRole === 'SALIENTE_08AM');
            let entrante = entries.find((e) => e.changeoverRole === 'ENTRANTE_08AM');

            if (!saliente && !entrante) {
                // Ordenar por orden en turno
                const sorted = [...entries].sort((a, b) => (a.orderInShift || 1) - (b.orderInShift || 2));
                if (sorted.length >= 2) {
                    saliente = sorted[0];
                    entrante = sorted[1];
                } else if (conCambio) {
                    entrante = conCambio;
                }
            }

            const activeEntry = entrante || conCambio || entries[0];
            const area = activeEntry?.area ? `Área ${activeEntry.area}` : 'Planta';

            // Tipo de cambio y clave para contrastar con Marina
            const tipos: string[] = activeEntry?.changeoverTypes && activeEntry.changeoverTypes.length > 0
                ? activeEntry.changeoverTypes
                : (activeEntry?.changeoverType ? [activeEntry.changeoverType] : ['ARTICULO']);

            const keyMarina = tipos.slice().sort().join('+').toUpperCase();
            const marinaStat = marinaDurationsMap.get(keyMarina);

            let tiempoEstimadoMinutos = 0;
            let tiempoFormateado = '';
            let fuenteTiempo: 'MARINA' | 'CALCULADO' = 'CALCULADO';

            if (marinaStat && marinaStat.medianMs > 0) {
                tiempoEstimadoMinutos = Math.round(marinaStat.medianMs / 60000);
                tiempoFormateado = marinaStat.formatted;
                fuenteTiempo = 'MARINA';
            } else if (activeEntry?.changeoverDurationMinutes) {
                tiempoEstimadoMinutos = activeEntry.changeoverDurationMinutes;
                tiempoFormateado = `${tiempoEstimadoMinutos} min`;
            } else {
                tiempoEstimadoMinutos = 45; // Default promedio estándar de tejeduría
                tiempoFormateado = '45 min';
            }

            // Hilados que requiere el artículo entrante para arrancar
            const hiladosEntrantes = (entrante?.hiladosMaquina || activeEntry?.hiladosMaquina || []).map((h: any) => ({
                codigo: h.codigoItem || h.codigoComponente || '-',
                descripcion: h.descripcion || 'Hilado',
                consumoKg: Number(h.consumoKg) || 0,
                conosEstimados: Number(h.conosEstimados) || Math.ceil((Number(h.consumoKg) || 1) / 1.5),
            }));

            listaCambios.push({
                maquina: machineNum,
                area,
                areaNumero: activeEntry?.area || '',
                tipoCambio: tipos.join(' + ') || 'CAMBIO',
                tipos,
                saliente: {
                    codigo: saliente?.articleCode || saliente?.articleRaw || '(Anterior)',
                    descripcion: saliente?.matchedArticle?.descripcion || saliente?.descRaw || '-',
                    talle: saliente?.talle || '-',
                    color: saliente?.colorRaw || '-',
                },
                entrante: {
                    codigo: entrante?.articleCode || entrante?.articleRaw || activeEntry?.articleCode || activeEntry?.articleRaw || '(Nuevo)',
                    descripcion: entrante?.matchedArticle?.descripcion || entrante?.descRaw || activeEntry?.matchedArticle?.descripcion || activeEntry?.descRaw || '-',
                    talle: entrante?.talle || activeEntry?.talle || '-',
                    color: entrante?.colorRaw || activeEntry?.colorRaw || '-',
                },
                tiempoEstimadoMinutos,
                tiempoFormateado,
                fuenteTiempo,
                muestrasMarina: marinaStat?.count || 0,
                hiladosEntrantes,
                horasRestantesTejido: activeEntry?.netHours ?? 10,
            });
        });

        return listaCambios.sort((a, b) => a.maquina - b.maquina);
    }, [activePlanilla, marinaDurationsMap]);

    // Filtrado de Cambios
    const filteredCambios = useMemo(() => {
        return cambiosDetallados.filter((c) => {
            if (filtroArea !== 'ALL' && String(c.areaNumero) !== String(filtroArea)) {
                return false;
            }

            if (searchQuery.trim()) {
                const term = searchQuery.toLowerCase();
                const matchM = `m${c.maquina}`.includes(term) || String(c.maquina).includes(term);
                const matchSal = (c.saliente.codigo + ' ' + c.saliente.descripcion).toLowerCase().includes(term);
                const matchEnt = (c.entrante.codigo + ' ' + c.entrante.descripcion).toLowerCase().includes(term);
                const matchTipo = (c.tipoCambio || '').toLowerCase().includes(term);
                const matchHil = c.hiladosEntrantes.some((h: any) =>
                    (h.codigo + ' ' + h.descripcion).toLowerCase().includes(term)
                );
                if (!matchM && !matchSal && !matchEnt && !matchTipo && !matchHil) return false;
            }

            return true;
        });
    }, [cambiosDetallados, filtroArea, searchQuery]);

    // Totales Cambios
    const statsCambios = useMemo(() => {
        const totalCambios = cambiosDetallados.length;
        const minutosParada = cambiosDetallados.reduce((acc, c) => acc + c.tiempoEstimadoMinutos, 0);
        const horasParada = Math.round((minutosParada / 60) * 10) / 10;
        const promedioMin = totalCambios > 0 ? Math.round(minutosParada / totalCambios) : 0;
        const conMarina = cambiosDetallados.filter((c) => c.fuenteTiempo === 'MARINA').length;

        return {
            totalCambios,
            minutosParada,
            horasParada,
            promedioMin,
            conMarina,
        };
    }, [cambiosDetallados]);

    // Exportadores a Excel
    const handleExportExcel = () => {
        if (activeTab === 'PICKING') {
            exportHojaPickingToExcel(filteredPicking as any, `picking_hilados_${activePlanilla?.fechas?.[0] || 'dia'}.xlsx`);
        } else {
            const dataToExport = filteredCambios.map((c) => ({
                maquina: c.maquina,
                area: c.area,
                articuloSaliente: `${c.saliente.codigo} (${c.saliente.talle}) - ${c.saliente.descripcion}`,
                articuloEntrante: `${c.entrante.codigo} (${c.entrante.talle}) - ${c.entrante.descripcion}`,
                talleColorEntrante: `${c.entrante.talle} / ${c.entrante.color}`,
                tipoCambio: c.tipoCambio,
                tiempoEstimado: c.tiempoFormateado,
                fuenteTiempo: c.fuenteTiempo === 'MARINA' ? `Histórico Marina (${c.muestrasMarina} registros)` : 'Estimado base',
                hiladosEntrantes: c.hiladosEntrantes.map((h: any) => `${h.codigo} (${h.consumoKg}kg / ~${h.conosEstimados} conos)`).join(' | '),
            }));
            exportInformeCambiosToExcel(dataToExport, `cambios_maquinas_${activePlanilla?.fechas?.[0] || 'dia'}.xlsx`);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loadingPlanilla && !activePlanilla) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#9ca3af' }}>
                <Spinner /> <span style={{ marginLeft: '12px', fontSize: '14px' }}>Cargando Centro de Control de Producción...</span>
            </div>
        );
    }

    return (
        <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '1600px', margin: '0 auto' }}>
            {/* CSS para impresión limpia del vale de picking / cambios */}
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
                    th { background-color: #f3f4f6 !important; font-weight: bold !important; }
                }
            `}</style>

            {/* ENCABEZADO PRINCIPAL & ACCIONES RÁPIDAS (REGLA DE 2 CLICS) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <PageHeader
                    title="📊 Dashboard de Producción"
                    subtitle="Centro de control operativo: abastecimiento de picking para depósito y matriz de cambios de máquina con tiempos reales"
                />

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Selector de Planilla */}
                    <div style={{ minWidth: '220px' }}>
                        <select
                            value={activePlanilla?.planillaId || ''}
                            onChange={(e) => handleSelectPlanillaHistorica(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '9px 12px',
                                background: 'var(--bg-secondary, #1a1d2e)',
                                border: '1px solid var(--border-color, #2a2d3e)',
                                borderRadius: '8px',
                                color: '#f3f4f6',
                                fontSize: '13px',
                                outline: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            <option value="">📅 Producción del día (Última cargada)</option>
                            {historialPlanillas.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                    Planilla: {p.fecha} ({new Date(p.creado_en).toLocaleDateString('es-AR')})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Botones directos a 1 clic */}
                    <Btn
                        variant="secondary"
                        onClick={() => navigate('/produccion/programacion-gantt')}
                        style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span>📅</span> Programación Gantt
                    </Btn>

                    <Btn
                        onClick={() => navigate('/produccion/planificacion')}
                        style={{ fontSize: '13px', background: 'var(--primary, #6366f1)', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span>📥</span> Carga de Producción
                    </Btn>
                </div>
            </div>

            {/* AVISO SI NO HAY PLANILLA ACTIVA */}
            {!activePlanilla && (
                <Card style={{ padding: '40px 20px', textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '42px', marginBottom: '12px' }}>📥</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#f3f4f6' }}>
                        No hay una planilla de producción cargada aún
                    </h3>
                    <p style={{ fontSize: '13px', color: '#9ca3af', maxWidth: '520px', margin: '0 auto 20px auto' }}>
                        Subí las planillas diarias de tejeduría (PDFs) desde la sección de Carga de Producción para sincronizar máquinas, cambios de artículo y abastecimiento de hilado.
                    </p>
                    <Btn onClick={() => navigate('/produccion/planificacion')} style={{ background: '#6366f1', color: '#fff' }}>
                        Ir a Carga de Producción ➔
                    </Btn>
                </Card>
            )}

            {activePlanilla && (
                <>
                    {/* 4 TARJETAS KPI DE ALTO IMPACTO (SIN RELLENO INÚTIL) */}
                    <div
                        className="no-print"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '14px',
                            marginBottom: '22px',
                        }}
                    >
                        {/* KPI 1: Producción Programada */}
                        <Card style={{ padding: '16px 18px', background: 'var(--bg-secondary, #1a1d2e)', border: '1px solid var(--border-color, #2a2d3e)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                                    🧦 Producción Neta Día
                                </span>
                                <Badge color="#10b981">Planilla Activa</Badge>
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#f3f4f6', marginTop: '6px' }}>
                                {(activePlanilla.resumenAlertas?.totalDocenasEstimadas || 0).toLocaleString('es-AR')} doc.
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                {(activePlanilla.resumenAlertas?.totalParesEstimados || 0).toLocaleString('es-AR')} pares proyectados en 24h
                            </div>
                        </Card>

                        {/* KPI 2: Abastecimiento Zona de Picking */}
                        <Card
                            onClick={() => setActiveTab('PICKING')}
                            style={{
                                padding: '16px 18px',
                                background: activeTab === 'PICKING' ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-secondary, #1a1d2e)',
                                border: activeTab === 'PICKING' ? '1px solid #38bdf8' : '1px solid var(--border-color, #2a2d3e)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
                                    🧶 Zona de Picking Hilado
                                </span>
                                <span style={{ fontSize: '12px', color: '#38bdf8' }}>↗️ Ver</span>
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: statsPicking.requierenBajar > 0 ? '#f59e0b' : '#10b981', marginTop: '6px' }}>
                                {statsPicking.requierenBajar > 0 ? `${statsPicking.requierenBajar} a bajar` : '100% Cubierto'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                {statsPicking.kilosABajarTotal > 0
                                    ? `${statsPicking.kilosABajarTotal} kg a pasar de reserva a picking`
                                    : `${statsPicking.cubiertosEnPicking} de ${statsPicking.totalItems} hilados listos en planta`}
                            </div>
                        </Card>

                        {/* KPI 3: Cambios de Máquina Programados */}
                        <Card
                            onClick={() => setActiveTab('CAMBIOS')}
                            style={{
                                padding: '16px 18px',
                                background: activeTab === 'CAMBIOS' ? 'rgba(167, 139, 250, 0.08)' : 'var(--bg-secondary, #1a1d2e)',
                                border: activeTab === 'CAMBIOS' ? '1px solid #a78bfa' : '1px solid var(--border-color, #2a2d3e)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase' }}>
                                    🔄 Cambios de Máquina Hoy
                                </span>
                                <span style={{ fontSize: '12px', color: '#a78bfa' }}>↗️ Ver</span>
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#a78bfa', marginTop: '6px' }}>
                                {statsCambios.totalCambios} máquinas
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                {statsCambios.horasParada}h paradas estimadas ({statsCambios.promedioMin} min prom/cambio)
                            </div>
                        </Card>

                        {/* KPI 4: Faltantes Críticos de Compra */}
                        <Card style={{ padding: '16px 18px', background: 'var(--bg-secondary, #1a1d2e)', border: '1px solid var(--border-color, #2a2d3e)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: statsPicking.faltantesCriticos > 0 ? '#ef4444' : '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                                    🚨 Faltantes Stock General
                                </span>
                                {statsPicking.faltantesCriticos > 0 && <Badge color="#ef4444">Atención</Badge>}
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: statsPicking.faltantesCriticos > 0 ? '#ef4444' : '#10b981', marginTop: '6px' }}>
                                {statsPicking.faltantesCriticos} hilados
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                {statsPicking.faltantesCriticos > 0 ? 'Stock total menor al consumo del día' : 'Stock suficiente para todo el programa'}
                            </div>
                        </Card>
                    </div>

                    {/* SELECTOR DE LOS 2 INFORMES PRINCIPALES (TABS) */}
                    <div
                        className="no-print"
                        style={{
                            display: 'flex',
                            gap: '8px',
                            borderBottom: '1px solid var(--border-color, #2a2d3e)',
                            marginBottom: '20px',
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => { setActiveTab('PICKING'); setSearchQuery(''); }}
                            style={{
                                padding: '12px 20px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'PICKING' ? '3px solid #38bdf8' : '3px solid transparent',
                                color: activeTab === 'PICKING' ? '#38bdf8' : '#9ca3af',
                                fontWeight: activeTab === 'PICKING' ? 700 : 500,
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            <span>🧶</span> Informe 1: Abastecimiento & Zona de Picking
                            <span style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: statsPicking.requierenBajar > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                color: statsPicking.requierenBajar > 0 ? '#f59e0b' : '#10b981',
                                fontWeight: 700,
                            }}>
                                {statsPicking.requierenBajar > 0 ? `${statsPicking.requierenBajar} a bajar` : 'OK'}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => { setActiveTab('CAMBIOS'); setSearchQuery(''); }}
                            style={{
                                padding: '12px 20px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'CAMBIOS' ? '3px solid #a78bfa' : '3px solid transparent',
                                color: activeTab === 'CAMBIOS' ? '#a78bfa' : '#9ca3af',
                                fontWeight: activeTab === 'CAMBIOS' ? 700 : 500,
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            <span>🔄</span> Informe 2: Matriz de Cambios de Máquina & Hilados Entrantes
                            <span style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: 'rgba(167, 139, 250, 0.2)',
                                color: '#a78bfa',
                                fontWeight: 700,
                            }}>
                                {statsCambios.totalCambios} máquinas
                            </span>
                        </button>
                    </div>

                    {/* BARRA DE ACCIÓN Y FILTROS RÁPIDOS */}
                    <div
                        className="no-print"
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px',
                            marginBottom: '16px',
                        }}
                    >
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Buscador */}
                            <input
                                type="text"
                                placeholder={activeTab === 'PICKING' ? '🔍 Buscar hilado, código, artículo...' : '🔍 Buscar máquina, artículo, hilado...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    padding: '8px 14px',
                                    background: 'var(--bg-secondary, #1a1d2e)',
                                    border: '1px solid var(--border-color, #2a2d3e)',
                                    borderRadius: '8px',
                                    color: '#f3f4f6',
                                    fontSize: '13px',
                                    minWidth: isMobile ? '100%' : '260px',
                                    outline: 'none',
                                }}
                            />

                            {/* Filtro específico de Picking */}
                            {activeTab === 'PICKING' && (
                                <select
                                    value={filtroEstadoPicking}
                                    onChange={(e) => setFiltroEstadoPicking(e.target.value as any)}
                                    style={{
                                        padding: '8px 12px',
                                        background: 'var(--bg-secondary, #1a1d2e)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        borderRadius: '8px',
                                        color: '#f3f4f6',
                                        fontSize: '13px',
                                        outline: 'none',
                                    }}
                                >
                                    <option value="ALL">Todos los Estados ({itemsPicking.length})</option>
                                    <option value="BAJAR">⚡ Requiere Bajar a Picking ({statsPicking.requierenBajar})</option>
                                    <option value="FALTANTE">🚨 Faltante Crítico Compra ({statsPicking.faltantesCriticos})</option>
                                    <option value="OK">🟢 Cubiertos en Picking ({statsPicking.cubiertosEnPicking})</option>
                                </select>
                            )}

                            {/* Filtro específico de Cambios (Áreas) */}
                            {activeTab === 'CAMBIOS' && (
                                <select
                                    value={filtroArea}
                                    onChange={(e) => setFiltroArea(e.target.value)}
                                    style={{
                                        padding: '8px 12px',
                                        background: 'var(--bg-secondary, #1a1d2e)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        borderRadius: '8px',
                                        color: '#f3f4f6',
                                        fontSize: '13px',
                                        outline: 'none',
                                    }}
                                >
                                    <option value="ALL">Todas las Áreas ({cambiosDetallados.length} cambios)</option>
                                    <option value="1">Área 1 (M1-M22)</option>
                                    <option value="2">Área 2 (M23-M67)</option>
                                    <option value="3">Área 3 (M73-M117)</option>
                                    <option value="4">Área 4 (M126-M170)</option>
                                    <option value="5">Área 5 (M171-M190)</option>
                                </select>
                            )}
                        </div>

                        {/* Botones de Exportar e Imprimir Vale */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <Btn
                                variant="secondary"
                                onClick={handlePrint}
                                style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <span>🖨️</span> {activeTab === 'PICKING' ? 'Imprimir Vale para Depósito' : 'Imprimir Plan para Mecánicos'}
                            </Btn>
                            <Btn
                                variant="secondary"
                                onClick={handleExportExcel}
                                style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <span>📥</span> Exportar a Excel
                            </Btn>
                        </div>
                    </div>

                    {/* VISTA CONTENIDO IMPRIMIBLE & EN PANTALLA */}
                    <div className="printable-content">
                        {/* Cabecera solo visible al imprimir */}
                        <div style={{ display: 'none' }} className="only-print">
                            <h2 style={{ margin: '0 0 4px 0' }}>
                                {activeTab === 'PICKING'
                                    ? 'VALE DE PICKING Y ABASTECIMIENTO DE HILADOS — DEPÓSITO'
                                    : 'PLAN DE CAMBIOS DE MÁQUINA Y HILADOS ENTRANTES — PLANTA'}
                            </h2>
                            <p style={{ margin: '0 0 12px 0', fontSize: '12px' }}>
                                Planilla Fecha: {activePlanilla.fechas?.join(', ') || 'Hoy'} | Generado el: {new Date().toLocaleString('es-AR')}
                            </p>
                        </div>

                        {/* =========================================================================
                            TAB 1: TABLA DE ABASTECIMIENTO & ZONA DE PICKING
                        ========================================================================= */}
                        {activeTab === 'PICKING' && (
                            <Card style={{ padding: '0px', overflow: 'hidden', border: '1px solid var(--border-color, #2a2d3e)' }}>
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #2a2d3e)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#f3f4f6' }}>
                                            🧶 Hilados Requeridos para la Producción ({filteredPicking.length})
                                        </h3>
                                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                            Informe directo para armar la zona de picking de tejeduría con los conos y kilos necesarios
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                        Total a consumir hoy: <strong style={{ color: '#f3f4f6' }}>{statsPicking.totalKilosConsumo} kg</strong>
                                    </div>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color, #2a2d3e)', color: '#9ca3af' }}>
                                                <th style={{ padding: '12px 16px' }}>Estado Cobertura</th>
                                                <th style={{ padding: '12px 16px' }}>Código Hilado</th>
                                                <th style={{ padding: '12px 16px' }}>Descripción / Tono</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Consumo Día</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Stock en Picking</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Stock Reserva</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', color: '#f59e0b' }}>A Bajar a Picking</th>
                                                <th style={{ padding: '12px 16px' }}>Posición Rack</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Máquinas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPicking.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af' }}>
                                                        No se encontraron hilados con los filtros seleccionados.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredPicking.map((item: any, idx: number) => {
                                                    const esCritico = item.estadoAbastecimiento === 'CRITICO_COMPRAR' || (item.aComprarKg || 0) > 0;
                                                    const esBajar = item.estadoAbastecimiento === 'BAJAR_A_PICKING' || (item.aPasarAPickingKg || 0) > 0;

                                                    return (
                                                        <tr
                                                            key={item.codigoMaterial + idx}
                                                            style={{
                                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                                background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                                                            }}
                                                        >
                                                            {/* Estado */}
                                                            <td style={{ padding: '12px 16px' }}>
                                                                {esCritico ? (
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#ef4444', fontWeight: 700, fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                                                                        🚨 Faltante ({item.aComprarKg || 0} kg)
                                                                    </span>
                                                                ) : esBajar ? (
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#f59e0b', fontWeight: 700, fontSize: '11px', background: 'rgba(245, 158, 11, 0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                                                                        ⚡ Bajar a Picking
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#10b981', fontWeight: 700, fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                                                                        🟢 En Picking OK
                                                                    </span>
                                                                )}
                                                            </td>

                                                            {/* Código */}
                                                            <td style={{ padding: '12px 16px', fontWeight: 700, color: '#f3f4f6' }}>
                                                                {item.codigoMaterial}
                                                            </td>

                                                            {/* Descripción */}
                                                            <td style={{ padding: '12px 16px' }}>
                                                                <div style={{ color: '#d1d5db', fontWeight: 500 }}>
                                                                    {item.descripcionMaterial}
                                                                </div>
                                                                {(item.tono || item.colorNombre) && (
                                                                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                                                        Tono: {item.tono || item.colorNombre}
                                                                    </div>
                                                                )}
                                                            </td>

                                                            {/* Consumo Día */}
                                                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#f3f4f6' }}>
                                                                {item.consumoDiaKg} kg
                                                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>~{item.conosNecesarios} conos</div>
                                                            </td>

                                                            {/* Stock en Picking */}
                                                            <td style={{ padding: '12px 16px', textAlign: 'right', color: item.stockEnPickingKg >= item.consumoDiaKg ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                                                                {item.stockEnPickingKg} kg
                                                            </td>

                                                            {/* Stock en Reserva */}
                                                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#9ca3af' }}>
                                                                {item.stockEnReservaKg} kg
                                                            </td>

                                                            {/* A Pasar a Picking */}
                                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                                {esBajar ? (
                                                                    <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '14px' }}>
                                                                        +{item.aPasarAPickingKg} kg
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ color: '#6b7280' }}>-</span>
                                                                )}
                                                            </td>

                                                            {/* Posición Picking */}
                                                            <td style={{ padding: '12px 16px' }}>
                                                                {item.posicionesPickingSugeridas && item.posicionesPickingSugeridas.length > 0 ? (
                                                                    <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                                                        {item.posicionesPickingSugeridas.join(', ')}
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ color: '#6b7280', fontSize: '11px' }}>Zona Picking</span>
                                                                )}
                                                            </td>

                                                            {/* Máquinas */}
                                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                                                    {item.maquinasCount || (item.maquinas ? item.maquinas.length : 0)} máq.
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}

                        {/* =========================================================================
                            TAB 2: MATRIZ DE CAMBIOS DE MÁQUINA & HILADOS ENTRANTES
                        ========================================================================= */}
                        {activeTab === 'CAMBIOS' && (
                            <Card style={{ padding: '0px', overflow: 'hidden', border: '1px solid var(--border-color, #2a2d3e)' }}>
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #2a2d3e)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#f3f4f6' }}>
                                            🔄 Cambios Programados ({filteredCambios.length})
                                        </h3>
                                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                            Qué artículo sale, qué artículo entra, qué hilado llevar a pie de máquina y tiempo promedio según historial de Marina
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#a78bfa' }}>
                                        ⏱️ Tiempo total de parada: <strong>{statsCambios.horasParada} horas</strong> ({statsCambios.minutosParada} min)
                                    </div>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color, #2a2d3e)', color: '#9ca3af' }}>
                                                <th style={{ padding: '12px 16px' }}>Máquina #</th>
                                                <th style={{ padding: '12px 16px' }}>Área</th>
                                                <th style={{ padding: '12px 16px' }}>Tipo de Cambio</th>
                                                <th style={{ padding: '12px 16px' }}>Artículo Saliente</th>
                                                <th style={{ padding: '12px 16px' }}>➔ Artículo Entrante</th>
                                                <th style={{ padding: '12px 16px' }}>Hilados a Llevar a Pie de Máquina</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Tiempo Estimado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCambios.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af' }}>
                                                        No se registran cambios programados con los filtros seleccionados.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredCambios.map((c: any, idx: number) => (
                                                    <tr
                                                        key={`m-${c.maquina}-${idx}`}
                                                        style={{
                                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                            background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                                                        }}
                                                    >
                                                        {/* Máquina */}
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <span style={{
                                                                background: '#6366f1',
                                                                color: '#ffffff',
                                                                fontWeight: 800,
                                                                padding: '4px 10px',
                                                                borderRadius: '6px',
                                                                fontSize: '13px',
                                                                display: 'inline-block',
                                                            }}>
                                                                M{c.maquina}
                                                            </span>
                                                        </td>

                                                        {/* Área */}
                                                        <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '12px' }}>
                                                            {c.area}
                                                        </td>

                                                        {/* Tipo de Cambio */}
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <span style={{
                                                                background: 'rgba(167, 139, 250, 0.15)',
                                                                color: '#a78bfa',
                                                                fontWeight: 700,
                                                                fontSize: '11px',
                                                                padding: '3px 8px',
                                                                borderRadius: '6px',
                                                                textTransform: 'uppercase',
                                                            }}>
                                                                {c.tipoCambio}
                                                            </span>
                                                        </td>

                                                        {/* Artículo Saliente */}
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <div style={{ color: '#9ca3af', fontSize: '12px', textDecoration: 'line-through' }}>
                                                                {c.saliente.codigo}
                                                            </div>
                                                            <div style={{ color: '#6b7280', fontSize: '11px' }}>
                                                                {c.saliente.descripcion} ({c.saliente.talle})
                                                            </div>
                                                        </td>

                                                        {/* Artículo Entrante */}
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <div style={{ color: '#10b981', fontWeight: 800, fontSize: '13px' }}>
                                                                ➔ {c.entrante.codigo}
                                                            </div>
                                                            <div style={{ color: '#d1d5db', fontSize: '11px', marginTop: '2px' }}>
                                                                {c.entrante.descripcion} • Talle: <strong>{c.entrante.talle}</strong>
                                                            </div>
                                                        </td>

                                                        {/* Hilados a Llevar a Pie de Máquina */}
                                                        <td style={{ padding: '12px 16px' }}>
                                                            {c.hiladosEntrantes && c.hiladosEntrantes.length > 0 ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                    {c.hiladosEntrantes.map((h: any, hIdx: number) => (
                                                                        <div key={hIdx} style={{ fontSize: '11px', color: '#d1d5db', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                            <span style={{ color: '#38bdf8' }}>🧶</span>
                                                                            <span style={{ fontWeight: 600 }}>{h.codigo}</span>
                                                                            <span style={{ color: '#9ca3af' }}>({h.descripcion})</span>
                                                                            <span style={{ color: '#f59e0b', fontWeight: 700 }}>~{h.conosEstimados} conos</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: '#6b7280', fontSize: '11px' }}>
                                                                    Hilados estándar sin cambio especial
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Tiempo Estimado (Marina) */}
                                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                            <div style={{ fontWeight: 800, color: '#f3f4f6', fontSize: '14px' }}>
                                                                ⏱️ {c.tiempoFormateado}
                                                            </div>
                                                            <div style={{ fontSize: '10px', marginTop: '2px' }}>
                                                                {c.fuenteTiempo === 'MARINA' ? (
                                                                    <span style={{ color: '#a78bfa', background: 'rgba(167, 139, 250, 0.1)', padding: '1px 5px', borderRadius: '4px' }}>
                                                                        Histórico Marina ({c.muestrasMarina} reg.)
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ color: '#9ca3af' }}>Estimado base</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
