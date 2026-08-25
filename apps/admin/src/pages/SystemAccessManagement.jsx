import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, KeyRound, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { platformUsersApi } from '@macom/api-client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  FeedbackToast,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@macom/ui';

import PageHeader from '@/components/PageHeader';
import { normalize } from '@/lib/normalize';
import { upsertByKey } from '@/lib/upsertByKey';
import { getStatusBadgeClass } from '@/lib/statusStyles';

const accessOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'usuario', label: 'Usuario' },
];

const hiddenAccessSystemSlugs = new Set(['rh']);

function accessKey(access) {
  if (access.colaborador_id && access.sistema_id) {
    return `${access.colaborador_id}:${access.sistema_id}`;
  }
  return access.id;
}

function upsertAccess(accesses, access) {
  return upsertByKey(accesses, access, accessKey);
}

export default function SystemAccessManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [collaboratorSearch, setCollaboratorSearch] = useState('');
  const [accessToDelete, setAccessToDelete] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [form, setForm] = useState({
    colaborador_ids: [],
    sistema_ids: [],
    nivel_acesso: 'usuario',
    ativo: 'true',
  });

  const { data: collaborators = [], isLoading: loadingCollaborators, isError: errorCollaborators } = useQuery({
    queryKey: ['console', 'accesses', 'collaborators'],
    queryFn: platformUsersApi.collaborators.list,
  });

  const { data: systems = [], isLoading: loadingSystems, isError: errorSystems } = useQuery({
    queryKey: ['console', 'accesses', 'systems'],
    queryFn: platformUsersApi.systems.list,
  });

  const { data: accesses = [], isLoading: loadingAccesses, isError: errorAccesses } = useQuery({
    queryKey: ['console', 'accesses'],
    queryFn: platformUsersApi.accesses.list,
  });

  const collaboratorsById = useMemo(
    () => new Map(collaborators.map((collaborator) => [collaborator.id, collaborator])),
    [collaborators],
  );

  const systemsById = useMemo(
    () => new Map(systems.map((system) => [system.id, system])),
    [systems],
  );

  const grantableSystems = useMemo(
    () => systems.filter((system) => !hiddenAccessSystemSlugs.has(normalize(system.slug))),
    [systems],
  );

  const activeCollaborators = useMemo(
    () => collaborators.filter((collaborator) => collaborator.status !== 'inativo'),
    [collaborators],
  );

  const filteredCollaborators = useMemo(() => {
    const term = normalize(collaboratorSearch);
    if (!term) return activeCollaborators;

    return activeCollaborators.filter((collaborator) =>
      [collaborator.nome, collaborator.email, collaborator.cargo]
        .some((value) => normalize(value).includes(term)),
    );
  }, [activeCollaborators, collaboratorSearch]);

  const hydratedAccesses = useMemo(
    () => accesses.map((entry) => ({
      ...entry,
      colaborador: collaboratorsById.get(entry.colaborador_id) || null,
      sistema: systemsById.get(entry.sistema_id) || null,
    })),
    [accesses, collaboratorsById, systemsById],
  );

  const filteredAccesses = useMemo(() => {
    const term = normalize(search);
    if (!term) return hydratedAccesses;

    return hydratedAccesses.filter((entry) =>
      [
        entry.colaborador?.nome,
        entry.colaborador?.email,
        entry.sistema?.nome,
        entry.sistema?.slug,
        entry.nivel_acesso,
      ].some((value) => normalize(value).includes(term)),
    );
  }, [hydratedAccesses, search]);

  const saveMutation = useMutation({
    mutationFn: (payload) => platformUsersApi.accesses.save(payload),
    onMutate: async (payload) => {
      const queryKey = ['console', 'accesses'];
      await queryClient.cancelQueries({ queryKey });
      const previousAccesses = queryClient.getQueryData(queryKey);
      const optimisticAccess = {
        ...payload,
        id: `temp-access-${payload.sistema_id}-${Date.now()}`,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      };

      queryClient.setQueryData(queryKey, (old = []) => (
        Array.isArray(old) ? upsertAccess(old, optimisticAccess) : old
      ));

      return { optimisticId: optimisticAccess.id, previousAccesses, queryKey };
    },
    onSuccess: (savedAccess, _variables, context) => {
      queryClient.setQueryData(context.queryKey, (old = []) => {
        if (!Array.isArray(old)) return old;
        return upsertAccess(
          old.filter((entry) => entry.id !== context.optimisticId),
          savedAccess,
        );
      });
      queryClient.invalidateQueries({ queryKey: ['console', 'accesses'] });
      queryClient.invalidateQueries({ queryKey: ['console', 'users', 'accesses'] });
    },
    onError: (error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousAccesses);
      }
      setFeedback({ type: 'error', message: error.message || 'Falha ao salvar acesso.' });
    },
  });

  const handleSaveAccess = async () => {
    if (form.colaborador_ids.length === 0 || form.sistema_ids.length === 0) return;

    const totalCombinacoes = form.colaborador_ids.length * form.sistema_ids.length;

    try {
      for (const colaboradorId of form.colaborador_ids) {
        for (const sistemaId of form.sistema_ids) {
          await saveMutation.mutateAsync({
            colaborador_id: colaboradorId,
            sistema_id: sistemaId,
            nivel_acesso: form.nivel_acesso,
            ativo: form.ativo === 'true',
          });
        }
      }
      setForm({
        colaborador_ids: [],
        sistema_ids: [],
        nivel_acesso: 'usuario',
        ativo: 'true',
      });
      setCollaboratorSearch('');
      setFeedback({
        type: 'success',
        message: totalCombinacoes > 1 ? 'Acessos salvos pelo Console.' : 'Acesso salvo pelo Console.',
      });
    } catch {
      // erro individual ja tratado pelo onError do saveMutation
    }
  };

  const toggleMutation = useMutation({
    mutationFn: ({ id, ativo }) => platformUsersApi.accesses.update(id, { ativo }),
    onMutate: async ({ id, ativo }) => {
      const queryKey = ['console', 'accesses'];
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
      queryClient.setQueryData(context.queryKey, (old = []) => (
        Array.isArray(old) ? upsertAccess(old, updatedAccess) : old
      ));
      queryClient.invalidateQueries({ queryKey: ['console', 'accesses'] });
      queryClient.invalidateQueries({ queryKey: ['console', 'users', 'accesses'] });
      setFeedback({ type: 'success', message: 'Status do acesso atualizado.' });
    },
    onError: (error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousAccesses);
      }
      setFeedback({ type: 'error', message: error.message || 'Falha ao atualizar acesso.' });
    },
  });

  const levelMutation = useMutation({
    mutationFn: ({ id, nivel_acesso }) => platformUsersApi.accesses.update(id, { nivel_acesso }),
    onMutate: async ({ id, nivel_acesso }) => {
      const queryKey = ['console', 'accesses'];
      await queryClient.cancelQueries({ queryKey });
      const previousAccesses = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old = []) => (
        Array.isArray(old)
          ? old.map((entry) => (entry.id === id ? { ...entry, nivel_acesso, atualizado_em: new Date().toISOString() } : entry))
          : old
      ));

      return { previousAccesses, queryKey };
    },
    onSuccess: (updatedAccess, _variables, context) => {
      queryClient.setQueryData(context.queryKey, (old = []) => (
        Array.isArray(old) ? upsertAccess(old, updatedAccess) : old
      ));
      queryClient.invalidateQueries({ queryKey: ['console', 'accesses'] });
      queryClient.invalidateQueries({ queryKey: ['console', 'users', 'accesses'] });
      setFeedback({ type: 'success', message: 'Nivel de acesso atualizado.' });
    },
    onError: (error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousAccesses);
      }
      setFeedback({ type: 'error', message: error.message || 'Falha ao atualizar nivel de acesso.' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id) => platformUsersApi.accesses.remove(id),
    onMutate: async (id) => {
      const queryKey = ['console', 'accesses'];
      await queryClient.cancelQueries({ queryKey });
      const previousAccesses = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old = []) => (
        Array.isArray(old) ? old.filter((entry) => entry.id !== id) : old
      ));

      return { previousAccesses, queryKey };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['console', 'accesses'] });
      queryClient.invalidateQueries({ queryKey: ['console', 'users', 'accesses'] });
      setAccessToDelete(null);
      setFeedback({ type: 'success', message: 'Acesso removido.' });
    },
    onError: (error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousAccesses);
      }
      setFeedback({ type: 'error', message: error.message || 'Falha ao remover acesso.' });
    },
  });

  const isLoading = loadingCollaborators || loadingSystems || loadingAccesses;
  const isError = errorCollaborators || errorSystems || errorAccesses;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Acessos por Sistema"
        description="Libere, bloqueie ou remova acessos aos sistemas da plataforma usando as regras atuais."
        actions={
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar colaborador, email ou sistema..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        }
      />

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold uppercase text-foreground">Liberar acesso</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>Colaboradores</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  <span className="truncate text-left">
                    {form.colaborador_ids.length === 0
                      ? 'Selecione o(s) colaborador(es)'
                      : form.colaborador_ids
                        .map((id) => collaboratorsById.get(id)?.nome || collaboratorsById.get(id)?.email)
                        .filter(Boolean)
                        .join(', ')}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="start">
                <div className="p-2">
                  <Input
                    className="h-8"
                    placeholder="Buscar colaborador..."
                    value={collaboratorSearch}
                    onChange={(event) => setCollaboratorSearch(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                  />
                </div>
                {filteredCollaborators.map((collaborator) => (
                  <DropdownMenuCheckboxItem
                    key={collaborator.id}
                    checked={form.colaborador_ids.includes(collaborator.id)}
                    onSelect={(event) => event.preventDefault()}
                    onCheckedChange={(checked) => {
                      setForm((current) => ({
                        ...current,
                        colaborador_ids: checked
                          ? [...current.colaborador_ids, collaborator.id]
                          : current.colaborador_ids.filter((id) => id !== collaborator.id),
                      }));
                    }}
                  >
                    {collaborator.nome || collaborator.email}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            <Label>Sistemas</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  <span className="truncate text-left">
                    {form.sistema_ids.length === 0
                      ? 'Selecione o(s) sistema(s)'
                      : form.sistema_ids
                        .map((id) => systemsById.get(id)?.nome)
                        .filter(Boolean)
                        .join(', ')}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="start">
                {grantableSystems.map((system) => (
                  <DropdownMenuCheckboxItem
                    key={system.id}
                    checked={form.sistema_ids.includes(system.id)}
                    onSelect={(event) => event.preventDefault()}
                    onCheckedChange={(checked) => {
                      setForm((current) => ({
                        ...current,
                        sistema_ids: checked
                          ? [...current.sistema_ids, system.id]
                          : current.sistema_ids.filter((id) => id !== system.id),
                      }));
                    }}
                  >
                    {system.nome}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            <Label>Nivel</Label>
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
                <SelectItem value="true">Liberado</SelectItem>
                <SelectItem value="false">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            disabled={form.colaborador_ids.length === 0 || form.sistema_ids.length === 0 || saveMutation.isPending}
            onClick={handleSaveAccess}
          >
            <Plus className="h-4 w-4" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar acesso'}
          </Button>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold uppercase text-foreground">Acessos atuais</h2>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Sistema</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Carregando acessos...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-destructive">
                  Nao foi possivel carregar os acessos. Tente novamente.
                </TableCell>
              </TableRow>
            ) : filteredAccesses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum acesso encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredAccesses.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.colaborador?.nome || '-'}</TableCell>
                  <TableCell>{entry.colaborador?.email || '-'}</TableCell>
                  <TableCell>{entry.sistema?.nome || '-'}</TableCell>
                  <TableCell>
                    <Select
                      value={entry.nivel_acesso}
                      onValueChange={(value) => {
                        if (value !== entry.nivel_acesso) {
                          levelMutation.mutate({ id: entry.id, nivel_acesso: value });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-32">
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
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadgeClass(entry.ativo ? 'active' : 'inativo')}>
                      {entry.ativo ? 'Liberado' : 'Bloqueado'}
                    </Badge>
                  </TableCell>
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={Boolean(accessToDelete)} onOpenChange={(open) => !open && setAccessToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover acesso</AlertDialogTitle>
            <AlertDialogDescription>
              Essa acao remove o acesso de {accessToDelete?.colaborador?.nome || accessToDelete?.colaborador?.email || 'este colaborador'} ao sistema {accessToDelete?.sistema?.nome || 'selecionado'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => accessToDelete && removeMutation.mutate(accessToDelete.id)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}
