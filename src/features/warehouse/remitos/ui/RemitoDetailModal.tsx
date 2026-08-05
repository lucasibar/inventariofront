import { useState, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, Table, TableBody,
    TableCell, TableHead, TableRow, Chip, Divider, IconButton, Tooltip,
    TextField
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
    const [search, setSearch] = useState('');

    const filteredLines = useMemo(() => {
        if (!remito) return [];
        const lines = remito.lines || remito.items || [];
        const query = search.toLowerCase().trim();
        if (!query) return lines;
        const tokens = query.split(/\s+/).filter(Boolean);

        return lines.filter((l: any) => {
            const code = (l.item?.codigoInterno || l.codigoInterno || '').toLowerCase();
            const desc = (l.item?.descripcion || l.descripcion || '').toLowerCase();
            const lot = (l.batch?.lotNumber || l.lotNumber || '').toLowerCase();
            const cat = (l.item?.category?.nombre || l.item?.categoria || l.categoria || '').toLowerCase();
            const supplier = (l.item?.supplier?.name || l.item?.supplierName || l.supplierName || '').toLowerCase();
            const searchable = `${code} ${desc} ${lot} ${cat} ${supplier}`.toLowerCase();
            return tokens.every(token => searchable.includes(token));
        });
    }, [remito, search]);

    if (!remito) return null;
    const lines = remito.lines || remito.items || [];
    const isSalida = remito.tipo?.includes('SALIDA');
    const isActive = remito.status === 'ACTIVO';

    const handleRevertLine = async (line: any) => {
        if (!window.confirm('¿Estás seguro de que querés revertir este registro? El stock volverá a su posición original.')) return;
        try {
            await revertLine(line.id).unwrap();
            alert('Registro revertido con éxito.');
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
                <Box sx={{ mb: 4, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(5, 1fr)' }, gap: 2 }}>
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
                            {isSalida ? 'Cliente' : 'Proveedor'}
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
                    <Box sx={{ background: 'rgba(56, 189, 248, 0.05)', p: 1, borderRadius: 2, border: '1px solid rgba(56, 189, 248, 0.15)' }}>
                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Total Peso
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800, color: 'primary.main' }}>
                            {lines.reduce((sum: number, line: any) => sum + Number(line.qtyPrincipal || 0), 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                        </Typography>
                    </Box>
                    <Box sx={{ background: 'rgba(139, 92, 246, 0.05)', p: 1, borderRadius: 2, border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                        <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Total Secundario
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800, color: 'secondary.main' }}>
                            {lines.reduce((sum: number, line: any) => sum + Number(line.qtySecundaria || 0), 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })} un
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ mb: 3 }} />

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {isSalida ? 'Materiales Despachados' : 'Materiales Recibidos'}
                    </Typography>
                    <TextField
                        size="small"
                        placeholder="Buscar material en este remito..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{ width: { xs: '100%', sm: '300px' } }}
                    />
                </Box>

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
                        {filteredLines.map((line: any, idx: number) => (
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
