import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    TextField,
    Button,
    IconButton,
    Chip,
    Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface EditLotDialogProps {
    open: boolean;
    onClose: () => void;
    entry: any;
    onConfirm: (entry: any, newLotNumber: string) => Promise<void>;
}

export function EditLotDialog({
    open,
    onClose,
    entry,
    onConfirm
}: EditLotDialogProps) {
    const [lotNumber, setLotNumber] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (entry) {
            setLotNumber(entry.batch?.lotNumber || '');
        }
    }, [entry, open]);

    if (!entry) return null;

    const item = entry.batch?.item || {};

    const handleSave = async () => {
        const trimmed = lotNumber.trim();
        if (!trimmed) {
            alert('El número de partida / lote no puede estar vacío');
            return;
        }
        if (trimmed === entry.batch?.lotNumber) {
            onClose();
            return;
        }

        setIsSaving(true);
        try {
            await onConfirm(entry, trimmed);
            onClose();
        } catch {
            // Error manejado en parent
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'var(--bg-primary, #0f1117)',
                    color: 'var(--text-primary, #f3f4f6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 3
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#f59e0b' }}>
                    Reasignar Partida / Lote
                </Typography>
                <IconButton size="small" onClick={onClose} sx={{ color: 'var(--text-muted, #9ca3af)' }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#fff' }}>
                        {item.descripcion}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip size="small" label={`Ubicación: ${entry.posicion?.codigo || 'S/P'}`} sx={{ fontSize: '0.7rem' }} />
                        <Chip size="small" label={`Partida actual: ${entry.batch?.lotNumber || 'S/L'}`} sx={{ fontSize: '0.7rem' }} />
                    </Box>
                </Box>

                <TextField
                    label="Nuevo Número de Partida / Lote"
                    fullWidth
                    autoFocus
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="Ej: L-2026-0492"
                    InputProps={{ sx: { bgcolor: 'rgba(255, 255, 255, 0.05)', color: '#fff', borderRadius: 2 } }}
                    InputLabelProps={{ sx: { color: 'var(--text-muted, #9ca3af)' } }}
                />

                <Alert severity="info" sx={{ bgcolor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 2, fontSize: '0.75rem' }}>
                    Si la partida ya existe, el sistema te consultará para fusionar el stock. Si es nueva, se creará automáticamente.
                </Alert>
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 1 }}>
                <Button onClick={onClose} sx={{ color: 'var(--text-muted, #9ca3af)' }}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={isSaving || !lotNumber.trim()}
                    sx={{ bgcolor: '#f59e0b', color: '#000', fontWeight: 800, borderRadius: 2, '&:hover': { bgcolor: '#d97706' } }}
                >
                    {isSaving ? 'Guardando...' : 'Confirmar Partida'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
