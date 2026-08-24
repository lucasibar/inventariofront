import { useForm, FormProvider, Controller, type SubmitHandler } from 'react-hook-form';
import { Box, Button, TextField, Typography, MenuItem, IconButton, Tooltip, Autocomplete, Paper } from '@mui/material';
import { useCreateRemitoMutation } from '../api/remito.api';
import { useGetDepotsQuery } from '../../deposito/api/deposito.api';
import { useLazyGetPartnersQuery } from '../../../config/partners/api/partners.api';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { ItemsField } from './ItemsField';
import { CreatePartnerDialog } from '../../../config/CreatePartnerDialog';
import type { CreateRemitoDto } from '../model/create-remito.dto';
import { useState, useMemo, useEffect } from 'react';

export const CreateRemitoForm = () => {
    const methods = useForm<CreateRemitoDto>({
        defaultValues: {
            fecha: new Date().toISOString().split('T')[0],
            lines: [{ itemId: '', qtyPrincipal: 0, qtySecundaria: 0 }]
        }
    });

    const [createRemito, { isLoading }] = useCreateRemitoMutation();
    const { data: allDepots = [] } = useGetDepotsQuery();
    const [triggerSearch, { data: partners = [], isFetching }] = useLazyGetPartnersQuery();

    const [selectedPlanta, setSelectedPlanta] = useState<string>('');
    const [isPartnerDialogOpen, setIsPartnerDialogOpen] = useState(false);

    useEffect(() => {
        triggerSearch({});
    }, [triggerSearch]);

    const activeDepots = useMemo(() => allDepots.filter((d: any) => d.activo !== false), [allDepots]);

    const plants = useMemo(() => {
        const unique = new Set(activeDepots.map((d: any) => d.planta).filter(Boolean));
        return Array.from(unique);
    }, [activeDepots]);

    const filteredDepots = useMemo(() => {
        if (!selectedPlanta) return [];
        return activeDepots.filter((d: any) => d.planta === selectedPlanta);
    }, [activeDepots, selectedPlanta]);

    const selectedSupplierId = methods.watch('supplierId' as any);

    const onSubmit: SubmitHandler<CreateRemitoDto> = async (data) => {
        try {
            if (!data.depotId) {
                alert('Debe seleccionar un depósito');
                return;
            }

            // Filter out completely empty lines
            const activeLines = (data.lines || []).filter(line => {
                const hasItemId = !!line.itemId;
                const qtyP = Number(line.qtyPrincipal);
                const hasQtyPrincipal = line.qtyPrincipal != null && qtyP !== 0 && !isNaN(qtyP);
                const qtyS = line.qtySecundaria != null ? Number(line.qtySecundaria) : NaN;
                const hasQtySecundaria = line.qtySecundaria != null && qtyS !== 0 && !isNaN(qtyS);
                const hasLotNumber = !!line.lotNumber && line.lotNumber.trim() !== '';

                return hasItemId || hasQtyPrincipal || hasQtySecundaria || hasLotNumber;
            });

            if (activeLines.length === 0) {
                alert('Debe agregar al menos un item al remito');
                return;
            }

            // Validate that active lines are complete
            for (let i = 0; i < activeLines.length; i++) {
                const line = activeLines[i];
                if (!line.itemId) {
                    alert(`El registro ${i + 1} está incompleto: debe seleccionar un material.`);
                    return;
                }
                const qtyP = Number(line.qtyPrincipal);
                if (line.qtyPrincipal === undefined || line.qtyPrincipal === null || isNaN(qtyP) || qtyP <= 0) {
                    alert(`El registro ${i + 1} está incompleto: debe ingresar una cantidad principal válida.`);
                    return;
                }
                if (!line.lotNumber || line.lotNumber.trim() === '') {
                    alert(`El registro ${i + 1} está incompleto: debe ingresar el número de partida/lote.`);
                    return;
                }
            }

            const payload: any = {
                ...data,
                lines: activeLines.map(line => {
                    const qtyS = line.qtySecundaria != null ? Number(line.qtySecundaria) : NaN;
                    return {
                        ...line,
                        qtyPrincipal: Number(line.qtyPrincipal),
                        qtySecundaria: line.qtySecundaria != null && !isNaN(qtyS) && qtyS !== 0 ? qtyS : undefined
                    };
                })
            };

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
                lines: [{ itemId: '', qtyPrincipal: 0, qtySecundaria: 0, lotNumber: '' } as any]
            });
            setSelectedPlanta('');
        } catch (err: any) {
            console.error('Error submitting remito:', err);
            const msg = err?.data?.message || 'Error al registrar el remito';
            alert(msg);
        }
    };

    return (
        <Box sx={{ maxWidth: 960, mx: 'auto', p: { xs: 1, sm: 2 } }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px', color: 'text.primary' }}>
                    Registrar Remito de Entrada
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Complete la información del comprobante y detalle los materiales recibidos.
                </Typography>
            </Box>

            <FormProvider {...methods}>
                <Box
                    component="form"
                    onSubmit={methods.handleSubmit(onSubmit)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const target = e.target as HTMLElement;
                            if (target.tagName !== 'BUTTON' && target.tagName !== 'TEXTAREA') {
                                e.preventDefault();
                            }
                        }
                    }}
                >
                    {/* Seccion 1: Datos del Comprobante */}
                    <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 3, backgroundColor: 'background.paper' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2.5, color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                            1. Datos Generales
                        </Typography>

                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr' },
                            gap: 2,
                            mb: 3
                        }}>
                            <TextField
                                label="Número de Remito"
                                fullWidth
                                required
                                size="small"
                                placeholder="0001-00000000"
                                {...methods.register('numero', { required: true })}
                            />
                            <TextField
                                type="date"
                                label="Fecha de Emisión"
                                fullWidth
                                required
                                size="small"
                                InputLabelProps={{ shrink: true }}
                                {...methods.register('fecha', { required: true })}
                            />

                            <TextField
                                select
                                label="Planta"
                                fullWidth
                                required
                                size="small"
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
                                size="small"
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

                        {/* Proveedor */}
                        <Box sx={{ mb: 3 }}>
                            <Controller
                                name="supplierId"
                                control={methods.control}
                                render={({ field: { onChange, value } }) => (
                                    <Autocomplete
                                        options={partners}
                                        getOptionLabel={(option: any) => typeof option === 'string' ? option : option.name}
                                        value={partners.find((p: any) => p.id === value) || null}
                                        isOptionEqualToValue={(option, val) => option.id === val?.id}
                                        loading={isFetching}
                                        onInputChange={(_, newInputValue, reason) => {
                                            if (reason === 'input') {
                                                triggerSearch({ q: newInputValue });
                                            } else if (reason === 'clear') {
                                                triggerSearch({});
                                            }
                                        }}
                                        filterOptions={(options, params) => {
                                            const search = params.inputValue.toLowerCase().trim();
                                            if (!search) return options;
                                            return options.filter((option: any) =>
                                                option.name?.toLowerCase().includes(search)
                                            );
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
                                                label="Proveedor"
                                                placeholder="Buscar proveedor por nombre..."
                                                size="small"
                                                fullWidth
                                                InputProps={{
                                                    ...params.InputProps,
                                                    endAdornment: (
                                                        <>
                                                            {params.InputProps.endAdornment}
                                                            <Tooltip title="Crear nuevo proveedor">
                                                                <IconButton
                                                                    size="small"
                                                                    color="primary"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setIsPartnerDialogOpen(true);
                                                                    }}
                                                                    sx={{ ml: 0.5 }}
                                                                >
                                                                    <AddCircleOutlineIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </>
                                                    )
                                                }}
                                            />
                                        )}
                                    />
                                )}
                            />
                        </Box>

                        <TextField
                            label="Observaciones (Opcional)"
                            fullWidth
                            multiline
                            rows={2}
                            size="small"
                            placeholder="Notas o referencias adicionales..."
                            {...methods.register('observaciones')}
                        />
                    </Paper>

                    {/* Seccion 2: Items / Materiales */}
                    <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 3, backgroundColor: 'background.paper' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                            2. Detalle de Materiales
                        </Typography>

                        <ItemsField supplierId={selectedSupplierId} />
                    </Paper>

                    <CreatePartnerDialog
                        open={isPartnerDialogOpen}
                        onClose={() => setIsPartnerDialogOpen(false)}
                        onSuccess={(partner) => {
                            methods.setValue('supplierId', partner.id);
                            methods.setValue('supplierName', partner.name);
                            methods.setValue('taxId', partner.taxId || '');
                            triggerSearch({});
                        }}
                    />

                    {/* Boton de Submit */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={isLoading}
                            onClick={() => {
                                const errors = methods.formState.errors;
                                if (Object.keys(errors).length > 0) {
                                    console.log('Form errors:', errors);
                                    alert('Por favor, complete todos los campos requeridos (Remito, Fecha y Depósito)');
                                }
                            }}
                            sx={{
                                fontWeight: 700,
                                px: 4,
                                py: 1.2,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontSize: '0.95rem',
                                boxShadow: 2
                            }}
                        >
                            {isLoading ? 'Guardando...' : 'Registrar Ingreso de Remito'}
                        </Button>
                    </Box>
                </Box>
            </FormProvider>
        </Box>
    );
};
