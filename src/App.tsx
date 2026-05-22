import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute, RoleGuard } from './app/routes/PrivateRoute';
import { LoginPage } from './pages/login/LoginPage';
import Layout from './shared/Layout';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from './entities/auth/model/authSlice';


// Sector: Config
const MaterialesPage = lazy(() => import('./sectors/warehouse/pages/MaterialesPage'));
const SociosPage = lazy(() => import('./sectors/config/pages/SociosPage'));
const UsersPage = lazy(() => import('./sectors/config/pages/UsersPage'));
const BoxTypesPage = lazy(() => import('./sectors/warehouse/pages/BoxTypesPage'));

// Sector: Warehouse
const DepositoPage = lazy(() => import('./sectors/warehouse/pages/DepositoPage'));
const StockPage = lazy(() => import('./sectors/warehouse/pages/StockPage'));
const MovimientosPage = lazy(() => import('./sectors/warehouse/pages/MovimientosPage'));
const RemitosEntradaPage = lazy(() => import('./sectors/warehouse/pages/RemitosEntradaPage'));
const RemitosSalidaPage = lazy(() => import('./sectors/warehouse/pages/RemitosSalidaPage'));
const AuditoriaPickingPage = lazy(() => import('./sectors/warehouse/pages/AuditoriaPickingPage'));
const WorkspaceTasksPage = lazy(() => import('./sectors/warehouse/pages/WorkspaceTasksPage'));
const ReporteSalidasPage = lazy(() => import('./sectors/warehouse/pages/ReporteSalidasPage'));
const DashboardDepositoPage = lazy(() => import('./sectors/warehouse/pages/DashboardDepositoPage'));

// Sector: Purchasing
const DashboardComprasPage = lazy(() => import('./sectors/purchasing/pages/DashboardComprasPage'));
const MaterialesCriticosPage = lazy(() => import('./sectors/purchasing/pages/MaterialesCriticosPage'));
const ConciliacionPage = lazy(() => import('./sectors/purchasing/pages/ConciliacionPage'));
const AlertaStockPage = lazy(() => import('./sectors/purchasing/pages/AlertaStockPage'));
const CapacityDashboardPage = lazy(() => import('./sectors/purchasing/pages/CapacityDashboardPage'));
const VolumenesDashboardPage = lazy(() => import('./sectors/purchasing/pages/VolumenesDashboardPage'));
const PedidosCompraPage = lazy(() => import('./sectors/purchasing/pages/PedidosCompraPage'));

// Sector: Maintenance
const DashboardMantenimientoPage = lazy(() => import('./sectors/maintenance/pages/DashboardMantenimientoPage'));
const MonitoreoVivoPage = lazy(() => import('./sectors/maintenance/pages/MonitoreoVivoPage'));
const RegistroMaquinasPage = lazy(() => import('./sectors/maintenance/pages/RegistroMaquinasPage'));
const HistorialRegistrosPage = lazy(() => import('./sectors/maintenance/pages/HistorialRegistrosPage'));
const BuscadorMaquinaPage = lazy(() => import('./sectors/maintenance/pages/BuscadorMaquinaPage'));
const PendientesPage = lazy(() => import('./sectors/maintenance/pages/PendientesPage'));
const InformeTurnosPage = lazy(() => import('./sectors/maintenance/pages/InformeTurnosPage'));

// Sector: Production
const CargarProduccionPage = lazy(() => import('./sectors/production/pages/CargarProduccionPage'));
const ProduccionNewDashboardPage = lazy(() => import('./sectors/production/pages/ProduccionNewDashboardPage'));

// New Sectors Dashboards
const AdminDashboardPage = lazy(() => import('./sectors/admin/pages/AdminDashboardPage'));
const VentasDashboardPage = lazy(() => import('./sectors/sales/pages/VentasDashboardPage'));
const FinanzasDashboardPage = lazy(() => import('./sectors/finance/pages/FinanzasDashboardPage'));
const RRHHDashboardPage = lazy(() => import('./sectors/hr/pages/RRHHDashboardPage'));

// Other
const AdminMovementsPage = lazy(() => import('./sectors/warehouse/pages/AdminMovementsPage'));
const NotificationsPage = lazy(() => import('./sectors/config/pages/NotificationsPage'));
const PedidosPage = lazy(() => import('./sectors/sales/pages/PedidosPage'));

import './App.css';

function App() {
  const user = useSelector(selectCurrentUser);
  
  const getHome = (role?: string) => {
    const r = role?.toUpperCase();
    if (r === 'COMPRAS') return '/dashboard';
    if (r === 'ADMIN') return '/mantenimiento/dashboard';
    if (r === 'OPERATOR' || r === 'SUPERVISOR') return '/deposito/dashboard';
    return '/deposito/dashboard';
  };

  return (
    <BrowserRouter>
      <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to={getHome(user?.role)} replace />} />
              
              {/* Rutas para Compras / Configuración */}
              <Route element={<RoleGuard allowedRoles={['ADMIN', 'COMPRAS']} />}>
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
              <Route element={<RoleGuard allowedRoles={['ADMIN']} />}>
                  <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/admin/movements" element={<AdminMovementsPage />} />
              </Route>

              {/* Rutas para Operario / Producción / Depósito / Nuevos Sectores */}
              <Route element={<RoleGuard allowedRoles={['ADMIN', 'OPERATOR', 'COMPRAS', 'SUPERVISOR']} />}>
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
                  <Route path="/mantenimiento/informe-turnos" element={<InformeTurnosPage />} />

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
