import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * Genera un hash simple a partir del array de alertas para detectar cambios.
 * Cuando las alertas cambian (nuevos materiales en déficit, cantidades distintas),
 * el hash cambia y el punto rojo reaparece.
 */
function computeAlertsHash(alerts: any[]): string {
    if (!alerts || alerts.length === 0) return '';
    // Crear un string determinístico con los datos relevantes de cada alerta
    const sorted = [...alerts].sort((a, b) => (a.itemId || '').localeCompare(b.itemId || ''));
    const key = sorted.map(a => `${a.itemId}:${Math.round(a.stockActual)}:${Math.round(a.stockMinimo)}`).join('|');
    // Hash simple (djb2)
    let hash = 5381;
    for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) + hash) + key.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

interface NotificationsState {
    lastSeenHash: string;
    currentHash: string;
}

const STORAGE_KEY = 'notifications_last_seen_hash';

const initialState: NotificationsState = {
    lastSeenHash: sessionStorage.getItem(STORAGE_KEY) || '',
    currentHash: '',
};

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        /** Actualiza el hash actual basado en las alertas recibidas del servidor */
        setCurrentAlerts: (state, action: PayloadAction<any[]>) => {
            state.currentHash = computeAlertsHash(action.payload);
        },
        /** Marca las alertas actuales como vistas (se llama al entrar a /notificaciones) */
        markAsSeen: (state) => {
            state.lastSeenHash = state.currentHash;
            sessionStorage.setItem(STORAGE_KEY, state.currentHash);
        },
    },
});

export const { setCurrentAlerts, markAsSeen } = notificationsSlice.actions;
export default notificationsSlice.reducer;

// Selectors
export const selectHasUnreadNotifications = (state: any): boolean => {
    const { currentHash, lastSeenHash } = state.notifications;
    // Si no hay alertas (hash vacío), no hay nada que mostrar
    if (!currentHash) return false;
    return currentHash !== lastSeenHash;
};

export const selectCurrentHash = (state: any) => state.notifications.currentHash;
