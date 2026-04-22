import { useState, useMemo } from 'react';
import { useGetItemsQuery, useDeleteItemMutation } from '../features/items/api/items.api';
import { PageHeader, Card, Btn, Table, Badge, SearchBar, Spinner } from './common/ui';
import { CreateItemDialog } from '../features/remitos/ui/CreateItemDialog';

const ROT_COLORS: Record<string, string> = { ALTA: '#ef4444', MEDIA: '#f59e0b', BAJA: '#6b7280', TEMPORAL: '#a855f7' };

export default function MaterialesPage() {
    const [q, setQ] = useState('');
    const { data: items = [], isLoading } = useGetItemsQuery({});

    const filteredItems = useMemo(() => {
        if (!q) return items;
        const words = q.toLowerCase().split(' ').filter(w => w.length > 0);
        return items.filter((it: any) => {
            return words.every(word => 
                it.descripcion.toLowerCase().includes(word) || 
                it.codigoInterno.toLowerCase().includes(word) ||
                (it.supplier?.name || '').toLowerCase().includes(word) ||
                (it.category?.nombre || it.categoria || '').toLowerCase().includes(word)
            );
        });
    }, [items, q]);

    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<any>(null);

    const openCreate = () => { 
        setEditTarget(null); 
        setModalOpen(true); 
    };

    const openEdit = (item: any) => {
        setEditTarget(item); 
        setModalOpen(true);
    };

    const [deleteItem] = useDeleteItemMutation();
    
    return (
        <div className="materiales-container" style={{ padding: '24px', maxWidth: '1240px', margin: '0 auto' }}>
            <style>{`
                .materiales-container { font-family: 'Inter', sans-serif; }
                .mobile-card-grid { display: none; grid-template-columns: 1fr; gap: 16px; }
                .desktop-table { display: table; width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 12px; }
                
                @media (max-width: 1000px) {
                    .desktop-table { display: none; }
                    .mobile-card-grid { display: grid; }
                    .header-top { flex-direction: column; align-items: stretch !important; gap: 16px !important; }
                    .materiales-container { padding: 16px !important; }
                }

                .material-card {
                    background: #1a1d2e;
                    border: 1px solid #2a2d3e;
                    border-radius: 12px;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    transition: transform 0.2s, border-color 0.2s;
                }
                .material-card:hover { border-color: #6366f1; transform: translateY(-2px); }
            `}</style>

            <div className="header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <PageHeader title="Materiales" subtitle="Catálogo y gestión de ítems" />
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <SearchBar value={q} onChange={setQ} />
                    <Btn onClick={openCreate} style={{ whiteSpace: 'nowrap' }}>+ Nuevo Ítem</Btn>
                </div>
            </div>

            {/* Desktop View */}
            <div className="desktop-table">
                <Card>
                <Table
                    loading={isLoading}
                    cols={['Material', 'Proveedor', 'Categoría', 'Rotación', 'Caja', 'Lim./Caja', 'Mín / Máx', 'Unid.', 'Tono', '']}
                    rows={filteredItems.map((it: any) => [
                        <div key="mat" style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#f3f4f6', fontWeight: 600, whiteSpace: 'normal', maxWidth: '200px', lineHeight: '1.2' }}>
                                {it.categoria ? `[${it.categoria}] ` : ''}{it.descripcion}
                            </span>
                            <code style={{ color: '#a5b4fc', fontSize: '11px' }}>{it.codigoInterno}</code>
                        </div>,
                        <div key="sup" style={{ fontSize: '12px', color: '#9ca3af' }}>{it.supplier?.name || <span style={{ opacity: 0.5 }}>S/P</span>}</div>,
                        <div key="cat" style={{ fontSize: '12px', color: '#9ca3af' }}>{it.categoria}</div>,
                        <Badge key="rot" color={ROT_COLORS[it.rotacion] ?? '#6b7280'}>{it.rotacion}</Badge>,
                        <div key="box" style={{ fontSize: '12px', color: '#a5b4fc' }}>{it.boxType?.nombre || <span style={{ opacity: 0.4 }}>Sin asignar</span>}</div>,
                        <div key="lim" style={{ fontSize: '12px', color: '#e5e7eb' }}>{it.kilosPorCaja ? `${it.kilosPorCaja} kg/cj` : '—'}</div>,
                        <div key="minmax" style={{ fontSize: '12px' }}>
                            {it.stockMinimo ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{it.stockMinimo}</span> : <span style={{ color: '#4b5563' }}>—</span>}
                            <span style={{ color: '#6b7280', margin: '0 4px' }}>/</span>
                            {it.stockMaximo ? <span style={{ color: '#10b981', fontWeight: 600 }}>{it.stockMaximo}</span> : <span style={{ color: '#4b5563' }}>—</span>}
                        </div>,
                        <div key="unid" style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {it.unidadPrincipal}
                            {it.unidadSecundaria && <span style={{ opacity: 0.6 }}> / {it.unidadSecundaria}</span>}
                        </div>,
                        it.tono ? <Badge key="tono" color="#7c3aed">{it.tono}</Badge> : <span key="tono" style={{ color: '#4b5563' }}>—</span>,
                        <div key="act" style={{ display: 'flex', gap: '8px' }}>
                            <Btn small variant="secondary" onClick={() => openEdit(it)}>✏️</Btn>
                            <Btn small variant="danger" onClick={() => { if (window.confirm('¿Eliminar material?')) deleteItem(it.id); }}>🗑</Btn>
                        </div>,
                    ])}
                />
                </Card>
            </div>

            {/* Mobile View */}
            <div className="mobile-card-grid">
                {isLoading ? <Spinner /> : filteredItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#4b5563' }}>No se encontraron materiales.</div>
                ) : filteredItems.map((it: any) => (
                    <div key={it.id} className="material-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: '#f3f4f6', fontWeight: 600, fontSize: '15px' }}>
                                    {it.categoria ? `[${it.categoria}] ` : ''}{it.descripcion}
                                </span>
                                <code style={{ color: '#a5b4fc', fontSize: '12px' }}>{it.codigoInterno}</code>
                            </div>
                            <Badge color={ROT_COLORS[it.rotacion] ?? '#6b7280'}>{it.rotacion}</Badge>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <Badge color="#34d399">{it.supplier?.name || 'Sin Proveedor'}</Badge>
                            <Badge>{it.categoria}</Badge>
                            {it.boxType && <Badge color="#6366f1">📦 {it.boxType.nombre}</Badge>}
                        </div>
                        <div style={{ borderTop: '1px solid #1e2133', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '12px' }}>
                                <span style={{ color: '#6b7280' }}>Mín. Stock: </span>
                                {it.stockMinimo ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{it.stockMinimo}</span> : '—'}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Btn small variant="secondary" onClick={() => openEdit(it)}>✏️ Editar</Btn>
                                <Btn small variant="danger" onClick={() => { if (window.confirm('¿Eliminar?')) deleteItem(it.id); }}>🗑</Btn>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <CreateItemDialog 
                open={modalOpen} 
                onClose={() => setModalOpen(false)} 
                editTarget={editTarget} 
            />
        </div>
    );
}
