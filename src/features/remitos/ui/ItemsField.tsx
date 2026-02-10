
import { Box, Button, Typography, IconButton, Grid, TextField, MenuItem, Switch, FormControlLabel } from '@mui/material';
import { useFieldArray, useFormContext, Controller } from 'react-hook-form';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { ItemCategory } from '../model/create-remito.dto';

export const ItemsField = () => {
    const { control, register } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'items'
    });

    const categories = Object.values(ItemCategory);

    return (
        <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Items</Typography>
                <Button
                    startIcon={<AddIcon />}
                    variant="outlined"
                    onClick={() => append({
                        codigoInterno: '',
                        descripcion: '',
                        quantity: 1,
                        categoria: ItemCategory.SUPPLY,
                        unidadPrincipal: 'UNIDAD',
                        trackLot: false
                    })}
                >
                    Agregar Item
                </Button>
            </Box>

            {fields.map((field, index) => (
                <Box key={field.id} sx={{ mb: 3, p: 2, border: '1px solid #eee', borderRadius: 1, position: 'relative' }}>
                    <IconButton
                        onClick={() => remove(index)}
                        sx={{ position: 'absolute', top: 5, right: 5 }}
                        color="error"
                    >
                        <DeleteIcon />
                    </IconButton>

                    <Typography variant="subtitle2" sx={{ mb: 2 }}>Item #{index + 1}</Typography>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Código Interno"
                                fullWidth
                                {...register(`items.${index}.codigoInterno` as const, { required: true })}
                                placeholder="Si existe, se usará. Si no, se creará."
                            />
                        </Grid>
                        <Grid item xs={12} sm={8}>
                            <TextField
                                label="Descripción"
                                fullWidth
                                {...register(`items.${index}.descripcion` as const, { required: true })}
                            />
                        </Grid>

                        <Grid item xs={6} sm={3}>
                            <TextField
                                type="number"
                                label="Cantidad"
                                fullWidth
                                {...register(`items.${index}.quantity` as const, { required: true, min: 1 })}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <TextField
                                select
                                label="Categoría"
                                fullWidth
                                defaultValue={ItemCategory.SUPPLY}
                                {...register(`items.${index}.categoria` as const)}
                            >
                                {categories.map(cat => (
                                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <TextField
                                label="Unidad"
                                fullWidth
                                defaultValue="UNIDAD"
                                {...register(`items.${index}.unidadPrincipal` as const)}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Controller
                                name={`items.${index}.trackLot`}
                                control={control}
                                render={({ field: { value, onChange } }) => (
                                    <FormControlLabel
                                        control={<Switch checked={value} onChange={onChange} />}
                                        label="Lote?"
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="ID Lote (Opcional)"
                                fullWidth
                                {...register(`items.${index}.lotId` as const)}
                            />
                        </Grid>
                    </Grid>
                </Box>
            ))}
        </Box>
    );
};
