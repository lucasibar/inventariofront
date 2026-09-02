import { useState, useMemo } from 'react';
import {
    useGetRemitosEntradaQuery,
    useDeleteRemitoEntradaMutation,
    useLazyGetRemitoEntradaQuery
} from '../../features/warehouse/remitosEntrada/api/remitos-entrada.api';
import { useGetDepotsQuery } from '../../features/warehouse/deposito/api/deposito.api';
import { RemitoDetailModal } from '../../features/warehouse/remitos/ui/RemitoDetailModal';
import { NuevoRemitoEntradaModal } from '../../features/warehouse/remitosEntrada/ui/NuevoRemitoEntradaModal';
import { PageHeader, Card, Btn, Table, Badge, SearchBar } from '../../shared/ui';

export default function RemitosEntradaPage() {
    const { data: remitos = [], isLoading, isError } = useGetRemitosEntradaQuery();
    const { data: depots = [] } = useGetDepotsQuery();
    const [deleteRemito] = useDeleteRemitoEntradaMutation();
    const [showForm, setShowForm] = useState(false);
    const [selectedRemito, setSelectedRemito] = useState<any>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [triggerGetDetail] = useLazyGetRemitoEntradaQuery();
    const [search, setSearch] = useState('');
    const [selectedDepotId, setSelectedDepotId] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    const filteredRemitos = useMemo(() => {
        let list = remitos;
        if (selectedDepotId) {
            list = list.filter((r: any) => r.depositoId === selectedDepotId || r.deposito?.id === selectedDepotId);
        }
        if (fechaDesde) {
            list = list.filter((r: any) => new Date(r.fecha || r.date).getTime() >= new Date(fechaDesde + 'T00:00:00').getTime());
        }
        if (fechaHasta) {
            list = list.filter((r: any) => new Date(r.fecha || r.date).getTime() <= new Date(fechaHasta + 'T23:59:59').getTime());
        }

        const query = search.toLowerCase().trim();
        if (!query) return list;
        const tokens = query.split(/\s+/).filter(Boolean);

        return list.filter((r: any) => {
            const linesContent = (r.lines || []).map((l: any) => {
                const itemCode = l.codigoInterno || l.item?.codigoInterno || '';
                const itemDesc = l.descripcion || l.item?.descripcion || '';
                const itemCat = l.categoria || l.item?.categoria || l.item?.category?.nombre || '';
                const lotNum = l.lotNumber || l.batch?.lote || l.batch?.lotNumber || '';
                const itemSupplier = l.item?.supplier?.name || l.item?.supplierName || l.supplierName || l.batch?.supplier?.name || '';
                return `${itemCode} ${itemDesc} ${itemCat} ${lotNum} ${itemSupplier}`;
            }).join(' ');

            const searchableContent = [
                r.numero || '',
                r.documentId || '',
                r.id || '',
                r.partner?.name || r.supplier?.name || r.partnerName || '',
                r.partner?.taxId || r.supplierTaxId || '',
                r.observaciones || '',
                linesContent
            ].join(' ').toLowerCase();

            return tokens.every(token => searchableContent.includes(token));
        });
    }, [remitos, search, selectedDepotId, fechaDesde, fechaHasta]);

    const handleRowClick = async (remito: any) => {
        try {
            const fullRemito = await triggerGetDetail(remito.id).unwrap();
            setSelectedRemito(fullRemito);
            setShowDetail(true);
        } catch (err) {
            console.error('Error al cargar detalle del remito', err);
            setSelectedRemito(remito);
            setShowDetail(true);
        }
    };

    if (showForm) {
        return (
            <NuevoRemitoEntradaModal
                onClose={() => setShowForm(false)}
                onSuccess={() => { setShowForm(false); }}
            />
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Remitos de Entrada" subtitle="Listado y gestión de ingresos de mercadería">
                <Btn onClick={() => setShowForm(true)}>+ Nuevo Ingreso</Btn>
            </PageHeader>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Buscar por n° remito, proveedor, código, descripción o partida..."
                    />
                </div>
                <div style={{ width: '220px' }}>
                    <select
                        value={selectedDepotId}
                        onChange={e => setSelectedDepotId(e.target.value)}
                        style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 12px',
                            background: 'var(--bg-secondary, #111827)',
                            border: '1px solid var(--border-strong, #374151)',
                            borderRadius: '8px',
                            color: 'var(--text-primary, #f3f4f6)',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="">Todos los depósitos</option>
                        {depots.filter(d => d.activo !== false).map(d => (
                            <option key={d.id} value={d.id}>{d.nombre}</option>
                        ))}
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                        type="date"
                        value={fechaDesde}
                        onChange={e => setFechaDesde(e.target.value)}
                        style={{
                            height: '42px',
                            padding: '0 8px',
                            background: 'var(--bg-secondary, #111827)',
                            border: '1px solid var(--border-strong, #374151)',
                            borderRadius: '8px',
                            color: 'var(--text-primary, #f3f4f6)',
                            fontSize: '13px',
                            outline: 'none'
                        }}
                    />
                    <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '13px' }}>al</span>
                    <input
                        type="date"
                        value={fechaHasta}
                        onChange={e => setFechaHasta(e.target.value)}
                        style={{
                            height: '42px',
                            padding: '0 8px',
                            background: 'var(--bg-secondary, #111827)',
                            border: '1px solid var(--border-strong, #374151)',
                            borderRadius: '8px',
                            color: 'var(--text-primary, #f3f4f6)',
                            fontSize: '13px',
                            outline: 'none'
                        }}
                    />
                    {(fechaDesde || fechaHasta) && (
                        <button
                            onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#fb7185',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                padding: '0 4px'
                            }}
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {isError ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
                    Error al cargar los remitos. Intente nuevamente.
                </div>
            ) : remitos.length === 0 && !isLoading ? (
                <Card style={{ textAlign: 'center', padding: '60px' }}>
                    <h3 style={{ color: 'var(--text-primary, #f3f4f6)', marginBottom: '8px' }}>Todavía no hay ningún remito cargado</h3>
                    <p style={{ color: 'var(--text-muted, #9ca3af)' }}>Inicie una nueva recepción de materiales presionando el botón "+ Nuevo Ingreso".</p>
                </Card>
            ) : filteredRemitos.length === 0 && search.trim() ? (
                <Card style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: 'var(--text-muted, #9ca3af)' }}>No se encontraron remitos que coincidan con "{search}".</p>
                </Card>
            ) : (
                <Card>
                    <Table
                        loading={isLoading}
                        onRowClick={(i) => handleRowClick(filteredRemitos[i])}
                        cols={['Número', 'Fecha', 'Proveedor', 'Estado', 'Items', 'Cantidades', '']}
                        rows={filteredRemitos.map((r: any) => {
                            const lines = r.lines || [];
                            const totalPrincipal = lines.reduce((sum: number, l: any) => sum + Number(l.qtyPrincipal || 0), 0);
                            const totalSecundario = lines.reduce((sum: number, l: any) => sum + Number(l.qtySecundaria || 0), 0);
                            const isAnulado = r.status === 'ANULADO';
                            return [
                                <span key="num" style={{ color: isAnulado ? '#f87171' : '#a5b4fc', fontWeight: 600, textDecoration: isAnulado ? 'line-through' : 'none' }}>{r.numero || r.documentId}</span>,
                                new Date(r.fecha || r.date).toLocaleDateString('es-AR'),
                                r.partner?.name || r.supplier?.name || '—',
                                <Badge key="status" color={isAnulado ? '#ef4444' : '#10b981'}>{isAnulado ? 'ANULADO' : 'ACTIVO'}</Badge>,
                                <Badge key="badge">{lines.length} ítems</Badge>,
                                <div key="qty" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontWeight: 600, color: '#38bdf8', fontSize: '13px' }}>{totalPrincipal.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg</span>
                                    {totalSecundario > 0 && <span style={{ color: '#a78bfa', fontSize: '11px', fontWeight: 500 }}>{totalSecundario.toLocaleString('es-AR', { minimumFractionDigits: 0 })} un</span>}
                                </div>,
                                <div key="actions" style={{ textAlign: 'right' }}>
                                    {!isAnulado && (
                                        <Btn small variant="danger" onClick={(e: any) => {
                                            e.stopPropagation();
                                            if (window.confirm('¿Estás seguro de que querés anular este remito?')) {
                                                deleteRemito(r.id);
                                            }
                                        }}>🗑</Btn>
                                    )}
                                </div>
                            ];
                        })}
                    />
                </Card>
            )}

            <RemitoDetailModal
                open={showDetail}
                onClose={() => setShowDetail(false)}
                remito={selectedRemito}
            />
        </div>
    );
}
