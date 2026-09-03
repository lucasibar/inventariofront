import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataCompletenessView, type CompletenessLevel } from '../../features/data-completeness/DataCompletenessView';
import { useGetItemsCompletenessQuery } from '../../features/warehouse/materiales/api/items.api';

export default function MaterialesCompletitudPage() {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [query, setQuery] = useState('');
    const [level, setLevel] = useState<'' | CompletenessLevel>('');
    const result = useGetItemsCompletenessQuery({ page: page + 1, pageSize, q: query || undefined, level: level || undefined });
    return <DataCompletenessView title="Completitud de materiales" subtitle="Qué tan utilizable está la ficha de cada material para stock, compras y preparación." noun="material" result={result.data} isLoading={result.isLoading} isFetching={result.isFetching} query={query} level={level} page={page} pageSize={pageSize} onQueryChange={(value) => { setQuery(value); setPage(0); }} onLevelChange={(value) => { setLevel(value); setPage(0); }} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(0); }} onOpenCatalog={(row) => navigate('/items', { state: row ? { search: row.code, editId: row.id } : undefined })} />;
}
