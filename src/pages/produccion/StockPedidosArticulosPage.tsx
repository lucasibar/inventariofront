import React, { useState, useMemo } from 'react';
import { PageHeader, Card, Btn, Modal, Input } from '../../shared/ui';
import {
    useGetDepositosArticulosQuery,
    useCrearPosicionArticuloMutation,
    useListarPedidosProduccionQuery,
    useCrearPedidoProduccionMutation,
    useActualizarPedidoProduccionMutation,
    useSincronizarPlanillaConPedidosMutation,
} from '../../features/quality/ordenes-produccion/api/ordenesProduccion.api';

export default function StockPedidosArticulosPage() {
    const { data: depData, refetch: refetchDepositos } = useGetDepositosArticulosQuery();
    const { data: pedidos = [], isFetching, refetch: refetchPedidos } = useListarPedidosProduccionQuery();
    const [crearPedido] = useCrearPedidoProduccionMutation();
    const [actualizarPedido] = useActualizarPedidoProduccionMutation();
    const [crearPosicion] = useCrearPosicionArticuloMutation();
    const [sincronizarPlanilla, { isLoading: isSyncing }] = useSincronizarPlanillaConPedidosMutation();

    const [activeView, setActiveView] = useState<'pedidos' | 'depositos'>('pedidos');
    const [q, setQ] = useState('');
    const [showNewPedidoModal, setShowNewPedidoModal] = useState(false);
    const [showNewPosicionModal, setShowNewPosicionModal] = useState(false);
    const [editingPedido, setEditingPedido] = useState<any | null>(null);

    const [nuevoPedidoForm, setNuevoPedidoForm] = useState({
        numeroPedido: '',
        clienteMarca: 'ADIDAS',
        articuloCodigo: '',
        codigoSusi: '',
        talle: '',
        colorDescripcion: '',
        docenasPedidas: 100,
        docenasTejidas: 0,
        docenasCosturadas: 0,
        docenasEmpaquetadas: 0,
        posicionActual: 'TEJ-CANASTO-01',
        prioridad: 'NORMAL',
        fechaEntrega: '',
        observaciones: '',
    });

    const [nuevaPosForm, setNuevaPosForm] = useState({
        depositoId: '',
        codigo: '',
        descripcion: '',
        capacidadDocenas: 500,
    });

    const depositos = depData?.depositos || [];
    const allPosiciones = useMemo(() => {
        const list: { codigo: string; depositoNombre: string }[] = [];
        for (const d of depositos) {
            for (const p of d.posiciones || []) {
                list.push({ codigo: p.codigo, depositoNombre: d.nombre });
            }
        }
        return list;
    }, [depositos]);

    const filteredPedidos = useMemo(() => {
        if (!q.trim()) return pedidos;
        const lower = q.toLowerCase();
        return pedidos.filter(
            (p: any) =>
                (p.numero_pedido || '').toLowerCase().includes(lower) ||
                (p.articulo_codigo || '').toLowerCase().includes(lower) ||
                (p.codigo_susi || '').toLowerCase().includes(lower) ||
                (p.cliente_marca || '').toLowerCase().includes(lower) ||
                (p.posicion_actual || '').toLowerCase().includes(lower),
        );
    }, [pedidos, q]);

    const kpis = useMemo(() => {
        let pedidas = 0;
        let tejidas = 0;
        let costuradas = 0;
        let empaquetadas = 0;
        for (const p of pedidos) {
            pedidas += Number(p.docenas_pedidas) || 0;
            tejidas += Number(p.docenas_tejidas) || 0;
            costuradas += Number(p.docenas_costuradas) || 0;
            empaquetadas += Number(p.docenas_empaquetadas) || 0;
        }
        return {
            pedidas: Math.round(pedidas * 10) / 10,
            tejidas: Math.round(tejidas * 10) / 10,
            costuradas: Math.round(costuradas * 10) / 10,
            empaquetadas: Math.round(empaquetadas * 10) / 10,
            faltanteTejer: Math.max(0, Math.round((pedidas - tejidas) * 10) / 10),
            stockTejeduria: Math.max(0, Math.round((tejidas - costuradas) * 10) / 10),
            stockCostura: Math.max(0, Math.round((costuradas - empaquetadas) * 10) / 10),
        };
    }, [pedidos]);

    const handleSyncFromPlanilla = async () => {
        try {
            const res = await sincronizarPlanilla().unwrap();
            refetchPedidos();
            refetchDepositos();
            alert(`Se sincronizaron ${res.creados} pedidos nuevos y ${res.actualizados} pedidos existentes desde la última Planilla de Producción.`);
        } catch {
            alert('Error al sincronizar con la planilla de producción diaria.');
        }
    };

    const handleCreatePedido = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nuevoPedidoForm.numeroPedido || !nuevoPedidoForm.articuloCodigo) return;
        try {
            await crearPedido(nuevoPedidoForm).unwrap();
            setShowNewPedidoModal(false);
            refetchPedidos();
            refetchDepositos();
        } catch {
            alert('Error al crear el pedido de producción.');
        }
    };

    const handleSaveEditPedido = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPedido) return;
        try {
            await actualizarPedido({
                id: editingPedido.id,
                data: {
                    docenasPedidas: Number(editingPedido.docenas_pedidas),
                    docenasTejidas: Number(editingPedido.docenas_tejidas),
                    docenasCosturadas: Number(editingPedido.docenas_costuradas),
                    docenasEmpaquetadas: Number(editingPedido.docenas_empaquetadas),
                    posicionActual: editingPedido.posicion_actual,
                    estado: editingPedido.estado,
                    observaciones: editingPedido.observaciones,
                },
            }).unwrap();
            setEditingPedido(null);
            refetchPedidos();
            refetchDepositos();
        } catch {
            alert('Error al actualizar el avance del pedido.');
        }
    };

    const handleCreatePosicion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nuevaPosForm.depositoId || !nuevaPosForm.codigo) return;
        try {
            await crearPosicion(nuevaPosForm).unwrap();
            setShowNewPosicionModal(false);
            refetchDepositos();
        } catch {
            alert('Error al crear la posición de artículos.');
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader
                title="📦 Pedidos de Producción y Stock por Etapa de Artículos"
                subtitle="Control separado de Hilados/Insumos: seguimiento en docenas de cuánto se pidió, cuánto hay Tejido, Costurado y Empaquetado, y en qué depósito/posición se encuentra."
            >
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Btn
                        onClick={handleSyncFromPlanilla}
                        disabled={isSyncing}
                        style={{ fontSize: '12px', background: '#10b981' }}
                    >
                        {isSyncing ? 'Sincronizando...' : '🔄 Traer Avance desde Planilla Diaria (PDFs)'}
                    </Btn>
                    <Btn
                        onClick={() => setShowNewPedidoModal(true)}
                        style={{ fontSize: '12px' }}
                    >
                        + Nuevo Pedido de Producción
                    </Btn>
                </div>
            </PageHeader>

            {/* KPIs por Etapa Productiva */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                    gap: '12px',
                    marginBottom: '20px',
                }}
            >
                <Card style={{ padding: '14px 18px', background: 'var(--bg-secondary, #1a1d2e)' }}>
                    <div style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase' }}>
                        📑 Total Pedido
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#f3f4f6', marginTop: '4px' }}>
                        {kpis.pedidas.toLocaleString('es-AR')} doc.
                    </div>
                    <div style={{ fontSize: '11px', color: '#f87171', marginTop: '2px', fontWeight: 600 }}>
                        Falta tejer: {kpis.faltanteTejer.toLocaleString('es-AR')} doc.
                    </div>
                </Card>

                <Card style={{ padding: '14px 18px', background: 'var(--bg-secondary, #1a1d2e)' }}>
                    <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
                        🧦 Etapa 1: Tejeduría
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                        {kpis.tejidas.toLocaleString('es-AR')} doc.
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                        En Dep. Tejeduría: <strong>{kpis.stockTejeduria.toLocaleString('es-AR')} doc.</strong>
                    </div>
                </Card>

                <Card style={{ padding: '14px 18px', background: 'var(--bg-secondary, #1a1d2e)' }}>
                    <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase' }}>
                        🪡 Etapa 2: Costura / Plancha
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
                        {kpis.costuradas.toLocaleString('es-AR')} doc.
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                        En Dep. Costura: <strong>{kpis.stockCostura.toLocaleString('es-AR')} doc.</strong>
                    </div>
                </Card>

                <Card style={{ padding: '14px 18px', background: 'var(--bg-secondary, #1a1d2e)' }}>
                    <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>
                        📦 Etapa 3: Terminado (Empaque)
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                        {kpis.empaquetadas.toLocaleString('es-AR')} doc.
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                        Listo para entrega en Dep. Terminado
                    </div>
                </Card>
            </div>

            {/* Selector de Vista */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Btn
                        variant={activeView === 'pedidos' ? 'primary' : 'secondary'}
                        onClick={() => setActiveView('pedidos')}
                        style={{ fontSize: '13px' }}
                    >
                        📋 Tabla de Pedidos y Avance (Tejido / Costura / Empaque)
                    </Btn>
                    <Btn
                        variant={activeView === 'depositos' ? 'primary' : 'secondary'}
                        onClick={() => setActiveView('depositos')}
                        style={{ fontSize: '13px' }}
                    >
                        🏢 Depósitos y Posiciones de Artículos ({depositos.length})
                    </Btn>
                </div>

                {activeView === 'pedidos' ? (
                    <input
                        type="text"
                        placeholder="🔍 Buscar pedido, artículo, código Susi o posición..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        style={{
                            minWidth: '280px',
                            padding: '8px 14px',
                            background: 'var(--bg-secondary, #1a1d2e)',
                            border: '1px solid var(--border-color, #2a2d3e)',
                            borderRadius: '8px',
                            color: 'var(--text-primary, #f3f4f6)',
                            fontSize: '13px',
                        }}
                    />
                ) : (
                    <Btn
                        onClick={() => {
                            if (depositos.length > 0 && !nuevaPosForm.depositoId) {
                                setNuevaPosForm((f) => ({ ...f, depositoId: depositos[0].id }));
                            }
                            setShowNewPosicionModal(true);
                        }}
                        style={{ fontSize: '12px' }}
                    >
                        + Nueva Posición de Artículo
                    </Btn>
                )}
            </div>

            {activeView === 'pedidos' ? (
                <Card style={{ overflow: 'hidden', padding: 0, border: '1px solid var(--border-color, #2a2d3e)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                    <th style={{ padding: '12px 14px' }}>Nº Pedido / Marca</th>
                                    <th style={{ padding: '12px 14px' }}>Artículo TEJIDO / Susi</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Pedido (Doc)</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Tejido (Doc)</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Falta Tejer</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Costurado (Doc)</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Empaquetado (Doc)</th>
                                    <th style={{ padding: '12px 14px' }}>Posición Actual</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPedidos.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted, #9ca3af)' }}>
                                            {isFetching
                                                ? 'Cargando pedidos de producción...'
                                                : 'No hay pedidos cargados. Hacé clic en "🔄 Traer Avance desde Planilla Diaria" para inicializar con la producción del día.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPedidos.map((p: any) => {
                                        const pedidas = Number(p.docenas_pedidas) || 0;
                                        const tejidas = Number(p.docenas_tejidas) || 0;
                                        const costuradas = Number(p.docenas_costuradas) || 0;
                                        const empaquetadas = Number(p.docenas_empaquetadas) || 0;
                                        const faltaTejer = Math.max(0, Math.round((pedidas - tejidas) * 100) / 100);

                                        return (
                                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color, #2a2d3e)' }}>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ fontWeight: 800, color: '#a5b4fc' }}>{p.numero_pedido}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>
                                                        {p.cliente_marca || 'ADIDAS'} {p.fecha_entrega ? `· Fecha: ${p.fecha_entrega}` : ''}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ fontWeight: 700, color: '#f3f4f6' }}>{p.articulo_codigo}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)' }}>
                                                        Susi: {p.codigo_susi || '-'} · Talle: {p.talle || '-'} · {p.color_descripcion || ''}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800 }}>
                                                    {pedidas.toFixed(1)} doc
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#38bdf8' }}>
                                                    {tejidas.toFixed(1)} doc
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: faltaTejer > 0 ? '#f87171' : '#34d399' }}>
                                                    {faltaTejer > 0 ? `${faltaTejer.toFixed(1)} doc` : '🟢 Completo'}
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#fbbf24' }}>
                                                    {costuradas.toFixed(1)} doc
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#34d399' }}>
                                                    {empaquetadas.toFixed(1)} doc
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <span
                                                        style={{
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            background: 'rgba(99, 102, 241, 0.15)',
                                                            color: '#c7d2fe',
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        📍 {p.posicion_actual || 'TEJ-CANASTO-01'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                    <Btn
                                                        small
                                                        variant="secondary"
                                                        onClick={() => setEditingPedido({ ...p })}
                                                        style={{ fontSize: '11px' }}
                                                    >
                                                        ✏️ Actualizar Etapa
                                                    </Btn>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                    {depositos.map((dep: any) => (
                        <Card
                            key={dep.id}
                            style={{
                                padding: '18px 20px',
                                background: 'var(--bg-secondary, #1a1d2e)',
                                border: '1px solid var(--border-color, #2a2d3e)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 800, fontSize: '15px', color: '#a5b4fc' }}>{dep.nombre}</span>
                                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 700 }}>
                                    Etapa: {dep.etapa_asociada}
                                </span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', marginBottom: '14px' }}>
                                {dep.descripcion}
                            </div>

                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Posiciones / Canastos / Estanterías ({(dep.posiciones || []).length}):
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {(dep.posiciones || []).map((pos: any) => (
                                    <div
                                        key={pos.id}
                                        style={{
                                            padding: '8px 12px',
                                            background: 'rgba(0,0,0,0.2)',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '12px',
                                        }}
                                    >
                                        <span>
                                            <strong style={{ color: '#34d399' }}>📍 {pos.codigo}</strong> — {pos.descripcion || 'Posición de artículos'}
                                        </span>
                                        <span style={{ color: 'var(--text-muted, #9ca3af)' }}>
                                            Cap: {pos.capacidadDocenas || 500} doc.
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal Editar Avance de Pedido */}
            {editingPedido && (
                <Modal
                    onClose={() => setEditingPedido(null)}
                    title={`Actualizar Avance y Posición — ${editingPedido.articulo_codigo}`}
                >
                    <form onSubmit={handleSaveEditPedido} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Input
                            label="Docenas Pedidas Totales"
                            type="number"
                            step="0.1"
                            value={editingPedido.docenas_pedidas}
                            onChange={(e: any) => setEditingPedido({ ...editingPedido, docenas_pedidas: e.target.value })}
                        />
                        <Input
                            label="Docenas Tejidas (Etapa 1: Tejeduría)"
                            type="number"
                            step="0.1"
                            value={editingPedido.docenas_tejidas}
                            onChange={(e: any) => setEditingPedido({ ...editingPedido, docenas_tejidas: e.target.value })}
                        />
                        <Input
                            label="Docenas Costuradas / Planchadas (Etapa 2: Costura)"
                            type="number"
                            step="0.1"
                            value={editingPedido.docenas_costuradas}
                            onChange={(e: any) => setEditingPedido({ ...editingPedido, docenas_costuradas: e.target.value })}
                        />
                        <Input
                            label="Docenas Empaquetadas (Etapa 3: Producto Terminado)"
                            type="number"
                            step="0.1"
                            value={editingPedido.docenas_empaquetadas}
                            onChange={(e: any) => setEditingPedido({ ...editingPedido, docenas_empaquetadas: e.target.value })}
                        />
                        <div>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', display: 'block', marginBottom: '4px' }}>
                                Posición Actual en Depósito de Artículos
                            </label>
                            <select
                                value={editingPedido.posicion_actual || ''}
                                onChange={(e) => setEditingPedido({ ...editingPedido, posicion_actual: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: 'var(--bg-secondary, #1a1d2e)',
                                    border: '1px solid var(--border-color, #2a2d3e)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary, #f3f4f6)',
                                }}
                            >
                                {allPosiciones.map((pos) => (
                                    <option key={pos.codigo} value={pos.codigo}>
                                        {pos.codigo} ({pos.depositoNombre})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                            <Btn variant="secondary" type="button" onClick={() => setEditingPedido(null)}>
                                Cancelar
                            </Btn>
                            <Btn type="submit">💾 Guardar Avance</Btn>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal Nuevo Pedido */}
            {showNewPedidoModal && (
                <Modal onClose={() => setShowNewPedidoModal(false)} title="Nuevo Pedido de Producción">
                    <form onSubmit={handleCreatePedido} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Input
                            label="Número de Pedido / OP"
                            value={nuevoPedidoForm.numeroPedido}
                            onChange={(e: any) => setNuevoPedidoForm({ ...nuevoPedidoForm, numeroPedido: e.target.value })}
                            required
                        />
                        <Input
                            label="Código Artículo (ej: SX7664-100_L_B)"
                            value={nuevoPedidoForm.articuloCodigo}
                            onChange={(e: any) => setNuevoPedidoForm({ ...nuevoPedidoForm, articuloCodigo: e.target.value })}
                            required
                        />
                        <Input
                            label="Código Susi (ej: SX7664-100-L)"
                            value={nuevoPedidoForm.codigoSusi}
                            onChange={(e: any) => setNuevoPedidoForm({ ...nuevoPedidoForm, codigoSusi: e.target.value })}
                        />
                        <Input
                            label="Marca / Cliente"
                            value={nuevoPedidoForm.clienteMarca}
                            onChange={(e: any) => setNuevoPedidoForm({ ...nuevoPedidoForm, clienteMarca: e.target.value })}
                        />
                        <Input
                            label="Docenas Pedidas"
                            type="number"
                            step="0.1"
                            value={nuevoPedidoForm.docenasPedidas}
                            onChange={(e: any) => setNuevoPedidoForm({ ...nuevoPedidoForm, docenasPedidas: Number(e.target.value) })}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                            <Btn variant="secondary" type="button" onClick={() => setShowNewPedidoModal(false)}>
                                Cancelar
                            </Btn>
                            <Btn type="submit">Crear Pedido</Btn>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal Nueva Posición */}
            {showNewPosicionModal && (
                <Modal onClose={() => setShowNewPosicionModal(false)} title="Nueva Posición en Depósitos de Artículos">
                    <form onSubmit={handleCreatePosicion} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted, #9ca3af)', display: 'block', marginBottom: '4px' }}>
                                Depósito de Artículos
                            </label>
                            <select
                                value={nuevaPosForm.depositoId}
                                onChange={(e) => setNuevaPosForm({ ...nuevaPosForm, depositoId: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: 'var(--bg-secondary, #1a1d2e)',
                                    border: '1px solid var(--border-color, #2a2d3e)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary, #f3f4f6)',
                                }}
                            >
                                {depositos.map((d: any) => (
                                    <option key={d.id} value={d.id}>
                                        {d.nombre} ({d.etapa_asociada})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Input
                            label="Código de Posición (ej: TEJ-CANASTO-03)"
                            value={nuevaPosForm.codigo}
                            onChange={(e: any) => setNuevaPosForm({ ...nuevaPosForm, codigo: e.target.value })}
                            required
                        />
                        <Input
                            label="Descripción"
                            value={nuevaPosForm.descripcion}
                            onChange={(e: any) => setNuevaPosForm({ ...nuevaPosForm, descripcion: e.target.value })}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                            <Btn variant="secondary" type="button" onClick={() => setShowNewPosicionModal(false)}>
                                Cancelar
                            </Btn>
                            <Btn type="submit">Crear Posición</Btn>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
