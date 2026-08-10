import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Search, UserCog } from 'lucide-react';
import { Badge, Button, Input, Skeleton, Spinner } from '@macom/ui';
import { toast } from 'sonner';

import { appClient } from '@/api/client';
import Pagination, { usePaginatedItems } from '@/components/Pagination';

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

function normalizeFunctionRole(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function canReceiveEditPermission(user) {
  const accessRole = normalizeFunctionRole(user.access_level || user.role);
  const functionRole = normalizeFunctionRole(user.function_role);
  return accessRole === 'admin' || accessRole === 'gestor' || functionRole === 'admin' || functionRole === 'gestor';
}

function getUserKind(user) {
  const accessRole = normalizeFunctionRole(user.access_level || user.role);
  const functionRole = normalizeFunctionRole(user.function_role);
  if (accessRole === 'admin' || functionRole === 'admin') {
    return {
      label: 'Admin',
      helper: 'Acesso total',
      className: 'border-primary/20 bg-primary/10 text-primary',
    };
  }

  if (accessRole === 'gestor' || functionRole === 'gestor') {
    return {
      label: 'Gestor',
      helper: 'Pode receber edicao',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  return {
    label: 'Usuario',
    helper: 'Somente visualizacao',
    className: 'border-slate-200 bg-slate-50 text-slate-600',
  };
}

function restrictModulesForUser(modules, user) {
  if (canReceiveEditPermission(user)) return modules;
  return Object.fromEntries(
    Object.entries({ ...DEFAULT_MODULES, ...modules }).map(([key, value]) => [key, value === 'edit' ? 'view' : value])
  );
}

const PERMISSION_OPTIONS = [
  { value: 'none', label: 'Sem', activeClass: 'bg-slate-200 text-slate-700' },
  { value: 'view', label: 'Ver', activeClass: 'bg-[#141414]/8 text-[#141414]' },
  { value: 'edit', label: 'Editar', activeClass: 'bg-[#E30613]/12 text-[#B0000F]' },
];

function upsertPermission(perms, permission) {
  if (!permission?.user_email) return perms;
  const exists = perms.some((item) => (
    item.user_email === permission.user_email ||
    (permission.collaborator_id && item.collaborator_id === permission.collaborator_id)
  ));
  if (!exists) return [permission, ...perms];
  return perms.map((item) => (
    item.user_email === permission.user_email ||
    (permission.collaborator_id && item.collaborator_id === permission.collaborator_id)
      ? { ...item, ...permission }
      : item
  ));
}

function PermissionRow({ user, existingPerm, onSave, isSaving }) {
  const canEditModules = canReceiveEditPermission(user);
  const userKind = getUserKind(user);
  const [modules, setModules] = useState(() => restrictModulesForUser(existingPerm?.modules || DEFAULT_MODULES, user));

  useEffect(() => {
    setModules(restrictModulesForUser(existingPerm?.modules || DEFAULT_MODULES, user));
  }, [existingPerm?.id, user.id, user.role, user.function_role]);

  const handleSave = () =>
    onSave({
      collaborator_id: user.id,
      user_email: user.email,
      modules: restrictModulesForUser(modules, user),
    });

  if (user.role === 'admin') {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-sm">{user.full_name || user.email}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Badge variant="outline" className={`sm:self-auto self-start ${userKind.className}`}>
          {userKind.label} - {userKind.helper}
        </Badge>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">{user.full_name || user.email}</p>
            <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[10px] ${userKind.className}`}>
              {userKind.label}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">{userKind.helper}</p>
          {!canEditModules ? (
            <p className="mt-1 text-xs text-muted-foreground">Usuarios comuns ficam limitados a visualizacao.</p>
          ) : null}
        </div>
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="w-full gap-2 rounded-xl sm:w-auto">
          {isSaving ? <Spinner size="sm" /> : <Save className="w-3 h-3" />}
          Salvar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((mod) => (
          <div key={mod.key} className="rounded-xl border border-border/60 bg-background p-3">
            <div className="flex flex-col gap-2 sm:gap-2.5">
              <p className="text-[11px] font-medium text-foreground">{mod.label}</p>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/40 p-1">
                {PERMISSION_OPTIONS.map((option) => {
                  const active = (modules[mod.key] || 'view') === option.value;
                  const disabled = option.value === 'edit' && !canEditModules;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => setModules((prev) => ({ ...prev, [mod.key]: option.value }))}
                      className={`min-h-8 rounded-lg px-1.5 py-1 text-[11px] font-medium transition-colors ${
                        active
                          ? `${option.activeClass} shadow-sm`
                          : disabled
                            ? 'cursor-not-allowed text-muted-foreground/35'
                            : 'text-muted-foreground hover:bg-background/80'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ModulePermissionsSection() {
  const queryClient = useQueryClient();
  const [savingUser, setSavingUser] = useState(null);
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => appClient.entities.User.list('full_name', 500),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: perms = [], isLoading: permsLoading } = useQuery({
    queryKey: ['user-permissions'],
    queryFn: () => appClient.entities.UserPermission.list(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const latestPerms = await appClient.entities.UserPermission.list();
      const existing = latestPerms.find((item) => (
        item.user_email === data.user_email ||
        (data.collaborator_id && item.collaborator_id === data.collaborator_id)
      ));
      if (existing) return appClient.entities.UserPermission.update(existing.id, data);
      return appClient.entities.UserPermission.create(data);
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['user-permissions'] });
      const previousPerms = queryClient.getQueryData(['user-permissions']);
      const optimisticPermission = {
        ...data,
        id: data.collaborator_id,
        updated_date: new Date().toISOString(),
      };

      queryClient.setQueryData(['user-permissions'], (old = []) => (
        Array.isArray(old) ? upsertPermission(old, optimisticPermission) : old
      ));

      return { previousPerms };
    },
    onSuccess: (savedPermission) => {
      queryClient.setQueryData(['user-permissions'], (old = []) => (
        Array.isArray(old) ? upsertPermission(old, savedPermission) : old
      ));
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('Permissoes salvas!');
      setSavingUser(null);
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(['user-permissions'], context?.previousPerms);
      toast.error('Nao foi possivel salvar as permissoes.');
      setSavingUser(null);
    },
  });

  const handleSave = (data) => {
    setSavingUser(data.user_email);
    saveMutation.mutate(data);
  };

  const userRows = [...users];
  const extraPerms = perms.filter((perm) => !users.some((user) => user.email === perm.user_email));
  const extraRows = extraPerms.map((perm) => ({
    id: perm.collaborator_id || perm.id,
    email: perm.user_email,
    full_name: perm.full_name,
    role: perm.access_level || 'user',
    access_level: perm.access_level || null,
    function_role: perm.function_role || null,
  }));
  const allRows = [...userRows, ...extraRows];
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows = allRows.filter((user) => {
    if (!normalizedSearch) return true;
    return (
      user.full_name?.toLowerCase().includes(normalizedSearch) ||
      user.email?.toLowerCase().includes(normalizedSearch)
    );
  });
  const {
    page,
    setPage,
    totalItems,
    totalPages,
    paginatedItems: paginatedRows,
  } = usePaginatedItems(filteredRows, 8, [search, allRows.length]);

  const isLoading = usersLoading || permsLoading;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-bold">Permissoes por modulo</h2>
        <p className="text-sm text-muted-foreground">Controle quem pode visualizar cada area. Edicao fica disponivel apenas para gestores e administradores.</p>
      </div>

      <div className="relative mb-6 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar colaborador por nome ou e-mail..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-40 rounded-xl" />)}</div>
      ) : filteredRows.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <UserCog className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>Nenhum colaborador encontrado.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedRows.map((user) => (
              <PermissionRow
                key={user.email}
                user={user}
                existingPerm={perms.find((perm) => perm.user_email === user.email)}
                onSave={handleSave}
                isSaving={savingUser === user.email}
              />
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={8}
            onPageChange={setPage}
            itemLabel="usuarios"
          />
        </>
      )}
    </div>
  );
}
