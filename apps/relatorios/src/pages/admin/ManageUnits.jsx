import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { dataClient } from '@/api/dataClient';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AdminGuard from '@/components/admin/AdminGuard';

export default function ManageUnits() {
  const { user } = useOutletContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', active: true });
  const queryClient = useQueryClient();

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['all-units'],
    queryFn: () => dataClient.entities.Unit.list('-created_date'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing ? dataClient.entities.Unit.update(editing.id, data) : dataClient.entities.Unit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-units'] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => dataClient.entities.Unit.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-units'] }),
  });

  const handleEdit = (unit) => {
    setEditing(unit);
    setForm({ name: unit.name, code: unit.code || '', active: unit.active !== false });
    setDialogOpen(true);
  };

  return (
    <AdminGuard user={user}>
      <div className="min-h-screen" style={{ background: '#f2f2f2' }}>
        <div style={{ background: '#141414' }} className="px-6 lg:px-10 py-8">
          <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#E30613' }}>Administração</p>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">Unidades</h1>
          <p className="text-xs mt-1" style={{ color: '#666' }}>Cadastre as unidades MACOM</p>
        </div>

        <div className="px-6 lg:px-10 py-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => { setEditing(null); setForm({ name: '', code: '', active: true }); setDialogOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all"
              style={{ background: '#E30613' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#b80010'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#E30613'; }}
            >
              <Plus className="w-4 h-4" /> Nova Unidade
            </button>
          </div>

          <div className="bg-white overflow-hidden" style={{ borderTop: '3px solid #E30613' }}>
            <Table>
              <TableHeader>
                <TableRow style={{ background: '#fafafa' }}>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Nome</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Código</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-10 text-sm" style={{ color: '#999' }}>Carregando...</TableCell></TableRow>
                ) : units.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16">
                      <Building2 className="w-10 h-10 mx-auto mb-2" style={{ color: '#ddd' }} />
                      <p className="text-xs uppercase tracking-wider font-bold" style={{ color: '#bbb' }}>Nenhuma unidade cadastrada</p>
                    </TableCell>
                  </TableRow>
                ) : units.map(unit => (
                  <TableRow key={unit.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-bold text-sm" style={{ color: '#141414' }}>{unit.name}</TableCell>
                    <TableCell className="text-xs font-mono font-bold" style={{ color: '#E30613' }}>{unit.code || '—'}</TableCell>
                    <TableCell>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5"
                        style={{ background: unit.active !== false ? '#141414' : '#eee', color: unit.active !== false ? '#fff' : '#999' }}>
                        {unit.active !== false ? 'Ativa' : 'Inativa'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEdit(unit)} className="p-2 transition-colors" style={{ color: '#888' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#141414'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#888'; }}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteMutation.mutate(unit.id)} className="p-2 transition-colors" style={{ color: '#888' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#E30613'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#888'; }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-wider text-sm">
              {editing ? 'Editar Unidade' : 'Nova Unidade'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest">Nome *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={{ borderRadius: 2 }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest">Código</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Ex: BEL, SP" style={{ borderRadius: 2 }} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <Label className="text-xs font-semibold">Unidade ativa</Label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setDialogOpen(false)} className="px-5 py-2.5 text-xs font-black uppercase tracking-widest border border-gray-300 transition-colors hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={saveMutation.isPending} className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white" style={{ background: '#E30613' }}>
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminGuard>
  );
}
