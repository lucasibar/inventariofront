import { useState, useMemo } from 'react';
import { useGetArticulosQuery, useDeleteArticuloMutation } from '../../features/quality/articulos/api/articulos.api';
import { PageHeader, Card, Btn, Table, Badge, SearchBar, Spinner } from '../../shared/ui';
import { CreateArticuloDialog } from '../../features/quality/articulos/components/CreateArticuloDialog';

const ROL_LABELS: Record<string, string> = {
    COLOR_BASE: '🎨 Base',
    LOGO: '🏷️ Logo',
    DETALLE_MEDIA: '🧷 Detalle',
    COLOR_TALLE: '🎨 C.Talle',
    TRIANGULO: '🔺 Triáng.',
    TALON_PUNTERA: '👟 Talón/P.',
};

export default function ArticulosCalidadPage() {
    const [q, setQ] = useState('');
    const { data: articulos = [], isLoading } = useGetArticulosQuery({});
    const [deleteArticulo] = useDeleteArticuloMutation();

    const filtered = useMemo(() => {
        if (!q) return articulos;
        const words = q.toLowerCase().split(' ').filter(w => w.length > 0);
        return articulos.filter((a: any) =>
            words.every(word =>
                a.codigo.toLowerCase().includes(word) ||
                a.descripcion.toLowerCase().includes(word) ||
                (a.categoria?.nombre || '').toLowerCase().includes(word) ||
                (a.talle || '').toLowerCase().includes(word)
            )
        );
    }, [articulos, q]);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<any>(null);

    const handleNew = () => { setEditTarget(null); setIsDialogOpen(true); };
    const handleEdit = (a: any) => { setEditTarget(a); setIsDialogOpen(true); };
    const handleClose = () => { setIsDialogOpen(false); setEditTarget(null); };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que querés eliminar este artículo?')) return;
        try {
            await deleteArticulo(id).unwrap();
        } catch {
            alert('Error al eliminar el artículo.');
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader
                title="Artículos de Calidad"
                subtitle="Catálogo maestro de artículos. Hacé clic en cualquier artículo para ver y editar su información."
            >
                <Btn onClick={handleNew}>+ Nuevo Artículo</Btn>
            </PageHeader>

            <Card style={{ marginBottom: '20px' }}>
                <SearchBar
                    value={q}
                    onChange={setQ}
                    placeholder="Filtrar por código, descripción, categoría o talle..."
                />
            </Card>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}><Spinner /></div>
            ) : (
                <Card>
                    <Table
                        cols={['Código', 'Descripción & Categoría', 'Insumos', 'Talle & Media', 'Máquinas', 'Acciones']}
                        onRowClick={(index) => handleEdit(filtered[index])}
                        rows={filtered.map((a: any) => [
                            // Código
                            <code key="cod" style={{ color: '#818cf8', fontWeight: 600, fontSize: '13px' }}>{a.codigo}</code>,

                            // Descripción + Categoría
                            <div key="desc" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary, #f3f4f6)' }}>{a.descripcion}</div>
                                {a.categoria && <Badge>{a.categoria.nombre}</Badge>}
                            </div>,

                            // Insumos (itemRefs agrupados por rol)
                            <div key="insumos" style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxWidth: '200px' }}>
                                {Object.entries(
                                    (a.itemRefs || []).reduce((acc: any, ref: any) => {
                                        if (!acc[ref.rol]) acc[ref.rol] = [];
                                        acc[ref.rol].push(ref);
                                        return acc;
                                    }, {})
                                ).map(([rol, refs]: [string, any]) => {
                                    const active = refs.filter((r: any) => r.activo && r.item);
                                    if (active.length === 0) return null;
                                    const first = active[0];
                                    return (
                                        <div key={rol} style={{ fontSize: '11px' }}>
                                            <span style={{ color: '#6b7280', marginRight: '4px' }}>{ROL_LABELS[rol] || rol}:</span>
                                            <span style={{ color: '#d1d5db' }}>{first.item?.descripcion || first.item?.codigoInterno || '—'}</span>
                                            {active.length > 1 && <span style={{ color: '#6b7280' }}> +{active.length - 1}</span>}
                                        </div>
                                    );
                                })}
                                {(!a.itemRefs || a.itemRefs.length === 0) && <span style={{ color: '#4b5563', fontSize: '11px' }}>Sin insumos</span>}
                            </div>,

                            // Talle & Talle de media
                            <div key="talle" style={{ fontSize: '12px', color: 'var(--text-secondary, #d1d5db)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {a.talle && <div><span style={{ color: '#6b7280', fontSize: '11px' }}>Talle: </span>{a.talle}</div>}
                                {a.talleDMedia && <div><span style={{ color: '#6b7280', fontSize: '11px' }}>Media: </span>{a.talleDMedia}</div>}
                                {!a.talle && !a.talleDMedia && <span style={{ color: '#4b5563' }}>—</span>}
                            </div>,

                            // Máquinas
                            <div key="maq" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {(a.machineTypes || []).map((mt: any) => (
                                    <Badge key={mt.id} color="#0d9488">{mt.name}</Badge>
                                ))}
                                {(!a.machineTypes || a.machineTypes.length === 0) && <span style={{ color: '#4b5563', fontSize: '11px' }}>—</span>}
                            </div>,

                            // Acciones
                            <div key="actions" style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                <Btn small variant="secondary" onClick={(e: any) => { e.stopPropagation(); handleEdit(a); }} title="Editar artículo">✏️</Btn>
                                <Btn small variant="danger" onClick={(e: any) => { e.stopPropagation(); handleDelete(a.id); }} title="Eliminar artículo">🗑</Btn>
                            </div>,
                        ])}
                    />
                    {filtered.length === 0 && !isLoading && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-subtle, #6b7280)' }}>
                            {q ? 'No se encontraron artículos con ese filtro.' : 'No hay artículos cargados todavía. Creá el primero.'}
                        </div>
                    )}
                </Card>
            )}

            <CreateArticuloDialog
                open={isDialogOpen}
                onClose={handleClose}
                editTarget={editTarget}
            />
        </div>
    );
}
