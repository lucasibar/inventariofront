import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader, Card, Btn, Badge } from '../../shared/ui';
import {
    useParseOrdenesProduccionMutation,
    useRecalcularPlanillaMutation,
    useGetUltimaPlanillaProduccionQuery,
    useListarPlanillasProduccionQuery,
    useLazyGetPlanillaProduccionByIdQuery,
    useSincronizarPlanillaConPedidosMutation,
    useLimpiarPlanillasProduccionMutation,
} from '../../features/quality/ordenes-produccion/api/ordenesProduccion.api';
import type { ProduccionParseResult, ArticuloProduccionSummary } from '../../features/quality/ordenes-produccion/types/ordenesProduccion.types';
import { PdfUploader } from '../../features/quality/ordenes-produccion/components/PdfUploader';
import { ArticulosTejidoTab } from '../../features/quality/ordenes-produccion/components/ArticulosTejidoTab';
import { ConciliarSusiModal } from '../../features/quality/ordenes-produccion/components/ConciliarSusiModal';
import { MaquinasTab } from '../../features/quality/ordenes-produccion/components/MaquinasTab';
import { ColoresTab } from '../../features/quality/ordenes-produccion/components/ColoresTab';
import { MaterialesAsignadosTab } from '../../features/quality/ordenes-produccion/components/MaterialesAsignadosTab';
import { HojaRepartidorTab } from '../../features/quality/ordenes-produccion/components/HojaRepartidorTab';
import { HojaPickingTab } from '../../features/quality/ordenes-produccion/components/HojaPickingTab';
import { ArticulosSinEstructuraTab } from '../../features/quality/ordenes-produccion/components/ArticulosSinEstructuraTab';

type TabType = 'articulos' | 'sin_estructura' | 'maquinas' | 'colores' | 'materiales' | 'repartidor' | 'picking';

export interface OrdenesProduccionPageProps {
    sectorMode?: 'PRODUCCION' | 'DEPOSITO' | 'COMPRAS';
}

export default function OrdenesProduccionPage({ sectorMode }: OrdenesProduccionPageProps = {}) {
    const location = useLocation();
    const navigate = useNavigate();

    const effectiveSector: 'PRODUCCION' | 'DEPOSITO' | 'COMPRAS' = useMemo(() => {
        if (sectorMode) return sectorMode;
        if (location.pathname.startsWith('/deposito')) return 'DEPOSITO';
        if (location.pathname.startsWith('/compras')) return 'COMPRAS';
        return 'PRODUCCION';
    }, [sectorMode, location.pathname]);

    const [parseOrdenes, { isLoading }] = useParseOrdenesProduccionMutation();
    const { data: ultimaPlanilla, isFetching: loadingUltima, refetch: refetchUltima } = useGetUltimaPlanillaProduccionQuery();
    const { data: historialPlanillas = [], refetch: refetchHistorial } = useListarPlanillasProduccionQuery();
    const [fetchPlanillaById] = useLazyGetPlanillaProduccionByIdQuery();
    const [sincronizarPedidos, { isLoading: isSyncing }] = useSincronizarPlanillaConPedidosMutation();
    const [limpiarPlanillas, { isLoading: isCleaning }] = useLimpiarPlanillasProduccionMutation();
    const [recalcular, { isLoading: isRecalculating }] = useRecalcularPlanillaMutation();

    const handleRecalcular = async () => {
        try {
            const res = await recalcular(result?.planillaId).unwrap();
            if (res) {
                setResult(res);
                alert('Planilla recalculada con exito con las estructuras, equivalencias de hilado y stock actuales');
            }
        } catch (err: any) {
            alert('Error al recalcular: ' + (err?.data?.message || err?.message || 'Error desconocido'));
        }
    };

    const handleLimpiarCargas = async () => {
        if (!window.confirm('¿Seguro que deseas borrar todas las cargas viejas de planillas de producción?')) return;
        try {
            await limpiarPlanillas().unwrap();
            setResult(null);
            refetchUltima();
            refetchHistorial();
        } catch (err: any) {
            alert('Error al borrar cargas: ' + (err.data?.message || err.message));
        }
    };

    const [result, setResult] = useState<ProduccionParseResult | null>(null);
    const [articuloConciliar, setArticuloConciliar] = useState<ArticuloProduccionSummary | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>(() => {
        if (effectiveSector === 'DEPOSITO') return 'picking';
        if (effectiveSector === 'COMPRAS') return 'materiales';
        return 'articulos';
    });

    useEffect(() => {
        if (effectiveSector === 'DEPOSITO') setActiveTab('picking');
        else if (effectiveSector === 'COMPRAS') setActiveTab('materiales');
    }, [effectiveSector]);

    useEffect(() => {
        if (ultimaPlanilla && !result) {
            setResult(ultimaPlanilla);
        }
    }, [ultimaPlanilla, result]);

    // Global Filters
    const [selectedFecha, setSelectedFecha] = useState<string>('ALL');
    const [selectedTurno, setSelectedTurno] = useState<string>('ALL');
    const [selectedArea, setSelectedArea] = useState<string>('ALL');

    const handleUpload = async (files: File[]) => {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('files', file);
        });

        try {
            const data = await parseOrdenes(formData).unwrap();
            setResult(data);
            refetchUltima();
            refetchHistorial();
            if (data.fechas && data.fechas.length > 0) {
                setSelectedFecha(data.fechas[0]);
            } else {
                setSelectedFecha('ALL');
            }
        } catch (err: any) {
            alert(err?.data?.message || 'Error al procesar los archivos PDF. Verifica que sean válidos.');
        }
    };

    const handleSelectPlanillaHistorica = async (id: string) => {
        if (!id) return;
        try {
            const data = await fetchPlanillaById(id).unwrap();
            if (data) {
                setResult(data);
                setSelectedFecha('ALL');
                setSelectedTurno('ALL');
                setSelectedArea('ALL');
            }
        } catch {
            alert('No se pudo cargar la planilla seleccionada.');
        }
    };

    const handleSyncWithPedidos = async () => {
        try {
            const res = await sincronizarPedidos().unwrap();
            alert(`Sincronización exitosa con Pedidos de Producción: ${res.creados} pedidos nuevos creados y ${res.actualizados} actualizados con el avance de tejido del día.`);
            navigate('/produccion/pedidos');
        } catch {
            alert('Error al sincronizar la planilla con los pedidos de producción.');
        }
    };

    const handleReset = () => {
        setResult(null);
        setSelectedFecha('ALL');
        setSelectedTurno('ALL');
        setSelectedArea('ALL');
        setActiveTab(effectiveSector === 'DEPOSITO' ? 'picking' : effectiveSector === 'COMPRAS' ? 'materiales' : 'articulos');
    };

    // Filtered data based on Date, Shift, and Area
    const filteredMaquinas = useMemo(() => {
        if (!result) return [];
        return result.maquinas.filter((m) => {
            if (selectedFecha !== 'ALL' && m.date && m.date !== selectedFecha) return false;
            if (selectedTurno !== 'ALL' && m.shift && m.shift !== selectedTurno) return false;
            if (selectedArea !== 'ALL' && m.area && m.area !== selectedArea) return false;
            return true;
        });
    }, [result, selectedFecha, selectedTurno, selectedArea]);

    const articulosSinEstructura = useMemo(() => {
        if (!result) return [];
        return result.articulos.filter((a) => !a.itemRefs || a.itemRefs.length === 0 || a.advertencia?.includes('sin estructura') || a.advertencia?.includes('no encontrado'));
    }, [result]);

    const filteredArticulos = useMemo(() => {
        if (!result) return [];
        if (selectedFecha === 'ALL' && selectedTurno === 'ALL' && selectedArea === 'ALL') {
            return result.articulos;
        }
        const validMachineNumbers = new Set(filteredMaquinas.map((m) => m.machine));
        return result.articulos
            .map((art) => {
                const subMaquinas = art.maquinas.filter((m) => validMachineNumbers.has(m));
                if (subMaquinas.length === 0) return null;
                return {
                    ...art,
                    maquinas: subMaquinas,
                    maquinasCount: subMaquinas.length,
                };
            })
            .filter((a): a is NonNullable<typeof a> => a !== null);
    }, [result, filteredMaquinas, selectedFecha, selectedTurno, selectedArea]);

    const filteredMateriales = useMemo(() => {
        if (!result) return [];
        if (selectedFecha === 'ALL' && selectedTurno === 'ALL' && selectedArea === 'ALL') {
            return result.materiales;
        }
        const validMachineNumbers = new Set(filteredMaquinas.map((m) => m.machine));
        return result.materiales
            .map((mat) => {
                const subMaquinas = mat.maquinas.filter((m) => validMachineNumbers.has(m));
                if (subMaquinas.length === 0) return null;
                return {
                    ...mat,
                    maquinas: subMaquinas,
                    maquinasCount: subMaquinas.length,
                };
            })
            .filter((m): m is NonNullable<typeof m> => m !== null);
    }, [result, filteredMaquinas, selectedFecha, selectedTurno, selectedArea]);

    const filteredHojaRepartidor = useMemo(() => {
        if (!result) return [];
        return result.hojaRepartidor.filter((item) => {
            if (selectedTurno !== 'ALL' && item.shift && item.shift !== selectedTurno) return false;
            if (selectedArea !== 'ALL' && item.area !== `Área ${selectedArea}`) return false;
            return true;
        });
    }, [result, selectedTurno, selectedArea]);

    const filteredHojaPicking = useMemo(() => {
        if (!result) return [];
        if (selectedFecha === 'ALL' && selectedTurno === 'ALL' && selectedArea === 'ALL') {
            return result.hojaPicking;
        }
        const validMachineNumbers = new Set(filteredMaquinas.map((m) => m.machine));
        return result.hojaPicking
            .map((item) => {
                const subMaquinas = item.maquinas.filter((m) => validMachineNumbers.has(m));
                if (subMaquinas.length === 0) return null;
                return {
                    ...item,
                    maquinas: subMaquinas,
                    maquinasCount: subMaquinas.length,
                };
            })
            .filter((it): it is NonNullable<typeof it> => it !== null);
    }, [result, filteredMaquinas, selectedFecha, selectedTurno, selectedArea]);

    const handleSelectMachineFromTab = (_machineNum: number) => {
        setActiveTab('maquinas');
    };

    const pageTitle =
        effectiveSector === 'DEPOSITO'
            ? '📦 Abastecimiento y Picking para Producción (Hilados e Insumos)'
            : effectiveSector === 'COMPRAS'
            ? '🛒 Proyección de Consumo y Faltantes de Hilado para Producción'
            : '⚙️ Planificación Diaria de Producción — Tejeduría (Turnos 12h y Cambios 08:00 AM)';

    const pageSubtitle =
        effectiveSector === 'DEPOSITO'
            ? 'Informe directo para Depósito: cuánto hilado hay en Picking vs Reserva (Stock), cuánto pasar a Picking y a qué posición predilecta llevarlo.'
            : effectiveSector === 'COMPRAS'
            ? 'Informe directo para Compras: consumo total requerido por la planificación del día vs Stock Total, Stock Restante y Kilos a Comprar.'
            : 'Cálculo de docenas/pares/medias por máquina según velocidad (seg/media), cambios de artículo a las 08:00 AM (Mantenimiento) y explosión de hilados.';

    return (
        <div style={{ padding: '24px' }}>
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    .printable-sheet, .printable-sheet * { visibility: visible !important; }
                    .printable-sheet {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                    }
                    .no-print, header, aside, nav, button { display: none !important; }
                    table { width: 100% !important; border-collapse: collapse !important; color: #000000 !important; }
                    th, td { border: 1px solid #cccccc !important; color: #000000 !important; padding: 6px 8px !important; font-size: 11px !important; }
                    th { background: #f3f4f6 !important; font-weight: bold !important; }
                }
            `}</style>

            <div className="no-print">
                <PageHeader title={pageTitle} subtitle={pageSubtitle}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {historialPlanillas.length > 0 && (
                            <select
                                value={result?.planillaId || ''}
                                onChange={(e) => handleSelectPlanillaHistorica(e.target.value)}
                                style={{
                                    padding: '6px 10px',
                                    background: 'var(--bg-secondary, #1a1d2e)',
                                    border: '1px solid var(--border-color, #2a2d3e)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary, #f3f4f6)',
                                    fontSize: '12px',
                                }}
                            >
                                <option value="">📅 Planillas Guardadas ({historialPlanillas.length})</option>
                                {historialPlanillas.map((p: any) => (
                                    <option key={p.id} value={p.id}>
                                        Fecha: {p.fecha} ({new Date(p.creado_en).toLocaleDateString('es-AR')})
                                    </option>
                                ))}
                            </select>
                        )}

                        {result && (
                            <Btn
                                onClick={handleRecalcular}
                                disabled={isRecalculating}
                                style={{ fontSize: '12px', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                {isRecalculating ? 'Recalculando...' : '🔄 Recalcular con Recetas / Stock Actuales'}
                            </Btn>
                        )}

                        {effectiveSector === 'PRODUCCION' && result && (
                            <Btn
                                onClick={handleSyncWithPedidos}
                                disabled={isSyncing}
                                style={{ fontSize: '12px', background: '#10b981' }}
                            >
                                {isSyncing ? 'Sincronizando...' : '📦 Impactar Avance en Pedidos / Stock Artículos'}
                            </Btn>
                        )}

                        {effectiveSector === 'PRODUCCION' && (
                            <Btn
                                variant="secondary"
                                onClick={handleLimpiarCargas}
                                disabled={isCleaning}
                                style={{ fontSize: '12px', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                            >
                                {isCleaning ? 'Limpiando...' : '🗑️ Limpiar Cargas Viejas'}
                            </Btn>
                        )}

                        <Btn
                            onClick={() => navigate('/produccion/dashboard')}
                            style={{ fontSize: '12px', background: '#8b5cf6', color: '#fff' }}
                        >
                            ⚡ Dashboard de Producción ↗️
                        </Btn>

                        <Btn
                            variant="secondary"
                            onClick={() => navigate('/desarrollo/articulos')}
                            style={{ fontSize: '12px' }}
                        >
                            🧪 Catálogo Desarrollo ↗️
                        </Btn>
                    </div>
                </PageHeader>
            </div>

            {/* Uploader Section (only in PRODUCCION mode) */}
            {effectiveSector === 'PRODUCCION' && (
                <div className="no-print" style={{ marginBottom: '16px' }}>
                    <PdfUploader
                        onUpload={handleUpload}
                        isLoading={isLoading}
                        hasData={!!result}
                        onReset={handleReset}
                    />
                </div>
            )}

            {!result && !loadingUltima && effectiveSector !== 'PRODUCCION' && (
                <Card style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted, #9ca3af)' }}>
                    Aún no hay una planilla de producción diaria cargada por el sector Producción.
                </Card>
            )}

            {/* Results Section */}
            {result && (
                <div>
                    {/* 2 INFORMES PRINCIPALES GENERADOS POR CARGA DE PRODUCCIÓN */}
                    {effectiveSector === 'PRODUCCION' && (
                        <div
                            className="no-print"
                            style={{
                                background: 'linear-gradient(90deg, rgba(30, 27, 75, 0.6) 0%, rgba(20, 24, 39, 0.9) 100%)',
                                border: '1px solid rgba(139, 92, 246, 0.4)',
                                borderRadius: '14px',
                                padding: '18px 22px',
                                marginBottom: '22px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>📊</span> Los 2 Informes Operativos de Producción
                                        <Badge color="#10b981">Planilla Procesada</Badge>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>
                                        Planificación calculada con éxito. Accedé e imprimí directamente los 2 informes requeridos para planta y depósito:
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                                {/* Informe 1: Hilado para Armar Zona de Picking */}
                                <div
                                    onClick={() => setActiveTab('picking')}
                                    style={{
                                        background: activeTab === 'picking' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.08)',
                                        border: '1px solid rgba(56, 189, 248, 0.4)',
                                        borderRadius: '12px',
                                        padding: '16px 18px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8' }}>
                                            🧶 1. Hilado para Armar la Zona de Picking
                                        </span>
                                        <span style={{ fontSize: '14px', color: '#38bdf8', fontWeight: 700 }}>Ver Planilla ➔</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#d1d5db', marginTop: '6px' }}>
                                        Informe directo para que Depósito baje conos y kilos desde reserva al rack de picking de tejeduría.
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                                            {(result.resumenAlertas.totalKilosHiladoDia || 0).toLocaleString('es-AR')} kg
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>•</span>
                                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                            {filteredHojaPicking.length} hilados requeridos
                                        </span>
                                    </div>
                                </div>

                                {/* Informe 2: Cambios de Máquina, Hilado Entrante & Tiempos Marina */}
                                <div
                                    onClick={() => navigate('/produccion/dashboard')}
                                    style={{
                                        background: 'rgba(167, 139, 250, 0.08)',
                                        border: '1px solid rgba(167, 139, 250, 0.4)',
                                        borderRadius: '12px',
                                        padding: '16px 18px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#a78bfa' }}>
                                            🔄 2. Cambios de Máquina & Hilados Entrantes
                                        </span>
                                        <span style={{ fontSize: '14px', color: '#a78bfa', fontWeight: 700 }}>Ver en Dashboard ↗️</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#d1d5db', marginTop: '6px' }}>
                                        De qué artículo a qué artículo se cambia, hilados a llevar a pie de máquina y tiempos históricos de Marina.
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa' }}>
                                            {result.resumenAlertas.totalCambiosProgramados08AM || 0} cambios 08:00 AM
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>•</span>
                                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                            Tiempos promedio cronometrados
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Top KPI Cards tailored to the calculation engine */}
                    <div
                        className="no-print"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                            gap: '12px',
                            marginBottom: '20px',
                        }}
                    >
                        <Card style={{ padding: '14px 18px', background: 'var(--bg-secondary, #1a1d2e)' }}>
                            <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>
                                🧦 Producción del Día
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                                {(result.resumenAlertas.totalDocenasEstimadas || 0).toLocaleString('es-AR')} doc.
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                {(result.resumenAlertas.totalParesEstimados || 0).toLocaleString('es-AR')} pares ({(result.resumenAlertas.totalMediasEstimadas || 0).toLocaleString('es-AR')} medias)
                            </div>
                        </Card>

                        <Card style={{ padding: '14px 18px', background: 'var(--bg-secondary, #1a1d2e)' }}>
                            <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase' }}>
                                🏭 Máquinas y Cambios 08:00
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#818cf8', marginTop: '4px' }}>
                                {new Set(filteredMaquinas.map((m) => m.machine)).size} máq.
                            </div>
                            <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600, marginTop: '2px' }}>
                                🔄 {result.resumenAlertas.totalCambiosProgramados08AM || 0} cambios a las 08:00 AM
                            </div>
                        </Card>

                        <Card style={{ padding: '14px 18px', background: 'var(--bg-secondary, #1a1d2e)' }}>
                            <div style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase' }}>
                                🧵 Consumo Total Hilado
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#f3f4f6', marginTop: '4px' }}>
                                {(result.resumenAlertas.totalKilosHiladoDia || 0).toLocaleString('es-AR')} kg
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                {filteredMateriales.length} hilados requeridos hoy
                            </div>
                        </Card>

                        <Card style={{ padding: '14px 18px', background: 'var(--bg-secondary, #1a1d2e)' }}>
                            <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
                                📦 A Reponer en Picking
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                                {result.resumenAlertas.totalItemsReponerPicking || 0} hilados
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                Pasar de Reserva a Pos. Picking
                            </div>
                        </Card>

                        <Card
                            style={{
                                padding: '14px 18px',
                                background:
                                    (result.resumenAlertas.totalItemsCriticosComprar || 0) > 0
                                        ? 'rgba(239, 68, 68, 0.12)'
                                        : 'var(--bg-secondary, #1a1d2e)',
                                border:
                                    (result.resumenAlertas.totalItemsCriticosComprar || 0) > 0
                                        ? '1px solid rgba(239, 68, 68, 0.35)'
                                        : undefined,
                            }}
                        >
                            <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 700, textTransform: 'uppercase' }}>
                                🛒 Alertas Compras
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#f87171', marginTop: '4px' }}>
                                {result.resumenAlertas.totalItemsCriticosComprar || 0} críticos
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                Debajo de stock mínimo o faltante
                            </div>
                        </Card>

                        <Card style={{ padding: '14px 18px', background: 'var(--bg-secondary, #1a1d2e)' }}>
                            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                                🟢 Match Catálogo Susi
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                                {result.resumenAlertas.articulosChequeados} / {result.resumenAlertas.totalArticulosDistintos}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                Artículos TEJIDO identificados
                            </div>
                        </Card>
                    </div>

                    {/* Global Filter Bar */}
                    <Card
                        className="no-print"
                        style={{
                            padding: '12px 18px',
                            marginBottom: '20px',
                            border: '1px solid var(--border-color, #2a2d3e)',
                            background: 'var(--bg-secondary, #1a1d2e)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                        }}
                    >
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase' }}>
                                🎯 Filtros:
                            </span>

                            {result.fechas && result.fechas.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>Fecha:</span>
                                    <select
                                        value={selectedFecha}
                                        onChange={(e) => setSelectedFecha(e.target.value)}
                                        style={{
                                            padding: '6px 10px',
                                            background: 'rgba(0,0,0,0.2)',
                                            border: '1px solid var(--border-color, #2a2d3e)',
                                            borderRadius: '6px',
                                            color: 'var(--text-primary, #f3f4f6)',
                                            fontSize: '12px',
                                        }}
                                    >
                                        <option value="ALL">Todas ({result.fechas.join(', ')})</option>
                                        {result.fechas.map((f) => (
                                            <option key={f} value={f}>
                                                {f}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>Turno (12h):</span>
                                <select
                                    value={selectedTurno}
                                    onChange={(e) => setSelectedTurno(e.target.value)}
                                    style={{
                                        padding: '6px 10px',
                                        background: 'rgba(0,0,0,0.2)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        borderRadius: '6px',
                                        color: 'var(--text-primary, #f3f4f6)',
                                        fontSize: '12px',
                                    }}
                                >
                                    <option value="ALL">Ambos Turnos (Mañana y Noche)</option>
                                    <option value="M">☀️ Mañana (06:00 a 18:00)</option>
                                    <option value="N">🌙 Noche (18:00 a 06:00)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>Área:</span>
                                <select
                                    value={selectedArea}
                                    onChange={(e) => setSelectedArea(e.target.value)}
                                    style={{
                                        padding: '6px 10px',
                                        background: 'rgba(0,0,0,0.2)',
                                        border: '1px solid var(--border-color, #2a2d3e)',
                                        borderRadius: '6px',
                                        color: 'var(--text-primary, #f3f4f6)',
                                        fontSize: '12px',
                                    }}
                                >
                                    <option value="ALL">Todas las Áreas (1 a 5)</option>
                                    <option value="1">Área 1 (M1-M22)</option>
                                    <option value="2">Área 2 (M23-M67)</option>
                                    <option value="3">Área 3 (M73-M117)</option>
                                    <option value="4">Área 4 (M126-M170)</option>
                                    <option value="5">Área 5 (M171-M190)</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                            Planilla activa: <strong>{result.fechas.join(', ') || 'Actual'}</strong> ({result.archivosProcesados.length} PDFs)
                        </div>
                    </Card>

                    {/* Navigation Tabs */}
                    <div
                        className="no-print"
                        style={{
                            display: 'flex',
                            gap: '4px',
                            borderBottom: '1px solid var(--border-color, #2a2d3e)',
                            marginBottom: '20px',
                            overflowX: 'auto',
                        }}
                    >
                        {effectiveSector !== 'COMPRAS' && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('picking')}
                                style={{
                                    padding: '10px 18px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'picking' ? '2px solid #38bdf8' : '2px solid transparent',
                                    color: activeTab === 'picking' ? '#38bdf8' : 'var(--text-muted, #9ca3af)',
                                    fontWeight: activeTab === 'picking' ? 700 : 500,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <span>📋 Picking Depósito (Posiciones)</span>
                                <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                                    {filteredHojaPicking.length}
                                </span>
                            </button>
                        )}

                        {effectiveSector !== 'COMPRAS' && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('repartidor')}
                                style={{
                                    padding: '10px 18px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'repartidor' ? '2px solid #10b981' : '2px solid transparent',
                                    color: activeTab === 'repartidor' ? '#34d399' : 'var(--text-muted, #9ca3af)',
                                    fontWeight: activeTab === 'repartidor' ? 700 : 500,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <span>🚚 Hoja para Repartidor (Áreas 1-5)</span>
                                <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                                    {filteredHojaRepartidor.length}
                                </span>
                            </button>
                        )}

                        {effectiveSector !== 'DEPOSITO' && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('materiales')}
                                style={{
                                    padding: '10px 18px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'materiales' ? '2px solid #f87171' : '2px solid transparent',
                                    color: activeTab === 'materiales' ? '#f87171' : 'var(--text-muted, #9ca3af)',
                                    fontWeight: activeTab === 'materiales' ? 700 : 500,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <span>🛒 Balance de Hilados y Faltantes Compras</span>
                                <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                                    {filteredMateriales.length}
                                </span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setActiveTab('sin_estructura')}
                            style={{
                                padding: '10px 18px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'sin_estructura' ? '2px solid #ef4444' : '2px solid transparent',
                                color: activeTab === 'sin_estructura' ? '#f87171' : 'var(--text-muted, #9ca3af)',
                                fontWeight: activeTab === 'sin_estructura' ? 700 : 500,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <span>⚠️ Sin Estructura BOM</span>
                            <span style={{
                                fontSize: '11px',
                                padding: '1px 6px',
                                borderRadius: '10px',
                                background: articulosSinEstructura.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.08)',
                                color: articulosSinEstructura.length > 0 ? '#ef4444' : '#9ca3af',
                                fontWeight: 700,
                            }}>
                                {articulosSinEstructura.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('articulos')}
                            style={{
                                padding: '10px 18px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'articulos' ? '2px solid #6366f1' : '2px solid transparent',
                                color: activeTab === 'articulos' ? '#a5b4fc' : 'var(--text-muted, #9ca3af)',
                                fontWeight: activeTab === 'articulos' ? 700 : 500,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <span>🧦 Artículos y Docenas a Tejer</span>
                            <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)' }}>
                                {filteredArticulos.length}
                            </span>
                        </button>

                        {effectiveSector === 'PRODUCCION' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('maquinas')}
                                    style={{
                                        padding: '10px 18px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderBottom: activeTab === 'maquinas' ? '2px solid #6366f1' : '2px solid transparent',
                                        color: activeTab === 'maquinas' ? '#a5b4fc' : 'var(--text-muted, #9ca3af)',
                                        fontWeight: activeTab === 'maquinas' ? 700 : 500,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <span>🏭 Matriz por Máquina (Cambios 08:00)</span>
                                    <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)' }}>
                                        {new Set(filteredMaquinas.map((m) => m.machine)).size}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('colores')}
                                    style={{
                                        padding: '10px 18px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderBottom: activeTab === 'colores' ? '2px solid #6366f1' : '2px solid transparent',
                                        color: activeTab === 'colores' ? '#a5b4fc' : 'var(--text-muted, #9ca3af)',
                                        fontWeight: activeTab === 'colores' ? 700 : 500,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <span>🎨 Colores</span>
                                    <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)' }}>
                                        {result.colores.length}
                                    </span>
                                </button>
                            </>
                        )}
                    </div>

                    {/* Tab Views */}
                    {activeTab === 'sin_estructura' && (
                        <ArticulosSinEstructuraTab
                            articulos={articulosSinEstructura}
                            onSelectMachine={handleSelectMachineFromTab}
                            onConciliarSusi={(a) => setArticuloConciliar(a)}
                            onRecalcular={handleRecalcular}
                        />
                    )}

                    {activeTab === 'articulos' && (
                        <ArticulosTejidoTab
                            articulos={filteredArticulos}
                            onSelectMachine={handleSelectMachineFromTab}
                            onConciliarSusi={(a) => setArticuloConciliar(a)}
                        />
                    )}

                    {activeTab === 'maquinas' && (
                        <MaquinasTab
                            maquinas={filteredMaquinas}
                            selectedShift={selectedTurno}
                            selectedArea={selectedArea}
                        />
                    )}

                    {activeTab === 'colores' && (
                        <ColoresTab
                            colores={result.colores}
                            onSelectMachine={handleSelectMachineFromTab}
                        />
                    )}

                    {activeTab === 'materiales' && (
                        <MaterialesAsignadosTab
                            materiales={filteredMateriales}
                            onSelectMachine={handleSelectMachineFromTab}
                        />
                    )}

                    {activeTab === 'repartidor' && (
                        <HojaRepartidorTab
                            items={filteredHojaRepartidor}
                            fecha={selectedFecha !== 'ALL' ? selectedFecha : result.fechas.join(', ')}
                            turnos={selectedTurno !== 'ALL' ? [selectedTurno] : result.turnos}
                        />
                    )}

                    {activeTab === 'picking' && (
                        <HojaPickingTab
                            items={filteredHojaPicking}
                            fecha={selectedFecha !== 'ALL' ? selectedFecha : result.fechas.join(', ')}
                            turnos={selectedTurno !== 'ALL' ? [selectedTurno] : result.turnos}
                        />
                    )}
                </div>
            )}
        
            {/* Modal de Conciliacion In-Situ Codigo Susana */}
            <ConciliarSusiModal
                isOpen={!!articuloConciliar}
                onClose={() => setArticuloConciliar(null)}
                articuloSusi={articuloConciliar}
                onSuccess={() => {
                    refetchUltima();
                }}
            />
</div>
    );
}
