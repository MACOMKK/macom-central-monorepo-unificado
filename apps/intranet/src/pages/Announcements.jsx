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
import AnnouncementInteractions from '../components/announcements/AnnouncementInteractions';

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

export default function Announcements() {
  const { canEdit } = usePermissions('avisos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState('all');
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
              <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Aviso</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
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

      <div className="mb-6 flex flex-wrap gap-2">
        {['all', 'geral', 'rh', 'ti', 'financeiro', 'vendas', 'pos_vendas'].map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setFilter(category)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === category ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {category === 'all' ? 'Todos' : categoryLabels[category]}
          </button>
        ))}
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

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {announcement.pinned ? <Pin className="h-4 w-4 shrink-0 text-primary" /> : null}
                        <h3 className="font-semibold">{announcement.title}</h3>
                        <Badge variant="outline" className={`text-[10px] ${config.class}`}>{announcement.priority}</Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {categoryLabels[announcement.category] || announcement.category}
                        </Badge>
                      </div>

                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{announcement.content}</p>

                      <p className="mt-3 text-xs text-muted-foreground">
                        Publicado em {format(new Date(announcement.created_date), "d 'de' MMMM 'de' yyyy 'as' HH:mm", { locale: ptBR })}
                        {announcement.created_by ? ` · por ${announcement.created_by}` : ''}
                      </p>

                      <AnnouncementInteractions
                        announcementId={announcement.id}
                        currentUserId={currentUser?.collaborator_id || currentUser?.id}
                      />
                    </div>

                    {canEdit ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => togglePin.mutate(announcement)} className="h-8 w-8">
                          <Pin className={`h-4 w-4 ${announcement.pinned ? 'text-primary' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(announcement.id)}
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
    </div>
  );
}
