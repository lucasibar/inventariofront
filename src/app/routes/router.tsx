import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PrivateRoute, RoleGuard } from './PrivateRoute';
import { LoginPage } from '../../pages/login/LoginPage';
import Layout from '../../shared/Layout';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../entities/auth/model/authSlice';

import { PageLoader } from '../../shared/ui';

// Sector: Config
const MaterialesPage = lazy(() => import('../../pages/warehouse/MaterialesPage'));
const SociosPage = lazy(() => import('../../pages/config/SociosPage'));
const UsersPage = lazy(() => import('../../pages/config/UsersPage'));
const BoxTypesPage = lazy(() => import('../../pages/warehouse/BoxTypesPage'));

// Sector: Warehouse
const DepositoPage = lazy(() => import('../../pages/warehouse/DepositoPage'));
const StockPage = lazy(() => import('../../pages/warehouse/StockPage'));
const MovimientosPage = lazy(() => import('../../pages/warehouse/MovimientosPage'));
const RemitosEntradaPage = lazy(() => import('../../pages/warehouse/RemitosEntradaPage'));
const RemitosSalidaPage = lazy(() => import('../../pages/warehouse/RemitosSalidaPage'));
const WorkspaceTasksPage = lazy(() => import('../../pages/warehouse/WorkspaceTasksPage'));
const ReporteConsumoDetalladoPage = lazy(() => import('../../pages/warehouse/ReporteConsumoDetalladoPage'));
const DashboardDepositoPage = lazy(() => import('../../pages/warehouse/DashboardDepositoPage'));
const ChequeoInventarioPage = lazy(() => import('../../pages/warehouse/ChequeoInventarioPage'));
const ChequeoCategoriaPage = lazy(() => import('../../pages/warehouse/ChequeoCategoriaPage'));
const ReporteChequeoPage = lazy(() => import('../../pages/warehouse/ReporteChequeoPage'));
const InformesInventariadoPage = lazy(() => import('../../pages/warehouse/InformesInventariadoPage'));
const MaterialesEstancadosPage = lazy(() => import('../../pages/warehouse/MaterialesEstancadosPage'));
const MaterialesCompletitudPage = lazy(() => import('../../pages/warehouse/MaterialesCompletitudPage'));
const CapacityDashboardPage = lazy(() => import('../../pages/warehouse/CapacityDashboardPage'));

// Sector: Purchasing (Compras)
const DashboardComprasPage = lazy(() => import('../../pages/purchasing/DashboardComprasPage'));
const AlertaStockPage = lazy(() => import('../../pages/purchasing/AlertaStockPage'));
const MaterialesCriticosPage = lazy(() => import('../../pages/purchasing/MaterialesCriticosPage'));
const MaterialesCriticosV2Page = lazy(() => import('../../pages/purchasing/MaterialesCriticosV2Page'));

// Sector: Maintenance
const DashboardMantenimientoPage = lazy(() => import('../../pages/maintenance/DashboardMantenimientoPage'));
const MonitoreoVivoPage = lazy(() => import('../../pages/maintenance/MonitoreoVivoPage'));
const RegistroMaquinasPage = lazy(() => import('../../pages/maintenance/RegistroMaquinasPage'));
const HistorialRegistrosPage = lazy(() => import('../../pages/maintenance/HistorialRegistrosPage'));
const BuscadorMaquinaPage = lazy(() => import('../../pages/maintenance/BuscadorMaquinaPage'));
const PendientesPage = lazy(() => import('../../pages/maintenance/PendientesPage'));
const InformeTurnosPage = lazy(() => import('../../pages/maintenance/InformeTurnosPage'));
const CambioArticuloPage = lazy(() => import('../../pages/maintenance/CambioArticuloPage'));
const HistorialCambiosPage = lazy(() => import('../../pages/maintenance/HistorialCambiosPage'));
const InformeCambiosPage = lazy(() => import('../../pages/maintenance/InformeCambiosPage'));
const DisponibilidadMaquinaPage = lazy(() => import('../../pages/maintenance/DisponibilidadMaquinaPage'));
const DisponibilidadMaquinaV2Page = lazy(() => import('../../pages/maintenance/DisponibilidadMaquinaV2Page'));

// Sector: Quality (Calidad) & Producción
const CuarentenaCalidadPage = lazy(() => import('../../pages/quality/CuarentenaCalidadPage'));
const OrdenesProduccionPage = lazy(() => import('../../pages/quality/OrdenesProduccionPage'));
const StockPedidosArticulosPage = lazy(() => import('../../pages/produccion/StockPedidosArticulosPage'));
const InformeTejeduriaPage = lazy(() => import('../../pages/produccion/InformeTejeduriaPage'));
const InformeCambiosDiaPage = lazy(() => import('../../pages/produccion/InformeCambiosDiaPage'));
const InformeProduccionDepositoPage = lazy(() => import('../../pages/warehouse/InformeProduccionDepositoPage'));

// Sector: Desarrollo
const DesarrolloArticulosPage = lazy(() => import('../../pages/desarrollo/ArticulosPage').then(m => ({ default: m.ArticulosPage })));
const DesarrolloEstructurasPage = lazy(() => import('../../pages/desarrollo/EstructurasPage').then(m => ({ default: m.EstructurasPage })));
const DesarrolloEquivalenciasPage = lazy(() => import('../../pages/desarrollo/EquivalenciasPage').then(m => ({ default: m.EquivalenciasPage })));
const DesarrolloMaquinasPage = lazy(() => import('../../pages/desarrollo/AsignacionMaquinasPage').then(m => ({ default: m.AsignacionMaquinasPage })));

// New Sectors Dashboards
const AdminDashboardPage = lazy(() => import('../../pages/admin/AdminDashboardPage'));
const AuditoriaSistemaPage = lazy(() => import('../../pages/admin/AuditoriaSistemaPage'));
const VentasDashboardPage = lazy(() => import('../../pages/sales/VentasDashboardPage'));
const FinanzasDashboardPage = lazy(() => import('../../pages/finance/FinanzasDashboardPage'));
const RRHHDashboardPage = lazy(() => import('../../pages/hr/RRHHDashboardPage'));

// Other
const AdminMovementsPage = lazy(() => import('../../pages/warehouse/AdminMovementsPage'));
const NotificationsPage = lazy(() => import('../../pages/config/NotificationsPage'));
const HelpPage = lazy(() => import('../../pages/help/HelpPage'));

const FallbackLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary, #0f1117)' }}>
    <PageLoader text="Cargando sección..." />
  </div>
);

const LazyRoute = ({ element: Element, props }: { element: any; props?: any }) => (
  <Suspense fallback={<FallbackLoader />}>
    <Element {...props} />
  </Suspense>
);

const getHome = (role?: string, sector?: string) => {
    const r = role?.toUpperCase();
    const s = sector?.toUpperCase();
    if (r === 'ADMIN') return '/admin/dashboard';
    if (s === 'PRODUCCION') return '/produccion/planificacion';
    if (s === 'DESARROLLO') return '/desarrollo/articulos';
    if (s === 'DEPOSITO') return '/deposito/dashboard';
    if (s === 'COMPRAS') return '/compras/dashboard';
    if (s === 'MANTENIMIENTO') return '/mantenimiento/dashboard';
    if (s === 'VENTAS') return '/ventas/dashboard';
    if (s === 'FINANZAS') return '/finanzas/dashboard';
    if (s === 'RRHH') return '/rrhh/dashboard';
    if (s === 'CALIDAD') return '/calidad/cuarentena';
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
          // Config & Operaciones
          {
            element: <RoleGuard allowedRoles={['ADMIN', 'SUPERVISOR', 'OPERARIO']} />,
            children: [
              { path: "remitos-entrada", element: <LazyRoute element={RemitosEntradaPage} /> },
              { path: "items", element: <LazyRoute element={MaterialesPage} /> },
              { path: "items/box-types", element: <LazyRoute element={BoxTypesPage} /> },
              { path: "socios", element: <LazyRoute element={SociosPage} /> },
            ]
          },
          // ADMIN
          {
            element: <RoleGuard allowedRoles={['ADMIN']} />,
            children: [
              { path: "users", element: <LazyRoute element={UsersPage} /> },
              { path: "admin/dashboard", element: <LazyRoute element={AdminDashboardPage} /> },
              { path: "admin/auditoria", element: <LazyRoute element={AuditoriaSistemaPage} /> },
            ]
          },
          // SUPERVISOR + ADMIN
          {
            element: <RoleGuard allowedRoles={['ADMIN', 'SUPERVISOR']} />,
            children: [
              { path: "admin/movements", element: <LazyRoute element={AdminMovementsPage} /> },
              { path: "chequeo-inventario", element: <LazyRoute element={ChequeoInventarioPage} /> },
              { path: "chequeo-categoria", element: <LazyRoute element={ChequeoCategoriaPage} /> },
              { path: "reporte-chequeo", element: <LazyRoute element={ReporteChequeoPage} /> },
              { path: "deposito/informes", element: <LazyRoute element={InformesInventariadoPage} /> },
            ]
          },
          // Sectores Operativos
          {
            element: <RoleGuard allowedRoles={['ADMIN', 'SUPERVISOR', 'OPERARIO']} />,
            children: [
              // Sector: Producción
              { path: "produccion/planificacion", element: <LazyRoute element={OrdenesProduccionPage} props={{ sectorMode: 'PRODUCCION' }} /> },
              { path: "produccion/pedidos", element: <LazyRoute element={StockPedidosArticulosPage} /> },
              { path: "produccion/informe-tejeduria", element: <LazyRoute element={InformeTejeduriaPage} /> },
              { path: "produccion/informe-cambios-dia", element: <LazyRoute element={InformeCambiosDiaPage} /> },

              // Sector: Depósito
              { path: "deposito/dashboard", element: <LazyRoute element={DashboardDepositoPage} /> },
              { path: "deposito/informes-produccion", element: <LazyRoute element={InformeProduccionDepositoPage} /> },
              { path: "deposito/picking-produccion", element: <LazyRoute element={OrdenesProduccionPage} props={{ sectorMode: 'DEPOSITO' }} /> },
              { path: "deposito/capacidad", element: <LazyRoute element={CapacityDashboardPage} /> },
              { path: "remitos-salida", element: <LazyRoute element={RemitosSalidaPage} /> },
              { path: "reporte-consumo-detallado", element: <LazyRoute element={ReporteConsumoDetalladoPage} /> },
              { path: "stock", element: <LazyRoute element={StockPage} /> },
              { path: "movimientos", element: <LazyRoute element={MovimientosPage} /> },
              { path: "tasks", element: <LazyRoute element={WorkspaceTasksPage} /> },
              { path: "deposito/materiales-estancados", element: <LazyRoute element={MaterialesEstancadosPage} /> },
              { path: "deposito/completitud-materiales", element: <LazyRoute element={MaterialesCompletitudPage} /> },

              // Sector: Compras
              { path: "compras/dashboard", element: <LazyRoute element={DashboardComprasPage} /> },
              { path: "compras/faltantes-produccion", element: <LazyRoute element={OrdenesProduccionPage} props={{ sectorMode: 'COMPRAS' }} /> },
              { path: "compras/alertas-stock", element: <LazyRoute element={AlertaStockPage} /> },
              { path: "compras/materiales-criticos", element: <LazyRoute element={MaterialesCriticosPage} /> },
              { path: "compras/materiales-criticos-v2", element: <LazyRoute element={MaterialesCriticosV2Page} /> },

              // Sector: Mantenimiento
              { path: "mantenimiento/dashboard", element: <LazyRoute element={DashboardMantenimientoPage} /> },
              { path: "mantenimiento/monitoreo", element: <LazyRoute element={MonitoreoVivoPage} /> },
              { path: "mantenimiento/registro", element: <LazyRoute element={RegistroMaquinasPage} /> },
              { path: "mantenimiento/historial", element: <LazyRoute element={HistorialRegistrosPage} /> },
              { path: "mantenimiento/buscador", element: <LazyRoute element={BuscadorMaquinaPage} /> },
              { path: "mantenimiento/pendientes", element: <LazyRoute element={PendientesPage} /> },
              { path: "mantenimiento/informe-turnos", element: <LazyRoute element={InformeTurnosPage} /> },
              { path: "mantenimiento/cambios", element: <LazyRoute element={CambioArticuloPage} /> },
              { path: "mantenimiento/historial-cambios", element: <LazyRoute element={HistorialCambiosPage} /> },
              { path: "mantenimiento/informe-cambios", element: <LazyRoute element={InformeCambiosPage} /> },
              { path: "mantenimiento/kpi/disponibilidad", element: <LazyRoute element={DisponibilidadMaquinaPage} /> },
              { path: "mantenimiento/kpi/disponibilidad-v2", element: <LazyRoute element={DisponibilidadMaquinaV2Page} /> },

              { path: "ventas/dashboard", element: <LazyRoute element={VentasDashboardPage} /> },
              { path: "finanzas/dashboard", element: <LazyRoute element={FinanzasDashboardPage} /> },
              { path: "rrhh/dashboard", element: <LazyRoute element={RRHHDashboardPage} /> },

              // Sector: Calidad
              { path: "calidad/articulos", element: <Navigate to="/desarrollo/articulos" replace /> },
              { path: "calidad/cuarentena", element: <LazyRoute element={CuarentenaCalidadPage} /> },
              { path: "calidad/ordenes-produccion", element: <Navigate to="/produccion/planificacion" replace /> },

              // Sector: Desarrollo
              { path: "desarrollo/equivalencias", element: <LazyRoute element={DesarrolloEquivalenciasPage} /> },
              { path: "desarrollo/articulos", element: <LazyRoute element={DesarrolloArticulosPage} /> },
              { path: "desarrollo/estructuras", element: <LazyRoute element={DesarrolloEstructurasPage} /> },
              { path: "desarrollo/maquinas", element: <LazyRoute element={DesarrolloMaquinasPage} /> },
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
