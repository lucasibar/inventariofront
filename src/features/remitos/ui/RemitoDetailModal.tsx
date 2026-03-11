
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, Table, TableBody,
    TableCell, TableHead, TableRow, Chip, Divider
} from '@mui/material';

interface RemitoDetailModalProps {
    open: boolean;
    onClose: () => void;
    remito: any;
}

export const RemitoDetailModal = ({ open, onClose, remito }: RemitoDetailModalProps) => {
    if (!remito) return null;

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
                            Proveedor
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {remito.supplier?.name || remito.provider?.name || '—'}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            CUIT
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {remito.supplier?.taxId || '—'}
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
                                    {Number(line.kilos).toLocaleString()} kg
                                </TableCell>
                                <TableCell align="right">
                                    {line.unidades ? `${Number(line.unidades).toLocaleString()} un` : '—'}
                                </TableCell>
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
