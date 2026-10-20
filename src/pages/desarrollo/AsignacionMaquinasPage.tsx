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
    MenuItem,
    Select as MuiSelect,
    FormControl,
    InputLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CloseIcon from '@mui/icons-material/Close';
import {
    useGetArticulosConMaquinasQuery,
    useGetArticuloMachineTypesQuery,
    useUpdateArticuloMachineTypeMutation,
    useDeleteArticuloMachineTypeMutation,
    useGetCatalogoMaquinasQuery,
    type ArticuloResumenMaquina,
    type ArticuloMachineTypeDetail,
} from '../../features/desarrollo/api/articulos.api';
import { PageHeader, Spinner } from '../../shared/ui';

export function AsignacionMaquinasPage() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [familiaFilter, setFamiliaFilter] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selectedArticulo, setSelectedArticulo] = useState<ArticuloResumenMaquina | null>(null);

    const { data, isLoading } = useGetArticulosConMaquinasQuery({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        familia: familiaFilter || undefined,
        etapa: 'TEJIDO',
        page: page + 1,
        limit: rowsPerPage,
    });

    const items = data?.items || [];
    const total = data?.total || 0;

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, margin: '0 auto' }}>
            <PageHeader
                title="⚙️ Asignación de Máquinas y Tiempos (Etapa TEJIDO)"
                subtitle="Matriz técnica entre los 899 Artículos de Tejido y los Tipos de Máquina de Tejeduría con tiempos de ciclo (segundos/unidad)"
            />

            {/* Resumen de Control */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                <Card sx={{ p: 2.5, bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                        Artículos de Tejido (Libro1)
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700, mt: 0.5 }}>
                        {total}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Solo artículos de etapa TEJIDO van a tejeduría
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
                        Tiempos Estimados / Prueba
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#f59e0b', fontWeight: 700, mt: 0.5 }}>
                        🟡 Por Familia
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Para simular turnos y ajustar cuando pasen el dato real
                    </Typography>
                </Card>
            </Box>

            {/* Filtros */}
            <Card sx={{ p: 2, mb: 3, bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                        placeholder="Buscar por código de tejido, modelo o descripción..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        size="small"
                        sx={{
                            flex: '1 1 280px',
                            '& .MuiOutlinedInput-root': {
                                bgcolor: '#1e293b',
                                color: '#f8fafc',
                                '& fieldset': { borderColor: '#334155' },
                                '&:hover fieldset': { borderColor: '#475569' },
                            },
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: '#94a3b8' }} />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel sx={{ color: '#94a3b8' }}>Estado de Tiempos</InputLabel>
                        <MuiSelect
                            value={statusFilter}
                            label="Estado de Tiempos"
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                            sx={{ bgcolor: '#1e293b', color: '#f8fafc', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}
                        >
                            <MenuItem value="">Todos</MenuItem>
                            <MenuItem value="CONFIRMADO">🟢 Confirmados</MenuItem>
                            <MenuItem value="ESTIMADO">🟡 Estimados</MenuItem>
                            <MenuItem value="SIN_ASIGNAR">🔴 Sin Asignar</MenuItem>
                        </MuiSelect>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel sx={{ color: '#94a3b8' }}>Familia</InputLabel>
                        <MuiSelect
                            value={familiaFilter}
                            label="Familia"
                            onChange={(e) => { setFamiliaFilter(e.target.value); setPage(0); }}
                            sx={{ bgcolor: '#1e293b', color: '#f8fafc', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}
                        >
                            <MenuItem value="">Todas</MenuItem>
                            <MenuItem value="MEDIA">MEDIA</MenuItem>
                            <MenuItem value="GORRO">GORRO</MenuItem>
                            <MenuItem value="MANGAS">MANGAS</MenuItem>
                            <MenuItem value="VINCHA">VINCHA</MenuItem>
                            <MenuItem value="CUELLO">CUELLO</MenuItem>
                            <MenuItem value="GUANTE">GUANTE</MenuItem>
                        </MuiSelect>
                    </FormControl>
                </Box>
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
                            No se encontraron artículos de tejido con los filtros aplicados.
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#1e293b' }}>
                                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Código Tejido</TableCell>
                                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Descripción</TableCell>
                                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Familia / Modelo</TableCell>
                                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Talle</TableCell>
                                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Máquinas Compatibles</TableCell>
                                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Tiempo Preferido</TableCell>
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
                                            <TableCell sx={{ color: '#60a5fa', fontWeight: 700, fontFamily: 'monospace' }}>
                                                {art.codigo}
                                            </TableCell>
                                            <TableCell sx={{ color: '#cbd5e1' }}>
                                                {art.descripcion}
                                            </TableCell>
                                            <TableCell sx={{ color: '#94a3b8', textAlign: 'center' }}>
                                                {art.familia || '—'} {art.modelo ? `(${art.modelo})` : ''}
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
                                                {art.preferredCycleTimeSeconds
                                                    ? `★ ${art.preferredCycleTimeSeconds} seg`
                                                    : art.avgCycleTimeSeconds
                                                    ? `${art.avgCycleTimeSeconds} seg`
                                                    : '-'}
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
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<PrecisionManufacturingIcon fontSize="small" />}
                                                    onClick={() => setSelectedArticulo(art)}
                                                    sx={{ color: '#38bdf8', borderColor: '#0284c7', textTransform: 'none' }}
                                                >
                                                    Máquinas y Tiempos
                                                </Button>
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
    const { data: catalogoMaquinas = [] } = useGetCatalogoMaquinasQuery('TEJEDURIA');
    const [updateMachineType, { isLoading: isUpdating }] = useUpdateArticuloMachineTypeMutation();
    const [deleteMachineType] = useDeleteArticuloMachineTypeMutation();

    const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
    const [editSec, setEditSec] = useState<string>('');

    // Agregar nueva máquina
    const [newMachineTypeId, setNewMachineTypeId] = useState<string>('');
    const [newCycleSec, setNewCycleSec] = useState<string>('95');
    const [newPreferida, setNewPreferida] = useState<boolean>(false);

    const handleSave = async (m: ArticuloMachineTypeDetail) => {
        const val = parseFloat(editSec);
        if (isNaN(val) || val <= 0) {
            alert('Ingresá un tiempo válido en segundos.');
            return;
        }
        try {
            await updateMachineType({
                articuloId: articulo.id,
                machineTypeId: m.machineTypeId,
                cycleTimeSeconds: val,
                status: 'CONFIRMADO',
                preferida: m.preferida,
            }).unwrap();
            setEditingTypeId(null);
        } catch (err: any) {
            alert('Error al actualizar el tiempo: ' + (err?.data?.message || err.message));
        }
    };

    const handleTogglePreferida = async (m: ArticuloMachineTypeDetail) => {
        try {
            await updateMachineType({
                articuloId: articulo.id,
                machineTypeId: m.machineTypeId,
                cycleTimeSeconds: m.cycleTimeSeconds || 95,
                status: m.status,
                preferida: !m.preferida,
            }).unwrap();
        } catch (err: any) {
            alert('Error al actualizar preferencia');
        }
    };

    const handleDelete = async (m: ArticuloMachineTypeDetail) => {
        if (!window.confirm(`¿Desvincular la máquina ${m.machineTypeName} de ${articulo.codigo}?`)) return;
        try {
            await deleteMachineType({
                articuloId: articulo.id,
                machineTypeId: m.machineTypeId,
            }).unwrap();
        } catch (err: any) {
            alert('Error al eliminar asignación');
        }
    };

    const handleAddNewMachine = async () => {
        if (!newMachineTypeId) {
            alert('Seleccioná un tipo de máquina del catálogo');
            return;
        }
        const val = parseFloat(newCycleSec);
        if (isNaN(val) || val <= 0) {
            alert('Ingresá un tiempo en segundos mayor a 0');
            return;
        }
        try {
            await updateMachineType({
                articuloId: articulo.id,
                machineTypeId: newMachineTypeId,
                cycleTimeSeconds: val,
                status: 'CONFIRMADO',
                preferida: newPreferida || machines.length === 0,
            }).unwrap();
            setNewMachineTypeId('');
        } catch (err: any) {
            alert('Error al agregar máquina');
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
                        {articulo.descripcion} • Familia: {articulo.familia || '—'}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} sx={{ color: '#94a3b8' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                {/* Agregar nueva máquina compatible */}
                <Box sx={{ mb: 3, p: 2, bgcolor: '#1e293b60', border: '1px solid #334155', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#60a5fa', mb: 1.5, fontWeight: 700 }}>
                        ➕ Habilitar nuevo Tipo de Máquina para este Tejido
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        <FormControl size="small" sx={{ flex: '1 1 260px' }}>
                            <InputLabel sx={{ color: '#94a3b8' }}>Tipo de Máquina (Tejeduría)</InputLabel>
                            <MuiSelect
                                value={newMachineTypeId}
                                label="Tipo de Máquina (Tejeduría)"
                                onChange={(e) => setNewMachineTypeId(e.target.value)}
                                sx={{ bgcolor: '#0f172a', color: '#f8fafc' }}
                            >
                                {catalogoMaquinas.map((mt) => (
                                    <MenuItem key={mt.id} value={mt.id}>
                                        {mt.name} ({mt.cantAgujas} ag / {mt.cilindro}" / {mt.puntera})
                                    </MenuItem>
                                ))}
                            </MuiSelect>
                        </FormControl>

                        <TextField
                            label="Tiempo Ciclo (seg)"
                            size="small"
                            type="number"
                            value={newCycleSec}
                            onChange={(e) => setNewCycleSec(e.target.value)}
                            sx={{ width: 140, bgcolor: '#0f172a', '& input': { color: '#f8fafc' }, '& label': { color: '#94a3b8' } }}
                        />

                        <Button
                            variant={newPreferida ? 'contained' : 'outlined'}
                            color="warning"
                            size="small"
                            onClick={() => setNewPreferida(!newPreferida)}
                            sx={{ textTransform: 'none' }}
                        >
                            {newPreferida ? '★ Preferida' : '☆ Marcar Preferida'}
                        </Button>

                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleAddNewMachine}
                            disabled={isUpdating}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            Agregar Máquina
                        </Button>
                    </Box>
                </Box>

                {isLoading ? (
                    <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                        <Spinner />
                    </Box>
                ) : machines.length === 0 ? (
                    <Alert severity="warning" sx={{ bgcolor: '#451a03', color: '#fde68a' }}>
                        Este artículo todavía no tiene tipos de máquina habilitados. Seleccioná uno arriba para asignarlo.
                    </Alert>
                ) : (
                    <TableContainer sx={{ border: '1px solid #1e293b', borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: '#1e293b' }}>
                                <TableRow>
                                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, width: 50 }}>Pref.</TableCell>
                                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600 }}>Tipo de Máquina</TableCell>
                                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Agujas / Cilindro</TableCell>
                                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Tiempo Ciclo</TableCell>
                                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Unid / Turno 8h</TableCell>
                                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>Estado</TableCell>
                                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {machines.map((m: ArticuloMachineTypeDetail) => {
                                    const isEditing = editingTypeId === m.machineTypeId;
                                    const unidTurno = m.cycleTimeSeconds && m.cycleTimeSeconds > 0
                                        ? Math.floor((8 * 3600) / m.cycleTimeSeconds)
                                        : 0;

                                    return (
                                        <TableRow key={m.machineTypeId} sx={{ borderBottom: '1px solid #1e293b', bgcolor: m.preferida ? '#10b98112' : 'transparent' }}>
                                            <TableCell>
                                                <IconButton size="small" onClick={() => handleTogglePreferida(m)} sx={{ color: m.preferida ? '#fbbf24' : '#475569' }}>
                                                    {m.preferida ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                                                </IconButton>
                                            </TableCell>
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
                                                        sx={{ width: 95, '& input': { color: '#f8fafc', textAlign: 'center' }, bgcolor: '#1e293b' }}
                                                    />
                                                ) : (
                                                    `${m.cycleTimeSeconds || '-'} seg`
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ color: '#60a5fa', textAlign: 'center', fontWeight: 700 }}>
                                                {unidTurno > 0 ? `~${unidTurno} un/turno` : '—'}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                <Chip
                                                    label={m.status === 'CONFIRMADO' ? '🟢 Confirmado' : '🟡 Estimado'}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: m.status === 'CONFIRMADO' ? '#064e3b' : '#78350f',
                                                        color: m.status === 'CONFIRMADO' ? '#6ee7b7' : '#fcd34d',
                                                        fontWeight: 600,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                {isEditing ? (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="success"
                                                        disabled={isUpdating}
                                                        onClick={() => handleSave(m)}
                                                    >
                                                        Guardar
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <Tooltip title="Editar tiempo de ciclo">
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
                                                        </Tooltip>
                                                        <Tooltip title="Quitar máquina">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleDelete(m)}
                                                                sx={{ color: '#f87171' }}
                                                            >
                                                                <DeleteOutlineIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
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
