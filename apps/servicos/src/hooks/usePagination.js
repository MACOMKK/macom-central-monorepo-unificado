import { useEffect, useMemo, useState } from 'react';

// Paginacao client-side: os endpoints do Servicos ja retornam a lista inteira
// (volumes pequenos), entao so fatiamos o array em memoria em vez de paginar no backend.
export function usePagination(items, pageSize = 10) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, pageItems, totalPages, total, pageSize };
}
