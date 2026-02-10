
import { Autocomplete, TextField, Box, Typography, Grid } from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import { useLazySearchPartnersQuery } from '../api/remito.api';
import { useState, useEffect } from 'react';

export const ProviderField = () => {
    const { control, setValue, watch, register } = useFormContext(); // Expects to be in FormContext
    const [triggerSearch, { data: partners = [], isFetching }] = useLazySearchPartnersQuery();
    const [options, setOptions] = useState<any[]>([]);

    // We watch the provider object to see if we are in "Create new" mode implicitly
    // Actually, let's use Autocomplete freeSolo.

    // If user types a name that doesn't exist, we capture it as name but id will be undefined.
    // If user selects existing, we set id and name.

    return (
        <Box sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>Proveedor</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Controller
                        name="provider"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                            <Autocomplete
                                freeSolo
                                options={partners}
                                getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
                                loading={isFetching}
                                onInputChange={(_, newInputValue) => {
                                    triggerSearch(newInputValue);
                                    // If user is typing, we assume they might want to create a new one with this name
                                    // But Autocomplete logic is tricky. 
                                    // Let's simplified: If freeSolo text, we treat as new name.
                                    if (!value?.id || value.name !== newInputValue) {
                                        // Update form state to reflect new name, cleared ID
                                        setValue('provider.name', newInputValue);
                                        setValue('provider.id', undefined);
                                    }
                                }}
                                onChange={(_, newValue) => {
                                    if (typeof newValue === 'string') {
                                        setValue('provider.name', newValue);
                                        setValue('provider.id', undefined);
                                    } else if (newValue) {
                                        onChange(newValue); // Sets the whole object
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Buscar o Crear Proveedor (Nombre)"
                                        placeholder="Escriba para buscar o crear nuevo"
                                    />
                                )}
                            />
                        )}
                    />
                </Grid>
                {/* Extra fields for new provider */}
                <Grid item xs={6}>
                    <TextField
                        label="CUIT (Opcional para nuevo)"
                        fullWidth
                        {...register('provider.taxId')}
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        label="Email (Opcional)"
                        fullWidth
                        {...register('provider.email')}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};
