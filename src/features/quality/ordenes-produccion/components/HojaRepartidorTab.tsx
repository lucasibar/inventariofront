import React, { useState, useMemo } from 'react';
import type { HojaRepartidorItem } from '../types/ordenesProduccion.types';
import { Card, Btn } from '../../../../shared/ui';
import { exportHojaRepartidorToExcel } from '../utils/excelExport';

interface HojaRepartidorTabProps {
    items: HojaRepartidorItem[];
    fecha?: string;
    turnos?: string[];
}

export const HojaRepartidorTab: React.FC<HojaRepartidorTabProps> = ({ items, fecha, turnos }) => {
    const [selectedArea, setSelectedArea] = useState<string>('ALL');
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

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
                        <strong>{filtered.length}</strong> entregas agrupadas para repartidor
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

            {/* Printable Document Container */}
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
                                <th style={{ padding: '10px 12px', width: '90px' }}>Área</th>
                                <th style={{ padding: '10px 12px', width: '130px' }}>Máquinas Destino</th>
                                <th style={{ padding: '10px 12px' }}>Artículo / Prenda</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', width: '70px' }}>Talle</th>
                                <th style={{ padding: '10px 12px' }}>Color / Variante</th>
                                <th style={{ padding: '10px 12px' }}>Hilados e Insumos a Llevar</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', width: '110px' }}>Revisión</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted, #9ca3af)' }}>
                                        No hay datos de distribución para el filtro seleccionado.
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
                                                    : item.isUnreviewed
                                                    ? 'rgba(239, 68, 68, 0.05)'
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

                                            <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: '13px', color: '#a5b4fc' }}>
                                                {item.area}
                                            </td>

                                            <td style={{ padding: '10px 12px' }}>
                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                    {item.maquinas.map((m) => (
                                                        <span
                                                            key={m}
                                                            style={{
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                background: 'rgba(99, 102, 241, 0.15)',
                                                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                                                color: '#c7d2fe',
                                                                fontWeight: 800,
                                                                fontSize: '12px',
                                                            }}
                                                        >
                                                            M{m}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                                    ({item.maquinasCount} máq.)
                                                </div>
                                            </td>

                                            <td style={{ padding: '10px 12px' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--text-primary, #f3f4f6)', fontSize: '13px' }}>
                                                    {item.codigoArticulo}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>
                                                    {item.descripcionArticulo}
                                                </div>
                                            </td>

                                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>
                                                {item.talle || '-'}
                                            </td>

                                            <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                                                {item.color || '-'}
                                            </td>

                                            <td style={{ padding: '10px 12px' }}>
                                                {item.materiales.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                        {item.materiales.map((m, mIdx) => (
                                                            <div
                                                                key={mIdx}
                                                                style={{
                                                                    fontSize: '11px',
                                                                    padding: '2px 6px',
                                                                    background: 'rgba(255,255,255,0.04)',
                                                                    borderRadius: '4px',
                                                                }}
                                                            >
                                                                <strong style={{ color: '#818cf8' }}>{m.rol}:</strong> {m.codigo} — {m.descripcion} {m.colorNombre ? `(${m.colorNombre})` : ''}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '11px', color: '#f87171', fontStyle: 'italic' }}>
                                                        ⚠️ Sin insumos cargados en ficha técnica
                                                    </span>
                                                )}
                                            </td>

                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                {item.isUnreviewed ? (
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
                                                    >
                                                        ⚠️ OJO: No Revisado
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                                                        🟢 Chequeado
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
                    <div>Firma Chofer / Repartidor: ___________________________</div>
                    <div>Firma Responsable Tejeduría: ___________________________</div>
                </div>
            </Card>
        </div>
    );
};
