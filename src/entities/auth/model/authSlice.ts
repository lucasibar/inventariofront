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
        updateUserData: (state, action: PayloadAction<Partial<User>>) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
                localStorage.setItem('user', JSON.stringify(state.user));
            }
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        },
    },
    extraReducers: (builder) => {
        builder.addMatcher(
            (action: any) =>
                action.type === 'api/executeQuery/fulfilled' &&
                action.meta?.arg?.endpointName === 'verifySession',
            (state, action: any) => {
                if (action.payload) {
                    state.user = {
                        ...(state.user || {}),
                        ...action.payload,
                    };
                    localStorage.setItem('user', JSON.stringify(state.user));
                }
            }
        );
    },
});

export const { setCredentials, updateUserData, logout } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state: any): User | null => state.auth.user;
export const selectIsAuthenticated = (state: any): boolean => state.auth.isAuthenticated;
export const selectUserRole = (state: any): string | undefined => state.auth.user?.role;
export const selectIsAdmin = (state: any): boolean => state.auth.user?.role?.toUpperCase() === 'ADMIN';
export const selectAllowedDepots = (state: any) => {
    const user = state.auth.user;
    if (user?.role?.toUpperCase() === 'ADMIN') return null; // Admins have no restrictions
    return user?.allowedDepotIds || [];
};
export const selectUserSector = (state: any): string | null => state.auth.user?.sector || null;
export const selectUserSectors = (state: any): string[] => {
    const user = state.auth.user;
    if (user?.sectors && Array.isArray(user.sectors) && user.sectors.length > 0) return user.sectors;
    if (user?.sector) return user.sector.split(/[,;|]/).map((s: string) => s.trim().toUpperCase()).filter(Boolean);
    return [];
};
