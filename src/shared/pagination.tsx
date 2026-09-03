import { useMemo, useState } from 'react';
import { TablePagination } from '@mui/material';

export function useClientPagination<T>(items: T[], initialPageSize = 25) {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const lastPage = Math.max(0, Math.ceil(items.length / pageSize) - 1);
    const visiblePage = Math.min(page, lastPage);
    const pageItems = useMemo(
        () => items.slice(visiblePage * pageSize, visiblePage * pageSize + pageSize),
        [items, visiblePage, pageSize],
    );
    const changePageSize = (value: number) => {
        setPageSize(value);
        setPage(0);
    };
    return { page: visiblePage, pageSize, pageItems, setPage, setPageSize: changePageSize };
}

export function PaginationControls({ count, page, pageSize, onPageChange, onPageSizeChange }: {
    count: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
}) {
    if (count <= 10) return null;
    return <TablePagination
        component="div"
        count={count}
        page={page}
        rowsPerPage={pageSize}
        onPageChange={(_, value) => onPageChange(value)}
        onRowsPerPageChange={(event) => onPageSizeChange(Number(event.target.value))}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Por página"
        labelDisplayedRows={({ from, to, count: total }) => `${from}-${to} de ${total}`}
    />;
}
