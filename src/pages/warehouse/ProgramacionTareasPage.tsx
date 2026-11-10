import { useState, useMemo } from 'react';
import {
    useGetTasksQuery,
    useUpdateTaskMutation,
    useStartTaskMutation,
    useCompleteTaskMutation,
    useCancelTaskMutation,
    useCreateTaskMutation,
    type TaskItem,
} from '../../features/warehouse/tasks/api/tasks.api';
import { useGetEmployeesQuery } from '../../features/hr/api/hr.api';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { PageHeader, Card, Table, Btn, Modal, Input, Badge, Spinner, useIsMobile } from '../../shared/ui';

export default function ProgramacionTareasPage() {
    const isMobile = useIsMobile();

    // Rango temporal: 'week' | 'month' | 'year' | 'custom'
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'custom'>('week');
    const [referenceDate, setReferenceDate] = useState<Date>(new Date());
    const [customFrom, setCustomFrom] = useState<string>('');
    const [customTo, setCustomTo] = useState<string>('');

    // Filtros
    const [sectorFilter, setSectorFilter] = useState<'ALL' | 'HILADO' | 'PACKAGING'>('ALL');
    const [depositoId, setDepositoId] = useState<string>('');
    const [employeeFilter, setEmployeeFilter] = useState<string>('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('ACTIVE'); // 'ACTIVE' (PENDING+IN_PROGRESS), 'ALL', 'COMPLETED'
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Modales
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [taskToComplete, setTaskToComplete] = useState<TaskItem | null>(null);
    const [completeNotes, setCompleteNotes] = useState('');
    const [completeActualTime, setCompleteActualTime] = useState(30);

    // Formulario de nueva tarea programada
    const [newForm, setNewForm] = useState({
        title: '',
        type: 'CUSTOMER_ORDER',
        priority: 2, // 1: Urgente, 2: Alta, 3: Normal, 4: Baja
        assignedEmployeeId: '',
        dueDate: new Date().toISOString().split('T')[0],
        depositoId: '',
        customerOrDestination: '',
        description: '',
        tiempoEstimadoMinutos: 45,
    });

    // Calcular fechas desde/hasta según el modo temporal
    const { fromDate, toDate, rangeLabel } = useMemo(() => {
        if (timeRange === 'custom') {
            return {
                fromDate: customFrom || undefined,
                toDate: customTo || undefined,
                rangeLabel: customFrom && customTo ? `${customFrom} al ${customTo}` : 'Rango Personalizado',
            };
        }

        const ref = new Date(referenceDate);
        if (timeRange === 'week') {
            // Lunes de la semana
            const day = ref.getDay();
            const diff = ref.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(ref.setDate(diff));
            monday.setHours(0, 0, 0, 0);

            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            const f = monday.toISOString().split('T')[0];
            const t = sunday.toISOString().split('T')[0];
            return {
                fromDate: f,
                toDate: t,
                rangeLabel: `Semana del ${monday.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} al ${sunday.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}`,
            };
        }

        if (timeRange === 'month') {
            const y = ref.getFullYear();
            const m = ref.getMonth();
            const first = new Date(y, m, 1);
            const last = new Date(y, m + 1, 0);
            return {
                fromDate: first.toISOString().split('T')[0],
                toDate: last.toISOString().split('T')[0],
                rangeLabel: ref.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
            };
        }

        // year
        const y = ref.getFullYear();
        const first = new Date(y, 0, 1);
        const last = new Date(y, 11, 31);
        return {
            fromDate: first.toISOString().split('T')[0],
            toDate: last.toISOString().split('T')[0],
            rangeLabel: `Año ${y}`,
        };
    }, [timeRange, referenceDate, customFrom, customTo]);

    // Consultas
    const { data: rawTasks = [], isLoading: loadingTasks, refetch } = useGetTasksQuery({
        depositoId: depositoId || undefined,
        from: fromDate,
        to: toDate,
        q: searchQuery.trim() || undefined,
    });

    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => rawDepots.filter((d: any) => d.activo !== false), [rawDepots]);

    const { data: employees = [] } = useGetEmployeesQuery({ active: true });
    const warehouseEmployees = useMemo(() => {
        return employees.filter((e: any) => {
            const sec = (e.primarySectorCode || '').toUpperCase();
            const sub = (e.subSector || '').toUpperCase();
            return sec.includes('DEPOSITO') || sub.includes('HILADO') || sub.includes('PACKAGING') || e.depositoId;
        });
    }, [employees]);

    // Mutaciones
    const [updateTask] = useUpdateTaskMutation();
    const [createTask, { isLoading: creatingTask }] = useCreateTaskMutation();
    const [startTask] = useStartTaskMutation();
    const [completeTask] = useCompleteTaskMutation();
    const [cancelTask] = useCancelTaskMutation();

    // Navegar en el tiempo (semana anterior / siguiente)
    const handleShiftTime = (delta: number) => {
        const next = new Date(referenceDate);
        if (timeRange === 'week') next.setDate(next.getDate() + delta * 7);
        else if (timeRange === 'month') next.setMonth(next.getMonth() + delta);
        else if (timeRange === 'year') next.setFullYear(next.getFullYear() + delta);
        setReferenceDate(next);
    };

    // Filtrar tareas operativas en memoria
    const filteredTasks = useMemo(() => {
        return rawTasks.filter((t) => {
            // Sector filter
            if (sectorFilter !== 'ALL') {
                const sub = (t.assignedEmployee?.legajo === '2' ? 'PACKAGING' : 'HILADO');
                const titleLower = (t.title || '').toLowerCase();
                const depName = (t.deposito?.nombre || '').toLowerCase();

                if (sectorFilter === 'HILADO') {
                    const isHilado = sub === 'HILADO' || depName.includes('hilado') || titleLower.includes('hilado');
                    if (!isHilado) return false;
                } else if (sectorFilter === 'PACKAGING') {
                    const isPackaging = sub === 'PACKAGING' || depName.includes('packaging') || depName.includes('insumo') || titleLower.includes('caja') || titleLower.includes('packaging');
                    if (!isPackaging) return false;
                }
            }

            // Employee filter
            if (employeeFilter === 'UNASSIGNED' && t.assignedEmployeeId) return false;
            if (employeeFilter && employeeFilter !== 'UNASSIGNED' && t.assignedEmployeeId !== employeeFilter) return false;

            // Priority filter
            if (priorityFilter && String(t.priority) !== priorityFilter) return false;

            // Status filter
            if (statusFilter === 'ACTIVE' && (t.status === 'COMPLETED' || t.status === 'CANCELLED')) return false;
            if (statusFilter === 'COMPLETED' && t.status !== 'COMPLETED') return false;

            return true;
        });
    }, [rawTasks, sectorFilter, employeeFilter, priorityFilter, statusFilter]);

    // Ordenar tareas por prioridad (1 Urgente -> 2 Alta -> 3 Normal -> 4 Baja) y luego por dueDate
    const sortedTasks = useMemo(() => {
        return [...filteredTasks].sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [filteredTasks]);

    // Métricas de Carga de Trabajo (Workload Balance)
    const workload = useMemo(() => {
        const map: Record<string, { count: number; minutes: number }> = {
            UNASSIGNED: { count: 0, minutes: 0 },
        };

        for (const emp of warehouseEmployees) {
            map[emp.id] = { count: 0, minutes: 0 };
        }

        for (const t of rawTasks) {
            if (t.status === 'COMPLETED' || t.status === 'CANCELLED') continue;
            const empId = t.assignedEmployeeId || 'UNASSIGNED';
            if (!map[empId]) map[empId] = { count: 0, minutes: 0 };
            map[empId].count += 1;
            map[empId].minutes += t.tiempoEstimadoMinutos || 30;
        }

        return map;
    }, [rawTasks, warehouseEmployees]);

    // Cambiar prioridad de tarea en vivo
    const handlePriorityChange = async (task: TaskItem, newPriority: number) => {
        try {
            await updateTask({ id: task.id, priority: newPriority }).unwrap();
        } catch (err: any) {
            alert(err?.data?.message || 'Error al actualizar prioridad');
        }
    };

    // Cambiar responsable de tarea en vivo
    const handleAssigneeChange = async (task: TaskItem, newEmployeeId: string) => {
        try {
            await updateTask({ id: task.id, assignedEmployeeId: newEmployeeId || null }).unwrap();
        } catch (err: any) {
            alert(err?.data?.message || 'Error al reasignar responsable');
        }
    };

    // Reprogramar fecha límite
    const handleDueDateChange = async (task: TaskItem, newDate: string) => {
        try {
            await updateTask({ id: task.id, dueDate: newDate || null }).unwrap();
        } catch (err: any) {
            alert(err?.data?.message || 'Error al reprogramar fecha');
        }
    };

    // Subir / Bajar prioridad rápida
    const handleMovePriority = async (task: TaskItem, direction: 'UP' | 'DOWN') => {
        const cur = task.priority || 2;
        const next = direction === 'UP' ? Math.max(1, cur - 1) : Math.min(4, cur + 1);
        if (next !== cur) {
            await handlePriorityChange(task, next);
        }
    };

    // Crear nueva tarea programada
    const handleCreateTask = async () => {
        if (!newForm.title.trim()) {
            alert('El título de la tarea es obligatorio.');
            return;
        }
        try {
            await createTask({
                title: newForm.title.trim(),
                type: newForm.type,
                priority: Number(newForm.priority) || 2,
                assignedEmployeeId: newForm.assignedEmployeeId || null,
                dueDate: newForm.dueDate || null,
                depositoId: newForm.depositoId || (depots[0]?.id || null),
                customerOrDestination: newForm.customerOrDestination.trim() || null,
                description: newForm.description.trim() || null,
                tiempoEstimadoMinutos: Number(newForm.tiempoEstimadoMinutos) || 45,
            }).unwrap();

            setShowCreateModal(false);
            setNewForm({
                title: '',
                type: 'CUSTOMER_ORDER',
                priority: 2,
                assignedEmployeeId: '',
                dueDate: new Date().toISOString().split('T')[0],
                depositoId: '',
                customerOrDestination: '',
                description: '',
                tiempoEstimadoMinutos: 45,
            });
        } catch (err: any) {
            alert(err?.data?.message || 'Error al crear la tarea programada');
        }
    };

    // Finalizar tarea
    const handleConfirmComplete = async () => {
        if (!taskToComplete) return;
        try {
            await completeTask({
                id: taskToComplete.id,
                tiempoRealMinutos: Number(completeActualTime) || 30,
                resultNotes: completeNotes.trim() || 'Completada según programación',
                resultStatus: 'CONFORME',
            }).unwrap();
            setTaskToComplete(null);
            setCompleteNotes('');
        } catch (err: any) {
            alert(err?.data?.message || 'Error al completar tarea');
        }
    };

    const getPriorityLabel = (p: number) => {
        if (p === 1) return { label: '🔴 1 - Urgente', color: '#ef4444' };
        if (p === 2) return { label: '🟠 2 - Alta', color: '#f97316' };
        if (p === 3) return { label: '🟡 3 - Normal', color: '#eab308' };
        return { label: '🟢 4 - Baja', color: '#10b981' };
    };

    return (
        <div style={{ padding: '24px', background: 'var(--bg-primary, #0f1117)', minHeight: '100vh', boxSizing: 'border-box' }}>
            {/* Header */}
            <PageHeader
                title="Programación & Planificación de Tareas"
                subtitle="Consola del supervisor para planificar el cronograma semanal/mensual, reordenar prioridades, reasignar operarios y verificar posiciones predilectas"
            >
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Btn variant="secondary" onClick={() => refetch()}>
                        🔄 Actualizar
                    </Btn>
                    <Btn onClick={() => setShowCreateModal(true)}>
                        ➕ Nueva Tarea Programada
                    </Btn>
                </div>
            </PageHeader>

            {/* BARRA DE NAVEGACIÓN TEMPORAL */}
            <Card style={{ padding: '16px 20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-subtle, #9ca3af)', textTransform: 'uppercase', marginRight: '6px' }}>
                            Vista:
                        </span>
                        {(['week', 'month', 'year', 'custom'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setTimeRange(mode)}
                                style={{
                                    background: timeRange === mode ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                    color: timeRange === mode ? '#fff' : 'var(--text-subtle, #9ca3af)',
                                    border: `1px solid ${timeRange === mode ? '#818cf8' : 'rgba(255,255,255,0.1)'}`,
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                }}
                            >
                                {mode === 'week' ? '📅 Esta Semana' : mode === 'month' ? '📆 Este Mes' : mode === 'year' ? '🗓️ Este Año' : '🔍 Rango Libre'}
                            </button>
                        ))}
                    </div>

                    {timeRange !== 'custom' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                                onClick={() => handleShiftTime(-1)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                }}
                            >
                                ◀ Anterior
                            </button>
                            <span style={{ fontWeight: 800, fontSize: '15px', color: '#fff' }}>
                                {rangeLabel}
                            </span>
                            <button
                                onClick={() => handleShiftTime(1)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                }}
                            >
                                Siguiente ▶
                            </button>
                            <button
                                onClick={() => setReferenceDate(new Date())}
                                style={{ background: 'transparent', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
                            >
                                Hoy
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="date"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                style={{ background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-color, #2a2d3e)', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '12px' }}
                            />
                            <span style={{ color: 'var(--text-subtle, #9ca3af)' }}>al</span>
                            <input
                                type="date"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                style={{ background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-color, #2a2d3e)', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '12px' }}
                            />
                        </div>
                    )}
                </div>
            </Card>

            {/* BALANCE DE CARGA DE TRABAJO (WORKLOAD POR OPERARIO) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
                marginBottom: '20px',
            }}>
                {warehouseEmployees.map((emp: any) => {
                    const stats = workload[emp.id] || { count: 0, minutes: 0 };
                    const hours = Math.round((stats.minutes / 60) * 10) / 10;
                    const isSelected = employeeFilter === emp.id;

                    return (
                        <Card
                            key={emp.id}
                            onClick={() => setEmployeeFilter(isSelected ? '' : emp.id)}
                            style={{
                                padding: '16px',
                                cursor: 'pointer',
                                borderLeft: `4px solid ${emp.subSector === 'PACKAGING' ? '#ec4899' : '#6366f1'}`,
                                background: isSelected ? 'rgba(99,102,241,0.1)' : undefined,
                                borderColor: isSelected ? '#818cf8' : undefined,
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontWeight: 800, color: '#fff', fontSize: '14px' }}>
                                    {emp.fullName}
                                </span>
                                <Badge color={emp.subSector === 'PACKAGING' ? '#ec4899' : '#6366f1'}>
                                    {emp.subSector === 'PACKAGING' ? '📦 Packaging' : '🧵 Hilado'}
                                </Badge>
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: stats.count > 0 ? '#fff' : 'var(--text-subtle, #6b7280)' }}>
                                {stats.count} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-subtle, #9ca3af)' }}>tareas pendientes</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#a5b4fc', marginTop: '4px' }}>
                                ⏱️ {hours} hs de trabajo planificadas
                            </div>
                        </Card>
                    );
                })}

                {/* Tarjeta de tareas sin asignar */}
                <Card
                    onClick={() => setEmployeeFilter(employeeFilter === 'UNASSIGNED' ? '' : 'UNASSIGNED')}
                    style={{
                        padding: '16px',
                        cursor: 'pointer',
                        borderLeft: '4px solid #f59e0b',
                        background: employeeFilter === 'UNASSIGNED' ? 'rgba(245,158,11,0.1)' : undefined,
                        borderColor: employeeFilter === 'UNASSIGNED' ? '#f59e0b' : undefined,
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, color: '#fbbf24', fontSize: '14px' }}>
                            ⚠️ Sin Asignar
                        </span>
                        <Badge color="#f59e0b">Por Programar</Badge>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: (workload.UNASSIGNED?.count || 0) > 0 ? '#f59e0b' : 'var(--text-subtle, #6b7280)' }}>
                        {workload.UNASSIGNED?.count || 0} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-subtle, #9ca3af)' }}>tareas sin responsable</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dimmed, #6b7280)', marginTop: '4px' }}>
                        Requieren asignación de operario
                    </div>
                </Card>
            </div>

            {/* BARRA DE FILTROS Y BÚSQUEDA */}
            <Card style={{ padding: '14px 18px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                        {/* Sector Depósito */}
                        <div>
                            <select
                                value={sectorFilter}
                                onChange={(e) => setSectorFilter(e.target.value as any)}
                                style={{ background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-color, #2a2d3e)', color: '#fff', padding: '7px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}
                            >
                                <option value="ALL">🏢 Todos los Sectores</option>
                                <option value="HILADO">🧵 Depósito Hilado</option>
                                <option value="PACKAGING">📦 Packaging / Insumos</option>
                            </select>
                        </div>

                        {/* Depósito Físico */}
                        <div>
                            <select
                                value={depositoId}
                                onChange={(e) => setDepositoId(e.target.value)}
                                style={{ background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-color, #2a2d3e)', color: '#fff', padding: '7px 12px', borderRadius: '8px', fontSize: '13px' }}
                            >
                                <option value="">Todos los depósitos</option>
                                {depots.map((d: any) => (
                                    <option key={d.id} value={d.id}>
                                        {d.nombre} ({d.planta || 'Planta'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Prioridad */}
                        <div>
                            <select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                                style={{ background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-color, #2a2d3e)', color: '#fff', padding: '7px 12px', borderRadius: '8px', fontSize: '13px' }}
                            >
                                <option value="">Todas las prioridades</option>
                                <option value="1">🔴 1 - Urgente</option>
                                <option value="2">🟠 2 - Alta</option>
                                <option value="3">🟡 3 - Normal</option>
                                <option value="4">🟢 4 - Baja</option>
                            </select>
                        </div>

                        {/* Estado */}
                        <div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                style={{ background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-color, #2a2d3e)', color: '#fff', padding: '7px 12px', borderRadius: '8px', fontSize: '13px' }}
                            >
                                <option value="ACTIVE">⏳ Pendientes y En Curso</option>
                                <option value="COMPLETED">✓ Completadas</option>
                                <option value="ALL">Todas las tareas</option>
                            </select>
                        </div>

                        {/* Filtro por Colaborador */}
                        <div>
                            <select
                                value={employeeFilter}
                                onChange={(e) => setEmployeeFilter(e.target.value)}
                                style={{ background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-color, #2a2d3e)', color: '#fff', padding: '7px 12px', borderRadius: '8px', fontSize: '13px' }}
                            >
                                <option value="">Todos los colaboradores</option>
                                <option value="UNASSIGNED">⚠️ Solo Sin Asignar</option>
                                {warehouseEmployees.map((emp: any) => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.fullName} (#{emp.legajo})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ flex: isMobile ? '1 1 100%' : 'none' }}>
                        <input
                            type="text"
                            placeholder="Buscar tarea, cliente o material..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-color, #2a2d3e)', color: '#fff', padding: '7px 12px', borderRadius: '8px', fontSize: '13px', minWidth: '220px' }}
                        />
                    </div>
                </div>
            </Card>

            {/* MESA DE PLANIFICACIÓN & PROGRAMACIÓN DE TAREAS */}
            <Card style={{ padding: '20px', overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                        <h4 style={{ margin: 0, color: 'var(--text-primary, #f3f4f6)' }}>
                            Tareas Programadas ({sortedTasks.length})
                        </h4>
                        <div style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', marginTop: '2px' }}>
                            Ordenadas por nivel de prioridad y fecha de vencimiento. Modifica prioridades, fechas o responsables directamente desde cada fila.
                        </div>
                    </div>
                </div>

                {loadingTasks ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                        <Spinner />
                    </div>
                ) : sortedTasks.length === 0 ? (
                    <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-subtle, #9ca3af)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '10px' }}>📋</div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>No hay tareas programadas para este período</div>
                        <div style={{ fontSize: '13px', marginTop: '4px', marginBottom: '16px' }}>Puedes crear un nuevo pedido a cliente, control o tarea extraordinaria.</div>
                        <Btn onClick={() => setShowCreateModal(true)}>
                            + Crear Tarea Programada
                        </Btn>
                    </div>
                ) : (
                    <Table
                        cols={[
                            'Prioridad & Orden',
                            'Tarea / Destino',
                            'Tipo',
                            'Posición & Material Predilecto',
                            'Responsable Asignado',
                            'Fecha Límite',
                            'Tiempo Est.',
                            'Estado & Acciones',
                        ]}
                        rows={sortedTasks.map((t) => {
                            const pInfo = getPriorityLabel(t.priority || 2);
                            const now = new Date();
                            const isOverdue = t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.dueDate && new Date(t.dueDate) < now;

                            // Posición y material predilecto
                            const pos = t.targetPosition || t.sourcePosition;
                            const preferredCategory = pos?.categoriaPrincipal || pos?.categoriaSecundaria;

                            return [
                                (
                                    <div key="prio" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <select
                                            value={t.priority || 2}
                                            onChange={(e) => handlePriorityChange(t, Number(e.target.value))}
                                            style={{
                                                background: 'var(--bg-primary, #0f1117)',
                                                border: `1px solid ${pInfo.color}`,
                                                color: pInfo.color,
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <option value="1">🔴 1 - Urgente</option>
                                            <option value="2">🟠 2 - Alta</option>
                                            <option value="3">🟡 3 - Normal</option>
                                            <option value="4">🟢 4 - Baja</option>
                                        </select>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <button
                                                onClick={() => handleMovePriority(t, 'UP')}
                                                title="Subir prioridad"
                                                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '10px', padding: 0 }}
                                            >
                                                ▲
                                            </button>
                                            <button
                                                onClick={() => handleMovePriority(t, 'DOWN')}
                                                title="Bajar prioridad"
                                                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '10px', padding: 0 }}
                                            >
                                                ▼
                                            </button>
                                        </div>
                                    </div>
                                ),
                                (
                                    <div key="title">
                                        <div style={{ fontWeight: 700, color: '#fff' }}>{t.title}</div>
                                        {t.customerOrDestination && (
                                            <div style={{ fontSize: '11px', color: '#818cf8', marginTop: '2px' }}>
                                                Cliente/Destino: <strong>{t.customerOrDestination}</strong>
                                            </div>
                                        )}
                                        {t.description && (
                                            <div style={{ fontSize: '11px', color: 'var(--text-subtle, #6b7280)', marginTop: '2px' }}>
                                                {t.description}
                                            </div>
                                        )}
                                    </div>
                                ),
                                (
                                    <Badge key="type" color={t.type === 'CUSTOMER_ORDER' ? '#3b82f6' : t.type === 'INVENTORY_CONTROL' ? '#8b5cf6' : '#ec4899'}>
                                        {t.type === 'CUSTOMER_ORDER' ? '🚚 Pedido' : t.type === 'INVENTORY_CONTROL' ? '🔍 Control' : '⚡ Extra'}
                                    </Badge>
                                ),
                                (
                                    <div key="pos">
                                        {pos ? (
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#34d399', fontSize: '12px' }}>
                                                    📍 {pos.codigo}
                                                </div>
                                                {preferredCategory ? (
                                                    <div style={{ fontSize: '10px', color: 'var(--text-subtle, #9ca3af)' }}>
                                                        🏷️ Predilecto: <span style={{ color: '#fbbf24', fontWeight: 600 }}>{preferredCategory}</span>
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '10px', color: 'var(--text-dimmed, #6b7280)' }}>
                                                        Posición general
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '11px', color: 'var(--text-subtle, #6b7280)' }}>
                                                — Sin posición fija
                                            </span>
                                        )}
                                    </div>
                                ),
                                (
                                    <div key="assignee">
                                        <select
                                            value={t.assignedEmployeeId || ''}
                                            onChange={(e) => handleAssigneeChange(t, e.target.value)}
                                            style={{
                                                background: 'var(--bg-primary, #0f1117)',
                                                border: `1px solid ${t.assignedEmployeeId ? '#6366f1' : '#f59e0b'}`,
                                                color: t.assignedEmployeeId ? '#fff' : '#f59e0b',
                                                padding: '5px 8px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                            }}
                                        >
                                            <option value="">⚠️ Sin asignar</option>
                                            {warehouseEmployees.map((emp: any) => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.fullName} (#{emp.legajo}) • {emp.subSector === 'PACKAGING' ? '📦 Pack' : '🧵 Hilado'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ),
                                (
                                    <div key="due">
                                        <input
                                            type="date"
                                            value={t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : ''}
                                            onChange={(e) => handleDueDateChange(t, e.target.value)}
                                            style={{
                                                background: 'var(--bg-primary, #0f1117)',
                                                border: `1px solid ${isOverdue ? '#ef4444' : 'var(--border-color, #2a2d3e)'}`,
                                                color: isOverdue ? '#f87171' : '#fff',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: isOverdue ? 700 : 500,
                                            }}
                                        />
                                        {isOverdue && (
                                            <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, marginTop: '2px' }}>
                                                ⚠️ Vencida
                                            </div>
                                        )}
                                    </div>
                                ),
                                (
                                    <span key="time" style={{ color: 'var(--text-subtle, #9ca3af)', fontSize: '12px' }}>
                                        {t.tiempoEstimadoMinutos} min
                                    </span>
                                ),
                                (
                                    <div key="act" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        {t.status === 'PENDING' && (
                                            <button
                                                onClick={() => startTask({ id: t.id })}
                                                style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                ▶️ Iniciar
                                            </button>
                                        )}
                                        {t.status === 'IN_PROGRESS' && (
                                            <button
                                                onClick={() => { setTaskToComplete(t); setCompleteActualTime(t.tiempoEstimadoMinutos || 30); }}
                                                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                ✓ Finalizar
                                            </button>
                                        )}
                                        {t.status === 'COMPLETED' && (
                                            <Badge color="#10b981">✓ Listo</Badge>
                                        )}
                                        {t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('¿Deseas cancelar esta tarea programada?')) {
                                                        cancelTask({ id: t.id, reason: 'Cancelada por supervisor' });
                                                    }
                                                }}
                                                style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '11px' }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ),
                            ];
                        })}
                    />
                )}
            </Card>

            {/* MODAL: NUEVA TAREA PROGRAMADA */}
            {showCreateModal && (
                <Modal title="➕ Programar Nueva Tarea de Depósito" onClose={() => setShowCreateModal(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '520px', width: '100%' }}>
                        <Input
                            label="Título de la Tarea *"
                            placeholder="Ej: Armado Hilado Catamarca, Control Goma Pasillo 2..."
                            value={newForm.title}
                            onChange={(v) => setNewForm({ ...newForm, title: v })}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    Tipo de Tarea:
                                </label>
                                <select
                                    value={newForm.type}
                                    onChange={(e) => setNewForm({ ...newForm, type: e.target.value })}
                                    style={{ width: '100%', background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-color, #2a2d3e)', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '13px' }}
                                >
                                    <option value="CUSTOMER_ORDER">🚚 Pedido para Cliente / Planta</option>
                                    <option value="INVENTORY_CONTROL">🔍 Control de Inventario</option>
                                    <option value="EXTRAORDINARY">⚡ Tarea Extraordinaria</option>
                                    <option value="PUTAWAY">📥 Movimiento / Acomodo</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    Prioridad:
                                </label>
                                <select
                                    value={newForm.priority}
                                    onChange={(e) => setNewForm({ ...newForm, priority: Number(e.target.value) })}
                                    style={{ width: '100%', background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-color, #2a2d3e)', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}
                                >
                                    <option value="1">🔴 1 - Urgente</option>
                                    <option value="2">🟠 2 - Alta</option>
                                    <option value="3">🟡 3 - Normal</option>
                                    <option value="4">🟢 4 - Baja</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    Responsable Asignado:
                                </label>
                                <select
                                    value={newForm.assignedEmployeeId}
                                    onChange={(e) => setNewForm({ ...newForm, assignedEmployeeId: e.target.value })}
                                    style={{ width: '100%', background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-color, #2a2d3e)', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '13px' }}
                                >
                                    <option value="">⚠️ Sin asignar (Dejar en cola)</option>
                                    {warehouseEmployees.map((emp: any) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.fullName} (#{emp.legajo}) • {emp.subSector === 'PACKAGING' ? '📦 Pack' : '🧵 Hilado'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    Fecha Programada / Límite:
                                </label>
                                <input
                                    type="date"
                                    value={newForm.dueDate}
                                    onChange={(e) => setNewForm({ ...newForm, dueDate: e.target.value })}
                                    style={{ width: '100%', background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-color, #2a2d3e)', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        {newForm.type === 'CUSTOMER_ORDER' && (
                            <Input
                                label="Cliente o Destino (ej: Catamarca, José, San Martín...)"
                                placeholder="Nombre de planta o cliente..."
                                value={newForm.customerOrDestination}
                                onChange={(v) => setNewForm({ ...newForm, customerOrDestination: v })}
                            />
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    Depósito Físico:
                                </label>
                                <select
                                    value={newForm.depositoId}
                                    onChange={(e) => setNewForm({ ...newForm, depositoId: e.target.value })}
                                    style={{ width: '100%', background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-color, #2a2d3e)', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '13px' }}
                                >
                                    <option value="">Depósito General</option>
                                    {depots.map((d: any) => (
                                        <option key={d.id} value={d.id}>
                                            {d.nombre} ({d.planta || 'Planta'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <Input
                                label="Tiempo Estándar Estimado (min)"
                                value={String(newForm.tiempoEstimadoMinutos)}
                                onChange={(v) => setNewForm({ ...newForm, tiempoEstimadoMinutos: Number(v) || 30 })}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                Instrucciones / Detalle para el Operario:
                            </label>
                            <textarea
                                rows={2}
                                value={newForm.description}
                                onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                                placeholder="Indicar observaciones, posiciones o especificaciones..."
                                style={{ width: '100%', background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-color, #2a2d3e)', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '13px', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                            <Btn variant="secondary" onClick={() => setShowCreateModal(false)}>
                                Cancelar
                            </Btn>
                            <Btn onClick={handleCreateTask} disabled={creatingTask}>
                                {creatingTask ? 'Guardando...' : 'Programar Tarea'}
                            </Btn>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL: FINALIZAR TAREA */}
            {taskToComplete && (
                <Modal title="Confirmar Tarea Realizada" onClose={() => setTaskToComplete(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '440px', width: '100%' }}>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>
                            {taskToComplete.title}
                        </div>
                        <Input
                            label="Tiempo Real Trabajado (minutos)"
                            value={String(completeActualTime)}
                            onChange={(v) => setCompleteActualTime(Number(v) || 30)}
                        />
                        <Input
                            label="Notas u Observaciones del Cierre"
                            value={completeNotes}
                            onChange={(v) => setCompleteNotes(v)}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                            <Btn variant="secondary" onClick={() => setTaskToComplete(null)}>
                                Cancelar
                            </Btn>
                            <Btn onClick={handleConfirmComplete} style={{ background: '#10b981' }}>
                                Guardar y Cerrar
                            </Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}