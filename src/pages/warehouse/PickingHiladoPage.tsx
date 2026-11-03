import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Btn, Spinner, useIsMobile } from '../../shared/ui';
import {
    useGetUltimaPlanillaProduccionQuery,
    useListarPlanillasProduccionQuery,
    useLazyGetPlanillaProduccionByIdQuery,
    useRecalcularPlanillaMutation,
} from '../../features/quality/ordenes-produccion/api/ordenesProduccion.api';
import type { ProduccionParseResult } from '../../features/quality/ordenes-produccion/types/ordenesProduccion.types';
import { exportHojaPickingToExcel } from '../../features/quality/ordenes-produccion/utils/excelExport';

export default function PickingHiladoPage() {
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    // 1. Planillas de Producción
    const { data: ultimaPlanilla, isLoading: loadingPlanilla } = useGetUltimaPlanillaProduccionQuery();
    const { data: historialPlanillas = [] } = useListarPlanillasProduccionQuery();
    const [fetchPlanillaById] = useLazyGetPlanillaProduccionByIdQuery();
    const [recalcular, { isLoading: isRecalculating }] = useRecalcularPlanillaMutation();

    const [selectedPlanilla, setSelectedPlanilla] = useState<ProduccionParseResult | null>(null);
    const activePlanilla = selectedPlanilla || ultimaPlanilla;

    const [searchQuery, setSearchQuery] = useState('');
    const [filtroEstadoPicking, setFiltroEstadoPicking] = useState<'ALL' | 'BAJAR' | 'FALTANTE' | 'OK'>('ALL');

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

    const handleRecalcular = async () => {
        if (!activePlanilla?.planillaId) return;
        try {
            const res = await recalcular(activePlanilla.planillaId).unwrap();
            if (res) {
                setSelectedPlanilla(res);
                alert('Vale de picking recalculado exitosamente con el stock actual.');
            }
        } catch (err: any) {
            alert('Error al recalcular: ' + (err?.data?.message || err?.message || 'Error desconocido'));
        }
    };

    // 2. Extraer hilados para el Picking
    const itemsPicking = useMemo(() => {
        if (!activePlanilla) return [];

        if (activePlanilla.hojaPicking && activePlanilla.hojaPicking.length > 0) {
            return activePlanilla.hojaPicking;
        }

        if (activePlanilla.materiales && activePlanilla.materiales.length > 0) {
            return activePlanilla.materiales
                .filter((m) => {
                    const cat = (m.categoriaNombre || '').toUpperCase();
                    const rol = (m.rol || '').toUpperCase();
                    const desc = (m.descripcion || '').toUpperCase();
                    return (
                        rol === 'HILADO' ||
                        cat.includes('HILADO') ||
                        cat.includes('ALGODON') ||
                        cat.includes('GOMA') ||
                        cat.includes('LYCRA') ||
                        cat.includes('POLIAMIDA') ||
                        cat.includes('NYLON') ||
                        cat.includes('POLYSOFT') ||
                        desc.includes('HILADO') ||
                        m.unidadPrincipal === 'KG'
                    );
                })
                .map((m) => {
                    const consumo = Number(m.consumoTotalKg) || 0;
                    const picking = Number(m.stockEnPickingKg) || 0;
                    const reserva = Number(m.stockEnReservaKg) || 0;
                    const aPasar = Number(m.aPasarAPickingKg) || Math.max(0, Math.min(reserva, consumo - picking));
                    const total = Number(m.stockActualTotalKg) || (picking + reserva);

                    let estadoAbast: 'OK' | 'BAJAR_A_PICKING' | 'CRITICO_COMPRAR' = 'OK';
                    if (total < consumo) {
                        estadoAbast = 'CRITICO_COMPRAR';
                    } else if (picking < consumo) {
                        estadoAbast = 'BAJAR_A_PICKING';
                    }

                    return {
                        codigoMaterial: m.codigoInterno,
                        descripcionMaterial: m.descripcion,
                        categoriaNombre: m.categoriaNombre || 'HILADO',
                        rol: m.rol || 'HILADO',
                        tono: m.tono || '',
                        colorNombre: m.colorNombre || '',
                        proveedor: m.proveedor || '',
                        consumoDiaKg: consumo,
                        conosNecesarios: m.conosTotales || Math.ceil(consumo / 1.5),
                        stockEnPickingKg: picking,
                        stockEnReservaKg: reserva,
                        aPasarAPickingKg: aPasar,
                        posicionesPickingSugeridas: m.posicionesPickingSugeridas || [],
                        posicionesStockReserva: [],
                        stockRestanteTotalKg: Math.max(0, total - consumo),
                        aComprarKg: Math.max(0, consumo - total),
                        estadoAbastecimiento: estadoAbast,
                        maquinasCount: m.maquinasCount || 0,
                        maquinas: m.maquinas || [],
                        areas: [],
                        articulos: (m.articulosAsignados || []).map((a) => a.codigoArticulo),
                    };
                });
        }

        return [];
    }, [activePlanilla]);

    // 3. Filtrar
    const filteredPicking = useMemo(() => {
        return itemsPicking.filter((it: any) => {
            if (filtroEstadoPicking === 'BAJAR') {
                if (it.aPasarAPickingKg <= 0 && it.estadoAbastecimiento !== 'BAJAR_A_PICKING') return false;
            } else if (filtroEstadoPicking === 'FALTANTE') {
                if (it.estadoAbastecimiento !== 'CRITICO_COMPRAR' && (it.aComprarKg || 0) <= 0) return false;
            } else if (filtroEstadoPicking === 'OK') {
                if (it.estadoAbastecimiento !== 'OK' && it.aPasarAPickingKg > 0) return false;
            }

            if (searchQuery.trim()) {
                const term = searchQuery.toLowerCase();
                const matchCod = (it.codigoMaterial || '').toLowerCase().includes(term);
                const matchDesc = (it.descripcionMaterial || '').toLowerCase().includes(term);
                const matchTono = (it.tono || it.colorNombre || '').toLowerCase().includes(term);
                const matchArt = (it.articulos || []).some((a: string) => a.toLowerCase().includes(term));
                if (!matchCod && !matchDesc && !matchTono && !matchArt) return false;
            }

            return true;
        });
    }, [itemsPicking, filtroEstadoPicking, searchQuery]);

    // 4. Métricas de Picking
    const statsPicking = useMemo(() => {
        let requierenBajar = 0;
        let kilosABajarTotal = 0;
        let cubiertosEnPicking = 0;
        let faltantesCriticos = 0;
        let totalKilosConsumo = 0;

        itemsPicking.forEach((it: any) => {
            totalKilosConsumo += Number(it.consumoDiaKg) || 0;
            if (it.estadoAbastecimiento === 'CRITICO_COMPRAR' || (it.aComprarKg || 0) > 0) {
                faltantesCriticos++;
            } else if (it.estadoAbastecimiento === 'BAJAR_A_PICKING' || (it.aPasarAPickingKg || 0) > 0) {
                requierenBajar++;
                kilosABajarTotal += Number(it.aPasarAPickingKg) || 0;
            } else {
                cubiertosEnPicking++;
            }
        });

        return {
            requierenBajar,
            kilosABajarTotal: Math.round(kilosABajarTotal * 10) / 10,
            cubiertosEnPicking,
            faltantesCriticos,
            totalKilosConsumo: Math.round(totalKilosConsumo * 10) / 10,
        };
    }, [itemsPicking]);

    const handlePrint = () => {
        window.print();
    };

    const handleExportExcel = () => {
        exportHojaPickingToExcel(filteredPicking as any, `picking_hilados_${activePlanilla?.fechas?.[0] || 'dia'}.xlsx`);
    };

    if (loadingPlanilla && !activePlanilla) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#9ca3af' }}>
                <Spinner /> <span style={{ marginLeft: '12px' }}>Cargando hoja de picking para Depósito...</span>
            </div>
        );
    }

    return (
        <div style={{ padding: isMobile ? '12px' : '20px', maxWidth: '1600px', margin: '0 auto' }}>
            {/* CSS para impresión en papel del vale */}
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    .printable-content, .printable-content * { visibility: visible !important; }
                    .printable-content {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                    }
                    .no-print { display: none !important; }
                    table { border-collapse: collapse !important; width: 100% !important; font-size: 11px !important; }
                    th, td { border: 1px solid #ddd !important; padding: 6px !important; color: #000 !important; }
                    th { background-color: #f3f4f6 !important; font-weight: bold !important; }
                }
            `}</style>

            {/* ENCABEZADO Y CONTROLES */}
            <div
                className="no-print"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '14px',
                    marginBottom: '18px',
                }}
            >
                <PageHeader
                    title="🧶 Picking de Hilados para Producción"
                    subtitle="Vale diario de abastecimiento a tejeduría: Kilos y conos requeridos para transferir de Reserva a Picking"
                />

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Selector de Planilla */}
                    <select
                        value={(selectedPlanilla as any)?.id || selectedPlanilla?.planillaId || ''}
                        onChange={(e) => handleSelectPlanillaHistorica(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            background: 'var(--bg-secondary, #1a1d2e)',
                            border: '1px solid var(--border-color, #2a2d3e)',
                            borderRadius: '8px',
                            color: '#f3f4f6',
                            fontSize: '13px',
                            outline: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <option value="">📅 Planilla del día (Última procesada)</option>
                        {historialPlanillas.map((p: any) => (
                            <option key={p.id} value={p.id}>
                                Planilla: {p.fecha} ({new Date(p.creado_en).toLocaleDateString('es-AR')})
                            </option>
                        ))}
                    </select>

                    {activePlanilla && (
                        <Btn
                            variant="secondary"
                            onClick={handleRecalcular}
                            disabled={isRecalculating}
                            style={{ fontSize: '13px' }}
                        >
                            {isRecalculating ? 'Recalculando...' : '🔄 Recalcular con Stock Actual'}
                        </Btn>
                    )}

                    <Btn
                        variant="secondary"
                        onClick={handlePrint}
                        style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span>🖨️</span> Imprimir Vale
                    </Btn>

                    <Btn
                        variant="secondary"
                        onClick={handleExportExcel}
                        style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span>📥</span> Excel
                    </Btn>
                </div>
            </div>

            {/* AVISO SI NO HAY PLANILLA ACTIVA */}
            {!activePlanilla && (
                <Card style={{ padding: '40px 20px', textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '42px', marginBottom: '12px' }}>📋</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#f3f4f6' }}>
                        No hay planilla de producción cargada para hoy
                    </h3>
                    <p style={{ fontSize: '13px', color: '#9ca3af', maxWidth: '520px', margin: '0 auto 16px auto' }}>
                        El sector de producción aún no ha procesado las órdenes del día. Podés seleccionar una planilla histórica en el desplegable superior o revisar el stock general.
                    </p>
                    <Btn onClick={() => navigate('/stock')} style={{ background: '#6366f1', color: '#fff', fontSize: '13px' }}>
                        Ver Stock General ↗️
                    </Btn>
                </Card>
            )}

            {activePlanilla && (
                <>
                    {/* 4 TARJETAS KPI DE PICKING (Paleta: Verde #10b981, Amarillo #f59e0b, Rojo #ef4444, Celeste #38bdf8) */}
                    <div
                        className="no-print"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '14px',
                            marginBottom: '18px',
                        }}
                    >
                        {/* KPI 1: Consumo Total Hilado */}
                        <Card style={{ padding: '16px 18px', background: 'var(--bg-secondary, #1a1d2e)', border: '1px solid var(--border-color, #2a2d3e)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
                                    🧶 Consumo Total Tejeduría
                                </span>
                                <span style={{ fontSize: '11px', color: '#9ca3af' }}>24 Horas</span>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: 800, color: '#f3f4f6', marginTop: '6px' }}>
                                {statsPicking.totalKilosConsumo.toLocaleString('es-AR')} kg
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                {itemsPicking.length} hilados programados
                            </div>
                        </Card>

                        {/* KPI 2: A Bajar a Picking */}
                        <Card
                            onClick={() => setFiltroEstadoPicking(filtroEstadoPicking === 'BAJAR' ? 'ALL' : 'BAJAR')}
                            style={{
                                padding: '16px 18px',
                                background: statsPicking.requierenBajar > 0 ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-secondary, #1a1d2e)',
                                border: statsPicking.requierenBajar > 0 ? '1px solid #f59e0b' : '1px solid var(--border-color, #2a2d3e)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
                                    ⚡ Requiere Bajar a Picking
                                </span>
                                <span style={{ fontSize: '11px', color: '#f59e0b' }}>
                                    {filtroEstadoPicking === 'BAJAR' ? '● Filtrado' : 'Filtrar'}
                                </span>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b', marginTop: '6px' }}>
                                {statsPicking.requierenBajar} hilados
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                Transferir <strong>+{statsPicking.kilosABajarTotal} kg</strong> de Reserva a Picking
                            </div>
                        </Card>

                        {/* KPI 3: Faltante Crítico */}
                        <Card
                            onClick={() => setFiltroEstadoPicking(filtroEstadoPicking === 'FALTANTE' ? 'ALL' : 'FALTANTE')}
                            style={{
                                padding: '16px 18px',
                                background: statsPicking.faltantesCriticos > 0 ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary, #1a1d2e)',
                                border: statsPicking.faltantesCriticos > 0 ? '1px solid #ef4444' : '1px solid var(--border-color, #2a2d3e)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>
                                    🚨 Faltante Crítico en Planta
                                </span>
                                <span style={{ fontSize: '11px', color: '#ef4444' }}>
                                    {filtroEstadoPicking === 'FALTANTE' ? '● Filtrado' : 'Filtrar'}
                                </span>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: 800, color: statsPicking.faltantesCriticos > 0 ? '#ef4444' : '#10b981', marginTop: '6px' }}>
                                {statsPicking.faltantesCriticos} hilados
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                {statsPicking.faltantesCriticos > 0 ? 'Sin stock suficiente ni en Reserva' : 'Stock total cubierto'}
                            </div>
                        </Card>

                        {/* KPI 4: Cubiertos en Picking */}
                        <Card
                            onClick={() => setFiltroEstadoPicking(filtroEstadoPicking === 'OK' ? 'ALL' : 'OK')}
                            style={{
                                padding: '16px 18px',
                                background: 'var(--bg-secondary, #1a1d2e)',
                                border: filtroEstadoPicking === 'OK' ? '1px solid #10b981' : '1px solid var(--border-color, #2a2d3e)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                                    🟢 Cubiertos en Piso
                                </span>
                                <span style={{ fontSize: '11px', color: '#10b981' }}>
                                    {filtroEstadoPicking === 'OK' ? '● Filtrado' : 'Filtrar'}
                                </span>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
                                {statsPicking.cubiertosEnPicking} hilados
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                Stock en rack de piso listo para tejeduría
                            </div>
                        </Card>
                    </div>

                    {/* BARRA DE BÚSQUEDA Y FILTRO */}
                    <div
                        className="no-print"
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px',
                            marginBottom: '14px',
                        }}
                    >
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                            <input
                                type="text"
                                placeholder="🔍 Buscar por código, descripción, tono o artículo..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    padding: '8px 14px',
                                    background: 'var(--bg-secondary, #1a1d2e)',
                                    border: '1px solid var(--border-color, #2a2d3e)',
                                    borderRadius: '8px',
                                    color: '#f3f4f6',
                                    fontSize: '13px',
                                    minWidth: isMobile ? '100%' : '320px',
                                    outline: 'none',
                                }}
                            />

                            <select
                                value={filtroEstadoPicking}
                                onChange={(e) => setFiltroEstadoPicking(e.target.value as any)}
                                style={{
                                    padding: '8px 12px',
                                    background: 'var(--bg-secondary, #1a1d2e)',
                                    border: '1px solid var(--border-color, #2a2d3e)',
                                    borderRadius: '8px',
                                    color: '#f3f4f6',
                                    fontSize: '13px',
                                    outline: 'none',
                                }}
                            >
                                <option value="ALL">Todos los Estados ({itemsPicking.length})</option>
                                <option value="BAJAR">⚡ Requiere Bajar a Picking ({statsPicking.requierenBajar})</option>
                                <option value="FALTANTE">🚨 Faltante Crítico Compra ({statsPicking.faltantesCriticos})</option>
                                <option value="OK">🟢 Cubiertos en Picking ({statsPicking.cubiertosEnPicking})</option>
                            </select>

                            {filtroEstadoPicking !== 'ALL' && (
                                <button
                                    onClick={() => setFiltroEstadoPicking('ALL')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#38bdf8',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        textDecoration: 'underline',
                                    }}
                                >
                                    Limpiar filtro
                                </button>
                            )}
                        </div>

                        <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                            Mostrando <strong style={{ color: '#f3f4f6' }}>{filteredPicking.length}</strong> de {itemsPicking.length} hilados
                        </div>
                    </div>

                    {/* TABLA PRINCIPAL DE PICKING */}
                    <div className="printable-content">
                        <Card style={{ padding: '0px', overflow: 'hidden', border: '1px solid var(--border-color, #2a2d3e)' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #2a2d3e)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#f3f4f6' }}>
                                        🧶 Hilados Requeridos para Armar Zona de Picking
                                    </h3>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                        Kilos y conos a bajar desde Reserva (Depósito central) al rack de piso de Tejeduría
                                    </div>
                                </div>
                                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                    Consumo total día: <strong style={{ color: '#f3f4f6' }}>{statsPicking.totalKilosConsumo} kg</strong>
                                </div>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color, #2a2d3e)', color: '#9ca3af' }}>
                                            <th style={{ padding: '12px 16px' }}>Estado Cobertura</th>
                                            <th style={{ padding: '12px 16px' }}>Código Hilado</th>
                                            <th style={{ padding: '12px 16px' }}>Descripción / Tono</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Consumo Día</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Stock en Picking</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Stock Reserva</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', color: '#f59e0b' }}>A Bajar a Picking</th>
                                            <th style={{ padding: '12px 16px' }}>Posición Rack</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center' }}>Máquinas</th>
                                            <th className="no-print" style={{ padding: '12px 16px', textAlign: 'center' }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPicking.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af' }}>
                                                    No se encontraron hilados con los filtros seleccionados.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredPicking.map((item: any, idx: number) => {
                                                const esCritico = item.estadoAbastecimiento === 'CRITICO_COMPRAR' || (item.aComprarKg || 0) > 0;
                                                const esBajar = item.estadoAbastecimiento === 'BAJAR_A_PICKING' || (item.aPasarAPickingKg || 0) > 0;

                                                return (
                                                    <tr
                                                        key={item.codigoMaterial + idx}
                                                        style={{
                                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                            background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                                                        }}
                                                    >
                                                        <td style={{ padding: '12px 16px' }}>
                                                            {esCritico ? (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#ef4444', fontWeight: 700, fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                                                                    🚨 Faltante ({item.aComprarKg || 0} kg)
                                                                </span>
                                                            ) : esBajar ? (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#f59e0b', fontWeight: 700, fontSize: '11px', background: 'rgba(245, 158, 11, 0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                                                                    ⚡ Bajar a Picking
                                                                </span>
                                                            ) : (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#10b981', fontWeight: 700, fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                                                                    🟢 En Picking OK
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#f3f4f6' }}>
                                                            {item.codigoMaterial}
                                                        </td>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <div style={{ color: '#d1d5db', fontWeight: 500 }}>
                                                                {item.descripcionMaterial}
                                                            </div>
                                                            {(item.tono || item.colorNombre) && (
                                                                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                                                    Tono: {item.tono || item.colorNombre}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#f3f4f6' }}>
                                                            {item.consumoDiaKg} kg
                                                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>~{item.conosNecesarios} conos</div>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'right', color: item.stockEnPickingKg >= item.consumoDiaKg ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                                                            {item.stockEnPickingKg} kg
                                                        </td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#9ca3af' }}>
                                                            {item.stockEnReservaKg} kg
                                                        </td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                            {esBajar ? (
                                                                <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '14px' }}>
                                                                    +{item.aPasarAPickingKg} kg
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#6b7280' }}>-</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            {item.posicionesPickingSugeridas && item.posicionesPickingSugeridas.length > 0 ? (
                                                                <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                                                    {item.posicionesPickingSugeridas.join(', ')}
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#6b7280', fontSize: '11px' }}>Zona Picking</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                                                {item.maquinasCount || (item.maquinas ? item.maquinas.length : 0)} máq.
                                                            </span>
                                                        </td>
                                                        <td className="no-print" style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                            {esBajar ? (
                                                                <button
                                                                    onClick={() => navigate(`/deposito/centro-comando?search=${encodeURIComponent(item.codigoMaterial)}`)}
                                                                    title="Ir a Centro de Comando para mover a Picking"
                                                                    style={{
                                                                        padding: '4px 10px',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #f59e0b',
                                                                        background: 'rgba(245, 158, 11, 0.1)',
                                                                        color: '#f59e0b',
                                                                        cursor: 'pointer',
                                                                        fontSize: '12px',
                                                                        fontWeight: 600,
                                                                    }}
                                                                >
                                                                    Transferir ↗️
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => navigate(`/stock?q=${encodeURIComponent(item.codigoMaterial)}`)}
                                                                    title="Ver stock detallado"
                                                                    style={{
                                                                        padding: '4px 10px',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid var(--border-color, #2a2d3e)',
                                                                        background: 'transparent',
                                                                        color: '#9ca3af',
                                                                        cursor: 'pointer',
                                                                        fontSize: '12px',
                                                                    }}
                                                                >
                                                                    Ver Stock
                                                                </button>
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
                </>
            )}
        </div>
    );
}
