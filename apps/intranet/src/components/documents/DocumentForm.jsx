import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, Loader2 } from 'lucide-react';

export default function DocumentForm({ onSubmit, isLoading }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'outros',
    department: '',
    file_url: '',
  });
  const [uploading, setUploading] = useState(false);

  const { data: departments = [] } = useQuery({
    queryKey: ['catalog-departments'],
    queryFn: () => appClient.catalogs.listDepartments(),
  });

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await appClient.storage.uploadFile(file);
    setForm((prev) => ({ ...prev, file_url }));
    setUploading(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Titulo</Label>
        <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder="Nome do documento" />
      </div>
      <div className="space-y-2">
        <Label>Descricao</Label>
        <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} placeholder="Breve descricao..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="politica">Politica</SelectItem>
              <SelectItem value="procedimento">Procedimento</SelectItem>
              <SelectItem value="formulario">Formulario</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="treinamento">Treinamento</SelectItem>
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
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:bg-muted transition-colors text-sm">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Enviando...' : form.file_url ? 'Arquivo enviado' : 'Selecionar arquivo'}
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
      </div>
      <Button type="submit" disabled={isLoading || uploading} className="w-full">
        {isLoading ? 'Salvando...' : 'Salvar Documento'}
      </Button>
    </form>
  );
}

