import React, { useState } from 'react';
import type { HojaPickingItem } from '../types/ordenesProduccion.types';
import { Card, Btn } from '../../../../shared/ui';
import { exportHojaPickingToExcel } from '../utils/excelExport';

interface HojaPickingTabProps {
    items: HojaPickingItem[];
    fecha?: string;
    turnos?: string[];
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

export const HojaPickingTab: React.FC<HojaPickingTabProps> = ({
    items,
    fecha,
    turnos,
    onEditArticle,
}) => {
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [q, setQ] = useState('');

    const filtered = items.filter((it) => {
        if (!q) return true;
        const lower = q.toLowerCase();
        return (
            it.codigoMaterial.toLowerCase().includes(lower) ||
            it.descripcionMaterial.toLowerCase().includes(lower) ||
            (it.tono && it.tono.toLowerCase().includes(lower)) ||
            (it.colorNombre && it.colorNombre.toLowerCase().includes(lower)) ||
            it.articulos.some((a) => a.toLowerCase().includes(lower)) ||
            it.maquinas.some((m) => `m${m}`.includes(lower))
        );
    });

    const handleToggleCheck = (id: string) => {
        setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleExpand = (id: string) => {
        setExpandedRow((prev) => (prev === id ? null : id));
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div>
            {/* Screen Action Bar (hidden on print) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar por código, hilado o máquina..."
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
                        <strong>{filtered.length}</strong> insumos para preparar en depósito
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <Btn
                        variant="secondary"
                        onClick={() => exportHojaPickingToExcel(filtered)}
                        style={{ fontSize: '13px', padding: '6px 14px' }}
                    >
                        📥 Exportar Excel
                    </Btn>
                    <Btn
                        onClick={handlePrint}
                        style={{ fontSize: '13px', padding: '6px 16px', background: '#10b981' }}
                    >
                        🖨️ Imprimir / Guardar PDF
                    </Btn>
                </div>
            </div>

            {/* Printable Sheet */}
            <Card
                className="printable-sheet"
                style={{
                    padding: '24px',
                    border: '1px solid var(--border-color, #2a2d3e)',
                    background: 'var(--bg-secondary, #1a1d2e)',
                }}
            >
                {/* Print Header */}
                <div style={{ borderBottom: '2px solid #10b981', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary, #f3f4f6)' }}>
                            📋 HOJA DE PICKING Y PREPARACIÓN DE DEPÓSITO
                        </h2>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '4px' }}>
                            Fecha de Producción: <strong>{fecha || 'Fecha actual'}</strong> | Turnos: <strong>{turnos?.join(' / ') || 'Todos'}</strong> | Sector: <strong>Depósito de Hilados</strong>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>
                        <div>WMS INVENTARIO — SECTOR PICKING</div>
                        <div>Fecha de Emisión: {new Date().toLocaleDateString('es-AR')}</div>
                    </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                <th style={{ padding: '10px 12px', textAlign: 'center', width: '50px' }}>Listo</th>
                                <th style={{ padding: '10px 12px', width: '120px' }}>Código Insumo</th>
                                <th style={{ padding: '10px 12px' }}>Descripción Material</th>
                                <th style={{ padding: '10px 12px', width: '110px' }}>Rol</th>
                                <th style={{ padding: '10px 12px', width: '120px' }}>Color / Tono</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', width: '110px' }}>Máquinas</th>
                                <th style={{ padding: '10px 12px', width: '140px' }}>Áreas Destino</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', width: '110px' }}>Control</th>
                                <th className="no-print" style={{ padding: '10px 12px', textAlign: 'center', width: '80px' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted, #9ca3af)' }}>
                                        No hay insumos para preparar con el filtro aplicado.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((item) => {
                                    const isChecked = !!checkedItems[item.id];
                                    const isExpanded = expandedRow === item.id;

                                    return (
                                        <React.Fragment key={item.id}>
                                            {/* Level 1: Primary Row */}
                                            <tr
                                                onClick={() => toggleExpand(item.id)}
                                                style={{
                                                    borderBottom: isExpanded ? 'none' : '1px solid var(--border-color, #2a2d3e)',
                                                    background: isChecked
                                                        ? 'rgba(16, 185, 129, 0.06)'
                                                        : isExpanded
                                                        ? 'rgba(99, 102, 241, 0.07)'
                                                        : item.hasUnreviewedArticles
                                                        ? 'rgba(239, 68, 68, 0.04)'
                                                        : undefined,
                                                    cursor: 'pointer',
                                                    opacity: isChecked ? 0.75 : 1,
                                                }}
                                            >
                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleCheck(item.id);
                                                        }}
                                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                    />
                                                </td>

                                                <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: '13px', color: '#818cf8' }}>
                                                    {item.codigoMaterial}
                                                </td>

                                                <td style={{ padding: '10px 12px', fontSize: '13px' }}>
                                                    <div style={{ fontWeight: 600 }}>{item.descripcionMaterial}</div>
                                                    {item.proveedor && (
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>
                                                            Prov: {item.proveedor}
                                                        </div>
                                                    )}
                                                </td>

                                                <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 600 }}>
                                                    {ROL_LABELS[item.rol] || item.rol}
                                                </td>

                                                <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary, #d1d5db)' }}>
                                                    {item.colorNombre || item.tono || '-'}
                                                </td>

                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '3px 10px',
                                                            borderRadius: '12px',
                                                            background: 'rgba(16, 185, 129, 0.15)',
                                                            color: '#34d399',
                                                            fontWeight: 800,
                                                            fontSize: '13px',
                                                        }}
                                                    >
                                                        {item.maquinasCount} máq.
                                                    </span>
                                                </td>

                                                <td style={{ padding: '10px 12px', fontSize: '11px', color: '#a5b4fc', fontWeight: 600 }}>
                                                    {item.areas.join(' | ')}
                                                </td>

                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    {item.hasUnreviewedArticles ? (
                                                        <span
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onEditArticle && item.articulos.length > 0) {
                                                                    onEditArticle(item.articulos[0]);
                                                                }
                                                            }}
                                                            style={{
                                                                display: 'inline-block',
                                                                padding: '3px 8px',
                                                                borderRadius: '4px',
                                                                background: 'rgba(239, 68, 68, 0.18)',
                                                                color: '#f87171',
                                                                fontWeight: 700,
                                                                fontSize: '10px',
                                                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                                                cursor: onEditArticle ? 'pointer' : 'default',
                                                            }}
                                                            title="Contiene artículos no revisados. Clic para abrir ficha"
                                                        >
                                                            ⚠️ Revisar ✏️
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                                                            🟢 Verificado
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="no-print" style={{ padding: '10px 12px', textAlign: 'center' }}>
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
                                                        {isExpanded ? '▲' : '▼'}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Level 2: Secondary Expandable Drawer */}
                                            {isExpanded && (
                                                <tr className="no-print" style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                                    <td colSpan={9} style={{ padding: '14px 20px' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                                                            {/* Máquinas exactas */}
                                                            <div style={{ background: 'var(--bg-secondary, #1a1d2e)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color, #2a2d3e)' }}>
                                                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '6px' }}>
                                                                    🏭 Máquinas a Surtir ({item.maquinasCount}):
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                                                    {item.maquinas.map((m) => (
                                                                        <span
                                                                            key={m}
                                                                            style={{
                                                                                padding: '2px 6px',
                                                                                borderRadius: '4px',
                                                                                background: 'rgba(255,255,255,0.06)',
                                                                                fontSize: '11px',
                                                                                fontWeight: 600,
                                                                            }}
                                                                        >
                                                                            M{m}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Artículos asociados */}
                                                            <div style={{ background: 'var(--bg-secondary, #1a1d2e)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color, #2a2d3e)' }}>
                                                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '6px' }}>
                                                                    🧵 Artículos que usan este insumo ({item.articulos.length}):
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                    {item.articulos.map((art, aIdx) => (
                                                                        <button
                                                                            key={aIdx}
                                                                            type="button"
                                                                            onClick={() => onEditArticle && onEditArticle(art)}
                                                                            style={{
                                                                                padding: '3px 8px',
                                                                                borderRadius: '4px',
                                                                                background: 'rgba(99, 102, 241, 0.15)',
                                                                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                                                                color: '#c7d2fe',
                                                                                fontSize: '11px',
                                                                                fontWeight: 700,
                                                                                cursor: onEditArticle ? 'pointer' : 'default',
                                                                            }}
                                                                            title={`Abrir artículo ${art}`}
                                                                        >
                                                                            {art} ✏️
                                                                        </button>
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

                {/* Print Footer */}
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                    <div>Armado / Preparado por: ___________________________</div>
                    <div>Control / Despacho por: ___________________________</div>
                </div>
            </Card>
        </div>
    );
};
