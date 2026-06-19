import { useState } from 'react';
import { crmDataClient } from '@/api/crmDataClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, LayoutGrid, List, Search, RotateCcw } from 'lucide-react';
import LeadForm from '@/components/leads/LeadForm';
import LeadsKanban from '@/components/leads/LeadsKanban';
import { useEmpresa } from '@/context/EmpresaContext';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

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

const SLA_STYLES = {
  atrasado: 'bg-red-100 text-red-700',
  no_prazo: 'bg-blue-100 text-blue-700',
  concluido: 'bg-green-100 text-green-700',
};

const SLA_LABELS = {
  atrasado: 'Atrasado',
  no_prazo: 'No prazo',
  concluido: 'Realizado',
};

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T00:00:00`))
  : '-';

const createTempId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function Leads() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [viewMode, setViewMode] = useState('kanban');
  const [busca, setBusca] = useState('');
  const [responsavelFiltro, setResponsavelFiltro] = useState('todos');
  const [origemFiltro, setOrigemFiltro] = useState('todas');
  const [slaFiltro, setSlaFiltro] = useState('todos');
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => crmDataClient.entities.Lead.list('-created_date', 200),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => id
      ? crmDataClient.entities.Lead.update(id, data)
      : crmDataClient.entities.Lead.create(data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] });
      const previousLeads = queryClient.getQueryData(['leads']);
      const now = new Date().toISOString();
      const tempId = createTempId();
      const selectedResponsavel = responsaveis.find((item) => item.id === data.responsavel_id) || null;
      const optimisticData = {
        ...data,
        responsavel: selectedResponsavel,
        responsavel_nome: selectedResponsavel?.nome || '',
      };

      queryClient.setQueryData(['leads'], (current = []) => {
        if (id) {
          return current.map((lead) => (
            lead.id === id
              ? { ...lead, ...optimisticData, updated_date: now }
              : lead
          ));
        }

        return [
          {
            id: tempId,
            created_date: now,
            updated_date: now,
            status: 'novo',
            origem: 'site',
            empresa: 'Macom Ananindeua',
            ...optimisticData,
          },
          ...current,
        ];
      });

      setFormOpen(false);
      setEditing(null);
      return { previousLeads, tempId, id };
    },
    onSuccess: (saved, variables, context) => {
      const selectedResponsavel = responsaveis.find((item) => item.id === variables.data.responsavel_id) || null;
      const hydratedSaved = saved
        ? {
            ...saved,
            responsavel: selectedResponsavel || saved.responsavel,
            responsavel_nome: selectedResponsavel?.nome || saved.responsavel_nome || '',
          }
        : saved;
      queryClient.setQueryData(['leads'], (current = []) => {
        if (!hydratedSaved) return current;
        if (context?.tempId) {
          return current.map((lead) => lead.id === context.tempId ? hydratedSaved : lead);
        }
        return current.map((lead) => lead.id === hydratedSaved.id ? hydratedSaved : lead);
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['historico-atendimento'] });
      toast({
        title: context?.id ? 'Lead atualizado' : 'Lead criado',
        description: context?.id
          ? 'As informacoes do lead foram salvas.'
          : 'O lead foi cadastrado na central.',
        variant: 'success',
      });
    },
    onError: (error, _data, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads'], context.previousLeads);
      }
      toast({
        title: 'Nao foi possivel salvar o lead',
        description: error.message || 'Revise os dados informados.',
        variant: 'destructive',
      });
    },
  });

  const { data: responsaveis = [] } = useQuery({
    queryKey: ['crm-responsaveis'],
    queryFn: () => crmDataClient.entities.Responsavel.list(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => crmDataClient.entities.Lead.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] });
      const previousLeads = queryClient.getQueryData(['leads']);

      queryClient.setQueryData(['leads'], (current = []) =>
        current.map((lead) => lead.id === id ? { ...lead, status } : lead)
      );

      return { previousLeads };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['historico-atendimento'] });
    },
    onError: (error, _variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads'], context.previousLeads);
      }

      toast({
        title: 'Nao foi possivel atualizar o lead',
        description: error.message || 'Revise os dados informados.',
        variant: 'destructive',
      });
    },
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

  const termoBusca = busca.trim().toLowerCase();
  const filtrados = leads.filter((lead) => {
    const matchBusca = !termoBusca || [
      lead.nome,
      lead.telefone,
      lead.email,
      lead.modelo_interesse,
      lead.responsavel_nome,
    ].some((value) => String(value || '').toLowerCase().includes(termoBusca));
    const matchResponsavel = responsavelFiltro === 'todos'
      || (responsavelFiltro === 'sem_responsavel' && !lead.responsavel_id)
      || lead.responsavel_id === responsavelFiltro;

    return (
      (empresa === 'Todas' || lead.empresa === empresa)
      && (statusFiltro === 'todos' || lead.status === statusFiltro)
      && (origemFiltro === 'todas' || lead.origem === origemFiltro)
      && (slaFiltro === 'todos' || lead.sla_status === slaFiltro)
      && matchResponsavel
      && matchBusca
    );
  });

  const clearFilters = () => {
    setBusca('');
    setResponsavelFiltro('todos');
    setOrigemFiltro('todas');
    setSlaFiltro('todos');
    setStatusFiltro('todos');
  };

  const counts = leads.reduce((acc, l) => ({ ...acc, [l.status]: (acc[l.status] || 0) + 1 }), {});

  const STATUS_TABS = ['todos', 'novo', 'em_atendimento', 'convertido', 'perdido'];

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest">Central de Leads</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">Funil comercial de captacao e conversao</p>
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

      <div className="mb-4 flex flex-wrap items-center gap-2 border border-border bg-white p-3 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar nome, telefone, e-mail ou veiculo..."
            className="h-9 rounded-none pl-9 text-sm"
          />
        </div>
        <Select value={responsavelFiltro} onValueChange={setResponsavelFiltro}>
          <SelectTrigger className="h-9 w-48 rounded-none text-xs"><SelectValue placeholder="Responsavel" /></SelectTrigger>
          <SelectContent className="rounded-none">
            <SelectItem value="todos">Todos os responsaveis</SelectItem>
            <SelectItem value="sem_responsavel">Sem responsavel</SelectItem>
            {responsaveis.map((responsavel) => (
              <SelectItem key={responsavel.id} value={responsavel.id}>{responsavel.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={origemFiltro} onValueChange={setOrigemFiltro}>
          <SelectTrigger className="h-9 w-40 rounded-none text-xs"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent className="rounded-none">
            <SelectItem value="todas">Todas as origens</SelectItem>
            <SelectItem value="telefone">Telefone</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="site">Site</SelectItem>
            <SelectItem value="showroom">Showroom</SelectItem>
            <SelectItem value="indicacao">Indicacao</SelectItem>
          </SelectContent>
        </Select>
        <Select value={slaFiltro} onValueChange={setSlaFiltro}>
          <SelectTrigger className="h-9 w-40 rounded-none text-xs"><SelectValue placeholder="SLA" /></SelectTrigger>
          <SelectContent className="rounded-none">
            <SelectItem value="todos">Todos os SLAs</SelectItem>
            <SelectItem value="atrasado">SLA atrasado</SelectItem>
            <SelectItem value="no_prazo">SLA no prazo</SelectItem>
            <SelectItem value="concluido">Contato realizado</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="icon" onClick={clearFilters} title="Limpar filtros" className="h-9 w-9 rounded-none">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
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
                  <TableHead className="text-white text-[10px] font-bold uppercase tracking-widest">Responsavel</TableHead>
                  <TableHead className="text-white text-[10px] font-bold uppercase tracking-widest">SLA</TableHead>
                  <TableHead className="text-white text-[10px] font-bold uppercase tracking-widest">Previsao</TableHead>
                  <TableHead className="text-white text-[10px] font-bold uppercase tracking-widest">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground py-10">
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
                    <TableCell className="text-xs font-semibold">{lead.responsavel_nome || 'Automatico'}</TableCell>
                    <TableCell>
                      <span className={cn('px-2 py-1 text-[10px] font-bold uppercase tracking-wider', SLA_STYLES[lead.sla_status])}>
                        {SLA_LABELS[lead.sla_status] || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(lead.previsao_fechamento)}</TableCell>
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
        <LeadForm
          key={editing?.id || 'new'}
          open={formOpen}
          onOpenChange={setFormOpen}
          lead={editing}
          responsaveis={responsaveis}
          onSave={(data) => saveMutation.mutate({ id: editing?.id || null, data })}
        />
      )}
    </div>
  );
}
