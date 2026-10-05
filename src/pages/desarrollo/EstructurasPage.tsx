import { useState } from 'react';
import { useGetArticuloEstructurasQuery, useGetArticulosQuery } from '../../features/desarrollo/api/articulos.api';
import { PageHeader, Card, Input, Badge, useIsMobile } from '../../shared/ui';

export function EstructurasPage() {
    const isMobile = useIsMobile();

    const [parentCodeSearch, setParentCodeSearch] = useState('');
    const [selectedParentCode, setSelectedParentCode] = useState('PA-736001');

    // Búsqueda de productos terminados para elegir
    const { data: terminadosData } = useGetArticulosQuery({
        search: parentCodeSearch,
        tipo: 'PA',
        limit: 10,
    });

    const { data: estructuras, isLoading: loadingBOM } = useGetArticuloEstructurasQuery(
        selectedParentCode,
        { skip: !selectedParentCode }
    );

    return (
        <div style={{ padding: isMobile ? '12px' : '20px', maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader
                title="🌳 Estructuras de Producto / Ficha Técnica (BOM)"
                subtitle="Explosión de componentes, consumo por unidad y porcentajes de pérdida (TOTVS SG1)"
            />

            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '380px 1fr',
                gap: '16px',
                alignItems: 'start',
            }}>
                {/* Selector de Producto Padre */}
                <Card style={{ padding: '16px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#f3f4f6' }}>
                        Seleccionar Producto Padre
                    </h3>

                    <Input
                        placeholder="Buscar producto terminado..."
                        value={parentCodeSearch}
                        onChange={(val) => setParentCodeSearch(val)}
                        style={{ marginBottom: '12px' }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '500px', overflowY: 'auto' }}>
                        {terminadosData?.items?.map((art) => {
                            const isSelected = selectedParentCode === art.codigo;
                            return (
                                <div
                                    key={art.id}
                                    onClick={() => setSelectedParentCode(art.codigo)}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                        border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.06)',
                                    }}
                                >
                                    <div style={{ fontWeight: 700, color: isSelected ? '#60a5fa' : '#f9fafb', fontSize: '13px' }}>
                                        {art.codigo}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                        {art.descripcion}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Explosión de Componentes (BOM) */}
                <Card style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                        <div>
                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>Estructura del Artículo:</span>
                            <h2 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 800, color: '#60a5fa' }}>
                                {selectedParentCode}
                            </h2>
                        </div>
                        <Badge color="#6366f1">
                            {estructuras?.length || 0} componentes
                        </Badge>
                    </div>

                    {loadingBOM ? (
                        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '30px' }}>Cargando componentes de la estructura...</p>
                    ) : !estructuras || estructuras.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                            <p>No se encontraron componentes registrados en la estructura de este artículo.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                                        <th style={{ padding: '8px 12px' }}>Secuencia</th>
                                        <th style={{ padding: '8px 12px' }}>Código Componente</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cantidad Base</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>% Pérdida</th>
                                        <th style={{ padding: '8px 12px' }}>Almacén</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {estructuras.map((c, i) => (
                                        <tr
                                            key={c.id || i}
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                                        >
                                            <td style={{ padding: '10px 12px', color: '#9ca3af' }}>
                                                {c.secuencia || i + 1}
                                            </td>
                                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f3f4f6' }}>
                                                {c.codigoComponente}
                                            </td>
                                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                                                {Number(c.cantidadBase).toLocaleString(undefined, { minimumFractionDigits: 4 })}
                                            </td>
                                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#fbbf24' }}>
                                                {c.porcentajePerdida ? `${c.porcentajePerdida}%` : '0%'}
                                            </td>
                                            <td style={{ padding: '10px 12px', color: '#9ca3af' }}>
                                                <Badge color="#9ca3af">{c.almacenComponente || '—'}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
