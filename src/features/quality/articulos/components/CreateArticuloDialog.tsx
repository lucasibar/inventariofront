import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Box, Typography, Divider,
    FormControlLabel, Checkbox, IconButton, Chip,
} from '@mui/material';
import {
    useCreateArticuloMutation, useUpdateArticuloMutation,
    useGetArticuloCategoriasQuery,
} from '../api/articulos.api';
import { useGetItemsQuery } from '../../../warehouse/materiales/api/items.api';
import { useGetMachineTypesQuery } from '../../../../entities/maintenance/api/maintenance.api';

const ROLES = [
    { value: 'COLOR_BASE', label: '🎨 Base (Color)' },
    { value: 'LOGO', label: '🏷️ Logo' },
    { value: 'DETALLE_MEDIA', label: '🧷 Detalle de Media' },
    { value: 'COLOR_TALLE', label: '🎨 Color de Talle' },
    { value: 'TRIANGULO', label: '🔺 Triángulo' },
    { value: 'TALON_PUNTERA', label: '👟 Talón y Puntera' },
    { value: 'GOMA', label: '⭕ Goma (Puño/Elástico)' },
    { value: 'LYCRA', label: '🧵 Lycra (Elastano)' },
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
    desperdicio: '',
    observacion: '',
    programas: '',
};

interface RefEntry {
    id?: string;
    rol: string;
    colorNombre?: string | null;
    grupo: number;
    itemId: string;
    orden: number;
    esPreferenciaActual: boolean;
    consumoGramos?: number | null;
    desperdicio?: number | null;
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
    const { data: items = [] } = useGetItemsQuery({});
    const { data: machineTypes = [] } = useGetMachineTypesQuery();

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [itemRefs, setItemRefs] = useState<RefEntry[]>([]);
    const [machineTypeIds, setMachineTypeIds] = useState<string[]>([]);
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
                desperdicio: editTarget.desperdicio != null ? String(editTarget.desperdicio) : '',
                observacion: editTarget.observacion || '',
                programas: editTarget.programas || '',
            });
            const refs: RefEntry[] = (editTarget.itemRefs || []).map((r: any) => ({
                id: r.id,
                rol: r.rol,
                colorNombre: r.colorNombre || '',
                grupo: r.grupo || 1,
                itemId: r.itemId,
                orden: r.orden || 1,
                esPreferenciaActual: r.esPreferenciaActual ?? (r.orden === 1),
                consumoGramos: r.consumoGramos,
                desperdicio: r.desperdicio,
                activo: r.activo ?? true,
            }));
            setItemRefs(refs);
            setMachineTypeIds((editTarget.machineTypes || []).map((mt: any) => mt.id));
        } else {
            setForm({ ...EMPTY_FORM });
            setItemRefs([]);
            setMachineTypeIds([]);
        }
        setError('');
    }, [open, editTarget]);

    const handleFieldChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    // ─── Item Refs Multicolor helpers ──────────────────────────────────────────
    const getGruposForRol = (rol: string) => {
        const refs = itemRefs.filter(r => r.rol === rol);
        const grupoNums = Array.from(new Set(refs.map(r => r.grupo || 1))).sort((a, b) => a - b);
        if (grupoNums.length === 0) return [1];
        return grupoNums;
    };

    const getRefsForRolAndGrupo = (rol: string, grupo: number) => {
        return itemRefs.filter(r => r.rol === rol && (r.grupo || 1) === grupo);
    };

    const addColorGrupo = (rol: string) => {
        const grupos = getGruposForRol(rol);
        const nextGrupo = Math.max(...grupos, 0) + 1;
        setItemRefs(prev => [...prev, {
            rol,
            colorNombre: '',
            grupo: nextGrupo,
            itemId: '',
            orden: 1,
            esPreferenciaActual: true,
            activo: true,
        }]);
    };

    const addOptionToGrupo = (rol: string, grupo: number) => {
        const existing = getRefsForRolAndGrupo(rol, grupo);
        if (existing.length >= 3) return;
        const colorNom = existing[0]?.colorNombre || '';
        setItemRefs(prev => [...prev, {
            rol,
            colorNombre: colorNom,
            grupo,
            itemId: '',
            orden: existing.length + 1,
            esPreferenciaActual: existing.length === 0,
            activo: true,
        }]);
    };

    const updateColorNombre = (rol: string, grupo: number, colorNombre: string) => {
        setItemRefs(prev => prev.map(r =>
            r.rol === rol && (r.grupo || 1) === grupo ? { ...r, colorNombre } : r
        ));
    };

    const setPreferenciaActualInGrupo = (rol: string, grupo: number, orden: number) => {
        setItemRefs(prev => prev.map(r =>
            r.rol === rol && (r.grupo || 1) === grupo
                ? { ...r, esPreferenciaActual: r.orden === orden }
                : r
        ));
    };

    const updateRef = (rol: string, grupo: number, orden: number, field: string, value: any) => {
        setItemRefs(prev => prev.map(r =>
            r.rol === rol && (r.grupo || 1) === grupo && r.orden === orden ? { ...r, [field]: value } : r
        ));
    };

    const removeRef = (rol: string, grupo: number, orden: number) => {
        setItemRefs(prev => {
            const filtered = prev.filter(r => !(r.rol === rol && (r.grupo || 1) === grupo && r.orden === orden));
            let idx = 1;
            return filtered.map(r => {
                if (r.rol === rol && (r.grupo || 1) === grupo) {
                    const newOrd = idx++;
                    return {
                        ...r,
                        orden: newOrd,
                        esPreferenciaActual: r.esPreferenciaActual || (newOrd === 1 && !filtered.some(f => f.rol === rol && (f.grupo || 1) === grupo && f.esPreferenciaActual)),
                    };
                }
                return r;
            });
        });
    };

    // ─── Machine types ─────────────────────────────────────────────────────────
    const toggleMachineType = (id: string) => {
        setMachineTypeIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
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
            desperdicio: form.desperdicio ? Number(form.desperdicio) : null,
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

            <DialogContent sx={{ py: 2.5 }}>
                {/* ── Sección 1: Datos Principales ── */}
                {sectionTitle('📋 Datos Generales')}

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1.5 }}>
                    <TextField
                        size="small"
                        label="Código *"
                        value={form.codigo}
                        onChange={e => handleFieldChange('codigo', e.target.value)}
                        sx={fieldStyle}
                    />
                    <TextField
                        size="small"
                        label="Descripción *"
                        value={form.descripcion}
                        onChange={e => handleFieldChange('descripcion', e.target.value)}
                        sx={fieldStyle}
                    />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
                    <TextField
                        select
                        size="small"
                        label="Categoría"
                        value={form.categoriaId}
                        onChange={e => handleFieldChange('categoriaId', e.target.value)}
                        sx={fieldStyle}
                    >
                        <MenuItem value=""><em>Sin Categoría</em></MenuItem>
                        {categorias.map(c => (
                            <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        size="small"
                        label="Working Number (W#)"
                        value={form.workingNumber}
                        onChange={e => handleFieldChange('workingNumber', e.target.value)}
                        sx={fieldStyle}
                    />

                    <TextField
                        size="small"
                        label="IM #"
                        value={form.im}
                        onChange={e => handleFieldChange('im', e.target.value)}
                        sx={fieldStyle}
                    />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 1.5 }}>
                    <TextField
                        size="small"
                        label="SSN / Temporada"
                        value={form.ssn}
                        onChange={e => handleFieldChange('ssn', e.target.value)}
                        sx={fieldStyle}
                    />
                    <TextField
                        size="small"
                        label="Talle"
                        value={form.talle}
                        onChange={e => handleFieldChange('talle', e.target.value)}
                        sx={fieldStyle}
                    />
                    <TextField
                        size="small"
                        label="Talle D.Media"
                        value={form.talleDMedia}
                        onChange={e => handleFieldChange('talleDMedia', e.target.value)}
                        sx={fieldStyle}
                    />
                    <TextField
                        size="small"
                        label="Desperdicio %"
                        type="number"
                        value={form.desperdicio}
                        onChange={e => handleFieldChange('desperdicio', e.target.value)}
                        sx={fieldStyle}
                    />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <TextField
                        size="small"
                        label="Programas"
                        value={form.programas}
                        onChange={e => handleFieldChange('programas', e.target.value)}
                        sx={fieldStyle}
                    />
                    <TextField
                        size="small"
                        label="Observaciones"
                        value={form.observacion}
                        onChange={e => handleFieldChange('observacion', e.target.value)}
                        sx={fieldStyle}
                    />
                </Box>

                <Divider sx={{ borderColor: '#2a2d3e', my: 2 }} />

                {/* ── Sección 2: Insumos por rol (Multicolor y Opciones) ── */}
                {sectionTitle('🧵 Insumos y Estructura BOM (Multicolor & Opciones)')}
                <Typography sx={{ color: '#6b7280', fontSize: '12px', mb: 2 }}>
                    Podés definir <b>múltiples colores</b> por componente (ej: Base Blanco y Base Negro) y hasta <b>3 alternativas de proveedor</b> por cada color. Tildá <b>⭐ En Uso</b> para marcar la opción activa.
                </Typography>

                {ROLES.map(({ value: rol, label }) => {
                    const grupos = getGruposForRol(rol);

                    return (
                        <Box key={rol} sx={{ mb: 2.5, p: 2, border: '1px solid #2a2d3e', borderRadius: '10px', background: '#0d1020' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                <Typography sx={{ color: '#c4b5fd', fontWeight: 700, fontSize: '13px' }}>{label}</Typography>
                                <Button size="small" onClick={() => addColorGrupo(rol)} sx={{ color: '#818cf8', fontSize: '11px', textTransform: 'none' }}>
                                    + Agregar Otro Color
                                </Button>
                            </Box>

                            {grupos.map((grupoNum, gIdx) => {
                                const refs = getRefsForRolAndGrupo(rol, grupoNum);
                                const colorNom = refs[0]?.colorNombre || '';

                                return (
                                    <Box key={grupoNum} sx={{ mb: 1.5, p: 1.5, border: '1px dashed #3730a3', borderRadius: '8px', background: '#13172b' }}>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
                                            <Chip label={`Color ${gIdx + 1}`} size="small" sx={{ background: '#312e81', color: '#c7d2fe', fontWeight: 600 }} />
                                            <TextField
                                                size="small"
                                                placeholder="Nombre del Color (ej: BLANCO, NEGRO, ICE BLUE)"
                                                value={colorNom}
                                                onChange={e => updateColorNombre(rol, grupoNum, e.target.value)}
                                                sx={{ ...fieldStyle, mb: 0, flex: 1 }}
                                            />
                                        </Box>

                                        {refs.map((ref) => (
                                            <Box key={ref.orden} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
                                                <Chip label={`Opción ${ref.orden}`} size="small" sx={{ background: '#1a1d2e', color: '#94a3b8', minWidth: '70px' }} />
                                                <TextField
                                                    select
                                                    size="small"
                                                    sx={{ ...fieldStyle, mb: 0, flex: 1, minWidth: '220px' }}
                                                    value={ref.itemId}
                                                    onChange={e => updateRef(rol, grupoNum, ref.orden, 'itemId', e.target.value)}
                                                    label="Hilado / Material"
                                                >
                                                    <MenuItem value=""><em>Seleccionar...</em></MenuItem>
                                                    {items.map((it: any) => (
                                                        <MenuItem key={it.id} value={it.id}>
                                                            {it.codigoInterno} — {it.descripcion}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={ref.esPreferenciaActual}
                                                            onChange={() => setPreferenciaActualInGrupo(rol, grupoNum, ref.orden)}
                                                            size="small"
                                                            sx={{ color: '#10b981', '&.Mui-checked': { color: '#10b981' } }}
                                                        />
                                                    }
                                                    label={
                                                        <Typography sx={{ fontSize: '11px', color: ref.esPreferenciaActual ? '#34d399' : '#9ca3af', fontWeight: ref.esPreferenciaActual ? 700 : 400 }}>
                                                            ⭐ En Uso
                                                        </Typography>
                                                    }
                                                />
                                                <FormControlLabel
                                                    control={<Checkbox checked={ref.activo} onChange={e => updateRef(rol, grupoNum, ref.orden, 'activo', e.target.checked)} size="small" sx={{ color: '#6366f1', '&.Mui-checked': { color: '#6366f1' } }} />}
                                                    label={<Typography sx={{ fontSize: '12px', color: '#9ca3af' }}>Activo</Typography>}
                                                />
                                                <IconButton size="small" onClick={() => removeRef(rol, grupoNum, ref.orden)} sx={{ color: '#ef4444' }}>✕</IconButton>
                                            </Box>
                                        ))}

                                        {refs.length < 3 && (
                                            <Button size="small" onClick={() => addOptionToGrupo(rol, grupoNum)} sx={{ color: '#6366f1', fontSize: '11px', mt: 0.5, textTransform: 'none' }}>
                                                + Agregar alternativa de proveedor para este color
                                            </Button>
                                        )}
                                    </Box>
                                );
                            })}
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
