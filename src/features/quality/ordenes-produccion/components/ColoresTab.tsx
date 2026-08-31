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

export const ColoresTab: React.FC<ColoresTabProps> = ({ colores, onSelectMachine }) => {
    const [q, setQ] = useState('');

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

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <input
                    type="text"
                    placeholder="🔍 Buscar color, artículo o máquina..."
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

                <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                    Mostrando <strong>{filtered.length}</strong> variantes de color
                </span>
            </div>

            <Card style={{ overflow: 'hidden', padding: 0, border: '1px solid var(--border-color, #2a2d3e)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                <th style={{ padding: '12px 14px' }}>Color / Variante</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center', width: '120px' }}>N° Máquinas</th>
                                <th style={{ padding: '12px 14px' }}>Artículos Asociados</th>
                                <th style={{ padding: '12px 14px' }}>Máquinas Asignadas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted, #9ca3af)' }}>
                                        No se encontraron colores con el criterio de búsqueda.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((col, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary, #f3f4f6)', fontSize: '13px' }}>
                                            🎨 {col.color}
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    padding: '3px 10px',
                                                    background: 'rgba(99, 102, 241, 0.15)',
                                                    color: '#818cf8',
                                                    borderRadius: '12px',
                                                    fontWeight: 800,
                                                    fontSize: '13px',
                                                }}
                                            >
                                                {col.maquinasCount}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {col.articulos.map((art, aIdx) => (
                                                    <span
                                                        key={aIdx}
                                                        style={{
                                                            padding: '2px 6px',
                                                            background: 'rgba(255,255,255,0.06)',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                            color: '#a5b4fc',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {art}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '380px' }}>
                                                {col.maquinas.map((m) => (
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
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
