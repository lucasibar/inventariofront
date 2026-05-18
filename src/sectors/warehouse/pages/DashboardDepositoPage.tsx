import { useState, useMemo, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    IconButton, 
    List, 
    ListItem, 
    Fade, 
    Chip, 
    TextField, 
    Collapse,
    Button,
    Fab,
    Drawer,
    MenuItem,
    CircularProgress,
    Autocomplete,
    Divider,
    Paper,
    Modal,
    Checkbox
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import InventoryIcon from '@mui/icons-material/Inventory';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CategoryIcon from '@mui/icons-material/Category';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SaveIcon from '@mui/icons-material/Save';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LocationOnIcon from '@mui/icons-material/LocationOn';

// Voice Search
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// API Hooks
import { 
    useGetStockQuery, 
    useQuickAddStockMutation,
    useMoveStockMutation
} from '../stock/api/stock.api';
import { useGetDepotsQuery } from '../deposito/api/deposito.api';
import { useGetItemsQuery, useUpdateItemMutation } from '../materiales/api/items.api';
import { useGetPartnersQuery } from '../../config/partners/api/partners.api';
import { useCreateRemitoEntradaMutation } from '../remitosEntrada/api/remitos-entrada.api';
import { useDespachoDirectoMutation } from '../remitosSalida/api/remitos-salida.api';
import { useGetPlantsQuery } from '../../maintenance/api/maintenance.api';
import { useSelector } from 'react-redux';
import { selectAllowedDepots } from '../../../entities/auth/model/authSlice';
import { useIsMobile } from '../../../shared/ui';

// Design System Colors
const colors = {
    primary: '#f59e0b', // Amber
    secondary: '#475569', // Slate
    bg: '#0f1117',
    cardBg: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
    text: '#f3f4f6',
    textDim: '#9ca3af',
    danger: '#ef4444',
    success: '#10b981',
    info: '#3b82f6',
    inputBg: 'rgba(255, 255, 255, 0.05)'
};

const KPIButton = ({ label, value, unit, icon: Icon, color, active, onClick }: any) => (
    <Box 
        onClick={onClick}
        sx={{ 
            flex: '1 1 0', minWidth: 100, height: 80, p: 1.5, borderRadius: 3, 
            bgcolor: active ? `${color}25` : colors.cardBg, border: '1px solid', borderColor: active ? color : colors.border,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative', boxShadow: active ? `0 4px 20px ${color}15` : 'none'
        }}
    >
        <Box sx={{ color: color, mb: 0.5, opacity: active ? 1 : 0.6 }}><Icon sx={{ fontSize: '1.2rem' }} /></Box>
        <Typography sx={{ color: active ? '#fff' : color, fontWeight: 900, mb: 0.1, lineHeight: 1, fontSize: '1.4rem' }}>{value}</Typography>
        <Typography variant="caption" sx={{ color: active ? '#fff' : colors.textDim, fontSize: '0.6rem', fontWeight: 800, textAlign: 'center', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label} ({unit})</Typography>
        {active && (<Box sx={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 3, bgcolor: color, borderRadius: '2px 2px 0 0' }} />)}
    </Box>
);

const PositionContentModal = ({ open, onClose, depositoId, posicionId, positionName }: any) => {
    const { data: stock = [], isLoading } = useGetStockQuery({ depotId: depositoId, positionId: posicionId }, { skip: !open || !posicionId });
    
    return (
        <Modal open={open} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
            <Paper sx={{ width: '90%', maxWidth: 500, bgcolor: colors.bg, border: `1px solid ${colors.info}`, borderRadius: 4, p: 3, outline: 'none', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: colors.info }}>CONTENIDO EN {positionName}</Typography>
                    <IconButton onClick={onClose} sx={{ color: colors.textDim }}><CloseIcon /></IconButton>
                </Box>
                {isLoading ? <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={30} sx={{ color: colors.info }} /></Box> : (
                    <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {stock.length === 0 ? <Typography sx={{ color: colors.textDim, textAlign: 'center', py: 4 }}>Esta posición está vacía</Typography> : stock.map((s: any, idx: number) => (
                            <ListItem key={idx} sx={{ bgcolor: 'rgba(255,255,255,0.02)', mb: 1, borderRadius: 2, border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', p: 1.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.text }}>{s.batch.item.descripcion}</Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mt: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: colors.textDim }}>Lote: {s.batch.lotNumber}</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 800, color: colors.primary }}>{s.qtyPrincipal} {s.batch.item.unidadPrincipal}</Typography>
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                )}
                <Button fullWidth onClick={onClose} sx={{ mt: 2, color: colors.textDim }}>CERRAR</Button>
            </Paper>
        </Modal>
    );
};

const MoveStockDrawer = ({ open, onClose, entry }: { open: boolean, onClose: () => void, entry: any }) => {
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const [moveStock] = useMoveStockMutation();
    const [form, setForm] = useState({ depositoId: '', posicionIdDestino: '', qtyPrincipal: '', qtySecundaria: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [viewerOpen, setViewerOpen] = useState(false);

    useEffect(() => { 
        if (entry) { 
            setForm(prev => ({ 
                ...prev,
                depositoId: entry.depositoId, 
                qtyPrincipal: String(entry.qtyPrincipal), 
                qtySecundaria: String(entry.qtySecundaria || '') 
            })); 
        } 
    }, [entry]);

    const selectedDepot = useMemo(() => rawDepots.find((d: any) => d.id === form.depositoId), [rawDepots, form.depositoId]);
    const selectedPosition = useMemo(() => selectedDepot?.positions?.find((p: any) => p.id === form.posicionIdDestino), [selectedDepot, form.posicionIdDestino]);

    const handleMove = async () => { 
        if (!form.posicionIdDestino || !form.qtyPrincipal) { alert('Completá destino y cantidad.'); return; } 
        setIsSaving(true); 
        try { 
            await moveStock({ 
                depositoId: form.depositoId, 
                posicionIdOrigen: entry.posicionId, 
                posicionIdDestino: form.posicionIdDestino, 
                itemId: entry.batch.item.id, 
                lotId: entry.batch.id, 
                qtyPrincipal: Number(String(form.qtyPrincipal).replace(',', '.')), 
                qtySecundaria: form.qtySecundaria ? Number(String(form.qtySecundaria).replace(',', '.')) : undefined, 
                fecha: new Date().toISOString() 
            }).unwrap(); 
            alert('✅ Movimiento realizado con éxito. El formulario sigue abierto para verificación.'); 
        } catch (e: any) { 
            alert(e?.data?.message || 'Error al mover'); 
        } finally { 
            setIsSaving(false); 
        } 
    };

    if (!entry) return null;

    return (
        <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: colors.bg, color: colors.text, borderTop: `1px solid ${colors.info}`, borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 3, pb: 6 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}><Typography variant="h5" sx={{ fontWeight: 900, color: colors.info }}>MOVER MERCADERÍA</Typography><IconButton onClick={onClose} sx={{ color: colors.textDim }}><CloseIcon /></IconButton></Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', p: 2, borderRadius: 2, border: `1px solid ${colors.border}` }}><Typography variant="caption" sx={{ color: colors.textDim }}>Origen:</Typography><Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{entry.batch.item.descripcion}</Typography><Typography variant="body2" sx={{ color: colors.primary, fontWeight: 700 }}>Posición: {entry.posicion?.codigo} | Lote: {entry.batch.lotNumber}</Typography><Typography variant="caption" sx={{ color: colors.textDim }}>Disponible en origen: {entry.qtyPrincipal} {entry.batch.item.unidadPrincipal}</Typography></Box>
                <TextField select label="Depósito Destino" fullWidth value={form.depositoId} onChange={(e) => setForm({...form, depositoId: e.target.value, posicionIdDestino: ''})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }}>{rawDepots.map((d: any) => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}</TextField>
                
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField select label="Posición Destino" sx={{ flex: 1 }} value={form.posicionIdDestino} disabled={!form.depositoId} onChange={(e) => setForm({...form, posicionIdDestino: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }}>
                        {selectedDepot?.positions?.filter((p: any) => p.id !== entry.posicionId).map((p: any) => <MenuItem key={p.id} value={p.id}>{p.codigo}</MenuItem>)}
                    </TextField>
                    <IconButton 
                        disabled={!form.posicionIdDestino} 
                        onClick={() => setViewerOpen(true)}
                        sx={{ bgcolor: form.posicionIdDestino ? `${colors.info}20` : 'transparent', color: form.posicionIdDestino ? colors.info : colors.textDim, '&.Mui-disabled': { color: 'rgba(255,255,255,0.05)' } }}
                    >
                        <VisibilityIcon />
                    </IconButton>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}><TextField label={`Mover (${entry.batch.item.unidadPrincipal})`} type="number" fullWidth value={form.qtyPrincipal} onChange={(e) => setForm({...form, qtyPrincipal: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} /><TextField label={`Mover (${entry.batch.item.unidadSecundaria || 'Un'})`} type="number" fullWidth value={form.qtySecundaria} onChange={(e) => setForm({...form, qtySecundaria: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} /></Box>
                <Button fullWidth variant="contained" size="large" disabled={isSaving} startIcon={isSaving ? <CircularProgress size={20} /> : <SwapHorizIcon />} sx={{ mt: 2, bgcolor: colors.info, color: '#fff', fontWeight: 900, borderRadius: 3, py: 1.5 }} onClick={handleMove}>{isSaving ? 'MOVIENDO...' : 'CONFIRMAR MOVIMIENTO'}</Button>
            </Box>

            <PositionContentModal 
                open={viewerOpen} 
                onClose={() => setViewerOpen(false)} 
                depositoId={form.depositoId} 
                posicionId={form.posicionIdDestino} 
                positionName={selectedPosition?.codigo}
            />
        </Drawer>
    );
};

const DespachoDirectoDrawer = ({ open, onClose, entry }: { open: boolean, onClose: () => void, entry: any }) => {
    const { data: partners = [] } = useGetPartnersQuery({});
    const [despachoDirecto] = useDespachoDirectoMutation();
    const [form, setForm] = useState({ clientId: '', clientName: '', fecha: new Date().toISOString().split('T')[0], qtyPrincipal: '', qtySecundaria: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [newClient, setNewClient] = useState(false);

    useEffect(() => { if (entry) { setForm(f => ({ ...f, qtyPrincipal: String(entry.qtyPrincipal), qtySecundaria: String(entry.qtySecundaria || '') })); } }, [entry]);

    const clients = useMemo(() => partners.filter((p: any) => p.type === 'CLIENT' || p.type === 'BOTH'), [partners]);

    const handleDespacho = async () => {
        if ((!form.clientId && !form.clientName) || !form.qtyPrincipal) { alert('Completá cliente y cantidad.'); return; }
        setIsSaving(true);
        try {
            const result = await despachoDirecto({
                fecha: form.fecha,
                clientId: newClient ? undefined : form.clientId,
                clientName: newClient ? form.clientName : undefined,
                depositoId: entry.depositoId,
                posicionId: entry.posicionId,
                itemId: entry.batch.item.id,
                lotId: entry.batch.id,
                qtyPrincipal: Number(String(form.qtyPrincipal).replace(',', '.')),
                qtySecundaria: form.qtySecundaria ? Number(String(form.qtySecundaria).replace(',', '.')) : undefined,
            }).unwrap();
            alert(`✅ Despachado. Remito: ${result.numero}`);
            onClose();
        } catch (e: any) {
            alert(e?.data?.message || 'Error al despachar');
        } finally {
            setIsSaving(false);
        }
    };

    if (!entry) return null;

    return (
        <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: colors.bg, color: colors.text, borderTop: `1px solid ${colors.danger}`, borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 3, pb: 6 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}><Typography variant="h5" sx={{ fontWeight: 900, color: colors.danger }}>SALIDA DE MERCADERÍA</Typography><IconButton onClick={onClose} sx={{ color: colors.textDim }}><CloseIcon /></IconButton></Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', p: 2, borderRadius: 2, border: `1px solid ${colors.border}` }}>
                    <Typography variant="caption" sx={{ color: colors.textDim }}>Material:</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{entry.batch.item.descripcion}</Typography>
                    <Typography variant="body2" sx={{ color: colors.danger, fontWeight: 700 }}>📍 Posición: {entry.posicion?.codigo} | Lote: {entry.batch.lotNumber}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Autocomplete 
                        sx={{ flex: 2 }}
                        options={clients} 
                        getOptionLabel={(option: any) => option.name} 
                        value={newClient ? null : (clients.find(c => c.id === form.clientId) || null)}
                        disabled={newClient}
                        renderInput={(params) => <TextField {...params} label="Seleccionar Cliente" InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} />} 
                        onChange={(_e, val: any) => setForm({...form, clientId: val?.id || ''})} 
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', color: colors.textDim }}>
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 800 }}>NUEVO</Typography>
                        <Checkbox size="small" checked={newClient} onChange={(e) => setNewClient(e.target.checked)} sx={{ color: colors.textDim }} />
                    </Box>
                </Box>

                {newClient && <TextField label="Nombre del Nuevo Cliente" fullWidth value={form.clientName} onChange={(e) => setForm({...form, clientName: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} />}

                <TextField type="date" label="Fecha" fullWidth value={form.fecha} onChange={(e) => setForm({...form, fecha: e.target.value})} InputLabelProps={{ shrink: true, sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} />

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField label={`Cantidad (${entry.batch.item.unidadPrincipal})`} type="number" fullWidth value={form.qtyPrincipal} onChange={(e) => setForm({...form, qtyPrincipal: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} />
                    <TextField 
                        label={`Secundaria (${entry.batch.item.unidadSecundaria || 'Un'})`} 
                        type="number" 
                        fullWidth 
                        value={form.qtySecundaria} 
                        onChange={(e) => {
                            const val = e.target.value;
                            // Calculate factor ONLY from the current entry ratio (kilos / boxes)
                            const factor = (entry.qtySecundaria > 0) ? (entry.qtyPrincipal / entry.qtySecundaria) : null;
                            const newQtyPrincipal = val && factor ? (Number(val) * factor).toFixed(2) : form.qtyPrincipal;
                            setForm({ ...form, qtySecundaria: val, qtyPrincipal: String(newQtyPrincipal) });
                        }} 
                        InputLabelProps={{ sx: { color: colors.textDim } }} 
                        InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} 
                    />
                </Box>

                <Button fullWidth variant="contained" size="large" disabled={isSaving} startIcon={isSaving ? <CircularProgress size={20} /> : <TrendingUpIcon />} sx={{ mt: 2, bgcolor: colors.danger, color: '#fff', fontWeight: 900, borderRadius: 3, py: 1.5 }} onClick={handleDespacho}>{isSaving ? 'DESPACHANDO...' : 'CONFIRMAR SALIDA'}</Button>
            </Box>
        </Drawer>
    );
};

const MaterialCard = ({ group, isPinned, onTogglePin, isExpanded, onToggleExpand, onMoveRequest, onSalidaRequest, onEditLimits }: any) => {
    const navigate = useNavigate();
    const { item, metrics, entries } = group;
    const isCritical = metrics.kilos < (item.minStock || 50);
    const statusColor = isCritical ? colors.danger : colors.success;
    return (
        <Box sx={{ bgcolor: isPinned ? `${colors.primary}05` : colors.cardBg, mb: 1, borderRadius: 2, border: `1px solid ${isPinned ? colors.primary : colors.border}`, overflow: 'hidden', transition: 'all 0.2s ease' }}>
            <ListItem sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 800, fontSize: '0.65rem' }}>{item.codigoInterno}</Typography>
                            {isPinned && <Chip label="ANCLADO" size="small" sx={{ height: 16, fontSize: '0.55rem', bgcolor: colors.primary, color: '#000', fontWeight: 900 }} />}
                        </Box>
                        <Typography 
                            variant="h6" 
                            onClick={(e) => { e.stopPropagation(); navigate(`/materiales?q=${encodeURIComponent(item.descripcion)}`); }}
                            sx={{ fontWeight: 800, color: colors.text, lineHeight: 1.2, cursor: 'pointer', '&:hover': { color: colors.primary } }}
                        >
                            {item.descripcion}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}><IconButton size="small" onClick={onTogglePin} sx={{ color: isPinned ? colors.primary : colors.textDim }}>{isPinned ? <PushPinIcon sx={{ fontSize: 18 }} /> : <PushPinOutlinedIcon sx={{ fontSize: 18 }} />}</IconButton><IconButton size="small" onClick={onToggleExpand} sx={{ color: colors.textDim }}>{isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}</IconButton></Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Box 
                        sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                        onClick={(e) => { e.stopPropagation(); onEditLimits(item); }}
                    >
                        <Typography variant="h4" sx={{ fontWeight: 900, color: statusColor }}>{metrics.kilos.toFixed(1)}</Typography>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700 }}>{item.unidadPrincipal}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}><Typography variant="caption" sx={{ color: colors.textDim, display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}><CategoryIcon sx={{ fontSize: 12 }} /> {item.category?.nombre || 'General'}</Typography><Typography variant="caption" sx={{ color: colors.textDim, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, fontWeight: 600 }}><SwapHorizIcon sx={{ fontSize: 12 }} /> {entries.length} registros</Typography></Box>
                </Box>
            </ListItem>
            <Collapse in={isExpanded}><Divider sx={{ borderColor: colors.border }} /><Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)' }}><Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 900, mb: 1, display: 'block', textTransform: 'uppercase', fontSize: '0.6rem' }}>Desglose por Posición y Lote</Typography><List disablePadding>{entries.map((entry: any, idx: number) => (<Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: idx === entries.length - 1 ? 'none' : `1px solid ${colors.border}` }}><Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{entry.posicion?.codigo || 'S/P'}</Typography><Typography variant="caption" sx={{ color: colors.textDim }}>Lote: {entry.batch?.lotNumber} | Proveedor: {entry.batch?.supplier?.name || 'S/D'}</Typography></Box><Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><Box sx={{ textAlign: 'right' }}><Typography variant="body2" sx={{ fontWeight: 800, color: colors.primary }}>{entry.qtyPrincipal} {item.unidadPrincipal}</Typography><Typography variant="caption" sx={{ color: colors.textDim }}>{entry.qtySecundaria || 0} {item.unidadSecundaria || 'Un'}</Typography></Box><div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><Button size="small" variant="outlined" startIcon={<SwapHorizIcon />} sx={{ borderColor: colors.info, color: colors.info, textTransform: 'none', fontWeight: 800, fontSize: '0.65rem', borderRadius: 1.5 }} onClick={() => onMoveRequest(entry)}>Mover</Button><Button size="small" variant="outlined" startIcon={<TrendingUpIcon />} sx={{ borderColor: colors.danger, color: colors.danger, textTransform: 'none', fontWeight: 800, fontSize: '0.65rem', borderRadius: 1.5 }} onClick={() => onSalidaRequest(entry)}>Salida</Button></div></Box></Box>))}</List></Box></Collapse>
        </Box>
    );
};

const PositionCard = ({ group, isPinned, onTogglePin, isExpanded, onToggleExpand, onMoveRequest, onSalidaRequest }: any) => {
    const { posicion, metrics, entries } = group;
    const statusColor = colors.info;

    const distinctItemsCount = useMemo(() => {
        const itemIds = new Set(entries.map((e: any) => e.batch?.item?.id));
        return itemIds.size;
    }, [entries]);

    return (
        <Box sx={{ bgcolor: isPinned ? `${colors.primary}05` : colors.cardBg, mb: 1, borderRadius: 2, border: `1px solid ${isPinned ? colors.primary : colors.border}`, overflow: 'hidden', transition: 'all 0.2s ease' }}>
            <ListItem sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 800, fontSize: '0.65rem' }}>POSICIÓN</Typography>
                            {isPinned && <Chip label="ANCLADA" size="small" sx={{ height: 16, fontSize: '0.55rem', bgcolor: colors.primary, color: '#000', fontWeight: 900 }} />}
                        </Box>
                        <Typography 
                            variant="h6" 
                            sx={{ fontWeight: 950, color: colors.text, lineHeight: 1.2, fontSize: '1.25rem' }}
                        >
                            {posicion.codigo || 'S/P'}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton size="small" onClick={onTogglePin} sx={{ color: isPinned ? colors.primary : colors.textDim }}>
                            {isPinned ? <PushPinIcon sx={{ fontSize: 18 }} /> : <PushPinOutlinedIcon sx={{ fontSize: 18 }} />}
                        </IconButton>
                        <IconButton size="small" onClick={onToggleExpand} sx={{ color: colors.textDim }}>
                            {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: statusColor }}>{metrics.kilos.toFixed(1)}</Typography>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700 }}>kg</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: colors.textDim, display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                            <CategoryIcon sx={{ fontSize: 12 }} /> {distinctItemsCount} {distinctItemsCount === 1 ? 'material' : 'materiales'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textDim, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, fontWeight: 600 }}>
                            <SwapHorizIcon sx={{ fontSize: 12 }} /> {entries.length} {entries.length === 1 ? 'partida' : 'partidas'}
                        </Typography>
                    </Box>
                </Box>
            </ListItem>
            <Collapse in={isExpanded}>
                <Divider sx={{ borderColor: colors.border }} />
                <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)' }}>
                    <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 900, mb: 1, display: 'block', textTransform: 'uppercase', fontSize: '0.6rem' }}>
                        Detalle de Materiales y Partidas en esta Posición
                    </Typography>
                    <List disablePadding>
                        {entries.map((entry: any, idx: number) => {
                            const item = entry.batch?.item;
                            return (
                                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.2, borderBottom: idx === entries.length - 1 ? 'none' : `1px solid ${colors.border}` }}>
                                    <Box sx={{ maxWidth: '65%' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 800, color: colors.text }}>
                                            {item?.descripcion || 'Material sin descripción'}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: colors.textDim, display: 'block', mt: 0.2 }}>
                                            Código: {item?.codigoInterno} | Lote: {entry.batch?.lotNumber}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: colors.textDim }}>
                                            Proveedor: {entry.batch?.supplier?.name || 'S/D'}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{ textAlign: 'right', minWidth: 70 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 800, color: colors.primary }}>
                                                {entry.qtyPrincipal} {item?.unidadPrincipal || 'kg'}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.7rem' }}>
                                                {entry.qtySecundaria || 0} {item?.unidadSecundaria || 'Un'}
                                            </Typography>
                                        </Box>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <Button 
                                                size="small" 
                                                variant="outlined" 
                                                startIcon={<SwapHorizIcon />}
                                                sx={{ borderColor: colors.info, color: colors.info, textTransform: 'none', fontWeight: 800, fontSize: '0.65rem', borderRadius: 1.5 }}
                                                onClick={() => onMoveRequest(entry)}
                                            >
                                                Mover
                                            </Button>
                                            <Button 
                                                size="small" 
                                                variant="outlined" 
                                                startIcon={<TrendingUpIcon />}
                                                sx={{ borderColor: colors.danger, color: colors.danger, textTransform: 'none', fontWeight: 800, fontSize: '0.65rem', borderRadius: 1.5 }}
                                                onClick={() => onSalidaRequest(entry)}
                                            >
                                                Salida
                                            </Button>
                                        </div>
                                    </Box>
                                </Box>
                            );
                        })}
                    </List>
                </Box>
            </Collapse>
        </Box>
    );
};

const QuickAddDrawer = ({ open, onClose }: { open: boolean, onClose: () => void }) => {
    const { data: depots = [] } = useGetDepotsQuery();
    const { data: items = [] } = useGetItemsQuery({});
    const { data: partners = [] } = useGetPartnersQuery({});
    const [quickAddStock] = useQuickAddStockMutation();
    const [createRemitoEntrada] = useCreateRemitoEntradaMutation();
    const [form, setForm] = useState(() => { const saved = localStorage.getItem('quick_add_form'); const initial = { depositoId: '', posicionId: '', itemId: '', supplierId: '', lotNumber: '', qtyPrincipal: '', qtySecundaria: '', remito: '', fecha: new Date().toISOString().split('T')[0] }; if (saved) { try { const parsed = JSON.parse(saved); return { ...initial, ...parsed, itemId: '', lotNumber: '', qtyPrincipal: '', qtySecundaria: '' }; } catch (e) { return initial; } } return initial; });
    useEffect(() => { const toSave = { depositoId: form.depositoId, posicionId: form.posicionId, supplierId: form.supplierId, remito: form.remito }; localStorage.setItem('quick_add_form', JSON.stringify(toSave)); }, [form.depositoId, form.posicionId, form.supplierId, form.remito]);
    const [isSaving, setIsSaving] = useState(false);
    const suppliers = useMemo(() => partners.filter((p: any) => p.type === 'SUPPLIER' || p.type === 'BOTH'), [partners]);
    const selectedDepot = useMemo(() => depots.find((d: any) => d.id === form.depositoId), [depots, form.depositoId]);
    const selectedItem = useMemo(() => items.find((i: any) => i.id === form.itemId), [items, form.itemId]);
    const handleSubmit = async () => { 
        if (!form.depositoId || !form.posicionId || !form.itemId || !form.supplierId || !form.lotNumber || !form.qtyPrincipal) { alert('Completá los campos obligatorios.'); return; } 
        if (form.remito && !form.fecha) { alert('Ingresá la fecha del remito.'); return; }
        setIsSaving(true); 
        try { 
            if (form.remito) {
                await createRemitoEntrada({
                    numero: form.remito,
                    fecha: form.fecha,
                    partnerId: form.supplierId,
                    depositoId: form.depositoId,
                    items: [{
                        itemId: form.itemId,
                        lotNumber: form.lotNumber,
                        posicionId: form.posicionId,
                        qtyPrincipal: Number(String(form.qtyPrincipal).replace(',', '.')),
                        qtySecundaria: form.qtySecundaria ? Number(String(form.qtySecundaria).replace(',', '.')) : undefined
                    }]
                }).unwrap();
                alert('✅ Remito de Entrada creado correctamente');
            } else {
                await quickAddStock({ depositoId: form.depositoId, posicionId: form.posicionId, itemId: form.itemId, supplierId: form.supplierId, lotNumber: form.lotNumber, qtyPrincipal: Number(String(form.qtyPrincipal).replace(',', '.')), qtySecundaria: form.qtySecundaria ? Number(String(form.qtySecundaria).replace(',', '.')) : undefined, fecha: form.fecha }).unwrap(); 
                alert('✅ Stock adicionado correctamente');
            }
            onClose(); 
            setForm((prev: any) => ({ ...prev, itemId: '', lotNumber: '', qtyPrincipal: '', qtySecundaria: '' })); 
        } catch (e: any) { alert(e?.data?.message || 'Error'); } finally { setIsSaving(false); } 
    };
    return (
        <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: colors.bg, color: colors.text, borderTop: `1px solid ${colors.primary}`, borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 3, pb: 6 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}><Typography variant="h5" sx={{ fontWeight: 900, color: colors.primary }}>CARGA RÁPIDA</Typography><IconButton onClick={onClose} sx={{ color: colors.textDim }}><CloseIcon /></IconButton></Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}><TextField select label="Depósito" fullWidth value={form.depositoId} onChange={(e) => setForm({...form, depositoId: e.target.value, posicionId: ''})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }}>{depots.map((d: any) => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}</TextField><TextField select label="Posición" fullWidth value={form.posicionId} disabled={!form.depositoId} onChange={(e) => setForm({...form, posicionId: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }}>{selectedDepot?.positions?.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.codigo}</MenuItem>)}</TextField></Box>
                <Autocomplete options={suppliers} getOptionLabel={(option: any) => option.name} value={suppliers.find(s => s.id === form.supplierId) || null} renderInput={(params) => <TextField {...params} label="Proveedor" InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} />} onChange={(_e, val: any) => setForm({...form, supplierId: val?.id || ''})} />
                <Autocomplete options={items} getOptionLabel={(option: any) => `${option.codigoInterno} - ${option.descripcion}`} renderInput={(params) => <TextField {...params} label="Material" InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} />} onChange={(_e, val: any) => setForm({...form, itemId: val?.id || ''})} />
                <Box sx={{ display: 'flex', gap: 2 }}><TextField label="Lote" fullWidth value={form.lotNumber} onChange={(e) => setForm({...form, lotNumber: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} /><TextField label="N° Remito (Opc)" fullWidth value={form.remito} onChange={(e) => setForm({...form, remito: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} /></Box>
                <TextField type="date" label="Fecha Entrada" fullWidth value={form.fecha} onChange={(e) => setForm({...form, fecha: e.target.value})} InputLabelProps={{ shrink: true, sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} />
                <Box sx={{ display: 'flex', gap: 2 }}><TextField label={`Cant (${selectedItem?.unidadPrincipal || 'Kg'})`} type="number" fullWidth value={form.qtyPrincipal} onChange={(e) => setForm({...form, qtyPrincipal: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} /><TextField label={`Sec (${selectedItem?.unidadSecundaria || 'Un'})`} type="number" fullWidth value={form.qtySecundaria} onChange={(e) => setForm({...form, qtySecundaria: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} /></Box>
                <Button fullWidth variant="contained" size="large" disabled={isSaving} startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />} sx={{ mt: 2, bgcolor: colors.primary, color: '#000', fontWeight: 900, borderRadius: 3, py: 1.5, '&:hover': { bgcolor: '#d97706' } }} onClick={handleSubmit}>{isSaving ? 'REGISTRANDO...' : 'REGISTRAR ENTRADA'}</Button>
            </Box>
        </Drawer>
    );
};

const EditStockLimitsDrawer = ({ open, onClose, initialItem }: { open: boolean, onClose: () => void, initialItem?: any }) => {
    const { data: items = [] } = useGetItemsQuery({});
    const [updateItem] = useUpdateItemMutation();
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [limits, setLimits] = useState({ minStock: '', maxStock: '' });
    const [isSaving, setIsSaving] = useState(false);
    useEffect(() => { if (initialItem) setSelectedItem(initialItem); }, [initialItem]);
    useEffect(() => { if (selectedItem) { setLimits({ minStock: String(selectedItem.minStock || ''), maxStock: String(selectedItem.maxStock || '') }); } }, [selectedItem]);
    const handleSave = async () => { if (!selectedItem) return; setIsSaving(true); try { await updateItem({ id: selectedItem.id, data: { ...selectedItem, minStock: Number(limits.minStock), maxStock: Number(limits.maxStock) } }).unwrap(); alert('Límites actualizados correctamente'); onClose(); setSelectedItem(null); } catch (e: any) { alert(e?.data?.message || 'Error'); } finally { setIsSaving(false); } };
    return (
        <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: colors.bg, color: colors.text, borderTop: `1px solid ${colors.info}`, borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 3, pb: 6 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}><Typography variant="h5" sx={{ fontWeight: 900, color: colors.info }}>GESTIÓN DE LÍMITES</Typography><IconButton onClick={onClose} sx={{ color: colors.textDim }}><CloseIcon /></IconButton></Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Autocomplete options={items} getOptionLabel={(option: any) => `${option.codigoInterno} - ${option.descripcion}`} value={selectedItem || null} renderInput={(params) => <TextField {...params} label="Seleccionar Material para configurar" InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} />} onChange={(_e, val: any) => setSelectedItem(val)} />
                {selectedItem && (<Fade in><Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}><Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', p: 2, borderRadius: 2, border: `1px solid ${colors.border}` }}><Typography variant="caption" sx={{ color: colors.textDim }}>Configurando:</Typography><Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{selectedItem.descripcion}</Typography><Typography variant="caption" sx={{ color: colors.info }}>Stock actual en sistema se comparará con estos valores.</Typography></Box><Box sx={{ display: 'flex', gap: 2 }}><TextField label={`Stock Mínimo (${selectedItem.unidadPrincipal})`} type="number" fullWidth value={limits.minStock} onChange={(e) => setLimits({...limits, minStock: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} /><TextField label={`Stock Máximo (${selectedItem.unidadPrincipal})`} type="number" fullWidth value={limits.maxStock} onChange={(e) => setLimits({...limits, maxStock: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} /></Box><Button fullWidth variant="contained" size="large" disabled={isSaving} startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />} sx={{ mt: 2, bgcolor: colors.info, color: '#fff', fontWeight: 900, borderRadius: 3, py: 1.5 }} onClick={handleSave}>{isSaving ? 'GUARDANDO...' : 'ACTUALIZAR LÍMITES'}</Button></Box></Fade>)}
            </Box>
        </Drawer>
    );
};

export default function DashboardDepositoPage() {
    const isMobile = useIsMobile();
    const allowedDepots = useSelector(selectAllowedDepots);
    const [plantId, setPlantId] = useState<string>('');
    const [depotId, setDepotId] = useState<string>(() => sessionStorage.getItem('selectedDepotId') || '');
    const [positionId, setPositionId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [showFilters, setShowFilters] = useState(false);
    const [activeKpi, setActiveKpi] = useState<string | null>(null);
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [editLimitsOpen, setEditLimitsOpen] = useState(false);
    const [selectedItemToEditLimits, setSelectedItemToEditLimits] = useState<any>(null);
    const [moveDrawerOpen, setMoveDrawerOpen] = useState(false);
    const [selectedEntryToMove, setSelectedEntryToMove] = useState<any>(null);
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
    const [salidaDrawerOpen, setSalidaDrawerOpen] = useState(false);
    const [selectedEntryToSalida, setSelectedEntryToSalida] = useState<any>(null);
    const togglePin = (id: string) => { 
        setPinnedIds((prev: Set<string>) => { 
            const next = new Set(prev); 
            if (next.has(id)) next.delete(id); 
            else next.add(id); 
            return next; 
        }); 
    };
    const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
    useEffect(() => { if (transcript) setSearchQuery(transcript); }, [transcript]);
    const toggleListening = () => { if (listening) SpeechRecognition.stopListening(); else { resetTranscript(); SpeechRecognition.startListening({ language: 'es-AR', continuous: true }); } };
    
    useEffect(() => { if (depotId) sessionStorage.setItem('selectedDepotId', depotId); }, [depotId]);
    const { data: rawPlants = [] } = useGetPlantsQuery();
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const plants = useMemo(() => rawPlants, [rawPlants]);
    const depots = useMemo(() => { let filtered = allowedDepots ? rawDepots.filter((d: any) => allowedDepots.includes(d.id)) : rawDepots; if (plantId) filtered = filtered.filter((d: any) => d.plantId === plantId); return filtered; }, [rawDepots, allowedDepots, plantId]);
    useEffect(() => { if (rawPlants.length > 0 && !plantId) { const derwill = rawPlants.find((p: any) => p.name.toLowerCase().includes('derwill')); if (derwill) setPlantId(derwill.id); } }, [rawPlants, plantId]);
    useEffect(() => { if (depots.length > 0 && !depotId) { const hilado = depots.find((d: any) => d.nombre.toLowerCase().includes('hilado')); if (hilado) setDepotId(hilado.id); else setDepotId(depots[0].id); } }, [depots, depotId]);
    
    const { data: rawStock = [], isLoading: loadingStock } = useGetStockQuery({ depotId: depotId || undefined, positionId: positionId || undefined }, { skip: !depotId });
    
    const { groupedData, groupedPositionsData, metrics } = useMemo(() => {
        const genMetrics = { 
            kilos: 0, 
            picking: rawStock.length > 0 ? 1 : 0,
            positionsCount: 0
        };
        const groups: Record<string, any> = {};
        const positionGroups: Record<string, any> = {};
        const occupiedPositions = new Set<string>();
        const searchTerms = searchQuery.toLowerCase().split(' ').filter(t => t.length > 0);
        
        rawStock.forEach((entry: any) => {
            const itemId = entry.batch?.item?.id; 
            if (!itemId) return;
            
            const positionId = entry.posicionId || entry.posicion?.id || 'sin-posicion';
            const positionCode = entry.posicion?.codigo || 'S/P';
            
            if (entry.posicionId || entry.posicion?.id) {
                occupiedPositions.add(entry.posicionId || entry.posicion?.id);
            }

            const matchesSearch = searchTerms.length === 0 || searchTerms.every(term => {
                const itemDesc = (entry.batch?.item?.descripcion || '').toLowerCase();
                const itemCode = (entry.batch?.item?.codigoInterno || '').toLowerCase();
                const supplierName = (entry.batch?.supplier?.name || '').toLowerCase();
                const categoryName = (entry.batch?.item?.category?.nombre || '').toLowerCase();
                const lotNumber = (entry.batch?.lotNumber || '').toLowerCase();
                const posCode = (entry.posicion?.codigo || '').toLowerCase();
                return itemDesc.includes(term) || itemCode.includes(term) || supplierName.includes(term) || categoryName.includes(term) || lotNumber.includes(term) || posCode.includes(term);
            });

            const isPinned = pinnedIds.has(itemId);
            const isPositionPinned = pinnedIds.has(positionId);
            const passesCategory = selectedCategory === 'Todos' || entry.batch?.item?.category?.nombre === selectedCategory;

            // For Material grouping
            const shouldIncludeMaterial = isPinned || (matchesSearch && passesCategory);
            if (shouldIncludeMaterial) {
                if (!groups[itemId]) { 
                    groups[itemId] = { 
                        item: entry.batch.item, 
                        entries: [], 
                        metrics: { kilos: 0, units: 0 }, 
                        isPinned, 
                        passesSearchAndCategory: matchesSearch && passesCategory 
                    }; 
                }
                groups[itemId].entries.push(entry);
                groups[itemId].metrics.kilos += Number(entry.qtyPrincipal || 0);
                
                if (matchesSearch && passesCategory) {
                    genMetrics.kilos += Number(entry.qtyPrincipal || 0);
                }
            }

            // For Position grouping
            const shouldIncludePosition = isPositionPinned || (matchesSearch && passesCategory);
            if (shouldIncludePosition) {
                if (!positionGroups[positionId]) {
                    positionGroups[positionId] = {
                        posicion: entry.posicion || { id: positionId, codigo: positionCode },
                        entries: [],
                        metrics: { kilos: 0, itemsCount: 0 },
                        isPinned: isPositionPinned,
                        passesSearchAndCategory: matchesSearch && passesCategory
                    };
                }
                positionGroups[positionId].entries.push(entry);
                positionGroups[positionId].metrics.kilos += Number(entry.qtyPrincipal || 0);
            }
        });

        genMetrics.positionsCount = occupiedPositions.size;

        let data = Object.values(groups);
        data.sort((a: any, b: any) => (a.isPinned === b.isPinned) ? 0 : a.isPinned ? -1 : 1);

        let positionsData = Object.values(positionGroups);
        positionsData.sort((a: any, b: any) => {
            if (a.isPinned !== b.isPinned) {
                return a.isPinned ? -1 : 1;
            }
            return a.posicion.codigo.localeCompare(b.posicion.codigo);
        });

        return { groupedData: data, groupedPositionsData: positionsData, metrics: genMetrics };
    }, [rawStock, searchQuery, selectedCategory, pinnedIds]);
    
    const categoriesList = useMemo(() => { 
        const cats = new Set<string>(); 
        cats.add('Todos'); 
        rawStock.forEach((s: any) => { 
            if (s.batch?.item?.category?.nombre) cats.add(s.batch.item.category.nombre); 
        }); 
        return Array.from(cats); 
    }, [rawStock]);
    
    const isLoading = loadingStock;

    return (
        <Box sx={{ bgcolor: colors.bg, minHeight: '100vh', color: colors.text, pb: 10, maxWidth: '1400px', margin: '0 auto' }}>
            {!isMobile && (<Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, bgcolor: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${colors.border}`, position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' }}><IconButton onClick={() => document.dispatchEvent(new CustomEvent('open-sidebar-menu'))} sx={{ color: colors.textDim, mr: 1 }}><MoreVertIcon /></IconButton><Typography variant="h6" sx={{ flex: 1, fontWeight: 900, color: colors.primary, fontSize: '0.9rem', textTransform: 'uppercase' }}>Dashboard Depósito</Typography><IconButton onClick={() => setShowFilters(!showFilters)} sx={{ color: showFilters ? colors.primary : colors.textDim }}><FilterListIcon /></IconButton></Box>)}
            {isMobile && (<Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, px: 2 }}><IconButton onClick={() => document.dispatchEvent(new CustomEvent('open-sidebar-menu'))} sx={{ color: colors.textDim }}><MoreVertIcon /></IconButton><IconButton onClick={() => setShowFilters(!showFilters)} sx={{ color: showFilters ? colors.primary : colors.textDim }}><FilterListIcon /></IconButton></Box>)}
            <Box sx={{ p: 2, pb: 1, display: 'flex', gap: 1 }}><TextField placeholder="Buscar material, código o lote..." size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} fullWidth InputProps={{ startAdornment: <SearchIcon sx={{ color: colors.textDim, mr: 1 }} />, endAdornment: browserSupportsSpeechRecognition && (<IconButton size="small" onClick={toggleListening} sx={{ color: listening ? colors.danger : colors.textDim }}>{listening ? <MicIcon /> : <MicOffIcon sx={{ opacity: 0.5 }} />}</IconButton>), sx: { bgcolor: colors.inputBg, borderRadius: 2, color: 'white', border: `1px solid ${colors.border}` } }} /></Box>
            
            <Box sx={{ display: 'flex', overflowX: 'auto', gap: 1, p: 1.5, pt: 0, '&::-webkit-scrollbar': { display: 'none' } }}>
                <KPIButton label="Stock" value={metrics.kilos > 1000 ? `${(metrics.kilos / 1000).toFixed(1)}k` : metrics.kilos.toFixed(0)} unit="kg" icon={InventoryIcon} color={colors.primary} active={!activeKpi} onClick={() => setActiveKpi(null)} />
                <KPIButton label="Posiciones" value={metrics.positionsCount} unit="pos" icon={LocationOnIcon} color={colors.info} active={activeKpi === 'Posiciones'} onClick={() => setActiveKpi('Posiciones')} />
                <KPIButton label="Picking" value={groupedData.length} unit="items" icon={LocalShippingIcon} color={colors.info} active={activeKpi === 'Picking'} onClick={() => setActiveKpi('Picking')} />
            </Box>
            
            <Collapse in={showFilters}>
                <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: 'rgba(255,255,255,0.01)', borderRadius: 2, m: 2, p: 2, border: `1px solid ${colors.border}` }}>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <TextField select label="Planta" value={plantId} onChange={(e) => setPlantId(e.target.value)} fullWidth size="small" InputProps={{ sx: { bgcolor: colors.inputBg, color: 'white' } }}>
                            {plants.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                        </TextField>
                        <TextField select label="Depósito" value={depotId} onChange={(e) => setDepotId(e.target.value)} fullWidth size="small" InputProps={{ sx: { bgcolor: colors.inputBg, color: 'white' } }}>
                            {depots.map((d: any) => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}
                        </TextField>
                    </Box>
                    <TextField select label="Posición" value={positionId} onChange={(e) => setPositionId(e.target.value)} fullWidth size="small" InputProps={{ sx: { bgcolor: colors.inputBg, color: 'white' } }}>
                        <MenuItem value="">Todas las posiciones</MenuItem>
                        {depots.find(d => d.id === depotId)?.positions?.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.codigo}</MenuItem>)}
                    </TextField>
                </Box>
            </Collapse>
            
            <Box sx={{ display: 'flex', overflowX: 'auto', gap: 1, px: 2, pb: 2 }}>{categoriesList.map(cat => <Chip key={cat} label={cat} onClick={() => setSelectedCategory(cat)} sx={{ bgcolor: selectedCategory === cat ? colors.primary : colors.inputBg, color: selectedCategory === cat ? '#000' : colors.textDim, fontWeight: 800, fontSize: '0.65rem' }} />)}</Box>
            
            {isLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress /></Box> : (
                <Fade in timeout={400}>
                    <Box sx={{ px: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 900, color: colors.textDim, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                            {activeKpi === 'Posiciones' ? 'POSICIONES CON STOCK' : 'INVENTARIO DISPONIBLE'}
                        </Typography>
                        <List disablePadding>
                            {activeKpi === 'Posiciones' ? (
                                 groupedPositionsData.length > 0 ? groupedPositionsData.map((g: any) => (
                                     <PositionCard 
                                         key={g.posicion.id} 
                                         group={g} 
                                         isPinned={pinnedIds.has(g.posicion.id)} 
                                         onTogglePin={() => togglePin(g.posicion.id)} 
                                         isExpanded={expandedItemId === g.posicion.id} 
                                         onToggleExpand={() => setExpandedItemId(expandedItemId === g.posicion.id ? null : g.posicion.id)} 
                                         onMoveRequest={(entry: any) => { setSelectedEntryToMove(entry); setMoveDrawerOpen(true); }} 
                                         onSalidaRequest={(entry: any) => { setSelectedEntryToSalida(entry); setSalidaDrawerOpen(true); }} 
                                     />
                                 )) : (
                                     <Box sx={{ p: 8, textAlign: 'center' }}><InventoryIcon sx={{ fontSize: 40, color: colors.border, mb: 2 }} /><Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 800, display: 'block' }}>SIN RESULTADOS</Typography></Box>
                                 )
                             ) :
                             groupedData.length > 0 ? groupedData.map((g: any) => (
                                <MaterialCard key={g.item.id} group={g} isPinned={pinnedIds.has(g.item.id)} onTogglePin={() => togglePin(g.item.id)} isExpanded={expandedItemId === g.item.id} onToggleExpand={() => setExpandedItemId(expandedItemId === g.item.id ? null : g.item.id)} onMoveRequest={(entry: any) => { setSelectedEntryToMove(entry); setMoveDrawerOpen(true); }} onSalidaRequest={(entry: any) => { setSelectedEntryToSalida(entry); setSalidaDrawerOpen(true); }} onEditLimits={(item: any) => { setSelectedItemToEditLimits(item); setEditLimitsOpen(true); }} />
                             )) : 
                             <Box sx={{ p: 8, textAlign: 'center' }}><InventoryIcon sx={{ fontSize: 40, color: colors.border, mb: 2 }} /><Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 800, display: 'block' }}>SIN RESULTADOS</Typography></Box>}
                        </List>
                    </Box>
                </Fade>
            )}
            
            <Fab sx={{ position: 'fixed', bottom: 20, right: 20, bgcolor: colors.primary, color: '#000', '&:hover': { bgcolor: '#d97706' } }} onClick={() => setQuickAddOpen(true)}><AddIcon /></Fab>
            <QuickAddDrawer open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
            <EditStockLimitsDrawer open={editLimitsOpen} onClose={() => setEditLimitsOpen(false)} initialItem={selectedItemToEditLimits} />
            <MoveStockDrawer open={moveDrawerOpen} onClose={() => setMoveDrawerOpen(false)} entry={selectedEntryToMove} />
            <DespachoDirectoDrawer open={salidaDrawerOpen} onClose={() => setSalidaDrawerOpen(false)} entry={selectedEntryToSalida} />
        </Box>
    );
}
