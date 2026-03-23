import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../../entities/auth/api/authApi';
import { setCredentials, selectIsAuthenticated } from '../../entities/auth/model/authSlice';
import { Card, Btn, Input, Spinner } from '../common/ui';

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const [login, { isLoading }] = useLoginMutation();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/remitos-entrada');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        
        if (!username || !password) {
            setErrorMsg('Por favor, completa todos los campos.');
            return;
        }

        try {
            const userData = await login({ username, pass: password }).unwrap();
            dispatch(setCredentials({ user: userData.user, token: userData.access_token }));
            navigate('/remitos-entrada');
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
            background: 'radial-gradient(circle at top right, #1e1b4b 0%, #0f1117 100%)',
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
                    <h1 style={{ color: '#f3f4f6', fontSize: '24px', margin: 0, fontWeight: 700 }}>Inventario Pro</h1>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>Ingresa tus credenciales para continuar</p>
                </div>

                <Card style={{ padding: '32px', border: '1px solid rgba(99, 102, 241, 0.2)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
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
                    </form>
                </Card>

                <div style={{ textAlign: 'center', marginTop: '24px', color: '#4b5563', fontSize: '12px' }}>
                    &copy; 2026 Sistema de Gestión de Almacenes. Todos los derechos reservados.
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
