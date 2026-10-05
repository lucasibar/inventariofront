import { useState } from 'react';
import { useGetArticulosQuery, type Articulo } from '../../features/desarrollo/api/articulos.api';
import { PageHeader, Card, Btn, Input, Select, Badge, useIsMobile } from '../../shared/ui';

export function ArticulosPage() {
    const isMobile = useIsMobile();

    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFiltro, setTipoFiltro] = useState('');
    const [marcaFiltro, setMarcaFiltro] = useState('');
    const [page, setPage] = useState(1);
    const [selectedArticulo, setSelectedArticulo] = useState<Articulo | null>(null);

    const { data, isLoading } = useGetArticulosQuery({
        search: searchTerm,
        tipo: tipoFiltro,
        marca: marcaFiltro,
        page,
        limit: 25,
    });

    const tipoOptions = [
        { value: '', label: 'Todos los tipos' },
        { value: 'PA', label: 'PA - Producto Terminado' },
        { value: 'PI', label: 'PI - Producto Intermedio' },
        { value: 'MP', label: 'MP - Materia Prima / Hilado' },
    ];

    return (
        <div style={{ padding: isMobile ? '12px' : '20px', maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader
                title="📋 Catálogo Maestro de Artículos (TOTVS)"
                subtitle="Consulta, búsqueda y especificaciones de productos terminados, hilados e insumos"
            />

            {/* Filtros */}
            <Card style={{ marginBottom: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 250px' }}>
                        <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                            Buscar por Código o Descripción
                        </label>
                        <Input
                            placeholder="Buscar en 5.974 artículos..."
                            value={searchTerm}
                            onChange={(val) => {
                                setSearchTerm(val);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div style={{ width: isMobile ? '100%' : '200px' }}>
                        <Select
                            label="Tipo de Producto"
                            value={tipoFiltro}
                            options={tipoOptions}
                            onChange={(val) => {
                                setTipoFiltro(val);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div style={{ width: isMobile ? '100%' : '180px' }}>
                        <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                            Marca
                        </label>
                        <Input
                            placeholder="Ej: NIKE, ADIDAS..."
                            value={marcaFiltro}
                            onChange={(val) => {
                                setMarcaFiltro(val);
                                setPage(1);
                            }}
                        />
                    </div>
                </div>
            </Card>

            {/* Tabla de Artículos */}
            <Card style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#f3f4f6' }}>
                        Artículos encontrados: {data?.total?.toLocaleString() || 0}
                    </span>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        Página {page} de {data?.totalPages || 1}
                    </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                                <th style={{ padding: '8px 12px' }}>Código</th>
                                <th style={{ padding: '8px 12px' }}>Descripción</th>
                                <th style={{ padding: '8px 12px' }}>Tipo</th>
                                <th style={{ padding: '8px 12px' }}>Depósito Base</th>
                                <th style={{ padding: '8px 12px' }}>Marca</th>
                                <th style={{ padding: '8px 12px' }}>Talle</th>
                                <th style={{ padding: '8px 12px' }}>UM</th>
                                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>
                                        Cargando catálogo maestro...
                                    </td>
                                </tr>
                            ) : data?.items?.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>
                                        No se encontraron artículos con los filtros aplicados.
                                    </td>
                                </tr>
                            ) : (
                                data?.items?.map((art) => (
                                    <tr
                                        key={art.id}
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            transition: 'background-color 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#60a5fa' }}>
                                            {art.codigo}
                                        </td>
                                        <td style={{ padding: '10px 12px', color: '#f3f4f6' }}>
                                            {art.descripcion}
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <Badge color={art.tipo === 'PA' ? '#10b981' : art.tipo === 'MP' ? '#6366f1' : '#9ca3af'}>
                                                {art.tipo}
                                            </Badge>
                                        </td>
                                        <td style={{ padding: '10px 12px', color: '#9ca3af' }}>
                                            {art.almacenEstandar || '—'}
                                        </td>
                                        <td style={{ padding: '10px 12px', color: '#9ca3af' }}>
                                            {art.marca || '—'}
                                        </td>
                                        <td style={{ padding: '10px 12px', color: '#9ca3af' }}>
                                            {art.talle || '—'}
                                        </td>
                                        <td style={{ padding: '10px 12px', color: '#9ca3af' }}>
                                            {art.unidadMedida || 'UN'}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                            <Btn
                                                small
                                                variant="secondary"
                                                onClick={() => setSelectedArticulo(art)}
                                            >
                                                Ficha
                                            </Btn>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <Btn
                        variant="secondary"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        ← Anterior
                    </Btn>
                    <span style={{ color: '#9ca3af', alignSelf: 'center', fontSize: '13px' }}>
                        Página {page} de {data?.totalPages || 1}
                    </span>
                    <Btn
                        variant="secondary"
                        disabled={!data || page >= data.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Siguiente →
                    </Btn>
                </div>
            </Card>

            {/* Modal de Detalle */}
            {selectedArticulo && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                    }}
                    onClick={() => setSelectedArticulo(null)}
                >
                    <div
                        style={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '12px',
                            maxWidth: '600px',
                            width: '100%',
                            padding: '24px',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', color: '#f9fafb' }}>
                                Ficha Técnica: {selectedArticulo.codigo}
                            </h2>
                            <Btn small variant="secondary" onClick={() => setSelectedArticulo(null)}>✕</Btn>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', marginBottom: '16px' }}>
                            <div>
                                <span style={{ color: '#9ca3af' }}>Descripción:</span>
                                <div style={{ color: '#fff', fontWeight: 600 }}>{selectedArticulo.descripcion}</div>
                            </div>
                            <div>
                                <span style={{ color: '#9ca3af' }}>Tipo de Producto:</span>
                                <div style={{ color: '#fff', fontWeight: 600 }}>{selectedArticulo.tipo}</div>
                            </div>
                            <div>
                                <span style={{ color: '#9ca3af' }}>Almacén Estándar:</span>
                                <div style={{ color: '#fff', fontWeight: 600 }}>{selectedArticulo.almacenEstandar || '—'}</div>
                            </div>
                            <div>
                                <span style={{ color: '#9ca3af' }}>Unidad de Medida:</span>
                                <div style={{ color: '#fff', fontWeight: 600 }}>{selectedArticulo.unidadMedida || 'UN'}</div>
                            </div>
                            <div>
                                <span style={{ color: '#9ca3af' }}>Marca:</span>
                                <div style={{ color: '#fff', fontWeight: 600 }}>{selectedArticulo.marca || '—'}</div>
                            </div>
                            <div>
                                <span style={{ color: '#9ca3af' }}>Talle:</span>
                                <div style={{ color: '#fff', fontWeight: 600 }}>{selectedArticulo.talle || '—'}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <Btn variant="secondary" onClick={() => setSelectedArticulo(null)}>Cerrar</Btn>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
