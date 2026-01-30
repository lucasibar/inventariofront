import { useForm, Controller } from 'react-hook-form';
import {
    Box,
    Button,
    TextField,
    MenuItem,
    FormControlLabel,
    Switch,
    Typography,
    Paper,
    Grid
} from '@mui/material';
import { ItemCategory, useCreateItemMutation } from '../../../entities/item';

interface CreateItemFormProps {
    onSuccess?: () => void;
}

export const CreateItemForm = ({ onSuccess }: CreateItemFormProps) => {
    const [createItem, { isLoading }] = useCreateItemMutation();
    const { control, handleSubmit, reset } = useForm({
        defaultValues: {
            codigoInterno: '',
            descripcion: '',
            categoria: ItemCategory.SUPPLY, // Default
            unidadPrincipal: 'UNIDAD',
            cantidadPrincipal: 1,
            unidadSecundaria: '', // Optional
            cantidadSecundaria: 0,
            trackLot: false,
        },
    });

    const onSubmit = async (data: any) => {
        try {
            // Clean up empty optional fields
            const payload = {
                ...data,
                unidadSecundaria: data.unidadSecundaria || null,
                cantidadSecundaria: data.cantidadSecundaria || null,
                cantidadPrincipal: Number(data.cantidadPrincipal),
            };

            await createItem(payload).unwrap();
            reset();
            if (onSuccess) onSuccess();
            alert('Item creado con éxito'); // Simple feedback for MVP
        } catch (error) {
            console.error('Failed to create item', error);
            alert('Error al crear item');
        }
    };

    return (
        <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto', mt: 4 }}>
            <Typography variant="h5" gutterBottom color="primary">
                Alta de Artículo
            </Typography>
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 2 }}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller
                            name="codigoInterno"
                            control={control}
                            rules={{ required: 'Código es obligatorio' }}
                            render={({ field, fieldState: { error } }) => (
                                <TextField
                                    {...field}
                                    label="Código Interno"
                                    fullWidth
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller
                            name="categoria"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} select label="Categoría" fullWidth>
                                    {Object.values(ItemCategory).map((cat) => (
                                        <MenuItem key={cat} value={cat}>
                                            {cat}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                    </Grid>
                    <Grid size={12}>
                        <Controller
                            name="descripcion"
                            control={control}
                            rules={{ required: 'Descripción es obligatoria' }}
                            render={({ field, fieldState: { error } }) => (
                                <TextField
                                    {...field}
                                    label="Descripción"
                                    fullWidth
                                    multiline
                                    rows={2}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller
                            name="unidadPrincipal"
                            control={control}
                            rules={{ required: true }}
                            render={({ field }) => (
                                <TextField {...field} label="Unidad Principal" fullWidth />
                            )}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller
                            name="cantidadPrincipal"
                            control={control}
                            rules={{ required: true, min: 0.01 }}
                            render={({ field }) => (
                                <TextField {...field} type="number" label="Cantidad Base" fullWidth />
                            )}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller
                            name="unidadSecundaria"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="Unidad Secundaria (Opcional)" fullWidth />
                            )}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller
                            name="trackLot"
                            control={control}
                            render={({ field: { value, onChange } }) => (
                                <FormControlLabel
                                    control={<Switch checked={value} onChange={onChange} />}
                                    label="Controlar Lotes"
                                />
                            )}
                        />
                    </Grid>

                    <Grid size={12}>
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            fullWidth
                            disabled={isLoading}
                            sx={{ mt: 2 }}
                        >
                            {isLoading ? 'Guardando...' : 'Crear Artículo'}
                        </Button>
                    </Grid>
                </Grid>
            </Box>
        </Paper>
    );
};
