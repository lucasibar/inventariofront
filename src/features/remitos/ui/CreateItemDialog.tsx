
import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, FormControlLabel, Typography, Box
} from '@mui/material';
import { useCreateItemMutation } from '../../items/api/items.api';
import { useLazySearchPartnersQuery } from '../api/remito.api';
import { Autocomplete } from '@mui/material';

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
}

export const CreateItemDialog = ({ open, onClose, onSuccess, initialSupplierId, initialSupplierName }: CreateItemDialogProps) => {
    const [createItem, { isLoading }] = useCreateItemMutation();
    const [triggerSearch, { data: partners = [], isFetching: isSearchingPartners }] = useLazySearchPartnersQuery();
    const [form, setForm] = useState({
        codigoInterno: '',
        descripcion: '',
        categoria: 'MATERIA PRIMA',
        rotacion: 'MEDIA',
        alertaKilos: '',
        unidadPrincipal: 'KG',
        unidadSecundaria: '',
        trackLot: false,
        supplierId: initialSupplierId || '',
        supplierName: initialSupplierName || ''
    });

    useEffect(() => {
        if (open) {
            setForm(prev => ({
                ...prev,
                supplierId: initialSupplierId || '',
                supplierName: initialSupplierName || '',
                categoria: 'MATERIA PRIMA'
            }));
        }
    }, [open, initialSupplierId, initialSupplierName]);
    const [error, setError] = useState('');

    const handleSave = async () => {
        try {
            const newItem = await createItem({
                ...form,
                alertaKilos: form.alertaKilos ? Number(form.alertaKilos) : undefined
            }).unwrap();
            if (onSuccess) onSuccess(newItem);
            onClose();
            setForm({
                codigoInterno: '',
                descripcion: '',
                categoria: 'MATERIA PRIMA',
                rotacion: 'MEDIA',
                alertaKilos: '',
                unidadPrincipal: 'KG',
                unidadSecundaria: '',
                trackLot: false,
                supplierId: '',
                supplierName: ''
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
                Nuevo Material
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
                        <TextField
                            label="Alerta en kilos"
                            type="number"
                            fullWidth
                            variant="filled"
                            placeholder="Ej: 100"
                            value={form.alertaKilos}
                            onChange={(e) => setForm({ ...form, alertaKilos: e.target.value })}
                        />
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
                    {isLoading ? 'Guardando...' : 'Crear Material'}
                </Button>
            </DialogActions>
        </Dialog >
    );
};
