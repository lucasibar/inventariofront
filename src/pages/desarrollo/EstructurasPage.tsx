import { useState } from 'react';
import { useGetArticuloEstructurasQuery, useGetArticulosQuery } from '../../features/desarrollo/api/articulos.api';
import { PageHeader, Card, Input, Badge, useIsMobile } from '../../shared/ui';

export function EstructurasPage() {
    const isMobile = useIsMobile();

    const [parentCodeSearch, setParentCodeSearch] = useState('');
    const [selectedParentCode, setSelectedParentCode] = useState('');

    // Búsqueda de artículos padre
    const { data: articulosData } = useGetArticulosQuery({
        search: parentCodeSearch,
        limit: 25,
    });

    const { data: estructuras, isLoading: loadingBOM } = useGetArticuloEstructurasQuery(
        selectedParentCode,
        { skip: !selectedParentCode }
    );

    return (
        <div style={{ padding: isMobile ? '12px' : '20px', maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader
                title="🌳 Estructuras de Producto / Ficha Técnica (BOM)"
                subtitle="Explosión de componentes, consumo unitario y especificaciones técnicas (TOTVS SG1)"
            />

            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '400px 1fr',
                gap: '16px',
                alignItems: 'start',
            }}>
                {/* Selector de Producto Padre */}
                <Card style={{ padding: '16px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#f3f4f6' }}>
                        Buscar Artículo Padre
                    </h3>

                    <Input
                        placeholder="Escribe código o descripción..."
                        value={parentCodeSearch}
                        onChange={(val) => setParentCodeSearch(val)}
                        style={{ marginBottom: '12px' }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '560px', overflowY: 'auto' }}>
                        {articulosData?.items?.length === 0 ? (
                            <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                                No se encontraron artículos.
                            </p>
                        ) : (
                            articulosData?.items?.map((art) => {
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
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 700, color: isSelected ? '#60a5fa' : '#f9fafb', fontSize: '13px' }}>
                                                {art.codigo}
                                            </span>
                                            <Badge color="#9ca3af">{art.tipo}</Badge>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                            {art.descripcion}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </Card>

                {/* Explosión de Componentes (BOM) */}
                <Card style={{ padding: '16px' }}>
                    {!selectedParentCode ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                            <h3 style={{ color: '#f3f4f6', margin: '0 0 8px' }}>Selecciona un artículo padre</h3>
                            <p style={{ margin: 0, fontSize: '13px' }}>
                                Elige cualquier artículo de la lista de la izquierda para ver su receta completa de componentes, hilados e insumos.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                                <div>
                                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>Receta / Estructura de:</span>
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
                                    <p>No se encontraron componentes registrados en la estructura de este artículo ({selectedParentCode}).</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                                                <th style={{ padding: '8px 12px' }}>Código Componente</th>
                                                <th style={{ padding: '8px 12px' }}>Descripción Insumo</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Consumo / Cantidad</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Estado Revisión</th>
                                                <th style={{ padding: '8px 12px' }}>Observaciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {estructuras.map((c, i) => (
                                                <tr
                                                    key={c.id || i}
                                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                                                >
                                                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f3f4f6' }}>
                                                        {c.codigoComponente}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', color: '#9ca3af' }}>
                                                        {c.descripcionInsumo || c.componenteAnterior || '—'}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                                                        {Number(c.cantidad).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                        <Badge color={c.estadoRevision === 'VERDE' ? '#10b981' : c.estadoRevision === 'ROJO' ? '#ef4444' : '#f59e0b'}>
                                                            {c.estadoRevision || 'VERDE'}
                                                        </Badge>
                                                    </td>
                                                    <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: '12px' }}>
                                                        {c.detalleRevision || c.observacion || '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
}
