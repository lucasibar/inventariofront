import { PageHeader, Card } from '../../shared/ui';

export default function ArticulosPage() {
    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <PageHeader
                title="Módulo de Artículos"
                subtitle="Espacio preparado para la nueva arquitectura y flujo de artículos paso a paso."
            />
            <Card>
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>
                        Listo para construir
                    </h3>
                    <p style={{ color: 'var(--text-muted, #9ca3af)', maxWidth: '500px', margin: '0 auto', fontSize: '14px' }}>
                        Toda la funcionalidad antigua de artículos y catálogos ha sido removida limpiamente. 
                        Definí los requerimientos del nuevo módulo para comenzar la implementación.
                    </p>
                </div>
            </Card>
        </div>
    );
}
