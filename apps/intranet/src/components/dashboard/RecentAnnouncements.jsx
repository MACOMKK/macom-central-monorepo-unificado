import React from 'react';
import { Link } from 'react-router-dom';
import { appClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Megaphone, ArrowRight, Clock } from 'lucide-react';
import { Skeleton } from '@macom/ui';

const categoryLabels = {
  geral: 'Geral',
  rh: 'Recursos Humanos',
  ti: 'TI',
  financeiro: 'Financeiro',
  vendas: 'Vendas',
  pos_vendas: 'Pos-Vendas',
};

const priorityConfig = {
  urgente: { label: 'Urgente', color: 'text-red-600 bg-red-50' },
  alta: { label: 'Importante', color: 'text-orange-500 bg-orange-50' },
  media: { label: 'Informativo', color: 'text-blue-500 bg-blue-50' },
  baixa: { label: 'Baixa', color: 'text-gray-500 bg-gray-100' },
};

function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return `Hoje, ${format(date, 'HH:mm')}`;
  }
  if (isYesterday(date)) {
    return `Ontem, ${format(date, 'HH:mm')}`;
  }
  return format(date, "d 'de' MMMM", { locale: ptBR });
}

export default function RecentAnnouncements() {
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements-recent'],
    queryFn: () => appClient.entities.Announcement.list('-created_date', 5),
  });

  return (
    <div className="h-full rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Ultimos Avisos</h2>
        </div>
        <Link to="/avisos" className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80">
          Ver todos <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : announcements.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum aviso publicado.</p>
      ) : (
        <div className="space-y-1">
          {announcements.map((announcement) => {
            const priority = priorityConfig[announcement.priority] || priorityConfig.media;

            return (
              <div
                key={announcement.id}
                className="cursor-pointer rounded-xl p-3 transition-colors hover:bg-muted/40"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {categoryLabels[announcement.category] || 'Geral'}
                  </span>
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${priority.color}`}>
                    {priority.label}
                  </span>
                </div>

                <p className="text-sm font-semibold leading-tight text-foreground">
                  {announcement.title}
                </p>

                <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(announcement.created_date)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
