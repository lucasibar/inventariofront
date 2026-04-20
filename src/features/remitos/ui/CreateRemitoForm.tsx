
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { Box, Button, TextField, Typography, MenuItem, Divider, IconButton, Tooltip, Autocomplete } from '@mui/material';
import { useCreateRemitoMutation, useGetDepotsQuery, useLazySearchPartnersQuery } from '../api/remito.api';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { ItemsField } from './ItemsField';
import { CreatePartnerDialog } from './CreatePartnerDialog';
import type { CreateRemitoDto } from '../model/create-remito.dto';
import { useState, useMemo, useEffect } from 'react';

export const CreateRemitoForm = () => {
    const methods = useForm<CreateRemitoDto>({
        defaultValues: {
            numero: '',
            fecha: new Date().toISOString().split('T')[0],
            observaciones: '',
            lines: []
        }
    });

    const [isPartnerDialogOpen, setIsPartnerDialogOpen] = useState(false);
    const [createRemito, { isLoading }] = useCreateRemitoMutation();
    const { data: allDepots = [] } = useGetDepotsQuery();
    const [selectedPlanta, setSelectedPlanta] = useState<string>('');
    const [triggerSearch, { data: partners = [], isFetching }] = useLazySearchPartnersQuery();

    useEffect(() => {
        triggerSearch('');
    }, [triggerSearch]);

    const plants = useMemo(() => {
        const unique = new Set(allDepots.map((d: any) => d.planta).filter(Boolean));
        return Array.from(unique);
    }, [allDepots]);

    const filteredDepots = useMemo(() => {
        if (!selectedPlanta) return [];
        return allDepots.filter((d: any) => d.planta === selectedPlanta);
    }, [allDepots, selectedPlanta]);

    const selectedSupplierId = methods.watch('supplierId');

    const onSubmit = async (data: CreateRemitoDto) => {
        try {
            if (!data.depotId) {
                alert('Debe seleccionar un depósito');
                return;
            }

            if (!data.lines || data.lines.length === 0) {
                alert('Debe agregar al menos un item al remito');
                return;
            }

            // Comprobar si hay errores de validación (ej: partidas faltantes)
            // Aunque handleSubmit evita llegar aquí si hay errores, esto es una capa extra de seguridad.

            // Simplified payload: the backend now resolves "ENTRADA" position automatically via depotId
            const payload: any = {
                ...data,
                // Ensure numbers are sent as numbers
                lines: data.lines.map(line => ({
                    ...line,
                    qtyPrincipal: Number(line.qtyPrincipal),
                    qtySecundaria: line.qtySecundaria != null ? Number(line.qtySecundaria) : undefined
                }))
            };

            // Leaner payload: don't send name/taxId if we have the ID
            if (payload.supplierId) {
                delete payload.supplierName;
                delete payload.taxId;
            }

            await createRemito(payload).unwrap();
            alert('Remito registrado exitosamente');
            methods.reset({
                numero: '',
                fecha: new Date().toISOString().split('T')[0],
                observaciones: '',
                lines: []
            });
            setSelectedPlanta('');
        } catch (err: any) {
            console.error('Error submitting remito:', err);
            const msg = err?.data?.message || 'Error al registrar el remito';
            alert(msg);
        }
    };

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-1px', color: 'text.primary' }}>
                Registrar Remito
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', fontWeight: 500 }}>
                Ingrese los datos del documento y los materiales recibidos.
            </Typography>

            <FormProvider {...methods}>
                <Box component="form" onSubmit={methods.handleSubmit(onSubmit)}>
                    {/* Section: Datos Generales */}
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                        Datos Generales
                    </Typography>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr 1fr 1fr' },
                        gap: 2,
                        mb: 4
                    }}>
                        <TextField
                            label="Número de Remito"
                            fullWidth
                            required
                            variant="filled"
                            {...methods.register('numero', { required: true })}
                        />
                        <TextField
                            type="date"
                            label="Fecha de Emisión"
                            fullWidth
                            required
                            variant="filled"
                            InputLabelProps={{ shrink: true }}
                            {...methods.register('fecha', { required: true })}
                        />

                        <TextField
                            select
                            label="Planta"
                            fullWidth
                            required
                            variant="filled"
                            value={selectedPlanta}
                            onChange={(e) => {
                                setSelectedPlanta(e.target.value);
                                methods.setValue('depotId', '');
                            }}
                        >
                            <MenuItem disabled value=""><em>Seleccione Planta...</em></MenuItem>
                            {plants.map((p: any) => (
                                <MenuItem key={p} value={p}>{p}</MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Depósito Destino"
                            fullWidth
                            required
                            disabled={!selectedPlanta}
                            variant="filled"
                            {...methods.register('depotId', { required: true })}
                            value={methods.watch('depotId') || ''}
                            onChange={(e) => methods.setValue('depotId', e.target.value)}
                        >
                            <MenuItem disabled value=""><em>{selectedPlanta ? 'Seleccione Depósito...' : 'Primero seleccione planta'}</em></MenuItem>
                            {filteredDepots.map((d: any) => (
                                <MenuItem key={d.id} value={d.id}>
                                    {d.nombre}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>

                    <TextField
                        label="Observaciones (Opcional)"
                        fullWidth
                        multiline
                        rows={2}
                        variant="filled"
                        sx={{ mb: 4 }}
                        {...methods.register('observaciones')}
                    />

                    {/* Section: Proveedor Integrada */}
                    <Box sx={{ mb: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mb: 0 }}>
                                Proveedor
                            </Typography>
                            <Tooltip title="Nuevo Proveedor">
                                <IconButton size="small" color="primary" onClick={() => setIsPartnerDialogOpen(true)}>
                                    <AddCircleOutlineIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}>
                            <Controller
                                name="supplierId"
                                control={methods.control}
                                render={({ field: { onChange, value } }) => (
                                    <Autocomplete
                                        options={partners}
                                        getOptionLabel={(option: any) => `${option.name} ${option.taxId ? `(${option.taxId})` : ''}`}
                                        value={partners.find((p: any) => p.id === value) || null}
                                        isOptionEqualToValue={(option, val) => option.id === val?.id}
                                        loading={isFetching}
                                        onInputChange={(_, newInputValue) => triggerSearch(newInputValue)}
                                        filterOptions={(options, params) => {
                                            const filtered = options.filter((option: any) =>
                                                option.name.toLowerCase().includes(params.inputValue.toLowerCase()) ||
                                                (option.taxId && option.taxId.includes(params.inputValue))
                                            );
                                            return filtered;
                                        }}
                                        onChange={(_, newValue) => {
                                            if (newValue) {
                                                onChange(newValue.id);
                                                methods.setValue('supplierName', newValue.name);
                                                methods.setValue('taxId', newValue.taxId || '');
                                            } else {
                                                onChange(undefined);
                                                methods.setValue('supplierName', '');
                                                methods.setValue('taxId', '');
                                            }
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Buscar Proveedor"
                                                placeholder="Escriba para filtrar..."
                                                variant="filled"
                                                fullWidth
                                            />
                                        )}
                                    />
                                )}
                            />
                            <TextField
                                label="CUIT / Identificación"
                                fullWidth
                                variant="filled"
                                {...methods.register('taxId')}
                                InputProps={{ readOnly: true }}
                            />
                        </Box>
                    </Box>

                    <Divider sx={{ mb: 4 }} />

                    <ItemsField supplierId={selectedSupplierId} />

                    <CreatePartnerDialog
                        open={isPartnerDialogOpen}
                        onClose={() => setIsPartnerDialogOpen(false)}
                        onSuccess={(partner) => {
                            methods.setValue('supplierId', partner.id);
                            methods.setValue('supplierName', partner.name);
                            methods.setValue('taxId', partner.taxId || '');
                            triggerSearch(''); // Update the local partners list
                        }}
                    />

                    <Box sx={{ mt: 6, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            type="submit"
                            variant="text"
                            size="large"
                            disabled={isLoading}
                            onClick={() => {
                                const errors = methods.formState.errors;
                                if (Object.keys(errors).length > 0) {
                                    console.log('Form errors:', errors);
                                    alert('Por favor, complete todos los campos requeridos (Remito, Fecha, Depósito y Partidas en los items)');
                                }
                            }}
                            sx={{
                                fontWeight: 800,
                                px: 4,
                                color: 'primary.main',
                                '&:hover': { background: 'rgba(0,0,0,0.04)' }
                            }}
                        >
                            {isLoading ? 'PROCESANDO...' : 'REGISTRAR INGRESO'}
                        </Button>
                    </Box>
                </Box>
            </FormProvider>
        </Box>
    );
};
