import { useState, useMemo, useEffect, useRef } from 'react';
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
    Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import { useCreateRemitoEntradaMutation } from '../api/remitos-entrada.api';
import { useGetDepotsQuery } from '../../deposito/api/deposito.api';
import { useGetPartnersQuery } from '../../../config/partners/api/partners.api';
import { useGetItemsQuery } from '../../materiales/api/items.api';
import { CreateItemDialog } from '../../materiales/components/CreateItemDialog';
import { CreatePartnerDialog } from '../../../config/CreatePartnerDialog';

const colors = {
    primary: '#f59e0b', // Amber
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
    lotNumber: string;
    posicionId: string;
    qtyPrincipal: string;
    qtySecundaria: string;
    observaciones: string;
    kilosPorCaja: number | null;
}

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

export function NuevoRemitoEntradaModal({ onClose, onSuccess }: Props) {
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => rawDepots.filter((d: any) => d.activo !== false), [rawDepots]);
    const { data: suppliers = [] } = useGetPartnersQuery({ type: 'SUPPLIER' });
    const { data: items = [] } = useGetItemsQuery({});

    const [createRemitoEntrada, { isLoading: isSaving }] = useCreateRemitoEntradaMutation();

    // ── Cabecera ──
    const [depositoId, setDepositoId] = useState(() => {
        return sessionStorage.getItem('selectedDepotId') || '';
    });
    const [supplierId, setSupplierId] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [nroExterno, setNroExterno] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [error, setError] = useState('');

    // Auto-seleccionar depósito si hay solo uno
    useEffect(() => {
        if (!depositoId && depots.length === 1) {
            setDepositoId(depots[0].id);
        }
    }, [depots, depositoId]);

    // Posiciones del depósito seleccionado
    const availablePositions = useMemo(() => {
        if (!depositoId) return [];
        const depot = depots.find((d: any) => d.id === depositoId);
        return (depot?.positions || []).filter((p: any) => p.activo !== false);
    }, [depots, depositoId]);

    const defaultPosId = useMemo(() => {
        const found = availablePositions.find((p: any) => p.codigo?.trim().toUpperCase() === 'ENTRADA');
        return found ? found.id : (availablePositions.length > 0 ? availablePositions[0].id : 'ENTRADA');
    }, [availablePositions]);

    const positionOptions = useMemo(() => {
        const hasEntrada = availablePositions.some((p: any) => p.codigo?.trim().toUpperCase() === 'ENTRADA');
        if (!hasEntrada && depositoId) {
            return [{ id: 'ENTRADA', codigo: 'ENTRADA' }, ...availablePositions];
        }
        return availablePositions;
    }, [availablePositions, depositoId]);

    // Modal de nuevo material y nuevo proveedor
    const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
    const [isCreatePartnerOpen, setIsCreatePartnerOpen] = useState(false);
    const [activeLineForCreate, setActiveLineForCreate] = useState<number | null>(null);

    // ── Líneas ──
    const [lines, setLines] = useState<Line[]>([
        { itemId: '', itemDesc: '', itemCode: '', lotNumber: '', posicionId: '', qtyPrincipal: '', qtySecundaria: '', observaciones: '', kilosPorCaja: null }
    ]);

    // Asignar posición ENTRADA por defecto a las líneas que no tengan posición asignada
    useEffect(() => {
        if (defaultPosId) {
            setLines(prev => prev.map(l => (l.posicionId ? l : { ...l, posicionId: defaultPosId })));
        }
    }, [defaultPosId]);

    const linesContainerRef = useRef<HTMLDivElement | null>(null);

    // Enfocar celda por índice y campo (y desplazar para mantener visible la fila actual)
    const focusCell = (lineIndex: number, field: 'material' | 'lotNumber' | 'posicionId' | 'qtySecundaria' | 'qtyPrincipal') => {
        const elId = `input-remito-line-${lineIndex}-${field}`;
        const el = document.getElementById(elId) as HTMLElement | null;
        if (el) {
            el.focus();
            if (typeof (el as HTMLInputElement).select === 'function') {
                (el as HTMLInputElement).select();
            }
        }
        // Desplazar suavemente el contenedor para que la fila activa esté siempre a la vista
        const rowEl = document.getElementById(`remito-line-card-${lineIndex}`);
        if (rowEl) {
            rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    // Auto-foco en el primer material al abrir el modal
    useEffect(() => {
        const timer = setTimeout(() => {
            focusCell(0, 'material');
        }, 150);
        return () => clearTimeout(timer);
    }, []);

    const addLine = () => {
        const nextIdx = lines.length;
        setLines(prev => [
            ...prev,
            { itemId: '', itemDesc: '', itemCode: '', lotNumber: '', posicionId: defaultPosId, qtyPrincipal: '', qtySecundaria: '', observaciones: '', kilosPorCaja: null }
        ]);
        setTimeout(() => {
            focusCell(nextIdx, 'material');
            if (linesContainerRef.current) {
                linesContainerRef.current.scrollTo({
                    top: linesContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 60);
    };

    const removeLine = (index: number) => {
        setLines(prev => prev.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, selectedItem: any) => {
        setLines(prev => {
            const next = [...prev];
            const kpc = selectedItem?.kilosPorCaja ? Number(selectedItem.kilosPorCaja) : null;
            next[index] = {
                ...next[index],
                itemId: selectedItem?.id || '',
                itemDesc: selectedItem?.descripcion || '',
                itemCode: selectedItem?.codigoInterno || '',
                kilosPorCaja: kpc
            };
            return next;
        });
    };

    const handleCajasChange = (index: number, val: string) => {
        setLines(prev => {
            const next = [...prev];
            const line = next[index];
            line.qtySecundaria = val;

            const cajas = parseFloat(val.replace(',', '.'));
            if (!isNaN(cajas) && cajas > 0 && line.kilosPorCaja && Number(line.kilosPorCaja) > 0) {
                line.qtyPrincipal = (cajas * Number(line.kilosPorCaja)).toFixed(1);
            }
            return next;
        });
    };

    const updateLine = (index: number, field: keyof Line, val: any) => {
        setLines(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: val };
            return next;
        });
    };

    // Resumen en vivo
    const totals = useMemo(() => {
        let kg = 0;
        let bultos = 0;
        lines.forEach(l => {
            kg += parseFloat(l.qtyPrincipal.replace(',', '.')) || 0;
            bultos += parseFloat(l.qtySecundaria.replace(',', '.')) || 0;
        });
        return { kg, bultos, count: lines.filter(l => l.itemId).length };
    }, [lines]);

    const handleSave = async () => {
        setError('');
        if (!depositoId) {
            setError('Seleccioná el depósito de destino.');
            return;
        }

        const validLines = lines.filter(l => l.itemId && parseFloat(l.qtyPrincipal.replace(',', '.')) > 0);
        if (validLines.length === 0) {
            setError('Ingresá al menos una línea con material y kilos recibidos.');
            return;
        }

        try {
            const partner = (suppliers as any[]).find(s => s.id === supplierId);
            await createRemitoEntrada({
                depositoId,
                depotId: depositoId,
                supplierId: supplierId || undefined,
                supplierName: partner?.name || undefined,
                fecha,
                numero: nroExterno?.trim() || undefined,
                documentoNumero: nroExterno?.trim() || undefined,
                observaciones: observaciones?.trim() || undefined,
                lines: validLines.map(l => ({
                    itemId: l.itemId,
                    lotNumber: l.lotNumber?.trim() || `REM-${Date.now().toString().slice(-6)}`,
                    posicionId: l.posicionId || undefined, // Si no se pasa, backend usa ENTRADA
                    qtyPrincipal: parseFloat(l.qtyPrincipal.replace(',', '.')),
                    qtySecundaria: l.qtySecundaria ? parseFloat(l.qtySecundaria.replace(',', '.')) : undefined,
                    observaciones: l.observaciones?.trim() || undefined,
                }))
            }).unwrap();

            onSuccess();
        } catch (e: any) {
            setError(e?.data?.message || 'Error al registrar el remito de entrada');
        }
    };

    return (
        <Dialog 
            open 
            onClose={onClose} 
            fullWidth 
            maxWidth="lg"
            PaperProps={{
                sx: { 
                    bgcolor: colors.bg, 
                    color: colors.text, 
                    border: `1px solid ${colors.primary}`, 
                    borderRadius: 3, 
                    boxShadow: '0 20px 60px rgba(0,0,0,0.8)' 
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: `1px solid ${colors.border}` }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: colors.primary, display: 'flex', alignItems: 'center', gap: 1 }}>
                        📥 Nuevo Remito de Entrada
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textDim }}>
                        Recepción de mercadería e ingreso directo a stock en ubicación
                    </Typography>
                </Box>
                <IconButton onClick={onClose} sx={{ color: colors.textDim }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ py: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Cabecera del Remito */}
                <Paper sx={{ p: 2.5, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                            select
                            label="Depósito Destino *"
                            size="small"
                            value={depositoId}
                            onChange={(e) => setDepositoId(e.target.value)}
                            sx={{ flex: '1 1 200px', '& .MuiInputLabel-root': { color: colors.textDim }, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                        >
                            <MenuItem value=""><em>Seleccionar depósito...</em></MenuItem>
                            {depots.map((d: any) => (
                                <MenuItem key={d.id} value={d.id}>{d.nombre} {d.planta ? `(${d.planta})` : ''}</MenuItem>
                            ))}
                        </TextField>

                        <Box sx={{ flex: '2 1 280px', display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Autocomplete
                                options={suppliers}
                                getOptionLabel={(option: any) => option.name || ''}
                                value={suppliers.find((s: any) => s.id === supplierId) || null}
                                onChange={(_e, val: any) => setSupplierId(val?.id || '')}
                                fullWidth
                                size="small"
                                renderInput={(params) => (
                                    <TextField 
                                        {...params} 
                                        label="Proveedor" 
                                        placeholder="Buscar o seleccionar proveedor..."
                                        InputLabelProps={{ sx: { color: colors.textDim } }}
                                        InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                    />
                                )}
                            />
                            <Tooltip title="Crear nuevo proveedor">
                                <Button 
                                    variant="outlined" 
                                    onClick={() => setIsCreatePartnerOpen(true)}
                                    sx={{ minWidth: '40px', width: '40px', height: '40px', p: 0, color: colors.primary, borderColor: colors.primary, borderRadius: 2 }}
                                >
                                    +
                                </Button>
                            </Tooltip>
                        </Box>

                        <TextField
                            label="Fecha de Recepción *"
                            type="date"
                            size="small"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            InputLabelProps={{ shrink: true, sx: { color: colors.textDim } }}
                            sx={{ flex: '1 1 150px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                        />

                        <TextField
                            label="N° Remito Proveedor"
                            placeholder="Ej: R-00012458"
                            size="small"
                            value={nroExterno}
                            onChange={(e) => setNroExterno(e.target.value)}
                            InputLabelProps={{ sx: { color: colors.textDim } }}
                            sx={{ flex: '1 1 180px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                        />
                    </Box>

                    <TextField
                        label="Observaciones Generales"
                        placeholder="Ej: Factura asociada, notas de descarga, precinto, etc."
                        size="small"
                        fullWidth
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        InputLabelProps={{ sx: { color: colors.textDim } }}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                    />
                </Paper>

                {/* Líneas de Remito */}
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.text, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                Materiales a Ingresar ({lines.length})
                            </Typography>
                            {supplierId && (
                                <Typography variant="caption" sx={{ color: colors.primary, fontSize: '0.7rem', bgcolor: 'rgba(245, 158, 11, 0.1)', px: 1, py: 0.3, borderRadius: 1, border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                                    Filtrado por proveedor
                                </Typography>
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => { setActiveLineForCreate(lines.length - 1 >= 0 ? lines.length - 1 : 0); setIsCreateItemOpen(true); }}
                                sx={{ color: colors.primary, borderColor: colors.primary, fontWeight: 700, borderRadius: 2, fontSize: '0.75rem', textTransform: 'none' }}
                            >
                                + Nuevo Material
                            </Button>
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={addLine}
                                sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, borderRadius: 2, fontSize: '0.75rem', textTransform: 'none', '&:hover': { bgcolor: '#d97706' } }}
                            >
                                + Agregar Línea
                            </Button>
                        </Box>
                    </Box>

                    <Box ref={linesContainerRef} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: '380px', overflowY: 'auto', pr: 0.5, scrollBehavior: 'smooth' }}>
                        {lines.map((line, idx) => {
                            const selectedItem = items.find((it: any) => it.id === line.itemId);
                            const uSec = selectedItem?.unidadSecundaria;
                            const uPrinc = selectedItem?.unidadPrincipal || 'kg';
                            const labelSec = uSec ? (uSec.trim().charAt(0).toUpperCase() + uSec.trim().slice(1)) : 'Bultos / Cajas';
                            const labelPrinc = uPrinc.toLowerCase() === 'kg' ? 'Kg Recibidos *' : `${uPrinc.trim().charAt(0).toUpperCase() + uPrinc.trim().slice(1)} Recibidos *`;

                            // Si se seleccionó un proveedor, filtrar solo los materiales de ese proveedor
                            const availableItems = supplierId
                                ? items.filter((it: any) => it.supplierId === supplierId)
                                : items;

                            // Preservar el item ya seleccionado en la línea en caso de haber sido elegido previamente
                            const lineOptions = selectedItem && !availableItems.some((it: any) => it.id === selectedItem.id)
                                ? [selectedItem, ...availableItems]
                                : availableItems;

                            return (
                                <Paper
                                    key={idx}
                                    id={`remito-line-card-${idx}`}
                                    sx={{
                                        p: 1.5,
                                        bgcolor: 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: 2.5,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1.5
                                    }}
                                >
                                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                                        {/* Selector de Material */}
                                        <Autocomplete
                                            options={lineOptions}
                                            noOptionsText={supplierId ? "No hay materiales registrados para este proveedor" : "No hay materiales"}
                                            getOptionLabel={(option: any) => `${option.codigoInterno} — ${option.descripcion}`}
                                            value={selectedItem || null}
                                            onChange={(_e, val: any) => {
                                                handleItemChange(idx, val);
                                                if (val) {
                                                    setTimeout(() => focusCell(idx, 'lotNumber'), 50);
                                                }
                                            }}
                                            size="small"
                                            autoHighlight
                                            sx={{ flex: '3 1 260px' }}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Material *"
                                                    placeholder={supplierId ? "Buscar entre materiales del proveedor..." : "Buscar código o descripción..."}
                                                    InputLabelProps={{ sx: { color: colors.textDim } }}
                                                    inputProps={{
                                                        ...params.inputProps,
                                                        id: `input-remito-line-${idx}-material`,
                                                        onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                                                            if (params.inputProps.onKeyDown) {
                                                                params.inputProps.onKeyDown(e);
                                                            }
                                                            if (e.key === 'Enter') {
                                                                if (line.itemId) {
                                                                    e.preventDefault();
                                                                    focusCell(idx, 'lotNumber');
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                                />
                                            )}
                                        />

                                        {/* Partida / Lote */}
                                        <TextField
                                            label="Lote / Partida *"
                                            placeholder="Ej: LOTE-5541"
                                            size="small"
                                            value={line.lotNumber}
                                            onChange={(e) => updateLine(idx, 'lotNumber', e.target.value)}
                                            InputLabelProps={{ sx: { color: colors.textDim } }}
                                            inputProps={{
                                                id: `input-remito-line-${idx}-lotNumber`,
                                                onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (line.lotNumber && line.lotNumber.trim().length > 0) {
                                                            focusCell(idx, 'posicionId');
                                                        }
                                                    }
                                                }
                                            }}
                                            sx={{ flex: '1.5 1 140px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                        />

                                        {/* Posición Destino Directa (Autocompletable / Escribible) */}
                                        {(() => {
                                            const currentPosId = line.posicionId || defaultPosId;
                                            const selectedPos = positionOptions.find((p: any) => p.id === currentPosId || p.codigo?.toUpperCase() === currentPosId?.toUpperCase()) || null;

                                            return (
                                                <Autocomplete
                                                    options={positionOptions}
                                                    getOptionLabel={(option: any) => typeof option === 'string' ? option : (option?.codigo || '')}
                                                    value={selectedPos}
                                                    onChange={(_e, val: any) => {
                                                        const newPosId = val ? val.id : '';
                                                        updateLine(idx, 'posicionId', newPosId);
                                                        if (val) {
                                                            setTimeout(() => focusCell(idx, 'qtySecundaria'), 50);
                                                        }
                                                    }}
                                                    isOptionEqualToValue={(option: any, value: any) => option?.id === value?.id || option?.codigo === value?.codigo}
                                                    size="small"
                                                    autoHighlight
                                                    disabled={!depositoId}
                                                    sx={{ flex: '2 1 180px' }}
                                                    renderOption={(props, option: any) => (
                                                        <Box component="li" {...props} key={option.id}>
                                                            📍 {option.codigo}
                                                        </Box>
                                                    )}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Ubicación Destino *"
                                                            placeholder="Escribir ubicación..."
                                                            InputLabelProps={{ sx: { color: colors.textDim } }}
                                                            inputProps={{
                                                                ...params.inputProps,
                                                                id: `input-remito-line-${idx}-posicionId`,
                                                                onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                                                                    if (params.inputProps.onKeyDown) {
                                                                        params.inputProps.onKeyDown(e);
                                                                    }
                                                                    if (e.key === 'Enter') {
                                                                        const curPos = line.posicionId || defaultPosId;
                                                                        if (curPos) {
                                                                            e.preventDefault();
                                                                            focusCell(idx, 'qtySecundaria');
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                            InputProps={{
                                                                ...params.InputProps,
                                                                sx: { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 }
                                                            }}
                                                        />
                                                    )}
                                                />
                                            );
                                        })()}

                                        {/* Bultos / Cajas */}
                                        <TextField
                                            label={labelSec}
                                            type="number"
                                            size="small"
                                            placeholder="0"
                                            value={line.qtySecundaria}
                                            onChange={(e) => handleCajasChange(idx, e.target.value)}
                                            InputLabelProps={{ sx: { color: colors.textDim } }}
                                            inputProps={{
                                                id: `input-remito-line-${idx}-qtySecundaria`,
                                                step: 'any',
                                                min: 0,
                                                onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const hasValue = line.qtySecundaria.trim().length > 0;
                                                        if (hasValue || !uSec) {
                                                            focusCell(idx, 'qtyPrincipal');
                                                        }
                                                    }
                                                }
                                            }}
                                            sx={{ flex: '1 1 100px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                        />

                                        {/* Kilos Recibidos */}
                                        <TextField
                                            label={labelPrinc}
                                            type="number"
                                            size="small"
                                            placeholder="0.0"
                                            value={line.qtyPrincipal}
                                            onChange={(e) => updateLine(idx, 'qtyPrincipal', e.target.value)}
                                            InputLabelProps={{ sx: { color: colors.textDim } }}
                                            inputProps={{
                                                id: `input-remito-line-${idx}-qtyPrincipal`,
                                                step: 'any',
                                                min: 0,
                                                onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const kg = parseFloat(line.qtyPrincipal.replace(',', '.'));
                                                        if (!isNaN(kg) && kg > 0) {
                                                            if (idx < lines.length - 1) {
                                                                focusCell(idx + 1, 'material');
                                                            } else {
                                                                addLine();
                                                            }
                                                        }
                                                    }
                                                }
                                            }}
                                            sx={{ flex: '1 1 120px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                                        />

                                        {/* Botón Borrar Línea */}
                                        {lines.length > 1 && (
                                            <IconButton 
                                                size="small" 
                                                onClick={() => removeLine(idx)}
                                                sx={{ color: colors.textDim, '&:hover': { color: colors.danger } }}
                                            >
                                                <DeleteIcon sx={{ fontSize: 18 }} />
                                            </IconButton>
                                        )}
                                    </Box>

                                {/* Indicación de equivalencia y notas */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                    {line.kilosPorCaja ? (
                                        <Typography variant="caption" sx={{ color: colors.info, fontSize: '0.72rem' }}>
                                            💡 Factor: <strong>~{line.kilosPorCaja} kg/caja</strong> (calcula automáticamente los kilos según cajas).
                                        </Typography>
                                    ) : (
                                        <span />
                                    )}
                                    
                                    <TextField
                                        placeholder="Observación de la partida (opcional)..."
                                        size="small"
                                        value={line.observaciones}
                                        onChange={(e) => updateLine(idx, 'observaciones', e.target.value)}
                                        sx={{ width: { xs: '100%', sm: '350px' }, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.02)', color: 'var(--text-white-dynamic, #fff)', fontSize: '0.75rem', height: '32px' } }}
                                    />
                                </Box>
                            </Paper>
                        );
                    })}
                    </Box>
                </Box>

                {error && (
                    <Paper sx={{ p: 1.5, bgcolor: 'rgba(239, 68, 68, 0.1)', border: `1px solid ${colors.danger}`, borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ color: colors.danger, fontWeight: 700 }}>
                            ⚠️ {error}
                        </Typography>
                    </Paper>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2.5, px: 3, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ color: colors.textDim, fontSize: '0.85rem' }}>
                        Total: <strong style={{ color: colors.primary }}>{totals.kg.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg</strong>
                        {totals.bultos > 0 && <span> &middot; <strong style={{ color: colors.success }}>{totals.bultos.toLocaleString('es-AR')} bultos</strong></span>}
                        <span> &middot; {totals.count} {totals.count === 1 ? 'material' : 'materiales'}</span>
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button variant="text" onClick={onClose} disabled={isSaving} sx={{ color: colors.textDim }}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        disabled={isSaving || !depositoId || totals.kg <= 0}
                        onClick={handleSave}
                        startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : null}
                        sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 900, borderRadius: 2, px: 3, '&:hover': { bgcolor: '#d97706' } }}
                    >
                        {isSaving ? 'Guardando...' : '✓ Confirmar Ingreso a Stock'}
                    </Button>
                </Box>
            </DialogActions>

            {/* Diálogo para crear nuevo material */}
            {isCreateItemOpen && (
                <CreateItemDialog
                    open={isCreateItemOpen}
                    onClose={() => setIsCreateItemOpen(false)}
                    initialSupplierId={supplierId || undefined}
                    initialSupplierName={(suppliers as any[]).find(s => s.id === supplierId)?.name}
                    depositoId={depositoId || undefined}
                    onSuccess={(newItem: any) => {
                        if (activeLineForCreate !== null && activeLineForCreate >= 0 && activeLineForCreate < lines.length) {
                            handleItemChange(activeLineForCreate, newItem);
                        }
                        setIsCreateItemOpen(false);
                    }}
                />
            )}

            {/* Diálogo para crear nuevo proveedor */}
            {isCreatePartnerOpen && (
                <CreatePartnerDialog
                    open={isCreatePartnerOpen}
                    onClose={() => setIsCreatePartnerOpen(false)}
                    defaultType="SUPPLIER"
                    onSuccess={(newPartner: any) => {
                        setSupplierId(newPartner.id);
                        setIsCreatePartnerOpen(false);
                    }}
                />
            )}
        </Dialog>
    );
}
