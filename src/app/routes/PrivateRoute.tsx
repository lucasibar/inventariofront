import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../../entities/auth/model/authSlice';
import { useVerifySessionQuery } from '../../entities/auth/api/authApi';
import { Spinner } from '../../pages/common/ui';

export const PrivateRoute = () => {
    const isAuthenticated = useSelector(selectIsAuthenticated);

    // Solo verifica si hay token en localStorage. Si el token expiró,
    // el backend devuelve 401 y baseQueryWithReauth redirige al login.
    const { isLoading } = useVerifySessionQuery(undefined, {
        skip: !isAuthenticated,
    });

    if (!isAuthenticated) return <Navigate to="/login" replace />;

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
