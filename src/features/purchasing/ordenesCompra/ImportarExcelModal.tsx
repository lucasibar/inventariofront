import { useState, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    Alert,
    AlertTitle,
    CircularProgress,
    Card,
    RadioGroup,
    FormControlLabel,
    Radio,
    IconButton
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

import { parseExcelCompras, type ParseExcelResult } from './excelParser';
import { importarOrdenesDesdeArray } from './ordenesCompraStorage';

interface ImportarExcelModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: (count: number) => void;
}

export default function ImportarExcelModal({ open, onClose, onSuccess }: ImportarExcelModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [parseResult, setParseResult] = useState<ParseExcelResult | null>(null);
    const [importMode, setImportMode] = useState<'REPLACE' | 'MERGE'>('REPLACE');

    const handleReset = () => {
        setSelectedFile(null);
        setParseResult(null);
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const processFile = async (file: File) => {
        setSelectedFile(file);
        setIsLoading(true);
        setParseResult(null);

        try {
            const res = await parseExcelCompras(file);
            setParseResult(res);
        } catch (err: any) {
            setParseResult({
                success: false,
                error: `Error inesperado al procesar el archivo: ${err?.message || 'Error desconocido'}`,
                warnings: [],
                ordenes: []
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleConfirmImport = () => {
        if (!parseResult || !parseResult.success || !parseResult.ordenes.length) return;

        importarOrdenesDesdeArray(parseResult.ordenes, importMode === 'REPLACE');

        if (onSuccess) {
            onSuccess(parseResult.ordenes.length);
        }
        handleClose();
    };

    const colors = {
        bg: '#0f172a',
        surface: '#1e293b',
        border: 'rgba(255, 255, 255, 0.08)',
        primary: '#f59e0b',
        info: '#38bdf8',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        text: '#f8fafc',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: colors.surface,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 2.5
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <UploadFileIcon sx={{ color: colors.primary }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '17px' }}>
                        Subir Planilla Excel de Órdenes de Compra
                    </Typography>
                </Box>
                <IconButton onClick={handleClose} size="small" sx={{ color: colors.textMuted }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: colors.border, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Typography variant="body2" sx={{ color: colors.textSecondary, fontSize: '13px' }}>
                    Seleccioná el archivo <strong>Excel de Registro de Compras</strong> (.xlsx) desde tu computadora. El sistema verificará su estructura antes de importar para asegurar que no se alteren tus datos si el formato no coincide.
                </Typography>

                {/* Zona de Drop & Selección */}
                <Box
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                        border: `2px dashed ${isDragging ? colors.primary : (parseResult?.success ? colors.success : colors.border)}`,
                        bgcolor: isDragging ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                        borderRadius: 2,
                        p: 3,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                            borderColor: colors.primary,
                            bgcolor: 'rgba(245, 158, 11, 0.03)'
                        }
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx, .xls"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />

                    {isLoading ? (
                        <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                            <CircularProgress size={32} sx={{ color: colors.primary }} />
                            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                Analizando y validando estructura del archivo...
                            </Typography>
                        </Box>
                    ) : selectedFile ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                            <InsertDriveFileIcon sx={{ color: colors.primary, fontSize: 36 }} />
                            <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.text }}>
                                    {selectedFile.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: colors.textMuted }}>
                                    {(selectedFile.size / 1024).toFixed(1)} KB • Clic para elegir otro archivo
                                </Typography>
                            </Box>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <UploadFileIcon sx={{ fontSize: 44, color: colors.primary, opacity: 0.8 }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.text }}>
                                Arrastrá y soltá tu archivo Excel aquí
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.textMuted }}>
                                o hacé clic para explorar tus carpetas (.xlsx o .xls)
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* CASO ERROR / FORMATO NO COMPATIBLE */}
                {parseResult && !parseResult.success && (
                    <Alert
                        severity="error"
                        icon={<ErrorOutlineIcon />}
                        sx={{
                            bgcolor: 'rgba(239, 68, 68, 0.12)',
                            color: colors.text,
                            border: `1px solid rgba(239, 68, 68, 0.3)`,
                            borderRadius: 2,
                            '& .MuiAlert-icon': { color: colors.danger }
                        }}
                    >
                        <AlertTitle sx={{ fontWeight: 800, color: colors.danger, fontSize: '14px' }}>
                            Formato no compatible / Archivo incorrecto
                        </AlertTitle>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontSize: '12px', mb: 1 }}>
                            {parseResult.error}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: colors.textMuted, fontSize: '11px' }}>
                            <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                            <span>Tus datos actuales y órdenes existentes se mantienen intactos.</span>
                        </Box>
                    </Alert>
                )}

                {/* CASO ÉXITO: PREVIEW Y CONFIRMACIÓN */}
                {parseResult && parseResult.success && parseResult.stats && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Card sx={{ bgcolor: 'rgba(16, 185, 129, 0.08)', border: `1px solid rgba(16, 185, 129, 0.3)`, p: 2, borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <CheckCircleOutlineIcon sx={{ color: colors.success }} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.success }}>
                                    Estructura Validada Exitosamente
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, textAlign: 'center', mb: 1.5 }}>
                                <Box sx={{ bgcolor: colors.surface, p: 1, borderRadius: 1.5, border: `1px solid ${colors.border}` }}>
                                    <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>Órdenes</Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 900, color: colors.info }}>
                                        {parseResult.stats.totalOrdenes}
                                    </Typography>
                                </Box>
                                <Box sx={{ bgcolor: colors.surface, p: 1, borderRadius: 1.5, border: `1px solid ${colors.border}` }}>
                                    <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>Líneas Material</Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 900, color: colors.primary }}>
                                        {parseResult.stats.totalLineas}
                                    </Typography>
                                </Box>
                                <Box sx={{ bgcolor: colors.surface, p: 1, borderRadius: 1.5, border: `1px solid ${colors.border}` }}>
                                    <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>Kilos Totales</Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 900, color: colors.success }}>
                                        {parseResult.stats.totalKg.toLocaleString()}
                                    </Typography>
                                </Box>
                            </Box>

                            <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block', fontSize: '11px' }}>
                                <strong>Hojas procesadas:</strong> {parseResult.stats.hojasProcesadas.join(', ')} • <strong>Proveedores:</strong> {parseResult.stats.proveedores.slice(0, 5).join(', ')}{parseResult.stats.proveedores.length > 5 ? ` (+${parseResult.stats.proveedores.length - 5} más)` : ''}.
                            </Typography>
                        </Card>

                        {/* Opciones de Importación */}
                        <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.02)', p: 1.5, borderRadius: 2, border: `1px solid ${colors.border}` }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', fontSize: '10px' }}>
                                Modo de Importación
                            </Typography>
                            <RadioGroup
                                value={importMode}
                                onChange={(e) => setImportMode(e.target.value as any)}
                                sx={{ mt: 0.5 }}
                            >
                                <FormControlLabel
                                    value="REPLACE"
                                    control={<Radio size="small" sx={{ color: colors.primary, '&.Mui-checked': { color: colors.primary } }} />}
                                    label={
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '12px' }}>
                                                Reemplazar catálogo completo con este archivo
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                                                Recomendado. Sincroniza todas las órdenes del Registro de Compras.
                                            </Typography>
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    value="MERGE"
                                    control={<Radio size="small" sx={{ color: colors.primary, '&.Mui-checked': { color: colors.primary } }} />}
                                    label={
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '12px' }}>
                                                Fusionar / Conservar órdenes existentes
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: colors.textMuted, fontSize: '10px' }}>
                                                Conserva órdenes creadas manualmente y agrega solo las no repetidas.
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </RadioGroup>
                        </Box>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, borderColor: colors.border, justifyContent: 'space-between' }}>
                <Button
                    onClick={handleClose}
                    sx={{ color: colors.textMuted, textTransform: 'none', fontSize: '13px' }}
                >
                    Cancelar
                </Button>

                <Button
                    variant="contained"
                    disabled={!parseResult || !parseResult.success || isLoading}
                    onClick={handleConfirmImport}
                    startIcon={<CheckCircleOutlineIcon />}
                    sx={{
                        bgcolor: colors.primary,
                        color: '#000',
                        fontWeight: 800,
                        textTransform: 'none',
                        fontSize: '13px',
                        px: 2.5,
                        '&:hover': { bgcolor: '#d97706' },
                        '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }
                    }}
                >
                    {parseResult?.success ? `Importar ${parseResult.stats?.totalOrdenes} Órdenes` : 'Confirmar Importación'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
