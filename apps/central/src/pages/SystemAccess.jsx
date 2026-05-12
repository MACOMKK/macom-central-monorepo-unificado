import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus, ShieldCheck, Trash2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import FeedbackToast from '@/components/ui/feedback-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

export default function SystemAccess() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [collaboratorSearch, setCollaboratorSearch] = useState('');
  const [feedback, setFeedback] = useState(null);
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

  const activeCollaborators = useMemo(
    () => collaborators.filter((collaborator) => collaborator.status !== 'inativo'),
    [collaborators],
  );

  const filteredActiveCollaborators = useMemo(() => {
    const term = collaboratorSearch.trim().toLowerCase();

    if (!term) return activeCollaborators;

    return activeCollaborators.filter((collaborator) =>
      [collaborator.nome, collaborator.email, collaborator.cargo]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [activeCollaborators, collaboratorSearch]);

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
    mutationFn: () =>
      systemAccessApi.accesses.save({
        colaborador_id: form.colaborador_id,
        sistema_id: form.sistema_id,
        nivel_acesso: form.nivel_acesso,
        ativo: form.ativo === 'true',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acessos_usuario_sistema'] });
      setFeedback({ type: 'success', message: 'Acesso do sistema salvo com sucesso.' });
      setForm({
        colaborador_id: '',
        sistema_id: '',
        nivel_acesso: 'usuario',
        ativo: 'true',
      });
      setCollaboratorSearch('');
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message || 'Falha ao salvar acesso do sistema.' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, ativo }) => systemAccessApi.accesses.update(id, { ativo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acessos_usuario_sistema'] });
      setFeedback({ type: 'success', message: 'Status do acesso atualizado.' });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message || 'Falha ao atualizar status do acesso.' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id) => systemAccessApi.accesses.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acessos_usuario_sistema'] });
      setFeedback({ type: 'success', message: 'Acesso removido com sucesso.' });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message || 'Falha ao remover acesso.' });
    },
  });

  const filteredAccesses = useMemo(() => {
    const collaboratorsById = new Map(collaborators.map((collaborator) => [collaborator.id, collaborator]));
    const systemsById = new Map(systems.map((system) => [system.id, system]));
    const term = search.trim().toLowerCase();
    const hydratedAccesses = accesses.map((entry) => ({
      ...entry,
      colaborador: collaboratorsById.get(entry.colaborador_id) || null,
      sistema: systemsById.get(entry.sistema_id) || null,
    }));

    if (!term) return hydratedAccesses;
    return hydratedAccesses.filter((entry) => {
      const collaboratorName = entry.colaborador?.nome || '';
      const collaboratorEmail = entry.colaborador?.email || '';
      const systemName = entry.sistema?.nome || '';
      const role = entry.nivel_acesso || '';
      return [collaboratorName, collaboratorEmail, systemName, role].some((value) =>
        String(value).toLowerCase().includes(term)
      );
    });
  }, [accesses, collaborators, search, systems]);

  const isLoading = loadingCollaborators || loadingSystems || loadingAccesses;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Governanca</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Acessos por Sistema</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Defina quais colaboradores podem acessar cada sistema da plataforma e com qual nivel de permissao.
        </p>
      </div>

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
            onClick={() => saveMutation.mutate()}
          >
            <Plus className="h-4 w-4" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar acesso'}
          </Button>
        </div>
      </Card>

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
                          onClick={() => removeMutation.mutate(entry.id)}
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
        </div>
      </Card>

      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}
