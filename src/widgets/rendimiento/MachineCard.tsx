import React from 'react';
import { Paper, Typography, Box, Tooltip } from '@mui/material';
import type { Machine } from '../../entities/performance/api/performanceApi';


interface MachineCardProps {
    machine: Machine;
    onClick: (machine: Machine) => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'ACTIVA': return '#10b981'; // Green
        case 'REVISAR': return '#eab308'; // Yellow/Amber
        case 'VELOCIDAD_REDUCIDA': return '#f472b6'; // Pink
        case 'PARADA': return '#ef4444'; // Red
        case 'ELECTRONIC': return '#3b82f6'; // Blue
        default: return '#6b7280'; // Gray
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'ACTIVA': return 'Activa';
        case 'REVISAR': return 'Revisar';
        case 'VELOCIDAD_REDUCIDA': return 'V. Reducida';
        case 'PARADA': return 'Parada';
        case 'ELECTRONIC': return 'Electrónica';
        default: return status;
    }
};

export const MachineCard: React.FC<MachineCardProps> = ({ machine, onClick }) => {
    const color = getStatusColor(machine.status);
    const isFailed = machine.status !== 'ACTIVA';
    
    // Status duration
    const [timeInStatus, setTimeInStatus] = React.useState('');
    
    React.useEffect(() => {
        const updateTime = () => {
            const start = new Date(machine.updatedAt).getTime();
            const now = new Date().getTime();
            const diff = now - start;
            
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(minutes / 60);
            
            if (hours > 0) setTimeInStatus(`${hours}h ${minutes % 60}m`);
            else setTimeInStatus(`${minutes}m`);
        };
        
        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, [machine.updatedAt]);

    return (
        <Tooltip 
            title={
                <Box sx={{ p: 1 }}>
                    <Typography variant="subtitle2">{getStatusLabel(machine.status)}</Typography>
                    {machine.lastObservation && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                            Obs: {machine.lastObservation}
                        </Typography>
                    )}
                    {machine.lastChangeBy && (
                        <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
                            Por: {machine.lastChangeBy}
                        </Typography>
                    )}
                </Box>
            }
        >
            <Box sx={{ position: 'relative' }}>
                <Paper
                    elevation={isFailed ? 6 : 1}
                    onClick={() => onClick(machine)}
                    sx={{
                        width: '75px',
                        height: '75px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        bgcolor: isFailed ? color : 'rgba(16, 185, 129, 0.03)',
                        border: `2px solid ${isFailed ? color : color + '22'}`,
                        transition: 'all 0.2s ease-in-out',
                        position: 'relative',
                        zIndex: 2,
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 8px 20px ${color}44`,
                            border: `2px solid ${color}`,
                        },
                        animation: isFailed ? 'pulse 2s infinite' : 'none',
                        '@keyframes pulse': {
                            '0%': { boxShadow: `0 0 0 0 ${color}44` },
                            '70%': { boxShadow: `0 0 0 8px ${color}00` },
                            '100%': { boxShadow: `0 0 0 0 ${color}00` }
                        },
                        borderRadius: '16px',
                        overflow: 'hidden'
                    }}
                >
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            color: isFailed ? '#fff' : color, 
                            fontWeight: 800,
                            fontSize: '1.4rem',
                            lineHeight: 1
                        }}
                    >
                        {machine.number}
                    </Typography>
                    
                    <Typography variant="caption" sx={{ 
                        fontSize: '9px', 
                        mt: 0.2, 
                        color: isFailed ? 'rgba(255,255,255,0.9)' : 'text.secondary',
                        fontWeight: 700
                    }}>
                        {timeInStatus}
                    </Typography>

                    {isFailed && (
                        <Box sx={{ 
                            position: 'absolute', 
                            bottom: 0, 
                            width: '100%', 
                            bgcolor: 'rgba(0,0,0,0.2)', 
                            py: 0.2,
                            textAlign: 'center'
                        }}>
                            <Typography sx={{ fontSize: '7px', color: '#fff', fontWeight: 900, textTransform: 'uppercase' }}>
                                {getStatusLabel(machine.status)}
                            </Typography>
                        </Box>
                    )}
                </Paper>
            </Box>
        </Tooltip>
    );
};

