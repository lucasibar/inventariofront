import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Button,
    TextField,
    Chip,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableContainer,
    LinearProgress,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    Alert,
    CircularProgress,
    Stack,
} from '@mui/material';
import {
    Add as AddIcon,
    CloudUpload as CloudUploadIcon,
    LocalShipping as ShippingIcon,
    TrendingUp as TrendingUpIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Build as BuildIcon,
    History as HistoryIcon,
    ListAlt as ListAltIcon,
    ArrowForward as ArrowForwardIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';

import {
    useGetPedidosVentasQuery,
    useCrearPedidoVentaMutation,
    useAvanzarEstadioPedidoMutation,
    useEmitirRemitoSalidaMutation,
    useImportarPedidosExcelMutation,
    useGetMovimientosVentasQuery,
    PedidoVenta,
} from '../../features/ventas/api/ventas.api';

export const VentasDashboardPage: React.FC = () => {
    // Pestaña activa
    const [activeTab, setActiveTab] = useState<'PEDIDOS' | 'HISTORIAL' | 'SIN_ESTRUCTURA'>('PEDIDOS');

    // Filtros
    const [search, setSearch] = useState('');
    const [clienteFiltro, setClienteFiltro] = useState<string>('TODOS');
    const [estadoFiltro, setEstadoFiltro] = useState<string>('TODOS');

    // Modales
    const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
    const [modalAvanceOpen, setModalAvanceOpen] = useState(false);
    const [modalRemitoOpen, setModalRemitoOpen] = useState(false);
    const [selectedPedido, setSelectedPedido] = useState<PedidoVenta | null>(null);

    // Formularios
    const [nuevoPedidoForm, setNuevoPedidoForm] = useState({
        numeroPedido: '',
        cliente: 'ADIDAS',
        destino: 'ARGENTINA',
        articuloCodigo: '',
        articuloDescripcion: '',
        talle: 'L',
        paresPorPack: 3,
        packsPedidas: 500,
        fechaEntrega: '',
        observaciones: '',
    });

    const [avanceForm, setAvanceForm] = useState<{
        estadio: 'TEJIDO' | 'COCIDO' | 'PLANCHADO' | 'EMPAQUETADO' | 'ARMADO';
        cantidadPacks: number;
        observaciones: string;
    }>({
        estadio: 'TEJIDO',
        cantidadPacks: 100,
        observaciones: '',
    });

    const [remitoForm, setRemitoForm] = useState({
        numeroRemito: '',
        cantidadPacks: 0,
        observaciones: '',
    });

    // Queries y Mutations RTK
    const {
        data: pedidosData,
        isFetching: isFetchingPedidos,
        refetch: refetchPedidos,
    } = useGetPedidosVentasQuery({
        cliente: clienteFiltro,
        estado: estadoFiltro,
        search,
        soloSinEstructura: activeTab === 'SIN_ESTRUCTURA',
    });

    const {
        data: movimientosData,
        isFetching: isFetchingMovimientos,
        refetch: refetchMovimientos,
    } = useGetMovimientosVentasQuery({ search });

    const [crearPedido, { isLoading: isCreando }] = useCrearPedidoVentaMutation();
    const [avanzarEstadio, { isLoading: isAvanzando }] = useAvanzarEstadioPedidoMutation();
    const [emitirRemito, { isLoading: isRemitiendo }] = useEmitirRemitoSalidaMutation();
    const [importarExcel, { isLoading: isImporting }] = useImportarPedidosExcelMutation();

    const pedidos = pedidosData?.pedidos || [];
    const kpis = pedidosData?.kpis || {
        totalPacksPedidas: 0,
        totalPacksDespachadas: 0,
        totalPacksArmadas: 0,
        totalPacksEnTransaccional: 0,
        articulosSinEstructuraCount: 0,
    };
    const movimientos = movimientosData?.movimientos || [];

    // Clientes únicos para selector
    const clientesList = ['TODOS', 'ADIDAS', 'UNDER ARMOUR', 'VANS', 'NIKE', 'TOPPER'];

    // Manejadores
    const handleCrearPedido = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await crearPedido(nuevoPedidoForm).unwrap();
            setModalNuevoOpen(false);
            setNuevoPedidoForm({
                numeroPedido: '',
                cliente: 'ADIDAS',
                destino: 'ARGENTINA',
                articuloCodigo: '',
                articuloDescripcion: '',
                talle: 'L',
                paresPorPack: 3,
                packsPedidas: 500,
                fechaEntrega: '',
                observaciones: '',
            });
            refetchPedidos();
        } catch (err: any) {
            alert(`Error al crear pedido: ${err?.data?.message || err.message}`);
        }
    };

    const handleAvanzarEstadio = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPedido) return;
        try {
            await avanzarEstadio({
                id: selectedPedido.id,
                estadio: avanceForm.estadio,
                cantidadPacks: Number(avanceForm.cantidadPacks),
                observaciones: avanceForm.observaciones,
            }).unwrap();
            setModalAvanceOpen(false);
            setSelectedPedido(null);
            refetchPedidos();
            refetchMovimientos();
        } catch (err: any) {
            alert(`Error al registrar avance: ${err?.data?.message || err.message}`);
        }
    };

    const handleEmitirRemito = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPedido) return;
        try {
            await emitirRemito({
                id: selectedPedido.id,
                numeroRemito: remitoForm.numeroRemito,
                cantidadPacks: Number(remitoForm.cantidadPacks),
                observaciones: remitoForm.observaciones,
            }).unwrap();
            setModalRemitoOpen(false);
            setSelectedPedido(null);
            refetchPedidos();
            refetchMovimientos();
        } catch (err: any) {
            alert(`Error al emitir remito: ${err?.data?.message || err.message}`);
        }
    };

    const handleImportarExcel = async () => {
        if (!window.confirm('¿Deseas importar y sincronizar los pedidos desde el archivo Consolidado Pedidos DW?')) return;
        try {
            const res = await importarExcel({}).unwrap();
            alert(`Sincronización completa: ${res.importados} importados, ${res.actualizados} actualizados.`);
            refetchPedidos();
        } catch (err: any) {
            alert(`Error en importación: ${err?.data?.message || err.message}`);
        }
    };

    // Helper de color según estado
    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'PENDIENTE_ESTRUCTURA': return '#ef4444';
            case 'CONFIRMADO': return '#3b82f6';
            case 'EN_TEJIDO': return '#8b5cf6';
            case 'EN_COSTURA': return '#06b6d4';
            case 'EN_PLANCHA': return '#f59e0b';
            case 'EMPAQUETADO': return '#10b981';
            case 'ARMADO_DESPACHO': return '#eab308';
            case 'DESPACHADO': return '#10b981';
            default: return '#6b7280';
        }
    };

    return (
        <Box sx={{ p: 3, background: 'var(--bg-primary, #0f1117)', minHeight: '100vh', color: 'var(--text-primary, #f3f4f6)' }}>
            {/* Header */}
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#ec4899', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <TrendingUpIcon fontSize="large" /> Control de Ventas y Pedidos
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-muted, #9ca3af)', mt: 0.5 }}>
                        Seguimiento por PACK: vendido, entregado, en proceso de fabricación y listo para despachar.
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => { refetchPedidos(); refetchMovimientos(); }}
                        disabled={isFetchingPedidos}
                        sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                    >
                        Actualizar
                    </Button>
                    <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<CloudUploadIcon />}
                        onClick={handleImportarExcel}
                        disabled={isImporting}
                        sx={{ borderColor: '#8b5cf6', color: '#c084fc' }}
                    >
                        {isImporting ? 'Importando...' : 'Importar Pedidos DW'}
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setModalNuevoOpen(true)}
                        sx={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', fontWeight: 700 }}
                    >
                        Nuevo Pedido
                    </Button>
                </Stack>
            </Stack>

            {/* Banner de alerta: Artículos sin estructura en Desarrollo */}
            {kpis.articulosSinEstructuraCount > 0 && (
                <Alert
                    severity="error"
                    icon={<WarningIcon fontSize="inherit" />}
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            onClick={() => setActiveTab('SIN_ESTRUCTURA')}
                            sx={{ fontWeight: 700, textDecoration: 'underline' }}
                        >
                            Ver artículos ({kpis.articulosSinEstructuraCount})
                        </Button>
                    }
                    sx={{ mb: 3, borderRadius: '12px', bgcolor: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid #ef4444' }}
                >
                    Hay <strong>{kpis.articulosSinEstructuraCount} artículo(s) nuevo(s) en pedidos</strong> sin receta/estructura BOM en Desarrollo.
                    Compras y Producción requieren que Desarrollo complete la ficha técnica.
                </Alert>
            )}

            {/* KPIs Cards */}
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2.5, bgcolor: 'var(--bg-hover-row, rgba(255,255,255,0.03))', borderRadius: '16px', borderTop: '4px solid #3b82f6' }}>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>
                            Total Packs Vendidos
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#fff' }}>
                            {kpis.totalPacksPedidas.toLocaleString('es-AR')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#60a5fa' }}>
                            En cartera de pedidos
                        </Typography>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2.5, bgcolor: 'var(--bg-hover-row, rgba(255,255,255,0.03))', borderRadius: '16px', borderTop: '4px solid #8b5cf6' }}>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>
                            En Fabricación (Transaccional)
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#c084fc' }}>
                            {kpis.totalPacksEnTransaccional.toLocaleString('es-AR')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#a78bfa' }}>
                            Tejido, Costura, Plancha, Empaque
                        </Typography>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2.5, bgcolor: 'var(--bg-hover-row, rgba(255,255,255,0.03))', borderRadius: '16px', borderTop: '4px solid #eab308' }}>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>
                            Listo para Despacho (Armado)
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#facc15' }}>
                            {kpis.totalPacksArmadas.toLocaleString('es-AR')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#fde047' }}>
                            Embalado esperando remito
                        </Typography>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{ p: 2.5, bgcolor: 'var(--bg-hover-row, rgba(255,255,255,0.03))', borderRadius: '16px', borderTop: '4px solid #10b981' }}>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>
                            Total Despachado (Entregado)
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#34d399' }}>
                            {kpis.totalPacksDespachadas.toLocaleString('es-AR')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6ee7b7' }}>
                            Con Remito de Salida emitido
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Pestañas de Vista */}
            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                <Button
                    variant={activeTab === 'PEDIDOS' ? 'contained' : 'text'}
                    onClick={() => setActiveTab('PEDIDOS')}
                    startIcon={<ListAltIcon />}
                    sx={{ borderRadius: '20px', fontWeight: 700 }}
                >
                    Pedidos en Curso ({pedidos.length})
                </Button>
                <Button
                    variant={activeTab === 'HISTORIAL' ? 'contained' : 'text'}
                    onClick={() => setActiveTab('HISTORIAL')}
                    startIcon={<HistoryIcon />}
                    sx={{ borderRadius: '20px', fontWeight: 700 }}
                >
                    Historial de Movimientos ({movimientos.length})
                </Button>
                <Button
                    variant={activeTab === 'SIN_ESTRUCTURA' ? 'contained' : 'text'}
                    color="error"
                    onClick={() => setActiveTab('SIN_ESTRUCTURA')}
                    startIcon={<BuildIcon />}
                    sx={{ borderRadius: '20px', fontWeight: 700 }}
                >
                    Nuevos sin Estructura ({kpis.articulosSinEstructuraCount})
                </Button>
            </Stack>

            {/* Filtros de Pedidos */}
            {activeTab !== 'HISTORIAL' && (
                <Paper sx={{ p: 2.5, mb: 3, bgcolor: 'var(--bg-alt-row, rgba(255,255,255,0.02))', borderRadius: '16px' }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Buscar por P.O., Artículo, Cliente..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 8 }}>
                            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                                <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 700 }}>
                                    MARCA:
                                </Typography>
                                {clientesList.map((c) => (
                                    <Chip
                                        key={c}
                                        label={c}
                                        clickable
                                        size="small"
                                        color={clienteFiltro === c ? 'primary' : 'default'}
                                        onClick={() => setClienteFiltro(c)}
                                        sx={{ fontWeight: 600 }}
                                    />
                                ))}
                            </Stack>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {/* VISTA 1: TABLA PRINCIPAL DE PEDIDOS EN CURSO */}
            {activeTab !== 'HISTORIAL' && (
                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '16px', overflow: 'hidden' }}>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.04)' }}>
                            <TableRow>
                                <TableCell sx={{ color: '#9ca3af', fontWeight: 700 }}>P.O. / CLIENTE</TableCell>
                                <TableCell sx={{ color: '#9ca3af', fontWeight: 700 }}>ARTÍCULO / TALLE</TableCell>
                                <TableCell sx={{ color: '#9ca3af', fontWeight: 700 }} align="center">PACKS PEDIDAS</TableCell>
                                <TableCell sx={{ color: '#9ca3af', fontWeight: 700 }}>ESTADIO / AVANCE OPERATIVO</TableCell>
                                <TableCell sx={{ color: '#9ca3af', fontWeight: 700 }} align="center">FALTA TERMINAR</TableCell>
                                <TableCell sx={{ color: '#9ca3af', fontWeight: 700 }} align="center">ESTADO</TableCell>
                                <TableCell sx={{ color: '#9ca3af', fontWeight: 700 }} align="center">ACCIONES</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isFetchingPedidos ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                        <CircularProgress size={32} />
                                        <Typography variant="body2" sx={{ mt: 1, color: '#9ca3af' }}>Cargando pedidos de venta...</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : pedidos.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#9ca3af' }}>
                                        No se encontraron pedidos con los filtros aplicados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pedidos.map((p) => {
                                    const faltaDespachar = Math.max(0, Number(p.packsPedidas) - Number(p.packsArmadas));
                                    const paresTotal = Number(p.packsPedidas) * (p.paresPorPack || 1);

                                    return (
                                        <TableRow key={p.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                                            {/* P.O. / Cliente */}
                                            <TableCell>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#fff' }}>
                                                    {p.numeroPedido}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#ec4899', fontWeight: 700 }}>
                                                    {p.cliente}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
                                                    Destino: {p.destino}
                                                </Typography>
                                            </TableCell>

                                            {/* Artículo / Pack */}
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#60a5fa' }}>
                                                    {p.articuloCodigo}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
                                                    {p.articuloDescripcion || p.articulo?.descripcion}
                                                </Typography>
                                                <Stack direction="row" spacing={0.8} sx={{ mt: 0.5 }}>
                                                    <Chip label={`Talle ${p.talle || 'U'}`} size="small" sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(255,255,255,0.08)' }} />
                                                    <Chip label={`${p.paresPorPack || 1} pares/pk`} size="small" sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(139,92,246,0.2)', color: '#c084fc' }} />
                                                    {!p.tieneEstructura && (
                                                        <Chip label="⚠️ Sin Estructura" size="small" sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(239,68,68,0.2)', color: '#f87171', fontWeight: 700 }} />
                                                    )}
                                                </Stack>
                                            </TableCell>

                                            {/* Packs Pedidas */}
                                            <TableCell align="center">
                                                <Typography variant="body1" sx={{ fontWeight: 800 }}>
                                                    {Number(p.packsPedidas).toLocaleString('es-AR')}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                                                    ({paresTotal.toLocaleString('es-AR')} pares)
                                                </Typography>
                                            </TableCell>

                                            {/* Avance por Estadio */}
                                            <TableCell sx={{ minWidth: 260 }}>
                                                {/* Mini indicadores por etapa */}
                                                <Stack direction="row" spacing={0.6} sx={{ mb: 1, fontSize: 11 }}>
                                                    <Tooltip title="Packs tejidas">
                                                        <Chip label={`Tej: ${p.packsTejidas}`} size="small" sx={{ height: 18, fontSize: 10, bgcolor: 'rgba(139,92,246,0.15)', color: '#c084fc' }} />
                                                    </Tooltip>
                                                    <Tooltip title="Packs cocidas">
                                                        <Chip label={`Coc: ${p.packsCocidas}`} size="small" sx={{ height: 18, fontSize: 10, bgcolor: 'rgba(6,182,212,0.15)', color: '#22d3ee' }} />
                                                    </Tooltip>
                                                    <Tooltip title="Packs planchadas">
                                                        <Chip label={`Pla: ${p.packsPlanchadas}`} size="small" sx={{ height: 18, fontSize: 10, bgcolor: 'rgba(245,158,11,0.15)', color: '#fbbf24' }} />
                                                    </Tooltip>
                                                    <Tooltip title="Packs empaquetadas">
                                                        <Chip label={`Emp: ${p.packsEmpaquetadas}`} size="small" sx={{ height: 18, fontSize: 10, bgcolor: 'rgba(16,185,129,0.15)', color: '#34d399' }} />
                                                    </Tooltip>
                                                    <Tooltip title="Packs armadas (listas despacho)">
                                                        <Chip label={`Arm: ${p.packsArmadas}`} size="small" sx={{ height: 18, fontSize: 10, bgcolor: 'rgba(234,179,8,0.2)', color: '#fde047', fontWeight: 700 }} />
                                                    </Tooltip>
                                                </Stack>

                                                {/* Barra de progreso */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={Math.min(100, Number(p.porcentajeCompleto) || 0)}
                                                        sx={{ flexGrow: 1, height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.08)' }}
                                                    />
                                                    <Typography variant="caption" sx={{ fontWeight: 800, minWidth: 35, color: '#34d399' }}>
                                                        {Number(p.porcentajeCompleto || 0).toFixed(0)}%
                                                    </Typography>
                                                </Box>
                                            </TableCell>

                                            {/* Falta Terminar para Despachar */}
                                            <TableCell align="center">
                                                {faltaDespachar === 0 ? (
                                                    <Chip icon={<CheckCircleIcon />} label="100% Listo" color="success" size="small" sx={{ fontWeight: 700 }} />
                                                ) : (
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#fbbf24' }}>
                                                            {faltaDespachar.toLocaleString('es-AR')} pk
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                                                            por armar
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </TableCell>

                                            {/* Estado */}
                                            <TableCell align="center">
                                                <Chip
                                                    label={p.estado.replace('_', ' ')}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: `${getEstadoColor(p.estado)}20`,
                                                        color: getEstadoColor(p.estado),
                                                        fontWeight: 700,
                                                        fontSize: 10,
                                                        border: `1px solid ${getEstadoColor(p.estado)}40`,
                                                    }}
                                                />
                                            </TableCell>

                                            {/* Acciones */}
                                            <TableCell align="center">
                                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                                    <Tooltip title="Avanzar Estadio (Tejido, Costura, etc.)">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => {
                                                                setSelectedPedido(p);
                                                                setAvanceForm({ estadio: 'TEJIDO', cantidadPacks: 100, observaciones: '' });
                                                                setModalAvanceOpen(true);
                                                            }}
                                                            sx={{ color: '#a78bfa', '&:hover': { bgcolor: 'rgba(167,139,250,0.1)' } }}
                                                        >
                                                            <ArrowForwardIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>

                                                    <Tooltip title="Emitir Remito de Salida">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => {
                                                                setSelectedPedido(p);
                                                                setRemitoForm({
                                                                    numeroRemito: '',
                                                                    cantidadPacks: Math.max(1, Number(p.packsArmadas) - Number(p.packsDespachadas)),
                                                                    observaciones: '',
                                                                });
                                                                setModalRemitoOpen(true);
                                                            }}
                                                            sx={{ color: '#34d399', '&:hover': { bgcolor: 'rgba(52,211,153,0.1)' } }}
                                                        >
                                                            <ShippingIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* VISTA 2: HISTORIAL DE MOVIMIENTOS Y AUDITORÍA */}
            {activeTab === 'HISTORIAL' && (
                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.04)' }}>
                            <TableRow>
                                <TableCell sx={{ color: '#9ca3af', fontWeight: 700 }}>FECHA / HORA</TableCell>
                                <TableCell sx={{ color: '#9ca3af', fontWeight: 700 }}>P.O. / PEDIDO</TableCell>
                                <TableCell sx={{ color: '#9ca3af', fontWeight: 700 }}>ARTÍCULO</TableCell>
                                <TableCell sx={{ color: '#9ca3af', fontWeight: 700 }}>TIPO MOVIMIENTO</TableCell>
                                <TableCell sx={{ color: '#9ca3af', fontWeight: 700 }} align="center">PACKS</TableCell>
                                <TableCell sx={{ color: '#9ca3af', fontWeight: 700 }}>REMITO / REF.</TableCell>
                                <TableCell sx={{ color: '#9ca3af', fontWeight: 700 }}>OBSERVACIONES</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isFetchingMovimientos ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                        <CircularProgress size={32} />
                                    </TableCell>
                                </TableRow>
                            ) : movimientos.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#9ca3af' }}>
                                        No hay movimientos registrados en el histórico.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                movimientos.map((m) => (
                                    <TableRow key={m.id} hover>
                                        <TableCell sx={{ color: '#9ca3af', fontSize: 12 }}>
                                            {new Date(m.fecha).toLocaleString('es-AR')}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#fff' }}>
                                            {m.numeroPedido}
                                        </TableCell>
                                        <TableCell sx={{ color: '#60a5fa', fontWeight: 600 }}>
                                            {m.articuloCodigo}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={m.tipoMovimiento}
                                                size="small"
                                                sx={{
                                                    height: 20,
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    bgcolor: m.tipoMovimiento === 'REMITO_SALIDA' ? 'rgba(16,185,129,0.2)' : 'rgba(139,92,246,0.2)',
                                                    color: m.tipoMovimiento === 'REMITO_SALIDA' ? '#34d399' : '#c084fc',
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 800 }}>
                                            {Number(m.cantidadPacks).toLocaleString('es-AR')} pk
                                        </TableCell>
                                        <TableCell sx={{ color: '#34d399', fontWeight: 700 }}>
                                            {m.numeroRemito || m.documentoReferencia || '-'}
                                        </TableCell>
                                        <TableCell sx={{ color: '#9ca3af', fontSize: 12 }}>
                                            {m.observaciones || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* MODAL 1: NUEVO PEDIDO MANUAL */}
            <Dialog open={modalNuevoOpen} onClose={() => setModalNuevoOpen(false)} maxWidth="sm" fullWidth>
                <form onSubmit={handleCrearPedido}>
                    <DialogTitle sx={{ fontWeight: 800 }}>Cargar Nuevo Pedido de Venta</DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <TextField
                                label="Número de P.O. / Pedido"
                                required
                                fullWidth
                                size="small"
                                value={nuevoPedidoForm.numeroPedido}
                                onChange={(e) => setNuevoPedidoForm({ ...nuevoPedidoForm, numeroPedido: e.target.value })}
                            />

                            <Grid container spacing={2}>
                                <Grid size={{ xs: 6 }}>
                                    <TextField
                                        select
                                        label="Cliente / Marca"
                                        fullWidth
                                        size="small"
                                        value={nuevoPedidoForm.cliente}
                                        onChange={(e) => setNuevoPedidoForm({ ...nuevoPedidoForm, cliente: e.target.value })}
                                    >
                                        {clientesList.filter(c => c !== 'TODOS').map(c => (
                                            <MenuItem key={c} value={c}>{c}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <TextField
                                        label="Destino"
                                        fullWidth
                                        size="small"
                                        value={nuevoPedidoForm.destino}
                                        onChange={(e) => setNuevoPedidoForm({ ...nuevoPedidoForm, destino: e.target.value })}
                                    />
                                </Grid>
                            </Grid>

                            <TextField
                                label="Código de Artículo Terminado"
                                required
                                fullWidth
                                size="small"
                                placeholder="Ej: 1367898-001_L_AR o VN000XRZZ95YCASA_M_AR"
                                value={nuevoPedidoForm.articuloCodigo}
                                onChange={(e) => setNuevoPedidoForm({ ...nuevoPedidoForm, articuloCodigo: e.target.value })}
                                helperText="Si es un artículo nuevo, se marcará automáticamente para que Desarrollo le cargue la estructura."
                            />

                            <Grid container spacing={2}>
                                <Grid size={{ xs: 4 }}>
                                    <TextField
                                        label="Talle"
                                        fullWidth
                                        size="small"
                                        value={nuevoPedidoForm.talle}
                                        onChange={(e) => setNuevoPedidoForm({ ...nuevoPedidoForm, talle: e.target.value })}
                                    />
                                </Grid>
                                <Grid size={{ xs: 4 }}>
                                    <TextField
                                        type="number"
                                        label="Pares por Pack"
                                        fullWidth
                                        size="small"
                                        value={nuevoPedidoForm.paresPorPack}
                                        onChange={(e) => setNuevoPedidoForm({ ...nuevoPedidoForm, paresPorPack: Number(e.target.value) })}
                                    />
                                </Grid>
                                <Grid size={{ xs: 4 }}>
                                    <TextField
                                        type="number"
                                        label="Packs Pedidas"
                                        required
                                        fullWidth
                                        size="small"
                                        value={nuevoPedidoForm.packsPedidas}
                                        onChange={(e) => setNuevoPedidoForm({ ...nuevoPedidoForm, packsPedidas: Number(e.target.value) })}
                                    />
                                </Grid>
                            </Grid>

                            <TextField
                                type="date"
                                label="Fecha de Entrega (CRD)"
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                size="small"
                                value={nuevoPedidoForm.fechaEntrega}
                                onChange={(e) => setNuevoPedidoForm({ ...nuevoPedidoForm, fechaEntrega: e.target.value })}
                            />

                            <TextField
                                label="Observaciones"
                                multiline
                                rows={2}
                                fullWidth
                                size="small"
                                value={nuevoPedidoForm.observaciones}
                                onChange={(e) => setNuevoPedidoForm({ ...nuevoPedidoForm, observaciones: e.target.value })}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setModalNuevoOpen(false)} color="inherit">Cancelar</Button>
                        <Button type="submit" variant="contained" disabled={isCreando}>
                            {isCreando ? 'Guardando...' : 'Guardar Pedido'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* MODAL 2: AVANZAR ESTADIO */}
            <Dialog open={modalAvanceOpen} onClose={() => setModalAvanceOpen(false)} maxWidth="xs" fullWidth>
                <form onSubmit={handleAvanzarEstadio}>
                    <DialogTitle sx={{ fontWeight: 800 }}>Avanzar Estadio de Fabricación</DialogTitle>
                    <DialogContent dividers>
                        {selectedPedido && (
                            <Stack spacing={2} sx={{ mt: 1 }}>
                                <Alert severity="info" sx={{ py: 0.5, fontSize: 12 }}>
                                    Pedido: <strong>{selectedPedido.numeroPedido}</strong> ({selectedPedido.articuloCodigo})
                                </Alert>

                                <TextField
                                    select
                                    label="Estadio Operativo"
                                    fullWidth
                                    size="small"
                                    value={avanceForm.estadio}
                                    onChange={(e: any) => setAvanceForm({ ...avanceForm, estadio: e.target.value })}
                                >
                                    <MenuItem value="TEJIDO">1. TEJIDO (Máquinas Tejeduría)</MenuItem>
                                    <MenuItem value="COCIDO">2. COCIDO (Línea Costura)</MenuItem>
                                    <MenuItem value="PLANCHADO">3. PLANCHADO (Hornos Plancha)</MenuItem>
                                    <MenuItem value="EMPAQUETADO">4. EMPAQUETADO (Embolsado/Etiquetas)</MenuItem>
                                    <MenuItem value="ARMADO">5. ARMADO (Cajas listas para Despacho)</MenuItem>
                                </TextField>

                                <TextField
                                    type="number"
                                    label="Cantidad de Packs a Avanzar"
                                    required
                                    fullWidth
                                    size="small"
                                    value={avanceForm.cantidadPacks}
                                    onChange={(e) => setAvanceForm({ ...avanceForm, cantidadPacks: Number(e.target.value) })}
                                />

                                <TextField
                                    label="Observaciones"
                                    multiline
                                    rows={2}
                                    fullWidth
                                    size="small"
                                    value={avanceForm.observaciones}
                                    onChange={(e) => setAvanceForm({ ...avanceForm, observaciones: e.target.value })}
                                />
                            </Stack>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setModalAvanceOpen(false)} color="inherit">Cancelar</Button>
                        <Button type="submit" variant="contained" disabled={isAvanzando}>
                            {isAvanzando ? 'Registrando...' : 'Confirmar Avance'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* MODAL 3: EMITIR REMITO DE SALIDA */}
            <Dialog open={modalRemitoOpen} onClose={() => setModalRemitoOpen(false)} maxWidth="xs" fullWidth>
                <form onSubmit={handleEmitirRemito}>
                    <DialogTitle sx={{ fontWeight: 800 }}>Emitir Remito de Salida</DialogTitle>
                    <DialogContent dividers>
                        {selectedPedido && (
                            <Stack spacing={2} sx={{ mt: 1 }}>
                                <Alert severity="success" sx={{ py: 0.5, fontSize: 12 }}>
                                    Despacho de: <strong>{selectedPedido.cliente}</strong> (P.O. {selectedPedido.numeroPedido})
                                </Alert>

                                <TextField
                                    label="Número de Remito de Salida"
                                    required
                                    fullWidth
                                    size="small"
                                    placeholder="Ej: R-0001-00045892"
                                    value={remitoForm.numeroRemito}
                                    onChange={(e) => setRemitoForm({ ...remitoForm, numeroRemito: e.target.value })}
                                />

                                <TextField
                                    type="number"
                                    label="Cantidad de Packs a Despachar"
                                    required
                                    fullWidth
                                    size="small"
                                    value={remitoForm.cantidadPacks}
                                    onChange={(e) => setRemitoForm({ ...remitoForm, cantidadPacks: Number(e.target.value) })}
                                    helperText={`Packs armadas listas en depósito: ${selectedPedido.packsArmadas}`}
                                />

                                <TextField
                                    label="Observaciones del Despacho"
                                    multiline
                                    rows={2}
                                    fullWidth
                                    size="small"
                                    value={remitoForm.observaciones}
                                    onChange={(e) => setRemitoForm({ ...remitoForm, observaciones: e.target.value })}
                                />
                            </Stack>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setModalRemitoOpen(false)} color="inherit">Cancelar</Button>
                        <Button type="submit" variant="contained" color="success" disabled={isRemitiendo}>
                            {isRemitiendo ? 'Emitiendo...' : 'Confirmar Remito de Salida'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default VentasDashboardPage;
