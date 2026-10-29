import { useState, useMemo, useEffect } from 'react';
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
    MenuItem,
    Autocomplete,
    Paper,
    CircularProgress,
    Alert,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import { useCreateRemitoSalidaMutation, usePreviewRemitoSalidaMutation } from '../api/remitos-salida.api';
import { useGetDepotsQuery } from '../../deposito/api/deposito.api';
import { useGetPartnersQuery } from '../../../config/partners/api/partners.api';
import { useGetItemsQuery } from '../../materiales/api/items.api';
import { useGetStockQuery } from '../../stock/api/stock.api';
import { CreatePartnerDialog } from '../../../config/CreatePartnerDialog';

const colors = {
    primary: '#f59e0b',
    secondary: 'var(--text-mui-secondary, #475569)',
    bg: 'var(--bg-primary, #0f1117)',
    cardBg: 'var(--bg-hover-row, rgba(255,255,255,0.03))',
    border: 'rgba(255, 255, 255, 0.08)',
    text: 'var(--text-primary, #f3f4f6)',
    textDim: 'var(--text-muted, #9ca3af)',
    danger: '#ef4444',
    success: '#10b981',
    info: '#3b82f6',
    inputBg: 'var(--bg-action-btn, rgba(255,255,255,0.05))'
};

interface Line {
    itemId: string;
    itemDesc: string;
    itemCode: string;
    lotId: string;
    lotNumber: string;
    posicionId: string;
    posicionCodigo: string;
    qtyPrincipal: string;
    qtySecundaria: string;
    kilosPorCaja: number | null;
}

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

export function NuevoRemitoSalidaModal({ onClose, onSuccess }: Props) {
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => rawDepots.filter((d: any) => d.activo !== false), [rawDepots]);
    const { data: clients = [] } = useGetPartnersQuery({ type: 'CLIENT' });
    const { data: items = [] } = useGetItemsQuery({});
    const { data: stock = [] } = useGetStockQuery({});

    const [createRemitoSalida, { isLoading: isSaving }] = useCreateRemitoSalidaMutation();
    const [previewRemitoSalida, { isLoading: isPreviewing }] = usePreviewRemitoSalidaMutation();

    // ── Cabecera ──
    const [depositoId, setDepositoId] = useState(() => {
        return sessionStorage.getItem('selectedDepotId') || '';
    });
    const [clientId, setClientId] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [numero, setNumero] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [error, setError] = useState('');

    // Modal nuevo cliente
    const [isCreatePartnerOpen, setIsCreatePartnerOpen] = useState(false);

    // Modo preview
    const [previewData, setPreviewData] = useState<any>(null);

    // Auto-seleccionar depósito si hay solo uno
    useEffect(() => {
        if (!depositoId && depots.length === 1) {
            setDepositoId(depots[0].id);
        }
    }, [depots, depositoId]);

    // ── Líneas ──
    const [lines, setLines] = useState<Line[]>([
        { itemId: '', itemDesc: '', itemCode: '', lotId: '', lotNumber: '', posicionId: '', posicionCodigo: '', qtyPrincipal: '', qtySecundaria: '', kilosPorCaja: null }
    ]);

    const addLine = () => {
        setLines(prev => [
            ...prev,
            { itemId: '', itemDesc: '', itemCode: '', lotId: '', lotNumber: '', posicionId: '', posicionCodigo: '', qtyPrincipal: '', qtySecundaria: '', kilosPorCaja: null }
        ]);
    };

    const removeLine = (index: number) => {
        setLines(prev => prev.filter((_, i) => i !== index));
    };

    const updateLine = (index: number, patch: Partial<Line>) => {
        setLines(prev => {
            const next = [...prev];
            next[index] = { ...next[index], ...patch };
            return next;
        });
    };

    // Al seleccionar material
    const handleSelectItem = (index: number, item: any | null) => {
        if (!item) {
            updateLine(index, { itemId: '', itemDesc: '', itemCode: '', lotId: '', lotNumber: '', posicionId: '', posicionCodigo: '', kilosPorCaja: null });
            return;
        }

        const kilosRatio = (item.kilosPorCaja && Number(item.kilosPorCaja) > 0)
            ? Number(item.kilosPorCaja)
            : (item.factorConversion && Number(item.factorConversion) > 0 ? Number(item.factorConversion) : null);

        updateLine(index, {
            itemId: item.id,
            itemDesc: item.descripcion,
            itemCode: item.codigoInterno,
            lotId: '',
            lotNumber: '',
            posicionId: '',
            posicionCodigo: '',
            kilosPorCaja: kilosRatio
        });
    };

    // Auto-cálculo de Kilos al cambiar bultos
    const handleSecundariaChange = (index: number, val: string) => {
        const line = lines[index];
        const patch: Partial<Line> = { qtySecundaria: val };

        if (line.kilosPorCaja && line.kilosPorCaja > 0) {
            const boxes = Number(val);
            if (!isNaN(boxes) && boxes > 0) {
                patch.qtyPrincipal = (boxes * line.kilosPorCaja).toFixed(2);
            }
        }
        updateLine(index, patch);
    };

    // Obtener lotes disponibles en stock para el material seleccionado
    const getAvailableLots = (itemId: string) => {
        if (!itemId) return [];
        const lotsMap = new Map<string, { lotId: string; lotNumber: string; totalQty: number }>();
        stock
            .filter((s: any) => s.itemId === itemId && Number(s.qtyPrincipal) > 0 && (!depositoId || s.depositoId === depositoId))
            .forEach((s: any) => {
                const lotId = s.lotId;
                const lotNumber = s.batch?.lotNumber || 'SIN LOTE';
                const current = lotsMap.get(lotId) || { lotId, lotNumber, totalQty: 0 };
                current.totalQty += Number(s.qtyPrincipal);
                lotsMap.set(lotId, current);
            });
        return Array.from(lotsMap.values());
    };

    // Obtener posiciones disponibles en stock para el material y lote seleccionado
    const getAvailablePositions = (itemId: string, lotId: string) => {
        if (!itemId) return [];
        return stock
            .filter((s: any) =>
                s.itemId === itemId &&
                (!lotId || s.lotId === lotId) &&
                Number(s.qtyPrincipal) > 0 &&
                (!depositoId || s.depositoId === depositoId) &&
                s.posicion
            )
            .map((s: any) => ({
                posicionId: s.posicionId,
                posicionCodigo: s.posicion.codigo,
                qtyPrincipal: Number(s.qtyPrincipal),
                qtySecundaria: s.qtySecundaria ? Number(s.qtySecundaria) : null,
                lotNumber: s.batch?.lotNumber || ''
            }));
    };

    // Totales
    const totalKilos = useMemo(() => {
        return lines.reduce((acc, l) => acc + (Number(l.qtyPrincipal) || 0), 0);
    }, [lines]);

    const totalBultos = useMemo(() => {
        return lines.reduce((acc, l) => acc + (Number(l.qtySecundaria) || 0), 0);
    }, [lines]);

    // Solicitar Preview FIFO
    const handleRequestPreview = async () => {
        setError('');
        const validLines = lines.filter(l => l.itemId && Number(l.qtyPrincipal) > 0);
        if (validLines.length === 0) {
            setError('Ingresá al menos un material con cantidad válida.');
            return;
        }

        try {
            const result = await previewRemitoSalida({
                lines: validLines.map(l => ({
                    itemId: l.itemId,
                    lotId: l.lotId || undefined,
                    posicionId: l.posicionId || undefined,
                    qtyPrincipal: Number(l.qtyPrincipal),
                    qtySecundaria: l.qtySecundaria ? Number(l.qtySecundaria) : undefined
                }))
            }).unwrap();
            setPreviewData(result);
        } catch (e: any) {
            setError(e?.data?.message || 'Error al generar la previsualización FIFO');
        }
    };

    // Guardar remito de salida
    const handleConfirmSave = async () => {
        setError('');
        const validLines = lines.filter(l => l.itemId && Number(l.qtyPrincipal) > 0);
        if (validLines.length === 0) {
            setError('Ingresá al menos un material con cantidad válida.');
            return;
        }

        try {
            await createRemitoSalida({
                fecha,
                numero: numero.trim() || undefined,
                clientId: clientId || undefined,
                observaciones: observaciones.trim() || undefined,
                lines: validLines.map(l => ({
                    itemId: l.itemId,
                    lotId: l.lotId || undefined,
                    posicionId: l.posicionId || undefined,
                    qtyPrincipal: Number(l.qtyPrincipal),
                    qtySecundaria: l.qtySecundaria ? Number(l.qtySecundaria) : undefined
                }))
            }).unwrap();

            onSuccess();
        } catch (e: any) {
            setError(e?.data?.message || 'Error al registrar el remito de salida.');
        }
    };

    return (
        <>
            <Dialog
                open
                onClose={onClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 3,
                        maxHeight: '92vh'
                    }
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: `1px solid ${colors.border}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: colors.primary }}>
                            {previewData ? 'Previsualización FIFO de Despacho' : 'Nuevo Remito de Salida'}
                        </Typography>
                        <Chip
                            size="small"
                            label="EGRESO DE STOCK"
                            sx={{ bgcolor: 'rgba(239, 68, 68, 0.15)', color: colors.danger, fontWeight: 800, fontSize: '0.65rem' }}
                        />
                    </Box>
                    <IconButton size="small" onClick={onClose} sx={{ color: colors.textDim }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ py: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {error && (
                        <Alert severity="error" sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: colors.danger, border: `1px solid ${colors.danger}`, borderRadius: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {previewData ? (
                        /* VISTA DE PREVIEW FIFO */
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {previewData.warnings?.length > 0 && (
                                <Alert severity="warning" sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: 2 }}>
                                    {previewData.warnings.map((w: string, i: number) => (
                                        <div key={i}>{w}</div>
                                    ))}
                                </Alert>
                            )}

                            <Typography variant="body2" sx={{ color: colors.textDim }}>
                                El sistema descontará automáticamente el stock de las siguientes posiciones con criterio FIFO:
                            </Typography>

                            <Paper sx={{ bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2, overflow: 'hidden' }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                                        <TableRow sx={{ '& th': { color: colors.textDim, fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase' } }}>
                                            <TableCell>Material</TableCell>
                                            <TableCell>Partida / Lote</TableCell>
                                            <TableCell>Posición Origen</TableCell>
                                            <TableCell align="right">Kilos a Descontar</TableCell>
                                            <TableCell align="right">Stock Restante</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(previewData.lines || []).map((l: any, i: number) => (
                                            <TableRow key={i} sx={{ '& td': { color: 'var(--text-white-dynamic, #fff)', py: 1.2 } }}>
                                                <TableCell sx={{ fontWeight: 600 }}>{l.itemDescripcion}</TableCell>
                                                <TableCell>
                                                    <Chip label={l.lotNumber || 'S/L'} size="small" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700 }} />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={`📍 ${l.posicionCodigo}`} size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: colors.success, fontWeight: 800 }} />
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800, color: colors.primary }}>
                                                    {Number(l.qtyPrincipalDescontada).toFixed(2)} kg
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600, color: l.qtyPrincipalRestanteEnPosicion < 5 ? colors.danger : colors.success }}>
                                                    {Number(l.qtyPrincipalRestanteEnPosicion).toFixed(2)} kg
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Paper>
                        </Box>
                    ) : (
                        /* VISTA DE EDICIÓN DE REMITO */
                        <>
                            {/* Cabecera */}
                            <Paper sx={{ p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2 }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                                    <TextField
                                        label="Fecha del Remito"
                                        type="date"
                                        size="small"
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                        InputLabelProps={{ shrink: true, sx: { color: colors.textDim } }}
                                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                    />

                                    <TextField
                                        label="N° de Remito (Opcional)"
                                        size="small"
                                        placeholder="Automático si se deja vacío"
                                        value={numero}
                                        onChange={(e) => setNumero(e.target.value)}
                                        InputLabelProps={{ sx: { color: colors.textDim } }}
                                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                    />

                                    <TextField
                                        select
                                        label="Depósito"
                                        size="small"
                                        value={depositoId}
                                        onChange={(e) => setDepositoId(e.target.value)}
                                        InputLabelProps={{ sx: { color: colors.textDim } }}
                                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                    >
                                        <MenuItem value=""><em>Todos los depósitos</em></MenuItem>
                                        {depots.map((d: any) => (
                                            <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
                                        ))}
                                    </TextField>
                                </Box>

                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr' }, gap: 2, mt: 2 }}>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <TextField
                                            select
                                            fullWidth
                                            label="Cliente"
                                            size="small"
                                            value={clientId}
                                            onChange={(e) => setClientId(e.target.value)}
                                            InputLabelProps={{ sx: { color: colors.textDim } }}
                                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                        >
                                            <MenuItem value=""><em>Consumidor Final / Sin Cliente</em></MenuItem>
                                            {clients.map((c: any) => (
                                                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                            ))}
                                        </TextField>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => setIsCreatePartnerOpen(true)}
                                            sx={{ color: colors.primary, borderColor: colors.primary, minWidth: '40px', px: 1, borderRadius: 2 }}
                                        >
                                            +
                                        </Button>
                                    </Box>

                                    <TextField
                                        label="Observaciones"
                                        size="small"
                                        placeholder="Ej: Orden de entrega #4912..."
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        InputLabelProps={{ sx: { color: colors.textDim } }}
                                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                    />
                                </Box>
                            </Paper>

                            {/* Líneas de mercadería */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-white-dynamic, #fff)' }}>
                                        Mercadería a Despachar ({lines.length})
                                    </Typography>
                                    <Button
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={addLine}
                                        sx={{ color: colors.primary, fontWeight: 700, borderRadius: 2 }}
                                    >
                                        Agregar Ítem
                                    </Button>
                                </Box>

                                {lines.map((line, idx) => {
                                    const availableLots = getAvailableLots(line.itemId);
                                    const availablePositions = getAvailablePositions(line.itemId, line.lotId);

                                    return (
                                        <Paper key={idx} sx={{ p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2.5fr 1.5fr 1.5fr' }, gap: 1.5 }}>
                                                {/* Autocomplete de Material */}
                                                <Autocomplete
                                                    size="small"
                                                    options={items}
                                                    getOptionLabel={(o: any) => `${o.codigoInterno} — ${o.descripcion}`}
                                                    value={items.find((it: any) => it.id === line.itemId) || null}
                                                    onChange={(_, val) => handleSelectItem(idx, val)}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Material"
                                                            placeholder="Buscar por código o descripción..."
                                                            InputLabelProps={{ sx: { color: colors.textDim } }}
                                                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                                        />
                                                    )}
                                                />

                                                {/* Selector Lote / Partida */}
                                                <TextField
                                                    select
                                                    size="small"
                                                    label="Partida / Lote"
                                                    value={line.lotId}
                                                    onChange={(e) => {
                                                        const sel = availableLots.find(l => l.lotId === e.target.value);
                                                        updateLine(idx, { lotId: e.target.value, lotNumber: sel?.lotNumber || '', posicionId: '' });
                                                    }}
                                                    disabled={!line.itemId}
                                                    InputLabelProps={{ sx: { color: colors.textDim } }}
                                                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                                >
                                                    <MenuItem value=""><em>Cualquiera (FIFO automático)</em></MenuItem>
                                                    {availableLots.map((l) => (
                                                        <MenuItem key={l.lotId} value={l.lotId}>
                                                            {l.lotNumber} ({l.totalQty.toFixed(1)} kg disp.)
                                                        </MenuItem>
                                                    ))}
                                                </TextField>

                                                {/* Selector Posición Origen */}
                                                <TextField
                                                    select
                                                    size="small"
                                                    label="Posición Origen"
                                                    value={line.posicionId}
                                                    onChange={(e) => {
                                                        const sel = availablePositions.find(p => p.posicionId === e.target.value);
                                                        updateLine(idx, { posicionId: e.target.value, posicionCodigo: sel?.posicionCodigo || '' });
                                                    }}
                                                    disabled={!line.itemId}
                                                    InputLabelProps={{ sx: { color: colors.textDim } }}
                                                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                                >
                                                    <MenuItem value=""><em>Cualquiera (FIFO automático)</em></MenuItem>
                                                    {availablePositions.map((p, pIdx) => (
                                                        <MenuItem key={pIdx} value={p.posicionId}>
                                                            {p.posicionCodigo} ({p.qtyPrincipal.toFixed(1)} kg disp.)
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            </Box>

                                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr auto', md: '1fr 1fr auto' }, gap: 1.5, alignItems: 'center' }}>
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    label="Bultos / Cajas"
                                                    placeholder="0"
                                                    value={line.qtySecundaria}
                                                    onChange={(e) => handleSecundariaChange(idx, e.target.value)}
                                                    disabled={!line.itemId}
                                                    InputLabelProps={{ sx: { color: colors.textDim } }}
                                                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                                />

                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    label="Kilos a Despachar *"
                                                    placeholder="0.00"
                                                    value={line.qtyPrincipal}
                                                    onChange={(e) => updateLine(idx, { qtyPrincipal: e.target.value })}
                                                    disabled={!line.itemId}
                                                    InputLabelProps={{ sx: { color: colors.textDim } }}
                                                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                                />

                                                {lines.length > 1 && (
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => removeLine(idx)}
                                                        sx={{ alignSelf: 'center' }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </Box>
                                        </Paper>
                                    );
                                })}
                            </Box>
                        </>
                    )}
                </DialogContent>

                {/* Footer Resumen y Acciones */}
                <DialogActions sx={{ p: 2.5, px: 3, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    {!previewData ? (
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ background: 'rgba(245, 158, 11, 0.1)', px: 1.5, py: 0.8, borderRadius: 2, border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                                <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                    Total Kilos
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 900, color: colors.primary }}>
                                    {totalKilos.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg
                                </Typography>
                            </Box>
                            <Box sx={{ background: 'rgba(16, 185, 129, 0.1)', px: 1.5, py: 0.8, borderRadius: 2, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                                <Typography variant="caption" sx={{ color: colors.success, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                    Total Bultos
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 900, color: colors.success }}>
                                    {totalBultos.toLocaleString('es-AR')} un
                                </Typography>
                            </Box>
                        </Box>
                    ) : (
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackIcon />}
                            onClick={() => setPreviewData(null)}
                            sx={{ color: colors.textDim, borderColor: colors.border, borderRadius: 2 }}
                        >
                            Volver a Modificar
                        </Button>
                    )}

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button onClick={onClose} sx={{ color: colors.textDim, fontWeight: 700 }}>
                            Cancelar
                        </Button>

                        {!previewData && (
                            <Button
                                variant="outlined"
                                onClick={handleRequestPreview}
                                disabled={isPreviewing || totalKilos <= 0}
                                sx={{ color: colors.info, borderColor: colors.info, fontWeight: 700, borderRadius: 2 }}
                            >
                                {isPreviewing ? <CircularProgress size={18} sx={{ color: colors.info }} /> : 'Ver Preview FIFO'}
                            </Button>
                        )}

                        <Button
                            variant="contained"
                            startIcon={<CheckCircleOutlineIcon />}
                            onClick={handleConfirmSave}
                            disabled={isSaving || totalKilos <= 0}
                            sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, borderRadius: 2, px: 2.5, '&:hover': { bgcolor: '#d97706' } }}
                        >
                            {isSaving ? <CircularProgress size={18} sx={{ color: '#000' }} /> : 'Confirmar Egreso'}
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>

            {isCreatePartnerOpen && (
                <CreatePartnerDialog
                    open={isCreatePartnerOpen}
                    onClose={() => setIsCreatePartnerOpen(false)}
                    defaultType="CLIENT"
                    onSuccess={(p: any) => {
                        setClientId(p.id);
                        setIsCreatePartnerOpen(false);
                    }}
                />
            )}
        </>
    );
}
