import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { dataClient } from '@/api/dataClient';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReportForm from '@/components/admin/ReportForm';
import AdminGuard from '@/components/admin/AdminGuard';

const categoryLabels = {
  gerencial: 'Gerencial', financeiro: 'Financeiro', operacional: 'Operacional',
  comercial: 'Comercial', rh: 'RH', outros: 'Outros',
};

export default function ManageReports() {
  const { user } = useOutletContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['all-reports'],
    queryFn: () => dataClient.entities.Report.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => dataClient.entities.Report.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-reports'] }),
  });

  const handleEdit = (report) => { setEditingReport(report); setDialogOpen(true); };
  const handleCreate = () => { setEditingReport(null); setDialogOpen(true); };
  const handleSaved = () => {
    setDialogOpen(false);
    setEditingReport(null);
    queryClient.invalidateQueries({ queryKey: ['all-reports'] });
  };

  return (
    <AdminGuard user={user}>
      <div className="min-h-screen" style={{ background: '#f2f2f2' }}>
        {/* Page Header */}
        <div style={{ background: '#141414' }} className="px-6 lg:px-10 py-8">
          <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#E30613' }}>Administração</p>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">Relatórios</h1>
          <p className="text-xs mt-1" style={{ color: '#666' }}>Cadastre e gerencie os relatórios Power BI</p>
        </div>

        <div className="px-6 lg:px-10 py-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all"
              style={{ background: '#E30613' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#b80010'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#E30613'; }}
            >
              <Plus className="w-4 h-4" /> Novo Relatório
            </button>
          </div>

          <div className="bg-white overflow-hidden" style={{ borderTop: '3px solid #E30613' }}>
            <Table>
              <TableHeader>
                <TableRow style={{ background: '#fafafa' }}>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Título</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Unidade</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Categoria</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-sm" style={{ color: '#999' }}>Carregando...</TableCell>
                  </TableRow>
                ) : reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <FileText className="w-10 h-10 mx-auto mb-2" style={{ color: '#ddd' }} />
                      <p className="text-xs uppercase tracking-wider font-bold" style={{ color: '#bbb' }}>Nenhum relatório cadastrado</p>
                    </TableCell>
                  </TableRow>
                ) : reports.map(report => (
                  <TableRow key={report.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-bold text-sm" style={{ color: '#141414' }}>{report.title}</TableCell>
                    <TableCell className="text-xs" style={{ color: '#666' }}>{report.unit_name || '—'}</TableCell>
                    <TableCell>
                      {report.category ? (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5" style={{ background: '#E30613', color: '#fff' }}>
                          {categoryLabels[report.category] || report.category}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5"
                        style={{
                          background: report.active !== false ? '#141414' : '#eee',
                          color: report.active !== false ? '#fff' : '#999',
                        }}
                      >
                        {report.active !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEdit(report)}
                          className="p-2 transition-colors"
                          style={{ color: '#888' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#141414'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#888'; }}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(report.id)}
                          className="p-2 transition-colors"
                          style={{ color: '#888' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#E30613'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#888'; }}
                        >
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-wider text-sm">
              {editingReport ? 'Editar Relatório' : 'Novo Relatório'}
            </DialogTitle>
          </DialogHeader>
          <ReportForm report={editingReport} onSaved={handleSaved} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </AdminGuard>
  );
}

