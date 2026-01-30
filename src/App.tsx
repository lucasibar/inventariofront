import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CreateItemPage } from './pages/CreateItemPage';
import { LoginPage } from './pages/login/LoginPage';
import { PrivateRoute } from './app/routes/PrivateRoute';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Navigate to="/create-item" replace />} />
          <Route path="/create-item" element={<CreateItemPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
