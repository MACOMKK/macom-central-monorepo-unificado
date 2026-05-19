import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';

import { dataClient } from '@/api/dataClient';
import AdminGuard from '@/components/admin/AdminGuard';
import ReportForm from '@/components/admin/ReportForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@macom/ui';

const categoryLabels = {
  gerencial: 'Gerencial',
  financeiro: 'Financeiro',
  operacional: 'Operacional',
  comercial: 'Comercial',
  rh: 'RH',
  outros: 'Outros',
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

  const handleEdit = (report) => {
    setEditingReport(report);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingReport(null);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    setDialogOpen(false);
    setEditingReport(null);
    queryClient.invalidateQueries({ queryKey: ['all-reports'] });
  };

  return (
    <AdminGuard user={user}>
      <div className="min-h-screen" style={{ background: '#f2f2f2' }}>
        <div className="px-6 py-8 lg:px-10" style={{ background: '#141414' }}>
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest" style={{ color: '#E30613' }}>
            Administracao
          </p>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">Relatorios</h1>
          <p className="mt-1 text-xs" style={{ color: '#666' }}>
            Cadastre e gerencie os relatorios Power BI
          </p>
        </div>

        <div className="px-6 py-6 lg:px-10">
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all"
              style={{ background: '#E30613' }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = '#b80010';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = '#E30613';
              }}
            >
              <Plus className="h-4 w-4" /> Novo Relatorio
            </button>
          </div>

          <div className="overflow-hidden bg-white" style={{ borderTop: '3px solid #E30613' }}>
            <Table>
              <TableHeader>
                <TableRow style={{ background: '#fafafa' }}>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Titulo</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Unidade</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Categoria</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm" style={{ color: '#999' }}>
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center">
                      <FileText className="mx-auto mb-2 h-10 w-10" style={{ color: '#ddd' }} />
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#bbb' }}>
                        Nenhum relatorio cadastrado
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id} className="transition-colors hover:bg-gray-50">
                      <TableCell className="text-sm font-bold" style={{ color: '#141414' }}>
                        {report.title}
                      </TableCell>
                      <TableCell className="text-xs" style={{ color: '#666' }}>
                        {report.unit_name || '-'}
                      </TableCell>
                      <TableCell>
                        {report.category ? (
                          <span
                            className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                            style={{ background: '#E30613', color: '#fff' }}
                          >
                            {categoryLabels[report.category] || report.category}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
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
                            onMouseEnter={(event) => {
                              event.currentTarget.style.color = '#141414';
                            }}
                            onMouseLeave={(event) => {
                              event.currentTarget.style.color = '#888';
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(report.id)}
                            className="p-2 transition-colors"
                            style={{ color: '#888' }}
                            onMouseEnter={(event) => {
                              event.currentTarget.style.color = '#E30613';
                            }}
                            onMouseLeave={(event) => {
                              event.currentTarget.style.color = '#888';
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-wider">
              {editingReport ? 'Editar Relatorio' : 'Novo Relatorio'}
            </DialogTitle>
          </DialogHeader>
          <ReportForm report={editingReport} onSaved={handleSaved} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </AdminGuard>
  );
}
