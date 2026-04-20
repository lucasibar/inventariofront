import React, { useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, MenuItem, Typography, Box 
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../entities/auth/model/authSlice';
import { Machine, useUpdateMachineStatusMutation } from '../../entities/performance/api/performanceApi';

interface FailureFormModalProps {
    open: boolean;
    onClose: () => void;
    machine: Machine | null;
}

const failureTypes = [
    { value: 'ELECTRICAL', label: 'Falla Eléctrica' },
    { value: 'MECHANICAL', label: 'Falla Mecánica' },
    { value: 'SUCTION', label: 'Falla Succión' },
    { value: 'YARN_SHORTAGE', label: 'Falta Hilado' },
];

export const FailureFormModal: React.FC<FailureFormModalProps> = ({ open, onClose, machine }) => {
    const user = useSelector(selectCurrentUser);
    const [updateStatus, { isLoading }] = useUpdateMachineStatusMutation();
    
    const { control, handleSubmit, reset } = useForm({
        defaultValues: {
            failureType: 'MECHANICAL',
            observation: '',
            generatedBy: user?.name || user?.username || 'Usuario',
        }
    });

    useEffect(() => {
        if (open) {
            reset({
                failureType: 'MECHANICAL',
                observation: '',
                generatedBy: user?.name || user?.username || 'Usuario',
            });
        }
    }, [open, user, reset]);

    const onSubmit = async (data: any) => {
        if (!machine) return;
        try {
            await updateStatus({
                id: machine.id,
                status: data.failureType,
                failureType: data.failureType,
                observation: data.observation,
                generatedBy: data.generatedBy
            }).unwrap();
            onClose();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ bgcolor: '#1a1a1a', borderBottom: '1px solid #333' }}>
                Reportar Falla - Máquina {machine?.number}
            </DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent sx={{ bgcolor: '#1a1a1a', pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Controller
                            name="failureType"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    fullWidth
                                    label="Tipo de Falla"
                                    variant="outlined"
                                >
                                    {failureTypes.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />

                        <Controller
                            name="generatedBy"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    label="Generado por"
                                    variant="outlined"
                                    disabled
                                />
                            )}
                        />

                        <Controller
                            name="observation"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Observaciones (Opcional)"
                                    variant="outlined"
                                />
                            )}
                        />

                        <Typography variant="caption" color="text.secondary">
                            Fecha y Hora: {new Date().toLocaleString()}
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ bgcolor: '#1a1a1a', p: 2, borderTop: '1px solid #333' }}>
                    <Button onClick={onClose} color="inherit">Cancelar</Button>
                    <Button 
                        type="submit" 
                        variant="contained" 
                        color="error" 
                        disabled={isLoading}
                    >
                        Reportar Falla
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
