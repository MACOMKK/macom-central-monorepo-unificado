import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@macom/ui';

export function usePaginatedItems(items, pageSize, resetKeys = []) {
  const [page, setPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setPage(1);
  }, resetKeys);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, totalItems, totalPages, paginatedItems };
}

export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange, itemLabel = 'itens' }) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const visiblePages = pages.filter((item) => (
    item === 1 ||
    item === totalPages ||
    Math.abs(item - page) <= 1
  ));

  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Mostrando {start}-{end} de {totalItems} {itemLabel}
      </p>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {visiblePages.map((item, index) => {
          const previous = visiblePages[index - 1];
          const showGap = previous && item - previous > 1;

          return (
            <React.Fragment key={item}>
              {showGap ? <span className="px-1 text-xs text-muted-foreground">...</span> : null}
              <Button
                type="button"
                variant={item === page ? 'default' : 'outline'}
                size="icon"
                className="h-9 w-9 rounded-lg text-xs"
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            </React.Fragment>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
