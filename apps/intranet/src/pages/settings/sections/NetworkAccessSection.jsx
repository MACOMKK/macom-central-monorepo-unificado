import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { Badge, Button, Input, Skeleton } from '@macom/ui';
import { toast } from 'sonner';

import { appClient } from '@/api/client';

const MODULES = [
  { key: 'avisos', label: 'Mural de Avisos' },
  { key: 'links', label: 'Links Uteis' },
  { key: 'colaboradores', label: 'Colaboradores' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'calendario', label: 'Agenda' },
  { key: 'conhecimento', label: 'Base de Conhecimento' },
  { key: 'feedback', label: 'Feedback' },
];

const DEFAULT_MODULES = {
  avisos: 'view',
  links: 'view',
  colaboradores: 'view',
  documentos: 'view',
  calendario: 'view',
  conhecimento: 'view',
  feedback: 'view',
};

const PERMISSION_OPTIONS = [
  { value: 'none', label: 'Sem', activeClass: 'bg-slate-200 text-slate-700' },
  { value: 'view', label: 'Ver', activeClass: 'bg-[#141414]/8 text-[#141414]' },
  { value: 'edit', label: 'Editar', activeClass: 'bg-[#E30613]/12 text-[#B0000F]' },
];

const DEFAULT_TRUSTED_IP_ACCESS = {
  name: '',
  description: '',
  ip_cidr: '',
  access_level: 'usuario',
  active: true,
  modules: DEFAULT_MODULES,
};

function TrustedIpAccessForm({ initialValue, onSave, onDelete, isSaving, isDeleting, submitLabel = 'Salvar' }) {
  const [draft, setDraft] = useState(initialValue);

  useEffect(() => {
    setDraft(initialValue);
  }, [initialValue?.id]);

  const setModule = (module, value) => {
    setDraft((prev) => ({
      ...prev,
      modules: {
        ...DEFAULT_MODULES,
        ...(prev.modules || {}),
        [module]: value,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSave({
      ...draft,
      modules: {
        ...DEFAULT_MODULES,
        ...(draft.modules || {}),
      },
    });
    if (!initialValue?.id) {
      setDraft(DEFAULT_TRUSTED_IP_ACCESS);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_0.7fr_auto] lg:items-end">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground" htmlFor={`trusted-ip-name-${initialValue?.id || 'new'}`}>
            Nome
          </label>
          <Input
            id={`trusted-ip-name-${initialValue?.id || 'new'}`}
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Matriz, oficina, loja Belem..."
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground" htmlFor={`trusted-ip-cidr-${initialValue?.id || 'new'}`}>
            IP ou CIDR
          </label>
          <Input
            id={`trusted-ip-cidr-${initialValue?.id || 'new'}`}
            value={draft.ip_cidr}
            onChange={(event) => setDraft((prev) => ({ ...prev, ip_cidr: event.target.value }))}
            placeholder="177.10.20.30/32"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground" htmlFor={`trusted-ip-level-${initialValue?.id || 'new'}`}>
            Nivel
          </label>
          <select
            id={`trusted-ip-level-${initialValue?.id || 'new'}`}
            value={draft.access_level}
            onChange={(event) => setDraft((prev) => ({ ...prev, access_level: event.target.value }))}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="usuario">Usuario</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitLabel}
          </Button>
          {onDelete ? (
            <Button type="button" variant="outline" disabled={isDeleting} onClick={onDelete} className="gap-2 border-red-200 text-red-700 hover:bg-red-50">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remover
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          id={`trusted-ip-active-${initialValue?.id || 'new'}`}
          type="checkbox"
          checked={draft.active}
          onChange={(event) => setDraft((prev) => ({ ...prev, active: event.target.checked }))}
          className="h-4 w-4 rounded border-border"
        />
        <label htmlFor={`trusted-ip-active-${initialValue?.id || 'new'}`} className="text-sm text-muted-foreground">
          Rede ativa
        </label>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((mod) => (
          <div key={mod.key} className="rounded-xl border border-border/60 bg-background p-3">
            <p className="mb-2 text-[11px] font-medium text-foreground">{mod.label}</p>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/40 p-1">
              {PERMISSION_OPTIONS.map((option) => {
                const active = ((draft.modules || DEFAULT_MODULES)[mod.key] || 'view') === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setModule(mod.key, option.value)}
                    className={`min-h-8 rounded-lg px-1.5 py-1 text-[11px] font-medium transition-colors ${
                      active
                        ? `${option.activeClass} shadow-sm`
                        : 'text-muted-foreground hover:bg-background/80'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {initialValue?.last_access_date ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Ultimo acesso: {new Date(initialValue.last_access_date).toLocaleString('pt-BR')}
          {initialValue.last_ip ? ` - ${initialValue.last_ip}` : ''}
        </p>
      ) : null}
    </form>
  );
}

export default function NetworkAccessSection() {
  const queryClient = useQueryClient();
  const [savingTrustedIp, setSavingTrustedIp] = useState(null);
  const [deletingTrustedIp, setDeletingTrustedIp] = useState(null);

  const { data: trustedIpAccesses = [], isLoading: trustedIpLoading } = useQuery({
    queryKey: ['trusted-ip-accesses'],
    queryFn: () => appClient.entities.TrustedIpAccess.list(),
  });

  const createTrustedIpMutation = useMutation({
    mutationFn: (payload) => appClient.entities.TrustedIpAccess.create(payload),
    onMutate: () => setSavingTrustedIp('new'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trusted-ip-accesses'] });
      toast.success('Rede liberada cadastrada.');
      setSavingTrustedIp(null);
    },
    onError: (error) => {
      toast.error(error?.message || 'Nao foi possivel cadastrar a rede.');
      setSavingTrustedIp(null);
    },
  });

  const updateTrustedIpMutation = useMutation({
    mutationFn: ({ id, payload }) => appClient.entities.TrustedIpAccess.update(id, payload),
    onMutate: ({ id }) => setSavingTrustedIp(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trusted-ip-accesses'] });
      toast.success('Rede liberada atualizada.');
      setSavingTrustedIp(null);
    },
    onError: (error) => {
      toast.error(error?.message || 'Nao foi possivel atualizar a rede.');
      setSavingTrustedIp(null);
    },
  });

  const deleteTrustedIpMutation = useMutation({
    mutationFn: (id) => appClient.entities.TrustedIpAccess.delete(id),
    onMutate: (id) => setDeletingTrustedIp(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trusted-ip-accesses'] });
      toast.success('Rede liberada removida.');
      setDeletingTrustedIp(null);
    },
    onError: () => {
      toast.error('Nao foi possivel remover a rede.');
      setDeletingTrustedIp(null);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Acesso por rede</h2>
          <p className="text-sm text-muted-foreground">Cadastre IP publico ou faixa CIDR para acesso automatico sem senha.</p>
        </div>
        <Badge className="w-fit bg-primary/10 text-primary">
          {trustedIpAccesses.length} rede{trustedIpAccesses.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <TrustedIpAccessForm
        initialValue={DEFAULT_TRUSTED_IP_ACCESS}
        onSave={(payload) => createTrustedIpMutation.mutateAsync(payload)}
        isSaving={savingTrustedIp === 'new'}
        submitLabel="Cadastrar"
      />

      {trustedIpLoading ? (
        <div className="space-y-3">
          {[1, 2].map((item) => <Skeleton key={item} className="h-52 rounded-xl" />)}
        </div>
      ) : trustedIpAccesses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhuma rede liberada cadastrada.
        </div>
      ) : (
        trustedIpAccesses.map((access) => (
          <TrustedIpAccessForm
            key={access.id}
            initialValue={{
              ...DEFAULT_TRUSTED_IP_ACCESS,
              ...access,
              modules: {
                ...DEFAULT_MODULES,
                ...(access.modules || {}),
              },
            }}
            onSave={(payload) => updateTrustedIpMutation.mutateAsync({ id: access.id, payload })}
            onDelete={() => deleteTrustedIpMutation.mutate(access.id)}
            isSaving={savingTrustedIp === access.id}
            isDeleting={deletingTrustedIp === access.id}
          />
        ))
      )}
    </div>
  );
}
