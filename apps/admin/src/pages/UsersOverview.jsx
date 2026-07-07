import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, Mail, Pencil, RefreshCw, Search, UsersRound } from 'lucide-react';
import { platformUsersApi } from '@macom/api-client';
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
import { getStatusBadgeClass } from '@/lib/statusStyles';

export default function UsersOverview() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [emailUser, setEmailUser] = useState(null);
  const [editForm, setEditForm] = useState({ funcao: 'usuario', status: 'ativo' });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [emailForm, setEmailForm] = useState({ email: '', confirmEmail: '', resetPassword: false });
  const [feedback, setFeedback] = useState(null);

  const { data: collaborators = [], isLoading: loadingCollaborators, isError: errorCollaborators } = useQuery({
    queryKey: ['console', 'users', 'collaborators'],
    queryFn: platformUsersApi.collaborators.list,
  });

  const { data: systems = [], isLoading: loadingSystems, isError: errorSystems } = useQuery({
    queryKey: ['console', 'users', 'systems'],
    queryFn: platformUsersApi.systems.list,
  });

  const { data: accesses = [], isLoading: loadingAccesses, isError: errorAccesses } = useQuery({
    queryKey: ['console', 'users', 'accesses'],
    queryFn: platformUsersApi.accesses.list,
  });

  const systemsById = useMemo(
    () => new Map(systems.map((system) => [system.id, system])),
    [systems],
  );

  const accessByCollaboratorId = useMemo(() => {
    return accesses.reduce((acc, access) => {
      if (!access.colaborador_id) return acc;
      if (!acc[access.colaborador_id]) acc[access.colaborador_id] = [];
      acc[access.colaborador_id].push({
        ...access,
        sistema: systemsById.get(access.sistema_id) || null,
      });
      return acc;
    }, {});
  }, [accesses, systemsById]);

  const normalizedSearch = normalize(search);
  const filteredCollaborators = useMemo(() => {
    if (!normalizedSearch) return collaborators;

    return collaborators.filter((collaborator) => {
      const linkedAccesses = accessByCollaboratorId[collaborator.id] || [];
      return [
        collaborator.nome,
        collaborator.email,
        collaborator.funcao,
        collaborator.status,
        collaborator.cargo,
        ...linkedAccesses.map((access) => access.sistema?.nome),
      ].some((value) => normalize(value).includes(normalizedSearch));
    });
  }, [accessByCollaboratorId, collaborators, normalizedSearch]);

  const activeUsers = collaborators.filter((collaborator) => collaborator.status !== 'inativo').length;
  const adminUsers = collaborators.filter((collaborator) => collaborator.funcao === 'admin').length;
  const usersWithAccess = new Set(accesses.filter((access) => access.ativo).map((access) => access.colaborador_id)).size;
  const isLoading = loadingCollaborators || loadingSystems || loadingAccesses;
  const isError = errorCollaborators || errorSystems || errorAccesses;

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => platformUsersApi.collaborators.updateAccessProfile(id, payload),
    onMutate: async ({ id, payload }) => {
      const queryKey = ['console', 'users', 'collaborators'];
      await queryClient.cancelQueries({ queryKey });
      const previousCollaborators = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old = []) => (
        Array.isArray(old)
          ? old.map((collaborator) => (collaborator.id === id ? { ...collaborator, ...payload } : collaborator))
          : old
      ));

      return { previousCollaborators, queryKey };
    },
    onSuccess: (updatedUser, _variables, context) => {
      if (updatedUser?.id) {
        queryClient.setQueryData(context.queryKey, (old = []) => (
          Array.isArray(old)
            ? old.map((collaborator) => (collaborator.id === updatedUser.id ? { ...collaborator, ...updatedUser } : collaborator))
            : old
        ));
      }
      queryClient.invalidateQueries({ queryKey: ['console', 'users', 'collaborators'] });
      setEditingUser(null);
      setFeedback({ type: 'success', message: 'Perfil de acesso atualizado pelo Console.' });
    },
    onError: (error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousCollaborators);
      }
      setFeedback({ type: 'error', message: error.message || 'Falha ao atualizar perfil de acesso.' });
    },
  });
  const passwordMutation = useMutation({
    mutationFn: ({ id, password }) => platformUsersApi.collaborators.updatePassword(id, password),
    onSuccess: () => {
      setPasswordUser(null);
      setPasswordForm({ password: '', confirmPassword: '' });
      setFeedback({ type: 'success', message: 'Senha redefinida pelo Console.' });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message || 'Falha ao redefinir senha.' });
    },
  });
  const emailMutation = useMutation({
    mutationFn: ({ id, email, resetPassword }) => platformUsersApi.collaborators.updateEmail(id, email, { resetPassword }),
    onMutate: async ({ id, email }) => {
      const queryKey = ['console', 'users', 'collaborators'];
      await queryClient.cancelQueries({ queryKey });
      const previousCollaborators = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old = []) => (
        Array.isArray(old)
          ? old.map((collaborator) => (collaborator.id === id ? { ...collaborator, email } : collaborator))
          : old
      ));

      return { previousCollaborators, queryKey };
    },
    onSuccess: (updatedUser, _variables, context) => {
      if (updatedUser?.id) {
        queryClient.setQueryData(context.queryKey, (old = []) => (
          Array.isArray(old)
            ? old.map((collaborator) => (collaborator.id === updatedUser.id ? { ...collaborator, ...updatedUser } : collaborator))
            : old
        ));
      }
      queryClient.invalidateQueries({ queryKey: ['console', 'users', 'collaborators'] });
      setEmailUser(null);
      setEmailForm({ email: '', confirmEmail: '', resetPassword: false });
      setFeedback({ type: 'success', message: 'E-mail de acesso atualizado pelo Console.' });
    },
    onError: (error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousCollaborators);
      }
      setFeedback({ type: 'error', message: error.message || 'Falha ao atualizar e-mail.' });
    },
  });

  const handleEditUser = (collaborator) => {
    setEditingUser(collaborator);
    setEditForm({
      funcao: collaborator.funcao || 'usuario',
      status: collaborator.status || 'ativo',
    });
  };

  const handleSaveEdit = () => {
    if (!editingUser?.id) return;
    updateMutation.mutate({
      id: editingUser.id,
      payload: {
        funcao: editForm.funcao,
        status: editForm.status,
      },
    });
  };
  const generatePassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*';
    const nextPassword = Array.from({ length: 12 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    setPasswordForm({ password: nextPassword, confirmPassword: nextPassword });
    navigator.clipboard?.writeText(nextPassword).catch(() => null);
  };

  const copyPassword = () => {
    if (!passwordForm.password) return;
    navigator.clipboard?.writeText(passwordForm.password).catch(() => null);
  };

  const handleSavePassword = () => {
    if (!passwordUser?.id) return;

    if (!passwordForm.password || passwordForm.password.length < 6) {
      setFeedback({ type: 'error', message: 'A senha precisa ter pelo menos 6 caracteres.' });
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setFeedback({ type: 'error', message: 'As senhas nao conferem.' });
      return;
    }

    passwordMutation.mutate({ id: passwordUser.id, password: passwordForm.password });
  };
  const handleSaveEmail = () => {
    if (!emailUser?.id) return;
    const nextEmail = emailForm.email.trim();
    const confirmEmail = emailForm.confirmEmail.trim();

    if (!nextEmail || !nextEmail.includes('@')) {
      setFeedback({ type: 'error', message: 'Informe um e-mail valido.' });
      return;
    }

    if (nextEmail !== confirmEmail) {
      setFeedback({ type: 'error', message: 'Os e-mails nao conferem.' });
      return;
    }

    emailMutation.mutate({
      id: emailUser.id,
      email: nextEmail,
      resetPassword: emailForm.resetPassword,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Gerencie apenas perfil e status de acesso. Dados operacionais do colaborador continuam na Central."
        actions={
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar usuario, email, perfil ou sistema..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Usuarios ativos</p>
          <p className="mt-2 text-3xl font-black">{activeUsers}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Administradores</p>
          <p className="mt-2 text-3xl font-black">{adminUsers}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Com acesso a sistemas</p>
          <p className="mt-2 text-3xl font-black">{usersWithAccess}</p>
        </Card>
      </section>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <UsersRound className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold uppercase text-foreground">Usuarios da plataforma</h2>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sistemas</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Carregando usuarios...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-destructive">
                  Nao foi possivel carregar os usuarios. Tente novamente.
                </TableCell>
              </TableRow>
            ) : filteredCollaborators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum usuario encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredCollaborators.map((collaborator) => {
                const linkedAccesses = accessByCollaboratorId[collaborator.id] || [];
                const activeAccesses = linkedAccesses.filter((access) => access.ativo);

                return (
                  <TableRow key={collaborator.id}>
                    <TableCell className="font-medium">{collaborator.nome || '-'}</TableCell>
                    <TableCell>{collaborator.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeClass(collaborator.funcao || 'usuario')}>
                        {collaborator.funcao || 'usuario'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeClass(collaborator.status)}>
                        {collaborator.status || 'sem status'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {activeAccesses.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {activeAccesses.map((access) => (
                            <Badge key={access.id} variant="secondary">
                              {access.sistema?.nome || 'Sistema'}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem acessos liberados</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditUser(collaborator)}>
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPasswordUser(collaborator);
                            setPasswordForm({ password: '', confirmPassword: '' });
                          }}
                        >
                          <KeyRound className="h-4 w-4" />
                          Senha
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEmailUser(collaborator);
                            setEmailForm({
                              email: collaborator.email || '',
                              confirmEmail: collaborator.email || '',
                              resetPassword: false,
                            });
                          }}
                        >
                          <Mail className="h-4 w-4" />
                          Email
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar perfil de acesso</DialogTitle>
            <DialogDescription>
              Altere somente o perfil e o status usados para acesso aos sistemas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-border bg-background p-3">
              <p className="text-sm font-semibold">{editingUser?.nome || '-'}</p>
              <p className="text-sm text-muted-foreground">{editingUser?.email || '-'}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={editForm.funcao} onValueChange={(value) => setEditForm((current) => ({ ...current, funcao: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usuario">Usuario</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm((current) => ({ ...current, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={updateMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(passwordUser)} onOpenChange={(open) => !open && setPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Esta acao altera a senha de acesso do usuario selecionado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-border bg-background p-3">
              <p className="text-sm font-semibold">{passwordUser?.nome || '-'}</p>
              <p className="text-sm text-muted-foreground">{passwordUser?.email || '-'}</p>
            </div>

            <div className="space-y-2">
              <Label>Nova senha</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={passwordForm.password}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
                />
                <Button type="button" variant="outline" size="icon" onClick={generatePassword} title="Gerar senha">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={copyPassword} title="Copiar senha">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Confirmar senha</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordUser(null)} disabled={passwordMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSavePassword} disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? 'Salvando...' : 'Redefinir senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(emailUser)} onOpenChange={(open) => !open && setEmailUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar e-mail de acesso</DialogTitle>
            <DialogDescription>
              Esta acao altera o e-mail usado para login do usuario selecionado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-border bg-background p-3">
              <p className="text-sm font-semibold">{emailUser?.nome || '-'}</p>
              <p className="text-sm text-muted-foreground">{emailUser?.email || '-'}</p>
            </div>

            <div className="space-y-2">
              <Label>Novo e-mail</Label>
              <Input
                type="email"
                value={emailForm.email}
                onChange={(event) => setEmailForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Confirmar e-mail</Label>
              <Input
                type="email"
                value={emailForm.confirmEmail}
                onChange={(event) => setEmailForm((current) => ({ ...current, confirmEmail: event.target.value }))}
              />
            </div>

            <label className="flex items-start gap-2 rounded-md border border-border bg-background p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={emailForm.resetPassword}
                onChange={(event) => setEmailForm((current) => ({ ...current, resetPassword: event.target.checked }))}
              />
              <span className="text-muted-foreground">
                Redefinir senha para o padrao configurado pelo backend junto com a troca de e-mail.
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailUser(null)} disabled={emailMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEmail} disabled={emailMutation.isPending}>
              {emailMutation.isPending ? 'Salvando...' : 'Salvar e-mail'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}
