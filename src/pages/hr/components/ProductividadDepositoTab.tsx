import { useState, useMemo } from 'react';
import {
    useGetWarehouseProductivityRRHHQuery,
} from '../../../features/warehouse/tasks/api/tasks.api';
import { useGetDepotsQuery } from '../../../features/warehouse/deposito/api/deposito.api';
import { Card, Table, Btn, Modal, Badge, Spinner, useIsMobile } from '../../../shared/ui';

export function ProductividadDepositoTab() {
    const isMobile = useIsMobile();

    // Filtros de sector: 'TODOS' | 'HILADO' | 'PACKAGING'
    const [selectedSector, setSelectedSector] = useState<'TODOS' | 'HILADO' | 'PACKAGING'>('HILADO');
    const [depositoId, setDepositoId] = useState<string>('');

    // Período
    const [dateFrom, setDateFrom] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');

    // Pestaña interna de vista: 'resumen' | 'estandar' | 'operarios' | 'tareas'
    const [viewMode, setViewMode] = useState<'resumen' | 'estandar' | 'tareas'>('resumen');
    const [taskStatusFilter, setTaskStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING' | 'IN_PROGRESS' | 'OVERDUE'>('ALL');
    const [selectedOperario, setSelectedOperario] = useState<any | null>(null);

    // Carga de depósitos
    const { data: rawDepots = [] } = useGetDepotsQuery();
    const depots = useMemo(() => rawDepots.filter((d: any) => d.activo !== false), [rawDepots]);

    // Consulta de productividad en backend
    const { data: prodData, isLoading, refetch } = useGetWarehouseProductivityRRHHQuery({
        depositoId: depositoId || undefined,
        sector: selectedSector === 'TODOS' ? undefined : selectedSector,
        from: dateFrom || undefined,
        to: dateTo || undefined,
    });

    const summary = prodData?.summary || {
        totalPlanificadas: 0,
        totalTareas: 0,
        totalPendientes: 0,
        totalEnProgreso: 0,
        totalVencidas: 0,
        porcentajeCumplimientoPlan: 100,
        tasaPuntualidad: 100,
        pedidosTotales: 0,
        pedidosCompletados: 0,
        controlesRealizados: 0,
        discrepanciasDetectadas: 0,
        totalHorasEstimadas: 0,
        totalHorasReales: 0,
        operariosActivos: 0,
        totalColaboradoresSector: 0,
        eficienciaPromedio: 100,
    };

    const catalogStats = prodData?.catalogStats || [];
    const ranking = prodData?.ranking || [];
    const tasksList = prodData?.tasksList || [];

    // Filtrar operarios por búsqueda
    const filteredRanking = useMemo(() => {
        if (!searchTerm.trim()) return ranking;
        const q = searchTerm.toLowerCase();
        return ranking.filter((r) => r.fullName.toLowerCase().includes(q) || r.legajo.toLowerCase().includes(q));
    }, [ranking, searchTerm]);

    // Promedio de ocupación
    const avgOcupacion = useMemo(() => {
        if (!filteredRanking.length) return 0;
        const sum = filteredRanking.reduce((acc, r) => acc + (r.porcentajeOcupacionUtilidad || 0), 0);
        return Math.round(sum / filteredRanking.length);
    }, [filteredRanking]);

    // Filtrar tareas por estado
    const filteredTasks = useMemo(() => {
        const now = new Date();
        return tasksList.filter((t) => {
            if (taskStatusFilter === 'ALL') return true;
            if (taskStatusFilter === 'COMPLETED') return t.status === 'COMPLETED';
            if (taskStatusFilter === 'PENDING') return t.status === 'PENDING';
            if (taskStatusFilter === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
            if (taskStatusFilter === 'OVERDUE') {
                return t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.dueDate && new Date(t.dueDate) < now;
            }
            return true;
        });
    }, [tasksList, taskStatusFilter]);

    // Preajustes rápidos de fecha
    const setQuickRange = (days: number) => {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - days);
        setDateTo(to.toISOString().split('T')[0]);
        setDateFrom(from.toISOString().split('T')[0]);
    };

    return (
        <div>
            {/* Selector de Sector de Depósito */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
                background: 'rgba(255,255,255,0.02)',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #2a2d3e)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-subtle, #9ca3af)', textTransform: 'uppercase', marginRight: '6px' }}>
                        Sector Analizado:
                    </span>
                    <button
                        onClick={() => { setSelectedSector('HILADO'); setDepositoId(''); }}
                        style={{
                            background: selectedSector === 'HILADO' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                            color: selectedSector === 'HILADO' ? '#fff' : 'var(--text-subtle, #9ca3af)',
                            border: `1px solid ${selectedSector === 'HILADO' ? '#818cf8' : 'rgba(255,255,255,0.1)'}`,
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>🧵</span> Depósito de Hilado
                    </button>
                    <button
                        onClick={() => { setSelectedSector('PACKAGING'); setDepositoId(''); }}
                        style={{
                            background: selectedSector === 'PACKAGING' ? '#ec4899' : 'rgba(255,255,255,0.05)',
                            color: selectedSector === 'PACKAGING' ? '#fff' : 'var(--text-subtle, #9ca3af)',
                            border: `1px solid ${selectedSector === 'PACKAGING' ? '#f472b6' : 'rgba(255,255,255,0.1)'}`,
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>📦</span> Packaging / Insumos
                    </button>
                    <button
                        onClick={() => { setSelectedSector('TODOS'); setDepositoId(''); }}
                        style={{
                            background: selectedSector === 'TODOS' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                            color: selectedSector === 'TODOS' ? '#fff' : 'var(--text-subtle, #9ca3af)',
                            border: `1px solid ${selectedSector === 'TODOS' ? '#60a5fa' : 'rgba(255,255,255,0.1)'}`,
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '13px',
                        }}
                    >
                        🏢 Todos los Depósitos
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600 }}>Rápido:</span>
                    <button onClick={() => setQuickRange(0)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#93c5fd', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Hoy</button>
                    <button onClick={() => setQuickRange(7)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#93c5fd', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>7 días</button>
                    <button onClick={() => setQuickRange(30)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#93c5fd', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>30 días</button>
                    <Btn variant="secondary" onClick={() => refetch()} style={{ padding: '4px 10px', fontSize: '12px' }}>
                        🔄 Actualizar
                    </Btn>
                </div>
            </div>

            {/* Barra de Filtros de Fecha y Depósito físico */}
            <Card style={{ padding: '14px 18px', marginBottom: '20px' }}>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                                Filtro Depósito Físico:
                            </label>
                            <select
                                value={depositoId}
                                onChange={(e) => setDepositoId(e.target.value)}
                                style={{
                                    background: 'var(--bg-primary, #0f1117)',
                                    border: '1px solid var(--border-color, #2a2d3e)',
                                    color: '#fff',
                                    padding: '7px 12px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                }}
                            >
                                <option value="">Todos los depósitos físicos</option>
                                {depots.map((d: any) => (
                                    <option key={d.id} value={d.id}>
                                        {d.nombre} {d.planta ? `(${d.planta})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                                Desde:
                            </label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                style={{
                                    background: 'var(--bg-primary, #0f1117)',
                                    border: '1px solid var(--border-color, #2a2d3e)',
                                    color: '#fff',
                                    padding: '7px 10px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                                Hasta:
                            </label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                style={{
                                    background: 'var(--bg-primary, #0f1117)',
                                    border: '1px solid var(--border-color, #2a2d3e)',
                                    color: '#fff',
                                    padding: '7px 10px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ flex: isMobile ? '1 1 100%' : 'none' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                            Buscar colaborador:
                        </label>
                        <input
                            type="text"
                            placeholder="Dilan, Diego, legajo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                background: 'var(--bg-primary, #0f1117)',
                                border: '1px solid var(--border-color, #2a2d3e)',
                                color: '#fff',
                                padding: '7px 12px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                minWidth: isMobile ? '100%' : '200px',
                            }}
                        />
                    </div>
                </div>
            </Card>

            {/* SECCIÓN 1: KPIs DE CUMPLIMIENTO DEL PLAN */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: '14px',
                marginBottom: '20px',
            }}>
                <Card style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-subtle, #9ca3af)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Cumplimiento del Plan
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '28px', fontWeight: 800, color: (summary.porcentajeCumplimientoPlan ?? 100) >= 80 ? '#10b981' : '#f59e0b' }}>
                            {summary.porcentajeCumplimientoPlan ?? 100}%
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)' }}>del plan</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dimmed, #6b7280)', marginTop: '4px' }}>
                        {summary.totalTareas} resueltas de {summary.totalPlanificadas ?? summary.totalTareas} planificadas
                    </div>
                </Card>

                <Card style={{ padding: '16px', borderLeft: '4px solid #6366f1' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-subtle, #9ca3af)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Puntualidad en Entregas
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '28px', fontWeight: 800, color: '#818cf8' }}>
                            {summary.tasaPuntualidad ?? 100}%
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)' }}>a término</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dimmed, #6b7280)', marginTop: '4px' }}>
                        {summary.pedidosCompletados ?? 0} pedidos despachados ({summary.pedidosTotales ?? 0} totales)
                    </div>
                </Card>

                <Card style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-subtle, #9ca3af)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Eficiencia vs Estándar
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '28px', fontWeight: 800, color: summary.eficienciaPromedio >= 100 ? '#10b981' : '#f59e0b' }}>
                            {summary.eficienciaPromedio}%
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)' }}>rendimiento</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dimmed, #6b7280)', marginTop: '4px' }}>
                        {summary.totalHorasReales} hs reales vs {summary.totalHorasEstimadas} hs planificadas
                    </div>
                </Card>

                <Card style={{ padding: '16px', borderLeft: '4px solid #ec4899' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-subtle, #9ca3af)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Ocupación / Utilidad
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '28px', fontWeight: 800, color: '#f472b6' }}>
                            {avgOcupacion}%
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)' }}>del turno</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dimmed, #6b7280)', marginTop: '4px' }}>
                        En {summary.totalColaboradoresSector ?? filteredRanking.length} colaboradores del sector
                    </div>
                </Card>
            </div>

            {/* Selector de Vistas del Reporte */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                <button
                    onClick={() => setViewMode('resumen')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        background: viewMode === 'resumen' ? 'rgba(99,102,241,0.2)' : 'transparent',
                        color: viewMode === 'resumen' ? '#818cf8' : 'var(--text-subtle, #9ca3af)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '13px',
                    }}
                >
                    👥 Porcentajes por Colaborador
                </button>
                <button
                    onClick={() => setViewMode('estandar')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        background: viewMode === 'estandar' ? 'rgba(99,102,241,0.2)' : 'transparent',
                        color: viewMode === 'estandar' ? '#818cf8' : 'var(--text-subtle, #9ca3af)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '13px',
                    }}
                >
                    ⏱️ Tareas Estándar & Tiempos Estimados
                </button>
                <button
                    onClick={() => setViewMode('tareas')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        background: viewMode === 'tareas' ? 'rgba(99,102,241,0.2)' : 'transparent',
                        color: viewMode === 'tareas' ? '#818cf8' : 'var(--text-subtle, #9ca3af)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '13px',
                    }}
                >
                    📋 Todas las Tareas del Sector ({tasksList.length})
                </button>
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <Spinner />
                </div>
            ) : null}

            {/* VISTA 1: RANKING Y PORCENTAJES POR COLABORADOR */}
            {!isLoading && viewMode === 'resumen' && (
                <Card style={{ padding: '20px', overflowX: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div>
                            <h4 style={{ margin: 0, color: 'var(--text-primary, #f3f4f6)' }}>
                                Desempeño y Rendimiento por Colaborador ({selectedSector === 'HILADO' ? 'Depósito Hilado' : selectedSector === 'PACKAGING' ? 'Packaging e Insumos' : 'Todos los Sectores'})
                            </h4>
                            <div style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', marginTop: '2px' }}>
                                Ocupación (% tiempo dedicado), Eficiencia (estimado vs real) y Cumplimiento del plan asignado
                            </div>
                        </div>
                    </div>

                    {filteredRanking.length === 0 ? (
                        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-subtle, #9ca3af)' }}>
                            No hay colaboradores cargados para este sector. Puedes crearlos desde la pestaña "Directorio de Colaboradores".
                        </div>
                    ) : (
                        <Table
                            cols={[
                                'Colaborador',
                                'Sector Asignado',
                                'Plan Cumplido',
                                'Tareas Resueltas',
                                'Hs Trabajadas',
                                'Eficiencia / Rendimiento',
                                'Ocupación / Utilidad',
                                'Acciones',
                            ]}
                            rows={filteredRanking.map((row) => {
                                const ef = row.porcentajeEficiencia;
                                const efColor = ef >= 100 ? '#10b981' : ef >= 80 ? '#f59e0b' : '#ef4444';
                                const oc = row.porcentajeOcupacionUtilidad;
                                const planPct = row.porcentajeCumplimientoPlan ?? (row.totalTareas > 0 ? 100 : 0);

                                return [
                                    (
                                        <div key="name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: 30, height: 30, borderRadius: '50%',
                                                background: '#6366f1', color: '#fff', fontSize: '11px', fontWeight: 800,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                {row.fullName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#fff' }}>{row.fullName}</div>
                                                <div style={{ fontSize: '11px', color: '#818cf8', fontFamily: 'monospace' }}>Legajo #{row.legajo}</div>
                                            </div>
                                        </div>
                                    ),
                                    (
                                        <Badge key="dep" color={row.subSector === 'PACKAGING' ? '#ec4899' : '#6366f1'}>
                                            {row.subSector === 'PACKAGING' ? '📦 Packaging' : '🧵 Hilado'}
                                        </Badge>
                                    ),
                                    (
                                        <div key="plan">
                                            <span style={{ fontWeight: 800, color: planPct >= 80 ? '#10b981' : '#f59e0b', fontSize: '14px' }}>
                                                {planPct}%
                                            </span>
                                            <div style={{ fontSize: '10px', color: 'var(--text-subtle, #6b7280)' }}>
                                                {row.totalTareasCompletadas ?? row.totalTareas} de {row.totalTareasAsignadas ?? row.totalTareas}
                                            </div>
                                        </div>
                                    ),
                                    (
                                        <div key="count" style={{ fontWeight: 800, fontSize: '15px', color: '#818cf8' }}>
                                            {row.totalTareas}
                                        </div>
                                    ),
                                    (
                                        <div key="hs">
                                            <span style={{ color: '#fff', fontWeight: 700 }}>{row.horasReales} hs</span>
                                            <div style={{ fontSize: '10px', color: 'var(--text-subtle, #6b7280)' }}>Est.: {row.horasEstimadas} hs</div>
                                        </div>
                                    ),
                                    (
                                        <div key="ef" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontWeight: 800, color: efColor, fontSize: '14px' }}>{ef}%</span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-subtle, #6b7280)' }}>
                                                {ef >= 100 ? '🚀 Ágil' : ef >= 80 ? '✓ En tiempo' : '⚠️ Lento'}
                                            </span>
                                        </div>
                                    ),
                                    (
                                        <div key="oc" style={{ minWidth: '110px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                                                <span style={{ color: '#f472b6', fontWeight: 700 }}>{oc}%</span>
                                                <span style={{ color: 'var(--text-subtle, #6b7280)' }}>de jornada</span>
                                            </div>
                                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ width: `${Math.min(100, oc)}%`, height: '100%', background: '#ec4899', borderRadius: '3px' }} />
                                            </div>
                                        </div>
                                    ),
                                    (
                                        <button
                                            key="act"
                                            onClick={() => setSelectedOperario(row)}
                                            style={{
                                                background: 'rgba(99, 102, 241, 0.15)',
                                                border: '1px solid #6366f1',
                                                color: '#818cf8',
                                                padding: '5px 10px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                            }}
                                        >
                                            🔍 Ficha Tareas
                                        </button>
                                    ),
                                ];
                            })}
                        />
                    )}
                </Card>
            )}

            {/* VISTA 2: TAREAS ESTÁNDAR Y TIEMPOS ESTIMADOS DEL CATÁLOGO */}
            {!isLoading && viewMode === 'estandar' && (
                <Card style={{ padding: '20px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, color: 'var(--text-primary, #f3f4f6)' }}>
                            Catálogo de Tareas Estándar del Sector
                        </h4>
                        <div style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', marginTop: '2px' }}>
                            Tiempos estándar asignados a cada tipo de tarea y desvío histórico promedio registrado en planta
                        </div>
                    </div>

                    <Table
                        cols={[
                            'Código',
                            'Nombre de Tarea Estándar',
                            'Tipo General',
                            'Tiempo Estándar',
                            'Veces Ejecutada',
                            'Tiempo Promedio Real',
                            'Desvío vs Estándar',
                            'Ajuste',
                        ]}
                        rows={catalogStats.map((item) => {
                            const desvio = item.desvioMinutos;
                            const isFaster = desvio <= 0;

                            return [
                                (
                                    <span key="code" style={{ fontFamily: 'monospace', fontWeight: 700, color: '#818cf8' }}>
                                        {item.codigo}
                                    </span>
                                ),
                                (
                                    <span key="name" style={{ fontWeight: 600, color: '#fff' }}>
                                        {item.nombre}
                                    </span>
                                ),
                                (
                                    <Badge key="tipo" color={item.tipoGeneral === 'CUSTOMER_ORDER' ? '#3b82f6' : item.tipoGeneral === 'INVENTORY_CONTROL' ? '#8b5cf6' : '#f59e0b'}>
                                        {item.tipoGeneral === 'CUSTOMER_ORDER' ? '🚚 Pedido' : item.tipoGeneral === 'INVENTORY_CONTROL' ? '🔍 Control' : '⚡ Extraordinaria'}
                                    </Badge>
                                ),
                                (
                                    <span key="est" style={{ fontWeight: 700, color: '#a5b4fc' }}>
                                        {item.tiempoEstimadoMinutos} min
                                    </span>
                                ),
                                (
                                    <span key="count" style={{ fontWeight: 800, color: '#fff' }}>
                                        {item.vecesRealizada}
                                    </span>
                                ),
                                (
                                    <span key="real" style={{ fontWeight: 700, color: isFaster ? '#34d399' : '#f87171' }}>
                                        {item.tiempoPromedioReal} min
                                    </span>
                                ),
                                (
                                    <span key="dev" style={{ fontWeight: 700, color: isFaster ? '#10b981' : '#ef4444' }}>
                                        {desvio > 0 ? `+${desvio} min ⚠️` : `${desvio} min ✓`}
                                    </span>
                                ),
                                (
                                    <span key="ajuste" style={{ fontSize: '11px', color: 'var(--text-subtle, #9ca3af)' }}>
                                        {item.cumplimientoEstandarPct}%
                                    </span>
                                ),
                            ];
                        })}
                    />
                </Card>
            )}

            {/* VISTA 3: TODAS LAS TAREAS DEL SECTOR */}
            {!isLoading && viewMode === 'tareas' && (
                <Card style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <h4 style={{ margin: 0, color: 'var(--text-primary, #f3f4f6)' }}>
                                Tareas del Sector ({selectedSector === 'HILADO' ? 'Hilado' : selectedSector === 'PACKAGING' ? 'Packaging' : 'Depósito General'})
                            </h4>
                            <div style={{ fontSize: '12px', color: 'var(--text-subtle, #9ca3af)', marginTop: '2px' }}>
                                Auditoría de todas las tareas planificadas, en curso y ejecutadas en el período
                            </div>
                        </div>

                        {/* Filtros de estado de tarea */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'] as const).map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setTaskStatusFilter(st)}
                                    style={{
                                        background: taskStatusFilter === st ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                        color: taskStatusFilter === st ? '#fff' : 'var(--text-subtle, #9ca3af)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        padding: '5px 10px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {st === 'ALL' ? 'Todas' : st === 'PENDING' ? 'Pendientes' : st === 'IN_PROGRESS' ? 'En Curso' : st === 'COMPLETED' ? 'Completadas' : '⚠️ Vencidas'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredTasks.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-subtle, #9ca3af)' }}>
                            No hay tareas registradas con este criterio de filtro.
                        </div>
                    ) : (
                        <Table
                            cols={[
                                'Tarea / Destino',
                                'Tipo',
                                'Estado',
                                'Operario Asignado',
                                'Fecha Límite',
                                'Tiempo Est.',
                                'Tiempo Real',
                                'Resultado / Notas',
                            ]}
                            rows={filteredTasks.map((t) => {
                                const isOverdue = t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.dueDate && new Date(t.dueDate) < new Date();
                                const op = t.completedByEmployee || t.assignedEmployee;

                                return [
                                    (
                                        <div key="title">
                                            <div style={{ fontWeight: 700, color: '#fff' }}>{t.title}</div>
                                            {t.customerOrDestination && (
                                                <div style={{ fontSize: '11px', color: '#818cf8' }}>Destino: {t.customerOrDestination}</div>
                                            )}
                                        </div>
                                    ),
                                    (
                                        <Badge key="type" color={t.type === 'CUSTOMER_ORDER' ? '#3b82f6' : t.type === 'INVENTORY_CONTROL' ? '#8b5cf6' : '#f59e0b'}>
                                            {t.type === 'CUSTOMER_ORDER' ? '🚚 Pedido' : t.type === 'INVENTORY_CONTROL' ? '🔍 Control' : '⚡ Extra'}
                                        </Badge>
                                    ),
                                    (
                                        <Badge key="st" color={isOverdue ? '#ef4444' : t.status === 'COMPLETED' ? '#10b981' : t.status === 'IN_PROGRESS' ? '#3b82f6' : '#f59e0b'}>
                                            {isOverdue ? '⚠️ Vencida' : t.status === 'COMPLETED' ? '✓ Completada' : t.status === 'IN_PROGRESS' ? '▶️ En curso' : '⏳ Pendiente'}
                                        </Badge>
                                    ),
                                    (
                                        <span key="op" style={{ color: op ? '#fff' : 'var(--text-subtle, #6b7280)', fontWeight: 600 }}>
                                            {op ? `${op.fullName} (#${op.legajo})` : 'Sin asignar'}
                                        </span>
                                    ),
                                    (
                                        <span key="due" style={{ fontSize: '12px', color: isOverdue ? '#f87171' : 'var(--text-subtle, #9ca3af)', fontWeight: isOverdue ? 700 : 500 }}>
                                            {t.dueDate ? new Date(t.dueDate).toLocaleDateString('es-AR') : '—'}
                                        </span>
                                    ),
                                    (
                                        <span key="est" style={{ color: 'var(--text-subtle, #9ca3af)', fontSize: '12px' }}>
                                            {t.tiempoEstimadoMinutos} min
                                        </span>
                                    ),
                                    (
                                        <span key="real" style={{ fontWeight: 700, color: t.tiempoRealMinutos ? '#34d399' : 'var(--text-subtle, #6b7280)' }}>
                                            {t.tiempoRealMinutos ? `${t.tiempoRealMinutos} min` : '—'}
                                        </span>
                                    ),
                                    (
                                        <div key="notes" style={{ fontSize: '11px', color: t.resultStatus === 'DISCREPANCIA' ? '#f87171' : 'var(--text-subtle, #9ca3af)' }}>
                                            {t.resultStatus || '—'} {t.resultNotes ? `(${t.resultNotes})` : ''}
                                        </div>
                                    ),
                                ];
                            })}
                        />
                    )}
                </Card>
            )}

            {/* Modal Detalle de Tareas del Operario */}
            {selectedOperario && (
                <Modal title={`Ficha de Rendimiento: ${selectedOperario.fullName}`} onClose={() => setSelectedOperario(null)}>
                    <div style={{ padding: '8px 0', maxWidth: '600px', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px' }}>
                            <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {selectedOperario.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, color: '#fff', fontSize: '16px' }}>{selectedOperario.fullName}</div>
                                <div style={{ fontSize: '12px', color: '#818cf8', fontFamily: 'monospace' }}>
                                    Legajo #{selectedOperario.legajo} • {selectedOperario.depositoNombre}
                                </div>
                            </div>
                        </div>

                        {/* Métricas individuales */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ background: 'var(--bg-primary, #0f1117)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color, #2a2d3e)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-subtle, #9ca3af)', textTransform: 'uppercase', fontWeight: 700 }}>Tareas Resueltas</div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#818cf8', marginTop: '2px' }}>{selectedOperario.totalTareas}</div>
                            </div>
                            <div style={{ background: 'var(--bg-primary, #0f1117)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color, #2a2d3e)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-subtle, #9ca3af)', textTransform: 'uppercase', fontWeight: 700 }}>Eficiencia</div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: selectedOperario.porcentajeEficiencia >= 100 ? '#10b981' : '#f59e0b', marginTop: '2px' }}>
                                    {selectedOperario.porcentajeEficiencia}%
                                </div>
                            </div>
                            <div style={{ background: 'var(--bg-primary, #0f1117)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color, #2a2d3e)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-subtle, #9ca3af)', textTransform: 'uppercase', fontWeight: 700 }}>Ocupación</div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#f472b6', marginTop: '2px' }}>
                                    {selectedOperario.porcentajeOcupacionUtilidad}%
                                </div>
                            </div>
                        </div>

                        {/* Distribución por tipo de tarea */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-subtle, #9ca3af)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Horas dedicadas por Tipo de Tarea
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {Object.entries(selectedOperario.tareasPorTipo || {}).map(([tipo, data]: [string, any]) => (
                                    <div key={tipo} style={{ background: 'var(--bg-primary, #0f1117)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #2a2d3e)' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-subtle, #9ca3af)', fontWeight: 600 }}>
                                            {tipo === 'CUSTOMER_ORDER' ? '🚚 Pedidos Clientes' : tipo === 'INVENTORY_CONTROL' ? '🔍 Controles Stock' : tipo === 'PUTAWAY' ? '📥 Acomodos' : '⚡ Extraordinarias'}
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                                            {data.count} tareas ({Math.round(data.minutos / 60 * 10) / 10} hs)
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Últimas Tareas */}
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-subtle, #9ca3af)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Últimas Tareas Ejecutadas
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                {selectedOperario.ultimasTareas?.length === 0 ? (
                                    <div style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '12px', padding: '10px' }}>
                                        Sin tareas completadas aún en este período.
                                    </div>
                                ) : (
                                    selectedOperario.ultimasTareas?.map((t: any) => (
                                        <div key={t.id} style={{ background: 'var(--bg-primary, #0f1117)', padding: '10px', borderRadius: '6px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ color: '#fff', fontWeight: 600 }}>{t.title || 'Tarea'}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-subtle, #6b7280)' }}>
                                                    {new Date(t.completedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })} — {t.resultStatus || 'Completada'}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ color: '#34d399', fontWeight: 700 }}>{t.tiempoRealMinutos} min</span>
                                                <div style={{ fontSize: '10px', color: 'var(--text-subtle, #6b7280)' }}>Est.: {t.tiempoEstimadoMinutos} min</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <Btn onClick={() => setSelectedOperario(null)} style={{ background: '#6366f1', color: '#fff' }}>
                                Cerrar
                            </Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}