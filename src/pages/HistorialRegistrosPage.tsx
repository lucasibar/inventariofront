import { useState } from 'react';
import { Box, Typography, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, TextField, Grid } from '@mui/material';
import { PageHeader, Spinner } from './common/ui';
import { useGetLogsQuery } from '../entities/performance/api/performanceApi';

const statusColors: Record<string, string> = {
    ACTIVA: '#10b981',
    PARADA: '#ef4444',
    REVISAR: '#eab308',
    VELOCIDAD_REDUCIDA: '#f472b6',
    ELECTRONIC: '#3b82f6',
};

export default function HistorialRegistrosPage() {
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [machineFilter, setMachineFilter] = useState('');

    const { data: logs = [], isLoading } = useGetLogsQuery({ 
        startDate, 
        endDate 
    });

    const filteredLogs = logs.filter(log => {
        if (!machineFilter) return true;
        const numberMatch = log.machine?.number?.toString().includes(machineFilter);
        const codeMatch = log.machine?.codigoInterno?.toLowerCase().includes(machineFilter.toLowerCase());
        return numberMatch || codeMatch;
    });

    return (
        <Box sx={{ p: 3, maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader 
                title="Historial de Producción" 
                subtitle="Registro detallado de cambios de estado, novedades y fallas"
                hideTitleOnMobile={true}
            />

            <Card sx={{ bgcolor: '#1a1a1a', borderRadius: 2, mb: 4, p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            label="Buscar por Máquina (Número o Código)"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={machineFilter}
                            onChange={(e) => setMachineFilter(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': { color: 'white' },
                                '& .MuiInputLabel-root': { color: '#9ca3af' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            label="Fecha Inicio"
                            type="date"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiOutlinedInput-root': { color: 'white' },
                                '& .MuiInputLabel-root': { color: '#9ca3af' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            label="Fecha Fin"
                            type="date"
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                '& .MuiOutlinedInput-root': { color: 'white' },
                                '& .MuiInputLabel-root': { color: '#9ca3af' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4b5563' },
                            }}
                        />
                    </Grid>
                </Grid>
            </Card>

            {isLoading ? (
                <Spinner />
            ) : (
                <TableContainer component={Card} sx={{ bgcolor: '#1a1a1a', borderRadius: 2, maxHeight: 'calc(100vh - 300px)' }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ bgcolor: '#27272a', color: '#e5e7eb', fontWeight: 600 }}>Fecha / Hora</TableCell>
                                <TableCell sx={{ bgcolor: '#27272a', color: '#e5e7eb', fontWeight: 600 }}>Planta</TableCell>
                                <TableCell sx={{ bgcolor: '#27272a', color: '#e5e7eb', fontWeight: 600 }}>Máquina</TableCell>
                                <TableCell sx={{ bgcolor: '#27272a', color: '#e5e7eb', fontWeight: 600 }}>Estado</TableCell>
                                <TableCell sx={{ bgcolor: '#27272a', color: '#e5e7eb', fontWeight: 600 }}>Problema / Tipo</TableCell>
                                <TableCell sx={{ bgcolor: '#27272a', color: '#e5e7eb', fontWeight: 600 }}>Responsable</TableCell>
                                <TableCell sx={{ bgcolor: '#27272a', color: '#e5e7eb', fontWeight: 600 }}>Observaciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ color: '#9ca3af', py: 4 }}>
                                        No se encontraron registros para los filtros seleccionados
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell sx={{ color: '#d1d5db' }}>
                                            {new Date(log.timestamp).toLocaleString()}
                                        </TableCell>
                                        <TableCell sx={{ color: '#d1d5db' }}>{log.machine?.plant?.name || '-'}</TableCell>
                                        <TableCell sx={{ color: '#d1d5db' }}>
                                            Máquina {log.machine?.number} <br/>
                                            <Typography variant="caption" color="text.secondary">
                                                {log.machine?.codigoInterno}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={log.toStatus} 
                                                size="small"
                                                sx={{ 
                                                    bgcolor: `${statusColors[log.toStatus] || '#6b7280'}20`, 
                                                    color: statusColors[log.toStatus] || '#d1d5db',
                                                    border: `1px solid ${statusColors[log.toStatus] || '#6b7280'}50`
                                                }} 
                                            />
                                        </TableCell>
                                        <TableCell sx={{ color: '#d1d5db' }}>{log.failureType || '-'}</TableCell>
                                        <TableCell sx={{ color: '#d1d5db' }}>{log.generatedBy || '-'}</TableCell>
                                        <TableCell sx={{ color: '#9ca3af', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.observation}>
                                            {log.observation || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}
