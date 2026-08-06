import React, { useState, useEffect, useMemo } from 'react';
import { 
    useGetAvailabilityDashboardQuery,
    useGetPlantsQuery,
    useGetMachineTypesQuery
} from '../../entities/maintenance/api/maintenance.api';
import { PageHeader, Card, Btn, Select, Spinner, useIsMobile, Input } from '../../shared/ui';
import './DisponibilidadMaquinaPage.css';

const getStatusColor = (status: string) => {
    const s = status?.toUpperCase() || '';
    if (s === 'ACTIVA') return '#10b981';
    if (['REVISAR', 'VELOCIDAD_REDUCIDA'].includes(s)) return '#f59e0b';
    if (['MUESTRAS', 'FALTA_COSTURA'].includes(s)) return '#0ea5e9';
    return '#ef4444';
};

const getAvailabilityColor = (pct: number) => {
    if (pct >= 90) return '#10b981';
    if (pct >= 75) return '#f59e0b';
    return '#ef4444';
};

const formatMs = (ms: number) => {
    if (!ms) return '0h 0m';
    const totalMins = Math.floor(ms / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h}h ${m}m`;
};

const CircularGauge = ({ value, size = 160, strokeWidth = 12, label = '' }: any) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - ((value || 0) / 100) * circumference;
    const color = getAvailabilityColor(value || 0);

    return (
        <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="disponibilidad-gauge-svg" style={{ color }}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
                    strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.3s ease', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                />
            </svg>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: size * 0.22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                    {(value || 0).toFixed(1)}%
                </span>
                {label && <span style={{ fontSize: size * 0.08, color: 'var(--text-muted)', marginTop: 4 }}>{label}</span>}
            </div>
        </div>
    );
};

const MiniLineChart = ({ data, width = '100%', height = 200 }: any) => {
    if (!data || data.length === 0) return null;
    
    const vbW = 1000;
    const vbH = 100;
    const padding = 10;
    const effectiveH = vbH - padding * 2;
    const minVal = 0;
    const maxVal = 100;
    
    const points = data.map((d: any, i: number) => {
        const x = padding + (i / (data.length - 1 || 1)) * (vbW - padding * 2);
        const y = vbH - padding - ((d.availability - minVal) / (maxVal - minVal)) * effectiveH;
        return `${x},${y}`;
    }).join(' ');
    
    const areaPath = `M ${padding},${vbH - padding} L ${points} L ${vbW - padding},${vbH - padding} Z`;
    const thresholdY = vbH - padding - ((90 - minVal) / (maxVal - minVal)) * effectiveH;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${vbW} ${vbH}`} preserveAspectRatio="none">
            <defs>
                <linearGradient id="trend-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0"/>
                </linearGradient>
            </defs>
            <line x1={0} y1={thresholdY} x2={vbW} y2={thresholdY} stroke="rgba(16, 185, 129, 0.4)" strokeWidth={1} strokeDasharray="4 4" />
            <text x={0} y={thresholdY - 3} fill="rgba(16, 185, 129, 0.8)" fontSize="4" fontWeight="600">90%</text>
            <path d={areaPath} className="disponibilidad-trend-area" />
            <polyline points={points} className="disponibilidad-trend-line" />
            {data.map((d: any, i: number) => {
                const x = padding + (i / (data.length - 1 || 1)) * (vbW - padding * 2);
                const y = vbH - padding - ((d.availability - minVal) / (maxVal - minVal)) * effectiveH;
                return (
                    <g key={i}>
                        <circle cx={x} cy={y} r="2" fill="#fff" stroke="#6366f1" strokeWidth={1} />
                        <title>{d.date}: {d.availability.toFixed(1)}%</title>
                    </g>
                );
            })}
        </svg>
    );
};

export default function DisponibilidadMaquinaPage() {
    const isMobile = useIsMobile();
    
    const { data: plants } = useGetPlantsQuery();
    const { data: types } = useGetMachineTypesQuery();
    
    const [selectedPlantId, setSelectedPlantId] = useState<string>('');
    const [selectedTypeId, setSelectedTypeId] = useState<string>('');
    const [period, setPeriod] = useState<string>('month');
    
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailSortField, setDetailSortField] = useState<string>('number');
    const [detailSortDir, setDetailSortDir] = useState<'asc' | 'desc'>('asc');
    const [detailSearch, setDetailSearch] = useState('');
    
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

    const startDate = useMemo(() => {
        const now = new Date();
        let d: Date;
        if (period === '24h') d = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        else if (period === 'week') d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        else d = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, [period]);

    const endDate = useMemo(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    const { data, isLoading, isFetching } = useGetAvailabilityDashboardQuery({
        plantId: selectedPlantId,
        typeId: selectedTypeId,
        startDate,
        endDate
    }, { skip: !selectedPlantId });

    const handleSort = (field: string) => {
        if (detailSortField === field) {
            setDetailSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setDetailSortField(field);
            setDetailSortDir('asc');
        }
    };

    const filteredMachines = useMemo(() => {
        if (!data?.machines) return [];
        let list = [...data.machines];
        if (detailSearch) {
            const s = detailSearch.toLowerCase();
            list = list.filter((m: any) => m.number.toString().includes(s) || m.nombre.toLowerCase().includes(s));
        }
        list.sort((a: any, b: any) => {
            let valA = a[detailSortField];
            let valB = b[detailSortField];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA < valB) return detailSortDir === 'asc' ? -1 : 1;
            if (valA > valB) return detailSortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return list;
    }, [data, detailSearch, detailSortField, detailSortDir]);

    if (!plants || !types) return <div style={{ padding: 40 }}><Spinner /></div>;

    const summary = data?.summary || { 
        avgAvailabilityPeriod: '0%', avgAvailability24h: '0%', avgAvailabilityMonth: '0%', 
        totalStopsNovedades: 0, totalChanges: 0, activeMachines: 0, totalMachines: 0,
        avgStopDurationFormatted: '0h', avgChangeDurationFormatted: '0h'
    };
    const avgAvailNum = parseFloat((summary as any).avgAvailabilityPeriod || summary.avgAvailability24h) || 0;
    const periodLabel = period === '24h' ? 'Promedio 24h' : period === 'week' ? 'Promedio Semana' : 'Promedio Mes';

    return (
        <div className="disponibilidad-container">
            <PageHeader title="Disponibilidad de Máquinas" subtitle="Dashboard Ejecutivo de Producción y Mantenimiento">
                <div className="disponibilidad-filters">
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
                            { value: '24h', label: 'Últimas 24h' },
                            { value: 'week', label: 'Esta Semana' },
                            { value: 'month', label: 'Mes Actual' }
                        ]}
                        value={period} onChange={setPeriod} style={{ width: 180 }}
                    />
                    {isFetching && <Spinner size={20} />}
                </div>
            </PageHeader>

            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
            ) : !data ? (
                <div>No hay datos disponibles</div>
            ) : (
                <>
                    {/* ROW 2: Key Metrics Cards */}
                    <div className="disponibilidad-grid-4">
                        <Card className="disponibilidad-card" style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <div className="disponibilidad-card-title">Disponibilidad General</div>
                            <CircularGauge value={avgAvailNum} size={140} label={periodLabel} />
                        </Card>
                        
                        <Card className="disponibilidad-card">
                            <div className="disponibilidad-card-title">⚠️ Paradas por Novedades</div>
                            <div className="disponibilidad-metric-value">{summary.totalStopsNovedades}</div>
                            <div className="disponibilidad-metric-sub">Tiempo Promedio: {summary.avgStopDurationFormatted}</div>
                        </Card>
                        
                        <Card className="disponibilidad-card">
                            <div className="disponibilidad-card-title">🔄 Cambios de Artículo</div>
                            <div className="disponibilidad-metric-value">{summary.totalChanges}</div>
                            <div className="disponibilidad-metric-sub">Tiempo Promedio: {summary.avgChangeDurationFormatted}</div>
                        </Card>
                        
                        <Card className="disponibilidad-card" style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <div className="disponibilidad-card-title">🏭 Máquinas Activas</div>
                            <CircularGauge 
                                value={summary.totalMachines > 0 ? (summary.activeMachines / summary.totalMachines) * 100 : 0} 
                                size={120} strokeWidth={8} label={`${summary.activeMachines} / ${summary.totalMachines}`} 
                            />
                        </Card>
                    </div>

                    {/* ROW 3: Daily Trend & By Shift */}
                    <div className="disponibilidad-grid-2">
                        <Card className="disponibilidad-card">
                            <div className="disponibilidad-card-title">📈 Tendencia Diaria ({periodLabel})</div>
                            <div className="disponibilidad-chart-container">
                                <MiniLineChart data={data.dailyTrend} height="100%" />
                            </div>
                        </Card>

                        <Card className="disponibilidad-card">
                            <div className="disponibilidad-card-title">⏱️ Disponibilidad por Turno</div>
                            <div className="disponibilidad-shift-container">
                                <div className="disponibilidad-shift-col">
                                    <div className="disponibilidad-shift-icon">☀️</div>
                                    <div style={{ fontWeight: 800, fontSize: 24, color: getAvailabilityColor(data.byShift.day.availability) }}>
                                        {data.byShift.day.availability.toFixed(1)}%
                                    </div>
                                    <div className="disponibilidad-shift-stats">
                                        {data.byShift.day.stops} paradas<br/>
                                        {data.byShift.day.changes} cambios
                                    </div>
                                </div>
                                <div style={{ width: 1, height: '80%', background: 'var(--border-color)' }}></div>
                                <div className="disponibilidad-shift-col">
                                    <div className="disponibilidad-shift-icon">🌙</div>
                                    <div style={{ fontWeight: 800, fontSize: 24, color: getAvailabilityColor(data.byShift.night.availability) }}>
                                        {data.byShift.night.availability.toFixed(1)}%
                                    </div>
                                    <div className="disponibilidad-shift-stats">
                                        {data.byShift.night.stops} paradas<br/>
                                        {data.byShift.night.changes} cambios
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* ROW 4: Top Problematic & Top Performers */}
                    <div className="disponibilidad-grid-2">
                        <Card className="disponibilidad-card">
                            <div className="disponibilidad-card-title">🔴 Top 5 Problemáticas ({periodLabel})</div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                {data.topProblematic.map((m: any) => (
                                    <div key={m.machineId} className="disponibilidad-bar-row">
                                        <div className="disponibilidad-bar-label" title={m.nombre}>#{m.number}</div>
                                        <div className="disponibilidad-bar-track">
                                            <div className="disponibilidad-bar-fill" style={{ width: `${m.availability24h}%`, background: getAvailabilityColor(m.availability24h) }}></div>
                                        </div>
                                        <div className="disponibilidad-bar-value" style={{ color: getAvailabilityColor(m.availability24h) }}>
                                            {m.availability24h.toFixed(1)}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <Card className="disponibilidad-card">
                            <div className="disponibilidad-card-title">🟢 Top 5 Mejor Rendimiento ({periodLabel})</div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                {data.topPerformers.map((m: any) => (
                                    <div key={m.machineId} className="disponibilidad-bar-row">
                                        <div className="disponibilidad-bar-label" title={m.nombre}>#{m.number}</div>
                                        <div className="disponibilidad-bar-track">
                                            <div className="disponibilidad-bar-fill" style={{ width: `${m.availability24h}%`, background: getAvailabilityColor(m.availability24h) }}></div>
                                        </div>
                                        <div className="disponibilidad-bar-value" style={{ color: getAvailabilityColor(m.availability24h) }}>
                                            {m.availability24h.toFixed(1)}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* ROW 5: Heatmap Grid */}
                    <Card className="disponibilidad-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="disponibilidad-card-title" style={{ marginBottom: 0 }}>📊 Vista General de Máquinas ({periodLabel})</div>
                            <Btn onClick={() => setShowDetailModal(true)} small>Ver Detalle Completo</Btn>
                        </div>
                        <div className="disponibilidad-heatmap">
                            {[...data.machines].sort((a, b) => a.number - b.number).map((m: any) => {
                                const avail = m.availability ?? m.availability24h;
                                return (
                                    <div 
                                        key={m.machineId} 
                                        className="disponibilidad-heat-node" 
                                        style={{ background: getAvailabilityColor(avail) }}
                                        title={`Máquina ${m.number}: ${avail.toFixed(1)}% (${m.currentStatus})`}
                                        onClick={() => {
                                            setDetailSearch(m.number.toString());
                                            setShowDetailModal(true);
                                        }}
                                    >
                                        {m.number}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </>
            )}

            {/* Detail Modal */}
            {showDetailModal && (
                <div className="disponibilidad-modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="disponibilidad-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="disponibilidad-modal-header">
                            <h2 style={{ margin: 0, fontSize: 20 }}>Detalle de Disponibilidad</h2>
                            <Btn variant="secondary" onClick={() => setShowDetailModal(false)}>Cerrar</Btn>
                        </div>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 16 }}>
                            <Input value={detailSearch} onChange={setDetailSearch} placeholder="Buscar por número o nombre..." style={{ width: 300 }} />
                        </div>
                        <div className="disponibilidad-modal-body">
                            <table className="disponibilidad-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('number')}># {detailSortField === 'number' && (detailSortDir === 'asc' ? '↑' : '↓')}</th>
                                        <th onClick={() => handleSort('nombre')}>Nombre {detailSortField === 'nombre' && (detailSortDir === 'asc' ? '↑' : '↓')}</th>
                                        <th onClick={() => handleSort('currentStatus')}>Estado {detailSortField === 'currentStatus' && (detailSortDir === 'asc' ? '↑' : '↓')}</th>
                                        <th onClick={() => handleSort('availability')}>Disp. Período {detailSortField === 'availability' && (detailSortDir === 'asc' ? '↑' : '↓')}</th>
                                        <th onClick={() => handleSort('availability24h')}>Disp. 24h {detailSortField === 'availability24h' && (detailSortDir === 'asc' ? '↑' : '↓')}</th>
                                        <th onClick={() => handleSort('availabilityMonth')}>Disp. Mes {detailSortField === 'availabilityMonth' && (detailSortDir === 'asc' ? '↑' : '↓')}</th>
                                        <th onClick={() => handleSort('failureCount')}>Paradas {detailSortField === 'failureCount' && (detailSortDir === 'asc' ? '↑' : '↓')}</th>
                                        <th onClick={() => handleSort('changeCount')}>Cambios {detailSortField === 'changeCount' && (detailSortDir === 'asc' ? '↑' : '↓')}</th>
                                        <th onClick={() => handleSort('totalDowntimeMs')}>Downtime {detailSortField === 'totalDowntimeMs' && (detailSortDir === 'asc' ? '↑' : '↓')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMachines.map((m: any) => {
                                        const avail = m.availability ?? m.availability24h;
                                        return (
                                            <tr key={m.machineId}>
                                                <td style={{ fontWeight: 'bold' }}>{m.number}</td>
                                                <td>{m.nombre}</td>
                                                <td>
                                                    <span className="disponibilidad-badge" style={{ background: getStatusColor(m.currentStatus) + '33', color: getStatusColor(m.currentStatus) }}>
                                                        {m.currentStatus.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{ color: getAvailabilityColor(avail), fontWeight: 700 }}>
                                                        {avail.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{ color: getAvailabilityColor(m.availability24h), fontWeight: 700 }}>
                                                        {m.availability24h.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{ color: getAvailabilityColor(m.availabilityMonth), fontWeight: 700 }}>
                                                        {m.availabilityMonth.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td>{m.failureCount}</td>
                                                <td>{m.changeCount}</td>
                                                <td>{formatMs(m.totalDowntimeMs)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
