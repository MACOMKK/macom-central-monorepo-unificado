import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Bell, Info, Pin, Plus, Trash2 } from 'lucide-react';

import { appClient } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/usePermissions';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Skeleton,
} from '@macom/ui';
import AnnouncementForm from '../components/announcements/AnnouncementForm';
import AnnouncementDetailsDialog from '../components/announcements/AnnouncementDetailsDialog';
import AnnouncementInteractions from '../components/announcements/AnnouncementInteractions';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';

const priorityConfig = {
  urgente: { icon: AlertTriangle, class: 'bg-red-100 text-red-700 border-red-200' },
  alta: { icon: AlertTriangle, class: 'bg-orange-100 text-orange-700 border-orange-200' },
  media: { icon: Info, class: 'bg-blue-100 text-blue-700 border-blue-200' },
  baixa: { icon: Bell, class: 'bg-gray-100 text-gray-700 border-gray-200' },
};

const categoryLabels = {
  geral: 'Geral',
  rh: 'RH',
  ti: 'TI',
  financeiro: 'Financeiro',
  vendas: 'Vendas',
  pos_vendas: 'Pos-Vendas',
};

function getAnnouncementPreview(content, maxLength = 280) {
  if (!content) return '';
  const normalized = String(content).replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export default function Announcements() {
  const { canEdit } = usePermissions('avisos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => appClient.entities.Announcement.list('-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => appClient.entities.Announcement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements-recent'] });
      queryClient.invalidateQueries({ queryKey: ['home-highlights'] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => appClient.entities.Announcement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements-recent'] });
      queryClient.invalidateQueries({ queryKey: ['home-highlights'] });
    },
  });

  const togglePin = useMutation({
    mutationFn: (announcement) => appClient.entities.Announcement.update(announcement.id, { pinned: !announcement.pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements-recent'] });
      queryClient.invalidateQueries({ queryKey: ['home-highlights'] });
    },
  });

  const filtered = filter === 'all' ? announcements : announcements.filter((announcement) => announcement.category === filter);
  const sorted = [...filtered].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const handleConfirmDelete = () => {
    if (!announcementToDelete) return;
    deleteMutation.mutate(announcementToDelete.id);
    setAnnouncementToDelete(null);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Mural de Avisos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Comunicados e informacoes importantes</p>
        </div>

        {canEdit ? (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2 sm:w-auto"><Plus className="h-4 w-4" /> Novo Aviso</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Aviso</DialogTitle>
              </DialogHeader>
              <AnnouncementForm
                onSubmit={(data) => createMutation.mutateAsync(data)}
                isLoading={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2 pb-1 sm:min-w-0 sm:flex-wrap">
          {['all', 'geral', 'rh', 'ti', 'financeiro', 'vendas', 'pos_vendas'].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setFilter(category)}
              className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                filter === category ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {category === 'all' ? 'Todos' : categoryLabels[category]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-24 w-full rounded-xl" />)}</div>
      ) : sorted.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <Bell className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>Nenhum aviso encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((announcement) => {
            const config = priorityConfig[announcement.priority] || priorityConfig.media;
            const preview = getAnnouncementPreview(announcement.content);

            return (
              <div
                key={announcement.id}
                className={`overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md ${
                  announcement.pinned ? 'border-primary/30 bg-primary/[0.02]' : 'border-border'
                }`}
              >
                {announcement.image_url ? (
                  <div className="border-b border-border bg-muted/20">
                    <img
                      src={announcement.image_url}
                      alt={announcement.title}
                      className="h-52 w-full object-cover sm:h-64"
                    />
                  </div>
                ) : null}

                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {announcement.pinned ? <Pin className="h-4 w-4 shrink-0 text-primary" /> : null}
                        <h3 className="text-base font-semibold leading-tight">{announcement.title}</h3>
                        <Badge variant="outline" className={`text-[10px] ${config.class}`}>{announcement.priority}</Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {categoryLabels[announcement.category] || announcement.category}
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{preview}</p>

                      <Button
                        type="button"
                        variant="link"
                        className="mt-2 h-auto px-0 text-sm font-semibold"
                        onClick={() => setSelectedAnnouncement(announcement)}
                      >
                        Ler aviso completo
                      </Button>

                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        Publicado em {format(new Date(announcement.created_date), "d 'de' MMMM 'de' yyyy 'as' HH:mm", { locale: ptBR })}
                        {announcement.created_by ? ` · por ${announcement.created_by}` : ''}
                      </p>

                      <AnnouncementInteractions
                        announcementId={announcement.id}
                        currentUserId={currentUser?.collaborator_id || currentUser?.id}
                      />
                    </div>

                    {canEdit ? (
                      <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
                        <Button variant="ghost" size="icon" onClick={() => togglePin.mutate(announcement)} className="h-8 w-8">
                          <Pin className={`h-4 w-4 ${announcement.pinned ? 'text-primary' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setAnnouncementToDelete(announcement)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(announcementToDelete)}
        onOpenChange={(open) => !open && setAnnouncementToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir aviso"
        description={
          announcementToDelete
            ? `Essa acao nao pode ser desfeita. Deseja excluir o aviso "${announcementToDelete.title}"?`
            : 'Essa acao nao pode ser desfeita.'
        }
      />

      <AnnouncementDetailsDialog
        announcement={selectedAnnouncement}
        open={Boolean(selectedAnnouncement)}
        onOpenChange={(open) => !open && setSelectedAnnouncement(null)}
      />
    </div>
  );
}
