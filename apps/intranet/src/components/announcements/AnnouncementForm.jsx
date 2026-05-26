import React, { useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';

import { appClient } from '@/api/client';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@macom/ui';

export default function AnnouncementForm({ onSubmit, isLoading }) {
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'geral',
    priority: 'media',
    pinned: false,
    image_url: '',
    image_path: '',
    image_name: '',
    image_type: '',
    image_size: null,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploading(true);

    try {
      const uploadResult = await appClient.storage.uploadAnnouncementImage(file);
      setForm((prev) => ({ ...prev, ...uploadResult }));
    } catch (error) {
      setForm((prev) => ({
        ...prev,
        image_url: '',
        image_path: '',
        image_name: '',
        image_type: '',
        image_size: null,
      }));
      setUploadError(error instanceof Error ? error.message : 'Falha ao enviar imagem.');
      event.target.value = '';
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setUploadError('');
    setForm((prev) => ({
      ...prev,
      image_url: '',
      image_path: '',
      image_name: '',
      image_type: '',
      image_size: null,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Titulo</Label>
        <Input
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          required
          placeholder="Titulo do aviso"
        />
      </div>

      <div className="space-y-2">
        <Label>Conteudo</Label>
        <Textarea
          value={form.content}
          onChange={(event) => setForm({ ...form, content: event.target.value })}
          required
          rows={4}
          placeholder="Descreva o aviso..."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="geral">Geral</SelectItem>
              <SelectItem value="rh">RH</SelectItem>
              <SelectItem value="ti">TI</SelectItem>
              <SelectItem value="financeiro">Financeiro</SelectItem>
              <SelectItem value="vendas">Vendas</SelectItem>
              <SelectItem value="pos_vendas">Pos-Vendas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Prioridade</Label>
          <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Imagem de destaque</Label>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm transition-colors hover:bg-muted sm:w-auto sm:justify-start sm:py-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {uploading ? 'Enviando...' : form.image_name ? 'Trocar imagem' : 'Selecionar imagem'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>

          {form.image_name ? (
            <Button type="button" variant="ghost" className="w-full gap-2 px-3 sm:w-auto" onClick={clearImage}>
              <X className="h-4 w-4" />
              Remover
            </Button>
          ) : null}
        </div>

        {form.image_url ? (
          <div className="overflow-hidden rounded-xl border border-border">
            <img
              src={form.image_url}
              alt="Preview da imagem do aviso"
              className="h-40 w-full object-cover"
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Opcional. Use JPG, PNG ou WebP com ate 2 MB.
          </p>
        )}

        {form.image_name ? (
          <p className="text-xs text-muted-foreground">{form.image_name}</p>
        ) : null}

        {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={form.pinned} onCheckedChange={(value) => setForm({ ...form, pinned: value })} />
        <Label>Fixar aviso</Label>
      </div>

      <Button type="submit" disabled={isLoading || uploading} className="w-full">
        {isLoading ? 'Publicando...' : 'Publicar Aviso'}
      </Button>
    </form>
  );
}
