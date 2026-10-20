import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    useGetArticuloEstructurasQuery,
    useGetArticulosQuery,
    useGetPendientesEstructuraQuery,
    useCrearArbolEstructuraMutation,
    useBuscarItemsParaVincularQuery,
    useUpsertLineaEstructuraMutation,
    useEliminarLineaEstructuraMutation,
    useSimularNecesidadesQuery,
} from '../../features/desarrollo/api/articulos.api';
import { PageHeader, Card, Input, Badge, Btn, Modal, Spinner, Select, useIsMobile } from '../../shared/ui';

interface ComponenteDraft {
    codigoComponente: string;
    descripcionInsumo: string;
    cantidad: number;
    tipoFijoVariable: string;
    itemIdEquivalente?: string;
    itemDescripcion?: string;
    ordenPrioridad: number;
}

const ETAPA_COLOR: Record<string, string> = {
    TERMINADO: '#10b981',
    COSTURA: '#3b82f6',
    TEJIDO: '#8b5cf6',
    HILADO: '#f59e0b',
    INSUMO: '#ec4899',
};

export function EstructurasPage() {
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Tab principal: 'VISUALIZADOR' | 'SIMULADOR' | 'PENDIENTES'
    const initialTab = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState<'VISUALIZADOR' | 'SIMULADOR' | 'PENDIENTES'>(
        initialTab === 'SIMULADOR' || initialTab === 'PENDIENTES' ? initialTab : 'VISUALIZADOR'
    );

    // Estado Visualizador
    const [parentCodeSearch, setParentCodeSearch] = useState('');
    const [parentEtapaFilter, setParentEtapaFilter] = useState('TERMINADO');
    const [selectedParentCode, setSelectedParentCode] = useState(searchParams.get('codigo') || '');
    const [breadcrumb, setBreadcrumb] = useState<string[]>([]);

    // Edición / Alta de línea de componente en el Visualizador
    const [addCompOpen, setAddCompOpen] = useState(false);
    const [compSearch, setCompSearch] = useState('');
    const [lineForm, setLineForm] = useState<{
        codigoComponente: string;
        cantidad: string;
        cantidadSecundaria: string;
        observacion: string;
    }>({
        codigoComponente: '',
        cantidad: '',
        cantidadSecundaria: '',
        observacion: '',
    });

    // Simulador
    const [cantidadSimular, setCantidadSimular] = useState<number>(1000);

    // Estado Pendientes
    const [pendientesSearch, setPendientesSearch] = useState('');
    const [pendientesTipo, setPendientesTipo] = useState('PA');
    const [pendientesPage, setPendientesPage] = useState(1);

    // Modal Crear Estructura (Asistente)
    const [modalOpen, setModalOpen] = useState(false);
    const [targetArticulo, setTargetArticulo] = useState<any>(null);
    const [crearPI, setCrearPI] = useState(true);
    const [codigoPI, setCodigoPI] = useState('');
    const [descripcionPI, setDescripcionPI] = useState('');
    const [cantidadPI, setCantidadPI] = useState(1);
    const [componentesDraft, setComponentesDraft] = useState<ComponenteDraft[]>([]);
    const [nuevoCodComp, setNuevoCodComp] = useState('');
    const [nuevaDescComp, setNuevaDescComp] = useState('');
    const [nuevaCantComp, setNuevaCantComp] = useState<number | ''>('');
    const [nuevoTipoFijoVar, setNuevoTipoFijoVar] = useState('V');
    const [busquedaItemAlmacen, setBusquedaItemAlmacen] = useState('');
    const [itemAlmacenSeleccionado, setItemAlmacenSeleccionado] = useState<{ id: string; codigo: string; descripcion: string } | null>(null);

    useEffect(() => {
        const codParam = searchParams.get('codigo');
        if (codParam && codParam !== selectedParentCode) {
            setSelectedParentCode(codParam);
            setBreadcrumb([codParam]);
        }
        const tabParam = searchParams.get('tab');
        if (tabParam === 'SIMULADOR' || tabParam === 'VISUALIZADOR' || tabParam === 'PENDIENTES') {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    const selectParent = (codigo: string, addToTrail = false) => {
        setSelectedParentCode(codigo);
        setSearchParams({ codigo });
        if (addToTrail) {
            setBreadcrumb((prev) => (prev.includes(codigo) ? prev.slice(0, prev.indexOf(codigo) + 1) : [...prev, codigo]));
        } else {
            setBreadcrumb([codigo]);
        }
    };

    // Consultas RTK
    const { data: articulosData } = useGetArticulosQuery({
        search: parentCodeSearch,
        etapa: parentEtapaFilter === 'TODOS' ? undefined : parentEtapaFilter,
        soloConEtapa: parentEtapaFilter === 'TODOS',
        limit: 30,
    });

    useEffect(() => {
        if (!selectedParentCode && articulosData?.items && articulosData.items.length > 0) {
            const firstCode = articulosData.items[0].codigo;
            setSelectedParentCode(firstCode);
            setBreadcrumb([firstCode]);
        }
    }, [articulosData, selectedParentCode]);

    const { data: compCatalogoData } = useGetArticulosQuery(
        {
            search: compSearch,
            soloConEtapa: true,
            limit: 12,
        },
        { skip: !addCompOpen || compSearch.trim().length < 1 }
    );

    const { data: estructuras, isLoading: loadingBOM } = useGetArticuloEstructurasQuery(
        selectedParentCode,
        { skip: !selectedParentCode }
    );

    const { data: simulacionData, isFetching: loadingSimulacion } = useSimularNecesidadesQuery(
        { codigoPadre: selectedParentCode, cantidad: cantidadSimular || 1 },
        { skip: !selectedParentCode || (activeTab !== 'SIMULADOR' && activeTab !== 'VISUALIZADOR') }
    );

    const { data: pendientesData, isLoading: loadingPendientes, refetch: refetchPendientes } = useGetPendientesEstructuraQuery({
        search: pendientesSearch,
        tipo: pendientesTipo,
        page: pendientesPage,
        limit: 20,
    });

    const { data: itemsAlmacenSugeridos } = useBuscarItemsParaVincularQuery(
        { q: busquedaItemAlmacen },
        { skip: !busquedaItemAlmacen || busquedaItemAlmacen.trim().length < 2 }
    );

    const [crearArbol, { isLoading: guardandoArbol }] = useCrearArbolEstructuraMutation();
    const [upsertLinea, { isLoading: guardandoLinea }] = useUpsertLineaEstructuraMutation();
    const [eliminarLinea] = useEliminarLineaEstructuraMutation();

    const handleSaveLine = async () => {
        if (!selectedParentCode || !lineForm.codigoComponente.trim()) {
            alert('Selecciona o escribe un código de componente');
            return;
        }
        const cant = Number(lineForm.cantidad);
        if (isNaN(cant) || cant < 0) {
            alert('Ingresa una cantidad válida');
            return;
        }
        try {
            await upsertLinea({
                codigoPadre: selectedParentCode,
                codigoComponente: lineForm.codigoComponente.trim().toUpperCase(),
                cantidad: cant,
                cantidadSecundaria: lineForm.cantidadSecundaria ? Number(lineForm.cantidadSecundaria) : undefined,
                observacion: lineForm.observacion || undefined,
            }).unwrap();
            setAddCompOpen(false);
            setLineForm({ codigoComponente: '', cantidad: '', cantidadSecundaria: '', observacion: '' });
            setCompSearch('');
        } catch (err: any) {
            alert(err?.data?.message || 'Error al guardar componente');
        }
    };

    const handleEditLineClick = (c: any) => {
        setLineForm({
            codigoComponente: c.codigoComponente,
            cantidad: String(c.cantidad ?? 0),
            cantidadSecundaria: c.cantidadSecundaria != null ? String(c.cantidadSecundaria) : '',
            observacion: c.observacion || '',
        });
        setCompSearch(c.codigoComponente);
        setAddCompOpen(true);
    };

    const handleDeleteLineClick = async (c: any) => {
        if (!window.confirm(`¿Quitar el componente ${c.codigoComponente} de la estructura de ${selectedParentCode}?`)) {
            return;
        }
        try {
            await eliminarLinea(c.id).unwrap();
        } catch (err: any) {
            alert(err?.data?.message || 'Error al eliminar línea');
        }
    };

    const abrirModalAsistente = (art: any) => {
        setTargetArticulo(art);
        const piCodeSugerido = art.codigo.startsWith('PI-') ? art.codigo : `PI-${art.codigo}`;
        setCodigoPI(piCodeSugerido);
        setDescripcionPI(`TEJIDO ${art.descripcion || art.codigo}`);
        setCantidadPI(1);
        setCrearPI(true);
        setComponentesDraft([]);
        limpiarInputComponente();
        setModalOpen(true);
    };

    const limpiarInputComponente = () => {
        setNuevoCodComp('');
        setNuevaDescComp('');
        setNuevaCantComp('');
        setNuevoTipoFijoVar('V');
        setBusquedaItemAlmacen('');
        setItemAlmacenSeleccionado(null);
    };

    const handleAgregarComponente = () => {
        if (!nuevoCodComp.trim()) {
            alert('Ingrese el código del hilado o componente.');
            return;
        }
        const cant = Number(nuevaCantComp);
        if (!cant || cant <= 0) {
            alert('Ingrese una cantidad o consumo unitario válido mayor a 0.');
            return;
        }

        const draft: ComponenteDraft = {
            codigoComponente: nuevoCodComp.trim().toUpperCase(),
            descripcionInsumo: nuevaDescComp.trim() || nuevoCodComp.trim().toUpperCase(),
            cantidad: cant,
            tipoFijoVariable: nuevoTipoFijoVar,
            itemIdEquivalente: itemAlmacenSeleccionado?.id,
            itemDescripcion: itemAlmacenSeleccionado ? `${itemAlmacenSeleccionado.codigo} - ${itemAlmacenSeleccionado.descripcion}` : undefined,
            ordenPrioridad: 1,
        };

        setComponentesDraft([...componentesDraft, draft]);
        limpiarInputComponente();
    };

    const handleEliminarComponenteDraft = (index: number) => {
        setComponentesDraft(componentesDraft.filter((_, i) => i !== index));
    };

    const handleGuardarEstructura = async () => {
        if (!targetArticulo) return;
        if (componentesDraft.length === 0) {
            alert('Debe agregar al menos un componente/hilado a la estructura.');
            return;
        }

        try {
            await crearArbol({
                codigoPadre: targetArticulo.codigo,
                productoIntermedio: crearPI ? {
                    codigoPI: codigoPI.trim().toUpperCase(),
                    descripcionPI: descripcionPI.trim() || undefined,
                    cantidad: Number(cantidadPI) || 1,
                } : undefined,
                componentes: componentesDraft.map((c) => ({
                    codigoComponente: c.codigoComponente,
                    descripcionInsumo: c.descripcionInsumo,
                    cantidad: c.cantidad,
                    tipoFijoVariable: c.tipoFijoVariable,
                    itemIdEquivalente: c.itemIdEquivalente,
                    ordenPrioridad: c.ordenPrioridad,
                })),
            }).unwrap();

            setModalOpen(false);
            refetchPendientes();
            selectParent(targetArticulo.codigo, false);
            setActiveTab('VISUALIZADOR');
        } catch (error: any) {
            alert(`Error al crear estructura: ${error?.data?.message || error.message || 'Error desconocido'}`);
        }
    };

    return (
        <div style={{ padding: isMobile ? '12px' : '20px', maxWidth: '1500px', margin: '0 auto' }}>
            <PageHeader
                title="🌳 Ficha Técnica, Estructuras (BOM) & Simulador"
                subtitle="Explosión multinivel (TERMINADO → COSTURA → TEJIDO → HILADO / INSUMO) y cálculo de producción/compras"
            >
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Btn
                        variant={activeTab === 'VISUALIZADOR' ? 'primary' : 'secondary'}
                        onClick={() => setActiveTab('VISUALIZADOR')}
                    >
                        🧬 Receta / Estructura (BOM)
                    </Btn>
                    <Btn
                        variant={activeTab === 'SIMULADOR' ? 'primary' : 'secondary'}
                        onClick={() => setActiveTab('SIMULADOR')}
                    >
                        🧮 Simulador de Producción y Compras
                    </Btn>
                    <Btn
                        variant={activeTab === 'PENDIENTES' ? 'primary' : 'secondary'}
                        onClick={() => setActiveTab('PENDIENTES')}
                    >
                        ⚠️ Sin Estructura {pendientesData?.total ? `(${pendientesData.total})` : ''}
                    </Btn>
                </div>
            </PageHeader>

            {/* TAB: VISUALIZADOR Y SIMULADOR COMPARTEN SELECTOR DE PADRE */}
            {(activeTab === 'VISUALIZADOR' || activeTab === 'SIMULADOR') && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '360px 1fr',
                    gap: '16px',
                    alignItems: 'start',
                }}>
                    {/* Selector de Producto Padre */}
                    <Card style={{ padding: '16px' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#f3f4f6' }}>
                            1. Seleccionar Artículo Padre
                        </h3>

                        <div style={{ marginBottom: '10px' }}>
                            <Select
                                label="Filtrar por Etapa"
                                value={parentEtapaFilter}
                                options={[
                                    { value: 'TERMINADO', label: '🟢 TERMINADO (Final)' },
                                    { value: 'COSTURA', label: '🔵 COSTURA (_C)' },
                                    { value: 'TEJIDO', label: '🟣 TEJIDO (Crudo)' },
                                    { value: 'TODOS', label: '⭐ Todas las etapas' },
                                ]}
                                onChange={(val) => setParentEtapaFilter(val)}
                            />
                        </div>

                        <Input
                            placeholder="Buscar código o descripción (ej: JV7402)..."
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
                                            onClick={() => selectParent(art.codigo, false)}
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
                                                <Badge color={ETAPA_COLOR[art.etapa || ''] || '#9ca3af'}>
                                                    {art.etapa || art.tipo}
                                                </Badge>
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

                    {/* Panel Derecho: Estructura o Simulador */}
                    <div>
                        {!selectedParentCode ? (
                            <Card style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af' }}>
                                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                                <h3 style={{ color: '#f3f4f6', margin: '0 0 8px' }}>Selecciona un artículo a la izquierda</h3>
                                <p style={{ margin: 0, fontSize: '13px' }}>
                                    Podrás ver y editar sus componentes directos, navegar por sus sub-niveles (Costura → Tejido → Hilado) o simular una orden de producción.
                                </p>
                            </Card>
                        ) : activeTab === 'VISUALIZADOR' ? (
                            <Card style={{ padding: '16px' }}>
                                {/* Breadcrumb de navegación multinivel */}
                                {breadcrumb.length > 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', fontSize: '12px' }}>
                                        <span style={{ color: '#9ca3af' }}>Ruta del árbol:</span>
                                        {breadcrumb.map((code, idx) => (
                                            <span key={code} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                {idx > 0 && <span style={{ color: '#6b7280' }}>→</span>}
                                                <button
                                                    onClick={() => selectParent(code, true)}
                                                    style={{
                                                        background: code === selectedParentCode ? '#2563eb' : '#1f2937',
                                                        color: '#fff',
                                                        border: '1px solid #374151',
                                                        borderRadius: '6px',
                                                        padding: '2px 8px',
                                                        cursor: 'pointer',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {code}
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                                    <div>
                                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Estructura directa (Nivel 1) de:</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#60a5fa' }}>
                                                {selectedParentCode}
                                            </h2>
                                            {simulacionData?.etapaPadre && (
                                                <Badge color={ETAPA_COLOR[simulacionData.etapaPadre] || '#6366f1'}>
                                                    {simulacionData.etapaPadre}
                                                </Badge>
                                            )}
                                        </div>
                                        {simulacionData?.descripcionPadre && (
                                            <div style={{ fontSize: '13px', color: '#d1d5db', marginTop: '2px' }}>
                                                {simulacionData.descripcionPadre}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <Btn
                                            small
                                            variant="secondary"
                                            onClick={() => setActiveTab('SIMULADOR')}
                                        >
                                            🧮 Simular Producción
                                        </Btn>
                                        <Btn
                                            small
                                            variant="primary"
                                            onClick={() => {
                                                setLineForm({ codigoComponente: '', cantidad: '', cantidadSecundaria: '', observacion: '' });
                                                setCompSearch('');
                                                setAddCompOpen(!addCompOpen);
                                            }}
                                        >
                                            {addCompOpen ? '✕ Cerrar Editor' : '+ Agregar / Editar Componente'}
                                        </Btn>
                                    </div>
                                </div>

                                {/* Formulario inline para Agregar/Editar componente */}
                                {addCompOpen && (
                                    <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                                        <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#93c5fd' }}>
                                            ➕ Agregar o Actualizar Componente en {selectedParentCode}
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr 1.5fr auto', gap: '10px', alignItems: 'end' }}>
                                            <div style={{ position: 'relative' }}>
                                                <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                    Código Componente (Hilado, Tejido, Costura o Insumo) *
                                                </label>
                                                <Input
                                                    value={lineForm.codigoComponente}
                                                    onChange={(val) => {
                                                        setLineForm({ ...lineForm, codigoComponente: val.toUpperCase() });
                                                        setCompSearch(val);
                                                    }}
                                                    placeholder="Buscar código o escribir..."
                                                />
                                                {compSearch && compCatalogoData?.items && compCatalogoData.items.length > 0 && compSearch !== lineForm.codigoComponente && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '100%',
                                                        left: 0,
                                                        right: 0,
                                                        background: '#111827',
                                                        border: '1px solid #374151',
                                                        borderRadius: '8px',
                                                        zIndex: 1000,
                                                        maxHeight: '180px',
                                                        overflowY: 'auto',
                                                    }}>
                                                        {compCatalogoData.items.map((item) => (
                                                            <div
                                                                key={item.id}
                                                                onClick={() => {
                                                                    setLineForm({ ...lineForm, codigoComponente: item.codigo });
                                                                    setCompSearch(item.codigo);
                                                                }}
                                                                style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                                            >
                                                                <strong style={{ color: '#60a5fa' }}>{item.codigo}</strong> ({item.etapa || item.tipo}) — {item.descripcion}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                    Cantidad (UM1) *
                                                </label>
                                                <Input
                                                    type="number"
                                                    value={lineForm.cantidad}
                                                    onChange={(val) => setLineForm({ ...lineForm, cantidad: val })}
                                                    placeholder="Ej: 0.0425 o 1"
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                    Cant. 2da UM (opc.)
                                                </label>
                                                <Input
                                                    type="number"
                                                    value={lineForm.cantidadSecundaria}
                                                    onChange={(val) => setLineForm({ ...lineForm, cantidadSecundaria: val })}
                                                    placeholder="Opcional"
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                                                    Observación
                                                </label>
                                                <Input
                                                    value={lineForm.observacion}
                                                    onChange={(val) => setLineForm({ ...lineForm, observacion: val })}
                                                    placeholder="Nota opcional"
                                                />
                                            </div>
                                            <Btn variant="primary" onClick={handleSaveLine} disabled={guardandoLinea}>
                                                {guardandoLinea ? '...' : '💾 Guardar'}
                                            </Btn>
                                        </div>
                                    </div>
                                )}

                                {loadingBOM ? (
                                    <p style={{ color: '#9ca3af', textAlign: 'center', padding: '30px' }}>Cargando componentes de la estructura...</p>
                                ) : !estructuras || estructuras.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                        <p>No se encontraron componentes registrados en la estructura de <strong>{selectedParentCode}</strong>.</p>
                                        <Btn small variant="primary" onClick={() => setAddCompOpen(true)}>
                                            + Agregar primer componente
                                        </Btn>
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                                                    <th style={{ padding: '8px 10px' }}>Componente</th>
                                                    <th style={{ padding: '8px 10px' }}>Etapa</th>
                                                    <th style={{ padding: '8px 10px' }}>Descripción</th>
                                                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Consumo / Cant</th>
                                                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Vínculo / Sub-árbol</th>
                                                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {estructuras.map((c, i) => {
                                                    const sinCantidad = Number(c.cantidad) <= 0;
                                                    return (
                                                        <tr
                                                            key={c.id || i}
                                                            style={{
                                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                                backgroundColor: sinCantidad ? 'rgba(239, 68, 68, 0.06)' : 'transparent',
                                                            }}
                                                        >
                                                            <td style={{ padding: '10px', fontWeight: 700, color: '#f3f4f6' }}>
                                                                {c.codigoComponente}
                                                            </td>
                                                            <td style={{ padding: '10px' }}>
                                                                <Badge color={ETAPA_COLOR[c.etapaComponente || ''] || '#6b7280'}>
                                                                    {c.etapaComponente || '—'}
                                                                </Badge>
                                                            </td>
                                                            <td style={{ padding: '10px', color: '#d1d5db' }}>
                                                                <div>{c.descripcionInsumo || '—'}</div>
                                                                {sinCantidad && (
                                                                    <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 600 }}>
                                                                        ⚠️ Sin cantidad definida en Libro1 — Clic en Editar para completar
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: sinCantidad ? '#ef4444' : '#10b981' }}>
                                                                {Number(c.cantidad).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}{' '}
                                                                <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>
                                                                    {c.unidadMedidaComponente || 'UN'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                                {(c.subComponentesCount || 0) > 0 && (
                                                                    <Btn
                                                                        small
                                                                        variant="secondary"
                                                                        onClick={() => selectParent(c.codigoComponente, true)}
                                                                    >
                                                                        🔎 Ver sub-receta ({c.subComponentesCount})
                                                                    </Btn>
                                                                )}
                                                                {c.etapaComponente === 'HILADO' && (
                                                                    <span
                                                                        onClick={() => navigate('/desarrollo/equivalencias')}
                                                                        style={{
                                                                            cursor: 'pointer',
                                                                            fontSize: '11px',
                                                                            padding: '3px 8px',
                                                                            borderRadius: '6px',
                                                                            background: (c.equivalenciasCount || 0) > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.2)',
                                                                            color: (c.equivalenciasCount || 0) > 0 ? '#34d399' : '#fbbf24',
                                                                            fontWeight: 600,
                                                                        }}
                                                                    >
                                                                        {(c.equivalenciasCount || 0) > 0
                                                                            ? `🔗 ${c.equivalenciasCount} ítem(s) en depósito`
                                                                            : '⚠️ Sin ítem en depósito'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                                    <Btn small variant="secondary" onClick={() => handleEditLineClick(c)}>
                                                                        ✏️
                                                                    </Btn>
                                                                    <Btn small variant="danger" onClick={() => handleDeleteLineClick(c)}>
                                                                        🗑️
                                                                    </Btn>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Resumen rápido de Explosión Total al pie del Visualizador */}
                                {simulacionData && ((simulacionData.hiladosNecesarios?.length || 0) > 0 || (simulacionData.tejidoMaquinas?.length || 0) > 0) && (
                                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <h4 style={{ margin: 0, fontSize: '14px', color: '#f3f4f6' }}>
                                                ⚡ Resumen de Explosión Completa (por cada 1 unidad de {selectedParentCode})
                                            </h4>
                                            <Btn small variant="primary" onClick={() => setActiveTab('SIMULADOR')}>
                                                Abrir Simulador de Cantidades →
                                            </Btn>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {(simulacionData.hiladosNecesarios || []).map((h) => (
                                                <div
                                                    key={h.codigoArticulo}
                                                    style={{
                                                        background: 'rgba(245, 158, 11, 0.08)',
                                                        border: '1px solid rgba(245, 158, 11, 0.25)',
                                                        borderRadius: '8px',
                                                        padding: '8px 12px',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 700, color: '#fbbf24' }}>{h.codigoArticulo}</div>
                                                    <div style={{ color: '#d1d5db' }}>{h.descripcion}</div>
                                                    <div style={{ marginTop: '4px', color: '#34d399', fontWeight: 600 }}>
                                                        Stock depósito: {h.stockTotalDisponible.toLocaleString()} {h.unidadMedida}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ) : (
                            /* TAB: SIMULADOR DE PRODUCCIÓN Y COMPRAS */
                            <Card style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
                                    <div>
                                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Simulación de Explosión Multinivel para:</span>
                                        <h2 style={{ margin: '2px 0 0', fontSize: '20px', fontWeight: 800, color: '#60a5fa' }}>
                                            {selectedParentCode} — {simulacionData?.descripcionPadre}
                                        </h2>
                                    </div>
                                    <div style={{ width: '220px' }}>
                                        <label style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                            Cantidad a Producir (Unidades / Pares)
                                        </label>
                                        <Input
                                            type="number"
                                            value={String(cantidadSimular)}
                                            onChange={(val) => setCantidadSimular(Math.max(1, Number(val) || 0))}
                                        />
                                    </div>
                                </div>

                                {loadingSimulacion ? (
                                    <div style={{ padding: '40px', textAlign: 'center' }}>
                                        <Spinner />
                                        <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '10px' }}>Calculando explosión de hilados, stock de depósito y horas de máquina...</p>
                                    </div>
                                ) : !simulacionData ? null : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        {/* 1. Hilados Requeridos vs Stock en Depósito */}
                                        <div>
                                            <h3 style={{ margin: '0 0 10px', fontSize: '15px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                🧶 1. Explosión de Hilados Requeridos vs Stock Real en Depósito
                                            </h3>
                                            {(simulacionData.hiladosNecesarios || []).length === 0 ? (
                                                <p style={{ color: '#9ca3af', fontSize: '13px' }}>No hay hilados en la explosión de este artículo.</p>
                                            ) : (
                                                <div style={{ overflowX: 'auto' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                                                                <th style={{ padding: '8px 10px' }}>Hilado (Artículo)</th>
                                                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Necesario Total</th>
                                                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Stock en Depósito</th>
                                                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Balance / Compra</th>
                                                                <th style={{ padding: '8px 10px' }}>Ítems Equivalentes (Orden de Prioridad)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(simulacionData.hiladosNecesarios || []).map((h) => (
                                                                <tr key={h.codigoArticulo} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                    <td style={{ padding: '10px' }}>
                                                                        <div style={{ fontWeight: 700, color: '#f3f4f6' }}>{h.codigoArticulo}</div>
                                                                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{h.descripcion}</div>
                                                                    </td>
                                                                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#60a5fa' }}>
                                                                        {h.cantidadTotalRequerida.toLocaleString()} {h.unidadMedida}
                                                                    </td>
                                                                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                                                                        {h.stockTotalDisponible.toLocaleString()} {h.unidadMedida}
                                                                    </td>
                                                                    <td style={{ padding: '10px', textAlign: 'right' }}>
                                                                        {h.sinEquivalenciaEnDeposito ? (
                                                                            <Badge color="#f59e0b">⚠️ SIN VINCULAR A DEPÓSITO</Badge>
                                                                        ) : h.alcanzaStock ? (
                                                                            <Badge color="#10b981">✅ CUBIERTO</Badge>
                                                                        ) : (
                                                                            <Badge color="#ef4444">
                                                                                🚨 FALTAN {h.faltante.toLocaleString()} {h.unidadMedida}
                                                                            </Badge>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ padding: '10px', fontSize: '12px' }}>
                                                                        {h.itemsEquivalentes.length === 0 ? (
                                                                            <span style={{ color: '#fbbf24' }}>
                                                                                Color nuevo / Pendiente de vincular en Equivalencias
                                                                            </span>
                                                                        ) : (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                                {h.itemsEquivalentes.map((eq) => (
                                                                                    <div key={eq.codigoItem} style={{ color: '#d1d5db' }}>
                                                                                        <strong style={{ color: eq.esPrincipal ? '#34d399' : '#9ca3af' }}>
                                                                                            #{eq.ordenPrioridad} {eq.codigoItem}
                                                                                        </strong>{' '}
                                                                                        ({eq.descripcionItem}) — Stock:{' '}
                                                                                        <strong style={{ color: eq.stockActual > 0 ? '#10b981' : '#ef4444' }}>
                                                                                            {eq.stockActual.toLocaleString()} kg
                                                                                        </strong>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                        {/* 2. Tiempo en Máquina de Tejeduría */}
                                        <div>
                                            <h3 style={{ margin: '0 0 10px', fontSize: '15px', color: '#a78bfa' }}>
                                                ⚙️ 2. Tiempo Estimado de Tejeduría (Máquinas y Turnos de 8h)
                                            </h3>
                                            {(simulacionData.tejidoMaquinas || []).length === 0 ? (
                                                <p style={{ color: '#9ca3af', fontSize: '13px' }}>No se detectó etapa TEJIDO en este árbol.</p>
                                            ) : (
                                                (simulacionData.tejidoMaquinas || []).map((tm) => (
                                                    <div
                                                        key={tm.codigoTejido}
                                                        style={{
                                                            background: 'rgba(139, 92, 246, 0.06)',
                                                            border: '1px solid rgba(139, 92, 246, 0.25)',
                                                            borderRadius: '10px',
                                                            padding: '14px',
                                                            marginBottom: '10px',
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap' }}>
                                                            <div>
                                                                <strong style={{ color: '#c4b5fd', fontSize: '14px' }}>
                                                                    Tejido: {tm.codigoTejido}
                                                                </strong>{' '}
                                                                <span style={{ color: '#9ca3af', fontSize: '13px' }}>— {tm.descripcionTejido}</span>
                                                            </div>
                                                            <Badge color="#8b5cf6">
                                                                {tm.unidadesATejer.toLocaleString()} unidades a tejer
                                                            </Badge>
                                                        </div>

                                                        {tm.sinMaquinaAsignada ? (
                                                            <div style={{ color: '#fbbf24', fontSize: '12px' }}>
                                                                ⚠️ Este artículo de tejido aún no tiene máquinas asignadas. Puedes asignarle una en <strong>Artículos ↔ Máquinas</strong>.
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
                                                                {tm.opcionesMaquina.map((op) => (
                                                                    <div
                                                                        key={op.machineTypeId}
                                                                        style={{
                                                                            background: op.preferida ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                                                                            border: op.preferida ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                                                                            borderRadius: '8px',
                                                                            padding: '10px 12px',
                                                                        }}
                                                                    >
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <span style={{ fontWeight: 700, color: '#f3f4f6', fontSize: '13px' }}>
                                                                                {op.preferida ? '⭐ ' : ''}{op.machineTypeName}
                                                                            </span>
                                                                            <Badge color={op.status === 'CONFIRMADO' ? '#10b981' : '#f59e0b'}>
                                                                                {op.status}
                                                                            </Badge>
                                                                        </div>
                                                                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
                                                                            Ciclo: <strong>{op.cycleTimeSeconds} seg/un</strong>
                                                                        </div>
                                                                        <div style={{ fontSize: '13px', color: '#60a5fa', fontWeight: 700, marginTop: '4px' }}>
                                                                            ⏱️ {op.horasTotales} hs máquina ({op.turnos8h} turnos de 8h en 1 máq.)
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* 3. Insumos y Packaging */}
                                        <div>
                                            <h3 style={{ margin: '0 0 10px', fontSize: '15px', color: '#f472b6' }}>
                                                📦 3. Insumos y Packaging Requeridos
                                            </h3>
                                            {(simulacionData.insumosNecesarios || []).length === 0 ? (
                                                <p style={{ color: '#9ca3af', fontSize: '13px' }}>No hay insumos registrados en este árbol.</p>
                                            ) : (
                                                <div style={{ overflowX: 'auto' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                                                                <th style={{ padding: '8px 10px' }}>Código Insumo</th>
                                                                <th style={{ padding: '8px 10px' }}>Descripción</th>
                                                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Cantidad Necesaria</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(simulacionData.insumosNecesarios || []).map((ins) => (
                                                                <tr key={ins.codigoArticulo} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#f3f4f6' }}>
                                                                        {ins.codigoArticulo}
                                                                    </td>
                                                                    <td style={{ padding: '8px 10px', color: '#d1d5db' }}>
                                                                        {ins.descripcion}
                                                                    </td>
                                                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: ins.sinCantidadDefinida ? '#ef4444' : '#10b981' }}>
                                                                        {ins.sinCantidadDefinida
                                                                            ? '⚠️ 0 (Sin cantidad en Libro1)'
                                                                            : `${ins.cantidadTotalRequerida.toLocaleString()} ${ins.unidadMedida}`}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {/* TAB: PENDIENTES DE ESTRUCTURA */}
            {activeTab === 'PENDIENTES' && (
                <Card style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f3f4f6' }}>
                                Artículos sin Estructura Registrada
                            </h3>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>
                                Artículos que aún no tienen componentes cargados en su receta.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <select
                                value={pendientesTipo}
                                onChange={(e) => {
                                    setPendientesTipo(e.target.value);
                                    setPendientesPage(1);
                                }}
                                style={{
                                    background: '#1a1d2e',
                                    border: '1px solid #374151',
                                    color: '#f3f4f6',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    fontSize: '13px',
                                    outline: 'none',
                                }}
                            >
                                <option value="PA">Solo Producto Acabado (PA)</option>
                                <option value="PI">Solo Intermedio (PI)</option>
                                <option value="TODOS">Todos los Tipos</option>
                            </select>
                            <Input
                                placeholder="Buscar código o descripción..."
                                value={pendientesSearch}
                                onChange={(val) => {
                                    setPendientesSearch(val);
                                    setPendientesPage(1);
                                }}
                                style={{ width: '250px' }}
                            />
                        </div>
                    </div>

                    {loadingPendientes ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <Spinner />
                            <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '12px' }}>Buscando artículos sin estructura...</p>
                        </div>
                    ) : pendientesData?.items?.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#10b981' }}>
                            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎉</div>
                            <h4 style={{ margin: '0 0 4px', fontSize: '16px', color: '#f3f4f6' }}>¡Excelente! No hay artículos pendientes</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>Todos los artículos analizados cuentan con su árbol de estructura cargado.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                                        <th style={{ padding: '10px 12px' }}>Código</th>
                                        <th style={{ padding: '10px 12px' }}>Descripción</th>
                                        <th style={{ padding: '10px 12px' }}>Tipo</th>
                                        <th style={{ padding: '10px 12px' }}>U.M.</th>
                                        <th style={{ padding: '10px 12px' }}>Marca / Talle</th>
                                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendientesData?.items.map((art) => (
                                        <tr key={art.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '12px', fontWeight: 700, color: '#60a5fa' }}>
                                                {art.codigo}
                                            </td>
                                            <td style={{ padding: '12px', color: '#f3f4f6' }}>
                                                {art.descripcion}
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <Badge color="#f59e0b">{art.tipo}</Badge>
                                            </td>
                                            <td style={{ padding: '12px', color: '#9ca3af' }}>
                                                {art.unidadMedida}
                                            </td>
                                            <td style={{ padding: '12px', color: '#9ca3af' }}>
                                                {art.marca || '—'} {art.talle ? `(${art.talle})` : ''}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                    <Btn
                                                        small
                                                        variant="secondary"
                                                        onClick={() => {
                                                            selectParent(art.codigo, false);
                                                            setActiveTab('VISUALIZADOR');
                                                            setAddCompOpen(true);
                                                        }}
                                                    >
                                                        ✏️ Cargar Directo
                                                    </Btn>
                                                    <Btn
                                                        small
                                                        onClick={() => abrirModalAsistente(art)}
                                                    >
                                                        ✨ Asistente PI
                                                    </Btn>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Paginación */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                    Total: {pendientesData?.total} artículos sin estructura (Página {pendientesPage} de {pendientesData?.totalPages})
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Btn
                                        small
                                        variant="secondary"
                                        disabled={pendientesPage <= 1}
                                        onClick={() => setPendientesPage(p => p - 1)}
                                    >
                                        ◀ Anterior
                                    </Btn>
                                    <Btn
                                        small
                                        variant="secondary"
                                        disabled={pendientesPage >= (pendientesData?.totalPages || 1)}
                                        onClick={() => setPendientesPage(p => p + 1)}
                                    >
                                        Siguiente ▶
                                    </Btn>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* MODAL ASISTENTE GENERADOR DE ESTRUCTURA */}
            {modalOpen && targetArticulo && (
                <Modal
                    wide
                    title={`🌱 Asistente de Estructura / BOM: ${targetArticulo.codigo}`}
                    onClose={() => setModalOpen(false)}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>Producto Acabado Padre</span>
                                    <h3 style={{ margin: '2px 0 0', color: '#60a5fa', fontSize: '16px' }}>{targetArticulo.codigo} - {targetArticulo.descripcion}</h3>
                                </div>
                                <Badge color="#3b82f6">{targetArticulo.tipo} ({targetArticulo.unidadMedida})</Badge>
                            </div>
                        </div>

                        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '16px', background: 'rgba(59, 130, 246, 0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <input
                                    type="checkbox"
                                    id="chkPI"
                                    checked={crearPI}
                                    onChange={(e) => setCrearPI(e.target.checked)}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                <label htmlFor="chkPI" style={{ fontWeight: 700, fontSize: '14px', color: '#f3f4f6', cursor: 'pointer' }}>
                                    Paso 1: Generar Producto Intermedio de Tejeduría (PI)
                                </label>
                            </div>

                            {crearPI && (
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr 100px', gap: '12px', marginTop: '10px' }}>
                                    <Input
                                        label="Código PI Tejeduría"
                                        value={codigoPI}
                                        onChange={(v) => setCodigoPI(v)}
                                        placeholder="Ej: PI-SX4120"
                                    />
                                    <Input
                                        label="Descripción del PI"
                                        value={descripcionPI}
                                        onChange={(v) => setDescripcionPI(v)}
                                        placeholder="Ej: TEJIDO MEDIA RUNNING"
                                    />
                                    <Input
                                        label="Consumo"
                                        type="number"
                                        value={String(cantidadPI)}
                                        onChange={(v) => setCantidadPI(Number(v))}
                                    />
                                </div>
                            )}
                        </div>

                        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '16px' }}>
                            <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#f3f4f6', fontWeight: 700 }}>
                                Paso 2: Insumos e Hilados requeridos {crearPI ? `(para ${codigoPI || 'el PI'})` : '(directo al Padre)'}
                            </h4>

                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 2fr 120px 100px', gap: '12px', marginBottom: '12px' }}>
                                    <Input
                                        label="Código Componente / Hilado *"
                                        value={nuevoCodComp}
                                        onChange={(v) => setNuevoCodComp(v)}
                                        placeholder="Ej: A161NEGRO"
                                    />
                                    <Input
                                        label="Descripción del Componente"
                                        value={nuevaDescComp}
                                        onChange={(v) => setNuevaDescComp(v)}
                                        placeholder="Ej: HILADO DE ALGODON 16/1 NEGRO"
                                    />
                                    <Input
                                        label="Consumo (KG/UN) *"
                                        type="number"
                                        value={String(nuevaCantComp)}
                                        onChange={(v) => setNuevaCantComp(v === '' ? '' : Number(v))}
                                        placeholder="0.0450"
                                    />
                                    <div>
                                        <label style={{ display: 'block', color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>Tipo Var/Fijo</label>
                                        <select
                                            value={nuevoTipoFijoVar}
                                            onChange={(e) => setNuevoTipoFijoVar(e.target.value)}
                                            style={{
                                                width: '100%',
                                                background: '#0f1117',
                                                border: '1px solid #374151',
                                                borderRadius: '8px',
                                                padding: '8px 10px',
                                                color: '#f3f4f6',
                                                fontSize: '13px',
                                            }}
                                        >
                                            <option value="V">Variable (V)</option>
                                            <option value="F">Fijo (F)</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', display: 'block', marginBottom: '6px' }}>
                                        🔗 Matchear con Material de Depósito (Prioridad 1)
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <div style={{ flex: 1, position: 'relative' }}>
                                            <Input
                                                placeholder="Buscar ítem en stock de depósito (escribe al menos 2 letras)..."
                                                value={busquedaItemAlmacen}
                                                onChange={(v) => {
                                                    setBusquedaItemAlmacen(v);
                                                    if (!v) setItemAlmacenSeleccionado(null);
                                                }}
                                            />
                                            {busquedaItemAlmacen && itemsAlmacenSugeridos && itemsAlmacenSugeridos.length > 0 && !itemAlmacenSeleccionado && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    background: '#1a1d2e',
                                                    border: '1px solid #374151',
                                                    borderRadius: '8px',
                                                    zIndex: 2000,
                                                    maxHeight: '180px',
                                                    overflowY: 'auto',
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                                                }}>
                                                    {itemsAlmacenSugeridos.slice(0, 10).map((it: any) => (
                                                        <div
                                                            key={it.id}
                                                            onClick={() => {
                                                                setItemAlmacenSeleccionado({ id: it.id, codigo: it.codigoInterno, descripcion: it.descripcion });
                                                                setBusquedaItemAlmacen(`${it.codigoInterno} - ${it.descripcion}`);
                                                            }}
                                                            style={{
                                                                padding: '8px 12px',
                                                                cursor: 'pointer',
                                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                                fontSize: '12px',
                                                                color: '#f3f4f6'
                                                            }}
                                                        >
                                                            <strong style={{ color: '#10b981' }}>{it.codigoInterno}</strong> — {it.descripcion}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <Btn
                                            small
                                            onClick={handleAgregarComponente}
                                        >
                                            ➕ Agregar a la Receta
                                        </Btn>
                                    </div>
                                    {itemAlmacenSeleccionado && (
                                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#10b981' }}>
                                            ✓ Vinculado a depósito: {itemAlmacenSeleccionado.codigo} - {itemAlmacenSeleccionado.descripcion}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                                            <th style={{ padding: '6px 10px' }}>Componente</th>
                                            <th style={{ padding: '6px 10px' }}>Descripción</th>
                                            <th style={{ padding: '6px 10px', textAlign: 'right' }}>Consumo</th>
                                            <th style={{ padding: '6px 10px' }}>Ítem Depósito Vinculado</th>
                                            <th style={{ padding: '6px 10px', textAlign: 'center' }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {componentesDraft.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
                                                    Aún no se han añadido insumos a esta receta.
                                                </td>
                                            </tr>
                                        ) : (
                                            componentesDraft.map((c, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#f3f4f6' }}>
                                                        {c.codigoComponente}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', color: '#9ca3af' }}>
                                                        {c.descripcionInsumo}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                                                        {c.cantidad}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', color: c.itemDescripcion ? '#10b981' : '#6b7280' }}>
                                                        {c.itemDescripcion ? `✓ ${c.itemDescripcion}` : '— Sin matcheo —'}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => handleEliminarComponenteDraft(i)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#ef4444',
                                                                cursor: 'pointer',
                                                                fontSize: '14px',
                                                            }}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                            <Btn
                                variant="secondary"
                                onClick={() => setModalOpen(false)}
                                disabled={guardandoArbol}
                            >
                                Cancelar
                            </Btn>
                            <Btn
                                onClick={handleGuardarEstructura}
                                disabled={guardandoArbol || componentesDraft.length === 0}
                            >
                                {guardandoArbol ? 'Guardando Estructura...' : '💾 Guardar Estructura Completa'}
                            </Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
