import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Chip, Fade, Collapse, Button, IconButton } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Spinner, Select } from '../../../shared/ui';
import { useGetLogsQuery, useGetPlantsQuery } from '../api/maintenance.api';


// ─── Helpers ────────────────────────────────────────────────────────
const ACTIVE_STATUSES = ['ACTIVA', 'REVISAR', 'VELOCIDAD_REDUCIDA', 'FALTA_COSTURA'];
const isActive = (s: string) => ACTIVE_STATUSES.includes(s);

function isInShift(timestamp: string, shiftStart: string, shiftEnd: string): boolean {
    const d = new Date(timestamp);
    const timeStr = d.toLocaleTimeString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const time = parseInt(timeStr.replace(':', ''));
    const start = parseInt(shiftStart.replace(':', ''));
    const end = parseInt(shiftEnd.replace(':', ''));
    if (start <= end) return time >= start && time < end;
    return time >= start || time < end;
}

function fmtDur(ms: number): string {
    const m = Math.floor(ms / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
}

interface ShiftData {
    total: number;
    stops: number;
    repairs: number;
    uniqueStopped: number;
    uniqueRepaired: number;
    rate: number;
    unresolved: number;
    avgRepairMs: number;
    faults: Record<string, number>;
    mechanics: Record<string, { stops: number; repairs: number }>;
    machines: Record<string, { num: number; stops: number; repairs: number }>;
}

function analyze(logs: any[], s: string, e: string): ShiftData {
    const sl = logs.filter((l: any) => isInShift(l.timestamp, s, e));
    const stopped = sl.filter((l: any) => !isActive(l.toStatus));
    const repaired = sl.filter((l: any) => !isActive(l.fromStatus) && isActive(l.toStatus));

    const faults: Record<string, number> = {};
    const mechanics: Record<string, { stops: number; repairs: number }> = {};
    const machines: Record<string, { num: number; stops: number; repairs: number }> = {};

    for (const l of stopped) {
        const ft = l.failureType || 'Sin Asignar';
        faults[ft] = (faults[ft] || 0) + 1;
        const by = l.generatedBy || 'Sin Asignar';
        if (!mechanics[by]) mechanics[by] = { stops: 0, repairs: 0 };
        mechanics[by].stops++;
        const mid = l.machineId;
        if (!machines[mid]) machines[mid] = { num: l.machine?.number || 0, stops: 0, repairs: 0 };
        machines[mid].stops++;
    }
    for (const l of repaired) {
        const by = l.generatedBy || 'Sin Asignar';
        if (!mechanics[by]) mechanics[by] = { stops: 0, repairs: 0 };
        mechanics[by].repairs++;
        const mid = l.machineId;
        if (!machines[mid]) machines[mid] = { num: l.machine?.number || 0, stops: 0, repairs: 0 };
        machines[mid].repairs++;
    }

    let repMs = 0, repC = 0;
    for (const l of stopped) {
        if (l.isResolved && l.durationMs > 0) {
            repMs += l.durationMs;
            repC++;
        }
    }

    return {
        total: sl.length,
        stops: stopped.length,
        repairs: repaired.length,
        uniqueStopped: new Set(stopped.map((l: any) => l.machineId)).size,
        uniqueRepaired: new Set(repaired.map((l: any) => l.machineId)).size,
        rate: stopped.length > 0 ? (repaired.length / stopped.length) * 100 : 100,
        unresolved: Math.max(0, stopped.length - repaired.length),
        avgRepairMs: repC > 0 ? repMs / repC : 0,
        faults, mechanics, machines,
    };
}

// ─── Mini Components (dashboard style) ──────────────────────────────

const StatBox = ({ label, dayVal, nightVal, fmt = 'n', invert }: {
    label: string; dayVal: number; nightVal: number; fmt?: 'n' | '%' | 'dur'; invert?: boolean;
}) => {
    const f = (v: number) => fmt === '%' ? `${v.toFixed(0)}%` : fmt === 'dur' ? fmtDur(v) : String(v);
    const dayW = invert ? dayVal < nightVal : dayVal > nightVal;
    const nightW = invert ? nightVal < dayVal : nightVal > dayVal;
    return (
        <Box sx={{
            flex: '1 1 0', minWidth: 130, p: 1.5, borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' }
        }}>
            <Typography sx={{ color: '#4b5563', fontWeight: 800, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
                {label}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', gap: 1 }}>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '0.5rem', color: '#eab308', fontWeight: 700 }}>☀️</Typography>
                    <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: dayW ? '#10b981' : nightW ? '#ef4444' : '#fff', lineHeight: 1 }}>
                        {f(dayVal)}
                    </Typography>
                </Box>
                <Box sx={{ width: '1px', bgcolor: 'rgba(255,255,255,0.06)' }} />
                <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '0.5rem', color: '#818cf8', fontWeight: 700 }}>🌙</Typography>
                    <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: nightW ? '#10b981' : dayW ? '#ef4444' : '#fff', lineHeight: 1 }}>
                        {f(nightVal)}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

// ═══════════════════════════════════════════════════════════════════════
export default function InformeTurnosPage() {
    const navigate = useNavigate();

    const [period, setPeriod] = useState<'7' | '15' | '30'>('15');
    const [plantFilter, setPlantFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [tab, setTab] = useState<'resumen' | 'fallas' | 'mecanicos' | 'maquinas'>('resumen');

    const DAY_START = '06:00';
    const DAY_END = '18:00';

    const dateRange = useMemo(() => {
        const days = parseInt(period);
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        
        const formatLocalDate = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };
        
        return { startDate: formatLocalDate(start), endDate: formatLocalDate(end) };
    }, [period]);

    const { data: plants = [] } = useGetPlantsQuery();
    const { data: logs = [], isLoading } = useGetLogsQuery({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        plantId: plantFilter || undefined,
    });

    const { day, night } = useMemo(() => {
        if (!logs?.length) {
            const z: ShiftData = { total: 0, stops: 0, repairs: 0, uniqueStopped: 0, uniqueRepaired: 0, rate: 100, unresolved: 0, avgRepairMs: 0, faults: {}, mechanics: {}, machines: {} };
            return { day: z, night: z };
        }
        return { day: analyze(logs, DAY_START, DAY_END), night: analyze(logs, DAY_END, DAY_START) };
    }, [logs]);

    const toggleSidebar = () => document.dispatchEvent(new CustomEvent('open-sidebar-menu'));

    const plantOptions = useMemo(() => [
        { value: '', label: 'Todas' },
        ...plants.map((p: any) => ({ value: p.id, label: p.name }))
    ], [plants]);

    // Chart data
    const barData = [
        { name: 'Paradas', '☀️ Día': day.stops, '🌙 Noche': night.stops },
        { name: 'Reparaciones', '☀️ Día': day.repairs, '🌙 Noche': night.repairs },
        { name: 'Sin resolver', '☀️ Día': day.unresolved, '🌙 Noche': night.unresolved },
    ];

    const donutDay = [
        { name: 'Resueltas', value: day.repairs, fill: '#10b981' },
        { name: 'Pendientes', value: day.unresolved, fill: '#374151' },
    ];
    const donutNight = [
        { name: 'Resueltas', value: night.repairs, fill: '#10b981' },
        { name: 'Pendientes', value: night.unresolved, fill: '#374151' },
    ];

    // Top faults
    const allFaults = new Set([...Object.keys(day.faults), ...Object.keys(night.faults)]);
    const faultRows = Array.from(allFaults)
        .map(ft => ({ ft, d: day.faults[ft] || 0, n: night.faults[ft] || 0, t: (day.faults[ft] || 0) + (night.faults[ft] || 0) }))
        .sort((a, b) => b.t - a.t).slice(0, 10);

    // Mechanics
    const allMechs = new Set([...Object.keys(day.mechanics), ...Object.keys(night.mechanics)]);
    const mechRows = Array.from(allMechs)
        .map(name => ({
            name,
            ds: day.mechanics[name]?.stops || 0, dr: day.mechanics[name]?.repairs || 0,
            ns: night.mechanics[name]?.stops || 0, nr: night.mechanics[name]?.repairs || 0,
        }))
        .sort((a, b) => (b.dr + b.nr) - (a.dr + a.nr));

    // Machines
    const allMach = new Set([...Object.keys(day.machines), ...Object.keys(night.machines)]);
    const machRows = Array.from(allMach)
        .map(id => {
            const d = day.machines[id] || { num: 0, stops: 0, repairs: 0 };
            const n = night.machines[id] || { num: 0, stops: 0, repairs: 0 };
            return { id, num: d.num || n.num, ds: d.stops, dr: d.repairs, ns: n.stops, nr: n.repairs, t: d.stops + n.stops };
        })
        .sort((a, b) => b.t - a.t).slice(0, 15);

    // Row style helper
    const thStyle: React.CSSProperties = { padding: '6px 8px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#4b5563', textAlign: 'left', borderBottom: '1px solid #1f2937' };
    const tdStyle = (i: number): React.CSSProperties => ({ padding: '6px 8px', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.03)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' });

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
                <Spinner />
                <Typography sx={{ 
                    color: '#9ca3af', 
                    fontSize: '0.9rem', 
                    fontWeight: 600,
                    animation: 'pulse 1.5s ease-in-out infinite',
                    '@keyframes pulse': {
                        '0%, 100%': { opacity: 0.6 },
                        '50%': { opacity: 1 }
                    }
                }}>
                    Descargando datos de turnos e informes...
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 0, maxWidth: '1400px', margin: '0 auto', color: 'white', pb: 10 }}>

            {/* ── Top Bar (dashboard style) ── */}
            <Box sx={{
                display: 'flex', alignItems: 'center', p: 1,
                bgcolor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
                <IconButton size="medium" onClick={toggleSidebar} sx={{ color: '#6b7280', mr: 1 }}>
                    <MoreVertIcon />
                </IconButton>

                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{ color: '#eab308', fontWeight: 900, fontSize: '1.4rem', lineHeight: 1 }}>
                            {day.stops}
                        </Typography>
                        <Typography sx={{ color: '#4b5563', fontWeight: 800, fontSize: '0.5rem', textTransform: 'uppercase' }}>☀️ Paradas Día</Typography>
                    </Box>
                    <Box sx={{ width: '1px', bgcolor: 'rgba(255,255,255,0.1)' }} />
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{ color: '#818cf8', fontWeight: 900, fontSize: '1.4rem', lineHeight: 1 }}>
                            {night.stops}
                        </Typography>
                        <Typography sx={{ color: '#4b5563', fontWeight: 800, fontSize: '0.5rem', textTransform: 'uppercase' }}>🌙 Paradas Noche</Typography>
                    </Box>
                    <Box sx={{ width: '1px', bgcolor: 'rgba(255,255,255,0.1)' }} />
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{
                            color: night.rate < 50 ? '#ef4444' : '#10b981',
                            fontWeight: 900, fontSize: '1.4rem', lineHeight: 1
                        }}>
                            {night.rate.toFixed(0)}%
                        </Typography>
                        <Typography sx={{ color: '#4b5563', fontWeight: 800, fontSize: '0.5rem', textTransform: 'uppercase' }}>🌙 Resolución</Typography>
                    </Box>
                </Box>

                <IconButton size="medium" onClick={() => setShowFilters(!showFilters)} sx={{ color: showFilters ? '#10b981' : '#6b7280', ml: 1 }}>
                    <FilterListIcon />
                </IconButton>
            </Box>

            {/* ── Filters (collapsible) ── */}
            <Collapse in={showFilters}>
                <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {(['7', '15', '30'] as const).map(p => (
                            <Button
                                key={p} size="small"
                                variant={period === p ? 'contained' : 'outlined'}
                                onClick={() => setPeriod(p)}
                                sx={{
                                    fontSize: '0.65rem', fontWeight: 800, minWidth: 'auto', px: 1.2,
                                    bgcolor: period === p ? '#6366f1' : 'transparent',
                                    borderColor: '#374151', color: period === p ? '#fff' : '#6b7280',
                                }}
                            >
                                {p}d
                            </Button>
                        ))}
                    </Box>
                    <Select label="Planta" value={plantFilter} onChange={setPlantFilter} options={plantOptions} style={{ minWidth: 140 }} />
                    <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                        <Chip label={`☀️ ${DAY_START}–${DAY_END}`} size="small" sx={{ bgcolor: 'rgba(234,179,8,0.1)', color: '#eab308', fontWeight: 700, fontSize: '0.65rem' }} />
                        <Chip label={`🌙 ${DAY_END}–${DAY_START}`} size="small" sx={{ bgcolor: 'rgba(129,140,248,0.1)', color: '#818cf8', fontWeight: 700, fontSize: '0.65rem' }} />
                    </Box>
                </Box>
            </Collapse>

            {/* ── Executive Summary (inline, no card overhead) ── */}
            {night.unresolved > 0 && (
                <Box sx={{ px: 2, py: 1.5, bgcolor: 'rgba(239,68,68,0.06)', borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
                    <Typography sx={{ color: '#d1d5db', fontSize: '0.8rem', lineHeight: 1.6 }}>
                        ⚠️ En los últimos <strong>{period} días</strong>, el turno noche acumuló <strong style={{ color: '#ef4444' }}>{night.unresolved} paradas sin resolver</strong> que
                        el turno día tuvo que absorber. Tasa de resolución nocturna: <strong style={{ color: night.rate < 50 ? '#ef4444' : '#10b981' }}>{night.rate.toFixed(0)}%</strong> vs
                        diurna: <strong style={{ color: day.rate < 50 ? '#ef4444' : '#10b981' }}>{day.rate.toFixed(0)}%</strong>.
                    </Typography>
                </Box>
            )}

            {/* ── KPI Strip (horizontal scrollable) ── */}
            <Box sx={{
                display: 'flex', overflowX: 'auto', gap: 1, p: 1.5,
                '&::-webkit-scrollbar': { display: 'none' }, msOverflowStyle: 'none', scrollbarWidth: 'none'
            }}>
                <StatBox label="Paradas" dayVal={day.stops} nightVal={night.stops} invert />
                <StatBox label="Máq. Paradas" dayVal={day.uniqueStopped} nightVal={night.uniqueStopped} invert />
                <StatBox label="Reparaciones" dayVal={day.repairs} nightVal={night.repairs} />
                <StatBox label="Resolución" dayVal={day.rate} nightVal={night.rate} fmt="%" />
                <StatBox label="Sin Resolver" dayVal={day.unresolved} nightVal={night.unresolved} invert />
                <StatBox label="T. Medio Rep." dayVal={day.avgRepairMs} nightVal={night.avgRepairMs} fmt="dur" invert />
            </Box>

            {/* ── Tab Navigation ── */}
            <Box sx={{
                display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', px: 1,
            }}>
                {([
                    { id: 'resumen' as const, label: '📊 Resumen' },
                    { id: 'fallas' as const, label: '🔧 Fallas' },
                    { id: 'mecanicos' as const, label: '👷 Mecánicos' },
                    { id: 'maquinas' as const, label: '⚙️ Máquinas' },
                ]).map(t => (
                    <Box
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        sx={{
                            px: 2, py: 1.2, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800,
                            color: tab === t.id ? '#a5b4fc' : '#4b5563',
                            borderBottom: tab === t.id ? '2px solid #6366f1' : '2px solid transparent',
                            transition: 'all 0.15s', textTransform: 'uppercase', letterSpacing: '0.05em',
                            '&:hover': { color: '#9ca3af' },
                        }}
                    >
                        {t.label}
                    </Box>
                ))}
            </Box>

            {/* ── Tab Content ── */}
            <Fade in timeout={200}>
                <Box sx={{ p: 2 }}>

                    {/* RESUMEN */}
                    {tab === 'resumen' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Bar Chart */}
                            <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, p: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: '#6b7280', mb: 1.5, textTransform: 'uppercase' }}>
                                    Comparativa General
                                </Typography>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={barData} barGap={4} barCategoryGap="25%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#1f2937' }} />
                                        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#1f2937' }} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#f3f4f6', fontSize: '11px' }} />
                                        <Bar dataKey="☀️ Día" fill="#eab308" radius={[3, 3, 0, 0]} />
                                        <Bar dataKey="🌙 Noche" fill="#818cf8" radius={[3, 3, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>

                            {/* Donut Charts */}
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                {[
                                    { label: '☀️ Resolución Día', data: donutDay, rate: day.rate },
                                    { label: '🌙 Resolución Noche', data: donutNight, rate: night.rate },
                                ].map(({ label, data, rate }) => (
                                    <Box key={label} sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, p: 2, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                        <Typography sx={{ fontWeight: 800, fontSize: '0.7rem', color: '#6b7280', mb: 1, textTransform: 'uppercase' }}>{label}</Typography>
                                        <ResponsiveContainer width="100%" height={110}>
                                            <PieChart>
                                                <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={45} paddingAngle={3} strokeWidth={0}>
                                                    {data.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <Typography sx={{ fontWeight: 900, fontSize: '1.3rem', color: rate >= 50 ? '#10b981' : '#ef4444', mt: -1 }}>
                                            {rate.toFixed(0)}%
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* FALLAS */}
                    {tab === 'fallas' && (
                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            {faultRows.length === 0 ? (
                                <Box sx={{ p: 6, textAlign: 'center' }}>
                                    <Typography sx={{ color: '#374151', fontWeight: 800 }}>SIN DATOS DE FALLAS</Typography>
                                </Box>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={thStyle}>Tipo de Falla</th>
                                            <th style={{ ...thStyle, textAlign: 'center', color: '#eab308' }}>☀️ Día</th>
                                            <th style={{ ...thStyle, textAlign: 'center', color: '#818cf8' }}>🌙 Noche</th>
                                            <th style={{ ...thStyle, textAlign: 'center' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {faultRows.map((r, i) => (
                                            <tr key={r.ft}>
                                                <td style={{ ...tdStyle(i), color: '#d1d5db' }}>{r.ft}</td>
                                                <td style={{ ...tdStyle(i), color: '#eab308', textAlign: 'center', fontWeight: 800 }}>{r.d}</td>
                                                <td style={{ ...tdStyle(i), color: '#818cf8', textAlign: 'center', fontWeight: 800 }}>{r.n}</td>
                                                <td style={{ ...tdStyle(i), color: '#6b7280', textAlign: 'center' }}>{r.t}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </Box>
                    )}

                    {/* MECÁNICOS */}
                    {tab === 'mecanicos' && (
                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            {mechRows.length === 0 ? (
                                <Box sx={{ p: 6, textAlign: 'center' }}>
                                    <Typography sx={{ color: '#374151', fontWeight: 800 }}>SIN DATOS</Typography>
                                </Box>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={thStyle}>Mecánico</th>
                                            <th style={{ ...thStyle, textAlign: 'center', color: '#eab308' }}>☀️ Paró</th>
                                            <th style={{ ...thStyle, textAlign: 'center', color: '#10b981' }}>☀️ Reparó</th>
                                            <th style={{ ...thStyle, textAlign: 'center', color: '#818cf8' }}>🌙 Paró</th>
                                            <th style={{ ...thStyle, textAlign: 'center', color: '#10b981' }}>🌙 Reparó</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mechRows.map((r, i) => (
                                            <tr key={r.name}>
                                                <td style={{ ...tdStyle(i), color: '#d1d5db' }}>{r.name}</td>
                                                <td style={{ ...tdStyle(i), color: '#eab308', textAlign: 'center', fontWeight: 800 }}>{r.ds}</td>
                                                <td style={{ ...tdStyle(i), color: '#10b981', textAlign: 'center', fontWeight: 800 }}>{r.dr}</td>
                                                <td style={{ ...tdStyle(i), color: '#818cf8', textAlign: 'center', fontWeight: 800 }}>{r.ns}</td>
                                                <td style={{ ...tdStyle(i), color: '#10b981', textAlign: 'center', fontWeight: 800 }}>{r.nr}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </Box>
                    )}

                    {/* MÁQUINAS */}
                    {tab === 'maquinas' && (
                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            {machRows.length === 0 ? (
                                <Box sx={{ p: 6, textAlign: 'center' }}>
                                    <Typography sx={{ color: '#374151', fontWeight: 800 }}>SIN DATOS</Typography>
                                </Box>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={thStyle}>Máquina</th>
                                            <th style={{ ...thStyle, textAlign: 'center', color: '#eab308' }}>☀️ Par.</th>
                                            <th style={{ ...thStyle, textAlign: 'center', color: '#10b981' }}>☀️ Rep.</th>
                                            <th style={{ ...thStyle, textAlign: 'center', color: '#818cf8' }}>🌙 Par.</th>
                                            <th style={{ ...thStyle, textAlign: 'center', color: '#10b981' }}>🌙 Rep.</th>
                                            <th style={{ ...thStyle, textAlign: 'center' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {machRows.map((r, i) => (
                                            <tr key={r.id}>
                                                <td style={tdStyle(i)}>
                                                    <span
                                                        onClick={() => navigate('/mantenimiento/historial', { state: { machineNumber: r.num } })}
                                                        style={{ color: '#3b82f6', fontWeight: 900, cursor: 'pointer' }}
                                                    >
                                                        MÁQ {r.num}
                                                    </span>
                                                </td>
                                                <td style={{ ...tdStyle(i), color: '#eab308', textAlign: 'center', fontWeight: 800 }}>{r.ds}</td>
                                                <td style={{ ...tdStyle(i), color: '#10b981', textAlign: 'center', fontWeight: 800 }}>{r.dr}</td>
                                                <td style={{ ...tdStyle(i), color: '#818cf8', textAlign: 'center', fontWeight: 800 }}>{r.ns}</td>
                                                <td style={{ ...tdStyle(i), color: '#10b981', textAlign: 'center', fontWeight: 800 }}>{r.nr}</td>
                                                <td style={{ ...tdStyle(i), color: '#6b7280', textAlign: 'center', fontWeight: 800 }}>{r.t}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </Box>
                    )}

                </Box>
            </Fade>
        </Box>
    );
}
