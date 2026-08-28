import { useState, useEffect, Suspense } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, useNavigation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGetAlertsQuery } from '../features/warehouse/stock/api/stock.api';
import { logout, selectCurrentUser } from '../entities/auth/model/authSlice';
import { api } from './api';
import { useChangeMyPasswordMutation } from '../entities/auth/api/authApi';
import { setCurrentAlerts, selectHasUnreadNotifications } from '../entities/notifications/notificationsSlice';
import { useIsMobile, PageLoader, Modal, Input, Btn } from './ui';
import { ErrorBoundary } from './ErrorBoundary';

interface NavItem {
    to: string;
    label: string;
}

interface NavSubGroup {
    id: string;
    label: string;
    isSubGroup: true;
    items: NavItem[];
}

interface NavGroup {
    id: string;
    label: string;
    icon: string;
    items: (NavItem | NavSubGroup)[];
}

const flattenItems = (items: (NavItem | NavSubGroup)[]): NavItem[] => {
    const flat: NavItem[] = [];
    items.forEach(item => {
        if ('isSubGroup' in item && item.isSubGroup) {
            flat.push(...item.items);
        } else {
            flat.push(item as NavItem);
        }
    });
    return flat;
};

const navGroups: NavGroup[] = [
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
            { to: '/deposito/dashboard', label: '📊 Dashboard Depo' },
            { to: '/stock', label: '📋 Stock' },
            { to: '/movimientos', label: '🔄 Movimientos' },
            {
                id: 'informes',
                label: '📊 Informes',
                isSubGroup: true,
                items: [
                    { to: '/deposito/informes', label: '📈 Informe Inventariados' },
                    { to: '/tasks', label: '📝 Tareas' },
                    { to: '/chequeo-inventario', label: '🔍 Chequeo Inventario' },
                    { to: '/chequeo-categoria', label: '🏷️ Chequeo por Categoría' },
                    { to: '/reporte-chequeo', label: '📊 Reporte Chequeo' },
                ]
            },
            {
                id: 'configuracion',
                label: '⚙️ Configuración',
                isSubGroup: true,
                items: [
                    { to: '/items', label: '🏷️ Materiales' },
                    { to: '/items/box-types', label: '📦 Cajas/Embalaje' },
                    { to: '/deposito', label: '🏢 Depositos' },
                    { to: '/socios', label: '🤝 Socios' },
                ]
            }
        ]
    },
    {
        id: 'mantenimiento',
        label: 'Mantenimiento',
        icon: '🛠️',
        items: [
            { to: '/mantenimiento/dashboard', label: '📊 Dashboard Mant' },
            { to: '/mantenimiento/monitoreo', label: '📺 Monitoreo en Vivo' },
            { to: '/mantenimiento/registro', label: '📋 Registrar Novedades' },
            { to: '/mantenimiento/cambios', label: '🔄 Registrar Cambios' },
            { to: '/mantenimiento/historial', label: '📜 Historial Novedades' },
            { to: '/mantenimiento/historial-cambios', label: '🔄 Historial de Cambios' },
            { to: '/mantenimiento/buscador', label: '🔍 Detalle' },
            { to: '/mantenimiento/pendientes', label: '📑 Pendientes' },
            {
                id: 'mantenimiento-informes',
                label: '📊 Informes',
                isSubGroup: true,
                items: [
                    { to: '/mantenimiento/informe-turnos', label: '⏱️ Informe Turnos' },
                    { to: '/mantenimiento/informe-cambios', label: '📈 Informe Cambios' },
                ]
            },
            {
                id: 'mantenimiento-kpi',
                label: '📈 KPI',
                isSubGroup: true,
                items: [
                    { to: '/mantenimiento/kpi/disponibilidad', label: '🏭 Disponibilidad Máquinas' },
                    { to: '/mantenimiento/kpi/disponibilidad-v2', label: '📊 Disponibilidad Timeline (V2)' },
                ]
            },
        ]
    },
    {
        id: 'calidad',
        label: 'Calidad',
        icon: '🎯',
        items: [
            { to: '/calidad/articulos', label: '📋 Artículos' },
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
            { to: '/dashboard', label: '📊 Comando Compras' },
            { to: '/compras/movimientos', label: '📋 Documentos' },
            { to: '/compras/convertidor', label: '🔄 Convertidor de Pedidos' },
            {
                id: 'remitos',
                label: '📄 Remitos y Órdenes',
                isSubGroup: true,
                items: [
                    { to: '/remitos-entrada', label: '📥 Remitos Entrada' },
                    { to: '/remitos-salida', label: '📤 Remitos Salida' },
                    { to: '/pedidos-compra', label: '📝 Órdenes de Compra' },
                ]
            },
            {
                id: 'compras-informes',
                label: '📊 Informes',
                isSubGroup: true,
                items: [
                    { to: '/compras/proyeccion-stock', label: '📈 Proyección de Stock' },
                    { to: '/compras/grafico-sierra', label: '📈 Gráfico de Sierra' },
                    { to: '/compras/materiales-criticos', label: '🧵 Grupos de Materiales' },
                    { to: '/compras/alertas-stock', label: '⚠️ Alertas de Stock' },
                    { to: '/dashboard/capacity', label: '📈 Capacidad' },
                    { to: '/reporte-consumo-detallado', label: '📊 Consumo Detallado' },
                ]
            },
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
    }
];

const navStyle = (isActive: boolean, isMobile: boolean, isLight: boolean = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '12px',
    paddingTop: isMobile ? '14px' : '10px',
    paddingBottom: isMobile ? '14px' : '10px',
    paddingRight: isMobile ? '20px' : '14px',
    paddingLeft: isMobile ? '20px' : '14px',
    textDecoration: 'none',
    color: isActive ? '#6366f1' : (isLight ? 'var(--text-dimmed, #4b5563)' : 'var(--text-muted, #9ca3af)'),
    background: isActive ? (isLight ? 'rgba(99,102,241,0.12)' : 'rgba(165,180,252,0.08)') : 'transparent',
    borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
    fontSize: isMobile ? '15px' : '13px', whiteSpace: 'nowrap',
    transition: 'all 0.15s',
});

const EMPTY_ALERTS: any[] = [];

export default function Layout() {
    const isMobile = useIsMobile();
    const user = useSelector(selectCurrentUser);
    const role = user?.role?.toUpperCase() || '';
    const sector = user?.sector?.toUpperCase() || '';
    const isAdmin = role === 'ADMIN';
    const isSupervisor = role === 'SUPERVISOR';

    const navigation = useNavigation();
    const isNavigating = navigation.state === 'loading';

    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPasswordVal, setNewPasswordVal] = useState('');
    const [changePassword] = useChangeMyPasswordMutation();
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        return (localStorage.getItem('app-theme') as 'dark' | 'light') || 'dark';
    });

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        localStorage.setItem('app-theme', nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const { data: alerts = EMPTY_ALERTS } = useGetAlertsQuery(undefined, { pollingInterval: 120000 });
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
    const [expandedSubGroups, setExpandedSubGroups] = useState<string[]>([]);

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
        );
    };

    const isAllowed = (to: string) => {
        if (isAdmin) return true;

        // Definir rutas por sector
        const sectorRoutes: Record<string, string[]> = {
            DEPOSITO: [
                '/deposito/dashboard', '/stock', '/movimientos',
                '/remitos-entrada', '/remitos-salida',
                '/reporte-consumo-detallado', '/tasks',
                '/chequeo-inventario', '/reporte-chequeo', '/deposito/informes',
            ],
            COMPRAS: [
                '/dashboard', '/pedidos-compra', '/compras/materiales-criticos',
                '/compras/alertas-stock', '/compras/conciliacion', '/compras/grafico-sierra',
                '/dashboard/capacity', '/dashboard/volumes', '/reporte-consumo-detallado',
                '/remitos-entrada', '/remitos-salida',
                '/compras/movimientos', '/compras/convertidor', '/compras/proyeccion-stock',
            ],
            MANTENIMIENTO: [
                '/mantenimiento/dashboard', '/mantenimiento/monitoreo',
                '/mantenimiento/registro', '/mantenimiento/cambios', '/mantenimiento/historial',
                '/mantenimiento/buscador', '/mantenimiento/pendientes',
                '/mantenimiento/informe-turnos', '/mantenimiento/informe-cambios',
                '/mantenimiento/kpi/disponibilidad',
                '/mantenimiento/kpi/disponibilidad-v2',
            ],
            PRODUCCION: ['/produccion/dashboard', '/produccion/cargar'],
            CALIDAD: ['/calidad/articulos'],
            VENTAS: ['/ventas/dashboard'],
            FINANZAS: ['/finanzas/dashboard'],
            RRHH: ['/rrhh/dashboard'],
        };

        // Config routes — solo supervisores de su sector + compras
        const configRoutes = ['/items', '/items/box-types', '/deposito', '/socios'];
        // Auditoría — solo supervisores
        const auditRoutes = ['/admin/movements'];

        // Rutas del sector del usuario
        const myRoutes = sectorRoutes[sector] || [];

        // Supervisores ven auditoría
        if (isSupervisor && auditRoutes.includes(to)) return true;

        // Supervisor de COMPRAS también ve stock en lectura
        if (isSupervisor && sector === 'COMPRAS') {
            const depositoViewRoutes = [
                '/deposito/dashboard', '/stock', '/movimientos',
                '/remitos-entrada', '/reporte-consumo-detallado',
            ];
            if ([...myRoutes, ...depositoViewRoutes, ...configRoutes].includes(to)) return true;
        }

        // Supervisor de DEPOSITO no ve config
        if (isSupervisor && sector === 'DEPOSITO') {
            return myRoutes.includes(to);
        }

        // Operarios solo ven rutas de su sector
        return myRoutes.includes(to);
    };

    const filteredGroups = navGroups.map(group => {
        const filteredItems = group.items.map(item => {
            if ('isSubGroup' in item && item.isSubGroup) {
                const subItems = item.items.filter(subItem => isAllowed(subItem.to));
                if (subItems.length > 0) {
                    return { ...item, items: subItems };
                }
                return null;
            } else {
                const stdItem = item as NavItem;
                return isAllowed(stdItem.to) ? stdItem : null;
            }
        }).filter((item): item is NonNullable<typeof item> => item !== null);

        return { ...group, items: filteredItems };
    }).filter(group => group.items.length > 0);

    const allItems = navGroups.flatMap(g => flattenItems(g.items));

    useEffect(() => {
        let activeGroupId: string | null = null;
        let activeSubGroupId: string | null = null;

        navGroups.forEach(group => {
            const hasActive = flattenItems(group.items).some(item => location.pathname === item.to);
            if (hasActive) {
                activeGroupId = group.id;
            }
            group.items.forEach(item => {
                if ('isSubGroup' in item && item.isSubGroup) {
                    const hasActiveSub = item.items.some(sub => location.pathname === sub.to);
                    if (hasActiveSub) {
                        activeSubGroupId = item.id;
                    }
                }
            });
        });

        // Auto collapse other groups and open only the active one
        if (activeGroupId) {
            setExpandedGroups([activeGroupId]);
        } else {
            setExpandedGroups([]);
        }

        // Auto collapse other subgroups and open only the active one
        if (activeSubGroupId) {
            setExpandedSubGroups([activeSubGroupId]);
        } else {
            setExpandedSubGroups([]);
        }
    }, [location.pathname]);


    const handleLogout = () => {
        dispatch(api.util.resetApiState());
        dispatch(logout());
        navigate('/login', { replace: true });
    };



    return (
        <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            height: '100vh',
            background: 'var(--bg-primary, #0f1117)',
            color: 'var(--text-primary, #f3f4f6)',
            transition: 'background 0.3s ease, color 0.3s ease'
        }}>
            {isNavigating && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'linear-gradient(90deg, #6366f1, #a5b4fc, #8b5cf6)',
                    zIndex: 10000,
                    animation: 'loading-bar 1.8s infinite ease-in-out',
                    transformOrigin: '0% 50%',
                }}>
                    <style>{`
                        @keyframes loading-bar {
                            0% { transform: scaleX(0); }
                            50% { transform: scaleX(0.7); }
                            100% { transform: scaleX(1); opacity: 0; }
                        }
                    `}</style>
                </div>
            )}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-color, #2a2d3e); borderRadius: 10px; }
                .nav-overlay {
                    position: fixed; inset: 0; background: var(--bg-overlay-heavy, rgba(0, 0, 0, 0.7)); z-index: 998;
                    opacity: ${mobileMenuOpen ? 1 : 0}; visibility: ${mobileMenuOpen ? 'visible' : 'hidden'};
                    transition: all 0.3s ease;
                }
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.2); }
                }
            `}</style>

            {/* Mobile Header */}
            {isMobile && !['/mantenimiento/dashboard', '/deposito/dashboard'].includes(location.pathname) && (
                <header style={{
                    height: '56px', background: 'var(--bg-secondary, #1a1d2e)', borderBottom: '1px solid var(--border-color, #2a2d3e)',
                    display: 'flex', alignItems: 'center', padding: '0 12px', zIndex: 997,
                    justifyContent: 'space-between', flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' }}>
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            style={{
                                background: 'transparent', border: 'none', color: 'var(--text-primary, #f3f4f6)',
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
                                    background: '#ef4444', border: '2px solid var(--bg-secondary, #1a1d2e)',
                                    animation: 'pulse-dot 2s ease-in-out infinite',
                                }} />
                            )}
                        </button>
                        <span style={{
                            fontWeight: 800,
                            color: '#6366f1',
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
                        {(location.pathname === '/stock' || location.pathname === '/movimientos') && (isAdmin || (isSupervisor && sector === 'DEPOSITO')) && (
                            <button
                                onClick={() => {
                                    const sep = location.search ? '&' : '?';
                                    navigate(location.pathname + location.search + sep + 'qa=1', { replace: true });
                                }}
                                style={{
                                    background: '#6366f1',
                                    border: 'none',
                                    color: '#ffffff',
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
                                    color: 'var(--text-muted, #9ca3af)',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="4" y1="6" x2="20" y2="6" />
                                    <circle cx="9" cy="6" r="2.5" fill="var(--bg-primary, #0f1117)" />
                                    <line x1="4" y1="12" x2="20" y2="12" />
                                    <circle cx="15" cy="12" r="2.5" fill="var(--bg-primary, #0f1117)" />
                                    <line x1="4" y1="18" x2="20" y2="18" />
                                    <circle cx="9" cy="18" r="2.5" fill="var(--bg-primary, #0f1117)" />
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
                background: theme === 'light' ? 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)' : 'linear-gradient(180deg, var(--bg-secondary, #1a1d2e) 0%, #141622 100%)',
                borderRight: '1px solid var(--border-color, #2a2d3e)',
                display: 'flex', flexDirection: 'column',
                transition: 'all 0.3s ease',
                zIndex: 999,
                flexShrink: 0,
            }}>
                <div style={{ padding: '16px 12px', borderBottom: '1px solid var(--border-color, #2a2d3e)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {(!collapsed || isMobile) && <span style={{ color: theme === 'light' ? '#6366f1' : '#a5b4fc', fontWeight: 700, fontSize: '15px', whiteSpace: 'nowrap' }}>📦 WMS INVENTARIO</span>}
                        {(!collapsed || isMobile) && <span style={{ color: theme === 'light' ? 'var(--text-subtle, #94a3b8)' : 'var(--text-subtle, #6b7280)', fontSize: '10px', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '1px' }}>{role}</span>}
                    </div>
                    {!isMobile && (
                        <button
                            type="button"
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ background: 'none', border: 'none', color: theme === 'light' ? 'var(--text-subtle, #94a3b8)' : 'var(--text-subtle, #6b7280)', cursor: 'pointer', fontSize: '18px', padding: '2px 6px' }}
                        >
                            {collapsed ? '›' : '‹'}
                        </button>
                    )}
                </div>

                <nav className="custom-scrollbar" style={{ flex: 1, paddingTop: '8px', overflowY: 'auto' }}>
                    {filteredGroups.map((group) => {
                        const isExpanded = expandedGroups.includes(group.id);
                        const leafItems = flattenItems(group.items);
                        const hasActiveChild = leafItems.some(item => location.pathname === item.to);

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
                                            color: isExpanded || hasActiveChild ? (theme === 'light' ? '#6366f1' : '#a5b4fc') : (theme === 'light' ? 'var(--text-muted, #64748b)' : 'var(--text-subtle, #6b7280)'),
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
                                        padding: '12px 0', borderBottom: theme === 'light' ? '1px solid rgba(0,0,0,0.06)' : '1px solid var(--bg-hover-dynamic, rgba(255,255,255,0.05))',
                                        color: hasActiveChild ? (theme === 'light' ? '#6366f1' : '#a5b4fc') : (theme === 'light' ? 'var(--text-subtle, #94a3b8)' : 'var(--text-dimmed, #4b5563)')
                                    }}>
                                        <span style={{ fontSize: '20px' }}>{group.icon}</span>
                                    </div>
                                )}

                                {(isExpanded || (collapsed && !isMobile)) && (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {collapsed && !isMobile ? (
                                            leafItems.map(({ to, label }) => (
                                                <NavLink
                                                    key={to}
                                                    to={to}
                                                    style={({ isActive }) => ({
                                                        ...navStyle(isActive, isMobile, theme === 'light'),
                                                        paddingLeft: '14px',
                                                        opacity: !hasActiveChild ? 0.6 : 1
                                                    })}
                                                >
                                                    <span style={{ fontSize: '16px', minWidth: '24px' }}>{label.split(' ')[0]}</span>
                                                </NavLink>
                                            ))
                                        ) : (
                                            group.items.map((item) => {
                                                if ('isSubGroup' in item && item.isSubGroup) {
                                                    const subId = item.id;
                                                    const isSubExpanded = expandedSubGroups.includes(subId);
                                                    const hasActiveSubChild = item.items.some(sub => location.pathname === sub.to);

                                                    return (
                                                        <div key={subId} style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setExpandedSubGroups(prev =>
                                                                        prev.includes(subId) ? prev.filter(g => g !== subId) : [...prev, subId]
                                                                    );
                                                                }}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: '12px',
                                                                    paddingTop: isMobile ? '14px' : '10px',
                                                                    paddingBottom: isMobile ? '14px' : '10px',
                                                                    paddingRight: isMobile ? '20px' : '14px',
                                                                    paddingLeft: '32px',
                                                                    background: 'transparent', border: 'none',
                                                                    color: isSubExpanded || hasActiveSubChild ? (theme === 'light' ? '#6366f1' : '#a5b4fc') : (theme === 'light' ? 'var(--text-dimmed, #4b5563)' : 'var(--text-muted, #9ca3af)'),
                                                                    fontSize: isMobile ? '15px' : '13px',
                                                                    cursor: 'pointer', transition: 'all 0.15s',
                                                                    width: '100%', textAlign: 'left'
                                                                }}
                                                            >
                                                                <span style={{ fontSize: isMobile ? '20px' : '16px', minWidth: '24px' }}>{item.label.split(' ')[0]}</span>
                                                                <span>{item.label.split(' ').slice(1).join(' ')}</span>
                                                                <span style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: isSubExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                                                    ›
                                                                </span>
                                                            </button>
                                                            {isSubExpanded && (
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    {item.items.map(({ to, label }) => (
                                                                        <NavLink
                                                                            key={to}
                                                                            to={to}
                                                                            style={({ isActive }) => ({
                                                                                ...navStyle(isActive, isMobile, theme === 'light'),
                                                                                paddingLeft: '48px',
                                                                            })}
                                                                        >
                                                                            <span style={{ fontSize: isMobile ? '20px' : '16px', minWidth: '24px' }}>{label.split(' ')[0]}</span>
                                                                            <span>{label.split(' ').slice(1).join(' ')}</span>
                                                                        </NavLink>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                } else {
                                                    const std = item as NavItem;
                                                    return (
                                                        <NavLink
                                                            key={std.to}
                                                            to={std.to}
                                                            style={({ isActive }) => ({
                                                                ...navStyle(isActive, isMobile, theme === 'light'),
                                                                paddingLeft: '32px',
                                                            })}
                                                        >
                                                            <span style={{ fontSize: isMobile ? '20px' : '16px', minWidth: '24px' }}>{std.label.split(' ')[0]}</span>
                                                            <span>{std.label.split(' ').slice(1).join(' ')}</span>
                                                        </NavLink>
                                                    );
                                                }
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Notificaciones menu item */}
                    <NavLink
                        to="/notificaciones"
                        style={({ isActive }) => ({
                            ...navStyle(isActive, isMobile, theme === 'light'),
                            marginTop: '12px',
                            borderTop: '1px solid var(--border-color, #2a2d3e)',
                            paddingTop: isMobile ? '16px' : '12px',
                        })}
                    >
                        <span style={{ fontSize: isMobile ? '20px' : '16px', minWidth: '24px', position: 'relative' }}>
                            🔔
                            {hasUnread && (
                                <span style={{
                                    position: 'absolute', top: '-2px', right: '-4px',
                                    width: '9px', height: '9px', borderRadius: '50%',
                                    background: '#ef4444', border: theme === 'light' ? '2px solid #ffffff' : '2px solid var(--bg-secondary, #1a1d2e)',
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
                                        color: '#ffffff',
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

                    {/* Ayuda menu item */}
                    <NavLink
                        to="/ayuda"
                        style={({ isActive }) => ({
                            ...navStyle(isActive, isMobile, theme === 'light'),
                            marginTop: '4px',
                            borderTop: 'none',
                            paddingTop: isMobile ? '12px' : '10px',
                        })}
                    >
                        <span style={{ fontSize: isMobile ? '20px' : '16px', minWidth: '24px' }}>
                            ❓
                        </span>
                        {(!collapsed || isMobile) && (
                            <span>Ayuda / Soporte</span>
                        )}
                    </NavLink>
                </nav>



                {/* Bottom Actions */}
                <div style={{ borderTop: '1px solid var(--border-color, #2a2d3e)', padding: '8px 0' }}>
                    <button
                        type="button"
                        onClick={toggleTheme}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: isMobile ? '16px 20px' : '10px 14px', width: '100%',
                            background: 'transparent', border: 'none',
                            color: theme === 'light' ? 'var(--border-strong, #374151)' : 'var(--text-muted, #9ca3af)', fontSize: isMobile ? '15px' : '13px',
                            cursor: 'pointer', transition: 'all 0.15s',
                        }}
                    >
                        <span style={{ fontSize: isMobile ? '20px' : '16px', minWidth: '24px' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
                        {(!collapsed || isMobile) && <span>Modo {theme === 'dark' ? 'Claro' : 'Oscuro'}</span>}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowPasswordModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: isMobile ? '16px 20px' : '10px 14px', width: '100%',
                            background: 'transparent', border: 'none',
                            color: theme === 'light' ? 'var(--border-strong, #374151)' : 'var(--text-muted, #9ca3af)', fontSize: isMobile ? '15px' : '13px',
                            cursor: 'pointer', transition: 'all 0.15s',
                        }}
                    >
                        <span style={{ fontSize: isMobile ? '20px' : '16px', minWidth: '24px' }}>🔑</span>
                        {(!collapsed || isMobile) && <span>Cambiar Contraseña</span>}
                    </button>
                    <button
                        type="button"
                        onClick={handleLogout}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: isMobile ? '16px 20px' : '10px 14px', width: '100%',
                            background: 'transparent', border: 'none',
                            color: '#ef4444', fontSize: isMobile ? '15px' : '13px',
                            cursor: 'pointer', transition: 'all 0.15s',
                            fontWeight: 600,
                        }}
                    >
                        <span style={{ fontSize: isMobile ? '20px' : '16px', minWidth: '24px' }}>🚪</span>
                        {(!collapsed || isMobile) && <span>Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main 
                className="app-content"
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    position: 'relative',
                    width: '100%',
                    background: theme === 'light' ? '#f0f2f5' : undefined,
                }}
            >
                {isNavigating && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'var(--bg-overlay, rgba(15, 17, 23, 0.65))',
                        backdropFilter: 'blur(3px)',
                        zIndex: 999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <PageLoader />
                    </div>
                )}
                <ErrorBoundary key={location.pathname}>
                    <Suspense key={location.pathname} fallback={<PageLoader />}>
                        <Outlet />
                    </Suspense>
                </ErrorBoundary>
            </main>

            {showPasswordModal && (
                <Modal title="Cambiar mi Contraseña" onClose={() => { setShowPasswordModal(false); setNewPasswordVal(''); }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                        <Input 
                            label="Nueva Contraseña" 
                            type="password"
                            value={newPasswordVal} 
                            onChange={setNewPasswordVal} 
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <Btn variant="secondary" onClick={() => { setShowPasswordModal(false); setNewPasswordVal(''); }}>Cancelar</Btn>
                        <Btn onClick={async () => {
                            if (!newPasswordVal) {
                                alert('Por favor ingresa una contraseña.');
                                return;
                            }
                            try {
                                await changePassword({ password: newPasswordVal }).unwrap();
                                alert('Contraseña actualizada correctamente.');
                                setShowPasswordModal(false);
                                setNewPasswordVal('');
                            } catch (e: any) {
                                alert(e?.data?.message || 'Error al cambiar contraseña');
                            }
                        }}>Guardar Contraseña</Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}
