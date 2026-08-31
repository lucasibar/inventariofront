import React, { useState } from 'react';
import type { HojaPickingItem } from '../types/ordenesProduccion.types';
import { Card, Btn } from '../../../../shared/ui';
import { exportHojaPickingToExcel } from '../utils/excelExport';

interface HojaPickingTabProps {
    items: HojaPickingItem[];
    fecha?: string;
    turnos?: string[];
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

export const HojaPickingTab: React.FC<HojaPickingTabProps> = ({ items, fecha, turnos }) => {
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
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
                        placeholder="🔍 Buscar por código, hilado, artículo o máquina..."
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
                        <strong>{filtered.length}</strong> insumos a preparar en depósito
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
                                <th style={{ padding: '10px 12px', width: '130px' }}>Código Insumo</th>
                                <th style={{ padding: '10px 12px' }}>Descripción Material</th>
                                <th style={{ padding: '10px 12px', width: '100px' }}>Rol / Función</th>
                                <th style={{ padding: '10px 12px', width: '120px' }}>Color / Tono</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', width: '110px' }}>Máq. a Surtir</th>
                                <th style={{ padding: '10px 12px' }}>Áreas y Máquinas Destino</th>
                                <th style={{ padding: '10px 12px', width: '140px' }}>Artículos</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', width: '100px' }}>Control</th>
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
                                    return (
                                        <tr
                                            key={item.id}
                                            style={{
                                                borderBottom: '1px solid var(--border-color, #2a2d3e)',
                                                background: isChecked
                                                    ? 'rgba(16, 185, 129, 0.06)'
                                                    : item.hasUnreviewedArticles
                                                    ? 'rgba(239, 68, 68, 0.04)'
                                                    : undefined,
                                                opacity: isChecked ? 0.75 : 1,
                                            }}
                                        >
                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleToggleCheck(item.id)}
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

                                            <td style={{ padding: '10px 12px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#a5b4fc', marginBottom: '2px' }}>
                                                    {item.areas.join(' | ')}
                                                </div>
                                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', maxWidth: '280px' }}>
                                                    {item.maquinas.map((m) => (
                                                        <span
                                                            key={m}
                                                            style={{
                                                                padding: '1px 5px',
                                                                borderRadius: '3px',
                                                                background: 'rgba(255,255,255,0.06)',
                                                                fontSize: '11px',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            M{m}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>

                                            <td style={{ padding: '10px 12px' }}>
                                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                                    {item.articulos.map((art, aIdx) => (
                                                        <span
                                                            key={aIdx}
                                                            style={{
                                                                padding: '1px 5px',
                                                                borderRadius: '3px',
                                                                background: 'rgba(99, 102, 241, 0.12)',
                                                                color: '#c7d2fe',
                                                                fontSize: '10px',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {art}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>

                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                {item.hasUnreviewedArticles ? (
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            color: '#f87171',
                                                            fontWeight: 700,
                                                            fontSize: '10px',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                                        }}
                                                        title="Uno o más artículos que usan este insumo están pendientes de revisión"
                                                    >
                                                        ⚠️ OJO: Revisar
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                                                        🟢 Verificado
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
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
