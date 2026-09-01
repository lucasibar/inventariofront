import React, { useState, useMemo } from 'react';
import { Card } from '../../../../shared/ui';

interface ColoresTabProps {
    colores: {
        color: string;
        maquinasCount: number;
        maquinas: number[];
        articulos: string[];
    }[];
    onSelectMachine?: (m: number) => void;
}

function getAreaForMachine(m: number): string {
    if (m >= 1 && m <= 22) return 'Área 1';
    if (m >= 23 && m <= 67) return 'Área 2';
    if (m >= 73 && m <= 117) return 'Área 3';
    if (m >= 126 && m <= 170) return 'Área 4';
    if (m >= 171 && m <= 190) return 'Área 5';
    return 'Planta';
}

export const ColoresTab: React.FC<ColoresTabProps> = ({ colores, onSelectMachine }) => {
    const [q, setQ] = useState('');
    const [expandedColor, setExpandedColor] = useState<string | null>(null);

    const filtered = useMemo(() => {
        if (!q) return colores;
        const lower = q.toLowerCase();
        return colores.filter(
            (c) =>
                c.color.toLowerCase().includes(lower) ||
                c.articulos.some((a) => a.toLowerCase().includes(lower)) ||
                c.maquinas.some((m) => `m${m}`.includes(lower)),
        );
    }, [colores, q]);

    const toggleExpand = (color: string) => {
        setExpandedColor((prev) => (prev === color ? null : color));
    };

    return (
        <div>
            {/* Header / Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <input
                    type="text"
                    placeholder="🔍 Buscar color, código de artículo o máquina..."
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

                <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                    Mostrando <strong>{filtered.length}</strong> variantes de color
                </span>
            </div>

            {/* Table — Primary Level */}
            <Card style={{ overflow: 'hidden', padding: 0, border: '1px solid var(--border-color, #2a2d3e)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                <th style={{ padding: '12px 14px' }}>Color / Variante</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center', width: '140px' }}>N° Artículos</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center', width: '150px' }}>Máquinas Asignadas</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center', width: '90px' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted, #9ca3af)' }}>
                                        No se encontraron colores con el criterio de búsqueda.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((col) => {
                                    const isExpanded = expandedColor === col.color;

                                    // Group machines by Area
                                    const maqsByArea = new Map<string, number[]>();
                                    col.maquinas.forEach((m) => {
                                        const area = getAreaForMachine(m);
                                        if (!maqsByArea.has(area)) maqsByArea.set(area, []);
                                        maqsByArea.get(area)!.push(m);
                                    });

                                    return (
                                        <React.Fragment key={col.color}>
                                            {/* Level 1: Primary Row */}
                                            <tr
                                                onClick={() => toggleExpand(col.color)}
                                                style={{
                                                    borderBottom: isExpanded ? 'none' : '1px solid var(--border-color, #2a2d3e)',
                                                    background: isExpanded ? 'rgba(99, 102, 241, 0.07)' : undefined,
                                                    cursor: 'pointer',
                                                    transition: 'background 0.15s ease',
                                                }}
                                            >
                                                <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary, #f3f4f6)', fontSize: '13px' }}>
                                                    🎨 {col.color}
                                                </td>

                                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '3px 10px',
                                                            borderRadius: '12px',
                                                            background: 'rgba(255,255,255,0.06)',
                                                            color: 'var(--text-primary, #f3f4f6)',
                                                            fontWeight: 600,
                                                            fontSize: '12px',
                                                        }}
                                                    >
                                                        {col.articulos.length} art.
                                                    </span>
                                                </td>

                                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '4px 12px',
                                                            background: 'rgba(99, 102, 241, 0.15)',
                                                            color: '#818cf8',
                                                            borderRadius: '12px',
                                                            fontWeight: 800,
                                                            fontSize: '13px',
                                                        }}
                                                    >
                                                        {col.maquinasCount} máquinas
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
                                                    <td colSpan={4} style={{ padding: '16px 20px' }}>
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
                                                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '10px' }}>
                                                                    🏭 Máquinas Asignadas a {col.color} ({col.maquinasCount})
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

                                                            {/* Sub-Panel 2: Artículos Asociados */}
                                                            <div
                                                                style={{
                                                                    background: 'var(--bg-secondary, #1a1d2e)',
                                                                    border: '1px solid var(--border-color, #2a2d3e)',
                                                                    borderRadius: '8px',
                                                                    padding: '12px 16px',
                                                                }}
                                                            >
                                                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '10px' }}>
                                                                    🧵 Artículos con esta Variante ({col.articulos.length})
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                    {col.articulos.map((art, aIdx) => (
                                                                        <span
                                                                            key={aIdx}
                                                                            style={{
                                                                                padding: '4px 10px',
                                                                                background: 'rgba(99, 102, 241, 0.12)',
                                                                                border: '1px solid rgba(99, 102, 241, 0.25)',
                                                                                borderRadius: '6px',
                                                                                fontSize: '12px',
                                                                                color: '#c7d2fe',
                                                                                fontWeight: 700,
                                                                            }}
                                                                        >
                                                                            {art}
                                                                        </span>
                                                                    ))}
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
        </div>
    );
};
