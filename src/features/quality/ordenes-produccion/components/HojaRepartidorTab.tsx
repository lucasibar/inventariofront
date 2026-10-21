import React, { useState, useMemo } from 'react';
import type { HojaRepartidorItem } from '../types/ordenesProduccion.types';
import { Card, Btn } from '../../../../shared/ui';
import { exportHojaRepartidorToExcel } from '../utils/excelExport';

interface HojaRepartidorTabProps {
    items: HojaRepartidorItem[];
    fecha?: string;
    turnos?: string[];
    onEditArticle?: (codigo: string) => void;
}

export const HojaRepartidorTab: React.FC<HojaRepartidorTabProps> = ({
    items,
    fecha,
    turnos,
    onEditArticle,
}) => {
    const [selectedArea, setSelectedArea] = useState<string>('ALL');
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const areas = useMemo(() => {
        const set = new Set<string>();
        items.forEach((it) => set.add(it.area));
        return Array.from(set).sort();
    }, [items]);

    const filtered = useMemo(() => {
        if (selectedArea !== 'ALL') {
            return items.filter((it) => it.area === selectedArea);
        }
        return items;
    }, [items, selectedArea]);

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
                    <select
                        value={selectedArea}
                        onChange={(e) => setSelectedArea(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            background: 'var(--bg-secondary, #1a1d2e)',
                            border: '1px solid var(--border-color, #2a2d3e)',
                            borderRadius: '8px',
                            color: 'var(--text-primary, #f3f4f6)',
                            fontSize: '13px',
                        }}
                    >
                        <option value="ALL">Todas las Áreas ({areas.length})</option>
                        {areas.map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>

                    <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                        <strong>{filtered.length}</strong> entregas agrupadas
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <Btn
                        variant="secondary"
                        onClick={() => exportHojaRepartidorToExcel(filtered)}
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

            {/* Printable Container */}
            <Card
                className="printable-sheet"
                style={{
                    padding: '24px',
                    border: '1px solid var(--border-color, #2a2d3e)',
                    background: 'var(--bg-secondary, #1a1d2e)',
                }}
            >
                {/* Print Header */}
                <div style={{ borderBottom: '2px solid #6366f1', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary, #f3f4f6)' }}>
                            🚚 HOJA DE DISTRIBUCIÓN Y REPARTO A PLANTA
                        </h2>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '4px' }}>
                            Fecha de Producción: <strong>{fecha || 'Fecha actual'}</strong> | Turnos: <strong>{turnos?.join(' / ') || 'Todos'}</strong> | Sector: <strong>Tejeduría</strong>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>
                        <div>WMS INVENTARIO — SECTOR CALIDAD</div>
                        <div>Fecha de Impresión: {new Date().toLocaleDateString('es-AR')}</div>
                    </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                <th style={{ padding: '10px 12px', textAlign: 'center', width: '50px' }}>Entr.</th>
                                <th style={{ padding: '10px 12px', width: '100px' }}>Área / Turno</th>
                                <th style={{ padding: '10px 12px' }}>Artículo TEJIDO / Cód. PDF</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', width: '70px' }}>Talle</th>
                                <th style={{ padding: '10px 12px' }}>Color / Cambios 08:00 AM</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', width: '100px' }}>Máquinas</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', width: '120px' }}>Prod. Estimada</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', width: '130px' }}>Hilado a Llevar</th>
                                <th className="no-print" style={{ padding: '10px 12px', textAlign: 'center', width: '80px' }}>Detalle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted, #9ca3af)' }}>
                                        No hay datos de distribución para el filtro seleccionado.
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
                                                        : item.isUnreviewed
                                                        ? 'rgba(239, 68, 68, 0.05)'
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

                                                <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: '13px', color: '#a5b4fc' }}>
                                                    <div>{item.area}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', fontWeight: 600 }}>
                                                        {item.shift === 'N' ? '🌙 Noche' : '☀️ Mañana'}
                                                    </div>
                                                </td>

                                                <td style={{ padding: '10px 12px' }}>
                                                    <div style={{ fontWeight: 800, color: 'var(--text-primary, #f3f4f6)', fontSize: '13px' }}>
                                                        {item.codigoArticulo}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                                        {item.codigoOriginalPdf ? `Susi: ${item.codigoOriginalPdf} · ` : ''}{item.descripcionArticulo}
                                                    </div>
                                                </td>

                                                <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>
                                                    {item.talle || '-'}
                                                </td>

                                                <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary, #d1d5db)' }}>
                                                    <div>{item.color || '-'}</div>
                                                    {item.cambiosDetalle && item.cambiosDetalle.length > 0 && (
                                                        <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 700, marginTop: '3px' }}>
                                                            🔄 {item.cambiosDetalle.join(' | ')}
                                                        </div>
                                                    )}
                                                </td>

                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '3px 10px',
                                                            borderRadius: '12px',
                                                            background: 'rgba(99, 102, 241, 0.15)',
                                                            color: '#818cf8',
                                                            fontWeight: 800,
                                                            fontSize: '12px',
                                                        }}
                                                    >
                                                        {item.maquinasCount} máq.
                                                    </span>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                                        {item.horasTejido || 0}h netas
                                                    </div>
                                                </td>

                                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 800, color: '#34d399', fontSize: '12px' }}>
                                                        {(item.docenasEstimadas || 0).toFixed(1)} doc.
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted, #9ca3af)' }}>
                                                        {item.paresEstimados || 0} par ({item.mediasEstimadas || 0} med)
                                                    </div>
                                                </td>

                                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            background: item.materiales.length > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                            color: item.materiales.length > 0 ? '#34d399' : '#f87171',
                                                            fontWeight: 800,
                                                            fontSize: '11px',
                                                        }}
                                                    >
                                                        {item.materiales.reduce((acc, m) => acc + (m.consumoKg || 0), 0).toFixed(2)} kg
                                                    </span>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                                        {item.materiales.reduce((acc, m) => acc + (m.conos || 0), 0)} conos ({item.materiales.length} hil.)
                                                    </div>
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
                                                                    🏭 Máquinas Destino ({item.maquinasCount}):
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                                    {item.maquinas.map((m) => (
                                                                        <span
                                                                            key={m}
                                                                            style={{
                                                                                padding: '2px 7px',
                                                                                background: 'rgba(99, 102, 241, 0.15)',
                                                                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                                                                borderRadius: '4px',
                                                                                color: '#c7d2fe',
                                                                                fontWeight: 700,
                                                                                fontSize: '11px',
                                                                            }}
                                                                        >
                                                                            M{m}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Hilados exactos */}
                                                            <div style={{ background: 'var(--bg-secondary, #1a1d2e)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color, #2a2d3e)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '6px' }}>
                                                                        🧵 Hilados a Llevar ({item.materiales.length}):
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                        {item.materiales.map((m, mIdx) => (
                                                                            <div key={mIdx} style={{ fontSize: '11px', color: 'var(--text-primary, #f3f4f6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                                                                                <span>
                                                                                    <strong style={{ color: '#818cf8' }}>{m.codigo}</strong> — {m.descripcion}
                                                                                    {m.posicionPicking && (
                                                                                        <span style={{ marginLeft: '6px', padding: '1px 6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                                                                                            📍 {m.posicionPicking}
                                                                                        </span>
                                                                                    )}
                                                                                </span>
                                                                                <strong style={{ color: '#34d399' }}>
                                                                                    {(m.consumoKg || 0).toFixed(2)} kg ({m.conos || 1} conos)
                                                                                </strong>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {onEditArticle && (
                                                                    <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'right' }}>
                                                                        <Btn
                                                                            small
                                                                            onClick={() => onEditArticle(item.codigoArticulo)}
                                                                            style={{ fontSize: '11px' }}
                                                                        >
                                                                            ✏️ Modificar Artículo {item.codigoArticulo}
                                                                        </Btn>
                                                                    </div>
                                                                )}
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
                    <div>Firma Chofer / Repartidor: ___________________________</div>
                    <div>Firma Responsable Tejeduría: ___________________________</div>
                </div>
            </Card>
        </div>
    );
};
