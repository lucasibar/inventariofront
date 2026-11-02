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
    Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface AdjustStockDialogProps {
    open: boolean;
    onClose: () => void;
    entry: any;
    onConfirm: (entry: any, newPrincipal: number, newSecundaria: number | null) => Promise<void>;
}

export function AdjustStockDialog({
    open,
    onClose,
    entry,
    onConfirm
}: AdjustStockDialogProps) {
    const [principal, setPrincipal] = useState('');
    const [secundaria, setSecundaria] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (entry) {
            setPrincipal(String(entry.qtyPrincipal ?? ''));
            setSecundaria(entry.qtySecundaria != null ? String(entry.qtySecundaria) : '');
        }
    }, [entry, open]);

    if (!entry) return null;

    const item = entry.batch?.item || {};
    const unitP = item.unidadPrincipal || 'kg';
    const unitS = item.unidadSecundaria || 'un';

    const handleSave = async () => {
        const pNum = Number(principal);
        if (isNaN(pNum) || pNum < 0) {
            alert('Ingresá una cantidad principal válida mayor o igual a 0');
            return;
        }
        const sNum = secundaria.trim() !== '' ? Number(secundaria) : null;
        if (sNum !== null && (isNaN(sNum) || sNum < 0)) {
            alert('Ingresá una cantidad secundaria válida mayor o igual a 0');
            return;
        }

        setIsSaving(true);
        try {
            await onConfirm(entry, pNum, sNum);
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
                    Ajustar Stock Manual
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
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        <Chip size="small" label={`Posición: ${entry.posicion?.codigo || 'S/P'}`} sx={{ fontSize: '0.7rem' }} />
                        <Chip size="small" label={`Lote: ${entry.batch?.lotNumber || 'S/L'}`} sx={{ fontSize: '0.7rem' }} />
                    </Box>
                </Box>

                <TextField
                    label={`Cantidad Principal (${unitP})`}
                    type="number"
                    fullWidth
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    helperText={`Actual: ${entry.qtyPrincipal} ${unitP}`}
                    InputProps={{ sx: { bgcolor: 'rgba(255, 255, 255, 0.05)', color: '#fff', borderRadius: 2 } }}
                    InputLabelProps={{ sx: { color: 'var(--text-muted, #9ca3af)' } }}
                />

                <TextField
                    label={`Cantidad Secundaria (${unitS})`}
                    type="number"
                    fullWidth
                    value={secundaria}
                    onChange={(e) => setSecundaria(e.target.value)}
                    helperText={entry.qtySecundaria != null ? `Actual: ${entry.qtySecundaria} ${unitS}` : 'Opcional'}
                    InputProps={{ sx: { bgcolor: 'rgba(255, 255, 255, 0.05)', color: '#fff', borderRadius: 2 } }}
                    InputLabelProps={{ sx: { color: 'var(--text-muted, #9ca3af)' } }}
                />
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 1 }}>
                <Button onClick={onClose} sx={{ color: 'var(--text-muted, #9ca3af)' }}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={isSaving}
                    sx={{ bgcolor: '#f59e0b', color: '#000', fontWeight: 800, borderRadius: 2, '&:hover': { bgcolor: '#d97706' } }}
                >
                    {isSaving ? 'Guardando...' : 'Aplicar Ajuste'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
