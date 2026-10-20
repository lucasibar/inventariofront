import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    useGetArticulosQuery,
    useCreateArticuloMutation,
    useUpdateArticuloMutation,
    type Articulo,
} from '../../features/desarrollo/api/articulos.api';
import { PageHeader, Card, Btn, Input, Select, Badge, useIsMobile } from '../../shared/ui';

const ETAPA_COLOR: Record<string, string> = {
    TERMINADO: '#10b981',
    COSTURA: '#3b82f6',
    TEJIDO: '#8b5cf6',
    HILADO: '#f59e0b',
    INSUMO: '#ec4899',
};

const ESTADO_COLOR: Record<string, string> = {
    CHEQUEADO: '#10b981',
    CONTROLAR: '#f59e0b',
    MAL: '#ef4444',
    DESHABILITADO: '#6b7280',
};

export function ArticulosPage() {
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [etapaFiltro, setEtapaFiltro] = useState('CON_ETAPA');
    const [familiaFiltro, setFamiliaFiltro] = useState('');
    const [marcaFiltro, setMarcaFiltro] = useState('');
    const [talleFiltro, setTalleFiltro] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [page, setPage] = useState(1);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingArticulo, setEditingArticulo] = useState<Articulo | null>(null);

    const [form, setForm] = useState<{
        codigo: string;
        descripcion: string;
        etapa: string;
        familia: string;
        tipo: string;
        modelo: string;
        talle: string;
        destino: string;
        variante: string;
        marca: string;
        unidadMedida: string;
        segundaUnidadMedida: string;
        almacenEstandar: string;
        codigoSusi: string;
        estado: string;
        activo: boolean;
    }>({
        codigo: '',
        descripcion: '',
        etapa: 'TERMINADO',
        familia: 'MEDIA',
        tipo: 'PA',
        modelo: '',
        talle: '',
        destino: '',
        variante: '',
        marca: 'NIKE',
        unidadMedida: 'UN',
        segundaUnidadMedida: 'PA',
        almacenEstandar: '01',
        codigoSusi: '',
        estado: 'CONTROLAR',
        activo: true,
    });

    const { data, isLoading } = useGetArticulosQuery({
        search: searchTerm,
        etapa: etapaFiltro === 'CON_ETAPA' || etapaFiltro === '' ? undefined : etapaFiltro,
        soloConEtapa: etapaFiltro === 'CON_ETAPA',
        familia: familiaFiltro || undefined,
        marca: marcaFiltro || undefined,
        talle: talleFiltro || undefined,
        estado: estadoFiltro || undefined,
        page,
        limit: 25,
    });

    const [createArticulo, { isLoading: isCreating }] = useCreateArticuloMutation();
    const [updateArticulo, { isLoading: isUpdating }] = useUpdateArticuloMutation();

    const etapaOptions = [
        { value: 'CON_ETAPA', label: '⭐ Catálogo Activo (Libro1 - 3.657)' },
        { value: '', label: 'Todos (incluye históricos)' },
        { value: 'TERMINADO', label: '🟢 TERMINADO (Producto Final)' },
        { value: 'COSTURA', label: '🔵 COSTURA (_C)' },
        { value: 'TEJIDO', label: '🟣 TEJIDO (Crudo / Base)' },
        { value: 'HILADO', label: '🟠 HILADO (Materia Prima KG)' },
        { value: 'INSUMO', label: '🩷 INSUMO (Packaging / Avíos)' },
        { value: 'LEGACY', label: '⚪ Sin Etapa (Histórico TOTVS)' },
    ];

    const familiaOptions = [
        { value: '', label: 'Todas las familias' },
        { value: 'MEDIA', label: 'MEDIA' },
        { value: ' GORRO', label: 'GORRO' },
        { value: 'MANGAS', label: 'MANGAS' },
        { value: 'VINCHA', label: 'VINCHA' },
        { value: 'CUELLO', label: 'CUELLO' },
        { value: 'GUANTE', label: 'GUANTE' },
        { value: 'HILADO', label: 'HILADO' },
        { value: 'PACKAGING', label: 'PACKAGING' },
        { value: 'ETIQUETA', label: 'ETIQUETA' },
        { value: 'INSUMO', label: 'INSUMO' },
    ];

    const estadoOptions = [
        { value: '', label: 'Todos los estados' },
        { value: 'CHEQUEADO', label: '✅ CHEQUEADO' },
        { value: 'CONTROLAR', label: '🟡 CONTROLAR' },
        { value: 'MAL', label: '🔴 MAL' },
        { value: 'DESHABILITADO', label: '⚫ DESHABILITADO' },
    ];

    const handleOpenNew = () => {
        setEditingArticulo(null);
        setForm({
            codigo: '',
            descripcion: '',
            etapa: 'TERMINADO',
            familia: 'MEDIA',
            tipo: 'PA',
            modelo: '',
            talle: '',
            destino: '',
            variante: '',
            marca: 'NIKE',
            unidadMedida: 'UN',
            segundaUnidadMedida: 'PA',
            almacenEstandar: '01',
            codigoSusi: '',
            estado: 'CONTROLAR',
            activo: true,
        });
        setModalOpen(true);
    };

    const handleOpenEdit = (art: Articulo) => {
        setEditingArticulo(art);
        setForm({
            codigo: art.codigo || '',
            descripcion: art.descripcion || '',
            etapa: art.etapa || 'TERMINADO',
            familia: art.familia || '',
            tipo: art.tipo || 'PA',
            modelo: art.modelo || '',
            talle: art.talle || '',
            destino: art.destino || '',
            variante: art.variante || '',
            marca: art.marca || '',
            unidadMedida: art.unidadMedida || 'UN',
            segundaUnidadMedida: art.segundaUnidadMedida || '',
            almacenEstandar: art.almacenEstandar || '01',
            codigoSusi: art.codigoSusi || '',
            estado: art.estado || 'CONTROLAR',
            activo: art.activo ?? true,
        });
        setModalOpen(true);
    };

    const handleEtapaChangeInModal = (nuevaEtapa: string) => {
        let tipoSugerido = form.tipo;
        let umSugerida = form.unidadMedida;
        if (nuevaEtapa === 'TERMINADO') {
            tipoSugerido = 'PA';
            umSugerida = 'UN';
        } else if (nuevaEtapa === 'COSTURA' || nuevaEtapa === 'TEJIDO') {
            tipoSugerido = 'PI';
            umSugerida = 'UN';
        } else if (nuevaEtapa === 'HILADO') {
            tipoSugerido = 'MP';
            umSugerida = 'KG';
        } else if (nuevaEtapa === 'INSUMO') {
            tipoSugerido = 'MP';
            umSugerida = 'UN';
        }
        setForm({
            ...form,
            etapa: nuevaEtapa,
            tipo: tipoSugerido,
            unidadMedida: umSugerida,
        });
    };

    const handleSave = async () => {
        if (!form.codigo.trim() || !form.descripcion.trim()) {
            alert('Código y Descripción son obligatorios');
            return;
        }
        try {
            if (editingArticulo) {
                await updateArticulo({
                    id: editingArticulo.id,
                    data: form,
                }).unwrap();
            } else {
                await createArticulo(form).unwrap();
            }
            setModalOpen(false);
        } catch (err: any) {
            alert(err?.data?.message || 'Error al guardar el artículo');
        }
    };

    return (
        <div style={{ padding: isMobile ? '12px' : '20px', maxWidth: '1500px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <PageHeader
                    title="📋 Catálogo Maestro de Artículos"
                    subtitle="Gestión completa (CRUD) de Productos Terminados, Costura, Tejido, Hilados e Insumos"
                />
                <Btn variant="primary" onClick={handleOpenNew}>
                    + Nuevo Artículo
                </Btn>
            </div>

            {/* Filtros */}
            <Card style={{ marginBottom: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 240px' }}>
                        <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                            Buscar por Código, Descripción o Modelo
                        </label>
                        <Input
                            placeholder="Ej: JV7402, SX4700, A161NEGRO, TT_25MM..."
                            value={searchTerm}
                            onChange={(val) => {
                                setSearchTerm(val);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div style={{ width: isMobile ? '100%' : '250px' }}>
                        <Select
                            label="Etapa del Proceso"
                            value={etapaFiltro}
                            options={etapaOptions}
                            onChange={(val) => {
                                setEtapaFiltro(val);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div style={{ width: isMobile ? '100%' : '160px' }}>
                        <Select
                            label="Familia"
                            value={familiaFiltro}
                            options={familiaOptions}
                            onChange={(val) => {
                                setFamiliaFiltro(val);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div style={{ width: isMobile ? '100%' : '150px' }}>
                        <Select
                            label="Estado Control"
                            value={estadoFiltro}
                            options={estadoOptions}
                            onChange={(val) => {
                                setEstadoFiltro(val);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div style={{ width: isMobile ? '100%' : '120px' }}>
                        <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                            Marca
                        </label>
                        <Input
                            placeholder="NIKE..."
                            value={marcaFiltro}
                            onChange={(val) => {
                                setMarcaFiltro(val);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div style={{ width: isMobile ? '100%' : '90px' }}>
                        <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                            Talle
                        </label>
                        <Input
                            placeholder="S, M, L..."
                            value={talleFiltro}
                            onChange={(val) => {
                                setTalleFiltro(val);
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
                                <th style={{ padding: '8px 10px' }}>Código</th>
                                <th style={{ padding: '8px 10px' }}>Descripción</th>
                                <th style={{ padding: '8px 10px' }}>Etapa</th>
                                <th style={{ padding: '8px 10px' }}>Familia</th>
                                <th style={{ padding: '8px 10px' }}>Modelo / Talle</th>
                                <th style={{ padding: '8px 10px' }}>Destino / Var</th>
                                <th style={{ padding: '8px 10px' }}>UM</th>
                                <th style={{ padding: '8px 10px' }}>Estado</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>
                                        Cargando catálogo maestro...
                                    </td>
                                </tr>
                            ) : data?.items?.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>
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
                                        <td style={{ padding: '10px', fontWeight: 700, color: '#60a5fa' }}>
                                            <div>{art.codigo}</div>
                                            {art.codigoSusi && (
                                                <div style={{ fontSize: '10px', color: '#9ca3af' }}>Susi: {art.codigoSusi}</div>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px', color: '#f3f4f6', maxWidth: '340px' }}>
                                            <div>{art.descripcion}</div>
                                            {art.detalleRevision && (
                                                <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '2px' }}>
                                                    ⚠️ {art.detalleRevision}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            {art.etapa ? (
                                                <Badge color={ETAPA_COLOR[art.etapa] || '#6b7280'}>
                                                    {art.etapa}
                                                </Badge>
                                            ) : (
                                                <Badge color="#4b5563">{art.tipo} (Legacy)</Badge>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px', color: '#d1d5db' }}>
                                            {art.familia || '—'}
                                        </td>
                                        <td style={{ padding: '10px', color: '#9ca3af' }}>
                                            {art.modelo ? <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{art.modelo}</span> : '—'}
                                            {art.talle ? ` (${art.talle})` : ''}
                                        </td>
                                        <td style={{ padding: '10px', color: '#9ca3af' }}>
                                            {[art.destino, art.variante].filter(Boolean).join(' / ') || '—'}
                                        </td>
                                        <td style={{ padding: '10px', color: '#9ca3af' }}>
                                            {art.unidadMedida || 'UN'}
                                            {art.segundaUnidadMedida ? ` / ${art.segundaUnidadMedida}` : ''}
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <Badge color={ESTADO_COLOR[art.estado || 'CONTROLAR'] || '#6b7280'}>
                                                {art.estado || 'CONTROLAR'}
                                            </Badge>
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                {(art.etapa === 'TERMINADO' || art.etapa === 'COSTURA' || art.etapa === 'TEJIDO' || art.tipo === 'PA' || art.tipo === 'PI') && (
                                                    <>
                                                        <Btn
                                                            small
                                                            variant="secondary"
                                                            onClick={() => navigate(`/desarrollo/estructuras?codigo=${encodeURIComponent(art.codigo)}`)}
                                                        >
                                                            🧬 Estructura
                                                        </Btn>
                                                        <Btn
                                                            small
                                                            variant="secondary"
                                                            onClick={() => navigate(`/desarrollo/estructuras?codigo=${encodeURIComponent(art.codigo)}&tab=SIMULADOR`)}
                                                        >
                                                            🧮 Simular
                                                        </Btn>
                                                    </>
                                                )}
                                                <Btn
                                                    small
                                                    variant="secondary"
                                                    onClick={() => handleOpenEdit(art)}
                                                >
                                                    ✏️ Editar
                                                </Btn>
                                            </div>
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

            {/* Modal Crear / Editar Artículo */}
            {modalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                    }}
                    onClick={() => setModalOpen(false)}
                >
                    <div
                        style={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '12px',
                            maxWidth: '720px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            padding: '24px',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', color: '#f9fafb' }}>
                                {editingArticulo ? `✏️ Editar Artículo: ${editingArticulo.codigo}` : '➕ Nuevo Artículo'}
                            </h2>
                            <Btn small variant="secondary" onClick={() => setModalOpen(false)}>✕</Btn>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                    Código *
                                </label>
                                <Input
                                    value={form.codigo}
                                    onChange={(val) => setForm({ ...form, codigo: val.toUpperCase() })}
                                    placeholder="Ej: JV7402_S_UK"
                                />
                            </div>
                            <div>
                                <Select
                                    label="Etapa del Proceso *"
                                    value={form.etapa}
                                    options={[
                                        { value: 'TERMINADO', label: 'TERMINADO (Producto Final)' },
                                        { value: 'COSTURA', label: 'COSTURA (Intermedio _C)' },
                                        { value: 'TEJIDO', label: 'TEJIDO (Crudo / Base)' },
                                        { value: 'HILADO', label: 'HILADO (Materia Prima KG)' },
                                        { value: 'INSUMO', label: 'INSUMO (Packaging / Avío)' },
                                    ]}
                                    onChange={handleEtapaChangeInModal}
                                />
                            </div>

                            <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                    Descripción *
                                </label>
                                <Input
                                    value={form.descripcion}
                                    onChange={(val) => setForm({ ...form, descripcion: val })}
                                    placeholder="Descripción completa del artículo..."
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                    Familia
                                </label>
                                <Input
                                    value={form.familia}
                                    onChange={(val) => setForm({ ...form, familia: val.toUpperCase() })}
                                    placeholder="MEDIA, GORRO, HILADO, PACKAGING..."
                                />
                            </div>
                            <div>
                                <Select
                                    label="Estado de Revisión"
                                    value={form.estado}
                                    options={[
                                        { value: 'CHEQUEADO', label: '✅ CHEQUEADO' },
                                        { value: 'CONTROLAR', label: '🟡 CONTROLAR' },
                                        { value: 'MAL', label: '🔴 MAL' },
                                        { value: 'DESHABILITADO', label: '⚫ DESHABILITADO' },
                                    ]}
                                    onChange={(val) => setForm({ ...form, estado: val })}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                    Modelo (Raíz)
                                </label>
                                <Input
                                    value={form.modelo}
                                    onChange={(val) => setForm({ ...form, modelo: val.toUpperCase() })}
                                    placeholder="Ej: JV7402"
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                    Talle
                                </label>
                                <Input
                                    value={form.talle}
                                    onChange={(val) => setForm({ ...form, talle: val.toUpperCase() })}
                                    placeholder="Ej: S, M, L, XL, U"
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                    Destino (Mercado)
                                </label>
                                <Input
                                    value={form.destino}
                                    onChange={(val) => setForm({ ...form, destino: val.toUpperCase() })}
                                    placeholder="Ej: AR, BR, UK, US"
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                    Variante / Color
                                </label>
                                <Input
                                    value={form.variante}
                                    onChange={(val) => setForm({ ...form, variante: val.toUpperCase() })}
                                    placeholder="Ej: B, N, G, L"
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                    Marca
                                </label>
                                <Input
                                    value={form.marca}
                                    onChange={(val) => setForm({ ...form, marca: val.toUpperCase() })}
                                    placeholder="NIKE, JORDAN..."
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                    Código Susi
                                </label>
                                <Input
                                    value={form.codigoSusi}
                                    onChange={(val) => setForm({ ...form, codigoSusi: val })}
                                    placeholder="Código interno Susi (opcional)"
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                    Unidad Medida 1
                                </label>
                                <Input
                                    value={form.unidadMedida}
                                    onChange={(val) => setForm({ ...form, unidadMedida: val.toUpperCase() })}
                                    placeholder="UN, KG, MT..."
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                    Unidad Medida 2 (TOTVS)
                                </label>
                                <Input
                                    value={form.segundaUnidadMedida}
                                    onChange={(val) => setForm({ ...form, segundaUnidadMedida: val.toUpperCase() })}
                                    placeholder="PA, P3, P6, UN..."
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #374151' }}>
                            <div>
                                {editingArticulo && (
                                    <Btn
                                        variant="secondary"
                                        onClick={() => {
                                            setModalOpen(false);
                                            navigate(`/desarrollo/estructuras?codigo=${encodeURIComponent(editingArticulo.codigo)}`);
                                        }}
                                    >
                                        🧬 Ver / Editar Estructura (BOM)
                                    </Btn>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Btn variant="secondary" onClick={() => setModalOpen(false)}>
                                    Cancelar
                                </Btn>
                                <Btn variant="primary" onClick={handleSave} disabled={isCreating || isUpdating}>
                                    {isCreating || isUpdating ? 'Guardando...' : '💾 Guardar Artículo'}
                                </Btn>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
