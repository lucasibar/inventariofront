import React, { useState } from 'react';
import { Box, Button, CircularProgress, Tooltip } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { rawBase } from '../shared/api';

interface AiRemitoCargaProps {
    onExtracted: (data: any) => void;
}

export const AiRemitoCarga: React.FC<AiRemitoCargaProps> = ({ onExtracted }) => {
    const [loading, setLoading] = useState(false);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = sessionStorage.getItem('token');
            const response = await fetch(`${rawBase.replace(/\/$/, '')}/ai/process-remito`, {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Error al procesar la imagen con IA');
            }

            const data = await response.json();
            onExtracted(data);
        } catch (error) {
            console.error('AI Error:', error);
            alert('No se pudo procesar el remito. Intente cargar los datos manualmente.');
        } finally {
            setLoading(false);
            // Reset input
            event.target.value = '';
        }
    };

    return (
        <Box sx={{ mb: 3 }}>
            <input
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                id="ai-upload-file"
                type="file"
                onChange={handleFileChange}
            />
            <label htmlFor="ai-upload-file">
                <Tooltip title="Subí una foto o PDF del remito y la IA completará los datos por vos">
                    <Button
                        variant="outlined"
                        component="span"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 600,
                            borderStyle: 'dashed',
                            borderWidth: '2px',
                            px: 3,
                            py: 1,
                            backgroundColor: 'rgba(99, 102, 241, 0.04)',
                            '&:hover': {
                                borderWidth: '2px',
                                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                            }
                        }}
                    >
                        {loading ? 'Analizando remito...' : 'Carga Asistida con IA'}
                    </Button>
                </Tooltip>
            </label>
        </Box>
    );
};
