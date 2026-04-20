import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../api/authApi';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
}

const initialState: AuthState = (() => {
    // Switching to sessionStorage to improve security and avoid leftover state
    const user = (() => {
        try {
            const stored = sessionStorage.getItem('user');
            if (!stored || stored === 'null' || stored === 'undefined') return null;
            return JSON.parse(stored);
        } catch (e) {
            return null;
        }
    })();

    const token = (() => {
        const storedToken = sessionStorage.getItem('token');
        if (!storedToken || storedToken === 'null' || storedToken === 'undefined') return null;
        return storedToken;
    })();

    return {
        user,
        token,
        isAuthenticated: !!token,
    };
})();

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (
            state,
            { payload: { user, token } }: PayloadAction<{ user: User; token: string }>
        ) => {
            state.user = user;
            state.token = token;
            state.isAuthenticated = true;
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('user', JSON.stringify(user));
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            sessionStorage.clear();
        },
    },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state: any) => state.auth.user;
export const selectIsAuthenticated = (state: any) => state.auth.isAuthenticated;
export const selectUserRole = (state: any) => state.auth.user?.role;
export const selectIsAdmin = (state: any) => state.auth.user?.role === 'ADMIN';
export const selectAllowedDepots = (state: any) => state.auth.user?.allowedDepotIds || [];

