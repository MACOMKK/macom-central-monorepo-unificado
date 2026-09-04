import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cake, ImagePlus, Save, X } from 'lucide-react';
import { Button, Input, Label, Skeleton, Spinner, Textarea } from '@macom/ui';
import { toast } from 'sonner';

import { appClient } from '@/api/client';

const emptyForm = {
  titulo: '',
  corpo_texto: '',
  corpo_html: '',
  imagem_url: '',
  imagem_path: '',
  imagem_nome: '',
  imagem_tipo: '',
  imagem_tamanho: null,
};

function buildFormFromTemplate(template) {
  if (!template) return emptyForm;
  return {
    titulo: template.titulo || '',
    corpo_texto: template.corpo_texto || '',
    corpo_html: template.corpo_html || '',
    imagem_url: template.imagem_url || '',
    imagem_path: template.imagem_path || '',
    imagem_nome: template.imagem_nome || '',
    imagem_tipo: template.imagem_tipo || '',
    imagem_tamanho: template.imagem_tamanho ?? null,
  };
}

export default function BirthdayTemplateSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const { data: template, isLoading } = useQuery({
    queryKey: ['intranet', 'birthday-template'],
    queryFn: () => appClient.birthdayTemplate.get(),
  });

  useEffect(() => {
    setForm(buildFormFromTemplate(template));
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: (payload) => appClient.birthdayTemplate.save(payload),
    onSuccess: () => {
      toast.success('Template de aniversario salvo.');
      queryClient.invalidateQueries({ queryKey: ['intranet', 'birthday-template'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar template.');
    },
  });

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploading(true);

    try {
      const uploadResult = await appClient.storage.uploadBirthdayTemplateImage(file);
      setForm((prev) => ({ ...prev, ...uploadResult }));
    } catch (error) {
      setForm((prev) => ({
        ...prev,
        imagem_url: '',
        imagem_path: '',
        imagem_nome: '',
        imagem_tipo: '',
        imagem_tamanho: null,
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
      imagem_url: '',
      imagem_path: '',
      imagem_nome: '',
      imagem_tipo: '',
      imagem_tamanho: null,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold">Template do e-mail de aniversario</h2>
        <p className="text-sm text-muted-foreground">
          Conteudo usado para preencher o e-mail de parabens. Esta tela ainda nao altera o e-mail
          enviado automaticamente todo dia — a integracao entre este template e o envio real e uma
          etapa futura separada.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Titulo</Label>
          <Input
            value={form.titulo}
            onChange={(event) => setForm({ ...form, titulo: event.target.value })}
            required
            placeholder="Ex.: Feliz aniversário, {{nome}}!"
          />
        </div>

        <div className="space-y-2">
          <Label>Corpo (texto simples)</Label>
          <Textarea
            value={form.corpo_texto}
            onChange={(event) => setForm({ ...form, corpo_texto: event.target.value })}
            required
            rows={4}
            placeholder="Texto do e-mail. Use {{nome}} para o nome do colaborador."
          />
        </div>

        <div className="space-y-2">
          <Label>Corpo (HTML, opcional)</Label>
          <Textarea
            value={form.corpo_html}
            onChange={(event) => setForm({ ...form, corpo_html: event.target.value })}
            rows={6}
            placeholder="Versao em HTML do e-mail (opcional)."
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label>Imagem</Label>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm transition-colors hover:bg-muted sm:w-auto sm:justify-start sm:py-2">
              {uploading ? <Spinner size="sm" /> : <ImagePlus className="h-4 w-4" />}
              {uploading ? 'Enviando...' : form.imagem_nome ? 'Trocar imagem' : 'Selecionar imagem'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </label>

            {form.imagem_nome ? (
              <Button type="button" variant="ghost" className="w-full gap-2 px-3 sm:w-auto" onClick={clearImage}>
                <X className="h-4 w-4" />
                Remover
              </Button>
            ) : null}
          </div>

          {form.imagem_url ? (
            <div className="overflow-hidden rounded-xl border border-border">
              <img src={form.imagem_url} alt="Preview da imagem do template" className="h-40 w-full object-cover" />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Opcional. Use JPG, PNG ou WebP com ate 2 MB.</p>
          )}

          {form.imagem_nome ? <p className="text-xs text-muted-foreground">{form.imagem_nome}</p> : null}

          {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
        </div>

        <Button type="submit" disabled={saveMutation.isPending || uploading} className="w-full gap-2 sm:w-auto">
          {saveMutation.isPending ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
          {saveMutation.isPending ? 'Salvando...' : 'Salvar template'}
        </Button>
      </form>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Cake className="h-3.5 w-3.5 shrink-0" />
        Este conteudo fica guardado para uso futuro pelo envio automatico de aniversario.
      </p>
    </div>
  );
}
