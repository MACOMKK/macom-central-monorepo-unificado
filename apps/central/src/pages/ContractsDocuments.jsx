import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Edit, FilePlus2, Link as LinkIcon, Plus, Search, Trash2, UploadCloud } from 'lucide-react';

import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FeedbackToast from '@/components/ui/feedback-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/lib/AuthContext';
import { catalogApi } from '@/lib/catalogApi';
import { CENTRAL_PERMISSION_LEVELS } from '@/lib/centralPermissions';
import { supabase } from '@/lib/supabaseClient';
import { systemAccessApi } from '@/lib/systemAccessApi';
import { normalizeText, sanitizeFileName } from '@/lib/text';

const BUCKET_NAME = 'central-anexos';
const STORAGE_FOLDER = 'contratos-documentos';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const emptyForm = {
  titulo: '',
  tipo: 'contrato_sistema',
  fornecedor: '',
  sistema_id: 'none',
  unidade_id: 'none',
  data_inicio: '',
  data_vencimento: '',
  valor: '',
  status: 'ativo',
  responsavel_colaborador_id: 'none',
  observacoes: '',
  link_externo: '',
};

const typeOptions = [
  { value: 'contrato_sistema', label: 'Contrato de Sistema' },
  { value: 'contrato_licenca', label: 'Contrato de Licenca' },
  { value: 'aditivo', label: 'Aditivo' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'certificado', label: 'Certificado' },
  { value: 'outro', label: 'Outro' },
];

const statusOptions = [
  { value: 'ativo', label: 'Ativo', className: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' },
  { value: 'vencendo', label: 'Vencendo', className: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300' },
  { value: 'vencido', label: 'Vencido', className: 'border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300' },
  { value: 'encerrado', label: 'Encerrado', className: 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300' },
  { value: 'a_revisar', label: 'A revisar', className: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300' },
];

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
}

function formatCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatFileSize(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return '';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function toForm(document) {
  return {
    titulo: document.titulo || '',
    tipo: document.tipo || 'contrato_sistema',
    fornecedor: document.fornecedor || '',
    sistema_id: document.sistema_id || 'none',
    unidade_id: document.unidade_id || 'none',
    data_inicio: document.data_inicio || '',
    data_vencimento: document.data_vencimento || '',
    valor: document.valor ?? '',
    status: document.status || 'ativo',
    responsavel_colaborador_id: document.responsavel_colaborador_id || 'none',
    observacoes: document.observacoes || '',
    link_externo: document.link_externo || '',
  };
}

function buildPayload(form, extra = {}) {
  return {
    titulo: form.titulo.trim(),
    tipo: form.tipo,
    fornecedor: form.fornecedor.trim() || null,
    sistema_id: form.sistema_id === 'none' ? null : form.sistema_id,
    unidade_id: form.unidade_id === 'none' ? null : form.unidade_id,
    data_inicio: form.data_inicio || null,
    data_vencimento: form.data_vencimento || null,
    valor: form.valor === '' ? null : Number(form.valor),
    status: form.status,
    responsavel_colaborador_id: form.responsavel_colaborador_id === 'none' ? null : form.responsavel_colaborador_id,
    observacoes: form.observacoes.trim() || null,
    link_externo: form.link_externo.trim() || null,
    ...extra,
  };
}

function getOptionLabel(options, value) {
  return options.find((item) => item.value === value)?.label || '-';
}

function daysUntil(value) {
  if (!value) return null;
  const dueDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
}

function prettifyFileNameAsTitle(fileName) {
  const withoutExt = fileName.replace(/\.[^./\\]+$/, '');
  const spaced = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return spaced || fileName;
}

async function uploadContractFile(file, documentId) {
  if (!file) return null;

  const safeName = sanitizeFileName(file.name, 'documento');
  const storagePath = `${STORAGE_FOLDER}/${documentId || 'novo'}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, file, { upsert: true });

  if (error) {
    throw new Error(error.message || 'Nao foi possivel enviar o arquivo.');
  }

  return {
    arquivo_path: storagePath,
    arquivo_nome: file.name,
    arquivo_tipo: file.type || null,
    arquivo_tamanho: file.size || null,
  };
}

async function openStorageFile(path) {
  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Nao foi possivel abrir o arquivo.');
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

export default function ContractsDocuments() {
  const queryClient = useQueryClient();
  const { canCentral, profile } = useAuth();
  const canManage = canCentral?.('contratos_documentos', CENTRAL_PERMISSION_LEVELS.manage);
  const [feedback, setFeedback] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filters, setFilters] = useState({ search: '', tipo: 'all', status: 'all', vencimento: 'all' });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFiles, setImportFiles] = useState([]);
  const [importSkipped, setImportSkipped] = useState([]);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });

  const documentsQuery = useQuery({
    queryKey: ['central', 'contratos_documentos'],
    queryFn: catalogApi.contratos_documentos.list,
  });

  const systemsQuery = useQuery({
    queryKey: ['central', 'systems'],
    queryFn: systemAccessApi.systems.list,
  });

  const unitsQuery = useQuery({
    queryKey: ['central', 'unidades'],
    queryFn: catalogApi.unidades.list,
  });

  const collaboratorsQuery = useQuery({
    queryKey: ['central', 'colaboradores'],
    queryFn: catalogApi.colaboradores.list,
  });

  const systemsById = useMemo(() => new Map((systemsQuery.data || []).map((item) => [item.id, item.nome])), [systemsQuery.data]);
  const unitsById = useMemo(() => new Map((unitsQuery.data || []).map((item) => [item.id, item.nome])), [unitsQuery.data]);
  const collaboratorsById = useMemo(() => new Map((collaboratorsQuery.data || []).map((item) => [item.id, item.nome])), [collaboratorsQuery.data]);

  const filteredDocuments = useMemo(() => {
    const search = normalizeText(filters.search);
    return (documentsQuery.data || []).filter((document) => {
      const haystack = normalizeText(`${document.titulo || ''} ${document.fornecedor || ''} ${systemsById.get(document.sistema_id) || ''}`);
      if (search && !haystack.includes(search)) return false;
      if (filters.tipo !== 'all' && document.tipo !== filters.tipo) return false;
      if (filters.status !== 'all' && document.status !== filters.status) return false;

      const days = daysUntil(document.data_vencimento);
      if (filters.vencimento === 'vencidos') return days !== null && days < 0;
      if (filters.vencimento !== 'all') return days !== null && days >= 0 && days <= Number(filters.vencimento);
      return true;
    });
  }, [documentsQuery.data, filters, systemsById]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.titulo.trim()) {
        throw new Error('Informe o titulo do documento.');
      }

      if (editing) {
        const filePayload = file ? await uploadContractFile(file, editing.id) : {};
        const updated = await catalogApi.contratos_documentos.update(editing.id, buildPayload(form, filePayload));
        if (file && editing.arquivo_path && editing.arquivo_path !== filePayload.arquivo_path) {
          await supabase.storage.from(BUCKET_NAME).remove([editing.arquivo_path]);
        }
        return updated;
      }

      const created = await catalogApi.contratos_documentos.create(buildPayload(form, { criado_por: profile?.id || null }));
      if (file && created?.id) {
        try {
          const filePayload = await uploadContractFile(file, created.id);
          return await catalogApi.contratos_documentos.update(created.id, filePayload);
        } catch (error) {
          error.createdDocument = created;
          throw error;
        }
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['central', 'contratos_documentos'] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setFile(null);
      setFeedback({ type: 'success', message: editing ? 'Documento atualizado.' : 'Documento cadastrado.' });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['central', 'contratos_documentos'] });
      if (error.createdDocument) {
        setEditing(error.createdDocument);
        setFeedback({ type: 'error', message: `${error.message || 'Nao foi possivel anexar o arquivo.'} O documento ja foi cadastrado; tente enviar o arquivo novamente.` });
        return;
      }
      setFeedback({ type: 'error', message: error.message || 'Nao foi possivel salvar o documento.' });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (files) => {
      const results = { success: 0, failed: [] };
      setImportProgress({ done: 0, total: files.length });

      for (const currentFile of files) {
        try {
          const created = await catalogApi.contratos_documentos.create({
            titulo: prettifyFileNameAsTitle(currentFile.name),
            tipo: 'outro',
            status: 'a_revisar',
            fornecedor: null,
            sistema_id: null,
            unidade_id: null,
            data_inicio: null,
            data_vencimento: null,
            valor: null,
            responsavel_colaborador_id: null,
            observacoes: null,
            link_externo: null,
            criado_por: profile?.id || null,
          });
          try {
            const filePayload = await uploadContractFile(currentFile, created.id);
            await catalogApi.contratos_documentos.update(created.id, filePayload);
            results.success += 1;
          } catch (uploadError) {
            results.failed.push({ name: currentFile.name, reason: uploadError.message || 'Falha no upload do arquivo.' });
          }
        } catch (createError) {
          results.failed.push({ name: currentFile.name, reason: createError.message || 'Falha ao criar o registro.' });
        }
        setImportProgress((current) => ({ ...current, done: current.done + 1 }));
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['central', 'contratos_documentos'] });
      setImportDialogOpen(false);
      setImportFiles([]);
      setImportSkipped([]);
      setImportProgress({ done: 0, total: 0 });
      const failedCount = results.failed.length;
      setFeedback({
        type: failedCount ? 'error' : 'success',
        message: failedCount
          ? `${results.success} documento(s) importado(s). ${failedCount} falharam: ${results.failed.map((item) => item.name).join(', ')}`
          : `${results.success} documento(s) importado(s) com sucesso. Status "A revisar".`,
      });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['central', 'contratos_documentos'] });
      setFeedback({ type: 'error', message: error.message || 'Nao foi possivel concluir a importacao.' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (document) => {
      if (document.arquivo_path) {
        const { error } = await supabase.storage.from(BUCKET_NAME).remove([document.arquivo_path]);
        if (error) {
          throw new Error(error.message || 'Nao foi possivel remover o arquivo do documento.');
        }
      }
      await catalogApi.contratos_documentos.remove(document.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['central', 'contratos_documentos'] });
      setConfirmDelete(null);
      setFeedback({ type: 'success', message: 'Documento excluido.' });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message || 'Nao foi possivel excluir o documento.' });
    },
  });

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (document) => {
    setEditing(document);
    setForm(toForm(document));
    setFile(null);
    setDialogOpen(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0] || null;
    if (selected && selected.size > MAX_FILE_SIZE) {
      setFeedback({ type: 'error', message: 'O arquivo deve ter no maximo 10MB.' });
      event.target.value = '';
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const handleOpenImport = () => {
    setImportFiles([]);
    setImportSkipped([]);
    setImportProgress({ done: 0, total: 0 });
    setImportDialogOpen(true);
  };

  const handleImportFilesChange = (event) => {
    const selected = Array.from(event.target.files || []);
    const valid = [];
    const skipped = [];
    selected.forEach((currentFile) => {
      if (currentFile.size > MAX_FILE_SIZE) {
        skipped.push({ name: currentFile.name, reason: 'Arquivo maior que 10MB' });
      } else {
        valid.push(currentFile);
      }
    });
    setImportFiles(valid);
    setImportSkipped(skipped);
  };

  const handleConfirmImport = () => {
    if (importFiles.length) bulkImportMutation.mutate(importFiles);
  };

  const handleFileOpen = async (document) => {
    try {
      if (document.arquivo_path) {
        await openStorageFile(document.arquivo_path);
        return;
      }
      if (document.link_externo) {
        window.open(document.link_externo, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Nao foi possivel abrir o documento.' });
    }
  };

  const isLoading = documentsQuery.isLoading || systemsQuery.isLoading || unitsQuery.isLoading || collaboratorsQuery.isLoading;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Contratos e Documentos</h1>
          <p className="text-sm text-muted-foreground">Controle de contratos, licencas, certificados e anexos importantes.</p>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenImport} className="gap-2">
              <UploadCloud className="h-4 w-4" />
              Importar arquivos
            </Button>
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo documento
            </Button>
          </div>
        ) : null}
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_160px_170px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Buscar por titulo, fornecedor ou sistema"
              className="pl-9"
            />
          </div>
          <Select value={filters.tipo} onValueChange={(value) => setFilters((current) => ({ ...current, tipo: value }))}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {typeOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={(value) => setFilters((current) => ({ ...current, status: value }))}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {statusOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.vencimento} onValueChange={(value) => setFilters((current) => ({ ...current, vencimento: value }))}>
            <SelectTrigger><SelectValue placeholder="Vencimento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos vencimentos</SelectItem>
              <SelectItem value="30">Proximos 30 dias</SelectItem>
              <SelectItem value="60">Proximos 60 dias</SelectItem>
              <SelectItem value="90">Proximos 90 dias</SelectItem>
              <SelectItem value="vencidos">Vencidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Sistema</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead className="w-[120px] text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-28 text-center text-sm text-muted-foreground">Carregando documentos...</TableCell>
                </TableRow>
              ) : filteredDocuments.length ? filteredDocuments.map((document) => {
                const status = statusOptions.find((item) => item.value === document.status) || statusOptions[0];
                return (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div className="font-semibold text-foreground">{document.titulo}</div>
                      <div className="text-xs text-muted-foreground">{unitsById.get(document.unidade_id) || 'Todas/unidade nao definida'}</div>
                    </TableCell>
                    <TableCell>{getOptionLabel(typeOptions, document.tipo)}</TableCell>
                    <TableCell>{document.fornecedor || '-'}</TableCell>
                    <TableCell>{systemsById.get(document.sistema_id) || '-'}</TableCell>
                    <TableCell>{formatDate(document.data_vencimento)}</TableCell>
                    <TableCell>{formatCurrency(document.valor)}</TableCell>
                    <TableCell><Badge variant="outline" className={status.className}>{status.label}</Badge></TableCell>
                    <TableCell>
                      {document.arquivo_path || document.link_externo ? (
                        <Button variant="ghost" size="sm" className="h-8 gap-2 px-2" onClick={() => handleFileOpen(document)}>
                          {document.arquivo_path ? <Download className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                          <span className="max-w-[130px] truncate">{document.arquivo_nome || 'Abrir link'}</span>
                        </Button>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {canManage ? (
                          <>
                            <Button variant="ghost" size="icon" title="Editar" onClick={() => handleOpenEdit(document)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Excluir" onClick={() => setConfirmDelete(document)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-28 text-center text-sm text-muted-foreground">Nenhum documento encontrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar documento' : 'Novo documento'}</DialogTitle>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="titulo">Titulo</Label>
                <Input id="titulo" value={form.titulo} onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(value) => setForm((current) => ({ ...current, tipo: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{typeOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Input id="fornecedor" value={form.fornecedor} onChange={(event) => setForm((current) => ({ ...current, fornecedor: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">Valor</Label>
                <Input id="valor" type="number" min="0" step="0.01" value={form.valor} onChange={(event) => setForm((current) => ({ ...current, valor: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Sistema</Label>
                <Select value={form.sistema_id} onValueChange={(value) => setForm((current) => ({ ...current, sistema_id: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nao vincular</SelectItem>
                    {(systemsQuery.data || []).map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={form.unidade_id} onValueChange={(value) => setForm((current) => ({ ...current, unidade_id: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nao vincular</SelectItem>
                    {(unitsQuery.data || []).map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Inicio</Label>
                <Input id="data_inicio" type="date" value={form.data_inicio} onChange={(event) => setForm((current) => ({ ...current, data_inicio: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_vencimento">Vencimento</Label>
                <Input id="data_vencimento" type="date" value={form.data_vencimento} onChange={(event) => setForm((current) => ({ ...current, data_vencimento: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Responsavel</Label>
                <Select value={form.responsavel_colaborador_id} onValueChange={(value) => setForm((current) => ({ ...current, responsavel_colaborador_id: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nao vincular</SelectItem>
                    {(collaboratorsQuery.data || []).map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="link_externo">Link externo</Label>
                <Input id="link_externo" type="url" value={form.link_externo} onChange={(event) => setForm((current) => ({ ...current, link_externo: event.target.value }))} placeholder="https://" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="arquivo">Arquivo</Label>
                <Input id="arquivo" type="file" onChange={handleFileChange} />
                {editing?.arquivo_nome ? <p className="text-xs text-muted-foreground">Atual: {editing.arquivo_nome} {formatFileSize(editing.arquivo_tamanho)}</p> : null}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observacoes">Observacoes</Label>
                <textarea
                  id="observacoes"
                  value={form.observacoes}
                  onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))}
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="gap-2" disabled={saveMutation.isPending}>
                <FilePlus2 className="h-4 w-4" />
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={(open) => !open && !bulkImportMutation.isPending && setImportDialogOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar arquivos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Selecione varios arquivos (PDF, fotos, etc). Um documento sera criado para cada
              arquivo com status "A revisar" - edite os detalhes depois pela tela.
            </p>
            <div className="space-y-2">
              <Input type="file" multiple onChange={handleImportFilesChange} disabled={bulkImportMutation.isPending} />
              {importFiles.length ? (
                <p className="text-xs text-muted-foreground">{importFiles.length} arquivo(s) selecionado(s)</p>
              ) : null}
              {importSkipped.length ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                  <p className="font-semibold">Ignorados (acima de 10MB):</p>
                  <ul className="list-disc pl-4">
                    {importSkipped.map((item) => <li key={item.name}>{item.name}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
            {bulkImportMutation.isPending ? (
              <p className="text-sm font-medium">{importProgress.done}/{importProgress.total} enviados...</p>
            ) : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setImportDialogOpen(false)} disabled={bulkImportMutation.isPending}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="gap-2"
                onClick={handleConfirmImport}
                disabled={!importFiles.length || bulkImportMutation.isPending}
              >
                <UploadCloud className="h-4 w-4" />
                {bulkImportMutation.isPending ? 'Importando...' : `Importar ${importFiles.length || ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
        title="Excluir documento"
        description={`Deseja excluir ${confirmDelete?.titulo || 'este documento'}?`}
      />

      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}