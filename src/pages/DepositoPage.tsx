import { useState, useMemo, useRef, useEffect } from 'react';
import { useGetStockQuery, useAdjustStockMutation, useMoveStockMutation, useDeleteStockMutation, useUpdateBatchNumberMutation } from '../features/stock/api/stock.api';
import { useGetDepotsQuery, useCreateDepotMutation, useUpdateDepotMutation, useDeleteDepotMutation, useCreatePositionMutation, useUpdatePositionMutation, useDeletePositionMutation } from '../features/depots/api/depots.api';
import { useCreateRemitoEntradaMutation } from '../features/remitosEntrada/api/remitos-entrada.api';
import { useGetItemsQuery } from '../features/items/api/items.api';
import { useGetPartnersQuery } from '../features/partners/api/partners.api';
import { PageHeader, Card, Btn, Input, Select, Modal, Badge, SearchBar } from './common/ui';

const TODAY = new Date().toISOString().split('T')[0];
const emptyQuickLine = () => ({ itemId: '', codigoInterno: '', descripcion: '', supplierId: '', supplierName: '', newSupplier: false, lotNumber: '', posicionId: '', kilos: '', unidades: '' });

/* ─── Inline-editable cell ─── */
function EditableCell({ value, onSave, numeric }: { value: string; onSave: (v: string) => Promise<void>; numeric?: boolean }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

    const commit = async () => {
        if (draft === value) { setEditing(false); return; }
        setSaving(true);
        try { await onSave(draft); setEditing(false); } catch { /* keep open on error */ }
        setSaving(false);
    };

    if (!editing) return (
        <span
            onClick={() => { setDraft(value); setEditing(true); }}
            title="Click para editar"
            style={{ cursor: 'pointer', borderBottom: '1px dashed #4b5563', paddingBottom: '1px' }}
        >{value || '—'}</span>
    );

    return (
        <input
            ref={ref}
            type={numeric ? 'number' : 'text'}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            disabled={saving}
            style={{
                width: '90px', background: '#0f1117', border: '1px solid #6366f1',
                borderRadius: '6px', padding: '3px 8px', color: '#f3f4f6',
                fontSize: '13px', outline: 'none',
            }}
        />
    );
}

/* ─── Column filter dropdown ─── */
function ColFilter({ label, options, selected, onChange }: {
    label: string;
    options: string[];
    selected: Set<string>;
    onChange: (s: Set<string>) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const active = selected.size > 0 && selected.size < options.length;

    const toggle = (v: string) => {
        const next = new Set(selected);
        if (next.has(v)) next.delete(v); else next.add(v);
        onChange(next);
    };

    const toggleAll = () => onChange(selected.size === options.length ? new Set() : new Set(options));

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={() => setOpen(p => !p)}
                style={{
                    background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
                    border: `1px solid ${active ? '#6366f1' : '#374151'}`,
                    borderRadius: '6px', padding: '3px 8px',
                    color: active ? '#a5b4fc' : '#6b7280', fontSize: '11px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                }}
            >{label} {active ? `(${selected.size})` : ''} ▾</button>

            {open && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, zIndex: 200, marginTop: '4px',
                    background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '10px',
                    minWidth: '180px', maxHeight: '240px', overflow: 'auto', padding: '8px 0',
                }}>
                    <div
                        onClick={toggleAll}
                        style={{ padding: '6px 14px', fontSize: '11px', color: '#9ca3af', cursor: 'pointer', borderBottom: '1px solid #2a2d3e', marginBottom: '4px' }}
                    >{selected.size === options.length ? 'Deseleccionar todo' : 'Seleccionar todo'}</div>
                    {options.map(o => (
                        <label key={o} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 14px', cursor: 'pointer', fontSize: '12px', color: '#d1d5db' }}>
                            <input type="checkbox" checked={selected.has(o)} onChange={() => toggle(o)} style={{ accentColor: '#6366f1' }} />
                            {o || '(vacío)'}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function DepositoPage() {
    const { data: depots = [], isLoading: loadingDepots } = useGetDepotsQuery();
    const [createDepot] = useCreateDepotMutation();
    const [updateDepot] = useUpdateDepotMutation();
    const [deleteDepot] = useDeleteDepotMutation();
    const [createPosition] = useCreatePositionMutation();
    const [updatePosition] = useUpdatePositionMutation();
    const [deletePosition] = useDeletePositionMutation();
    const [createRemito] = useCreateRemitoEntradaMutation();
    const [adjustStock] = useAdjustStockMutation();
    const [moveStock] = useMoveStockMutation();
    const [deleteStock] = useDeleteStockMutation();
    const [updateBatch] = useUpdateBatchNumberMutation();
    const { data: items = [] } = useGetItemsQuery({});
    const { data: suppliers = [] } = useGetPartnersQuery({ type: 'SUPPLIER' });

    const [activeDepotId, setActiveDepotId] = useState<string>('');
    const activeDepot = depots.find((d: any) => d.id === activeDepotId);

    // Search
    const [q, setQ] = useState('');
    const { data: stock = [], isLoading: loadingStock } = useGetStockQuery({ depotId: activeDepotId || undefined, q: q || undefined });

    // Column filters (client-side)
    const [filterPos, setFilterPos] = useState<Set<string>>(new Set());
    const [filterMat, setFilterMat] = useState<Set<string>>(new Set());
    const [filterProv, setFilterProv] = useState<Set<string>>(new Set());

    // Depot form
    const [showDepotForm, setShowDepotForm] = useState(false);
    const [editDepot, setEditDepot] = useState<any>(null);
    const [depotForm, setDepotForm] = useState({ nombre: '', planta: '', tipo: 'STORAGE' });
    const [depotError, setDepotError] = useState('');
    const [depotSaving, setDepotSaving] = useState(false);

    // Position form
    const [showPosForm, setShowPosForm] = useState(false);
    const [editPos, setEditPos] = useState<any>(null);
    const [posForm, setPosForm] = useState({ codigo: '', tipo: 'STORAGE' });
    const [posError, setPosError] = useState('');
    const [posSaving, setPosSaving] = useState(false);

    // Quick load
    const [showQuick, setShowQuick] = useState(false);
    const [quickLines, setQuickLines] = useState([emptyQuickLine()]);
    const [quickError, setQuickError] = useState('');
    const [quickSaving, setQuickSaving] = useState(false);

    // Delete confirm
    const [confirmDelete, setConfirmDelete] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    // Move modal
    const [moveRow, setMoveRow] = useState<any>(null);
    const [moveKilos, setMoveKilos] = useState('');
    const [moveUnidades, setMoveUnidades] = useState('');
    const [moveDest, setMoveDest] = useState('');
    const [moveError, setMoveError] = useState('');
    const [moveSaving, setMoveSaving] = useState(false);

    // Codes popup
    const [showCodesPopup, setShowCodesPopup] = useState(false);
    const [hiddenCodes, setHiddenCodes] = useState<Set<string>>(new Set());

    const positions: any[] = activeDepot?.positions ?? [];
    const entradaPos = positions.find((p: any) => p.codigo === 'ENTRADA');

    /* ─── Derived filter options ─── */
    const allPosOptions = useMemo(() => [...new Set(stock.map((s: any) => s.posicion?.codigo ?? ''))], [stock]);
    const allMatOptions = useMemo(() => [...new Set(stock.map((s: any) => s.batch?.item?.descripcion ?? ''))], [stock]);
    const allProvOptions = useMemo(() => [...new Set(stock.map((s: any) => s.batch?.supplier?.name ?? ''))], [stock]);

    // Init sets when stock loads
    useEffect(() => { setFilterPos(new Set(allPosOptions)); }, [stock.length]);
    useEffect(() => { setFilterMat(new Set(allMatOptions)); }, [stock.length]);
    useEffect(() => { setFilterProv(new Set(allProvOptions)); }, [stock.length]);

    /* ─── Filtered rows ─── */
    const filteredStock = useMemo(() => {
        return stock.filter((s: any) => {
            const pos = s.posicion?.codigo ?? '';
            const mat = s.batch?.item?.descripcion ?? '';
            const prov = s.batch?.supplier?.name ?? '';
            const code = s.batch?.item?.codigoInterno ?? '';
            if (filterPos.size && !filterPos.has(pos)) return false;
            if (filterMat.size && !filterMat.has(mat)) return false;
            if (filterProv.size && !filterProv.has(prov)) return false;
            if (hiddenCodes.has(code)) return false;
            return true;
        });
    }, [stock, filterPos, filterMat, filterProv, hiddenCodes]);

    /* ─── Metrics ─── */
    const metrics = useMemo(() => {
        const totalKilos = filteredStock.reduce((s: number, r: any) => s + Number(r.qtyPrincipal ?? 0), 0);
        const totalUnidades = filteredStock.reduce((s: number, r: any) => s + Number(r.qtySecundaria ?? 0), 0);
        const codes = new Set(filteredStock.map((r: any) => r.batch?.item?.codigoInterno)).size;
        const posis = new Set(filteredStock.map((r: any) => r.posicionId)).size;
        return { totalKilos, totalUnidades, codes, posis };
    }, [filteredStock]);

    const allCodes = useMemo(() => [...new Set(stock.map((s: any) => s.batch?.item?.codigoInterno ?? ''))], [stock]);

    /* ─── Handlers ─── */
    const saveDepot = async () => {
        if (!depotForm.nombre.trim()) { setDepotError('El nombre es obligatorio'); return; }
        setDepotSaving(true); setDepotError('');
        try {
            if (editDepot) { await updateDepot({ id: editDepot.id, data: depotForm }).unwrap(); }
            else { const d = await createDepot(depotForm).unwrap(); if (d?.id) setActiveDepotId(d.id); }
            setShowDepotForm(false); setEditDepot(null); setDepotForm({ nombre: '', planta: '', tipo: 'STORAGE' });
        } catch (e: any) { setDepotError(e?.data?.message ?? 'Error'); }
        setDepotSaving(false);
    };

    const savePosition = async () => {
        if (!activeDepotId || !posForm.codigo.trim()) { setPosError('El código es obligatorio'); return; }
        setPosSaving(true); setPosError('');
        try {
            if (editPos) await updatePosition({ id: editPos.id, data: posForm }).unwrap();
            else await createPosition({ depotId: activeDepotId, data: posForm }).unwrap();
            setShowPosForm(false); setEditPos(null); setPosForm({ codigo: '', tipo: 'STORAGE' });
        } catch (e: any) { setPosError(e?.data?.message ?? 'Error'); }
        setPosSaving(false);
    };

    const saveQuick = async () => {
        setQuickSaving(true); setQuickError('');
        try {
            const dto: any = {
                numero: `CRR-${Date.now()}`,
                fecha: TODAY,
                lines: quickLines.filter(l => l.itemId || l.codigoInterno).map(l => ({
                    itemId: l.itemId || undefined,
                    codigoInterno: l.codigoInterno || undefined,
                    descripcion: l.descripcion || undefined,
                    lotNumber: l.lotNumber || undefined,
                    posicionId: l.posicionId || entradaPos?.id || undefined,
                    kilos: Number(l.kilos),
                    unidades: l.unidades ? Number(l.unidades) : undefined,
                })),
            };
            const firstLine = quickLines[0];
            if (firstLine.newSupplier && firstLine.supplierName) dto.supplierName = firstLine.supplierName;
            else if (firstLine.supplierId) dto.supplierId = firstLine.supplierId;
            else dto.supplierName = 'Sin proveedor';
            await createRemito(dto).unwrap();
            setShowQuick(false); setQuickLines([emptyQuickLine()]);
        } catch (e: any) { setQuickError(e?.data?.message ?? 'Error'); }
        setQuickSaving(false);
    };

    const confirmRemove = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        try {
            await deleteStock({
                depositoId: confirmDelete.depositoId,
                posicionId: confirmDelete.posicionId,
                itemId: confirmDelete.itemId,
                lotId: confirmDelete.lotId,
                fecha: TODAY,
            }).unwrap();
            setConfirmDelete(null);
        } catch { /* stay open */ }
        setDeleting(false);
    };

    const doMove = async () => {
        if (!moveRow || !moveDest) { setMoveError('Seleccioná una posición destino'); return; }
        if (!moveKilos || Number(moveKilos) <= 0) { setMoveError('Ingresá los kilos a mover'); return; }
        setMoveSaving(true); setMoveError('');
        try {
            await moveStock({
                depositoId: moveRow.depositoId,
                posicionIdOrigen: moveRow.posicionId,
                posicionIdDestino: moveDest,
                itemId: moveRow.itemId,
                lotId: moveRow.lotId,
                kilos: Number(moveKilos),
                unidades: moveUnidades ? Number(moveUnidades) : null,
                fecha: TODAY,
            }).unwrap();
            setMoveRow(null); setMoveKilos(''); setMoveUnidades(''); setMoveDest('');
        } catch (e: any) { setMoveError(e?.data?.message ?? 'Error al mover'); }
        setMoveSaving(false);
    };

    const handleAdjustKilos = async (s: any, newVal: string) => {
        const newKilos = Number(newVal);
        const delta = newKilos - Number(s.qtyPrincipal);
        await adjustStock({ depositoId: s.depositoId, posicionId: s.posicionId, itemId: s.itemId, lotId: s.lotId, deltaKilos: delta, fecha: TODAY }).unwrap();
    };

    const handleAdjustUnidades = async (s: any, newVal: string) => {
        const newU = Number(newVal);
        const delta = newU - Number(s.qtySecundaria ?? 0);
        await adjustStock({ depositoId: s.depositoId, posicionId: s.posicionId, itemId: s.itemId, lotId: s.lotId, deltaKilos: 0, deltaUnidades: delta, fecha: TODAY }).unwrap();
    };

    const handleUpdateBatch = async (s: any, newLot: string) => {
        await updateBatch({ batchId: s.lotId, newLotNumber: newLot }).unwrap();
    };

    const updateQL = (i: number, field: string, val: string) =>
        setQuickLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

    const depotSelectorOptions = [
        { value: '', label: '— Todos los depósitos —' },
        ...depots.map((d: any) => ({ value: d.id, label: `${d.nombre}${d.planta ? ` · ${d.planta}` : ''}` })),
        { value: '__new__', label: '+ Nuevo Depósito' },
    ];

    const handleDepotSelect = (v: string) => {
        if (v === '__new__') { setEditDepot(null); setDepotForm({ nombre: '', planta: '', tipo: 'STORAGE' }); setShowDepotForm(true); }
        else setActiveDepotId(v);
    };

    /* ─── Metric card ─── */
    const MetricCard = ({ label, value, onClick, highlight }: { label: string; value: string | number; onClick?: () => void; highlight?: boolean }) => (
        <div
            onClick={onClick}
            style={{
                background: '#0f1117', border: `1px solid ${highlight ? '#6366f1' : '#2a2d3e'}`,
                borderRadius: '10px', padding: '12px 18px', minWidth: '120px',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => onClick && ((e.currentTarget as HTMLElement).style.borderColor = '#a5b4fc')}
            onMouseLeave={e => onClick && ((e.currentTarget as HTMLElement).style.borderColor = highlight ? '#6366f1' : '#2a2d3e')}
        >
            <div style={{ color: '#6b7280', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            <div style={{ color: highlight ? '#a5b4fc' : '#f3f4f6', fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{value}</div>
        </div>
    );

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <PageHeader title="Depósito" subtitle="Gestión de posiciones y stock">
                <Select
                    value={activeDepotId || ''}
                    onChange={handleDepotSelect}
                    options={loadingDepots ? [{ value: '', label: 'Cargando...' }] : depotSelectorOptions}
                    style={{ minWidth: '220px' }}
                />
                {activeDepotId && (
                    <>
                        <Btn small variant="secondary" onClick={() => { setEditDepot(activeDepot); setDepotForm({ nombre: activeDepot.nombre, planta: activeDepot.planta ?? '', tipo: activeDepot.tipo }); setShowDepotForm(true); }}>✏️</Btn>
                        <Btn small variant="danger" onClick={() => { deleteDepot(activeDepotId); setActiveDepotId(''); }}>🗑</Btn>
                        <Btn small variant="secondary" onClick={() => { setEditPos(null); setPosForm({ codigo: '', tipo: 'STORAGE' }); setShowPosForm(true); }}>+ Posición</Btn>
                        <Btn small onClick={() => setShowQuick(true)}>⚡ Carga Rápida</Btn>
                    </>
                )}
            </PageHeader>

            {/* Metrics bar */}
            {filteredStock.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <MetricCard label="Total Kilos" value={metrics.totalKilos.toFixed(2) + ' kg'} />
                    <MetricCard label="Total Unidades" value={metrics.totalUnidades % 1 === 0 ? metrics.totalUnidades.toFixed(0) : metrics.totalUnidades.toFixed(2)} />
                    <MetricCard label="Códigos únicos" value={metrics.codes} highlight onClick={() => setShowCodesPopup(true)} />
                    <MetricCard label="Posiciones" value={metrics.posis} />
                </div>
            )}

            {/* Stock table */}
            <Card>
                {/* Filter bar */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2d3e', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <SearchBar value={q} onChange={setQ} placeholder="Material, código, proveedor, partida..." />
                    <ColFilter label="Posición" options={allPosOptions} selected={filterPos} onChange={setFilterPos} />
                    <ColFilter label="Material" options={allMatOptions} selected={filterMat} onChange={setFilterMat} />
                    <ColFilter label="Proveedor" options={allProvOptions} selected={filterProv} onChange={setFilterProv} />
                    {(filteredStock.length !== stock.length) && (
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>
                            Mostrando {filteredStock.length} de {stock.length} registros
                        </span>
                    )}
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
                                {['Posición', 'Material', 'Código', 'Partida', 'Proveedor', 'Kilos', 'Unidades', 'Acciones'].map((c, i) => (
                                    <th key={i} style={{ padding: '10px 16px', color: '#6b7280', fontSize: '11px', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{c}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loadingStock && (
                                <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Cargando...</td></tr>
                            )}
                            {!loadingStock && filteredStock.length === 0 && (
                                <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#4b5563', fontSize: '14px' }}>Sin stock en este depósito</td></tr>
                            )}
                            {filteredStock.map((s: any, i: number) => (
                                <tr key={i} style={{ borderBottom: '1px solid #1e2133' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1e2133'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                >
                                    {/* Posición */}
                                    <td style={{ padding: '11px 16px' }}>
                                        <Badge color={s.posicion?.tipo === 'PICKING' ? '#34d399' : '#a5b4fc'}>{s.posicion?.codigo ?? '—'}</Badge>
                                    </td>
                                    {/* Material */}
                                    <td style={{ padding: '11px 16px', color: '#d1d5db', fontSize: '13px' }}>{s.batch?.item?.descripcion ?? '—'}</td>
                                    {/* Código */}
                                    <td style={{ padding: '11px 16px' }}>
                                        <code style={{ color: '#a5b4fc', fontSize: '11px' }}>{s.batch?.item?.codigoInterno ?? '—'}</code>
                                    </td>
                                    {/* Partida — editable inline */}
                                    <td style={{ padding: '11px 16px' }}>
                                        <code style={{ color: '#fbbf24', fontSize: '11px' }}>
                                            <EditableCell
                                                value={s.batch?.lotNumber ?? ''}
                                                onSave={v => handleUpdateBatch(s, v)}
                                            />
                                        </code>
                                    </td>
                                    {/* Proveedor */}
                                    <td style={{ padding: '11px 16px', color: '#9ca3af', fontSize: '12px' }}>{s.batch?.supplier?.name ?? '—'}</td>
                                    {/* Kilos — editable inline */}
                                    <td style={{ padding: '11px 16px' }}>
                                        <strong style={{ color: '#34d399' }}>
                                            <EditableCell
                                                value={Number(s.qtyPrincipal).toFixed(2)}
                                                onSave={v => handleAdjustKilos(s, v)}
                                                numeric
                                            />
                                        </strong>
                                        <span style={{ color: '#6b7280', fontSize: '11px', marginLeft: '4px' }}>kg</span>
                                    </td>
                                    {/* Unidades — editable inline */}
                                    <td style={{ padding: '11px 16px', color: '#d1d5db', fontSize: '13px' }}>
                                        {s.qtySecundaria != null ? (
                                            <EditableCell
                                                value={String(s.qtySecundaria)}
                                                onSave={v => handleAdjustUnidades(s, v)}
                                                numeric
                                            />
                                        ) : '—'}
                                    </td>
                                    {/* Acciones */}
                                    <td style={{ padding: '11px 16px' }}>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                                title="Mover a otra posición"
                                                onClick={() => {
                                                    setMoveRow(s); setMoveKilos(''); setMoveUnidades('');
                                                    setMoveDest(''); setMoveError('');
                                                }}
                                                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', padding: '4px 8px', color: '#a5b4fc', cursor: 'pointer', fontSize: '13px' }}
                                            >↪</button>
                                            <button
                                                title="Eliminar este registro"
                                                onClick={() => setConfirmDelete(s)}
                                                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', padding: '4px 8px', color: '#f87171', cursor: 'pointer', fontSize: '13px' }}
                                            >🗑</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* ─── Codes popup ─── */}
            {showCodesPopup && (
                <Modal title="Filtrar por código" onClose={() => setShowCodesPopup(false)}>
                    <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 12px' }}>Desmarcá un código para ocultarlo de la tabla.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflow: 'auto' }}>
                        {allCodes.map(code => (
                            <label key={code} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#d1d5db', fontSize: '13px' }}>
                                <input
                                    type="checkbox"
                                    checked={!hiddenCodes.has(code)}
                                    onChange={() => {
                                        setHiddenCodes(prev => {
                                            const next = new Set(prev);
                                            if (next.has(code)) next.delete(code); else next.add(code);
                                            return next;
                                        });
                                    }}
                                    style={{ accentColor: '#6366f1' }}
                                />
                                <code style={{ color: '#a5b4fc', fontSize: '12px' }}>{code}</code>
                            </label>
                        ))}
                    </div>
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                        <Btn variant="secondary" onClick={() => setShowCodesPopup(false)}>Cerrar</Btn>
                    </div>
                </Modal>
            )}

            {/* ─── Confirm delete ─── */}
            {confirmDelete && (
                <Modal title="Confirmar eliminación" onClose={() => setConfirmDelete(null)}>
                    <p style={{ color: '#d1d5db', fontSize: '14px', margin: '0 0 8px' }}>
                        ¿Eliminar <strong style={{ color: '#f3f4f6' }}>{confirmDelete.batch?.item?.descripcion}</strong> de la posición{' '}
                        <strong style={{ color: '#a5b4fc' }}>{confirmDelete.posicion?.codigo}</strong>?
                    </p>
                    <p style={{ color: '#9ca3af', fontSize: '12px', margin: '0 0 20px' }}>
                        Partida <code style={{ color: '#fbbf24' }}>{confirmDelete.batch?.lotNumber}</code> —{' '}
                        <strong style={{ color: '#34d399' }}>{Number(confirmDelete.qtyPrincipal).toFixed(2)} kg</strong>
                    </p>
                    <p style={{ color: '#f87171', fontSize: '12px', margin: '0 0 20px' }}>Esta acción registrará un movimiento de ajuste resta y no se puede deshacer.</p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Btn variant="secondary" onClick={() => setConfirmDelete(null)}>Cancelar</Btn>
                        <Btn variant="danger" onClick={confirmRemove} disabled={deleting}>{deleting ? 'Eliminando...' : 'Eliminar'}</Btn>
                    </div>
                </Modal>
            )}

            {/* ─── Move modal ─── */}
            {moveRow && (
                <Modal title="Mover stock a otra posición" onClose={() => setMoveRow(null)}>
                    <div style={{ marginBottom: '16px', background: '#0f1117', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#9ca3af' }}>
                        <strong style={{ color: '#f3f4f6' }}>{moveRow.batch?.item?.descripcion}</strong>{' '}
                        — Partida <code style={{ color: '#fbbf24' }}>{moveRow.batch?.lotNumber}</code><br />
                        Desde <Badge color="#a5b4fc">{moveRow.posicion?.codigo}</Badge>{' '}
                        Disponible: <strong style={{ color: '#34d399' }}>{Number(moveRow.qtyPrincipal).toFixed(2)} kg</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Select
                            label="Posición destino *"
                            value={moveDest}
                            onChange={setMoveDest}
                            options={[
                                { value: '', label: 'Seleccionar posición...' },
                                ...positions
                                    .filter((p: any) => p.id !== moveRow.posicionId)
                                    .map((p: any) => ({ value: p.id, label: `${p.codigo} (${p.tipo})` })),
                            ]}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <Input label="Kilos a mover *" type="number" value={moveKilos} onChange={setMoveKilos} placeholder="0.00" />
                            {moveRow.qtySecundaria != null && (
                                <Input label="Unidades a mover" type="number" value={moveUnidades} onChange={setMoveUnidades} placeholder="0" />
                            )}
                        </div>
                        {moveError && <p style={{ color: '#f87171', fontSize: '13px', margin: 0 }}>{moveError}</p>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <Btn variant="secondary" onClick={() => setMoveRow(null)}>Cancelar</Btn>
                            <Btn onClick={doMove} disabled={moveSaving}>{moveSaving ? 'Moviendo...' : '↪ Mover'}</Btn>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ─── Depot modal ─── */}
            {showDepotForm && (
                <Modal title={editDepot ? 'Editar Depósito' : 'Nuevo Depósito'} onClose={() => { setShowDepotForm(false); setDepotError(''); }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Input label="Nombre *" value={depotForm.nombre} onChange={v => setDepotForm(p => ({ ...p, nombre: v }))} placeholder="Ej: Depósito Central" />
                        <Input label="Planta (opcional)" value={depotForm.planta} onChange={v => setDepotForm(p => ({ ...p, planta: v }))} placeholder="Ej: Planta 1" />
                        <Select label="Tipo" value={depotForm.tipo} onChange={v => setDepotForm(p => ({ ...p, tipo: v }))}
                            options={[{ value: 'STORAGE', label: 'Almacenamiento' }, { value: 'PICKING', label: 'Picking' }, { value: 'MIXED', label: 'Mixto' }]} />
                        {depotError && <p style={{ color: '#f87171', margin: 0, fontSize: '13px' }}>{depotError}</p>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <Btn variant="secondary" onClick={() => { setShowDepotForm(false); setDepotError(''); }}>Cancelar</Btn>
                            <Btn onClick={saveDepot} disabled={depotSaving}>{depotSaving ? 'Guardando...' : 'Guardar'}</Btn>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ─── Position modal ─── */}
            {showPosForm && (
                <Modal title={editPos ? 'Editar Posición' : 'Nueva Posición'} onClose={() => { setShowPosForm(false); setPosError(''); }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Input label="Código de posición *" value={posForm.codigo} onChange={v => setPosForm(p => ({ ...p, codigo: v }))} placeholder="Ej: R1-F2-A" />
                        <Select label="Tipo" value={posForm.tipo} onChange={v => setPosForm(p => ({ ...p, tipo: v }))}
                            options={[{ value: 'STORAGE', label: 'Almacenamiento' }, { value: 'PICKING', label: 'Picking' }]} />
                        {posError && <p style={{ color: '#f87171', margin: 0, fontSize: '13px' }}>{posError}</p>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <Btn variant="secondary" onClick={() => { setShowPosForm(false); setPosError(''); }}>Cancelar</Btn>
                            <Btn onClick={savePosition} disabled={posSaving}>{posSaving ? 'Guardando...' : 'Guardar'}</Btn>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ─── Quick load modal ─── */}
            {showQuick && (
                <Modal title="⚡ Carga Rápida de Stock" onClose={() => { setShowQuick(false); setQuickLines([emptyQuickLine()]); setQuickError(''); }} wide>
                    <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '16px', marginTop: 0 }}>
                        Cargá stock directamente al depósito <strong style={{ color: '#a5b4fc' }}>{activeDepot?.nombre}</strong> sin generar un remito formal.
                    </p>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ color: '#9ca3af', fontSize: '12px' }}>Proveedor (aplica a todas las líneas)</label>
                        <Select
                            value={quickLines[0].newSupplier ? '__new__' : quickLines[0].supplierId}
                            onChange={v => {
                                const isNew = v === '__new__';
                                setQuickLines(prev => prev.map((l, i) => i === 0 ? { ...l, supplierId: isNew ? '' : v, newSupplier: isNew } : l));
                            }}
                            options={[{ value: '', label: 'Seleccionar...' }, { value: '__new__', label: '+ Nuevo proveedor' }, ...suppliers.map((s: any) => ({ value: s.id, label: s.name }))]}
                            style={{ marginTop: '6px' }}
                        />
                        {quickLines[0].newSupplier && (
                            <Input style={{ marginTop: '8px' }} label="Nombre del proveedor" value={quickLines[0].supplierName} onChange={v => updateQL(0, 'supplierName', v)} />
                        )}
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ color: '#9ca3af', fontSize: '12px' }}>Líneas de material</label>
                            <Btn small onClick={() => setQuickLines(p => [...p, emptyQuickLine()])}>+ Línea</Btn>
                        </div>
                        {quickLines.map((line, i) => (
                            <div key={i} style={{ background: '#0f1117', borderRadius: '8px', padding: '12px', marginBottom: '8px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                                <Select
                                    label="Material"
                                    value={line.itemId}
                                    onChange={v => {
                                        const it = items.find((x: any) => x.id === v);
                                        setQuickLines(prev => prev.map((l, j) => j === i ? { ...l, itemId: v, codigoInterno: '', descripcion: it ? it.descripcion : l.descripcion } : l));
                                    }}
                                    options={[{ value: '', label: 'Seleccionar...' }, ...items.map((it: any) => ({ value: it.id, label: `${it.codigoInterno} - ${it.descripcion}` }))]}
                                />
                                <Select
                                    label="Posición"
                                    value={line.posicionId}
                                    onChange={v => updateQL(i, 'posicionId', v)}
                                    options={[
                                        { value: '', label: entradaPos ? 'ENTRADA (def.)' : '—' },
                                        ...positions.map((p: any) => ({ value: p.id, label: `${p.codigo} (${p.tipo})` })),
                                    ]}
                                />
                                <Input label="Partida / Lote" value={line.lotNumber} onChange={v => updateQL(i, 'lotNumber', v)} />
                                <Input label="Kilos" type="number" value={line.kilos} onChange={v => updateQL(i, 'kilos', v)} />
                                <Input label="Unidades" type="number" value={line.unidades} onChange={v => updateQL(i, 'unidades', v)} />
                                <Btn small variant="danger" onClick={() => setQuickLines(p => p.filter((_, j) => j !== i))} style={{ alignSelf: 'flex-end' }}>✕</Btn>
                            </div>
                        ))}
                    </div>
                    {quickError && <p style={{ color: '#f87171', marginBottom: '8px' }}>{quickError}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Btn variant="secondary" onClick={() => { setShowQuick(false); setQuickLines([emptyQuickLine()]); }}>Cancelar</Btn>
                        <Btn onClick={saveQuick} disabled={quickSaving}>{quickSaving ? 'Guardando...' : '⚡ Cargar Stock'}</Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}
