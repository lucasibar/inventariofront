import { useState, useMemo } from 'react';
import { PageHeader, Card, Btn } from '../../shared/ui';
import { useParseOrdenesProduccionMutation } from '../../features/quality/ordenes-produccion/api/ordenesProduccion.api';
import type { ProduccionParseResult, ArticuloProduccionSummary } from '../../features/quality/ordenes-produccion/types/ordenesProduccion.types';
import { useGetArticulosQuery } from '../../features/quality/articulos/api/articulos.api';
import { CreateArticuloDialog } from '../../features/quality/articulos/components/CreateArticuloDialog';
import { PdfUploader } from '../../features/quality/ordenes-produccion/components/PdfUploader';
import { ArticulosTejidoTab } from '../../features/quality/ordenes-produccion/components/ArticulosTejidoTab';
import { MaquinasTab } from '../../features/quality/ordenes-produccion/components/MaquinasTab';
import { ColoresTab } from '../../features/quality/ordenes-produccion/components/ColoresTab';
import { MaterialesAsignadosTab } from '../../features/quality/ordenes-produccion/components/MaterialesAsignadosTab';
import { HojaRepartidorTab } from '../../features/quality/ordenes-produccion/components/HojaRepartidorTab';
import { HojaPickingTab } from '../../features/quality/ordenes-produccion/components/HojaPickingTab';

type TabType = 'articulos' | 'maquinas' | 'colores' | 'materiales' | 'repartidor' | 'picking';

export default function OrdenesProduccionPage() {
    const [parseOrdenes, { isLoading }] = useParseOrdenesProduccionMutation();
    const { data: dbArticulos = [], refetch: refetchDbArticulos } = useGetArticulosQuery();

    const [result, setResult] = useState<ProduccionParseResult | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('articulos');

    // Dialog state for editing article
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editArticleTarget, setEditArticleTarget] = useState<any | null>(null);

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
            if (data.fechas && data.fechas.length > 0) {
                setSelectedFecha(data.fechas[0]);
            } else {
                setSelectedFecha('ALL');
            }
        } catch (err: any) {
            alert(err?.data?.message || 'Error al procesar los archivos PDF. Verifica que sean válidos.');
        }
    };

    const handleReset = () => {
        setResult(null);
        setSelectedFecha('ALL');
        setSelectedTurno('ALL');
        setSelectedArea('ALL');
        setActiveTab('articulos');
    };

    // Open article editor from anywhere (alert, badge, list)
    const handleOpenArticleEditor = (target: string | ArticuloProduccionSummary) => {
        let code = '';
        let desc = '';
        let talle = '';

        if (typeof target === 'string') {
            code = target.trim();
        } else {
            code = target.codigo || target.codigoOriginalPdf || '';
            desc = target.descripcion || '';
            talle = target.talles?.[0] || '';
        }

        // Look up in loaded DB articles
        const found = dbArticulos.find(
            (a: any) =>
                a.codigo?.toUpperCase() === code.toUpperCase() ||
                (a.workingNumber && a.workingNumber.toUpperCase() === code.toUpperCase()),
        );

        if (found) {
            setEditArticleTarget(found);
        } else {
            // New draft article
            setEditArticleTarget({
                codigo: code,
                descripcion: desc,
                talle: talle,
            });
        }

        setIsEditDialogOpen(true);
    };

    const handleCloseArticleDialog = () => {
        setIsEditDialogOpen(false);
        setEditArticleTarget(null);
        refetchDbArticulos();
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

    // Recalculate articles in current filtered view
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

    // Recalculate materials in current filtered view
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

    // Filtered Hoja Repartidor
    const filteredHojaRepartidor = useMemo(() => {
        if (!result) return [];
        if (selectedFecha === 'ALL' && selectedTurno === 'ALL' && selectedArea === 'ALL') {
            return result.hojaRepartidor;
        }

        const validMachineNumbers = new Set(filteredMaquinas.map((m) => m.machine));

        return result.hojaRepartidor
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

    // Filtered Hoja Picking
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

    return (
        <div style={{ padding: '24px' }}>
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    .printable-sheet, .printable-sheet * {
                        visibility: visible !important;
                    }
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
                    .no-print {
                        display: none !important;
                    }
                    header, aside, nav, button {
                        display: none !important;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        color: #000000 !important;
                    }
                    th, td {
                        border: 1px solid #cccccc !important;
                        color: #000000 !important;
                        padding: 6px 8px !important;
                        font-size: 11px !important;
                    }
                    th {
                        background: #f3f4f6 !important;
                        font-weight: bold !important;
                    }
                }
            `}</style>

            <div className="no-print">
                <PageHeader
                    title="Planificación y Órdenes de Producción — Tejeduría"
                    subtitle="Carga masiva de órdenes diarias en PDF, desglose por máquina/color, explosión de hilados (BOM) y listas para repartidor y picking."
                >
                    <Btn
                        variant="secondary"
                        onClick={() => window.open('/calidad/articulos', '_blank')}
                        style={{ fontSize: '12px' }}
                    >
                        📋 Ir al Catálogo de Artículos ↗️
                    </Btn>
                </PageHeader>
            </div>

            {/* Uploader Section */}
            <div className="no-print">
                <PdfUploader
                    onUpload={handleUpload}
                    isLoading={isLoading}
                    hasData={!!result}
                    onReset={handleReset}
                />
            </div>

            {/* Results Section */}
            {result && (
                <div>
                    {/* Alert Banner for Unreviewed Articles */}
                    {result.resumenAlertas.alertaGlobal && (
                        <div
                            className="no-print"
                            style={{
                                padding: '14px 20px',
                                borderRadius: '10px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1.5px solid rgba(239, 68, 68, 0.4)',
                                color: '#f87171',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '12px',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '24px' }}>⚠️</span>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#ef4444' }}>
                                        ¡ATENCIÓN! HAY {result.resumenAlertas.articulosNoRevisados} ARTÍCULO(S) PENDIENTES DE REVISIÓN EN ESTA PLANIFICACIÓN
                                    </div>
                                    <div style={{ fontSize: '13px', marginTop: '2px', color: 'var(--text-secondary, #d1d5db)' }}>
                                        Hacé clic en cualquier etiqueta <strong>⚠️ OJO: Pendiente</strong> para abrir y completar su Ficha Técnica (BOM) y validar los hilados.
                                    </div>
                                </div>
                            </div>

                            <Btn
                                small
                                onClick={() => setActiveTab('articulos')}
                                style={{ background: '#ef4444', color: '#fff', fontSize: '12px', padding: '6px 14px' }}
                            >
                                🧵 Ver Artículos a Revisar
                            </Btn>
                        </div>
                    )}

                    {/* Top KPI Cards */}
                    <div
                        className="no-print"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '12px',
                            marginBottom: '20px',
                        }}
                    >
                        <Card style={{ padding: '14px 18px', background: 'var(--bg-secondary, #1a1d2e)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', fontWeight: 600, textTransform: 'uppercase' }}>
                                🧵 Artículos Distintos
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #f3f4f6)', marginTop: '4px' }}>
                                {filteredArticulos.length}
                            </div>
                        </Card>

                        <Card style={{ padding: '14px 18px', background: 'var(--bg-secondary, #1a1d2e)' }}>
                            <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600, textTransform: 'uppercase' }}>
                                🏭 Máquinas Activas
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#818cf8', marginTop: '4px' }}>
                                {new Set(filteredMaquinas.map((m) => m.machine)).size} / 190
                            </div>
                        </Card>

                        <Card style={{ padding: '14px 18px', background: 'var(--bg-secondary, #1a1d2e)' }}>
                            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, textTransform: 'uppercase' }}>
                                🟢 Art. Chequeados
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                                {result.resumenAlertas.articulosChequeados}
                            </div>
                        </Card>

                        <Card
                            style={{
                                padding: '14px 18px',
                                background: result.resumenAlertas.articulosNoRevisados > 0 ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-secondary, #1a1d2e)',
                                border: result.resumenAlertas.articulosNoRevisados > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : undefined,
                            }}
                        >
                            <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 600, textTransform: 'uppercase' }}>
                                ⚠️ No Revisados / Dudas
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#f87171', marginTop: '4px' }}>
                                {result.resumenAlertas.articulosNoRevisados}
                            </div>
                        </Card>

                        <Card style={{ padding: '14px 18px', background: 'var(--bg-secondary, #1a1d2e)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', fontWeight: 600, textTransform: 'uppercase' }}>
                                🎨 Variantes Color
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #f3f4f6)', marginTop: '4px' }}>
                                {result.colores.length}
                            </div>
                        </Card>

                        <Card style={{ padding: '14px 18px', background: 'var(--bg-secondary, #1a1d2e)' }}>
                            <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 600, textTransform: 'uppercase' }}>
                                📦 Insumos Requeridos
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                                {filteredMateriales.length}
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
                                🎯 Filtros Globales:
                            </span>

                            {/* Fecha */}
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
                                        <option value="ALL">Todas las Fechas ({result.fechas.length})</option>
                                        {result.fechas.map((f) => (
                                            <option key={f} value={f}>
                                                {f}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Turno */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>Turno:</span>
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
                                    <option value="ALL">Ambos Turnos (M y N)</option>
                                    <option value="M">☀️ Mañana (M)</option>
                                    <option value="N">🌙 Noche (N)</option>
                                </select>
                            </div>

                            {/* Área */}
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
                            Archivos procesados: <strong>{result.archivosProcesados.length}</strong>
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
                            <span>🧵 Artículos a Tejer</span>
                            <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)' }}>
                                {filteredArticulos.length}
                            </span>
                        </button>

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
                            <span>🏭 Matriz por Máquina</span>
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
                            <span>🎨 Desglose por Colores</span>
                            <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)' }}>
                                {result.colores.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('materiales')}
                            style={{
                                padding: '10px 18px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'materiales' ? '2px solid #6366f1' : '2px solid transparent',
                                color: activeTab === 'materiales' ? '#a5b4fc' : 'var(--text-muted, #9ca3af)',
                                fontWeight: activeTab === 'materiales' ? 700 : 500,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <span>📦 Materiales / Hilados</span>
                            <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)' }}>
                                {filteredMateriales.length}
                            </span>
                        </button>

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
                            <span>🚚 Hoja para Repartidor</span>
                            <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                                {filteredHojaRepartidor.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('picking')}
                            style={{
                                padding: '10px 18px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'picking' ? '2px solid #10b981' : '2px solid transparent',
                                color: activeTab === 'picking' ? '#34d399' : 'var(--text-muted, #9ca3af)',
                                fontWeight: activeTab === 'picking' ? 700 : 500,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <span>📋 Hoja para Picking</span>
                            <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                                {filteredHojaPicking.length}
                            </span>
                        </button>
                    </div>

                    {/* Tab Views */}
                    {activeTab === 'articulos' && (
                        <ArticulosTejidoTab
                            articulos={filteredArticulos}
                            onSelectMachine={handleSelectMachineFromTab}
                            onEditArticle={handleOpenArticleEditor}
                        />
                    )}

                    {activeTab === 'maquinas' && (
                        <MaquinasTab
                            maquinas={filteredMaquinas}
                            selectedShift={selectedTurno}
                            selectedArea={selectedArea}
                            onEditArticle={handleOpenArticleEditor}
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
                            onEditArticle={handleOpenArticleEditor}
                        />
                    )}

                    {activeTab === 'repartidor' && (
                        <HojaRepartidorTab
                            items={filteredHojaRepartidor}
                            fecha={selectedFecha !== 'ALL' ? selectedFecha : result.fechas.join(', ')}
                            turnos={selectedTurno !== 'ALL' ? [selectedTurno] : result.turnos}
                            onEditArticle={handleOpenArticleEditor}
                        />
                    )}

                    {activeTab === 'picking' && (
                        <HojaPickingTab
                            items={filteredHojaPicking}
                            fecha={selectedFecha !== 'ALL' ? selectedFecha : result.fechas.join(', ')}
                            turnos={selectedTurno !== 'ALL' ? [selectedTurno] : result.turnos}
                            onEditArticle={handleOpenArticleEditor}
                        />
                    )}
                </div>
            )}

            {/* Dialog de Edición/Creación de Artículo integrado */}
            {isEditDialogOpen && (
                <CreateArticuloDialog
                    open={isEditDialogOpen}
                    onClose={handleCloseArticleDialog}
                    editTarget={editArticleTarget}
                />
            )}
        </div>
    );
}
