import { useMemo, useState } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    Paper,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
    useGetProductionResourcesQuery,
    useUpdateProductionResourceMutation,
} from '../../entities/production/api/production.api';
import type {
    ProductionResource,
    ProductionResourceAttributes,
} from '../../entities/production/api/production.api';
import { PageHeader, Spinner } from '../../shared/ui';

const AREAS = ['AREA 1', 'AREA 2', 'AREA 3', 'AREA 4', 'AREA 5'];

interface ResourceForm {
    name: string;
    area: string;
    active: boolean;
    marca: string;
    modelo: string;
    cantidadAgujas: string;
    diametroCilindro: string;
    anio: string;
    tipoTecnico: string;
    alimentacionDoble: boolean;
    costuraIntegrada: boolean;
}

const inputSx = {
    '& .MuiInputBase-root': {
        color: 'var(--text-primary, #f3f4f6)',
        background: 'var(--bg-primary, #0f1117)',
    },
    '& .MuiInputLabel-root': { color: 'var(--text-muted, #9ca3af)' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-strong, #374151)' },
};

function toForm(resource: ProductionResource): ResourceForm {
    const attributes = resource.attributes ?? {};
    return {
        name: resource.name,
        area: resource.area ?? '',
        active: resource.active,
        marca: attributes.marca ?? '',
        modelo: attributes.modelo ?? '',
        cantidadAgujas: attributes.cantidadAgujas?.toString() ?? '',
        diametroCilindro: attributes.diametroCilindro?.toString() ?? '',
        anio: attributes.anio?.toString() ?? '',
        tipoTecnico: attributes.tipoTecnico?.toString() ?? '',
        alimentacionDoble: Boolean(attributes.alimentacionDoble),
        costuraIntegrada: Boolean(attributes.costuraIntegrada),
    };
}

function optionalNumber(value: string): number | undefined {
    if (value.trim() === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export default function RecursosTejeduriaPage() {
    const { data: resources = [], isLoading, isFetching, error, refetch } = useGetProductionResourcesQuery({ sectorCode: '3000' });
    const [updateResource, { isLoading: isSaving }] = useUpdateProductionResourceMutation();
    const [search, setSearch] = useState('');
    const [area, setArea] = useState('TODAS');
    const [feature, setFeature] = useState('TODAS');
    const [editing, setEditing] = useState<ProductionResource | null>(null);
    const [form, setForm] = useState<ResourceForm | null>(null);

    const filteredResources = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        return resources.filter((resource) => {
            const attributes = resource.attributes ?? {};
            const matchesSearch = !normalizedSearch || [
                resource.machine?.number,
                resource.machine?.codigoInterno,
                resource.name,
                attributes.marca,
                attributes.modelo,
            ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch));
            const matchesArea = area === 'TODAS' || resource.area === area;
            const matchesFeature = feature === 'TODAS'
                || (feature === 'DOBLE' && attributes.alimentacionDoble)
                || (feature === 'COSTURA' && attributes.costuraIntegrada)
                || (feature === 'SIN_COSTURA' && !attributes.costuraIntegrada);
            return matchesSearch && matchesArea && matchesFeature;
        });
    }, [area, feature, resources, search]);

    const summary = useMemo(() => ({
        total: resources.length,
        active: resources.filter((resource) => resource.active).length,
        doubleFeed: resources.filter((resource) => resource.attributes?.alimentacionDoble).length,
        integratedSewing: resources.filter((resource) => resource.attributes?.costuraIntegrada).length,
    }), [resources]);

    const openEdit = (resource: ProductionResource) => {
        setEditing(resource);
        setForm(toForm(resource));
    };

    const closeEdit = () => {
        if (isSaving) return;
        setEditing(null);
        setForm(null);
    };

    const changeForm = <K extends keyof ResourceForm>(key: K, value: ResourceForm[K]) => {
        setForm((current) => current ? { ...current, [key]: value } : current);
    };

    const save = async () => {
        if (!editing || !form || !form.name.trim()) return;
        const attributes: ProductionResourceAttributes = {
            marca: form.marca.trim(),
            modelo: form.modelo.trim(),
            cantidadAgujas: optionalNumber(form.cantidadAgujas),
            diametroCilindro: optionalNumber(form.diametroCilindro),
            anio: optionalNumber(form.anio),
            tipoTecnico: optionalNumber(form.tipoTecnico),
            alimentacionDoble: form.alimentacionDoble,
            costuraIntegrada: form.costuraIntegrada,
        };
        try {
            await updateResource({
                id: editing.id,
                name: form.name.trim(),
                active: form.active,
                attributes,
            }).unwrap();
            closeEdit();
        } catch {
            alert('No se pudo guardar la ficha productiva. Intentá nuevamente.');
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1500, mx: 'auto' }}>
            <PageHeader
                title="Recursos de Tejeduría"
                subtitle="Fichas productivas vinculadas a las máquinas existentes de Mantenimiento"
            >
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => refetch()}
                    disabled={isFetching}
                    sx={{ color: '#a5b4fc', borderColor: 'rgba(99,102,241,.55)' }}
                >
                    Actualizar
                </Button>
            </PageHeader>

            {error ? (
                <Paper sx={{ p: 3, mb: 2, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)' }}>
                    <Typography sx={{ color: '#fca5a5' }}>No se pudieron cargar los recursos de Tejeduría.</Typography>
                </Paper>
            ) : null}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
                {[
                    ['Máquinas vinculadas', summary.total, '#818cf8'],
                    ['Activas como recurso', summary.active, '#34d399'],
                    ['Alimentación doble', summary.doubleFeed, '#fbbf24'],
                    ['Costura integrada', summary.integratedSewing, '#60a5fa'],
                ].map(([label, value, color]) => (
                    <Paper key={label} sx={{ p: 2, background: 'var(--bg-secondary, #1a1d2e)', border: '1px solid var(--border-color, #2a2d3e)' }}>
                        <Typography variant="h5" sx={{ color, fontWeight: 800 }}>{value}</Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted, #9ca3af)' }}>{label}</Typography>
                    </Paper>
                ))}
            </Box>

            <Paper sx={{ p: 1.5, mb: 2, background: 'var(--bg-secondary, #1a1d2e)', border: '1px solid var(--border-color, #2a2d3e)' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' }, gap: 1.5 }}>
                    <TextField
                        size="small"
                        label="Buscar máquina, marca o modelo"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        sx={inputSx}
                    />
                    <TextField select size="small" label="Área" value={area} onChange={(event) => setArea(event.target.value)} sx={inputSx}>
                        <MenuItem value="TODAS">Todas las áreas</MenuItem>
                        {AREAS.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Característica" value={feature} onChange={(event) => setFeature(event.target.value)} sx={inputSx}>
                        <MenuItem value="TODAS">Todas</MenuItem>
                        <MenuItem value="DOBLE">Alimentación doble</MenuItem>
                        <MenuItem value="COSTURA">Con costura integrada</MenuItem>
                        <MenuItem value="SIN_COSTURA">Sin costura integrada</MenuItem>
                    </TextField>
                </Box>
            </Paper>

            <Paper sx={{ overflow: 'hidden', background: 'var(--bg-secondary, #1a1d2e)', border: '1px solid var(--border-color, #2a2d3e)' }}>
                <Box sx={{ overflowX: 'auto' }}>
                    <Box component="table" sx={{ width: '100%', minWidth: 1050, borderCollapse: 'collapse' }}>
                        <Box component="thead" sx={{ background: 'rgba(99,102,241,.08)' }}>
                            <Box component="tr">
                                {['Máquina', 'Área', 'Marca / modelo', 'Agujas', 'Cilindro', 'Año', 'Alimentación', 'Costura', 'Estado', ''].map((title) => (
                                    <Box component="th" key={title} sx={{ p: 1.25, textAlign: 'left', color: 'var(--text-muted, #9ca3af)', fontSize: 12, borderBottom: '1px solid var(--border-color, #2a2d3e)', whiteSpace: 'nowrap' }}>{title}</Box>
                                ))}
                            </Box>
                        </Box>
                        <Box component="tbody">
                            {filteredResources.map((resource) => {
                                const attributes = resource.attributes ?? {};
                                return (
                                    <Box component="tr" key={resource.id} sx={{ '&:hover': { background: 'rgba(99,102,241,.05)' } }}>
                                        <Box component="td" sx={cellSx}>
                                            <Typography sx={{ color: 'var(--text-primary, #f3f4f6)', fontWeight: 800, fontSize: 14 }}>N° {resource.machine?.number ?? '—'}</Typography>
                                            <Typography variant="caption" sx={{ color: 'var(--text-subtle, #6b7280)' }}>{resource.code}</Typography>
                                        </Box>
                                        <Box component="td" sx={cellSx}><Chip label={resource.area ?? 'Sin área'} size="small" variant="outlined" sx={{ color: '#c4b5fd', borderColor: 'rgba(139,92,246,.45)' }} /></Box>
                                        <Box component="td" sx={cellSx}>
                                            <Typography sx={{ color: 'var(--text-primary, #f3f4f6)', fontSize: 13 }}>{attributes.marca ?? '—'}</Typography>
                                            <Typography variant="caption" sx={{ color: 'var(--text-muted, #9ca3af)' }}>{attributes.modelo ?? '—'}</Typography>
                                        </Box>
                                        <Box component="td" sx={cellSx}>{attributes.cantidadAgujas ?? '—'}</Box>
                                        <Box component="td" sx={cellSx}>{attributes.diametroCilindro ?? '—'}</Box>
                                        <Box component="td" sx={cellSx}>{attributes.anio ?? '—'}</Box>
                                        <Box component="td" sx={cellSx}>{attributes.alimentacionDoble ? <Chip label="Doble" size="small" color="warning" /> : 'Simple'}</Box>
                                        <Box component="td" sx={cellSx}>{attributes.costuraIntegrada ? <Chip label="Integrada" size="small" color="info" /> : 'Separada'}</Box>
                                        <Box component="td" sx={cellSx}><Chip label={resource.active ? 'Activo' : 'Inactivo'} size="small" color={resource.active ? 'success' : 'default'} /></Box>
                                        <Box component="td" sx={cellSx}>
                                            <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => openEdit(resource)} sx={{ color: '#a5b4fc' }}>Editar ficha</Button>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                </Box>
                {filteredResources.length === 0 ? (
                    <Box sx={{ p: 5, textAlign: 'center' }}>
                        <Typography sx={{ color: 'var(--text-muted, #9ca3af)' }}>
                            {resources.length === 0 ? 'Todavía no hay fichas productivas vinculadas.' : 'No hay recursos que coincidan con los filtros.'}
                        </Typography>
                    </Box>
                ) : null}
                <Box sx={{ px: 2, py: 1.25, borderTop: '1px solid var(--border-color, #2a2d3e)' }}>
                    <Typography variant="caption" sx={{ color: 'var(--text-subtle, #6b7280)' }}>
                        Mostrando {filteredResources.length} de {resources.length} máquinas. Los estados e historiales de Mantenimiento no se modifican desde esta pantalla.
                    </Typography>
                </Box>
            </Paper>

            <Dialog open={Boolean(editing && form)} onClose={closeEdit} fullWidth maxWidth="md" PaperProps={{ sx: { background: 'var(--bg-secondary, #1a1d2e)', color: 'var(--text-primary, #f3f4f6)' } }}>
                <DialogTitle>Ficha productiva · Máquina N° {editing?.machine?.number}</DialogTitle>
                {form ? (
                    <DialogContent dividers sx={{ borderColor: 'var(--border-color, #2a2d3e)' }}>
                        <Typography variant="body2" sx={{ color: 'var(--text-muted, #9ca3af)', mb: 2 }}>
                            Esta información pertenece a Producción. El número, código, estado e historial de la máquina permanecen en Mantenimiento.
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                            <TextField label="Nombre del recurso" value={form.name} onChange={(event) => changeForm('name', event.target.value)} required sx={inputSx} />
                            <TextField label="Área fija" value={form.area} disabled sx={inputSx} />
                            <TextField label="Marca" value={form.marca} onChange={(event) => changeForm('marca', event.target.value)} sx={inputSx} />
                            <TextField label="Modelo" value={form.modelo} onChange={(event) => changeForm('modelo', event.target.value)} sx={inputSx} />
                            <TextField label="Cantidad de agujas" type="number" value={form.cantidadAgujas} onChange={(event) => changeForm('cantidadAgujas', event.target.value)} sx={inputSx} />
                            <TextField label="Diámetro de cilindro" type="number" value={form.diametroCilindro} onChange={(event) => changeForm('diametroCilindro', event.target.value)} sx={inputSx} />
                            <TextField label="Año" type="number" value={form.anio} onChange={(event) => changeForm('anio', event.target.value)} sx={inputSx} />
                            <TextField label="Tipo técnico" type="number" value={form.tipoTecnico} onChange={(event) => changeForm('tipoTecnico', event.target.value)} sx={inputSx} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: { xs: 0, sm: 3 }, flexDirection: { xs: 'column', sm: 'row' }, mt: 2 }}>
                            <FormControlLabel control={<Checkbox checked={form.alimentacionDoble} onChange={(event) => changeForm('alimentacionDoble', event.target.checked)} />} label="Alimentación doble" />
                            <FormControlLabel control={<Checkbox checked={form.costuraIntegrada} onChange={(event) => changeForm('costuraIntegrada', event.target.checked)} />} label="Costura integrada" />
                            <FormControlLabel control={<Switch checked={form.active} onChange={(event) => changeForm('active', event.target.checked)} />} label="Recurso activo" />
                        </Box>
                    </DialogContent>
                ) : null}
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={closeEdit} disabled={isSaving} sx={{ color: 'var(--text-muted, #9ca3af)' }}>Cancelar</Button>
                    <Button onClick={save} variant="contained" disabled={isSaving || !form?.name.trim()}>{isSaving ? 'Guardando...' : 'Guardar ficha'}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

const cellSx = {
    p: 1.25,
    color: 'var(--text-secondary, #d1d5db)',
    fontSize: 13,
    borderBottom: '1px solid var(--border-subtle, #1e2133)',
    whiteSpace: 'nowrap',
};
