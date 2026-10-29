import { useState, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, Table, TableBody,
    TableCell, TableHead, TableRow, Chip, Divider, IconButton, Tooltip,
    TextField, CircularProgress
} from '@mui/material';
import { Undo as RevertIcon } from '@mui/icons-material';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import { useDeleteRemitoSalidaLineMutation } from '../../remitosSalida/api/remitos-salida.api';
import { useDeleteRemitoEntradaLineMutation } from '../../remitosEntrada/api/remitos-entrada.api';

interface RemitoDetailModalProps {
    open: boolean;
    onClose: () => void;
    remito: any;
}

const normalize = (text: string) =>
    (text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const clean = String(dateStr).slice(0, 10);
    const parts = clean.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return clean;
};

export const RemitoDetailModal = ({ open, onClose, remito }: RemitoDetailModalProps) => {
    const [deleteSalidaLine, { isLoading: isDeletingSalida }] = useDeleteRemitoSalidaLineMutation();
    const [deleteEntradaLine, { isLoading: isDeletingEntrada }] = useDeleteRemitoEntradaLineMutation();
    const [search, setSearch] = useState('');

    const isSalida = remito?.tipo?.toUpperCase().includes('SALIDA');
    const isActive = remito?.status === 'ACTIVO';
    const isReverting = isDeletingSalida || isDeletingEntrada;

    const filteredLines = useMemo(() => {
        if (!remito) return [];
        const lines = remito.lines || remito.items || [];
        const query = normalize(search);
        if (!query) return lines;
        const tokens = query.split(/\s+/).filter(Boolean);

        return lines.filter((l: any) => {
            const code = normalize(l.item?.codigoInterno || l.codigoInterno || '');
            const desc = normalize(l.item?.descripcion || l.descripcion || '');
            const lot = normalize(l.batch?.lotNumber || l.lotNumber || '');
            const cat = normalize(l.item?.category?.nombre || l.item?.categoria || l.categoria || '');
            const supplier = normalize(l.item?.supplier?.name || l.item?.supplierName || l.supplierName || l.batch?.supplier?.name || '');
            const pos = normalize(l.posicion?.codigo || '');
            const searchable = `${code} ${desc} ${lot} ${cat} ${supplier} ${pos}`;
            return tokens.every(token => searchable.includes(token));
        });
    }, [remito, search]);

    if (!remito) return null;
    const lines = remito.lines || remito.items || [];

    const handleRevertLine = async (line: any) => {
        const confirmMsg = isSalida
            ? '¿Estás seguro de anular esta línea del remito de salida? La mercadería se reintegrará al stock en su posición original.'
            : '¿Estás seguro de anular esta línea del remito de entrada? La mercadería se descontará del stock de esa posición.';

        if (!window.confirm(confirmMsg)) return;

        try {
            if (isSalida) {
                await deleteSalidaLine(line.id).unwrap();
            } else {
                await deleteEntradaLine(line.id).unwrap();
            }
            // Actualización optimista o notificación
            alert('Línea anulada con éxito y stock actualizado.');
        } catch (e: any) {
            alert(e?.data?.message || 'Error al anular la línea del remito');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const activeLines = lines.filter((l: any) => l.status !== 'ANULADO');

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            fullWidth 
            maxWidth="md"
            PaperProps={{
                id: 'printable-remito',
                sx: { 
                    borderRadius: 3,
                    bgcolor: 'var(--bg-primary, #0f1117)',
                    color: 'var(--text-primary, #f3f4f6)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }
            }}
        >
            <DialogTitle sx={{ fontWeight: 800, pt: 3, px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#f59e0b' }}>
                        Remito de {isSalida ? 'Salida' : 'Entrada'}: {remito.numero || remito.documentId || 'S/N'}
                    </Typography>
                    {remito.status === 'ANULADO' ? (
                        <Chip label="ANULADO" color="error" size="small" sx={{ fontWeight: 800 }} />
                    ) : (
                        <Chip label="ACTIVO" color="success" size="small" sx={{ fontWeight: 800 }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} className="no-print">
                    <Button 
                        size="small" 
                        variant="outlined" 
                        startIcon={<PrintIcon />} 
                        onClick={handlePrint}
                        sx={{ color: '#38bdf8', borderColor: '#38bdf8', fontWeight: 700, borderRadius: 2 }}
                    >
                        Imprimir
                    </Button>
                    <IconButton onClick={onClose} sx={{ color: 'var(--text-muted, #9ca3af)' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ px: 3 }}>
                <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(5, 1fr)' }, gap: 2 }}>
                    <Box>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted, #9ca3af)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                            Fecha
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-white-dynamic, #fff)' }}>
                            {formatDate(remito.fecha || remito.date)}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted, #9ca3af)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                            {isSalida ? 'Cliente' : 'Proveedor'}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-white-dynamic, #fff)' }}>
                            {remito.partner?.name || remito.supplier?.name || remito.provider?.name || remito.client?.name || '—'}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted, #9ca3af)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                            Depósito
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-white-dynamic, #fff)' }}>
                            {remito.deposito?.nombre || 'General'}
                        </Typography>
                    </Box>
                    <Box sx={{ background: 'rgba(245, 158, 11, 0.1)', p: 1, borderRadius: 2, border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                        <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                            Total Peso {remito.status === 'ACTIVO' && activeLines.length < lines.length ? '(Activo)' : ''}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 900, color: '#f59e0b' }}>
                            {activeLines.reduce((sum: number, line: any) => sum + Number(line.qtyPrincipal || 0), 0).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg
                        </Typography>
                    </Box>
                    <Box sx={{ background: 'rgba(16, 185, 129, 0.1)', p: 1, borderRadius: 2, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                        <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                            Total Bultos {remito.status === 'ACTIVO' && activeLines.length < lines.length ? '(Activo)' : ''}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 900, color: '#10b981' }}>
                            {activeLines.reduce((sum: number, line: any) => sum + Number(line.qtySecundaria || 0), 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })} un
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ mb: 2.5, borderColor: 'rgba(255,255,255,0.08)' }} />

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-white-dynamic, #fff)' }}>
                        {isSalida ? 'Materiales Despachados' : 'Materiales Recibidos'} ({lines.length})
                    </Typography>
                    <TextField
                        size="small"
                        placeholder="Filtrar materiales en este remito..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="no-print"
                        sx={{ width: { xs: '100%', sm: '280px' }, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.04)', color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                    />
                </Box>

                <Table size="small">
                    <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                        <TableRow sx={{ '& th': { color: 'var(--text-muted, #9ca3af)', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase' } }}>
                            <TableCell>Código</TableCell>
                            <TableCell>Descripción</TableCell>
                            <TableCell>Partida / Lote</TableCell>
                            <TableCell>Ubicación</TableCell>
                            <TableCell align="right">Kilos</TableCell>
                            <TableCell align="right">Bultos</TableCell>
                            {isActive && <TableCell align="center" className="no-print">Acciones</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredLines.map((line: any, idx: number) => {
                            const isLineAnulada = line.status === 'ANULADO';
                            return (
                                <TableRow key={line.id || idx} sx={{ '& td': { color: isLineAnulada ? 'var(--text-muted, #6b7280)' : 'var(--text-white-dynamic, #fff)', py: 1.2, textDecoration: isLineAnulada ? 'line-through' : 'none' } }}>
                                    <TableCell sx={{ fontWeight: 700, color: isLineAnulada ? 'inherit' : '#f59e0b', fontSize: '0.8rem' }}>
                                        {line.item?.codigoInterno || line.codigoInterno}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        {line.item?.descripcion || line.descripcion}
                                    </TableCell>
                                    <TableCell>
                                        {line.batch?.lotNumber || line.lotNumber ? (
                                            <Chip 
                                                label={line.batch?.lotNumber || line.lotNumber} 
                                                size="small" 
                                                sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.06)', color: 'var(--text-white-dynamic, #fff)' }} 
                                            />
                                        ) : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={`📍 ${line.posicion?.codigo || 'ENTRADA'}`} 
                                            size="small" 
                                            sx={{ bgcolor: 'rgba(59, 130, 246, 0.12)', color: '#38bdf8', fontWeight: 800, fontSize: '0.75rem' }} 
                                        />
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, color: isLineAnulada ? 'inherit' : '#f59e0b' }}>
                                        {Number(line.qtyPrincipal).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: isLineAnulada ? 'inherit' : '#10b981' }}>
                                        {(line.qtySecundaria !== undefined && line.qtySecundaria !== null) ? `${Number(line.qtySecundaria).toLocaleString('es-AR')} un` : '—'}
                                    </TableCell>
                                    {isActive && (
                                        <TableCell align="center" className="no-print" sx={{ textDecoration: 'none' }}>
                                            {isLineAnulada ? (
                                                <Chip label="ANULADO" size="small" color="error" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                                            ) : (
                                                <Tooltip title={isSalida ? "Revertir línea (Devolver al stock)" : "Anular línea (Descontar del stock)"}>
                                                    <span>
                                                        <IconButton 
                                                            size="small" 
                                                            color="error" 
                                                            onClick={() => handleRevertLine(line)}
                                                            disabled={isReverting}
                                                            sx={{ '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.15)' } }}
                                                        >
                                                            {isReverting ? <CircularProgress size={16} color="error" /> : <RevertIcon fontSize="small" />}
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                {remito.observaciones && (
                    <Box sx={{ mt: 3, p: 1.5, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted, #9ca3af)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                            Observaciones
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'var(--text-white-dynamic, #fff)', mt: 0.5 }}>
                            {remito.observaciones}
                        </Typography>
                    </Box>
                )}

                {/* Área de firmas para impresión física */}
                <Box className="only-print" sx={{ display: 'none', mt: 8, pt: 4, borderTop: '1px solid #ccc' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                        <Box sx={{ width: '220px' }}>
                            <Box sx={{ borderBottom: '1px solid #000', mb: 1, height: '40px' }} />
                            <Typography variant="caption" sx={{ color: '#000', fontWeight: 700 }}>
                                Firma y Aclaración (Receptor)
                            </Typography>
                        </Box>
                        <Box sx={{ width: '220px' }}>
                            <Box sx={{ borderBottom: '1px solid #000', mb: 1, height: '40px' }} />
                            <Typography variant="caption" sx={{ color: '#000', fontWeight: 700 }}>
                                Firma y Aclaración (Transportista)
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2.5, px: 3, borderTop: '1px solid rgba(255,255,255,0.08)' }} className="no-print">
                <Button onClick={onClose} variant="contained" sx={{ bgcolor: '#f59e0b', color: '#000', fontWeight: 800, borderRadius: 2, '&:hover': { bgcolor: '#d97706' } }}>
                    Cerrar
                </Button>
            </DialogActions>

            <style>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    .only-print {
                        display: block !important;
                    }
                    body {
                        background: #fff !important;
                        color: #000 !important;
                    }
                    #printable-remito {
                        box-shadow: none !important;
                        border: none !important;
                        background: #fff !important;
                        color: #000 !important;
                    }
                    #printable-remito * {
                        color: #000 !important;
                    }
                }
            `}</style>
        </Dialog>
    );
};
