import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import FeedbackToast from '@/components/ui/feedback-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CENTRAL_PERMISSION_MODULES, CENTRAL_PERMISSION_LEVELS } from '@/lib/centralPermissions';
import { useAuth } from '@/lib/AuthContext';
import { catalogApi } from '@/lib/catalogApi';

const levelOptions = [
  { value: CENTRAL_PERMISSION_LEVELS.none, label: 'Sem acesso' },
  { value: CENTRAL_PERMISSION_LEVELS.view, label: 'Ver' },
  { value: CENTRAL_PERMISSION_LEVELS.manage, label: 'Gerenciar' },
];

const editableModules = CENTRAL_PERMISSION_MODULES.filter((module) => module.key !== 'dashboard');

function upsertPermission(permissions, permission) {
  if (!permission) return permissions;
  const exists = permissions.some((item) => item.funcao === permission.funcao && item.modulo === permission.modulo);

  if (!exists) {
    return [...permissions, permission];
  }

  return permissions.map((item) => (
    item.funcao === permission.funcao && item.modulo === permission.modulo
      ? { ...item, ...permission }
      : item
  ));
}

export default function CentralPermissions() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [draftPermissions, setDraftPermissions] = useState({});
  const [feedback, setFeedback] = useState(null);

  const { data: permissions = [], isLoading, error } = useQuery({
    queryKey: ['permissoes_central'],
    queryFn: catalogApi.permissoes_central.list,
    enabled: profile?.funcao === 'admin',
  });

  useEffect(() => {
    const nextDraft = editableModules.reduce((acc, module) => {
      const permission = permissions.find((item) => item.funcao === 'gestor' && item.modulo === module.key);
      acc[module.key] = permission?.nivel_acesso || CENTRAL_PERMISSION_LEVELS.none;
      return acc;
    }, {});

    setDraftPermissions(nextDraft);
  }, [permissions]);

  useEffect(() => {
    if (error) {
      setFeedback({ type: 'error', message: error.message || 'Falha ao carregar permissoes da Central.' });
    }
  }, [error]);

  const hasChanges = useMemo(
    () =>
      editableModules.some((module) => {
        const saved = permissions.find((item) => item.funcao === 'gestor' && item.modulo === module.key);
        return (saved?.nivel_acesso || CENTRAL_PERMISSION_LEVELS.none) !== draftPermissions[module.key];
      }),
    [draftPermissions, permissions],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const changedModules = editableModules.filter((module) => {
        const saved = permissions.find((item) => item.funcao === 'gestor' && item.modulo === module.key);
        return (saved?.nivel_acesso || CENTRAL_PERMISSION_LEVELS.none) !== draftPermissions[module.key];
      });

      const savedRows = [];
      for (const module of changedModules) {
        const saved = await catalogApi.permissoes_central.save({
          funcao: 'gestor',
          modulo: module.key,
          nivel_acesso: draftPermissions[module.key] || CENTRAL_PERMISSION_LEVELS.none,
        });
        savedRows.push(saved);
      }
      return savedRows;
    },
    onMutate: async () => {
      const queryKey = ['permissoes_central'];
      await queryClient.cancelQueries({ queryKey });
      const previousPermissions = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old = []) => {
        if (!Array.isArray(old)) return old;
        return editableModules.reduce(
          (acc, module) =>
            upsertPermission(acc, {
              funcao: 'gestor',
              modulo: module.key,
              nivel_acesso: draftPermissions[module.key] || CENTRAL_PERMISSION_LEVELS.none,
            }),
          old,
        );
      });

      return { previousPermissions, queryKey };
    },
    onSuccess: (savedRows, _variables, context) => {
      queryClient.setQueryData(context.queryKey, (old = []) => {
        if (!Array.isArray(old)) return old;
        return savedRows.reduce((acc, row) => upsertPermission(acc, row), old);
      });
      queryClient.invalidateQueries({ queryKey: ['permissoes_central'] });
      setFeedback({ type: 'success', message: 'Permissoes do gestor salvas com sucesso.' });
    },
    onError: (saveError, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousPermissions);
      }
      setFeedback({ type: 'error', message: saveError.message || 'Falha ao salvar permissoes.' });
    },
  });

  if (profile?.funcao !== 'admin') {
    return (
      <Card className="p-8">
        <h1 className="text-xl font-bold text-foreground">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apenas administradores podem alterar permissoes da Central.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Governanca</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Permissoes Central</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Defina onde a funcao Gestor pode acessar e quais modulos ela pode gerenciar.
        </p>
      </div>

      <Card className="space-y-5 p-5">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground">Funcao Gestor</h2>
          </div>
          <Button disabled={!hasChanges || saveMutation.isPending || isLoading} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Salvando...' : 'Salvar permissoes'}
          </Button>
        </div>

        <div className="grid gap-3">
          {editableModules.map((module) => (
            <div
              key={module.key}
              className="grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-[1fr_220px] sm:items-center"
            >
              <div>
                <p className="font-semibold text-foreground">{module.label}</p>
                <p className="text-sm text-muted-foreground">
                  {draftPermissions[module.key] === CENTRAL_PERMISSION_LEVELS.manage
                    ? 'Pode visualizar e alterar dados deste modulo.'
                    : draftPermissions[module.key] === CENTRAL_PERMISSION_LEVELS.view
                      ? 'Pode visualizar dados deste modulo.'
                      : 'Nao acessa este modulo.'}
                </p>
              </div>
              <Select
                value={draftPermissions[module.key] || CENTRAL_PERMISSION_LEVELS.none}
                onValueChange={(value) => setDraftPermissions((current) => ({ ...current, [module.key]: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {levelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </Card>

      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}
