import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Btn, Badge, Spinner, useIsMobile } from '../../shared/ui';
import {
    useGetUltimaPlanillaProduccionQuery,
    useListarPlanillasProduccionQuery,
    useLazyGetPlanillaProduccionByIdQuery,
} from '../../features/quality/ordenes-produccion/api/ordenesProduccion.api';
import type { ProduccionParseResult } from '../../features/quality/ordenes-produccion/types/ordenesProduccion.types';

export default function InformeCambiosDiaPage() {
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    const { data: ultimaPlanilla, isLoading: loadingUltima } = useGetUltimaPlanillaProduccionQuery();
    const { data: historialPlanillas = [] } = useListarPlanillasProduccionQuery();
    const [fetchPlanillaById] = useLazyGetPlanillaProduccionByIdQuery();

    const [selectedPlanilla, setSelectedPlanilla] = useState<ProduccionParseResult | null>(null);
    const activePlanilla = selectedPlanilla || ultimaPlanilla;

    const [searchTerm, setSearchTerm] = useState('');
    const [tipoCambioFiltro, setTipoCambioFiltro] = useState('ALL');

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

    // Extraer todas las máquinas con cambio programado
    const cambios = useMemo(() => {
        if (!activePlanilla || !activePlanilla.maquinas) return [];

        const list = activePlanilla.maquinas.filter((m) => m.hasChangeover);

        // Agrupar o dar formato claro
        return list.filter((m) => {
            if (tipoCambioFiltro !== 'ALL' && m.changeoverType !== tipoCambioFiltro) return false;

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const matchMach = String(m.machine).includes(term);
                const matchArt = (m.articleCode || m.articleRaw || '').toLowerCase().includes(term);
                const matchType = (m.changeoverType || '').toLowerCase().includes(term);
                const matchArea = (m.area || '').toLowerCase().includes(term);
                if (!matchMach && !matchArt && !matchType && !matchArea) return false;
            }

            return true;
        });
    }, [activePlanilla, tipoCambioFiltro, searchTerm]);

    // Tipos de cambio disponibles en la planilla
    const tiposDeCambio = useMemo(() => {
        if (!activePlanilla || !activePlanilla.maquinas) return [];
        const set = new Set<string>();
        activePlanilla.maquinas.forEach((m) => {
            if (m.changeoverType) set.add(m.changeoverType);
        });
        return Array.from(set);
    }, [activePlanilla]);

    // Métricas totales de parada por cambios
    const minutosTotalesParada = useMemo(() => {
        return cambios.reduce((acc, m) => acc + (m.changeoverDurationMinutes || 60), 0);
    }, [cambios]);

    const horasTotalesParada = useMemo(() => {
        return Math.round((minutosTotalesParada / 60) * 10) / 10;
    }, [minutosTotalesParada]);

    if (loadingUltima && !activePlanilla) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#9ca3af' }}>
                <Spinner /> <span style={{ marginLeft: '12px' }}>Cargando informe de cambios del día...</span>
            </div>
        );
    }

    return (
        <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '1600px', margin: '0 auto' }}>
            {/* Encabezado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <PageHeader
                    title="🔄 Informe de Cambios de Máquina del Día"
                    subtitle="Control de paradas por cambios programados a las 08:00 AM: en qué máquinas, qué tipo de cambio es y tiempo estimado de duración"
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
                            }}
                        >
                            <option value="">📅 Última producción del día (Default)</option>
                            {historialPlanillas.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                    {p.fecha} ({new Date(p.creado_en).toLocaleDateString('es-AR')})
                                </option>
                            ))}
                        </select>
                    </div>

                    <Btn variant="secondary" onClick={() => navigate('/produccion/informe-tejeduria')}>
                        ⚙️ Ver Plan de Tejeduría ↗️
                    </Btn>
                    <Btn variant="secondary" onClick={() => navigate('/produccion/planificacion')}>
                        ← Carga de PDFs
                    </Btn>
                </div>
            </div>

            {/* Tarjetas de Resumen KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                <Card style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
                        🔄 Total de Cambios de Máquina
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b', marginTop: '6px' }}>
                        {cambios.length} cambios
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        Programados a las 08:00 AM y entre turnos
                    </div>
                </Card>

                <Card style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                    <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>
                        ⏱️ Tiempo Total Estimado de Parada
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#ef4444', marginTop: '6px' }}>
                        {horasTotalesParada} horas
                    </div>
                    <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px' }}>
                        ({minutosTotalesParada} minutos acumulados entre todas las máquinas)
                    </div>
                </Card>

                <Card style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                    <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>
                        ⚙️ Promedio por Cambio
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#60a5fa', marginTop: '6px' }}>
                        {cambios.length > 0 ? Math.round(minutosTotalesParada / cambios.length) : 0} min
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        Tiempo estándar según matriz de cambios de Marina
                    </div>
                </Card>

                <Card style={{ padding: '16px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                    <div style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase' }}>
                        📅 Planilla de Producción
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#f3f4f6', marginTop: '6px' }}>
                        {activePlanilla?.fechas?.[0] || 'Día actual'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        Impactado en cálculo de producción neta
                    </div>
                </Card>
            </div>

            {/* TABLA DETALLADA DE CAMBIOS */}
            <Card style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f3f4f6' }}>
                            📋 Listado de Cambios Programados ({cambios.length})
                        </h3>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                            Datos cronometrados de cambios de artículo, talle y configuración mecánica
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            placeholder="Buscar máquina o artículo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '7px 12px',
                                background: '#1a1d2e',
                                border: '1px solid #2a2d3e',
                                borderRadius: '8px',
                                color: '#f3f4f6',
                                fontSize: '12px',
                                minWidth: '220px',
                                outline: 'none',
                            }}
                        />

                        {tiposDeCambio.length > 0 && (
                            <select
                                value={tipoCambioFiltro}
                                onChange={(e) => setTipoCambioFiltro(e.target.value)}
                                style={{
                                    padding: '7px 12px',
                                    background: '#1a1d2e',
                                    border: '1px solid #2a2d3e',
                                    borderRadius: '8px',
                                    color: '#f3f4f6',
                                    fontSize: '12px',
                                    outline: 'none',
                                }}
                            >
                                <option value="ALL">Todos los tipos de cambio</option>
                                {tiposDeCambio.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                                <th style={{ padding: '10px' }}>Máquina #</th>
                                <th style={{ padding: '10px' }}>Área / Ubicación</th>
                                <th style={{ padding: '10px' }}>Horario Programado</th>
                                <th style={{ padding: '10px' }}>Tipo de Cambio</th>
                                <th style={{ padding: '10px' }}>Artículo Saliente / Entrante</th>
                                <th style={{ padding: '10px' }}>Talle / Variante</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Tiempo Estimado</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Horas de Tejido Restantes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cambios.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af' }}>
                                        No se registran cambios programados para esta producción o con los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                cambios.map((m, idx) => {
                                    const duracion = m.changeoverDurationMinutes || 60;
                                    const tipoLabel = m.changeoverType || 'Cambio de Artículo';

                                    return (
                                        <tr
                                            key={`${m.machine}_${idx}`}
                                            style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                transition: 'background-color 0.15s',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                            <td style={{ padding: '12px 10px', fontWeight: 800, color: '#f59e0b', fontSize: '15px' }}>
                                                #{m.machine}
                                                {m.machineTypeName && (
                                                    <span style={{ display: 'block', fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>
                                                        {m.machineTypeName}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 10px', color: '#d1d5db' }}>
                                                Área {m.area || '—'}
                                            </td>
                                            <td style={{ padding: '12px 10px', color: '#60a5fa', fontWeight: 600 }}>
                                                {m.horarioTexto || '08:00 AM (Cambio de Turno)'}
                                            </td>
                                            <td style={{ padding: '12px 10px' }}>
                                                <Badge color="#f59e0b">{tipoLabel}</Badge>
                                            </td>
                                            <td style={{ padding: '12px 10px', color: '#f3f4f6', maxWidth: '320px' }}>
                                                <div style={{ fontWeight: 700, color: '#93c5fd' }}>
                                                    {m.articleCode || m.articleRaw}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                                    {m.descRaw || m.matchedArticle?.descripcion || '—'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 10px', color: '#d1d5db' }}>
                                                <div>Talle: <span style={{ fontWeight: 600, color: '#ffffff' }}>{m.talle || '—'}</span></div>
                                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>{m.colorRaw || '—'}</div>
                                            </td>
                                            <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800, color: '#ef4444', fontSize: '14px' }}>
                                                ⏱️ {duracion} min
                                            </td>
                                            <td style={{ padding: '12px 10px', textAlign: 'right', color: '#34d399', fontWeight: 700 }}>
                                                {m.netHours ? `${m.netHours.toFixed(1)} h` : '11.0 h'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
