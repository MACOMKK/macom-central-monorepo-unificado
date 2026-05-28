import React, { useState } from 'react';
import { appClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Download,
  Trash2,
  Search,
  Eye,
  FolderOpen,
  Shield,
  ClipboardList,
  Files,
  BookOpen,
  GraduationCap,
  EllipsisVertical,
} from 'lucide-react';
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Input, Skeleton } from '@macom/ui';
import DocumentForm from '../components/documents/DocumentForm';
import { usePermissions } from '@/lib/usePermissions';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import Pagination, { usePaginatedItems } from '../components/Pagination';

const categoryConfig = {
  politica: {
    label: 'Politicas',
    helper: 'Regras e diretrizes da empresa',
    icon: Shield,
    iconWrap: 'bg-blue-100 text-blue-500',
    accent: 'border-blue-100 hover:border-blue-200',
  },
  procedimento: {
    label: 'Procedimentos',
    helper: 'Fluxos e execucoes operacionais',
    icon: ClipboardList,
    iconWrap: 'bg-orange-100 text-orange-500',
    accent: 'border-orange-100 hover:border-orange-200',
  },
  formulario: {
    label: 'Formularios',
    helper: 'Modelos e arquivos para preenchimento',
    icon: Files,
    iconWrap: 'bg-emerald-100 text-emerald-500',
    accent: 'border-emerald-100 hover:border-emerald-200',
  },
  manual: {
    label: 'Manuais',
    helper: 'Guias e materiais de consulta',
    icon: BookOpen,
    iconWrap: 'bg-violet-100 text-violet-500',
    accent: 'border-violet-100 hover:border-violet-200',
  },
  treinamento: {
    label: 'Treinamentos',
    helper: 'Materiais de capacitacao',
    icon: GraduationCap,
    iconWrap: 'bg-amber-100 text-amber-500',
    accent: 'border-amber-100 hover:border-amber-200',
  },
  outros: {
    label: 'Outros',
    helper: 'Documentos fora das categorias principais',
    icon: FolderOpen,
    iconWrap: 'bg-slate-100 text-slate-500',
    accent: 'border-slate-200 hover:border-slate-300',
  },
};

function formatFileSize(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function getPreviewType(document) {
  const fileType = String(document?.file_type || '').toLowerCase();
  const fileName = String(document?.file_name || document?.title || '').toLowerCase();
  const fileUrl = String(document?.file_url || '').toLowerCase();

  if (fileType.includes('pdf') || fileName.endsWith('.pdf') || fileUrl.endsWith('.pdf')) {
    return 'pdf';
  }

  if (
    fileType.startsWith('image/') ||
    /\.(png|jpg|jpeg|webp|gif|bmp|svg)$/.test(fileName) ||
    /\.(png|jpg|jpeg|webp|gif|bmp|svg)(\?|$)/.test(fileUrl)
  ) {
    return 'image';
  }

  return 'unsupported';
}

export default function Documents() {
  const { canEdit } = usePermissions('documentos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [documentToDelete, setDocumentToDelete] = useState(null);
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

  const normalizedSearch = search.toLowerCase().trim();
  const categoryScopedDocuments = documents.filter((document) => {
    const matchCat = catFilter === 'all' || document.category === catFilter;
    return matchCat;
  });

  const filtered = categoryScopedDocuments.filter((document) => {
    const matchSearch =
      !normalizedSearch ||
      document.title?.toLowerCase().includes(normalizedSearch) ||
      document.description?.toLowerCase().includes(normalizedSearch) ||
      document.file_name?.toLowerCase().includes(normalizedSearch) ||
      document.department_name?.toLowerCase().includes(normalizedSearch);
    return matchSearch;
  });

  const categoryCards = Object.entries(categoryConfig)
    .map(([key, config]) => {
      const items = categoryScopedDocuments.filter((document) => (document.category || 'outros') === key);
      if (!items.length) return null;

      const latestValue = items.reduce((latest, document) => {
        const current = document.updated_date || document.created_date;
        if (!current) return latest;
        return !latest || new Date(current) > new Date(latest) ? current : latest;
      }, null);

      return {
        key,
        config,
        count: items.length,
        latestValue,
      };
    })
    .filter(Boolean);

  const pageSize = catFilter === 'all' ? 8 : 12;
  const {
    page,
    setPage,
    totalItems,
    totalPages,
    paginatedItems: paginatedDocuments,
  } = usePaginatedItems(filtered, pageSize, [search, catFilter]);
  const activeCategoryLabel = catFilter === 'all' ? null : (categoryConfig[catFilter] || categoryConfig.outros).label;
  const previewType = previewDocument ? getPreviewType(previewDocument) : null;

  const handleConfirmDelete = () => {
    if (!documentToDelete) return;
    deleteMutation.mutate(documentToDelete.id);
    setDocumentToDelete(null);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Documentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Repositorio oficial de arquivos, formularios e manuais da empresa.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <div className="relative min-w-0 flex-1 lg:w-[320px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar arquivos..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 rounded-xl border-border bg-background pl-10 text-sm shadow-sm"
            />
          </div>
          {canEdit && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-10 w-full rounded-xl px-4 text-sm font-medium sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Novo Documento</DialogTitle>
                </DialogHeader>
                <DocumentForm onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-60 rounded-[24px]" />)}
          </div>
          <Skeleton className="h-96 rounded-[28px]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-border bg-card py-20 text-center text-muted-foreground shadow-sm">
          <FolderOpen className="mx-auto mb-4 h-12 w-12 opacity-30" />
          <p>Nenhum documento encontrado.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Pastas Principais</h2>
                {activeCategoryLabel && (
                  <p className="mt-1 text-xs text-muted-foreground">Filtro ativo: {activeCategoryLabel}</p>
                )}
              </div>
              {catFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setCatFilter('all')}
                  className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Ver todos
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {categoryCards.map((category) => {
                const Icon = category.config.icon;
                const isActive = catFilter === category.key;

                return (
                  <button
                    type="button"
                    key={category.key}
                    onClick={() => setCatFilter((current) => (current === category.key ? 'all' : category.key))}
                    className={`group rounded-[20px] border bg-card p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                      isActive
                        ? 'border-primary/40 ring-2 ring-primary/10'
                        : category.config.accent
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${category.config.iconWrap}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <EllipsisVertical className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground/70" />
                    </div>

                    <div className="space-y-2">
                      <div>
                        <h3 className="text-base font-semibold leading-tight text-foreground">{category.config.label}</h3>
                        <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">{category.config.helper}</p>
                      </div>

                      <div className="flex flex-wrap items-end gap-3 text-[10px] text-muted-foreground">
                        <div>
                          <p className="font-medium">{category.count}</p>
                          <p>{category.count === 1 ? 'arquivo' : 'arquivos'}</p>
                        </div>
                        <div>
                          <p className="font-medium">Atualizado:</p>
                          <p>{formatDate(category.latestValue)}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {catFilter === 'all' ? 'Arquivos Recentes' : `Arquivos de ${activeCategoryLabel}`}
                </h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {normalizedSearch
                    ? `Resultados para "${search}".`
                    : 'Documentos mais recentes para consulta rapida da equipe.'}
                </p>
              </div>
              {catFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setCatFilter('all')}
                  className="text-left text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Ver todos
                </button>
              )}
            </div>

            <div className="divide-y divide-border/70">
              {paginatedDocuments.map((document) => {
                const config = categoryConfig[document.category] || categoryConfig.outros;
                const Icon = config.icon;
                const size = formatFileSize(document.file_size);

                return (
                  <div
                    key={document.id}
                    className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:px-6"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.iconWrap}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setPreviewDocument(document)}
                            className="line-clamp-2 text-left text-[15px] font-semibold leading-tight text-foreground transition-colors hover:text-primary sm:truncate"
                          >
                            {document.title}
                          </button>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                            {size && <span>{size}</span>}
                            {size && <span>•</span>}
                            <span>Modificado {formatDate(document.updated_date || document.created_date)}</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[9px] font-medium">
                            {config.label}
                          </Badge>
                          {document.department_name && (
                            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[9px] font-medium text-muted-foreground">
                              {document.department_name}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {document.description && (
                        <p className="mt-1.5 line-clamp-2 text-[11px] text-muted-foreground">{document.description}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                      {document.file_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => setPreviewDocument(document)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {document.file_url && (
                        <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDocumentToDelete(document)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-4 pb-4 sm:px-6 sm:pb-5">
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setPage}
                itemLabel="documentos"
              />
            </div>
          </section>
        </div>
      )}

      <Dialog open={Boolean(previewDocument)} onOpenChange={(open) => !open && setPreviewDocument(null)}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto p-4 sm:p-6">
          {previewDocument && (
            <>
              <DialogHeader className="border-b border-border pb-4">
                <DialogTitle className="line-clamp-1 text-lg text-foreground">{previewDocument.title}</DialogTitle>
              </DialogHeader>

              <div>
                <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">
                  {previewType === 'pdf' && previewDocument.file_url ? (
                    <iframe
                      title={previewDocument.title}
                      src={previewDocument.file_url}
                      className="h-[58vh] w-full sm:h-[70vh]"
                    />
                  ) : null}

                  {previewType === 'image' && previewDocument.file_url ? (
                    <div className="flex justify-center p-4">
                      <img
                        src={previewDocument.file_url}
                        alt={previewDocument.title}
                        className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain"
                      />
                    </div>
                  ) : null}

                  {previewType === 'unsupported' ? (
                    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        Este tipo de arquivo nao possui visualizacao interna no momento.
                      </p>
                      {previewDocument.file_url && (
                        <a href={previewDocument.file_url} target="_blank" rel="noopener noreferrer">
                          <Button className="gap-2">
                            <Download className="h-4 w-4" />
                            Baixar arquivo
                          </Button>
                        </a>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(documentToDelete)}
        onOpenChange={(open) => !open && setDocumentToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir documento"
        description={
          documentToDelete
            ? `Essa acao nao pode ser desfeita. Deseja excluir o documento "${documentToDelete.title}"?`
            : 'Essa acao nao pode ser desfeita.'
        }
      />
    </div>
  );
}
