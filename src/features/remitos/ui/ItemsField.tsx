
import {
    Box, Button, Typography, IconButton, TextField,
    Divider, Tooltip, Autocomplete
} from '@mui/material';
import { useFieldArray, useFormContext } from 'react-hook-form';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import type { ItemCategory } from '../model/create-remito.dto';
import { useState, useMemo } from 'react';
import { CreateItemDialog } from './CreateItemDialog';
import { useGetItemsQuery } from '../../items/api/items.api';

export const ItemsField = ({ supplierId }: { supplierId?: string }) => {
    const { control, register, setValue, watch } = useFormContext();
    const supplierName = watch('supplierName');
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'lines'
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

    const { data: allItems = [] } = useGetItemsQuery({});

    const availableItems = useMemo(() => {
        if (!supplierId) return allItems;
        // Filter items by supplier if the item object contains supplier info
        // Or show all if no specific field exists, but the user implies a relation
        return allItems.filter((it: any) => !it.supplierId || it.supplierId === supplierId);
    }, [allItems, supplierId]);

    const handleNewMaterial = (index: number) => {
        setActiveItemIndex(index);
        setIsDialogOpen(true);
    };

    const handleMaterialCreated = (newItem: any) => {
        if (activeItemIndex !== null) {
            setValue(`lines.${activeItemIndex}.codigoInterno`, newItem.codigoInterno);
            setValue(`lines.${activeItemIndex}.descripcion`, newItem.descripcion);
            setValue(`lines.${activeItemIndex}.categoria`, newItem.categoria);
            setValue(`lines.${activeItemIndex}.itemId`, newItem.id);
        }
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.5px' }}>
                    Items del Documento
                </Typography>
                <Button
                    startIcon={<AddIcon />}
                    variant="text"
                    size="small"
                    onClick={() => append({
                        codigoInterno: '',
                        descripcion: '',
                        kilos: 0,
                        unidades: 0,
                        categoria: 'SUPPLY',
                        trackLot: false,
                        lotNumber: ''
                    })}
                    sx={{ fontWeight: 600 }}
                >
                    Agregar Fila
                </Button>
            </Box>

            {fields.map((field, index) => (
                <Box key={field.id} sx={{ mb: 3, p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', position: 'relative' }}>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '2.5fr 3.5fr 1fr 1fr 2fr 1.2fr' },
                        gap: 1.5,
                        alignItems: 'flex-start'
                    }}>
                        <Box>
                            <Autocomplete
                                options={availableItems}
                                getOptionLabel={(option: any) => `${option.codigoInterno} - ${option.descripcion}`}
                                onChange={(_, newValue: any) => {
                                    if (newValue) {
                                        setValue(`lines.${index}.codigoInterno`, newValue.codigoInterno);
                                        setValue(`lines.${index}.descripcion`, newValue.descripcion);
                                        setValue(`lines.${index}.categoria`, newValue.categoria);
                                        setValue(`lines.${index}.itemId`, newValue.id);
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Material"
                                        variant="filled"
                                        size="small"
                                        placeholder="Buscar..."
                                        {...register(`lines.${index}.codigoInterno` as const, { required: true })}
                                    />
                                )}
                            />
                        </Box>
                        <Box>
                            <TextField
                                label="Descripción"
                                fullWidth
                                variant="filled"
                                size="small"
                                InputProps={{ readOnly: true }}
                                {...register(`lines.${index}.descripcion` as const)}
                            />
                        </Box>
                        <Box>
                            <TextField
                                type="number"
                                label="Kilos"
                                fullWidth
                                variant="filled"
                                size="small"
                                {...register(`lines.${index}.kilos` as const, { required: true, min: 0.01 })}
                            />
                        </Box>
                        <Box>
                            <TextField
                                type="number"
                                label="Unidades"
                                fullWidth
                                variant="filled"
                                size="small"
                                {...register(`lines.${index}.unidades` as const, { min: 0 })}
                            />
                        </Box>
                        <Box>
                            <TextField
                                label="Partida"
                                fullWidth
                                variant="filled"
                                size="small"
                                placeholder="Opcional"
                                {...register(`lines.${index}.lotNumber` as const)}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: { xs: 0, sm: 1 } }}>
                            <Tooltip title="Nuevo Material">
                                <IconButton size="small" color="primary" onClick={() => handleNewMaterial(index)}>
                                    <AddCircleOutlineIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <IconButton size="small" color="error" onClick={() => remove(index)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>
                    {index < fields.length - 1 && <Divider sx={{ mt: 2, display: { xs: 'block', sm: 'none' } }} />}
                </Box>
            ))}

            {fields.length === 0 && (
                <Box sx={{
                    py: 6,
                    textAlign: 'center',
                    border: '1px dashed',
                    borderColor: 'divider',
                    borderRadius: 3,
                    backgroundColor: 'transparent'
                }}>
                    <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        No hay items cargados. Presione "Agregar Fila" para comenzar.
                    </Typography>
                </Box>
            )}

            <CreateItemDialog
                open={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSuccess={handleMaterialCreated}
                initialSupplierId={supplierId}
                initialSupplierName={supplierName}
            />
        </Box>
    );
};
