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
  Trash2,
} from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Skeleton } from '@macom/ui';
import QuickLinkForm from '../components/links/QuickLinkForm';
import { usePermissions } from '@/lib/usePermissions';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import Pagination, { usePaginatedItems } from '../components/Pagination';

const categoryConfig = {
  sistema: {
    label: 'Sistemas Corporativos',
    icon: Globe,
    textColor: 'text-blue-700',
    softBg: 'bg-blue-100',
  },
  ferramenta: {
    label: 'Ferramentas Uteis',
    icon: Wrench,
    textColor: 'text-orange-700',
    softBg: 'bg-orange-100',
  },
  portal: {
    label: 'Portais e Acessos',
    icon: Building,
    textColor: 'text-sky-700',
    softBg: 'bg-sky-100',
  },
  comunicacao: {
    label: 'Comunicacao',
    icon: MessageSquare,
    textColor: 'text-amber-700',
    softBg: 'bg-amber-100',
  },
  financeiro: {
    label: 'Financeiro',
    icon: DollarSign,
    textColor: 'text-emerald-700',
    softBg: 'bg-emerald-100',
  },
  rh: {
    label: 'RH e Beneficios',
    icon: Users,
    textColor: 'text-rose-700',
    softBg: 'bg-rose-100',
  },
};

const defaultLinkConfig = {
  label: 'Link',
  icon: Link2,
  textColor: 'text-slate-600',
  softBg: 'bg-slate-100',
};

const quickLinkQueryKeys = [
  ['quicklinks'],
];

function updateQuickLinkCaches(queryClient, updater) {
  quickLinkQueryKeys.forEach((queryKey) => {
    queryClient.setQueryData(queryKey, (old = []) => {
      if (!Array.isArray(old)) return old;
      return updater(old);
    });
  });
}

function snapshotQuickLinkCaches(queryClient) {
  return quickLinkQueryKeys.map((queryKey) => ({
    queryKey,
    data: queryClient.getQueryData(queryKey),
  }));
}

function restoreQuickLinkCaches(queryClient, snapshots = []) {
  snapshots.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data);
  });
}

function invalidateQuickLinkCaches(queryClient) {
  quickLinkQueryKeys.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey });
  });
}

function prependQuickLink(links, link) {
  if (!link?.id) return links;
  return [link, ...links.filter((item) => item.id !== link.id)];
}

function replaceQuickLink(links, link) {
  if (!link?.id) return links;
  return links.map((item) => (item.id === link.id ? { ...item, ...link } : item));
}

function removeQuickLink(links, id) {
  return links.filter((link) => link.id !== id);
}

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
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${config.softBg} ${config.textColor} transition-colors group-hover:bg-[#FF8C00]/10 group-hover:text-[#FF8C00]`}>
        <Icon className="h-5.5 w-5.5" />
      </div>
    );
  }

  return (
    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 transition-colors group-hover:bg-[#FF8C00]/10">
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

function getLinkConfig(category) {
  return categoryConfig[category] || defaultLinkConfig;
}

export default function QuickLinks() {
  const { canEdit } = usePermissions('links');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [linkToDelete, setLinkToDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['quicklinks'],
    queryFn: () => appClient.entities.QuickLink.list('created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => appClient.entities.QuickLink.create(data),
    onSuccess: (createdLink) => {
      updateQuickLinkCaches(queryClient, (old) => prependQuickLink(old, createdLink));
      setDialogOpen(false);
      setEditingLink(null);
      invalidateQuickLinkCaches(queryClient);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.QuickLink.update(id, data),
    onMutate: async ({ id, data }) => {
      await Promise.all(quickLinkQueryKeys.map((queryKey) => queryClient.cancelQueries({ queryKey })));
      const previousCaches = snapshotQuickLinkCaches(queryClient);
      const optimisticLink = {
        ...data,
        id,
        updated_date: new Date().toISOString(),
      };

      updateQuickLinkCaches(queryClient, (old) => replaceQuickLink(old, optimisticLink));
      setDialogOpen(false);
      setEditingLink(null);

      return { previousCaches };
    },
    onSuccess: (updatedLink) => {
      updateQuickLinkCaches(queryClient, (old) => replaceQuickLink(old, updatedLink));
      invalidateQuickLinkCaches(queryClient);
    },
    onError: (_error, _variables, context) => {
      restoreQuickLinkCaches(queryClient, context?.previousCaches);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => appClient.entities.QuickLink.delete(id),
    onMutate: async (id) => {
      await Promise.all(quickLinkQueryKeys.map((queryKey) => queryClient.cancelQueries({ queryKey })));
      const previousCaches = snapshotQuickLinkCaches(queryClient);

      updateQuickLinkCaches(queryClient, (old) => removeQuickLink(old, id));
      setLinkToDelete(null);

      return { previousCaches };
    },
    onSuccess: () => {
      invalidateQuickLinkCaches(queryClient);
    },
    onError: (_error, _id, context) => {
      restoreQuickLinkCaches(queryClient, context?.previousCaches);
    },
  });

  const toggleDashboardMutation = useMutation({
    mutationFn: ({ id, show_on_dashboard }) => appClient.entities.QuickLink.update(id, { show_on_dashboard }),
    onMutate: async ({ id, show_on_dashboard }) => {
      await Promise.all(quickLinkQueryKeys.map((queryKey) => queryClient.cancelQueries({ queryKey })));
      const previousCaches = snapshotQuickLinkCaches(queryClient);
      const optimisticLink = {
        id,
        show_on_dashboard,
        updated_date: new Date().toISOString(),
      };

      updateQuickLinkCaches(queryClient, (old) => replaceQuickLink(old, optimisticLink));

      return { previousCaches };
    },
    onSuccess: (updatedLink) => {
      updateQuickLinkCaches(queryClient, (old) => replaceQuickLink(old, updatedLink));
      invalidateQuickLinkCaches(queryClient);
    },
    onError: (_error, _variables, context) => {
      restoreQuickLinkCaches(queryClient, context?.previousCaches);
    },
  });

  const {
    page,
    setPage,
    totalItems,
    totalPages,
    paginatedItems: paginatedLinks,
  } = usePaginatedItems(links, 24, [links.length]);

  const hasAnyLinks = links.length > 0;

  const handleConfirmDelete = () => {
    if (!linkToDelete) return;
    deleteMutation.mutate(linkToDelete.id);
    setLinkToDelete(null);
  };

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
              <Button className="w-full gap-2 sm:w-auto" onClick={() => setEditingLink(null)}>
                <Plus className="h-4 w-4" />
                Novo Link
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, item) => (
            <Skeleton key={item} className="h-36 rounded-2xl" />
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
      ) : (
        <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {paginatedLinks.map((link) => {
            const config = getLinkConfig(link.category);
            const CategoryIcon = config.icon;

            return (
              <div
                key={link.id}
                className="group relative flex min-h-36 rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                {canEdit ? (
                  <div className="flex h-full w-full flex-col p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <LinkCardIcon linkUrl={link.url} config={config} Icon={CategoryIcon} />

                      <div className="flex flex-wrap items-center justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
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
                          aria-label="Editar link"
                          title="Editar link"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setLinkToDelete(link)}
                          aria-label="Excluir link"
                          title="Excluir link"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold text-slate-800 transition-colors group-hover:text-[#0B1B3D]">
                          {link.name}
                        </h3>
                        <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-[#FF8C00]" />
                      </div>

                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                        {link.description || 'Acesso rapido para uma ferramenta importante da rotina da empresa.'}
                      </p>
                    </a>
                  </div>
                ) : (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-full w-full flex-col p-5"
                  >
                    <div className="mb-4">
                      <LinkCardIcon linkUrl={link.url} config={config} Icon={CategoryIcon} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold text-slate-800 transition-colors group-hover:text-[#0B1B3D]">
                          {link.name}
                        </h3>
                        <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-[#FF8C00]" />
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                        {link.description || 'Acesso rapido para uma ferramenta importante da rotina da empresa.'}
                      </p>
                    </div>
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={24}
          onPageChange={setPage}
          itemLabel="links"
        />
        </>
      )}

      <ConfirmDeleteDialog
        open={Boolean(linkToDelete)}
        onOpenChange={(open) => !open && setLinkToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir link"
        description={
          linkToDelete
            ? `Essa ação não pode ser desfeita. Deseja excluir o link "${linkToDelete.name}"?`
            : 'Essa ação não pode ser desfeita.'
        }
      />
    </div>
  );
}

