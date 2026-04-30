import { useIsMobile } from '../../../shared/ui';

export default function NotificationsPage() {
    const isMobile = useIsMobile();

    return (
        <div style={{ padding: isMobile ? '16px' : '24px 32px', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{
                    fontSize: isMobile ? '20px' : '24px',
                    fontWeight: 800,
                    color: '#f3f4f6',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <span style={{ fontSize: '28px' }}>🔔</span>
                    Notificaciones
                </h1>
                <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '6px' }}>
                    Próximamente...
                </p>
            </div>

            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '80px 20px', textAlign: 'center',
                border: '2px dashed #2a2d3e', borderRadius: '16px'
            }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🏗️</div>
                <h2 style={{ color: '#9ca3af', fontSize: '18px', fontWeight: 600, margin: '0' }}>
                    Módulo en construcción
                </h2>
                <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
                    Esta sección estará disponible próximamente con nuevas funcionalidades.
                </p>
            </div>
        </div>
    );
}
