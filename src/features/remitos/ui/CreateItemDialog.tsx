
import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Typography, Box
} from '@mui/material';
import { useCreateItemMutation, useUpdateItemMutation, useGetItemCategoriesQuery, useCreateItemCategoryMutation } from '../../items/api/items.api';
import { useGetBoxTypesQuery } from '../../items/api/box-types.api';
import { useLazySearchPartnersQuery } from '../api/remito.api';
import { Autocomplete, createFilterOptions } from '@mui/material';

const filter = createFilterOptions<any>();

const ROTACIONES = [
    { value: 'ALTA', label: '🔴 Alta' },
    { value: 'MEDIA', label: '🟡 Media' },
    { value: 'BAJA', label: '⚫ Baja' },
    { value: 'TEMPORAL', label: '⏳ Temporal' },
];

interface CreateItemDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: (newItem: any) => void;
    initialSupplierId?: string;
    initialSupplierName?: string;
    depositoId?: string;
    editTarget?: any; // New prop for editing
}

export const CreateItemDialog = ({ open, onClose, onSuccess, initialSupplierId, initialSupplierName, depositoId, editTarget }: CreateItemDialogProps) => {
    const [createItem, { isLoading: isCreating }] = useCreateItemMutation();
    const [updateItem, { isLoading: isUpdating }] = useUpdateItemMutation();
    const isLoading = isCreating || isUpdating;
    const { data: categories = [], isLoading: isLoadingCats } = useGetItemCategoriesQuery(depositoId || '');
    const [createCategory] = useCreateItemCategoryMutation();
    const { data: boxTypes = [] } = useGetBoxTypesQuery();

    const [triggerSearch, { data: partners = [], isFetching: isSearchingPartners }] = useLazySearchPartnersQuery();
    const [form, setForm] = useState({
        codigoInterno: '',
        descripcion: '',
        categoryId: '',
        rotacion: 'MEDIA',
        stockMinimo: '',
        stockMaximo: '', // New
        kilosPorCaja: '', // New
        unidadPrincipal: 'KG',
        unidadSecundaria: '',
        tono: '', // New
        boxTypeId: '', // New
        supplierId: initialSupplierId || '',
        supplierName: initialSupplierName || ''
    });

    useEffect(() => {
        if (open) {
            if (editTarget) {
                setForm({
                    codigoInterno: editTarget.codigoInterno || '',
                    descripcion: editTarget.descripcion || '',
                    categoryId: editTarget.categoryId || '',
                    rotacion: editTarget.rotacion || 'MEDIA',
                    stockMinimo: editTarget.stockMinimo != null ? String(editTarget.stockMinimo) : '',
                    stockMaximo: editTarget.stockMaximo != null ? String(editTarget.stockMaximo) : '',
                    kilosPorCaja: editTarget.kilosPorCaja != null ? String(editTarget.kilosPorCaja) : '',
                    unidadPrincipal: editTarget.unidadPrincipal || 'KG',
                    unidadSecundaria: editTarget.unidadSecundaria || '',
                    tono: editTarget.tono || '',
                    boxTypeId: editTarget.boxTypeId || '',
                    supplierId: editTarget.supplierId || '',
                    supplierName: editTarget.supplier?.name || ''
                });
            } else {
                setForm({
                    codigoInterno: '',
                    descripcion: '',
                    categoryId: '',
                    rotacion: 'MEDIA',
                    stockMinimo: '',
                    stockMaximo: '',
                    kilosPorCaja: '',
                    unidadPrincipal: 'KG',
                    unidadSecundaria: '',
                    tono: '',
                    boxTypeId: '',
                    supplierId: initialSupplierId || '',
                    supplierName: initialSupplierName || '',
                });
            }
            setError('');
        }
    }, [open, initialSupplierId, initialSupplierName, editTarget]);
    const [error, setError] = useState('');

    const handleSave = async () => {
        try {
            const dto = {
                ...form,
                stockMinimo: form.stockMinimo ? Number(form.stockMinimo) : undefined,
                stockMaximo: form.stockMaximo ? Number(form.stockMaximo) : undefined,
                kilosPorCaja: form.kilosPorCaja ? Number(form.kilosPorCaja) : undefined,
            };
            
            let result;
            if (editTarget) {
                result = await updateItem({ id: editTarget.id, data: dto }).unwrap();
            } else {
                result = await createItem(dto).unwrap();
            }
            
            if (onSuccess) onSuccess(result);
            onClose();
            setForm({
                codigoInterno: '',
                descripcion: '',
                categoryId: '',
                rotacion: 'MEDIA',
                stockMinimo: '',
                stockMaximo: '',
                kilosPorCaja: '',
                unidadPrincipal: 'KG',
                unidadSecundaria: '',
                tono: '',
                boxTypeId: '',
                supplierId: '',
                supplierName: '',
            });
        } catch (err: any) {
            setError(err?.data?.message || 'Error al crear el material');
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: { borderRadius: { xs: 0, sm: 3 }, m: { xs: 0, sm: 2 } }
            }}
        >
            <DialogTitle sx={{ fontWeight: 800, px: 3, pt: 3, color: 'text.primary', letterSpacing: '-0.5px' }}>
                {editTarget ? 'Editar Material' : 'Nuevo Material'}
            </DialogTitle>
            <DialogContent sx={{ px: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Complete los datos básicos para registrar un nuevo material en el catálogo.
                </Typography>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2
                }}>
                    <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                        <TextField
                            label="Código Interno"
                            fullWidth
                            variant="filled"
                            value={form.codigoInterno}
                            InputLabelProps={{ shrink: true }}
                            onChange={(e) => setForm({ ...form, codigoInterno: e.target.value })}
                        />
                    </Box>
                    <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                        <TextField
                            label="Descripción"
                            fullWidth
                            required
                            variant="filled"
                            value={form.descripcion}
                            InputLabelProps={{ shrink: true }}
                            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                        />
                    </Box>
                    <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                        <Autocomplete
                            value={categories.find(c => c.id === form.categoryId) || null}
                            onChange={async (_, newValue) => {
                                if (typeof newValue === 'string') {
                                    // This shouldn't happen with the new logic, but handle just in case
                                } else if (newValue && newValue.inputValue) {
                                    if (depositoId) {
                                        try {
                                            const res = await createCategory({ nombre: newValue.inputValue, depositoId }).unwrap();
                                            setForm({ ...form, categoryId: res.id });
                                        } catch (e) {
                                            alert('Error creando categoría');
                                        }
                                    } else {
                                        alert('Debe seleccionar un depósito primero');
                                    }
                                } else {
                                    setForm({ ...form, categoryId: newValue?.id || '' });
                                }
                            }}
                            filterOptions={(options, params) => {
                                const filtered = filter(options, params);
                                const { inputValue } = params;
                                const isExisting = options.some((option) => inputValue === option.nombre);
                                if (inputValue !== '' && !isExisting) {
                                    filtered.push({
                                        inputValue,
                                        nombre: `Añadir "${inputValue}"`,
                                    });
                                }
                                return filtered;
                            }}
                            selectOnFocus
                            clearOnBlur
                            handleHomeEndKeys
                            id="category-autocomplete"
                            options={categories}
                            getOptionLabel={(option) => option.nombre || ''}
                            renderOption={(props, option) => <li {...props} key={option.id}>{option.nombre}</li>}
                            loading={isLoadingCats}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Categoría"
                                    required
                                    variant="filled"
                                    fullWidth
                                    placeholder="Seleccionar o crear..."
                                />
                            )}
                        />
                    </Box>
                    <Box>
                        <TextField
                            select
                            label="Rotación"
                            fullWidth
                            variant="filled"
                            value={form.rotacion}
                            onChange={(e) => setForm({ ...form, rotacion: e.target.value })}
                        >
                            {ROTACIONES.map((rot) => (
                                <MenuItem key={rot.value} value={rot.value}>{rot.label}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                    <Box>
                        <Autocomplete
                            options={boxTypes}
                            getOptionLabel={(option) => option.nombre}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            value={boxTypes.find(bt => bt.id === form.boxTypeId) || null}
                            onChange={(_, newValue) => setForm({ ...form, boxTypeId: newValue?.id || '' })}
                            renderInput={(params) => (
                                <TextField 
                                    {...params} 
                                    label="Tipo de Embalaje" 
                                    variant="filled"
                                    placeholder="Seleccionar caja..."
                                />
                            )}
                        />
                    </Box>
                    <Box>
                        <TextField
                            label="Alerta Stock Mín."
                            type="number"
                            fullWidth
                            variant="filled"
                            placeholder="Ej: 100"
                            value={form.stockMinimo}
                            onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
                        />
                    </Box>
                    <Box>
                        <TextField
                            label="Stock Máximo"
                            type="number"
                            fullWidth
                            variant="filled"
                            value={form.stockMaximo}
                            onChange={(e) => setForm({ ...form, stockMaximo: e.target.value })}
                        />
                    </Box>
                    <Box>
                        <TextField
                            label="Kilos por Caja"
                            type="number"
                            fullWidth
                            variant="filled"
                            value={form.kilosPorCaja}
                            onChange={(e) => setForm({ ...form, kilosPorCaja: e.target.value })}
                        />
                    </Box>
                    <Box>
                        <TextField
                            select
                            label="Tono"
                            fullWidth
                            variant="filled"
                            value={form.tono}
                            onChange={(e) => setForm({ ...form, tono: e.target.value })}
                        >
                            <MenuItem value="">Sin tono</MenuItem>
                            <MenuItem value="AMARILLO">🟡 Amarillo</MenuItem>
                            <MenuItem value="NARANJA">🟠 Naranja</MenuItem>
                            <MenuItem value="AZUL">🔵 Azul</MenuItem>
                            <MenuItem value="ROJO">🔴 Rojo</MenuItem>
                            <MenuItem value="VERDE">🟢 Verde</MenuItem>
                            <MenuItem value="MARRÓN">🟫 Marrón</MenuItem>
                            <MenuItem value="GRIS">🔘 Gris</MenuItem>
                            <MenuItem value="VIOLETA">🟣 Violeta</MenuItem>
                            <MenuItem value="ROSA">🌸 Rosa</MenuItem>
                            <MenuItem value="CELESTE">🩵 Celeste</MenuItem>
                            <MenuItem value="BLANCO">⬜ Blanco</MenuItem>
                            <MenuItem value="NEGRO">⬛ Negro</MenuItem>
                        </TextField>
                    </Box>
                    <Box>
                        <TextField
                            label="Unidad Principal"
                            fullWidth
                            variant="filled"
                            placeholder="Ej: KG"
                            value={form.unidadPrincipal}
                            onChange={(e) => setForm({ ...form, unidadPrincipal: e.target.value })}
                        />
                    </Box>
                    <Box>
                        <TextField
                            label="Unidad Secundaria"
                            fullWidth
                            variant="filled"
                            placeholder="Ej: Unidades, bolsas..."
                            value={form.unidadSecundaria}
                            onChange={(e) => setForm({ ...form, unidadSecundaria: e.target.value })}
                        />
                    </Box>
                    <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                        <Autocomplete
                            options={partners}
                            getOptionLabel={(option: any) => `${option.name} ${option.taxId ? `(${option.taxId})` : ''}`}
                            value={form.supplierId ? { id: form.supplierId, name: form.supplierName } : null}
                            isOptionEqualToValue={(option, value) => option.id === value?.id}
                            loading={isSearchingPartners}
                            onInputChange={(_, newInputValue) => triggerSearch(newInputValue)}
                            onChange={(_, newValue) => {
                                setForm({
                                    ...form,
                                    supplierId: newValue?.id || '',
                                    supplierName: newValue?.name || ''
                                });
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Proveedor Principal (Opcional)"
                                    placeholder="Vincular a un proveedor..."
                                    variant="filled"
                                    fullWidth
                                />
                            )}
                        />
                    </Box>
                    {error && (
                        <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                            <Typography color="error" variant="caption" sx={{ fontWeight: 600 }}>{error}</Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>Cancelar</Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disableElevation
                    sx={{ fontWeight: 600, px: 3 }}
                    disabled={isLoading || !form.descripcion}
                >
                    {isLoading ? (editTarget ? 'Actualizando...' : 'Guardando...') : (editTarget ? 'Guardar Cambios' : 'Crear Material')}
                </Button>
            </DialogActions>
        </Dialog >
    );
};
