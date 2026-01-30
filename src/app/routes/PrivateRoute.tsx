import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../../entities/auth/model/authSlice';

export const PrivateRoute = () => {
    const isAuthenticated = useSelector(selectIsAuthenticated);

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};
