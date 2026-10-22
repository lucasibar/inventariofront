import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Btn, Badge, Spinner, useIsMobile } from '../../shared/ui';
import {
    useGetUltimaPlanillaProduccionQuery,
    useListarPlanillasProduccionQuery,
    useLazyGetPlanillaProduccionByIdQuery,
} from '../../features/quality/ordenes-produccion/api/ordenesProduccion.api';
import type { ProduccionParseResult } from '../../features/quality/ordenes-produccion/types/ordenesProduccion.types';

export default function InformeTejeduriaPage() {
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    const { data: ultimaPlanilla, isLoading: loadingUltima } = useGetUltimaPlanillaProduccionQuery();
    const { data: historialPlanillas = [] } = useListarPlanillasProduccionQuery();
    const [fetchPlanillaById] = useLazyGetPlanillaProduccionByIdQuery();

    const [selectedPlanilla, setSelectedPlanilla] = useState<ProduccionParseResult | null>(null);
    const activePlanilla = selectedPlanilla || ultimaPlanilla;

    const [searchTerm, setSearchTerm] = useState('');
    const [areaFilter, setAreaFilter] = useState('ALL');
    const [shiftFilter, setShiftFilter] = useState('ALL');

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

    // Áreas y turnos únicos
    const areas = useMemo(() => {
        if (!activePlanilla || !activePlanilla.maquinas) return [];
        return Array.from(new Set(activePlanilla.maquinas.map((m) => m.area).filter(Boolean))).sort();
    }, [activePlanilla]);

    // Filtrar máquinas
    const maquinasFiltradas = useMemo(() => {
        if (!activePlanilla || !activePlanilla.maquinas) return [];

        return activePlanilla.maquinas.filter((m) => {
            if (areaFilter !== 'ALL' && m.area !== areaFilter) return false;
            if (shiftFilter !== 'ALL' && m.shift !== shiftFilter) return false;

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const matchMach = String(m.machine).includes(term);
                const matchArt = (m.articleCode || m.articleRaw || '').toLowerCase().includes(term);
                const matchDesc = (m.descRaw || m.matchedArticle?.descripcion || '').toLowerCase().includes(term);
                const matchSusi = (m.matchedArticle?.codigoSusi || '').toLowerCase().includes(term);
                const matchColor = (m.colorRaw || '').toLowerCase().includes(term);
                if (!matchMach && !matchArt && !matchDesc && !matchSusi && !matchColor) return false;
            }

            return true;
        });
    }, [activePlanilla, areaFilter, shiftFilter, searchTerm]);

    // KPIs calculados
    const totalParesEstimados = useMemo(() => {
        return maquinasFiltradas.reduce((acc, m) => acc + (m.paresEstimados || 0), 0);
    }, [maquinasFiltradas]);

    const totalDocenasEstimadas = useMemo(() => {
        return Math.round((totalParesEstimados / 12) * 10) / 10;
    }, [totalParesEstimados]);

    const maquinasUnicas = useMemo(() => {
        return new Set(maquinasFiltradas.map((m) => m.machine)).size;
    }, [maquinasFiltradas]);

    const maquinasConCambio = useMemo(() => {
        return maquinasFiltradas.filter((m) => m.hasChangeover).length;
    }, [maquinasFiltradas]);

    if (loadingUltima && !activePlanilla) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#9ca3af' }}>
                <Spinner /> <span style={{ marginLeft: '12px' }}>Cargando plan de tejeduría diario...</span>
            </div>
        );
    }

    return (
        <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '1600px', margin: '0 auto' }}>
            {/* Encabezado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <PageHeader
                    title="⚙️ Plan de Tejeduría y Estimado Diario de Producción"
                    subtitle="Monitoreo máquina por máquina: qué artículo se teje, tiempo de ciclo y producción estimada al final de la jornada"
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

                    <Btn variant="secondary" onClick={() => navigate('/produccion/informe-cambios-dia')}>
                        🔄 Ver Informe de Cambios ↗️
                    </Btn>
                    <Btn variant="secondary" onClick={() => navigate('/produccion/planificacion')}>
                        ← Carga de PDFs
                    </Btn>
                </div>
            </div>

            {/* Tarjetas de Resumen KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                <Card style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                        🧦 Producción Estimada al Final del Día
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
                        {totalParesEstimados.toLocaleString('es-AR')} pares
                    </div>
                    <div style={{ fontSize: '12px', color: '#6ee7b7', marginTop: '4px', fontWeight: 600 }}>
                        {totalDocenasEstimadas.toLocaleString('es-AR')} docenas estimadas
                    </div>
                </Card>

                <Card style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                    <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>
                        🏭 Máquinas Activas en Tejeduría
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#60a5fa', marginTop: '6px' }}>
                        {maquinasUnicas} tejedoras
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        {maquinasFiltradas.length} asignaciones totales registradas
                    </div>
                </Card>

                <Card style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
                        🔄 Cambios de Máquina Programados
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b', marginTop: '6px' }}>
                        {maquinasConCambio} cambios
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        Tiempos netos ya descontados de la estimación diaria
                    </div>
                </Card>

                <Card style={{ padding: '16px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                    <div style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase' }}>
                        📅 Fecha de Planificación
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#f3f4f6', marginTop: '6px' }}>
                        {activePlanilla?.fechas?.[0] || 'Día actual'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        {activePlanilla?.archivosProcesados?.length || 0} archivos de órdenes procesados
                    </div>
                </Card>
            </div>

            {/* TABLA DE PLAN DE TEJEDURÍA */}
            <Card style={{ padding: '20px' }}>
                {/* Filtros */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f3f4f6' }}>
                            📋 Distribución de Tejido por Máquina ({maquinasFiltradas.length})
                        </h3>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                            Estimación basada en tiempo de ciclo cronometrado y horas netas de trabajo
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            placeholder="Buscar máquina, artículo, código..."
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

                        {areas.length > 0 && (
                            <select
                                value={areaFilter}
                                onChange={(e) => setAreaFilter(e.target.value)}
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
                                <option value="ALL">Todas las Áreas</option>
                                {areas.map((a) => (
                                    <option key={a} value={a}>
                                        Área {a}
                                    </option>
                                ))}
                            </select>
                        )}

                        <select
                            value={shiftFilter}
                            onChange={(e) => setShiftFilter(e.target.value)}
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
                            <option value="ALL">Todos los Turnos</option>
                            <option value="M">Mañana (06:00 - 18:00)</option>
                            <option value="N">Noche (18:00 - 06:00)</option>
                        </select>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                                <th style={{ padding: '10px' }}>Máquina #</th>
                                <th style={{ padding: '10px' }}>Área / Turno</th>
                                <th style={{ padding: '10px' }}>Artículo a Tejer</th>
                                <th style={{ padding: '10px' }}>Código SUSI</th>
                                <th style={{ padding: '10px' }}>Talle / Color</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>Cambio 08:00 AM</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Tiempo de Ciclo</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Horas Netas</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Pares Estimados</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Docenas Estimadas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {maquinasFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af' }}>
                                        No se encontraron máquinas asignadas con los filtros aplicados.
                                    </td>
                                </tr>
                            ) : (
                                maquinasFiltradas.map((m, idx) => {
                                    const artCode = m.articleCode || m.articleRaw;
                                    const artDesc = m.descRaw || m.matchedArticle?.descripcion || '—';
                                    const susiCode = m.matchedArticle?.codigoSusi || m.articleRaw;
                                    const pares = m.paresEstimados || 0;
                                    const docenas = m.docenasEstimadas || Math.round((pares / 12) * 10) / 10;

                                    return (
                                        <tr
                                            key={`${m.machine}_${m.shift}_${idx}`}
                                            style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                transition: 'background-color 0.15s',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                            <td style={{ padding: '12px 10px', fontWeight: 800, color: '#60a5fa', fontSize: '15px' }}>
                                                #{m.machine}
                                                {m.machineTypeName && (
                                                    <span style={{ display: 'block', fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>
                                                        {m.machineTypeName}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 10px', color: '#d1d5db' }}>
                                                <div>Área {m.area || '—'}</div>
                                                <div style={{ fontSize: '11px', color: m.shift === 'M' ? '#fbbf24' : '#818cf8', fontWeight: 600 }}>
                                                    Turno {m.shift === 'M' ? '☀️ Mañana' : '🌙 Noche'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 10px', color: '#f3f4f6', maxWidth: '300px' }}>
                                                <div style={{ fontWeight: 700, color: '#93c5fd' }}>{artCode}</div>
                                                <div style={{ fontSize: '12px', color: '#d1d5db' }}>{artDesc}</div>
                                            </td>
                                            <td style={{ padding: '12px 10px', color: '#c4b5fd', fontWeight: 600 }}>
                                                {susiCode || '—'}
                                            </td>
                                            <td style={{ padding: '12px 10px', color: '#d1d5db' }}>
                                                <div>Talle: <span style={{ fontWeight: 600, color: '#ffffff' }}>{m.talle || '—'}</span></div>
                                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>{m.colorRaw || '—'}</div>
                                            </td>
                                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                {m.hasChangeover ? (
                                                    <div style={{ display: 'inline-block', textAlign: 'center' }}>
                                                        <Badge color="#f59e0b">🔄 CAMBIO</Badge>
                                                        {m.changeoverType && (
                                                            <span style={{ display: 'block', fontSize: '10px', color: '#fbbf24', marginTop: '2px' }}>
                                                                {m.changeoverType} (-{m.changeoverDurationMinutes || 60}m)
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#4b5563' }}>—</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 10px', textAlign: 'right', color: '#9ca3af' }}>
                                                {m.cycleTimeSeconds ? `${m.cycleTimeSeconds}s / media` : '—'}
                                            </td>
                                            <td style={{ padding: '12px 10px', textAlign: 'right', color: '#d1d5db', fontWeight: 600 }}>
                                                {m.netHours ? `${m.netHours.toFixed(1)} h` : '12.0 h'}
                                            </td>
                                            <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800, color: '#34d399', fontSize: '14px' }}>
                                                {pares.toLocaleString('es-AR')} pr
                                            </td>
                                            <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800, color: '#10b981', fontSize: '14px' }}>
                                                {docenas.toLocaleString('es-AR')} doc
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
