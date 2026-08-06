import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ListPagination({ count, isFetching, page, totalPages, onPrev, onNext, className }) {
  return (
    <div className={cn('flex items-center justify-between bg-white px-3 py-2 text-xs shadow-sm', className)}>
      <span className="font-semibold uppercase tracking-wider text-muted-foreground">
        {isFetching ? 'Carregando...' : `${count || 0} registros`}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded-none text-xs font-bold uppercase tracking-wider"
          disabled={page <= 1}
          onClick={onPrev}
        >
          Anterior
        </Button>
        <span className="min-w-20 text-center font-bold uppercase tracking-wider">
          {page}/{totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded-none text-xs font-bold uppercase tracking-wider"
          disabled={page >= totalPages}
          onClick={onNext}
        >
          Proxima
        </Button>
      </div>
    </div>
  );
}
