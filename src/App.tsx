import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './app/routes/PrivateRoute';
import { LoginPage } from './pages/login/LoginPage';
import Layout from './shared/Layout';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from './entities/auth/model/authSlice';

// Lazy-import pages
import RemitosEntradaPage from './pages/RemitosEntradaPage';
import DepositoPage from './pages/DepositoPage';
import PedidosPage from './pages/PedidosPage';
import RemitosSalidaPage from './pages/RemitosSalidaPage';
import DashboardComprasPage from './pages/DashboardComprasPage';
import MaterialesPage from './pages/MaterialesPage';
import SociosPage from './pages/SociosPage';
import AuditoriaPickingPage from './pages/AuditoriaPickingPage';
import BoxTypesPage from './pages/BoxTypesPage';
import CapacityDashboardPage from './pages/CapacityDashboardPage';
import WorkspaceTasksPage from './pages/WorkspaceTasksPage';
import VolumenesDashboardPage from './pages/VolumenesDashboardPage';

import MovimientosPage from './pages/MovimientosPage';
import StockPage from './pages/StockPage';
import UsersPage from './pages/UsersPage';

import './App.css';

function App() {
  const user = useSelector(selectCurrentUser);
  
  const getHome = (role?: string) => {
    const r = role?.toUpperCase();
    if (r === 'OPERATOR') return '/stock';
    if (r === 'COMPRAS') return '/dashboard';
    return '/stock';
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to={getHome(user?.role)} replace />} />
            
            {/* Rutas para Compras / Admin */}
            <Route element={<PrivateRoute allowedRoles={['ADMIN', 'COMPRAS']} />}>
                <Route path="/remitos-entrada" element={<RemitosEntradaPage />} />
                <Route path="/dashboard" element={<DashboardComprasPage />} />
                <Route path="/dashboard/capacity" element={<CapacityDashboardPage />} />
                <Route path="/dashboard/volumes" element={<VolumenesDashboardPage />} />
                <Route path="/items" element={<MaterialesPage />} />
                <Route path="/items/box-types" element={<BoxTypesPage />} />
                <Route path="/socios" element={<SociosPage />} />
                <Route path="/pedidos" element={<PedidosPage />} />
            </Route>

            {/* Rutas exclusivas de ADMIN */}
            <Route element={<PrivateRoute allowedRoles={['ADMIN']} />}>
                <Route path="/users" element={<UsersPage />} />
            </Route>

            {/* Rutas para Operario / Admin */}
            <Route element={<PrivateRoute allowedRoles={['ADMIN', 'OPERATOR']} />}>
                <Route path="/deposito/auditoria-picking" element={<AuditoriaPickingPage />} />
                <Route path="/remitos-salida" element={<RemitosSalidaPage />} />
                <Route path="/stock" element={<StockPage />} />
                <Route path="/movimientos" element={<MovimientosPage />} />
                <Route path="/tasks" element={<WorkspaceTasksPage />} />
            </Route>

            {/* Rutas compartidas o especiales */}
            <Route path="/deposito" element={<DepositoPage />} />

          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
