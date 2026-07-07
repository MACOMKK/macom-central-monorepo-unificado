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
  FileText,
  BookOpen,
  GraduationCap,
  DollarSign,
  X,
  Pencil,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  FeedbackToast,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@macom/ui';
import DocumentForm from '../components/documents/DocumentForm';
import { usePermissions } from '@/lib/usePermissions';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import Pagination, { usePaginatedItems } from '../components/Pagination';

const categoryConfig = {
  politica: {
    label: 'Políticas',
    helper: 'Regras e diretrizes da empresa',
    icon: Shield,
    iconWrap: 'bg-blue-100 text-blue-500',
    accent: 'border-blue-100 hover:border-blue-200',
  },
  procedimento: {
    label: 'Procedimentos',
    helper: 'Fluxos e execuções operacionais',
    icon: ClipboardList,
    iconWrap: 'bg-orange-100 text-orange-500',
    accent: 'border-orange-100 hover:border-orange-200',
  },
  formulario: {
    label: 'Formulários',
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
    helper: 'Materiais de capacitação',
    icon: GraduationCap,
    iconWrap: 'bg-amber-100 text-amber-500',
    accent: 'border-amber-100 hover:border-amber-200',
  },
  relatorio: {
    label: 'Relatórios',
    helper: 'Relatórios e documentos analíticos',
    icon: FileText,
    iconWrap: 'bg-cyan-100 text-cyan-600',
    accent: 'border-cyan-100 hover:border-cyan-200',
  },
  vendas: {
    label: 'Vendas',
    helper: 'Materiais comerciais e apoio ao time de vendas',
    icon: DollarSign,
    iconWrap: 'bg-emerald-100 text-emerald-500',
    accent: 'border-emerald-100 hover:border-emerald-200',
  },
  outros: {
    label: 'Outros',
    helper: 'Documentos fora das categorias principais',
    icon: FolderOpen,
    iconWrap: 'bg-slate-100 text-slate-500',
    accent: 'border-slate-200 hover:border-slate-300',
  },
};

const companyOptions = [
  { value: 'macom_motors', label: 'Macom Motos' },
  { value: 'macom_mitsubishi', label: 'Macom Mitsubishi' },
];

const companyLabelMap = Object.fromEntries(companyOptions.map((company) => [company.value, company.label]));

function prependDocument(documents, document) {
  if (!document?.id) return documents;
  return [document, ...documents.filter((item) => item.id !== document.id)];
}

function replaceDocument(documents, document) {
  if (!document?.id) return documents;
  return documents.map((item) => (item.id === document.id ? { ...item, ...document } : item));
}

function removeDocument(documents, id) {
  return documents.filter((document) => document.id !== id);
}

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

function getErrorMessage(error, fallback) {
  if (!error) return fallback;
  const message = error instanceof Error ? error.message : '';
  if (/max clients reached|MAXCONNSESSION|pool_size/i.test(message)) {
    return 'O sistema está com muitos acessos simultâneos no momento. Aguarde alguns instantes e tente novamente.';
  }
  return message || fallback;
}

function getDocumentVisibility(document) {
  const visibility = document?.visibility || (document?.position_id ? 'cargo' : document?.department_id || document?.department ? 'setor' : 'geral');
  if (visibility === 'nivel') {
    return {
      key: 'nivel',
      label: document?.minimum_access_level === 'admin' ? 'Somente Admin' : 'Gestor/Admin',
    };
  }
  if (visibility === 'cargo') {
    return {
      key: 'cargo',
      label: document?.position_name || 'Cargo',
    };
  }
  if (visibility === 'setor') {
    return {
      key: 'setor',
      label: document?.department_name || 'Setor',
    };
  }
  return {
    key: 'geral',
    label: 'Geral',
  };
}

export default function Documents() {
  const { canEdit } = usePermissions('documentos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const queryClient = useQueryClient();

  const {
    data: documents = [],
    error: documentsError,
    isError: isDocumentsError,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['documents'],
    queryFn: () => appClient.entities.Document.list('-created_date', 100),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['catalog-departments'],
    queryFn: () => appClient.catalogs.listDepartments(),
  });
  const { data: positions = [] } = useQuery({
    queryKey: ['catalog-positions'],
    queryFn: () => appClient.catalogs.listPositions(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => appClient.entities.Document.create(data),
    onSuccess: (createdDocument) => {
      queryClient.setQueryData(['documents'], (old = []) => (
        Array.isArray(old) ? prependDocument(old, createdDocument) : old
      ));
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDialogOpen(false);
      setEditingDocument(null);
      setFeedback({ type: 'success', message: 'Documento criado com sucesso.' });
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'Não foi possível criar o documento.'),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.Document.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['documents'] });
      const previousDocuments = queryClient.getQueryData(['documents']);
      const optimisticDocument = {
        ...data,
        id,
        updated_date: new Date().toISOString(),
      };

      queryClient.setQueryData(['documents'], (old = []) => (
        Array.isArray(old) ? replaceDocument(old, optimisticDocument) : old
      ));
      setDialogOpen(false);
      setEditingDocument(null);
      setPreviewDocument((current) => (current?.id === id ? { ...current, ...optimisticDocument } : current));

      return { previousDocuments };
    },
    onSuccess: (updatedDocument) => {
      queryClient.setQueryData(['documents'], (old = []) => (
        Array.isArray(old) ? replaceDocument(old, updatedDocument) : old
      ));
      setPreviewDocument((current) => (current?.id === updatedDocument?.id ? updatedDocument : current));
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDialogOpen(false);
      setEditingDocument(null);
      setFeedback({ type: 'success', message: 'Documento atualizado com sucesso.' });
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(['documents'], context?.previousDocuments);
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'Não foi possível atualizar o documento.'),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => appClient.entities.Document.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['documents'] });
      const previousDocuments = queryClient.getQueryData(['documents']);

      queryClient.setQueryData(['documents'], (old = []) => (
        Array.isArray(old) ? removeDocument(old, id) : old
      ));
      setDocumentToDelete(null);
      setPreviewDocument((current) => (current?.id === id ? null : current));

      return { previousDocuments };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDocumentToDelete(null);
      setFeedback({ type: 'success', message: 'Documento excluído com sucesso.' });
    },
    onError: (error, _id, context) => {
      queryClient.setQueryData(['documents'], context?.previousDocuments);
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, 'Não foi possível excluir o documento.'),
      });
    },
  });

  const normalizedSearch = search.toLowerCase().trim();
  const departmentOptions = departments.length > 0
    ? departments
    : Array.from(
      new Map(
        documents
          .filter((document) => document.department_id || document.department_name || document.department)
          .map((document) => [
            String(document.department_id || document.department || document.department_name),
            {
              id: document.department_id || document.department || document.department_name,
              key: document.department || document.department_id || document.department_name,
              name: document.department_name || document.department,
            },
          ])
      ).values()
    );
  const positionOptions = positions.length > 0
    ? positions
    : Array.from(
      new Map(
        documents
          .filter((document) => document.position_id || document.position_name)
          .map((document) => [
            String(document.position_id || document.position_name),
            {
              id: document.position_id || document.position_name,
              name: document.position_name,
            },
          ])
      ).values()
    );
  const departmentScopedDocuments = documents.filter((document) => {
    const visibility = getDocumentVisibility(document);
    const matchCompany =
      companyFilter === 'all' ||
      (document.company || 'macom_motors') === companyFilter;
    const matchDepartment =
      departmentFilter === 'all' ||
      (departmentFilter === '__general__' && visibility.key === 'geral') ||
      (departmentFilter === '__restricted__' && visibility.key === 'nivel') ||
      document.department_id === departmentFilter ||
      document.department === departmentFilter;
    const matchPosition =
      positionFilter === 'all' ||
      (positionFilter === '__position__' && visibility.key === 'cargo') ||
      document.position_id === positionFilter;
    return matchCompany && matchDepartment && matchPosition;
  });

  const categoryScopedDocuments = departmentScopedDocuments.filter((document) => {
    const matchCat = catFilter === 'all' || document.category === catFilter;
    return matchCat;
  });

  const filtered = categoryScopedDocuments.filter((document) => {
    const matchSearch =
      !normalizedSearch ||
      document.title?.toLowerCase().includes(normalizedSearch) ||
      document.description?.toLowerCase().includes(normalizedSearch) ||
      document.file_name?.toLowerCase().includes(normalizedSearch) ||
      document.department_name?.toLowerCase().includes(normalizedSearch) ||
      document.position_name?.toLowerCase().includes(normalizedSearch) ||
      getDocumentVisibility(document).label.toLowerCase().includes(normalizedSearch) ||
      companyLabelMap[document.company || 'macom_motors']?.toLowerCase().includes(normalizedSearch);
    return matchSearch;
  });

  const categoryCards = Object.entries(categoryConfig)
    .map(([key, config]) => {
      const items = departmentScopedDocuments.filter((document) => (document.category || 'outros') === key);
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
  } = usePaginatedItems(filtered, pageSize, [search, catFilter, companyFilter, departmentFilter, positionFilter]);
  const activeCategoryLabel = catFilter === 'all' ? null : (categoryConfig[catFilter] || categoryConfig.outros).label;
  const previewType = previewDocument ? getPreviewType(previewDocument) : null;
  const hasAdvancedFilters = companyFilter !== 'all' || departmentFilter !== 'all' || positionFilter !== 'all';

  const handleConfirmDelete = () => {
    if (!documentToDelete) return;
    deleteMutation.mutate(documentToDelete.id);
  };

  const clearAdvancedFilters = () => {
    setCompanyFilter('all');
    setDepartmentFilter('all');
    setPositionFilter('all');
  };

  const openCreateDialog = () => {
    setEditingDocument(null);
    setDialogOpen(true);
  };

  const openEditDialog = (document) => {
    setEditingDocument(document);
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open) => {
    setDialogOpen(open);
    if (!open) {
      setEditingDocument(null);
    }
  };

  const handleSubmitDocument = (data) => {
    if (editingDocument) {
      updateMutation.mutate({ id: editingDocument.id, data });
      return;
    }

    createMutation.mutate(data);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Documentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Repositório oficial de arquivos, formulários e manuais da empresa.
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
            <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button className="h-10 w-full rounded-xl px-4 text-sm font-medium sm:w-auto" onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingDocument ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
                </DialogHeader>
                <DocumentForm
                  key={editingDocument?.id || 'new-document'}
                  initialData={editingDocument}
                  onSubmit={handleSubmitDocument}
                  isLoading={createMutation.isPending || updateMutation.isPending}
                  submitLabel={editingDocument ? 'Salvar Alterações' : 'Salvar Documento'}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="-mt-4 flex flex-wrap items-center gap-2">
        <div className="min-w-[190px] max-w-[220px] flex-1 sm:flex-none">
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="h-8 rounded-lg border-border/70 bg-background px-3 text-xs shadow-none">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Empresa</SelectItem>
              {companyOptions.map((company) => (
                <SelectItem key={company.value} value={company.value}>
                  {company.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[190px] max-w-[220px] flex-1 sm:flex-none">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="h-8 rounded-lg border-border/70 bg-background px-3 text-xs shadow-none">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Departamento</SelectItem>
              <SelectItem value="__general__">Geral</SelectItem>
              <SelectItem value="__restricted__">Restritos por nivel</SelectItem>
              {departmentOptions.map((department) => (
                <SelectItem key={department.id || department.key} value={department.id || department.key}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[190px] max-w-[220px] flex-1 sm:flex-none">
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="h-8 rounded-lg border-border/70 bg-background px-3 text-xs shadow-none">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cargo</SelectItem>
              <SelectItem value="__position__">Todos por cargo</SelectItem>
              {positionOptions.map((position) => (
                <SelectItem key={position.id} value={position.id}>
                  {position.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasAdvancedFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg px-2 text-xs text-muted-foreground"
            onClick={clearAdvancedFilters}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Limpar
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-60 rounded-[24px]" />)}
          </div>
          <Skeleton className="h-96 rounded-[28px]" />
        </div>
      ) : isDocumentsError ? (
        <Alert variant="destructive" className="rounded-2xl border-destructive/30 bg-destructive/5">
          <AlertTitle>Não foi possível carregar os documentos</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{getErrorMessage(documentsError, 'Tente novamente em alguns instantes.')}</span>
            <Button
              type="button"
              variant="outline"
              className="w-full shrink-0 sm:w-auto"
              disabled={isFetching}
              onClick={() => refetch()}
            >
              {isFetching ? 'Tentando...' : 'Tentar novamente'}
            </Button>
          </AlertDescription>
        </Alert>
      ) : filtered.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-border bg-card py-20 text-center text-muted-foreground shadow-sm">
          <FolderOpen className="mx-auto mb-4 h-12 w-12 opacity-30" />
          <p>Nenhum documento encontrado.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            {catFilter !== 'all' && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Filtro ativo: {activeCategoryLabel}</p>
                <button
                  type="button"
                  onClick={() => setCatFilter('all')}
                  className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Ver todos
                </button>
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-1">
              {categoryCards.map((category) => {
                const Icon = category.config.icon;
                const isActive = catFilter === category.key;

                return (
                  <button
                    type="button"
                    key={category.key}
                    onClick={() => setCatFilter((current) => (current === category.key ? 'all' : category.key))}
                    className={`flex min-w-max items-center gap-3 rounded-xl border bg-card px-3 py-2 text-left shadow-sm transition-colors ${
                      isActive
                        ? 'border-primary/50 bg-primary/5 text-primary ring-2 ring-primary/10'
                        : 'border-border hover:border-primary/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${category.config.iconWrap}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight text-foreground">{category.config.label}</p>
                      <p className="text-[11px] leading-4 text-muted-foreground">
                        {category.count} {category.count === 1 ? 'arquivo' : 'arquivos'} · {formatDate(category.latestValue)}
                      </p>
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
                    : 'Documentos mais recentes para consulta rápida da equipe.'}
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
                const visibility = getDocumentVisibility(document);

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
                            {size && <span>&bull;</span>}
                            <span>Modificado {formatDate(document.updated_date || document.created_date)}</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[9px] font-medium">
                            {config.label}
                          </Badge>
                          <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[9px] font-medium text-muted-foreground">
                            {companyLabelMap[document.company || 'macom_motors'] || 'Macom Motos'}
                          </Badge>
                          {visibility.key === 'nivel' && (
                            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[9px] font-medium text-muted-foreground">
                              {visibility.label}
                            </Badge>
                          )}
                          {visibility.key !== 'nivel' && (
                            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[9px] font-medium text-muted-foreground">
                              {visibility.label}
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
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => openEditDialog(document)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDocumentToDelete(document)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
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
                        Este tipo de arquivo não possui visualização interna no momento.
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
            ? `Essa ação não pode ser desfeita. Deseja excluir o documento "${documentToDelete.title}"?`
            : 'Essa ação não pode ser desfeita.'
        }
        isLoading={deleteMutation.isPending}
      />

      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}
