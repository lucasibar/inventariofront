import { useEffect, useRef, useReducer, useCallback } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsAuthenticated, logout } from '../../entities/auth/model/authSlice';
import { useVerifySessionQuery } from '../../entities/auth/api/authApi';
import { selectCurrentUser } from '../../entities/auth/model/authSlice';
import { api } from '../../shared/api';
import { Spinner } from '../../shared/ui';

export const PrivateRoute = () => {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const hasToken = !!localStorage.getItem('token');

    // Skip verification if there's no token at all (instant redirect to login)
    const shouldSkip = !isAuthenticated && !hasToken;

    const { data, isLoading, isError, isFetching, isSuccess, refetch } = useVerifySessionQuery(undefined, {
        skip: shouldSkip,
        // CRITICAL: Always refetch on mount to avoid using stale cached results
        refetchOnMountOrArgChange: true,
    });

    // Track whether we've received a FRESH response (not cached)
    const hasReceivedFreshResponse = useRef(false);
    const hasTriggeredLogout = useRef(false);

    // Timeout: if server takes too long (Render cold start), show content optimistically
    const timedOut = useRef(false);
    const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

    useEffect(() => {
        if (!isFetching) return;
        // Reset on new fetch
        timedOut.current = false;
        hasReceivedFreshResponse.current = false;
        hasTriggeredLogout.current = false;

        const timer = setTimeout(() => {
            timedOut.current = true;
            forceUpdate();
        }, 15000);
        return () => clearTimeout(timer);
    }, [isFetching]);

    // Mark when we get a fresh response (fetching finished)
    useEffect(() => {
        if (!isFetching && !shouldSkip && (isSuccess || isError)) {
            hasReceivedFreshResponse.current = true;
        }
    }, [isFetching, isSuccess, isError, shouldSkip]);

    // Handle session verification failure — only on FRESH responses
    const doLogout = useCallback(() => {
        if (hasTriggeredLogout.current) return;
        hasTriggeredLogout.current = true;
        dispatch(api.util.resetApiState());
        dispatch(logout());
    }, [dispatch]);

    useEffect(() => {
        if (isError && hasReceivedFreshResponse.current && !hasTriggeredLogout.current) {
            doLogout();
        }
    }, [isError, doLogout]);

    // --- Render logic ---

    // No token at all → instant redirect
    if (!isAuthenticated && !hasToken) {
        return <Navigate to="/login" replace />;
    }

    // Fresh error response from server → session invalid → redirect
    if (isError && hasReceivedFreshResponse.current) {
        return <Navigate to="/login" replace />;
    }

    // Still waiting for server response (and haven't timed out)
    if (isFetching && !timedOut.current) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#0f1117',
                color: '#f3f4f6',
                fontFamily: 'Inter, system-ui, sans-serif'
            }}>
                <div style={{ marginBottom: '20px' }}><Spinner /></div>
                <div style={{ fontSize: '14px', color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Verificando sesión...
                </div>
                <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '12px', maxWidth: '320px', textAlign: 'center', lineHeight: '1.4' }}>
                    Si es la primera visita en un rato, el servidor gratuito de Render puede tardar hasta 1 minuto en "despertar".
                </div>
            </div>
        );
    }

    // Session verified or timed out → show content
    return <Outlet />;
};

interface RoleGuardProps {
    allowedRoles: string[];
}

export const RoleGuard = ({ allowedRoles }: RoleGuardProps) => {
    const user = useSelector(selectCurrentUser);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.role.toUpperCase())) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};
