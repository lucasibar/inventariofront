import { useState } from 'react';
import {
    useGetArticulosQuery,
    useCreateArticuloMutation,
    useUpdateArticuloMutation,
    useGetArticuloEstructurasQuery,
    useUpsertLineaEstructuraMutation,
    useEliminarLineaEstructuraMutation,
    useGetArticuloMachineTypesQuery,
    useUpdateArticuloMachineTypeMutation,
    useDeleteArticuloMachineTypeMutation,
    useGetCatalogoMaquinasQuery,
    useGetArticuloEquivalenciasQuery,
    useAsociarItemMutation,
    useDesasociarItemMutation,
    useBuscarItemsParaVincularQuery,
    type Articulo,
} from '../../features/desarrollo/api/articulos.api';
import { useGetArticulosSinEstructuraQuery } from '../../features/ventas/api/ventas.api';
import { PageHeader, Card, Btn, Input, Select, Badge, Spinner, useIsMobile } from '../../shared/ui';

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

type ModalTab = 'DATOS' | 'ESTRUCTURA' | 'MAQUINAS' | 'EQUIVALENCIAS';

export function ArticulosPage() {
    const isMobile = useIsMobile();
    const { data: pedidosSinEstructura = [] } = useGetArticulosSinEstructuraQuery();

    // Filtros de navegación
    const [searchTerm, setSearchTerm] = useState('');
    const [etapaFiltro, setEtapaFiltro] = useState<string>('CON_ETAPA');
    const [familiaFiltro, setFamiliaFiltro] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [page, setPage] = useState(1);

    // Modal Unificado
    const [modalOpen, setModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<ModalTab>('DATOS');
    const [editingArticulo, setEditingArticulo] = useState<Articulo | null>(null);

    // Formulario de datos generales
    const [form, setForm] = useState<{
        codigo: string;
        descripcion: string;
        etapa: string;
        familia: string;
        modelo: string;
        talle: string;
        destino: string;
        variante: string;
        marca: string;
        unidadMedida: string;
        pesoU: number | null;
        codigoSusi: string;
        estado: string;
        activo: boolean;
    }>({
        codigo: '',
        descripcion: '',
        etapa: 'TERMINADO',
        familia: 'MEDIA',
        modelo: '',
        talle: '',
        destino: '',
        variante: '',
        marca: 'NIKE',
        unidadMedida: 'UN',
        pesoU: null,
        codigoSusi: '',
        estado: 'CONTROLAR',
        activo: true,
    });

    // Formulario para agregar componente a la estructura
    const [nuevoCompCodigo, setNuevoCompCodigo] = useState('');
    const [nuevoCompCantidad, setNuevoCompCantidad] = useState<number>(1);
    const [nuevoCompObs, setNuevoCompObs] = useState('');

    // Formulario para asignar máquina
    const [nuevaMaquinaId, setNuevaMaquinaId] = useState('');
    const [nuevoCycleTime, setNuevoCycleTime] = useState<string>('');
    const [nuevaPreferida, setNuevaPreferida] = useState(false);

    // Formulario para vincular ítem de inventario (equivalencia)
    const [nuevoItemId, setNuevoItemId] = useState('');
    const [nuevoItemPrioridad, setNuevoItemPrioridad] = useState<number>(1);
    const [nuevoItemFactor, setNuevoItemFactor] = useState<number>(1.0);
    const [itemSearchTerm, setItemSearchTerm] = useState('');

    // Consultas RTK
    const { data, isLoading } = useGetArticulosQuery({
        search: searchTerm,
        etapa: etapaFiltro === 'CON_ETAPA' || etapaFiltro === 'INACTIVOS' || etapaFiltro === '' ? undefined : etapaFiltro,
        soloConEtapa: etapaFiltro === 'CON_ETAPA',
        activo: etapaFiltro === 'INACTIVOS' ? false : undefined,
        familia: familiaFiltro || undefined,
        estado: estadoFiltro || undefined,
        page,
        limit: 25,
    });

    const [createArticulo, { isLoading: isCreating }] = useCreateArticuloMutation();
    const [updateArticulo, { isLoading: isUpdating }] = useUpdateArticuloMutation();

    // Hooks para Estructura del artículo seleccionado
    const { data: estructuras = [], isFetching: loadingEstructuras, refetch: refetchEstructuras } = useGetArticuloEstructurasQuery(
        editingArticulo?.codigo || '',
        { skip: !editingArticulo?.codigo || (activeTab !== 'ESTRUCTURA' && !modalOpen) }
    );
    const [upsertLineaEstructura, { isLoading: isSavingLinea }] = useUpsertLineaEstructuraMutation();
    const [eliminarLineaEstructura, { isLoading: isDeletingLinea }] = useEliminarLineaEstructuraMutation();

    // Hooks para Máquinas del artículo seleccionado
    const { data: asignacionesMaquina = [], isFetching: loadingMaquinas, refetch: refetchMaquinas } = useGetArticuloMachineTypesQuery(
        editingArticulo?.id || '',
        { skip: !editingArticulo?.id || (activeTab !== 'MAQUINAS' && !modalOpen) }
    );
    const { data: catalogoMaquinas = [] } = useGetCatalogoMaquinasQuery(undefined, {
        skip: !modalOpen,
    });
    const [updateArticuloMachineType, { isLoading: isSavingMaquina }] = useUpdateArticuloMachineTypeMutation();
    const [deleteArticuloMachineType, { isLoading: isDeletingMaquina }] = useDeleteArticuloMachineTypeMutation();

    // Hooks para Equivalencias del artículo seleccionado
    const { data: equivalencias = [], isFetching: loadingEquivalencias, refetch: refetchEquivalencias } = useGetArticuloEquivalenciasQuery(
        editingArticulo?.id || '',
        { skip: !editingArticulo?.id || (activeTab !== 'EQUIVALENCIAS' && !modalOpen) }
    );
    const { data: itemsDisponibles = [] } = useBuscarItemsParaVincularQuery(
        { q: itemSearchTerm || undefined },
        { skip: !modalOpen || activeTab !== 'EQUIVALENCIAS' }
    );
    const [asociarItem, { isLoading: isSavingItem }] = useAsociarItemMutation();
    const [desasociarItem, { isLoading: isDeletingItem }] = useDesasociarItemMutation();

    const handleOpenNew = () => {
        setEditingArticulo(null);
        setForm({
            codigo: '',
            descripcion: '',
            etapa: 'TERMINADO',
            familia: 'MEDIA',
            modelo: '',
            talle: '',
            destino: '',
            variante: '',
            marca: 'NIKE',
            unidadMedida: 'UN',
            pesoU: null,
            codigoSusi: '',
            estado: 'CONTROLAR',
            activo: true,
        });
        setActiveTab('DATOS');
        setModalOpen(true);
    };

    const handleOpenEdit = (art: Articulo, tab: ModalTab = 'DATOS') => {
        setEditingArticulo(art);
        setForm({
            codigo: art.codigo || '',
            descripcion: art.descripcion || '',
            etapa: art.etapa || 'TERMINADO',
            familia: art.familia || '',
            modelo: art.modelo || '',
            talle: art.talle || '',
            destino: art.destino || '',
            variante: art.variante || '',
            marca: art.marca || '',
            unidadMedida: art.unidadMedida || 'UN',
            pesoU: art.pesoU ?? null,
            codigoSusi: art.codigoSusi || '',
            estado: art.estado || 'CONTROLAR',
            activo: art.activo ?? true,
        });
        setActiveTab(tab);
        setModalOpen(true);
    };

    const handleSaveDatos = async () => {
        if (!form.codigo.trim() || !form.descripcion.trim()) {
            alert('Código y Descripción son obligatorios');
            return;
        }
        const payload: Partial<Articulo> = {
            ...form,
            pesoU: form.pesoU ?? undefined,
        };
        try {
            if (editingArticulo) {
                await updateArticulo({
                    id: editingArticulo.id,
                    data: payload,
                }).unwrap();
            } else {
                const created = await createArticulo(payload).unwrap();
                setEditingArticulo(created);
            }
            alert('Datos del artículo guardados correctamente');
        } catch (err: any) {
            alert(err?.data?.message || 'Error al guardar el artículo');
        }
    };

    const handleToggleActivo = async () => {
        if (!editingArticulo) return;
        const nuevoActivo = !form.activo;
        const confirmMsg = nuevoActivo
            ? '¿Deseas reactivar este artículo?'
            : '¿Deseas desactivar este artículo? (No se borrarán sus registros históricos, sólo dejará de ofrecerse en producción)';
        if (!window.confirm(confirmMsg)) return;

        try {
            await updateArticulo({
                id: editingArticulo.id,
                data: {
                    activo: nuevoActivo,
                    estado: nuevoActivo ? 'CONTROLAR' : 'DESHABILITADO',
                },
            }).unwrap();
            setForm((f) => ({
                ...f,
                activo: nuevoActivo,
                estado: nuevoActivo ? 'CONTROLAR' : 'DESHABILITADO',
            }));
            alert(nuevoActivo ? 'Artículo reactivado' : 'Artículo desactivado');
        } catch (err: any) {
            alert(err?.data?.message || 'Error al cambiar estado activo del artículo');
        }
    };

    // Agregar línea a la estructura
    const handleAddEstructura = async () => {
        if (!editingArticulo || !nuevoCompCodigo.trim()) {
            alert('Ingresa el código del componente hijo');
            return;
        }
        if (!nuevoCompCantidad || nuevoCompCantidad <= 0) {
            alert('La cantidad consumida debe ser mayor a 0');
            return;
        }
        try {
            await upsertLineaEstructura({
                codigoPadre: editingArticulo.codigo,
                codigoComponente: nuevoCompCodigo.trim().toUpperCase(),
                cantidad: Number(nuevoCompCantidad),
                observacion: nuevoCompObs || undefined,
            }).unwrap();
            setNuevoCompCodigo('');
            setNuevoCompCantidad(1);
            setNuevoCompObs('');
            refetchEstructuras();
        } catch (err: any) {
            alert(err?.data?.message || 'Error al agregar componente a la estructura');
        }
    };

    const handleDeleteEstructura = async (lineaId: string) => {
        if (!window.confirm('¿Seguro que deseas eliminar este componente de la estructura?')) return;
        try {
            await eliminarLineaEstructura(lineaId).unwrap();
            refetchEstructuras();
        } catch (err: any) {
            alert(err?.data?.message || 'Error al eliminar componente');
        }
    };

    // Asignar tipo de máquina
    const handleAddMaquina = async () => {
        if (!editingArticulo || !nuevaMaquinaId) {
            alert('Selecciona un tipo de máquina del catálogo');
            return;
        }
        try {
            const cycleSeconds = nuevoCycleTime.trim() !== '' ? Number(nuevoCycleTime) : null;
            await updateArticuloMachineType({
                articuloId: editingArticulo.id,
                machineTypeId: nuevaMaquinaId,
                cycleTimeSeconds: cycleSeconds as any,
                preferida: nuevaPreferida,
            }).unwrap();
            setNuevaMaquinaId('');
            setNuevoCycleTime('');
            setNuevaPreferida(false);
            refetchMaquinas();
        } catch (err: any) {
            alert(err?.data?.message || 'Error al asignar máquina');
        }
    };

    const handleDeleteMaquina = async (machineTypeId: string) => {
        if (!editingArticulo) return;
        if (!window.confirm('¿Deseas desasignar este tipo de máquina?')) return;
        try {
            await deleteArticuloMachineType({
                articuloId: editingArticulo.id,
                machineTypeId,
            }).unwrap();
            refetchMaquinas();
        } catch (err: any) {
            alert(err?.data?.message || 'Error al desasignar tipo de máquina');
        }
    };

    // Vincular ítem de inventario (equivalencia)
    const handleAddItem = async () => {
        if (!editingArticulo || !nuevoItemId) {
            alert('Selecciona un ítem de inventario');
            return;
        }
        try {
            await asociarItem({
                articuloId: editingArticulo.id,
                itemId: nuevoItemId,
                ordenPrioridad: Number(nuevoItemPrioridad) || 1,
                factorConversion: Number(nuevoItemFactor) || 1.0,
            }).unwrap();
            setNuevoItemId('');
            refetchEquivalencias();
        } catch (err: any) {
            alert(err?.data?.message || 'Error al vincular ítem de inventario');
        }
    };

    const handleDeleteItem = async (equivalenciaId: string) => {
        if (!window.confirm('¿Deseas desvincular este ítem de inventario?')) return;
        try {
            await desasociarItem(equivalenciaId).unwrap();
            refetchEquivalencias();
        } catch (err: any) {
            alert(err?.data?.message || 'Error al desvincular ítem');
        }
    };

    return (
        <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '1600px', margin: '0 auto' }}>
            {/* Encabezado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
                <PageHeader
                    title="📋 Catálogo Maestro y Edición Integral de Artículos"
                    subtitle="Gestión unificada a 2 clics: Ficha Técnica, Estructuras BOM, Máquinas Permitidas, Tiempos de Ciclo y Match Depósito / SUSI"
                />
                <Btn variant="primary" onClick={handleOpenNew}>
                    ➕ Nuevo Artículo
                </Btn>
            </div>

            {/* Alerta de pedidos de venta sin estructura */}
            {pedidosSinEstructura.length > 0 && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    marginBottom: '18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: '#fca5a5',
                    flexWrap: 'wrap',
                    gap: '12px',
                }}>
                    <div>
                        <strong style={{ fontSize: '14px' }}>⚠️ Alerta de Ventas:</strong> Hay <strong>{pedidosSinEstructura.length}</strong> artículo(s) ingresados en pedidos de venta sin estructura técnica (BOM).
                        <span style={{ fontSize: '12px', display: 'block', color: '#f87171', marginTop: '4px' }}>
                            Artículos requeridos: {pedidosSinEstructura.map(p => p.articuloCodigo).slice(0, 4).join(', ')}{pedidosSinEstructura.length > 4 ? ` (+${pedidosSinEstructura.length - 4} más)` : ''}
                        </span>
                    </div>
                    <Btn variant="danger" size="small" onClick={() => {
                        if (pedidosSinEstructura[0]) {
                            setSearchTerm(pedidosSinEstructura[0].articuloCodigo.split('_')[0]);
                        }
                    }}>
                        🔍 Buscar en Catálogo
                    </Btn>
                </div>
            )}

            {/* Pestañas de Etapas y Filtros Rápidos */}
            <Card style={{ marginBottom: '18px', padding: '16px' }}>
                {/* Selector rápido de Etapa / Proceso */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {[
                        { key: 'CON_ETAPA', label: '⭐ Catálogo Activo', color: '#818cf8' },
                        { key: 'TERMINADO', label: '🟢 Terminados', color: '#10b981' },
                        { key: 'COSTURA', label: '🔵 Costura (_C)', color: '#3b82f6' },
                        { key: 'TEJIDO', label: '🟣 Tejidos (Crudo)', color: '#8b5cf6' },
                        { key: 'HILADO', label: '🟠 Hilados (Materia Prima)', color: '#f59e0b' },
                        { key: 'INSUMO', label: '🩷 Insumos (Avíos/Pack)', color: '#ec4899' },
                        { key: 'INACTIVOS', label: '⚫ Desactivados', color: '#6b7280' },
                        { key: '', label: 'Todos (Histórico TOTVS)', color: '#9ca3af' },
                    ].map((tab) => {
                        const isSelected = etapaFiltro === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setEtapaFiltro(tab.key);
                                    setPage(1);
                                }}
                                style={{
                                    padding: '7px 14px',
                                    borderRadius: '8px',
                                    border: isSelected ? `2px solid ${tab.color}` : '1px solid rgba(255,255,255,0.1)',
                                    background: isSelected ? `${tab.color}22` : 'rgba(255,255,255,0.03)',
                                    color: isSelected ? tab.color : '#9ca3af',
                                    fontWeight: isSelected ? 800 : 500,
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Filtros de búsqueda */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 280px' }}>
                        <label style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                            Buscar por Código, Descripción, Modelo o Código SUSI
                        </label>
                        <Input
                            placeholder="Ej: JV7402, A161BLANCO, SX4700..."
                            value={searchTerm}
                            onChange={(val) => {
                                setSearchTerm(val);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div style={{ width: isMobile ? '100%' : '180px' }}>
                        <label style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                            Familia
                        </label>
                        <Input
                            placeholder="MEDIA, GORRO..."
                            value={familiaFiltro}
                            onChange={(val) => {
                                setFamiliaFiltro(val);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div style={{ width: isMobile ? '100%' : '180px' }}>
                        <Select
                            label="Estado de Control"
                            value={estadoFiltro}
                            options={[
                                { value: '', label: 'Todos los estados' },
                                { value: 'CHEQUEADO', label: '✅ CHEQUEADO' },
                                { value: 'CONTROLAR', label: '🟡 CONTROLAR' },
                                { value: 'MAL', label: '🔴 MAL' },
                                { value: 'DESHABILITADO', label: '⚫ DESHABILITADO' },
                            ]}
                            onChange={(val) => {
                                setEstadoFiltro(val);
                                setPage(1);
                            }}
                        />
                    </div>
                </div>
            </Card>

            {/* TABLA PRINCIPAL DE ARTÍCULOS */}
            <Card style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#f3f4f6' }}>
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
                                <th style={{ padding: '10px' }}>Código TOTVS</th>
                                <th style={{ padding: '10px' }}>Descripción</th>
                                <th style={{ padding: '10px' }}>Etapa</th>
                                <th style={{ padding: '10px' }}>Match SUSI</th>
                                <th style={{ padding: '10px' }}>Modelo / Talle</th>
                                <th style={{ padding: '10px' }}>UM</th>
                                <th style={{ padding: '10px' }}>Estado</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Acciones Rápidas (1 Clic)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af' }}>
                                        <Spinner /> <span style={{ marginLeft: '10px' }}>Cargando catálogo...</span>
                                    </td>
                                </tr>
                            ) : data?.items?.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af' }}>
                                        No se encontraron artículos para los filtros aplicados.
                                    </td>
                                </tr>
                            ) : (
                                data?.items?.map((art) => (
                                    <tr
                                        key={art.id}
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            transition: 'background-color 0.15s ease',
                                            cursor: 'pointer',
                                            opacity: art.activo === false ? 0.6 : 1,
                                        }}
                                        onClick={() => handleOpenEdit(art, 'DATOS')}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                        <td style={{ padding: '10px', fontWeight: 700, color: '#60a5fa' }}>
                                            <div>{art.codigo}</div>
                                            {art.activo === false && (
                                                <Badge color="#6b7280">Inactivo</Badge>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px', color: '#f3f4f6', maxWidth: '340px' }}>
                                            <div style={{ fontWeight: 600 }}>{art.descripcion}</div>
                                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                                {[art.marca, art.familia].filter(Boolean).join(' • ')}
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <Badge color={ETAPA_COLOR[art.etapa || ''] || '#6b7280'}>
                                                {art.etapa || 'SIN ETAPA'}
                                            </Badge>
                                        </td>
                                        <td style={{ padding: '10px', color: art.codigoSusi ? '#c4b5fd' : '#6b7280' }}>
                                            {art.codigoSusi ? (
                                                <span style={{ fontWeight: 600 }}>🏷️ {art.codigoSusi}</span>
                                            ) : (
                                                <span style={{ fontSize: '11px', fontStyle: 'italic' }}>Sin match</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px', color: '#9ca3af' }}>
                                            {art.modelo ? <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{art.modelo}</span> : '—'}
                                            {art.talle ? ` (${art.talle})` : ''}
                                        </td>
                                        <td style={{ padding: '10px', color: '#9ca3af' }}>
                                            {art.unidadMedida || 'UN'}
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <Badge color={ESTADO_COLOR[art.estado || 'CONTROLAR'] || '#6b7280'}>
                                                {art.estado || 'CONTROLAR'}
                                            </Badge>
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                {(art.etapa === 'TERMINADO' || art.etapa === 'COSTURA' || art.etapa === 'TEJIDO') && (
                                                    <Btn
                                                        small
                                                        variant="secondary"
                                                        onClick={() => handleOpenEdit(art, 'ESTRUCTURA')}
                                                        title="Ver / Editar componentes"
                                                    >
                                                        🧬 BOM
                                                    </Btn>
                                                )}

                                                {(art.etapa === 'TEJIDO' || art.etapa === 'COSTURA' || art.etapa === 'TERMINADO') && (
                                                    <Btn
                                                        small
                                                        variant="secondary"
                                                        onClick={() => handleOpenEdit(art, 'MAQUINAS')}
                                                        title="Ver / Asignar máquinas y tiempos"
                                                    >
                                                        ⚙️ Máquinas
                                                    </Btn>
                                                )}

                                                {(art.etapa === 'HILADO' || art.etapa === 'INSUMO') && (
                                                    <Btn
                                                        small
                                                        variant="secondary"
                                                        onClick={() => handleOpenEdit(art, 'EQUIVALENCIAS')}
                                                        title="Ver / Vincular ítems de depósito"
                                                    >
                                                        🔗 Match Depo
                                                    </Btn>
                                                )}

                                                <Btn
                                                    small
                                                    variant="secondary"
                                                    onClick={() => handleOpenEdit(art, 'DATOS')}
                                                >
                                                    ✏️ Ver / Editar
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

            {/* MODAL INTEGRAL / UNIFICADO (A 1 CLIC) */}
            {modalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)',
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
                            borderRadius: '14px',
                            maxWidth: '960px',
                            width: '100%',
                            maxHeight: '92vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
                            overflow: 'hidden',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Cabecera del modal */}
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111827' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', color: '#f9fafb', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {editingArticulo ? (
                                        <>
                                            <span>✏️ {editingArticulo.codigo}</span>
                                            <Badge color={ETAPA_COLOR[editingArticulo.etapa || ''] || '#6b7280'}>
                                                {editingArticulo.etapa || 'SIN ETAPA'}
                                            </Badge>
                                            {form.activo === false && <Badge color="#ef4444">DESACTIVADO</Badge>}
                                        </>
                                    ) : (
                                        '➕ Nuevo Artículo'
                                    )}
                                </h2>
                                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>
                                    {editingArticulo?.descripcion || 'Completá los datos para registrar un nuevo artículo maestro'}
                                </div>
                            </div>
                            <Btn small variant="secondary" onClick={() => setModalOpen(false)}>✕</Btn>
                        </div>

                        {/* Pestañas del Modal */}
                        {editingArticulo && (
                            <div style={{ display: 'flex', borderBottom: '1px solid #374151', background: 'rgba(0,0,0,0.2)', padding: '0 16px' }}>
                                {[
                                    { key: 'DATOS', label: '📋 Ficha Técnica', icon: '📝' },
                                    { key: 'ESTRUCTURA', label: `🧬 Estructura BOM (${estructuras.length})`, icon: '🌳' },
                                    { key: 'MAQUINAS', label: `⚙️ Máquinas y Tiempos (${asignacionesMaquina.length})`, icon: '⏱️' },
                                    { key: 'EQUIVALENCIAS', label: `🔗 Match Depósito (${equivalencias.length})`, icon: '📦' },
                                ].map((tab) => {
                                    const isSelected = activeTab === tab.key;
                                    return (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key as ModalTab)}
                                            style={{
                                                padding: '12px 18px',
                                                border: 'none',
                                                borderBottom: isSelected ? '3px solid #60a5fa' : '3px solid transparent',
                                                background: 'transparent',
                                                color: isSelected ? '#60a5fa' : '#9ca3af',
                                                fontWeight: isSelected ? 800 : 500,
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Cuerpo del Modal */}
                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                            {/* TAB 1: DATOS GENERALES */}
                            {activeTab === 'DATOS' && (
                                <div>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                Código Artículo *
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
                                                    { value: 'TERMINADO', label: '🟢 TERMINADO (Producto Final)' },
                                                    { value: 'COSTURA', label: '🔵 COSTURA (_C)' },
                                                    { value: 'TEJIDO', label: '🟣 TEJIDO (Crudo / Base)' },
                                                    { value: 'HILADO', label: '🟠 HILADO (Materia Prima KG)' },
                                                    { value: 'INSUMO', label: '🩷 INSUMO (Packaging / Avío)' },
                                                ]}
                                                onChange={(val) => {
                                                    const um = val === 'HILADO' ? 'KG' : 'UN';
                                                    setForm({ ...form, etapa: val, unidadMedida: um });
                                                }}
                                            />
                                        </div>

                                        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                                            <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                Descripción Completa *
                                            </label>
                                            <Input
                                                value={form.descripcion}
                                                onChange={(val) => setForm({ ...form, descripcion: val })}
                                                placeholder="Descripción detallada del artículo..."
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '12px', color: '#c4b5fd', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                                🏷️ Match Código SUSI (Tejeduría)
                                            </label>
                                            <Input
                                                value={form.codigoSusi}
                                                onChange={(val) => setForm({ ...form, codigoSusi: val })}
                                                placeholder="Código con el que viene en el PDF de Susana..."
                                            />
                                            <span style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', display: 'block' }}>
                                                Permite que el analizador de PDFs de producción reconozca este artículo automáticamente.
                                            </span>
                                        </div>

                                        <div>
                                            <Select
                                                label="Estado de Control"
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
                                                Familia Técnica
                                            </label>
                                            <Input
                                                value={form.familia}
                                                onChange={(val) => setForm({ ...form, familia: val.toUpperCase() })}
                                                placeholder="MEDIA, GORRO, HILADO, PACKAGING..."
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
                                                placeholder="S, M, L, XL, U..."
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                Variante / Color
                                            </label>
                                            <Input
                                                value={form.variante}
                                                onChange={(val) => setForm({ ...form, variante: val.toUpperCase() })}
                                                placeholder="B, N, G, L..."
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                Marca Comercial
                                            </label>
                                            <Input
                                                value={form.marca}
                                                onChange={(val) => setForm({ ...form, marca: val.toUpperCase() })}
                                                placeholder="NIKE, ADIDAS, JORDAN..."
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                Unidad de Medida
                                            </label>
                                            <Input
                                                value={form.unidadMedida}
                                                onChange={(val) => setForm({ ...form, unidadMedida: val.toUpperCase() })}
                                                placeholder="UN, KG, DOC, PAR..."
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                Peso Unitario (kg)
                                            </label>
                                            <Input
                                                type="number"
                                                value={form.pesoU !== null ? String(form.pesoU) : ''}
                                                onChange={(val) => setForm({ ...form, pesoU: val ? Number(val) : null })}
                                                placeholder="Ej: 0.0450"
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                Destino (Mercado)
                                            </label>
                                            <Input
                                                value={form.destino}
                                                onChange={(val) => setForm({ ...form, destino: val.toUpperCase() })}
                                                placeholder="AR, BR, UK, US..."
                                            />
                                        </div>
                                    </div>

                                    {/* Botones de acción de Ficha Técnica */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #374151' }}>
                                        <div>
                                            {editingArticulo && (
                                                <button
                                                    onClick={handleToggleActivo}
                                                    style={{
                                                        padding: '8px 14px',
                                                        borderRadius: '8px',
                                                        border: form.activo ? '1px solid #ef4444' : '1px solid #10b981',
                                                        background: form.activo ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                        color: form.activo ? '#ef4444' : '#10b981',
                                                        fontWeight: 700,
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {form.activo ? '🚫 Desactivar Artículo (Soft-Delete)' : '✅ Reactivar Artículo'}
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <Btn variant="secondary" onClick={() => setModalOpen(false)}>
                                                Cerrar
                                            </Btn>
                                            <Btn variant="primary" onClick={handleSaveDatos} disabled={isCreating || isUpdating}>
                                                {isCreating || isUpdating ? 'Guardando...' : '💾 Guardar Cambios'}
                                            </Btn>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: ESTRUCTURA (BOM) */}
                            {activeTab === 'ESTRUCTURA' && editingArticulo && (
                                <div>
                                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '15px', color: '#f3f4f6', fontWeight: 700 }}>
                                                Componentes de la Estructura (BOM)
                                            </h3>
                                            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                                Materiales, hilados o artículos intermedios requeridos para fabricar 1 unidad de {editingArticulo.codigo}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Formulario rápido para agregar componente */}
                                    <div style={{ background: '#111827', padding: '14px', borderRadius: '10px', marginBottom: '18px', border: '1px solid #374151', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
                                        <div style={{ flex: '1 1 200px' }}>
                                            <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                Código Componente Hijo *
                                            </label>
                                            <Input
                                                placeholder="Ej: A161BLANCO, KT8892_L_B..."
                                                value={nuevoCompCodigo}
                                                onChange={(val) => setNuevoCompCodigo(val.toUpperCase())}
                                            />
                                        </div>

                                        <div style={{ width: '130px' }}>
                                            <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                Cantidad / Consumo *
                                            </label>
                                            <Input
                                                type="number"
                                                placeholder="1"
                                                value={String(nuevoCompCantidad)}
                                                onChange={(val) => setNuevoCompCantidad(Number(val) || 0)}
                                            />
                                        </div>

                                        <div style={{ flex: '1 1 180px' }}>
                                            <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                Observación técnica (Opcional)
                                            </label>
                                            <Input
                                                placeholder="Ej: Hilado base puntera..."
                                                value={nuevoCompObs}
                                                onChange={(val) => setNuevoCompObs(val)}
                                            />
                                        </div>

                                        <Btn variant="primary" onClick={handleAddEstructura} disabled={isSavingLinea}>
                                            {isSavingLinea ? 'Agregando...' : '+ Agregar a Estructura'}
                                        </Btn>
                                    </div>

                                    {/* Tabla de componentes existentes */}
                                    {loadingEstructuras ? (
                                        <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                                            <Spinner /> Cargando estructura BOM...
                                        </div>
                                    ) : estructuras.length === 0 ? (
                                        <div style={{ padding: '30px', textAlign: 'center', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.08)', borderRadius: '10px', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                                            ⚠️ Este artículo aún no tiene componentes definidos en su estructura técnica.
                                        </div>
                                    ) : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid #374151', color: '#9ca3af' }}>
                                                    <th style={{ padding: '8px' }}>Componente</th>
                                                    <th style={{ padding: '8px' }}>Descripción</th>
                                                    <th style={{ padding: '8px' }}>Etapa</th>
                                                    <th style={{ padding: '8px', textAlign: 'right' }}>Consumo Unitario</th>
                                                    <th style={{ padding: '8px' }}>Observación</th>
                                                    <th style={{ padding: '8px', textAlign: 'right' }}>Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {estructuras.map((linea) => (
                                                    <tr key={linea.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <td style={{ padding: '10px 8px', fontWeight: 700, color: '#60a5fa' }}>
                                                            {linea.codigoComponente}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', color: '#f3f4f6' }}>
                                                            {linea.descripcionInsumo || '—'}
                                                        </td>
                                                        <td style={{ padding: '10px 8px' }}>
                                                            <Badge color={ETAPA_COLOR[linea.etapaComponente || ''] || '#6b7280'}>
                                                                {linea.etapaComponente || 'INSUMO'}
                                                            </Badge>
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#34d399' }}>
                                                            {linea.cantidad} {linea.unidadMedidaComponente || ''}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', color: '#9ca3af', fontSize: '12px' }}>
                                                            {linea.observacion || '—'}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                                            <Btn
                                                                small
                                                                variant="secondary"
                                                                onClick={() => handleDeleteEstructura(linea.id)}
                                                                disabled={isDeletingLinea}
                                                                style={{ color: '#ef4444' }}
                                                            >
                                                                🗑️ Quitar
                                                            </Btn>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {/* TAB 3: MÁQUINAS Y TIEMPOS */}
                            {activeTab === 'MAQUINAS' && editingArticulo && (
                                <div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <h3 style={{ margin: 0, fontSize: '15px', color: '#f3f4f6', fontWeight: 700 }}>
                                            ⚙️ Máquinas Permitidas y Tiempos de Ciclo
                                        </h3>
                                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                            En qué máquinas se puede fabricar y tiempo de ciclo en segundos (se permiten valores null si aún está en estudio)
                                        </div>
                                    </div>

                                    {/* Formulario para asignar máquina */}
                                    <div style={{ background: '#111827', padding: '14px', borderRadius: '10px', marginBottom: '18px', border: '1px solid #374151', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
                                        <div style={{ flex: '1 1 240px' }}>
                                            <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                Tipo de Máquina *
                                            </label>
                                            <select
                                                value={nuevaMaquinaId}
                                                onChange={(e) => setNuevaMaquinaId(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    background: '#1f2937',
                                                    border: '1px solid #374151',
                                                    borderRadius: '8px',
                                                    color: '#ffffff',
                                                    fontSize: '12px',
                                                }}
                                            >
                                                <option value="">Seleccionar del catálogo...</option>
                                                {catalogoMaquinas.map((m) => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.name} ({m.marca} {m.modelo} - {m.cantAgujas} ag)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ width: '160px' }}>
                                            <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                Tiempo Ciclo (seg / media)
                                            </label>
                                            <Input
                                                type="number"
                                                placeholder="Ej: 145 (o vacío)"
                                                value={nuevoCycleTime}
                                                onChange={(val) => setNuevoCycleTime(val)}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '8px' }}>
                                            <input
                                                type="checkbox"
                                                id="chkPreferida"
                                                checked={nuevaPreferida}
                                                onChange={(e) => setNuevaPreferida(e.target.checked)}
                                            />
                                            <label htmlFor="chkPreferida" style={{ fontSize: '12px', color: '#d1d5db', cursor: 'pointer' }}>
                                                ★ Preferida
                                            </label>
                                        </div>

                                        <Btn variant="primary" onClick={handleAddMaquina} disabled={isSavingMaquina}>
                                            {isSavingMaquina ? 'Asignando...' : '+ Asignar Máquina'}
                                        </Btn>
                                    </div>

                                    {/* Tabla de máquinas asignadas */}
                                    {loadingMaquinas ? (
                                        <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                                            <Spinner /> Cargando asignación de máquinas...
                                        </div>
                                    ) : asignacionesMaquina.length === 0 ? (
                                        <div style={{ padding: '30px', textAlign: 'center', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.08)', borderRadius: '10px', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                                            ⚠️ Este artículo aún no tiene máquinas asignadas. Podés asignarlas arriba o dejarlo pendiente si está en desarrollo.
                                        </div>
                                    ) : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid #374151', color: '#9ca3af' }}>
                                                    <th style={{ padding: '8px' }}>Tipo de Máquina</th>
                                                    <th style={{ padding: '8px' }}>Marca / Modelo</th>
                                                    <th style={{ padding: '8px' }}>Agujas</th>
                                                    <th style={{ padding: '8px', textAlign: 'right' }}>Tiempo Ciclo</th>
                                                    <th style={{ padding: '8px', textAlign: 'center' }}>Preferida</th>
                                                    <th style={{ padding: '8px', textAlign: 'right' }}>Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {asignacionesMaquina.map((asig) => (
                                                    <tr key={asig.machineTypeId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <td style={{ padding: '10px 8px', fontWeight: 700, color: '#f3f4f6' }}>
                                                            {asig.machineTypeName}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', color: '#d1d5db' }}>
                                                            {asig.marca} {asig.modelo}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', color: '#9ca3af' }}>
                                                            {asig.cantAgujas} ag
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: asig.cycleTimeSeconds ? '#10b981' : '#f59e0b' }}>
                                                            {asig.cycleTimeSeconds ? `${asig.cycleTimeSeconds} seg` : '⏳ Pendiente (null)'}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                                            {asig.preferida ? <Badge color="#8b5cf6">★ SÍ</Badge> : <span style={{ color: '#6b7280' }}>No</span>}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                                            <Btn
                                                                small
                                                                variant="secondary"
                                                                onClick={() => handleDeleteMaquina(asig.machineTypeId)}
                                                                disabled={isDeletingMaquina}
                                                                style={{ color: '#ef4444' }}
                                                            >
                                                                🗑️ Desasignar
                                                            </Btn>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {/* TAB 4: MATCH DEPÓSITO / EQUIVALENCIAS */}
                            {activeTab === 'EQUIVALENCIAS' && editingArticulo && (
                                <div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <h3 style={{ margin: 0, fontSize: '15px', color: '#f3f4f6', fontWeight: 700 }}>
                                            🔗 Match con Ítems de Depósito (Stock Físico)
                                        </h3>
                                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                            Asociá qué ítem/s del inventario físico corresponden a este hilado o insumo, con orden de prioridad (1 = Principal, 2 = Próximo proveedor)
                                        </div>
                                    </div>

                                    {/* Formulario para asociar ítem */}
                                    <div style={{ background: '#111827', padding: '14px', borderRadius: '10px', marginBottom: '18px', border: '1px solid #374151', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
                                        <div style={{ flex: '1 1 260px' }}>
                                            <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                Buscar Ítem de Depósito
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Filtrar por nombre o código..."
                                                value={itemSearchTerm}
                                                onChange={(e) => setItemSearchTerm(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '7px 10px',
                                                    background: '#1f2937',
                                                    border: '1px solid #374151',
                                                    borderRadius: '8px',
                                                    color: '#ffffff',
                                                    fontSize: '12px',
                                                    marginBottom: '6px',
                                                }}
                                            />
                                            <select
                                                value={nuevoItemId}
                                                onChange={(e) => setNuevoItemId(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    background: '#1f2937',
                                                    border: '1px solid #374151',
                                                    borderRadius: '8px',
                                                    color: '#ffffff',
                                                    fontSize: '12px',
                                                }}
                                            >
                                                <option value="">Seleccionar ítem...</option>
                                                {itemsDisponibles.map((it) => (
                                                    <option key={it.id} value={it.id}>
                                                        {it.codigoInterno} - {it.descripcion} ({it.supplier?.name || 'Sin prov.'})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ width: '110px' }}>
                                            <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                Prioridad
                                            </label>
                                            <Input
                                                type="number"
                                                value={String(nuevoItemPrioridad)}
                                                onChange={(val) => setNuevoItemPrioridad(Number(val) || 1)}
                                            />
                                        </div>

                                        <div style={{ width: '110px' }}>
                                            <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                Factor Conv.
                                            </label>
                                            <Input
                                                type="number"
                                                value={String(nuevoItemFactor)}
                                                onChange={(val) => setNuevoItemFactor(Number(val) || 1.0)}
                                            />
                                        </div>

                                        <Btn variant="primary" onClick={handleAddItem} disabled={isSavingItem}>
                                            {isSavingItem ? 'Vinculando...' : '+ Vincular Ítem'}
                                        </Btn>
                                    </div>

                                    {/* Tabla de ítems vinculados */}
                                    {loadingEquivalencias ? (
                                        <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                                            <Spinner /> Cargando equivalencias de depósito...
                                        </div>
                                    ) : equivalencias.length === 0 ? (
                                        <div style={{ padding: '30px', textAlign: 'center', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.08)', borderRadius: '10px', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                                            ⚠️ Este artículo no tiene ningún ítem de depósito asignado. No podrá realizarse picking ni control de corte de proveedor hasta vincularlo.
                                        </div>
                                    ) : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid #374151', color: '#9ca3af' }}>
                                                    <th style={{ padding: '8px' }}>Prioridad</th>
                                                    <th style={{ padding: '8px' }}>Código Ítem</th>
                                                    <th style={{ padding: '8px' }}>Descripción</th>
                                                    <th style={{ padding: '8px' }}>Proveedor</th>
                                                    <th style={{ padding: '8px', textAlign: 'right' }}>Stock Físico</th>
                                                    <th style={{ padding: '8px', textAlign: 'right' }}>Factor</th>
                                                    <th style={{ padding: '8px', textAlign: 'right' }}>Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {equivalencias.map((eq) => (
                                                    <tr key={eq.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <td style={{ padding: '10px 8px' }}>
                                                            <span
                                                                style={{
                                                                    display: 'inline-block',
                                                                    width: '22px',
                                                                    height: '22px',
                                                                    borderRadius: '50%',
                                                                    textAlign: 'center',
                                                                    lineHeight: '22px',
                                                                    fontWeight: 800,
                                                                    fontSize: '11px',
                                                                    background: eq.ordenPrioridad === 1 ? '#8b5cf6' : '#374151',
                                                                    color: '#ffffff',
                                                                }}
                                                            >
                                                                {eq.ordenPrioridad}
                                                            </span>
                                                            {eq.ordenPrioridad === 1 && (
                                                                <span style={{ fontSize: '11px', color: '#c4b5fd', fontWeight: 700, marginLeft: '6px' }}>
                                                                    ★ PRINCIPAL
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', fontWeight: 700, color: '#60a5fa' }}>
                                                            {eq.codigoItem}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', color: '#f3f4f6' }}>
                                                            {eq.item?.descripcion || '—'}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', color: '#d1d5db' }}>
                                                            {eq.item?.supplierName || '—'}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#34d399' }}>
                                                            {eq.stockActual?.toLocaleString('es-AR') || 0} {eq.item?.unidadPrincipal || ''}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#9ca3af' }}>
                                                            {eq.factorConversion}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                                            <Btn
                                                                small
                                                                variant="secondary"
                                                                onClick={() => handleDeleteItem(eq.id)}
                                                                disabled={isDeletingItem}
                                                                style={{ color: '#ef4444' }}
                                                            >
                                                                🗑️ Desvincular
                                                            </Btn>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
