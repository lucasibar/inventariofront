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
    Avatar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CategoryIcon from '@mui/icons-material/Category';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HistoryIcon from '@mui/icons-material/History';
import DateRangeIcon from '@mui/icons-material/DateRange';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PersonIcon from '@mui/icons-material/Person';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StraightenIcon from '@mui/icons-material/Straighten';

// Voice Search
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// API Hooks
import { 
    useGetStockQuery, 
    useGetAlertsQuery,
    useQuickAddStockMutation,
    useGetRecentMovementsQuery,
    useMoveStockMutation
} from '../stock/api/stock.api';
import { useGetDepotsQuery } from '../deposito/api/deposito.api';
import { useGetItemsQuery, useUpdateItemMutation } from '../../config/items/api/items.api';
import { useGetPartnersQuery } from '../../config/partners/api/partners.api';
import { useGetRemitosEntradaQuery } from '../remitosEntrada/api/remitos-entrada.api';
import { useGetRemitosSalidaQuery } from '../remitosSalida/api/remitos-salida.api';
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

const MoveStockDrawer = ({ open, onClose, entry }: { open: boolean, onClose: () => void, entry: any }) => {
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const [moveStock] = useMoveStockMutation();
    const [form, setForm] = useState({ depositoId: '', posicionIdDestino: '', qtyPrincipal: '', qtySecundaria: '' });
    const [isSaving, setIsSaving] = useState(false);
    useEffect(() => { if (entry) { setForm({ depositoId: entry.depositoId, posicionIdDestino: '', qtyPrincipal: String(entry.qtyPrincipal), qtySecundaria: String(entry.qtySecundaria || '') }); } }, [entry]);
    const selectedDepot = useMemo(() => rawDepots.find((d: any) => d.id === form.depositoId), [rawDepots, form.depositoId]);
    const handleMove = async () => { if (!form.posicionIdDestino || !form.qtyPrincipal) { alert('Completá destino y cantidad.'); return; } setIsSaving(true); try { await moveStock({ depositoId: form.depositoId, posicionIdOrigen: entry.posicionId, posicionIdDestino: form.posicionIdDestino, itemId: entry.batch.item.id, lotId: entry.batch.id, qtyPrincipal: Number(form.qtyPrincipal), qtySecundaria: form.qtySecundaria ? Number(form.qtySecundaria) : undefined, fecha: new Date().toISOString() }).unwrap(); alert('Movimiento exitoso'); onClose(); } catch (e: any) { alert(e?.data?.message || 'Error'); } finally { setIsSaving(false); } };
    if (!entry) return null;
    return (
        <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: colors.bg, color: colors.text, borderTop: `1px solid ${colors.info}`, borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 3, pb: 6 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}><Typography variant="h5" sx={{ fontWeight: 900, color: colors.info }}>MOVER MERCADERÍA</Typography><IconButton onClick={onClose} sx={{ color: colors.textDim }}><CloseIcon /></IconButton></Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', p: 2, borderRadius: 2, border: `1px solid ${colors.border}` }}><Typography variant="caption" sx={{ color: colors.textDim }}>Origen:</Typography><Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{entry.batch.item.descripcion}</Typography><Typography variant="body2" sx={{ color: colors.primary, fontWeight: 700 }}>Posición: {entry.posicion?.codigo} | Lote: {entry.batch.lotNumber}</Typography><Typography variant="caption" sx={{ color: colors.textDim }}>Disponible: {entry.qtyPrincipal} {entry.batch.item.unidadPrincipal}</Typography></Box>
                <TextField select label="Depósito Destino" fullWidth value={form.depositoId} onChange={(e) => setForm({...form, depositoId: e.target.value, posicionIdDestino: ''})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }}>{rawDepots.map((d: any) => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}</TextField>
                <TextField select label="Posición Destino" fullWidth value={form.posicionIdDestino} disabled={!form.depositoId} onChange={(e) => setForm({...form, posicionIdDestino: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }}>{selectedDepot?.positions?.filter((p: any) => p.id !== entry.posicionId).map((p: any) => <MenuItem key={p.id} value={p.id}>{p.codigo}</MenuItem>)}</TextField>
                <Box sx={{ display: 'flex', gap: 2 }}><TextField label={`Mover (${entry.batch.item.unidadPrincipal})`} type="number" fullWidth value={form.qtyPrincipal} onChange={(e) => setForm({...form, qtyPrincipal: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} /><TextField label={`Mover (${entry.batch.item.unidadSecundaria || 'Un'})`} type="number" fullWidth value={form.qtySecundaria} onChange={(e) => setForm({...form, qtySecundaria: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} /></Box>
                <Button fullWidth variant="contained" size="large" disabled={isSaving} startIcon={isSaving ? <CircularProgress size={20} /> : <SwapHorizIcon />} sx={{ mt: 2, bgcolor: colors.info, color: '#fff', fontWeight: 900, borderRadius: 3, py: 1.5 }} onClick={handleMove}>{isSaving ? 'MOVIENDO...' : 'CONFIRMAR MOVIMIENTO'}</Button>
            </Box>
        </Drawer>
    );
};

const MaterialCard = ({ group, isPinned, onTogglePin, isExpanded, onToggleExpand, onMoveRequest }: any) => {
    const { item, metrics, entries } = group;
    const isCritical = metrics.kilos < (item.minStock || 50);
    const statusColor = isCritical ? colors.danger : colors.success;
    return (
        <Box sx={{ bgcolor: isPinned ? `${colors.primary}05` : colors.cardBg, mb: 1, borderRadius: 2, border: `1px solid ${isPinned ? colors.primary : colors.border}`, overflow: 'hidden', transition: 'all 0.2s ease' }}>
            <ListItem sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <Box><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography variant="caption" sx={{ color: colors.primary, fontWeight: 800, fontSize: '0.65rem' }}>{item.codigoInterno}</Typography>{isPinned && <Chip label="ANCLADO" size="small" sx={{ height: 16, fontSize: '0.55rem', bgcolor: colors.primary, color: '#000', fontWeight: 900 }} />}</Box><Typography variant="h6" sx={{ fontWeight: 800, color: colors.text, lineHeight: 1.2 }}>{item.descripcion}</Typography></Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}><IconButton size="small" onClick={onTogglePin} sx={{ color: isPinned ? colors.primary : colors.textDim }}>{isPinned ? <PushPinIcon sx={{ fontSize: 18 }} /> : <PushPinOutlinedIcon sx={{ fontSize: 18 }} />}</IconButton><IconButton size="small" onClick={onToggleExpand} sx={{ color: colors.textDim }}>{isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}</IconButton></Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}><Typography variant="h4" sx={{ fontWeight: 900, color: statusColor }}>{metrics.kilos.toFixed(1)}</Typography><Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700 }}>{item.unidadPrincipal}</Typography></Box>
                    <Box sx={{ textAlign: 'right' }}><Typography variant="caption" sx={{ color: colors.textDim, display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}><CategoryIcon sx={{ fontSize: 12 }} /> {item.category?.nombre || 'General'}</Typography><Typography variant="caption" sx={{ color: colors.textDim, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, fontWeight: 600 }}><SwapHorizIcon sx={{ fontSize: 12 }} /> {entries.length} registros</Typography></Box>
                </Box>
            </ListItem>
            <Collapse in={isExpanded}><Divider sx={{ borderColor: colors.border }} /><Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)' }}><Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 900, mb: 1, display: 'block', textTransform: 'uppercase', fontSize: '0.6rem' }}>Desglose por Posición y Lote</Typography><List disablePadding>{entries.map((entry: any, idx: number) => (<Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: idx === entries.length - 1 ? 'none' : `1px solid ${colors.border}` }}><Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{entry.posicion?.codigo || 'S/P'}</Typography><Typography variant="caption" sx={{ color: colors.textDim }}>Lote: {entry.batch?.lotNumber} | Proveedor: {entry.batch?.supplier?.name || 'S/D'}</Typography></Box><Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><Box sx={{ textAlign: 'right' }}><Typography variant="body2" sx={{ fontWeight: 800, color: colors.primary }}>{entry.qtyPrincipal} {item.unidadPrincipal}</Typography><Typography variant="caption" sx={{ color: colors.textDim }}>{entry.qtySecundaria || 0} {item.unidadSecundaria || 'Un'}</Typography></Box><Button size="small" variant="outlined" startIcon={<SwapHorizIcon />} sx={{ borderColor: colors.info, color: colors.info, textTransform: 'none', fontWeight: 800, fontSize: '0.65rem', borderRadius: 1.5 }} onClick={() => onMoveRequest(entry)}>Mover</Button></Box></Box>))}</List></Box></Collapse>
        </Box>
    );
};

const MovementCard = ({ move }: { move: any }) => {
    const date = new Date(move.fecha).toLocaleDateString();
    
    return (
        <Paper elevation={0} sx={{ 
            bgcolor: colors.cardBg, mb: 2, borderRadius: 3, 
            border: `1px solid ${colors.border}`, overflow: 'hidden'
        }}>
            {/* Header: Item & Date */}
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: `${colors.info}20`, border: `1px solid ${colors.info}40` }}>
                        <SwapHorizIcon sx={{ color: colors.info, fontSize: 18 }} />
                    </Avatar>
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: colors.text, lineHeight: 1.2 }}>{move.item?.descripcion}</Typography>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.65rem' }}>Lote: {move.batch?.lotNumber}</Typography>
                    </Box>
                </Box>
                <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 600 }}>{date}</Typography>
            </Box>

            {/* Transfer Visualization */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <LocationOnIcon sx={{ color: colors.textDim, fontSize: 16 }} />
                    <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.6rem' }}>ORIGEN</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: colors.text }}>{move.posicionOrigen?.codigo || 'S/P'}</Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flex: 0.5 }}>
                    <ArrowForwardIcon sx={{ color: colors.primary, fontSize: 20 }} />
                    <Chip label={`${move.qtyPrincipal} ${move.item?.unidadPrincipal}`} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.05)', color: colors.primary, fontWeight: 900 }} />
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <LocationOnIcon sx={{ color: colors.success, fontSize: 16 }} />
                    <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.6rem' }}>DESTINO</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: colors.success }}>{move.posicionDestino?.codigo || 'S/P'}</Typography>
                </Box>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.03)' }} />
            
            {/* Footer */}
            <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.01)' }}>
                <Typography variant="caption" sx={{ color: colors.textDim, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <StraightenIcon sx={{ fontSize: 12 }} /> ID: #{move.id}
                </Typography>
                <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700 }}>
                    {move.qtySecundaria ? `${move.qtySecundaria} ${move.item?.unidadSecundaria || 'Un'}` : ''}
                </Typography>
            </Box>
        </Paper>
    );
};

const RemitoCard = ({ remito, type }: { remito: any, type: 'ENTRADA' | 'SALIDA' }) => {
    const itemCount = (remito.items?.length || remito.lines?.length || 0);
    const date = new Date(remito.fecha).toLocaleDateString();
    const mainColor = type === 'ENTRADA' ? colors.success : colors.danger;
    return (
        <Paper elevation={0} sx={{ bgcolor: colors.cardBg, mb: 2, borderRadius: 3, border: `1px solid ${colors.border}`, overflow: 'hidden', position: 'relative' }}>
            <Box sx={{ p: 2, borderBottom: `1px dashed ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ReceiptIcon sx={{ color: mainColor, fontSize: 18 }} /><Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 900, letterSpacing: '0.1em' }}>REMITO {type}</Typography></Box><Chip label={remito.numero} size="small" sx={{ bgcolor: `${mainColor}20`, color: mainColor, fontWeight: 900, height: 20, fontSize: '0.7rem' }} /></Box>
            <Box sx={{ p: 2 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}><Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', p: 1, borderRadius: 2 }}><PersonIcon sx={{ color: colors.primary, fontSize: 20 }} /></Box><Box><Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.65rem', display: 'block' }}>{type === 'ENTRADA' ? 'PROVEEDOR' : 'CLIENTE'}</Typography><Typography variant="body1" sx={{ fontWeight: 800, color: colors.text }}>{remito.partner?.name || remito.clientName || 'Consumidor Final'}</Typography></Box></Box><Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 1.5 }} /><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CalendarMonthIcon sx={{ color: colors.textDim, fontSize: 16 }} /><Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 600 }}>{date}</Typography></Box><Box sx={{ textAlign: 'right' }}><Typography variant="caption" sx={{ color: colors.textDim, display: 'block', fontSize: '0.65rem' }}>TOTAL ÍTEMS</Typography><Typography variant="body2" sx={{ fontWeight: 900, color: colors.primary }}>{itemCount} líneas</Typography></Box></Box><Button fullWidth size="small" startIcon={<FileOpenIcon />} sx={{ mt: 2, bgcolor: 'rgba(255,255,255,0.02)', color: colors.textDim, fontWeight: 800, textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: colors.text } }}>Ver Detalle Completo</Button></Box><Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, bgcolor: mainColor }} /></Paper>
    );
};

const QuickAddDrawer = ({ open, onClose }: { open: boolean, onClose: () => void }) => {
    const { data: depots = [] } = useGetDepotsQuery();
    const { data: items = [] } = useGetItemsQuery({});
    const { data: partners = [] } = useGetPartnersQuery({});
    const [quickAddStock] = useQuickAddStockMutation();
    const [form, setForm] = useState(() => { const saved = localStorage.getItem('quick_add_form'); const initial = { depositoId: '', posicionId: '', itemId: '', supplierId: '', lotNumber: '', qtyPrincipal: '', qtySecundaria: '', remito: '' }; if (saved) { try { const parsed = JSON.parse(saved); return { ...initial, ...parsed, itemId: '', lotNumber: '', qtyPrincipal: '', qtySecundaria: '' }; } catch (e) { return initial; } } return initial; });
    useEffect(() => { const toSave = { depositoId: form.depositoId, posicionId: form.posicionId, supplierId: form.supplierId, remito: form.remito }; localStorage.setItem('quick_add_form', JSON.stringify(toSave)); }, [form.depositoId, form.posicionId, form.supplierId, form.remito]);
    const [isSaving, setIsSaving] = useState(false);
    const suppliers = useMemo(() => partners.filter((p: any) => p.type === 'SUPPLIER' || p.type === 'BOTH'), [partners]);
    const selectedDepot = useMemo(() => depots.find((d: any) => d.id === form.depositoId), [depots, form.depositoId]);
    const selectedItem = useMemo(() => items.find((i: any) => i.id === form.itemId), [items, form.itemId]);
    const handleSubmit = async () => { if (!form.depositoId || !form.posicionId || !form.itemId || !form.supplierId || !form.lotNumber || !form.qtyPrincipal) { alert('Completá los campos obligatorios.'); return; } setIsSaving(true); try { await quickAddStock({ depositoId: form.depositoId, posicionId: form.posicionId, itemId: form.itemId, supplierId: form.supplierId, lotNumber: form.lotNumber, qtyPrincipal: Number(form.qtyPrincipal), qtySecundaria: form.qtySecundaria ? Number(form.qtySecundaria) : undefined, fecha: new Date().toISOString() }).unwrap(); onClose(); setForm((prev: any) => ({ ...prev, itemId: '', lotNumber: '', qtyPrincipal: '', qtySecundaria: '' })); } catch (e: any) { alert(e?.data?.message || 'Error'); } finally { setIsSaving(false); } };
    return (
        <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: colors.bg, color: colors.text, borderTop: `1px solid ${colors.primary}`, borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 3, pb: 6 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}><Typography variant="h5" sx={{ fontWeight: 900, color: colors.primary }}>CARGA RÁPIDA</Typography><IconButton onClick={onClose} sx={{ color: colors.textDim }}><CloseIcon /></IconButton></Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}><TextField select label="Depósito" fullWidth value={form.depositoId} onChange={(e) => setForm({...form, depositoId: e.target.value, posicionId: ''})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }}>{depots.map((d: any) => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}</TextField><TextField select label="Posición" fullWidth value={form.posicionId} disabled={!form.depositoId} onChange={(e) => setForm({...form, posicionId: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }}>{selectedDepot?.positions?.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.codigo}</MenuItem>)}</TextField></Box>
                <Autocomplete options={suppliers} getOptionLabel={(option: any) => option.name} value={suppliers.find(s => s.id === form.supplierId) || null} renderInput={(params) => <TextField {...params} label="Proveedor" InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} />} onChange={(_e, val: any) => setForm({...form, supplierId: val?.id || ''})} />
                <Autocomplete options={items} getOptionLabel={(option: any) => `${option.codigoInterno} - ${option.descripcion}`} renderInput={(params) => <TextField {...params} label="Material" InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} />} onChange={(_e, val: any) => setForm({...form, itemId: val?.id || ''})} />
                <Box sx={{ display: 'flex', gap: 2 }}><TextField label="Lote" fullWidth value={form.lotNumber} onChange={(e) => setForm({...form, lotNumber: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} /><TextField label="N° Remito (Opc)" fullWidth value={form.remito} onChange={(e) => setForm({...form, remito: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} /></Box>
                <Box sx={{ display: 'flex', gap: 2 }}><TextField label={`Cant (${selectedItem?.unidadPrincipal || 'Kg'})`} type="number" fullWidth value={form.qtyPrincipal} onChange={(e) => setForm({...form, qtyPrincipal: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} /><TextField label={`Sec (${selectedItem?.unidadSecundaria || 'Un'})`} type="number" fullWidth value={form.qtySecundaria} onChange={(e) => setForm({...form, qtySecundaria: e.target.value})} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} /></Box>
                <Button fullWidth variant="contained" size="large" disabled={isSaving} startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />} sx={{ mt: 2, bgcolor: colors.primary, color: '#000', fontWeight: 900, borderRadius: 3, py: 1.5, '&:hover': { bgcolor: '#d97706' } }} onClick={handleSubmit}>{isSaving ? 'REGISTRANDO...' : 'REGISTRAR ENTRADA'}</Button>
            </Box>
        </Drawer>
    );
};

const EditStockLimitsDrawer = ({ open, onClose }: { open: boolean, onClose: () => void }) => {
    const { data: items = [] } = useGetItemsQuery({});
    const [updateItem] = useUpdateItemMutation();
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [limits, setLimits] = useState({ minStock: '', maxStock: '' });
    const [isSaving, setIsSaving] = useState(false);
    useEffect(() => { if (selectedItem) { setLimits({ minStock: String(selectedItem.minStock || ''), maxStock: String(selectedItem.maxStock || '') }); } }, [selectedItem]);
    const handleSave = async () => { if (!selectedItem) return; setIsSaving(true); try { await updateItem({ id: selectedItem.id, data: { ...selectedItem, minStock: Number(limits.minStock), maxStock: Number(limits.maxStock) } }).unwrap(); alert('Límites actualizados correctamente'); onClose(); setSelectedItem(null); } catch (e: any) { alert(e?.data?.message || 'Error'); } finally { setIsSaving(false); } };
    return (
        <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: colors.bg, color: colors.text, borderTop: `1px solid ${colors.info}`, borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 3, pb: 6 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}><Typography variant="h5" sx={{ fontWeight: 900, color: colors.info }}>GESTIÓN DE LÍMITES</Typography><IconButton onClick={onClose} sx={{ color: colors.textDim }}><CloseIcon /></IconButton></Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Autocomplete options={items} getOptionLabel={(option: any) => `${option.codigoInterno} - ${option.descripcion}`} renderInput={(params) => <TextField {...params} label="Seleccionar Material para configurar" InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} />} onChange={(_e, val: any) => setSelectedItem(val)} />
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
    const [moveDrawerOpen, setMoveDrawerOpen] = useState(false);
    const [selectedEntryToMove, setSelectedEntryToMove] = useState<any>(null);
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
    const togglePin = (id: string) => { setPinnedIds((prev: any) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
    const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
    useEffect(() => { if (transcript) setSearchQuery(transcript); }, [transcript]);
    const toggleListening = () => { if (listening) SpeechRecognition.stopListening(); else { resetTranscript(); SpeechRecognition.startListening({ language: 'es-AR', continuous: true }); } };
    const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
    useEffect(() => { if (depotId) sessionStorage.setItem('selectedDepotId', depotId); }, [depotId]);
    const { data: rawPlants = [] } = useGetPlantsQuery();
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const plants = useMemo(() => rawPlants, [rawPlants]);
    const depots = useMemo(() => { let filtered = allowedDepots ? rawDepots.filter((d: any) => allowedDepots.includes(d.id)) : rawDepots; if (plantId) filtered = filtered.filter((d: any) => d.plantId === plantId); return filtered; }, [rawDepots, allowedDepots, plantId]);
    useEffect(() => { if (rawPlants.length > 0 && !plantId) { const derwill = rawPlants.find((p: any) => p.name.toLowerCase().includes('derwill')); if (derwill) setPlantId(derwill.id); } }, [rawPlants, plantId]);
    useEffect(() => { if (depots.length > 0 && !depotId) { const hilado = depots.find((d: any) => d.nombre.toLowerCase().includes('hilado')); if (hilado) setDepotId(hilado.id); else setDepotId(depots[0].id); } }, [depots, depotId]);
    const { data: rawStock = [], isLoading: loadingStock } = useGetStockQuery({ depotId: depotId || undefined, positionId: positionId || undefined }, { skip: !depotId });
    const { data: alerts = [], isLoading: loadingAlerts } = useGetAlertsQuery();
    const { data: recentMoves = [], isLoading: loadingMoves } = useGetRecentMovementsQuery({ depositoId: depotId || undefined, desde: dateFrom, hasta: dateTo }, { skip: activeKpi !== 'Moves' });
    const { data: remitosEntrada = [], isLoading: loadingEntradas } = useGetRemitosEntradaQuery(undefined, { skip: activeKpi !== 'Entradas' });
    const { data: remitosSalida = [], isLoading: loadingSalidas } = useGetRemitosSalidaQuery(undefined, { skip: activeKpi !== 'Salidas' });
    const filteredRemitosEntrada = useMemo(() => remitosEntrada.filter((r: any) => { const d = r.fecha.split('T')[0]; return d >= dateFrom && d <= dateTo; }), [remitosEntrada, dateFrom, dateTo]);
    const filteredRemitosSalida = useMemo(() => remitosSalida.filter((r: any) => { const d = r.fecha.split('T')[0]; return d >= dateFrom && d <= dateTo; }), [remitosSalida, dateFrom, dateTo]);
    const { groupedData, metrics } = useMemo(() => {
        const genMetrics = { kilos: 0, alerts: alerts.length, moves: recentMoves.length, entradas: filteredRemitosEntrada.length, salidas: filteredRemitosSalida.length };
        const groups: Record<string, any> = {};
        const searchTerms = searchQuery.toLowerCase().split(' ').filter(t => t.length > 0);
        rawStock.forEach((entry: any) => {
            const itemId = entry.batch?.item?.id; if (!itemId) return;
            const matchesSearch = searchTerms.length === 0 || searchTerms.every(term => {
                const itemDesc = (entry.batch?.item?.descripcion || '').toLowerCase();
                const itemCode = (entry.batch?.item?.codigoInterno || '').toLowerCase();
                const supplierName = (entry.batch?.supplier?.name || '').toLowerCase();
                const categoryName = (entry.batch?.item?.category?.nombre || '').toLowerCase();
                const lotNumber = (entry.batch?.lotNumber || '').toLowerCase();
                return itemDesc.includes(term) || itemCode.includes(term) || supplierName.includes(term) || categoryName.includes(term) || lotNumber.includes(term);
            });
            const isPinned = pinnedIds.has(itemId);
            const passesCategory = selectedCategory === 'Todos' || entry.batch?.item?.category?.nombre === selectedCategory;
            const shouldInclude = isPinned || (matchesSearch && passesCategory);
            if (shouldInclude) {
                if (!groups[itemId]) { groups[itemId] = { item: entry.batch.item, entries: [], metrics: { kilos: 0, units: 0 }, isPinned, passesSearchAndCategory: matchesSearch && passesCategory }; }
                groups[itemId].entries.push(entry);
                groups[itemId].metrics.kilos += Number(entry.qtyPrincipal || 0);
                let passesKpiFilter = true; if (activeKpi === 'Alertas') passesKpiFilter = alerts.some((a: any) => a.itemId === itemId);
                if (matchesSearch && passesCategory && passesKpiFilter) genMetrics.kilos += Number(entry.qtyPrincipal || 0);
            }
        });
        let data = Object.values(groups);
        if (activeKpi === 'Alertas') data = data.filter((g: any) => g.isPinned || alerts.some((a: any) => a.itemId === g.item.id));
        data.sort((a: any, b: any) => (a.isPinned === b.isPinned) ? 0 : a.isPinned ? -1 : 1);
        return { groupedData: data, metrics: genMetrics };
    }, [rawStock, searchQuery, selectedCategory, activeKpi, alerts, recentMoves, filteredRemitosEntrada, filteredRemitosSalida, pinnedIds]);
    const categoriesList = useMemo(() => { const cats = new Set<string>(); cats.add('Todos'); rawStock.forEach((s: any) => { if (s.batch?.item?.category?.nombre) cats.add(s.batch.item.category.nombre); }); return Array.from(cats); }, [rawStock]);
    const isLoading = loadingStock || (activeKpi === 'Alertas' && loadingAlerts) || (activeKpi === 'Moves' && loadingMoves) || (activeKpi === 'Entradas' && loadingEntradas) || (activeKpi === 'Salidas' && loadingSalidas);

    return (
        <Box sx={{ bgcolor: colors.bg, minHeight: '100vh', color: colors.text, pb: 10, maxWidth: '1400px', margin: '0 auto' }}>
            {!isMobile && (<Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, bgcolor: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${colors.border}`, position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' }}><IconButton onClick={() => document.dispatchEvent(new CustomEvent('open-sidebar-menu'))} sx={{ color: colors.textDim, mr: 1 }}><MoreVertIcon /></IconButton><Typography variant="h6" sx={{ flex: 1, fontWeight: 900, color: colors.primary, fontSize: '0.9rem', textTransform: 'uppercase' }}>Dashboard Depósito</Typography><IconButton onClick={() => setShowFilters(!showFilters)} sx={{ color: showFilters ? colors.primary : colors.textDim }}><FilterListIcon /></IconButton></Box>)}
            {isMobile && (<Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, px: 2 }}><IconButton onClick={() => document.dispatchEvent(new CustomEvent('open-sidebar-menu'))} sx={{ color: colors.textDim }}><MoreVertIcon /></IconButton><IconButton onClick={() => setShowFilters(!showFilters)} sx={{ color: showFilters ? colors.primary : colors.textDim }}><FilterListIcon /></IconButton></Box>)}
            <Box sx={{ p: 2, pb: 1, display: 'flex', gap: 1 }}><TextField placeholder="Buscar material, código o lote..." size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} fullWidth InputProps={{ startAdornment: <SearchIcon sx={{ color: colors.textDim, mr: 1 }} />, endAdornment: browserSupportsSpeechRecognition && (<IconButton size="small" onClick={toggleListening} sx={{ color: listening ? colors.danger : colors.textDim }}>{listening ? <MicIcon /> : <MicOffIcon sx={{ opacity: 0.5 }} />}</IconButton>), sx: { bgcolor: colors.inputBg, borderRadius: 2, color: 'white', border: `1px solid ${colors.border}` } }} /></Box>
            <Box sx={{ display: 'flex', overflowX: 'auto', gap: 1, p: 1.5, pt: 0, '&::-webkit-scrollbar': { display: 'none' } }}><KPIButton label="Stock" value={metrics.kilos > 1000 ? `${(metrics.kilos / 1000).toFixed(1)}k` : metrics.kilos.toFixed(0)} unit="kg" icon={InventoryIcon} color={colors.primary} active={!activeKpi} onClick={() => setActiveKpi(null)} /><KPIButton label="Crítico" value={metrics.alerts} unit="items" icon={WarningAmberIcon} color={colors.danger} active={activeKpi === 'Alertas'} onClick={() => setActiveKpi('Alertas')} /><KPIButton label="Movim." value={metrics.moves} unit="periodo" icon={HistoryIcon} color={colors.info} active={activeKpi === 'Moves'} onClick={() => setActiveKpi('Moves')} /><KPIButton label="Entradas" value={metrics.entradas} unit="periodo" icon={LocalShippingIcon} color={colors.success} active={activeKpi === 'Entradas'} onClick={() => setActiveKpi('Entradas')} /><KPIButton label="Salidas" value={metrics.salidas} unit="periodo" icon={TrendingUpIcon} color="#f87171" active={activeKpi === 'Salidas'} onClick={() => setActiveKpi('Salidas')} /></Box>
            <Collapse in={showFilters}><Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: 'rgba(255,255,255,0.01)', borderRadius: 2, m: 2, p: 2, border: `1px solid ${colors.border}` }}><Box sx={{ display: 'flex', gap: 1.5 }}><TextField select label="Planta" value={plantId} onChange={(e) => setPlantId(e.target.value)} fullWidth size="small" InputProps={{ sx: { bgcolor: colors.inputBg, color: 'white' } }}>{plants.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</TextField><TextField select label="Depósito" value={depotId} onChange={(e) => setDepotId(e.target.value)} fullWidth size="small" InputProps={{ sx: { bgcolor: colors.inputBg, color: 'white' } }}>{depots.map((d: any) => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}</TextField></Box><TextField select label="Posición" value={positionId} onChange={(e) => setPositionId(e.target.value)} fullWidth size="small" InputProps={{ sx: { bgcolor: colors.inputBg, color: 'white' } }}><MenuItem value="">Todas las posiciones</MenuItem>{depots.find(d => d.id === depotId)?.positions?.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.codigo}</MenuItem>)}</TextField><Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}><DateRangeIcon sx={{ color: colors.textDim }} /><TextField type="date" label="Desde" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} InputProps={{ sx: { bgcolor: colors.inputBg, color: 'white' } }} /><TextField type="date" label="Hasta" value={dateTo} onChange={(e) => setDateTo(e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} InputProps={{ sx: { bgcolor: colors.inputBg, color: 'white' } }} /></Box></Box></Collapse>
            <Box sx={{ display: 'flex', overflowX: 'auto', gap: 1, px: 2, pb: 2 }}>{categoriesList.map(cat => <Chip key={cat} label={cat} onClick={() => setSelectedCategory(cat)} sx={{ bgcolor: selectedCategory === cat ? colors.primary : colors.inputBg, color: selectedCategory === cat ? '#000' : colors.textDim, fontWeight: 800, fontSize: '0.65rem' }} />)}</Box>
            {isLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress /></Box> : (
                <Fade in timeout={400}>
                    <Box sx={{ px: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 900, color: colors.textDim, textTransform: 'uppercase', mb: 1, display: 'block' }}>{activeKpi === 'Alertas' ? 'ALERTA STOCK BAJO' : activeKpi === 'Moves' ? 'MOVIMIENTOS EN PERIODO' : activeKpi === 'Entradas' ? 'REMITOS EN PERIODO' : activeKpi === 'Salidas' ? 'SALIDAS EN PERIODO' : 'INVENTARIO DISPONIBLE'}</Typography>
                        <List disablePadding>
                            {activeKpi === 'Moves' ? recentMoves.map((m: any) => <MovementCard key={m.id} move={m} />) : 
                             activeKpi === 'Entradas' ? filteredRemitosEntrada.map((r: any) => <RemitoCard key={r.id} remito={r} type="ENTRADA" />) : 
                             activeKpi === 'Salidas' ? filteredRemitosSalida.map((r: any) => <RemitoCard key={r.id} remito={r} type="SALIDA" />) : 
                             groupedData.length > 0 ? groupedData.map((g: any) => (
                                <MaterialCard key={g.item.id} group={g} isPinned={pinnedIds.has(g.item.id)} onTogglePin={() => togglePin(g.item.id)} isExpanded={expandedItemId === g.item.id} onToggleExpand={() => setExpandedItemId(expandedItemId === g.item.id ? null : g.item.id)} onMoveRequest={(entry: any) => { setSelectedEntryToMove(entry); setMoveDrawerOpen(true); }} />
                             )) : 
                             <Box sx={{ p: 8, textAlign: 'center' }}><InventoryIcon sx={{ fontSize: 40, color: colors.border, mb: 2 }} /><Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 800, display: 'block' }}>SIN RESULTADOS</Typography></Box>}
                        </List>
                    </Box>
                </Fade>
            )}
            <Fab sx={{ position: 'fixed', bottom: 20, right: 20, bgcolor: activeKpi === 'Alertas' ? colors.info : colors.primary, color: activeKpi === 'Alertas' ? '#fff' : '#000', '&:hover': { bgcolor: activeKpi === 'Alertas' ? '#2563eb' : '#d97706' } }} onClick={() => activeKpi === 'Alertas' ? setEditLimitsOpen(true) : setQuickAddOpen(true)}>{activeKpi === 'Alertas' ? <SettingsSuggestIcon /> : <AddIcon />}</Fab>
            <QuickAddDrawer open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
            <EditStockLimitsDrawer open={editLimitsOpen} onClose={() => setEditLimitsOpen(false)} />
            <MoveStockDrawer open={moveDrawerOpen} onClose={() => setMoveDrawerOpen(false)} entry={selectedEntryToMove} />
        </Box>
    );
}
