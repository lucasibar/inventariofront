import { useState, useMemo } from 'react';
import { useGetItemsQuery, useDeleteItemMutation } from '../items/api/items.api';
import { PageHeader, Card, Btn, Table, Badge, SearchBar, Spinner } from '../../../shared/ui';
import { CreateItemDialog } from '../../config/components/CreateItemDialog';



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
                (it.category?.nombre || '').toLowerCase().includes(word)
            );
        });
    }, [items, q]);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [deleteItem] = useDeleteItemMutation();

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que querés eliminar este material?')) return;
        try {
            await deleteItem(id).unwrap();
        } catch (e) {
            console.error('Error al eliminar ítem', e);
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader title="Configuración de Materiales" subtitle="Catálogo maestro de artículos">
                <Btn onClick={() => setIsCreateOpen(true)}>+ Nuevo Material</Btn>
            </PageHeader>

            <Card style={{ marginBottom: '20px' }}>
                <SearchBar 
                    value={q} 
                    onChange={setQ} 
                    placeholder="Filtrar por nombre, código, proveedor o categoría..." 
                />
            </Card>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}><Spinner /></div>
            ) : (
                <Card>
                    <Table
                        cols={['Código', 'Descripción', 'Categoría', 'Unidades', 'Acciones']}
                        rows={filteredItems.map((it: any) => [
                            <code key="code" style={{ color: '#818cf8', fontWeight: 600 }}>{it.codigoInterno}</code>,
                            <div key="desc">
                                <div style={{ fontWeight: 600 }}>{it.descripcion}</div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>Prov: {it.supplier?.name || '—'}</div>
                            </div>,
                            <Badge key="cat">{it.category?.nombre || 'General'}</Badge>,
                            <div key="units" style={{ fontSize: '12px' }}>
                                <div>P: {it.unidadPrincipal}</div>
                                <div>S: {it.unidadSecundaria || '—'}</div>
                            </div>,
                            <div key="actions" style={{ textAlign: 'right' }}>
                                <Btn small variant="danger" onClick={() => handleDelete(it.id)}>🗑</Btn>
                            </div>
                        ])}
                    />
                </Card>
            )}

            <CreateItemDialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
        </div>
    );
}
