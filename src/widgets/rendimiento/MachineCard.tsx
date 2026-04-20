import React from 'react';
import { Paper, Typography, Box, Tooltip } from '@mui/material';
import { Machine } from '../../../entities/performance/api/performanceApi';

interface MachineCardProps {
    machine: Machine;
    onClick: (machine: Machine) => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'SOLVED': return '#10b981'; // Green
        case 'ELECTRICAL': return '#ef4444'; // Red
        case 'MECHANICAL': return '#f59e0b'; // Orange
        case 'SUCTION': return '#8b5cf6'; // Purple
        case 'YARN_SHORTAGE': return '#eab308'; // Yellow/Amber
        default: return '#6b7280'; // Gray
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'SOLVED': return 'OK';
        case 'ELECTRICAL': return 'Eléctrico';
        case 'MECHANICAL': return 'Mecánico';
        case 'SUCTION': return 'Succión';
        case 'YARN_SHORTAGE': return 'Falta Hilado';
        default: return status;
    }
};

export const MachineCard: React.FC<MachineCardProps> = ({ machine, onClick }) => {
    const color = getStatusColor(machine.status);
    const isFailed = machine.status !== 'SOLVED';

    return (
        <Tooltip title={`${getStatusLabel(machine.status)}${machine.lastObservation ? `: ${machine.lastObservation}` : ''}`}>
            <Paper
                elevation={3}
                onClick={() => onClick(machine)}
                sx={{
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    bgcolor: isFailed ? color : 'rgba(16, 185, 129, 0.1)',
                    border: `1px solid ${color}`,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: `0 0 15px ${color}`,
                        bgcolor: isFailed ? color : 'rgba(16, 185, 129, 0.2)',
                    },
                    borderRadius: '8px',
                    position: 'relative'
                }}
            >
                <Typography 
                    variant="h6" 
                    sx={{ 
                        color: isFailed ? '#fff' : color, 
                        fontWeight: 'bold',
                        fontSize: '1.1rem'
                    }}
                >
                    {machine.number}
                </Typography>
                
                {isFailed && (
                   <Box sx={{ 
                       width: '6px', 
                       height: '6px', 
                       bgcolor: '#fff', 
                       borderRadius: '50%', 
                       mt: 0.5 
                   }} />
                )}
            </Paper>
        </Tooltip>
    );
};
