import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from '../shared/api';
import authReducer from '../entities/auth/model/authSlice';
import notificationsReducer from '../entities/notifications/notificationsSlice';
import productionReducer from '../sectors/production/model/productionSlice';
import maintenanceReducer from '../sectors/maintenance/model/maintenanceSlice';

export const store = configureStore({
    reducer: {
        [api.reducerPath]: api.reducer,
        auth: authReducer,
        notifications: notificationsReducer,
        production: productionReducer,
        maintenance: maintenanceReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(api.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
