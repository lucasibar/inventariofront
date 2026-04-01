
import { useState } from 'react';
import {
    Box, Typography, Button, IconButton, Chip,
    Table, TableBody, TableCell, TableHead, TableRow,
    Skeleton, Stack, Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { 
    useGetRemitosEntradaQuery, 
    useDeleteRemitoMutation,
    useLazyGetRemitoEntradaQuery 
} from '../features/remitos/api/remito.api';
import { CreateRemitoForm } from '../features/remitos/ui/CreateRemitoForm';
import { RemitoDetailModal } from '../features/remitos/ui/RemitoDetailModal';

export default function RemitosEntradaPage() {
    const { data: remitos = [], isLoading, isError } = useGetRemitosEntradaQuery();
    const [deleteRemito] = useDeleteRemitoMutation();
    const [showForm, setShowForm] = useState(false);
    const [selectedRemito, setSelectedRemito] = useState<any>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [triggerGetDetail, { isFetching: isFetchingDetail }] = useLazyGetRemitoEntradaQuery();

    const handleRowClick = async (remito: any) => {
        try {
            const fullRemito = await triggerGetDetail(remito.id).unwrap();
            setSelectedRemito(fullRemito);
            setShowDetail(true);
        } catch (err) {
            console.error('Error al cargar detalle del remito', err);
            // Fallback to basic data if detail fetch fails
            setSelectedRemito(remito);
            setShowDetail(true);
        }
    };

    if (showForm) {
        return (
            <Box sx={{ p: { xs: 2, sm: 4 } }}>
                <Box sx={{ mb: 3 }}>
                    <Button
                        onClick={() => setShowForm(false)}
                        color="inherit"
                        size="small"
                        sx={{ fontWeight: 600, mb: 2 }}
                    >
                        ← Volver al Listado
                    </Button>
                </Box>
                <CreateRemitoForm />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 4 } }}>
            {/* Header: No Card, just layout */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-1px' }}>
                        Remitos de Entrada
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                        Listado y gestión de ingresos de mercadería
                    </Typography>
                </Box>
                <Tooltip title="Nuevo Ingreso">
                    <IconButton
                        color="primary"
                        onClick={() => setShowForm(true)}
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2
                        }}
                    >
                        <AddIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* List Section: No outer Card/Paper backgrounnd */}
            {isLoading ? (
                <Stack spacing={2}>
                    {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={60} />)}
                </Stack>
            ) : isError ? (
                <Typography color="error" variant="body2" align="center" sx={{ py: 8 }}>
                    Error al cargar los remitos. Intente nuevamente.
                </Typography>
            ) : remitos.length === 0 ? (
                <Box sx={{
                    py: 12,
                    textAlign: 'center',
                    border: '1px dashed',
                    borderColor: 'divider',
                    borderRadius: 3,
                    backgroundColor: 'transparent'
                }}>
                    <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 800, mb: 1.5, letterSpacing: '-0.5px' }}>
                        Todavía no hay ningún remito cargado en este depósito
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500, maxWidth: 400, mx: 'auto' }}>
                        Inicie una nueva recepción de materiales presionando el botón "+" arriba a la derecha.
                    </Typography>
                </Box>
            ) : (
                <Table sx={{ minWidth: 650 }} aria-label="remitos list">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ color: 'primary.main', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Número</TableCell>
                            <TableCell sx={{ color: 'primary.main', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Fecha</TableCell>
                            <TableCell sx={{ color: 'primary.main', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Proveedor</TableCell>
                            <TableCell sx={{ color: 'primary.main', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Items</TableCell>
                            <TableCell align="right"></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {remitos.map((r: any) => (
                            <TableRow 
                                key={r.id} 
                                hover 
                                onClick={() => handleRowClick(r)}
                                sx={{ 
                                    '&:last-child td, &:last-child th': { border: 0 },
                                    cursor: 'pointer'
                                }}
                            >
                                <TableCell sx={{ fontWeight: 600 }}>{r.numero || r.documentId}</TableCell>
                                <TableCell color="text.secondary">
                                    {new Date(r.fecha || r.date).toLocaleDateString()}
                                </TableCell>
                                <TableCell>{r.supplier?.name || r.provider?.name || '—'}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={`${r.lines?.length || r.items?.length || 0} ítems`}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontWeight: 600, border: '1px solid rgba(0,0,0,0.08)' }}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton 
                                        size="small" 
                                        color="error" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteRemito(r.id);
                                        }}
                                    >
                                        <DeleteIcon fontSize="inherit" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <RemitoDetailModal 
                open={showDetail} 
                onClose={() => setShowDetail(false)} 
                remito={selectedRemito} 
            />
        </Box>
    );
}
