import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { logout } from '../entities/auth/model/authSlice';

export const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/';

const baseQuery = fetchBaseQuery({
    baseUrl: rawBase,
    prepareHeaders: (headers) => {
        const token = localStorage.getItem('token');
        if (token) headers.set('Authorization', `Bearer ${token}`);
        return headers;
    },
});

let isLoggingOut = false;

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
    const result = await baseQuery(args, api, extraOptions);
    const isLoginRequest = typeof args === 'string' ? args.includes('auth/login') : args.url.includes('auth/login');

    if (result.error && result.error.status === 401 && !isLoginRequest && !isLoggingOut) {
        isLoggingOut = true;
        api.dispatch(logout());
        // Small delay to let Redux state update before resetting the flag
        setTimeout(() => { isLoggingOut = false; }, 1000);
    }
    return result;
};

export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['Items', 'Partners', 'Depots', 'Positions', 'Stock', 'RemitosEntrada', 'Orders', 'RemitosSalida', 'Dashboard', 'BoxTypes', 'Tasks', 'User', 'PurchaseOrders', 'Maintenance', 'Machine', 'Production'],

    endpoints: () => ({}),
});
