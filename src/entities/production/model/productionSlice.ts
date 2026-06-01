import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface ProductionRecord {
    id: string;
    machineCode: string;
    knitterCode: string;
    bagCode: string;
    firstQuality: number;
    secondQuality: number;
    timestamp: string;
}

interface ProductionState {
    tempRecords: ProductionRecord[];
}

const initialState: ProductionState = {
    tempRecords: [],
};

const productionSlice = createSlice({
    name: 'production',
    initialState,
    reducers: {
        addRecord: (state, action: PayloadAction<ProductionRecord>) => {
            state.tempRecords.unshift(action.payload);
        },
        removeRecord: (state, action: PayloadAction<string>) => {
            state.tempRecords = state.tempRecords.filter(r => r.id !== action.payload);
        },
        clearRecords: (state) => {
            state.tempRecords = [];
        },
    },
});

export const { addRecord, removeRecord, clearRecords } = productionSlice.actions;
export default productionSlice.reducer;

export const selectTempRecords = (state: any) => state.production.tempRecords;
