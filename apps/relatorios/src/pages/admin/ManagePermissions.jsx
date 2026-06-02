import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { dataClient } from '@/api/dataClient';
import { Plus, Trash2, Shield, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@macom/ui';
import PermissionForm from '@/components/admin/PermissionForm';
import AdminGuard from '@/components/admin/AdminGuard';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';

function upsertPermissions(permissions, nextPermissions) {
  const items = Array.isArray(nextPermissions)
    ? nextPermissions.filter((permission) => permission?.id)
    : [nextPermissions].filter((permission) => permission?.id);

  if (!items.length) return permissions;

  const itemsById = new Map(items.map((permission) => [permission.id, permission]));
  const updated = permissions.map((permission) => (
    itemsById.has(permission.id) ? { ...permission, ...itemsById.get(permission.id) } : permission
  ));
  const existingIds = new Set(updated.map((permission) => permission.id));
  const created = items.filter((permission) => !existingIds.has(permission.id));

  return [...created, ...updated];
}

export default function ManagePermissions() {
  const { user } = useOutletContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [permissionToDelete, setPermissionToDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['all-permissions'],
    queryFn: () => dataClient.entities.ReportPermission.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => dataClient.entities.ReportPermission.delete(id),
    onMutate: async (id) => {
      const queryKey = ['all-permissions'];
      await queryClient.cancelQueries({ queryKey });
      const previousPermissions = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old = []) => (
        Array.isArray(old) ? old.filter((permission) => permission.id !== id) : old
      ));

      return { previousPermissions, queryKey };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(context?.queryKey || ['all-permissions'], context?.previousPermissions);
    },
  });

  const handleSaved = (createdPermissions) => {
    queryClient.setQueryData(['all-permissions'], (old = []) => (
      Array.isArray(old) ? upsertPermissions(old, createdPermissions) : old
    ));
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['all-permissions'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  };

  const handleConfirmDelete = () => {
    if (!permissionToDelete) return;
    deleteMutation.mutate(permissionToDelete.id);
    setPermissionToDelete(null);
  };

  const filtered = permissions.filter((permission) =>
    permission.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    permission.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    permission.report_title?.toLowerCase().includes(search.toLowerCase()) ||
    permission.unit_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminGuard user={user}>
      <div className="min-h-screen" style={{ background: '#f2f2f2' }}>
        <div style={{ background: '#141414' }} className="px-6 lg:px-10 py-8">
          <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#E30613' }}>Administração</p>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">Permissões</h1>
          <p className="text-xs mt-1" style={{ color: '#666' }}>Defina quem pode visualizar cada relatorio</p>
        </div>

        <div className="px-6 lg:px-10 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#999' }} />
              <Input
                placeholder="Buscar por usuario ou relatorio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                style={{ borderRadius: 2 }}
              />
            </div>
            <button
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all"
              style={{ background: '#E30613' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#b80010'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#E30613'; }}
            >
              <Plus className="w-4 h-4" /> Nova Permissao
            </button>
          </div>

          <div className="bg-white overflow-hidden" style={{ borderTop: '3px solid #E30613' }}>
            <Table>
              <TableHeader>
                <TableRow style={{ background: '#fafafa' }}>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Usuario</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Email</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Relatorio</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Unidade</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-sm" style={{ color: '#999' }}>Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <Shield className="w-10 h-10 mx-auto mb-2" style={{ color: '#ddd' }} />
                      <p className="text-xs uppercase tracking-wider font-bold" style={{ color: '#bbb' }}>Nenhuma permissao cadastrada</p>
                    </TableCell>
                  </TableRow>
                ) : filtered.map((permission) => (
                  <TableRow key={permission.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-bold text-sm" style={{ color: '#141414' }}>{permission.user_name || '—'}</TableCell>
                    <TableCell className="text-xs" style={{ color: '#666' }}>{permission.user_email || '—'}</TableCell>
                    <TableCell>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5" style={{ background: '#141414', color: '#fff' }}>
                        {permission.report_title || permission.report_id}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs" style={{ color: '#666' }}>{permission.unit_name || '—'}</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => setPermissionToDelete(permission)}
                        className="p-2 transition-colors"
                        style={{ color: '#888' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#E30613'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-wider text-sm">Nova Permissao</DialogTitle>
          </DialogHeader>
          <PermissionForm onSaved={handleSaved} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(permissionToDelete)}
        onOpenChange={(open) => !open && setPermissionToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir permissao"
        description={
          permissionToDelete
            ? `Essa acao nao pode ser desfeita. Deseja excluir a permissao de ${permissionToDelete.user_name || permissionToDelete.user_email || 'este usuario'} para ${permissionToDelete.report_title || 'este relatorio'}?`
            : 'Essa acao nao pode ser desfeita.'
        }
        isLoading={deleteMutation.isPending}
      />
    </AdminGuard>
  );
}
