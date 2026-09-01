import React, { useState, useMemo } from 'react';
import type { ArticuloProduccionSummary } from '../types/ordenesProduccion.types';
import { Card, Btn, Modal } from '../../../../shared/ui';
import { exportArticulosToExcel } from '../utils/excelExport';

interface ArticulosTejidoTabProps {
    articulos: ArticuloProduccionSummary[];
    onSelectMachine?: (machineNum: number) => void;
    onEditArticle?: (a: ArticuloProduccionSummary) => void;
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

export const ArticulosTejidoTab: React.FC<ArticulosTejidoTabProps> = ({
    articulos,
    onSelectMachine,
    onEditArticle,
}) => {
    const [q, setQ] = useState('');
    const [selectedMarca, setSelectedMarca] = useState<string>('ALL');
    const [selectedEstado, setSelectedEstado] = useState<string>('ALL');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [selectedArticuloModal, setSelectedArticuloModal] = useState<ArticuloProduccionSummary | null>(null);

    const marcas = useMemo(() => {
        const set = new Set<string>();
        articulos.forEach((a) => {
            if (a.marca) set.add(a.marca);
        });
        return Array.from(set).sort();
    }, [articulos]);

    const filtered = useMemo(() => {
        return articulos.filter((a) => {
            if (selectedMarca !== 'ALL' && a.marca !== selectedMarca) return false;
            if (selectedEstado === 'REVISADO' && a.isUnreviewed) return false;
            if (selectedEstado === 'NO_REVISADO' && !a.isUnreviewed) return false;

            if (q) {
                const words = q.toLowerCase().split(' ').filter(Boolean);
                const text = `${a.codigo} ${a.descripcion} ${a.marca} ${a.talles.join(' ')} ${a.colores.join(' ')} ${a.maquinas.map((m) => `M${m}`).join(' ')}`.toLowerCase();
                return words.every((w) => text.includes(w));
            }
            return true;
        });
    }, [articulos, q, selectedMarca, selectedEstado]);

    const toggleExpand = (codigo: string) => {
        setExpandedRow((prev) => (prev === codigo ? null : codigo));
    };

    const handleBadgeClick = (e: React.MouseEvent, a: ArticuloProduccionSummary) => {
        e.stopPropagation();
        if (onEditArticle) {
            onEditArticle(a);
        }
    };

    const renderEstadoBadge = (a: ArticuloProduccionSummary) => {
        if (a.estadoRevision === 'CHEQUEADO') {
            return (
                <span
                    onClick={(e) => handleBadgeClick(e, a)}
                    style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: onEditArticle ? 'pointer' : 'default',
                        transition: 'transform 0.1s',
                    }}
                    title="Artículo chequeado. Clic para ver o editar en el Catálogo"
                >
                    🟢 Chequeado
                </span>
            );
        }
        if (a.estadoRevision === 'CON_DUDAS') {
            return (
                <span
                    onClick={(e) => handleBadgeClick(e, a)}
                    style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: onEditArticle ? 'pointer' : 'default',
                    }}
                    title="Artículo con dudas. Clic para abrir y resolver ficha técnica"
                >
                    🟡 Con Dudas ✏️
                </span>
            );
        }
        if (a.estadoRevision === 'PENDIENTE') {
            return (
                <span
                    onClick={(e) => handleBadgeClick(e, a)}
                    style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(239, 68, 68, 0.18)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.45)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: onEditArticle ? 'pointer' : 'default',
                    }}
                    title={a.advertencia || 'Pendiente de revisión. Clic para abrir y completar ficha técnica'}
                >
                    ⚠️ OJO: Pendiente ✏️
                </span>
            );
        }
        if (a.estadoRevision === 'INCOMPLETO') {
            return (
                <span
                    onClick={(e) => handleBadgeClick(e, a)}
                    style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(239, 68, 68, 0.18)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.45)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: onEditArticle ? 'pointer' : 'default',
                    }}
                    title="Ficha incompleta. Clic para completar datos"
                >
                    🔴 Incompleto ✏️
                </span>
            );
        }
        return (
            <span
                onClick={(e) => handleBadgeClick(e, a)}
                style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'rgba(239, 68, 68, 0.22)',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: onEditArticle ? 'pointer' : 'default',
                }}
                title="Artículo no encontrado en el catálogo. Clic para darlo de alta ahora"
            >
                ⚠️ No en Catálogo ➕
            </span>
        );
    };

    return (
        <div>
            {/* Action Bar / Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar artículo, descripción o color..."
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
                        value={selectedMarca}
                        onChange={(e) => setSelectedMarca(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            background: 'var(--bg-secondary, #1a1d2e)',
                            border: '1px solid var(--border-color, #2a2d3e)',
                            borderRadius: '8px',
                            color: 'var(--text-primary, #f3f4f6)',
                            fontSize: '13px',
                        }}
                    >
                        <option value="ALL">Todas las Marcas ({marcas.length})</option>
                        {marcas.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedEstado}
                        onChange={(e) => setSelectedEstado(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            background: 'var(--bg-secondary, #1a1d2e)',
                            border: '1px solid var(--border-color, #2a2d3e)',
                            borderRadius: '8px',
                            color: 'var(--text-primary, #f3f4f6)',
                            fontSize: '13px',
                        }}
                    >
                        <option value="ALL">Todos los Estados</option>
                        <option value="NO_REVISADO">⚠️ Solo No Revisados / Pendientes</option>
                        <option value="REVISADO">🟢 Solo Chequeados</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                        <strong>{filtered.length}</strong> artículos programados
                    </span>
                    <Btn
                        variant="secondary"
                        onClick={() => exportArticulosToExcel(filtered)}
                        style={{ fontSize: '12px', padding: '6px 14px' }}
                    >
                        📥 Exportar Excel
                    </Btn>
                </div>
            </div>

            {/* Clean Table — Primary Level */}
            <Card style={{ overflow: 'hidden', padding: 0, border: '1px solid var(--border-color, #2a2d3e)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                <th style={{ padding: '12px 14px', width: '140px' }}>Revisión (Clic)</th>
                                <th style={{ padding: '12px 14px' }}>Artículo / Marca</th>
                                <th style={{ padding: '12px 14px' }}>Descripción</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center', width: '100px' }}>Talles</th>
                                <th style={{ padding: '12px 14px' }}>Colores</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center', width: '110px' }}>Máquinas</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center', width: '110px' }}>Insumos</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center', width: '90px' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted, #9ca3af)' }}>
                                        No se encontraron artículos con los filtros aplicados.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((a) => {
                                    const isExpanded = expandedRow === a.codigo;

                                    // Group machines by Area for Level 2 view
                                    const maqsByArea = new Map<string, number[]>();
                                    a.maquinas.forEach((m) => {
                                        const area = getAreaForMachine(m);
                                        if (!maqsByArea.has(area)) maqsByArea.set(area, []);
                                        maqsByArea.get(area)!.push(m);
                                    });

                                    return (
                                        <React.Fragment key={a.codigo}>
                                            {/* Level 1: Primary Row */}
                                            <tr
                                                onClick={() => toggleExpand(a.codigo)}
                                                style={{
                                                    borderBottom: isExpanded ? 'none' : '1px solid var(--border-color, #2a2d3e)',
                                                    background: isExpanded
                                                        ? 'rgba(99, 102, 241, 0.07)'
                                                        : a.isUnreviewed
                                                        ? 'rgba(239, 68, 68, 0.04)'
                                                        : undefined,
                                                    cursor: 'pointer',
                                                    transition: 'background 0.15s ease',
                                                }}
                                            >
                                                <td style={{ padding: '12px 14px' }}>
                                                    {renderEstadoBadge(a)}
                                                </td>

                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ fontWeight: 800, color: '#a5b4fc', fontSize: '13px' }}>
                                                        {a.codigo}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                                        {a.marca || 'Sin marca'}
                                                    </div>
                                                </td>

                                                <td style={{ padding: '12px 14px', maxWidth: '300px' }}>
                                                    <div style={{ whiteSpace: 'normal', color: 'var(--text-primary, #f3f4f6)', fontWeight: 500 }}>
                                                        {a.descripcion}
                                                    </div>
                                                    {a.advertencia && (
                                                        <div style={{ fontSize: '11px', color: '#f87171', marginTop: '2px', fontWeight: 500 }}>
                                                            {a.advertencia}
                                                        </div>
                                                    )}
                                                </td>

                                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                        {a.talles.map((t) => (
                                                            <span
                                                                key={t}
                                                                style={{
                                                                    padding: '2px 6px',
                                                                    background: 'rgba(255,255,255,0.06)',
                                                                    borderRadius: '4px',
                                                                    fontSize: '11px',
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>

                                                <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary, #d1d5db)' }}>
                                                    {a.colores.join(' / ') || '-'}
                                                </td>

                                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '4px 10px',
                                                            borderRadius: '12px',
                                                            background: 'rgba(99, 102, 241, 0.15)',
                                                            color: '#818cf8',
                                                            fontWeight: 800,
                                                            fontSize: '12px',
                                                        }}
                                                    >
                                                        {a.maquinasCount} máq.
                                                    </span>
                                                </td>

                                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '4px 10px',
                                                            borderRadius: '12px',
                                                            background: a.itemRefs && a.itemRefs.length > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                            color: a.itemRefs && a.itemRefs.length > 0 ? '#34d399' : '#f87171',
                                                            fontWeight: 700,
                                                            fontSize: '11px',
                                                        }}
                                                    >
                                                        {a.itemRefs && a.itemRefs.length > 0 ? `${a.itemRefs.length} hilados` : 'Sin ficha'}
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
                                                    <td colSpan={8} style={{ padding: '16px 20px' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                                                            {/* Sub-Panel 1: Máquinas por Área */}
                                                            <div
                                                                style={{
                                                                    background: 'var(--bg-secondary, #1a1d2e)',
                                                                    border: '1px solid var(--border-color, #2a2d3e)',
                                                                    borderRadius: '8px',
                                                                    padding: '12px 16px',
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase' }}>
                                                                        🏭 Distribución en Planta ({a.maquinasCount} Máquinas)
                                                                    </div>
                                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>
                                                                        Turnos: {a.turnos.join(', ')}
                                                                    </span>
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
                                                                                        title={`Ir a ver M${m} en la Matriz`}
                                                                                    >
                                                                                        M{m}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Sub-Panel 2: Resumen de Hilados / BOM */}
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
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase' }}>
                                                                            🧵 Hilados de Estructura ({a.itemRefs?.length || 0})
                                                                        </div>
                                                                    </div>

                                                                    {a.itemRefs && a.itemRefs.length > 0 ? (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                                            {a.itemRefs.slice(0, 4).map((ref: any, idx: number) => (
                                                                                <div
                                                                                    key={idx}
                                                                                    style={{
                                                                                        display: 'flex',
                                                                                        justifyContent: 'space-between',
                                                                                        fontSize: '11px',
                                                                                        padding: '3px 6px',
                                                                                        background: 'rgba(255,255,255,0.03)',
                                                                                        borderRadius: '4px',
                                                                                    }}
                                                                                >
                                                                                    <span>
                                                                                        <strong style={{ color: '#818cf8' }}>{ROL_LABELS[ref.rol] || ref.rol}:</strong> {ref.item?.codigoInterno} - {ref.item?.descripcion}
                                                                                    </span>
                                                                                    <span style={{ color: 'var(--text-muted, #9ca3af)' }}>
                                                                                        {ref.colorNombre || ref.item?.tono || ''}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                            {a.itemRefs.length > 4 && (
                                                                                <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', textAlign: 'right' }}>
                                                                                    +{a.itemRefs.length - 4} hilados más...
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ fontSize: '12px', color: '#f87171', fontStyle: 'italic', padding: '8px 0' }}>
                                                                            ⚠️ Sin ficha técnica cargada en el Catálogo de Calidad.
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Level 3 Trigger: Abrir Ficha Técnica Completa y Editar */}
                                                                <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                                                                    {onEditArticle && (
                                                                        <Btn
                                                                            small
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onEditArticle(a);
                                                                            }}
                                                                            style={{ fontSize: '11px', background: 'rgba(99, 102, 241, 0.25)', border: '1px solid rgba(99, 102, 241, 0.5)' }}
                                                                        >
                                                                            ✏️ Modificar / Revisar Ficha
                                                                        </Btn>
                                                                    )}
                                                                    <Btn
                                                                        small
                                                                        variant="secondary"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedArticuloModal(a);
                                                                        }}
                                                                        style={{ fontSize: '11px' }}
                                                                    >
                                                                        🔍 Ficha Técnica (Nivel 3)
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

            {/* Level 3: Modal de Ficha Técnica Completa */}
            {selectedArticuloModal && (
                <Modal
                    onClose={() => setSelectedArticuloModal(null)}
                    title={`Ficha Técnica Completa — ${selectedArticuloModal.codigo}`}
                >
                    <div style={{ padding: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary, #f3f4f6)' }}>
                                    {selectedArticuloModal.descripcion}
                                </h4>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                    Marca: <strong>{selectedArticuloModal.marca}</strong> | Talles: <strong>{selectedArticuloModal.talles.join(', ')}</strong> | Colores: <strong>{selectedArticuloModal.colores.join(' / ')}</strong>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {renderEstadoBadge(selectedArticuloModal)}
                                {onEditArticle && (
                                    <Btn
                                        small
                                        onClick={() => {
                                            const target = selectedArticuloModal;
                                            setSelectedArticuloModal(null);
                                            onEditArticle(target);
                                        }}
                                        style={{ fontSize: '11px', background: '#6366f1' }}
                                    >
                                        ✏️ Editar en Catálogo
                                    </Btn>
                                )}
                            </div>
                        </div>

                        {selectedArticuloModal.advertencia && (
                            <div
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#f87171',
                                    fontSize: '12px',
                                    marginBottom: '16px',
                                }}
                            >
                                ⚠️ <strong>Atención Calidad:</strong> {selectedArticuloModal.advertencia}
                            </div>
                        )}

                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '6px' }}>
                                🏭 Máquinas Asignadas ({selectedArticuloModal.maquinasCount}):
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {selectedArticuloModal.maquinas.map((m) => (
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
                        </div>

                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '8px' }}>
                            🧵 Estructura de Hilados e Insumos (BOM):
                        </div>

                        {selectedArticuloModal.itemRefs && selectedArticuloModal.itemRefs.length > 0 ? (
                            <div style={{ border: '1px solid var(--border-color, #2a2d3e)', borderRadius: '8px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                            <th style={{ padding: '8px 12px' }}>Función / Rol</th>
                                            <th style={{ padding: '8px 12px' }}>Código Insumo</th>
                                            <th style={{ padding: '8px 12px' }}>Descripción Hilado</th>
                                            <th style={{ padding: '8px 12px' }}>Variante / Color</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>Consumo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedArticuloModal.itemRefs.map((ref: any, idx: number) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                                <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 600 }}>
                                                    {ROL_LABELS[ref.rol] || ref.rol}
                                                </td>
                                                <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#818cf8' }}>
                                                    {ref.item?.codigoInterno || '-'}
                                                </td>
                                                <td style={{ padding: '8px 12px', fontSize: '12px' }}>
                                                    {ref.item?.descripcion || '-'}
                                                </td>
                                                <td style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                                                    {ref.colorNombre || ref.item?.tono || '-'}
                                                </td>
                                                <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: '12px' }}>
                                                    {ref.consumoGramos ? `${ref.consumoGramos} g` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', color: 'var(--text-muted, #9ca3af)', fontSize: '13px' }}>
                                Este artículo aún no cuenta con ficha técnica o hilados cargados en el Catálogo de Calidad.
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};
