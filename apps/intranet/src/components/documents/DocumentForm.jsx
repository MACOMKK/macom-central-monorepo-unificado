import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/client';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@macom/ui';
import { Upload, Loader2 } from 'lucide-react';

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'outros',
  department: '',
  file_url: '',
  file_path: '',
  file_name: '',
  file_type: '',
  file_size: null,
};

function normalizeInitialData(initialData) {
  if (!initialData) return EMPTY_FORM;

  return {
    title: initialData.title || '',
    description: initialData.description || '',
    category: initialData.category || 'outros',
    department: initialData.department || initialData.department_id || '',
    file_url: initialData.file_url || '',
    file_path: initialData.file_path || '',
    file_name: initialData.file_name || '',
    file_type: initialData.file_type || '',
    file_size: initialData.file_size || null,
  };
}

export default function DocumentForm({ initialData = null, onSubmit, isLoading, submitLabel }) {
  const [uploadError, setUploadError] = useState('');
  const [form, setForm] = useState(() => normalizeInitialData(initialData));
  const [uploading, setUploading] = useState(false);

  const { data: departments = [] } = useQuery({
    queryKey: ['catalog-departments'],
    queryFn: () => appClient.catalogs.listDepartments(),
  });

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const uploadResult = await appClient.storage.uploadFile(file);
      setForm((prev) => ({ ...prev, ...uploadResult }));
    } catch (error) {
      setForm((prev) => ({
        ...prev,
        file_url: '',
        file_path: '',
        file_name: '',
        file_type: '',
        file_size: null,
      }));
      setUploadError(error instanceof Error ? error.message : 'Falha ao enviar arquivo.');
      event.target.value = '';
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Título</Label>
        <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder="Nome do documento" />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} placeholder="Breve descrição..." />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="politica">Política</SelectItem>
              <SelectItem value="procedimento">Procedimento</SelectItem>
              <SelectItem value="formulario">Formulário</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="treinamento">Treinamento</SelectItem>
              <SelectItem value="relatorio">Relatório</SelectItem>
              <SelectItem value="vendas">Vendas</SelectItem>
              <SelectItem value="outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Departamento</Label>
          <Select value={form.department || '__none__'} onValueChange={(value) => setForm({ ...form, department: value === '__none__' ? '' : value })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem departamento</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.key}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Arquivo</Label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm transition-colors hover:bg-muted sm:w-auto sm:justify-start sm:py-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Enviando...' : form.file_name ? 'Arquivo enviado' : 'Selecionar arquivo'}
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
        {form.file_name ? (
          <p className="text-xs text-muted-foreground">
            {form.file_name}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Envie um arquivo obrigatório para criar o documento. Limite de 5 MB.</p>
        )}
        {uploadError ? (
          <p className="text-xs text-destructive">{uploadError}</p>
        ) : null}
      </div>
      <Button type="submit" disabled={isLoading || uploading || !form.file_url || !form.file_path || !form.file_name} className="w-full">
        {isLoading ? 'Salvando...' : submitLabel || 'Salvar Documento'}
      </Button>
    </form>
  );
}

