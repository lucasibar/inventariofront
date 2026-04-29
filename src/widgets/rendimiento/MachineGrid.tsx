import React from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import type { Machine } from '../../sectors/maintenance/api/maintenance.api';

import { MachineCard } from './MachineCard';

interface MachineGridProps {
    machines: Machine[] | undefined;
    isLoading: boolean;
    onMachineClick: (machine: Machine) => void;
}

export const MachineGrid: React.FC<MachineGridProps> = ({ machines, isLoading, onMachineClick }) => {
    if (isLoading) {
        return (
            <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(65px, 1fr))', 
                gap: 2,
                mt: 3 
            }}>
                {[...Array(20)].map((_, i) => (
                    <Skeleton key={i} variant="rectangular" width={60} height={60} sx={{ borderRadius: '8px' }} />
                ))}
            </Box>
        );
    }

    if (!machines || machines.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 10 }}>
                <Typography variant="h6" color="text.secondary">
                    No se encontraron máquinas para este tipo.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, 65px)', 
            justifyContent: 'center',
            gap: 1.5,
            mt: 3,
            p: 2,
            maxHeight: '70vh',
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
                width: '8px',
            },
            '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
            },
            '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
            },
        }}>
            {machines.map((machine) => (
                <MachineCard 
                    key={machine.id} 
                    machine={machine} 
                    onClick={onMachineClick} 
                />
            ))}
        </Box>
    );
};
