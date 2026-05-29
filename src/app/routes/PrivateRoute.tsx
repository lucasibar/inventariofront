import { useEffect, useRef, useReducer } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsAuthenticated, logout, selectCurrentUser } from '../../entities/auth/model/authSlice';
import { useVerifySessionQuery } from '../../entities/auth/api/authApi';
import { api } from '../../shared/api';
import { Spinner } from '../../shared/ui';

export const PrivateRoute = () => {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(selectIsAuthenticated);

    const { isLoading, isError } = useVerifySessionQuery(undefined, {
        skip: !isAuthenticated,
        // Always verify with the server on mount — never trust stale cache
        refetchOnMountOrArgChange: true,
    });

    // Timeout: if verification takes more than 10s, stop blocking
    const timedOut = useRef(false);
    const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

    useEffect(() => {
        if (!isLoading) return;
        const timer = setTimeout(() => {
            timedOut.current = true;
            forceUpdate();
        }, 10000);
        return () => clearTimeout(timer);
    }, [isLoading]);

    useEffect(() => {
        if (isError) {
            dispatch(api.util.resetApiState());
            dispatch(logout());
        }
    }, [isError, dispatch]);

    // Not authenticated at all -> login
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    // Show loading spinner while verifying session on initial load
    if (isLoading && !timedOut.current) {
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
