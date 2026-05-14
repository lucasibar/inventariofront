import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    CircularProgress,
    Autocomplete,
    Divider,
    Paper,
    Avatar,
    LinearProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AssignmentIcon from '@mui/icons-material/Assignment';
import StoreIcon from '@mui/icons-material/Store';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import HistoryIcon from '@mui/icons-material/History';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LinkIcon from '@mui/icons-material/Link';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import InventoryIcon from '@mui/icons-material/Inventory';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveIcon from '@mui/icons-material/Save';
import BusinessIcon from '@mui/icons-material/Business';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import LayersIcon from '@mui/icons-material/Layers';

// Voice Search
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// API Hooks
import { 
    useGetPurchaseOrdersQuery, 
    useGetUnlinkedMovementsQuery,
    useLinkMovementMutation,
    useCreatePurchaseOrderMutation,
    useDeletePurchaseOrderMutation,
    useUpdatePurchaseOrderStatusMutation,
    useGetCombosQuery
} from '../purchase-orders/api/purchase-orders.api';
import { useGetAlertsQuery } from '../../warehouse/stock/api/stock.api';
import { useGetPartnersQuery } from '../../config/partners/api/partners.api';
import { useGetItemsQuery } from '../../config/items/api/items.api';
// Design System Colors - Purchasing Theme (Indigo/Purple)
const colors = {
    primary: '#818cf8', // Indigo
    secondary: '#475569', // Slate
    bg: '#0f1117',
    cardBg: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
    text: '#f3f4f6',
    textDim: '#9ca3af',
    danger: '#f87171',
    success: '#34d399',
    info: '#60a5fa',
    warning: '#fbbf24',
    inputBg: 'rgba(255, 255, 255, 0.05)'
};

const KPIButton = ({ label, value, icon: Icon, color, active, onClick }: any) => (
    <Box 
        onClick={onClick}
        sx={{ 
            flex: '1 1 0', minWidth: 90, height: 75, p: 1.5, borderRadius: 3, 
            bgcolor: active ? `${color}25` : colors.cardBg, border: '1px solid', borderColor: active ? color : colors.border,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative'
        }}
    >
        <Box sx={{ color: color, mb: 0.5, opacity: active ? 1 : 0.6 }}><Icon sx={{ fontSize: '1.1rem' }} /></Box>
        <Typography sx={{ color: active ? '#fff' : color, fontWeight: 900, mb: 0.1, lineHeight: 1, fontSize: '1.1rem' }}>{value}</Typography>
        <Typography variant="caption" sx={{ color: active ? '#fff' : colors.textDim, fontSize: '0.5rem', fontWeight: 800, textAlign: 'center', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
        {active && (<Box sx={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 3, bgcolor: color, borderRadius: '2px 2px 0 0' }} />)}
    </Box>
);

const ComboCard = ({ combo, onBuy }: any) => (
    <Paper elevation={0} sx={{ bgcolor: 'rgba(129, 140, 248, 0.05)', mb: 1.5, borderRadius: 3, border: `1px solid ${colors.primary}30`, overflow: 'hidden', p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <LayersIcon sx={{ color: colors.primary, fontSize: 16 }} />
                    <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 900, letterSpacing: '0.05em' }}>COMBO DE COMPRA</Typography>
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: colors.text }}>{combo.title}</Typography>
                <Typography variant="caption" sx={{ color: colors.textDim }}>{combo.supplier?.name || 'Varios Proveedores'}</Typography>
            </Box>
            <Chip label={`${combo.itemIds?.length || 0} ITEMS`} size="small" sx={{ bgcolor: `${colors.primary}20`, color: colors.primary, fontWeight: 900, height: 20, fontSize: '0.6rem' }} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Box>
                <Typography variant="caption" sx={{ color: colors.textDim, display: 'block' }}>Déficit Estimado:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, color: colors.warning }}>{combo.deficit > 0 ? `-${combo.deficit.toFixed(0)} ${combo.unitLabel}` : 'Stock OK'}</Typography>
            </Box>
            <Button variant="contained" startIcon={<ShoppingCartIcon />} sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 900, borderRadius: 2, textTransform: 'none' }} onClick={() => onBuy(combo)}>Reponer</Button>
        </Box>
    </Paper>
);

// ... (Subcomponents like PurchaseOrderCard, UnlinkedMovementCard, NewOrderDrawer, ConciliationDrawer remain similar but adapted)

export default function DashboardComprasPage() {
    const navigate = useNavigate();
    const [tab, setTab] = useState(2); // Start on Criticals (index 2 in previous, but now we reorder)
    const [searchQuery, setSearchQuery] = useState('');
    const [plantFilter, setPlantFilter] = useState('');
    const [depotFilter, setDepotFilter] = useState('');
    const [conciliationOpen, setConciliationOpen] = useState(false);
    const [newOrderOpen, setNewOrderOpen] = useState(false);
    const [selectedMov, setSelectedMov] = useState<any>(null);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

    // API Data
    const { data: rawOrders = [], isLoading: loadingOrders } = useGetPurchaseOrdersQuery();
    const { data: alerts = [], isLoading: loadingAlerts } = useGetAlertsQuery();
    const { data: unlinkedMovs = [], isLoading: loadingUnlinked, error: errorUnlinked } = useGetUnlinkedMovementsQuery();
    const { data: combos = [], isLoading: loadingCombos } = useGetCombosQuery();
    const { data: partners = [] } = useGetPartnersQuery({});
    const { data: items = [] } = useGetItemsQuery({});
    
    const [updateStatus] = useUpdatePurchaseOrderStatusMutation();
    const [deleteOrder] = useDeletePurchaseOrderMutation();
    
    const suppliers = useMemo(() => partners.filter((p: any) => p.type === 'SUPPLIER' || p.type === 'BOTH'), [partners]);

    const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
    useEffect(() => { if (transcript) setSearchQuery(transcript); }, [transcript]);
    const toggleListening = () => { if (listening) SpeechRecognition.stopListening(); else { resetTranscript(); SpeechRecognition.startListening({ language: 'es-AR', continuous: true }); } };

    // Unified Processing (Snappy UI)
    const { filteredOrders, filteredMovs, metrics } = useMemo(() => {
        const terms = searchQuery.toLowerCase().split(' ').filter(t => t.length > 0);
        const match = (val: string) => terms.length === 0 || terms.every(t => val.toLowerCase().includes(t));
        
        // Filter by Plant/Depot (Need to join with movement/OC info)
        // For simplicity, we apply text search and status-based counts
        
        const orders = rawOrders.filter((o: any) => match(`${o.numero} ${o.supplier?.name} ${(o.lines || []).map((l: any) => l.item?.descripcion).join(' ')}`));
        const movs = (Array.isArray(unlinkedMovs) ? unlinkedMovs : []).filter((m: any) => match(`${m.item?.descripcion} ${m.supplier?.name} ${m.documentoNumero}`));
        
        const delayedCount = rawOrders.filter((o: any) => o.estado !== 'RECIBIDO' && o.estado !== 'COMPLETADO' && o.fechaEntregaEsperada && new Date(o.fechaEntregaEsperada) < new Date()).length;

        return { 
            filteredOrders: orders.sort((a: any, b: any) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime()),
            filteredMovs: movs,
            metrics: { pending: rawOrders.filter(o => o.estado === 'PENDIENTE').length, unlinked: Array.isArray(unlinkedMovs) ? unlinkedMovs.length : 0, critical: alerts.length + combos.length, delayed: delayedCount }
        };
    }, [rawOrders, unlinkedMovs, alerts, combos, searchQuery]);

    const isLoading = loadingOrders || loadingAlerts || loadingUnlinked || loadingCombos;

    return (
        <Box sx={{ bgcolor: colors.bg, minHeight: '100vh', color: colors.text, pb: 10, maxWidth: '1400px', margin: '0 auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, px: 2 }}>
                <IconButton onClick={() => document.dispatchEvent(new CustomEvent('open-sidebar-menu'))} sx={{ color: colors.textDim }}><MoreVertIcon /></IconButton>
                <Typography variant="h6" sx={{ fontWeight: 900, color: colors.primary, fontSize: '0.9rem', textTransform: 'uppercase' }}>Comando de Compras</Typography>
                <IconButton sx={{ color: colors.textDim }}><InventoryIcon /></IconButton>
            </Box>

            {/* Quick Filters */}
            <Box sx={{ px: 2, pb: 2, display: 'flex', gap: 1, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
                <Chip icon={<BusinessIcon style={{ color: colors.primary, fontSize: 16 }} />} label={plantFilter || "Todas las Plantas"} onClick={() => {}} variant="outlined" sx={{ borderColor: colors.border, color: plantFilter ? colors.primary : colors.textDim, bgcolor: plantFilter ? `${colors.primary}10` : 'transparent' }} onDelete={plantFilter ? () => setPlantFilter('') : undefined} />
                <Chip icon={<WarehouseIcon style={{ color: colors.primary, fontSize: 16 }} />} label={depotFilter || "Todos los Depósitos"} onClick={() => {}} variant="outlined" sx={{ borderColor: colors.border, color: depotFilter ? colors.primary : colors.textDim, bgcolor: depotFilter ? `${colors.primary}10` : 'transparent' }} onDelete={depotFilter ? () => setDepotFilter('') : undefined} />
            </Box>

            <Box sx={{ p: 2, pb: 1 }}><TextField placeholder="Buscar..." size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} fullWidth InputProps={{ startAdornment: <SearchIcon sx={{ color: colors.textDim, mr: 1 }} />, endAdornment: browserSupportsSpeechRecognition && (<IconButton size="small" onClick={toggleListening} sx={{ color: listening ? colors.danger : colors.textDim }}>{listening ? <MicIcon /> : <MicOffIcon sx={{ opacity: 0.5 }} />}</IconButton>), sx: { bgcolor: colors.inputBg, borderRadius: 2, color: 'white', border: `1px solid ${colors.border}` } }} /></Box>

            {/* Reordered KPIs */}
            <Box sx={{ display: 'flex', overflowX: 'auto', gap: 1, p: 1.5, pt: 0, '&::-webkit-scrollbar': { display: 'none' } }}>
                <KPIButton label="Críticos" value={metrics.critical} icon={NotificationsActiveIcon} color={colors.danger} active={tab === 2} onClick={() => setTab(2)} />
                <KPIButton label="Por Conciliar" value={metrics.unlinked} icon={LinkIcon} color={colors.warning} active={tab === 1} onClick={() => setTab(1)} />
                <KPIButton label="En Curso" value={metrics.pending} icon={AssignmentIcon} color={colors.primary} active={tab === 0} onClick={() => setTab(0)} />
                <KPIButton label="Demoras" value={metrics.delayed} icon={HistoryIcon} color={colors.danger} active={false} onClick={() => { setTab(0); setSearchQuery(''); }} />
            </Box>

            {isLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress sx={{ color: colors.primary }} /></Box> : (
                <Fade in timeout={400}>
                    <Box sx={{ px: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 900, color: colors.textDim, textTransform: 'uppercase', display: 'block' }}>
                                {tab === 2 ? 'MATERIALES Y COMBOS CRÍTICOS' : tab === 1 ? 'REMITOS PENDIENTES DE VINCULACIÓN' : 'ÓRDENES DE COMPRA ACTIVAS'}
                            </Typography>
                            <Button 
                                size="small" 
                                onClick={() => {
                                    if (tab === 2) navigate('/compras/materiales-criticos');
                                    if (tab === 1) navigate('/compras/conciliacion');
                                    if (tab === 0) navigate('/pedidos-compra');
                                }}
                                sx={{ color: colors.primary, fontSize: '0.65rem', fontWeight: 800 }}
                            >
                                Ver Detalle ›
                            </Button>
                        </Box>
                        
                        <List disablePadding>
                            {tab === 2 && (
                                <>
                                    {combos.map((c: any) => <ComboCard key={c.id} combo={c} onBuy={() => setNewOrderOpen(true)} />)}
                                    {alerts.map((a: any) => <ListItem key={a.id} sx={{ bgcolor: colors.cardBg, mb: 1.5, borderRadius: 3, p: 2, border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><WarningAmberIcon sx={{ color: colors.danger, fontSize: 16 }} /><Typography variant="caption" sx={{ color: colors.danger, fontWeight: 900 }}>STOCK BAJO</Typography></Box><Typography variant="caption" sx={{ color: colors.textDim }}>Min: {a.minStock} {a.item?.unidadPrincipal}</Typography></Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.text }}>{a.item?.descripcion}</Typography>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}><Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}><Typography variant="h5" sx={{ fontWeight: 900, color: colors.warning }}>{a.currentStock?.toFixed(1)}</Typography><Typography variant="caption" sx={{ color: colors.textDim }}>{a.item?.unidadPrincipal}</Typography></Box><Button size="small" variant="contained" startIcon={<ShoppingCartIcon />} sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 900, textTransform: 'none', borderRadius: 2, px: 2 }} onClick={() => setNewOrderOpen(true)}>Comprar</Button></Box>
                                    </ListItem>)}
                                    {combos.length === 0 && alerts.length === 0 && <Typography variant="caption" sx={{ p: 4, textAlign: 'center', display: 'block', color: colors.textDim }}>Stock saludable en todos los materiales.</Typography>}
                                </>
                            )}

                            {tab === 1 && (filteredMovs.length > 0 ? filteredMovs.map((m: any) => <UnlinkedMovementCard key={m.id} movement={m} onLinkRequest={(mov: any) => { setSelectedMov(mov); setConciliationOpen(true); }} />) : <Typography variant="caption" sx={{ p: 4, textAlign: 'center', display: 'block', color: colors.textDim }}>{errorUnlinked ? "Error al cargar remitos." : "Depósito al día. No hay remitos por conciliar."}</Typography>)}
                            
                            {tab === 0 && (filteredOrders.length > 0 ? filteredOrders.map((o: any) => (
                                <Box key={o.id} sx={{ position: 'relative' }}>
                                    <PurchaseOrderCard order={o} isExpanded={expandedOrderId === o.id} onToggleExpand={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)} />
                                    {expandedOrderId === o.id && (
                                        <Box sx={{ display: 'flex', gap: 1, px: 2, pb: 2 }}>
                                            <Button size="small" startIcon={<CheckCircleIcon />} sx={{ bgcolor: `${colors.success}20`, color: colors.success, fontWeight: 800, textTransform: 'none', borderRadius: 2 }} onClick={() => updateStatus({ id: o.id, status: 'COMPLETADO' })}>Completar</Button>
                                            <Button size="small" startIcon={<DeleteIcon />} sx={{ bgcolor: `${colors.danger}20`, color: colors.danger, fontWeight: 800, textTransform: 'none', borderRadius: 2 }} onClick={() => { if (window.confirm('¿Eliminar OC?')) deleteOrder(o.id); }}>Eliminar</Button>
                                        </Box>
                                    )}
                                </Box>
                            )) : <Typography variant="caption" sx={{ p: 4, textAlign: 'center', display: 'block', color: colors.textDim }}>No hay órdenes que coincidan</Typography>)}
                        </List>
                    </Box>
                </Fade>
            )}

            <Fab onClick={() => setNewOrderOpen(true)} sx={{ position: 'fixed', bottom: 20, right: 20, bgcolor: colors.primary, color: '#000', '&:hover': { bgcolor: '#6366f1' } }}><AddIcon /></Fab>
            
            <ConciliationDrawer open={conciliationOpen} onClose={() => setConciliationOpen(false)} movement={selectedMov} purchaseOrders={rawOrders} />
            <NewOrderDrawer open={newOrderOpen} onClose={() => setNewOrderOpen(false)} suppliers={suppliers} items={items} />
        </Box>
    );
}

// ... (Rest of the drawer components same as before but integrated)
const PurchaseOrderCard = ({ order, isExpanded, onToggleExpand }: any) => {
    const isDelayed = new Date(order.fechaEntregaEsperada) < new Date() && order.estado !== 'RECIBIDO' && order.estado !== 'COMPLETADO';
    const statusColor = order.estado === 'RECIBIDO' || order.estado === 'COMPLETADO' ? colors.success : order.estado === 'PENDIENTE' ? (isDelayed ? colors.danger : colors.info) : colors.textDim;
    return (
        <Paper elevation={0} sx={{ bgcolor: colors.cardBg, mb: 1.5, borderRadius: 3, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            <ListItem sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }} onClick={onToggleExpand}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={order.numero} size="small" sx={{ bgcolor: `${colors.primary}20`, color: colors.primary, fontWeight: 900, height: 20, fontSize: '0.65rem' }} />
                        {isDelayed && <Chip label="DEMORADA" size="small" sx={{ bgcolor: `${colors.danger}20`, color: colors.danger, fontWeight: 900, height: 18, fontSize: '0.55rem' }} />}
                    </Box>
                    <Typography variant="caption" sx={{ color: colors.textDim }}>{new Date(order.fechaEmision).toLocaleDateString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: `${colors.primary}10`, border: `1px solid ${colors.primary}20` }}><StoreIcon sx={{ color: colors.primary, fontSize: 18 }} /></Avatar>
                        <Box><Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.text, lineHeight: 1.2 }}>{order.supplier?.name || 'S/P'}</Typography><Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.65rem' }}>{order.lines?.length || 0} ítems</Typography></Box>
                    </Box>
                    <IconButton size="small" sx={{ color: colors.textDim }}>{isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}</IconButton>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><CalendarMonthIcon sx={{ color: colors.textDim, fontSize: 12 }} /><Typography variant="caption" sx={{ color: colors.textDim }}>{order.fechaEntregaEsperada ? new Date(order.fechaEntregaEsperada).toLocaleDateString() : 'S/F'}</Typography></Box>
                    <Chip label={order.estado} size="small" sx={{ bgcolor: `${statusColor}20`, color: statusColor, fontWeight: 900, height: 20, fontSize: '0.6rem' }} />
                </Box>
            </ListItem>
            <Collapse in={isExpanded}>
                <Divider sx={{ borderColor: colors.border }} />
                <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.15)' }}>
                    {order.lines?.map((line: any, idx: number) => {
                        const progress = (line.qtyReceived / line.qtyOrdered) * 100;
                        return (
                            <Box key={idx} sx={{ mb: 1.5, pb: 1.5, borderBottom: idx === order.lines.length - 1 ? 'none' : `1px solid ${colors.border}` }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}><Typography variant="caption" sx={{ fontWeight: 800, color: colors.text }}>{line.item?.descripcion}</Typography><Typography variant="caption" sx={{ fontWeight: 800, color: colors.primary }}>{line.qtyOrdered} {line.item?.unidadPrincipal}</Typography></Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><Box sx={{ flex: 1 }}><LinearProgress variant="determinate" value={Math.min(100, progress)} sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { bgcolor: progress >= 100 ? colors.success : colors.info } }} /></Box><Typography variant="caption" sx={{ color: colors.textDim, minWidth: 60, textAlign: 'right', fontSize: '0.6rem' }}>{line.qtyReceived} / {line.qtyOrdered}</Typography></Box>
                            </Box>
                        );
                    })}
                </Box>
            </Collapse>
        </Paper>
    );
};

const UnlinkedMovementCard = ({ movement, onLinkRequest }: any) => (
    <ListItem sx={{ bgcolor: colors.cardBg, mb: 1.5, borderRadius: 3, p: 2, border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><HistoryIcon sx={{ color: colors.warning, fontSize: 16 }} /><Typography variant="caption" sx={{ color: colors.warning, fontWeight: 900 }}>REMITO EN DEPÓSITO</Typography></Box>
            <Typography variant="caption" sx={{ color: colors.textDim }}>{new Date(movement.fecha).toLocaleDateString()}</Typography>
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.text }}>{movement.item?.descripcion}</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Box><Typography variant="caption" sx={{ color: colors.textDim, display: 'block' }}>PROVEEDOR: {movement.supplier?.name || 'S/P'}</Typography><Typography variant="caption" sx={{ color: colors.textDim }}>DOC: {movement.documentoNumero || 'S/N'}</Typography></Box>
            <Box sx={{ textAlign: 'right' }}><Typography variant="subtitle1" sx={{ fontWeight: 900, color: colors.success }}>{movement.qtyPrincipal} kg</Typography><Button size="small" variant="contained" startIcon={<LinkIcon />} sx={{ mt: 0.5, bgcolor: colors.info, color: '#fff', fontWeight: 900, textTransform: 'none', borderRadius: 2, fontSize: '0.65rem' }} onClick={() => onLinkRequest(movement)}>Vincular</Button></Box>
        </Box>
    </ListItem>
);

const NewOrderDrawer = ({ open, onClose, suppliers, items }: any) => {
    const [createOrder, { isLoading: saving }] = useCreatePurchaseOrderMutation();
    const [form, setForm] = useState({ supplierId: '', fechaEmision: new Date().toISOString().split('T')[0], fechaEntregaEsperada: '', observaciones: '' });
    const [lines, setLines] = useState<{ itemId: string; qtyPedido: string }[]>([{ itemId: '', qtyPedido: '' }]);
    const handleAddLine = () => setLines([...lines, { itemId: '', qtyPedido: '' }]);
    const handleRemoveLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
    const handleLineChange = (idx: number, field: string, val: any) => setLines(lines.map((l, i) => i === idx ? { ...l, [field]: val } : l));
    const handleSave = async () => {
        if (!form.supplierId || lines.some(l => !l.itemId || !l.qtyPedido)) { alert('Completá todos los campos.'); return; }
        try { await createOrder({ ...form, lines: lines.map(l => ({ itemId: l.itemId, qtyPedido: Number(l.qtyPedido) })) }).unwrap(); onClose(); setLines([{ itemId: '', qtyPedido: '' }]); setForm({ supplierId: '', fechaEmision: new Date().toISOString().split('T')[0], fechaEntregaEsperada: '', observaciones: '' }); } catch (e: any) { alert(e?.data?.message || 'Error al crear OC'); }
    };
    return (
        <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: colors.bg, color: colors.text, borderTop: `2px solid ${colors.primary}`, borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 3, pb: 6, maxHeight: '90vh' } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}><Typography variant="h5" sx={{ fontWeight: 900, color: colors.primary }}>NUEVA ORDEN DE COMPRA</Typography><IconButton onClick={onClose} sx={{ color: colors.textDim }}><CloseIcon /></IconButton></Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Autocomplete options={suppliers} getOptionLabel={(o: any) => o.name} onChange={(_, v: any) => setForm({ ...form, supplierId: v?.id || '' })} renderInput={(params) => <TextField {...params} label="Proveedor" InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} />} />
                <Box sx={{ display: 'flex', gap: 2 }}><TextField label="Emisión" type="date" fullWidth value={form.fechaEmision} onChange={(e) => setForm({ ...form, fechaEmision: e.target.value })} InputLabelProps={{ sx: { color: colors.textDim }, shrink: true }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} /><TextField label="Entrega Est." type="date" fullWidth value={form.fechaEntregaEsperada} onChange={(e) => setForm({ ...form, fechaEntregaEsperada: e.target.value })} InputLabelProps={{ sx: { color: colors.textDim }, shrink: true }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2 } }} /></Box>
                <Divider sx={{ my: 1, borderColor: colors.border }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="caption" sx={{ fontWeight: 900, color: colors.textDim }}>MATERIALES</Typography><Button size="small" startIcon={<AddIcon />} sx={{ color: colors.primary, fontWeight: 800 }} onClick={handleAddLine}>Agregar Item</Button></Box>
                {lines.map((line, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                        <Autocomplete options={items} getOptionLabel={(o: any) => `${o.codigoInterno} - ${o.descripcion}`} onChange={(_, v: any) => handleLineChange(idx, 'itemId', v?.id || '')} renderInput={(params) => <TextField {...params} label="Material" size="small" InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ ...params.InputProps, sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2, fontSize: '0.8rem' } }} />} sx={{ flex: 3 }} />
                        <TextField label="Cant." type="number" size="small" value={line.qtyPedido} onChange={(e) => handleLineChange(idx, 'qtyPedido', e.target.value)} InputLabelProps={{ sx: { color: colors.textDim } }} InputProps={{ sx: { bgcolor: colors.inputBg, color: colors.text, borderRadius: 2, fontSize: '0.8rem' } }} sx={{ flex: 1 }} />
                        <IconButton size="small" onClick={() => handleRemoveLine(idx)} sx={{ color: colors.danger, mt: 0.5 }}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                ))}
                <Button fullWidth variant="contained" size="large" disabled={saving} startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />} sx={{ mt: 2, bgcolor: colors.primary, color: '#000', fontWeight: 900, borderRadius: 3, py: 1.5 }} onClick={handleSave}>GENERAR ORDEN</Button>
            </Box>
        </Drawer>
    );
};

const ConciliationDrawer = ({ open, onClose, movement, purchaseOrders }: { open: boolean, onClose: () => void, movement: any, purchaseOrders: any[] }) => {
    const [linkMovement, { isLoading: linking }] = useLinkMovementMutation();
    const suggestedLines = useMemo(() => {
        if (!movement) return [];
        return purchaseOrders.filter((o: any) => o.supplierId === movement.supplierId && o.estado !== 'COMPLETADO').flatMap((o: any) => (o.lines || []).map((l: any) => ({ ...l, orderNumero: o.numero, orderId: o.id }))).filter((l: any) => l.itemId === movement.itemId);
    }, [movement, purchaseOrders]);
    const handleLink = async (lineId: string) => { try { await linkMovement({ movementId: movement.id, purchaseOrderLineId: lineId }).unwrap(); alert('¡Vinculación exitosa!'); onClose(); } catch (e) { alert('Error al vincular'); } };
    if (!movement) return null;
    return (
        <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: colors.bg, color: colors.text, borderTop: `2px solid ${colors.info}`, borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 3, pb: 6 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}><Typography variant="h5" sx={{ fontWeight: 900, color: colors.info }}>CONCILIAR REMITO</Typography><IconButton onClick={onClose} sx={{ color: colors.textDim }}><CloseIcon /></IconButton></Box>
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', p: 2, borderRadius: 3, border: `1px solid ${colors.border}`, mb: 3 }}><Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700 }}>REMITO FÍSICO:</Typography><Typography variant="h6" sx={{ fontWeight: 800 }}>{movement.item?.descripcion}</Typography><Typography variant="body2" sx={{ color: colors.success, fontWeight: 900 }}>CANTIDAD: {movement.qtyPrincipal} kg</Typography><Typography variant="caption" sx={{ color: colors.textDim }}>Proveedor: {movement.supplier?.name}</Typography></Box>
            <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 900, mb: 1.5, display: 'block', textTransform: 'uppercase' }}>Órdenes de Compra Sugeridas</Typography>
            <List disablePadding>
                {suggestedLines.length === 0 ? <Typography variant="body2" sx={{ color: colors.danger, textAlign: 'center', p: 4, fontWeight: 700 }}>No hay OCs abiertas para este proveedor y material.</Typography> : suggestedLines.map((line: any) => (
                    <ListItem key={line.id} sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, mb: 1, p: 2, border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' }}>
                        <Box><Typography variant="body2" sx={{ fontWeight: 800, color: colors.primary }}>OC: {line.orderNumero}</Typography><Typography variant="caption" sx={{ color: colors.textDim, display: 'block' }}>Pedido: {line.qtyOrdered} kg | Recibido: {line.qtyReceived} kg</Typography><Typography variant="caption" sx={{ color: colors.warning }}>Pendiente: {line.qtyOrdered - line.qtyReceived} kg</Typography></Box>
                        <Button variant="contained" size="small" disabled={linking} sx={{ bgcolor: colors.info, color: '#fff', fontWeight: 900, borderRadius: 2, textTransform: 'none' }} onClick={() => handleLink(line.id)}>{linking ? '...' : 'Vincular'}</Button>
                    </ListItem>
                ))}
            </List>
        </Drawer>
    );
};
