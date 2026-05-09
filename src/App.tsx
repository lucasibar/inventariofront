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
import ReporteSalidasPage from './sectors/warehouse/pages/ReporteSalidasPage';
import DashboardDepositoPage from './sectors/warehouse/pages/DashboardDepositoPage';

// Sector: Purchasing
import DashboardComprasPage from './sectors/purchasing/pages/DashboardComprasPage';
import MaterialesCriticosPage from './sectors/purchasing/pages/MaterialesCriticosPage';
import ConciliacionPage from './sectors/purchasing/pages/ConciliacionPage';
import AlertaStockPage from './sectors/purchasing/pages/AlertaStockPage';
import CapacityDashboardPage from './sectors/purchasing/pages/CapacityDashboardPage';
import VolumenesDashboardPage from './sectors/purchasing/pages/VolumenesDashboardPage';
import PedidosCompraPage from './sectors/purchasing/pages/PedidosCompraPage';

// Sector: Maintenance
import DashboardMantenimientoPage from './sectors/maintenance/pages/DashboardMantenimientoPage';
import MonitoreoVivoPage from './sectors/maintenance/pages/MonitoreoVivoPage';
import RegistroMaquinasPage from './sectors/maintenance/pages/RegistroMaquinasPage';
import HistorialRegistrosPage from './sectors/maintenance/pages/HistorialRegistrosPage';
import BuscadorMaquinaPage from './sectors/maintenance/pages/BuscadorMaquinaPage';
import PendientesPage from './sectors/maintenance/pages/PendientesPage';

// Sector: Production
import CargarProduccionPage from './sectors/production/pages/CargarProduccionPage';
import ProduccionNewDashboardPage from './sectors/production/pages/ProduccionNewDashboardPage';

// New Sectors Dashboards
import AdminDashboardPage from './sectors/admin/pages/AdminDashboardPage';
import VentasDashboardPage from './sectors/sales/pages/VentasDashboardPage';
import FinanzasDashboardPage from './sectors/finance/pages/FinanzasDashboardPage';
import RRHHDashboardPage from './sectors/hr/pages/RRHHDashboardPage';

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
                <Route path="/compras/materiales-criticos" element={<MaterialesCriticosPage />} />
                <Route path="/compras/alertas-stock" element={<AlertaStockPage />} />
                <Route path="/compras/conciliacion" element={<ConciliacionPage />} />
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
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/admin/movements" element={<AdminMovementsPage />} />
            </Route>

            {/* Rutas para Operario / Producción / Depósito / Nuevos Sectores */}
            <Route element={<PrivateRoute allowedRoles={['ADMIN', 'OPERATOR', 'COMPRAS']} />}>
                {/* Inventariado */}
                <Route path="/deposito/dashboard" element={<DashboardDepositoPage />} />
                <Route path="/deposito/auditoria-picking" element={<AuditoriaPickingPage />} />
                <Route path="/remitos-salida" element={<RemitosSalidaPage />} />
                <Route path="/reporte-salidas" element={<ReporteSalidasPage />} />
                <Route path="/stock" element={<StockPage />} />
                <Route path="/movimientos" element={<MovimientosPage />} />
                <Route path="/tasks" element={<WorkspaceTasksPage />} />
                
                {/* Mantenimiento */}
                <Route path="/mantenimiento/dashboard" element={<DashboardMantenimientoPage />} />
                <Route path="/mantenimiento/monitoreo" element={<MonitoreoVivoPage />} />
                <Route path="/mantenimiento/registro" element={<RegistroMaquinasPage />} />
                <Route path="/mantenimiento/historial" element={<HistorialRegistrosPage />} />
                <Route path="/mantenimiento/buscador" element={<BuscadorMaquinaPage />} />
                <Route path="/mantenimiento/pendientes" element={<PendientesPage />} />

                {/* Producción */}
                <Route path="/produccion/cargar" element={<CargarProduccionPage />} />
                <Route path="/produccion/dashboard" element={<ProduccionNewDashboardPage />} />

                {/* Nuevos Sectores */}
                <Route path="/produccion-nueva/dashboard" element={<ProduccionNewDashboardPage />} />
                <Route path="/ventas/dashboard" element={<VentasDashboardPage />} />
                <Route path="/finanzas/dashboard" element={<FinanzasDashboardPage />} />
                <Route path="/rrhh/dashboard" element={<RRHHDashboardPage />} />
                <Route path="/compras/dashboard" element={<DashboardComprasPage />} />
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
