import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useGetItemsQuery, useDeleteItemMutation } from '../../features/warehouse/materiales/api/items.api';
import { PageHeader, Card, Btn, Table, Badge, SearchBar, Spinner } from '../../shared/ui';
import { CreateItemDialog } from '../../features/warehouse/materiales/components/CreateItemDialog';

const ROTACION_COLORS: Record<string, string> = {
    ALTA: '#ef4444',
    MEDIA: '#eab308',
    BAJA: 'var(--text-subtle, #6b7280)',
    TEMPORAL: '#06b6d4',
};

const ROTACION_LABELS: Record<string, string> = {
    ALTA: '🔴 Alta',
    MEDIA: '🟡 Media',
    BAJA: '⚫ Baja',
    TEMPORAL: '⏳ Temporal',
};

const TONO_LABELS: Record<string, string> = {
    AMARILLO: '🟡 Amarillo',
    NARANJA: '🟠 Naranja',
    AZUL: '🔵 Azul',
    ROJO: '🔴 Rojo',
    VERDE: '🟢 Verde',
    MARRÓN: '🟫 Marrón',
    GRIS: '🔘 Gris',
    VIOLETA: '🟣 Violeta',
    ROSA: '🌸 Rosa',
    CELESTE: '🩵 Celeste',
    BLANCO: '⬜ Blanco',
    NEGRO: '⬛ Negro',
};

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
                (it.category?.nombre || '').toLowerCase().includes(word) ||
                (it.tono || '').toLowerCase().includes(word) ||
                (it.depot?.nombre || '').toLowerCase().includes(word)
            );
        });
    }, [items, q]);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<any>(null);
    const [deleteItem] = useDeleteItemMutation();

    const handleCreateNew = () => {
        setEditTarget(null);
        setIsCreateOpen(true);
    };

    const handleEdit = (item: any) => {
        setEditTarget(item);
        setIsCreateOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que querés eliminar este material?')) return;
        try {
            await deleteItem(id).unwrap();
        } catch (e) {
            console.error('Error al eliminar ítem', e);
        }
    };

    const handleExportExcel = () => {
        const dataToExport = filteredItems.length > 0 ? filteredItems : items;
        if (!dataToExport || dataToExport.length === 0) {
            alert('No hay materiales para exportar.');
            return;
        }

        const rows = dataToExport.map((it: any) => ({
            'Código': it.codigoInterno || '',
            'Descripción': it.descripcion || '',
            'Tono': it.tono ? (TONO_LABELS[it.tono] ? TONO_LABELS[it.tono].replace(/^[^\s]+\s/, '') : it.tono) : '',
            'Categoría': it.category?.nombre || it.categoria || '',
            'Depósito': it.depot?.nombre || it.category?.depot?.nombre || '',
            'Proveedor': it.supplier?.name || '',
            'CUIT Proveedor': it.supplier?.taxId || '',
            'Rotación': it.rotacion || '',
            'Stock Mínimo': it.stockMinimo != null ? Number(it.stockMinimo) : '',
            'Stock Máximo': it.stockMaximo != null ? Number(it.stockMaximo) : '',
            'Tipo de Embalaje': it.boxType?.nombre || '',
            'Kg por Caja': it.kilosPorCaja != null ? Number(it.kilosPorCaja) : '',
            'Unidad Principal': it.unidadPrincipal || '',
            'Unidad Secundaria': it.unidadSecundaria || '',
            'Lead Time (Días)': it.leadTime != null ? Number(it.leadTime) : '',
            'Estado': it.activo === false ? 'Inactivo' : 'Activo',
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);

        const colKeys = Object.keys(rows[0] || {});
        worksheet['!cols'] = colKeys.map(key => {
            const maxLen = Math.max(
                key.length,
                ...rows.map((row: any) => String(row[key] ?? '').length)
            );
            return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
        });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Materiales');

        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        XLSX.writeFile(workbook, `materiales_${dateStr}.xlsx`);
    };

    return (
        <div style={{ padding: '24px' }}>
            <PageHeader 
                title="Configuración de Materiales" 
                subtitle="Catálogo maestro de artículos. Hacé clic en cualquier material para ver y editar toda su información."
            >
                <Btn 
                    variant="secondary" 
                    onClick={handleExportExcel} 
                    disabled={isLoading || items.length === 0} 
                    title="Descargar catálogo de materiales en formato Excel"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    📥 Exportar Excel
                </Btn>
                <Btn onClick={handleCreateNew}>+ Nuevo Material</Btn>
            </PageHeader>

            <Card style={{ marginBottom: '20px' }}>
                <SearchBar 
                    value={q} 
                    onChange={setQ} 
                    placeholder="Filtrar por nombre, código, tono, proveedor, depósito o categoría..." 
                />
            </Card>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}><Spinner /></div>
            ) : (
                <Card>
                    <Table
                        cols={['Código & Tono', 'Material & Prov.', 'Categoría, Rotación & Depósito', 'Stock (Mín/Máx)', 'Embalaje', 'Unidades', 'Acciones']}
                        onRowClick={(index) => handleEdit(filteredItems[index])}
                        rows={filteredItems.map((it: any) => [
                            <div key="code" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <code style={{ color: '#818cf8', fontWeight: 600, fontSize: '13px' }}>{it.codigoInterno}</code>
                                {it.tono && (
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                                        {TONO_LABELS[it.tono] || it.tono}
                                    </span>
                                )}
                            </div>,
                            <div key="desc" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary, #f3f4f6)' }}>{it.descripcion}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-subtle, #6b7280)' }}>Prov: {it.supplier?.name || '—'}</div>
                            </div>,
                            <div key="cat-rot" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                <Badge>{it.category?.nombre || 'General'}</Badge>
                                <Badge color={ROTACION_COLORS[it.rotacion] || 'var(--text-muted, #9ca3af)'}>
                                    {ROTACION_LABELS[it.rotacion] || it.rotacion || 'Media'}
                                </Badge>
                                {it.depot?.nombre && (
                                    <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600, marginTop: '2px' }}>
                                        🏛️ {it.depot.nombre}
                                    </span>
                                )}
                            </div>,
                            <div key="stock" style={{ fontSize: '12px', color: 'var(--text-secondary, #d1d5db)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div><span style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '11px' }}>Mín:</span> {it.stockMinimo != null ? it.stockMinimo : '—'}</div>
                                <div><span style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '11px' }}>Máx:</span> {it.stockMaximo != null ? it.stockMaximo : '—'}</div>
                            </div>,
                            <div key="box" style={{ fontSize: '12px', color: 'var(--text-secondary, #d1d5db)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ fontWeight: 500 }}>{it.boxType?.nombre || '—'}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-subtle, #6b7280)' }}>
                                    {it.kilosPorCaja ? `${it.kilosPorCaja} kg/caja` : '—'}
                                </div>
                            </div>,
                            <div key="units" style={{ fontSize: '12px', color: 'var(--text-secondary, #d1d5db)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div><span style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '11px' }}>P:</span> {it.unidadPrincipal}</div>
                                <div><span style={{ color: 'var(--text-subtle, #6b7280)', fontSize: '11px' }}>S:</span> {it.unidadSecundaria || '—'}</div>
                            </div>,
                            <div key="actions" style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                <Btn small variant="secondary" onClick={(e) => { e.stopPropagation(); handleEdit(it); }} title="Editar material">✏️</Btn>
                                <Btn small variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(it.id); }} title="Eliminar material">🗑</Btn>
                            </div>
                        ])}
                    />
                </Card>
            )}

            <CreateItemDialog 
                open={isCreateOpen} 
                onClose={() => { setIsCreateOpen(false); setEditTarget(null); }} 
                editTarget={editTarget}
            />
        </div>
    );
}
