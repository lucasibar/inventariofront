import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGetAlertsQuery } from '../features/stock/api/stock.api';
import { logout, selectCurrentUser } from '../entities/auth/model/authSlice';

const navItems = [
    { to: '/remitos-entrada', label: '📦 Remitos Entrada' },
    { to: '/deposito', label: '🏭 Depósito' },
    { to: '/deposito/auditoria-picking', label: '✅ Auditoría Picking' },
    { to: '/pedidos', label: '📋 Pedidos' },
    { to: '/remitos-salida', label: '🚚 Remitos Salida' },
    { to: '/stock', label: '📋 Stock' },
    { to: '/dashboard', label: '📊 Dashboard Compras' },
    { to: '/movimientos', label: '🔄 Movimientos' },
    { to: '/consultas', label: '🔍 Consultas Intel' },
    { to: '/items', label: '🗂 Materiales' },
    { to: '/items/box-types', label: '📦 Tipos de Caja' },
    { to: '/dashboard/capacity', label: '📊 Medidores Capacidad' },
    { to: '/socios', label: '🤝 Proveedores/Clientes' },
    { to: '/tasks', label: '✅ Mis Tareas' },
];

const navStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 14px', textDecoration: 'none',
    color: isActive ? '#a5b4fc' : '#9ca3af',
    background: isActive ? 'rgba(165,180,252,0.08)' : 'transparent',
    borderLeft: isActive ? '3px solid #a5b4fc' : '3px solid transparent',
    fontSize: '13px', whiteSpace: 'nowrap',
    transition: 'all 0.15s',
});

export default function Layout() {
    const user = useSelector(selectCurrentUser);
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

    const [collapsed, setCollapsed] = useState(false);
    const { data: alerts = [] } = useGetAlertsQuery();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login', { replace: true });
    };

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, sans-serif', background: '#0f1117' }}>
            {/* Sidebar */}
            <aside style={{
                width: collapsed ? '60px' : '220px',
                background: 'linear-gradient(180deg, #1a1d2e 0%, #141622 100%)',
                borderRight: '1px solid #2a2d3e',
                display: 'flex', flexDirection: 'column',
                transition: 'width 0.2s ease',
                overflow: 'hidden',
                flexShrink: 0,
            }}>
                <div style={{ padding: '16px 12px', borderBottom: '1px solid #2a2d3e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {!collapsed && <span style={{ color: '#a5b4fc', fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap' }}>📦 WMS</span>}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '18px', padding: '2px 6px' }}
                    >
                        {collapsed ? '›' : '‹'}
                    </button>
                </div>

                {/* Main nav */}
                <nav style={{ flex: 1, paddingTop: '8px' }}>
                    {navItems
                        .filter(item => item.to !== '/deposito' || isAdmin)
                        .map(({ to, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                style={({ isActive }) => navStyle(isActive)}
                            >
                                <span style={{ fontSize: '16px', minWidth: '20px' }}>{label.split(' ')[0]}</span>
                                {!collapsed && <span>{label.split(' ').slice(1).join(' ')}</span>}
                            </NavLink>
                        ))}
                </nav>

                {/* Stock alert */}
                {alerts.length > 0 && (
                    <div style={{
                        padding: collapsed ? '12px 8px' : '12px 14px',
                        background: 'rgba(239,68,68,0.1)',
                        borderTop: '1px solid #2a2d3e',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        <span style={{ fontSize: '16px' }}>🔴</span>
                        {!collapsed && (
                            <span style={{ color: '#f87171', fontSize: '12px', lineHeight: 1.3 }}>
                                {alerts.length} material{alerts.length > 1 ? 'es' : ''} bajo stock
                            </span>
                        )}
                    </div>
                )}

                {/* Bottom actions */}
                <div style={{ borderTop: '1px solid #2a2d3e', paddingBottom: '8px', paddingTop: '4px' }}>

                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 14px', width: '100%',
                            background: 'transparent', border: 'none',
                            borderLeft: '3px solid transparent',
                            color: '#9ca3af', fontSize: '13px',
                            cursor: 'pointer', whiteSpace: 'nowrap',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9ca3af'; }}
                    >
                        <span style={{ fontSize: '16px', minWidth: '20px' }}>🚪</span>
                        {!collapsed && <span>Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main style={{ flex: 1, overflow: 'auto', background: '#0f1117' }}>
                <Outlet />
            </main>
        </div>
    );
}

