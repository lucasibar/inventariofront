import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface MaintenanceFilters {
    startDate: string;
    endDate: string;
    plantId: string;
    statusFilter: string;
    machineNumber: string;
    useTimeFilter: boolean;
    startTime: string;
    endTime: string;
}

interface MaintenanceState {
    historyFilters: MaintenanceFilters;
    pendingEvents: any[];
}

const initialState: MaintenanceState = {
    historyFilters: {
        startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        plantId: '',
        statusFilter: '',
        machineNumber: '',
        useTimeFilter: false,
        startTime: '00:00',
        endTime: '23:59',
    },
    pendingEvents: [],
};

const maintenanceSlice = createSlice({
    name: 'maintenance',
    initialState,
    reducers: {
        setHistoryFilters: (state, action: PayloadAction<Partial<MaintenanceFilters>>) => {
            state.historyFilters = { ...state.historyFilters, ...action.payload };
        },
        resetHistoryFilters: (state) => {
            state.historyFilters = initialState.historyFilters;
        },
        addPendingEvent: (state, action: PayloadAction<any>) => {
            state.pendingEvents.push(action.payload);
        },
        removePendingEvent: (state, action: PayloadAction<number>) => {
            state.pendingEvents.splice(action.payload, 1);
        },
        clearPendingEvents: (state) => {
            state.pendingEvents = [];
        },
    },
});

export const { 
    setHistoryFilters, 
    resetHistoryFilters, 
    addPendingEvent, 
    removePendingEvent, 
    clearPendingEvents 
} = maintenanceSlice.actions;

export const selectHistoryFilters = (state: any) => state.maintenance.historyFilters;
export const selectPendingEvents = (state: any) => state.maintenance.pendingEvents;

export default maintenanceSlice.reducer;
