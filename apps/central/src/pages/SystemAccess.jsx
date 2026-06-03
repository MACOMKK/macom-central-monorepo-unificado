import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus, ShieldCheck, Trash2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import FeedbackToast from '@/components/ui/feedback-toast';
import { Button } from '@/components/ui/button';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/lib/AuthContext';
import { CENTRAL_PERMISSION_LEVELS } from '@/lib/centralPermissions';
import { catalogApi, systemAccessApi } from '@macom/api-client';

const accessOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'usuario', label: 'Usuario' },
];

const statusOptions = [
  { value: 'true', label: 'Liberado' },
  { value: 'false', label: 'Bloqueado' },
];

function upsertAccess(accesses, access) {
  if (!access) return accesses;
  const exists = accesses.some((entry) => (
    entry.id === access.id ||
    (
      access.colaborador_id &&
      access.sistema_id &&
      entry.colaborador_id === access.colaborador_id &&
      entry.sistema_id === access.sistema_id
    )
  ));

  if (!exists) return [access, ...accesses];

  return accesses.map((entry) => (
    entry.id === access.id ||
    (
      access.colaborador_id &&
      access.sistema_id &&
      entry.colaborador_id === access.colaborador_id &&
      entry.sistema_id === access.sistema_id
    )
      ? { ...entry, ...access }
      : entry
  ));
}

export default function SystemAccess() {
  const queryClient = useQueryClient();
  const { canCentral } = useAuth();
  const canManage = canCentral?.('acessos_usuario_sistema', CENTRAL_PERMISSION_LEVELS.manage);
  const [search, setSearch] = useState('');
  const [collaboratorSearch, setCollaboratorSearch] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [accessToDelete, setAccessToDelete] = useState(null);
  const [form, setForm] = useState({
    colaborador_id: '',
    sistema_id: '',
    nivel_acesso: 'usuario',
    ativo: 'true',
  });

  const { data: collaborators = [], isLoading: loadingCollaborators } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: catalogApi.colaboradores.list,
  });

  const { data: systems = [], isLoading: loadingSystems, error: systemsError } = useQuery({
    queryKey: ['sistemas'],
    queryFn: systemAccessApi.systems.list,
  });

  const { data: accesses = [], isLoading: loadingAccesses, error: accessesError } = useQuery({
    queryKey: ['acessos_usuario_sistema'],
    queryFn: systemAccessApi.accesses.list,
  });
  const normalizedCollaboratorSearch = useMemo(() => collaboratorSearch.trim().toLowerCase(), [collaboratorSearch]);
  const normalizedSearch = useMemo(() => search.trim().toLowerCase(), [search]);

  const activeCollaborators = useMemo(
    () => collaborators.filter((collaborator) => collaborator.status !== 'inativo'),
    [collaborators],
  );

  const collaboratorsById = useMemo(
    () => new Map(collaborators.map((collaborator) => [collaborator.id, collaborator])),
    [collaborators],
  );

  const systemsById = useMemo(
    () => new Map(systems.map((system) => [system.id, system])),
    [systems],
  );

  const filteredActiveCollaborators = useMemo(() => {
    if (!normalizedCollaboratorSearch) return activeCollaborators;

    return activeCollaborators.filter((collaborator) =>
      [collaborator.nome, collaborator.email, collaborator.cargo]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedCollaboratorSearch)),
    );
  }, [activeCollaborators, normalizedCollaboratorSearch]);

  useEffect(() => {
    if (systemsError) {
      setFeedback({ type: 'error', message: systemsError.message || 'Falha ao carregar os sistemas.' });
    }
  }, [systemsError]);

  useEffect(() => {
    if (accessesError) {
      setFeedback({ type: 'error', message: accessesError.message || 'Falha ao carregar os acessos dos sistemas.' });
    }
  }, [accessesError]);

  const saveMutation = useMutation({
    mutationFn: (data) => systemAccessApi.accesses.save(data),
    onMutate: async (data) => {
      const queryKey = ['acessos_usuario_sistema'];
      await queryClient.cancelQueries({ queryKey });
      const previousAccesses = queryClient.getQueryData(queryKey);
      const optimisticAccess = {
        ...data,
        id: `temp-access-${Date.now()}`,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      };

      queryClient.setQueryData(queryKey, (old = []) => (
        Array.isArray(old) ? upsertAccess(old, optimisticAccess) : old
      ));

      setForm({
        colaborador_id: '',
        sistema_id: '',
        nivel_acesso: 'usuario',
        ativo: 'true',
      });
      setCollaboratorSearch('');

      return { optimisticId: optimisticAccess.id, previousAccesses, queryKey };
    },
    onSuccess: (savedAccess, _variables, context) => {
      if (savedAccess?.id) {
        queryClient.setQueryData(context.queryKey, (old = []) => {
          if (!Array.isArray(old)) return old;
          return upsertAccess(
            old.filter((entry) => entry.id !== context.optimisticId),
            savedAccess,
          );
        });
      }
      queryClient.invalidateQueries({ queryKey: ['acessos_usuario_sistema'] });
      setFeedback({ type: 'success', message: 'Acesso do sistema salvo com sucesso.' });
    },
    onError: (error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousAccesses);
      }
      setFeedback({ type: 'error', message: error.message || 'Falha ao salvar acesso do sistema.' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, ativo }) => systemAccessApi.accesses.update(id, { ativo }),
    onMutate: async ({ id, ativo }) => {
      const queryKey = ['acessos_usuario_sistema'];
      await queryClient.cancelQueries({ queryKey });
      const previousAccesses = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old = []) => (
        Array.isArray(old)
          ? old.map((entry) => (entry.id === id ? { ...entry, ativo, atualizado_em: new Date().toISOString() } : entry))
          : old
      ));

      return { previousAccesses, queryKey };
    },
    onSuccess: (updatedAccess, _variables, context) => {
      if (updatedAccess?.id) {
        queryClient.setQueryData(context.queryKey, (old = []) => (
          Array.isArray(old) ? upsertAccess(old, updatedAccess) : old
        ));
      }
      queryClient.invalidateQueries({ queryKey: ['acessos_usuario_sistema'] });
      setFeedback({ type: 'success', message: 'Status do acesso atualizado.' });
    },
    onError: (error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousAccesses);
      }
      setFeedback({ type: 'error', message: error.message || 'Falha ao atualizar status do acesso.' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id) => systemAccessApi.accesses.remove(id),
    onMutate: async (id) => {
      const queryKey = ['acessos_usuario_sistema'];
      await queryClient.cancelQueries({ queryKey });
      const previousAccesses = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old = []) => (
        Array.isArray(old) ? old.filter((entry) => entry.id !== id) : old
      ));

      return { previousAccesses, queryKey };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acessos_usuario_sistema'] });
      setFeedback({ type: 'success', message: 'Acesso removido com sucesso.' });
    },
    onError: (error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousAccesses);
      }
      setFeedback({ type: 'error', message: error.message || 'Falha ao remover acesso.' });
    },
  });

  const hydratedAccesses = useMemo(
    () =>
      accesses.map((entry) => ({
      ...entry,
      colaborador: collaboratorsById.get(entry.colaborador_id) || null,
      sistema: systemsById.get(entry.sistema_id) || null,
    })),
    [accesses, collaboratorsById, systemsById],
  );

  const filteredAccesses = useMemo(() => {
    if (!normalizedSearch) return hydratedAccesses;
    return hydratedAccesses.filter((entry) => {
      const collaboratorName = entry.colaborador?.nome || '';
      const collaboratorEmail = entry.colaborador?.email || '';
      const systemName = entry.sistema?.nome || '';
      const role = entry.nivel_acesso || '';
      return [collaboratorName, collaboratorEmail, systemName, role].some((value) =>
        String(value).toLowerCase().includes(normalizedSearch)
      );
    });
  }, [hydratedAccesses, normalizedSearch]);

  const isLoading = loadingCollaborators || loadingSystems || loadingAccesses;

  const handleConfirmDelete = () => {
    if (!accessToDelete) return;
    removeMutation.mutate(accessToDelete.id);
    setAccessToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Governanca</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Acessos por Sistema</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Defina quais colaboradores podem acessar cada sistema da plataforma e com qual nivel de permissao.
        </p>
      </div>

      {canManage ? (
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground">Liberar Acesso</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>Colaborador</Label>
            <Select value={form.colaborador_id} onValueChange={(value) => setForm((current) => ({ ...current, colaborador_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o colaborador" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    className="h-8"
                    placeholder="Buscar colaborador..."
                    value={collaboratorSearch}
                    onChange={(event) => setCollaboratorSearch(event.target.value)}
                  />
                </div>
                {filteredActiveCollaborators.map((collaborator) => (
                  <SelectItem key={collaborator.id} value={collaborator.id}>
                    {collaborator.nome || collaborator.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sistema</Label>
            <Select value={form.sistema_id} onValueChange={(value) => setForm((current) => ({ ...current, sistema_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o sistema" />
              </SelectTrigger>
              <SelectContent>
                {loadingSystems ? <SelectItem value="loading-systems" disabled>Carregando sistemas...</SelectItem> : null}
                {!loadingSystems && systems.length === 0 ? (
                  <SelectItem value="empty-systems" disabled>
                    Nenhum sistema disponivel
                  </SelectItem>
                ) : null}
                {systems.map((system) => (
                  <SelectItem key={system.id} value={system.id}>
                    {system.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nivel de acesso</Label>
            <Select value={form.nivel_acesso} onValueChange={(value) => setForm((current) => ({ ...current, nivel_acesso: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accessOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.ativo} onValueChange={(value) => setForm((current) => ({ ...current, ativo: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            disabled={!form.colaborador_id || !form.sistema_id || saveMutation.isPending}
            onClick={() => saveMutation.mutate({
              colaborador_id: form.colaborador_id,
              sistema_id: form.sistema_id,
              nivel_acesso: form.nivel_acesso,
              ativo: form.ativo === 'true',
            })}
          >
            <Plus className="h-4 w-4" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar acesso'}
          </Button>
        </div>
      </Card>
      ) : null}

      <Card className="space-y-4 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground">Acessos Atuais</h2>
          </div>

          <Input
            className="md:w-[320px]"
            placeholder="Buscar por colaborador, email, sistema ou nivel..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Sistema</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Status</TableHead>
                {canManage ? <TableHead className="text-right">Acoes</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="py-10 text-center text-sm text-muted-foreground">
                    Carregando acessos...
                  </TableCell>
                </TableRow>
              ) : filteredAccesses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum acesso cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccesses.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.colaborador?.nome || '—'}</TableCell>
                    <TableCell>{entry.colaborador?.email || '—'}</TableCell>
                    <TableCell>{entry.sistema?.nome || '—'}</TableCell>
                    <TableCell className="uppercase">{entry.nivel_acesso}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-semibold ${
                          entry.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {entry.ativo ? 'Liberado' : 'Bloqueado'}
                      </span>
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={toggleMutation.isPending}
                            onClick={() => toggleMutation.mutate({ id: entry.id, ativo: !entry.ativo })}
                          >
                            {entry.ativo ? 'Bloquear' : 'Liberar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={removeMutation.isPending}
                            onClick={() => setAccessToDelete(entry)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />

      <ConfirmDeleteDialog
        open={Boolean(accessToDelete)}
        onOpenChange={(open) => !open && setAccessToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir acesso ao sistema"
        description={
          accessToDelete
            ? `Essa acao nao pode ser desfeita. Deseja remover o acesso de ${accessToDelete.colaborador?.nome || accessToDelete.colaborador?.email || 'este colaborador'} para ${accessToDelete.sistema?.nome || 'este sistema'}?`
            : 'Essa acao nao pode ser desfeita.'
        }
      />
    </div>
  );
}
