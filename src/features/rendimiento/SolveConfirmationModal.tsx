import React, { useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Box, Alert
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import type { Machine } from '../../entities/performance/api/performanceApi';
import { useUpdateMachineStatusMutation } from '../../entities/performance/api/performanceApi';


interface SolveConfirmationModalProps {
    open: boolean;
    onClose: () => void;
    machine: Machine | null;
}

export const SolveConfirmationModal: React.FC<SolveConfirmationModalProps> = ({ open, onClose, machine }) => {
    const [updateStatus, { isLoading }] = useUpdateMachineStatusMutation();
    
    const { control, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            mechanicName: '',
            observation: '',
        }
    });

    useEffect(() => {
        if (open) {
            reset({
                mechanicName: '',
                observation: '',
            });
        }
    }, [open, reset]);

    const onSubmit = async (data: any) => {
        if (!machine) return;
        try {
            await updateStatus({
                id: machine.id,
                status: 'SOLVED',
                observation: data.observation,
                generatedBy: data.mechanicName
            }).unwrap();
            onClose();
        } catch (error) {
            console.error('Error solving failure:', error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ bgcolor: '#1a1a1a', borderBottom: '1px solid #333' }}>
                Poner en Servicio - Máquina {machine?.number}
            </DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent sx={{ bgcolor: '#1a1a1a', pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Alert severity="info" sx={{ bgcolor: 'rgba(2, 136, 209, 0.1)', color: '#fff' }}>
                            ¿Estás seguro de generar el cambio a 'Solucionado'?
                        </Alert>

                        <Controller
                            name="mechanicName"
                            control={control}
                            rules={{ required: 'El nombre del mecánico es obligatorio' }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    label="Nombre del Mecánico / Responsable"
                                    variant="outlined"
                                    error={!!errors.mechanicName}
                                    helperText={errors.mechanicName?.message}
                                    autoFocus
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
                                    rows={2}
                                    label="Observación Final (Opcional)"
                                    variant="outlined"
                                />
                            )}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ bgcolor: '#1a1a1a', p: 2, borderTop: '1px solid #333' }}>
                    <Button onClick={onClose} color="inherit">Cancelar</Button>
                    <Button 
                        type="submit" 
                        variant="contained" 
                        color="success" 
                        disabled={isLoading}
                    >
                        Confirmar Solución
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
