
import {
    Box, Button, Typography, IconButton, TextField,
    Divider, Autocomplete, ListItem, ListItemText, Chip
} from '@mui/material';
import { useFieldArray, useFormContext } from 'react-hook-form';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import LinkIcon from '@mui/icons-material/Link';
import { useState, useMemo } from 'react';
import { CreateItemDialog } from '../../materiales/components/CreateItemDialog';
import { useGetItemsQuery } from '../../materiales/api/items.api';
import PurchaseOrderLinkDialog from '../../../purchasing/purchase-orders/ui/PurchaseOrderLinkDialog';

const CREATE_OPTION = { __isCreateOption: true, codigoInterno: '', descripcion: '+ Agregar nuevo material', id: '__CREATE__' };

export const ItemsField = ({ supplierId }: { supplierId?: string }) => {
    const { control, register, setValue, watch } = useFormContext();
    const supplierName = watch('supplierName');
    const { fields, prepend, remove } = useFieldArray({
        control,
        name: 'lines'
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
    const [linkIndex, setLinkIndex] = useState<number | null>(null);

    const { data: allItems = [] } = useGetItemsQuery({});

    const availableItems = useMemo(() => {
        const base = !supplierId
            ? allItems
            : allItems.filter((it: any) => !it.supplierId || it.supplierId === supplierId);
        return [...base, CREATE_OPTION];
    }, [allItems, supplierId]);

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
                    onClick={() => prepend({
                        codigoInterno: '',
                        descripcion: '',
                        qtyPrincipal: 0,
                        qtySecundaria: 0,
                        categoria: 'SUPPLY',
                        lotNumber: '',
                        purchaseOrderLinks: []
                    })}
                    sx={{ fontWeight: 600 }}
                >
                    Agregar Fila
                </Button>
            </Box>

            {fields.map((field, index) => {
                const itemId = watch(`lines.${index}.itemId`);
                const qtyPrincipal = watch(`lines.${index}.qtyPrincipal`) || 0;
                const poLinks = watch(`lines.${index}.purchaseOrderLinks`) || [];
                const totalLinked = poLinks.reduce((sum: number, l: any) => sum + l.qtyAplicada, 0);

                return (
                    <Box key={field.id} sx={{ mb: 3, p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', position: 'relative' }}>
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '2.5fr 3.5fr 1fr 1fr 2fr auto' },
                            gap: 1.5,
                            alignItems: 'flex-start'
                        }}>
                            <Box>
                                <Autocomplete
                                    options={availableItems}
                                    getOptionLabel={(option: any) => {
                                        if (option.__isCreateOption) return option.descripcion;
                                        const cat = option.categoria ? `[${option.categoria}] ` : '';
                                        return `${cat}${option.codigoInterno} - ${option.descripcion}`;
                                    }}
                                    filterOptions={(options, { inputValue }) => {
                                        const search = inputValue.toLowerCase();
                                        const filtered = options.filter((option: any) => {
                                            if (option.__isCreateOption) return true;
                                            return (
                                                option.codigoInterno.toLowerCase().includes(search) ||
                                                option.descripcion.toLowerCase().includes(search)
                                            );
                                        });
                                        return filtered;
                                    }}
                                    renderOption={(props, option: any) => {
                                        if (option.__isCreateOption) {
                                            return (
                                                <ListItem
                                                    {...props}
                                                    key="__CREATE__"
                                                    sx={{
                                                        borderTop: '1px solid',
                                                        borderColor: 'divider',
                                                        color: 'primary.main',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    <AddCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                                                    <ListItemText primary="Agregar nuevo material" />
                                                </ListItem>
                                            );
                                        }
                                        return (
                                            <ListItem {...props} key={option.id}>
                                                <ListItemText
                                                    primary={option.codigoInterno}
                                                    secondary={`${option.categoria ? `[${option.categoria}] ` : ''}${option.descripcion}`}
                                                />
                                            </ListItem>
                                        );
                                    }}
                                    onChange={(_, newValue: any) => {
                                        if (!newValue) return;
                                        if (newValue.__isCreateOption) {
                                            setActiveItemIndex(index);
                                            setIsDialogOpen(true);
                                            return;
                                        }
                                        setValue(`lines.${index}.codigoInterno`, newValue.codigoInterno);
                                        setValue(`lines.${index}.descripcion`, newValue.descripcion);
                                        setValue(`lines.${index}.categoria`, newValue.categoria);
                                        setValue(`lines.${index}.itemId`, newValue.id);
                                        setValue(`lines.${index}.purchaseOrderLinks`, []); // clear links on item change
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Material"
                                            variant="filled"
                                            size="small"
                                            placeholder="Buscar o agregar..."
                                            InputLabelProps={{ shrink: true }}
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
                                    InputLabelProps={{ shrink: true }}
                                    {...register(`lines.${index}.descripcion` as const)}
                                />
                            </Box>
                            <Box>
                                <TextField
                                    type="number"
                                    label="Cantidad Principal (Kg)"
                                    fullWidth
                                    variant="filled"
                                    size="small"
                                    inputProps={{ step: 'any' }}
                                    {...register(`lines.${index}.qtyPrincipal` as const, { required: true, min: 0.01 })}
                                />
                            </Box>
                            <Box>
                                <TextField
                                    type="number"
                                    label="Secundaria (Unid)"
                                    fullWidth
                                    variant="filled"
                                    size="small"
                                    inputProps={{ step: 'any' }}
                                    {...register(`lines.${index}.qtySecundaria` as const, { min: 0 })}
                                />
                            </Box>
                            <Box>
                                <TextField
                                    label="Partida"
                                    fullWidth
                                    variant="filled"
                                    size="small"
                                    placeholder="Requerido"
                                    error={!!(control as any)._formState.errors?.lines?.[index]?.lotNumber}
                                    {...register(`lines.${index}.lotNumber` as const, { required: true })}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', pt: { xs: 0, sm: 0.5 } }}>
                                <IconButton size="small" color="error" onClick={() => remove(index)}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        </Box>

                        {/* Fila de vinculación comercial opcional a Orden de Compra */}
                        {itemId && supplierId && Number(qtyPrincipal) > 0 && (
                            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, borderTop: '1px dashed rgba(255,255,255,0.03)', pt: 1 }}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="info"
                                    startIcon={<LinkIcon />}
                                    onClick={() => setLinkIndex(index)}
                                    sx={{ py: 0.2, px: 1, fontSize: '11px', textTransform: 'none' }}
                                >
                                    Vincular a Orden de Compra
                                </Button>
                                {poLinks.length > 0 && (
                                    <Chip
                                        label={`Vinculado a ${poLinks.length} OC (${totalLinked.toFixed(1)} kg)`}
                                        color="success"
                                        size="small"
                                        onDelete={() => setValue(`lines.${index}.purchaseOrderLinks`, [])}
                                        sx={{ height: '20px', fontSize: '11px' }}
                                    />
                                )}
                            </Box>
                        )}

                        {index < fields.length - 1 && <Divider sx={{ mt: 2, display: { xs: 'block', sm: 'none' } }} />}
                    </Box>
                );
            })}

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

            {/* Modal de vinculación */}
            {linkIndex !== null && (
                <PurchaseOrderLinkDialog
                    supplierId={supplierId || ''}
                    itemId={watch(`lines.${linkIndex}.itemId`)}
                    itemName={watch(`lines.${linkIndex}.descripcion`)}
                    qtyAvailable={Number(watch(`lines.${linkIndex}.qtyPrincipal`)) || 0}
                    initialLinks={watch(`lines.${linkIndex}.purchaseOrderLinks`) || []}
                    onClose={() => setLinkIndex(null)}
                    onConfirm={(links) => {
                        setValue(`lines.${linkIndex}.purchaseOrderLinks`, links);
                        setLinkIndex(null);
                    }}
                />
            )}
        </Box>
    );
};;
