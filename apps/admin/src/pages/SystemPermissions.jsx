import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Building2, Clock3, Megaphone, ShieldCheck, WalletCards } from 'lucide-react';
import { platformPermissionsApi } from '@macom/api-client';
import {
  Badge,
  Button,
  Card,
  FeedbackToast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@macom/ui';
import { useAuth } from '@macom/auth';

import {
  centralModules,
  levelOptions,
  PERMISSION_LEVELS,
  reportsModules,
} from '@/lib/permissionModules';
import { permissionSystems } from '@/lib/systemsCatalog';
import PageHeader from '@/components/PageHeader';
import { upsertByKey } from '@/lib/upsertByKey';

const systemIcons = {
  central: Building2,
  relatorios: BarChart3,
  intranet: Megaphone,
  pagamentos: WalletCards,
};
const editableSystemKeys = new Set(['central', 'relatorios']);
const permissionSystemCards = permissionSystems.map((system) => (
  editableSystemKeys.has(system.key) ? system : { ...system, status: 'planned' }
));

function upsertCentralPermission(permissions, permission) {
  return upsertByKey(permissions, permission, (item) => `${item.funcao}:${item.modulo}`);
}

function upsertReportsPermission(permissions, permission) {
  return upsertByKey(permissions, permission, (item) => `${item.nivel_acesso}:${item.modulo}`);
}

function getPermissionDescription(level) {
  if (level === PERMISSION_LEVELS.manage) return 'Pode visualizar e alterar dados deste modulo.';
  if (level === PERMISSION_LEVELS.view) return 'Pode visualizar dados deste modulo.';
  return 'Nao acessa este modulo.';
}

export default function SystemPermissions() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [activeSystem, setActiveSystem] = useState('central');
  const [draftCentral, setDraftCentral] = useState({});
  const [draftReports, setDraftReports] = useState({});
  const [feedback, setFeedback] = useState(null);

  const isAdmin = profile?.funcao === 'admin';

  const {
    data: centralPermissions = [],
    isLoading: centralLoading,
    error: centralError,
  } = useQuery({
    queryKey: ['console', 'permissions', 'central'],
    queryFn: platformPermissionsApi.central.list,
    enabled: isAdmin,
  });

  const {
    data: reportsPermissions = [],
    isLoading: reportsLoading,
    error: reportsError,
  } = useQuery({
    queryKey: ['console', 'permissions', 'relatorios'],
    queryFn: platformPermissionsApi.relatorios.list,
    enabled: isAdmin,
  });

  useEffect(() => {
    const nextDraft = centralModules.reduce((acc, module) => {
      const permission = centralPermissions.find((item) => item.funcao === 'gestor' && item.modulo === module.key);
      acc[module.key] = permission?.nivel_acesso || PERMISSION_LEVELS.none;
      return acc;
    }, {});

    setDraftCentral(nextDraft);
  }, [centralPermissions]);

  useEffect(() => {
    const nextDraft = reportsModules.reduce((acc, module) => {
      const permission = reportsPermissions.find((item) => item.nivel_acesso === 'gestor' && item.modulo === module.key);
      acc[module.key] = permission?.permissao || PERMISSION_LEVELS.none;
      return acc;
    }, {});

    setDraftReports(nextDraft);
  }, [reportsPermissions]);

  useEffect(() => {
    if (centralError) {
      setFeedback({ type: 'error', message: centralError.message || 'Falha ao carregar permissoes da Central.' });
    }
  }, [centralError]);

  useEffect(() => {
    if (reportsError) {
      setFeedback({ type: 'error', message: reportsError.message || 'Falha ao carregar permissoes do Relatorios.' });
    }
  }, [reportsError]);

  const hasCentralChanges = useMemo(
    () =>
      centralModules.some((module) => {
        const saved = centralPermissions.find((item) => item.funcao === 'gestor' && item.modulo === module.key);
        return (saved?.nivel_acesso || PERMISSION_LEVELS.none) !== draftCentral[module.key];
      }),
    [centralPermissions, draftCentral],
  );

  const hasReportsChanges = useMemo(
    () =>
      reportsModules.some((module) => {
        const saved = reportsPermissions.find((item) => item.nivel_acesso === 'gestor' && item.modulo === module.key);
        return (saved?.permissao || PERMISSION_LEVELS.none) !== draftReports[module.key];
      }),
    [draftReports, reportsPermissions],
  );

  const saveCentralMutation = useMutation({
    mutationFn: async () => {
      const changedModules = centralModules.filter((module) => {
        const saved = centralPermissions.find((item) => item.funcao === 'gestor' && item.modulo === module.key);
        return (saved?.nivel_acesso || PERMISSION_LEVELS.none) !== draftCentral[module.key];
      });

      const savedRows = [];
      for (const module of changedModules) {
        const saved = await platformPermissionsApi.central.save({
          funcao: 'gestor',
          modulo: module.key,
          nivel_acesso: draftCentral[module.key] || PERMISSION_LEVELS.none,
        });
        savedRows.push(saved);
      }
      return savedRows;
    },
    onMutate: async () => {
      const queryKey = ['console', 'permissions', 'central'];
      await queryClient.cancelQueries({ queryKey });
      const previousPermissions = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old = []) => {
        if (!Array.isArray(old)) return old;
        return centralModules.reduce(
          (acc, module) =>
            upsertCentralPermission(acc, {
              funcao: 'gestor',
              modulo: module.key,
              nivel_acesso: draftCentral[module.key] || PERMISSION_LEVELS.none,
            }),
          old,
        );
      });

      return { previousPermissions, queryKey };
    },
    onSuccess: (savedRows, _variables, context) => {
      queryClient.setQueryData(context.queryKey, (old = []) => {
        if (!Array.isArray(old)) return old;
        return savedRows.reduce((acc, row) => upsertCentralPermission(acc, row), old);
      });
      queryClient.invalidateQueries({ queryKey: ['console', 'permissions', 'central'] });
      setFeedback({ type: 'success', message: 'Permissoes da Central salvas pelo Console.' });
    },
    onError: (saveError, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousPermissions);
      }
      setFeedback({ type: 'error', message: saveError.message || 'Falha ao salvar permissoes da Central.' });
    },
  });

  const saveReportsMutation = useMutation({
    mutationFn: async () => {
      const changedModules = reportsModules.filter((module) => {
        const saved = reportsPermissions.find((item) => item.nivel_acesso === 'gestor' && item.modulo === module.key);
        return (saved?.permissao || PERMISSION_LEVELS.none) !== draftReports[module.key];
      });

      const savedRows = [];
      for (const module of changedModules) {
        const saved = await platformPermissionsApi.relatorios.save({
          nivel_acesso: 'gestor',
          modulo: module.key,
          permissao: draftReports[module.key] || PERMISSION_LEVELS.none,
        });
        savedRows.push(saved);
      }
      return savedRows;
    },
    onMutate: async () => {
      const queryKey = ['console', 'permissions', 'relatorios'];
      await queryClient.cancelQueries({ queryKey });
      const previousPermissions = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old = []) => {
        if (!Array.isArray(old)) return old;
        return reportsModules.reduce(
          (acc, module) =>
            upsertReportsPermission(acc, {
              nivel_acesso: 'gestor',
              modulo: module.key,
              permissao: draftReports[module.key] || PERMISSION_LEVELS.none,
            }),
          old,
        );
      });

      return { previousPermissions, queryKey };
    },
    onSuccess: (savedRows, _variables, context) => {
      queryClient.setQueryData(context.queryKey, (old = []) => {
        if (!Array.isArray(old)) return old;
        return savedRows.reduce((acc, row) => upsertReportsPermission(acc, row), old);
      });
      queryClient.invalidateQueries({ queryKey: ['console', 'permissions', 'relatorios'] });
      setFeedback({ type: 'success', message: 'Permissoes do Relatorios salvas pelo Console.' });
    },
    onError: (saveError, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousPermissions);
      }
      setFeedback({ type: 'error', message: saveError.message || 'Falha ao salvar permissoes do Relatorios.' });
    },
  });

  if (!isAdmin) {
    return (
      <Card className="p-6">
        <h1 className="text-xl font-bold text-foreground">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apenas administradores podem alterar permissoes dos sistemas.
        </p>
      </Card>
    );
  }

  const activeModules = activeSystem === 'relatorios' ? reportsModules : centralModules;
  const activeDraft = activeSystem === 'relatorios' ? draftReports : draftCentral;
  const activeLoading = activeSystem === 'relatorios' ? reportsLoading : centralLoading;
  const activeHasChanges = activeSystem === 'relatorios' ? hasReportsChanges : hasCentralChanges;
  const activeMutation = activeSystem === 'relatorios' ? saveReportsMutation : saveCentralMutation;
  const setActiveDraft = activeSystem === 'relatorios' ? setDraftReports : setDraftCentral;

  const canEditActiveSystem = activeSystem === 'central' || activeSystem === 'relatorios';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governanca"
        title="Permissoes dos Sistemas"
        description="Area inicial em paralelo com a Central. As permissoes continuam usando as mesmas tabelas e funcoes atuais."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {permissionSystemCards.map((system) => {
          const Icon = systemIcons[system.key] || ShieldCheck;
          const isActive = activeSystem === system.key;
          const isPlanned = system.status === 'planned';

          return (
            <button
              key={system.key}
              type="button"
              className={`rounded-lg border p-4 text-left transition-colors ${
                isActive
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
              }`}
              onClick={() => !isPlanned && setActiveSystem(system.key)}
              disabled={isPlanned}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className={isActive ? 'h-5 w-5 text-primary' : 'h-5 w-5'} />
                  <span className="font-bold text-foreground">{system.label}</span>
                </div>
                {isPlanned ? (
                  <Badge variant="outline" className="gap-1">
                    <Clock3 className="h-3 w-3" />
                    Futuro
                  </Badge>
                ) : (
                  <Badge variant="outline">Ativo</Badge>
                )}
              </div>
              <p className="mt-2 text-sm">{system.description}</p>
            </button>
          );
        })}
      </div>

      <Card className="space-y-5 p-5">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold uppercase text-foreground">
              {activeSystem === 'relatorios' ? 'Relatorios / Nivel Gestor' : 'Central / Funcao Gestor'}
            </h2>
          </div>
          <Button disabled={!canEditActiveSystem || !activeHasChanges || activeMutation.isPending || activeLoading} onClick={() => activeMutation.mutate()}>
            {activeMutation.isPending ? 'Salvando...' : 'Salvar permissoes'}
          </Button>
        </div>

        <div className="grid gap-3">
          {activeModules.map((module) => (
            <div
              key={module.key}
              className="grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-[1fr_220px] sm:items-center"
            >
              <div>
                <p className="font-semibold text-foreground">{module.label}</p>
                <p className="text-sm text-muted-foreground">{getPermissionDescription(activeDraft[module.key])}</p>
              </div>
              <Select
                value={activeDraft[module.key] || PERMISSION_LEVELS.none}
                onValueChange={(value) => setActiveDraft((current) => ({ ...current, [module.key]: value }))}
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
