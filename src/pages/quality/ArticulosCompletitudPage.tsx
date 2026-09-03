import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataCompletenessView, type CompletenessLevel } from '../../features/data-completeness/DataCompletenessView';
import { useGetArticulosCompletenessQuery } from '../../features/quality/articulos/api/articulos.api';

export default function ArticulosCompletitudPage() {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [query, setQuery] = useState('');
    const [level, setLevel] = useState<'' | CompletenessLevel>('');
    const result = useGetArticulosCompletenessQuery({ page: page + 1, pageSize, q: query || undefined, level: level || undefined });
    return <DataCompletenessView title="Completitud de artículos" subtitle="Control de fichas técnicas, receta, máquinas compatibles y revisión de Calidad." noun="artículo" result={result.data} isLoading={result.isLoading} isFetching={result.isFetching} query={query} level={level} page={page} pageSize={pageSize} onQueryChange={(value) => { setQuery(value); setPage(0); }} onLevelChange={(value) => { setLevel(value); setPage(0); }} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(0); }} onOpenCatalog={(row) => navigate('/calidad/articulos', { state: row ? { search: row.code, editId: row.id } : undefined })} />;
}
