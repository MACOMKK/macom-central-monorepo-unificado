import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plug, Plus, Trash2 } from 'lucide-react';
import { platformIntegrationsApi } from '@macom/api-client';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
  Textarea,
} from '@macom/ui';

import PageHeader from '@/components/PageHeader';
import { formatDateTime } from '@/lib/format';

function objectToPairs(object) {
  if (!object || typeof object !== 'object') return [];
  return Object.entries(object).map(([key, value]) => ({ key, value: String(value ?? '') }));
}

function pairsToObject(pairs) {
  return pairs.reduce((acc, pair) => {
    const key = pair.key.trim();
    if (key) acc[key] = pair.value;
    return acc;
  }, {});
}

function emptyForm() {
  return {
    id: null,
    chave: '',
    provider: '',
    descricao: '',
    ativo: true,
    config: [{ key: '', value: '' }],
    secrets: [{ key: '', value: '' }],
  };
}

function KeyValueEditor({ label, hint, pairs, onChange, valuePlaceholder }) {
  const updatePair = (index, field, value) => {
    onChange(pairs.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair)));
  };

  const removePair = (index) => {
    onChange(pairs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div>
        <Label>{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="space-y-2">
        {pairs.map((pair, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder="chave"
              value={pair.key}
              onChange={(event) => updatePair(index, 'key', event.target.value)}
              className="w-2/5"
            />
            <Input
              placeholder={valuePlaceholder || 'valor'}
              value={pair.value}
              onChange={(event) => updatePair(index, 'value', event.target.value)}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => removePair(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...pairs, { key: '', value: '' }])}>
        <Plus className="h-4 w-4" />
        Adicionar campo
      </Button>
    </div>
  );
}

export default function IntegrationsOverview() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['console', 'integracoes'],
    queryFn: () => platformIntegrationsApi.list(),
  });

  const integracoes = data || [];

  const saveMutation = useMutation({
    mutationFn: (payload) => platformIntegrationsApi.save(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['console', 'integracoes'] });
      setDialogOpen(false);
    },
    onError: (error) => {
      setFormError(error?.message || 'Falha ao salvar integracao.');
    },
  });

  useEffect(() => {
    if (!dialogOpen) setFormError('');
  }, [dialogOpen]);

  const openCreateDialog = () => {
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEditDialog = (integracao) => {
    setForm({
      id: integracao.id,
      chave: integracao.chave,
      provider: integracao.provider,
      descricao: integracao.descricao || '',
      ativo: integracao.ativo,
      config: objectToPairs(integracao.config).length ? objectToPairs(integracao.config) : [{ key: '', value: '' }],
      secrets: (integracao.secrets || []).map((secret) => ({ key: secret.chave, value: '' })).concat([
        { key: '', value: '' },
      ]),
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.chave.trim() || !form.provider.trim()) {
      setFormError('Informe chave e provider da integracao.');
      return;
    }

    saveMutation.mutate({
      chave: form.chave.trim(),
      provider: form.provider.trim(),
      descricao: form.descricao.trim(),
      ativo: form.ativo,
      config: pairsToObject(form.config),
      secrets: pairsToObject(form.secrets),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integracoes"
        description="Credenciais de integracoes externas (Gmail, e futuras: WhatsApp, SMS, outros provedores) usadas pelas Edge Functions. Valores sensiveis ficam no Vault, nunca sao exibidos aqui."
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Nova integracao
          </Button>
        }
      />

      {isLoading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Carregando integracoes...</Card>
      ) : isError ? (
        <Card className="p-10 text-center text-sm text-destructive">Nao foi possivel carregar as integracoes.</Card>
      ) : integracoes.length === 0 ? (
        <Card className="p-16 text-center">
          <Plug className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma integracao configurada ainda.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {integracoes.map((integracao) => (
            <Card key={integracao.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{integracao.chave}</p>
                  <h2 className="text-lg font-bold">{integracao.provider}</h2>
                  {integracao.descricao && (
                    <p className="mt-1 text-sm text-muted-foreground">{integracao.descricao}</p>
                  )}
                </div>
                <Badge variant={integracao.ativo ? 'default' : 'outline'}>
                  {integracao.ativo ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>

              <div className="mt-4 space-y-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Config</p>
                {Object.keys(integracao.config || {}).length ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(integracao.config).map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="font-mono text-[11px]">
                        {key}: {String(value)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum campo de config.</p>
                )}
              </div>

              <div className="mt-4 space-y-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Segredos</p>
                {integracao.secrets.length ? (
                  <div className="space-y-1">
                    {integracao.secrets.map((secret) => (
                      <div key={secret.chave} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <KeyRound className="h-3 w-3" />
                        <span className="font-mono">{secret.chave}</span>
                        <span>· atualizado em {formatDateTime(secret.atualizado_em)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum segredo configurado.</p>
                )}
              </div>

              <div className="mt-5">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(integracao)}>
                  Editar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar integracao' : 'Nova integracao'}</DialogTitle>
            <DialogDescription>
              Campos de "Config" ficam visiveis nesta tela. Campos de "Segredos" sao gravados no Vault e nunca sao
              exibidos de volta — deixe em branco para manter o valor ja configurado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="chave">Chave</Label>
                <Input
                  id="chave"
                  placeholder="gmail_notificacoes"
                  value={form.chave}
                  disabled={Boolean(form.id)}
                  onChange={(event) => setForm((prev) => ({ ...prev, chave: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="provider">Provider</Label>
                <Input
                  id="provider"
                  placeholder="gmail"
                  value={form.provider}
                  onChange={(event) => setForm((prev) => ({ ...prev, provider: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descricao">Descricao</Label>
              <Textarea
                id="descricao"
                value={form.descricao}
                onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="ativo"
                checked={form.ativo}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, ativo: checked }))}
              />
              <Label htmlFor="ativo">Ativa</Label>
            </div>

            <KeyValueEditor
              label="Config (nao sensivel)"
              hint="Ex.: sender, client_id — visivel nesta tela."
              pairs={form.config}
              onChange={(config) => setForm((prev) => ({ ...prev, config }))}
            />

            <KeyValueEditor
              label="Segredos"
              hint="Ex.: client_secret, refresh_token — gravado no Vault. Deixe o valor em branco pra manter o atual."
              pairs={form.secrets}
              onChange={(secrets) => setForm((prev) => ({ ...prev, secrets }))}
              valuePlaceholder="novo valor (opcional)"
            />

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <DialogFooter>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
