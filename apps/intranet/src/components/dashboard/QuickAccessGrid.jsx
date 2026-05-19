import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Globe, Wrench, Building, MessageSquare, DollarSign, Users, Link2 } from 'lucide-react';
import { appClient } from '@/api/client';
import { Skeleton } from '@macom/ui';

const categoryConfig = {
  sistema: { icon: Globe, iconBg: 'bg-blue-100', iconColor: 'text-blue-500' },
  ferramenta: { icon: Wrench, iconBg: 'bg-green-100', iconColor: 'text-green-500' },
  portal: { icon: Building, iconBg: 'bg-purple-100', iconColor: 'text-purple-500' },
  comunicacao: { icon: MessageSquare, iconBg: 'bg-amber-100', iconColor: 'text-amber-500' },
  financeiro: { icon: DollarSign, iconBg: 'bg-red-100', iconColor: 'text-red-500' },
  rh: { icon: Users, iconBg: 'bg-pink-100', iconColor: 'text-pink-500' },
};

export default function QuickAccessGrid() {
  const { data: links = [], isLoading } = useQuery({
    queryKey: ['quicklinks-dashboard'],
    queryFn: () => appClient.entities.QuickLink.list('created_date', 100),
  });

  const shortcuts = links
    .filter((item) => item.show_on_dashboard)
    .slice(0, 6);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Acesso Rápido</h2>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-[120px] rounded-2xl" />)}
        </div>
      ) : shortcuts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-6 text-sm text-muted-foreground">
          Nenhum link foi marcado para aparecer no Acesso Rápido. Use a tela de Links Úteis para escolher manualmente quais links devem aparecer aqui.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {shortcuts.map((item) => {
            const config = categoryConfig[item.category] || categoryConfig.sistema;
            const Icon = config.icon || Link2;
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-md"
                title={item.description || item.name}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${config.iconBg} transition-transform group-hover:scale-110`}>
                  <Icon className={`h-6 w-6 ${config.iconColor}`} />
                </div>
                <span className="text-center text-xs font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground">
                  {item.name}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

