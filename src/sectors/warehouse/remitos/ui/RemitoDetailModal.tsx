
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, Table, TableBody,
    TableCell, TableHead, TableRow, Chip, Divider, IconButton, Tooltip
} from '@mui/material';
import { Undo as RevertIcon } from '@mui/icons-material';
import { useDeleteRemitoSalidaLineMutation } from '../../remitosSalida/api/remitos-salida.api';

interface RemitoDetailModalProps {
    open: boolean;
    onClose: () => void;
    remito: any;
}

export const RemitoDetailModal = ({ open, onClose, remito }: RemitoDetailModalProps) => {
    const [revertLine, { isLoading: isReverting }] = useDeleteRemitoSalidaLineMutation();
    if (!remito) return null;

    const isSalida = remito.tipo?.includes('SALIDA');
    const isActive = remito.status === 'ACTIVO';

    const handleRevertLine = async (line: any) => {
        if (!window.confirm('¿Estás seguro de que querés revertir este registro? El stock volverá a su posición original.')) return;
        try {
            await revertLine(line.id).unwrap();
            alert('Registro revertido con éxito.');
            // Note: Since we invalidate RemitosSalida tag, if the parent is watching it should refetch
        } catch (e: any) {
            alert(e?.data?.message || 'Error al revertir registro');
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            fullWidth 
            maxWidth="md"
            PaperProps={{
                sx: { borderRadius: 3 }
            }}
        >
            <DialogTitle sx={{ fontWeight: 800, pt: 3, px: 3 }}>
                Detalle de Remito: {remito.numero || remito.documentId}
            </DialogTitle>
            <DialogContent sx={{ px: 3 }}>
                <Box sx={{ mb: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Fecha
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {new Date(remito.fecha || remito.date).toLocaleDateString()}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            {remito.tipo?.includes('SALIDA') ? 'Cliente' : 'Proveedor'}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {remito.partner?.name || remito.supplier?.name || remito.provider?.name || remito.client?.name || '—'}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Identificación / CUIT
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {remito.partner?.taxId || remito.supplier?.taxId || '—'}
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ mb: 3 }} />

                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
                    Items Recibidos
                </Typography>

                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Código</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Partida</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Posición</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Kilos</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Unidades</TableCell>
                            {isSalida && isActive && <TableCell align="center" sx={{ fontWeight: 700 }}>Acciones</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(remito.lines || remito.items || []).map((line: any, idx: number) => (
                            <TableRow key={idx}>
                                <TableCell>{line.item?.codigoInterno || line.codigoInterno}</TableCell>
                                <TableCell>{line.item?.descripcion || line.descripcion}</TableCell>
                                <TableCell>
                                    {line.batch?.lotNumber || line.lotNumber ? (
                                        <Chip 
                                            label={line.batch?.lotNumber || line.lotNumber} 
                                            size="small" 
                                            variant="outlined" 
                                            sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} 
                                        />
                                    ) : '—'}
                                </TableCell>
                                <TableCell>
                                    <Chip 
                                        label={line.posicion?.codigo || 'S/P'} 
                                        size="small" 
                                        color="primary" 
                                        variant="outlined" 
                                    />
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                    {Number(line.qtyPrincipal || line.qtyPrincipal).toLocaleString()} kg
                                </TableCell>
                                <TableCell align="right">
                                    {(line.qtySecundaria !== undefined && line.qtySecundaria !== null) ? `${Number(line.qtySecundaria).toLocaleString()} un` : '—'}
                                </TableCell>
                                {isSalida && isActive && (
                                    <TableCell align="center">
                                        {line.status === 'ANULADO' ? (
                                            <Chip label="REVERTIDO" size="small" color="error" variant="outlined" />
                                        ) : (
                                            <Tooltip title="Revertir este registro (Devolver stock)">
                                                <IconButton 
                                                    size="small" 
                                                    color="error" 
                                                    onClick={() => handleRevertLine(line)}
                                                    disabled={isReverting}
                                                >
                                                    <RevertIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {remito.observaciones && (
                    <Box sx={{ mt: 4 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Observaciones
                        </Typography>
                        <Typography variant="body2">
                            {remito.observaciones}
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
                <Button onClick={onClose} variant="contained" disableElevation>
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
};
