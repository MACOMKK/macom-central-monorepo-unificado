import React from 'react';
import { Link } from 'react-router-dom';
import { appClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Megaphone, ArrowRight, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const categoryLabels = {
  geral: 'Geral',
  rh: 'Recursos Humanos',
  ti: 'TI',
  financeiro: 'Financeiro',
  vendas: 'Vendas',
  pos_vendas: 'Pós-Vendas',
};

const priorityConfig = {
  urgente: { label: 'Urgente', color: 'text-red-600 bg-red-50' },
  alta: { label: 'Importante', color: 'text-orange-500 bg-orange-50' },
  media: { label: 'Informativo', color: 'text-blue-500 bg-blue-50' },
  baixa: { label: 'Baixa', color: 'text-gray-500 bg-gray-100' },
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d)) {
    return `Hoje, ${format(d, 'HH:mm')}`;
  }
  if (isYesterday(d)) return 'Ontem, ' + format(d, 'HH:mm');
  return format(d, "d 'de' MMMM", { locale: ptBR });
}

export default function RecentAnnouncements() {
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements-recent'],
    queryFn: () => appClient.entities.Announcement.list('-created_date', 5),
  });

  return (
    <div className="bg-card rounded-2xl border border-border p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Últimos Avisos</h2>
        </div>
        <Link to="/avisos" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium">
          Ver todos <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum aviso publicado.</p>
      ) : (
        <div className="space-y-1">
          {announcements.map(a => {
            const pConfig = priorityConfig[a.priority] || priorityConfig.media;
            return (
              <div key={a.id} className="p-3 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {categoryLabels[a.category] || 'Geral'}
                  </span>
                  <span className={`text-xs font-semibold flex items-center gap-1 ${pConfig.color} px-2 py-0.5 rounded-full`}>
                    🔔 {pConfig.label}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground leading-tight">{a.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" /> {formatDate(a.created_date)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

