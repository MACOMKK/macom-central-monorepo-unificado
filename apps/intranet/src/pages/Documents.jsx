import React, { useState } from 'react';
import { appClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Download, Trash2, Search, FolderOpen } from 'lucide-react';
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Input, Skeleton } from '@macom/ui';
import DocumentForm from '../components/documents/DocumentForm';
import { usePermissions } from '@/lib/usePermissions';

const categoryLabels = {
  politica: 'Politica',
  procedimento: 'Procedimento',
  formulario: 'Formulario',
  manual: 'Manual',
  treinamento: 'Treinamento',
  outros: 'Outros',
};

export default function Documents() {
  const { canEdit } = usePermissions('documentos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => appClient.entities.Document.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => appClient.entities.Document.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => appClient.entities.Document.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const filtered = documents.filter((document) => {
    const matchSearch = !search || document.title?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || document.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-sm text-muted-foreground mt-1">Repositorio de documentos internos</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Documento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo Documento</DialogTitle></DialogHeader>
              <DocumentForm onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar documentos..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', ...Object.keys(categoryLabels)].map((category) => (
            <button
              key={category}
              onClick={() => setCatFilter(category)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                catFilter === category ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {category === 'all' ? 'Todos' : categoryLabels[category]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum documento encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((document) => (
            <div key={document.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{document.title}</h3>
                {document.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{document.description}</p>}
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{categoryLabels[document.category] || document.category}</Badge>
                  {document.department_name && (
                    <Badge variant="outline" className="text-[10px]">{document.department_name}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {document.file_url && (
                  <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="w-4 h-4" /></Button>
                  </a>
                )}
                {canEdit && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(document.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

