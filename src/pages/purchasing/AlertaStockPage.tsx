import { useGetAlertsQuery } from '../../warehouse/stock/api/stock.api';
import { PageHeader, Card, Table, Badge, Spinner } from '../../../shared/ui';

export default function AlertaStockPage() {
    const { data: alerts = [], isLoading } = useGetAlertsQuery();

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <PageHeader title="Alertas de Stock" subtitle="Materiales por debajo del stock mínimo" />

            {isLoading ? <Spinner /> : alerts.length > 0 ? (
                <Card style={{ padding: '0' }}>
                    <Table 
                        cols={['Material', 'Código', 'Stock Actual', 'Mínimo', 'Déficit']}
                        rows={alerts.map((a: any) => [
                            <strong key="desc" style={{ color: '#f3f4f6' }}>{a.descripcion}</strong>,
                            <code key="code">{a.codigoInterno}</code>,
                            <span key="actual" style={{ color: '#f87171', fontWeight: 600 }}>{Number(a.stockActual).toFixed(1)} kg</span>,
                            <span key="min" style={{ color: '#6b7280' }}>{Number(a.stockMinimo).toFixed(1)} kg</span>,
                            <Badge key="deficit" color="#ef4444">{Number(a.deficit).toFixed(1)} kg faltantes</Badge>
                        ])}
                    />
                </Card>
            ) : (
                <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(52, 211, 153, 0.05)', borderRadius: '12px', border: '1px dashed rgba(52, 211, 153, 0.3)' }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '20px' }}>✅</span>
                    <h3 style={{ color: '#34d399', fontWeight: 700, fontSize: '20px' }}>Todo en orden</h3>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>No hay materiales por debajo del stock mínimo configurado.</p>
                </div>
            )}
        </div>
    );
}
