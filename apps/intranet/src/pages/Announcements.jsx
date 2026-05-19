import React, { useState } from 'react';
import { appClient } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Pin, Trash2, AlertTriangle, Info, Bell } from 'lucide-react';
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Skeleton } from '@macom/ui';
import AnnouncementForm from '../components/announcements/AnnouncementForm';
import AnnouncementInteractions from '../components/announcements/AnnouncementInteractions';
import { usePermissions } from '@/lib/usePermissions';

const priorityConfig = {
  urgente: { icon: AlertTriangle, class: 'bg-red-100 text-red-700 border-red-200' },
  alta: { icon: AlertTriangle, class: 'bg-orange-100 text-orange-700 border-orange-200' },
  media: { icon: Info, class: 'bg-blue-100 text-blue-700 border-blue-200' },
  baixa: { icon: Bell, class: 'bg-gray-100 text-gray-700 border-gray-200' },
};

const categoryLabels = {
  geral: 'Geral', rh: 'RH', ti: 'TI', financeiro: 'Financeiro', vendas: 'Vendas', pos_vendas: 'Pós-Vendas'
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
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => appClient.entities.Announcement.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });

  const togglePin = useMutation({
    mutationFn: (a) => appClient.entities.Announcement.update(a.id, { pinned: !a.pinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });

  const filtered = filter === 'all' ? announcements : announcements.filter(a => a.category === filter);
  const sorted = [...filtered].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Mural de Avisos</h1>
          <p className="text-sm text-muted-foreground mt-1">Comunicados e informações importantes</p>
        </div>
        {canEdit && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Aviso</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Aviso</DialogTitle>
            </DialogHeader>
            <AnnouncementForm onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
          </DialogContent>
        </Dialog>}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {['all', 'geral', 'rh', 'ti', 'financeiro', 'vendas', 'pos_vendas'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {cat === 'all' ? 'Todos' : categoryLabels[cat]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum aviso encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(a => {
            const config = priorityConfig[a.priority] || priorityConfig.media;
            return (
              <div key={a.id} className={`bg-card border rounded-xl p-5 transition-all hover:shadow-md ${a.pinned ? 'border-primary/30 bg-primary/[0.02]' : 'border-border'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {a.pinned && <Pin className="w-4 h-4 text-primary shrink-0" />}
                      <h3 className="font-semibold">{a.title}</h3>
                      <Badge variant="outline" className={`text-[10px] ${config.class}`}>{a.priority}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{categoryLabels[a.category] || a.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-3">
                      Publicado em {format(new Date(a.created_date), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      {a.created_by && ` · por ${a.created_by}`}
                    </p>
                    <AnnouncementInteractions
                      announcementId={a.id}
                      currentUserId={currentUser?.collaborator_id || currentUser?.id}
                    />
                  </div>
                  {canEdit && <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => togglePin.mutate(a)} className="h-8 w-8">
                      <Pin className={`w-4 h-4 ${a.pinned ? 'text-primary' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(a.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

