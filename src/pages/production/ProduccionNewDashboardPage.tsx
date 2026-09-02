import { useMemo, useState } from 'react';
import {
    Alert,
    Box,
    CardActionArea,
    Chip,
    CircularProgress,
    Grid,
    LinearProgress,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useGetProductionDashboardQuery } from '../../entities/production/api/production.api';

type MetricKey = 'availability' | 'production' | 'quality' | 'oee';

const today = () => new Date().toISOString().slice(0, 10);
const pct = (value: number | null) => value === null ? 'Sin datos' : `${value.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`;
const number = (value: number) => value.toLocaleString('es-AR', { maximumFractionDigits: 1 });
const duration = (seconds: number) => {
    const total = Math.max(0, Math.round(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return `${hours}h ${minutes}m ${secs}s`;
};

const metricCopy: Record<MetricKey, { title: string; description: string }> = {
    availability: {
        title: 'Detalle de disponibilidad',
        description: 'Compara los segundos planificados con las paradas registradas y los cambios previstos.',
    },
    production: {
        title: 'Detalle de cumplimiento',
        description: 'Compara medias de primera producidas contra medias de primera planificadas.',
    },
    quality: {
        title: 'Detalle de calidad / FTT',
        description: 'FTT es primera calidad sobre el total producido. El porcentaje de segunda es su pérdida de calidad.',
    },
    oee: {
        title: 'Detalle de OEE',
        description: 'OEE combina disponibilidad, rendimiento contra el tiempo ideal del artículo y calidad.',
    },
};

export default function ProduccionNewDashboardPage() {
    const [date, setDate] = useState(today());
    const [selectedMetric, setSelectedMetric] = useState<MetricKey>('availability');
    const [machineSearch, setMachineSearch] = useState('');
    const { data, isLoading, isFetching, error } = useGetProductionDashboardQuery({ date });

    const machines = useMemo(() => {
        const query = machineSearch.trim().toUpperCase();
        if (!data || !query) return data?.machines ?? [];
        return data.machines.filter((machine) =>
            String(machine.machineNumber).includes(query)
            || String(machine.area ?? '').toUpperCase().includes(query)
            || machine.articleCodes.some((code) => code.toUpperCase().includes(query)),
        );
    }, [data, machineSearch]);

    if (isLoading) {
        return <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
    }

    const summary = data?.summary;
    const cards: Array<{ key: MetricKey; label: string; value: string; sub: string; color: string }> = summary ? [
        {
            key: 'availability',
            label: data?.isFuture ? 'Disponibilidad futura' : 'Disponibilidad real',
            value: data?.isFuture ? duration(summary.futureAvailableSeconds) : pct(summary.availabilityPct),
            sub: `${duration(data?.isFuture ? summary.plannedChangeSeconds : summary.downtimeSeconds)} no disponibles`,
            color: '#38bdf8',
        },
        {
            key: 'production',
            label: 'Cumplimiento del plan',
            value: pct(summary.planCompliancePct),
            sub: `${number(summary.actualGoodDozens)} de ${number(summary.plannedGoodDozens)} docenas`,
            color: '#10b981',
        },
        {
            key: 'quality',
            label: 'FTT / Primera pasada',
            value: pct(summary.fttPct),
            sub: `${number(summary.secondSocks)} medias de segunda · ${pct(summary.secondRatePct)}`,
            color: '#a78bfa',
        },
        {
            key: 'oee',
            label: 'OEE',
            value: pct(summary.oeePct),
            sub: `Rendimiento ${pct(summary.performancePct)}`,
            color: '#f59e0b',
        },
    ] : [];

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100vh', color: 'var(--text-primary, #f3f4f6)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 850 }}>Producción · Tejeduría</Typography>
                    <Typography sx={{ color: 'var(--text-muted, #94a3b8)', mt: 0.5 }}>
                        Del sector completo a cada área y máquina, usando programación, producción y paradas reales.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    {isFetching && <CircularProgress size={20} />}
                    <TextField
                        label="Fecha"
                        type="date"
                        size="small"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>No se pudo consultar el tablero de Producción.</Alert>}
            {!data?.schedule && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    No hay una programación guardada para esta fecha. El histórico puede aportar producción real, pero disponibilidad y cumplimiento necesitan la orden diaria.
                </Alert>
            )}
            {data?.schedule && (
                <Alert severity={data.schedule.status === 'DRAFT' ? 'warning' : 'success'} sx={{ mb: 2 }}>
                    Programación {data.schedule.status} · revisión {data.schedule.revision} · {summary?.scheduledMachines ?? 0} máquinas.
                </Alert>
            )}

            <Grid container spacing={2}>
                {cards.map((card) => (
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={card.key}>
                        <Paper sx={{ overflow: 'hidden', background: 'var(--bg-secondary, #171a24)', border: selectedMetric === card.key ? `1px solid ${card.color}` : '1px solid var(--border-color, #2a2d3e)', borderRadius: 3 }}>
                            <CardActionArea onClick={() => setSelectedMetric(card.key)} sx={{ p: 2.5, textAlign: 'left' }}>
                                <Typography sx={{ color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', fontSize: 11, fontWeight: 800 }}>{card.label}</Typography>
                                <Typography variant="h4" sx={{ color: card.color, fontWeight: 850, mt: 1 }}>{card.value}</Typography>
                                <Typography sx={{ color: 'var(--text-muted, #94a3b8)', fontSize: 12, mt: 1 }}>{card.sub}</Typography>
                            </CardActionArea>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {summary && (
                <Paper sx={{ mt: 2, p: 2.5, borderRadius: 3, background: 'var(--bg-secondary, #171a24)', border: '1px solid var(--border-color, #2a2d3e)' }}>
                    <Typography sx={{ fontWeight: 800 }}>{metricCopy[selectedMetric].title}</Typography>
                    <Typography sx={{ color: 'var(--text-muted, #94a3b8)', fontSize: 13, mt: 0.5 }}>{metricCopy[selectedMetric].description}</Typography>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Typography variant="caption" color="text.secondary">Segundos planificados</Typography>
                            <Typography sx={{ fontWeight: 750 }}>{number(summary.plannedSeconds)} s</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Typography variant="caption" color="text.secondary">Segundos disponibles</Typography>
                            <Typography sx={{ fontWeight: 750 }}>{number(data?.isFuture ? summary.futureAvailableSeconds : summary.actualAvailableSeconds)} s</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Typography variant="caption" color="text.secondary">Máquinas detenidas ahora</Typography>
                            <Typography sx={{ fontWeight: 750 }}>{summary.currentlyStoppedMachines}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Typography variant="caption" color="text.secondary">Producción bruta vs plan</Typography>
                            <Typography sx={{ fontWeight: 750 }}>{pct(summary.grossProductionPct)}</Typography>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            <Grid container spacing={2} sx={{ mt: 0 }}>
                <Grid size={{ xs: 12, lg: 7 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 3, height: 390, background: 'var(--bg-secondary, #171a24)', border: '1px solid var(--border-color, #2a2d3e)' }}>
                        <Typography sx={{ fontWeight: 800, mb: 2 }}>Bosque · Comparación por área</Typography>
                        <ResponsiveContainer width="100%" height="88%">
                            <BarChart data={data?.areas ?? []} margin={{ left: 0, right: 10, top: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.15)" />
                                <XAxis dataKey="area" stroke="#94a3b8" />
                                <YAxis domain={[0, 100]} stroke="#94a3b8" />
                                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
                                <Legend />
                                <Bar name="Disponibilidad %" dataKey="availabilityPct" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                                <Bar name="Cumplimiento %" dataKey="planCompliancePct" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar name="FTT %" dataKey="fttPct" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, lg: 5 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 3, height: 390, overflow: 'auto', background: 'var(--bg-secondary, #171a24)', border: '1px solid var(--border-color, #2a2d3e)' }}>
                        <Typography sx={{ fontWeight: 800, mb: 2 }}>Árbol · Estado de las áreas</Typography>
                        {(data?.areas ?? []).map((area) => (
                            <Box key={area.area} sx={{ mb: 2.2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.7 }}>
                                    <Typography sx={{ fontWeight: 700 }}>{area.area}</Typography>
                                    <Typography variant="caption" color="text.secondary">{area.machines} máquinas · FTT {pct(area.fttPct)}</Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min(100, Math.max(0, area.planCompliancePct ?? 0))}
                                    sx={{ height: 8, borderRadius: 5, '& .MuiLinearProgress-bar': { background: '#10b981' } }}
                                />
                                <Typography variant="caption" color="text.secondary">Cumplimiento {pct(area.planCompliancePct)} · Disponibilidad {pct(area.availabilityPct)}</Typography>
                            </Box>
                        ))}
                        {(data?.areas?.length ?? 0) === 0 && <Typography color="text.secondary">Todavía no hay áreas programadas para mostrar.</Typography>}
                    </Paper>
                </Grid>
            </Grid>

            <Paper sx={{ mt: 2, p: 2.5, borderRadius: 3, background: 'var(--bg-secondary, #171a24)', border: '1px solid var(--border-color, #2a2d3e)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <Box>
                        <Typography sx={{ fontWeight: 800 }}>Hoja · Detalle por máquina</Typography>
                        <Typography variant="caption" color="text.secondary">Buscá por número, área o artículo.</Typography>
                    </Box>
                    <TextField size="small" label="Buscar máquina" value={machineSearch} onChange={(event) => setMachineSearch(event.target.value)} />
                </Box>
                <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980, fontSize: 13 }}>
                        <thead>
                            <tr style={{ color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #334155' }}>
                                {['Máquina', 'Área', 'Artículo', 'Estado', 'Disponibilidad', 'Plan', 'Primera real', 'Segundas', 'Cumplimiento', 'FTT', 'OEE'].map((label) => <th key={label} style={{ padding: '10px 8px' }}>{label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {machines.map((machine) => (
                                <tr key={machine.machineNumber} style={{ borderBottom: '1px solid rgba(51,65,85,.55)' }}>
                                    <td style={{ padding: '11px 8px', fontWeight: 800 }}>M{machine.machineNumber}</td>
                                    <td style={{ padding: '11px 8px' }}>{machine.area || '-'}</td>
                                    <td style={{ padding: '11px 8px', maxWidth: 190 }}>{machine.articleCodes.join(', ') || '-'}</td>
                                    <td style={{ padding: '11px 8px' }}><Chip size="small" label={machine.currentStatus || 'SIN DATO'} color={machine.currentStatus === 'ACTIVA' ? 'success' : 'warning'} /></td>
                                    <td style={{ padding: '11px 8px' }}>{pct(machine.availabilityPct)}</td>
                                    <td style={{ padding: '11px 8px' }}>{number(machine.plannedGoodSocks / 24)} doc.</td>
                                    <td style={{ padding: '11px 8px' }}>{number(machine.actualGoodSocks / 24)} doc.</td>
                                    <td style={{ padding: '11px 8px' }}>{number(machine.secondSocks)}</td>
                                    <td style={{ padding: '11px 8px' }}>{pct(machine.planCompliancePct)}</td>
                                    <td style={{ padding: '11px 8px' }}>{pct(machine.fttPct)}</td>
                                    <td style={{ padding: '11px 8px', fontWeight: 750, color: '#f59e0b' }}>{pct(machine.oeePct)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Box>
            </Paper>
        </Box>
    );
}
