import { useState, useRef, useEffect } from 'react';
import { Box, Typography, TextField, Button, Grid, Divider, IconButton, Tooltip, MenuItem } from '@mui/material';
import { PageHeader, Card, Badge } from '../../shared/ui';
import { useDispatch, useSelector } from 'react-redux';
import { selectTempRecords, addRecord, clearRecords, removeRecord } from '../../entities/production/model/productionSlice';
import type { ProductionRecord } from '../../entities/production/model/productionSlice';
import { useCreateActualProductionMutation } from '../../entities/production/api/production.api';
import { Delete as DeleteIcon, QrCode as QrCodeIcon, Save as SaveIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';

const todayLocal = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

export default function CargarProduccionPage() {
    const dispatch = useDispatch();
    const tempRecords: ProductionRecord[] = useSelector(selectTempRecords);
    const [createActualProduction, { isLoading: isUploading }] = useCreateActualProductionMutation();

    // Form state
    const [recordDate, setRecordDate] = useState(todayLocal);
    const [shift, setShift] = useState('M');
    const [machineCode, setMachineCode] = useState('');
    const [articleCode, setArticleCode] = useState('');
    const [knitterCode, setKnitterCode] = useState('');
    const [bagCode, setBagCode] = useState('');
    const [firstQuality, setFirstQuality] = useState<string>('');
    const [secondQuality, setSecondQuality] = useState<string>('');
    const [secondMechanical, setSecondMechanical] = useState<string>('');

    // Refs for auto-focus
    const machineRef = useRef<HTMLInputElement>(null);
    const articleRef = useRef<HTMLInputElement>(null);
    const knitterRef = useRef<HTMLInputElement>(null);
    const bagRef = useRef<HTMLInputElement>(null);
    const firstQualityRef = useRef<HTMLInputElement>(null);
    const secondQualityRef = useRef<HTMLInputElement>(null);

    // Initial focus
    useEffect(() => {
        machineRef.current?.focus();
    }, []);

    const handleAddRecord = () => {
        if (!recordDate || !shift || !machineCode || !knitterCode || !bagCode || firstQuality === '') {
            alert('Complete fecha, turno, máquina, tejedor, bolsa y docenas de primera. Las segundas pueden quedar en cero.');
            return;
        }

        const parsedMachineNumber = machineCode.match(/\d+/)?.[0];
        if (!parsedMachineNumber) {
            alert('El código de máquina debe contener su número, por ejemplo 123 o MAC-123.');
            return;
        }

        const newRecord: ProductionRecord = {
            id: crypto.randomUUID(),
            recordDate,
            shift,
            machineCode,
            articleCode,
            knitterCode,
            bagCode,
            firstQuality: Math.max(0, Number(firstQuality)),
            secondQuality: Math.max(0, Math.round(Number(secondQuality || 0))),
            secondMechanical: Math.max(0, Math.round(Number(secondMechanical || 0))),
            timestamp: new Date().toLocaleTimeString('es-AR', { hour12: false }),
        };

        dispatch(addRecord(newRecord));
        resetForm();
    };

    const resetForm = () => {
        setMachineCode('');
        setArticleCode('');
        setKnitterCode('');
        setBagCode('');
        setFirstQuality('');
        setSecondQuality('');
        setSecondMechanical('');
        machineRef.current?.focus();
    };

    const handleUpload = async () => {
        if (tempRecords.length === 0) return;

        let uploaded = 0;
        for (const record of [...tempRecords].reverse()) {
            const machineNumber = Number(record.machineCode.match(/\d+/)?.[0]);
            try {
                await createActualProduction({
                    recordDate: record.recordDate,
                    shift: record.shift,
                    machineNumber,
                    employeeLegajo: record.knitterCode,
                    articleCode: record.articleCode || null,
                    goodDozens: record.firstQuality,
                    secondSocks: record.secondQuality,
                    secondMechanicalSocks: record.secondMechanical,
                    sourceType: 'MANUAL',
                    sourceReference: record.bagCode,
                    notes: `Carga rápida · bolsa ${record.bagCode}`,
                }).unwrap();
                dispatch(removeRecord(record.id));
                uploaded += 1;
            } catch (error: any) {
                const message = error?.data?.message ?? 'No se pudo guardar el registro.';
                alert(`Se guardaron ${uploaded} registro(s). Falló la máquina ${record.machineCode}: ${message}`);
                return;
            }
        }
        alert(`Carga completada: ${uploaded} registro(s) guardados.`);
    };

    const simulateScan = (field: string, value: string) => {
        if (field === 'machine') {
            setMachineCode(value);
            articleRef.current?.focus();
        } else if (field === 'knitter') {
            setKnitterCode(value);
            bagRef.current?.focus();
        } else if (field === 'bag') {
            setBagCode(value);
            firstQualityRef.current?.focus();
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '1200px', margin: '0 auto' }}>
            <PageHeader 
                title="Cargar Producción" 
                subtitle="Registro rápido de producción mediante escaneo de códigos"
            >
                <Button 
                    variant="contained" 
                    startIcon={<CloudUploadIcon />}
                    onClick={handleUpload}
                    sx={{ 
                        bgcolor: '#6366f1', 
                        '&:hover': { bgcolor: '#4f46e5' },
                        borderRadius: '8px',
                        px: 3,
                        py: 1,
                        textTransform: 'none',
                        fontWeight: 600,
                        boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)'
                    }}
                    disabled={tempRecords.length === 0 || isUploading}
                >
                    {isUploading ? 'Guardando...' : `Subir Carga (${tempRecords.length})`}
                </Button>
            </PageHeader>

            <Grid container spacing={3}>
                {/* Panel de Carga */}
                <Grid size={{ xs: 12, lg: 7 }}>
                    <Card style={{ padding: '24px' }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'var(--text-primary, #f3f4f6)', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <QrCodeIcon sx={{ color: '#6366f1' }} /> Nueva Entrada
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        label="Fecha de producción"
                                        type="date"
                                        fullWidth
                                        value={recordDate}
                                        onChange={(e) => setRecordDate(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        select
                                        label="Turno"
                                        fullWidth
                                        value={shift}
                                        onChange={(e) => setShift(e.target.value)}
                                    >
                                        <MenuItem value="M">Día / Mañana</MenuItem>
                                        <MenuItem value="N">Noche</MenuItem>
                                    </TextField>
                                </Grid>
                            </Grid>

                            {/* Escaneos Secuenciales */}
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 3 }}>
                                    <TextField
                                        label="Código Máquina"
                                        fullWidth
                                        value={machineCode}
                                        onChange={(e) => setMachineCode(e.target.value)}
                                        inputRef={machineRef}
                                        onKeyDown={(e) => e.key === 'Enter' && articleRef.current?.focus()}
                                        autoComplete="off"
                                        placeholder="Escanee..."
                                        InputProps={{ sx: { borderRadius: '12px', bgcolor: 'var(--bg-hover-row, rgba(255,255,255,0.03))' } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 3 }}>
                                    <TextField
                                        label="Artículo (opcional)"
                                        fullWidth
                                        value={articleCode}
                                        onChange={(e) => setArticleCode(e.target.value)}
                                        inputRef={articleRef}
                                        onKeyDown={(e) => e.key === 'Enter' && knitterRef.current?.focus()}
                                        autoComplete="off"
                                        placeholder="Solo si hay más de uno"
                                        InputProps={{ sx: { borderRadius: '12px', bgcolor: 'var(--bg-hover-row, rgba(255,255,255,0.03))' } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 3 }}>
                                    <TextField
                                        label="Código Tejedor"
                                        fullWidth
                                        value={knitterCode}
                                        onChange={(e) => setKnitterCode(e.target.value)}
                                        inputRef={knitterRef}
                                        onKeyDown={(e) => e.key === 'Enter' && bagRef.current?.focus()}
                                        autoComplete="off"
                                        placeholder="Escanee..."
                                        InputProps={{ sx: { borderRadius: '12px', bgcolor: 'var(--bg-hover-row, rgba(255,255,255,0.03))' } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 3 }}>
                                    <TextField
                                        label="Código Bolsa"
                                        fullWidth
                                        value={bagCode}
                                        onChange={(e) => setBagCode(e.target.value)}
                                        inputRef={bagRef}
                                        onKeyDown={(e) => e.key === 'Enter' && firstQualityRef.current?.focus()}
                                        autoComplete="off"
                                        placeholder="Escanee..."
                                        InputProps={{ sx: { borderRadius: '12px', bgcolor: 'var(--bg-hover-row, rgba(255,255,255,0.03))' } }}
                                    />
                                </Grid>
                            </Grid>

                            <Divider sx={{ borderColor: 'var(--bg-action-btn, rgba(255,255,255,0.05))' }} />

                            {/* Cantidades */}
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField
                                        label="Docenas de primera"
                                        type="number"
                                        fullWidth
                                        value={firstQuality}
                                        onChange={(e) => setFirstQuality(e.target.value)}
                                        inputRef={firstQualityRef}
                                        onKeyDown={(e) => e.key === 'Enter' && secondQualityRef.current?.focus()}
                                        InputProps={{ sx: { borderRadius: '12px', fontSize: '1.2rem', fontWeight: 600 } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField
                                        label="Medias de segunda"
                                        type="number"
                                        fullWidth
                                        value={secondQuality}
                                        onChange={(e) => setSecondQuality(e.target.value)}
                                        inputRef={secondQualityRef}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddRecord()}
                                        InputProps={{ sx: { borderRadius: '12px', fontSize: '1.2rem', fontWeight: 600 } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField
                                        label="Medias 2ª F.M."
                                        type="number"
                                        fullWidth
                                        value={secondMechanical}
                                        onChange={(e) => setSecondMechanical(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddRecord()}
                                        InputProps={{ sx: { borderRadius: '12px', fontSize: '1.2rem', fontWeight: 600 } }}
                                    />
                                </Grid>
                            </Grid>

                            <Button 
                                variant="contained" 
                                fullWidth 
                                size="large"
                                startIcon={<SaveIcon />}
                                onClick={handleAddRecord}
                                sx={{ 
                                    py: 2, 
                                    borderRadius: '12px', 
                                    fontWeight: 700, 
                                    fontSize: '1rem',
                                    bgcolor: '#10b981',
                                    '&:hover': { bgcolor: '#059669' }
                                }}
                            >
                                AGREGAR REGISTRO
                            </Button>
                        </Box>

                        {/* Muestras de códigos de barras para demostración */}
                        <Box sx={{ mt: 4, p: 2, borderRadius: '12px', border: '1px dashed var(--border-strong, #374151)' }}>
                            <Typography variant="caption" sx={{ color: 'var(--text-muted, #9ca3af)', display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Simulador de Escaneo (Click para simular)
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Tooltip title="Simular Escaneo Máquina">
                                    <Button size="small" variant="outlined" onClick={() => simulateScan('machine', 'MAC-001')} sx={{ borderColor: 'var(--border-strong, #374151)', color: 'var(--text-muted, #9ca3af)' }}>
                                        MÁQ-001
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Simular Escaneo Tejedor">
                                    <Button size="small" variant="outlined" onClick={() => simulateScan('knitter', 'TJ-042')} sx={{ borderColor: 'var(--border-strong, #374151)', color: 'var(--text-muted, #9ca3af)' }}>
                                        TEJ-042
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Simular Escaneo Bolsa">
                                    <Button size="small" variant="outlined" onClick={() => simulateScan('bag', 'BAG-999')} sx={{ borderColor: 'var(--border-strong, #374151)', color: 'var(--text-muted, #9ca3af)' }}>
                                        BOL-999
                                    </Button>
                                </Tooltip>
                            </Box>
                        </Box>
                    </Card>
                </Grid>

                {/* Lista de Sesión */}
                <Grid size={{ xs: 12, lg: 5 }}>
                    <Card style={{ padding: '0', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 2, borderBottom: '1px solid var(--bg-action-btn, rgba(255,255,255,0.05))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                Sesión Actual {tempRecords.length > 0 && `(${tempRecords.length})`}
                            </Typography>
                            {tempRecords.length > 0 && (
                                <Badge color="#6366f1">Temporal</Badge>
                            )}
                        </Box>

                        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                            {tempRecords.length === 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 8, opacity: 0.3 }}>
                                    <QrCodeIcon sx={{ fontSize: 64, mb: 2 }} />
                                    <Typography variant="body2">No hay registros en esta sesión</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {tempRecords.map((record: ProductionRecord) => (
                                        <Box 
                                            key={record.id}
                                            sx={{ 
                                                p: 2, 
                                                borderRadius: '12px', 
                                                bgcolor: 'var(--bg-alt-row, rgba(255,255,255,0.02))',
                                                border: '1px solid var(--bg-action-btn, rgba(255,255,255,0.05))',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <Box>
                                                <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                                                    <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 800 }}>{record.machineCode}</Typography>
                                                    <Typography variant="caption" sx={{ color: 'var(--text-muted, #9ca3af)' }}>•</Typography>
                                                    <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 800 }}>{record.knitterCode}</Typography>
                                                </Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {record.firstQuality} <span style={{ color: 'var(--text-muted, #9ca3af)', fontWeight: 400 }}>doc. prim.</span> / {record.secondQuality} <span style={{ color: 'var(--text-muted, #9ca3af)', fontWeight: 400 }}>medias seg.</span> / {record.secondMechanical} <span style={{ color: 'var(--text-muted, #9ca3af)', fontWeight: 400 }}>2ª F.M.</span>
                                                </Typography>
                                                {record.articleCode && (
                                                    <Typography variant="caption" sx={{ color: '#a78bfa', display: 'block' }}>
                                                        Artículo: {record.articleCode}
                                                    </Typography>
                                                )}
                                                <Typography variant="caption" sx={{ color: 'var(--text-subtle, #6b7280)' }}>
                                                    {record.recordDate} · Turno {record.shift} · Bolsa: {record.bagCode} · {record.timestamp}
                                                </Typography>
                                            </Box>
                                            <IconButton size="small" onClick={() => dispatch(removeRecord(record.id))} sx={{ color: '#ef4444', opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>
                        <Box sx={{ p: 2, borderTop: '1px solid var(--bg-action-btn, rgba(255,255,255,0.05))', display: 'flex', gap: 2 }}>
                            <Button 
                                variant="outlined" 
                                color="error" 
                                fullWidth 
                                onClick={() => { if(window.confirm('¿Limpiar toda la sesión?')) dispatch(clearRecords()); }}
                                disabled={tempRecords.length === 0}
                                sx={{ borderRadius: '12px' }}
                            >
                                LIMPIAR
                            </Button>
                            <Button 
                                variant="contained" 
                                color="primary" 
                                fullWidth 
                                startIcon={<CloudUploadIcon />}
                                onClick={handleUpload}
                                disabled={tempRecords.length === 0 || isUploading}
                                sx={{ borderRadius: '12px', bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
                            >
                                {isUploading ? 'GUARDANDO...' : 'SUBIR CARGA'}
                            </Button>
                        </Box>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
