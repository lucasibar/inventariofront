import { useMemo, useState } from 'react';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    MenuItem,
    Paper,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import {
    type MaterialAnalysisRow,
    type MaterialReviewStatus,
    useGetMaterialAnalysisQuery,
    useUpdateMaterialReviewMutation,
} from '../../features/warehouse/materialAnalysis/api/material-analysis.api';
import { useGetArticulosQuery, useUpdateArticuloMutation } from '../../features/quality/articulos/api/articulos.api';

const materialRoles = [
    ['COLOR_BASE', 'Base'], ['LOGO', 'Logo'], ['DETALLE_MEDIA', 'Detalle'], ['COLOR_TALLE', 'Color talle'],
    ['TRIANGULO', 'Triángulo'], ['TALON_PUNTERA', 'Talón/Puntera'], ['GOMA', 'Goma'], ['LYCRA', 'Lycra'],
] as const;

const reviewLabels: Record<MaterialReviewStatus, string> = {
    NORMAL: 'Normal',
    TO_REVIEW: 'Revisar',
    PRIORITIZE_EXIT: 'Priorizar salida',
    RESOLVED: 'Resuelto',
};

export default function MaterialesEstancadosPage() {
    const [months, setMonths] = useState(6);
    const [tab, setTab] = useState(0);
    const [search, setSearch] = useState('');
    const { data, isLoading, error, refetch } = useGetMaterialAnalysisQuery({ months });
    const [updateReview, { isLoading: isSaving }] = useUpdateMaterialReviewMutation();
    const { data: articles = [] } = useGetArticulosQuery();
    const [updateArticle, { isLoading: isAssigning }] = useUpdateArticuloMutation();
    const [assigningMaterial, setAssigningMaterial] = useState<MaterialAnalysisRow | null>(null);
    const [articleId, setArticleId] = useState('');
    const [role, setRole] = useState('COLOR_BASE');
    const [colorName, setColorName] = useState('');

    const source = tab === 0 ? data?.withoutArticleMatch ?? [] : data?.stagnant ?? [];
    const rows = useMemo(() => {
        const query = search.trim().toUpperCase();
        if (!query) return source;
        return source.filter((row) => `${row.codigoInterno} ${row.descripcion} ${row.categoryName ?? ''}`.toUpperCase().includes(query));
    }, [source, search]);

    const changeStatus = async (row: MaterialAnalysisRow, status: MaterialReviewStatus) => {
        try {
            await updateReview({ itemId: row.itemId, status, notes: row.reviewNotes }).unwrap();
        } catch (requestError: any) {
            alert(requestError?.data?.message || 'No se pudo actualizar la revisión.');
        }
    };

    const assignToArticle = async () => {
        if (!assigningMaterial || !articleId) return;
        const article = articles.find((candidate: any) => candidate.id === articleId);
        if (!article) return;
        const refs = (article.itemRefs ?? []).map((ref: any) => ({
            itemId: ref.itemId,
            rol: ref.rol,
            orden: ref.orden,
            colorNombre: ref.colorNombre,
            grupo: ref.grupo,
            esPreferenciaActual: ref.esPreferenciaActual,
            consumoGramos: ref.consumoGramos,
            desperdicio: ref.desperdicio,
            conosPreparacion: ref.conosPreparacion,
            activo: ref.activo,
        }));
        if (refs.some((ref: any) => ref.itemId === assigningMaterial.itemId && ref.rol === role)) {
            alert('Este material ya está vinculado al artículo con ese rol.');
            return;
        }
        const sameRole = refs.filter((ref: any) => ref.rol === role);
        const group = sameRole.length === 0 ? 1 : Math.max(...sameRole.map((ref: any) => Number(ref.grupo || 1))) + 1;
        refs.push({
            itemId: assigningMaterial.itemId,
            rol: role,
            orden: 1,
            colorNombre: colorName.trim() || null,
            grupo: group,
            esPreferenciaActual: true,
            consumoGramos: null,
            desperdicio: null,
            conosPreparacion: null,
            activo: true,
        });
        await updateArticle({ id: articleId, data: { itemRefs: refs } }).unwrap();
        await refetch();
        setAssigningMaterial(null);
        setArticleId('');
        setColorName('');
    };

    if (isLoading) return <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 850 }}>Materiales para revisar</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Detecta materiales sin artículos vinculados y stock sin movimientos durante un cambio de temporada.
                    </Typography>
                </Box>
                <TextField
                    select
                    size="small"
                    label="Sin movimiento"
                    value={months}
                    onChange={(event) => setMonths(Number(event.target.value))}
                    sx={{ minWidth: 180 }}
                >
                    {[3, 6, 9, 12, 18, 24].map((value) => <MenuItem key={value} value={value}>{value} meses</MenuItem>)}
                </TextField>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>No se pudo cargar el análisis de materiales.</Alert>}
            <Alert severity="info" sx={{ mb: 2 }}>
                Esta pantalla no cambia stock ni desactiva materiales. “Priorizar salida” es una marca de seguimiento.
            </Alert>

            <Grid container spacing={2} sx={{ mb: 2 }}>
                {[
                    ['Materiales activos', data?.summary.totalActiveMaterials ?? 0, '#38bdf8'],
                    ['Sin artículo', data?.summary.withoutArticleMatch ?? 0, '#f59e0b'],
                    [`Estancados +${months} meses`, data?.summary.stagnantWithStock ?? 0, '#ef4444'],
                    ['Priorizar salida', data?.summary.prioritizeExit ?? 0, '#a78bfa'],
                ].map(([label, value, color]) => (
                    <Grid size={{ xs: 6, lg: 3 }} key={String(label)}>
                        <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid var(--border-color, #2a2d3e)', background: 'var(--bg-secondary, #171a24)' }}>
                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 850, color }}>{value}</Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <Paper sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border-color, #2a2d3e)', background: 'var(--bg-secondary, #171a24)' }}>
                <Box sx={{ px: 2, pt: 1, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Tabs value={tab} onChange={(_event, value) => setTab(value)}>
                        <Tab label={`Sin artículos (${data?.withoutArticleMatch.length ?? 0})`} />
                        <Tab label={`Sin movimiento (${data?.stagnant.length ?? 0})`} />
                    </Tabs>
                    <TextField size="small" label="Buscar material" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 1, minWidth: 240 }} />
                </Box>
                <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: 940, borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                                {['Código', 'Material', 'Categoría', 'Artículos', 'Stock', 'Último movimiento', 'Estado', 'Acciones'].map((label) => <th key={label} style={{ padding: '12px 10px' }}>{label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.itemId} style={{ borderBottom: '1px solid rgba(51,65,85,.55)' }}>
                                    <td style={{ padding: '11px 10px', fontWeight: 800 }}>{row.codigoInterno}</td>
                                    <td style={{ padding: '11px 10px', maxWidth: 330 }}>{row.descripcion}</td>
                                    <td style={{ padding: '11px 10px' }}>{row.categoryName || '-'}</td>
                                    <td style={{ padding: '11px 10px' }}>{row.linkedArticles}</td>
                                    <td style={{ padding: '11px 10px' }}>{row.stockKg.toLocaleString('es-AR', { maximumFractionDigits: 2 })} {row.unidadPrincipal}</td>
                                    <td style={{ padding: '11px 10px' }}>
                                        {row.lastMovementDate || 'Sin movimientos'}
                                        {row.stagnantMonths !== null && <div style={{ color: '#94a3b8', fontSize: 11 }}>{row.stagnantMonths} meses</div>}
                                    </td>
                                    <td style={{ padding: '11px 10px' }}><Chip size="small" label={reviewLabels[row.reviewStatus]} color={row.reviewStatus === 'PRIORITIZE_EXIT' ? 'warning' : row.reviewStatus === 'RESOLVED' ? 'success' : 'default'} /></td>
                                    <td style={{ padding: '11px 10px' }}>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button size="small" disabled={isAssigning} onClick={() => setAssigningMaterial(row)}>Asignar artículo</Button>
                                            <Button size="small" disabled={isSaving} onClick={() => changeStatus(row, 'PRIORITIZE_EXIT')}>Priorizar</Button>
                                            <Button size="small" color="success" disabled={isSaving} onClick={() => changeStatus(row, 'RESOLVED')}>Resolver</Button>
                                        </Box>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Box>
                {rows.length === 0 && <Typography color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>No hay materiales para este filtro.</Typography>}
            </Paper>

            <Dialog open={!!assigningMaterial} onClose={() => setAssigningMaterial(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Asignar material a un artículo</DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        {assigningMaterial?.codigoInterno} — {assigningMaterial?.descripcion}. Se agregará como una nueva relación; luego podés completar gramos, merma y conos desde la ficha del artículo.
                    </Alert>
                    <Autocomplete
                        options={articles}
                        value={articles.find((article: any) => article.id === articleId) ?? null}
                        onChange={(_event, value: any) => setArticleId(value?.id ?? '')}
                        getOptionLabel={(article: any) => `${article.codigo} — ${article.descripcion}`}
                        isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
                        renderInput={(params) => <TextField {...params} label="Artículo" margin="normal" />}
                    />
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField select fullWidth label="Componente" value={role} onChange={(event) => setRole(event.target.value)}>
                                {materialRoles.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth label="Color / variante" value={colorName} onChange={(event) => setColorName(event.target.value)} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAssigningMaterial(null)}>Cancelar</Button>
                    <Button variant="contained" disabled={!articleId || isAssigning} onClick={assignToArticle}>{isAssigning ? 'Asignando...' : 'Asignar'}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
