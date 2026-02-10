
import { useForm, FormProvider } from 'react-hook-form';
import { Box, Button, TextField, Typography, Paper, Grid, MenuItem } from '@mui/material';
import { useCreateRemitoMutation, useGetDepotsQuery } from '../api/remito.api';
import { ProviderField } from './ProviderField';
import { ItemsField } from './ItemsField';
import { CreateRemitoDto } from '../model/create-remito.dto';

export const CreateRemitoForm = () => {
    const methods = useForm<CreateRemitoDto>({
        defaultValues: {
            // userId and documentId handled here or backend? 
            // documentId is usually the Remito Number input by user.
            documentId: '',
            items: [],
            provider: { name: '' } // Init
        }
    });

    const [createRemito, { isLoading }] = useCreateRemitoMutation();
    const { data: depots = [] } = useGetDepotsQuery();

    const onSubmit = async (data: CreateRemitoDto) => {
        try {
            // Enrich data if needed
            const payload = {
                ...data,
                userId: '7f90df3e-2de1-4f10-912f-90e1f7253573', // HARDCODED USER FOR NOW (Admin)
                items: data.items.map(i => ({
                    ...i,
                    quantity: Number(i.quantity)
                }))
            };

            await createRemito(payload).unwrap();
            alert('Remito creado con éxito');
            methods.reset();
        } catch (err) {
            console.error(err);
            alert('Error al crear remito');
        }
    };

    return (
        <Paper sx={{ p: 4, maxWidth: 1000, mx: 'auto', mt: 4 }}>
            <Typography variant="h5" color="primary" gutterBottom>Ingreso de Remito</Typography>

            <FormProvider {...methods}>
                <Box component="form" onSubmit={methods.handleSubmit(onSubmit)}>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Número de Remito"
                                fullWidth
                                required
                                {...methods.register('documentId', { required: true })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                label="Depósito Destino"
                                fullWidth
                                required
                                defaultValue=""
                                {...methods.register('depotId', { required: true })}
                            >
                                {depots.map((d: any) => (
                                    <MenuItem key={d.id} value={d.id}>
                                        {d.nombre || d.id}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    </Grid>

                    <ProviderField />
                    <ItemsField />

                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        sx={{ mt: 4 }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Procesando...' : 'Registrar Ingreso'}
                    </Button>
                </Box>
            </FormProvider>
        </Paper>
    );
};
