import { useState, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    TextField,
    Tabs,
    Tab,
    Chip,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableContainer,
    Paper,
    Divider
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { OrdenCompra, OrdenCompraLinea } from './types';
import { asociarRemitoEntradaALinea, declararEntregaManualALinea } from './ordenesCompraStorage';
import { useGetRemitosEntradaQuery } from '../../warehouse/remitosEntrada/api/remitos-entrada.api';

interface RecepcionOrdenCompraModalProps {
    open: boolean;
    onClose: () => void;
    orden: OrdenCompra;
    linea: OrdenCompraLinea;
}

export default function RecepcionOrdenCompraModal({
    open,
    onClose,
    orden,
    linea
}: RecepcionOrdenCompraModalProps) {
    const [tabIndex, setTabIndex] = useState<number>(0);

    // Tab 1: Remitos de depósito
    const { data: remitosEntrada = [], isLoading: loadingRemitos } = useGetRemitosEntradaQuery();
    const [selectedRemitoId, setSelectedRemitoId] = useState<string>('');
    const [imputedKgRemito, setImputedKgRemito] = useState<string>('');
    const [notasRemito, setNotasRemito] = useState<string>('');

    // Tab 2: Recepción manual directa
    const pendienteKg = Math.max(0, linea.cantidadPedidaKg - linea.cantidadRecibidaKg);
    const [manualKg, setManualKg] = useState<string>(String(pendienteKg));
    const [notasManual, setNotasManual] = useState<string>('Recepción física directa confirmada por Compras');

    // Filtrar remitos del mismo proveedor o que contengan movimientos
    const remitosProveedor = useMemo(() => {
        return remitosEntrada.filter((r: any) => {
            if (!orden.partnerId) return true;
            return r.partnerId === orden.partnerId || (r.partner?.id === orden.partnerId);
        });
    }, [remitosEntrada, orden.partnerId]);

    const handleAsociarRemito = () => {
        const qty = Number(imputedKgRemito);
        if (!qty || qty <= 0) {
            alert('Ingrese una cantidad válida en kg');
            return;
        }
        const rem = remitosEntrada.find((r: any) => r.id === selectedRemitoId);
        if (!rem) {
            alert('Seleccione un remito de la lista');
            return;
        }

        asociarRemitoEntradaALinea(orden.id, linea.id, {
            remitoId: rem.id,
            remitoNumero: rem.numero || `Remito-${rem.id.substring(0, 6)}`,
            fecha: rem.fecha || new Date().toISOString().split('T')[0],
            cantidadKg: qty,
            notas: notasRemito
        });

        onClose();
    };

    const handleEntregaManual = () => {
        const qty = Number(manualKg);
        if (!qty || qty <= 0) {
            alert('Ingrese una cantidad válida mayor a 0 kg');
            return;
        }

        declararEntregaManualALinea(orden.id, linea.id, qty, notasManual);
        onClose();
    };

    const colors = {
        bg: '#0f172a',
        surface: '#1e293b',
        border: 'rgba(255, 255, 255, 0.08)',
        primary: '#f59e0b',
        info: '#38bdf8',
        success: '#10b981',
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
            <DialogTitle sx={{ fontWeight: 800, fontSize: '18px', borderBottom: `1px solid ${colors.border}` }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Registrar Recepción / Entrega de Mercadería</span>
                    <Chip
                        label={`${orden.numero} • ${linea.codigoInterno}`}
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: colors.primary, fontWeight: 800 }}
                    />
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 2.5 }}>
                {/* Resumen del estado de la línea */}
                <Box sx={{
                    p: 1.5,
                    bgcolor: 'rgba(0,0,0,0.2)',
                    borderRadius: 1.5,
                    border: `1px solid ${colors.border}`,
                    mb: 2.5,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 1.5
                }}>
                    <Box>
                        <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>Material</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '13px', color: colors.text }}>{linea.codigoInterno}</Typography>
                        <Typography variant="caption" sx={{ color: colors.textSecondary, fontSize: '11px', display: 'block' }}>{linea.descripcion}</Typography>
                    </Box>

                    <Box>
                        <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>Cantidad Pedida</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '14px', color: colors.text }}>{linea.cantidadPedidaKg.toLocaleString()} kg</Typography>
                    </Box>

                    <Box>
                        <Typography variant="caption" sx={{ color: colors.success, fontSize: '10px' }}>Ya Recibido</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '14px', color: colors.success }}>{linea.cantidadRecibidaKg.toLocaleString()} kg</Typography>
                    </Box>

                    <Box>
                        <Typography variant="caption" sx={{ color: colors.info, fontSize: '10px' }}>Saldo Pendiente</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '14px', color: colors.info }}>{pendienteKg.toLocaleString()} kg</Typography>
                    </Box>
                </Box>

                {/* Selector de Pestañas: Remitos vs Manual */}
                <Tabs
                    value={tabIndex}
                    onChange={(_, v) => setTabIndex(v)}
                    sx={{
                        borderBottom: `1px solid ${colors.border}`,
                        mb: 2,
                        '& .MuiTab-root': {
                            color: colors.textSecondary,
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '13px'
                        },
                        '& .Mui-selected': { color: colors.primary },
                        '& .MuiTabs-indicator': { backgroundColor: colors.primary }
                    }}
                >
                    <Tab icon={<LinkIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="🔗 Asignar Remito de Entrada (Depósito)" />
                    <Tab icon={<FlashOnIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="⚡ Entrega Manual Directa (Sin Remito)" />
                </Tabs>

                {/* TAB 1: ASIGNAR REMITO DE ENTRADA */}
                {tabIndex === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                            Asocia uno de los remitos de entrada recibidos en depósito por <strong>{orden.partnerNombre}</strong> para imputar los kilos a esta orden de compra.
                        </Typography>

                        {loadingRemitos ? (
                            <Box sx={{ p: 3, textAlign: 'center', color: colors.textMuted }}>Cargando remitos de entrada...</Box>
                        ) : remitosProveedor.length === 0 ? (
                            <Box sx={{ p: 3, textAlign: 'center', color: colors.textMuted, border: `1px dashed ${colors.border}`, borderRadius: 2 }}>
                                <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 1 }}>
                                    No hay remitos de entrada registrados para este proveedor.
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block', mb: 1.5 }}>
                                    Puedes usar la pestaña <strong>"⚡ Entrega Manual Directa"</strong> para no frenar la orden si el depósito aún no cargó el remito físico.
                                </Typography>
                                <Button size="small" variant="outlined" onClick={() => setTabIndex(1)} sx={{ borderColor: colors.primary, color: colors.primary }}>
                                    Pasar a Entrega Manual
                                </Button>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(0,0,0,0.2)', border: `1px solid ${colors.border}`, borderRadius: 1.5, maxHeight: 180 }}>
                                    <Table size="small">
                                        <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}>
                                            <TableRow>
                                                <TableCell sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Seleccionar</TableCell>
                                                <TableCell sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>N° Remito</TableCell>
                                                <TableCell sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Fecha</TableCell>
                                                <TableCell sx={{ color: colors.textMuted, fontSize: '11px', fontWeight: 700 }}>Líneas / Kilos</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {remitosProveedor.map((r: any) => {
                                                const isSel = r.id === selectedRemitoId;
                                                const totalKilosRemito = (r.lines || []).reduce((acc: number, l: any) => acc + Number(l.cantidadPrincipal || 0), 0);

                                                return (
                                                    <TableRow
                                                        key={r.id}
                                                        onClick={() => {
                                                            setSelectedRemitoId(r.id);
                                                            if (!imputedKgRemito) setImputedKgRemito(String(Math.min(pendienteKg, totalKilosRemito || pendienteKg)));
                                                        }}
                                                        sx={{
                                                            cursor: 'pointer',
                                                            bgcolor: isSel ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                                                            '&:hover': { bgcolor: isSel ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.03)' }
                                                        }}
                                                    >
                                                        <TableCell>
                                                            <input
                                                                type="radio"
                                                                name="selectedRemito"
                                                                checked={isSel}
                                                                onChange={() => setSelectedRemitoId(r.id)}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 800, color: colors.text, fontSize: '12px' }}>
                                                            {r.numero}
                                                        </TableCell>
                                                        <TableCell sx={{ color: colors.textSecondary, fontSize: '12px' }}>
                                                            {r.fecha}
                                                        </TableCell>
                                                        <TableCell sx={{ color: colors.info, fontSize: '12px', fontWeight: 700 }}>
                                                            {totalKilosRemito > 0 ? `${totalKilosRemito.toLocaleString()} kg` : `${(r.lines || []).length} ítems`}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1.5, mt: 1 }}>
                                    <TextField
                                        size="small"
                                        label="Kilos a Imputar"
                                        type="number"
                                        value={imputedKgRemito}
                                        onChange={(e) => setImputedKgRemito(e.target.value)}
                                        helperText={`Saldo pendiente: ${pendienteKg} kg`}
                                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.03)', color: colors.text, fontWeight: 800 } }}
                                    />
                                    <TextField
                                        size="small"
                                        label="Notas de la entrega"
                                        value={notasRemito}
                                        onChange={(e) => setNotasRemito(e.target.value)}
                                        placeholder="Primer lote recibido conforme..."
                                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.03)', color: colors.text } }}
                                    />
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}

                {/* TAB 2: ENTREGA MANUAL DIRECTA (DESACOPLADA) */}
                {tabIndex === 1 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{
                            p: 1.5,
                            bgcolor: 'rgba(56, 189, 248, 0.08)',
                            border: `1px solid ${colors.info}`,
                            borderRadius: 1.5
                        }}>
                            <Typography sx={{ fontWeight: 800, color: colors.info, fontSize: '13px', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                <FlashOnIcon sx={{ fontSize: 16 }} />
                                Recepción Independiente de Compras
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                Declara la entrega de estos kilos directamente para actualizar el saldo de la orden y las cantidades en tránsito, sin depender de la carga del remito en depósito.
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1.5 }}>
                            <TextField
                                size="small"
                                label="Kilos Recibidos"
                                type="number"
                                value={manualKg}
                                onChange={(e) => setManualKg(e.target.value)}
                                helperText={`Por defecto cubre el saldo: ${pendienteKg} kg`}
                                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.03)', color: colors.text, fontWeight: 900 } }}
                            />
                            <TextField
                                size="small"
                                label="Motivo / Constancia Comercial"
                                value={notasManual}
                                onChange={(e) => setNotasManual(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.03)', color: colors.text } }}
                            />
                        </Box>
                    </Box>
                )}

                {/* Historial de Entregas ya registradas en esta línea */}
                {(linea.remitosAsociados.length > 0 || linea.recepcionesManuales.length > 0) && (
                    <Box sx={{ mt: 3 }}>
                        <Divider sx={{ borderColor: colors.border, mb: 1.5 }} />
                        <Typography variant="caption" sx={{ color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                            Historial de Entregas Registradas en esta línea
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                            {linea.remitosAsociados.map(r => (
                                <Box key={r.id} sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 1, display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span>🔗 Remito {r.remitoNumero} ({r.fecha}) • {r.notas || 'Sin notas'}</span>
                                    <strong style={{ color: colors.success }}>+{r.cantidadKg.toLocaleString()} kg</strong>
                                </Box>
                            ))}
                            {linea.recepcionesManuales.map(m => (
                                <Box key={m.id} sx={{ p: 1, bgcolor: 'rgba(56, 189, 248, 0.05)', borderRadius: 1, display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span>⚡ Recepción Manual ({m.fecha}) • {m.notas}</span>
                                    <strong style={{ color: colors.info }}>+{m.cantidadKg.toLocaleString()} kg</strong>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, borderTop: `1px solid ${colors.border}` }}>
                <Button onClick={onClose} sx={{ color: colors.textSecondary, textTransform: 'none' }}>
                    Cancelar
                </Button>
                {tabIndex === 0 ? (
                    <Button
                        variant="contained"
                        onClick={handleAsociarRemito}
                        disabled={!selectedRemitoId}
                        startIcon={<CheckCircleIcon />}
                        sx={{
                            bgcolor: colors.primary,
                            color: '#000',
                            fontWeight: 800,
                            textTransform: 'none',
                            '&:hover': { bgcolor: '#d97706' }
                        }}
                    >
                        Vincular Remito e Imputar Kilos
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        onClick={handleEntregaManual}
                        startIcon={<FlashOnIcon />}
                        sx={{
                            bgcolor: colors.info,
                            color: '#000',
                            fontWeight: 800,
                            textTransform: 'none',
                            '&:hover': { bgcolor: '#0284c7' }
                        }}
                    >
                        Confirmar Entrega Directa
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
