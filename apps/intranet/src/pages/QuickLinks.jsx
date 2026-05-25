import React, { useMemo, useState } from 'react';
import { appClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  ExternalLink,
  Globe,
  Wrench,
  Building,
  MessageSquare,
  DollarSign,
  Users,
  Link2,
  Pencil,
  Heart,
  LayoutGrid,
  Trash2,
} from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Skeleton } from '@macom/ui';
import QuickLinkForm from '../components/links/QuickLinkForm';
import { usePermissions } from '@/lib/usePermissions';

const categoryConfig = {
  sistema: {
    label: 'Sistemas Corporativos',
    icon: Globe,
    textColor: 'text-blue-700',
    softBg: 'bg-blue-100',
    cardAccent: 'group-hover:border-blue-200',
  },
  ferramenta: {
    label: 'Ferramentas Uteis',
    icon: Wrench,
    textColor: 'text-orange-700',
    softBg: 'bg-orange-100',
    cardAccent: 'group-hover:border-orange-200',
  },
  portal: {
    label: 'Portais e Acessos',
    icon: Building,
    textColor: 'text-sky-700',
    softBg: 'bg-sky-100',
    cardAccent: 'group-hover:border-sky-200',
  },
  comunicacao: {
    label: 'Comunicacao',
    icon: MessageSquare,
    textColor: 'text-amber-700',
    softBg: 'bg-amber-100',
    cardAccent: 'group-hover:border-amber-200',
  },
  financeiro: {
    label: 'Financeiro',
    icon: DollarSign,
    textColor: 'text-emerald-700',
    softBg: 'bg-emerald-100',
    cardAccent: 'group-hover:border-emerald-200',
  },
  rh: {
    label: 'RH e Beneficios',
    icon: Users,
    textColor: 'text-rose-700',
    softBg: 'bg-rose-100',
    cardAccent: 'group-hover:border-rose-200',
  },
};

const MACOM_FAVICON_URL = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1779409501/favicon_macom_kzu6sd.png';
const INTERNAL_SYSTEM_HOSTS = new Set([
  'macom-central.vercel.app',
  'macom-relatorios.vercel.app',
  'macom-intranet.vercel.app',
]);

function isMacomInternalUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    return INTERNAL_SYSTEM_HOSTS.has(hostname) || hostname.includes('macom') || hostname.includes('mitmacom');
  } catch {
    return false;
  }
}

function getFaviconUrl(url) {
  if (isMacomInternalUrl(url)) {
    return MACOM_FAVICON_URL;
  }

  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.origin}/favicon.ico`;
  } catch {
    return null;
  }
}

function LinkCardIcon({ linkUrl, config, Icon }) {
  const faviconUrl = useMemo(() => getFaviconUrl(linkUrl), [linkUrl]);
  const [hasError, setHasError] = useState(false);

  if (!faviconUrl || hasError) {
    return (
      <div className={`rounded-xl p-3 ${config.softBg} ${config.textColor} transition-colors group-hover:bg-[#FF8C00]/10 group-hover:text-[#FF8C00]`}>
        <Icon className="h-5.5 w-5.5" />
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-50 p-2.5 transition-colors group-hover:bg-[#FF8C00]/10">
      <img
        src={faviconUrl}
        alt=""
        className="h-7 w-7 rounded-md object-contain"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default function QuickLinks() {
  const { canEdit } = usePermissions('links');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const queryClient = useQueryClient();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['quicklinks'],
    queryFn: () => appClient.entities.QuickLink.list('created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => appClient.entities.QuickLink.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quicklinks'] });
      queryClient.invalidateQueries({ queryKey: ['quicklinks-dashboard'] });
      setDialogOpen(false);
      setEditingLink(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.QuickLink.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quicklinks'] });
      queryClient.invalidateQueries({ queryKey: ['quicklinks-dashboard'] });
      setDialogOpen(false);
      setEditingLink(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => appClient.entities.QuickLink.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quicklinks'] });
      queryClient.invalidateQueries({ queryKey: ['quicklinks-dashboard'] });
    },
  });

  const toggleDashboardMutation = useMutation({
    mutationFn: ({ id, show_on_dashboard }) => appClient.entities.QuickLink.update(id, { show_on_dashboard }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quicklinks'] });
      queryClient.invalidateQueries({ queryKey: ['quicklinks-dashboard'] });
    },
  });

  const groupedCategories = Object.entries(categoryConfig)
    .map(([key, config]) => ({
      key,
      config,
      links: links.filter((link) => link.category === key),
    }))
    .filter((category) => category.links.length > 0);

  const hasAnyLinks = links.length > 0;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Links Uteis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse rapidamente sistemas, portais e ferramentas importantes para o dia a dia da equipe.
          </p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setEditingLink(null)}>
                <Plus className="h-4 w-4" />
                Novo Link
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingLink ? 'Editar Link' : 'Novo Link'}</DialogTitle>
              </DialogHeader>
              <QuickLinkForm
                initial={editingLink || {}}
                onSubmit={(data) => (editingLink ? updateMutation.mutate({ id: editingLink.id, data }) : createMutation.mutate(data))}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {[1, 2, 3].map((section) => (
            <div key={section} className="space-y-4">
              <Skeleton className="h-8 w-64 rounded-xl" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                  <Skeleton key={item} className="h-56 rounded-2xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : !hasAnyLinks ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Link2 className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Nenhum link cadastrado</h3>
          <p className="mt-2 text-sm text-slate-500">
            Cadastre os primeiros acessos importantes para concentrar os sistemas usados pela equipe.
          </p>
        </div>
      ) : groupedCategories.length > 0 ? (
        <div className="space-y-10">
          {groupedCategories.map(({ key, config, links: categoryLinks }) => {
            const CategoryIcon = config.icon;

            return (
              <section key={key} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                  <div className={`rounded-xl p-2.5 ${config.softBg} ${config.textColor}`}>
                    <CategoryIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-800">{config.label}</h2>
                  </div>
                  <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                    {categoryLinks.length} itens
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {categoryLinks.map((link) => (
                    <div
                      key={link.id}
                      className={`group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${config.cardAccent}`}
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <LinkCardIcon linkUrl={link.url} config={config} Icon={CategoryIcon} />

                        {canEdit ? (
                          <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 rounded-lg ${
                                link.show_on_dashboard
                                  ? 'text-rose-500 hover:bg-rose-50 hover:text-rose-600'
                                  : 'text-slate-400 hover:bg-slate-100 hover:text-rose-500'
                              }`}
                              disabled={toggleDashboardMutation.isPending}
                              onClick={() => {
                                toggleDashboardMutation.mutate({
                                  id: link.id,
                                  show_on_dashboard: !link.show_on_dashboard,
                                });
                              }}
                              title={link.show_on_dashboard ? 'Remover do acesso rapido' : 'Mostrar no acesso rapido'}
                              aria-label={link.show_on_dashboard ? 'Remover do acesso rapido' : 'Mostrar no acesso rapido'}
                            >
                              <Heart className="h-3.5 w-3.5" fill={link.show_on_dashboard ? 'currentColor' : 'none'} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              onClick={() => {
                                setEditingLink(link);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => deleteMutation.mutate(link.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <ExternalLink className="h-4 w-4 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#FF8C00]" />
                        )}
                      </div>

                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-base font-semibold text-slate-800 transition-colors group-hover:text-[#0B1B3D]">
                            {link.name}
                          </h3>
                          <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-slate-300 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-hover:text-[#FF8C00]" />
                        </div>

                        <p className="mt-2 line-clamp-3 text-sm text-slate-500">
                          {link.description || 'Acesso rapido para uma ferramenta importante da rotina da empresa.'}
                        </p>

                        {link.show_on_dashboard && !canEdit && (
                          <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-[#FF8C00]/10 px-2.5 py-1 text-[11px] font-medium text-[#C96C00]">
                            <LayoutGrid className="h-3 w-3" />
                            Home
                          </div>
                        )}
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[28px] border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Link2 className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Nenhum link encontrado</h3>
          <p className="mt-2 text-sm text-slate-500">
            Nenhuma categoria com links disponiveis foi encontrada no momento.
          </p>
        </div>
      )}
    </div>
  );
}

