import { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Box, MenuItem
} from '@mui/material';
import { useCreatePartnerMutation } from '../../partners/api/partners.api';

interface CreatePartnerDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (partner: any) => void;
}

export const CreatePartnerDialog = ({ open, onClose, onSuccess }: CreatePartnerDialogProps) => {
    const [createPartner, { isLoading }] = useCreatePartnerMutation();
    const [form, setForm] = useState({
        name: '',
        taxId: '',
        type: 'SUPPLIER' as 'SUPPLIER' | 'CLIENT' | 'BOTH'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await createPartner(form).unwrap();
            alert('Socio creado con éxito');
            onSuccess(result);
            onClose();
            setForm({ name: '', taxId: '', type: 'SUPPLIER' });
        } catch (err) {
            console.error(err);
            alert('Error al crear el socio');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 800 }}>Nuevo Proveedor / Cliente</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            label="Nombre / Razón Social"
                            required
                            fullWidth
                            variant="filled"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        <TextField
                            label="CUIT / Identificación"
                            fullWidth
                            variant="filled"
                            value={form.taxId}
                            onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                        />
                        <TextField
                            select
                            label="Tipo"
                            fullWidth
                            variant="filled"
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                        >
                            <MenuItem value="SUPPLIER">Proveedor</MenuItem>
                            <MenuItem value="CLIENT">Cliente</MenuItem>
                            <MenuItem value="BOTH">Ambos</MenuItem>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700 }}>Cancelar</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isLoading}
                        sx={{ fontWeight: 700, borderRadius: 2 }}
                    >
                        {isLoading ? 'CREANDO...' : 'CREAR'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
