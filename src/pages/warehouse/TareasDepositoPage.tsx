import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
    useGetTasksQuery,
    useGetTaskTypesQuery,
    useCreateTaskMutation,
    useStartTaskMutation,
    useCompleteTaskMutation,
    useCancelTaskMutation,
    useGetEmptyPositionsQuery,
    useUpdateTaskTypeMutation,
    type TaskItem,
} from '../../features/warehouse/tasks/api/tasks.api';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { useGetItemsQuery } from '../../features/warehouse/materiales/api/items.api';
import { useGetEmployeesQuery } from '../../features/hr/api/hr.api';
import { PageHeader, Card, Btn, Modal, Input, Badge, Spinner, useIsMobile } from '../../shared/ui';

// Destinos habituales de plantas/clientes
const DESTINOS_RAPIDOS = ['Catamarca', 'José', 'San Martín', 'Depósito Central', 'Tejeduría'];

// Cronómetro en vivo para tareas en progreso
function LiveElapsedTime({ startedAt, estimatedMin }: { startedAt?: string | null; estimatedMin?: number | null }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 15000);
        return () => clearInterval(interval);
    }, []);

    if (!startedAt) return null;
    const elapsedMin = Math.max(1, Math.round((now - new Date(startedAt).getTime()) / 60000));
    const est = estimatedMin || 30;
    const isExceeded = elapsedMin > est;

    return (
        <span style={{
            background: isExceeded ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.2)',
            border: `1px solid ${isExceeded ? '#ef4444' : '#10b981'}`,
            color: isExceeded ? '#f87171' : '#34d399',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
        }}>
            <span>⏱️</span>
            En curso: {elapsedMin} min {isExceeded ? `(+${elapsedMin - est} min excedido)` : `(est: ${est} min)`}
        </span>
    );
}

// Alerta visual de entrega próxima o vencida
function DeliveryDeadlineBadge({ dueDate }: { dueDate?: string | null }) {
    if (!dueDate) return null;
    const dueTime = new Date(dueDate).getTime();
    const now = Date.now();
    const diffHours = (dueTime - now) / (1000 * 60 * 60);

    if (diffHours < 0) {
        return (
            <span style={{
                background: '#dc2626',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 0 10px rgba(220, 38, 38, 0.5)',
            }}>
                🚨 VENCIDO ({new Date(dueDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })})
            </span>
        );
    }

    if (diffHours <= 3) {
        return (
            <span style={{
                background: '#ea580c',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
            }}>
                ⚠️ VENCE EN {Math.max(1, Math.round(diffHours))} HS ({new Date(dueDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })})
            </span>
        );
    }

    const isToday = new Date(dueDate).toDateString() === new Date().toDateString();
    if (isToday) {
        return (
            <span style={{
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid #f59e0b',
                color: '#fbbf24',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
            }}>
                📅 Entrega Hoy {new Date(dueDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
        );
    }

    return (
        <span style={{ fontSize: '12px', color: '#fb7185', fontWeight: 600 }}>
            📅 Entrega: {new Date(dueDate).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
    );
}

export default function TareasDepositoPage() {
    const isMobile = useIsMobile();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    // Modo Compras: si se accede desde /compras/pedidos-deposito
    const isComprasMode = location.pathname.includes('/compras');

    // Filtros principales
    const [selectedDepotId, setSelectedDepotId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'PENDING' | 'CUSTOMER_ORDER' | 'INVENTORY_CONTROL' | 'PUTAWAY' | 'EXTRAORDINARY' | 'COMPLETED'>(
        isComprasMode ? 'CUSTOMER_ORDER' : 'PENDING'
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<'ALL' | '1' | '2' | '3'>('ALL');

    // Carga de datos maestros
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => rawDepots.filter((d: any) => d.activo !== false), [rawDepots]);

    // Asignar primer depósito por defecto (priorizando Depósito Hilado)
    useEffect(() => {
        if (!selectedDepotId && depots.length > 0) {
            const hiladoDepot = depots.find((d: any) => d.nombre?.toLowerCase().includes('hilado'));
            setSelectedDepotId(hiladoDepot ? hiladoDepot.id : depots[0].id);
        }
    }, [depots, selectedDepotId]);

    // Sincronizar tab desde URL si viene con ?tab=
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam && ['PENDING', 'CUSTOMER_ORDER', 'INVENTORY_CONTROL', 'PUTAWAY', 'EXTRAORDINARY', 'COMPLETED'].includes(tabParam)) {
            setActiveTab(tabParam as any);
        }
    }, [searchParams]);

    // Empleados del sector depósito
    const { data: employees = [] } = useGetEmployeesQuery({ active: true });
    const warehouseEmployees = useMemo(() => {
        return employees.filter((e: any) => {
            const sec = (e.primarySectorCode || '').toUpperCase();
            const sub = (e.subSector || '').toUpperCase();
            return sec.includes('DEPOSITO') || sub.includes('HILADO') || sub.includes('PACKAGING') || e.depositoId;
        });
    }, [employees]);

    // Tipos de tareas del catálogo
    const { data: taskTypes = [] } = useGetTaskTypesQuery(selectedDepotId || undefined);

    // Consulta de tareas
    const { data: tasks = [], isLoading: loadingTasks } = useGetTasksQuery({
        depositoId: selectedDepotId || undefined,
        q: searchQuery.trim() || undefined,
    });

    // Posiciones vacías sugeridas
    const { data: emptyPositions = [] } = useGetEmptyPositionsQuery(selectedDepotId || undefined, {
        skip: !selectedDepotId,
    });

    // Artículos
    const { data: items = [] } = useGetItemsQuery({});

    // Mutations
    const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
    const [startTask, { isLoading: isStarting }] = useStartTaskMutation();
    const [completeTask, { isLoading: isCompleting }] = useCompleteTaskMutation();
    const [cancelTask] = useCancelTaskMutation();
    const [updateTaskType] = useUpdateTaskTypeMutation();

    // Modales de Creación
    const [showPedidoModal, setShowPedidoModal] = useState(false);
    const [showControlModal, setShowControlModal] = useState(false);
    const [showExtraModal, setShowExtraModal] = useState(false);
    const [showCatalogModal, setShowCatalogModal] = useState(false);

    // Modal de Completar Tarea
    const [taskToComplete, setTaskToComplete] = useState<TaskItem | null>(null);
    const [completeForm, setCompleteForm] = useState({
        completedByEmployeeId: '',
        tiempoRealMinutos: 30,
        resultStatus: 'CONFORME',
        resultNotes: '',
        actualTargetPositionId: '',
    });

    // Formulario Pedido de Hilado a Cliente/Planta
    const [pedidoForm, setPedidoForm] = useState({
        customerOrDestination: 'Catamarca',
        customDestination: '',
        dueDate: '',
        itemId: '',
        batchId: '',
        qty: '',
        priority: 2,
        assignedEmployeeId: '',
        description: '',
    });

    // Formulario Control de Inventario
    const [controlForm, setControlForm] = useState({
        controlType: 'CATEGORIA_GOMA',
        controlFilter: 'GOMA',
        title: 'Control y verificación de toda la goma',
        assignedEmployeeId: '',
        priority: 2,
        description: 'Revisar existencia física, lotes y rotulación en todas las posiciones con goma.',
    });

    // Formulario Tarea Extraordinaria
    const [extraForm, setExtraForm] = useState({
        title: '',
        description: '',
        assignedEmployeeId: '',
        priority: 2,
        tiempoEstimadoMinutos: 45,
        dueDate: '',
    });

    // Métricas y Contadores
    const kpis = useMemo(() => {
        let pendingCustomerOrders = 0;
        let inProgressCustomerOrders = 0;
        let pendingControls = 0;
        let pendingPutaways = 0;
        let pendingExtra = 0;
        let completedToday = 0;
        let totalEstimatedMinutesPending = 0;

        const todayStr = new Date().toISOString().split('T')[0];

        tasks.forEach((t) => {
            const isPending = t.status === 'PENDING' || t.status === 'IN_PROGRESS';
            if (isPending) {
                totalEstimatedMinutesPending += Number(t.tiempoEstimadoMinutos) || 30;
                if (t.type === 'CUSTOMER_ORDER') {
                    pendingCustomerOrders++;
                    if (t.status === 'IN_PROGRESS') inProgressCustomerOrders++;
                } else if (t.type === 'INVENTORY_CONTROL') pendingControls++;
                else if (t.type === 'PUTAWAY') pendingPutaways++;
                else pendingExtra++;
            }
            if (t.status === 'COMPLETED' && t.completedAt?.startsWith(todayStr)) {
                completedToday++;
            }
        });

        return {
            pendingCustomerOrders,
            inProgressCustomerOrders,
            pendingControls,
            pendingPutaways,
            pendingExtra,
            completedToday,
            totalPending: pendingCustomerOrders + pendingControls + pendingPutaways + pendingExtra,
            totalEstimatedHoursPending: Math.round((totalEstimatedMinutesPending / 60) * 10) / 10,
        };
    }, [tasks]);

    // Filtrado de Tareas según Tab y Prioridad
    const filteredTasks = useMemo(() => {
        return tasks.filter((t) => {
            if (priorityFilter !== 'ALL' && String(t.priority) !== priorityFilter) return false;

            // En modo compras, filtramos solo órdenes de clientes
            if (isComprasMode) {
                if (activeTab === 'COMPLETED') {
                    return t.type === 'CUSTOMER_ORDER' && t.status === 'COMPLETED';
                }
                return t.type === 'CUSTOMER_ORDER' && (t.status === 'PENDING' || t.status === 'IN_PROGRESS');
            }

            if (activeTab === 'PENDING') {
                return t.status === 'PENDING' || t.status === 'IN_PROGRESS';
            }
            if (activeTab === 'COMPLETED') {
                return t.status === 'COMPLETED';
            }
            if (activeTab === 'CUSTOMER_ORDER') {
                return t.type === 'CUSTOMER_ORDER';
            }
            if (activeTab === 'INVENTORY_CONTROL') {
                return t.type === 'INVENTORY_CONTROL';
            }
            if (activeTab === 'PUTAWAY') {
                return t.type === 'PUTAWAY';
            }
            if (activeTab === 'EXTRAORDINARY') {
                return t.type === 'EXTRAORDINARY' || t.type === 'REPLENISHMENT';
            }
            return true;
        });
    }, [tasks, activeTab, priorityFilter, isComprasMode]);

    // Handlers
    const handleStartTask = async (task: TaskItem) => {
        try {
            await startTask({ id: task.id }).unwrap();
        } catch (err: any) {
            alert('Error al iniciar la tarea: ' + (err?.data?.message || err.message));
        }
    };

    const handleOpenCompleteModal = (task: TaskItem) => {
        setTaskToComplete(task);
        let defaultMinutes = task.tiempoEstimadoMinutos || 30;
        if (task.startedAt) {
            const diffMs = Date.now() - new Date(task.startedAt).getTime();
            defaultMinutes = Math.max(1, Math.round(diffMs / 60000));
        }
        setCompleteForm({
            completedByEmployeeId: task.assignedEmployeeId || (warehouseEmployees[0]?.id || ''),
            tiempoRealMinutos: defaultMinutes,
            resultStatus: 'CONFORME',
            resultNotes: '',
            actualTargetPositionId: task.targetPositionId || '',
        });
    };

    const handleConfirmComplete = async () => {
        if (!taskToComplete) return;
        try {
            await completeTask({
                id: taskToComplete.id,
                tiempoRealMinutos: Number(completeForm.tiempoRealMinutos),
                completedByEmployeeId: completeForm.completedByEmployeeId || undefined,
                resultStatus: completeForm.resultStatus,
                resultNotes: completeForm.resultNotes,
                actualTargetPositionId: completeForm.actualTargetPositionId || undefined,
            }).unwrap();
            setTaskToComplete(null);
        } catch (err: any) {
            alert('Error al completar tarea: ' + (err?.data?.message || err.message));
        }
    };

    const handleCancel = async (task: TaskItem) => {
        const reason = prompt('Ingrese el motivo de cancelación de la tarea:');
        if (reason === null) return;
        try {
            await cancelTask({ id: task.id, reason }).unwrap();
        } catch (err: any) {
            alert('Error al cancelar tarea: ' + (err?.data?.message || err.message));
        }
    };

    // Crear Pedido de Hilado
    const handleCreatePedido = async () => {
        const destination = pedidoForm.customerOrDestination === 'OTRO'
            ? pedidoForm.customDestination.trim()
            : pedidoForm.customerOrDestination;

        if (!destination) {
            alert('Por favor ingrese el cliente o destino del pedido.');
            return;
        }

        const selectedItem = items.find((i: any) => i.id === pedidoForm.itemId);
        const itemDesc = selectedItem ? `${selectedItem.codigo} - ${selectedItem.descripcion}` : 'Hilado';
        const title = `Armar pedido para ${destination}: ${pedidoForm.qty || ''} kg ${itemDesc}`;

        try {
            await createTask({
                type: 'CUSTOMER_ORDER',
                depositoId: selectedDepotId || null,
                title,
                description: pedidoForm.description || null,
                customerOrDestination: destination,
                dueDate: pedidoForm.dueDate || null,
                originSector: isComprasMode ? 'COMPRAS' : 'DEPOSITO',
                itemId: pedidoForm.itemId || null,
                batchId: pedidoForm.batchId || null,
                qty: pedidoForm.qty ? Number(pedidoForm.qty) : null,
                priority: Number(pedidoForm.priority) || 2,
                assignedEmployeeId: pedidoForm.assignedEmployeeId || null,
                tiempoEstimadoMinutos: 60,
            }).unwrap();

            setShowPedidoModal(false);
            setPedidoForm({
                customerOrDestination: 'Catamarca',
                customDestination: '',
                dueDate: '',
                itemId: '',
                batchId: '',
                qty: '',
                priority: 2,
                assignedEmployeeId: '',
                description: '',
            });
        } catch (err: any) {
            alert('Error creando pedido: ' + (err?.data?.message || err.message));
        }
    };

    // Crear Control de Stock
    const handleCreateControl = async () => {
        try {
            await createTask({
                type: 'INVENTORY_CONTROL',
                depositoId: selectedDepotId || null,
                title: controlForm.title,
                description: controlForm.description || null,
                controlType: controlForm.controlType,
                controlFilter: controlForm.controlFilter,
                priority: Number(controlForm.priority) || 2,
                assignedEmployeeId: controlForm.assignedEmployeeId || null,
                tiempoEstimadoMinutos: controlForm.controlType === 'CATEGORIA_GOMA' ? 45 : (controlForm.controlType === 'POSICIONES_VACIAS' ? 30 : 20),
            }).unwrap();

            setShowControlModal(false);
        } catch (err: any) {
            alert('Error creando tarea de control: ' + (err?.data?.message || err.message));
        }
    };

    // Crear Tarea Extraordinaria
    const handleCreateExtra = async () => {
        if (!extraForm.title.trim()) {
            alert('El título de la tarea es obligatorio.');
            return;
        }
        try {
            await createTask({
                type: 'EXTRAORDINARY',
                depositoId: selectedDepotId || null,
                title: extraForm.title.trim(),
                description: extraForm.description.trim() || null,
                dueDate: extraForm.dueDate || null,
                priority: Number(extraForm.priority) || 2,
                assignedEmployeeId: extraForm.assignedEmployeeId || null,
                tiempoEstimadoMinutos: Number(extraForm.tiempoEstimadoMinutos) || 45,
            }).unwrap();

            setShowExtraModal(false);
            setExtraForm({
                title: '',
                description: '',
                assignedEmployeeId: '',
                priority: 2,
                tiempoEstimadoMinutos: 45,
                dueDate: '',
            });
        } catch (err: any) {
            alert('Error creando tarea extraordinaria: ' + (err?.data?.message || err.message));
        }
    };

    return (
        <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header y Selector de Depósito */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '16px', marginBottom: '20px' }}>
                <div>
                    <PageHeader
                        title={isComprasMode ? "🚚 Pedidos de Hilado a Depósito" : "Tareas de Depósito"}
                        subtitle={isComprasMode
                            ? "Solicitud y seguimiento de despachos de hilado para Catamarca, José, San Martín y clientes"
                            : "Gestión de pedidos de clientes, controles de stock, acomodos y tiempos estándar"}
                    />
                </div>

                {/* Selector de Depósito */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary, #1a1d2e)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border-color, #2a2d3e)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600 }}>Depósito:</span>
                    <select
                        value={selectedDepotId}
                        onChange={(e) => setSelectedDepotId(e.target.value)}
                        style={{
                            background: 'transparent',
                            color: 'var(--text-primary, #f3f4f6)',
                            border: 'none',
                            outline: 'none',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        <option value="" style={{ background: '#1a1d2e', color: '#fff' }}>Todos los Depósitos</option>
                        {depots.map((d: any) => (
                            <option key={d.id} value={d.id} style={{ background: '#1a1d2e', color: '#fff' }}>
                                {d.nombre} {d.planta ? `(${d.planta})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* KPIs Cards */}
            {isComprasMode ? (
                /* KPIs Específicos de Compras */
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                    gap: '12px',
                    marginBottom: '20px',
                }}>
                    <Card style={{ padding: '16px', borderLeft: '4px solid #6366f1' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600 }}>🚚 Pedidos en Espera</div>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: '#818cf8', marginTop: '4px' }}>
                            {kpis.pendingCustomerOrders - kpis.inProgressCustomerOrders}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dimmed, #6b7280)', marginTop: '2px' }}>
                            Aguardando toma por operario
                        </div>
                    </Card>

                    <Card style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600 }}>⚙️ En Preparación</div>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
                            {kpis.inProgressCustomerOrders}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dimmed, #6b7280)', marginTop: '2px' }}>
                            Operarios armando conos y pesando
                        </div>
                    </Card>

                    <Card style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600 }}>✓ Completados Hoy</div>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                            {kpis.completedToday}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dimmed, #6b7280)', marginTop: '2px' }}>
                            Listos para despacho o retirados
                        </div>
                    </Card>

                    <Card style={{ padding: '16px', borderLeft: '4px solid #06b6d4' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600 }}>📍 Destinos Clave</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#22d3ee', marginTop: '8px' }}>
                            Catamarca • San Martín • José
                        </div>
                    </Card>
                </div>
            ) : (
                /* KPIs Completos de Depósito */
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)',
                    gap: '12px',
                    marginBottom: '20px',
                }}>
                    <Card style={{ padding: '16px', borderLeft: '4px solid #6366f1' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600 }}>🚚 Pedidos a Clientes</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#818cf8', marginTop: '4px' }}>
                            {kpis.pendingCustomerOrders}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dimmed, #6b7280)', marginTop: '2px' }}>
                            Catamarca, José, San Martín...
                        </div>
                    </Card>

                    <Card style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600 }}>🔍 Controles de Stock</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
                            {kpis.pendingControls}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dimmed, #6b7280)', marginTop: '2px' }}>
                            Goma, vacíos, proveedores
                        </div>
                    </Card>

                    <Card style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600 }}>📥 Acomodos (Putaway)</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                            {kpis.pendingPutaways}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dimmed, #6b7280)', marginTop: '2px' }}>
                            Mercadería recibida
                        </div>
                    </Card>

                    <Card style={{ padding: '16px', borderLeft: '4px solid #ec4899' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600 }}>⚡ Extraordinarias</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#f472b6', marginTop: '4px' }}>
                            {kpis.pendingExtra}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dimmed, #6b7280)', marginTop: '2px' }}>
                            Limpieza, descarga camión
                        </div>
                    </Card>

                    <Card style={{ padding: '16px', borderLeft: '4px solid #06b6d4', gridColumn: isMobile ? 'span 2' : 'auto' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600 }}>⏱️ Carga Total Estimada</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#22d3ee', marginTop: '4px' }}>
                            {kpis.totalEstimatedHoursPending} hs
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dimmed, #6b7280)', marginTop: '2px' }}>
                            {kpis.completedToday} completadas hoy
                        </div>
                    </Card>
                </div>
            )}

            {/* Barra de Acciones y Botones de Creación */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                background: 'var(--bg-secondary, #1a1d2e)',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #2a2d3e)',
            }}>
                {/* Botones de creación rápida */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <Btn
                        onClick={() => setShowPedidoModal(true)}
                        style={{ background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: '13px' }}
                    >
                        🚚 + {isComprasMode ? 'Solicitar Hilado a Depósito' : 'Pedido a Cliente / Planta'}
                    </Btn>

                    {!isComprasMode && (
                        <>
                            <Btn
                                onClick={() => setShowControlModal(true)}
                                style={{ background: '#d97706', color: '#fff', fontWeight: 600, fontSize: '13px' }}
                            >
                                🔍 + Control de Stock
                            </Btn>
                            <Btn
                                onClick={() => setShowExtraModal(true)}
                                style={{ background: '#db2777', color: '#fff', fontWeight: 600, fontSize: '13px' }}
                            >
                                ⚡ + Extraordinaria
                            </Btn>
                            <Btn
                                onClick={() => setShowCatalogModal(true)}
                                style={{ background: 'transparent', border: '1px solid var(--border-color, #374151)', color: 'var(--text-primary, #f3f4f6)', fontSize: '13px' }}
                            >
                                ⚙ Tiempos Estándar
                            </Btn>
                        </>
                    )}
                </div>

                {/* Buscador & Prioridad */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? '1 1 100%' : 'none' }}>
                    <input
                        type="text"
                        placeholder="Buscar cliente, artículo o posición..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            background: 'var(--bg-primary, #0f1117)',
                            border: '1px solid var(--border-color, #2a2d3e)',
                            color: 'var(--text-primary, #f3f4f6)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            minWidth: isMobile ? '100%' : '260px',
                        }}
                    />
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as any)}
                        style={{
                            background: 'var(--bg-primary, #0f1117)',
                            border: '1px solid var(--border-color, #2a2d3e)',
                            color: 'var(--text-primary, #f3f4f6)',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            fontSize: '13px',
                        }}
                    >
                        <option value="ALL">Todas las prioridades</option>
                        <option value="1">Urgente (1)</option>
                        <option value="2">Media (2)</option>
                        <option value="3">Baja (3)</option>
                    </select>
                </div>
            </div>

            {/* Pestañas de Navegación */}
            <div style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid var(--border-color, #2a2d3e)',
                paddingBottom: '8px',
                marginBottom: '16px',
                overflowX: 'auto',
            }}>
                {isComprasMode ? (
                    [
                        { id: 'CUSTOMER_ORDER', label: `Pedidos Pendientes & En Preparación (${kpis.pendingCustomerOrders})`, icon: '🚚' },
                        { id: 'COMPLETED', label: `Historial de Pedidos Completados (${kpis.completedToday} hoy)`, icon: '✅' },
                    ].map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                style={{
                                    background: isActive ? 'var(--bg-secondary, #1e2238)' : 'transparent',
                                    border: 'none',
                                    borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                                    color: isActive ? '#fff' : 'var(--text-subtle, #9ca3af)',
                                    padding: '8px 14px',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    borderRadius: '6px 6px 0 0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        );
                    })
                ) : (
                    [
                        { id: 'PENDING', label: `Pendientes (${kpis.totalPending})`, icon: '⏳' },
                        { id: 'CUSTOMER_ORDER', label: `Pedidos Clientes (${kpis.pendingCustomerOrders})`, icon: '🚚' },
                        { id: 'INVENTORY_CONTROL', label: `Controles Stock (${kpis.pendingControls})`, icon: '🔍' },
                        { id: 'PUTAWAY', label: `Acomodos (${kpis.pendingPutaways})`, icon: '📥' },
                        { id: 'EXTRAORDINARY', label: `Extraordinarias (${kpis.pendingExtra})`, icon: '⚡' },
                        { id: 'COMPLETED', label: `Historial Completadas (${kpis.completedToday} hoy)`, icon: '✅' },
                    ].map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                style={{
                                    background: isActive ? 'var(--bg-secondary, #1e2238)' : 'transparent',
                                    border: 'none',
                                    borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                                    color: isActive ? '#fff' : 'var(--text-subtle, #9ca3af)',
                                    padding: '8px 14px',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    borderRadius: '6px 6px 0 0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Lista de Tareas */}
            {loadingTasks ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <Spinner />
                </div>
            ) : filteredTasks.length === 0 ? (
                <Card style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-subtle, #9ca3af)' }}>
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎉</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary, #f3f4f6)' }}>
                        {isComprasMode ? 'No hay pedidos de hilado pendientes en este momento.' : 'No hay tareas pendientes en esta sección.'}
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>
                        {isComprasMode
                            ? 'Tocá "+ Solicitar Hilado a Depósito" para crear un requerimiento para Catamarca, José o San Martín.'
                            : 'Podés generar un nuevo pedido de hilado, programar un control de stock o crear una tarea extraordinaria.'}
                    </div>
                </Card>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredTasks.map((task) => {
                        const isOrder = task.type === 'CUSTOMER_ORDER';
                        const isControl = task.type === 'INVENTORY_CONTROL';
                        const isPutaway = task.type === 'PUTAWAY';
                        const isCompleted = task.status === 'COMPLETED';
                        const isInProgress = task.status === 'IN_PROGRESS';

                        return (
                            <Card
                                key={task.id}
                                style={{
                                    padding: '16px 20px',
                                    borderLeft: `5px solid ${
                                        isOrder ? '#6366f1' : isControl ? '#f59e0b' : isPutaway ? '#10b981' : '#ec4899'
                                    }`,
                                    opacity: isCompleted ? 0.85 : 1,
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    flexDirection: isMobile ? 'column' : 'row',
                                    justifyContent: 'space-between',
                                    alignItems: isMobile ? 'flex-start' : 'center',
                                    gap: '12px',
                                }}>
                                    {/* Info principal de la tarea */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <Badge color={
                                                isOrder ? '#818cf8' : isControl ? '#fbbf24' : isPutaway ? '#34d399' : '#f472b6'
                                            }>
                                                {isOrder ? '🚚 PEDIDO CLIENTE' : isControl ? '🔍 CONTROL STOCK' : isPutaway ? '📥 ACOMODO' : '⚡ EXTRAORDINARIA'}
                                            </Badge>

                                            {task.customerOrDestination && (
                                                <span style={{
                                                    background: 'rgba(99, 102, 241, 0.25)',
                                                    border: '1px solid #6366f1',
                                                    color: '#c7d2fe',
                                                    padding: '2px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    fontWeight: 800,
                                                }}>
                                                    📍 {task.customerOrDestination}
                                                </span>
                                            )}

                                            {task.priority === 1 && (
                                                <Badge color="#ef4444">🔥 URGENTE</Badge>
                                            )}

                                            <span style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)' }}>
                                                ⏱️ Est.: {task.tiempoEstimadoMinutos || 30} min
                                            </span>

                                            {/* Cronómetro en vivo si está en progreso */}
                                            {isInProgress && (
                                                <LiveElapsedTime startedAt={task.startedAt} estimatedMin={task.tiempoEstimadoMinutos} />
                                            )}

                                            {/* Alerta de entrega */}
                                            {task.dueDate && (
                                                <DeliveryDeadlineBadge dueDate={task.dueDate} />
                                            )}
                                        </div>

                                        {/* Título y descripción */}
                                        <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: 'var(--text-primary, #f3f4f6)', fontWeight: 700 }}>
                                            {task.title || (task.item ? task.item.descripcion : 'Tarea de Depósito')}
                                        </h3>

                                        {task.description && (
                                            <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-muted, #9ca3af)', lineHeight: 1.4 }}>
                                                {task.description}
                                            </p>
                                        )}

                                        {/* Datos de Material / Posición si aplican */}
                                        {(task.item || task.sourcePosition || task.targetPosition) && (
                                            <div style={{
                                                marginTop: '8px',
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                alignItems: 'center',
                                                gap: '12px',
                                                background: 'var(--bg-primary, #0f1117)',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                            }}>
                                                {task.qty && (
                                                    <div>
                                                        <span style={{ color: 'var(--text-subtle, #6b7280)' }}>Cantidad: </span>
                                                        <strong style={{ color: '#fff' }}>{task.qty} {task.item?.unidadPrincipal || 'kg'}</strong>
                                                    </div>
                                                )}
                                                {task.batch && (
                                                    <div>
                                                        <span style={{ color: 'var(--text-subtle, #6b7280)' }}>Lote: </span>
                                                        <strong style={{ color: '#fff' }}>{task.batch.lotNumber}</strong>
                                                    </div>
                                                )}
                                                {task.sourcePosition && (
                                                    <div>
                                                        <span style={{ color: 'var(--text-subtle, #6b7280)' }}>Origen: </span>
                                                        <strong style={{ color: '#818cf8' }}>{task.sourcePosition.codigo}</strong>
                                                    </div>
                                                )}
                                                {task.targetPosition && (
                                                    <div>
                                                        <span style={{ color: 'var(--text-subtle, #6b7280)' }}>➔ Destino sugerido: </span>
                                                        <strong style={{ color: '#34d399' }}>{task.targetPosition.codigo}</strong>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Asignación y Operario */}
                                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-subtle, #6b7280)' }}>
                                            <span>
                                                👷 Operario: <strong style={{ color: 'var(--text-primary, #f3f4f6)' }}>
                                                    {task.assignedEmployee ? task.assignedEmployee.fullName : 'Sin asignar'}
                                                </strong>
                                            </span>
                                            {task.deposito && (
                                                <span>
                                                    🏢 {task.deposito.nombre}
                                                </span>
                                            )}
                                            {isCompleted && task.completedAt && (
                                                <span style={{ color: '#34d399', fontWeight: 600 }}>
                                                    ✓ Completado el {new Date(task.completedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} (Real: {task.tiempoRealMinutos || task.tiempoEstimadoMinutos} min)
                                                </span>
                                            )}
                                        </div>

                                        {/* Notas de resultado si ya se completó */}
                                        {task.resultNotes && (
                                            <div style={{ marginTop: '6px', fontSize: '12px', color: '#93c5fd', fontStyle: 'italic' }}>
                                                Resultado: {task.resultStatus || 'Completado'} — {task.resultNotes}
                                            </div>
                                        )}
                                    </div>

                                    {/* Botones de acción del operario */}
                                    <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '8px', minWidth: '150px' }}>
                                        {!isCompleted && (
                                            <>
                                                {task.status === 'PENDING' && (
                                                    <Btn
                                                        onClick={() => handleStartTask(task)}
                                                        disabled={isStarting}
                                                        style={{ background: '#3b82f6', color: '#fff', padding: '10px 16px', fontWeight: 600, fontSize: '13px' }}
                                                    >
                                                        ▶ Iniciar Tarea
                                                    </Btn>
                                                )}

                                                {isInProgress && (
                                                    <Btn
                                                        onClick={() => handleOpenCompleteModal(task)}
                                                        style={{ background: '#10b981', color: '#fff', padding: '10px 16px', fontWeight: 700, fontSize: '13px' }}
                                                    >
                                                        ✓ Finalizar / Listo
                                                    </Btn>
                                                )}

                                                <button
                                                    onClick={() => handleCancel(task)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'var(--text-dimmed, #6b7280)',
                                                        fontSize: '11px',
                                                        cursor: 'pointer',
                                                        padding: '4px',
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    Cancelar tarea
                                                </button>
                                            </>
                                        )}

                                        {isCompleted && (
                                            <span style={{ fontSize: '12px', color: '#34d399', fontWeight: 700, textAlign: 'center' }}>
                                                ✓ Tarea Finalizada
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* MODAL 1: Pedido de Hilado a Cliente (Compras / Depósito) */}
            {showPedidoModal && (
                <Modal title="Armar Pedido de Hilado para Cliente / Planta" onClose={() => setShowPedidoModal(false)}>
                    <div style={{ padding: '8px 0', maxWidth: '520px', width: '100%' }}>
                        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-subtle, #9ca3af)' }}>
                            Genera una orden para que el personal de depósito prepare, pese y aparte el hilado con fecha límite.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Destino / Cliente */}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                                    Destino / Cliente:
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                    {DESTINOS_RAPIDOS.map((dest) => (
                                        <button
                                            key={dest}
                                            type="button"
                                            onClick={() => setPedidoForm({ ...pedidoForm, customerOrDestination: dest })}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                border: pedidoForm.customerOrDestination === dest ? '2px solid #6366f1' : '1px solid var(--border-color, #2a2d3e)',
                                                background: pedidoForm.customerOrDestination === dest ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-primary, #0f1117)',
                                                color: pedidoForm.customerOrDestination === dest ? '#fff' : 'var(--text-muted, #9ca3af)',
                                            }}
                                        >
                                            {dest}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setPedidoForm({ ...pedidoForm, customerOrDestination: 'OTRO' })}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            border: pedidoForm.customerOrDestination === 'OTRO' ? '2px solid #6366f1' : '1px solid var(--border-color, #2a2d3e)',
                                            background: 'var(--bg-primary, #0f1117)',
                                            color: '#fff',
                                        }}
                                    >
                                        + Otro cliente
                                    </button>
                                </div>

                                {pedidoForm.customerOrDestination === 'OTRO' && (
                                    <input
                                        type="text"
                                        placeholder="Nombre del cliente o destino..."
                                        value={pedidoForm.customDestination}
                                        onChange={(e) => setPedidoForm({ ...pedidoForm, customDestination: e.target.value })}
                                        style={{
                                            width: '100%',
                                            background: 'var(--bg-primary, #0f1117)',
                                            border: '1px solid var(--border-color, #2a2d3e)',
                                            color: '#fff',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                        }}
                                    />
                                )}
                            </div>

                            {/* Fecha de Entrega Comprometida */}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    📅 Fecha y Hora de Entrega Límite:
                                </label>
                                <input
                                    type="datetime-local"
                                    value={pedidoForm.dueDate}
                                    onChange={(e) => setPedidoForm({ ...pedidoForm, dueDate: e.target.value })}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: '#fff',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                    }}
                                />
                            </div>

                            {/* Artículo / Hilado */}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    🧶 Artículo / Hilado:
                                </label>
                                <select
                                    value={pedidoForm.itemId}
                                    onChange={(e) => setPedidoForm({ ...pedidoForm, itemId: e.target.value })}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: '#fff',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                    }}
                                >
                                    <option value="">Seleccione el hilado...</option>
                                    {items.map((it: any) => (
                                        <option key={it.id} value={it.id}>
                                            {it.codigo} - {it.descripcion}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Kilos y Prioridad */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                        Kilos Requeridos:
                                    </label>
                                    <Input
                                        placeholder="Ej: 500"
                                        value={String(pedidoForm.qty)}
                                        onChange={(v: string) => setPedidoForm({ ...pedidoForm, qty: v })}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                        Prioridad:
                                    </label>
                                    <select
                                        value={pedidoForm.priority}
                                        onChange={(e) => setPedidoForm({ ...pedidoForm, priority: Number(e.target.value) })}
                                        style={{
                                            width: '100%',
                                            background: 'var(--bg-primary, #0f1117)',
                                            border: '1px solid var(--border-color, #2a2d3e)',
                                            color: '#fff',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                        }}
                                    >
                                        <option value={1}>🔥 Urgente</option>
                                        <option value={2}>Media / Normal</option>
                                        <option value={3}>Baja</option>
                                    </select>
                                </div>
                            </div>

                            {/* Operario Asignado */}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    👷 Operario Asignado (opcional):
                                </label>
                                <select
                                    value={pedidoForm.assignedEmployeeId}
                                    onChange={(e) => setPedidoForm({ ...pedidoForm, assignedEmployeeId: e.target.value })}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: '#fff',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                    }}
                                >
                                    <option value="">Cualquier operario disponible</option>
                                    {warehouseEmployees.map((emp: any) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.fullName} (#{emp.legajo}) • {emp.subSector === 'PACKAGING' ? '📦 Packaging' : '🧵 Hilado'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Observaciones */}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    Instrucciones especiales:
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Ej: Embalar en cajas de 25kg, paletizar para el expreso..."
                                    value={pedidoForm.description}
                                    onChange={(e) => setPedidoForm({ ...pedidoForm, description: e.target.value })}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: '#fff',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                                <Btn onClick={() => setShowPedidoModal(false)} style={{ background: 'transparent' }}>
                                    Cancelar
                                </Btn>
                                <Btn onClick={handleCreatePedido} disabled={isCreating} style={{ background: '#4f46e5', color: '#fff' }}>
                                    {isComprasMode ? 'Enviar Solicitud a Depósito' : 'Crear Pedido de Hilado'}
                                </Btn>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL 2: Control de Stock e Inventario Diaria */}
            {showControlModal && (
                <Modal title="Programar Control / Auditoría de Stock" onClose={() => setShowControlModal(false)}>
                    <div style={{ padding: '8px 0', maxWidth: '520px', width: '100%' }}>
                        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-subtle, #9ca3af)' }}>
                            Asigna al operario la verificación física de goma, posiciones vacías, proveedores o pre-arribo de color.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Tipo de Control */}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                                    ¿Qué tipo de control se va a realizar?
                                </label>
                                <select
                                    value={controlForm.controlType}
                                    onChange={(e) => {
                                        const type = e.target.value;
                                        let title = '';
                                        let desc = '';
                                        if (type === 'CATEGORIA_GOMA') {
                                            title = 'Chequear toda la goma (Elastómero)';
                                            desc = 'Revisar existencia física, lotes y rotulación en todas las posiciones con goma.';
                                        } else if (type === 'POSICIONES_VACIAS') {
                                            title = `Verificar ${emptyPositions.length} posiciones vacías en depósito`;
                                            desc = 'Cotejar físicamente que las posiciones que figuran vacías en el sistema estén realmente libres y limpias.';
                                        } else if (type === 'PROVEEDOR') {
                                            title = 'Auditoría de stock por Proveedor';
                                            desc = 'Verificar hilados del proveedor seleccionado.';
                                        } else if (type === 'PRE_ARRIBO_COLOR') {
                                            title = 'Chequeo preventivo de arribo de color';
                                            desc = 'Verificar stock actual y liberar huecos para recepción de hilado teñido.';
                                        }
                                        setControlForm({
                                            ...controlForm,
                                            controlType: type,
                                            title,
                                            description: desc,
                                        });
                                    }}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: '#fff',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                    }}
                                >
                                    <option value="CATEGORIA_GOMA">🎯 Control de Toda la Goma / Elastómeros</option>
                                    <option value="POSICIONES_VACIAS">📭 Chequear Posiciones Vacías ({emptyPositions.length} detectadas)</option>
                                    <option value="PROVEEDOR">🏭 Control por Proveedor Determinado</option>
                                    <option value="PRE_ARRIBO_COLOR">🎨 Pre-Arribo de Color (Huecos y stock previo)</option>
                                    <option value="POSICION_ESPECIFICA">📍 Control de Posición Puntual</option>
                                </select>
                            </div>

                            {/* Título editable */}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    Título de la Tarea:
                                </label>
                                <Input
                                    value={controlForm.title}
                                    onChange={(v: string) => setControlForm({ ...controlForm, title: v })}
                                />
                            </div>

                            {/* Operario Asignado */}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    👷 Asignar a Operario:
                                </label>
                                <select
                                    value={controlForm.assignedEmployeeId}
                                    onChange={(e) => setControlForm({ ...controlForm, assignedEmployeeId: e.target.value })}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: '#fff',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                    }}
                                >
                                    <option value="">Cualquier operario disponible</option>
                                    {warehouseEmployees.map((emp: any) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.fullName} (#{emp.legajo}) • {emp.subSector === 'PACKAGING' ? '📦 Packaging' : '🧵 Hilado'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Instrucciones */}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    Instrucciones del Control:
                                </label>
                                <textarea
                                    rows={2}
                                    value={controlForm.description}
                                    onChange={(e) => setControlForm({ ...controlForm, description: e.target.value })}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: '#fff',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                                <Btn onClick={() => setShowControlModal(false)} style={{ background: 'transparent' }}>
                                    Cancelar
                                </Btn>
                                <Btn onClick={handleCreateControl} disabled={isCreating} style={{ background: '#d97706', color: '#fff' }}>
                                    Programar Control
                                </Btn>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL 3: Tarea Extraordinaria */}
            {showExtraModal && (
                <Modal title="Nueva Tarea Extraordinaria de Depósito" onClose={() => setShowExtraModal(false)}>
                    <div style={{ padding: '8px 0', maxWidth: '480px', width: '100%' }}>
                        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-subtle, #9ca3af)' }}>
                            Tareas operativas puntuales (limpieza de pasillo, descarga de camión, clasificación de conos vacíos).
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    Título de la Tarea:
                                </label>
                                <Input
                                    placeholder="Ej: Descarga camión de cajas a las 15hs"
                                    value={extraForm.title}
                                    onChange={(v: string) => setExtraForm({ ...extraForm, title: v })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                        ⏱️ Tiempo Estimado (min):
                                    </label>
                                    <Input
                                        placeholder="Ej: 45"
                                        value={String(extraForm.tiempoEstimadoMinutos)}
                                        onChange={(v: string) => setExtraForm({ ...extraForm, tiempoEstimadoMinutos: Number(v) || 45 })}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                        Prioridad:
                                    </label>
                                    <select
                                        value={extraForm.priority}
                                        onChange={(e) => setExtraForm({ ...extraForm, priority: Number(e.target.value) })}
                                        style={{
                                            width: '100%',
                                            background: 'var(--bg-primary, #0f1117)',
                                            border: '1px solid var(--border-color, #2a2d3e)',
                                            color: '#fff',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                        }}
                                    >
                                        <option value={1}>🔥 Urgente</option>
                                        <option value={2}>Media / Normal</option>
                                        <option value={3}>Baja</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    👷 Operario Asignado:
                                </label>
                                <select
                                    value={extraForm.assignedEmployeeId}
                                    onChange={(e) => setExtraForm({ ...extraForm, assignedEmployeeId: e.target.value })}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: '#fff',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                    }}
                                >
                                    <option value="">Cualquier operario</option>
                                    {warehouseEmployees.map((emp: any) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.fullName} (#{emp.legajo}) • {emp.subSector === 'PACKAGING' ? '📦 Packaging' : '🧵 Hilado'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    Detalle / Instrucciones:
                                </label>
                                <textarea
                                    rows={2}
                                    value={extraForm.description}
                                    onChange={(e) => setExtraForm({ ...extraForm, description: e.target.value })}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: '#fff',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                                <Btn onClick={() => setShowExtraModal(false)} style={{ background: 'transparent' }}>
                                    Cancelar
                                </Btn>
                                <Btn onClick={handleCreateExtra} disabled={isCreating} style={{ background: '#db2777', color: '#fff' }}>
                                    Crear Tarea
                                </Btn>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL 4: Completar / Finalizar Tarea */}
            {taskToComplete && (
                <Modal title="Confirmar Finalización de Tarea" onClose={() => setTaskToComplete(null)}>
                    <div style={{ padding: '8px 0', maxWidth: '480px', width: '100%' }}>
                        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-subtle, #9ca3af)' }}>
                            <strong>{taskToComplete.title || 'Tarea'}</strong>
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Operario que la completó */}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    👷 Operario que realizó la tarea:
                                </label>
                                <select
                                    value={completeForm.completedByEmployeeId}
                                    onChange={(e) => setCompleteForm({ ...completeForm, completedByEmployeeId: e.target.value })}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: '#fff',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                    }}
                                >
                                    <option value="">Seleccione el operario...</option>
                                    {warehouseEmployees.map((emp: any) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.fullName} (#{emp.legajo}) • {emp.subSector === 'PACKAGING' ? '📦 Packaging' : '🧵 Hilado'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Tiempo Real Dedicado */}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    ⏱️ Tiempo Real Trabajado (minutos):
                                </label>
                                <Input
                                    value={String(completeForm.tiempoRealMinutos)}
                                    onChange={(v: string) => setCompleteForm({ ...completeForm, tiempoRealMinutos: Number(v) || 30 })}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-subtle, #6b7280)' }}>
                                    Tiempo estándar estimado: {taskToComplete.tiempoEstimadoMinutos || 30} min
                                </span>
                            </div>

                            {/* Resultado */}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    Resultado / Conformidad:
                                </label>
                                <select
                                    value={completeForm.resultStatus}
                                    onChange={(e) => setCompleteForm({ ...completeForm, resultStatus: e.target.value })}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: '#fff',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                    }}
                                >
                                    <option value="CONFORME">✓ Conforme / Todo OK / Sin diferencias</option>
                                    <option value="DISCREPANCIA">⚠️ Con Discrepancias / Faltantes / Diferencias</option>
                                    <option value="PARCIAL">⏳ Preparación / Acomodo Parcial</option>
                                </select>
                            </div>

                            {/* Observaciones */}
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    Notas y observaciones del operario:
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Ej: Hilado preparado en 2 pallets, o se encontraron 5 cajas en vez de 6..."
                                    value={completeForm.resultNotes}
                                    onChange={(e) => setCompleteForm({ ...completeForm, resultNotes: e.target.value })}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: '#fff',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                                <Btn onClick={() => setTaskToComplete(null)} style={{ background: 'transparent' }}>
                                    Cancelar
                                </Btn>
                                <Btn onClick={handleConfirmComplete} disabled={isCompleting} style={{ background: '#10b981', color: '#fff', fontWeight: 700 }}>
                                    Confirmar y Guardar
                                </Btn>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL 5: Catálogo de Tipos de Tarea y Tiempos Estándar */}
            {showCatalogModal && (
                <Modal title="Catálogo de Tipos de Tarea y Tiempos Estándar" onClose={() => setShowCatalogModal(false)}>
                    <div style={{ padding: '8px 0', maxWidth: '640px', width: '100%' }}>
                        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-subtle, #9ca3af)' }}>
                            Define la duración esperada en minutos para cada tipo de tarea. RRHH utilizará estos tiempos para medir la eficiencia.
                        </p>

                        <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '16px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color, #2a2d3e)', color: 'var(--text-subtle, #9ca3af)' }}>
                                        <th style={{ textAlign: 'left', padding: '8px' }}>Tarea</th>
                                        <th style={{ textAlign: 'left', padding: '8px' }}>Tipo General</th>
                                        <th style={{ textAlign: 'right', padding: '8px' }}>Minutos Estándar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {taskTypes.map((tt) => (
                                        <tr key={tt.id} style={{ borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                            <td style={{ padding: '10px 8px', color: '#fff', fontWeight: 600 }}>{tt.nombre}</td>
                                            <td style={{ padding: '10px 8px', color: 'var(--text-muted, #9ca3af)' }}>{tt.tipoGeneral}</td>
                                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                                <input
                                                    type="number"
                                                    defaultValue={tt.tiempoEstimadoMinutos}
                                                    onBlur={async (e) => {
                                                        const val = Number(e.target.value);
                                                        if (val > 0 && val !== tt.tiempoEstimadoMinutos) {
                                                            await updateTaskType({ id: tt.id, tiempoEstimadoMinutos: val });
                                                        }
                                                    }}
                                                    style={{
                                                        width: '70px',
                                                        textAlign: 'center',
                                                        background: 'var(--bg-primary, #0f1117)',
                                                        border: '1px solid var(--border-color, #2a2d3e)',
                                                        color: '#34d399',
                                                        fontWeight: 700,
                                                        padding: '4px',
                                                        borderRadius: '6px',
                                                    }}
                                                /> min
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Btn onClick={() => setShowCatalogModal(false)} style={{ background: '#6366f1', color: '#fff' }}>
                                Listo
                            </Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
