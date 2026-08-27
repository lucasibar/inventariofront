import { useState, useMemo } from 'react';
import {
    useGetArticulosQuery,
    useDeleteArticuloMutation,
    useUpdateArticuloStatusMutation,
} from '../../features/quality/articulos/api/articulos.api';
import { PageHeader, Card, Btn, Table, Badge, SearchBar, Spinner } from '../../shared/ui';
import { CreateArticuloDialog } from '../../features/quality/articulos/components/CreateArticuloDialog';

const ROL_LABELS: Record<string, string> = {
    COLOR_BASE: '🎨 Base',
    LOGO: '🏷️ Logo',
    DETALLE_MEDIA: '🧷 Detalle',
    COLOR_TALLE: '🎨 C.Talle',
    TRIANGULO: '🔺 Triáng.',
    TALON_PUNTERA: '👟 Talón/P.',
    GOMA: '⭕ Goma',
    LYCRA: '🧵 Lycra',
};

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    CHEQUEADO: { label: '🟢 Chequeado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    CON_DUDAS: { label: '🟡 Con Dudas', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    PENDIENTE: { label: '⏳ Pendiente', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' },
    INCOMPLETO: { label: '🔴 Incompleto', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
};

export default function ArticulosCalidadPage() {
    const [q, setQ] = useState('');
    const [selectedEstado, setSelectedEstado] = useState<string>('ALL');
    const [selectedMarca, setSelectedMarca] = useState<string>('ALL');

    const { data: articulos = [], isLoading } = useGetArticulosQuery();
    const [deleteArticulo] = useDeleteArticuloMutation();
    const [updateStatus] = useUpdateArticuloStatusMutation();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<any>(null);

    // Marcas disponibles
    const marcas = useMemo(() => {
        const set = new Set<string>();
        articulos.forEach((a: any) => {
            if (a.marca) set.add(a.marca);
            if (a.cliente?.name) set.add(a.cliente.name);
        });
        return Array.from(set).sort();
    }, [articulos]);

    // Conteo por estado
    const counts = useMemo(() => {
        const c: Record<string, number> = { ALL: articulos.length, PENDIENTE: 0, CON_DUDAS: 0, CHEQUEADO: 0, INCOMPLETO: 0 };
        articulos.forEach((a: any) => {
            const st = a.estadoRevision || 'PENDIENTE';
            c[st] = (c[st] || 0) + 1;
        });
        return c;
    }, [articulos]);

    // Filtrado
    const filtered = useMemo(() => {
        return articulos.filter((a: any) => {
            // Filtro estado
            if (selectedEstado !== 'ALL' && (a.estadoRevision || 'PENDIENTE') !== selectedEstado) {
                return false;
            }
            // Filtro marca
            if (selectedMarca !== 'ALL' && (a.marca || a.cliente?.name) !== selectedMarca) {
                return false;
            }
            // Filtro texto
            if (q) {
                const words = q.toLowerCase().split(' ').filter(w => w.length > 0);
                return words.every(word =>
                    (a.codigo || '').toLowerCase().includes(word) ||
                    (a.descripcion || '').toLowerCase().includes(word) ||
                    (a.workingNumber || '').toLowerCase().includes(word) ||
                    (a.marca || '').toLowerCase().includes(word) ||
                    (a.categoria?.nombre || '').toLowerCase().includes(word) ||
                    (a.talle || '').toLowerCase().includes(word)
                );
            }
            return true;
        });
    }, [articulos, q, selectedEstado, selectedMarca]);

    const handleNew = () => { setEditTarget(null); setIsDialogOpen(true); };
    const handleEdit = (a: any) => { setEditTarget(a); setIsDialogOpen(true); };
    const handleClose = () => { setIsDialogOpen(false); setEditTarget(null); };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que querés eliminar este artículo?')) return;
        try {
            await deleteArticulo(id).unwrap();
        } catch {
            alert('Error al eliminar el artículo.');
        }
    };

    const handleQuickStatusChange = async (e: React.MouseEvent, id: string, newStatus: string) => {
        e.stopPropagation();
        try {
            await updateStatus({ id, estadoRevision: newStatus }).unwrap();
        } catch {
            alert('Error al cambiar el estado.');
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader
                title="Catálogo de Artículos — Sector Calidad"
                subtitle="Gestión y auditoría de artículos, fichas técnicas, consumos de insumos y recursos de planta."
            >
                <Btn onClick={handleNew}>+ Nuevo Artículo</Btn>
            </PageHeader>

            {/* KPI / Filtros rápidos por Estado */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <Card
                    onClick={() => setSelectedEstado('ALL')}
                    style={{
                        padding: '14px 18px',
                        cursor: 'pointer',
                        border: selectedEstado === 'ALL' ? '2px solid #6366f1' : '1px solid #2a2d3e',
                        background: selectedEstado === 'ALL' ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-secondary, #1a1d2e)',
                        transition: 'all 0.15s',
                    }}
                >
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', fontWeight: 600, textTransform: 'uppercase' }}>Total Artículos</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #f3f4f6)', marginTop: '4px' }}>{counts.ALL}</div>
                </Card>

                <Card
                    onClick={() => setSelectedEstado('PENDIENTE')}
                    style={{
                        padding: '14px 18px',
                        cursor: 'pointer',
                        border: selectedEstado === 'PENDIENTE' ? '2px solid #6366f1' : '1px solid #2a2d3e',
                        background: selectedEstado === 'PENDIENTE' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary, #1a1d2e)',
                        transition: 'all 0.15s',
                    }}
                >
                    <div style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 600, textTransform: 'uppercase' }}>⏳ Pendientes</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#818cf8', marginTop: '4px' }}>{counts.PENDIENTE || 0}</div>
                </Card>

                <Card
                    onClick={() => setSelectedEstado('CON_DUDAS')}
                    style={{
                        padding: '14px 18px',
                        cursor: 'pointer',
                        border: selectedEstado === 'CON_DUDAS' ? '2px solid #f59e0b' : '1px solid #2a2d3e',
                        background: selectedEstado === 'CON_DUDAS' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-secondary, #1a1d2e)',
                        transition: 'all 0.15s',
                    }}
                >
                    <div style={{ fontSize: '11px', color: '#fde68a', fontWeight: 600, textTransform: 'uppercase' }}>🟡 Con Dudas</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>{counts.CON_DUDAS || 0}</div>
                </Card>

                <Card
                    onClick={() => setSelectedEstado('CHEQUEADO')}
                    style={{
                        padding: '14px 18px',
                        cursor: 'pointer',
                        border: selectedEstado === 'CHEQUEADO' ? '2px solid #10b981' : '1px solid #2a2d3e',
                        background: selectedEstado === 'CHEQUEADO' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary, #1a1d2e)',
                        transition: 'all 0.15s',
                    }}
                >
                    <div style={{ fontSize: '11px', color: '#a7f3d0', fontWeight: 600, textTransform: 'uppercase' }}>🟢 Chequeados</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>{counts.CHEQUEADO || 0}</div>
                </Card>

                <Card
                    onClick={() => setSelectedEstado('INCOMPLETO')}
                    style={{
                        padding: '14px 18px',
                        cursor: 'pointer',
                        border: selectedEstado === 'INCOMPLETO' ? '2px solid #ef4444' : '1px solid #2a2d3e',
                        background: selectedEstado === 'INCOMPLETO' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-secondary, #1a1d2e)',
                        transition: 'all 0.15s',
                    }}
                >
                    <div style={{ fontSize: '11px', color: '#fecaca', fontWeight: 600, textTransform: 'uppercase' }}>🔴 Incompletos</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#f87171', marginTop: '4px' }}>{counts.INCOMPLETO || 0}</div>
                </Card>
            </div>

            {/* Barra de Búsqueda y Filtro de Marca */}
            <Card style={{ marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                    <SearchBar
                        value={q}
                        onChange={setQ}
                        placeholder="Buscar por código, descripción, W#, marca, categoría..."
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', fontWeight: 600 }}>Marca/Cliente:</span>
                    <select
                        value={selectedMarca}
                        onChange={(e) => setSelectedMarca(e.target.value)}
                        style={{
                            background: 'var(--bg-primary, #0f1117)',
                            border: '1px solid var(--border-color, #2a2d3e)',
                            color: 'var(--text-primary, #f3f4f6)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '13px',
                            outline: 'none',
                        }}
                    >
                        <option value="ALL">Todas las marcas ({marcas.length})</option>
                        {marcas.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
            </Card>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}><Spinner /></div>
            ) : (
                <Card>
                    <Table
                        cols={['Estado & Validación', 'Código & Marca', 'Descripción & Tipo', 'Colores Planilla (Originales)', 'Insumos Inventario', 'Datos Técnicos', 'Acciones']}
                        onRowClick={(index) => handleEdit(filtered[index])}
                        rows={filtered.map((a: any) => {
                            const est = ESTADO_CONFIG[a.estadoRevision || 'PENDIENTE'] || ESTADO_CONFIG.PENDIENTE;
                            return [
                                // Estado & Validación rápida
                                <div key="st" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: est.color,
                                            background: est.bg,
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            border: `1px solid ${est.color}40`,
                                        }}
                                    >
                                        {est.label}
                                    </span>
                                    {a.estadoRevision !== 'CHEQUEADO' ? (
                                        <button
                                            onClick={(e) => handleQuickStatusChange(e, a.id, 'CHEQUEADO')}
                                            style={{
                                                background: 'rgba(16, 185, 129, 0.15)',
                                                border: '1px solid #10b981',
                                                color: '#10b981',
                                                borderRadius: '4px',
                                                padding: '2px 6px',
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                            title="Validar y marcar como chequeado"
                                        >
                                            ✓ Validar
                                        </button>
                                    ) : (
                                        <span style={{ fontSize: '10px', color: '#6b7280' }}>Auditado</span>
                                    )}
                                </div>,

                                // Código & Marca
                                <div key="cod" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <code style={{ color: '#818cf8', fontWeight: 700, fontSize: '13px' }}>{a.codigo}</code>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        {(a.marca || a.cliente?.name) && (
                                            <Badge color="#4f46e5">{a.marca || a.cliente?.name}</Badge>
                                        )}
                                        {a.workingNumber && (
                                            <span style={{ fontSize: '10px', color: '#9ca3af', background: '#1e2130', padding: '1px 5px', borderRadius: '4px' }}>
                                                W#: {a.workingNumber}
                                            </span>
                                        )}
                                    </div>
                                </div>,

                                // Descripción & Tipo
                                <div key="desc" style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxWidth: '240px' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary, #f3f4f6)', fontSize: '13px' }}>{a.descripcion}</div>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {a.tipoPrenda && <Badge color="#0284c7">{a.tipoPrenda}</Badge>}
                                        {a.categoria && <Badge>{a.categoria.nombre}</Badge>}
                                    </div>
                                </div>,

                                // Colores Planilla (Originales)
                                <div key="colors" style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', minWidth: '150px' }}>
                                    {a.colorBase && (
                                        <div><span style={{ color: '#94a3b8' }}>Base:</span> <b style={{ color: '#f1f5f9' }}>{a.colorBase}</b></div>
                                    )}
                                    {a.colorLogo && (
                                        <div><span style={{ color: '#94a3b8' }}>Logo:</span> <b style={{ color: '#cbd5e1' }}>{a.colorLogo}</b></div>
                                    )}
                                    {a.colorTalle && (
                                        <div><span style={{ color: '#94a3b8' }}>Talle:</span> <b style={{ color: '#93c5fd' }}>{a.colorTalle}</b></div>
                                    )}
                                    {a.colorDetalle && (
                                        <div><span style={{ color: '#94a3b8' }}>Detalle:</span> <b style={{ color: '#cbd5e1' }}>{a.colorDetalle}</b></div>
                                    )}
                                    {a.talonPuntera && (
                                        <div><span style={{ color: '#94a3b8' }}>T/P:</span> <b style={{ color: '#cbd5e1' }}>{a.talonPuntera}</b></div>
                                    )}
                                    {!a.colorBase && !a.colorLogo && (
                                        <span style={{ color: '#64748b', fontStyle: 'italic' }}>—</span>
                                    )}
                                </div>,

                                // Insumos (itemRefs agrupados por rol)
                                <div key="insumos" style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '200px' }}>
                                    {Object.entries(
                                        (a.itemRefs || []).reduce((acc: any, ref: any) => {
                                            if (!acc[ref.rol]) acc[ref.rol] = [];
                                            acc[ref.rol].push(ref);
                                            return acc;
                                        }, {})
                                    ).map(([rol, refs]: [string, any]) => {
                                        const active = refs.filter((r: any) => r.activo && r.item);
                                        if (active.length === 0) return null;
                                        const pref = refs.find((r: any) => r.esPreferenciaActual) || active[0];
                                        return (
                                            <div key={rol} style={{ fontSize: '11px', lineHeight: '14px' }}>
                                                <span style={{ color: '#6b7280', marginRight: '3px' }}>{ROL_LABELS[rol] || rol}:</span>
                                                <span style={{ color: '#d1d5db' }}>{pref.item?.descripcion || pref.item?.codigoInterno || '—'}</span>
                                                {active.length > 1 && <span style={{ color: '#10b981', fontWeight: 600 }}> ({active.length} opc)</span>}
                                            </div>
                                        );
                                    })}
                                    {(!a.itemRefs || a.itemRefs.length === 0) && (
                                        <span style={{ color: '#6b7280', fontSize: '11px', fontStyle: 'italic' }}>Sin insumos vinculados</span>
                                    )}
                                </div>,

                                // Datos Técnicos (Pack, Peso, IM)
                                <div key="tecnicos" style={{ fontSize: '11px', color: 'var(--text-secondary, #d1d5db)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {a.unidadesPorPack && <div><span style={{ color: '#6b7280' }}>Pack:</span> {a.unidadesPorPack} pares</div>}
                                    {a.pesoUnitario && <div><span style={{ color: '#6b7280' }}>Peso:</span> {a.pesoUnitario}g</div>}
                                    {a.im && <div><span style={{ color: '#6b7280' }}>IM:</span> {a.im}</div>}
                                    {a.talle && <div><span style={{ color: '#6b7280' }}>Talle:</span> {a.talle}</div>}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '2px' }}>
                                        {(a.machineTypes || []).map((mt: any) => (
                                            <Badge key={mt.id} color="#0d9488">{mt.name}</Badge>
                                        ))}
                                    </div>
                                </div>,

                                // Acciones
                                <div key="actions" style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                    <Btn small variant="secondary" onClick={(e: any) => { e.stopPropagation(); handleEdit(a); }} title="Editar artículo">✏️</Btn>
                                    <Btn small variant="danger" onClick={(e: any) => { e.stopPropagation(); handleDelete(a.id); }} title="Eliminar artículo">🗑</Btn>
                                </div>,
                            ];
                        })}
                    />
                    {filtered.length === 0 && !isLoading && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-subtle, #6b7280)' }}>
                            No se encontraron artículos con los filtros aplicados.
                        </div>
                    )}
                </Card>
            )}

            <CreateArticuloDialog
                open={isDialogOpen}
                onClose={handleClose}
                editTarget={editTarget}
            />
        </div>
    );
}
