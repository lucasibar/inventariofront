import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';

const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/';

const baseQuery = fetchBaseQuery({
    baseUrl: rawBase,
    prepareHeaders: (headers) => {
        const token = localStorage.getItem('token');
        if (token) headers.set('Authorization', `Bearer ${token}`);
        return headers;
    },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
    const result = await baseQuery(args, api, extraOptions);
    if (result.error && result.error.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
    return result;
};

export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['Items', 'Partners', 'Depots', 'Positions', 'Stock', 'RemitosEntrada', 'Orders', 'RemitosSalida', 'Dashboard'],
    endpoints: () => ({}),
});
