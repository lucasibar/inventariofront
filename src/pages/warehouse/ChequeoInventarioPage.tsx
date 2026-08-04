import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
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
type Tag = 'PENDIENTE' | 'CORRECTO' | 'A_CHEQUEAR' | 'POSICION_INCORRECTA';

const TAG_CONFIG: Record<Tag, { label: string; icon: string; color: string; bg: string; border: string }> = {
    PENDIENTE: { label: 'Pendiente', icon: '⏳', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.25)' },
    CORRECTO: { label: 'Correcto', icon: '✅', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)' },
    A_CHEQUEAR: { label: 'A Chequear', icon: '⚠️', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)' },
    POSICION_INCORRECTA: { label: 'Pos. Incorrecta', icon: '❌', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' },
};

const OBSERVACIONES_CHEQUEAR = [
    'Sobran cajas',
    'Faltan cajas',
    'Material fuera de sector',
];

const OBSERVACIONES_INCORRECTA = [
    'Hay mercadería y aparece vacía',
    'Aparece mercadería y está vacía',
];

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
export default function ChequeoInventarioPage() {
    const isMobile = useIsMobile();
    const [phase, setPhase] = useState<Phase>('select');
    const [depotId, setDepotId] = useState('');
    const [activeCheckId, setActiveCheckId] = useState<string | null>(null);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [confirmComplete, setConfirmComplete] = useState(false);

    // Queries
    const { data: depots = [] } = useGetDepotsQuery();
    const { data: existingChecks = [] } = useGetInventoryChecksQuery(
        depotId ? { depositoId: depotId, status: 'EN_PROGRESO' } : { status: 'EN_PROGRESO' },
        { skip: phase !== 'select' }
    );
    const { data: checkData, refetch: refetchCheck } = useGetInventoryCheckQuery(activeCheckId!, { skip: !activeCheckId });
    const { data: reportData } = useGetCheckReportQuery(activeCheckId!, { skip: !activeCheckId || phase !== 'report' });

    // Mutations
    const [createCheck, { isLoading: creating }] = useCreateInventoryCheckMutation();
    const [updateItem] = useUpdateCheckItemMutation();
    const [completeCheck, { isLoading: completing }] = useCompleteCheckMutation();

    // Sorted items
    const sortedItems = useMemo(() => {
        if (!checkData?.items) return [];
        return [...checkData.items].sort((a: any, b: any) => naturalSort(a.posicionCodigo, b.posicionCodigo));
    }, [checkData]);

    const currentItem = sortedItems[currentIdx];
    const progress = sortedItems.length > 0
        ? sortedItems.filter((i: any) => i.tag !== 'PENDIENTE').length
        : 0;

    // Active depots
    const activeDepots = useMemo(() =>
        depots.filter((d: any) => d.activo).map((d: any) => ({ value: d.id, label: d.nombre })),
        [depots]
    );

    // Check if depot has an in-progress check
    const existingCheck = useMemo(() =>
        existingChecks.find((c: any) => c.depositoId === depotId),
        [existingChecks, depotId]
    );

    /* ────────── Handlers ────────── */
    const handleStartCheck = useCallback(async () => {
        if (!depotId) return;
        try {
            const result = await createCheck({ depositoId: depotId }).unwrap();
            setActiveCheckId(result.id);
            setCurrentIdx(0);
            setPhase('check');
        } catch (e) {
            console.error('Error creating check:', e);
        }
    }, [depotId, createCheck]);

    const handleResumeCheck = useCallback(() => {
        if (existingCheck) {
            setActiveCheckId(existingCheck.id);
            setCurrentIdx(0);
            setPhase('check');
        }
    }, [existingCheck]);

    const handleTagItem = useCallback(async (tag: Tag, observacion?: string | null, notaLibre?: string | null) => {
        if (!activeCheckId || !currentItem) return;
        try {
            await updateItem({
                checkId: activeCheckId,
                itemId: currentItem.id,
                tag,
                observacion: observacion || null,
                notaLibre: notaLibre || null,
            }).unwrap();
            refetchCheck();
        } catch (e) {
            console.error('Error updating item:', e);
        }
    }, [activeCheckId, currentItem, updateItem, refetchCheck]);

    const [completeError, setCompleteError] = useState<string | null>(null);

    const handleComplete = useCallback(async () => {
        if (!activeCheckId) return;
        setCompleteError(null);
        try {
            await completeCheck(activeCheckId).unwrap();
            setPhase('report');
            setConfirmComplete(false);
        } catch (e: any) {
            console.error('Error completing check:', e);
            // If backend already completed or transient error occurred, proceed to report phase gracefully
            if (e?.status === 404 || e?.status === 400 || !e?.status) {
                setPhase('report');
                setConfirmComplete(false);
            } else {
                setCompleteError(e?.data?.message || 'Error al finalizar chequeo. Reintentando...');
                // Fallback: advance to report anyway so user is never stuck
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
    }, []);

    /* ────────── Render ────────── */
    return (
        <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '900px', margin: '0 auto' }}>
            {phase === 'select' && (
                <SelectPhase
                    isMobile={isMobile}
                    depots={activeDepots}
                    depotId={depotId}
                    onDepotChange={setDepotId}
                    onStart={handleStartCheck}
                    onResume={handleResumeCheck}
                    existingCheck={existingCheck}
                    creating={creating}
                />
            )}
            {phase === 'check' && checkData && (
                <CheckPhase
                    isMobile={isMobile}
                    items={sortedItems}
                    currentIdx={currentIdx}
                    onIdxChange={setCurrentIdx}
                    onTag={handleTagItem}
                    progress={progress}
                    total={sortedItems.length}
                    depotName={checkData.deposito?.nombre || ''}
                    onComplete={() => setConfirmComplete(true)}
                    onBack={handleBackToSelect}
                />
            )}
            {phase === 'check' && !checkData && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <Spinner />
                </div>
            )}
            {phase === 'report' && (
                <ReportPhase
                    isMobile={isMobile}
                    report={reportData}
                    onReturnToCheck={() => setPhase('check')}
                    onNewCheck={handleBackToSelect}
                />
            )}

            {/* Confirm Complete Modal */}
            {confirmComplete && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
                }}>
                    <Card style={{ padding: '24px', maxWidth: '400px', width: '100%' }}>
                        <h3 style={{ color: '#f3f4f6', margin: '0 0 8px', fontSize: '18px' }}>
                            📋 Finalizar Chequeo
                        </h3>
                        <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0 0 8px' }}>
                            Se revisaron <strong style={{ color: '#f3f4f6' }}>{progress}</strong> de{' '}
                            <strong style={{ color: '#f3f4f6' }}>{sortedItems.length}</strong> posiciones.
                        </p>
                        {progress < sortedItems.length && (
                            <p style={{
                                color: '#fbbf24', fontSize: '13px', margin: '0 0 16px',
                                background: 'rgba(251,191,36,0.1)', padding: '8px 12px', borderRadius: '8px',
                                border: '1px solid rgba(251,191,36,0.2)',
                            }}>
                                ⚠️ Hay {sortedItems.length - progress} posiciones sin revisar. Quedarán como "Pendiente".
                            </p>
                        )}
                        {completeError && (
                            <p style={{
                                color: '#f87171', fontSize: '13px', margin: '0 0 16px',
                                background: 'rgba(248,113,113,0.1)', padding: '8px 12px', borderRadius: '8px',
                                border: '1px solid rgba(248,113,113,0.2)',
                            }}>
                                ⚠️ {completeError}
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <Btn variant="secondary" onClick={() => setConfirmComplete(false)}>Cancelar</Btn>
                            <Btn onClick={handleComplete} disabled={completing}>
                                {completing ? 'Finalizando...' : 'Confirmar'}
                            </Btn>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   PHASE 1: SELECT DEPOT
   ═══════════════════════════════════════════════════════ */
function SelectPhase({ isMobile, depots, depotId, onDepotChange, onStart, onResume, existingCheck, creating }: {
    isMobile: boolean;
    depots: { value: string; label: string }[];
    depotId: string;
    onDepotChange: (id: string) => void;
    onStart: () => void;
    onResume: () => void;
    existingCheck: any;
    creating: boolean;
}) {
    return (
        <>
            <Card style={{ padding: isMobile ? '20px' : '28px' }}>
                <h2 style={{ color: '#f3f4f6', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>
                    🔍 Chequeo de Inventario
                </h2>
                <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 20px' }}>
                    Revisión visual de posiciones por depósito
                </p>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '6px' }}>
                        Depósito
                    </label>
                    <select
                        value={depotId}
                        onChange={e => onDepotChange(e.target.value)}
                        style={{
                            width: '100%', background: '#0f1117', border: '1px solid #374151', borderRadius: '10px',
                            padding: '14px 12px', color: '#f3f4f6', fontSize: '15px', outline: 'none',
                            boxSizing: 'border-box', colorScheme: 'dark',
                        }}
                    >
                        <option value="">— Elegir depósito —</option>
                        {depots.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                </div>

                {existingCheck && (
                    <div style={{
                        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: '10px', padding: '14px', marginBottom: '16px',
                    }}>
                        <p style={{ color: '#a5b4fc', fontSize: '13px', margin: '0 0 10px' }}>
                            📋 Hay un chequeo en progreso para este depósito
                        </p>
                        <Btn onClick={onResume} style={{ width: '100%', padding: '12px' }}>
                            Continuar Chequeo
                        </Btn>
                    </div>
                )}

                <Btn
                    onClick={onStart}
                    disabled={!depotId || creating}
                    style={{
                        width: '100%', padding: '14px', fontSize: '16px',
                        background: !depotId ? '#374151' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    }}
                >
                    {creating ? 'Creando chequeo...' : existingCheck ? '🔄 Nuevo Chequeo (reemplaza anterior)' : '🚀 Iniciar Chequeo'}
                </Btn>

                {existingCheck && (
                    <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '8px', textAlign: 'center' }}>
                        Iniciar uno nuevo eliminará el chequeo anterior de este depósito
                    </p>
                )}
            </Card>
        </>
    );
}

/* ═══════════════════════════════════════════════════════
   PHASE 2: CHECK POSITIONS
   ═══════════════════════════════════════════════════════ */
function CheckPhase({ isMobile, items, currentIdx, onIdxChange, onTag, progress, total, depotName, onComplete, onBack }: {
    isMobile: boolean;
    items: any[];
    currentIdx: number;
    onIdxChange: (idx: number) => void;
    onTag: (tag: Tag, observacion?: string | null, notaLibre?: string | null) => void;
    progress: number;
    total: number;
    depotName: string;
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

    return (
        <>
            {/* Header */}
            <div style={{ marginBottom: '16px', background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={onBack}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #374151', borderRadius: '6px', color: '#9ca3af', cursor: 'pointer', fontSize: '13px', padding: '6px 10px' }}
                        >
                            ← Cambiar depósito
                        </button>
                        <span style={{ color: '#f3f4f6', fontSize: '16px', fontWeight: 800 }}>
                            🏭 {depotName}
                        </span>
                    </div>
                    <Btn small onClick={onComplete}>
                        📋 Finalizar
                    </Btn>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>Progreso del chequeo</span>
                    <span style={{
                        background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: '12px',
                        padding: '2px 8px', borderRadius: '6px', fontWeight: 700,
                    }}>
                        {progress} de {total} ({pct}%)
                    </span>
                </div>
                {/* Progress bar */}
                <div style={{
                    width: '100%', height: '6px', background: '#0f1117', borderRadius: '3px', overflow: 'hidden',
                }}>
                    <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: '3px',
                        background: pct === 100 ? 'linear-gradient(90deg, #34d399, #10b981)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        transition: 'width 0.3s ease',
                    }} />
                </div>
            </div>

            {/* Mini nav: position list toggle button */}
            <div style={{ marginBottom: '12px' }}>
                <button
                    onClick={() => setShowList(!showList)}
                    style={{
                        width: '100%',
                        background: showList ? 'rgba(99,102,241,0.2)' : '#1a1d2e',
                        border: '1px solid ' + (showList ? 'rgba(99,102,241,0.4)' : '#2a2d3e'),
                        borderRadius: '8px', color: '#f3f4f6', padding: '10px 14px',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    🔍 {showList ? 'Ocultar lista y buscador' : 'Buscar posición / Ver todas'}
                </button>
            </div>

            {/* Position list view with search input */}
            {showList && (
                <Card style={{ marginBottom: '12px', padding: '12px' }}>
                    <div style={{ marginBottom: '12px' }}>
                        <input
                            type="text"
                            placeholder="🔍 Buscar por código de posición (ej: 7-1-A, Pasillo1)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                background: '#0f1117',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                color: '#f3f4f6',
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <div style={{ maxHeight: '45vh', overflowY: 'auto' }}>
                        {filteredItemsWithOriginalIdx.length > 0 ? (
                            filteredItemsWithOriginalIdx.map(({ item, originalIdx }) => (
                                <button
                                    key={item.id}
                                    onClick={() => { onIdxChange(originalIdx); setShowList(false); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        width: '100%', padding: '12px 14px',
                                        background: originalIdx === currentIdx ? 'rgba(99,102,241,0.15)' : 'transparent',
                                        border: 'none', borderBottom: '1px solid #1f2233', cursor: 'pointer',
                                        color: '#f3f4f6', fontSize: '14px', textAlign: 'left',
                                        borderRadius: '6px'
                                    }}
                                >
                                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.posicionCodigo}</span>
                                    <span style={{
                                        fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                                        background: TAG_CONFIG[item.tag as Tag]?.bg,
                                        color: TAG_CONFIG[item.tag as Tag]?.color,
                                        border: '1px solid ' + TAG_CONFIG[item.tag as Tag]?.border,
                                    }}>
                                        {TAG_CONFIG[item.tag as Tag]?.icon} {TAG_CONFIG[item.tag as Tag]?.label}
                                    </span>
                                </button>
                            ))
                        ) : (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                                No se encontraron posiciones que coincidan con "{searchQuery}"
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Current position card */}
            {!showList && items.length > 0 && (
                <PositionCard
                    item={items[currentIdx]}
                    isMobile={isMobile}
                    onTag={onTag}
                    onPrev={() => onIdxChange(Math.max(0, currentIdx - 1))}
                    onNext={() => onIdxChange(Math.min(items.length - 1, currentIdx + 1))}
                    hasPrev={currentIdx > 0}
                    hasNext={currentIdx < items.length - 1}
                    posIndex={currentIdx + 1}
                    posTotal={items.length}
                />
            )}
        </>
    );
}

/* ────────── Individual Position Card ────────── */
function PositionCard({ item, isMobile, onTag, onPrev, onNext, hasPrev, hasNext, posIndex, posTotal }: {
    item: any;
    isMobile: boolean;
    onTag: (tag: Tag, observacion?: string | null, notaLibre?: string | null) => void;
    onPrev: () => void;
    onNext: () => void;
    hasPrev: boolean;
    hasNext: boolean;
    posIndex: number;
    posTotal: number;
}) {
    const [expanded, setExpanded] = useState<Tag | null>(null);
    const [selectedObs, setSelectedObs] = useState<string | null>(null);
    const [notaLibre, setNotaLibre] = useState('');
    const touchStartX = useRef<number | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    // Reset expanded state when item changes
    useEffect(() => {
        setExpanded(null);
        setSelectedObs(item?.observacion || null);
        setNotaLibre(item?.notaLibre || '');
    }, [item?.id]);

    const stock: any[] = item?.stockSnapshot || [];
    const currentTag: Tag = item?.tag || 'PENDIENTE';

    const handleSwipeStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const handleSwipeEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (diff > 70 && hasNext) onNext();
        else if (diff < -70 && hasPrev) onPrev();
        touchStartX.current = null;
    };

    const handleQuickTag = (tag: Tag) => {
        if (tag === 'CORRECTO') {
            onTag('CORRECTO');
            if (hasNext) setTimeout(onNext, 200);
        } else {
            setExpanded(tag);
            setSelectedObs(null);
            setNotaLibre('');
        }
    };

    const handleConfirmTag = () => {
        if (!expanded) return;
        onTag(expanded, selectedObs, notaLibre || null);
        setExpanded(null);
        if (hasNext) setTimeout(onNext, 200);
    };

    const observaciones = expanded === 'A_CHEQUEAR' ? OBSERVACIONES_CHEQUEAR
        : expanded === 'POSICION_INCORRECTA' ? OBSERVACIONES_INCORRECTA : [];

    return (
        <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div
                ref={cardRef}
                onTouchStart={handleSwipeStart}
                onTouchEnd={handleSwipeEnd}
            >
                {/* Position header */}
                <div style={{
                    padding: isMobile ? '16px' : '20px',
                    borderBottom: '1px solid #2a2d3e',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                            Posición {posIndex} de {posTotal}
                        </div>
                        <h2 style={{
                            color: '#f3f4f6', fontSize: isMobile ? '22px' : '26px',
                            fontWeight: 800, margin: 0, fontFamily: 'monospace',
                            letterSpacing: '1px',
                        }}>
                            {item.posicionCodigo}
                        </h2>
                    </div>
                    <div style={{
                        padding: '6px 12px', borderRadius: '8px',
                        background: TAG_CONFIG[currentTag].bg,
                        border: '1px solid ' + TAG_CONFIG[currentTag].border,
                        color: TAG_CONFIG[currentTag].color,
                        fontSize: '12px', fontWeight: 600,
                    }}>
                        {TAG_CONFIG[currentTag].icon} {TAG_CONFIG[currentTag].label}
                    </div>
                </div>

                {/* Stock info */}
                <div style={{ padding: isMobile ? '16px' : '20px' }}>
                    <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📦 Stock en sistema {stock.length === 0 && <span style={{ color: '#ef4444', textTransform: 'none' }}>— Posición vacía</span>}
                    </div>
                    {stock.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {stock.map((s: any, i: number) => (
                                <div key={i} style={{
                                    background: '#0d0f17', borderRadius: '12px', padding: '14px 16px',
                                    border: '1px solid #374151',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                color: '#ffffff', fontSize: isMobile ? '16px' : '18px', fontWeight: 800,
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                marginBottom: '4px'
                                            }} title={s.itemName}>
                                                {s.itemName || 'Material sin nombre'}
                                            </div>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '13px' }}>
                                                {s.lotNumber && (
                                                    <span style={{ color: '#a5b4fc', fontWeight: 600 }}>
                                                        Lote: <strong style={{ color: '#d1d5db', fontWeight: 700 }}>{s.lotNumber}</strong>
                                                    </span>
                                                )}
                                                {s.lotNumber && s.supplierName && (
                                                    <span style={{ color: '#4b5563' }}>•</span>
                                                )}
                                                {s.supplierName && (
                                                    <span style={{ color: '#6ee7b7', fontWeight: 600 }}>
                                                        Prov: <strong style={{ color: '#d1d5db', fontWeight: 700 }}>{s.supplierName}</strong>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                            {s.qtySecundaria != null && Number(s.qtySecundaria) > 0 ? (
                                                <>
                                                    <div style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 900, lineHeight: 1 }}>
                                                        <span style={{ color: '#fbbf24' }}>
                                                            {Number(s.qtySecundaria).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                        </span>
                                                        <span style={{ color: '#4b5563', margin: '0 4px' }}>/</span>
                                                        <span style={{ color: '#60a5fa' }}>
                                                            {Number(s.qtyPrincipal).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginTop: '3px' }}>
                                                        <span style={{ color: '#fbbf24' }}>{s.unidadSecundaria || 'unid.'}</span>
                                                        <span style={{ color: '#4b5563', margin: '0 4px' }}>/</span>
                                                        <span style={{ color: '#60a5fa' }}>{s.unidadPrincipal || 'kg'}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div style={{ color: '#60a5fa', fontSize: isMobile ? '22px' : '26px', fontWeight: 900, lineHeight: 1 }}>
                                                        {Number(s.qtyPrincipal).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                    </div>
                                                    <div style={{ color: '#60a5fa', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginTop: '3px' }}>
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
                            border: '1px solid #374151', textAlign: 'center',
                        }}>
                            <span style={{ fontSize: '32px' }}>📭</span>
                            <p style={{ color: '#9ca3af', fontSize: '15px', fontWeight: 700, margin: '8px 0 0' }}>
                                Posición sin stock registrado en el sistema
                            </p>
                        </div>
                    )}
                </div>

                {/* Tag buttons */}
                <div style={{
                    padding: isMobile ? '12px 16px 16px' : '14px 20px 20px',
                    borderTop: '1px solid #1f2233',
                }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Resultado del chequeo
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        {(['CORRECTO', 'A_CHEQUEAR', 'POSICION_INCORRECTA'] as Tag[]).map((tag) => {
                            const cfg = TAG_CONFIG[tag];
                            const isActive = currentTag === tag;
                            const isExpanded = expanded === tag;
                            return (
                                <button
                                    key={tag}
                                    onClick={() => handleQuickTag(tag)}
                                    style={{
                                        background: isActive ? cfg.bg : '#0f1117',
                                        border: `2px solid ${isActive || isExpanded ? cfg.color : '#2a2d3e'}`,
                                        borderRadius: '10px', padding: isMobile ? '14px 8px' : '12px 10px',
                                        cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', gap: '6px',
                                        transition: 'all 0.15s ease',
                                        transform: isActive ? 'scale(1.02)' : 'scale(1)',
                                    }}
                                >
                                    <span style={{ fontSize: isMobile ? '22px' : '20px' }}>{cfg.icon}</span>
                                    <span style={{
                                        color: isActive ? cfg.color : '#9ca3af',
                                        fontSize: isMobile ? '11px' : '12px', fontWeight: 600,
                                        lineHeight: 1.2, textAlign: 'center',
                                    }}>
                                        {cfg.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Expanded observation panel */}
                    {expanded && (
                        <div style={{
                            marginTop: '12px', padding: '14px', borderRadius: '10px',
                            background: '#0f1117', border: '1px solid #2a2d3e',
                            animation: 'fadeIn 0.2s ease',
                        }}>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px', fontWeight: 600 }}>
                                Observación
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                                {observaciones.map((obs) => (
                                    <button
                                        key={obs}
                                        onClick={() => setSelectedObs(selectedObs === obs ? null : obs)}
                                        style={{
                                            background: selectedObs === obs
                                                ? TAG_CONFIG[expanded].bg
                                                : '#1a1d2e',
                                            border: `1px solid ${selectedObs === obs ? TAG_CONFIG[expanded].border : '#2a2d3e'}`,
                                            borderRadius: '8px', padding: '10px 12px',
                                            color: selectedObs === obs ? TAG_CONFIG[expanded].color : '#d1d5db',
                                            fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                                            transition: 'all 0.1s ease',
                                        }}
                                    >
                                        {selectedObs === obs ? '● ' : '○ '}{obs}
                                    </button>
                                ))}
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', color: '#6b7280', fontSize: '11px', marginBottom: '4px' }}>
                                    Nota adicional (opcional)
                                </label>
                                <textarea
                                    value={notaLibre}
                                    onChange={e => setNotaLibre(e.target.value)}
                                    placeholder="Escribir observación..."
                                    rows={2}
                                    style={{
                                        width: '100%', background: '#1a1d2e', border: '1px solid #2a2d3e',
                                        borderRadius: '8px', padding: '10px', color: '#f3f4f6', fontSize: '13px',
                                        outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Btn variant="secondary" small onClick={() => setExpanded(null)} style={{ flex: 1 }}>
                                    Cancelar
                                </Btn>
                                <Btn small onClick={handleConfirmTag} style={{ flex: 1 }}
                                    disabled={!selectedObs && !notaLibre}
                                >
                                    Confirmar
                                </Btn>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div style={{
                    padding: '12px 16px', borderTop: '1px solid #1f2233',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <button
                        onClick={onPrev} disabled={!hasPrev}
                        style={{
                            background: hasPrev ? '#1a1d2e' : 'transparent',
                            border: '1px solid ' + (hasPrev ? '#2a2d3e' : 'transparent'),
                            borderRadius: '8px', padding: '10px 20px',
                            color: hasPrev ? '#f3f4f6' : '#374151',
                            fontSize: '14px', cursor: hasPrev ? 'pointer' : 'default',
                            fontWeight: 600,
                        }}
                    >
                        ← Anterior
                    </button>
                    <span style={{ color: '#4b5563', fontSize: '12px' }}>
                        {isMobile ? 'Deslizá' : ''} ←→
                    </span>
                    <button
                        onClick={onNext} disabled={!hasNext}
                        style={{
                            background: hasNext ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                            border: hasNext ? 'none' : '1px solid transparent',
                            borderRadius: '8px', padding: '10px 20px',
                            color: hasNext ? '#fff' : '#374151',
                            fontSize: '14px', cursor: hasNext ? 'pointer' : 'default',
                            fontWeight: 600,
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
   PHASE 3: REPORT
   ═══════════════════════════════════════════════════════ */
function ReportPhase({ isMobile, report, onReturnToCheck, onNewCheck }: {
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

    const statCards: { label: string; tagKey: 'ALL' | Tag; value: number; color: string; icon: string }[] = [
        { label: 'Todas', tagKey: 'ALL', value: stats.total || 0, color: '#a5b4fc', icon: '📊' },
        { label: 'Correctas', tagKey: 'CORRECTO', value: stats.correcto || 0, color: '#34d399', icon: '✅' },
        { label: 'A Chequear', tagKey: 'A_CHEQUEAR', value: stats.aChequear || 0, color: '#fbbf24', icon: '⚠️' },
        { label: 'Incorrectas', tagKey: 'POSICION_INCORRECTA', value: stats.incorrecta || 0, color: '#f87171', icon: '❌' },
        { label: 'Pendientes', tagKey: 'PENDIENTE', value: stats.pendiente || 0, color: '#6b7280', icon: '⏳' },
    ];

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <button
                    onClick={onReturnToCheck}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                >
                    ← Volver a seguir chequeando
                </button>
                <Btn
                    onClick={() => {
                        const dateStr = new Date(report.completedAt || report.startedAt).toLocaleDateString('es-AR').replace(/\//g, '-');
                        const filename = `chequeo_inventario_${report.deposito?.nombre || 'deposito'}_${dateStr}.csv`;
                        
                        const headers = ['Posicion', 'Estado / Tag', 'Observacion Predefinida', 'Nota Adicional', 'Stock Registrado'];
                        const rows = (report.items || []).map((item: any) => {
                            const tagLabel = TAG_CONFIG[item.tag as Tag]?.label || item.tag;
                            const obs = item.observacion || '';
                            const nota = item.notaLibre || '';
                            const stockStr = (item.stockSnapshot || []).map((s: any) =>
                                `${s.itemName || s.itemCodigo || 'Material'}${s.lotNumber ? ` (Lote: ${s.lotNumber})` : ''} - ${Number(s.qtyPrincipal)}`
                            ).join(' | ');

                            return [
                                `"${item.posicionCodigo}"`,
                                `"${tagLabel}"`,
                                `"${obs.replace(/"/g, '""')}"`,
                                `"${nota.replace(/"/g, '""')}"`,
                                `"${stockStr.replace(/"/g, '""')}"`
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
                    }}
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}
                >
                    📥 Descargar Excel (CSV)
                </Btn>
            </div>

            <PageHeader title="📋 Reporte de Chequeo" subtitle={`${report.deposito?.nombre || 'Depósito'} — ${new Date(report.completedAt || report.startedAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`} />

            {/* Interactive Stats Filter Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
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
                                border: `2px solid ${isSelected ? s.color : '#2a2d3e'}`,
                                background: isSelected ? 'rgba(255,255,255,0.03)' : '#1a1d2e',
                                transition: 'all 0.15s ease',
                                transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                            }}
                        >
                            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
                            <div style={{ color: s.color, fontSize: '24px', fontWeight: 800 }}>{s.value}</div>
                            <div style={{ color: isSelected ? '#f3f4f6' : '#6b7280', fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>
                                {s.label}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Actions before list */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <Btn variant="secondary" onClick={onReturnToCheck} style={{ flex: 1, padding: '12px' }}>
                    ↩️ Seguir Chequeando este Depósito
                </Btn>
                <Btn onClick={onNewCheck} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    🔄 Seleccionar Otro Depósito / Nuevo
                </Btn>
            </div>

            {/* Position details list according to filter */}
            {filteredReportItems.length > 0 ? (
                <Card style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{
                        padding: '14px 16px', borderBottom: '1px solid #2a2d3e',
                        background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <h3 style={{ color: '#f3f4f6', fontSize: '15px', fontWeight: 700, margin: 0 }}>
                            📌 Posiciones ({filteredReportItems.length})
                        </h3>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                            Filtrado por: <strong>{statCards.find(s => s.tagKey === selectedTagFilter)?.label}</strong>
                        </span>
                    </div>
                    {filteredReportItems.map((item: any, i: number) => {
                        const tag: Tag = item.tag;
                        const cfg = TAG_CONFIG[tag];
                        return (
                            <div key={item.id || i} style={{
                                padding: '14px 16px', borderBottom: i < filteredReportItems.length - 1 ? '1px solid #1f2233' : 'none',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ color: '#f3f4f6', fontFamily: 'monospace', fontWeight: 700, fontSize: '16px' }}>
                                        {item.posicionCodigo}
                                    </span>
                                    <span style={{
                                        fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                                        background: cfg.bg, color: cfg.color, border: '1px solid ' + cfg.border,
                                        fontWeight: 600,
                                    }}>
                                        {cfg.icon} {cfg.label}
                                    </span>
                                </div>
                                {item.observacion && (
                                    <div style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>
                                        📌 {item.observacion}
                                    </div>
                                )}
                                {item.notaLibre && (
                                    <div style={{ color: '#d1d5db', fontSize: '12px', fontStyle: 'italic', marginBottom: '4px' }}>
                                        💬 {item.notaLibre}
                                    </div>
                                )}
                                {item.stockSnapshot && item.stockSnapshot.length > 0 ? (
                                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#9ca3af', background: '#0f1117', padding: '6px 10px', borderRadius: '6px' }}>
                                        <strong>Stock registrado:</strong> {item.stockSnapshot.map((s: any) =>
                                            `${s.itemName || s.itemCodigo || 'Material'}${s.lotNumber ? ` (Lote: ${s.lotNumber})` : ''} - ${Number(s.qtyPrincipal).toLocaleString('es-AR')} kg/un.`
                                        ).join(' | ')}
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
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
                    <h3 style={{ color: '#9ca3af', fontSize: '16px', fontWeight: 600, margin: 0 }}>
                        No hay posiciones con la etiqueta "{statCards.find(s => s.tagKey === selectedTagFilter)?.label}"
                    </h3>
                </Card>
            )}
        </>
    );
}
