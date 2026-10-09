import { useState } from 'react';
import {
    Box,
    Card,
    Typography,
    TextField,
    InputAdornment,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Tooltip,
    Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CloseIcon from '@mui/icons-material/Close';
import {
    useGetArticulosConMaquinasQuery,
    useGetArticuloMachineTypesQuery,
    useUpdateArticuloMachineTypeMutation,
    type ArticuloResumenMaquina,
    type ArticuloMachineTypeDetail,
} from '../../features/desarrollo/api/articulos.api';
import { PageHeader, Spinner } from '../../shared/ui';

export function AsignacionMaquinasPage() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selectedArticulo, setSelectedArticulo] = useState<ArticuloResumenMaquina | null>(null);

    // Queries
    const { data, isLoading } = useGetArticulosConMaquinasQuery({
        search: search.trim() || undefined,
        page: page + 1,
        limit: rowsPerPage,
    });

    const items = data?.items || [];
    const total = data?.total || 0;

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, margin: '0 auto' }}>
            <PageHeader
                title="⚙️ Asignación de Máquinas y Tiempos"
                subtitle="Matriz de compatibilidad técnica entre Artículos de Tejido (PI) y Tipos de Máquina con tiempos de ciclo"
            />

            {/* Resumen de Control */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                <Card sx={{ p: 2.5, bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                        Artículos Totales (Tejido PI)
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700, mt: 0.5 }}>
                        {total}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Base de productos intermedios
                    </Typography>
                </Card>

                <Card sx={{ p: 2.5, bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                        Con Tiempos Cronometrados
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#10b981', fontWeight: 700, mt: 0.5 }}>
                        🟢 Confirmados
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Toma de tiempos real en planta
                    </Typography>
                </Card>

                <Card sx={{ p: 2.5, bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                        Tiempos Estimados
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#f59e0b', fontWeight: 700, mt: 0.5 }}>
                        🟡 Por Familia
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Calculados por promedio histórico
                    </Typography>
                </Card>
            </Box>

            {/* Filtros */}
            <Card sx={{ p: 2, mb: 3, bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2 }}>
                <TextField
                    placeholder="Buscar por código de artículo o descripción..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                    fullWidth
                    size="small"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: '#94a3b8' }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            bgcolor: '#1e293b',
                            color: '#f8fafc',
                            '& fieldset': { borderColor: '#334155' },
                            '&:hover fieldset': { borderColor: '#475569' },
                        },
                    }}
                />
            </Card>

            {/* Tabla de Artículos */}
            <Card sx={{ bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2, overflow: 'hidden' }}>
                {isLoading ? (
                    <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
                        <Spinner />
                    </Box>
                ) : items.length === 0 ? (
                    <Box sx={{ p: 6, textAlign: 'center' }}>
                        <Typography sx={{ color: '#94a3b8' }}>
                            No se encontraron artículos con los filtros aplicados.
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#1e293b' }}>
                                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Código Artículo</TableCell>
                                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Descripción</TableCell>
                                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Talle</TableCell>
                                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Tipos de Máquina</TableCell>
                                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Tiempo Promedio</TableCell>
                                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Estado</TableCell>
                                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Acciones</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {items.map((art) => (
                                        <TableRow
                                            key={art.id}
                                            hover
                                            sx={{
                                                '&:hover': { bgcolor: '#1e293b80' },
                                                borderBottom: '1px solid #1e293b',
                                            }}
                                        >
                                            <TableCell sx={{ color: '#f8fafc', fontWeight: 600, fontFamily: 'monospace' }}>
                                                {art.codigo}
                                            </TableCell>
                                            <TableCell sx={{ color: '#cbd5e1' }}>
                                                {art.descripcion}
                                            </TableCell>
                                            <TableCell sx={{ color: '#94a3b8', textAlign: 'center' }}>
                                                {art.talle || '-'}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                <Chip
                                                    label={`${art.totalMachineTypes} máquinas`}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: art.totalMachineTypes > 0 ? '#1e3a5f' : '#334155',
                                                        color: art.totalMachineTypes > 0 ? '#60a5fa' : '#94a3b8',
                                                        fontWeight: 600,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ color: '#f8fafc', fontWeight: 600, textAlign: 'center' }}>
                                                {art.avgCycleTimeSeconds ? `${art.avgCycleTimeSeconds} seg` : '-'}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                {art.overallStatus === 'CONFIRMADO' && (
                                                    <Chip
                                                        icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#10b981 !important' }} />}
                                                        label="Confirmado"
                                                        size="small"
                                                        sx={{ bgcolor: '#064e3b', color: '#6ee7b7', fontWeight: 600 }}
                                                    />
                                                )}
                                                {art.overallStatus === 'ESTIMADO' && (
                                                    <Chip
                                                        icon={<HelpOutlineIcon sx={{ fontSize: '14px !important', color: '#f59e0b !important' }} />}
                                                        label="Estimado"
                                                        size="small"
                                                        sx={{ bgcolor: '#78350f', color: '#fcd34d', fontWeight: 600 }}
                                                    />
                                                )}
                                                {art.overallStatus === 'SIN_ASIGNAR' && (
                                                    <Chip
                                                        label="Sin Asignar"
                                                        size="small"
                                                        sx={{ bgcolor: '#450a0a', color: '#fca5a5', fontWeight: 600 }}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                <Tooltip title="Ver y editar máquinas asignadas">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setSelectedArticulo(art)}
                                                        sx={{ color: '#38bdf8' }}
                                                    >
                                                        <PrecisionManufacturingIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TablePagination
                            component="div"
                            count={total}
                            page={page}
                            onPageChange={(_e, newPage) => setPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => {
                                setRowsPerPage(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            labelRowsPerPage="Filas por página"
                            sx={{
                                color: '#94a3b8',
                                borderTop: '1px solid #1e293b',
                                '& .MuiTablePagination-select': { color: '#f8fafc' },
                                '& .MuiTablePagination-selectIcon': { color: '#94a3b8' },
                            }}
                        />
                    </>
                )}
            </Card>

            {/* Modal de Detalle de Máquinas por Artículo */}
            {selectedArticulo && (
                <DetalleArticuloMaquinasModal
                    articulo={selectedArticulo}
                    onClose={() => setSelectedArticulo(null)}
                />
            )}
        </Box>
    );
}

function DetalleArticuloMaquinasModal({
    articulo,
    onClose,
}: {
    articulo: ArticuloResumenMaquina;
    onClose: () => void;
}) {
    const { data: machines = [], isLoading } = useGetArticuloMachineTypesQuery(articulo.id);
    const [updateMachineType, { isLoading: isUpdating }] = useUpdateArticuloMachineTypeMutation();

    const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
    const [editSec, setEditSec] = useState<string>('');

    const handleSave = async (machineTypeId: string) => {
        const val = parseFloat(editSec);
        if (isNaN(val) || val <= 0) return alert('Ingresá un tiempo válido en segundos.');
        try {
            await updateMachineType({
                articuloId: articulo.id,
                machineTypeId,
                cycleTimeSeconds: val,
                status: 'CONFIRMADO',
            }).unwrap();
            setEditingTypeId(null);
        } catch (err: any) {
            alert('Error al actualizar el tiempo: ' + (err?.data?.message || err.message));
        }
    };

    return (
        <Dialog open onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: '#0f172a', color: '#f8fafc', border: '1px solid #1e293b' } }}>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b' }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                        Máquinas Habilitadas: {articulo.codigo}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        {articulo.descripcion}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} sx={{ color: '#94a3b8' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                {isLoading ? (
                    <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                        <Spinner />
                    </Box>
                ) : machines.length === 0 ? (
                    <Alert severity="warning" sx={{ bgcolor: '#451a03', color: '#fde68a' }}>
                        Este artículo todavía no tiene tipos de máquina habilitados en la matriz técnica.
                    </Alert>
                ) : (
                    <TableContainer sx={{ border: '1px solid #1e293b', borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: '#1e293b' }}>
                                <TableRow>
                                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Tipo de Máquina</TableCell>
                                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Agujas / Cilindro</TableCell>
                                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Tiempo Ciclo</TableCell>
                                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Origen</TableCell>
                                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Acción</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {machines.map((m: ArticuloMachineTypeDetail) => {
                                    const isEditing = editingTypeId === m.machineTypeId;
                                    return (
                                        <TableRow key={m.machineTypeId} sx={{ borderBottom: '1px solid #1e293b' }}>
                                            <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>
                                                {m.machineTypeName}
                                            </TableCell>
                                            <TableCell sx={{ color: '#cbd5e1', textAlign: 'center' }}>
                                                {m.cantAgujas} ag / {m.cilindro}" ({m.puntera})
                                            </TableCell>
                                            <TableCell sx={{ color: '#f8fafc', textAlign: 'center', fontWeight: 700 }}>
                                                {isEditing ? (
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        value={editSec}
                                                        onChange={(e) => setEditSec(e.target.value)}
                                                        autoFocus
                                                        sx={{ width: 100, '& input': { color: '#f8fafc', textAlign: 'center' }, bgcolor: '#1e293b' }}
                                                    />
                                                ) : (
                                                    `${m.cycleTimeSeconds || '-'} seg`
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                <Chip
                                                    label={m.timeSource === 'CRONOMETRADO' ? '🟢 Real' : m.timeSource === 'ESTIMADO_FAMILIA' ? '🟡 Estimado' : '⚪ Manual'}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: m.timeSource === 'CRONOMETRADO' ? '#064e3b' : '#78350f',
                                                        color: m.timeSource === 'CRONOMETRADO' ? '#6ee7b7' : '#fcd34d',
                                                        fontWeight: 600,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                {isEditing ? (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="success"
                                                        disabled={isUpdating}
                                                        onClick={() => handleSave(m.machineTypeId)}
                                                    >
                                                        Guardar
                                                    </Button>
                                                ) : (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => {
                                                            setEditingTypeId(m.machineTypeId);
                                                            setEditSec(String(m.cycleTimeSeconds || ''));
                                                        }}
                                                        sx={{ color: '#38bdf8' }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>

            <DialogActions sx={{ borderTop: '1px solid #1e293b', p: 2 }}>
                <Button onClick={onClose} sx={{ color: '#94a3b8' }}>
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
