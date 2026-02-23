import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/';

export const api = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: rawBase,
        prepareHeaders: (headers) => {
            const token = localStorage.getItem('token');
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return headers;
        },
    }),
    tagTypes: ['Items', 'Partners', 'Depots', 'Positions', 'Stock', 'RemitosEntrada', 'Orders', 'RemitosSalida', 'Dashboard'],
    endpoints: () => ({}),
});
