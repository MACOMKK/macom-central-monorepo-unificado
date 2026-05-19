import React, { useState } from 'react';
import { appClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Search } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Skeleton } from '@macom/ui';
import KnowledgeForm from '../components/knowledge/KnowledgeForm';
import KnowledgeCard from '../components/knowledge/KnowledgeCard';
import { usePermissions } from '@/lib/usePermissions';
import { toast } from 'sonner';

const CATEGORIES = ['all', 'geral', 'rh', 'ti', 'financeiro', 'vendas', 'pos_vendas', 'beneficios', 'politicas'];
const CATEGORY_LABELS = {
  all: 'Todos', geral: 'Geral', rh: 'RH', ti: 'TI', financeiro: 'Financeiro',
  vendas: 'Vendas', pos_vendas: 'Pós-Vendas', beneficios: 'Benefícios', politicas: 'Políticas',
};
const TYPES = ['all', 'faq', 'artigo', 'tutorial', 'politica'];
const TYPE_LABELS = { all: 'Todos os tipos', faq: 'FAQ', artigo: 'Artigo', tutorial: 'Tutorial', politica: 'Política' };

export default function KnowledgeBase() {
  const { canEdit } = usePermissions('colaboradores'); // reuse permissions or just allow all
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['knowledge'],
    queryFn: () => appClient.entities.KnowledgeBase.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => appClient.entities.KnowledgeBase.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      setDialogOpen(false);
      toast.success('Artigo criado!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.KnowledgeBase.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      setDialogOpen(false);
      setEditing(null);
      toast.success('Artigo atualizado!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => appClient.entities.KnowledgeBase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      toast.success('Artigo removido!');
    },
  });

  const handleSubmit = (data) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEdit = (item) => { setEditing(item); setDialogOpen(true); };
  const openCreate = () => { setEditing(null); setDialogOpen(true); };

  const filtered = items
    .filter(item => {
      const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
      const matchType = typeFilter === 'all' || item.type === typeFilter;
      const matchSearch = !search ||
        item.title?.toLowerCase().includes(search.toLowerCase()) ||
        item.content?.toLowerCase().includes(search.toLowerCase()) ||
        item.tags?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchType && matchSearch;
    })
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Base de Conhecimento</h1>
            <p className="text-sm text-muted-foreground">FAQs, artigos e políticas internas</p>
          </div>
        </div>
        {canEdit && (
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Novo Artigo
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título, conteúdo ou tag..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 flex-wrap mb-3">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              categoryFilter === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Type Filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {TYPES.map(type => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              typeFilter === type ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Stats */}
      {!isLoading && (
        <p className="text-xs text-muted-foreground mb-4">
          {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'} encontrados
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum artigo encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <KnowledgeCard
              key={item.id}
              item={item}
              canEdit={canEdit}
              onEdit={openEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Artigo' : 'Novo Artigo'}</DialogTitle>
          </DialogHeader>
          <KnowledgeForm
            key={editing?.id || 'new'}
            initial={editing || undefined}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

