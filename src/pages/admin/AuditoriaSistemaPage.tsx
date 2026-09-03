import { useMemo, useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Chip,
    MenuItem,
    Paper,
    Stack,
    TablePagination,
    TextField,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { PageHeader, PageLoader } from '../../shared/ui';
import { useGetAuditLogsQuery } from '../../features/audit/audit.api';

export default function AuditoriaSistemaPage() {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [filters, setFilters] = useState({ actor: '', resource: '', action: '', result: '', from: '', to: '' });
    const args = useMemo(() => ({
        page: page + 1,
        pageSize,
        actor: filters.actor || undefined,
        resource: filters.resource || undefined,
        action: filters.action || undefined,
        success: filters.result === '' ? undefined : filters.result === 'success',
        from: filters.from || undefined,
        to: filters.to || undefined,
    }), [filters, page, pageSize]);
    const { data, isLoading, isFetching } = useGetAuditLogsQuery(args);
    const update = (field: keyof typeof filters, value: string) => { setFilters((current) => ({ ...current, [field]: value })); setPage(0); };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1450, mx: 'auto' }}>
            <PageHeader title="Auditoría del sistema" subtitle="Quién creó, modificó, corrigió o anuló información. Los movimientos de stock conservan además su historial específico." />
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, mb: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                    <TextField size="small" label="Usuario" value={filters.actor} onChange={(event) => update('actor', event.target.value)} />
                    <TextField size="small" label="Módulo / recurso" value={filters.resource} onChange={(event) => update('resource', event.target.value)} />
                    <TextField size="small" select label="Acción" value={filters.action} onChange={(event) => update('action', event.target.value)} sx={{ minWidth: 140 }}><MenuItem value="">Todas</MenuItem><MenuItem value="CREATE">Alta</MenuItem><MenuItem value="UPDATE">Cambio</MenuItem><MenuItem value="DELETE">Baja</MenuItem></TextField>
                    <TextField size="small" select label="Resultado" value={filters.result} onChange={(event) => update('result', event.target.value)} sx={{ minWidth: 140 }}><MenuItem value="">Todos</MenuItem><MenuItem value="success">Exitoso</MenuItem><MenuItem value="failed">Fallido</MenuItem></TextField>
                    <TextField size="small" label="Desde" type="date" value={filters.from} onChange={(event) => update('from', event.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField size="small" label="Hasta" type="date" value={filters.to} onChange={(event) => update('to', event.target.value)} InputLabelProps={{ shrink: true }} />
                </Stack>
            </Paper>
            {isLoading ? <PageLoader text="Cargando auditoría..." /> : !data?.data.length ? <Alert severity="info">Todavía no hay eventos para estos filtros. La auditoría comienza a registrar desde esta versión.</Alert> : (
                <Stack spacing={1} sx={{ opacity: isFetching ? 0.7 : 1 }}>
                    {data.data.map((log) => (
                        <Accordion key={log.id} disableGutters variant="outlined" sx={{ borderRadius: '12px!important', '&:before': { display: 'none' } }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ width: '100%', pr: 1 }}>
                                    <Chip size="small" label={log.action} color={log.action === 'DELETE' ? 'error' : log.action === 'UPDATE' ? 'warning' : 'primary'} />
                                    <Typography fontWeight={800}>{log.resource}</Typography>
                                    <Typography variant="body2" color="text.secondary">{log.actorUsername || 'Sistema'} · {new Date(log.createdAt).toLocaleString('es-AR')}</Typography>
                                    <Chip size="small" sx={{ ml: { sm: 'auto!important' } }} label={log.success ? 'Exitoso' : `Falló (${log.statusCode ?? '?'})`} color={log.success ? 'success' : 'error'} />
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography variant="body2"><strong>Ruta:</strong> {log.method} {log.path}</Typography>
                                <Typography variant="body2"><strong>Rol / sector:</strong> {log.actorRole || '—'} / {log.actorSector || '—'}</Typography>
                                <Typography variant="body2"><strong>Duración:</strong> {log.durationMs} ms</Typography>
                                {log.errorMessage && <Alert severity="error" sx={{ my: 1 }}>{log.errorMessage}</Alert>}
                                <Box component="pre" sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: 'action.hover', overflowX: 'auto', fontSize: 12, whiteSpace: 'pre-wrap' }}>{JSON.stringify(log.details, null, 2)}</Box>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Stack>
            )}
            <TablePagination component="div" count={data?.total ?? 0} page={page} onPageChange={(_, value) => setPage(value)} rowsPerPage={pageSize} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} rowsPerPageOptions={[10, 25, 50, 100]} labelRowsPerPage="Por página" labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`} />
        </Box>
    );
}
