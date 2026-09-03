import {
    Alert,
    Box,
    Button,
    Chip,
    LinearProgress,
    MenuItem,
    Paper,
    Stack,
    TablePagination,
    TextField,
    Typography,
} from '@mui/material';
import { PageHeader, PageLoader } from '../../shared/ui';

export type CompletenessLevel = 'COMPLETE' | 'REVIEW' | 'CRITICAL';

export interface CompletenessRow {
    id: string;
    code: string;
    description: string;
    context?: string | null;
    completionPct: number;
    level: CompletenessLevel;
    completedFields: number;
    totalFields: number;
    missingFields: string[];
}

export interface CompletenessResult {
    data: CompletenessRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    summary: { total: number; complete: number; review: number; critical: number; averagePct: number };
}

interface Props {
    title: string;
    subtitle: string;
    noun: string;
    result?: CompletenessResult;
    isLoading: boolean;
    isFetching: boolean;
    query: string;
    level: '' | CompletenessLevel;
    page: number;
    pageSize: number;
    onQueryChange: (value: string) => void;
    onLevelChange: (value: '' | CompletenessLevel) => void;
    onPageChange: (value: number) => void;
    onPageSizeChange: (value: number) => void;
    onOpenCatalog: (row?: CompletenessRow) => void;
}

const levelLabel: Record<CompletenessLevel, string> = { COMPLETE: 'Completo', REVIEW: 'A revisar', CRITICAL: 'Crítico' };
const levelColor: Record<CompletenessLevel, 'success' | 'warning' | 'error'> = { COMPLETE: 'success', REVIEW: 'warning', CRITICAL: 'error' };

export function DataCompletenessView(props: Props) {
    const summary = props.result?.summary ?? { total: 0, complete: 0, review: 0, critical: 0, averagePct: 0 };
    return (
        <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
            <PageHeader title={props.title} subtitle={props.subtitle} />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.25, mb: 2 }}>
                {[
                    ['Promedio cargado', `${summary.averagePct}%`, 'primary.main'],
                    ['Completos', summary.complete, 'success.main'],
                    ['A revisar', summary.review, 'warning.main'],
                    ['Críticos', summary.critical, 'error.main'],
                ].map(([label, value, color]) => (
                    <Paper key={String(label)} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3 }}>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography variant="h5" fontWeight={900} color={String(color)}>{value}</Typography>
                    </Paper>
                ))}
            </Box>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, mb: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                    <TextField size="small" fullWidth label={`Buscar ${props.noun}`} value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} />
                    <TextField size="small" select label="Nivel" value={props.level} onChange={(event) => props.onLevelChange(event.target.value as '' | CompletenessLevel)} sx={{ minWidth: 180 }}>
                        <MenuItem value="">Todos</MenuItem><MenuItem value="CRITICAL">Críticos primero</MenuItem><MenuItem value="REVIEW">A revisar</MenuItem><MenuItem value="COMPLETE">Completos</MenuItem>
                    </TextField>
                    <Button variant="outlined" onClick={() => props.onOpenCatalog()} sx={{ whiteSpace: 'nowrap' }}>Abrir catálogo</Button>
                </Stack>
            </Paper>

            {props.isLoading ? <PageLoader text="Calculando calidad de datos..." /> : props.result?.data.length === 0 ? (
                <Alert severity="info">No hay registros para ese filtro.</Alert>
            ) : (
                <Stack spacing={1.25} sx={{ opacity: props.isFetching ? 0.7 : 1 }}>
                    {props.result?.data.map((row) => (
                        <Paper key={row.id} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography fontWeight={900} noWrap>{row.code} · {row.description}</Typography>
                                    {row.context && <Typography variant="caption" color="text.secondary">{row.context}</Typography>}
                                </Box>
                                <Chip size="small" label={levelLabel[row.level]} color={levelColor[row.level]} />
                            </Stack>
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.25 }}>
                                <LinearProgress variant="determinate" value={row.completionPct} color={levelColor[row.level]} sx={{ height: 8, borderRadius: 8, flex: 1 }} />
                                <Typography fontWeight={900} sx={{ minWidth: 44, textAlign: 'right' }}>{row.completionPct}%</Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">{row.completedFields} de {row.totalFields} campos completos</Typography>
                            {row.missingFields.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1.25 }}>
                                    {row.missingFields.map((field) => <Chip key={field} size="small" variant="outlined" color="warning" label={`Falta: ${field}`} />)}
                                </Box>
                            )}
                            {row.missingFields.length > 0 && <Button size="small" onClick={() => props.onOpenCatalog(row)} sx={{ mt: 1 }}>Completar datos</Button>}
                        </Paper>
                    ))}
                </Stack>
            )}

            <TablePagination component="div" count={props.result?.total ?? 0} page={props.page} onPageChange={(_, value) => props.onPageChange(value)} rowsPerPage={props.pageSize} onRowsPerPageChange={(event) => props.onPageSizeChange(Number(event.target.value))} rowsPerPageOptions={[10, 25, 50, 100]} labelRowsPerPage="Por página" labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`} />
        </Box>
    );
}
