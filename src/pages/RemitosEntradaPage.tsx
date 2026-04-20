import { useState } from 'react';
import {
    useGetRemitosEntradaQuery,
    useDeleteRemitoMutation,
    useLazyGetRemitoEntradaQuery
} from '../features/remitos/api/remito.api';
import { CreateRemitoForm } from '../features/remitos/ui/CreateRemitoForm';
import { RemitoDetailModal } from '../features/remitos/ui/RemitoDetailModal';
import { PageHeader, Card, Btn, Table, Badge } from './common/ui';

export default function RemitosEntradaPage() {
    const { data: remitos = [], isLoading, isError } = useGetRemitosEntradaQuery();
    const [deleteRemito] = useDeleteRemitoMutation();
    const [showForm, setShowForm] = useState(false);
    const [selectedRemito, setSelectedRemito] = useState<any>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [triggerGetDetail] = useLazyGetRemitoEntradaQuery();

    const handleRowClick = async (remito: any) => {
        try {
            const fullRemito = await triggerGetDetail(remito.id).unwrap();
            setSelectedRemito(fullRemito);
            setShowDetail(true);
        } catch (err) {
            console.error('Error al cargar detalle del remito', err);
            setSelectedRemito(remito);
            setShowDetail(true);
        }
    };

    if (showForm) {
        return (
            <div style={{ padding: '24px' }}>
                <Btn variant="secondary" onClick={() => setShowForm(false)} style={{ marginBottom: '20px' }}>
                    ← Volver al Listado
                </Btn>
                <Card>
                    <CreateRemitoForm />
                </Card>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Remitos de Entrada" subtitle="Listado y gestión de ingresos de mercadería">
                <Btn onClick={() => setShowForm(true)}>+ Nuevo Ingreso</Btn>
            </PageHeader>

            {isError ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
                    Error al cargar los remitos. Intente nuevamente.
                </div>
            ) : remitos.length === 0 && !isLoading ? (
                <Card style={{ textAlign: 'center', padding: '60px' }}>
                    <h3 style={{ color: '#f3f4f6', marginBottom: '8px' }}>Todavía no hay ningún remito cargado</h3>
                    <p style={{ color: '#9ca3af' }}>Inicie una nueva recepción de materiales presionando el botón "+ Nuevo Ingreso".</p>
                </Card>
            ) : (
                <Card>
                    <Table
                        loading={isLoading}
                        cols={['Número', 'Fecha', 'Proveedor', 'Líneas', '']}
                        rows={remitos.map((r: any) => [
                            <span key="num" style={{ color: '#a5b4fc', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleRowClick(r)}>{r.numero || r.documentId}</span>,
                            new Date(r.fecha || r.date).toLocaleDateString('es-AR'),
                            r.partner?.name || r.supplier?.name || '—',
                            <Badge key="badge">{r.lines?.length || r.items?.length || 0} ítems</Badge>,
                            <div key="actions" style={{ textAlign: 'right' }}>
                                <Btn small variant="danger" onClick={(e: any) => {
                                    e.stopPropagation();
                                    if (window.confirm('¿Estás seguro de que querés anular este remito?')) {
                                        deleteRemito(r.id);
                                    }
                                }}>🗑</Btn>
                            </div>
                        ])}
                    />
                </Card>
            )}

            <RemitoDetailModal
                open={showDetail}
                onClose={() => setShowDetail(false)}
                remito={selectedRemito}
            />
        </div>
    );
}
