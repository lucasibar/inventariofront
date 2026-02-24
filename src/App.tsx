import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './app/routes/PrivateRoute';
import { LoginPage } from './pages/login/LoginPage';
import Layout from './shared/Layout';

// Lazy-import pages
import RemitosEntradaPage from './pages/RemitosEntradaPage';
import DepositoPage from './pages/DepositoPage';
import PedidosPage from './pages/PedidosPage';
import RemitosSalidaPage from './pages/RemitosSalidaPage';
import DashboardComprasPage from './pages/DashboardComprasPage';
import MaterialesPage from './pages/MaterialesPage';
import SociosPage from './pages/SociosPage';
import SettingsPage from './pages/SettingsPage';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/remitos-entrada" replace />} />
            <Route path="/remitos-entrada" element={<RemitosEntradaPage />} />
            <Route path="/deposito" element={<DepositoPage />} />
            <Route path="/pedidos" element={<PedidosPage />} />
            <Route path="/remitos-salida" element={<RemitosSalidaPage />} />
            <Route path="/dashboard" element={<DashboardComprasPage />} />
            <Route path="/items" element={<MaterialesPage />} />
            <Route path="/socios" element={<SociosPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

