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
    ToggleButton,
    ToggleButtonGroup,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
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
import { useGetProductionDashboardQuery, useGetProductionOverviewQuery } from '../../entities/production/api/production.api';
import type { ProductionOverviewResponse } from '../../entities/production/api/production.api';

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

function dateDaysAgo(days: number) {
    const value = new Date();
    value.setDate(value.getDate() - days);
    return value.toISOString().slice(0, 10);
}

function OverviewView({ data, isLoading, error, days, onDaysChange, onDaily }: {
    data?: ProductionOverviewResponse;
    isLoading: boolean;
    error: unknown;
    days: number;
    onDaysChange: (days: number) => void;
    onDaily: () => void;
}) {
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down('md'));
    const [selectedArea, setSelectedArea] = useState<string | null>(null);
    const visibleMachines = selectedArea ? (data?.machines ?? []).filter((machine) => machine.area === selectedArea) : data?.machines ?? [];

    return <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, minHeight: '100vh', color: 'var(--text-primary, #f3f4f6)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2, flexDirection: { xs: 'column', md: 'row' }, mb: 2.5 }}>
            <Box>
                <Typography variant={mobile ? 'h5' : 'h4'} sx={{ fontWeight: 850 }}>Producción · Panorama</Typography>
                <Typography sx={{ color: 'var(--text-muted, #94a3b8)', mt: .5, fontSize: { xs: 13, md: 15 } }}>
                    Bosque, áreas y máquinas con datos acumulados del histórico.
                </Typography>
            </Box>
            <ToggleButtonGroup exclusive fullWidth={mobile} size="small" value="overview">
                <ToggleButton value="day" onClick={onDaily}>Día</ToggleButton>
                <ToggleButton value="overview">Panorama</ToggleButton>
            </ToggleButtonGroup>
        </Box>

        <ToggleButtonGroup exclusive fullWidth size="small" value={days} onChange={(_event, value) => value && onDaysChange(value)} sx={{ mb: 2 }}>
            <ToggleButton value={7}>7 días</ToggleButton>
            <ToggleButton value={30}>30 días</ToggleButton>
            <ToggleButton value={90}>90 días</ToggleButton>
        </ToggleButtonGroup>
        {isLoading && <Box sx={{ minHeight: 280, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>}
        {Boolean(error) && <Alert severity="error">No se pudo consultar el panorama de Producción.</Alert>}
        {data && <>
            <Typography sx={{ fontWeight: 850, mb: 1.25 }}>Bosque · Sector completo</Typography>
            <Grid container spacing={1.25}>
                {[
                    ['Producción primera', `${number(data.summary.goodDozens)} doc.`, '#10b981'],
                    ['Disponibilidad', pct(data.summary.availabilityPct), '#38bdf8'],
                    ['FTT', pct(data.summary.fttPct), '#a78bfa'],
                    ['OEE', pct(data.summary.oeePct), '#f59e0b'],
                ].map(([label, value, color]) => <Grid size={{ xs: 6, md: 3 }} key={label}>
                    <Paper sx={{ p: { xs: 1.5, md: 2.25 }, minHeight: 92, borderRadius: 3, background: 'var(--bg-secondary, #171a24)', border: '1px solid var(--border-color, #2a2d3e)' }}>
                        <Typography sx={{ color: 'var(--text-muted, #94a3b8)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{label}</Typography>
                        <Typography sx={{ color, fontSize: { xs: 22, md: 30 }, fontWeight: 850, mt: .7 }}>{value}</Typography>
                    </Paper>
                </Grid>)}
            </Grid>
            <Alert severity={data.daysWithProduction ? 'info' : 'warning'} sx={{ mt: 1.5 }}>
                {data.from} al {data.to} · {data.daysWithProduction} días con producción · {data.summary.machines} máquinas del sector.
            </Alert>
            {data.summary.oeePct === null && data.daysWithProduction > 0 && <Alert severity="warning" sx={{ mt: 1 }}>
                El OEE todavía no puede cerrarse: falta el tiempo de tejido estándar en los artículos producidos para calcular rendimiento.
            </Alert>}

            <Typography sx={{ fontWeight: 850, mt: 2.5, mb: 1.25 }}>Árbol · Áreas</Typography>
            <Grid container spacing={1.25}>
                {data.areas.map((area) => <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={area.area}>
                    <CardActionArea onClick={() => setSelectedArea(selectedArea === area.area ? null : area.area)} sx={{ borderRadius: 3 }}>
                        <Paper sx={{ p: 1.75, borderRadius: 3, background: 'var(--bg-secondary, #171a24)', border: selectedArea === area.area ? '1px solid #38bdf8' : '1px solid var(--border-color, #2a2d3e)' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                <Typography sx={{ fontWeight: 800 }}>{area.area}</Typography>
                                <Chip size="small" label={`${area.machines} maq.`} />
                            </Box>
                            <Typography sx={{ mt: 1, fontSize: 13, color: 'text.secondary' }}>
                                {number(area.goodDozens)} doc. · Disp. {pct(area.availabilityPct)} · FTT {pct(area.fttPct)}
                            </Typography>
                        </Paper>
                    </CardActionArea>
                </Grid>)}
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2.5, mb: 1.25 }}>
                <Typography sx={{ fontWeight: 850 }}>Hoja · Máquinas{selectedArea ? ` de ${selectedArea}` : ''}</Typography>
                {selectedArea && <Chip size="small" label="Ver todas" onClick={() => setSelectedArea(null)} />}
            </Box>
            <Grid container spacing={1.25}>
                {visibleMachines.map((machine) => <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={machine.machineNumber}>
                    <Paper sx={{ p: 1.75, borderRadius: 3, background: 'var(--bg-secondary, #171a24)', border: '1px solid var(--border-color, #2a2d3e)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography sx={{ fontWeight: 900, fontSize: 18 }}>M{machine.machineNumber}</Typography>
                            <Typography variant="caption" color="text.secondary">{machine.area}</Typography>
                        </Box>
                        <Typography sx={{ mt: .8, fontWeight: 750 }}>{number(machine.goodDozens)} docenas de primera</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 1.25 }}>
                            <Box><Typography variant="caption" color="text.secondary">Disp.</Typography><Typography sx={{ color: '#38bdf8', fontWeight: 800 }}>{pct(machine.availabilityPct)}</Typography></Box>
                            <Box><Typography variant="caption" color="text.secondary">FTT</Typography><Typography sx={{ color: '#a78bfa', fontWeight: 800 }}>{pct(machine.fttPct)}</Typography></Box>
                            <Box><Typography variant="caption" color="text.secondary">OEE</Typography><Typography sx={{ color: '#f59e0b', fontWeight: 800 }}>{pct(machine.oeePct)}</Typography></Box>
                        </Box>
                    </Paper>
                </Grid>)}
            </Grid>
        </>}
    </Box>;
}

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
    const [view, setView] = useState<'day' | 'overview'>('day');
    const [overviewDays, setOverviewDays] = useState(30);
    const [date, setDate] = useState(today());
    const [selectedMetric, setSelectedMetric] = useState<MetricKey>('availability');
    const [machineSearch, setMachineSearch] = useState('');
    const { data, isLoading, isFetching, error } = useGetProductionDashboardQuery({ date });
    const overviewTo = today();
    const overviewFrom = dateDaysAgo(overviewDays - 1);
    const { data: overview, isLoading: overviewLoading, error: overviewError } = useGetProductionOverviewQuery(
        { from: overviewFrom, to: overviewTo },
        { skip: view !== 'overview' },
    );

    const machines = useMemo(() => {
        const query = machineSearch.trim().toUpperCase();
        if (!data || !query) return data?.machines ?? [];
        return data.machines.filter((machine) =>
            String(machine.machineNumber).includes(query)
            || String(machine.area ?? '').toUpperCase().includes(query)
            || machine.articleCodes.some((code) => code.toUpperCase().includes(query)),
        );
    }, [data, machineSearch]);

    if (view === 'overview') {
        return <OverviewView data={overview} isLoading={overviewLoading} error={overviewError} days={overviewDays} onDaysChange={setOverviewDays} onDaily={() => setView('day')} />;
    }

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
                    <ToggleButtonGroup exclusive size="small" value={view} onChange={(_event, value) => value && setView(value)}>
                        <ToggleButton value="day">Día</ToggleButton>
                        <ToggleButton value="overview">Panorama</ToggleButton>
                    </ToggleButtonGroup>
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
                <Box sx={{ display: { xs: 'grid', md: 'none' }, gap: 1.25 }}>
                    {machines.map((machine) => <Paper key={machine.machineNumber} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, background: 'rgba(15,23,42,.3)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                            <Box>
                                <Typography sx={{ fontWeight: 900, fontSize: 18 }}>M{machine.machineNumber}</Typography>
                                <Typography variant="caption" color="text.secondary">{machine.area || 'Sin área'} · {machine.articleCodes.join(', ') || 'Sin artículo'}</Typography>
                            </Box>
                            <Chip size="small" label={machine.currentStatus || 'SIN DATO'} color={machine.currentStatus === 'ACTIVA' ? 'success' : 'warning'} />
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 1.25 }}>
                            <Box><Typography variant="caption" color="text.secondary">Dispon.</Typography><Typography sx={{ fontWeight: 800, color: '#38bdf8' }}>{pct(machine.availabilityPct)}</Typography></Box>
                            <Box><Typography variant="caption" color="text.secondary">FTT</Typography><Typography sx={{ fontWeight: 800, color: '#a78bfa' }}>{pct(machine.fttPct)}</Typography></Box>
                            <Box><Typography variant="caption" color="text.secondary">OEE</Typography><Typography sx={{ fontWeight: 800, color: '#f59e0b' }}>{pct(machine.oeePct)}</Typography></Box>
                        </Box>
                        <Typography sx={{ mt: 1, fontSize: 12, color: 'text.secondary' }}>
                            Primera {number(machine.actualGoodSocks / 24)} doc. · Plan {number(machine.plannedGoodSocks / 24)} doc. · Segunda {number(machine.secondSocks)}
                        </Typography>
                    </Paper>)}
                    {machines.length === 0 && <Typography color="text.secondary">No hay máquinas para mostrar.</Typography>}
                </Box>
                <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
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
