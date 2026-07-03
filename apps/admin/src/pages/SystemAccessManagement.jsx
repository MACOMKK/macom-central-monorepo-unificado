import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
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

const accessOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'usuario', label: 'Usuario' },
];

const hiddenAccessSystemSlugs = new Set(['central', 'rh', 'pagamentos']);

function normalize(value) {
  return String(value || '').toLowerCase();
}

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

export default function SystemAccessManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [collaboratorSearch, setCollaboratorSearch] = useState('');
  const [accessToDelete, setAccessToDelete] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [form, setForm] = useState({
    colaborador_id: '',
    sistema_id: '',
    nivel_acesso: 'usuario',
    ativo: 'true',
  });

  const { data: collaborators = [], isLoading: loadingCollaborators } = useQuery({
    queryKey: ['console', 'accesses', 'collaborators'],
    queryFn: platformUsersApi.collaborators.list,
  });

  const { data: systems = [], isLoading: loadingSystems } = useQuery({
    queryKey: ['console', 'accesses', 'systems'],
    queryFn: platformUsersApi.systems.list,
  });

  const { data: accesses = [], isLoading: loadingAccesses } = useQuery({
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
      queryClient.setQueryData(context.queryKey, (old = []) => {
        if (!Array.isArray(old)) return old;
        return upsertAccess(
          old.filter((entry) => entry.id !== context.optimisticId),
          savedAccess,
        );
      });
      queryClient.invalidateQueries({ queryKey: ['console', 'accesses'] });
      queryClient.invalidateQueries({ queryKey: ['console', 'users', 'accesses'] });
      setFeedback({ type: 'success', message: 'Acesso salvo pelo Console.' });
    },
    onError: (error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousAccesses);
      }
      setFeedback({ type: 'error', message: error.message || 'Falha ao salvar acesso.' });
    },
  });

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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Console Macom</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Acessos por Sistema</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Libere, bloqueie ou remova acessos aos sistemas da plataforma usando as regras atuais.
          </p>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar colaborador, email ou sistema..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </header>

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold uppercase text-foreground">Liberar acesso</h2>
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
                {filteredCollaborators.map((collaborator) => (
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
                {grantableSystems.map((system) => (
                  <SelectItem key={system.id} value={system.id}>
                    {system.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <TableCell className="uppercase">{entry.nivel_acesso}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={entry.ativo ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}>
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
