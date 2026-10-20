import { useState } from 'react';
import {
    useGetEquivalenciasMaestroQuery,
    useGetArticuloEquivalenciasQuery,
    useAsociarItemMutation,
    useReordenarPrioridadesMutation,
    useDesasociarItemMutation,
    useBuscarItemsParaVincularQuery,
    type ArticuloMaestroEquivalencia,
} from '../../features/desarrollo/api/articulos.api';
import { PageHeader, Card, Btn, Input, Select, Badge, useIsMobile } from '../../shared/ui';

export function EquivalenciasPage() {
    const isMobile = useIsMobile();

    // Filtros de búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [etapaFiltro, setEtapaFiltro] = useState('HILADO');
    const [estadoFiltro, setEstadoFiltro] = useState<'TODOS' | 'MAPEOS' | 'SIN_MAPEO'>('TODOS');
    const [page, setPage] = useState(1);

    // Artículo seleccionado
    const [selectedArticulo, setSelectedArticulo] = useState<ArticuloMaestroEquivalencia | null>(null);

    // Búsqueda de nuevo ítem para vincular
    const [itemSearchTerm, setItemSearchTerm] = useState('');
    const [selectedItemToAdd, setSelectedItemToAdd] = useState<any | null>(null);
    const [factorConversion, setFactorConversion] = useState(1.0);
    const [observacionesInput, setObservacionesInput] = useState('');

    // Consultas RTK
    const { data: maestroData, isLoading: loadingMaestro } = useGetEquivalenciasMaestroQuery({
        search: searchTerm,
        etapa: etapaFiltro,
        soloMapeados: estadoFiltro === 'MAPEOS',
        soloSinMapear: estadoFiltro === 'SIN_MAPEO',
        page,
        limit: 30,
    });

    const { data: equivalencias, isLoading: loadingEquivalencias } = useGetArticuloEquivalenciasQuery(
        selectedArticulo?.id || '',
        { skip: !selectedArticulo }
    );

    const { data: itemsCandidatos } = useBuscarItemsParaVincularQuery(
        { q: itemSearchTerm },
        { skip: itemSearchTerm.trim().length < 2 }
    );

    const [asociarItem, { isLoading: asociando }] = useAsociarItemMutation();
    const [reordenarPrioridades, { isLoading: reordenando }] = useReordenarPrioridadesMutation();
    const [desasociarItem, { isLoading: desasociando }] = useDesasociarItemMutation();

    const etapaOptions = [
        { value: 'HILADO', label: '🧶 HILADO (54 Hilados de Libro1)' },
        { value: 'INSUMO', label: '📦 INSUMO (Packaging / Etiquetas)' },
        { value: 'MATERIALES_BOM', label: '🔗 Todos Materiales BOM (Hilados + Insumos)' },
        { value: 'TODOS', label: 'Todos los artículos' },
    ];

    const estadoOptions = [
        { value: 'TODOS', label: 'Todos los artículos' },
        { value: 'MAPEOS', label: '✓ Con ítems en depósito' },
        { value: 'SIN_MAPEO', label: '⚠ En alerta (sin ítem en depósito)' },
    ];

    const handleMoverPrioridad = async (indexActual: number, direccion: 'ARRIBA' | 'ABAJO') => {
        if (!selectedArticulo || !equivalencias) return;
        const nuevoIndex = direccion === 'ARRIBA' ? indexActual - 1 : indexActual + 1;
        if (nuevoIndex < 0 || nuevoIndex >= equivalencias.length) return;

        const copia = [...equivalencias];
        const [removido] = copia.splice(indexActual, 1);
        copia.splice(nuevoIndex, 0, removido);

        const equivalenciaIds = copia.map((c) => c.id);
        try {
            await reordenarPrioridades({
                articuloId: selectedArticulo.id,
                equivalenciaIds,
            }).unwrap();
        } catch (err: any) {
            alert('Error reordenando prioridades: ' + (err?.data?.message || err.message));
        }
    };

    const handleDesvincular = async (id: string, codigoItem: string) => {
        if (!window.confirm(`¿Estás seguro de terminar la conexión con el ítem "${codigoItem}"?`)) return;
        try {
            await desasociarItem(id).unwrap();
        } catch (err: any) {
            alert('Error desvinculando ítem: ' + (err?.data?.message || err.message));
        }
    };

    const handleVincularItem = async () => {
        if (!selectedArticulo || !selectedItemToAdd) return;
        try {
            await asociarItem({
                articuloId: selectedArticulo.id,
                itemId: selectedItemToAdd.id,
                ordenPrioridad: (equivalencias?.length || 0) + 1,
                factorConversion,
                observaciones: observacionesInput.trim() || undefined,
            }).unwrap();

            setItemSearchTerm('');
            setSelectedItemToAdd(null);
            setObservacionesInput('');
            setFactorConversion(1.0);
        } catch (err: any) {
            alert('Error vinculando ítem: ' + (err?.data?.message || err.message));
        }
    };

    return (
        <div style={{ padding: isMobile ? '12px' : '20px', maxWidth: '1500px', margin: '0 auto' }}>
            <PageHeader
                title="🧶 Conexión de Hilados e Insumos con Ítems del Depósito"
                subtitle="Vincula cada Artículo de Hilado/Insumo con los códigos reales del depósito físico, elimina conexiones o define el orden de prioridad de consumo"
            />

            {/* Barra de Filtros */}
            <Card style={{ marginBottom: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 250px' }}>
                        <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>
                            Buscar Hilado o Insumo (Código o Descripción)
                        </label>
                        <Input
                            placeholder="Ej: A161BLANCO, L140302, N70202, PRIMEPINK..."
                            value={searchTerm}
                            onChange={(val) => {
                                setSearchTerm(val);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div style={{ width: isMobile ? '100%' : '280px' }}>
                        <Select
                            label="Etapa / Categoría"
                            value={etapaFiltro}
                            options={etapaOptions}
                            onChange={(val) => {
                                setEtapaFiltro(val);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div style={{ width: isMobile ? '100%' : '230px' }}>
                        <Select
                            label="Estado de Conexión"
                            value={estadoFiltro}
                            options={estadoOptions}
                            onChange={(val) => {
                                setEstadoFiltro(val as any);
                                setPage(1);
                            }}
                        />
                    </div>
                </div>
            </Card>

            {/* Layout Master - Detail */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '440px 1fr',
                gap: '16px',
                alignItems: 'start',
            }}>
                {/* PANEL IZQUIERDO: Listado Maestro */}
                <Card style={{ padding: '16px', maxHeight: '780px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f3f4f6' }}>
                            Artículos ({maestroData?.total || 0})
                        </h3>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                            Pág. {page} de {maestroData?.totalPages || 1}
                        </span>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                        {loadingMaestro ? (
                            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>Cargando catálogo...</p>
                        ) : maestroData?.items?.length === 0 ? (
                            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No se encontraron artículos con estos filtros.</p>
                        ) : (
                            maestroData?.items?.map((art) => {
                                const isSelected = selectedArticulo?.id === art.id;
                                return (
                                    <div
                                        key={art.id}
                                        onClick={() => setSelectedArticulo(art)}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            marginBottom: '8px',
                                            cursor: 'pointer',
                                            backgroundColor: isSelected
                                                ? 'rgba(59, 130, 246, 0.15)'
                                                : !art.mapeado
                                                ? 'rgba(245, 158, 11, 0.06)'
                                                : 'rgba(255, 255, 255, 0.03)',
                                            border: isSelected
                                                ? '1px solid #3b82f6'
                                                : !art.mapeado
                                                ? '1px solid rgba(245, 158, 11, 0.35)'
                                                : '1px solid rgba(255, 255, 255, 0.06)',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 700, color: isSelected ? '#60a5fa' : '#f9fafb', fontSize: '13px' }}>
                                                {art.codigo}
                                            </span>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                {(art.estructurasQueLoUsan || 0) > 0 && (
                                                    <Badge color="#6366f1">
                                                        🧬 {art.estructurasQueLoUsan} recetas
                                                    </Badge>
                                                )}
                                                {art.mapeado ? (
                                                    <Badge color="#10b981">
                                                        ✓ {art.itemsAsignadosCount} {art.itemsAsignadosCount === 1 ? 'ítem' : 'ítems'}
                                                    </Badge>
                                                ) : (
                                                    <Badge color="#f59e0b">
                                                        ⚠ Sin ítem en depósito
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#d1d5db', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                            {art.descripcion}
                                        </div>
                                        {art.itemPrincipal ? (
                                            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>
                                                ★ Prioridad #1: {art.itemPrincipal}
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '4px' }}>
                                                ⚠ Color/material aún sin ingreso en depósito (permitido con alerta)
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Paginación simple */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <Btn
                            small
                            variant="secondary"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            ← Anterior
                        </Btn>
                        <Btn
                            small
                            variant="secondary"
                            disabled={!maestroData || page >= maestroData.totalPages}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Siguiente →
                        </Btn>
                    </div>
                </Card>

                {/* PANEL DERECHO: Detalle de Prioridades */}
                <div>
                    {!selectedArticulo ? (
                        <Card style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👈</div>
                            <h3 style={{ color: '#f3f4f6', margin: '0 0 8px 0' }}>Selecciona un hilado o insumo</h3>
                            <p style={{ margin: 0, fontSize: '13px' }}>
                                Haz clic en cualquier artículo de la lista izquierda para ver los ítems físicos del depósito que tiene asociados, cambiar el orden de prioridad de proveedores o agregar nuevas conexiones.
                            </p>
                        </Card>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Ficha del Artículo */}
                            <Card style={{ padding: '16px', borderLeft: '4px solid #3b82f6' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f9fafb' }}>
                                                {selectedArticulo.codigo}
                                            </h2>
                                            <Badge color="#f59e0b">{selectedArticulo.etapa || selectedArticulo.tipo}</Badge>
                                            <Badge color="#9ca3af">Unidad: {selectedArticulo.unidadMedida || 'KG'}</Badge>
                                            {(selectedArticulo.estructurasQueLoUsan || 0) > 0 && (
                                                <Badge color="#6366f1">
                                                    Usado en {selectedArticulo.estructurasQueLoUsan} estructuras BOM
                                                </Badge>
                                            )}
                                        </div>
                                        <p style={{ margin: '4px 0 0 0', color: '#d1d5db', fontSize: '13px' }}>
                                            {selectedArticulo.descripcion}
                                        </p>
                                    </div>
                                    <div>
                                        <Badge color={(equivalencias?.length || 0) > 0 ? '#10b981' : '#f59e0b'}>
                                            {(equivalencias?.length || 0) > 0
                                                ? `Conectado (${equivalencias?.length} ítems)`
                                                : '⚠ Alerta: Sin ítem en depósito'}
                                        </Badge>
                                    </div>
                                </div>
                            </Card>

                            {/* Lista de Ítems Vinculados con Prioridad */}
                            <Card style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f3f4f6' }}>
                                            Ítems del Depósito Conectados (Orden de Prioridad)
                                        </h3>
                                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9ca3af' }}>
                                            Usa las flechas ▲ / ▼ para ordenar qué proveedor/partida consumir primero, o el botón ✕ para terminar una conexión.
                                        </p>
                                    </div>
                                </div>

                                {loadingEquivalencias ? (
                                    <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>Cargando conexiones...</p>
                                ) : !equivalencias || equivalencias.length === 0 ? (
                                    <div style={{
                                        padding: '24px',
                                        textAlign: 'center',
                                        backgroundColor: 'rgba(234, 179, 8, 0.08)',
                                        border: '1px dashed rgba(234, 179, 8, 0.4)',
                                        borderRadius: '8px',
                                    }}>
                                        <p style={{ color: '#fbbf24', margin: '0 0 4px', fontWeight: 700 }}>
                                            ⚠️ Alerta activa: Este hilado/insumo todavía no tiene un ítem físico vinculado en el depósito.
                                        </p>
                                        <p style={{ color: '#d1d5db', fontSize: '12px', margin: 0 }}>
                                            El artículo puede usarse normalmente en las estructuras BOM. Cuando el depósito dé de alta el ítem, búscalo aquí abajo y vincúlalo para quitar la alerta automáticamente.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {equivalencias.map((equiv, idx) => {
                                            const esPrimero = idx === 0;
                                            const esUltimo = idx === equivalencias.length - 1;
                                            const stock = Number(equiv.stockActual || 0);

                                            return (
                                                <div
                                                    key={equiv.id}
                                                    style={{
                                                        padding: '12px 14px',
                                                        borderRadius: '8px',
                                                        backgroundColor: equiv.esPrincipal ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                                        border: equiv.esPrincipal ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        flexWrap: 'wrap',
                                                        gap: '12px',
                                                    }}
                                                >
                                                    {/* Prioridad y Datos */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '240px' }}>
                                                        <div style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '50%',
                                                            backgroundColor: equiv.esPrincipal ? '#10b981' : '#374151',
                                                            color: '#fff',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 800,
                                                            fontSize: '13px',
                                                            flexShrink: 0,
                                                        }}>
                                                            {equiv.ordenPrioridad}
                                                        </div>

                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                <span style={{ fontWeight: 700, color: '#f9fafb', fontSize: '14px' }}>
                                                                    {equiv.codigoItem}
                                                                </span>
                                                                {equiv.esPrincipal && (
                                                                    <Badge color="#10b981">
                                                                        ★ Prioridad #1
                                                                    </Badge>
                                                                )}
                                                                {equiv.item?.categoria && (
                                                                    <Badge color="#9ca3af">
                                                                        {equiv.item.categoria}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#d1d5db', marginTop: '2px' }}>
                                                                {equiv.item?.descripcion}
                                                                {equiv.item?.supplierName && ` • Proveedor: ${equiv.item.supplierName}`}
                                                            </div>
                                                            {equiv.observaciones && (
                                                                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', fontStyle: 'italic' }}>
                                                                    {equiv.observaciones}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Stock y Acciones */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Stock Depósito</div>
                                                            <div style={{
                                                                fontWeight: 700,
                                                                fontSize: '14px',
                                                                color: stock > 0 ? '#10b981' : '#ef4444',
                                                            }}>
                                                                {stock.toLocaleString()} {equiv.item?.unidadPrincipal || ''}
                                                            </div>
                                                        </div>

                                                        {/* Flechas Subir / Bajar */}
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            <Btn
                                                                small
                                                                variant="secondary"
                                                                disabled={esPrimero || reordenando}
                                                                title="Subir prioridad (consumir antes)"
                                                                onClick={() => handleMoverPrioridad(idx, 'ARRIBA')}
                                                                style={{ padding: '4px 8px' }}
                                                            >
                                                                ▲
                                                            </Btn>
                                                            <Btn
                                                                small
                                                                variant="secondary"
                                                                disabled={esUltimo || reordenando}
                                                                title="Bajar prioridad (consumir después)"
                                                                onClick={() => handleMoverPrioridad(idx, 'ABAJO')}
                                                                style={{ padding: '4px 8px' }}
                                                            >
                                                                ▼
                                                            </Btn>
                                                        </div>

                                                        {/* Desvincular */}
                                                        <Btn
                                                            small
                                                            variant="danger"
                                                            disabled={desasociando}
                                                            title="Terminar conexión"
                                                            onClick={() => handleDesvincular(equiv.id, equiv.codigoItem)}
                                                            style={{ padding: '4px 8px' }}
                                                        >
                                                            ✕ Quitar
                                                        </Btn>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>

                            {/* Sección para Vincular Nuevo Ítem */}
                            <Card style={{ padding: '16px', backgroundColor: 'rgba(59, 130, 246, 0.03)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#60a5fa' }}>
                                    ➕ Crear nueva conexión con un ítem del depósito
                                </h3>
                                <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#9ca3af' }}>
                                    Busca en el catálogo del depósito de hilados/insumos por código interno o descripción (ej: A16/1RO, N70/24/2, goma, bold gold...).
                                </p>

                                <div style={{ position: 'relative', marginBottom: '12px' }}>
                                    <Input
                                        placeholder="Escribe al menos 2 letras para buscar en el depósito..."
                                        value={itemSearchTerm}
                                        onChange={(val) => {
                                            setItemSearchTerm(val);
                                            if (!val) setSelectedItemToAdd(null);
                                        }}
                                    />

                                    {/* Dropdown de resultados */}
                                    {itemSearchTerm.trim().length >= 2 && itemsCandidatos && itemsCandidatos.length > 0 && !selectedItemToAdd && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            zIndex: 20,
                                            backgroundColor: '#1f2937',
                                            border: '1px solid #374151',
                                            borderRadius: '8px',
                                            maxHeight: '240px',
                                            overflowY: 'auto',
                                            marginTop: '4px',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                                        }}>
                                            {itemsCandidatos.slice(0, 20).map((cand) => (
                                                <div
                                                    key={cand.id}
                                                    onClick={() => {
                                                        setSelectedItemToAdd(cand);
                                                        setItemSearchTerm(`${cand.codigoInterno} - ${cand.descripcion}`);
                                                    }}
                                                    style={{
                                                        padding: '8px 12px',
                                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                    }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#374151')}
                                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                                >
                                                    <div>
                                                        <span style={{ fontWeight: 700, color: '#f3f4f6' }}>{cand.codigoInterno}</span>
                                                        <span style={{ color: '#9ca3af', fontSize: '12px', marginLeft: '8px' }}>{cand.descripcion}</span>
                                                    </div>
                                                    <span style={{ fontSize: '11px', color: '#10b981' }}>{cand.unidadPrincipal}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {selectedItemToAdd && (
                                    <div style={{
                                        padding: '12px',
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        borderRadius: '8px',
                                        marginBottom: '12px',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '12px',
                                        alignItems: 'center',
                                    }}>
                                        <div style={{ flex: 1, minWidth: '200px' }}>
                                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Ítem seleccionado para asociar:</div>
                                            <div style={{ fontWeight: 700, color: '#10b981' }}>
                                                {selectedItemToAdd.codigoInterno} — {selectedItemToAdd.descripcion}
                                            </div>
                                        </div>

                                        <div style={{ width: '120px' }}>
                                            <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block' }}>Factor conv.</label>
                                            <Input
                                                value={String(factorConversion)}
                                                onChange={(val) => setFactorConversion(Number(val) || 1.0)}
                                            />
                                        </div>

                                        <div style={{ flex: '1 1 200px' }}>
                                            <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block' }}>Observaciones (opcional)</label>
                                            <Input
                                                placeholder="Ej: Proveedor alternativo, partida 2026..."
                                                value={observacionesInput}
                                                onChange={(val) => setObservacionesInput(val)}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', gap: '6px', marginTop: '16px' }}>
                                            <Btn
                                                variant="secondary"
                                                onClick={() => {
                                                    setSelectedItemToAdd(null);
                                                    setItemSearchTerm('');
                                                }}
                                            >
                                                Cancelar
                                            </Btn>
                                            <Btn
                                                variant="primary"
                                                disabled={asociando}
                                                onClick={handleVincularItem}
                                            >
                                                {asociando ? 'Vinculando...' : '🔗 Confirmar Conexión'}
                                            </Btn>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
