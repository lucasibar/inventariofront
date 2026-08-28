import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { useGetItemCategoriesQuery } from '../../features/warehouse/materiales/api/items.api';
import { useGetStockQuery } from '../../features/warehouse/stock/api/stock.api';
import {
    useCreateInventoryCheckMutation,
    useGetInventoryCheckQuery,
    useUpdateCheckItemMutation,
    useCompleteCheckMutation,
    useGetCheckReportQuery,
    useGetInventoryChecksQuery,
} from '../../features/warehouse/inventoryCheck/api/inventory-check.api';
import { PageHeader, Card, Btn, Spinner, useIsMobile } from '../../shared/ui';

/* ────────────────── Types ────────────────── */
type Phase = 'select' | 'check' | 'report';
type Tag = 'PENDIENTE' | 'CORRECTO' | 'FALTA' | 'SOBRA' | 'CANTIDAD_INCORRECTA' | 'A_CHEQUEAR' | 'POSICION_INCORRECTA';

interface TagConfig {
    label: string;
    icon: string;
    color: string;
    bg: string;
    border: string;
    shortDesc: string;
}

const TAG_CONFIG: Record<Tag, TagConfig> = {
    PENDIENTE: {
        label: 'Pendiente',
        icon: '⏳',
        color: 'var(--text-muted, #9ca3af)',
        bg: 'rgba(156,163,175,0.1)',
        border: 'rgba(156,163,175,0.25)',
        shortDesc: 'Sin revisar aún'
    },
    CORRECTO: {
        label: 'Correcto',
        icon: '✅',
        color: '#34d399',
        bg: 'rgba(52,211,153,0.12)',
        border: 'rgba(52,211,153,0.35)',
        shortDesc: 'Cantidad y presencia exactas'
    },
    FALTA: {
        label: 'Falta Cantidad',
        icon: '📉',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.12)',
        border: 'rgba(245,158,11,0.35)',
        shortDesc: 'Menos cantidad que en sistema'
    },
    SOBRA: {
        label: 'Sobra Cantidad',
        icon: '📈',
        color: '#60a5fa',
        bg: 'rgba(96,165,250,0.12)',
        border: 'rgba(96,165,250,0.35)',
        shortDesc: 'Más cantidad que en sistema'
    },
    CANTIDAD_INCORRECTA: {
        label: 'Cant. Incorrecta',
        icon: '⚠️',
        color: '#f97316',
        bg: 'rgba(249,115,22,0.12)',
        border: 'rgba(249,115,22,0.35)',
        shortDesc: 'Diferencia en el conteo'
    },
    POSICION_INCORRECTA: {
        label: 'No Está / Vacía',
        icon: '❌',
        color: '#f87171',
        bg: 'rgba(248,113,113,0.12)',
        border: 'rgba(248,113,113,0.35)',
        shortDesc: 'Material ausente físicamente'
    },
    A_CHEQUEAR: {
        label: 'A Chequear',
        icon: '🔍',
        color: '#fbbf24',
        bg: 'rgba(251,191,36,0.12)',
        border: 'rgba(251,191,36,0.35)',
        shortDesc: 'Lote dudoso o embalaje dañado'
    },
};

const OBSERVACIONES_POR_TAG: Partial<Record<Tag, string[]>> = {
    FALTA: [
        'Faltan bultos / cajas',
        'Faltan kilos / conos',
        'Material consumido sin registrar',
        'Lote incompleto',
    ],
    SOBRA: [
        'Hay más bultos que los registrados',
        'Material devuelto sin registrar',
        'Excedente físico de kilos',
    ],
    POSICION_INCORRECTA: [
        'Posición físicamente vacía',
        'Material no encontrado en posición',
        'Reubicado a otro sector sin registrar',
    ],
    A_CHEQUEAR: [
        'Lote físico no coincide con sistema',
        'Etiqueta ilegible / sin identificación',
        'Embalaje roto / material dañado',
        'Material mezclado con otra partida',
    ],
};

/* ────────── Natural sort for position codes ────────── */
function naturalSort(a: string, b: string): number {
    const pa = a.split('-');
    const pb = b.split('-');
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const sa = pa[i] || '';
        const sb = pb[i] || '';
        const na = Number(sa);
        const nb = Number(sb);
        if (!isNaN(na) && !isNaN(nb)) {
            if (na !== nb) return na - nb;
        } else {
            const cmp = sa.localeCompare(sb, undefined, { numeric: true, sensitivity: 'base' });
            if (cmp !== 0) return cmp;
        }
    }
    return 0;
}

/* ────────────────── Main Component ────────────────── */
export default function ChequeoCategoriaPage() {
    const isMobile = useIsMobile();
    const [phase, setPhase] = useState<Phase>('select');
    const [depotId, setDepotId] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [activeCheckId, setActiveCheckId] = useState<string | null>(null);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [confirmComplete, setConfirmComplete] = useState(false);
    const [completeError, setCompleteError] = useState<string | null>(null);

    // Queries
    const { data: depots = [] } = useGetDepotsQuery();
    const { data: categories = [], isLoading: loadingCategories } = useGetItemCategoriesQuery(depotId || undefined);
    const { data: stockItems = [] } = useGetStockQuery({ depotId: depotId || undefined }, { skip: !depotId });
    
    // In-progress checks
    const { data: existingChecks = [], refetch: refetchExistingChecks } = useGetInventoryChecksQuery(
        depotId ? { depositoId: depotId, status: 'EN_PROGRESO' } : { status: 'EN_PROGRESO' },
        { skip: phase !== 'select' }
    );

    const { data: checkData, refetch: refetchCheck } = useGetInventoryCheckQuery(activeCheckId!, { skip: !activeCheckId });
    const { data: reportData } = useGetCheckReportQuery(activeCheckId!, { skip: !activeCheckId || phase !== 'report' });

    // Mutations
    const [createCheck, { isLoading: creating }] = useCreateInventoryCheckMutation();
    const [updateItem] = useUpdateCheckItemMutation();
    const [completeCheck, { isLoading: completing }] = useCompleteCheckMutation();

    // Set default depot if only one exists
    useEffect(() => {
        if (depots.length === 1 && !depotId) {
            setDepotId(depots[0].id);
        }
    }, [depots, depotId]);

    // Calculate positions count and stock summary for each category
    const categoryStats = useMemo(() => {
        const stats: Record<string, { positionsCount: number; totalKg: number; itemsCount: number }> = {};
        
        categories.forEach((cat: any) => {
            stats[cat.id] = { positionsCount: 0, totalKg: 0, itemsCount: 0 };
        });

        if (stockItems && stockItems.length > 0) {
            const positionsByCat: Record<string, Set<string>> = {};

            stockItems.forEach((stock: any) => {
                const catId = stock.batch?.item?.categoryId || stock.batch?.item?.category?.id;
                if (catId) {
                    if (!stats[catId]) {
                        stats[catId] = { positionsCount: 0, totalKg: 0, itemsCount: 0 };
                    }
                    if (!positionsByCat[catId]) {
                        positionsByCat[catId] = new Set();
                    }
                    if (stock.posicionId) {
                        positionsByCat[catId].add(stock.posicionId);
                    }
                    stats[catId].totalKg += Number(stock.qtyPrincipal || 0);
                    stats[catId].itemsCount += 1;
                }
            });

            Object.keys(positionsByCat).forEach(catId => {
                if (stats[catId]) {
                    stats[catId].positionsCount = positionsByCat[catId].size;
                }
            });
        }

        return stats;
    }, [categories, stockItems]);

    // Sorted items in active check
    const sortedItems = useMemo(() => {
        if (!checkData?.items) return [];
        return [...checkData.items].sort((a: any, b: any) => naturalSort(a.posicionCodigo, b.posicionCodigo));
    }, [checkData]);

    const currentItem = sortedItems[currentIdx];
    const progress = sortedItems.length > 0
        ? sortedItems.filter((i: any) => i.tag !== 'PENDIENTE').length
        : 0;

    const activeDepots = useMemo(() =>
        depots.filter((d: any) => d.activo !== false).map((d: any) => ({ value: d.id, label: d.nombre })),
        [depots]
    );

    /* ────────── Handlers ────────── */
    const handleStartCategoryCheck = useCallback(async (catId?: string) => {
        const categoryIdToUse = catId || selectedCategoryId;
        if (!depotId || !categoryIdToUse) return;

        try {
            const result = await createCheck({ depositoId: depotId, categoryId: categoryIdToUse }).unwrap();
            setActiveCheckId(result.id);
            setCurrentIdx(0);
            setPhase('check');
        } catch (e: any) {
            console.error('Error starting category check:', e);
            alert(e?.data?.message || 'Error al iniciar chequeo de categoría');
        }
    }, [depotId, selectedCategoryId, createCheck]);

    const handleResumeCheck = useCallback((checkId: string) => {
        setActiveCheckId(checkId);
        setCurrentIdx(0);
        setPhase('check');
    }, []);

    const handleTagItem = useCallback(async (
        tag: Tag,
        observacion?: string | null,
        notaLibre?: string | null,
        realQtyPrincipal?: number | null,
        realQtySecundaria?: number | null
    ) => {
        if (!activeCheckId || !currentItem) return;
        try {
            await updateItem({
                checkId: activeCheckId,
                itemId: currentItem.id,
                tag,
                observacion: observacion || null,
                notaLibre: notaLibre || null,
                realQtyPrincipal: realQtyPrincipal !== undefined ? realQtyPrincipal : null,
                realQtySecundaria: realQtySecundaria !== undefined ? realQtySecundaria : null,
            }).unwrap();
            refetchCheck();
        } catch (e) {
            console.error('Error updating item:', e);
        }
    }, [activeCheckId, currentItem, updateItem, refetchCheck]);

    const handleComplete = useCallback(async () => {
        if (!activeCheckId) return;
        setCompleteError(null);
        try {
            await completeCheck(activeCheckId).unwrap();
            setPhase('report');
            setConfirmComplete(false);
        } catch (e: any) {
            console.error('Error completing check:', e);
            if (e?.status === 404 || e?.status === 400 || !e?.status) {
                setPhase('report');
                setConfirmComplete(false);
            } else {
                setCompleteError(e?.data?.message || 'Error al finalizar chequeo');
                setTimeout(() => {
                    setPhase('report');
                    setConfirmComplete(false);
                    setCompleteError(null);
                }, 1000);
            }
        }
    }, [activeCheckId, completeCheck]);

    const handleBackToSelect = useCallback(() => {
        setPhase('select');
        setActiveCheckId(null);
        setCurrentIdx(0);
        setConfirmComplete(false);
        refetchExistingChecks();
    }, [refetchExistingChecks]);

    return (
        <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '960px', margin: '0 auto' }}>
            {phase === 'select' && (
                <SelectCategoryPhase
                    isMobile={isMobile}
                    depots={activeDepots}
                    depotId={depotId}
                    onDepotChange={setDepotId}
                    categories={categories}
                    loadingCategories={loadingCategories}
                    selectedCategoryId={selectedCategoryId}
                    onSelectCategory={setSelectedCategoryId}
                    categoryStats={categoryStats}
                    existingChecks={existingChecks}
                    onStart={handleStartCategoryCheck}
                    onResume={handleResumeCheck}
                    creating={creating}
                />
            )}

            {phase === 'check' && checkData && (
                <CheckCategoryPhase
                    isMobile={isMobile}
                    items={sortedItems}
                    currentIdx={currentIdx}
                    onIdxChange={setCurrentIdx}
                    onTag={handleTagItem}
                    progress={progress}
                    total={sortedItems.length}
                    depotName={checkData.deposito?.nombre || ''}
                    categoryName={checkData.category?.nombre || 'Categoría Seleccionada'}
                    onComplete={() => setConfirmComplete(true)}
                    onBack={handleBackToSelect}
                />
            )}

            {phase === 'check' && !checkData && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
                    <Spinner />
                    <p style={{ color: 'var(--text-muted, #9ca3af)', marginTop: '16px', fontSize: '14px' }}>
                        Cargando posiciones de la categoría...
                    </p>
                </div>
            )}

            {phase === 'report' && (
                <ReportCategoryPhase
                    isMobile={isMobile}
                    report={reportData}
                    onReturnToCheck={() => setPhase('check')}
                    onNewCheck={handleBackToSelect}
                />
            )}

            {/* Confirm Complete Modal */}
            {confirmComplete && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'var(--bg-overlay-heavy, rgba(0, 0, 0, 0.75))', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
                }}>
                    <Card style={{ padding: '24px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ color: 'var(--text-primary, #f3f4f6)', margin: '0 0 8px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📋 Finalizar Chequeo por Categoría
                        </h3>
                        <p style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '14px', margin: '0 0 12px' }}>
                            Se revisaron <strong style={{ color: 'var(--text-primary, #f3f4f6)' }}>{progress}</strong> de{' '}
                            <strong style={{ color: 'var(--text-primary, #f3f4f6)' }}>{sortedItems.length}</strong> posiciones de esta categoría.
                        </p>
                        {progress < sortedItems.length && (
                            <p style={{
                                color: '#fbbf24', fontSize: '13px', margin: '0 0 16px',
                                background: 'rgba(251,191,36,0.1)', padding: '10px 14px', borderRadius: '8px',
                                border: '1px solid rgba(251,191,36,0.25)',
                            }}>
                                ⚠️ Hay {sortedItems.length - progress} posiciones sin verificar. Quedarán marcadas como "Pendiente".
                            </p>
                        )}
                        {completeError && (
                            <p style={{
                                color: '#f87171', fontSize: '13px', margin: '0 0 16px',
                                background: 'rgba(248,113,113,0.1)', padding: '10px 14px', borderRadius: '8px',
                                border: '1px solid rgba(248,113,113,0.25)',
                            }}>
                                ⚠️ {completeError}
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <Btn variant="secondary" onClick={() => setConfirmComplete(false)}>Cancelar</Btn>
                            <Btn onClick={handleComplete} disabled={completing}>
                                {completing ? 'Finalizando...' : 'Confirmar y Ver Reporte'}
                            </Btn>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   PHASE 1: SELECT DEPOT & MATERIAL CATEGORY
   ═══════════════════════════════════════════════════════ */
function SelectCategoryPhase({
    isMobile,
    depots,
    depotId,
    onDepotChange,
    categories,
    loadingCategories,
    selectedCategoryId,
    onSelectCategory,
    categoryStats,
    existingChecks,
    onStart,
    onResume,
    creating,
}: {
    isMobile: boolean;
    depots: { value: string; label: string }[];
    depotId: string;
    onDepotChange: (id: string) => void;
    categories: any[];
    loadingCategories: boolean;
    selectedCategoryId: string;
    onSelectCategory: (id: string) => void;
    categoryStats: Record<string, { positionsCount: number; totalKg: number; itemsCount: number }>;
    existingChecks: any[];
    onStart: (catId?: string) => void;
    onResume: (checkId: string) => void;
    creating: boolean;
}) {
    const selectedCategory = categories.find((c: any) => c.id === selectedCategoryId);
    const inProgressForSelected = existingChecks.find(
        (c: any) => c.depositoId === depotId && c.categoryId === selectedCategoryId
    );

    return (
        <Card style={{ padding: isMobile ? '20px' : '28px' }}>
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '24px' }}>🏷️</span>
                    <h2 style={{ color: 'var(--text-primary, #f3f4f6)', fontSize: '20px', fontWeight: 800, margin: 0 }}>
                        Chequeo de Inventario por Categoría
                    </h2>
                </div>
                <p style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '13px', margin: '4px 0 0' }}>
                    Seleccioná una categoría de material (ej: Goma, Nylon, Algodón) para auditar únicamente sus posiciones y verificar si la cantidad es correcta, si falta o si hay sobrantes.
                </p>
            </div>

            {/* Depósito selector */}
            <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🏭 1. Seleccionar Depósito
                </label>
                <select
                    value={depotId}
                    onChange={e => onDepotChange(e.target.value)}
                    style={{
                        width: '100%', background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-strong, #374151)', borderRadius: '10px',
                        padding: '14px 12px', color: 'var(--text-primary, #f3f4f6)', fontSize: '15px', outline: 'none',
                        boxSizing: 'border-box', colorScheme: 'dark', cursor: 'pointer',
                    }}
                >
                    <option value="">— Elegir depósito —</option>
                    {depots.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
            </div>

            {/* Category Cards Grid */}
            {depotId && (
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        🧵 2. Seleccionar Categoría de Material
                    </label>

                    {loadingCategories ? (
                        <div style={{ padding: '20px', textAlign: 'center' }}><Spinner /></div>
                    ) : categories.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-primary, #0f1117)', borderRadius: '10px', color: 'var(--text-subtle, #6b7280)' }}>
                            No hay categorías configuradas para este depósito.
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))',
                            gap: '12px',
                        }}>
                            {categories.map((cat: any) => {
                                const isSelected = selectedCategoryId === cat.id;
                                const stats = categoryStats[cat.id] || { positionsCount: 0, totalKg: 0, itemsCount: 0 };
                                const inProgressCheck = existingChecks.find(
                                    (c: any) => c.depositoId === depotId && c.categoryId === cat.id
                                );

                                return (
                                    <div
                                        key={cat.id}
                                        onClick={() => onSelectCategory(cat.id)}
                                        style={{
                                            padding: '16px',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            background: isSelected
                                                ? 'rgba(99, 102, 241, 0.15)'
                                                : 'var(--bg-primary, #0f1117)',
                                            border: `2px solid ${isSelected ? '#6366f1' : inProgressCheck ? 'rgba(251,191,36,0.4)' : 'var(--border-color, #2a2d3e)'}`,
                                            transition: 'all 0.15s ease',
                                            transform: isSelected ? 'scale(1.02)' : 'none',
                                            boxShadow: isSelected ? '0 8px 20px rgba(99, 102, 241, 0.2)' : 'none',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <span style={{
                                                fontSize: '15px', fontWeight: 800,
                                                color: isSelected ? '#a5b4fc' : 'var(--text-primary, #f3f4f6)',
                                            }}>
                                                🧵 {cat.nombre}
                                            </span>
                                            {inProgressCheck && (
                                                <span style={{
                                                    fontSize: '10px', fontWeight: 700, padding: '3px 6px', borderRadius: '6px',
                                                    background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)',
                                                }}>
                                                    🔄 EN CURSO
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                                            <div>
                                                📍 <strong style={{ color: 'var(--text-primary, #f3f4f6)' }}>{stats.positionsCount}</strong> posiciones con stock
                                            </div>
                                            <div>
                                                📦 <strong style={{ color: '#34d399' }}>{Number(stats.totalKg).toLocaleString('es-AR', { maximumFractionDigits: 1 })} kg</strong> registrados
                                            </div>
                                        </div>

                                        {inProgressCheck && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onResume(inProgressCheck.id);
                                                }}
                                                style={{
                                                    marginTop: '12px', width: '100%', padding: '6px 10px', borderRadius: '6px',
                                                    background: 'linear-gradient(135deg, #fbbf24, #d97706)', border: 'none',
                                                    color: '#000', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                                }}
                                            >
                                                Continuar Chequeo
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Selected category summary / start actions */}
            {selectedCategory && (
                <div style={{
                    marginTop: '20px', padding: '16px', borderRadius: '12px',
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: 600 }}>Categoría seleccionada:</div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #f3f4f6)' }}>
                                🏷️ {selectedCategory.nombre}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>Posiciones a auditar:</div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>
                                {categoryStats[selectedCategory.id]?.positionsCount || 0}
                            </div>
                        </div>
                    </div>

                    {inProgressForSelected ? (
                        <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row' }}>
                            <Btn
                                onClick={() => onResume(inProgressForSelected.id)}
                                style={{ flex: 1, padding: '14px', fontSize: '15px' }}
                            >
                                ▶️ Continuar Chequeo en Curso
                            </Btn>
                            <Btn
                                variant="secondary"
                                onClick={() => onStart(selectedCategory.id)}
                                disabled={creating}
                                style={{ flex: 1, padding: '14px', fontSize: '14px', border: '1px solid var(--border-strong, #374151)' }}
                            >
                                🔄 Reiniciar Chequeo Nuevo
                            </Btn>
                        </div>
                    ) : (
                        <Btn
                            onClick={() => onStart(selectedCategory.id)}
                            disabled={creating}
                            style={{
                                width: '100%', padding: '14px', fontSize: '16px',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            }}
                        >
                            {creating ? 'Iniciando chequeo...' : `🚀 Iniciar Chequeo de ${selectedCategory.nombre}`}
                        </Btn>
                    )}
                </div>
            )}
        </Card>
    );
}

/* ═══════════════════════════════════════════════════════
   PHASE 2: CHECK CATEGORY POSITIONS
   ═══════════════════════════════════════════════════════ */
function CheckCategoryPhase({
    isMobile,
    items,
    currentIdx,
    onIdxChange,
    onTag,
    progress,
    total,
    depotName,
    categoryName,
    onComplete,
    onBack,
}: {
    isMobile: boolean;
    items: any[];
    currentIdx: number;
    onIdxChange: (idx: number) => void;
    onTag: (tag: Tag, observacion?: string | null, notaLibre?: string | null, realQtyPrincipal?: number | null, realQtySecundaria?: number | null) => void;
    progress: number;
    total: number;
    depotName: string;
    categoryName: string;
    onComplete: () => void;
    onBack: () => void;
}) {
    const [showList, setShowList] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

    const filteredItemsWithOriginalIdx = useMemo(() => {
        return items
            .map((item, originalIdx) => ({ item, originalIdx }))
            .filter(({ item }) => {
                if (!searchQuery.trim()) return true;
                return item.posicionCodigo.toLowerCase().includes(searchQuery.trim().toLowerCase());
            });
    }, [items, searchQuery]);

    // Keyboard navigation (Left/Right arrows for next/prev)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'ArrowRight' && currentIdx < items.length - 1) {
                onIdxChange(currentIdx + 1);
            } else if (e.key === 'ArrowLeft' && currentIdx > 0) {
                onIdxChange(currentIdx - 1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIdx, items.length, onIdxChange]);

    return (
        <>
            {/* Header banner */}
            <div style={{
                marginBottom: '16px', background: 'var(--bg-secondary, #1a1d2e)',
                border: '1px solid var(--border-color, #2a2d3e)', borderRadius: '12px', padding: '16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={onBack}
                            style={{
                                background: 'var(--bg-action-btn, rgba(255,255,255,0.05))',
                                border: '1px solid var(--border-strong, #374151)', borderRadius: '6px',
                                color: 'var(--text-muted, #9ca3af)', cursor: 'pointer', fontSize: '13px', padding: '6px 10px',
                            }}
                        >
                            ← Cambiar Categoría
                        </button>
                        <div>
                            <span style={{
                                background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: '12px',
                                padding: '3px 8px', borderRadius: '6px', fontWeight: 800, marginRight: '6px',
                            }}>
                                🧵 {categoryName}
                            </span>
                            <span style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '12px' }}>
                                ({depotName})
                            </span>
                        </div>
                    </div>
                    <Btn small onClick={onComplete}>
                        📋 Finalizar
                    </Btn>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px' }}>
                        Posiciones de {categoryName} revisadas
                    </span>
                    <span style={{
                        background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: '12px',
                        padding: '2px 8px', borderRadius: '6px', fontWeight: 700,
                    }}>
                        {progress} de {total} ({pct}%)
                    </span>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-primary, #0f1117)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: '3px',
                        background: pct === 100 ? 'linear-gradient(90deg, #34d399, #10b981)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        transition: 'width 0.3s ease',
                    }} />
                </div>
            </div>

            {/* Position search / list toggle */}
            <div style={{ marginBottom: '12px' }}>
                <button
                    onClick={() => setShowList(!showList)}
                    style={{
                        width: '100%',
                        background: showList ? 'rgba(99,102,241,0.2)' : 'var(--bg-secondary, #1a1d2e)',
                        border: '1px solid ' + (showList ? 'rgba(99,102,241,0.4)' : 'var(--border-color, #2a2d3e)'),
                        borderRadius: '8px', color: 'var(--text-primary, #f3f4f6)', padding: '10px 14px',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                >
                    🔍 {showList ? 'Ocultar lista de posiciones' : `Buscar posición / Ver todas (${items.length})`}
                </button>
            </div>

            {/* Position list dropdown */}
            {showList && (
                <Card style={{ marginBottom: '12px', padding: '12px' }}>
                    <div style={{ marginBottom: '12px' }}>
                        <input
                            type="text"
                            placeholder="🔍 Buscar por código de posición (ej: 7-1-A)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%', background: 'var(--bg-primary, #0f1117)', border: '1px solid var(--border-strong, #374151)',
                                borderRadius: '8px', padding: '10px 12px', color: 'var(--text-primary, #f3f4f6)', fontSize: '14px',
                                outline: 'none', boxSizing: 'border-box',
                            }}
                        />
                    </div>
                    <div style={{ maxHeight: '45vh', overflowY: 'auto' }}>
                        {filteredItemsWithOriginalIdx.length > 0 ? (
                            filteredItemsWithOriginalIdx.map(({ item, originalIdx }) => {
                                const tagCfg = TAG_CONFIG[item.tag as Tag] || TAG_CONFIG.PENDIENTE;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => { onIdxChange(originalIdx); setShowList(false); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            width: '100%', padding: '12px 14px',
                                            background: originalIdx === currentIdx ? 'rgba(99,102,241,0.15)' : 'transparent',
                                            border: 'none', borderBottom: '1px solid #1f2233', cursor: 'pointer',
                                            color: 'var(--text-primary, #f3f4f6)', fontSize: '14px', textAlign: 'left',
                                            borderRadius: '6px',
                                        }}
                                    >
                                        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{item.posicionCodigo}</span>
                                        <span style={{
                                            fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                                            background: tagCfg.bg, color: tagCfg.color, border: '1px solid ' + tagCfg.border,
                                            fontWeight: 600,
                                        }}>
                                            {tagCfg.icon} {tagCfg.label}
                                        </span>
                                    </button>
                                );
                            })
                        ) : (
                            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-subtle, #6b7280)', fontSize: '13px' }}>
                                No se encontraron posiciones que coincidan con "{searchQuery}"
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Current Category Position Card */}
            {!showList && items.length > 0 && (
                <CategoryPositionCard
                    item={items[currentIdx]}
                    isMobile={isMobile}
                    onTag={onTag}
                    onPrev={() => onIdxChange(Math.max(0, currentIdx - 1))}
                    onNext={() => onIdxChange(Math.min(items.length - 1, currentIdx + 1))}
                    hasPrev={currentIdx > 0}
                    hasNext={currentIdx < items.length - 1}
                    posIndex={currentIdx + 1}
                    posTotal={items.length}
                    categoryName={categoryName}
                />
            )}
        </>
    );
}

/* ────────── Individual Category Position Card ────────── */
function CategoryPositionCard({
    item,
    isMobile,
    onTag,
    onPrev,
    onNext,
    hasPrev,
    hasNext,
    posIndex,
    posTotal,
    categoryName,
}: {
    item: any;
    isMobile: boolean;
    onTag: (tag: Tag, observacion?: string | null, notaLibre?: string | null, realQtyPrincipal?: number | null, realQtySecundaria?: number | null) => void;
    onPrev: () => void;
    onNext: () => void;
    hasPrev: boolean;
    hasNext: boolean;
    posIndex: number;
    posTotal: number;
    categoryName: string;
}) {
    const [expandedTag, setExpandedTag] = useState<Tag | null>(null);
    const [selectedObs, setSelectedObs] = useState<string | null>(null);
    const [notaLibre, setNotaLibre] = useState('');
    const [realQtyPrincipal, setRealQtyPrincipal] = useState<string>('');
    const [realQtySecundaria, setRealQtySecundaria] = useState<string>('');
    const touchStartX = useRef<number | null>(null);

    // Reset local state when position changes
    useEffect(() => {
        setExpandedTag(null);
        setSelectedObs(item?.observacion || null);
        setNotaLibre(item?.notaLibre || '');
        setRealQtyPrincipal(item?.realQtyPrincipal != null ? String(item.realQtyPrincipal) : '');
        setRealQtySecundaria(item?.realQtySecundaria != null ? String(item.realQtySecundaria) : '');
    }, [item?.id]);

    const stock: any[] = item?.stockSnapshot || [];
    const currentTag: Tag = item?.tag || 'PENDIENTE';
    const currentTagCfg = TAG_CONFIG[currentTag] || TAG_CONFIG.PENDIENTE;

    // Mobile swipe
    const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (diff > 70 && hasNext) onNext();
        else if (diff < -70 && hasPrev) onPrev();
        touchStartX.current = null;
    };

    const handleQuickCorrect = () => {
        onTag('CORRECTO', null, null, null, null);
        if (hasNext) setTimeout(onNext, 220);
    };

    const handleOpenTagDialog = (tag: Tag) => {
        setExpandedTag(tag);
        setSelectedObs(item?.tag === tag ? item?.observacion || null : null);
        setNotaLibre(item?.tag === tag ? item?.notaLibre || '' : '');
        setRealQtyPrincipal(item?.realQtyPrincipal != null ? String(item.realQtyPrincipal) : '');
        setRealQtySecundaria(item?.realQtySecundaria != null ? String(item.realQtySecundaria) : '');
    };

    const handleConfirmTagDialog = () => {
        if (!expandedTag) return;
        const numQtyPrincipal = realQtyPrincipal !== '' ? parseFloat(realQtyPrincipal) : null;
        const numQtySecundaria = realQtySecundaria !== '' ? parseFloat(realQtySecundaria) : null;

        onTag(
            expandedTag,
            selectedObs,
            notaLibre || null,
            !isNaN(numQtyPrincipal as number) ? numQtyPrincipal : null,
            !isNaN(numQtySecundaria as number) ? numQtySecundaria : null
        );
        setExpandedTag(null);
        if (hasNext) setTimeout(onNext, 220);
    };

    const observationOptions = expandedTag ? OBSERVACIONES_POR_TAG[expandedTag] || [] : [];

    return (
        <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                {/* Position Header */}
                <div style={{
                    padding: isMobile ? '16px' : '20px',
                    borderBottom: '1px solid var(--border-color, #2a2d3e)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-subtle, #6b7280)', marginBottom: '4px' }}>
                            Posición {posIndex} de {posTotal} ({categoryName})
                        </div>
                        <h2 style={{
                            color: 'var(--text-primary, #f3f4f6)', fontSize: isMobile ? '24px' : '28px',
                            fontWeight: 900, margin: 0, fontFamily: 'monospace', letterSpacing: '1px',
                        }}>
                            {item.posicionCodigo}
                        </h2>
                    </div>
                    <div style={{
                        padding: '6px 12px', borderRadius: '8px',
                        background: currentTagCfg.bg,
                        border: '1px solid ' + currentTagCfg.border,
                        color: currentTagCfg.color,
                        fontSize: '12px', fontWeight: 700,
                    }}>
                        {currentTagCfg.icon} {currentTagCfg.label}
                    </div>
                </div>

                {/* Stock registered in this position for this category */}
                <div style={{ padding: isMobile ? '16px' : '20px' }}>
                    <div style={{
                        fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginBottom: '12px',
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px',
                        display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                        📦 Stock de {categoryName} registrado en sistema
                    </div>

                    {stock.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {stock.map((s: any, i: number) => (
                                <div key={i} style={{
                                    background: '#0d0f17', borderRadius: '12px', padding: '16px',
                                    border: '1px solid var(--border-strong, #374151)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                color: 'var(--text-white-dynamic, #ffffff)', fontSize: isMobile ? '16px' : '18px', fontWeight: 800,
                                                marginBottom: '6px',
                                            }}>
                                                {s.itemName || s.itemCodigo || 'Material sin descripción'}
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '13px' }}>
                                                {s.itemCodigo && (
                                                    <span style={{ background: '#1f2438', padding: '2px 6px', borderRadius: '4px', color: '#93c5fd', fontFamily: 'monospace', fontWeight: 700 }}>
                                                        {s.itemCodigo}
                                                    </span>
                                                )}
                                                {s.lotNumber && (
                                                    <span style={{ color: '#a5b4fc', fontWeight: 600 }}>
                                                        Lote: <strong style={{ color: 'var(--text-secondary, #d1d5db)' }}>{s.lotNumber}</strong>
                                                    </span>
                                                )}
                                                {s.supplierName && (
                                                    <span style={{ color: '#6ee7b7', fontWeight: 600 }}>
                                                        Prov: <strong style={{ color: 'var(--text-secondary, #d1d5db)' }}>{s.supplierName}</strong>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Quantities */}
                                        <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                            {s.qtySecundaria != null && Number(s.qtySecundaria) > 0 ? (
                                                <>
                                                    <div style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 900, lineHeight: 1 }}>
                                                        <span style={{ color: '#fbbf24' }}>
                                                            {Number(s.qtySecundaria).toLocaleString('es-AR', { maximumFractionDigits: 1 })}
                                                        </span>
                                                        <span style={{ color: 'var(--text-dimmed, #4b5563)', margin: '0 4px' }}>/</span>
                                                        <span style={{ color: '#60a5fa' }}>
                                                            {Number(s.qtyPrincipal).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginTop: '4px' }}>
                                                        <span style={{ color: '#fbbf24' }}>{s.unidadSecundaria || 'cajas'}</span>
                                                        <span style={{ color: 'var(--text-dimmed, #4b5563)', margin: '0 4px' }}>/</span>
                                                        <span style={{ color: '#60a5fa' }}>{s.unidadPrincipal || 'kg'}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div style={{ color: '#60a5fa', fontSize: isMobile ? '24px' : '28px', fontWeight: 900, lineHeight: 1 }}>
                                                        {Number(s.qtyPrincipal).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                                                    </div>
                                                    <div style={{ color: '#60a5fa', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginTop: '4px' }}>
                                                        {s.unidadPrincipal || 'kg'}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{
                            background: '#0d0f17', borderRadius: '12px', padding: '24px',
                            border: '1px solid var(--border-strong, #374151)', textAlign: 'center',
                        }}>
                            <span style={{ fontSize: '32px' }}>📭</span>
                            <p style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '14px', fontWeight: 700, margin: '8px 0 0' }}>
                                Sin stock de {categoryName} registrado en esta posición
                            </p>
                        </div>
                    )}

                    {/* Previously recorded discrepancy info (if any) */}
                    {item.tag && item.tag !== 'PENDIENTE' && item.tag !== 'CORRECTO' && (
                        <div style={{
                            marginTop: '12px', padding: '12px', borderRadius: '10px',
                            background: currentTagCfg.bg, border: '1px solid ' + currentTagCfg.border,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ color: currentTagCfg.color, fontWeight: 700, fontSize: '13px' }}>
                                    {currentTagCfg.icon} {currentTagCfg.label}
                                </span>
                                {item.realQtyPrincipal != null && (
                                    <span style={{ fontSize: '12px', color: 'var(--text-primary, #f3f4f6)', fontWeight: 700 }}>
                                        Cantidad contada: {Number(item.realQtyPrincipal).toLocaleString('es-AR')} {stock[0]?.unidadPrincipal || 'kg'}
                                    </span>
                                )}
                            </div>
                            {item.observacion && (
                                <div style={{ color: 'var(--text-secondary, #d1d5db)', fontSize: '12px' }}>
                                    📌 {item.observacion}
                                </div>
                            )}
                            {item.notaLibre && (
                                <div style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', fontStyle: 'italic', marginTop: '2px' }}>
                                    💬 "{item.notaLibre}"
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Tag Buttons Grid */}
                <div style={{ padding: isMobile ? '12px 16px 16px' : '16px 20px 20px', borderTop: '1px solid #1f2233' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-subtle, #6b7280)', marginBottom: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ¿Cómo está la mercadería en esta posición?
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                        gap: '8px',
                    }}>
                        {/* 1. CORRECTO */}
                        <button
                            onClick={handleQuickCorrect}
                            style={{
                                gridColumn: isMobile ? 'span 2' : 'span 1',
                                background: currentTag === 'CORRECTO' ? TAG_CONFIG.CORRECTO.bg : 'var(--bg-primary, #0f1117)',
                                border: `2px solid ${currentTag === 'CORRECTO' ? TAG_CONFIG.CORRECTO.color : 'var(--border-color, #2a2d3e)'}`,
                                borderRadius: '10px', padding: '14px 10px', cursor: 'pointer',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                transition: 'all 0.15s ease',
                                transform: currentTag === 'CORRECTO' ? 'scale(1.02)' : 'scale(1)',
                            }}
                        >
                            <span style={{ fontSize: '22px' }}>✅</span>
                            <span style={{ color: TAG_CONFIG.CORRECTO.color, fontSize: '13px', fontWeight: 800 }}>
                                Correcto
                            </span>
                            <span style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '10px' }}>
                                Cantidad exacta
                            </span>
                        </button>

                        {/* 2. FALTA CANTIDAD */}
                        <button
                            onClick={() => handleOpenTagDialog('FALTA')}
                            style={{
                                background: currentTag === 'FALTA' || expandedTag === 'FALTA' ? TAG_CONFIG.FALTA.bg : 'var(--bg-primary, #0f1117)',
                                border: `2px solid ${currentTag === 'FALTA' || expandedTag === 'FALTA' ? TAG_CONFIG.FALTA.color : 'var(--border-color, #2a2d3e)'}`,
                                borderRadius: '10px', padding: '14px 10px', cursor: 'pointer',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <span style={{ fontSize: '22px' }}>📉</span>
                            <span style={{ color: TAG_CONFIG.FALTA.color, fontSize: '13px', fontWeight: 800 }}>
                                Falta
                            </span>
                            <span style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '10px' }}>
                                Cantidad menor
                            </span>
                        </button>

                        {/* 3. SOBRA CANTIDAD */}
                        <button
                            onClick={() => handleOpenTagDialog('SOBRA')}
                            style={{
                                background: currentTag === 'SOBRA' || expandedTag === 'SOBRA' ? TAG_CONFIG.SOBRA.bg : 'var(--bg-primary, #0f1117)',
                                border: `2px solid ${currentTag === 'SOBRA' || expandedTag === 'SOBRA' ? TAG_CONFIG.SOBRA.color : 'var(--border-color, #2a2d3e)'}`,
                                borderRadius: '10px', padding: '14px 10px', cursor: 'pointer',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <span style={{ fontSize: '22px' }}>📈</span>
                            <span style={{ color: TAG_CONFIG.SOBRA.color, fontSize: '13px', fontWeight: 800 }}>
                                Sobra
                            </span>
                            <span style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '10px' }}>
                                Cantidad mayor
                            </span>
                        </button>

                        {/* 4. NO ESTÁ / VACÍA */}
                        <button
                            onClick={() => handleOpenTagDialog('POSICION_INCORRECTA')}
                            style={{
                                background: currentTag === 'POSICION_INCORRECTA' || expandedTag === 'POSICION_INCORRECTA' ? TAG_CONFIG.POSICION_INCORRECTA.bg : 'var(--bg-primary, #0f1117)',
                                border: `2px solid ${currentTag === 'POSICION_INCORRECTA' || expandedTag === 'POSICION_INCORRECTA' ? TAG_CONFIG.POSICION_INCORRECTA.color : 'var(--border-color, #2a2d3e)'}`,
                                borderRadius: '10px', padding: '14px 10px', cursor: 'pointer',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <span style={{ fontSize: '22px' }}>❌</span>
                            <span style={{ color: TAG_CONFIG.POSICION_INCORRECTA.color, fontSize: '13px', fontWeight: 800 }}>
                                No está
                            </span>
                            <span style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '10px' }}>
                                Posición vacía
                            </span>
                        </button>
                    </div>

                    {/* Secondary button: A Chequear */}
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={() => handleOpenTagDialog('A_CHEQUEAR')}
                            style={{
                                background: 'none', border: 'none', color: '#fbbf24', fontSize: '12px',
                                fontWeight: 700, cursor: 'pointer', padding: '6px 12px', borderRadius: '6px',
                                display: 'flex', alignItems: 'center', gap: '6px',
                            }}
                        >
                            ⚠️ Hay otra observación (Lote dudoso, roto o mal etiquetado)
                        </button>
                    </div>

                    {/* Observation & Count dialog panel */}
                    {expandedTag && (
                        <div style={{
                            marginTop: '14px', padding: '16px', borderRadius: '12px',
                            background: 'var(--bg-primary, #0f1117)',
                            border: `2px solid ${TAG_CONFIG[expandedTag].color}`,
                            animation: 'fadeIn 0.2s ease',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ color: TAG_CONFIG[expandedTag].color, fontWeight: 800, fontSize: '14px' }}>
                                    {TAG_CONFIG[expandedTag].icon} Detalle: {TAG_CONFIG[expandedTag].label}
                                </span>
                                <button
                                    onClick={() => setExpandedTag(null)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted, #9ca3af)', fontSize: '16px', cursor: 'pointer' }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Predefined observations */}
                            {observationOptions.length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                                        Motivo principal:
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {observationOptions.map((obs) => (
                                            <button
                                                key={obs}
                                                onClick={() => setSelectedObs(selectedObs === obs ? null : obs)}
                                                style={{
                                                    background: selectedObs === obs ? TAG_CONFIG[expandedTag].bg : 'var(--bg-secondary, #1a1d2e)',
                                                    border: `1px solid ${selectedObs === obs ? TAG_CONFIG[expandedTag].border : 'var(--border-color, #2a2d3e)'}`,
                                                    borderRadius: '8px', padding: '8px 12px',
                                                    color: selectedObs === obs ? TAG_CONFIG[expandedTag].color : 'var(--text-secondary, #d1d5db)',
                                                    fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                                                }}
                                            >
                                                {selectedObs === obs ? '● ' : '○ '}{obs}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Counted Quantity inputs for FALTA / SOBRA */}
                            {(expandedTag === 'FALTA' || expandedTag === 'SOBRA' || expandedTag === 'CANTIDAD_INCORRECTA') && (
                                <div style={{
                                    marginBottom: '12px', padding: '12px', borderRadius: '8px',
                                    background: 'var(--bg-secondary, #1a1d2e)', border: '1px solid var(--border-color, #2a2d3e)',
                                }}>
                                    <label style={{ display: 'block', color: '#60a5fa', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                                        ⚖️ Cantidad Real Física Contada (Opcional):
                                    </label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder={`Cant. en ${stock[0]?.unidadPrincipal || 'kg'}`}
                                                value={realQtyPrincipal}
                                                onChange={e => setRealQtyPrincipal(e.target.value)}
                                                style={{
                                                    width: '100%', background: 'var(--bg-primary, #0f1117)',
                                                    border: '1px solid var(--border-strong, #374151)', borderRadius: '6px',
                                                    padding: '8px 10px', color: 'var(--text-primary, #f3f4f6)', fontSize: '14px',
                                                    outline: 'none', boxSizing: 'border-box',
                                                }}
                                            />
                                        </div>
                                        {stock[0]?.unidadSecundaria && (
                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    placeholder={`Cant. en ${stock[0]?.unidadSecundaria || 'bultos'}`}
                                                    value={realQtySecundaria}
                                                    onChange={e => setRealQtySecundaria(e.target.value)}
                                                    style={{
                                                        width: '100%', background: 'var(--bg-primary, #0f1117)',
                                                        border: '1px solid var(--border-strong, #374151)', borderRadius: '6px',
                                                        padding: '8px 10px', color: 'var(--text-primary, #f3f4f6)', fontSize: '14px',
                                                        outline: 'none', boxSizing: 'border-box',
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Free text note */}
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', color: 'var(--text-subtle, #6b7280)', fontSize: '11px', marginBottom: '4px' }}>
                                    Nota adicional / Comentario del operario (opcional)
                                </label>
                                <textarea
                                    value={notaLibre}
                                    onChange={e => setNotaLibre(e.target.value)}
                                    placeholder="Escribir aclaración..."
                                    rows={2}
                                    style={{
                                        width: '100%', background: 'var(--bg-secondary, #1a1d2e)', border: '1px solid var(--border-color, #2a2d3e)',
                                        borderRadius: '8px', padding: '10px', color: 'var(--text-primary, #f3f4f6)', fontSize: '13px',
                                        outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Btn variant="secondary" small onClick={() => setExpandedTag(null)} style={{ flex: 1 }}>
                                    Cancelar
                                </Btn>
                                <Btn small onClick={handleConfirmTagDialog} style={{ flex: 1 }}>
                                    Confirmar y Continuar
                                </Btn>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation Footer */}
                <div style={{
                    padding: '12px 16px', borderTop: '1px solid #1f2233',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <button
                        onClick={onPrev} disabled={!hasPrev}
                        style={{
                            background: hasPrev ? 'var(--bg-secondary, #1a1d2e)' : 'transparent',
                            border: '1px solid ' + (hasPrev ? 'var(--border-color, #2a2d3e)' : 'transparent'),
                            borderRadius: '8px', padding: '10px 20px',
                            color: hasPrev ? 'var(--text-primary, #f3f4f6)' : 'var(--border-strong, #374151)',
                            fontSize: '14px', cursor: hasPrev ? 'pointer' : 'default', fontWeight: 700,
                        }}
                    >
                        ← Anterior
                    </button>
                    <span style={{ color: 'var(--text-dimmed, #4b5563)', fontSize: '12px' }}>
                        {isMobile ? 'Deslizá' : 'Teclas'} ←→
                    </span>
                    <button
                        onClick={onNext} disabled={!hasNext}
                        style={{
                            background: hasNext ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                            border: hasNext ? 'none' : '1px solid transparent',
                            borderRadius: '8px', padding: '10px 20px',
                            color: hasNext ? 'var(--text-white-dynamic, #fff)' : 'var(--border-strong, #374151)',
                            fontSize: '14px', cursor: hasNext ? 'pointer' : 'default', fontWeight: 700,
                        }}
                    >
                        Siguiente →
                    </button>
                </div>
            </div>
        </Card>
    );
}

/* ═══════════════════════════════════════════════════════
   PHASE 3: CATEGORY REPORT & DISCREPANCY AUDIT
   ═══════════════════════════════════════════════════════ */
function ReportCategoryPhase({
    isMobile,
    report,
    onReturnToCheck,
    onNewCheck,
}: {
    isMobile: boolean;
    report: any;
    onReturnToCheck: () => void;
    onNewCheck: () => void;
}) {
    const [selectedTagFilter, setSelectedTagFilter] = useState<'ALL' | Tag>('ALL');

    const allItems: any[] = report?.items || [];

    const filteredReportItems = useMemo(() => {
        if (selectedTagFilter === 'ALL') return allItems;
        return allItems.filter((i: any) => i.tag === selectedTagFilter);
    }, [allItems, selectedTagFilter]);

    if (!report) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <Spinner />
            </div>
        );
    }

    const stats = report.summary || {};
    const categoryName = report.category?.nombre || 'Categoría';

    const statCards: { label: string; tagKey: 'ALL' | Tag; value: number; color: string; icon: string }[] = [
        { label: 'Todas', tagKey: 'ALL', value: stats.total || 0, color: '#a5b4fc', icon: '📊' },
        { label: 'Correctas', tagKey: 'CORRECTO', value: stats.correcto || 0, color: '#34d399', icon: '✅' },
        { label: 'Faltantes', tagKey: 'FALTA', value: stats.falta || 0, color: '#f59e0b', icon: '📉' },
        { label: 'Sobrantes', tagKey: 'SOBRA', value: stats.sobra || 0, color: '#60a5fa', icon: '📈' },
        { label: 'No Están / Vacías', tagKey: 'POSICION_INCORRECTA', value: stats.incorrecta || 0, color: '#f87171', icon: '❌' },
        { label: 'A Chequear', tagKey: 'A_CHEQUEAR', value: stats.aChequear || 0, color: '#fbbf24', icon: '⚠️' },
        { label: 'Pendientes', tagKey: 'PENDIENTE', value: stats.pendiente || 0, color: 'var(--text-subtle, #6b7280)', icon: '⏳' },
    ];

    const handleDownloadCSV = () => {
        const dateStr = new Date(report.completedAt || report.startedAt).toLocaleDateString('es-AR').replace(/\//g, '-');
        const filename = `chequeo_${categoryName.toLowerCase()}_${report.deposito?.nombre || 'deposito'}_${dateStr}.csv`;

        const headers = [
            'Depósito',
            'Categoría',
            'Posición',
            'Estado',
            'Stock Registrado (Sistema)',
            'Cantidad Real Contada',
            'Motivo / Observación',
            'Nota Adicional',
            'Fecha Verificación'
        ];

        const rows = (report.items || []).map((item: any) => {
            const tagCfg = TAG_CONFIG[item.tag as Tag] || TAG_CONFIG.PENDIENTE;
            const stockStr = (item.stockSnapshot || []).map((s: any) =>
                `${s.itemName || s.itemCodigo || 'Material'}${s.lotNumber ? ` (Lote: ${s.lotNumber})` : ''}: ${Number(s.qtyPrincipal)} ${s.unidadPrincipal || 'kg'}`
            ).join(' | ');

            const realQtyStr = item.realQtyPrincipal != null ? `${Number(item.realQtyPrincipal)}` : '';
            const checkedDateStr = item.checkedAt ? new Date(item.checkedAt).toLocaleString('es-AR') : '';

            return [
                `"${report.deposito?.nombre || ''}"`,
                `"${categoryName}"`,
                `"${item.posicionCodigo}"`,
                `"${tagCfg.label}"`,
                `"${stockStr.replace(/"/g, '""')}"`,
                `"${realQtyStr}"`,
                `"${(item.observacion || '').replace(/"/g, '""')}"`,
                `"${(item.notaLibre || '').replace(/"/g, '""')}"`,
                `"${checkedDateStr}"`
            ].join(';');
        });

        const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <button
                    onClick={onReturnToCheck}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted, #9ca3af)', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                >
                    ← Volver a seguir chequeando
                </button>
                <Btn
                    onClick={handleDownloadCSV}
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'var(--text-white-dynamic, #fff)' }}
                >
                    📥 Descargar Excel (CSV)
                </Btn>
            </div>

            <PageHeader
                title={`📋 Reporte de Chequeo: ${categoryName}`}
                subtitle={`${report.deposito?.nombre || 'Depósito'} — ${new Date(report.completedAt || report.startedAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
            />

            {/* Stats KPI filter grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px', marginBottom: '20px',
            }}>
                {statCards.map((s) => {
                    const isSelected = selectedTagFilter === s.tagKey;
                    return (
                        <Card
                            key={s.label}
                            onClick={() => setSelectedTagFilter(s.tagKey)}
                            style={{
                                padding: '14px', textAlign: 'center', cursor: 'pointer',
                                border: `2px solid ${isSelected ? s.color : 'var(--border-color, #2a2d3e)'}`,
                                background: isSelected ? 'var(--bg-hover-row, rgba(255,255,255,0.03))' : 'var(--bg-secondary, #1a1d2e)',
                                transition: 'all 0.15s ease',
                                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                            }}
                        >
                            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
                            <div style={{ color: s.color, fontSize: '24px', fontWeight: 800 }}>{s.value}</div>
                            <div style={{ color: isSelected ? 'var(--text-primary, #f3f4f6)' : 'var(--text-subtle, #6b7280)', fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>
                                {s.label}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Quick action buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexDirection: isMobile ? 'column' : 'row' }}>
                <Btn variant="secondary" onClick={onReturnToCheck} style={{ flex: 1, padding: '12px' }}>
                    ↩️ Seguir Chequeando {categoryName}
                </Btn>
                <Btn onClick={onNewCheck} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    🔄 Seleccionar Otra Categoría
                </Btn>
            </div>

            {/* Discrepancy details table / list */}
            {filteredReportItems.length > 0 ? (
                <Card style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{
                        padding: '14px 16px', borderBottom: '1px solid var(--border-color, #2a2d3e)',
                        background: 'var(--bg-alt-row, rgba(255,255,255,0.02))',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <h3 style={{ color: 'var(--text-primary, #f3f4f6)', fontSize: '15px', fontWeight: 700, margin: 0 }}>
                            📌 Posiciones ({filteredReportItems.length})
                        </h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                            Filtro: <strong>{statCards.find(s => s.tagKey === selectedTagFilter)?.label}</strong>
                        </span>
                    </div>

                    {filteredReportItems.map((item: any, i: number) => {
                        const tagCfg = TAG_CONFIG[item.tag as Tag] || TAG_CONFIG.PENDIENTE;
                        return (
                            <div key={item.id || i} style={{
                                padding: '16px', borderBottom: i < filteredReportItems.length - 1 ? '1px solid #1f2233' : 'none',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-primary, #f3f4f6)', fontFamily: 'monospace', fontWeight: 800, fontSize: '18px' }}>
                                        {item.posicionCodigo}
                                    </span>
                                    <span style={{
                                        fontSize: '12px', padding: '3px 10px', borderRadius: '6px',
                                        background: tagCfg.bg, color: tagCfg.color, border: '1px solid ' + tagCfg.border,
                                        fontWeight: 700,
                                    }}>
                                        {tagCfg.icon} {tagCfg.label}
                                    </span>
                                </div>

                                {item.observacion && (
                                    <div style={{ color: tagCfg.color, fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
                                        📌 {item.observacion}
                                    </div>
                                )}

                                {item.notaLibre && (
                                    <div style={{ color: 'var(--text-secondary, #d1d5db)', fontSize: '12px', fontStyle: 'italic', marginBottom: '6px' }}>
                                        💬 "{item.notaLibre}"
                                    </div>
                                )}

                                {/* Stock comparison */}
                                {item.stockSnapshot && item.stockSnapshot.length > 0 ? (
                                    <div style={{
                                        marginTop: '6px', fontSize: '12px', color: 'var(--text-muted, #9ca3af)',
                                        background: 'var(--bg-primary, #0f1117)', padding: '10px 12px', borderRadius: '8px',
                                        display: 'flex', flexDirection: 'column', gap: '4px',
                                    }}>
                                        <div>
                                            <strong style={{ color: '#60a5fa' }}>Stock en Sistema:</strong>{' '}
                                            {item.stockSnapshot.map((s: any) =>
                                                `${s.itemName || s.itemCodigo || 'Material'}${s.lotNumber ? ` (Lote: ${s.lotNumber})` : ''} — ${Number(s.qtyPrincipal).toLocaleString('es-AR')} ${s.unidadPrincipal || 'kg'}`
                                            ).join(' | ')}
                                        </div>

                                        {item.realQtyPrincipal != null && (
                                            <div>
                                                <strong style={{ color: '#34d399' }}>Cantidad Real Física:</strong>{' '}
                                                {Number(item.realQtyPrincipal).toLocaleString('es-AR')} {item.stockSnapshot[0]?.unidadPrincipal || 'kg'}
                                                {' '}
                                                <span style={{
                                                    color: Number(item.realQtyPrincipal) < Number(item.stockSnapshot[0]?.qtyPrincipal || 0) ? '#f87171' : '#34d399',
                                                    fontWeight: 700,
                                                }}>
                                                    ({Number(item.realQtyPrincipal) - Number(item.stockSnapshot[0]?.qtyPrincipal || 0) >= 0 ? '+' : ''}
                                                    {(Number(item.realQtyPrincipal) - Number(item.stockSnapshot[0]?.qtyPrincipal || 0)).toLocaleString('es-AR')} {item.stockSnapshot[0]?.unidadPrincipal || 'kg'})
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-subtle, #6b7280)' }}>
                                        <em>Sin stock registrado en sistema</em>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </Card>
            ) : (
                <Card style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
                    <h3 style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '16px', fontWeight: 600, margin: 0 }}>
                        No hay posiciones con la etiqueta "{statCards.find(s => s.tagKey === selectedTagFilter)?.label}"
                    </h3>
                </Card>
            )}
        </>
    );
}
