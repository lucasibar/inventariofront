import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader, Card, Btn, Badge, Spinner, useIsMobile } from '../../shared/ui';
import {
    useGetUltimaPlanillaProduccionQuery,
    useListarPlanillasProduccionQuery,
    useLazyGetPlanillaProduccionByIdQuery,
    useGetCorteProveedorQuery,
} from '../../features/quality/ordenes-produccion/api/ordenesProduccion.api';
import type { ProduccionParseResult } from '../../features/quality/ordenes-produccion/types/ordenesProduccion.types';

export default function InformeProduccionDepositoPage() {
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Tipo de depósito: HILADO o INSUMO
    const tipo = (searchParams.get('tipo') || 'HILADO').toUpperCase();
    const setTipo = (newTipo: 'HILADO' | 'INSUMO') => {
        setSearchParams({ tipo: newTipo });
    };

    // Consultas de planillas de producción
    const { data: ultimaPlanilla, isLoading: loadingUltima } = useGetUltimaPlanillaProduccionQuery();
    const { data: historialPlanillas = [] } = useListarPlanillasProduccionQuery();
    const [fetchPlanillaById] = useLazyGetPlanillaProduccionByIdQuery();

    const [selectedPlanilla, setSelectedPlanilla] = useState<ProduccionParseResult | null>(null);
    const activePlanilla = selectedPlanilla || ultimaPlanilla;

    const [searchTerm, setSearchTerm] = useState('');
    const [soloAlertasMinimo, setSoloAlertasMinimo] = useState(false);

    // Estado del widget de Corte de Proveedor
    const [corteCategoria, setCorteCategoria] = useState<string>('Algodón Negro');
    const [corteMeses, setCorteMeses] = useState<number>(3);

    const { data: corteData, isFetching: loadingCorte } = useGetCorteProveedorQuery({
        categoria: corteCategoria,
        meses: corteMeses,
    });

    const handleSelectPlanillaHistorica = async (id: string) => {
        if (!id) {
            setSelectedPlanilla(null);
            return;
        }
        try {
            const data = await fetchPlanillaById(id).unwrap();
            if (data) setSelectedPlanilla(data);
        } catch {
            alert('Error al cargar la planilla seleccionada');
        }
    };

    // Filtrar materiales de la planilla activa según tipo (HILADO vs INSUMO) y búsqueda
    const materialesFiltrados = useMemo(() => {
        if (!activePlanilla || !activePlanilla.materiales) return [];

        return activePlanilla.materiales.filter((mat) => {
            const cat = (mat.categoriaNombre || '').toUpperCase();
            const rol = (mat.rol || '').toUpperCase();
            const desc = (mat.descripcion || '').toUpperCase();
            // Clasificación Hilado vs Insumo
            const isHilado = rol === 'HILADO' || cat.includes('HILADO') || cat.includes('ALGODON') || cat.includes('GOMA') || cat.includes('LYCRA') || cat.includes('POLIAMIDA') || desc.includes('HILADO') || mat.unidadPrincipal === 'KG';
            
            if (tipo === 'HILADO' && !isHilado) return false;
            if (tipo === 'INSUMO' && isHilado) return false;

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const matchDesc = mat.descripcion.toLowerCase().includes(term);
                const matchCod = mat.codigoInterno.toLowerCase().includes(term);
                const matchProv = (mat.proveedor || '').toLowerCase().includes(term);
                if (!matchDesc && !matchCod && !matchProv) return false;
            }

            if (soloAlertasMinimo) {
                const stockDepo = Number(mat.stockEnReservaKg || 0);
                const stockMin = Number(mat.stockMinimoKg || 0);
                if (stockDepo >= stockMin || stockMin === 0) return false;
            }

            return true;
        });
    }, [activePlanilla, tipo, searchTerm, soloAlertasMinimo]);

    // Totales rápidos
    const totalKilos = useMemo(() => {
        return materialesFiltrados.reduce((acc, m) => acc + (m.consumoTotalKg || 0), 0);
    }, [materialesFiltrados]);

    const totalConos = useMemo(() => {
        return materialesFiltrados.reduce((acc, m) => acc + (m.conosTotales || 0), 0);
    }, [materialesFiltrados]);

    const itemsBajoMinimo = useMemo(() => {
        return materialesFiltrados.filter((m) => {
            const stockDepo = Number(m.stockEnReservaKg || 0);
            const stockMin = Number(m.stockMinimoKg || 0);
            return stockMin > 0 && stockDepo < stockMin;
        }).length;
    }, [materialesFiltrados]);

    if (loadingUltima && !activePlanilla) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#9ca3af' }}>
                <Spinner /> <span style={{ marginLeft: '12px' }}>Cargando informe de producción para Depósito...</span>
            </div>
        );
    }

    return (
        <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '1600px', margin: '0 auto' }}>
            {/* Encabezado y Selector de Depósito */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <PageHeader
                    title={tipo === 'HILADO' ? '🧶 Informe de Necesidad Diaria — Depósito de Hilados' : '📦 Informe de Necesidad Diaria — Depósito de Insumos'}
                    subtitle="Control de abastecimiento diario para tejeduría: Kilos, Conos, Picking, Depósito General y Alertas de Stock Mínimo"
                />

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Botones de navegación entre Hilado e Insumo */}
                    <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <button
                            onClick={() => setTipo('HILADO')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '13px',
                                transition: 'all 0.2s',
                                background: tipo === 'HILADO' ? '#f59e0b' : 'transparent',
                                color: tipo === 'HILADO' ? '#111827' : '#9ca3af',
                            }}
                        >
                            🧶 Depósito de Hilados
                        </button>
                        <button
                            onClick={() => setTipo('INSUMO')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '13px',
                                transition: 'all 0.2s',
                                background: tipo === 'INSUMO' ? '#ec4899' : 'transparent',
                                color: tipo === 'INSUMO' ? '#ffffff' : '#9ca3af',
                            }}
                        >
                            📦 Depósito de Insumos
                        </button>
                    </div>

                    {/* Selector de Planilla / Historial */}
                    <div style={{ minWidth: '220px' }}>
                        <select
                            value={activePlanilla?.planillaId || ''}
                            onChange={(e) => handleSelectPlanillaHistorica(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '9px 12px',
                                background: 'var(--bg-secondary, #1a1d2e)',
                                border: '1px solid var(--border-color, #2a2d3e)',
                                borderRadius: '8px',
                                color: '#f3f4f6',
                                fontSize: '13px',
                                outline: 'none',
                            }}
                        >
                            <option value="">📅 Último informe del día (Default)</option>
                            {historialPlanillas.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                    {p.fecha} ({new Date(p.creado_en).toLocaleDateString('es-AR')})
                                </option>
                            ))}
                        </select>
                    </div>

                    <Btn variant="secondary" onClick={() => navigate('/produccion/planificacion')}>
                        ← Carga de Producción
                    </Btn>
                </div>
            </div>

            {/* KPI Cards de Resumen */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                <Card style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
                        ⚖️ Kilos Necesarios Hoy
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b', marginTop: '6px' }}>
                        {totalKilos.toLocaleString('es-AR', { maximumFractionDigits: 1 })} kg
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        {materialesFiltrados.length} materiales requeridos para la producción
                    </div>
                </Card>

                <Card style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                    <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>
                        🧵 Conos Estimados
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#60a5fa', marginTop: '6px' }}>
                        {totalConos.toLocaleString('es-AR')} conos
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        Calculado con el peso nominal por cono de cada ítem
                    </div>
                </Card>

                <Card style={{ padding: '16px', background: itemsBajoMinimo > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.08)', border: itemsBajoMinimo > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <div style={{ fontSize: '12px', color: itemsBajoMinimo > 0 ? '#ef4444' : '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                        {itemsBajoMinimo > 0 ? '🚨 Alertas Stock Mínimo Depósito' : '✅ Stock Depósito OK'}
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: itemsBajoMinimo > 0 ? '#ef4444' : '#10b981', marginTop: '6px' }}>
                        {itemsBajoMinimo} {itemsBajoMinimo === 1 ? 'material bajo mínimo' : 'materiales bajo mínimo'}
                    </div>
                    <div style={{ fontSize: '11px', color: itemsBajoMinimo > 0 ? '#fca5a5' : '#9ca3af', marginTop: '4px' }}>
                        {itemsBajoMinimo > 0 ? 'Filas resaltadas en rojo en la tabla' : 'Todos los materiales superan el stock mínimo'}
                    </div>
                </Card>

                <Card style={{ padding: '16px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                    <div style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase' }}>
                        📅 Planilla Activa
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#f3f4f6', marginTop: '6px' }}>
                        {activePlanilla?.fechas?.[0] || 'Planilla Diaria'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        {activePlanilla?.archivosProcesados?.length || 0} archivos analizados
                    </div>
                </Card>
            </div>

            {/* SECCIÓN DEL PRÓXIMO CORTE DE PROVEEDOR */}
            {tipo === 'HILADO' && (
                <Card style={{ marginBottom: '24px', padding: '20px', border: '1px solid rgba(139, 92, 246, 0.35)', background: 'linear-gradient(180deg, rgba(30, 27, 75, 0.4) 0%, rgba(15, 17, 23, 0.8) 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '20px' }}>⏳</span>
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#c4b5fd' }}>
                                    Ventanita de Seguimiento: Próximo Corte de Proveedor
                                </h3>
                                <Badge color="#8b5cf6">Proyección por Prioridades</Badge>
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                Monitoreo inteligente para categorías críticas de hilado (Algodón, Goma, Lycra). Avisa cuándo se agota el material del proveedor actual (Prioridad 1) y salta al próximo (Prioridad 2).
                            </div>
                        </div>

                        {/* Selectores de Categoría y Meses Históricos */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                                    Categoría de Material:
                                </label>
                                <select
                                    value={corteCategoria}
                                    onChange={(e) => setCorteCategoria(e.target.value)}
                                    style={{
                                        padding: '7px 12px',
                                        background: '#1a1d2e',
                                        border: '1px solid #4338ca',
                                        borderRadius: '8px',
                                        color: '#ffffff',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        outline: 'none',
                                    }}
                                >
                                    {(corteData?.categoriasDisponibles || [
                                        'Algodón Blanco',
                                        'Algodón Negro',
                                        'Goma Blanca',
                                        'Goma Negra',
                                        'Lycra Blanca',
                                        'Lycra Negra',
                                        'Poliamida Cruda',
                                        'Poliamida Negra',
                                    ]).map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                                    Histórico de Consumo:
                                </label>
                                <select
                                    value={corteMeses}
                                    onChange={(e) => setCorteMeses(Number(e.target.value))}
                                    style={{
                                        padding: '7px 12px',
                                        background: '#1a1d2e',
                                        border: '1px solid #4338ca',
                                        borderRadius: '8px',
                                        color: '#ffffff',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        outline: 'none',
                                    }}
                                >
                                    <option value={1}>Último 1 mes</option>
                                    <option value={2}>Últimos 2 meses</option>
                                    <option value={3}>Últimos 3 meses (Recomendado)</option>
                                    <option value={4}>Últimos 4 meses</option>
                                    <option value={5}>Últimos 5 meses</option>
                                    <option value={6}>Últimos 6 meses</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Banner de Estado del Corte */}
                    {loadingCorte ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
                            <Spinner /> Calculando proyección de corte de proveedor...
                        </div>
                    ) : corteData ? (
                        <div>
                            <div
                                style={{
                                    padding: '14px 18px',
                                    borderRadius: '10px',
                                    background: corteData.alertaCritica ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                                    border: corteData.alertaCritica ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(59, 130, 246, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '12px',
                                    marginBottom: '16px',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '24px' }}>{corteData.alertaCritica ? '🚨' : 'ℹ️'}</span>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: corteData.alertaCritica ? '#fca5a5' : '#93c5fd' }}>
                                            {corteData.mensajeCorte}
                                        </div>
                                        {corteData.fechaProyectadaCorte && (
                                            <div style={{ fontSize: '12px', color: '#d1d5db', marginTop: '2px' }}>
                                                📅 Fecha proyectada de cambio de proveedor: <strong>{corteData.fechaProyectadaCorte}</strong> (en base al consumo diario histórico de {corteData.materialActual?.consumoPromedioDiarioKg || 0} kg/día)
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {corteData.diasParaCorte !== null && (
                                    <div style={{ textAlign: 'right', padding: '6px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>Tiempo hasta corte</div>
                                        <div style={{ fontSize: '20px', fontWeight: 800, color: corteData.diasParaCorte <= 7 ? '#ef4444' : '#34d399' }}>
                                            {corteData.diasParaCorte === 0 ? '¡CORTE HOY!' : `${corteData.diasParaCorte} días`}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Cadena de Materiales y Prioridades */}
                            {corteData.cadenaPrioridades && corteData.cadenaPrioridades.length > 0 ? (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                                                <th style={{ padding: '8px 10px' }}>Orden Prioridad</th>
                                                <th style={{ padding: '8px 10px' }}>Material / Código</th>
                                                <th style={{ padding: '8px 10px' }}>Proveedor</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Stock Principal (Picking)</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Stock Depósito</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Stock Total</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Consumo Prom. Diario</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Días de Stock Restante</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {corteData.cadenaPrioridades.map((item: any, idx: number) => {
                                                const esActual = idx === 0;
                                                const esSiguiente = idx === 1;
                                                const agotado = item.stockTotalKg <= 0;

                                                return (
                                                    <tr
                                                        key={item.itemId || idx}
                                                        style={{
                                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                            background: esActual
                                                                ? 'rgba(139, 92, 246, 0.12)'
                                                                : esSiguiente
                                                                ? 'rgba(59, 130, 246, 0.06)'
                                                                : 'transparent',
                                                        }}
                                                    >
                                                        <td style={{ padding: '10px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span
                                                                    style={{
                                                                        display: 'inline-block',
                                                                        width: '22px',
                                                                        height: '22px',
                                                                        borderRadius: '50%',
                                                                        textAlign: 'center',
                                                                        lineHeight: '22px',
                                                                        fontWeight: 800,
                                                                        fontSize: '11px',
                                                                        background: esActual ? '#8b5cf6' : '#374151',
                                                                        color: '#ffffff',
                                                                    }}
                                                                >
                                                                    {item.ordenPrioridad}
                                                                </span>
                                                                {esActual && <span style={{ fontSize: '11px', color: '#c4b5fd', fontWeight: 700 }}>★ ACTIVO</span>}
                                                                {esSiguiente && <span style={{ fontSize: '11px', color: '#60a5fa' }}>➜ SIGUIENTE</span>}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px', fontWeight: 600, color: '#f3f4f6' }}>
                                                            <div>{item.descripcion}</div>
                                                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>{item.codigo}</div>
                                                        </td>
                                                        <td style={{ padding: '10px', color: '#d1d5db' }}>
                                                            {item.proveedor}
                                                        </td>
                                                        <td style={{ padding: '10px', textAlign: 'right', color: '#60a5fa', fontWeight: 600 }}>
                                                            {item.stockPickingKg.toLocaleString('es-AR')} kg
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding: '10px',
                                                                textAlign: 'right',
                                                                color: item.alertaMinimo ? '#ef4444' : '#9ca3af',
                                                                fontWeight: item.alertaMinimo ? 700 : 400,
                                                            }}
                                                        >
                                                            {item.stockDepositoKg.toLocaleString('es-AR')} kg
                                                            {item.alertaMinimo && <span style={{ display: 'block', fontSize: '10px', color: '#ef4444' }}>⚠️ Menor a mín ({item.stockMinimo} kg)</span>}
                                                        </td>
                                                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: agotado ? '#ef4444' : '#f3f4f6' }}>
                                                            {item.stockTotalKg.toLocaleString('es-AR')} kg
                                                        </td>
                                                        <td style={{ padding: '10px', textAlign: 'right', color: '#9ca3af' }}>
                                                            {item.consumoPromedioDiarioKg} kg/día
                                                        </td>
                                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                                            {item.diasRestantes !== null ? (
                                                                <span
                                                                    style={{
                                                                        padding: '4px 8px',
                                                                        borderRadius: '6px',
                                                                        fontSize: '11px',
                                                                        fontWeight: 700,
                                                                        background: item.diasRestantes <= 7 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.15)',
                                                                        color: item.diasRestantes <= 7 ? '#fca5a5' : '#6ee7b7',
                                                                    }}
                                                                >
                                                                    {item.diasRestantes} días
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#6b7280' }}>—</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                                            {agotado ? (
                                                                <Badge color="#ef4444">AGOTADO</Badge>
                                                            ) : esActual ? (
                                                                <Badge color="#8b5cf6">EN CONSUMO</Badge>
                                                            ) : (
                                                                <Badge color="#3b82f6">EN ESPERA</Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ padding: '14px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                                    No hay materiales asociados en orden de prioridad para la categoría {corteCategoria}. Podés vincularlos desde Catálogo de Artículos en Desarrollo.
                                </div>
                            )}
                        </div>
                    ) : null}
                </Card>
            )}

            {/* TABLA PRINCIPAL DE NECESIDADES DIARIAS */}
            <Card style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f3f4f6' }}>
                            📋 Listado de {tipo === 'HILADO' ? 'Hilados' : 'Insumos'} Requeridos ({materialesFiltrados.length})
                        </h3>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                            Verificá las cantidades en Principal (Picking) y Depósito General antes del inicio de turno
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            placeholder="Buscar material o proveedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '7px 12px',
                                background: '#1a1d2e',
                                border: '1px solid #2a2d3e',
                                borderRadius: '8px',
                                color: '#f3f4f6',
                                fontSize: '12px',
                                minWidth: '220px',
                                outline: 'none',
                            }}
                        />

                        <button
                            onClick={() => setSoloAlertasMinimo(!soloAlertasMinimo)}
                            style={{
                                padding: '7px 12px',
                                borderRadius: '8px',
                                border: soloAlertasMinimo ? '1px solid #ef4444' : '1px solid #374151',
                                background: soloAlertasMinimo ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                                color: soloAlertasMinimo ? '#fca5a5' : '#9ca3af',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600,
                            }}
                        >
                            {soloAlertasMinimo ? '🔴 Solo Bajo Mínimo' : 'Todos'}
                        </button>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                                <th style={{ padding: '10px' }}>Código</th>
                                <th style={{ padding: '10px' }}>Material / Descripción</th>
                                <th style={{ padding: '10px' }}>Proveedor</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Kilos Necesarios</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Conos Necesarios</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>En Principal (Picking)</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>En Depósito</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Stock Mínimo</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>Estado Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            {materialesFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af' }}>
                                        No se encontraron requerimientos de {tipo.toLowerCase()} para los filtros aplicados.
                                    </td>
                                </tr>
                            ) : (
                                materialesFiltrados.map((mat) => {
                                    const kilos = mat.consumoTotalKg || 0;
                                    const conos = mat.conosTotales || 0;
                                    const enPicking = mat.stockEnPickingKg || 0;
                                    const enDeposito = mat.stockEnReservaKg || 0;
                                    const stockMin = mat.stockMinimoKg || 0;

                                    // Regla solicitada por el usuario:
                                    // Si la cantidad en depósito tiene un stock menor al que se le puso como stock mínimo -> PINTAR EN ROJO
                                    const bajoMinimo = stockMin > 0 && enDeposito < stockMin;

                                    return (
                                        <tr
                                            key={mat.itemId || mat.codigoInterno}
                                            style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                background: bajoMinimo ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                                                transition: 'background-color 0.15s',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!bajoMinimo) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!bajoMinimo) e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <td style={{ padding: '12px 10px', fontWeight: 700, color: bajoMinimo ? '#fca5a5' : '#60a5fa' }}>
                                                {mat.codigoInterno}
                                            </td>
                                            <td style={{ padding: '12px 10px', color: '#f3f4f6', maxWidth: '320px' }}>
                                                <div style={{ fontWeight: 600 }}>{mat.descripcion}</div>
                                                {mat.categoriaNombre && (
                                                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{mat.categoriaNombre}</div>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 10px', color: '#d1d5db' }}>
                                                {mat.proveedor || '—'}
                                            </td>
                                            <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800, color: '#f59e0b', fontSize: '14px' }}>
                                                {kilos.toLocaleString('es-AR', { maximumFractionDigits: 1 })} kg
                                            </td>
                                            <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: '#60a5fa' }}>
                                                {conos.toLocaleString('es-AR')}
                                            </td>
                                            <td style={{ padding: '12px 10px', textAlign: 'right', color: '#34d399', fontWeight: 700 }}>
                                                {enPicking.toLocaleString('es-AR')} kg
                                                {mat.posicionesPickingSugeridas?.[0] && (
                                                    <span style={{ display: 'block', fontSize: '10px', color: '#9ca3af' }}>
                                                        📍 {mat.posicionesPickingSugeridas[0]}
                                                    </span>
                                                )}
                                            </td>
                                            <td
                                                style={{
                                                    padding: '12px 10px',
                                                    textAlign: 'right',
                                                    fontWeight: bajoMinimo ? 800 : 600,
                                                    color: bajoMinimo ? '#ef4444' : '#f3f4f6',
                                                    fontSize: bajoMinimo ? '14px' : '13px',
                                                }}
                                            >
                                                {enDeposito.toLocaleString('es-AR')} kg
                                                {bajoMinimo && (
                                                    <span style={{ display: 'block', fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>
                                                        🚨 MENOR AL MÍNIMO
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 10px', textAlign: 'right', color: '#9ca3af' }}>
                                                {stockMin > 0 ? `${stockMin.toLocaleString('es-AR')} kg` : '—'}
                                            </td>
                                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                {bajoMinimo ? (
                                                    <Badge color="#ef4444">BAJO MÍNIMO</Badge>
                                                ) : enPicking >= kilos ? (
                                                    <Badge color="#10b981">PICKING OK</Badge>
                                                ) : (
                                                    <Badge color="#f59e0b">REPONER PICKING</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
