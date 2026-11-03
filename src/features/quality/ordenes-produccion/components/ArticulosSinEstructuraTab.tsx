import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { ArticuloProduccionSummary } from '../types/ordenesProduccion.types';
import { Card, Btn, Badge } from '../../../../shared/ui';

interface ArticulosSinEstructuraTabProps {
    articulos: ArticuloProduccionSummary[];
    onSelectMachine?: (machineNum: number) => void;
    onConciliarSusi?: (a: ArticuloProduccionSummary) => void;
    onRecalcular?: () => void;
}

export const ArticulosSinEstructuraTab: React.FC<ArticulosSinEstructuraTabProps> = ({
    articulos,
    onSelectMachine,
    onConciliarSusi,
    onRecalcular,
}) => {
    const navigate = useNavigate();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Banner Informativo */}
            <Card
                style={{
                    padding: '16px 20px',
                    background: articulos.length > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                    border: articulos.length > 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '28px' }}>{articulos.length > 0 ? '⚠️' : '✅'}</span>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: articulos.length > 0 ? '#f87171' : '#34d399' }}>
                            {articulos.length > 0
                                ? `${articulos.length} artículos en producción sin receta técnica de hilados (BOM)`
                                : '¡Excelente! Todos los artículos de producción del día tienen su estructura de hilados'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                            {articulos.length > 0
                                ? 'Al no tener estructura cargada en el Catálogo, el sistema no puede deducir qué hilados ni cuántos kilos/conos enviar a las máquinas.'
                                : 'Todos los hilados y docenas están 100% calculados y reflejados en los balances de compras y depósito.'}
                        </div>
                    </div>
                </div>

                {articulos.length > 0 && onRecalcular && (
                    <Btn
                        onClick={onRecalcular}
                        style={{
                            background: '#2563eb',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 600,
                        }}
                    >
                        🔄 Recalcular tras Cargar Recetas
                    </Btn>
                )}
            </Card>

            {/* Listado de Artículos sin BOM */}
            {articulos.length === 0 ? (
                <Card style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted, #9ca3af)' }}>
                    🎉 No hay artículos pendientes de estructura en la planilla cargada.
                </Card>
            ) : (
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-secondary, #1a1d2e)', borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #9ca3af)' }}>Código Artículo / SUSI</th>
                                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #9ca3af)' }}>Descripción / Marca</th>
                                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #9ca3af)' }}>Talles / Colores</th>
                                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #9ca3af)' }}>Máquinas Asignadas</th>
                                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #9ca3af)', textAlign: 'right' }}>Producción Estimada</th>
                                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted, #9ca3af)', textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {articulos.map((a) => {
                                    const isUnknown = a.codigo === 'SIN_CODIGO' || a.advertencia?.includes('no encontrado');
                                    return (
                                        <tr
                                            key={a.codigo}
                                            style={{
                                                borderBottom: '1px solid var(--border-color, #2a2d3e)',
                                                background: 'rgba(239, 68, 68, 0.02)',
                                            }}
                                        >
                                            <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                                <div style={{ fontWeight: 700, color: '#f3f4f6', fontFamily: 'monospace' }}>
                                                    {a.codigo}
                                                </div>
                                                {a.codigoOriginalPdf && a.codigoOriginalPdf !== a.codigo && (
                                                    <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '2px' }}>
                                                        PDF: <strong>{a.codigoOriginalPdf}</strong>
                                                    </div>
                                                )}
                                                {a.codigoSusi && a.codigoSusi !== a.codigo && (
                                                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                                        SUSI: {a.codigoSusi}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                                <div style={{ fontWeight: 500, color: '#e5e7eb' }}>
                                                    {a.descripcion || 'Sin descripción'}
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                                                    {a.marca && <Badge color="#6b7280">{a.marca}</Badge>}
                                                    <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 600 }}>
                                                        {a.advertencia || 'Sin estructura BOM'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '12px', color: '#d1d5db' }}>
                                                    {a.talles.length > 0 ? a.talles.join(', ') : 'Único'}
                                                </div>
                                                {a.colores.length > 0 && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                                        {a.colores.join(', ')}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    {a.maquinas.map((m) => (
                                                        <span
                                                            key={m}
                                                            onClick={() => onSelectMachine && onSelectMachine(m)}
                                                            style={{
                                                                cursor: onSelectMachine ? 'pointer' : 'default',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                background: 'rgba(99, 102, 241, 0.15)',
                                                                color: '#a5b4fc',
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                            }}
                                                            title="Filtrar por esta máquina"
                                                        >
                                                            M#{m}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                                                <div style={{ fontWeight: 700, color: '#f3f4f6' }}>
                                                    {(a.docenasTotales || 0).toLocaleString('es-AR')} doc
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                                    {(a.paresTotales || 0).toLocaleString('es-AR')} pares ({a.horasTejidoTotales || 0}h)
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                    {isUnknown && onConciliarSusi ? (
                                                        <Btn
                                                            variant="primary"
                                                            onClick={() => onConciliarSusi(a)}
                                                            style={{
                                                                fontSize: '11px',
                                                                padding: '6px 10px',
                                                                background: '#f59e0b',
                                                                color: '#111827',
                                                                fontWeight: 700,
                                                            }}
                                                        >
                                                            ⚡ Vincular SUSI
                                                        </Btn>
                                                    ) : (
                                                        <Btn
                                                            variant="secondary"
                                                            onClick={() => navigate(`/desarrollo/articulos?codigo=${encodeURIComponent(a.codigo)}`)}
                                                            style={{
                                                                fontSize: '11px',
                                                                padding: '6px 12px',
                                                                borderColor: 'rgba(59, 130, 246, 0.4)',
                                                                color: '#60a5fa',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            📋 Armar Receta BOM ↗️
                                                        </Btn>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};
