import React, { useState, useMemo } from 'react';
import type { ParsedMachineEntry } from '../types/ordenesProduccion.types';
import { Card, Btn, Modal } from '../../../../shared/ui';
import { exportMatrizMaquinasToExcel } from '../utils/excelExport';

interface MaquinasTabProps {
    maquinas: ParsedMachineEntry[];
    selectedShift?: string;
    selectedArea?: string;
    onEditArticle?: (codigo: string) => void;
}

const AREAS_DEF = [
    { id: '1', name: 'Área 1', range: 'Máquinas 1 a 22', start: 1, end: 22 },
    { id: '2', name: 'Área 2', range: 'Máquinas 23 a 67', start: 23, end: 67 },
    { id: '3', name: 'Área 3', range: 'Máquinas 73 a 117', start: 73, end: 117 },
    { id: '4', name: 'Área 4', range: 'Máquinas 126 a 170', start: 126, end: 170 },
    { id: '5', name: 'Área 5', range: 'Máquinas 171 a 190', start: 171, end: 190 },
];

export const MaquinasTab: React.FC<MaquinasTabProps> = ({ maquinas, onEditArticle }) => {
    const [selectedAreaTab, setSelectedAreaTab] = useState<string>('ALL');
    const [filterOnlyUnreviewed, setFilterOnlyUnreviewed] = useState(false);
    const [selectedMachineModal, setSelectedMachineModal] = useState<{ machineNum: number; entries: ParsedMachineEntry[] } | null>(null);

    // Group entries by machine number
    const entriesByMachine = useMemo(() => {
        const map = new Map<number, ParsedMachineEntry[]>();
        for (const entry of maquinas) {
            if (!map.has(entry.machine)) {
                map.set(entry.machine, []);
            }
            map.get(entry.machine)!.push(entry);
        }
        return map;
    }, [maquinas]);

    // Compute all unique machines present or defined
    const filteredAreas = useMemo(() => {
        if (selectedAreaTab !== 'ALL') {
            return AREAS_DEF.filter((a) => a.id === selectedAreaTab);
        }
        return AREAS_DEF;
    }, [selectedAreaTab]);

    const handleOpenMachine = (mNum: number) => {
        const entries = entriesByMachine.get(mNum) || [];
        setSelectedMachineModal({ machineNum: mNum, entries });
    };

    return (
        <div>
            {/* Header & Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Btn
                        variant={selectedAreaTab === 'ALL' ? 'primary' : 'secondary'}
                        onClick={() => setSelectedAreaTab('ALL')}
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                        Todas las Áreas
                    </Btn>
                    {AREAS_DEF.map((area) => (
                        <Btn
                            key={area.id}
                            variant={selectedAreaTab === area.id ? 'primary' : 'secondary'}
                            onClick={() => setSelectedAreaTab(area.id)}
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                            {area.name} ({area.start}-{area.end})
                        </Btn>
                    ))}

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', marginLeft: '10px', color: '#f87171' }}>
                        <input
                            type="checkbox"
                            checked={filterOnlyUnreviewed}
                            onChange={(e) => setFilterOnlyUnreviewed(e.target.checked)}
                        />
                        <span>⚠️ Solo máquinas con artículos no revisados</span>
                    </label>
                </div>

                <Btn
                    variant="secondary"
                    onClick={() => exportMatrizMaquinasToExcel(maquinas)}
                    style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                    📥 Exportar Matriz Excel
                </Btn>
            </div>

            {/* Areas Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {filteredAreas.map((area) => {
                    // Generate list of machines for this area
                    const areaMachines: number[] = [];
                    for (let m = area.start; m <= area.end; m++) {
                        if (area.id === '2' && m >= 38 && m <= 42) continue; // Gap in area 2
                        if (area.id === '3' && m >= 88 && m <= 92) continue; // Gap in area 3
                        if (area.id === '4' && m >= 151 && m <= 155) continue; // Gap in area 4
                        areaMachines.push(m);
                    }

                    return (
                        <Card
                            key={area.id}
                            style={{
                                padding: '18px 20px',
                                border: '1px solid var(--border-color, #2a2d3e)',
                                background: 'var(--bg-secondary, #1a1d2e)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#a5b4fc' }}>{area.name}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>({area.range})</span>
                                </div>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)' }}>
                                    {areaMachines.length} Máquinas en este sector
                                </span>
                            </div>

                            {/* Machine Grid */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                    gap: '10px',
                                }}
                            >
                                {areaMachines.map((mNum) => {
                                    const entries = entriesByMachine.get(mNum) || [];
                                    const hasEntries = entries.length > 0;
                                    const hasUnreviewed = entries.some((e) => e.isUnreviewed);

                                    if (filterOnlyUnreviewed && !hasUnreviewed) {
                                        return null;
                                    }

                                    const primaryEntry = entries[0];
                                    const primaryArticle = primaryEntry?.articleCode || primaryEntry?.articleRaw || '';

                                    return (
                                        <div
                                            key={mNum}
                                            onClick={() => handleOpenMachine(mNum)}
                                            style={{
                                                padding: '10px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                border: hasUnreviewed
                                                    ? '1.5px solid rgba(239, 68, 68, 0.6)'
                                                    : hasEntries
                                                    ? '1px solid rgba(99, 102, 241, 0.3)'
                                                    : '1px solid var(--border-color, #2a2d3e)',
                                                background: hasUnreviewed
                                                    ? 'rgba(239, 68, 68, 0.08)'
                                                    : hasEntries
                                                    ? 'rgba(99, 102, 241, 0.08)'
                                                    : 'rgba(0, 0, 0, 0.12)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                minHeight: '85px',
                                                transition: 'all 0.15s ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 800, fontSize: '14px', color: '#f3f4f6' }}>
                                                    M{mNum}
                                                </span>
                                                {hasUnreviewed ? (
                                                    <span style={{ fontSize: '11px' }} title="Artículo no revisado en catálogo. Clic para inspeccionar">
                                                        ⚠️
                                                    </span>
                                                ) : hasEntries ? (
                                                    <span style={{ fontSize: '10px', color: '#10b981' }}>🟢</span>
                                                ) : (
                                                    <span style={{ fontSize: '10px', color: 'var(--text-muted, #6b7280)' }}>⏸️</span>
                                                )}
                                            </div>

                                            <div style={{ marginTop: '4px' }}>
                                                {hasEntries ? (
                                                    <>
                                                        <div
                                                            style={{
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                color: hasUnreviewed ? '#f87171' : '#a5b4fc',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                            }}
                                                            title={primaryArticle}
                                                        >
                                                            {primaryArticle || 'Sin código'}
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                                            <span>Talle: {primaryEntry.talle || '-'}</span>
                                                            {entries.length > 1 && (
                                                                <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                                                                    +{entries.length - 1} art
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: '10px',
                                                                color: 'var(--text-muted, #9ca3af)',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                marginTop: '1px',
                                                            }}
                                                            title={primaryEntry.colorRaw}
                                                        >
                                                            {primaryEntry.colorRaw || '-'}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #6b7280)', fontStyle: 'italic' }}>
                                                        Sin actividad
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Modal de Detalle de Máquina */}
            {selectedMachineModal && (
                <Modal
                    onClose={() => setSelectedMachineModal(null)}
                    title={`Detalle de Máquina M${selectedMachineModal.machineNum}`}
                >
                    <div style={{ padding: '4px' }}>
                        {selectedMachineModal.entries.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #9ca3af)' }}>
                                Esta máquina no tiene artículos programados en los archivos cargados.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted, #9ca3af)' }}>
                                    Programación detectada en <strong>{selectedMachineModal.entries.length}</strong> registro(s):
                                </div>

                                {selectedMachineModal.entries.map((entry, idx) => {
                                    const matched = entry.matchedArticle;
                                    const artCode = entry.articleCode || entry.articleRaw;

                                    return (
                                        <Card
                                            key={idx}
                                            style={{
                                                padding: '14px 18px',
                                                border: entry.isUnreviewed ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color, #2a2d3e)',
                                                background: 'rgba(0,0,0,0.15)',
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontWeight: 800, color: '#818cf8', fontSize: '14px' }}>
                                                        {artCode}
                                                    </span>
                                                    <span style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }}>
                                                        Turno {entry.shift === 'M' ? '☀️ Mañana' : '🌙 Noche'}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>
                                                        {entry.date ? `Fecha: ${entry.date}` : ''}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {entry.isUnreviewed ? (
                                                        <span
                                                            onClick={() => {
                                                                if (onEditArticle) {
                                                                    setSelectedMachineModal(null);
                                                                    onEditArticle(artCode);
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '3px 8px',
                                                                background: 'rgba(239, 68, 68, 0.2)',
                                                                color: '#f87171',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                cursor: onEditArticle ? 'pointer' : 'default',
                                                            }}
                                                            title="Clic para revisar ficha técnica"
                                                        >
                                                            ⚠️ No Revisado ✏️
                                                        </span>
                                                    ) : (
                                                        <span style={{ padding: '3px 8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                                                            🟢 Chequeado
                                                        </span>
                                                    )}
                                                    {onEditArticle && (
                                                        <Btn
                                                            small
                                                            onClick={() => {
                                                                setSelectedMachineModal(null);
                                                                onEditArticle(artCode);
                                                            }}
                                                            style={{ fontSize: '11px' }}
                                                        >
                                                            ✏️ Editar Artículo
                                                        </Btn>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ fontSize: '13px', color: 'var(--text-primary, #f3f4f6)', marginBottom: '6px' }}>
                                                {matched?.descripcion || entry.descRaw || 'Sin descripción'}
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginBottom: '10px' }}>
                                                <div>Talle: <strong style={{ color: '#fff' }}>{entry.talle || '-'}</strong></div>
                                                <div>Color: <strong style={{ color: '#fff' }}>{entry.colorRaw || '-'}</strong></div>
                                                <div>Área: <strong style={{ color: '#fff' }}>Área {entry.area}</strong></div>
                                                <div>Archivo: <span style={{ fontSize: '10px' }}>{entry.file}</span></div>
                                            </div>

                                            {/* BOM if present */}
                                            {matched?.itemRefs && matched.itemRefs.length > 0 && (
                                                <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '6px' }}>
                                                        Hilados requeridos por esta máquina:
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {matched.itemRefs.map((ref: any, rIdx: number) => (
                                                            <div
                                                                key={rIdx}
                                                                style={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    fontSize: '11px',
                                                                    padding: '3px 8px',
                                                                    background: 'rgba(255,255,255,0.03)',
                                                                    borderRadius: '4px',
                                                                }}
                                                            >
                                                                <span><strong>{ref.rol}:</strong> {ref.item?.codigoInterno} - {ref.item?.descripcion}</span>
                                                                <span style={{ color: 'var(--text-muted, #9ca3af)' }}>{ref.colorNombre || ref.item?.tono || ''}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};
