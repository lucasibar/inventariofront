import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../../entities/auth/api/authApi';
import { setCredentials, selectIsAuthenticated } from '../../entities/auth/model/authSlice';
import { api } from '../../shared/api';
import { Card, Btn, Input, Spinner } from '../../shared/ui';

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const user = useSelector((state: any) => state.auth.user);
    const [login, { isLoading }] = useLoginMutation();

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isLight = currentTheme === 'light';

    const getLandingPage = (role?: string) => {
        const r = role?.toUpperCase();
        if (r === 'COMPRAS') return '/dashboard';
        if (r === 'ADMIN') return '/mantenimiento/dashboard';
        if (r === 'OPERATOR' || r === 'SUPERVISOR') return '/deposito/dashboard';
        return '/deposito/dashboard';
    };

    useEffect(() => {
        if (isAuthenticated && user) {
            navigate(getLandingPage(user.role));
        }
    }, [isAuthenticated, user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!username || !password) {
            setErrorMsg('Por favor, completa todos los campos.');
            return;
        }

        try {
            const userData = await login({ username, pass: password }).unwrap();
            dispatch(api.util.resetApiState());
            dispatch(setCredentials({ user: userData.user, token: userData.access_token }));
            navigate(getLandingPage(userData.user.role));
        } catch (err: any) {
            console.error('Login failed', err);
            // Extraemos el mensaje del error de NestJS si existe
            const message = err.data?.message || 'Error de conexión con el servidor';
            setErrorMsg(Array.isArray(message) ? message[0] : message);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isLight ? 'radial-gradient(circle at top right, #e0e7ff 0%, #f0f2f5 100%)' : 'radial-gradient(circle at top right, var(--bg-tertiary, #1e1b4b) 0%, var(--bg-primary, #0f1117) 100%)',
            padding: '20px'
        }}>
            <div style={{ width: '100%', maxWidth: '400px', animation: 'fadeIn 0.6s ease-out' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        fontSize: '48px',
                        marginBottom: '16px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: 900,
                        letterSpacing: '-1px'
                    }}>
                        WMS
                    </div>
                    <h1 style={{ color: isLight ? 'var(--border-strong, #1e293b)' : 'var(--text-primary, #f3f4f6)', fontSize: '24px', margin: 0, fontWeight: 700 }}>Inventario Pro</h1>
                    <p style={{ color: isLight ? 'var(--text-muted, #64748b)' : 'var(--text-subtle, #6b7280)', fontSize: '14px', marginTop: '8px' }}>Ingresa tus credenciales para continuar</p>
                </div>

                <Card style={{ padding: '32px', border: isLight ? '1px solid var(--text-white-dynamic-muted, #e2e8f0)' : '1px solid rgba(99, 102, 241, 0.2)', boxShadow: isLight ? '0 20px 25px -5px rgba(0, 0, 0, 0.08)' : '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {errorMsg && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#f87171',
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                textAlign: 'center'
                            }}>
                                ⚠️ {errorMsg}
                            </div>
                        )}

                        <Input
                            label="Nombre de Usuario"
                            value={username}
                            onChange={setUsername}
                            placeholder="admin"
                            style={{ width: '100%' }}
                        />

                        <Input
                            label="Contraseña"
                            type="password"
                            value={password}
                            onChange={setPassword}
                            placeholder="••••••••"
                            style={{ width: '100%' }}
                        />

                        <Btn
                            style={{ height: '44px', marginTop: '8px', fontSize: '15px' }}
                            disabled={isLoading}
                        >
                            {isLoading ? <Spinner /> : 'Iniciar Sesión'}
                        </Btn>

                        {isLoading && (
                            <div style={{ color: isLight ? 'var(--text-muted, #64748b)' : 'var(--text-muted, #9ca3af)', fontSize: '12px', textAlign: 'center', marginTop: '4px', lineHeight: '1.4' }}>
                                ℹ️ El servidor gratuito de Render tarda aproximadamente 50 segundos en despertar tras un periodo de inactividad. Por favor, aguarda un instante...
                            </div>
                        )}
                    </form>
                </Card>

                <div style={{ textAlign: 'center', marginTop: '24px', color: isLight ? 'var(--text-subtle, #94a3b8)' : 'var(--text-dimmed, #4b5563)', fontSize: '12px' }}>
                    &copy; El mejor sistema de gestión de inventarios. Todos los derechos reservados.
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default LoginPage;
export { LoginPage }; // Keep both for compatibility
