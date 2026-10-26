import React, { useState, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    Chip,
    TextField,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Slider,
    Tooltip,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Alert,
    CircularProgress,
    Stack,
    Tabs,
    Tab,
} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    ContentCut as SplitIcon,
    Delete as DeleteIcon,
    PlayArrow as PlayIcon,
    CheckCircle as CheckCircleIcon,
    ArrowBack as PrevIcon,
    ArrowForward as NextIcon,
    Today as TodayIcon,
    ViewTimeline as TimelineIcon,
    PrecisionManufacturing as MachineIcon,
    AutoAwesome as MagicIcon,
    Publish as PromoteIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';

import {
    useGetTimelineQuery,
    useGetBacklogQuery,
    useAsignarBloqueMutation,
    useMoverBloqueMutation,
    useSplitBloqueMutation,
    useEliminarBloqueMutation,
    useActualizarEstadoBloqueMutation,
    useGenerarPlanIdealMutation,
    usePromoverPlanIdealMutation,
} from '../../features/produccion/api/programacion.api';
import type {
    BloqueProgramacion,
    BacklogPedidoItem,
    MaquinaTimeline,
} from '../../features/produccion/api/programacion.api';

// Paleta de colores para clientes/marcas
const CLIENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    ADIDAS: { bg: '#e0f2fe', border: '#0284c7', text: '#0369a1' },
    TOPPER: { bg: '#fef3c7', border: '#d97706', text: '#b45309' },
    VANS: { bg: '#fce7f3', border: '#db2777', text: '#be185d' },
    UNDER_ARMOUR: { bg: '#ede9fe', border: '#7c3aed', text: '#6d28d9' },
    DEFAULT: { bg: '#f1f5f9', border: '#64748b', text: '#334155' },
};

function getClientColor(cliente: string) {
    const key = Object.keys(CLIENT_COLORS).find((k) =>
        cliente.toUpperCase().includes(k)
    );
    return key ? CLIENT_COLORS[key] : CLIENT_COLORS.DEFAULT;
}

export default function ProgramacionGanttPage() {
    // Tipo de Plan Activo: 'REAL' (Plan Guía oficial) vs 'IDEAL' (Simulador)
    const [tipoPlanActive, setTipoPlanActive] = useState<'REAL' | 'IDEAL'>('REAL');

    // Rango de fechas: 7 días desde hoy por defecto
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.toISOString().slice(0, 10);
    });

    const [viewDays, setViewDays] = useState<number>(7);
    const [searchBacklog, setSearchBacklog] = useState('');
    const [clienteFilter, setClienteFilter] = useState('TODOS');
    const [searchMachine, setSearchMachine] = useState('');

    // Estado del modal de Split (División)
    const [splitModalOpen, setSplitModalOpen] = useState(false);
    const [selectedBlockForSplit, setSelectedBlockForSplit] = useState<BloqueProgramacion | null>(null);
    const [splitCantidadLote1, setSplitCantidadLote1] = useState<number>(0);
    const [splitCantidadLote2, setSplitCantidadLote2] = useState<number>(0);
    const [splitMaquinaDestino, setSplitMaquinaDestino] = useState<string>('');

    // Estado del modal de "Planificame" (Generar Plan Ideal)
    const [planificameModalOpen, setPlanificameModalOpen] = useState(false);
    const [planificameFechaInicio, setPlanificameFechaInicio] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(6, 0, 0, 0);
        return d.toISOString().slice(0, 10);
    });
    const [planificameDias, setPlanificameDias] = useState<number>(7);

    // Estado del modal de Promover Plan
    const [promoverModalOpen, setPromoverModalOpen] = useState(false);
    const [promoverMaquinaSeleccionada, setPromoverMaquinaSeleccionada] = useState<MaquinaTimeline | null>(null);

    // Rango calculado
    const { desdeStr, hastaStr, daysArray } = useMemo(() => {
        const start = new Date(startDate);
        const days: Date[] = [];
        for (let i = 0; i < viewDays; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            days.push(d);
        }
        const end = new Date(days[days.length - 1]);
        end.setHours(23, 59, 59, 999);

        return {
            desdeStr: start.toISOString(),
            hastaStr: end.toISOString(),
            daysArray: days,
        };
    }, [startDate, viewDays]);

    // Queries RTK
    const {
        data: timelineData,
        isLoading: loadingTimeline,
        refetch: refetchTimeline,
    } = useGetTimelineQuery({ desde: desdeStr, hasta: hastaStr, tipoPlan: tipoPlanActive });

    const {
        data: backlog = [],
        isLoading: loadingBacklog,
        refetch: refetchBacklog,
    } = useGetBacklogQuery({
        cliente: clienteFilter !== 'TODOS' ? clienteFilter : undefined,
        search: searchBacklog || undefined,
    });

    // Mutations
    const [asignarBloque] = useAsignarBloqueMutation();
    const [moverBloque] = useMoverBloqueMutation();
    const [splitBloque, { isLoading: guardandoSplit }] = useSplitBloqueMutation();
    const [eliminarBloque] = useEliminarBloqueMutation();
    const [actualizarEstado] = useActualizarEstadoBloqueMutation();
    const [generarPlanIdeal, { isLoading: generandosePlan }] = useGenerarPlanIdealMutation();
    const [promoverPlanIdeal, { isLoading: promoviendoPlan }] = usePromoverPlanIdealMutation();

    // Filtros de máquinas
    const maquinas = useMemo(() => {
        if (!timelineData?.maquinas) return [];
        return timelineData.maquinas.filter((m) => {
            if (!searchMachine.trim()) return true;
            const term = searchMachine.toLowerCase();
            return (
                String(m.number).includes(term) ||
                m.nombre.toLowerCase().includes(term) ||
                (m.codigoInterno || '').toLowerCase().includes(term)
            );
        });
    }, [timelineData, searchMachine]);

    const bloques = timelineData?.bloques || [];

    // Clientes únicos para filtro
    const clientesList = useMemo(() => {
        const set = new Set<string>();
        backlog.forEach((b) => {
            if (b.cliente) set.add(b.cliente.toUpperCase());
        });
        return Array.from(set).sort();
    }, [backlog]);

    // Navegación de fechas
    const handleShiftDate = (offsetDays: number) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + offsetDays);
        setStartDate(d.toISOString().slice(0, 10));
    };

    const handleGoToday = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        setStartDate(d.toISOString().slice(0, 10));
    };

    // DRAG AND DROP HANDLERS
    const handleDragStartBacklog = (e: React.DragEvent, item: BacklogPedidoItem) => {
        e.dataTransfer.setData(
            'application/json',
            JSON.stringify({
                type: 'BACKLOG_ITEM',
                pedidoId: item.id,
                numeroPedido: item.numeroPedido,
                cliente: item.cliente,
                articuloCodigo: item.articuloCodigo,
                articuloDescripcion: item.articuloDescripcion,
                talle: item.talle,
                cantidadPacks: item.saldoPendienteProgramar || item.saldoPendiente,
            })
        );
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    const handleDragStartBlock = (e: React.DragEvent, block: BloqueProgramacion) => {
        e.dataTransfer.setData(
            'application/json',
            JSON.stringify({
                type: 'EXISTING_BLOCK',
                id: block.id,
                duracionMs: new Date(block.fechaFin).getTime() - new Date(block.fechaInicio).getTime(),
                cantidadProgramadaPacks: block.cantidadProgramadaPacks,
            })
        );
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOverRow = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnRow = async (
        e: React.DragEvent,
        maquina: MaquinaTimeline,
        rowRect: DOMRect
    ) => {
        e.preventDefault();
        const dataStr = e.dataTransfer.getData('application/json');
        if (!dataStr) return;

        try {
            const data = JSON.parse(dataStr);
            const clickX = e.clientX - rowRect.left;
            const totalWidth = rowRect.width;
            const clickRatio = Math.max(0, Math.min(1, clickX / totalWidth));

            const startTime = new Date(desdeStr).getTime();
            const endTime = new Date(hastaStr).getTime();
            const droppedTimestamp = startTime + clickRatio * (endTime - startTime);

            const hourMs = 3600 * 1000;
            const snappedTimestamp = Math.round(droppedTimestamp / hourMs) * hourMs;
            const droppedDate = new Date(snappedTimestamp);

            if (data.type === 'BACKLOG_ITEM') {
                const packs = Number(data.cantidadPacks) || 100;
                const horasEstimadas = Math.max(4, Math.round(packs / 25));
                const fechaFin = new Date(snappedTimestamp + horasEstimadas * hourMs);

                await asignarBloque({
                    tipoPlan: tipoPlanActive,
                    pedidoId: data.pedidoId,
                    numeroPedido: data.numeroPedido,
                    cliente: data.cliente,
                    articuloCodigo: data.articuloCodigo,
                    articuloDescripcion: data.articuloDescripcion,
                    talle: data.talle,
                    maquinaId: maquina.id,
                    fechaInicio: droppedDate.toISOString(),
                    fechaFin: fechaFin.toISOString(),
                    cantidadProgramadaPacks: packs,
                }).unwrap();
            } else if (data.type === 'EXISTING_BLOCK') {
                const duracionMs = Number(data.duracionMs) || 8 * hourMs;
                const nuevaFechaFin = new Date(snappedTimestamp + duracionMs);

                await moverBloque({
                    id: data.id,
                    nuevaMaquinaId: maquina.id,
                    nuevaFechaInicio: droppedDate.toISOString(),
                    nuevaFechaFin: nuevaFechaFin.toISOString(),
                }).unwrap();
            }
        } catch (err: any) {
            alert('Error al programar bloque: ' + (err?.data?.message || err.message));
        }
    };

    // Acciones sobre bloques
    const handleOpenSplit = (block: BloqueProgramacion) => {
        setSelectedBlockForSplit(block);
        const total = Number(block.cantidadProgramadaPacks);
        const mitad = Math.floor(total / 2);
        setSplitCantidadLote1(mitad);
        setSplitCantidadLote2(total - mitad);
        setSplitMaquinaDestino(block.maquinaId);
        setSplitModalOpen(true);
    };

    const handleConfirmSplit = async () => {
        if (!selectedBlockForSplit) return;
        try {
            await splitBloque({
                id: selectedBlockForSplit.id,
                cantidadLoteOriginal: splitCantidadLote1,
                cantidadNuevoLote: splitCantidadLote2,
                nuevaMaquinaId: splitMaquinaDestino || undefined,
            }).unwrap();
            setSplitModalOpen(false);
            setSelectedBlockForSplit(null);
        } catch (err: any) {
            alert('Error al dividir bloque: ' + (err?.data?.message || err.message));
        }
    };

    const handleDeleteBlock = async (id: string) => {
        if (!confirm('¿Deseas desprogramar este bloque y devolverlo al backlog?')) return;
        try {
            await eliminarBloque(id).unwrap();
        } catch (err: any) {
            alert('Error al eliminar bloque: ' + (err?.data?.message || err.message));
        }
    };

    const handleToggleEstado = async (block: BloqueProgramacion) => {
        const nuevoEstado =
            block.estado === 'PROGRAMADO'
                ? 'EN_CURSO'
                : block.estado === 'EN_CURSO'
                ? 'COMPLETADO'
                : 'PROGRAMADO';
        try {
            await actualizarEstado({ id: block.id, estado: nuevoEstado }).unwrap();
        } catch (err: any) {
            alert('Error al cambiar estado: ' + (err?.data?.message || err.message));
        }
    };

    // MOTOR PLANIFICAME
    const handleEjecutarPlanificame = async () => {
        try {
            const res = await generarPlanIdeal({
                fechaInicio: planificameFechaInicio,
                dias: planificameDias,
                cliente: clienteFilter !== 'TODOS' ? clienteFilter : undefined,
            }).unwrap();
            setPlanificameModalOpen(false);
            setTipoPlanActive('IDEAL');
            alert(res.mensaje);
        } catch (err: any) {
            alert('Error al generar Plan Ideal: ' + (err?.data?.message || err.message));
        }
    };

    // PROMOVER A REAL (TOTAL O POR MÁQUINA)
    const handleAbrirPromocionTotal = () => {
        setPromoverMaquinaSeleccionada(null);
        setPromoverModalOpen(true);
    };

    const handleAbrirPromocionMaquina = (maq: MaquinaTimeline) => {
        setPromoverMaquinaSeleccionada(maq);
        setPromoverModalOpen(true);
    };

    const handleConfirmarPromocion = async () => {
        try {
            const res = await promoverPlanIdeal({
                maquinaId: promoverMaquinaSeleccionada ? promoverMaquinaSeleccionada.id : undefined,
                desde: startDate,
            }).unwrap();
            setPromoverModalOpen(false);
            setTipoPlanActive('REAL');
            alert(res.mensaje);
        } catch (err: any) {
            alert('Error al promover plan: ' + (err?.data?.message || err.message));
        }
    };

    // Render de bloques en cada máquina
    const renderBlocksForMachine = (maquinaId: string, rowWidth: number) => {
        const maquinaBloques = bloques.filter((b) => b.maquinaId === maquinaId);
        const startTime = new Date(desdeStr).getTime();
        const endTime = new Date(hastaStr).getTime();
        const totalDuration = endTime - startTime;

        return maquinaBloques.map((block) => {
            const bStart = Math.max(startTime, new Date(block.fechaInicio).getTime());
            const bEnd = Math.min(endTime, new Date(block.fechaFin).getTime());

            if (bEnd <= startTime || bStart >= endTime) return null;

            const leftRatio = (bStart - startTime) / totalDuration;
            const widthRatio = (bEnd - bStart) / totalDuration;

            const leftPx = leftRatio * rowWidth;
            const widthPx = Math.max(75, widthRatio * rowWidth);

            const colors = getClientColor(block.cliente);

            return (
                <Box
                    key={block.id}
                    draggable
                    onDragStart={(e) => handleDragStartBlock(e, block)}
                    sx={{
                        position: 'absolute',
                        left: `${leftPx}px`,
                        width: `${widthPx}px`,
                        top: '4px',
                        bottom: '4px',
                        backgroundColor: colors.bg,
                        border: `2px solid ${
                            block.estado === 'EN_CURSO'
                                ? '#16a34a'
                                : block.estado === 'COMPLETADO'
                                ? '#475569'
                                : colors.border
                        }`,
                        borderRadius: '6px',
                        padding: '2px 6px',
                        overflow: 'hidden',
                        cursor: 'grab',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                        transition: 'transform 0.1s, box-shadow 0.1s',
                        '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.18)',
                            zIndex: 10,
                            '& .block-actions': {
                                opacity: 1,
                            },
                        },
                    }}
                >
                    {/* Header del Bloque */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 'bold',
                                color: colors.text,
                                fontSize: '0.72rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {block.numeroPedido}
                        </Typography>

                        {/* Botones de acción contextuales */}
                        <Box
                            className="block-actions"
                            sx={{
                                opacity: 0,
                                transition: 'opacity 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                            }}
                        >
                            {/* Dividir (Split) */}
                            <Tooltip title="Dividir Lote (Split)">
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenSplit(block);
                                    }}
                                    sx={{ p: '1px', color: '#0284c7', bgcolor: 'rgba(255,255,255,0.8)' }}
                                >
                                    <SplitIcon sx={{ fontSize: '0.85rem' }} />
                                </IconButton>
                            </Tooltip>

                            {/* Cambiar Estado */}
                            <Tooltip title={`Estado: ${block.estado}. Clic para avanzar`}>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleEstado(block);
                                    }}
                                    sx={{ p: '1px', color: '#16a34a', bgcolor: 'rgba(255,255,255,0.8)' }}
                                >
                                    {block.estado === 'COMPLETADO' ? (
                                        <CheckCircleIcon sx={{ fontSize: '0.85rem' }} />
                                    ) : (
                                        <PlayIcon sx={{ fontSize: '0.85rem' }} />
                                    )}
                                </IconButton>
                            </Tooltip>

                            {/* Eliminar */}
                            <Tooltip title="Desprogramar (Volver al Backlog)">
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteBlock(block.id);
                                    }}
                                    sx={{ p: '1px', color: '#dc2626', bgcolor: 'rgba(255,255,255,0.8)' }}
                                >
                                    <DeleteIcon sx={{ fontSize: '0.85rem' }} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    {/* Detalle del artículo y cantidad */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <Typography
                            variant="caption"
                            sx={{
                                fontSize: '0.68rem',
                                color: '#475569',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '65%',
                            }}
                        >
                            {block.articuloCodigo} {block.talle ? `(${block.talle})` : ''}
                        </Typography>
                        <Chip
                            label={`${block.cantidadProgramadaPacks} pks`}
                            size="small"
                            sx={{
                                height: '16px',
                                fontSize: '0.62rem',
                                fontWeight: 'bold',
                                bgcolor: colors.border,
                                color: '#fff',
                            }}
                        />
                    </Box>
                </Box>
            );
        });
    };

    return (
        <Box sx={{ p: 2, height: 'calc(100vh - 75px)', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* TABS SUPERIORES: PLAN GUÍA REAL VS PLANIFICADOR IDEAL */}
            <Paper elevation={2} sx={{ px: 2, pt: 1, borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap">
                    <Tabs
                        value={tipoPlanActive}
                        onChange={(_, val) => setTipoPlanActive(val)}
                        textColor="primary"
                        indicatorColor="primary"
                    >
                        <Tab
                            value="REAL"
                            label="📌 Plan Guía (Producción Real)"
                            sx={{ fontWeight: 'bold', textTransform: 'none', fontSize: '0.95rem' }}
                        />
                        <Tab
                            value="IDEAL"
                            label="🧪 Planificador Ideal (Simulador)"
                            sx={{ fontWeight: 'bold', textTransform: 'none', fontSize: '0.95rem' }}
                        />
                    </Tabs>

                    {/* Botones de acción principales según el Tab */}
                    {tipoPlanActive === 'IDEAL' ? (
                        <Stack direction="row" spacing={1} sx={{ my: 0.5 }}>
                            <Button
                                variant="contained"
                                color="secondary"
                                startIcon={<MagicIcon />}
                                onClick={() => setPlanificameModalOpen(true)}
                                sx={{ textTransform: 'none', fontWeight: 'bold' }}
                            >
                                🪄 Planificame
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<PromoteIcon />}
                                onClick={handleAbrirPromocionTotal}
                                sx={{ textTransform: 'none', fontWeight: 'bold' }}
                            >
                                🚀 Aplicar TODO al Plan Real
                            </Button>
                        </Stack>
                    ) : (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 0.5 }}>
                            <Chip
                                label="PLAN GUÍA OFICIAL ACTIVO"
                                color="primary"
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                            />
                            <Button
                                variant="outlined"
                                color="secondary"
                                size="small"
                                startIcon={<MagicIcon />}
                                onClick={() => {
                                    setTipoPlanActive('IDEAL');
                                    setPlanificameModalOpen(true);
                                }}
                                sx={{ textTransform: 'none' }}
                            >
                                Probar nuevo plan en Simulador
                            </Button>
                        </Stack>
                    )}
                </Stack>
            </Paper>

            {/* BANNER INFORMATIVO SEGÚN MODO */}
            {tipoPlanActive === 'IDEAL' && (
                <Alert
                    severity="info"
                    sx={{ py: 0.5, border: '1px dashed #7c3aed', bgcolor: '#f5f3ff' }}
                    action={
                        <Button
                            color="secondary"
                            size="small"
                            onClick={() => setPlanificameModalOpen(true)}
                            sx={{ fontWeight: 'bold', textTransform: 'none' }}
                        >
                            Ejecutar Optimización
                        </Button>
                    }
                >
                    <strong>Estás en la hoja del Simulador / Plan Ideal.</strong> Podés generar un plan
                    automático, tocar y ajustar bloques sin alterar la producción real. Cuando estés
                    conforme, aplicalo todo junto o máquina por máquina.
                </Alert>
            )}

            {/* BARRA DE HERRAMIENTAS Y NAVEGACIÓN */}
            <Paper elevation={1} sx={{ p: 1.2, borderRadius: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
                    {/* Título y Navegación de Fechas */}
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <TimelineIcon color="primary" sx={{ fontSize: 28 }} />
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <IconButton size="small" onClick={() => handleShiftDate(-viewDays)}>
                                <PrevIcon fontSize="small" />
                            </IconButton>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<TodayIcon />}
                                onClick={handleGoToday}
                                sx={{ textTransform: 'none' }}
                            >
                                Hoy
                            </Button>
                            <IconButton size="small" onClick={() => handleShiftDate(viewDays)}>
                                <NextIcon fontSize="small" />
                            </IconButton>

                            <TextField
                                type="date"
                                size="small"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                sx={{ width: 140, ml: 1 }}
                            />
                        </Stack>
                    </Stack>

                    {/* Controles de Zoom y Filtros */}
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: 105 }}>
                            <InputLabel>Zoom</InputLabel>
                            <Select
                                value={viewDays}
                                label="Zoom"
                                onChange={(e) => setViewDays(Number(e.target.value))}
                            >
                                <MenuItem value={3}>3 Días</MenuItem>
                                <MenuItem value={7}>7 Días (Semana)</MenuItem>
                                <MenuItem value={14}>14 Días (Quincena)</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            size="small"
                            placeholder="Buscar máquina..."
                            value={searchMachine}
                            onChange={(e) => setSearchMachine(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ width: 150 }}
                        />

                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={() => {
                                refetchTimeline();
                                refetchBacklog();
                            }}
                            sx={{ textTransform: 'none' }}
                        >
                            Actualizar
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            {/* ÁREA PRINCIPAL: BACKLOG LATERAL + GANTT */}
            <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
                {/* PANEL LATERAL: COLA DE PEDIDOS PENDIENTES */}
                <Paper
                    elevation={2}
                    sx={{
                        width: 320,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 2,
                        p: 1.5,
                        overflow: 'hidden',
                    }}
                >
                    <Box sx={{ mb: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                            Pedidos por Tejer
                            <Chip
                                label={backlog.length}
                                size="small"
                                color="primary"
                                sx={{ fontWeight: 'bold', height: 20 }}
                            />
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Arrastrá una orden a cualquier máquina en la línea de tiempo
                        </Typography>

                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <TextField
                                size="small"
                                placeholder="Buscar pedido/art..."
                                value={searchBacklog}
                                onChange={(e) => setSearchBacklog(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                                fullWidth
                            />
                            {clientesList.length > 0 && (
                                <FormControl size="small" sx={{ minWidth: 90 }}>
                                    <Select
                                        value={clienteFilter}
                                        onChange={(e) => setClienteFilter(e.target.value)}
                                    >
                                        <MenuItem value="TODOS">Todas</MenuItem>
                                        {clientesList.map((c) => (
                                            <MenuItem key={c} value={c}>
                                                {c}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                        </Stack>
                    </Box>

                    {/* Lista de tarjetas del Backlog */}
                    <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                        {loadingBacklog ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                <CircularProgress size={28} />
                            </Box>
                        ) : backlog.length === 0 ? (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                No hay pedidos pendientes de programar con estructura lista.
                            </Alert>
                        ) : (
                            <Stack spacing={1}>
                                {backlog.map((item) => {
                                    const colors = getClientColor(item.cliente);
                                    return (
                                        <Paper
                                            key={item.id}
                                            draggable
                                            onDragStart={(e) => handleDragStartBacklog(e, item)}
                                            elevation={1}
                                            sx={{
                                                p: 1.2,
                                                borderRadius: 1.5,
                                                cursor: 'grab',
                                                borderLeft: `4px solid ${colors.border}`,
                                                backgroundColor: '#fff',
                                                transition: 'transform 0.15s, box-shadow 0.15s',
                                                '&:hover': {
                                                    transform: 'translateX(3px)',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                                },
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: colors.text }}>
                                                    {item.numeroPedido}
                                                </Typography>
                                                <Chip
                                                    label={item.prioridad || 'NORMAL'}
                                                    size="small"
                                                    color={
                                                        item.prioridad === 'URGENTE'
                                                            ? 'error'
                                                            : item.prioridad === 'ALTA'
                                                            ? 'warning'
                                                            : 'default'
                                                    }
                                                    sx={{ height: 18, fontSize: '0.62rem', fontWeight: 'bold' }}
                                                />
                                            </Box>

                                            <Typography variant="caption" sx={{ color: '#334155', fontWeight: 500, display: 'block', mt: 0.3 }}>
                                                {item.articuloCodigo} {item.talle ? `· Talle ${item.talle}` : ''}
                                            </Typography>

                                            {item.articuloDescripcion && (
                                                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }} noWrap>
                                                    {item.articuloDescripcion}
                                                </Typography>
                                            )}

                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Cliente: <strong>{item.cliente}</strong>
                                                </Typography>
                                                <Chip
                                                    label={`${item.saldoPendienteProgramar || item.saldoPendiente} pks`}
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: '0.68rem',
                                                        fontWeight: 'bold',
                                                        bgcolor: '#f1f5f9',
                                                        color: '#0f172a',
                                                    }}
                                                />
                                            </Box>
                                        </Paper>
                                    );
                                })}
                            </Stack>
                        )}
                    </Box>
                </Paper>

                {/* EL GANTT PRINCIPAL */}
                <Paper
                    elevation={2}
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 2,
                        overflow: 'hidden',
                        backgroundColor: '#fff',
                        border: tipoPlanActive === 'IDEAL' ? '2px solid #a855f7' : 'none',
                    }}
                >
                    {loadingTimeline ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {/* ENCABEZADO DE LA LÍNEA DE TIEMPO (DÍAS Y TURNOS) */}
                            <Box sx={{ display: 'flex', borderBottom: '2px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                                {/* Columna Fija: Máquina */}
                                <Box
                                    sx={{
                                        width: 185,
                                        minWidth: 185,
                                        p: 1.5,
                                        fontWeight: 'bold',
                                        color: '#334155',
                                        borderRight: '2px solid #e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                        <MachineIcon fontSize="small" />
                                        Máquina
                                    </Box>
                                    {tipoPlanActive === 'IDEAL' && (
                                        <Chip label="Simulación" size="small" color="secondary" sx={{ height: 16, fontSize: '0.55rem' }} />
                                    )}
                                </Box>

                                {/* Columnas de los Días */}
                                <Box sx={{ flex: 1, display: 'flex' }}>
                                    {daysArray.map((day, idx) => {
                                        const isToday =
                                            new Date().toISOString().slice(0, 10) === day.toISOString().slice(0, 10);
                                        return (
                                            <Box
                                                key={idx}
                                                sx={{
                                                    flex: 1,
                                                    borderRight: '1px solid #cbd5e1',
                                                    textAlign: 'center',
                                                    bgcolor: isToday ? '#eff6ff' : 'transparent',
                                                }}
                                            >
                                                <Box sx={{ p: 0.5, borderBottom: '1px solid #e2e8f0' }}>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            fontWeight: 'bold',
                                                            color: isToday ? '#1d4ed8' : '#475569',
                                                        }}
                                                    >
                                                        {day.toLocaleDateString('es-AR', {
                                                            weekday: 'short',
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                        }).toUpperCase()}
                                                    </Typography>
                                                </Box>

                                                <Box sx={{ display: 'flex', fontSize: '0.62rem', color: '#94a3b8' }}>
                                                    <Box sx={{ flex: 1, borderRight: '1px dashed #e2e8f0', py: 0.2 }}>
                                                        M
                                                    </Box>
                                                    <Box sx={{ flex: 1, borderRight: '1px dashed #e2e8f0', py: 0.2 }}>
                                                        T
                                                    </Box>
                                                    <Box sx={{ flex: 1, py: 0.2 }}>N</Box>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>

                            {/* FILAS DE MÁQUINAS Y BLOQUES */}
                            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                                {maquinas.length === 0 ? (
                                    <Box sx={{ p: 4, textAlign: 'center', color: '#64748b' }}>
                                        No se encontraron máquinas para mostrar.
                                    </Box>
                                ) : (
                                    maquinas.map((maq) => (
                                        <Box
                                            key={maq.id}
                                            sx={{
                                                display: 'flex',
                                                minHeight: 54,
                                                borderBottom: '1px solid #e2e8f0',
                                                '&:hover': { bgcolor: '#f8fafc' },
                                            }}
                                        >
                                            {/* Cabecera de Máquina */}
                                            <Box
                                                sx={{
                                                    width: 185,
                                                    minWidth: 185,
                                                    p: 1,
                                                    borderRight: '2px solid #e2e8f0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    bgcolor: '#fff',
                                                }}
                                            >
                                                <Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                            M#{maq.number}
                                                        </Typography>
                                                        <Chip
                                                            label={maq.status || 'ACTIVA'}
                                                            size="small"
                                                            color={maq.status === 'ACTIVA' ? 'success' : 'default'}
                                                            sx={{ height: 16, fontSize: '0.58rem', fontWeight: 'bold' }}
                                                        />
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 110, display: 'block' }}>
                                                        {maq.nombre}
                                                    </Typography>
                                                </Box>

                                                {/* Botón para aplicar solo esta máquina en modo IDEAL */}
                                                {tipoPlanActive === 'IDEAL' && (
                                                    <Tooltip title={`Aplicar solo M#${maq.number} al Plan Real`}>
                                                        <IconButton
                                                            size="small"
                                                            color="success"
                                                            onClick={() => handleAbrirPromocionMaquina(maq)}
                                                            sx={{ p: 0.5, bgcolor: '#f0fdf4', '&:hover': { bgcolor: '#dcfce7' } }}
                                                        >
                                                            <PromoteIcon sx={{ fontSize: '1rem' }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>

                                            {/* Carril de la Línea de Tiempo (Drop Target) */}
                                            <Box
                                                sx={{
                                                    flex: 1,
                                                    position: 'relative',
                                                    display: 'flex',
                                                }}
                                                onDragOver={handleDragOverRow}
                                                onDrop={(e) =>
                                                    handleDropOnRow(e, maq, e.currentTarget.getBoundingClientRect())
                                                }
                                            >
                                                {/* Guías de fondo de días */}
                                                {daysArray.map((_, idx) => (
                                                    <Box
                                                        key={idx}
                                                        sx={{
                                                            flex: 1,
                                                            borderRight: '1px solid #e2e8f0',
                                                            display: 'flex',
                                                        }}
                                                    >
                                                        <Box sx={{ flex: 1, borderRight: '1px dashed #f1f5f9' }} />
                                                        <Box sx={{ flex: 1, borderRight: '1px dashed #f1f5f9' }} />
                                                        <Box sx={{ flex: 1 }} />
                                                    </Box>
                                                ))}

                                                {/* Bloques Programados */}
                                                {renderBlocksForMachine(maq.id, e_rowWidth())}
                                            </Box>
                                        </Box>
                                    ))
                                )}
                            </Box>
                        </Box>
                    )}
                </Paper>
            </Box>

            {/* MODAL PARA DIVIDIR BLOQUE (SPLIT) */}
            <Dialog open={splitModalOpen} onClose={() => setSplitModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SplitIcon color="primary" />
                    Dividir Lote de Producción (Split)
                </DialogTitle>
                <DialogContent dividers>
                    {selectedBlockForSplit && (
                        <Stack spacing={3}>
                            <Alert severity="info">
                                Orden: <strong>#{selectedBlockForSplit.numeroPedido}</strong> · Artículo:{' '}
                                <strong>{selectedBlockForSplit.articuloCodigo}</strong> · Total original:{' '}
                                <strong>{selectedBlockForSplit.cantidadProgramadaPacks} packs</strong>
                            </Alert>

                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    Distribución de Cantidades:
                                </Typography>
                                <Slider
                                    value={splitCantidadLote1}
                                    min={1}
                                    max={Number(selectedBlockForSplit.cantidadProgramadaPacks) - 1}
                                    onChange={(_, val) => {
                                        const n = val as number;
                                        setSplitCantidadLote1(n);
                                        setSplitCantidadLote2(
                                            Number(selectedBlockForSplit.cantidadProgramadaPacks) - n
                                        );
                                    }}
                                    valueLabelDisplay="auto"
                                />
                            </Box>

                            <Stack direction="row" spacing={2}>
                                <TextField
                                    label="Lote 1 (Permanece en máquina)"
                                    type="number"
                                    value={splitCantidadLote1}
                                    onChange={(e) => {
                                        const n = Math.max(1, Number(e.target.value));
                                        setSplitCantidadLote1(n);
                                        setSplitCantidadLote2(
                                            Number(selectedBlockForSplit.cantidadProgramadaPacks) - n
                                        );
                                    }}
                                    fullWidth
                                />
                                <TextField
                                    label="Lote 2 (Nueva fracción)"
                                    type="number"
                                    value={splitCantidadLote2}
                                    onChange={(e) => {
                                        const n = Math.max(1, Number(e.target.value));
                                        setSplitCantidadLote2(n);
                                        setSplitCantidadLote1(
                                            Number(selectedBlockForSplit.cantidadProgramadaPacks) - n
                                        );
                                    }}
                                    fullWidth
                                />
                            </Stack>

                            <FormControl fullWidth>
                                <InputLabel>Máquina Destino para Lote 2</InputLabel>
                                <Select
                                    value={splitMaquinaDestino}
                                    label="Máquina Destino para Lote 2"
                                    onChange={(e) => setSplitMaquinaDestino(e.target.value)}
                                >
                                    {maquinas.map((m) => (
                                        <MenuItem key={m.id} value={m.id}>
                                            M#{m.number} - {m.nombre} ({m.status})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSplitModalOpen(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleConfirmSplit}
                        disabled={guardandoSplit || splitCantidadLote1 <= 0 || splitCantidadLote2 <= 0}
                    >
                        {guardandoSplit ? 'Dividiendo...' : 'Confirmar División'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* MODAL PARA "PLANIFICAME" (GENERAR PLAN IDEAL) */}
            <Dialog open={planificameModalOpen} onClose={() => setPlanificameModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MagicIcon color="secondary" />
                    Generar Plan Ideal Automático
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2.5}>
                        <Alert severity="info" sx={{ fontSize: '0.82rem' }}>
                            El motor cruzará los pedidos pendientes con la <strong>matriz de compatibilidad de máquinas</strong> y <strong>cadencias de ciclo</strong>, minimizando tiempos de cambio de hilado.
                        </Alert>

                        <TextField
                            label="Fecha de Inicio de Planificación"
                            type="date"
                            value={planificameFechaInicio}
                            onChange={(e) => setPlanificameFechaInicio(e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />

                        <FormControl fullWidth>
                            <InputLabel>Horizonte de Planificación</InputLabel>
                            <Select
                                value={planificameDias}
                                label="Horizonte de Planificación"
                                onChange={(e) => setPlanificameDias(Number(e.target.value))}
                            >
                                <MenuItem value={3}>3 Días</MenuItem>
                                <MenuItem value={7}>7 Días (1 semana)</MenuItem>
                                <MenuItem value={14}>14 Días (2 semanas)</MenuItem>
                                <MenuItem value={21}>21 Días (3 semanas)</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPlanificameModalOpen(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<MagicIcon />}
                        onClick={handleEjecutarPlanificame}
                        disabled={generandosePlan}
                    >
                        {generandosePlan ? 'Calculando...' : 'Planificar Automáticamente'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* MODAL PARA CONFIRMAR PROMOCIÓN A PLAN REAL */}
            <Dialog open={promoverModalOpen} onClose={() => setPromoverModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="warning" />
                    Confirmar Aplicación al Plan Real
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                        {promoverMaquinaSeleccionada ? (
                            <>
                                Vas a reemplazar la programación futura de la{' '}
                                <strong>Máquina #{promoverMaquinaSeleccionada.number} ({promoverMaquinaSeleccionada.nombre})</strong>{' '}
                                en el <strong>Plan Real</strong> con los bloques del Simulador.
                            </>
                        ) : (
                            <>
                                Vas a reemplazar la programación de <strong>TODAS las máquinas</strong> en el{' '}
                                <strong>Plan Real</strong> con la propuesta actual del Simulador.
                            </>
                        )}
                    </Typography>
                    <Alert severity="warning" sx={{ fontSize: '0.8rem' }}>
                        Esta acción sobreescribirá la programación a partir de <strong>{startDate}</strong>.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPromoverModalOpen(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<PromoteIcon />}
                        onClick={handleConfirmarPromocion}
                        disabled={promoviendoPlan}
                    >
                        {promoviendoPlan ? 'Aplicando...' : 'Confirmar y Aplicar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// Función auxiliar para calcular el ancho total de la fila
function e_rowWidth(): number {
    return Math.max(800, window.innerWidth - 185 - 320 - 60);
}
