import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Search, Shield, Save, UserCog, X } from 'lucide-react';
import { Badge, Button, Input, Skeleton } from '@macom/ui';
import { usePermissions } from '@/lib/usePermissions';
import { toast } from 'sonner';
import Pagination, { usePaginatedItems } from '../components/Pagination';

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
  const [modules, setModules] = useState(existingPerm?.modules || DEFAULT_MODULES);

  useEffect(() => {
    if (existingPerm?.modules) setModules(existingPerm.modules);
  }, [existingPerm?.id]);

  const handleSave = () =>
    onSave({
      collaborator_id: user.id,
      user_email: user.email,
      modules,
    });

  if (user.role === 'admin') {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-sm">{user.full_name || user.email}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Badge className="bg-primary/10 text-primary sm:self-auto self-start">Admin - acesso total</Badge>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.full_name || user.email}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="w-full gap-2 rounded-xl sm:w-auto">
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Salvar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((mod) => (
          <div key={mod.key} className="rounded-xl border border-border/60 bg-background p-3">
            <div className="flex flex-col gap-2 sm:gap-2.5">
              <p className="text-[11px] font-medium text-foreground">
              {mod.label}
              </p>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/40 p-1">
                {PERMISSION_OPTIONS.map((option) => {
                  const active = (modules[mod.key] || 'view') === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setModules((prev) => ({ ...prev, [mod.key]: option.value }))}
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
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileChangeRequestsPanel({ requests, isLoading, onReview, reviewingId }) {
  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold">Solicitacoes de perfil</h2>
          <p className="text-sm text-muted-foreground">Aprove ou reprove trocas de departamento e unidade.</p>
        </div>
        <Badge className="w-fit bg-primary/10 text-primary">
          {requests.length} pendente{requests.length === 1 ? '' : 's'}
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((item) => <Skeleton key={item} className="h-28 rounded-xl" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhuma solicitacao pendente.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{request.collaborator_name || request.collaborator_email}</p>
                  <p className="text-xs text-muted-foreground">{request.collaborator_email}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => onReview(request.id, 'rejected')}
                    disabled={reviewingId === request.id}
                  >
                    {reviewingId === request.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                    Reprovar
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => onReview(request.id, 'approved')}
                    disabled={reviewingId === request.id}
                  >
                    {reviewingId === request.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Aprovar
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Departamento</p>
                  <p className="mt-1 text-muted-foreground">{request.current_department_name || '-'}</p>
                  <p className="mt-1 font-semibold text-foreground">{request.requested_department_name || '-'}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unidade</p>
                  <p className="mt-1 text-muted-foreground">{request.current_unit_name || '-'}</p>
                  <p className="mt-1 font-semibold text-foreground">{request.requested_unit_name || '-'}</p>
                </div>
              </div>

              {request.note ? (
                <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-muted-foreground">{request.note}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Permissions() {
  const { isLoading: permLoading, role } = usePermissions(null);
  const queryClient = useQueryClient();
  const [savingUser, setSavingUser] = useState(null);
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => appClient.entities.User.list('full_name', 500),
  });

  const { data: perms = [], isLoading: permsLoading } = useQuery({
    queryKey: ['user-permissions'],
    queryFn: () => appClient.entities.UserPermission.list(),
  });

  const { data: profileChangeRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['profile-change-requests'],
    queryFn: () => appClient.entities.ProfileChangeRequest.list(),
    enabled: role === 'admin',
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
      toast.error('Não foi possível salvar as permissões.');
      setSavingUser(null);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }) => appClient.entities.ProfileChangeRequest.update(id, { status }),
    onMutate: ({ id }) => {
      setReviewingRequest(id);
    },
    onSuccess: (_savedRequest, variables) => {
      queryClient.setQueryData(['profile-change-requests'], (old = []) => (
        Array.isArray(old) ? old.filter((item) => item.id !== variables.id) : old
      ));
      queryClient.invalidateQueries({ queryKey: ['profile-change-requests'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(variables.status === 'approved' ? 'Solicitacao aprovada.' : 'Solicitacao reprovada.');
      setReviewingRequest(null);
    },
    onError: () => {
      toast.error('Nao foi possivel analisar a solicitacao.');
      setReviewingRequest(null);
    },
  });

  const handleSave = (data) => {
    setSavingUser(data.user_email);
    saveMutation.mutate(data);
  };

  const handleReviewRequest = (id, status) => {
    reviewMutation.mutate({ id, status });
  };

  const isLoading = permLoading || usersLoading || permsLoading;
  const userRows = [...users];
  const extraPerms = perms.filter((perm) => !users.some((user) => user.email === perm.user_email));
  const extraRows = extraPerms.map((perm) => ({
    id: perm.collaborator_id || perm.id,
    email: perm.user_email,
    full_name: perm.full_name,
    role: 'user',
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

  if (!permLoading && role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <Shield className="w-12 h-12 mb-3 opacity-30" />
        <p>Apenas administradores podem acessar esta pagina.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <UserCog className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Permissoes de Acesso</h1>
          <p className="text-sm text-muted-foreground">Configure o acesso por módulo para cada usuário</p>
        </div>
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

      <ProfileChangeRequestsPanel
        requests={profileChangeRequests}
        isLoading={requestsLoading}
        onReview={handleReviewRequest}
        reviewingId={reviewingRequest}
      />

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
            itemLabel="usuários"
          />
        </>
      )}
    </div>
  );
}

