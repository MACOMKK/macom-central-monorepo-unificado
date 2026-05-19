import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Save, Loader2, UserCog, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from '@macom/ui';
import { usePermissions } from '@/lib/usePermissions';
import { toast } from 'sonner';

const MODULES = [
  { key: 'avisos', label: 'Mural de Avisos' },
  { key: 'links', label: 'Links Uteis' },
  { key: 'colaboradores', label: 'Colaboradores' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'calendario', label: 'Calendario' },
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

function PermissionRow({ user, existingPerm, onSave, onDelete, isSaving }) {
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
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{user.full_name || user.email}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Badge className="bg-primary/10 text-primary">Admin - acesso total</Badge>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-medium text-sm">{user.full_name || user.email}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive h-8 w-8 p-0"
            onClick={() => onDelete(user.email, existingPerm?.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Salvar
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MODULES.map((mod) => (
          <div key={mod.key} className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg">
            <span className="text-xs font-medium">{mod.label}</span>
            <Select
              value={modules[mod.key] || 'view'}
              onValueChange={(value) => setModules((prev) => ({ ...prev, [mod.key]: value }))}
            >
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem acesso</SelectItem>
                <SelectItem value="view">Visualizar</SelectItem>
                <SelectItem value="edit">Editar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Permissions() {
  const { isLoading: permLoading, role } = usePermissions(null);
  const queryClient = useQueryClient();
  const [savingUser, setSavingUser] = useState(null);
  const [newEmail, setNewEmail] = useState('');

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => appClient.entities.User.list('full_name', 500),
  });

  const { data: perms = [], isLoading: permsLoading } = useQuery({
    queryKey: ['user-permissions'],
    queryFn: () => appClient.entities.UserPermission.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const latestPerms = await appClient.entities.UserPermission.list();
      const existing = latestPerms.find((item) => item.user_email === data.user_email);
      if (existing) return appClient.entities.UserPermission.update(existing.id, data);
      return appClient.entities.UserPermission.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('Permissoes salvas!');
      setSavingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ permId }) => {
      if (permId) await appClient.entities.UserPermission.delete(permId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('Permissao removida!');
    },
  });

  const handleSave = (data) => {
    setSavingUser(data.user_email);
    saveMutation.mutate(data);
  };

  const handleDelete = (_email, permId) => {
    deleteMutation.mutate({ permId });
  };

  const handleAddEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    const existingUser = users.find((user) => user.email === email);
    const alreadyInPerms = perms.some((perm) => perm.user_email === email);

    if (!existingUser) {
      toast.error('Nao existe colaborador com esse e-mail no banco atual.');
      return;
    }

    if (alreadyInPerms) {
      toast.info('Usuario ja esta na lista.');
      setNewEmail('');
      return;
    }

    saveMutation.mutate({
      collaborator_id: existingUser.id,
      user_email: existingUser.email,
      modules: DEFAULT_MODULES,
    });
    setNewEmail('');
  };

  const isLoading = permLoading || usersLoading || permsLoading;

  if (!permLoading && role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <Shield className="w-12 h-12 mb-3 opacity-30" />
        <p>Apenas administradores podem acessar esta pagina.</p>
      </div>
    );
  }

  const userRows = [...users];
  const extraPerms = perms.filter((perm) => !users.some((user) => user.email === perm.user_email));
  const extraRows = extraPerms.map((perm) => ({
    id: perm.collaborator_id || perm.id,
    email: perm.user_email,
    full_name: perm.full_name,
    role: 'user',
  }));
  const allRows = [...userRows, ...extraRows];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <UserCog className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Permissoes de Acesso</h1>
          <p className="text-sm text-muted-foreground">Configure o acesso por modulo para cada usuario</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Adicionar permissao por e-mail..."
          value={newEmail}
          onChange={(event) => setNewEmail(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleAddEmail()}
          className="max-w-sm"
        />
        <Button onClick={handleAddEmail} className="gap-2">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-40 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-4">
          {allRows.map((user) => (
            <PermissionRow
              key={user.email}
              user={user}
              existingPerm={perms.find((perm) => perm.user_email === user.email)}
              onSave={handleSave}
              onDelete={handleDelete}
              isSaving={savingUser === user.email}
            />
          ))}
        </div>
      )}
    </div>
  );
}

