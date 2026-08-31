import React, { useState, useMemo } from 'react';
import type { ArticuloProduccionSummary } from '../types/ordenesProduccion.types';
import { Card, Btn, Modal } from '../../../../shared/ui';
import { exportArticulosToExcel } from '../utils/excelExport';

interface ArticulosTejidoTabProps {
    articulos: ArticuloProduccionSummary[];
    onSelectMachine?: (machineNum: number) => void;
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

export const ArticulosTejidoTab: React.FC<ArticulosTejidoTabProps> = ({ articulos, onSelectMachine }) => {
    const [q, setQ] = useState('');
    const [selectedMarca, setSelectedMarca] = useState<string>('ALL');
    const [selectedEstado, setSelectedEstado] = useState<string>('ALL');
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

    const renderEstadoBadge = (a: ArticuloProduccionSummary) => {
        if (a.estadoRevision === 'CHEQUEADO') {
            return (
                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    🟢 Chequeado
                </span>
            );
        }
        if (a.estadoRevision === 'CON_DUDAS') {
            return (
                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    🟡 Con Dudas
                </span>
            );
        }
        if (a.estadoRevision === 'PENDIENTE') {
            return (
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                    title={a.advertencia}
                >
                    ⚠️ OJO: Pendiente
                </span>
            );
        }
        if (a.estadoRevision === 'INCOMPLETO') {
            return (
                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    🔴 Incompleto
                </span>
            );
        }
        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                }}
            >
                ⚠️ No en Catálogo
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
                        placeholder="🔍 Buscar por código, descripción, color o máquina..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        style={{
                            minWidth: '280px',
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

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                        Mostrando <strong>{filtered.length}</strong> de {articulos.length} artículos
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

            {/* Table */}
            <Card style={{ overflow: 'hidden', padding: 0, border: '1px solid var(--border-color, #2a2d3e)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                <th style={{ padding: '12px 14px', width: '150px' }}>Revisión / Alerta</th>
                                <th style={{ padding: '12px 14px' }}>Artículo / Código</th>
                                <th style={{ padding: '12px 14px' }}>Marca</th>
                                <th style={{ padding: '12px 14px' }}>Descripción</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Talles</th>
                                <th style={{ padding: '12px 14px' }}>Color(es)</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center' }}>N° Máq.</th>
                                <th style={{ padding: '12px 14px' }}>Máquinas Asignadas</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center' }}>BOM / Insumos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted, #9ca3af)' }}>
                                        No se encontraron artículos con los filtros aplicados.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((a) => (
                                    <tr
                                        key={a.codigo}
                                        style={{
                                            borderBottom: '1px solid var(--border-color, #2a2d3e)',
                                            background: a.isUnreviewed ? 'rgba(239, 68, 68, 0.04)' : undefined,
                                        }}
                                    >
                                        <td style={{ padding: '12px 14px' }}>
                                            {renderEstadoBadge(a)}
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <div style={{ fontWeight: 700, color: '#a5b4fc', fontSize: '13px' }}>
                                                {a.codigo}
                                            </div>
                                            {a.codigoOriginalPdf && a.codigoOriginalPdf !== a.codigo && (
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>
                                                    PDF: {a.codigoOriginalPdf}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600 }}>
                                            {a.marca || '-'}
                                        </td>
                                        <td style={{ padding: '12px 14px', fontSize: '13px', maxWidth: '280px' }}>
                                            <div style={{ whiteSpace: 'normal' }}>{a.descripcion}</div>
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
                                                    background: 'rgba(99, 102, 241, 0.15)',
                                                    color: '#818cf8',
                                                    borderRadius: '12px',
                                                    fontWeight: 800,
                                                    fontSize: '13px',
                                                }}
                                            >
                                                {a.maquinasCount}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '250px' }}>
                                                {a.maquinas.map((m) => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => onSelectMachine && onSelectMachine(m)}
                                                        style={{
                                                            padding: '2px 6px',
                                                            background: 'rgba(99, 102, 241, 0.12)',
                                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                                            borderRadius: '4px',
                                                            color: '#c7d2fe',
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            cursor: onSelectMachine ? 'pointer' : 'default',
                                                        }}
                                                        title={`Ver máquina M${m}`}
                                                    >
                                                        M{m}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedArticuloModal(a)}
                                                style={{
                                                    padding: '4px 10px',
                                                    background: a.itemRefs && a.itemRefs.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                                                    border: '1px solid ' + (a.itemRefs && a.itemRefs.length > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'),
                                                    borderRadius: '6px',
                                                    color: a.itemRefs && a.itemRefs.length > 0 ? '#34d399' : '#f87171',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {a.itemRefs && a.itemRefs.length > 0 ? `🧵 ${a.itemRefs.length} Insumos` : '⚠️ Sin BOM'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal de Detalle de Ficha Técnica / Insumos */}
            {selectedArticuloModal && (
                <Modal
                    onClose={() => setSelectedArticuloModal(null)}
                    title={`Ficha Técnica — ${selectedArticuloModal.codigo}`}
                >
                    <div style={{ padding: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary, #f3f4f6)' }}>
                                    {selectedArticuloModal.descripcion}
                                </h4>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                    Marca: <strong>{selectedArticuloModal.marca}</strong> | Talles: <strong>{selectedArticuloModal.talles.join(', ')}</strong> | Colores: <strong>{selectedArticuloModal.colores.join(' / ')}</strong>
                                </div>
                            </div>
                            <div>{renderEstadoBadge(selectedArticuloModal)}</div>
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
                                            padding: '4px 8px',
                                            background: 'rgba(99, 102, 241, 0.15)',
                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                            borderRadius: '6px',
                                            color: '#c7d2fe',
                                            fontSize: '12px',
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
