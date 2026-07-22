import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PrivateRoute, RoleGuard } from './PrivateRoute';
import { LoginPage } from '../../pages/login/LoginPage';
import Layout from '../../shared/Layout';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../entities/auth/model/authSlice';
import { UserRole } from '../../shared/types/roles';
import { PageLoader } from '../../shared/ui';

// Sector: Config
const MaterialesPage = lazy(() => import('../../pages/warehouse/MaterialesPage'));
const SociosPage = lazy(() => import('../../pages/config/SociosPage'));
const UsersPage = lazy(() => import('../../pages/config/UsersPage'));
const BoxTypesPage = lazy(() => import('../../pages/warehouse/BoxTypesPage'));

// Sector: Warehouse
const DepositoPage = lazy(() => import('../../pages/warehouse/DepositoPage'));
const StockPage = lazy(() => import('../../pages/warehouse/StockPage'));
const Stock1Page = lazy(() => import('../../pages/warehouse/Stock1Page'));
const MovimientosPage = lazy(() => import('../../pages/warehouse/MovimientosPage'));
const RemitosEntradaPage = lazy(() => import('../../pages/warehouse/RemitosEntradaPage'));
const RemitosSalidaPage = lazy(() => import('../../pages/warehouse/RemitosSalidaPage'));
const WorkspaceTasksPage = lazy(() => import('../../pages/warehouse/WorkspaceTasksPage'));
const ReporteConsumoDetalladoPage = lazy(() => import('../../pages/warehouse/ReporteConsumoDetalladoPage'));
const DashboardDepositoPage = lazy(() => import('../../pages/warehouse/DashboardDepositoPage'));

// Sector: Purchasing
const DashboardComprasPage = lazy(() => import('../../pages/purchasing/DashboardComprasPage'));
const MaterialesCriticosPage = lazy(() => import('../../pages/purchasing/MaterialesCriticosPage'));
const ConciliacionPage = lazy(() => import('../../pages/purchasing/ConciliacionPage'));
const AlertaStockPage = lazy(() => import('../../pages/purchasing/AlertaStockPage'));
const CapacityDashboardPage = lazy(() => import('../../pages/purchasing/CapacityDashboardPage'));
const VolumenesDashboardPage = lazy(() => import('../../pages/purchasing/VolumenesDashboardPage'));
const PedidosCompraPage = lazy(() => import('../../pages/purchasing/PedidosCompraPage'));
const GraficoSierraPage = lazy(() => import('../../pages/purchasing/GraficoSierraPage'));

// Sector: Maintenance
const DashboardMantenimientoPage = lazy(() => import('../../pages/maintenance/DashboardMantenimientoPage'));
const MonitoreoVivoPage = lazy(() => import('../../pages/maintenance/MonitoreoVivoPage'));
const RegistroMaquinasPage = lazy(() => import('../../pages/maintenance/RegistroMaquinasPage'));
const HistorialRegistrosPage = lazy(() => import('../../pages/maintenance/HistorialRegistrosPage'));
const BuscadorMaquinaPage = lazy(() => import('../../pages/maintenance/BuscadorMaquinaPage'));
const PendientesPage = lazy(() => import('../../pages/maintenance/PendientesPage'));
const InformeTurnosPage = lazy(() => import('../../pages/maintenance/InformeTurnosPage'));

// Sector: Production
const CargarProduccionPage = lazy(() => import('../../pages/production/CargarProduccionPage'));
const ProduccionNewDashboardPage = lazy(() => import('../../pages/production/ProduccionNewDashboardPage'));

// New Sectors Dashboards
const AdminDashboardPage = lazy(() => import('../../pages/admin/AdminDashboardPage'));
const VentasDashboardPage = lazy(() => import('../../pages/sales/VentasDashboardPage'));
const FinanzasDashboardPage = lazy(() => import('../../pages/finance/FinanzasDashboardPage'));
const RRHHDashboardPage = lazy(() => import('../../pages/hr/RRHHDashboardPage'));

// Other
const AdminMovementsPage = lazy(() => import('../../pages/warehouse/AdminMovementsPage'));
const NotificationsPage = lazy(() => import('../../pages/config/NotificationsPage'));
const HelpPage = lazy(() => import('../../pages/help/HelpPage'));

const FallbackLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f1117' }}>
    <PageLoader text="Cargando sección..." />
  </div>
);

const LazyRoute = ({ element: Element }: { element: any }) => (
  <Suspense fallback={<FallbackLoader />}>
    <Element />
  </Suspense>
);

const getHome = (role?: string, sector?: string) => {
    const r = role?.toUpperCase();
    const s = sector?.toUpperCase();
    if (r === 'ADMIN') return '/admin/dashboard';
    if (s === 'COMPRAS') return '/dashboard';
    if (s === 'DEPOSITO') return '/deposito/dashboard';
    if (s === 'MANTENIMIENTO') return '/mantenimiento/dashboard';
    if (s === 'PRODUCCION') return '/produccion/dashboard';
    if (s === 'VENTAS') return '/ventas/dashboard';
    if (s === 'FINANZAS') return '/finanzas/dashboard';
    if (s === 'RRHH') return '/rrhh/dashboard';
    return '/deposito/dashboard';
};

const RootRedirect = () => {
  const user = useSelector(selectCurrentUser);
  return <Navigate to={getHome(user?.role, user?.sector)} replace />;
};

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/",
    element: <PrivateRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            index: true,
            element: <RootRedirect />
          },
          // Compras / Config
          {
            element: <RoleGuard allowedRoles={['ADMIN', 'SUPERVISOR', 'OPERARIO']} />,
            children: [
              { path: "remitos-entrada", element: <LazyRoute element={RemitosEntradaPage} /> },
              { path: "dashboard", element: <LazyRoute element={DashboardComprasPage} /> },
              { path: "compras/materiales-criticos", element: <LazyRoute element={MaterialesCriticosPage} /> },
              { path: "compras/alertas-stock", element: <LazyRoute element={AlertaStockPage} /> },
              { path: "compras/conciliacion", element: <LazyRoute element={ConciliacionPage} /> },
              { path: "compras/grafico-sierra", element: <LazyRoute element={GraficoSierraPage} /> },
              { path: "dashboard/capacity", element: <LazyRoute element={CapacityDashboardPage} /> },
              { path: "dashboard/volumes", element: <LazyRoute element={VolumenesDashboardPage} /> },
              { path: "items", element: <LazyRoute element={MaterialesPage} /> },
              { path: "items/box-types", element: <LazyRoute element={BoxTypesPage} /> },
              { path: "socios", element: <LazyRoute element={SociosPage} /> },
              { path: "pedidos-compra", element: <LazyRoute element={PedidosCompraPage} /> },
            ]
          },
          // ADMIN
          {
            element: <RoleGuard allowedRoles={['ADMIN']} />,
            children: [
              { path: "users", element: <LazyRoute element={UsersPage} /> },
              { path: "admin/dashboard", element: <LazyRoute element={AdminDashboardPage} /> },
            ]
          },
          // SUPERVISOR + ADMIN
          {
            element: <RoleGuard allowedRoles={['ADMIN', 'SUPERVISOR']} />,
            children: [
              { path: "admin/movements", element: <LazyRoute element={AdminMovementsPage} /> },
            ]
          },
          // Operario / Produccion / Deposito
          {
            element: <RoleGuard allowedRoles={['ADMIN', 'SUPERVISOR', 'OPERARIO']} />,
            children: [
              { path: "deposito/dashboard", element: <LazyRoute element={DashboardDepositoPage} /> },
              { path: "remitos-salida", element: <LazyRoute element={RemitosSalidaPage} /> },
              { path: "reporte-consumo-detallado", element: <LazyRoute element={ReporteConsumoDetalladoPage} /> },
              { path: "stock", element: <LazyRoute element={StockPage} /> },
              { path: "stock1", element: <LazyRoute element={Stock1Page} /> },
              { path: "movimientos", element: <LazyRoute element={MovimientosPage} /> },
              { path: "tasks", element: <LazyRoute element={WorkspaceTasksPage} /> },
              
              { path: "mantenimiento/dashboard", element: <LazyRoute element={DashboardMantenimientoPage} /> },
              { path: "mantenimiento/monitoreo", element: <LazyRoute element={MonitoreoVivoPage} /> },
              { path: "mantenimiento/registro", element: <LazyRoute element={RegistroMaquinasPage} /> },
              { path: "mantenimiento/historial", element: <LazyRoute element={HistorialRegistrosPage} /> },
              { path: "mantenimiento/buscador", element: <LazyRoute element={BuscadorMaquinaPage} /> },
              { path: "mantenimiento/pendientes", element: <LazyRoute element={PendientesPage} /> },
              { path: "mantenimiento/informe-turnos", element: <LazyRoute element={InformeTurnosPage} /> },

              { path: "produccion/cargar", element: <LazyRoute element={CargarProduccionPage} /> },
              { path: "produccion/dashboard", element: <LazyRoute element={ProduccionNewDashboardPage} /> },

              { path: "produccion-nueva/dashboard", element: <LazyRoute element={ProduccionNewDashboardPage} /> },
              { path: "ventas/dashboard", element: <LazyRoute element={VentasDashboardPage} /> },
              { path: "finanzas/dashboard", element: <LazyRoute element={FinanzasDashboardPage} /> },
              { path: "rrhh/dashboard", element: <LazyRoute element={RRHHDashboardPage} /> },
              { path: "compras/dashboard", element: <LazyRoute element={DashboardComprasPage} /> },
            ]
          },
          // Shared
          { path: "deposito", element: <LazyRoute element={DepositoPage} /> },
          { path: "notificaciones", element: <LazyRoute element={NotificationsPage} /> },
          { path: "ayuda", element: <LazyRoute element={HelpPage} /> },
        ]
      }
    ]
  }
]);
