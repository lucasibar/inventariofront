import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    IconButton,
    Chip,
    Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TuneIcon from '@mui/icons-material/Tune';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CommentIcon from '@mui/icons-material/Comment';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

interface PositionActionSheetProps {
    open: boolean;
    onClose: () => void;
    entry: any;
    isAdmin: boolean;
    onMove: (entry: any) => void;
    onDespacho: (entry: any) => void;
    onAdjustQty: (entry: any) => void;
    onEditLot: (entry: any) => void;
    onObservations: (entry: any) => void;
    onDelete: (entry: any) => void;
}

export function PositionActionSheet({
    open,
    onClose,
    entry,
    isAdmin,
    onMove,
    onDespacho,
    onAdjustQty,
    onEditLot,
    onObservations,
    onDelete
}: PositionActionSheetProps) {
    if (!entry) return null;

    const item = entry.batch?.item || {};
    const batch = entry.batch || {};
    const pos = entry.posicion || {};

    const handleAction = (actionFn: (e: any) => void) => {
        onClose();
        actionFn(entry);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xs"
            PaperProps={{
                sx: {
                    bgcolor: 'var(--bg-primary, #0f1117)',
                    color: 'var(--text-primary, #f3f4f6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: { xs: '20px 20px 0 0', sm: 3 },
                    m: { xs: 0, sm: 2 },
                    position: { xs: 'fixed', sm: 'relative' },
                    bottom: { xs: 0, sm: 'auto' },
                    maxHeight: '90vh'
                }
            }}
        >
            <DialogTitle sx={{ p: 2, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip
                            label={`📍 ${pos.codigo || 'S/P'}`}
                            size="small"
                            sx={{ bgcolor: 'rgba(59, 130, 246, 0.15)', color: '#38bdf8', fontWeight: 800, fontSize: '0.8rem' }}
                        />
                        <Chip
                            label={`Lote: ${batch.lotNumber || 'S/L'}`}
                            size="small"
                            sx={{ bgcolor: 'rgba(255, 255, 255, 0.06)', color: '#fff', fontWeight: 700, fontFamily: 'monospace' }}
                        />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                        {item.descripcion || item.codigoInterno}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-muted, #9ca3af)' }}>
                        Disponible: <strong style={{ color: '#f59e0b' }}>{Number(entry.qtyPrincipal).toFixed(1)} {item.unidadPrincipal || 'kg'}</strong>
                        {entry.qtySecundaria ? ` (${entry.qtySecundaria} ${item.unidadSecundaria || 'cajas'})` : ''}
                    </Typography>
                </Box>
                <IconButton size="small" onClick={onClose} sx={{ color: 'var(--text-muted, #9ca3af)', p: 0.5 }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            <DialogContent sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* 1. Mover stock */}
                <Button
                    fullWidth
                    variant="contained"
                    startIcon={<SwapHorizIcon />}
                    onClick={() => handleAction(onMove)}
                    sx={{
                        bgcolor: 'rgba(59, 130, 246, 0.15)',
                        color: '#38bdf8',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: 2,
                        py: 1.3,
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        justifyContent: 'flex-start',
                        px: 2,
                        '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.25)' }
                    }}
                >
                    Mover de Ubicación (Reubicar)
                </Button>

                {/* 2. Despachar */}
                <Button
                    fullWidth
                    variant="contained"
                    startIcon={<LocalShippingIcon />}
                    onClick={() => handleAction(onDespacho)}
                    sx={{
                        bgcolor: 'rgba(245, 158, 11, 0.15)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 2,
                        py: 1.3,
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        justifyContent: 'flex-start',
                        px: 2,
                        '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.25)' }
                    }}
                >
                    Despachar / Remito Directo
                </Button>

                {/* 3. Ajustar Cantidad */}
                <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<TuneIcon />}
                    onClick={() => handleAction(onAdjustQty)}
                    sx={{
                        color: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: 2,
                        py: 1.1,
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        justifyContent: 'flex-start',
                        px: 2,
                        '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.04)' }
                    }}
                >
                    Ajustar Kilos o Cajas
                </Button>

                {/* 4. Cambiar Lote / Partida */}
                <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<EditNoteIcon />}
                    onClick={() => handleAction(onEditLot)}
                    sx={{
                        color: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: 2,
                        py: 1.1,
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        justifyContent: 'flex-start',
                        px: 2,
                        '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.04)' }
                    }}
                >
                    Modificar o Reasignar Partida
                </Button>

                {/* 5. Observaciones */}
                <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<CommentIcon />}
                    onClick={() => handleAction(onObservations)}
                    sx={{
                        color: 'var(--text-muted, #9ca3af)',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        borderRadius: 2,
                        py: 1,
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        justifyContent: 'flex-start',
                        px: 2,
                        '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.04)', color: '#fff' }
                    }}
                >
                    {batch.observaciones ? `Ver Observación (${batch.observaciones.slice(0, 15)}...)` : 'Agregar Observación'}
                </Button>

                {/* 6. Eliminar (Admin) */}
                {isAdmin && (
                    <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteOutlineIcon />}
                        onClick={() => handleAction(onDelete)}
                        sx={{
                            borderRadius: 2,
                            py: 1,
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            justifyContent: 'flex-start',
                            px: 2,
                            mt: 0.5
                        }}
                    >
                        Eliminar Registro de Stock
                    </Button>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 1.5, pt: 0 }}>
                <Button fullWidth onClick={onClose} sx={{ color: 'var(--text-muted, #9ca3af)', fontWeight: 700, py: 1 }}>
                    Cancelar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
