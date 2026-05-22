import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsAuthenticated, logout, selectCurrentUser } from '../../entities/auth/model/authSlice';
import { useVerifySessionQuery } from '../../entities/auth/api/authApi';
import { Spinner } from '../../shared/ui';

export const PrivateRoute = () => {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(selectIsAuthenticated);

    const { isLoading, isError } = useVerifySessionQuery(undefined, {
        skip: !isAuthenticated,
    });

    useEffect(() => {
        if (isError) {
            dispatch(logout());
        }
    }, [isError, dispatch]);

    if (!isAuthenticated || (isError && !isLoading)) return <Navigate to="/login" replace />;

    if (isLoading) {
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
