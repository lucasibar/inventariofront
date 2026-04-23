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
        case 'ELECTRONIC': return 'Electronic';
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
        <Tooltip title={`${getStatusLabel(machine.status)}${machine.lastObservation ? `: ${machine.lastObservation}` : ''}`}>
            <Box sx={{ position: 'relative' }}>
                <Paper
                    elevation={3}
                    onClick={() => onClick(machine)}
                    sx={{
                        width: '65px',
                        height: '65px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        bgcolor: isFailed ? color : 'rgba(16, 185, 129, 0.05)',
                        border: `1px solid ${isFailed ? color : color + '44'}`,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        zIndex: 2,
                        '&:hover': {
                            transform: 'translateY(-4px) scale(1.1)',
                            boxShadow: `0 8px 15px ${isFailed ? color + '66' : 'rgba(0,0,0,0.3)'}`,
                            bgcolor: isFailed ? color : 'rgba(16, 185, 129, 0.15)',
                        },
                        animation: isFailed ? 'pulse 2s infinite' : 'none',
                        '@keyframes pulse': {
                            '0%': { boxShadow: `0 0 0 0 ${color}66` },
                            '70%': { boxShadow: `0 0 0 10px ${color}00` },
                            '100%': { boxShadow: `0 0 0 0 ${color}00` }
                        },
                        borderRadius: '12px',
                    }}
                >
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            color: isFailed ? '#fff' : color, 
                            fontWeight: 900,
                            fontSize: '1.2rem',
                            lineHeight: 1
                        }}
                    >
                        {machine.number}
                    </Typography>
                    
                    <Typography variant="caption" sx={{ 
                        fontSize: '9px', 
                        mt: 0.5, 
                        color: isFailed ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                        fontWeight: 600
                    }}>
                        {timeInStatus}
                    </Typography>
                </Paper>
            </Box>
        </Tooltip>
    );
};

