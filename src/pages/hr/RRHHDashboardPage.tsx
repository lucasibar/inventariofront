import { useState, useMemo } from 'react';
import {
    useGetEmployeesQuery,
    useGetEmployeeMetricsQuery,
    useGetEmployeeProductivityQuery,
    useCreateEmployeeMutation,
    useUpdateEmployeeMutation,
    useToggleEmployeeActiveMutation,
    useDeleteEmployeeMutation,
    type Employee,
    type OperatorProductivity,
} from '../../features/hr/api/hr.api';
import { PageHeader, Card, Table, Btn, Modal, Input, Badge } from '../../shared/ui';
import { ALL_SECTORS, HR_SECTORS_LIST } from '../../shared/types/roles';
import { ProductividadDepositoTab } from './components/ProductividadDepositoTab';

export default function RRHHDashboardPage() {
    // Current active tab: 'directorio' | 'productividad' | 'deposito'
    const [activeTab, setActiveTab] = useState<'directorio' | 'productividad' | 'deposito'>('directorio');

    // --- Tab 1: Directorio State ---
    const [searchTerm, setSearchTerm] = useState('');
    const [sectorFilter, setSectorFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'true' | 'false'>('all');

    // Fetch metrics & employees
    const { data: metrics } = useGetEmployeeMetricsQuery();
    const { data: employees = [], isLoading: loadingEmployees } = useGetEmployeesQuery({
        q: searchTerm.trim() || undefined,
        active: statusFilter === 'all' ? undefined : statusFilter === 'true',
        sector: sectorFilter || undefined,
    });

    // Mutations
    const [createEmployee, { isLoading: creatingEmployee }] = useCreateEmployeeMutation();
    const [updateEmployee, { isLoading: updatingEmployee }] = useUpdateEmployeeMutation();
    const [toggleActive] = useToggleEmployeeActiveMutation();
    const [deleteEmployee] = useDeleteEmployeeMutation();

    // Modals
    const [showNewModal, setShowNewModal] = useState(false);
    const [newForm, setNewForm] = useState({
        legajo: '',
        fullName: '',
        sectorKey: 'DEPOSITO_HILADO',
        active: true,
    });

    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [editForm, setEditForm] = useState({
        legajo: '',
        fullName: '',
        sectorKey: 'DEPOSITO_HILADO',
        active: true,
    });

    // --- Tab 2: Productividad State ---
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [shiftFilter, setShiftFilter] = useState('');
    const [prodSearch, setProdSearch] = useState('');
    const [selectedOperario, setSelectedOperario] = useState<OperatorProductivity | null>(null);

    const { data: prodData, isLoading: loadingProductivity } = useGetEmployeeProductivityQuery({
        from: dateFrom || undefined,
        to: dateTo || undefined,
        shift: shiftFilter || undefined,
        legajo: prodSearch.trim() || undefined,
    });

    // Sector mapping helper
    const getSectorLabel = (code: string | null, subSector?: string | null) => {
        if (!code) return { label: 'Sin Asignar', icon: '❓', color: '#6b7280' };
        const c = code.toUpperCase();
        const sub = (subSector || '').toUpperCase();

        if (c === 'DEPOSITO' || c === 'DEPOSITO_HILADO' || c === 'DEPOSITO_PACKAGING') {
            if (sub === 'HILADO' || c === 'DEPOSITO_HILADO') {
                return { label: 'Depósito - Hilado', icon: '🧵', color: '#6366f1' };
            }
            if (sub === 'PACKAGING' || c === 'DEPOSITO_PACKAGING') {
                return { label: 'Depósito - Packaging e Insumos', icon: '📦', color: '#ec4899' };
            }
            return { label: 'Depósito General', icon: '🏭', color: '#6366f1' };
        }
        if (c === '3000' || c === 'PRODUCCION' || c === 'TEJEDURIA') {
            return { label: 'Tejeduría', icon: '⚙️', color: '#f59e0b' };
        }
        const found = HR_SECTORS_LIST.find((s) => s.key === c);
        if (found) return { label: found.label, icon: found.icon, color: '#3b82f6' };
        const foundOld = ALL_SECTORS.find((s) => s.key === c as any);
        if (foundOld) return { label: foundOld.label, icon: foundOld.icon, color: '#3b82f6' };
        return { label: code, icon: '🏢', color: '#6366f1' };
    };

    // Sembrar operarios iniciales (Dilan y Diego)
    const handleSeedDepotEmployees = async () => {
        try {
            await createEmployee({ legajo: '1', fullName: 'Dilan', primarySectorCode: 'DEPOSITO', subSector: 'HILADO', active: true }).unwrap();
            await createEmployee({ legajo: '2', fullName: 'Diego', primarySectorCode: 'DEPOSITO', subSector: 'PACKAGING', active: true }).unwrap();
            alert('¡Operarios Dilan (Depósito Hilado) y Diego (Depósito Packaging) agregados con éxito!');
        } catch (err: any) {
            alert(err?.data?.message || 'Error al crear operarios iniciales');
        }
    };

    // Handlers
    const handleCreate = async () => {
        if (!newForm.legajo.trim()) {
            alert('El número de legajo es obligatorio.');
            return;
        }
        const secOption = HR_SECTORS_LIST.find((s) => s.key === newForm.sectorKey);
        try {
            await createEmployee({
                legajo: newForm.legajo.trim(),
                fullName: newForm.fullName.trim() || undefined,
                primarySectorCode: secOption?.category || newForm.sectorKey,
                subSector: secOption?.subSector || undefined,
                active: newForm.active,
            }).unwrap();
            setShowNewModal(false);
            setNewForm({ legajo: '', fullName: '', sectorKey: 'DEPOSITO_HILADO', active: true });
        } catch (err: any) {
            alert(err?.data?.message || 'Error al crear el empleado');
        }
    };

    const openEdit = (emp: Employee) => {
        setEditingEmployee(emp);
        let currentSectorKey = emp.primarySectorCode || 'TEJEDURIA';
        if (emp.primarySectorCode === 'DEPOSITO') {
            currentSectorKey = emp.subSector === 'PACKAGING' ? 'DEPOSITO_PACKAGING' : 'DEPOSITO_HILADO';
        } else if (emp.primarySectorCode === '3000' || emp.primarySectorCode === 'PRODUCCION') {
            currentSectorKey = 'TEJEDURIA';
        }
        setEditForm({
            legajo: emp.legajo,
            fullName: emp.fullName || '',
            sectorKey: currentSectorKey,
            active: emp.active,
        });
    };

    const handleUpdate = async () => {
        if (!editingEmployee) return;
        if (!editForm.legajo.trim()) {
            alert('El número de legajo es obligatorio.');
            return;
        }
        const secOption = HR_SECTORS_LIST.find((s) => s.key === editForm.sectorKey);
        try {
            await updateEmployee({
                id: editingEmployee.id,
                data: {
                    legajo: editForm.legajo.trim(),
                    fullName: editForm.fullName.trim() || undefined,
                    primarySectorCode: secOption?.category || editForm.sectorKey,
                    subSector: secOption?.subSector || (null as any),
                    active: editForm.active,
                },
            }).unwrap();
            setEditingEmployee(null);
        } catch (err: any) {
            alert(err?.data?.message || 'Error al actualizar el empleado');
        }
    };

    const handleToggle = async (emp: Employee) => {
        const action = emp.active ? 'dar de baja' : 'reactivar';
        if (!window.confirm(`¿Seguro que deseas ${action} al colaborador legajo ${emp.legajo}?`)) return;
        try {
            await toggleActive(emp.id).unwrap();
        } catch (err: any) {
            alert(err?.data?.message || 'Error al cambiar estado');
        }
    };

    const handleDelete = async (emp: Employee) => {
        if (!window.confirm(`¿Estás seguro de eliminar permanentemente a ${emp.fullName || `Legajo ${emp.legajo}`}? Esta acción no se puede deshacer.`)) return;
        try {
            await deleteEmployee(emp.id).unwrap();
        } catch (err: any) {
            alert(err?.data?.message || 'Error al eliminar el empleado');
        }
    };

    // Columns for Directory Table (limpias, sin campos innecesarios)
    const employeeCols = ['Legajo', 'Nombre Completo', 'Sector Asignado', 'Estado', 'Acciones'];

    const employeeRows = useMemo(() => {
        return employees.map((emp) => {
            const sec = getSectorLabel(emp.primarySectorCode, emp.subSector);
            return [
                (
                    <span key="legajo" style={{ 
                        fontFamily: 'monospace', 
                        fontWeight: 700, 
                        background: 'rgba(99,102,241,0.1)', 
                        color: '#818cf8', 
                        padding: '3px 8px', 
                        borderRadius: '6px',
                        border: '1px solid rgba(99,102,241,0.2)'
                    }}>
                        #{emp.legajo}
                    </span>
                ),
                (
                    <div key="name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                            width: 28, height: 28, borderRadius: '50%', 
                            background: emp.active ? '#3b82f6' : '#6b7280', 
                            color: '#fff', fontSize: '11px', fontWeight: 700, 
                            display: 'flex', alignItems: 'center', justifyContent: 'center' 
                        }}>
                            {(emp.fullName || emp.legajo).charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: emp.active ? 'var(--text-primary, #f3f4f6)' : 'var(--text-subtle, #9ca3af)' }}>
                            {emp.fullName || '—'}
                        </span>
                    </div>
                ),
                (
                    <div key="sector" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{sec.icon}</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary, #f3f4f6)', fontWeight: 600 }}>{sec.label}</span>
                    </div>
                ),
                (
                    <Badge key="active" color={emp.active ? '#10b981' : '#ef4444'}>
                        {emp.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                ),
                (
                    <div key="actions" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                            onClick={() => openEdit(emp)}
                            title="Editar colaborador y cambiar sector"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#93c5fd',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600,
                            }}
                        >
                            ✏️ Editar
                        </button>
                        <button
                            onClick={() => handleToggle(emp)}
                            title={emp.active ? 'Dar de baja temporal' : 'Reactivar'}
                            style={{
                                background: emp.active ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                border: `1px solid ${emp.active ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                color: emp.active ? '#f87171' : '#34d399',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600,
                            }}
                        >
                            {emp.active ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                            onClick={() => handleDelete(emp)}
                            title="Eliminar registro"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#6b7280',
                                padding: '4px 6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                            }}
                        >
                            🗑️
                        </button>
                    </div>
                ),
            ];
        });
    }, [employees]);

    // Calculate metrics summary cards
    const totalStaff = metrics?.total ?? employees.length;
    const activeStaff = metrics?.active ?? employees.filter((e) => e.active).length;
    const inactiveStaff = metrics?.inactive ?? (totalStaff - activeStaff);
    const activePct = totalStaff > 0 ? Math.round((activeStaff / totalStaff) * 100) : 0;
    const coveredSectorsCount = metrics?.bySector ? metrics.bySector.length : 0;

    return (
        <div style={{ padding: '24px', background: 'var(--bg-primary, #0f1117)', minHeight: '100vh', boxSizing: 'border-box' }}>
            {/* Header */}
            <PageHeader
                title="Recursos Humanos & Personal"
                subtitle="Gestión del padrón de colaboradores, asignación por sectores y métricas de desempeño productivo"
            >
                {activeTab === 'directorio' ? (
                    <Btn onClick={() => setShowNewModal(true)}>
                        ➕ Nuevo Colaborador
                    </Btn>
                ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Btn variant="secondary" onClick={() => { setDateFrom(''); setDateTo(''); setShiftFilter(''); setProdSearch(''); }}>
                            🔄 Limpiar Filtros
                        </Btn>
                    </div>
                )}
            </PageHeader>

            {/* Navigation Tabs */}
            <div style={{ 
                display: 'flex', 
                gap: '8px', 
                borderBottom: '1px solid var(--border-color, #2a2d3e)', 
                marginBottom: '24px',
                paddingBottom: '8px',
                overflowX: 'auto'
            }}>
                <button
                    onClick={() => setActiveTab('directorio')}
                    style={{
                        padding: '10px 18px',
                        background: activeTab === 'directorio' ? 'rgba(99,102,241,0.15)' : 'transparent',
                        color: activeTab === 'directorio' ? '#818cf8' : 'var(--text-muted, #9ca3af)',
                        border: activeTab === 'directorio' ? '1px solid #6366f1' : '1px solid transparent',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <span>👥</span>
                    <span>Directorio & Dotación ({totalStaff})</span>
                </button>
                <button
                    onClick={() => setActiveTab('productividad')}
                    style={{
                        padding: '10px 18px',
                        background: activeTab === 'productividad' ? 'rgba(99,102,241,0.15)' : 'transparent',
                        color: activeTab === 'productividad' ? '#818cf8' : 'var(--text-muted, #9ca3af)',
                        border: activeTab === 'productividad' ? '1px solid #6366f1' : '1px solid transparent',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <span>⚡</span>
                    <span>Productividad & Calidad (Tejeduría)</span>
                </button>
                <button
                    onClick={() => setActiveTab('deposito')}
                    style={{
                        padding: '10px 18px',
                        background: activeTab === 'deposito' ? 'rgba(99,102,241,0.15)' : 'transparent',
                        color: activeTab === 'deposito' ? '#818cf8' : 'var(--text-muted, #9ca3af)',
                        border: activeTab === 'deposito' ? '1px solid #6366f1' : '1px solid transparent',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <span>🏭</span>
                    <span>Depósito (Utilidad & Tareas)</span>
                </button>
            </div>

            {/* ================= TAB 1: DIRECTORIO Y DOTACIÓN ================= */}
            {activeTab === 'directorio' && (
                <>
                    {/* Top KPI Cards */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                        gap: '16px', 
                        marginBottom: '24px' 
                    }}>
                        <Card style={{ padding: '20px' }}>
                            <div style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                                Dotación Registrada
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary, #f3f4f6)' }}>
                                    {totalStaff}
                                </span>
                                <span style={{ fontSize: '13px', color: 'var(--text-subtle, #9ca3af)' }}>personas</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#10b981', marginTop: '6px' }}>
                                Padrón unificado de la planta
                            </div>
                        </Card>

                        <Card style={{ padding: '20px' }}>
                            <div style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                                Personal Activo
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>
                                    {activeStaff}
                                </span>
                                <span style={{ fontSize: '13px', color: 'var(--text-subtle, #9ca3af)' }}>({activePct}%)</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '6px' }}>
                                Disponibles para asignación
                            </div>
                        </Card>

                        <Card style={{ padding: '20px' }}>
                            <div style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                                Inactivos / Licencias
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '32px', fontWeight: 800, color: inactiveStaff > 0 ? '#f87171' : 'var(--text-muted, #9ca3af)' }}>
                                    {inactiveStaff}
                                </span>
                                <span style={{ fontSize: '13px', color: 'var(--text-subtle, #9ca3af)' }}>bajas</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '6px' }}>
                                Fuera de turnos activos
                            </div>
                        </Card>

                        <Card style={{ padding: '20px' }}>
                            <div style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                                Áreas / Sectores Cubiertos
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '32px', fontWeight: 800, color: '#6366f1' }}>
                                    {coveredSectorsCount}
                                </span>
                                <span style={{ fontSize: '13px', color: 'var(--text-subtle, #9ca3af)' }}>sectores</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '6px' }}>
                                Tejeduría, Depósito, Mantenimiento, etc.
                            </div>
                        </Card>
                    </div>

                    {/* Sector Breakdown Card */}
                    {metrics?.bySector && metrics.bySector.length > 0 && (
                        <Card style={{ padding: '20px', marginBottom: '24px' }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', color: 'var(--text-primary, #f3f4f6)' }}>
                                Distribución de Dotación por Sector
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {metrics.bySector.map((s) => {
                                    const secInfo = getSectorLabel(s.sector);
                                    const pct = totalStaff > 0 ? Math.round((s.count / totalStaff) * 100) : 0;
                                    const isSelected = sectorFilter === s.sector;
                                    return (
                                        <div
                                            key={s.sector}
                                            onClick={() => setSectorFilter(isSelected ? '' : s.sector)}
                                            style={{
                                                background: isSelected ? 'rgba(99,102,241,0.2)' : 'var(--bg-hover-row, rgba(255,255,255,0.03))',
                                                border: isSelected ? '1px solid #6366f1' : '1px solid var(--border-color, rgba(255,255,255,0.06))',
                                                borderRadius: '10px',
                                                padding: '10px 14px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            <span style={{ fontSize: '18px' }}>{secInfo.icon}</span>
                                            <div>
                                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary, #f3f4f6)' }}>
                                                    {secInfo.label}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>
                                                    {s.count} {s.count === 1 ? 'colaborador' : 'colaboradores'} ({pct}%)
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* Filters Toolbar */}
                    <Card style={{ padding: '16px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                            {/* Search */}
                            <div style={{ flex: '1 1 240px', minWidth: '200px' }}>
                                <Input
                                    label="Buscar Colaborador"
                                    placeholder="Nombre o N° de Legajo..."
                                    value={searchTerm}
                                    onChange={(v) => setSearchTerm(v)}
                                />
                            </div>

                            {/* Sector Select */}
                            <div style={{ flex: '1 1 180px' }}>
                                <label style={{ display: 'block', color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                                    Sector
                                </label>
                                <select
                                    value={sectorFilter}
                                    onChange={(e) => setSectorFilter(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: 'var(--text-primary, #f3f4f6)',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        fontSize: '13px',
                                    }}
                                >
                                    <option value="">Todos los sectores</option>
                                    {HR_SECTORS_LIST.map((s) => (
                                        <option key={s.key} value={s.key}>
                                            {s.icon} {s.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Status Select */}
                            <div style={{ flex: '1 1 150px' }}>
                                <label style={{ display: 'block', color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                                    Estado
                                </label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: 'var(--text-primary, #f3f4f6)',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        fontSize: '13px',
                                    }}
                                >
                                    <option value="all">Todos los estados</option>
                                    <option value="true">Solo Activos</option>
                                    <option value="false">Solo Inactivos</option>
                                </select>
                            </div>

                            {/* Clear Filters Button */}
                            {(searchTerm || sectorFilter || statusFilter !== 'all') && (
                                <div style={{ paddingTop: '20px' }}>
                                    <button
                                        onClick={() => { setSearchTerm(''); setSectorFilter(''); setStatusFilter('all'); }}
                                        style={{
                                            background: 'transparent',
                                            border: '1px solid var(--border-color, #2a2d3e)',
                                            color: 'var(--text-muted, #9ca3af)',
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                        }}
                                    >
                                        Limpiar filtros
                                    </button>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Employees Table */}
                    <Card style={{ padding: 0, overflow: 'hidden' }}>
                        <Table
                            loading={loadingEmployees}
                            cols={employeeCols}
                            rows={employeeRows}
                        />
                        {!loadingEmployees && employees.length === 0 && (
                            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-subtle, #6b7280)' }}>
                                <div style={{ fontSize: '36px', marginBottom: '12px' }}>👤</div>
                                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary, #f3f4f6)', marginBottom: '4px' }}>
                                    No se encontraron colaboradores
                                </div>
                                <div style={{ fontSize: '13px', marginBottom: '16px' }}>
                                    {searchTerm || sectorFilter || statusFilter !== 'all'
                                        ? 'Prueba modificando los filtros de búsqueda.'
                                        : 'Aún no hay colaboradores dados de alta en el sistema. Puedes agregar a los operarios de depósito iniciales (Dilan y Diego) con un clic.'}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                    <Btn onClick={handleSeedDepotEmployees} style={{ background: '#10b981' }}>
                                        🌱 Cargar Dilan (Hilado) y Diego (Packaging)
                                    </Btn>
                                    <Btn variant="secondary" onClick={() => setShowNewModal(true)}>
                                        + Cargar Manualmente
                                    </Btn>
                                </div>
                            </div>
                        )}
                    </Card>
                </>
            )}

            {/* ================= TAB 2: PRODUCTIVIDAD Y CALIDAD ================= */}
            {activeTab === 'productividad' && (
                <>
                    {/* Filters Toolbar */}
                    <Card style={{ padding: '16px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                            <div style={{ flex: '1 1 180px' }}>
                                <label style={{ display: 'block', color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                                    Fecha Desde
                                </label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: 'var(--text-primary, #f3f4f6)',
                                        borderRadius: '8px',
                                        padding: '9px',
                                        fontSize: '13px',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            <div style={{ flex: '1 1 180px' }}>
                                <label style={{ display: 'block', color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                                    Fecha Hasta
                                </label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: 'var(--text-primary, #f3f4f6)',
                                        borderRadius: '8px',
                                        padding: '9px',
                                        fontSize: '13px',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            <div style={{ flex: '1 1 150px' }}>
                                <label style={{ display: 'block', color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                                    Turno
                                </label>
                                <select
                                    value={shiftFilter}
                                    onChange={(e) => setShiftFilter(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-primary, #0f1117)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        color: 'var(--text-primary, #f3f4f6)',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        fontSize: '13px',
                                    }}
                                >
                                    <option value="">Todos los turnos</option>
                                    <option value="T1">Turno Mañana (T1)</option>
                                    <option value="T2">Turno Tarde (T2)</option>
                                    <option value="T3">Turno Noche (T3)</option>
                                </select>
                            </div>

                            <div style={{ flex: '1 1 200px' }}>
                                <Input
                                    label="Filtrar por Legajo"
                                    placeholder="N° de Legajo..."
                                    value={prodSearch}
                                    onChange={(v) => setProdSearch(v)}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Productivity Summary KPIs */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                        gap: '16px', 
                        marginBottom: '24px' 
                    }}>
                        <Card style={{ padding: '20px' }}>
                            <div style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                                Pares 1ª Calidad (Total)
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>
                                    {(prodData?.summary?.totalGood ?? 0).toLocaleString()}
                                </span>
                                <span style={{ fontSize: '13px', color: 'var(--text-subtle, #9ca3af)' }}>pares</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#10b981', marginTop: '6px' }}>
                                Producción neta conforme
                            </div>
                        </Card>

                        <Card style={{ padding: '20px' }}>
                            <div style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                                Índice de Calidad
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '32px', fontWeight: 800, color: (prodData?.summary?.overallQualityPct ?? 100) >= 95 ? '#10b981' : '#f59e0b' }}>
                                    {prodData?.summary?.overallQualityPct ?? 100}%
                                </span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '6px' }}>
                                Scrap global: {prodData?.summary?.overallScrapPct ?? 0}%
                            </div>
                        </Card>

                        <Card style={{ padding: '20px' }}>
                            <div style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                                2ª Calidad & Descarte
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '32px', fontWeight: 800, color: '#f87171' }}>
                                    {(prodData?.summary?.totalSecond ?? 0).toLocaleString()}
                                </span>
                                <span style={{ fontSize: '13px', color: 'var(--text-subtle, #9ca3af)' }}>pares</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '6px' }}>
                                Mecánicos: {(prodData?.summary?.totalMechanical ?? 0).toLocaleString()}
                            </div>
                        </Card>

                        <Card style={{ padding: '20px' }}>
                            <div style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                                Operarios Activos en Registro
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '32px', fontWeight: 800, color: '#6366f1' }}>
                                    {prodData?.summary?.totalOperariosActivos ?? 0}
                                </span>
                                <span style={{ fontSize: '13px', color: 'var(--text-subtle, #9ca3af)' }}>con registros</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '6px' }}>
                                Horas máquina: {prodData?.summary?.totalHours ?? 0} hs
                            </div>
                        </Card>
                    </div>

                    {/* Ranking Table */}
                    <Card style={{ padding: '20px' }}>
                        <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary, #f3f4f6)', marginBottom: '4px' }}>
                            Ranking de Desempeño por Operario (Tejeduría)
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginBottom: '20px' }}>
                            Calculado a partir de los partes de producción real y turnos de máquinas
                        </div>

                        {loadingProductivity ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted, #9ca3af)' }}>
                                Cargando métricas de productividad...
                            </div>
                        ) : (prodData?.ranking?.length ?? 0) === 0 ? (
                            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-subtle, #6b7280)' }}>
                                <div style={{ fontSize: '36px', marginBottom: '12px' }}>📊</div>
                                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary, #f3f4f6)', marginBottom: '4px' }}>
                                    Aún no hay partes de producción asociados a legajos
                                </div>
                                <div style={{ fontSize: '13px', maxWidth: '480px', margin: '0 auto', color: 'var(--text-muted, #9ca3af)' }}>
                                    A medida que los supervisores carguen los registros de turnos de tejeduría en el módulo de Producción con el N° de legajo del operario, aquí se generarán automáticamente los rankings de volumen, horas y calidad.
                                </div>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color, #2a2d3e)', color: 'var(--text-muted, #9ca3af)' }}>
                                            <th style={{ padding: '12px 16px' }}>Pos.</th>
                                            <th style={{ padding: '12px 16px' }}>Operario</th>
                                            <th style={{ padding: '12px 16px' }}>Pares 1ª</th>
                                            <th style={{ padding: '12px 16px' }}>Pares 2ª / Scrap</th>
                                            <th style={{ padding: '12px 16px' }}>% Calidad</th>
                                            <th style={{ padding: '12px 16px' }}>Máquinas</th>
                                            <th style={{ padding: '12px 16px' }}>Horas</th>
                                            <th style={{ padding: '12px 16px' }}>Jornadas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {prodData?.ranking.map((op, idx) => {
                                            const qualityColor = op.qualityPct >= 96 ? '#10b981' : op.qualityPct >= 90 ? '#f59e0b' : '#ef4444';
                                            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                                            return (
                                                <tr
                                                    key={op.legajo + idx}
                                                    onClick={() => setSelectedOperario(op)}
                                                    style={{
                                                        borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.04))',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.15s ease',
                                                    }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover-row, rgba(255,255,255,0.03))')}
                                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                                >
                                                    <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '14px', width: '40px' }}>
                                                        {medal}
                                                    </td>
                                                    <td style={{ padding: '14px 16px' }}>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary, #f3f4f6)' }}>
                                                            {op.fullName}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#818cf8', fontFamily: 'monospace' }}>
                                                            Legajo #{op.legajo}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#10b981' }}>
                                                        {op.totalGood.toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', color: '#f87171' }}>
                                                        {op.totalSecond.toLocaleString()}
                                                        {op.totalMechanical > 0 && (
                                                            <span style={{ fontSize: '11px', color: 'var(--text-subtle, #9ca3af)', marginLeft: '4px' }}>
                                                                ({op.totalMechanical} mec)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', width: '160px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ 
                                                                flex: 1, 
                                                                height: '6px', 
                                                                background: 'rgba(255,255,255,0.08)', 
                                                                borderRadius: '3px',
                                                                overflow: 'hidden' 
                                                            }}>
                                                                <div style={{ 
                                                                    width: `${Math.min(100, Math.max(0, op.qualityPct))}%`, 
                                                                    height: '100%', 
                                                                    background: qualityColor,
                                                                    borderRadius: '3px'
                                                                }} />
                                                            </div>
                                                            <span style={{ fontWeight: 700, color: qualityColor, minWidth: '45px' }}>
                                                                {op.qualityPct}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '14px 16px', color: 'var(--text-primary, #f3f4f6)' }}>
                                                        {op.distinctMachines} máq.
                                                    </td>
                                                    <td style={{ padding: '14px 16px', color: 'var(--text-primary, #f3f4f6)' }}>
                                                        {op.runHours} hs
                                                    </td>
                                                    <td style={{ padding: '14px 16px', color: 'var(--text-subtle, #9ca3af)' }}>
                                                        {op.totalJornadas}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </>
            )}

            {/* ================= TAB 3: RENDIMIENTO & UTILIDAD DEPÓSITO ================= */}
            {activeTab === 'deposito' && <ProductividadDepositoTab />}

            {/* ================= MODAL: CREAR COLABORADOR ================= */}
            {showNewModal && (
                <Modal title="Nuevo Colaborador" onClose={() => setShowNewModal(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                        <Input
                            label="N° de Legajo *"
                            placeholder="Ej: 1, 2, 1045..."
                            value={newForm.legajo}
                            onChange={(v) => setNewForm((p) => ({ ...p, legajo: v }))}
                        />
                        <Input
                            label="Nombre y Apellido"
                            placeholder="Ej: Dilan, Diego, Carlos Gómez..."
                            value={newForm.fullName}
                            onChange={(v) => setNewForm((p) => ({ ...p, fullName: v }))}
                        />
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-muted, #9ca3af)', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                                Sector Asignado *
                            </label>
                            <select
                                value={newForm.sectorKey}
                                onChange={(e) => setNewForm((p) => ({ ...p, sectorKey: e.target.value }))}
                                style={{
                                    width: '100%',
                                    background: 'var(--bg-primary, #0f1117)',
                                    border: '1px solid var(--border-color, #2a2d3e)',
                                    color: 'var(--text-primary, #f3f4f6)',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    fontWeight: 600,
                                }}
                            >
                                {HR_SECTORS_LIST.map((s) => (
                                    <option key={s.key} value={s.key}>
                                        {s.icon} {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                            <input
                                type="checkbox"
                                id="activeCheck"
                                checked={newForm.active}
                                onChange={(e) => setNewForm((p) => ({ ...p, active: e.target.checked }))}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <label htmlFor="activeCheck" style={{ color: 'var(--text-primary, #f3f4f6)', fontSize: '13px', cursor: 'pointer' }}>
                                Colaborador activo en planta
                            </label>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <Btn variant="secondary" onClick={() => setShowNewModal(false)}>
                            Cancelar
                        </Btn>
                        <Btn onClick={handleCreate} disabled={creatingEmployee}>
                            {creatingEmployee ? 'Guardando...' : 'Crear Colaborador'}
                        </Btn>
                    </div>
                </Modal>
            )}

            {/* ================= MODAL: EDITAR COLABORADOR ================= */}
            {editingEmployee && (
                <Modal title={`Editar Colaborador #${editingEmployee.legajo}`} onClose={() => setEditingEmployee(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                        <Input
                            label="N° de Legajo *"
                            value={editForm.legajo}
                            onChange={(v) => setEditForm((p) => ({ ...p, legajo: v }))}
                        />
                        <Input
                            label="Nombre y Apellido"
                            value={editForm.fullName}
                            onChange={(v) => setEditForm((p) => ({ ...p, fullName: v }))}
                        />
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-muted, #9ca3af)', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                                Sector Asignado *
                            </label>
                            <select
                                value={editForm.sectorKey}
                                onChange={(e) => setEditForm((p) => ({ ...p, sectorKey: e.target.value }))}
                                style={{
                                    width: '100%',
                                    background: 'var(--bg-primary, #0f1117)',
                                    border: '1px solid var(--border-color, #2a2d3e)',
                                    color: 'var(--text-primary, #f3f4f6)',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    fontWeight: 600,
                                }}
                            >
                                {HR_SECTORS_LIST.map((s) => (
                                    <option key={s.key} value={s.key}>
                                        {s.icon} {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                            <input
                                type="checkbox"
                                id="editActiveCheck"
                                checked={editForm.active}
                                onChange={(e) => setEditForm((p) => ({ ...p, active: e.target.checked }))}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <label htmlFor="editActiveCheck" style={{ color: 'var(--text-primary, #f3f4f6)', fontSize: '13px', cursor: 'pointer' }}>
                                Colaborador activo en planta
                            </label>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <Btn variant="secondary" onClick={() => setEditingEmployee(null)}>
                            Cancelar
                        </Btn>
                        <Btn onClick={handleUpdate} disabled={updatingEmployee}>
                            {updatingEmployee ? 'Guardando...' : 'Guardar Cambios'}
                        </Btn>
                    </div>
                </Modal>
            )}

            {/* ================= MODAL: FICHA DETALLADA OPERARIO ================= */}
            {selectedOperario && (
                <Modal title={`Ficha de Rendimiento: ${selectedOperario.fullName}`} onClose={() => setSelectedOperario(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                            <div style={{ 
                                width: 44, height: 44, borderRadius: '50%', 
                                background: '#3b82f6', color: '#fff', fontSize: '18px', fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {selectedOperario.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary, #f3f4f6)' }}>
                                    {selectedOperario.fullName}
                                </div>
                                <div style={{ fontSize: '12px', color: '#818cf8', fontFamily: 'monospace' }}>
                                    Legajo #{selectedOperario.legajo} • {selectedOperario.primarySectorCode || 'Tejeduría'}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>Pares 1ª Calidad</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                                    {selectedOperario.totalGood.toLocaleString()}
                                </div>
                            </div>
                            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 700, textTransform: 'uppercase' }}>2ª / Descarte</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
                                    {selectedOperario.totalSecond.toLocaleString()}
                                </div>
                            </div>
                            <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                <div style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase' }}>Índice de Calidad</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#818cf8', marginTop: '4px' }}>
                                    {selectedOperario.qualityPct}%
                                </div>
                            </div>
                            <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase' }}>Horas de Máquina</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                                    {selectedOperario.runHours} hs
                                </div>
                            </div>
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', lineHeight: '1.5', marginTop: '4px' }}>
                            • Máquinas operadas distintas: <strong>{selectedOperario.distinctMachines}</strong><br />
                            • Jornadas / turnos registrados: <strong>{selectedOperario.totalJornadas}</strong><br />
                            • Pares con falla mecánica atribuible: <strong>{selectedOperario.totalMechanical}</strong>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Btn variant="secondary" onClick={() => setSelectedOperario(null)}>
                            Cerrar
                        </Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}
