import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from '@macom/ui';

const categoryLabels = {
  geral: 'Geral',
  rh: 'RH',
  ti: 'TI',
  financeiro: 'Financeiro',
  vendas: 'Vendas',
  pos_vendas: 'Pos-Vendas',
};

const priorityLabels = {
  urgente: 'Urgente',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

export default function AnnouncementDetailsDialog({ announcement, open, onOpenChange }) {
  if (!announcement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto p-4 sm:p-6 [&>button]:right-4 [&>button]:top-4 [&>button]:z-20 [&>button]:rounded-full [&>button]:border [&>button]:border-white/35 [&>button]:bg-black/55 [&>button]:p-1.5 [&>button]:text-white [&>button]:opacity-100 [&>button]:backdrop-blur-sm [&>button]:transition-colors [&>button:hover]:bg-black/70 [&>button:hover]:text-white [&>button:focus]:ring-white/70 data-[state=open]:[&>button]:bg-black/55 data-[state=open]:[&>button]:text-white">
        <div className={announcement.image_url ? 'space-y-6' : 'space-y-6 pt-1'}>
          {announcement.image_url ? (
            <div className="-mx-4 -mt-4 overflow-hidden border-b border-border bg-muted/20 sm:-mx-6 sm:-mt-6">
              <img
                src={announcement.image_url}
                alt={announcement.title}
                className="h-48 w-full object-cover sm:h-72"
              />
            </div>
          ) : null}

          <DialogHeader className="border-b border-border pb-4 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {categoryLabels[announcement.category] || announcement.category}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {priorityLabels[announcement.priority] || announcement.priority}
              </Badge>
            </div>

            <DialogTitle className="text-xl leading-tight text-foreground sm:text-2xl">
              {announcement.title}
            </DialogTitle>

            <p className="text-xs text-muted-foreground">
              Publicado em{' '}
              {format(new Date(announcement.created_date), "d 'de' MMMM 'de' yyyy 'as' HH:mm", { locale: ptBR })}
              {announcement.created_by ? ` · por ${announcement.created_by}` : ''}
            </p>
          </DialogHeader>

          <div className="whitespace-pre-wrap text-sm leading-6 text-foreground sm:leading-7">
            {announcement.content}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
