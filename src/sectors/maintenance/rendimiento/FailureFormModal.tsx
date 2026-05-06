import React, { useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, MenuItem, Typography, Box 
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../entities/auth/model/authSlice';
import { type Machine, useUpdateMachineStatusMutation } from '../api/maintenance.api';


interface FailureFormModalProps {
    open: boolean;
    onClose: () => void;
    machine: Machine | null;
}

const failureTypes = [
    'Cosedora Cilindro', 'Cosedora Brazo', 'Cosedora Cierre', 'Error electronico',
    'Error Puesta 0', 'Error Motores', 'Mal vanizado', 'Logo contaminado',
    'Tejido(Muerde/revienta/pica/tirones)', 'Goma', 'Puntada', 'Transferencia',
    'Aguja', 'Platina', 'Menguados', 'Corta', 'Electronico', 'Lubricacion',
    'Mancha', 'Corte', 'REPUESTO', 'Corte de luz.', 'Programacion'
];

const responsables = ['Gaston', 'Ruben', 'Daniel', 'Alexis', 'Violeta', 'Leandro', 'Gaspar', 'Ramón', 'Tejedor'];

const targetStatuses = [
    { value: 'REVISAR', label: 'Revisar (Amarillo)' },
    { value: 'VELOCIDAD_REDUCIDA', label: 'Velocidad Reducida (Rosa)' },
    { value: 'PARADA', label: 'Parada (Rojo)' },
    { value: 'ELECTRONIC', label: 'Electronic (Azul)' },
    { value: 'FALTA_COSTURA', label: 'Falta Costura (Violeta)' },
    { value: 'FALTA_PROGRAMA', label: 'Falta Programa (Cian)' },
    { value: 'REPUESTOS', label: 'Repuestos (Marrón)' },
];

export const FailureFormModal: React.FC<FailureFormModalProps> = ({ open, onClose, machine }) => {
    const user = useSelector(selectCurrentUser);
    const [updateStatus, { isLoading }] = useUpdateMachineStatusMutation();
    
    const { control, handleSubmit, reset } = useForm({
        defaultValues: {
            targetStatus: 'PARADA',
            failureType: 'Mecánico',
            observation: '',
            generatedBy: '',
        }
    });

    useEffect(() => {
        if (open && machine) {
            reset({
                targetStatus: machine.status === 'ACTIVA' ? 'PARADA' : machine.status,
                failureType: (machine as any).lastFailureType || 'Cosedora Cilindro',
                observation: machine.lastObservation || '',
                generatedBy: machine.lastChangeBy || (user as any)?.name || (user as any)?.username || '',
            });
        }
    }, [open, machine, user, reset]);

    const onSubmit = async (data: any) => {
        if (!machine) return;
        try {
            await updateStatus({
                id: machine.id,
                status: data.targetStatus,
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
                Cambiar Estado - Máquina {machine?.number}
            </DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent sx={{ bgcolor: '#1a1a1a', pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        
                        <Controller
                            name="targetStatus"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    fullWidth
                                    label="Nuevo Estado"
                                    variant="outlined"
                                    required
                                >
                                    {targetStatuses.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />

                        <Controller
                            name="failureType"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    fullWidth
                                    label="Tipo de Problema"
                                    variant="outlined"
                                    required
                                >
                                    {failureTypes.map((option) => (
                                        <MenuItem key={option} value={option}>
                                            {option}
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
                                    select
                                    fullWidth
                                    label="Responsable (Mecánico/Calidad)"
                                    variant="outlined"
                                    required
                                >
                                    {responsables.map((option) => (
                                        <MenuItem key={option} value={option}>
                                            {option}
                                        </MenuItem>
                                    ))}
                                </TextField>
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
                        Cambiar Estado
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
