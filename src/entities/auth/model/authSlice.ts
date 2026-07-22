import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../api/authApi';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
}

const initialState: AuthState = (() => {
    // Using localStorage so sessions persist across tabs and browser restarts
    const user = (() => {
        try {
            const stored = localStorage.getItem('user');
            if (!stored || stored === 'null' || stored === 'undefined') return null;
            return JSON.parse(stored);
        } catch (e) {
            return null;
        }
    })();

    const token = (() => {
        const storedToken = localStorage.getItem('token');
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
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        },
    },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state: any) => state.auth.user;
export const selectIsAuthenticated = (state: any) => state.auth.isAuthenticated;
export const selectUserRole = (state: any) => state.auth.user?.role;
export const selectIsAdmin = (state: any) => state.auth.user?.role?.toUpperCase() === 'ADMIN';
export const selectAllowedDepots = (state: any) => {
    const user = state.auth.user;
    if (user?.role?.toUpperCase() === 'ADMIN') return null; // Admins have no restrictions
    return user?.allowedDepotIds || [];
};
export const selectUserSector = (state: any) => state.auth.user?.sector;
