import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGetAlertsQuery } from '../features/stock/api/stock.api';
import { logout, selectCurrentUser } from '../entities/auth/model/authSlice';
import { useIsMobile } from '../pages/common/ui';

const navItems = [
    { to: '/stock', label: '📋 Stock' },
    { to: '/movimientos', label: '🔄 Movimientos' },
    { to: '/remitos-entrada', label: '📥 Remitos Entrada' },
    { to: '/remitos-salida', label: '📤 Remitos Salida' },
    { to: '/dashboard', label: '📊 Dashboard Compras' },
    { to: '/dashboard/capacity', label: '📈 Capacidad' },
    { to: '/dashboard/volumes', label: '📦 Volúmenes' },
    { to: '/pedidos', label: '📋 Órdenes de Compra' },
    { to: '/pedidos-compra', label: '🛒 Pedidos Compra' },
    { to: '/items', label: '🗂 Materiales' },
    { to: '/socios', label: '🤝 Socios' },
    { to: '/deposito', label: '🏭 Estructura' },
    { to: '/deposito/auditoria-picking', label: '✅ Picking' },
    { to: '/users', label: '👥 Usuarios' },
    { to: '/tasks', label: '✅ Tareas' },
    { to: '/admin/movements', label: '🛡️ Auditoría' },
];

const navStyle = (isActive: boolean, isMobile: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: isMobile ? '14px 20px' : '10px 14px', textDecoration: 'none',
    color: isActive ? '#a5b4fc' : '#9ca3af',
    background: isActive ? 'rgba(165,180,252,0.08)' : 'transparent',
    borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
    fontSize: isMobile ? '15px' : '13px', whiteSpace: 'nowrap',
    transition: 'all 0.15s',
});

export default function Layout() {
    const isMobile = useIsMobile();
    const user = useSelector(selectCurrentUser);
    const role = user?.role?.toUpperCase() || '';
    const isAdmin = role === 'ADMIN';
    const isCompras = role === 'COMPRAS';
    const isOperario = role === 'OPERATOR';

    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    
    const { data: alerts = [] } = useGetAlertsQuery();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const filteredNavItems = navItems.filter(item => {
        if (isAdmin) return true;
        if (isOperario) return ['/movimientos', '/stock', '/deposito/auditoria-picking', '/remitos-salida', '/tasks', '/deposito'].includes(item.to);
        if (isCompras) return ['/dashboard', '/remitos-entrada', '/items', '/dashboard/capacity', '/dashboard/volumes', '/socios', '/pedidos-compra'].includes(item.to);
        return false;
    });

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login', { replace: true });
    };

    const SidebarContent = () => (
        <>
            <div style={{ padding: '16px 12px', borderBottom: '1px solid #2a2d3e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {(!collapsed || isMobile) && <span style={{ color: '#a5b4fc', fontWeight: 700, fontSize: '15px', whiteSpace: 'nowrap' }}>📦 WMS INVENTARIO</span>}
                    {(!collapsed || isMobile) && <span style={{ color: '#6b7280', fontSize: '10px', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '1px' }}>{role}</span>}
                </div>
                {!isMobile && (
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '18px', padding: '2px 6px' }}
                    >
                        {collapsed ? '›' : '‹'}
                    </button>
                )}
            </div>

            <nav className="custom-scrollbar" style={{ flex: 1, paddingTop: '8px', overflowY: 'auto' }}>
                {filteredNavItems.map(({ to, label }) => (
                    <NavLink key={to} to={to} style={({ isActive }) => navStyle(isActive, isMobile)}>
                        <span style={{ fontSize: isMobile ? '20px' : '16px', minWidth: '24px' }}>{label.split(' ')[0]}</span>
                        {(!collapsed || isMobile) && <span>{label.split(' ').slice(1).join(' ')}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Actions */}
            <div style={{ borderTop: '1px solid #2a2d3e', padding: '8px 0' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: isMobile ? '16px 20px' : '10px 14px', width: '100%',
                        background: 'transparent', border: 'none',
                        color: '#9ca3af', fontSize: isMobile ? '15px' : '13px',
                        cursor: 'pointer', transition: 'all 0.15s',
                    }}
                >
                    <span style={{ fontSize: isMobile ? '20px' : '16px', minWidth: '24px' }}>🚪</span>
                    {(!collapsed || isMobile) && <span>Cerrar Sesión</span>}
                </button>
            </div>
        </>
    );

    return (
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', background: '#0f1117', color: '#f3f4f6' }}>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2d3e; borderRadius: 10px; }
                .nav-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 998;
                    opacity: ${mobileMenuOpen ? 1 : 0}; visibility: ${mobileMenuOpen ? 'visible' : 'hidden'};
                    transition: all 0.3s ease;
                }
            `}</style>

            {/* Mobile Header */}
            {isMobile && (
                <header style={{ 
                    height: '56px', background: '#1a1d2e', borderBottom: '1px solid #2a2d3e', 
                    display: 'flex', alignItems: 'center', padding: '0 12px', zIndex: 997,
                    justifyContent: 'space-between', flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' }}>
                        <button 
                            onClick={() => setMobileMenuOpen(true)}
                            style={{ 
                                background: 'transparent', border: 'none', color: '#f3f4f6', 
                                fontSize: '24px', cursor: 'pointer', padding: '4px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            ☰
                        </button>
                        <span style={{ 
                            fontWeight: 800, 
                            color: '#a5b4fc', 
                            fontSize: '15px', 
                            letterSpacing: '0.2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textTransform: 'uppercase'
                        }}>
                            {navItems.find(i => i.to === location.pathname.split('?')[0])?.label.split(' ').slice(1).join(' ') || 'WMS'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(location.pathname === '/stock' || location.pathname === '/movimientos') && (
                            <button
                                onClick={() => {
                                    const sep = location.search ? '&' : '?';
                                    navigate(location.pathname + location.search + sep + 'qa=1', { replace: true });
                                }}
                                style={{
                                    background: '#6366f1',
                                    border: 'none',
                                    color: 'white',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                                }}
                            >
                                +
                            </button>
                        )}

                        {alerts.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.15)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(239,68,68,0.3)' }}>
                                <span style={{ fontSize: '14px' }}>⚠️</span>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#f87171' }}>{alerts.length}</span>
                            </div>
                        )}
                    </div>
                </header>
            )}

            {/* User Overlay for Mobile Menu */}
            {isMobile && <div className="nav-overlay" onClick={() => setMobileMenuOpen(false)} />}

            {/* Sidebar / Drawer */}
            <aside style={{
                position: isMobile ? 'fixed' : 'relative',
                left: isMobile && !mobileMenuOpen ? '-280px' : '0',
                top: 0, bottom: 0,
                width: isMobile ? '280px' : (collapsed ? '60px' : '220px'),
                background: 'linear-gradient(180deg, #1a1d2e 0%, #141622 100%)',
                borderRight: '1px solid #2a2d3e',
                display: 'flex', flexDirection: 'column',
                transition: 'all 0.3s ease',
                zIndex: 999,
                flexShrink: 0,
            }}>
                <SidebarContent />
            </aside>

            {/* Main Content Area */}
            <main style={{ 
                flex: 1, 
                overflowY: 'auto', 
                overflowX: 'hidden',
                position: 'relative',
                width: '100%'
            }}>
                <Outlet />
            </main>
        </div>
    );
}
