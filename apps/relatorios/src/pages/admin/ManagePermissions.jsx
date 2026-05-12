import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { dataClient } from '@/api/dataClient';
import { Plus, Trash2, Shield, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PermissionForm from '@/components/admin/PermissionForm';
import AdminGuard from '@/components/admin/AdminGuard';

export default function ManagePermissions() {
  const { user } = useOutletContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['all-permissions'],
    queryFn: () => dataClient.entities.ReportPermission.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => dataClient.entities.ReportPermission.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-permissions'] }),
  });

  const handleSaved = () => {
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['all-permissions'] });
  };

  const filtered = permissions.filter(p =>
    p.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    p.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.report_title?.toLowerCase().includes(search.toLowerCase()) ||
    p.unit_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminGuard user={user}>
      <div className="min-h-screen" style={{ background: '#f2f2f2' }}>
        <div style={{ background: '#141414' }} className="px-6 lg:px-10 py-8">
          <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#E30613' }}>Administração</p>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">Permissões</h1>
          <p className="text-xs mt-1" style={{ color: '#666' }}>Defina quem pode visualizar cada relatório</p>
        </div>

        <div className="px-6 lg:px-10 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#999' }} />
              <Input
                placeholder="Buscar por usuário ou relatório..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
                style={{ borderRadius: 2 }}
              />
            </div>
            <button
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all"
              style={{ background: '#E30613' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#b80010'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#E30613'; }}
            >
              <Plus className="w-4 h-4" /> Nova Permissão
            </button>
          </div>

          <div className="bg-white overflow-hidden" style={{ borderTop: '3px solid #E30613' }}>
            <Table>
              <TableHeader>
                <TableRow style={{ background: '#fafafa' }}>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Usuário</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Email</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Relatório</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Unidade</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-sm" style={{ color: '#999' }}>Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <Shield className="w-10 h-10 mx-auto mb-2" style={{ color: '#ddd' }} />
                      <p className="text-xs uppercase tracking-wider font-bold" style={{ color: '#bbb' }}>Nenhuma permissão cadastrada</p>
                    </TableCell>
                  </TableRow>
                ) : filtered.map(perm => (
                  <TableRow key={perm.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-bold text-sm" style={{ color: '#141414' }}>{perm.user_name || '—'}</TableCell>
                    <TableCell className="text-xs" style={{ color: '#666' }}>{perm.user_email}</TableCell>
                    <TableCell>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5" style={{ background: '#141414', color: '#fff' }}>
                        {perm.report_title || perm.report_id}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs" style={{ color: '#666' }}>{perm.unit_name || '—'}</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => deleteMutation.mutate(perm.id)}
                        className="p-2 transition-colors"
                        style={{ color: '#888' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#E30613'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#888'; }}
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
            <DialogTitle className="font-black uppercase tracking-wider text-sm">Nova Permissão</DialogTitle>
          </DialogHeader>
          <PermissionForm onSaved={handleSaved} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </AdminGuard>
  );
}
