import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGetAlertsQuery } from '../sectors/warehouse/stock/api/stock.api';
import { logout, selectCurrentUser } from '../entities/auth/model/authSlice';
import { setCurrentAlerts, selectHasUnreadNotifications } from '../entities/notifications/notificationsSlice';
import { useIsMobile } from './ui';
import { AiChatBot } from '../components/ai/AiChatBot';

const navGroups = [
    {
        id: 'administracion',
        label: 'Administración',
        icon: '📊',
        items: [
            { to: '/admin/dashboard', label: '📈 Dashboard General' },
            { to: '/users', label: '👥 Usuarios' },
            { to: '/admin/movements', label: '🛡️ Auditoría' },
        ]
    },
    {
        id: 'deposito',
        label: 'Inventariado',
        icon: '🏭',
        items: [
            { to: '/stock/dashboard', label: '📊 Dashboard Inv' },
            { to: '/stock', label: '📋 Stock' },
            { to: '/movimientos', label: '🔄 Movimientos' },
            { to: '/remitos-entrada', label: '📥 Remitos Entrada' },
            { to: '/remitos-salida', label: '📤 Remitos Salida' },
            { to: '/reporte-salidas', label: '📊 Reporte Salidas' },
            { to: '/deposito', label: '🏢 Estructura' },
            { to: '/deposito/auditoria-picking', label: '✅ Picking' },
            { to: '/tasks', label: '📝 Tareas' },
        ]
    },
    {
        id: 'mantenimiento',
        label: 'Mantenimiento',
        icon: '🛠️',
        items: [
            { to: '/mantenimiento/dashboard', label: '📊 Dashboard Mant' },
            { to: '/mantenimiento/monitoreo', label: '📺 Monitoreo en Vivo' },
            { to: '/mantenimiento/registro', label: '📋 Registrar' },
            { to: '/mantenimiento/historial', label: '📜 Historial' },
            { to: '/mantenimiento/buscador', label: '🔍 Detalle' },
            { to: '/mantenimiento/pendientes', label: '📑 Pendientes' },
        ]
    },
    {
        id: 'produccion',
        label: 'Producción',
        icon: '⚙️',
        items: [
            { to: '/produccion/dashboard', label: '📊 Dashboard Prod' },
            { to: '/produccion/cargar', label: '➕ Cargar' },
        ]
    },
    {
        id: 'compras',
        label: 'Compras',
        icon: '🛒',
        items: [
            { to: '/dashboard', label: '📊 Dashboard Comp' },
            { to: '/compras/materiales-criticos', label: '⚠️ Materiales Críticos' },
            { to: '/compras/alertas-stock', label: '🔔 Alertas Stock' },
            { to: '/compras/conciliacion', label: '🔗 Conciliación' },
            { to: '/pedidos-compra', label: '📋 Pedidos Compra' },
            { to: '/dashboard/capacity', label: '📈 Capacidad' },
            { to: '/dashboard/volumes', label: '📦 Volúmenes' },
            { to: '/items/box-types', label: '📦 Cajas/Embalaje' },
        ]
    },
    {
        id: 'ventas',
        label: 'Ventas',
        icon: '📈',
        items: [
            { to: '/ventas/dashboard', label: '📊 Dashboard Ventas' },
        ]
    },
    {
        id: 'finanzas',
        label: 'Finanzas',
        icon: '💰',
        items: [
            { to: '/finanzas/dashboard', label: '📊 Dashboard Finanzas' },
        ]
    },
    {
        id: 'rrhh',
        label: 'Recursos Humanos',
        icon: '👥',
        items: [
            { to: '/rrhh/dashboard', label: '📊 Dashboard RRHH' },
        ]
    },
    {
        id: 'configuracion',
        label: 'Configuración',
        icon: '⚙️',
        items: [
            { to: '/items', label: '🏷️ Materiales' },
            { to: '/socios', label: '🤝 Socios' },
        ]
    }
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

    const { data: alerts = [] } = useGetAlertsQuery(undefined, { pollingInterval: 120000 });
    const hasUnread = useSelector(selectHasUnreadNotifications);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    // Sync alerts data with notifications slice
    useEffect(() => {
        if (alerts && Array.isArray(alerts) && alerts.length > 0) {
            dispatch(setCurrentAlerts(alerts));
        } else if (alerts && Array.isArray(alerts) && alerts.length === 0) {
            dispatch(setCurrentAlerts([]));
        }
    }, [alerts, dispatch]);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleOpenMenu = () => setMobileMenuOpen(true);
        document.addEventListener('open-sidebar-menu', handleOpenMenu);
        return () => document.removeEventListener('open-sidebar-menu', handleOpenMenu);
    }, []);

    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
        );
    };

    const filteredGroups = navGroups.map(group => ({
        ...group,
        items: group.items.filter(item => {
            if (isAdmin) return true;
            if (isOperario) return ['/movimientos', '/stock', '/deposito/auditoria-picking', '/remitos-salida', '/reporte-salidas', '/tasks', '/deposito', '/mantenimiento/dashboard', '/mantenimiento/monitoreo', '/mantenimiento/registro', '/mantenimiento/historial', '/mantenimiento/buscador', '/produccion/cargar', '/produccion/dashboard'].includes(item.to);
            if (isCompras) return ['/dashboard', '/compras/materiales-criticos', '/compras/alertas-stock', '/compras/conciliacion', '/pedidos-compra', '/remitos-entrada', '/reporte-salidas', '/items', '/dashboard/capacity', '/dashboard/volumes', '/items/box-types', '/socios'].includes(item.to);
            return false;
        })
    })).filter(group => group.items.length > 0);

    const allItems = navGroups.flatMap(g => g.items);


    const handleLogout = () => {
        dispatch(logout());
        navigate('/login', { replace: true });
    };



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
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.2); }
                }
            `}</style>

            {/* Mobile Header */}
            {isMobile && location.pathname !== '/mantenimiento/dashboard' && (
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
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                position: 'relative',
                            }}
                        >
                            ☰
                            {hasUnread && !mobileMenuOpen && (
                                <span style={{
                                    position: 'absolute', top: '2px', right: '0px',
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    background: '#ef4444', border: '2px solid #1a1d2e',
                                    animation: 'pulse-dot 2s ease-in-out infinite',
                                }} />
                            )}
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
                            {allItems.find(i => i.to === location.pathname.split('?')[0])?.label.split(' ').slice(1).join(' ') || 'WMS'}

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
                        {(location.pathname === '/produccion/dashboard' || location.pathname === '/mantenimiento/dashboard') && (
                            <button
                                onClick={() => document.dispatchEvent(new Event(location.pathname === '/produccion/dashboard' ? 'open-production-filters' : 'open-maintenance-filters'))}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="4" y1="6" x2="20" y2="6" />
                                    <circle cx="9" cy="6" r="2.5" fill="#0f1117" />
                                    <line x1="4" y1="12" x2="20" y2="12" />
                                    <circle cx="15" cy="12" r="2.5" fill="#0f1117" />
                                    <line x1="4" y1="18" x2="20" y2="18" />
                                    <circle cx="9" cy="18" r="2.5" fill="#0f1117" />
                                </svg>
                            </button>
                        )}
                    </div>
                </header>
            )}

            {/* User Overlay for Mobile Menu */}
            {(isMobile || location.pathname === '/mantenimiento/monitoreo') && <div className="nav-overlay" onClick={() => setMobileMenuOpen(false)} />}

            {/* Sidebar / Drawer */}
            <aside style={{
                position: isMobile || location.pathname === '/mantenimiento/monitoreo' ? 'fixed' : 'relative',
                left: (isMobile || location.pathname === '/mantenimiento/monitoreo') && !mobileMenuOpen ? '-280px' : '0',
                top: 0, bottom: 0,
                width: isMobile || location.pathname === '/mantenimiento/monitoreo' ? '280px' : (collapsed ? '60px' : '220px'),
                background: 'linear-gradient(180deg, #1a1d2e 0%, #141622 100%)',
                borderRight: '1px solid #2a2d3e',
                display: 'flex', flexDirection: 'column',
                transition: 'all 0.3s ease',
                zIndex: 999,
                flexShrink: 0,
            }}>
                <div style={{ padding: '16px 12px', borderBottom: '1px solid #2a2d3e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {(!collapsed || isMobile) && <span style={{ color: '#a5b4fc', fontWeight: 700, fontSize: '15px', whiteSpace: 'nowrap' }}>📦 WMS INVENTARIO</span>}
                        {(!collapsed || isMobile) && <span style={{ color: '#6b7280', fontSize: '10px', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '1px' }}>{role}</span>}
                    </div>
                    {!isMobile && (
                        <button
                            type="button"
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '18px', padding: '2px 6px' }}
                        >
                            {collapsed ? '›' : '‹'}
                        </button>
                    )}
                </div>

                <nav className="custom-scrollbar" style={{ flex: 1, paddingTop: '8px', overflowY: 'auto' }}>
                    {filteredGroups.map((group) => {
                        const isExpanded = expandedGroups.includes(group.id);
                        const hasActiveChild = group.items.some(item => location.pathname === item.to);

                        return (
                            <div key={group.id} style={{ marginBottom: '8px' }}>
                                {(!collapsed || isMobile) && (
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(group.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            width: '100%', padding: '8px 14px',
                                            background: 'transparent', border: 'none',
                                            color: isExpanded || hasActiveChild ? '#a5b4fc' : '#6b7280',
                                            fontSize: '11px', fontWeight: 700,
                                            textTransform: 'uppercase', letterSpacing: '1px',
                                            cursor: 'pointer', transition: 'all 0.15s'
                                        }}
                                    >
                                        <span style={{ fontSize: '14px' }}>{group.icon}</span>
                                        <span>{group.label}</span>
                                        <span style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                            ›
                                        </span>
                                    </button>
                                )}

                                {collapsed && !isMobile && (
                                    <div style={{
                                        display: 'flex', justifyContent: 'center',
                                        padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        color: hasActiveChild ? '#a5b4fc' : '#4b5563'
                                    }}>
                                        <span style={{ fontSize: '20px' }}>{group.icon}</span>
                                    </div>
                                )}

                                {(isExpanded || (collapsed && !isMobile)) && (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {group.items.map(({ to, label }) => (
                                            <NavLink
                                                key={to}
                                                to={to}
                                                style={({ isActive }) => ({
                                                    ...navStyle(isActive, isMobile),
                                                    paddingLeft: (!collapsed || isMobile) ? '32px' : '14px',
                                                    opacity: (collapsed && !isMobile && !hasActiveChild) ? 0.6 : 1
                                                })}
                                            >
                                                <span style={{ fontSize: isMobile ? '20px' : '16px', minWidth: '24px' }}>{label.split(' ')[0]}</span>
                                                {(!collapsed || isMobile) && <span>{label.split(' ').slice(1).join(' ')}</span>}
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Notificaciones menu item */}
                    <NavLink
                        to="/notificaciones"
                        style={({ isActive }) => ({
                            ...navStyle(isActive, isMobile),
                            marginTop: '12px',
                            borderTop: '1px solid #2a2d3e',
                            paddingTop: isMobile ? '16px' : '12px',
                        })}
                    >
                        <span style={{ fontSize: isMobile ? '20px' : '16px', minWidth: '24px', position: 'relative' }}>
                            🔔
                            {hasUnread && (
                                <span style={{
                                    position: 'absolute', top: '-2px', right: '-4px',
                                    width: '9px', height: '9px', borderRadius: '50%',
                                    background: '#ef4444', border: '2px solid #1a1d2e',
                                    animation: 'pulse-dot 2s ease-in-out infinite',
                                }} />
                            )}
                        </span>
                        {(!collapsed || isMobile) && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Notificaciones
                                {hasUnread && alerts.length > 0 && (
                                    <span style={{
                                        background: '#ef4444',
                                        color: 'white',
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        padding: '1px 7px',
                                        borderRadius: '10px',
                                        minWidth: '18px',
                                        textAlign: 'center' as const,
                                    }}>
                                        {alerts.length}
                                    </span>
                                )}
                            </span>
                        )}
                    </NavLink>
                </nav>


                {/* Bottom Actions */}
                <div style={{ borderTop: '1px solid #2a2d3e', padding: '8px 0' }}>
                    <button
                        type="button"
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
            {location.pathname !== '/mantenimiento/monitoreo' && <AiChatBot />}
        </div>
    );
}
