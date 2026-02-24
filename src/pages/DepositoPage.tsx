import { useState, useMemo } from 'react';
import { useGetStockQuery } from '../features/stock/api/stock.api';
import { useGetDepotsQuery, useCreateDepotMutation, useUpdateDepotMutation, useDeleteDepotMutation, useCreatePositionMutation, useUpdatePositionMutation, useDeletePositionMutation } from '../features/depots/api/depots.api';
import { useCreateRemitoEntradaMutation } from '../features/remitosEntrada/api/remitos-entrada.api';
import { useGetItemsQuery } from '../features/items/api/items.api';
import { useGetPartnersQuery } from '../features/partners/api/partners.api';
import { PageHeader, Card, Btn, Input, Select, Modal, Table, Badge, SearchBar } from './common/ui';

const emptyQuickLine = () => ({ itemId: '', codigoInterno: '', descripcion: '', supplierId: '', supplierName: '', newSupplier: false, lotNumber: '', posicionId: '', kilos: '', unidades: '' });

export default function DepositoPage() {
    const { data: depots = [], isLoading: loadingDepots } = useGetDepotsQuery();
    const [createDepot] = useCreateDepotMutation();
    const [updateDepot] = useUpdateDepotMutation();
    const [deleteDepot] = useDeleteDepotMutation();
    const [createPosition] = useCreatePositionMutation();
    const [updatePosition] = useUpdatePositionMutation();
    const [deletePosition] = useDeletePositionMutation();
    const [createRemito] = useCreateRemitoEntradaMutation();
    const { data: items = [] } = useGetItemsQuery({});
    const { data: suppliers = [] } = useGetPartnersQuery({ type: 'SUPPLIER' });

    const [activeDepotId, setActiveDepotId] = useState<string>('');
    const activeDepot = depots.find((d: any) => d.id === activeDepotId);

    // Stock filters
    const [q, setQ] = useState('');
    const [filterSupplier, setFilterSupplier] = useState('');
    const { data: stock = [], isLoading: loadingStock } = useGetStockQuery({ depotId: activeDepotId || undefined, q: q || undefined, supplierId: filterSupplier || undefined });

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

    // Quick load form
    const [showQuick, setShowQuick] = useState(false);
    const [quickLines, setQuickLines] = useState([emptyQuickLine()]);
    const [quickError, setQuickError] = useState('');
    const [quickSaving, setQuickSaving] = useState(false);

    const positions: any[] = activeDepot?.positions ?? [];
    const entradaPos = positions.find((p: any) => p.codigo === 'ENTRADA');

    const saveDepot = async () => {
        if (!depotForm.nombre.trim()) { setDepotError('El nombre es obligatorio'); return; }
        setDepotSaving(true); setDepotError('');
        try {
            if (editDepot) {
                await updateDepot({ id: editDepot.id, data: depotForm }).unwrap();
            } else {
                const newDepot = await createDepot(depotForm).unwrap();
                if (newDepot?.id) setActiveDepotId(newDepot.id);
            }
            setShowDepotForm(false); setEditDepot(null); setDepotForm({ nombre: '', planta: '', tipo: 'STORAGE' });
        } catch (e: any) { setDepotError(e?.data?.message ?? 'Error al guardar el depósito'); }
        setDepotSaving(false);
    };

    const savePosition = async () => {
        if (!activeDepotId) return;
        if (!posForm.codigo.trim()) { setPosError('El código es obligatorio'); return; }
        setPosSaving(true); setPosError('');
        try {
            if (editPos) await updatePosition({ id: editPos.id, data: posForm }).unwrap();
            else await createPosition({ depotId: activeDepotId, data: posForm }).unwrap();
            setShowPosForm(false); setEditPos(null); setPosForm({ codigo: '', tipo: 'STORAGE' });
        } catch (e: any) { setPosError(e?.data?.message ?? 'Error al guardar la posición'); }
        setPosSaving(false);
    };

    const saveQuick = async () => {
        setQuickSaving(true); setQuickError('');
        try {
            const dto: any = {
                numero: `CRR-${Date.now()}`,
                fecha: new Date().toISOString().split('T')[0],
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
            // Resolve supplier – if any line has a supplier, use first one
            const firstLine = quickLines[0];
            if (firstLine.newSupplier && firstLine.supplierName) dto.supplierName = firstLine.supplierName;
            else if (firstLine.supplierId) dto.supplierId = firstLine.supplierId;
            else dto.supplierName = 'Sin proveedor';

            await createRemito(dto).unwrap();
            setShowQuick(false); setQuickLines([emptyQuickLine()]);
        } catch (e: any) { setQuickError(e?.data?.message ?? 'Error al guardar'); }
        setQuickSaving(false);
    };

    const updateQL = (i: number, field: string, val: string) =>
        setQuickLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

    // Unique suppliers for filter from stock
    const stockSuppliers = useMemo(() => {
        const map = new Map<string, string>();
        stock.forEach((s: any) => { if (s.batch?.supplier) map.set(s.batch.supplier.id, s.batch.supplier.name); });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [stock]);

    // Merge positions + stock so empty positions still appear as rows
    const tableRows = useMemo(() => {
        if (!activeDepot) {
            // No depot selected: show raw stock rows
            return stock.map((s: any) => ({ pos: s.posicion, stock: s, empty: false }));
        }
        const rows: { pos: any; stock: any; empty: boolean }[] = [];
        const usedStockIds = new Set<string>();

        positions.forEach((pos: any) => {
            const posStock = stock.filter((s: any) => s.posicionId === pos.id && !usedStockIds.has(`${s.posicionId}-${s.lotId}`));
            if (posStock.length > 0) {
                posStock.forEach((s: any) => {
                    usedStockIds.add(`${s.posicionId}-${s.lotId}`);
                    rows.push({ pos, stock: s, empty: false });
                });
            } else {
                rows.push({ pos, stock: null, empty: true });
            }
        });
        // Any stock not matched to a know position (shouldn't happen but just in case)
        stock.forEach((s: any) => {
            if (!usedStockIds.has(`${s.posicionId}-${s.lotId}`)) rows.push({ pos: s.posicion, stock: s, empty: false });
        });
        return rows;
    }, [activeDepot, positions, stock]);

    const depotSelectorOptions = [
        { value: '', label: '— Todos los depósitos —' },
        ...depots.map((d: any) => ({ value: d.id, label: `${d.nombre}${d.planta ? ` · ${d.planta}` : ''}` })),
        { value: '__new__', label: '+ Nuevo Depósito' },
    ];

    const handleDepotSelect = (v: string) => {
        if (v === '__new__') {
            setEditDepot(null); setDepotForm({ nombre: '', planta: '', tipo: 'STORAGE' }); setShowDepotForm(true);
        } else {
            setActiveDepotId(v);
        }
    };

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

            {/* Positions chips removed — positions are now shown inline in the table */}

            {/* Stock table */}
            <Card>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2d3e', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <SearchBar value={q} onChange={setQ} placeholder="Material, código, proveedor, partida..." />
                    <Select value={filterSupplier} onChange={setFilterSupplier}
                        options={[{ value: '', label: 'Todos los proveedores' }, ...stockSuppliers.map(s => ({ value: s.id, label: s.name }))]}
                        style={{ width: '200px' }} />
                </div>
                <Table
                    loading={loadingStock}
                    cols={['Posición', 'Material', 'Código', 'Partida', 'Proveedor', 'Kilos', 'Unidades', '']}
                    rows={tableRows.map(({ pos, stock: s, empty }) => [
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Badge color={pos?.tipo === 'PICKING' ? '#34d399' : '#a5b4fc'}>{pos?.codigo ?? '—'}</Badge>
                        </div>,
                        empty ? <span style={{ color: '#4b5563', fontStyle: 'italic' }}>Vacía</span> : (s?.batch?.item?.descripcion ?? '—'),
                        empty ? '—' : <code style={{ color: '#a5b4fc', fontSize: '11px' }}>{s?.batch?.item?.codigoInterno ?? '—'}</code>,
                        empty ? '—' : <code style={{ fontSize: '11px', color: '#fbbf24' }}>{s?.batch?.lotNumber ?? '—'}</code>,
                        empty ? '—' : (s?.batch?.supplier?.name ?? '—'),
                        empty ? <span style={{ color: '#374151' }}>—</span> : <strong style={{ color: '#34d399' }}>{Number(s?.qtyPrincipal).toFixed(2)} kg</strong>,
                        empty ? '—' : (s?.qtySecundaria != null ? s.qtySecundaria : '—'),
                        pos ? (
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <Btn small variant="secondary" onClick={() => { setEditPos(pos); setPosForm({ codigo: pos.codigo, tipo: pos.tipo }); setShowPosForm(true); }}>✏️</Btn>
                                <Btn small variant="danger" onClick={() => deletePosition(pos.id)}>🗑</Btn>
                            </div>
                        ) : null,
                    ])}
                />
            </Card>

            {/* Depot modal */}
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

            {/* Position modal */}
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

            {/* Quick load modal */}
            {showQuick && (
                <Modal title="⚡ Carga Rápida de Stock" onClose={() => { setShowQuick(false); setQuickLines([emptyQuickLine()]); setQuickError(''); }} wide>
                    <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '16px', marginTop: 0 }}>
                        Cargá stock directamente al depósito <strong style={{ color: '#a5b4fc' }}>{activeDepot?.nombre}</strong> sin generar un remito formal.
                    </p>

                    {/* Global supplier for all lines */}
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

                    {/* Lines */}
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
                                    options={[{ value: '', label: 'Seleccionar o tipear...' }, ...items.map((it: any) => ({ value: it.id, label: `${it.codigoInterno} - ${it.descripcion}` }))]}
                                />
                                <Select
                                    label="Posición"
                                    value={line.posicionId}
                                    onChange={v => updateQL(i, 'posicionId', v)}
                                    options={[
                                        { value: '', label: entradaPos ? `ENTRADA (def.)` : '—' },
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
