import { useState, useMemo, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    TextField,
    MenuItem,
    IconButton,
    Chip,
    Table as MuiTable,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ClearIcon from '@mui/icons-material/Clear';
import WarehouseIcon from '@mui/icons-material/Warehouse';

import {
    useGetRemitosEntradaQuery,
    useDeleteRemitoEntradaMutation,
    useLazyGetRemitoEntradaQuery
} from '../../features/warehouse/remitosEntrada/api/remitos-entrada.api';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { RemitoDetailModal } from '../../features/warehouse/remitos/ui/RemitoDetailModal';
import { NuevoRemitoEntradaModal } from '../../features/warehouse/remitosEntrada/ui/NuevoRemitoEntradaModal';
import { PaginationControls, useClientPagination } from '../../shared/pagination';

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

const normalizeText = (text: string) =>
    (text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const clean = String(dateStr).slice(0, 10);
    const parts = clean.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return clean;
};

function DebouncedSearchInput({ value, onChange, delay = 300, ...props }: any) {
    const [localVal, setLocalVal] = useState(value);
    
    useEffect(() => {
        setLocalVal(value);
    }, [value]);

    useEffect(() => {
        const timer = setTimeout(() => {
            onChange(localVal);
        }, delay);
        return () => clearTimeout(timer);
    }, [localVal, delay, onChange]);

    return (
        <TextField
            {...props}
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
        />
    );
}

export default function RemitosEntradaPage() {
    const { data: remitos = [], isLoading, isError } = useGetRemitosEntradaQuery();
    const { data: depots = [] } = useGetDepotsQuery();
    const [deleteRemito] = useDeleteRemitoEntradaMutation();
    const [triggerGetDetail] = useLazyGetRemitoEntradaQuery();

    const [showForm, setShowForm] = useState(false);
    const [selectedRemito, setSelectedRemito] = useState<any>(null);
    const [showDetail, setShowDetail] = useState(false);
    
    const [search, setSearch] = useState('');
    const [selectedDepotId, setSelectedDepotId] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVO' | 'ANULADO'>('ALL');

    const filteredRemitos = useMemo(() => {
        let list = remitos;

        if (statusFilter !== 'ALL') {
            list = list.filter((r: any) => (r.status || 'ACTIVO') === statusFilter);
        }

        if (selectedDepotId) {
            list = list.filter((r: any) => r.depositoId === selectedDepotId || r.deposito?.id === selectedDepotId);
        }

        // Comparación de fechas pura como string ISO para no sufrir el desfase de zona horaria UTC-3
        if (fechaDesde) {
            list = list.filter((r: any) => {
                const rDate = String(r.fecha || r.date || '').slice(0, 10);
                return !rDate || rDate >= fechaDesde;
            });
        }
        if (fechaHasta) {
            list = list.filter((r: any) => {
                const rDate = String(r.fecha || r.date || '').slice(0, 10);
                return !rDate || rDate <= fechaHasta;
            });
        }

        const query = normalizeText(search);
        if (!query) return list;
        const tokens = query.split(/\s+/).filter(Boolean);

        return list.filter((r: any) => {
            const linesContent = (r.lines || []).map((l: any) => {
                const itemCode = l.codigoInterno || l.item?.codigoInterno || '';
                const itemDesc = l.descripcion || l.item?.descripcion || '';
                const itemCat = l.categoria || l.item?.categoria || l.item?.category?.nombre || '';
                const lotNum = l.lotNumber || l.batch?.lote || l.batch?.lotNumber || '';
                const itemSupplier = l.item?.supplier?.name || l.item?.supplierName || l.supplierName || l.batch?.supplier?.name || '';
                const pos = l.posicion?.codigo || '';
                return `${itemCode} ${itemDesc} ${itemCat} ${lotNum} ${itemSupplier} ${pos}`;
            }).join(' ');

            const searchableContent = normalizeText([
                r.numero || '',
                r.documentId || '',
                r.id || '',
                r.partner?.name || r.supplier?.name || r.partnerName || '',
                r.partner?.taxId || r.supplierTaxId || '',
                r.observaciones || '',
                linesContent
            ].join(' '));

            return tokens.every(token => searchableContent.includes(token));
        });
    }, [remitos, search, selectedDepotId, fechaDesde, fechaHasta, statusFilter]);

    const pagination = useClientPagination(filteredRemitos, 25);

    // Resetear a la primera página al cambiar cualquier filtro
    useEffect(() => {
        pagination.setPage(0);
    }, [search, selectedDepotId, fechaDesde, fechaHasta, statusFilter]);

    // Métricas para los KPIs
    const metrics = useMemo(() => {
        let totalKilos = 0;
        let totalBultos = 0;
        let activos = 0;
        let anulados = 0;
        const proveedores = new Set<string>();

        filteredRemitos.forEach((r: any) => {
            if (r.status === 'ANULADO') {
                anulados++;
                return;
            }
            activos++;
            const provName = r.partner?.name || r.supplier?.name;
            if (provName) proveedores.add(provName);

            (r.lines || []).forEach((l: any) => {
                if (l.status !== 'ANULADO') {
                    totalKilos += Number(l.qtyPrincipal || 0);
                    if (l.qtySecundaria) totalBultos += Number(l.qtySecundaria);
                }
            });
        });

        return {
            totalKilos,
            totalBultos,
            activos,
            anulados,
            proveedoresCount: proveedores.size
        };
    }, [filteredRemitos]);

    const handleRowClick = async (remito: any) => {
        try {
            const fullRemito = await triggerGetDetail(remito.id).unwrap();
            setSelectedRemito(fullRemito);
            setShowDetail(true);
        } catch {
            setSelectedRemito(remito);
            setShowDetail(true);
        }
    };

    const handleDelete = async (e: React.MouseEvent, remitoId: string) => {
        e.stopPropagation();
        if (!window.confirm('¿Estás seguro de anular este remito de entrada completo? El stock ingresado se descontará del inventario.')) return;
        try {
            await deleteRemito(remitoId).unwrap();
        } catch (err: any) {
            alert(err?.data?.message || err?.message || 'Error al anular remito de entrada');
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, bgcolor: colors.bg, minHeight: '100vh', color: colors.text }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: colors.primary, letterSpacing: '-0.5px' }}>
                        📥 Remitos de Entrada
                    </Typography>
                    <Typography variant="body2" sx={{ color: colors.textDim, mt: 0.5 }}>
                        Recepción y alta de mercadería, pesaje por bultos y asignación inmediata de posición.
                    </Typography>
                </Box>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={() => setShowForm(true)}
                    sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, borderRadius: 2, px: 2.5, '&:hover': { bgcolor: '#d97706' } }}
                >
                    + Nuevo Ingreso
                </Button>
            </Box>

            {/* KPIs */}
            {!isLoading && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Paper sx={{ flex: '1 1 200px', p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                            Kilos Ingresados
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.primary }}>
                            {metrics.totalKilos.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                            <small style={{ fontSize: '0.8rem', fontWeight: 500 }}>kg</small>
                        </Typography>
                    </Paper>

                    <Paper sx={{ flex: '1 1 200px', p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                            Bultos / Unidades
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.success }}>
                            {metrics.totalBultos.toLocaleString('es-AR')}{' '}
                            <small style={{ fontSize: '0.8rem', fontWeight: 500 }}>un</small>
                        </Typography>
                    </Paper>

                    <Paper sx={{ flex: '1 1 200px', p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                            Remitos Activos
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.info }}>
                            {metrics.activos}{' '}
                            {metrics.anulados > 0 && (
                                <small style={{ fontSize: '0.75rem', fontWeight: 600, color: colors.danger, marginLeft: '6px' }}>
                                    ({metrics.anulados} anulados)
                                </small>
                            )}
                        </Typography>
                    </Paper>

                    <Paper sx={{ flex: '1 1 200px', p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: colors.textDim, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                            Proveedores Distintos
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: colors.text }}>
                            {metrics.proveedoresCount}
                        </Typography>
                    </Paper>
                </Box>
            )}

            {/* Filtros Row */}
            <Paper sx={{ p: 2, bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        select
                        label="Depósito"
                        value={selectedDepotId}
                        onChange={(e) => setSelectedDepotId(e.target.value)}
                        size="small"
                        sx={{ flex: '1 1 180px', '& .MuiInputLabel-root': { color: colors.textDim }, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                    >
                        <MenuItem value=""><em>Todos los depósitos</em></MenuItem>
                        {depots.filter((d: any) => d.activo !== false).map((d: any) => (
                            <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Estado"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        size="small"
                        sx={{ width: '140px', '& .MuiInputLabel-root': { color: colors.textDim }, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                    >
                        <MenuItem value="ALL">Todos</MenuItem>
                        <MenuItem value="ACTIVO">Activos</MenuItem>
                        <MenuItem value="ANULADO">Anulados</MenuItem>
                    </TextField>

                    <DebouncedSearchInput
                        label="Buscar remitos..."
                        placeholder="N° remito, proveedor, código de material, lote..."
                        value={search}
                        onChange={setSearch}
                        size="small"
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ color: colors.textDim, mr: 1, fontSize: '1.2rem' }} />
                        }}
                        sx={{ flex: '2 1 260px', '& .MuiInputLabel-root': { color: colors.textDim }, '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                    />

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                            label="Desde"
                            type="date"
                            size="small"
                            value={fechaDesde}
                            onChange={(e) => setFechaDesde(e.target.value)}
                            InputLabelProps={{ shrink: true, sx: { color: colors.textDim } }}
                            sx={{ width: '145px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                        />
                        <TextField
                            label="Hasta"
                            type="date"
                            size="small"
                            value={fechaHasta}
                            onChange={(e) => setFechaHasta(e.target.value)}
                            InputLabelProps={{ shrink: true, sx: { color: colors.textDim } }}
                            sx={{ width: '145px', '& .MuiOutlinedInput-root': { bgcolor: colors.inputBg, color: 'var(--text-white-dynamic, #fff)', borderRadius: 2 } }}
                        />
                        {(fechaDesde || fechaHasta || search || selectedDepotId || statusFilter !== 'ALL') && (
                            <Button 
                                size="small"
                                startIcon={<ClearIcon />}
                                onClick={() => { setSearch(''); setSelectedDepotId(''); setFechaDesde(''); setFechaHasta(''); setStatusFilter('ALL'); }}
                                sx={{ color: colors.danger, fontWeight: 700, textTransform: 'none', height: '38px', borderRadius: 2 }}
                            >
                                Limpiar
                            </Button>
                        )}
                    </Box>
                </Box>
            </Paper>

            {/* Listado de Remitos */}
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                    <CircularProgress sx={{ color: colors.primary }} />
                </Box>
            ) : isError ? (
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(239, 68, 68, 0.08)', border: `1px solid ${colors.danger}`, borderRadius: 3 }}>
                    <Typography sx={{ color: colors.danger, fontWeight: 700 }}>Error al cargar los remitos. Por favor reintentá.</Typography>
                </Paper>
            ) : filteredRemitos.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center', bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 4 }}>
                    <Typography variant="h6" sx={{ color: colors.text, fontWeight: 800, mb: 1 }}>
                        {search.trim() ? `No se encontraron remitos para "${search}"` : 'Todavía no hay remitos de entrada cargados'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: colors.textDim, mb: 3 }}>
                        Iniciá la recepción de mercadería presionando el botón "+ Nuevo Ingreso".
                    </Typography>
                    <Button 
                        variant="contained" 
                        startIcon={<AddIcon />} 
                        onClick={() => setShowForm(true)}
                        sx={{ bgcolor: colors.primary, color: '#000', fontWeight: 800, borderRadius: 2 }}
                    >
                        + Nuevo Ingreso
                    </Button>
                </Paper>
            ) : (
                <Paper sx={{ bgcolor: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 3, overflow: 'hidden' }}>
                    <TableContainer>
                        <MuiTable sx={{ minWidth: 800 }}>
                            <TableHead sx={{ bgcolor: 'var(--bg-alt-row, rgba(0,0,0,0.25))' }}>
                                <TableRow sx={{ '& th': { color: colors.textDim, fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', py: 1.5, borderBottom: `1px solid ${colors.border}` } }}>
                                    <TableCell>N° Remito</TableCell>
                                    <TableCell>Fecha</TableCell>
                                    <TableCell>Proveedor</TableCell>
                                    <TableCell>Depósito</TableCell>
                                    <TableCell>Materiales / Partidas</TableCell>
                                    <TableCell align="right">Kilos</TableCell>
                                    <TableCell align="right">Bultos</TableCell>
                                    <TableCell align="center">Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pagination.pageItems.map((remito: any) => {
                                    const lines = remito.lines || [];
                                    const activeLines = lines.filter((l: any) => l.status !== 'ANULADO');
                                    const totalKilos = activeLines.reduce((acc: number, l: any) => acc + Number(l.qtyPrincipal || 0), 0);
                                    const totalBultos = activeLines.reduce((acc: number, l: any) => acc + Number(l.qtySecundaria || 0), 0);
                                    const isAnulado = remito.status === 'ANULADO';

                                    return (
                                        <TableRow 
                                            key={remito.id} 
                                            onClick={() => handleRowClick(remito)}
                                            className="hoverable-row"
                                            sx={{ 
                                                cursor: 'pointer',
                                                borderBottom: `1px solid ${colors.border}`,
                                                opacity: isAnulado ? 0.55 : 1,
                                                transition: 'background-color 0.15s ease-in-out',
                                                '& td': { py: 1.4 }
                                            }}
                                        >
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography sx={{ fontWeight: 800, color: isAnulado ? colors.danger : colors.primary, fontSize: '0.85rem', textDecoration: isAnulado ? 'line-through' : 'none' }}>
                                                        {remito.numero || remito.documentId || 'S/N'}
                                                    </Typography>
                                                    <Chip 
                                                        size="small" 
                                                        label={isAnulado ? 'ANULADO' : 'ACTIVO'} 
                                                        sx={{ 
                                                            bgcolor: isAnulado ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', 
                                                            color: isAnulado ? colors.danger : colors.success, 
                                                            fontWeight: 800, 
                                                            fontSize: '0.65rem', 
                                                            height: '20px' 
                                                        }} 
                                                    />
                                                </Box>
                                            </TableCell>

                                            <TableCell sx={{ color: 'var(--text-white-dynamic, #fff)', fontSize: '0.82rem' }}>
                                                {formatDate(remito.fecha || remito.date)}
                                            </TableCell>

                                            <TableCell>
                                                <Typography sx={{ fontWeight: 700, color: 'var(--text-white-dynamic, #fff)', fontSize: '0.82rem' }}>
                                                    {remito.partner?.name || remito.supplier?.name || remito.partnerName || '—'}
                                                </Typography>
                                                {(remito.partner?.taxId || remito.supplierTaxId) && (
                                                    <Typography variant="caption" sx={{ color: colors.textDim, display: 'block', fontSize: '0.7rem' }}>
                                                        CUIT: {remito.partner?.taxId || remito.supplierTaxId}
                                                    </Typography>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                <Chip 
                                                    icon={<WarehouseIcon style={{ fontSize: 13, color: colors.textDim }} />}
                                                    label={remito.deposito?.nombre || 'General'}
                                                    size="small"
                                                    sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: colors.textDim, fontSize: '0.7rem', fontWeight: 600, height: '22px' }}
                                                />
                                            </TableCell>

                                            <TableCell>
                                                <Tooltip title={lines.map((l: any) => `${l.item?.codigoInterno || l.codigoInterno}: ${l.qtyPrincipal} kg`).join(' | ')}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Chip 
                                                            label={`${lines.length} ${lines.length === 1 ? 'material' : 'materiales'}`}
                                                            size="small"
                                                            sx={{ bgcolor: 'rgba(59, 130, 246, 0.12)', color: colors.info, fontWeight: 700, fontSize: '0.72rem' }}
                                                        />
                                                        {lines.length > 0 && lines[0].batch?.lotNumber && (
                                                            <Typography variant="caption" sx={{ color: colors.textDim, fontSize: '0.72rem' }}>
                                                                Lote: {lines[0].batch.lotNumber}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Tooltip>
                                            </TableCell>

                                            <TableCell align="right">
                                                <Typography sx={{ fontWeight: 800, color: colors.primary, fontSize: '0.85rem' }}>
                                                    {totalKilos.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
                                                </Typography>
                                            </TableCell>

                                            <TableCell align="right">
                                                {totalBultos > 0 ? (
                                                    <Typography sx={{ fontWeight: 700, color: colors.success, fontSize: '0.8rem' }}>
                                                        {totalBultos.toLocaleString('es-AR')} un
                                                    </Typography>
                                                ) : (
                                                    <span style={{ color: colors.textDim }}>—</span>
                                                )}
                                            </TableCell>

                                            <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                                    <Tooltip title="Ver Detalle / Imprimir Remito">
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handleRowClick(remito)}
                                                            sx={{ color: colors.info, '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.15)' } }}
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>

                                                    {!isAnulado && (
                                                        <Tooltip title="Anular Remito Completo">
                                                            <IconButton 
                                                                size="small" 
                                                                onClick={(e) => handleDelete(e, remito.id)}
                                                                sx={{ color: colors.danger, '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.15)' } }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </MuiTable>
                    </TableContainer>

                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${colors.border}` }}>
                        <PaginationControls
                            count={filteredRemitos.length}
                            page={pagination.page}
                            pageSize={pagination.pageSize}
                            onPageChange={pagination.setPage}
                            onPageSizeChange={(value) => {
                                pagination.setPageSize(value);
                                pagination.setPage(0);
                            }}
                        />
                    </Box>
                </Paper>
            )}

            {/* Modal de Nuevo Remito de Entrada */}
            {showForm && (
                <NuevoRemitoEntradaModal
                    onClose={() => setShowForm(false)}
                    onSuccess={() => {
                        setShowForm(false);
                    }}
                />
            )}

            {/* Modal de Detalle / Impresión del Remito */}
            {showDetail && selectedRemito && (
                <RemitoDetailModal
                    open={showDetail}
                    onClose={() => {
                        setShowDetail(false);
                        setSelectedRemito(null);
                    }}
                    remito={selectedRemito}
                />
            )}
        </Box>
    );
}
