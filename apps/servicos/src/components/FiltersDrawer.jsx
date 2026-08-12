import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

import { Button, Sheet, SheetContent, SheetHeader, SheetTitle } from '@macom/ui';

// Painel lateral que agrupa os filtros de uma tela (estilo AppSheet), pra nao empilhar um
// dropdown do lado do outro na tela principal. A busca livre fica de fora, direto na tela,
// por ser o filtro mais usado.
export default function FiltersDrawer({ activeCount = 0, onClear, children }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" className="relative" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="mr-2 h-4 w-4" />
        Filtros
        {activeCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {activeCount}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-5">{children}</div>

          {activeCount > 0 && onClear && (
            <Button type="button" variant="ghost" size="sm" className="mt-6 w-full" onClick={onClear}>
              <X className="mr-2 h-4 w-4" />
              Limpar filtros
            </Button>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
