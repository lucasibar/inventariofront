import { useGetPendingTasksQuery, useCompleteTaskMutation } from '../tasks/api/tasks.api';
import { PageHeader, Card, Spinner, Btn, Badge } from '../../../shared/ui';

export default function WorkspaceTasksPage() {
    const { data: tasks = [], isLoading } = useGetPendingTasksQuery();
    const [completeTask, { isLoading: isCompleting }] = useCompleteTaskMutation();

    if (isLoading) return <Spinner />;

    const handleComplete = async (taskId: string) => {
        if (confirm('¿Confirmas que has realizado este movimiento?')) {
            await completeTask(taskId);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <PageHeader title="Mis Tareas" subtitle="Lista de movimientos pendientes asignados" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {tasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', fontSize: '15px' }}>
                        ¡Buen trabajo! No tienes tareas pendientes en este momento.
                    </div>
                ) : tasks.map((task: any) => (
                    <Card key={task.id}>
                        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <Badge color={task.type === 'PUTAWAY' ? '#a5b4fc' : '#f472b6'}>
                                        {task.type === 'PUTAWAY' ? 'ENTRADA A STOCK' : task.type}
                                    </Badge>
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Prioridad: {task.priority}</span>
                                </div>
                                <h4 style={{ margin: '0 0 4px', color: '#f3f4f6' }}>{task.item?.descripcion}</h4>
                                <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                                    Cantidad: <span style={{ color: '#fff', fontWeight: 600 }}>{task.qty}</span> | 
                                    Lote: <span style={{ color: '#fff' }}>{task.batch?.lotNumber || 'Sin Lote'}</span>
                                </div>
                                
                                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: '#0f1117', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Origen</div>
                                        <div style={{ color: '#6366f1', fontWeight: 700 }}>{task.sourcePosition?.codigo}</div>
                                    </div>
                                    <div style={{ color: '#4b5563' }}>➔</div>
                                    <div style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Destino Sugerido</div>
                                        <div style={{ color: '#34d399', fontWeight: 700 }}>{task.targetPosition?.codigo}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ paddingLeft: '20px' }}>
                                <Btn 
                                    onClick={() => handleComplete(task.id)} 
                                    disabled={isCompleting}
                                    style={{ padding: '12px 24px' }}
                                >
                                    Confirmar Realizado
                                </Btn>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
