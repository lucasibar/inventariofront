import { useGetArchivedDepotsQuery, useRestoreDepotMutation } from '../features/depots/api/depots.api';
import { PageHeader, Card, Btn, Spinner } from './common/ui';

export default function SettingsPage() {
    const { data: archived = [], isLoading } = useGetArchivedDepotsQuery();
    const [restore] = useRestoreDepotMutation();

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="⚙️ Configuración" subtitle="Opciones del sistema" />

            <Card style={{ marginBottom: '24px' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2d3e' }}>
                    <h2 style={{ color: '#f3f4f6', fontSize: '15px', fontWeight: 700, margin: 0 }}>🏭 Depósitos archivados</h2>
                    <p style={{ color: '#6b7280', fontSize: '12px', margin: '4px 0 0' }}>
                        Depósitos desactivados. Podés reactivarlos para volver a usarlos.
                    </p>
                </div>

                {isLoading ? (
                    <Spinner />
                ) : archived.length === 0 ? (
                    <p style={{ color: '#4b5563', textAlign: 'center', padding: '32px', fontSize: '14px' }}>
                        No hay depósitos archivados
                    </p>
                ) : (
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {archived.map((d: any) => (
                            <div key={d.id} style={{
                                background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: '10px',
                                padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ color: '#d1d5db', fontWeight: 600, fontSize: '14px' }}>{d.nombre}</span>
                                    {d.planta && <span style={{ color: '#6b7280', fontSize: '12px' }}>· {d.planta}</span>}
                                    <span style={{
                                        background: 'rgba(107,114,128,0.2)', color: '#9ca3af',
                                        borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
                                    }}>{d.tipo}</span>
                                    <span style={{
                                        background: 'rgba(239,68,68,0.15)', color: '#f87171',
                                        borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
                                    }}>Archivado</span>
                                </div>
                                <Btn small onClick={() => restore(d.id)}>↩ Restaurar</Btn>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
