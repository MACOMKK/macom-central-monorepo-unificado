import { useState } from 'react';
import { localCrmDb } from '@/api/localCrmDb';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, LayoutGrid, List } from 'lucide-react';
import LeadForm from '@/components/leads/LeadForm';
import LeadsKanban from '@/components/leads/LeadsKanban';
import { useEmpresa } from '@/context/EmpresaContext';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  novo: 'bg-blue-600 text-white',
  em_atendimento: 'bg-amber-500 text-white',
  convertido: 'bg-green-600 text-white',
  perdido: 'bg-red-600 text-white',
};

const STATUS_LABEL = {
  novo: 'Novo',
  em_atendimento: 'Em Atendimento',
  convertido: 'Convertido',
  perdido: 'Perdido',
};

export default function Leads() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [viewMode, setViewMode] = useState('kanban');
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => localCrmDb.entities.Lead.list('-created_date', 200),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? localCrmDb.entities.Lead.update(editing.id, data)
      : localCrmDb.entities.Lead.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setFormOpen(false);
      setEditing(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => localCrmDb.entities.Lead.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const novoStatus = destination.droppableId;
    const lead = leads.find((l) => l.id === draggableId);
    if (lead && lead.status !== novoStatus) {
      updateStatusMutation.mutate({ id: draggableId, status: novoStatus });
    }
  };

  const filtrados = leads.filter((l) =>
    (empresa === 'Todas' || l.empresa === empresa) &&
    (statusFiltro === 'todos' || l.status === statusFiltro)
  );

  const counts = leads.reduce((acc, l) => ({ ...acc, [l.status]: (acc[l.status] || 0) + 1 }), {});

  const STATUS_TABS = ['todos', 'novo', 'em_atendimento', 'convertido', 'perdido'];

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest">Central de Leads</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">Gestão de oportunidades</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border border-border bg-white">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn('p-2 transition-colors', viewMode === 'kanban' ? 'bg-[#1a1a1a] text-white' : 'text-muted-foreground hover:text-foreground')}
              title="Kanban"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn('p-2 transition-colors', viewMode === 'table' ? 'bg-[#1a1a1a] text-white' : 'text-muted-foreground hover:text-foreground')}
              title="Tabela"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <Button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="h-9 text-xs font-bold uppercase tracking-widest rounded-none px-5 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Lead
          </Button>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <LeadsKanban
          leads={filtrados}
          onDragEnd={handleDragEnd}
          onCardClick={(lead) => { setEditing(lead); setFormOpen(true); }}
        />
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <>
          <div className="flex gap-0 border-b border-border bg-white shadow-sm mb-4 overflow-x-auto">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFiltro(s)}
                className={cn(
                  'px-4 py-2.5 text-xs font-bold uppercase tracking-widest whitespace-nowrap border-b-2 -mb-px transition-all',
                  statusFiltro === s ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
                <span className={cn('ml-1.5 text-[10px] px-1.5 py-0.5 rounded-sm font-semibold', statusFiltro === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>
                  {s === 'todos' ? leads.length : (counts[s] || 0)}
                </span>
              </button>
            ))}
          </div>
          <div className="bg-white shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1a1a1a] hover:bg-[#1a1a1a]">
                  <TableHead className="text-white text-[10px] font-bold uppercase tracking-widest">Nome</TableHead>
                  <TableHead className="text-white text-[10px] font-bold uppercase tracking-widest">Telefone</TableHead>
                  <TableHead className="text-white text-[10px] font-bold uppercase tracking-widest">Origem</TableHead>
                  <TableHead className="text-white text-[10px] font-bold uppercase tracking-widest">Modelo</TableHead>
                  <TableHead className="text-white text-[10px] font-bold uppercase tracking-widest">Empresa</TableHead>
                  <TableHead className="text-white text-[10px] font-bold uppercase tracking-widest">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground py-10">
                      Nenhum lead encontrado
                    </TableCell>
                  </TableRow>
                ) : filtrados.map((lead, i) => (
                  <TableRow
                    key={lead.id}
                    className={cn('cursor-pointer hover:bg-red-50 transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-[#f9f9f9]')}
                    onClick={() => { setEditing(lead); setFormOpen(true); }}
                  >
                    <TableCell className="font-bold text-sm">{lead.nome}</TableCell>
                    <TableCell className="text-sm">{lead.telefone}</TableCell>
                    <TableCell className="text-xs font-semibold uppercase">{lead.origem}</TableCell>
                    <TableCell className="text-sm">{lead.modelo_interesse}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{lead.empresa}</TableCell>
                    <TableCell>
                      <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm', STATUS_STYLES[lead.status])}>
                        {STATUS_LABEL[lead.status]}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {formOpen && (
        <LeadForm key={editing?.id || 'new'} open={formOpen} onOpenChange={setFormOpen} lead={editing} onSave={(d) => saveMutation.mutate(d)} />
      )}
    </div>
  );
}