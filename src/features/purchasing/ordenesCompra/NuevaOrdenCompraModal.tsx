import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    TextField,
    MenuItem,
    IconButton,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableContainer,
    Paper,
    Divider
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import PostAddIcon from '@mui/icons-material/PostAdd';
import type { OrdenCompra, OrdenCompraLinea } from './types';
import { saveOrdenCompra } from './ordenesCompraStorage';

interface NuevaOrdenCompraModalProps {
    open: boolean;
    onClose: () => void;
    partners: any[];
    items: any[];
    initialPartnerId?: string;
    initialItemId?: string;
    initialQtyKg?: number;
}

export default function NuevaOrdenCompraModal({
    open,
    onClose,
    partners,
    items,
    initialPartnerId,
    initialItemId,
    initialQtyKg
}: NuevaOrdenCompraModalProps) {
    const today = new Date().toISOString().split('T')[0];
    const defaultArrival = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    const [partnerId, setPartnerId] = useState<string>(initialPartnerId || (partners[0]?.id || ''));
    const [numero, setNumero] = useState<string>(`OC-2026-${Math.floor(100 + Math.random() * 900)}`);
    const [fechaEmision, setFechaEmision] = useState<string>(today);
    const [fechaArriboGlobal, setFechaArriboGlobal] = useState<string>(defaultArrival);
    const [observaciones, setObservaciones] = useState<string>('');

    // Líneas iniciales
    const [lines, setLines] = useState<any[]>(() => {
        if (initialItemId) {
            return [{
                itemId: initialItemId,
                cantidadKg: initialQtyKg || 500,
                fechaArribo: defaultArrival,
                precioUsd: ''
            }];
        }
        return [{
            itemId: items[0]?.id || '',
            cantidadKg: 1000,
            fechaArribo: defaultArrival,
            precioUsd: ''
        }];
    });

    const handleAddLine = () => {
        setLines(prev => [
            ...prev,
            {
                itemId: items[0]?.id || '',
                cantidadKg: 500,
                fechaArribo: fechaArriboGlobal,
                precioUsd: ''
            }
        ]);
    };

    const handleRemoveLine = (idx: number) => {
        setLines(prev => prev.filter((_, i) => i !== idx));
    };

    const handleLineChange = (idx: number, field: string, value: any) => {
        setLines(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    };

    const totalKg = lines.reduce((acc, l) => acc + Number(l.cantidadKg || 0), 0);

    const handleSave = (estado: 'EN_CAMINO' | 'BORRADOR') => {
        if (!partnerId) {
            alert('Por favor selecciona un proveedor');
            return;
        }
        if (lines.length === 0 || totalKg <= 0) {
            alert('Agrega al menos una línea con cantidad en kg');
            return;
        }

        const selectedPartner = partners.find(p => p.id === partnerId);

        const ordenLineas: OrdenCompraLinea[] = lines.map((l, idx) => {
            const it = items.find(i => i.id === l.itemId);
            return {
                id: `linea-${Date.now()}-${idx}`,
                itemId: l.itemId,
                codigoInterno: it?.codigoInterno || 'ITEM',
                descripcion: it?.descripcion || 'Material',
                categoriaNombre: it?.category?.nombre || it?.categoria || '',
                cantidadPedidaKg: Number(l.cantidadKg),
                cantidadRecibidaKg: 0,
                fechaArriboEstimada: l.fechaArribo || fechaArriboGlobal,
                estado: 'PENDIENTE',
                precioUnitarioUsd: l.precioUsd ? Number(l.precioUsd) : undefined,
                remitosAsociados: [],
                recepcionesManuales: []
            };
        });

        const nuevaOrden: OrdenCompra = {
            id: `oc-${Date.now()}`,
            numero: numero.trim() || `OC-${Date.now()}`,
            partnerId,
            partnerNombre: selectedPartner?.name || 'Proveedor General',
            fechaEmision,
            fechaArriboEstimada: fechaArriboGlobal,
            estado,
            observaciones,
            lineas: ordenLineas,
            creadoEn: new Date().toISOString(),
            actualizadoEn: new Date().toISOString()
        };

        saveOrdenCompra(nuevaOrden);
        onClose();
    };

    const colors = {
        bg: '#0f172a',
        surface: '#1e293b',
        border: 'rgba(255, 255, 255, 0.08)',
        primary: '#f59e0b',
        info: '#38bdf8',
        danger: '#ef4444',
        text: '#f8fafc',
        textSecondary: '#94a3b8',
        textMuted: '#64748b'
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: colors.surface,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 2
                }
            }}
        >
            <DialogTitle sx={{ fontWeight: 800, fontSize: '18px', display: 'flex', alignItems: 'center', gap: 1, borderBottom: `1px solid ${colors.border}` }}>
                <PostAddIcon sx={{ color: colors.primary }} />
                <span>Nueva Orden de Compra (Pedido a Proveedor)</span>
            </DialogTitle>

            <DialogContent sx={{ p: 2.5 }}>
                {/* 1. Cabecera tipo Remito */}
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
                    gap: 2,
                    mb: 2.5,
                    mt: 1
                }}>
                    <TextField
                        select
                        size="small"
                        label="Proveedor"
                        value={partnerId}
                        onChange={(e) => setPartnerId(e.target.value)}
                        sx={{
                            gridColumn: { xs: '1 / -1', sm: 'span 2' },
                            '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.03)', color: colors.text }
                        }}
                    >
                        {partners.map(p => (
                            <MenuItem key={p.id} value={p.id}>
                                {p.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        size="small"
                        label="N° de Orden (OC)"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.03)', color: colors.text, fontWeight: 700 }
                        }}
                    />

                    <TextField
                        size="small"
                        label="Fecha Emisión"
                        type="date"
                        value={fechaEmision}
                        onChange={(e) => setFechaEmision(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{
                            '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.03)', color: colors.text }
                        }}
                    />

                    <TextField
                        size="small"
                        label="Estimado Arribo General"
                        type="date"
                        value={fechaArriboGlobal}
                        onChange={(e) => setFechaArriboGlobal(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        helperText="Se aplica por defecto a cada línea"
                        sx={{
                            gridColumn: { xs: '1 / -1', sm: 'span 2' },
                            '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.03)', color: colors.text }
                        }}
                    />

                    <TextField
                        size="small"
                        label="Observaciones / Transporte"
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Transporte expreso, lote, condiciones de pago..."
                        sx={{
                            gridColumn: { xs: '1 / -1', sm: 'span 2' },
                            '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.03)', color: colors.text }
                        }}
                    />
                </Box>

                <Divider sx={{ borderColor: colors.border, mb: 2 }} />

                {/* 2. Tabla Dinámica de Líneas Pedidas */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.text, textTransform: 'uppercase', fontSize: '12px' }}>
                        Hilados / Materiales Solicitados ({lines.length})
                    </Typography>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={handleAddLine}
                        startIcon={<AddIcon fontSize="small" />}
                        sx={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: colors.primary,
                            borderColor: colors.border,
                            textTransform: 'none'
                        }}
                    >
                        Agregar Línea
                    </Button>
                </Box>

                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(0,0,0,0.2)', border: `1px solid ${colors.border}`, borderRadius: 1.5 }}>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}>
                            <TableRow>
                                <TableCell sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700, width: '40%' }}>Material / Código</TableCell>
                                <TableCell sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700, width: '20%' }}>Cantidad (kg)</TableCell>
                                <TableCell sx={{ color: colors.info, fontSize: '11px', fontWeight: 700, width: '25%' }}>Estimado de Arribo</TableCell>
                                <TableCell sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700, width: '15%' }}>Precio USD</TableCell>
                                <TableCell align="center" sx={{ color: colors.textMuted, fontSize: '11px', width: '40px' }}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.map((line, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>
                                        <TextField
                                            select
                                            size="small"
                                            fullWidth
                                            value={line.itemId}
                                            onChange={(e) => handleLineChange(idx, 'itemId', e.target.value)}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    fontSize: '12px',
                                                    height: 32,
                                                    bgcolor: 'rgba(255,255,255,0.02)',
                                                    color: colors.text
                                                }
                                            }}
                                        >
                                            {items.map(it => (
                                                <MenuItem key={it.id} value={it.id} sx={{ fontSize: '12px' }}>
                                                    {it.codigoInterno} - {it.descripcion}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </TableCell>

                                    <TableCell>
                                        <TextField
                                            size="small"
                                            type="number"
                                            value={line.cantidadKg}
                                            onChange={(e) => handleLineChange(idx, 'cantidadKg', e.target.value)}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    fontSize: '12px',
                                                    height: 32,
                                                    bgcolor: 'rgba(255,255,255,0.02)',
                                                    color: colors.text,
                                                    fontWeight: 800
                                                }
                                            }}
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <TextField
                                            size="small"
                                            type="date"
                                            value={line.fechaArribo}
                                            onChange={(e) => handleLineChange(idx, 'fechaArribo', e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    fontSize: '12px',
                                                    height: 32,
                                                    bgcolor: 'rgba(56, 189, 248, 0.05)',
                                                    color: colors.info,
                                                    fontWeight: 700
                                                }
                                            }}
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <TextField
                                            size="small"
                                            type="number"
                                            placeholder="USD/kg"
                                            value={line.precioUsd}
                                            onChange={(e) => handleLineChange(idx, 'precioUsd', e.target.value)}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    fontSize: '12px',
                                                    height: 32,
                                                    bgcolor: 'rgba(255,255,255,0.02)',
                                                    color: colors.text
                                                }
                                            }}
                                        />
                                    </TableCell>

                                    <TableCell align="center">
                                        <IconButton
                                            size="small"
                                            disabled={lines.length <= 1}
                                            onClick={() => handleRemoveLine(idx)}
                                            sx={{ color: colors.danger, opacity: lines.length <= 1 ? 0.3 : 0.8 }}
                                        >
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Totalizador de Kilos */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5, mt: 1.5, pr: 1 }}>
                    <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                        Total Pedido:
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: colors.primary }}>
                        {totalKg.toLocaleString()} kg
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2, borderTop: `1px solid ${colors.border}` }}>
                <Button onClick={onClose} sx={{ color: colors.textSecondary, textTransform: 'none' }}>
                    Cancelar
                </Button>
                <Button
                    variant="outlined"
                    onClick={() => handleSave('BORRADOR')}
                    sx={{ borderColor: colors.border, color: colors.text, textTransform: 'none' }}
                >
                    Guardar Borrador
                </Button>
                <Button
                    variant="contained"
                    onClick={() => handleSave('EN_CAMINO')}
                    sx={{
                        bgcolor: colors.primary,
                        color: '#000',
                        fontWeight: 800,
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#d97706' }
                    }}
                >
                    Confirmar Orden (En Camino)
                </Button>
            </DialogActions>
        </Dialog>
    );
}
