import React, { useState, useMemo } from 'react';
import type { MaterialAsignadoSummary } from '../types/ordenesProduccion.types';
import { Card, Btn, Modal } from '../../../../shared/ui';
import { exportMaterialesToExcel } from '../utils/excelExport';

interface MaterialesAsignadosTabProps {
    materiales: MaterialAsignadoSummary[];
    onSelectMachine?: (m: number) => void;
    onEditArticle?: (codigo: string) => void;
}

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

function getAreaForMachine(m: number): string {
    if (m >= 1 && m <= 22) return 'Área 1';
    if (m >= 23 && m <= 67) return 'Área 2';
    if (m >= 73 && m <= 117) return 'Área 3';
    if (m >= 126 && m <= 170) return 'Área 4';
    if (m >= 171 && m <= 190) return 'Área 5';
    return 'Planta';
}

export const MaterialesAsignadosTab: React.FC<MaterialesAsignadosTabProps> = ({
    materiales,
    onSelectMachine,
    onEditArticle,
}) => {
    const [q, setQ] = useState('');
    const [selectedRol, setSelectedRol] = useState<string>('ALL');
    const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null);
    const [selectedDetailModal, setSelectedDetailModal] = useState<MaterialAsignadoSummary | null>(null);

    const roles = useMemo(() => {
        const set = new Set<string>();
        materiales.forEach((m) => {
            if (m.rol) set.add(m.rol);
        });
        return Array.from(set).sort();
    }, [materiales]);

    const filtered = useMemo(() => {
        return materiales.filter((m) => {
            if (selectedRol !== 'ALL' && m.rol !== selectedRol) return false;

            if (q) {
                const words = q.toLowerCase().split(' ').filter(Boolean);
                const text = `${m.codigoInterno} ${m.descripcion} ${m.tono || ''} ${m.colorNombre || ''} ${m.proveedor || ''} ${m.articulosAsignados.map((a) => a.codigoArticulo).join(' ')} ${m.maquinas.map((maq) => `M${maq}`).join(' ')}`.toLowerCase();
                return words.every((w) => text.includes(w));
            }
            return true;
        });
    }, [materiales, q, selectedRol]);

    const totalMachinesSupplied = useMemo(() => {
        const allMaqs = new Set<number>();
        materiales.forEach((m) => m.maquinas.forEach((maq) => allMaqs.add(maq)));
        return allMaqs.size;
    }, [materiales]);

    const toggleExpand = (key: string) => {
        setExpandedMaterial((prev) => (prev === key ? null : key));
    };

    return (
        <div>
            {/* Header Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar hilado, código, talle o máquina..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        style={{
                            minWidth: '260px',
                            padding: '8px 14px',
                            background: 'var(--bg-secondary, #1a1d2e)',
                            border: '1px solid var(--border-color, #2a2d3e)',
                            borderRadius: '8px',
                            color: 'var(--text-primary, #f3f4f6)',
                            fontSize: '13px',
                        }}
                    />

                    <select
                        value={selectedRol}
                        onChange={(e) => setSelectedRol(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            background: 'var(--bg-secondary, #1a1d2e)',
                            border: '1px solid var(--border-color, #2a2d3e)',
                            borderRadius: '8px',
                            color: 'var(--text-primary, #f3f4f6)',
                            fontSize: '13px',
                        }}
                    >
                        <option value="ALL">Todas las Funciones / Roles ({roles.length})</option>
                        {roles.map((r) => (
                            <option key={r} value={r}>
                                {ROL_LABELS[r] || r}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                        <strong>{filtered.length}</strong> insumos para <strong>{totalMachinesSupplied}</strong> máquinas
                    </span>
                    <Btn
                        variant="secondary"
                        onClick={() => exportMaterialesToExcel(filtered)}
                        style={{ fontSize: '12px', padding: '6px 14px' }}
                    >
                        📥 Exportar Excel
                    </Btn>
                </div>
            </div>

            {/* Table — Primary Level */}
            <Card style={{ overflow: 'hidden', padding: 0, border: '1px solid var(--border-color, #2a2d3e)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                <th style={{ padding: '12px 14px' }}>Insumo / Hilado</th>
                                <th style={{ padding: '12px 14px', width: '130px' }}>Función / Rol</th>
                                <th style={{ padding: '12px 14px' }}>Tono / Variante</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center', width: '150px' }}>Máquinas Asignadas</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center', width: '130px' }}>Artículos</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center', width: '90px' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted, #9ca3af)' }}>
                                        No se encontraron materiales para los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((mat) => {
                                    const key = `${mat.itemId}_${mat.rol}`;
                                    const isExpanded = expandedMaterial === key;
                                    const hasUnreviewedArticles = mat.articulosAsignados.some((a) => a.isUnreviewed);

                                    // Group machines by Area
                                    const maqsByArea = new Map<string, number[]>();
                                    mat.maquinas.forEach((m) => {
                                        const area = getAreaForMachine(m);
                                        if (!maqsByArea.has(area)) maqsByArea.set(area, []);
                                        maqsByArea.get(area)!.push(m);
                                    });

                                    return (
                                        <React.Fragment key={key}>
                                            {/* Level 1: Primary Row */}
                                            <tr
                                                onClick={() => toggleExpand(key)}
                                                style={{
                                                    borderBottom: isExpanded ? 'none' : '1px solid var(--border-color, #2a2d3e)',
                                                    background: isExpanded
                                                        ? 'rgba(99, 102, 241, 0.07)'
                                                        : hasUnreviewedArticles
                                                        ? 'rgba(239, 68, 68, 0.03)'
                                                        : undefined,
                                                    cursor: 'pointer',
                                                    transition: 'background 0.15s ease',
                                                }}
                                            >
                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ fontWeight: 800, color: '#818cf8', fontSize: '13px' }}>
                                                        {mat.codigoInterno}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-primary, #f3f4f6)', marginTop: '2px', fontWeight: 500 }}>
                                                        {mat.descripcion}
                                                    </div>
                                                </td>

                                                <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600 }}>
                                                    <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px' }}>
                                                        {ROL_LABELS[mat.rol] || mat.rol}
                                                    </span>
                                                </td>

                                                <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary, #d1d5db)' }}>
                                                    {mat.colorNombre || mat.tono || '-'}
                                                </td>

                                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                    <div
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '4px 12px',
                                                            borderRadius: '16px',
                                                            background: 'rgba(99, 102, 241, 0.15)',
                                                            color: '#818cf8',
                                                            fontWeight: 800,
                                                            fontSize: '13px',
                                                        }}
                                                    >
                                                        {mat.maquinasCount} máquinas
                                                    </div>
                                                </td>

                                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '3px 10px',
                                                            borderRadius: '12px',
                                                            background: hasUnreviewedArticles ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.06)',
                                                            color: hasUnreviewedArticles ? '#f87171' : 'var(--text-muted, #9ca3af)',
                                                            fontWeight: 700,
                                                            fontSize: '11px',
                                                        }}
                                                    >
                                                        {mat.articulosAsignados.length} art.
                                                    </span>
                                                </td>

                                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        style={{
                                                            padding: '4px 8px',
                                                            background: isExpanded ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.06)',
                                                            border: '1px solid var(--border-color, #2a2d3e)',
                                                            borderRadius: '6px',
                                                            color: isExpanded ? '#c7d2fe' : 'var(--text-muted, #9ca3af)',
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {isExpanded ? '▲ Ocultar' : '▼ Detalle'}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Level 2: Secondary Expandable Drawer */}
                                            {isExpanded && (
                                                <tr style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                                    <td colSpan={6} style={{ padding: '16px 20px' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                                                            {/* Sub-Panel 1: Máquinas Asignadas por Área */}
                                                            <div
                                                                style={{
                                                                    background: 'var(--bg-secondary, #1a1d2e)',
                                                                    border: '1px solid var(--border-color, #2a2d3e)',
                                                                    borderRadius: '8px',
                                                                    padding: '12px 16px',
                                                                }}
                                                            >
                                                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '10px' }}>
                                                                    🏭 Máquinas Destino ({mat.maquinasCount})
                                                                </div>

                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    {Array.from(maqsByArea.entries()).map(([area, maqs]) => (
                                                                        <div key={area} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', width: '60px' }}>
                                                                                {area}:
                                                                            </span>
                                                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                                                {maqs.map((m) => (
                                                                                    <button
                                                                                        key={m}
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            if (onSelectMachine) onSelectMachine(m);
                                                                                        }}
                                                                                        style={{
                                                                                            padding: '2px 7px',
                                                                                            background: 'rgba(99, 102, 241, 0.15)',
                                                                                            border: '1px solid rgba(99, 102, 241, 0.35)',
                                                                                            borderRadius: '4px',
                                                                                            color: '#c7d2fe',
                                                                                            fontSize: '11px',
                                                                                            fontWeight: 700,
                                                                                            cursor: onSelectMachine ? 'pointer' : 'default',
                                                                                        }}
                                                                                        title={`Ver M${m} en Matriz`}
                                                                                    >
                                                                                        M{m}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Sub-Panel 2: Artículos que lo consumen */}
                                                            <div
                                                                style={{
                                                                    background: 'var(--bg-secondary, #1a1d2e)',
                                                                    border: '1px solid var(--border-color, #2a2d3e)',
                                                                    borderRadius: '8px',
                                                                    padding: '12px 16px',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    justifyContent: 'space-between',
                                                                }}
                                                            >
                                                                <div>
                                                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '10px' }}>
                                                                        🧵 Artículos Asignados ({mat.articulosAsignados.length})
                                                                    </div>

                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                                                                        {mat.articulosAsignados.map((art, aIdx) => (
                                                                            <div
                                                                                key={aIdx}
                                                                                style={{
                                                                                    padding: '6px 10px',
                                                                                    borderRadius: '6px',
                                                                                    background: 'rgba(255,255,255,0.03)',
                                                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                                                    fontSize: '11px',
                                                                                    display: 'flex',
                                                                                    justifyContent: 'space-between',
                                                                                    alignItems: 'center',
                                                                                }}
                                                                            >
                                                                                <div>
                                                                                    <span style={{ fontWeight: 700, color: '#c7d2fe' }}>{art.codigoArticulo}</span>
                                                                                    <span style={{ color: 'var(--text-muted, #9ca3af)', marginLeft: '6px' }}>
                                                                                        {art.descripcionArticulo}
                                                                                    </span>
                                                                                </div>

                                                                                {art.isUnreviewed ? (
                                                                                    <span
                                                                                        onClick={() => onEditArticle && onEditArticle(art.codigoArticulo)}
                                                                                        style={{ fontSize: '10px', color: '#f87171', fontWeight: 700, cursor: onEditArticle ? 'pointer' : 'default' }}
                                                                                        title="Clic para revisar ficha técnica"
                                                                                    >
                                                                                        ⚠️ No Revisado ✏️
                                                                                    </span>
                                                                                ) : (
                                                                                    <span style={{ fontSize: '10px', color: '#10b981' }}>🟢 Chequeado</span>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Level 3 Trigger */}
                                                                <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end' }}>
                                                                    <Btn
                                                                        small
                                                                        variant="secondary"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedDetailModal(mat);
                                                                        }}
                                                                        style={{ fontSize: '11px' }}
                                                                    >
                                                                        🔍 Ficha Insumo (Nivel 3)
                                                                    </Btn>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Level 3: Modal de Ficha Técnica del Insumo */}
            {selectedDetailModal && (
                <Modal
                    onClose={() => setSelectedDetailModal(null)}
                    title={`Ficha de Insumo — ${selectedDetailModal.codigoInterno}`}
                >
                    <div style={{ padding: '4px' }}>
                        <div style={{ marginBottom: '14px' }}>
                            <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary, #f3f4f6)' }}>
                                {selectedDetailModal.descripcion}
                            </h4>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '4px' }}>
                                Función: <strong>{ROL_LABELS[selectedDetailModal.rol] || selectedDetailModal.rol}</strong> | Tono: <strong>{selectedDetailModal.colorNombre || selectedDetailModal.tono || '-'}</strong> | Proveedor: <strong>{selectedDetailModal.proveedor || 'Sin especificar'}</strong>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                            <Card style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>Máquinas Asignadas</div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#818cf8', marginTop: '2px' }}>
                                    {selectedDetailModal.maquinasCount}
                                </div>
                            </Card>
                            <Card style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>Rotación Stock</div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f3f4f6)', marginTop: '2px' }}>
                                    {selectedDetailModal.rotacion || 'Estándar'}
                                </div>
                            </Card>
                            <Card style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>Unidad Principal</div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f3f4f6)', marginTop: '2px' }}>
                                    {selectedDetailModal.unidadPrincipal || 'KG'}
                                </div>
                            </Card>
                        </div>

                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '6px' }}>
                            🏭 Máquinas en Planta:
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '16px' }}>
                            {selectedDetailModal.maquinas.map((m) => (
                                <span
                                    key={m}
                                    style={{
                                        padding: '3px 8px',
                                        background: 'rgba(99, 102, 241, 0.15)',
                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                        borderRadius: '6px',
                                        color: '#c7d2fe',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                    }}
                                >
                                    M{m}
                                </span>
                            ))}
                        </div>

                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '8px' }}>
                            🧵 Artículos Asignados a este Hilado:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {selectedDetailModal.articulosAsignados.map((art, aIdx) => (
                                <div
                                    key={aIdx}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div>
                                        <span style={{ fontWeight: 700, color: '#c7d2fe', fontSize: '13px' }}>{art.codigoArticulo}</span>
                                        <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '12px', marginLeft: '8px' }}>{art.descripcionArticulo}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600 }}>
                                            {art.maquinas.length} máq. ({art.maquinas.map(m => `M${m}`).join(', ')})
                                        </span>
                                        {art.isUnreviewed && onEditArticle && (
                                            <Btn
                                                small
                                                onClick={() => {
                                                    setSelectedDetailModal(null);
                                                    onEditArticle(art.codigoArticulo);
                                                }}
                                                style={{ fontSize: '10px', padding: '2px 6px' }}
                                            >
                                                ✏️ Revisar
                                            </Btn>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
