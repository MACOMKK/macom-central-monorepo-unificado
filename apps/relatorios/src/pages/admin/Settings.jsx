import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { dataClient } from '@/api/dataClient';
import { UserPlus, Pencil, Trash2, UserX, UserCheck, MoreHorizontal, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import AdminGuard from '@/components/admin/AdminGuard';

export default function Settings() {
  const { user } = useOutletContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [invitePassword, setInvitePassword] = useState('');

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [editUnitId, setEditUnitId] = useState('none');
  const [confirmAction, setConfirmAction] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['settings-users'],
    queryFn: () => dataClient.entities.User.list(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units-for-settings'],
    queryFn: () => dataClient.entities.Unit.list(),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => dataClient.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast({ title: 'Usuario atualizado!' });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: ({ userId, password }) => dataClient.users.setUserPassword(userId, password),
    onSuccess: () => {
      toast({ title: 'Senha atualizada com sucesso!' });
      setPasswordOpen(false);
      setSelectedUser(null);
      setNewPassword('');
    },
  });

  const manageUserMutation = useMutation({
    mutationFn: ({ userId, action }) => dataClient.users.manageUser(userId, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      const titles = {
        delete: 'Usuario excluido com sucesso!',
        deactivate: 'Usuario inativado com sucesso!',
        activate: 'Usuario reativado com sucesso!',
      };
      toast({ title: titles[variables.action] || 'Usuario atualizado!' });
      setConfirmAction(null);
    },
    onError: (error, variables) => {
      const isDeleteBlocked = variables.action === 'delete' && error?.status === 409;
      const description = isDeleteBlocked
        ? 'Nao e possivel excluir este usuario porque ele possui relatorios vinculados.'
        : error?.message || 'Nao foi possivel concluir a operacao.';
      toast({
        title: isDeleteBlocked ? 'Exclusao nao permitida' : 'Falha ao atualizar usuario',
        description
      });
    }
  });

  const handleInvite = async () => {
    if (!inviteName.trim()) {
      toast({ title: 'Nome obrigatorio', description: 'Informe o nome do usuario.' });
      return;
    }

    if (invitePassword && invitePassword.length < 8) {
      toast({ title: 'Senha inicial invalida', description: 'Use pelo menos 8 caracteres.' });
      return;
    }

    await dataClient.users.inviteUser(inviteEmail, inviteRole, invitePassword, inviteName.trim());
    queryClient.invalidateQueries({ queryKey: ['settings-users'] });
    queryClient.invalidateQueries({ queryKey: ['all-users'] });
    toast({ title: 'Convite enviado!', description: `Convite enviado para ${inviteEmail}` });
    setInviteOpen(false);
    setInviteEmail('');
    setInviteName('');
    setInvitePassword('');
    setInviteRole('user');
  };

  const openPasswordDialog = (targetUser) => {
    setSelectedUser(targetUser);
    setNewPassword('');
    setPasswordOpen(true);
  };

  const handleUpdatePassword = async () => {
    if (!selectedUser?.id) return;
    if (newPassword.length < 8) {
      toast({ title: 'Senha invalida', description: 'Use pelo menos 8 caracteres.' });
      return;
    }

    await updatePasswordMutation.mutateAsync({ userId: selectedUser.id, password: newPassword });
  };

  const openEditDialog = (targetUser) => {
    setEditUser(targetUser);
    setEditName(targetUser?.full_name || '');
    setEditRole(targetUser?.role || 'user');
    setEditUnitId(targetUser?.unit_id || 'none');
    setEditOpen(true);
  };

  const handleSaveUserInfo = async () => {
    if (!editUser?.id) return;
    if (!editName.trim()) {
      toast({ title: 'Nome obrigatorio', description: 'Informe o nome do usuario.' });
      return;
    }

    const unit = units.find(un => un.id === editUnitId);
    await updateUserMutation.mutateAsync({
      id: editUser.id,
      data: {
        full_name: editName.trim(),
        role: editRole,
        unit_id: editUnitId === 'none' ? null : editUnitId,
        unit_name: unit?.name || null,
      }
    });
    setEditOpen(false);
    setEditUser(null);
  };

  const statusLabel = (targetUser) => targetUser?.active === false ? 'Inativo' : 'Ativo';

  const openConfirmAction = (targetUser, action) => {
    setConfirmAction({ user: targetUser, action });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction?.user?.id || !confirmAction?.action) return;
    await manageUserMutation.mutateAsync({
      userId: confirmAction.user.id,
      action: confirmAction.action
    });
  };

  const getActionCopy = () => {
    const action = confirmAction?.action;
    const targetUser = confirmAction?.user;
    if (!action || !targetUser) return {};

    if (action === 'delete') {
      return {
        title: 'Excluir usuario',
        description: `Deseja excluir ${targetUser.full_name || targetUser.email}? A exclusao so sera concluida se ele nao tiver relatorios vinculados.`,
        confirmLabel: 'Excluir'
      };
    }

    if (action === 'deactivate') {
      return {
        title: 'Inativar usuario',
        description: `Deseja inativar ${targetUser.full_name || targetUser.email}? O acesso ao sistema sera bloqueado, mas os vinculos com relatorios serao mantidos.`,
        confirmLabel: 'Inativar'
      };
    }

    return {
      title: 'Reativar usuario',
      description: `Deseja reativar ${targetUser.full_name || targetUser.email}? O acesso ao sistema sera liberado novamente.`,
      confirmLabel: 'Reativar'
    };
  };

  const actionCopy = getActionCopy();
  const activeCount = users.filter(entry => entry.active !== false).length;
  const inactiveCount = users.length - activeCount;

  return (
    <AdminGuard user={user}>
      <div className="min-h-screen" style={{ background: '#f2f2f2' }}>
        <div style={{ background: '#141414' }} className="px-6 lg:px-10 py-8">
          <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#E30613' }}>Administracao</p>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">Configuracoes</h1>
          <p className="text-xs mt-1" style={{ color: '#666' }}>Gerencie usuarios, funcoes e unidades</p>
        </div>

        <div className="px-6 lg:px-10 py-6">
          <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 text-xs uppercase tracking-widest">
              <span className="px-3 py-2 bg-white font-black" style={{ color: '#141414' }}>
                {users.length} usuarios
              </span>
              <span className="px-3 py-2 bg-white" style={{ color: '#666' }}>
                {activeCount} ativos
              </span>
              <span className="px-3 py-2 bg-white" style={{ color: '#666' }}>
                {inactiveCount} inativos
              </span>
            </div>

            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-2 self-start px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white transition-all"
              style={{ background: '#141414' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#222'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#141414'; }}
            >
              <UserPlus className="w-4 h-4" /> Novo Usuario
            </button>
          </div>

          <div className="bg-white overflow-hidden" style={{ borderTop: '3px solid #E30613' }}>
            <Table>
              <TableHeader>
                <TableRow style={{ background: '#fafafa' }}>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Usuario</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Perfil</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-10 text-sm" style={{ color: '#999' }}>Carregando...</TableCell></TableRow>
                ) : users.map(u => (
                  <TableRow key={u.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center text-[11px] font-black uppercase"
                          style={{ background: '#141414', color: '#fff' }}
                        >
                          {u.full_name?.[0] || u.email?.[0] || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: '#141414' }}>{u.full_name || '-'}</p>
                          <p className="text-xs truncate" style={{ color: '#666' }}>{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="space-y-1">
                        <p className="font-bold uppercase tracking-wide" style={{ color: '#141414' }}>{u.role || 'user'}</p>
                        <p style={{ color: '#666' }}>{u.unit_name || 'Sem unidade'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span
                        className="inline-flex items-center px-2 py-1 text-[10px] font-black uppercase tracking-widest"
                        style={{
                          background: u.active === false ? '#f4d7d9' : '#e8f3ea',
                          color: u.active === false ? '#8a1c24' : '#1e5b2a',
                        }}
                      >
                        {statusLabel(u)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center border transition-colors"
                            style={{ borderColor: '#ddd', color: '#141414' }}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openEditDialog(u)} className="gap-2">
                            <Pencil className="w-3.5 h-3.5" /> Editar usuario
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openPasswordDialog(u)} className="gap-2">
                            <KeyRound className="w-3.5 h-3.5" /> Alterar senha
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {u.active === false ? (
                            <DropdownMenuItem
                              onClick={() => openConfirmAction(u, 'activate')}
                              disabled={manageUserMutation.isPending}
                              className="gap-2"
                            >
                              <UserCheck className="w-3.5 h-3.5" /> Reativar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => openConfirmAction(u, 'deactivate')}
                              disabled={manageUserMutation.isPending}
                              className="gap-2"
                            >
                              <UserX className="w-3.5 h-3.5" /> Inativar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => openConfirmAction(u, 'delete')}
                            disabled={manageUserMutation.isPending}
                            className="gap-2 text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-wider text-sm">Convidar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest">Nome *</Label>
              <Input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Nome completo" style={{ borderRadius: 2 }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest">Email *</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@macom.com.br" style={{ borderRadius: 2 }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest">Funcao</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger style={{ borderRadius: 2 }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="user">Usuario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest">Senha Inicial (Opcional)</Label>
              <Input
                type="password"
                value={invitePassword}
                onChange={e => setInvitePassword(e.target.value)}
                placeholder="Minimo 8 caracteres"
                style={{ borderRadius: 2 }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setInviteOpen(false)} className="px-5 py-2.5 text-xs font-black uppercase tracking-widest border border-gray-300 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail || !inviteName.trim()}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                style={{ background: '#E30613' }}
              >
                Enviar Convite
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-wider text-sm">Editar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest">Nome *</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome completo" style={{ borderRadius: 2 }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest">Funcao</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger style={{ borderRadius: 2 }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="user">Usuario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest">Unidade</Label>
              <Select value={editUnitId} onValueChange={setEditUnitId}>
                <SelectTrigger style={{ borderRadius: 2 }}><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {units.map(un => (
                    <SelectItem key={un.id} value={un.id}>{un.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditOpen(false)} className="px-5 py-2.5 text-xs font-black uppercase tracking-widest border border-gray-300 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button
                onClick={handleSaveUserInfo}
                disabled={updateUserMutation.isPending}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                style={{ background: '#141414' }}
              >
                {updateUserMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-wider text-sm">Alterar Senha do Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs" style={{ color: '#666' }}>{selectedUser?.email || ''}</p>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest">Nova senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimo 8 caracteres"
                style={{ borderRadius: 2 }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPasswordOpen(false)} className="px-5 py-2.5 text-xs font-black uppercase tracking-widest border border-gray-300 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button
                onClick={handleUpdatePassword}
                disabled={!newPassword || updatePasswordMutation.isPending}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                style={{ background: '#141414' }}
              >
                {updatePasswordMutation.isPending ? 'Salvando...' : 'Salvar senha'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black uppercase tracking-wider text-sm">
              {actionCopy.title || 'Confirmar acao'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {actionCopy.description || 'Confirme para continuar.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} disabled={manageUserMutation.isPending}>
              {manageUserMutation.isPending ? 'Processando...' : actionCopy.confirmLabel || 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminGuard>
  );
}
