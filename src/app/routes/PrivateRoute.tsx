import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../../entities/auth/model/authSlice';
import { useVerifySessionQuery } from '../../entities/auth/api/authApi';

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
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: '1rem',
                color: '#888',
            }}>
                Verificando sesión...
            </div>
        );
    }

    return <Outlet />;
};
