import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from '../shared/api';
import authReducer from '../entities/auth/model/authSlice';
import notificationsReducer from '../entities/notifications/notificationsSlice';
import productionReducer from '../features/production/model/productionSlice';

export const store = configureStore({
    reducer: {
        [api.reducerPath]: api.reducer,
        auth: authReducer,
        notifications: notificationsReducer,
        production: productionReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(api.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
