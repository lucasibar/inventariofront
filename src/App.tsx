import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './app/routes/PrivateRoute';
import { LoginPage } from './pages/login/LoginPage';
import Layout from './shared/Layout';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from './entities/auth/model/authSlice';

// Sector: Config
import MaterialesPage from './sectors/config/pages/MaterialesPage';
import SociosPage from './sectors/config/pages/SociosPage';
import UsersPage from './sectors/config/pages/UsersPage';
import BoxTypesPage from './sectors/config/pages/BoxTypesPage';

// Sector: Warehouse
import DepositoPage from './sectors/warehouse/pages/DepositoPage';
import StockPage from './sectors/warehouse/pages/StockPage';
import MovimientosPage from './sectors/warehouse/pages/MovimientosPage';
import RemitosEntradaPage from './sectors/warehouse/pages/RemitosEntradaPage';
import RemitosSalidaPage from './sectors/warehouse/pages/RemitosSalidaPage';
import AuditoriaPickingPage from './sectors/warehouse/pages/AuditoriaPickingPage';
import WorkspaceTasksPage from './sectors/warehouse/pages/WorkspaceTasksPage';

// Sector: Purchasing
import DashboardComprasPage from './sectors/purchasing/pages/DashboardComprasPage';
import CapacityDashboardPage from './sectors/purchasing/pages/CapacityDashboardPage';
import VolumenesDashboardPage from './sectors/purchasing/pages/VolumenesDashboardPage';
import PedidosCompraPage from './sectors/purchasing/pages/PedidosCompraPage';

// Sector: Production
import DashboardProduccionPage from './sectors/production/pages/DashboardProduccionPage';
import RegistroMaquinasPage from './sectors/production/pages/RegistroMaquinasPage';
import HistorialRegistrosPage from './sectors/production/pages/HistorialRegistrosPage';
import BuscadorMaquinaPage from './sectors/production/pages/BuscadorMaquinaPage';
import CargarProduccionPage from './sectors/production/pages/CargarProduccionPage';

// Other
import AdminMovementsPage from './sectors/warehouse/pages/AdminMovementsPage';
import NotificationsPage from './sectors/config/pages/NotificationsPage';
import PedidosPage from './sectors/sales/pages/PedidosPage';

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
            
            {/* Rutas para Compras / Configuración */}
            <Route element={<PrivateRoute allowedRoles={['ADMIN', 'COMPRAS']} />}>
                <Route path="/remitos-entrada" element={<RemitosEntradaPage />} />
                <Route path="/dashboard" element={<DashboardComprasPage />} />
                <Route path="/dashboard/capacity" element={<CapacityDashboardPage />} />
                <Route path="/dashboard/volumes" element={<VolumenesDashboardPage />} />
                <Route path="/items" element={<MaterialesPage />} />
                <Route path="/items/box-types" element={<BoxTypesPage />} />
                <Route path="/socios" element={<SociosPage />} />
                <Route path="/pedidos" element={<PedidosPage />} />
                <Route path="/pedidos-compra" element={<PedidosCompraPage />} />
            </Route>

            {/* Rutas exclusivas de ADMIN */}
            <Route element={<PrivateRoute allowedRoles={['ADMIN']} />}>
                <Route path="/users" element={<UsersPage />} />
                <Route path="/admin/movements" element={<AdminMovementsPage />} />
            </Route>

            {/* Rutas para Operario / Producción / Depósito */}
            <Route element={<PrivateRoute allowedRoles={['ADMIN', 'OPERATOR']} />}>
                <Route path="/deposito/auditoria-picking" element={<AuditoriaPickingPage />} />
                <Route path="/remitos-salida" element={<RemitosSalidaPage />} />
                <Route path="/stock" element={<StockPage />} />
                <Route path="/movimientos" element={<MovimientosPage />} />
                <Route path="/tasks" element={<WorkspaceTasksPage />} />
                <Route path="/produccion/cargar" element={<CargarProduccionPage />} />
                <Route path="/produccion/dashboard" element={<DashboardProduccionPage />} />
                <Route path="/produccion/registro" element={<RegistroMaquinasPage />} />
                <Route path="/produccion/historial" element={<HistorialRegistrosPage />} />
                <Route path="/produccion/buscador" element={<BuscadorMaquinaPage />} />
            </Route>

            {/* Rutas compartidas o especiales */}
            <Route path="/deposito" element={<DepositoPage />} />
            <Route path="/notificaciones" element={<NotificationsPage />} />

          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
