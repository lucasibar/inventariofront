import React, { useState, useMemo } from 'react';
import type { MaterialAsignadoSummary } from '../types/ordenesProduccion.types';
import { Card, Btn } from '../../../../shared/ui';
import { exportMaterialesToExcel } from '../utils/excelExport';

interface MaterialesAsignadosTabProps {
    materiales: MaterialAsignadoSummary[];
    onSelectMachine?: (m: number) => void;
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

export const MaterialesAsignadosTab: React.FC<MaterialesAsignadosTabProps> = ({ materiales, onSelectMachine }) => {
    const [q, setQ] = useState('');
    const [selectedRol, setSelectedRol] = useState<string>('ALL');
    const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null);

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

    return (
        <div>
            {/* Header Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar hilado, código, artículo o máquina..."
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
                        <option value="ALL">Todas las Funciones / Roles</option>
                        {roles.map((r) => (
                            <option key={r} value={r}>
                                {ROL_LABELS[r] || r}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

            {/* Table */}
            <Card style={{ overflow: 'hidden', padding: 0, border: '1px solid var(--border-color, #2a2d3e)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                <th style={{ padding: '12px 14px' }}>Insumo / Hilado</th>
                                <th style={{ padding: '12px 14px' }}>Función / Rol</th>
                                <th style={{ padding: '12px 14px' }}>Tono / Variante</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center', width: '130px' }}>N° Máquinas Asignadas</th>
                                <th style={{ padding: '12px 14px' }}>Máquinas Destino</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Artículos que lo usan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted, #9ca3af)' }}>
                                        No se encontraron materiales para los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((mat) => {
                                    const key = `${mat.itemId}_${mat.rol}`;
                                    const isExpanded = expandedMaterial === key;
                                    const hasUnreviewedArticles = mat.articulosAsignados.some((a) => a.isUnreviewed);

                                    return (
                                        <React.Fragment key={key}>
                                            <tr
                                                style={{
                                                    borderBottom: '1px solid var(--border-color, #2a2d3e)',
                                                    background: hasUnreviewedArticles ? 'rgba(239, 68, 68, 0.03)' : undefined,
                                                }}
                                            >
                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ fontWeight: 700, color: '#818cf8', fontSize: '13px' }}>
                                                        {mat.codigoInterno}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-primary, #f3f4f6)', marginTop: '2px' }}>
                                                        {mat.descripcion}
                                                    </div>
                                                    {mat.proveedor && (
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>
                                                            Prov: {mat.proveedor}
                                                        </div>
                                                    )}
                                                </td>

                                                <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600 }}>
                                                    {ROL_LABELS[mat.rol] || mat.rol}
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
                                                            fontSize: '14px',
                                                        }}
                                                    >
                                                        {mat.maquinasCount} máquinas
                                                    </div>
                                                </td>

                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '280px' }}>
                                                        {mat.maquinas.slice(0, 10).map((m) => (
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
                                                            >
                                                                M{m}
                                                            </button>
                                                        ))}
                                                        {mat.maquinas.length > 10 && (
                                                            <span style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', alignSelf: 'center' }}>
                                                                +{mat.maquinas.length - 10} más
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedMaterial(isExpanded ? null : key)}
                                                        style={{
                                                            padding: '4px 10px',
                                                            background: 'rgba(255,255,255,0.06)',
                                                            border: '1px solid var(--border-color, #2a2d3e)',
                                                            borderRadius: '6px',
                                                            color: 'var(--text-primary, #f3f4f6)',
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {isExpanded ? '▲ Ocultar' : `▼ ${mat.articulosAsignados.length} Artículos`}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Expanded Detail Row */}
                                            {isExpanded && (
                                                <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                                                    <td colSpan={6} style={{ padding: '14px 20px' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '8px' }}>
                                                            Artículos que consumen {mat.codigoInterno} ({mat.descripcion}):
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                                                            {mat.articulosAsignados.map((art, aIdx) => (
                                                                <div
                                                                    key={aIdx}
                                                                    style={{
                                                                        padding: '8px 12px',
                                                                        borderRadius: '6px',
                                                                        background: 'rgba(255,255,255,0.04)',
                                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                                        fontSize: '12px',
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <span style={{ fontWeight: 700, color: '#c7d2fe' }}>{art.codigoArticulo}</span>
                                                                        {art.isUnreviewed ? (
                                                                            <span style={{ fontSize: '10px', color: '#f87171', fontWeight: 700 }}>⚠️ No Revisado</span>
                                                                        ) : (
                                                                            <span style={{ fontSize: '10px', color: '#10b981' }}>🟢 Chequeado</span>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                                                        {art.descripcionArticulo}
                                                                    </div>
                                                                    <div style={{ fontSize: '11px', color: '#818cf8', marginTop: '4px' }}>
                                                                        Máquinas: {art.maquinas.map((m) => `M${m}`).join(', ')}
                                                                    </div>
                                                                </div>
                                                            ))}
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
        </div>
    );
};
