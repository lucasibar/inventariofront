import { useState } from 'react';
import {
    useGetArticuloEstructurasQuery,
    useGetArticulosQuery,
    useGetPendientesEstructuraQuery,
    useCrearArbolEstructuraMutation,
    useBuscarItemsParaVincularQuery,
} from '../../features/desarrollo/api/articulos.api';
import { PageHeader, Card, Input, Badge, Btn, Modal, Spinner, useIsMobile } from '../../shared/ui';

interface ComponenteDraft {
    codigoComponente: string;
    descripcionInsumo: string;
    cantidad: number;
    tipoFijoVariable: string;
    itemIdEquivalente?: string;
    itemDescripcion?: string;
    ordenPrioridad: number;
}

export function EstructurasPage() {
    const isMobile = useIsMobile();

    // Tab principal: 'VISUALIZADOR' | 'PENDIENTES'
    const [activeTab, setActiveTab] = useState<'VISUALIZADOR' | 'PENDIENTES'>('VISUALIZADOR');

    // Estado Visualizador
    const [parentCodeSearch, setParentCodeSearch] = useState('');
    const [selectedParentCode, setSelectedParentCode] = useState('');

    // Estado Pendientes
    const [pendientesSearch, setPendientesSearch] = useState('');
    const [pendientesTipo, setPendientesTipo] = useState('PA');
    const [pendientesPage, setPendientesPage] = useState(1);

    // Modal Crear Estructura
    const [modalOpen, setModalOpen] = useState(false);
    const [targetArticulo, setTargetArticulo] = useState<any>(null);

    // Formulario de Asistente
    const [crearPI, setCrearPI] = useState(true);
    const [codigoPI, setCodigoPI] = useState('');
    const [descripcionPI, setDescripcionPI] = useState('');
    const [cantidadPI, setCantidadPI] = useState(1);

    // Lista de componentes a agregar
    const [componentesDraft, setComponentesDraft] = useState<ComponenteDraft[]>([]);

    // Formulario de nuevo componente
    const [nuevoCodComp, setNuevoCodComp] = useState('');
    const [nuevaDescComp, setNuevaDescComp] = useState('');
    const [nuevaCantComp, setNuevaCantComp] = useState<number | ''>('');
    const [nuevoTipoFijoVar, setNuevoTipoFijoVar] = useState('V');
    const [busquedaItemAlmacen, setBusquedaItemAlmacen] = useState('');
    const [itemAlmacenSeleccionado, setItemAlmacenSeleccionado] = useState<{ id: string; codigo: string; descripcion: string } | null>(null);

    // Consultas RTK
    const { data: articulosData } = useGetArticulosQuery({
        search: parentCodeSearch,
        limit: 25,
    });

    const { data: estructuras, isLoading: loadingBOM } = useGetArticuloEstructurasQuery(
        selectedParentCode,
        { skip: !selectedParentCode }
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

    const abrirModalAsistente = (art: any) => {
        setTargetArticulo(art);
        // Sugerir código PI estándar (ej: "PI-" + código o reemplazar prefijo)
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

            alert(`✅ Estructura creada con éxito para ${targetArticulo.codigo}`);
            setModalOpen(false);
            refetchPendientes();
            // Cambiar vista al visualizador del artículo recién creado
            setSelectedParentCode(targetArticulo.codigo);
            setActiveTab('VISUALIZADOR');
        } catch (error: any) {
            alert(`❌ Error al crear estructura: ${error?.data?.message || error.message || 'Error desconocido'}`);
        }
    };

    return (
        <div style={{ padding: isMobile ? '12px' : '20px', maxWidth: '1400px', margin: '0 auto' }}>
            <PageHeader
                title="🌳 Ficha Técnica & Estructuras de Producto (BOM)"
                subtitle="Explosión multinivel de componentes, insumos, tejeduría (PI) y equivalencias de depósito"
            >
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Btn
                        variant={activeTab === 'VISUALIZADOR' ? 'primary' : 'secondary'}
                        onClick={() => setActiveTab('VISUALIZADOR')}
                    >
                        🔍 Ver Estructuras
                    </Btn>
                    <Btn
                        variant={activeTab === 'PENDIENTES' ? 'primary' : 'secondary'}
                        onClick={() => setActiveTab('PENDIENTES')}
                    >
                        ⚠️ Pendientes de Estructura {pendientesData?.total ? `(${pendientesData.total})` : ''}
                    </Btn>
                </div>
            </PageHeader>

            {/* TAB: VISUALIZADOR */}
            {activeTab === 'VISUALIZADOR' && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '380px 1fr',
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
                                Artículos pedidos o importados que aún no tienen receta de tejeduría (PI) o hilados asignados.
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
                                                <Btn
                                                    small
                                                    onClick={() => abrirModalAsistente(art)}
                                                >
                                                    ✨ Generar Estructura
                                                </Btn>
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
                        {/* Cabecera del Artículo Padre */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>Producto Acabado Padre</span>
                                    <h3 style={{ margin: '2px 0 0', color: '#60a5fa', fontSize: '16px' }}>{targetArticulo.codigo} - {targetArticulo.descripcion}</h3>
                                </div>
                                <Badge color="#3b82f6">{targetArticulo.tipo} ({targetArticulo.unidadMedida})</Badge>
                            </div>
                        </div>

                        {/* Paso 1: Producto Intermedio (Tejeduría) */}
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

                        {/* Paso 2: Explosión de Componentes / Hilados */}
                        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '16px' }}>
                            <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#f3f4f6', fontWeight: 700 }}>
                                Paso 2: Insumos e Hilados requeridos {crearPI ? `(para ${codigoPI || 'el PI'})` : '(directo al Padre)'}
                            </h4>

                            {/* Formulario para agregar componente */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 2fr 120px 100px', gap: '12px', marginBottom: '12px' }}>
                                    <Input
                                        label="Código Componente / Hilado *"
                                        value={nuevoCodComp}
                                        onChange={(v) => setNuevoCodComp(v)}
                                        placeholder="Ej: HIL-ALG-24/1-CRU"
                                    />
                                    <Input
                                        label="Descripción del Componente"
                                        value={nuevaDescComp}
                                        onChange={(v) => setNuevaDescComp(v)}
                                        placeholder="Ej: ALGODON 24/1 CRUDO"
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

                                {/* Matcheo opcional con Depósito */}
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
                                            {/* Dropdown sugerencias */}
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

                            {/* Tabla de componentes agregados */}
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

                        {/* Botones de acción */}
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
