import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Box, Typography, Divider,
    FormControlLabel, Checkbox, IconButton, Chip,
} from '@mui/material';
import {
    useCreateArticuloMutation, useUpdateArticuloMutation,
    useGetArticuloCategoriasQuery, useCreateArticuloCategoriaMutation,
} from '../api/articulos.api';
import { useGetItemsQuery } from '../../../warehouse/materiales/api/items.api';
import { useGetMachineTypesQuery } from '../../../../entities/maintenance/api/maintenance.api';

const ROLES = [
    { value: 'COLOR_BASE', label: 'Base (Color)' },
    { value: 'LOGO', label: 'Logo' },
    { value: 'DETALLE_MEDIA', label: 'Detalle de Media' },
    { value: 'COLOR_TALLE', label: 'Color de Talle' },
    { value: 'TRIANGULO', label: 'Triángulo' },
    { value: 'TALON_PUNTERA', label: 'Talón y Puntera' },
];

const EMPTY_FORM = {
    codigo: '',
    descripcion: '',
    categoriaId: '',
    ssn: '',
    im: '',
    talle: '',
    talleDMedia: '',
    workingNumber: '',
    observacion: '',
    programas: '',
};

interface RefEntry {
    id?: string;
    rol: string;
    itemId: string;
    orden: number;
    activo: boolean;
}

interface CreateArticuloDialogProps {
    open: boolean;
    onClose: () => void;
    editTarget?: any | null;
}

export const CreateArticuloDialog = ({ open, onClose, editTarget }: CreateArticuloDialogProps) => {
    const isEdit = !!editTarget;

    const [createArticulo, { isLoading: isCreating }] = useCreateArticuloMutation();
    const [updateArticulo, { isLoading: isUpdating }] = useUpdateArticuloMutation();
    const isLoading = isCreating || isUpdating;

    const { data: categorias = [] } = useGetArticuloCategoriasQuery();
    const [createCategoria] = useCreateArticuloCategoriaMutation();
    const { data: items = [] } = useGetItemsQuery({});
    const { data: machineTypes = [] } = useGetMachineTypesQuery();

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [itemRefs, setItemRefs] = useState<RefEntry[]>([]);
    const [machineTypeIds, setMachineTypeIds] = useState<string[]>([]);
    const [newCatName, setNewCatName] = useState('');
    const [showNewCat, setShowNewCat] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        if (editTarget) {
            setForm({
                codigo: editTarget.codigo || '',
                descripcion: editTarget.descripcion || '',
                categoriaId: editTarget.categoriaId || '',
                ssn: editTarget.ssn || '',
                im: editTarget.im || '',
                talle: editTarget.talle || '',
                talleDMedia: editTarget.talleDMedia || '',
                workingNumber: editTarget.workingNumber || '',
                observacion: editTarget.observacion || '',
                programas: editTarget.programas || '',
            });
            const refs: RefEntry[] = (editTarget.itemRefs || []).map((r: any) => ({
                id: r.id,
                rol: r.rol,
                itemId: r.itemId,
                orden: r.orden,
                activo: r.activo,
            }));
            setItemRefs(refs);
            setMachineTypeIds((editTarget.machineTypes || []).map((mt: any) => mt.id));
        } else {
            setForm({ ...EMPTY_FORM });
            setItemRefs([]);
            setMachineTypeIds([]);
        }
        setError('');
        setShowNewCat(false);
        setNewCatName('');
    }, [open, editTarget]);

    const handleFieldChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    // ─── Item Refs helpers ─────────────────────────────────────────────────────
    const getRefsForRol = (rol: string) => itemRefs.filter(r => r.rol === rol);

    const addRef = (rol: string) => {
        const existing = getRefsForRol(rol);
        if (existing.length >= 3) return;
        setItemRefs(prev => [...prev, { rol, itemId: '', orden: existing.length + 1, activo: true }]);
    };

    const updateRef = (rol: string, orden: number, field: string, value: any) => {
        setItemRefs(prev => prev.map(r =>
            r.rol === rol && r.orden === orden ? { ...r, [field]: value } : r
        ));
    };

    const removeRef = (rol: string, orden: number) => {
        setItemRefs(prev => {
            const filtered = prev.filter(r => !(r.rol === rol && r.orden === orden));
            // re-index orden within the rol
            let idx = 1;
            return filtered.map(r => r.rol === rol ? { ...r, orden: idx++ } : r);
        });
    };

    // ─── Machine types ─────────────────────────────────────────────────────────
    const toggleMachineType = (id: string) => {
        setMachineTypeIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // ─── New category ──────────────────────────────────────────────────────────
    const handleCreateCategoria = async () => {
        if (!newCatName.trim()) return;
        try {
            const created = await createCategoria({ nombre: newCatName.trim() }).unwrap();
            setForm(prev => ({ ...prev, categoriaId: created.id }));
            setNewCatName('');
            setShowNewCat(false);
        } catch {
            alert('Error al crear categoría');
        }
    };

    // ─── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!form.codigo.trim() || !form.descripcion.trim()) {
            setError('Código y Descripción son obligatorios.');
            return;
        }
        setError('');

        const validRefs = itemRefs.filter(r => r.itemId);
        const payload = {
            ...form,
            categoriaId: form.categoriaId || null,
            ssn: form.ssn || null,
            im: form.im || null,
            talle: form.talle || null,
            talleDMedia: form.talleDMedia || null,
            workingNumber: form.workingNumber || null,
            observacion: form.observacion || null,
            programas: form.programas || null,
            imagen: null,
            itemRefs: validRefs,
            machineTypeIds,
        };

        try {
            if (isEdit) {
                await updateArticulo({ id: editTarget.id, data: payload }).unwrap();
            } else {
                await createArticulo(payload).unwrap();
            }
            onClose();
        } catch (e: any) {
            setError(e?.data?.message || 'Error al guardar el artículo.');
        }
    };

    const fieldStyle = {
        '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: '#2a2d3e' },
            '&:hover fieldset': { borderColor: '#4f46e5' },
            '&.Mui-focused fieldset': { borderColor: '#6366f1' },
            backgroundColor: '#1a1d2e',
            color: '#f3f4f6',
        },
        '& .MuiInputLabel-root': { color: '#9ca3af' },
        '& .MuiInputLabel-root.Mui-focused': { color: '#6366f1' },
        '& .MuiInputBase-input': { color: '#f3f4f6' },
        '& .MuiSelect-icon': { color: '#9ca3af' },
        mb: 2,
    };

    const sectionTitle = (title: string) => (
        <Typography sx={{ color: '#a5b4fc', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5, mt: 1 }}>
            {title}
        </Typography>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { background: '#0f1117', color: '#f3f4f6', border: '1px solid #2a2d3e', borderRadius: '12px', maxHeight: '90vh' } }}
        >
            <DialogTitle sx={{ color: '#f3f4f6', borderBottom: '1px solid #2a2d3e', pb: 2 }}>
                {isEdit ? '✏️ Editar Artículo' : '➕ Nuevo Artículo'}
            </DialogTitle>

            <DialogContent sx={{ pt: 3, overflowY: 'auto' }}>
                {/* ── Sección 1: Datos principales ── */}
                {sectionTitle('📋 Datos Principales')}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField label="Código *" value={form.codigo} onChange={e => handleFieldChange('codigo', e.target.value)} sx={fieldStyle} size="small" />
                    <TextField label="Descripción *" value={form.descripcion} onChange={e => handleFieldChange('descripcion', e.target.value)} sx={fieldStyle} size="small" />
                    <Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            <TextField
                                select label="Categoría" value={form.categoriaId}
                                onChange={e => handleFieldChange('categoriaId', e.target.value)}
                                sx={{ ...fieldStyle, flex: 1 }} size="small"
                            >
                                <MenuItem value=""><em>Sin categoría</em></MenuItem>
                                {categorias.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
                            </TextField>
                            <Button onClick={() => setShowNewCat(v => !v)} size="small" sx={{ color: '#6366f1', minWidth: 'auto', mt: 0.5 }}>
                                + Nueva
                            </Button>
                        </Box>
                        {showNewCat && (
                            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <TextField size="small" placeholder="Nombre de categoría" value={newCatName} onChange={e => setNewCatName(e.target.value)} sx={{ ...fieldStyle, mb: 0, flex: 1 }} />
                                <Button onClick={handleCreateCategoria} size="small" variant="contained" sx={{ background: '#4f46e5', height: '40px' }}>Crear</Button>
                            </Box>
                        )}
                    </Box>
                    <TextField label="SSN" value={form.ssn} onChange={e => handleFieldChange('ssn', e.target.value)} sx={fieldStyle} size="small" />
                    <TextField label="IM" value={form.im} onChange={e => handleFieldChange('im', e.target.value)} sx={fieldStyle} size="small" />
                    <TextField label="Talle" value={form.talle} onChange={e => handleFieldChange('talle', e.target.value)} sx={fieldStyle} size="small" placeholder="Ej: 36-40, T1" />
                    <TextField label="Talle de Media" value={form.talleDMedia} onChange={e => handleFieldChange('talleDMedia', e.target.value)} sx={fieldStyle} size="small" />
                    <TextField label="Working Number" value={form.workingNumber} onChange={e => handleFieldChange('workingNumber', e.target.value)} sx={fieldStyle} size="small" />
                </Box>
                <TextField
                    label="Programas" multiline rows={2} fullWidth
                    value={form.programas}
                    onChange={e => handleFieldChange('programas', e.target.value)}
                    sx={fieldStyle} size="small"
                    placeholder="Escribí las referencias de programas asociados..."
                />
                <TextField
                    label="Observación" multiline rows={2} fullWidth
                    value={form.observacion}
                    onChange={e => handleFieldChange('observacion', e.target.value)}
                    sx={fieldStyle} size="small"
                />

                <Divider sx={{ borderColor: '#2a2d3e', my: 2 }} />

                {/* ── Sección 2: Insumos por rol ── */}
                {sectionTitle('🧵 Insumos (Items por Rol)')}
                <Typography sx={{ color: '#6b7280', fontSize: '12px', mb: 2 }}>
                    Asigná los items para cada rol. Podés agregar hasta 3 alternativas ordenadas por prioridad.
                </Typography>
                {ROLES.map(({ value: rol, label }) => {
                    const refs = getRefsForRol(rol);
                    return (
                        <Box key={rol} sx={{ mb: 2, p: 1.5, border: '1px solid #2a2d3e', borderRadius: '8px', background: '#0d1020' }}>
                            <Typography sx={{ color: '#c4b5fd', fontWeight: 600, fontSize: '12px', mb: 1 }}>{label}</Typography>
                            {refs.map((ref) => (
                                <Box key={ref.orden} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                                    <Chip label={`#${ref.orden}`} size="small" sx={{ background: '#1a1d2e', color: '#6b7280', minWidth: '32px' }} />
                                    <TextField
                                        select size="small" sx={{ ...fieldStyle, mb: 0, flex: 1 }}
                                        value={ref.itemId}
                                        onChange={e => updateRef(rol, ref.orden, 'itemId', e.target.value)}
                                        label="Item"
                                    >
                                        <MenuItem value=""><em>Seleccionar...</em></MenuItem>
                                        {items.map((it: any) => (
                                            <MenuItem key={it.id} value={it.id}>
                                                {it.codigoInterno} — {it.descripcion}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <FormControlLabel
                                        control={<Checkbox checked={ref.activo} onChange={e => updateRef(rol, ref.orden, 'activo', e.target.checked)} size="small" sx={{ color: '#6366f1', '&.Mui-checked': { color: '#6366f1' } }} />}
                                        label={<Typography sx={{ fontSize: '12px', color: '#9ca3af' }}>Activo</Typography>}
                                    />
                                    <IconButton size="small" onClick={() => removeRef(rol, ref.orden)} sx={{ color: '#ef4444' }}>✕</IconButton>
                                </Box>
                            ))}
                            {refs.length < 3 && (
                                <Button size="small" onClick={() => addRef(rol)} sx={{ color: '#6366f1', fontSize: '12px', mt: 0.5 }}>
                                    + Agregar alternativa
                                </Button>
                            )}
                        </Box>
                    );
                })}

                <Divider sx={{ borderColor: '#2a2d3e', my: 2 }} />

                {/* ── Sección 3: Recursos (tipos de máquina) ── */}
                {sectionTitle('⚙️ Recursos (Tipos de Máquina)')}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {machineTypes.map((mt: any) => (
                        <FormControlLabel
                            key={mt.id}
                            control={
                                <Checkbox
                                    checked={machineTypeIds.includes(mt.id)}
                                    onChange={() => toggleMachineType(mt.id)}
                                    size="small"
                                    sx={{ color: '#6366f1', '&.Mui-checked': { color: '#6366f1' } }}
                                />
                            }
                            label={<Typography sx={{ fontSize: '13px', color: '#d1d5db' }}>{mt.name}</Typography>}
                        />
                    ))}
                    {machineTypes.length === 0 && (
                        <Typography sx={{ color: '#6b7280', fontSize: '13px' }}>No hay tipos de máquina configurados.</Typography>
                    )}
                </Box>

                {error && (
                    <Typography sx={{ color: '#ef4444', fontSize: '13px', mt: 2 }}>{error}</Typography>
                )}
            </DialogContent>

            <DialogActions sx={{ borderTop: '1px solid #2a2d3e', p: 2, gap: 1 }}>
                <Button onClick={onClose} sx={{ color: '#9ca3af' }} disabled={isLoading}>Cancelar</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={isLoading}
                    sx={{ background: '#4f46e5', '&:hover': { background: '#4338ca' } }}
                >
                    {isLoading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Artículo'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
