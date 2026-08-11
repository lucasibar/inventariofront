import { useState, useEffect, useMemo } from 'react';
import { 
    useGetAvailabilityTimelineQuery,
    useGetPlantsQuery,
    useGetMachineTypesQuery
} from '../../entities/maintenance/api/maintenance.api';
import { PageHeader, Card, Select, Spinner, Input } from '../../shared/ui';
import './DisponibilidadMaquinaV2Page.css';

const getStatusColor = (status: string) => {
    const s = status?.toUpperCase() || '';
    if (s === 'ACTIVA') return '#10b981';
    if (['REVISAR', 'VELOCIDAD_REDUCIDA', 'FALTA_COSTURA', 'MUESTRAS'].includes(s)) return '#f59e0b';
    return '#ef4444';
};

const getAvailabilityColor = (pct: number) => {
    if (pct >= 90) return '#10b981';
    if (pct >= 75) return '#f59e0b';
    return '#ef4444';
};

export default function DisponibilidadMaquinaV2Page() {
    const { data: plants } = useGetPlantsQuery();
    const { data: types } = useGetMachineTypesQuery();

    const [selectedPlantId, setSelectedPlantId] = useState<string>('');
    const [selectedTypeId, setSelectedTypeId] = useState<string>('');
    const [period, setPeriod] = useState<string>('24h');
    const [searchFilter, setSearchFilter] = useState<string>('');

    useEffect(() => {
        if (plants?.length && !selectedPlantId) {
            setSelectedPlantId(plants[0].id);
        }
    }, [plants, selectedPlantId]);

    useEffect(() => {
        if (types?.length && !selectedTypeId) {
            const tej = types.find((t: any) => t.name.toLowerCase().includes('tejedur'));
            if (tej) setSelectedTypeId(tej.id);
            else setSelectedTypeId(types[0].id);
        }
    }, [types, selectedTypeId]);

    const { data, isLoading, isFetching } = useGetAvailabilityTimelineQuery({
        plantId: selectedPlantId,
        typeId: selectedTypeId,
        period
    }, { skip: !selectedPlantId });

    const summary = data?.summary || {
        totalMachines: 0, activeMachines: 0, stoppedMachines: 0, avgAvailability: "0%",
        totalUptimeFormatted: "0h 0m", totalNovedadesFormatted: "0h 0m",
        totalChangesFormatted: "0h 0m", totalReducedFormatted: "0h 0m", totalNoDataFormatted: "0h 0m"
    };

    const periodLabel = period === '24h' ? 'Últimas 24 horas' 
        : period === 'week' ? 'Última Semana (7 días)' 
        : period === 'fortnight' ? 'Última Quincena (15 días)' 
        : 'Mes Actual';

    const filteredMachines = useMemo(() => {
        if (!data?.machines) return [];
        let list = [...data.machines];

        if (searchFilter.trim()) {
            const q = searchFilter.toLowerCase().trim();
            list = list.filter((m: any) => 
                m.number.toString().includes(q) || m.nombre.toLowerCase().includes(q)
            );
        }

        // Sort: Machines with non-pure-active time (Reducida, Parada, Cambio) at top,
        // ordered from highest non-active/affected time to lowest.
        // 100% pure active machines at the bottom, ordered by machine number ASC.
        return list.sort((a: any, b: any) => {
            const nonPureA = (a.stats?.reducedMs || 0) + (a.stats?.downtimeNovedadesMs || 0) + (a.stats?.downtimeChangesMs || 0);
            const nonPureB = (b.stats?.reducedMs || 0) + (b.stats?.downtimeNovedadesMs || 0) + (b.stats?.downtimeChangesMs || 0);

            if (nonPureA !== nonPureB) {
                return nonPureB - nonPureA; // Highest non-active/affected time first
            }
            return a.number - b.number; // Tie-breaker by machine number ASC
        });
    }, [data, searchFilter]);

    if (!plants || !types) return <div style={{ padding: 40 }}><Spinner /></div>;

    return (
        <div className="disponibilidad-v2-container">
            <PageHeader title="Disponibilidad de Máquinas - Vista Timeline (V2)" subtitle="Línea de tiempo detallada por máquina">
                <div className="disponibilidad-v2-filters">
                    <Select
                        options={plants.map((p: any) => ({ value: p.id, label: p.name }))}
                        value={selectedPlantId} onChange={setSelectedPlantId} style={{ width: 180 }}
                    />
                    <Select
                        options={types.map((t: any) => ({ value: t.id, label: t.name }))}
                        value={selectedTypeId} onChange={setSelectedTypeId} style={{ width: 180 }}
                    />
                    <Select
                        options={[
                            { value: '24h', label: '⏱️ Últimas 24h' },
                            { value: 'week', label: '📅 Última Semana' },
                            { value: 'fortnight', label: '🗓️ Quincena (15d)' },
                            { value: 'month', label: '📊 Mes Actual' }
                        ]}
                        value={period} onChange={setPeriod} style={{ width: 180 }}
                    />
                    <Input 
                        value={searchFilter} 
                        onChange={setSearchFilter} 
                        placeholder="Buscar máquina..." 
                        style={{ width: 160 }} 
                    />
                    {isFetching && <Spinner size="20px" />}
                </div>
            </PageHeader>

            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
            ) : !data ? (
                <div>No hay datos disponibles</div>
            ) : (
                <>
                    {/* Top Summary Metrics */}
                    <div className="disponibilidad-v2-grid-metrics">
                        <div className="disponibilidad-v2-metric-card">
                            <div className="disponibilidad-v2-metric-title">📊 Disponibilidad General</div>
                            <div className="disponibilidad-v2-metric-value" style={{ color: getAvailabilityColor(parseFloat(summary.avgAvailability) || 0) }}>
                                {summary.avgAvailability}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{periodLabel}</div>
                        </div>

                        <div className="disponibilidad-v2-metric-card">
                            <div className="disponibilidad-v2-metric-title">🟢 Activa (100%)</div>
                            <div className="disponibilidad-v2-metric-value" style={{ color: '#10b981' }}>
                                {summary.totalUptimeFormatted}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total acumulado</div>
                        </div>

                        <div className="disponibilidad-v2-metric-card">
                            <div className="disponibilidad-v2-metric-title">🟠 Activa Parcial / Muestras</div>
                            <div className="disponibilidad-v2-metric-value" style={{ color: '#f59e0b' }}>
                                {summary.totalReducedFormatted}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rev / Vel. Reducida / Costura</div>
                        </div>

                        <div className="disponibilidad-v2-metric-card">
                            <div className="disponibilidad-v2-metric-title">🔴 Parada (Novedades)</div>
                            <div className="disponibilidad-v2-metric-value" style={{ color: '#ef4444' }}>
                                {summary.totalNovedadesFormatted}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fallas / Repuestos / Elec.</div>
                        </div>

                        <div className="disponibilidad-v2-metric-card">
                            <div className="disponibilidad-v2-metric-title">🟣 Cambio de Artículo</div>
                            <div className="disponibilidad-v2-metric-value" style={{ color: '#8b5cf6' }}>
                                {summary.totalChangesFormatted}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Formatos / Color / Talle</div>
                        </div>

                        <div className="disponibilidad-v2-metric-card">
                            <div className="disponibilidad-v2-metric-title">🔘 Sin Registro / Datos</div>
                            <div className="disponibilidad-v2-metric-value" style={{ color: '#9ca3af' }}>
                                {summary.totalNoDataFormatted}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tiempo pre-registro</div>
                        </div>
                    </div>

                    {/* Color Legend Bar */}
                    <div className="disponibilidad-v2-legend">
                        <span style={{ fontWeight: 700, fontSize: 13 }}>Referencias de Color:</span>
                        <div className="disponibilidad-v2-legend-item">
                            <div className="disponibilidad-v2-dot" style={{ background: '#10b981' }}></div>
                            <span>Verde: Activa (100%)</span>
                        </div>
                        <div className="disponibilidad-v2-legend-item">
                            <div className="disponibilidad-v2-dot" style={{ background: '#f59e0b' }}></div>
                            <span>Naranja: Estado Activo Parcial (Revisar / Vel. Reducida / Muestras)</span>
                        </div>
                        <div className="disponibilidad-v2-legend-item">
                            <div className="disponibilidad-v2-dot" style={{ background: '#ef4444' }}></div>
                            <span>Rojo: Parada (Falla / Novedades)</span>
                        </div>
                        <div className="disponibilidad-v2-legend-item">
                            <div className="disponibilidad-v2-dot" style={{ background: '#8b5cf6' }}></div>
                            <span>Morado: En Cambio de Artículo</span>
                        </div>
                        <div className="disponibilidad-v2-legend-item">
                            <div className="disponibilidad-v2-dot" style={{ background: '#4b5563' }}></div>
                            <span>Gris: Sin Datos / Fuera de Registro</span>
                        </div>
                        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                            línea azul vertical = <strong>Cambio de turno</strong>
                        </div>
                    </div>

                    {/* Main Timeline Table */}
                    <Card className="disponibilidad-v2-timeline-card">
                        {/* Timeline Header (Time ticks + Shift markers) */}
                        <div className="disponibilidad-v2-timeline-header">
                            <div className="disponibilidad-v2-machine-label-header">Máquina</div>
                            <div className="disponibilidad-v2-track-header">
                                {data.timeMarkers?.map((tm: any, i: number) => (
                                    <div key={i} className="disponibilidad-v2-time-tick" style={{ left: `${tm.pct}%` }}>
                                        {tm.label}
                                    </div>
                                ))}

                            </div>
                            <div style={{ width: 220, minWidth: 220, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                                Desglose de Tiempo
                            </div>
                        </div>

                        {/* Machine Rows */}
                        {filteredMachines.map((m: any) => {
                            const availColor = getAvailabilityColor(m.availability);
                            return (
                                <div key={m.machineId} className="disponibilidad-v2-machine-row">
                                    {/* Machine Info */}
                                    <div className="disponibilidad-v2-machine-info">
                                        <div className="disponibilidad-v2-machine-num">
                                            <span>#{m.number}</span>
                                            <span 
                                                className="disponibilidad-v2-avail-badge" 
                                                style={{ background: availColor + '22', color: availColor }}
                                            >
                                                {m.availability.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            {m.nombre} • <span style={{ color: getStatusColor(m.currentStatus) }}>{m.currentStatus.replace('_', ' ')}</span>
                                        </div>
                                    </div>

                                    {/* Timeline Track Container */}
                                    <div className="disponibilidad-v2-timeline-track-container">
                                        {/* Shift Marker Lines */}
                                        {data.shiftMarkers?.map((sm: any, i: number) => (
                                            <div key={i} className="disponibilidad-v2-shift-line" style={{ left: `${sm.pct}%` }} />
                                        ))}

                                        {/* Timeline Segments */}
                                        {m.segments?.map((seg: any, idx: number) => {
                                            const widthPct = Math.max(0.4, seg.endPct - seg.startPct);
                                            const segClass = seg.type === 'active' ? 'disponibilidad-v2-seg-active'
                                                : seg.type === 'reduced' ? 'disponibilidad-v2-seg-reduced'
                                                : seg.type === 'stopped' ? 'disponibilidad-v2-seg-stopped'
                                                : seg.type === 'change' ? 'disponibilidad-v2-seg-change'
                                                : 'disponibilidad-v2-seg-nodata';

                                            const tooltipText = `${seg.label} (${seg.durationFormatted})\nDuración: ${seg.durationFormatted}${seg.observation ? '\nNota: ' + seg.observation : ''}`;

                                            return (
                                                <div 
                                                    key={idx}
                                                    className={`disponibilidad-v2-segment ${segClass}`}
                                                    style={{ left: `${seg.startPct}%`, width: `${widthPct}%` }}
                                                    title={tooltipText}
                                                />
                                            );
                                        })}
                                    </div>

                                    {/* Right Side Stats Breakdown */}
                                    <div className="disponibilidad-v2-row-stats">
                                        <div className="disponibilidad-v2-row-stat-line">
                                            <span>🟢 Activa:</span>
                                            <span style={{ fontWeight: 700, color: '#10b981' }}>{m.stats.uptimeFormatted}</span>
                                        </div>
                                        {m.stats.downtimeNovedadesMs > 0 && (
                                            <div className="disponibilidad-v2-row-stat-line">
                                                <span>🔴 Paradas:</span>
                                                <span style={{ fontWeight: 700, color: '#ef4444' }}>{m.stats.downtimeNovedadesFormatted}</span>
                                            </div>
                                        )}
                                        {m.stats.downtimeChangesMs > 0 && (
                                            <div className="disponibilidad-v2-row-stat-line">
                                                <span>🟣 Cambios:</span>
                                                <span style={{ fontWeight: 700, color: '#8b5cf6' }}>{m.stats.downtimeChangesFormatted}</span>
                                            </div>
                                        )}
                                        {m.stats.reducedMs > 0 && (
                                            <div className="disponibilidad-v2-row-stat-line">
                                                <span>🟠 Reducida:</span>
                                                <span style={{ fontWeight: 700, color: '#f59e0b' }}>{m.stats.reducedFormatted}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </Card>
                </>
            )}
        </div>
    );
}
