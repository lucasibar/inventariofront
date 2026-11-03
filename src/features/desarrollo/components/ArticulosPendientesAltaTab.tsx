import React, { useState, useMemo } from 'react';
import { Card, Btn, Input, Badge, Select, Spinner } from '../../../shared/ui';
import type { PedidoVenta } from '../../ventas/api/ventas.api';
import {
    useGetArticulosQuery,
    type Articulo,
} from '../api/articulos.api';

interface ArticulosPendientesAltaTabProps {
    pedidosSinEstructura: PedidoVenta[];
    onOpenNewWithData: (initialData: { codigo: string; descripcion?: string; marca?: string; talle?: string; etapa?: string }) => void;
    onOpenEditArticulo: (articulo: Articulo, tab?: 'DATOS' | 'ESTRUCTURA' | 'MAQUINAS' | 'EQUIVALENCIAS') => void;
}

type SubTab = 'PEDIDOS' | 'INSUMOS_SIN_STOCK';

interface ArticuloAgrupado {
    codigo: string;
    descripcion: string;
    cliente: string;
    talle: string;
    packsTotales: number;
    paresTotales: number;
    pedidosCount: number;
    pedidosNumeros: string[];
    articuloExistente: Articulo | null;
}

export const ArticulosPendientesAltaTab: React.FC<ArticulosPendientesAltaTabProps> = ({
    pedidosSinEstructura,
    onOpenNewWithData,
    onOpenEditArticulo,
}) => {
    const [subTab, setSubTab] = useState<SubTab>('PEDIDOS');
    const [searchTerm, setSearchTerm] = useState('');
    const [clienteFiltro, setClienteFiltro] = useState('TODOS');

    // 1. Insumos sin ítem en stock
    const { data: insumosSinStockData, isLoading: loadingInsumos } = useGetArticulosQuery({
        etapa: 'INSUMO',
        alerta: 'INSUMO_SIN_ITEM',
        limit: 100,
    });

    // 2. Hilados sin ítem en stock
    const { data: hiladosSinStockData, isLoading: loadingHilados } = useGetArticulosQuery({
        etapa: 'HILADO',
        alerta: 'HILADO_SIN_ITEM',
        limit: 100,
    });

    // Agrupación y enriquecimiento de Pedidos de Ventas sin Estructura
    const articulosPedidos = useMemo<ArticuloAgrupado[]>(() => {
        const mapa = new Map<string, ArticuloAgrupado>();

        pedidosSinEstructura.forEach((p) => {
            const cod = p.articuloCodigo.trim().toUpperCase();
            const actual = mapa.get(cod) || {
                codigo: cod,
                descripcion: p.articuloDescripcion || cod,
                cliente: p.cliente || 'VARIOS',
                talle: p.talle || '',
                packsTotales: 0,
                paresTotales: 0,
                pedidosCount: 0,
                pedidosNumeros: [] as string[],
                articuloExistente: (p.articulo as any) || null,
            };

            actual.packsTotales += Number(p.packsPedidas || 0);
            actual.paresTotales += Number(p.packsPedidas || 0) * (Number(p.paresPorPack) || 1);
            actual.pedidosCount += 1;
            if (p.numeroPedido && !actual.pedidosNumeros.includes(p.numeroPedido)) {
                actual.pedidosNumeros.push(p.numeroPedido);
            }

            mapa.set(cod, actual);
        });

        return Array.from(mapa.values());
    }, [pedidosSinEstructura]);

    // Filtrado de pedidos
    const filteredPedidos = useMemo(() => {
        return articulosPedidos.filter((a) => {
            const matchesSearch =
                searchTerm === '' ||
                a.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.pedidosNumeros.some(num => num.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCliente =
                clienteFiltro === 'TODOS' ||
                a.cliente.toUpperCase() === clienteFiltro.toUpperCase();

            return matchesSearch && matchesCliente;
        });
    }, [articulosPedidos, searchTerm, clienteFiltro]);

    // Lista de insumos/hilados combinados sin ítem
    const materialesSinItem = useMemo(() => {
        const ins = insumosSinStockData?.items || [];
        const hil = hiladosSinStockData?.items || [];
        const all = [...ins, ...hil];
        if (!searchTerm) return all;
        const q = searchTerm.toLowerCase();
        return all.filter(m => m.codigo.toLowerCase().includes(q) || m.descripcion.toLowerCase().includes(q));
    }, [insumosSinStockData, hiladosSinStockData, searchTerm]);

    const totalPacksPendientes = articulosPedidos.reduce((acc, a) => acc + a.packsTotales, 0);
    const clientesDisponibles = Array.from(new Set(articulosPedidos.map((a) => a.cliente))).filter(Boolean);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Panel de Alerta y Resumen General */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(239, 68, 68, 0.15))',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '14px',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🚨</span> Artículos Pendientes de Alta & Carga Operativa
                    </h3>
                    <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#d1d5db', maxWidth: '850px' }}>
                        Consolidado inteligente de artículos que el sistema necesita para operar sin frenar la producción: 
                        artículos demandados en pedidos de venta sin ficha técnica (BOM), y avíos/hilados de catálogo pendientes de vincular con el stock real del WMS.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Artículos Pedidos</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#f87171' }}>{articulosPedidos.length}</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Packs Requeridas</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#fbbf24' }}>{totalPacksPendientes.toLocaleString('es-AR')}</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Insumos sin Stock</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#ec4899' }}>{materialesSinItem.length}</div>
                    </div>
                </div>
            </div>

            {/* Sub-Pestañas de Selección */}
            <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                <button
                    onClick={() => setSubTab('PEDIDOS')}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: subTab === 'PEDIDOS' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.08)',
                        background: subTab === 'PEDIDOS' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.02)',
                        color: subTab === 'PEDIDOS' ? '#ffffff' : '#9ca3af',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <span>📦 Requeridos en Pedidos de Ventas</span>
                    <Badge color="#ef4444">{articulosPedidos.length}</Badge>
                </button>

                <button
                    onClick={() => setSubTab('INSUMOS_SIN_STOCK')}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: subTab === 'INSUMOS_SIN_STOCK' ? '2px solid #ec4899' : '1px solid rgba(255,255,255,0.08)',
                        background: subTab === 'INSUMOS_SIN_STOCK' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255,255,255,0.02)',
                        color: subTab === 'INSUMOS_SIN_STOCK' ? '#ffffff' : '#9ca3af',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <span>🏷️ Insumos & Hilados sin Ítem Depósito</span>
                    <Badge color="#ec4899">{materialesSinItem.length}</Badge>
                </button>
            </div>

            {/* Filtros de Búsqueda */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '260px' }}>
                    <Input
                        placeholder="🔍 Buscar por código, descripción o P.O..."
                        value={searchTerm}
                        onChange={(val) => setSearchTerm(val)}
                    />
                </div>

                {subTab === 'PEDIDOS' && clientesDisponibles.length > 0 && (
                    <div style={{ width: '220px' }}>
                        <Select
                            value={clienteFiltro}
                            onChange={(val) => setClienteFiltro(val)}
                            options={[
                                { value: 'TODOS', label: 'Todos los Clientes' },
                                ...clientesDisponibles.map(c => ({ value: c, label: c })),
                            ]}
                        />
                    </div>
                )}
            </div>

            {/* Contenido: 1. Artículos Requeridos en Pedidos */}
            {subTab === 'PEDIDOS' && (
                <Card>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '12px 14px' }}>Código Artículo</th>
                                    <th style={{ padding: '12px 14px' }}>Cliente / Marca</th>
                                    <th style={{ padding: '12px 14px' }}>Talle</th>
                                    <th style={{ padding: '12px 14px' }}>Demanda en Pedidos</th>
                                    <th style={{ padding: '12px 14px' }}>P.O. Asociadas</th>
                                    <th style={{ padding: '12px 14px' }}>Diagnóstico</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Acción Inmediata</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPedidos.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '40px 14px', textAlign: 'center', color: '#9ca3af' }}>
                                            🎉 ¡Excelente! No se encontraron artículos pendientes de alta en este filtro.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPedidos.map((a) => {
                                        const existeEnCatalogo = !!a.articuloExistente;
                                        return (
                                            <tr
                                                key={a.codigo}
                                                style={{
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                    transition: 'background 0.15s',
                                                }}
                                            >
                                                <td style={{ padding: '14px' }}>
                                                    <div style={{ fontWeight: 800, color: '#f3f4f6', fontFamily: 'monospace', fontSize: '14px' }}>
                                                        {a.codigo}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                                        {a.descripcion}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px' }}>
                                                    <Badge color="#3b82f6">{a.cliente}</Badge>
                                                </td>
                                                <td style={{ padding: '14px', fontWeight: 700, color: '#d1d5db' }}>
                                                    {a.talle || '-'}
                                                </td>
                                                <td style={{ padding: '14px' }}>
                                                    <div style={{ fontWeight: 800, color: '#fbbf24' }}>
                                                        {a.packsTotales.toLocaleString('es-AR')} packs
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                                        ({a.paresTotales.toLocaleString('es-AR')} pares) en {a.pedidosCount} pedido(s)
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px' }}>
                                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '240px' }}>
                                                        {a.pedidosNumeros.slice(0, 3).map((num) => (
                                                            <span
                                                                key={num}
                                                                style={{
                                                                    fontSize: '10px',
                                                                    background: 'rgba(255,255,255,0.06)',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    color: '#e5e7eb',
                                                                }}
                                                            >
                                                                {num}
                                                            </span>
                                                        ))}
                                                        {a.pedidosNumeros.length > 3 && (
                                                            <span style={{ fontSize: '10px', color: '#9ca3af', padding: '2px 4px' }}>
                                                                +{a.pedidosNumeros.length - 3} más
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px' }}>
                                                    {existeEnCatalogo ? (
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            color: '#fbbf24',
                                                            background: 'rgba(245, 158, 11, 0.15)',
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                        }}>
                                                            ⚠️ Existe en Catálogo, Falta BOM
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            color: '#f87171',
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                        }}>
                                                            🔴 Artículo No Creado
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '14px', textAlign: 'right' }}>
                                                    {existeEnCatalogo ? (
                                                        <Btn
                                                            variant="primary"
                                                            small
                                                            onClick={() => onOpenEditArticulo(a.articuloExistente!, 'ESTRUCTURA')}
                                                        >
                                                            🛠️ Armar Receta BOM
                                                        </Btn>
                                                    ) : (
                                                        <button
                                                            onClick={() => onOpenNewWithData({
                                                                codigo: a.codigo,
                                                                descripcion: a.descripcion !== a.codigo ? a.descripcion : '',
                                                                marca: a.cliente,
                                                                talle: a.talle,
                                                                etapa: 'TERMINADO',
                                                            })}
                                                            style={{
                                                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                                                color: '#ffffff',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                padding: '6px 12px',
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                            }}
                                                        >
                                                            ➕ Crear Artículo
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Contenido: 2. Insumos y Hilados sin Ítem en Stock */}
            {subTab === 'INSUMOS_SIN_STOCK' && (
                <Card>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '12px 14px' }}>Código Insumo / Hilado</th>
                                    <th style={{ padding: '12px 14px' }}>Descripción Técnica</th>
                                    <th style={{ padding: '12px 14px' }}>Etapa</th>
                                    <th style={{ padding: '12px 14px' }}>Estado Stock WMS</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingInsumos || loadingHilados ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}>
                                            <Spinner />
                                        </td>
                                    </tr>
                                ) : materialesSinItem.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '40px 14px', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>
                                            🎉 ¡Impecable! Todos los insumos e hilados tienen ítems físicos asignados en depósito.
                                        </td>
                                    </tr>
                                ) : (
                                    materialesSinItem.map((m) => (
                                        <tr
                                            key={m.id}
                                            style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                transition: 'background 0.15s',
                                            }}
                                        >
                                            <td style={{ padding: '14px', fontWeight: 800, color: '#f3f4f6', fontFamily: 'monospace' }}>
                                                {m.codigo}
                                            </td>
                                            <td style={{ padding: '14px', color: '#d1d5db' }}>
                                                {m.descripcion}
                                            </td>
                                            <td style={{ padding: '14px' }}>
                                                <Badge color={m.etapa === 'HILADO' ? '#f59e0b' : '#ec4899'}>
                                                    {m.etapa}
                                                </Badge>
                                            </td>
                                            <td style={{ padding: '14px' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    color: '#f87171',
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    fontWeight: 700,
                                                }}>
                                                    🔴 Sin Ítem Asignado
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px', textAlign: 'right' }}>
                                                <Btn
                                                    variant="secondary"
                                                    small
                                                    onClick={() => onOpenEditArticulo(m, 'EQUIVALENCIAS')}
                                                >
                                                    🔗 Vincular a Ítem Stock
                                                </Btn>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};
