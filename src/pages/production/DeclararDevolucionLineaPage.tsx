import { useState } from 'react';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    Paper,
    Stack,
    TablePagination,
    TextField,
    Typography,
} from '@mui/material';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import { useGetItemsQuery } from '../../features/warehouse/materiales/api/items.api';
import {
    type ProductionLineReturn,
    useDeclareProductionLineReturnMutation,
    useGetProductionLineReturnsQuery,
} from '../../entities/production/api/production.api';
import { PageHeader, PageLoader } from '../../shared/ui';

const errorText = (error: any) => error?.data?.message ?? 'No se pudo registrar la devolución.';

export default function DeclararDevolucionLineaPage() {
    const [item, setItem] = useState<any | null>(null);
    const [quantity, setQuantity] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);
    const [lastReturn, setLastReturn] = useState<ProductionLineReturn | null>(null);
    const itemsQuery = useGetItemsQuery({});
    const pendingQuery = useGetProductionLineReturnsQuery({ page: page + 1, pageSize, status: 'DECLARED' });
    const [declareReturn, declareState] = useDeclareProductionLineReturnMutation();

    const submit = async () => {
        const parsedQuantity = Number(quantity.replace(',', '.'));
        if (!item || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
            setMessage({ severity: 'error', text: 'Seleccioná un material e indicá una cantidad mayor a cero.' });
            return;
        }
        try {
            const result = await declareReturn({ itemId: item.id, quantity: parsedQuantity }).unwrap();
            setLastReturn(result);
            setItem(null);
            setQuantity('');
            setPage(0);
            setMessage({ severity: 'success', text: 'Devolución declarada. El stock todavía no fue modificado.' });
        } catch (error: any) {
            setMessage({ severity: 'error', text: errorText(error) });
        }
    };

    return <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1050, mx: 'auto' }}>
        <PageHeader title="Devolución desde línea" subtitle="El repartidor declara el material y lo deja físicamente en la posición Devolución de línea." />
        {message && <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>}
        {lastReturn && <Alert severity="info" sx={{ mb: 2 }}>
            Imputada al remito <strong>{lastReturn.sourceDocument.numero}</strong>, lote <strong>{lastReturn.batch.lotNumber}</strong>. Dejar en <strong>{lastReturn.returnPosition.codigo}</strong>; Depósito debe confirmar el reingreso.
        </Alert>}

        <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 3, mb: 3 }}>
            <Stack spacing={2}>
                <Autocomplete
                    options={itemsQuery.data ?? []}
                    value={item}
                    onChange={(_, value) => setItem(value)}
                    loading={itemsQuery.isLoading}
                    getOptionLabel={(option: any) => `${option.codigoInterno} · ${option.descripcion}`}
                    isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
                    renderInput={(params) => <TextField {...params} required label="Material devuelto" placeholder="Buscar código o descripción" />}
                />
                <TextField
                    required
                    fullWidth
                    type="number"
                    label="Cantidad devuelta"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    inputProps={{ min: 0.001, step: 0.001 }}
                    helperText={item?.unidadPrincipal ? `Unidad: ${item.unidadPrincipal}` : 'El lote y el remito se obtienen automáticamente.'}
                />
                <Button
                    size="large"
                    variant="contained"
                    startIcon={<AssignmentReturnOutlinedIcon />}
                    disabled={declareState.isLoading}
                    onClick={submit}
                    sx={{ minHeight: 50 }}
                >
                    {declareState.isLoading ? 'Validando...' : 'Declarar devolución'}
                </Button>
            </Stack>
        </Paper>

        <Typography variant="h6" fontWeight={900} sx={{ mb: 1.5 }}>Pendientes en la zona de devolución</Typography>
        {pendingQuery.isLoading ? <PageLoader text="Cargando devoluciones..." /> : !pendingQuery.data?.data.length ? (
            <Alert severity="success">No hay devoluciones esperando a Depósito.</Alert>
        ) : <Stack spacing={1.25}>
            {pendingQuery.data.data.map((entry) => <Paper key={entry.id} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                    <Box>
                        <Typography fontWeight={900}>{entry.item.codigoInterno} · {entry.item.descripcion}</Typography>
                        <Typography variant="body2" color="text.secondary">{Number(entry.quantity).toFixed(3)} {entry.item.unidadPrincipal} · Lote {entry.batch.lotNumber}</Typography>
                        <Typography variant="caption" color="text.secondary">Remito {entry.sourceDocument.numero} · {new Date(entry.createdAt).toLocaleString('es-AR')}</Typography>
                    </Box>
                    <Chip size="small" color="warning" label={entry.returnPosition.codigo} />
                </Stack>
            </Paper>)}
        </Stack>}
        <TablePagination
            component="div"
            count={pendingQuery.data?.total ?? 0}
            page={page}
            onPageChange={(_, value) => setPage(value)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="Por página"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
    </Box>;
}
