import { useEffect, useMemo, useState } from 'react';
import { crmDataClient } from '@/api/crmDataClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlarmClock, Plus, Search } from 'lucide-react';
import StatusTabs from '@/components/eventos/StatusTabs';
import EventoCard from '@/components/eventos/EventoCard';
import EventoForm from '@/components/eventos/EventoForm';
import { useEmpresa } from '@/context/EmpresaContext';
import { isToday, isBefore, startOfToday } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const createTempId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const toLocalDate = (value) => {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateOnly = (date) => date.toISOString().slice(0, 10);

const getAgendaScopeDates = (scope) => {
  const today = startOfToday();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (scope === 'atrasados') return { proximo_to: formatDateOnly(yesterday) };
  if (scope === 'hoje') return { proximo_from: formatDateOnly(today), proximo_to: formatDateOnly(today) };
  if (scope === 'futuros') return { proximo_from: formatDateOnly(tomorrow) };
  return {};
};

export default function Eventos() {
  const [statusTab, setStatusTab] = useState('planejada');
  const [busca, setBusca] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [responsavelFiltro, setResponsavelFiltro] = useState('todos');
  const [agendaFiltro, setAgendaFiltro] = useState('todos');
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 30;

  const baseFilters = useMemo(() => ({
    ...(empresa !== 'Todas' ? { empresa } : {}),
  }), [empresa]);
  const resumoFilters = useMemo(() => ({
    ...baseFilters,
    ...(responsavelFiltro !== 'todos' ? { responsavel_id: responsavelFiltro } : {}),
    ...(periodoInicio ? { proximo_from: periodoInicio } : {}),
    ...(periodoFim ? { proximo_to: periodoFim } : {}),
  }), [baseFilters, periodoFim, periodoInicio, responsavelFiltro]);
  const agendaScopeFilters = useMemo(() => (
    agendaFiltro === 'todos' ? {} : getAgendaScopeDates(agendaFiltro)
  ), [agendaFiltro]);
  const eventosFilters = useMemo(() => ({
    ...resumoFilters,
    ...agendaScopeFilters,
    status: statusTab,
  }), [agendaScopeFilters, resumoFilters, statusTab]);
  const eventosQueryKey = ['eventos', { filters: eventosFilters, busca, page, pageSize }];

  useEffect(() => {
    setPage(1);
  }, [agendaFiltro, busca, empresa, periodoFim, periodoInicio, responsavelFiltro, statusTab]);

  const { data: eventosPage = { rows: [], count: 0, page: 1, pageSize }, isFetching } = useQuery({
    queryKey: eventosQueryKey,
    queryFn: () => crmDataClient.entities.Atividade.listPage({
      orderBy: '-updated_date',
      page,
      limit: pageSize,
      filters: eventosFilters,
      search: busca,
    }),
  });
  const eventos = eventosPage.rows;
  const totalPages = Math.max(1, Math.ceil((eventosPage.count || 0) / pageSize));

  const { data: eventosResumo = [] } = useQuery({
    queryKey: ['eventos-resumo', { filters: resumoFilters, busca }],
    queryFn: () => crmDataClient.entities.Atividade.listPage({
      orderBy: '-updated_date',
      limit: 1000,
      filters: resumoFilters,
      search: busca,
    }).then((result) => result.rows),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => crmDataClient.entities.Lead.list('-updated_date', 500),
  });

  const { data: responsaveis = [] } = useQuery({
    queryKey: ['crm-responsaveis'],
    queryFn: () => crmDataClient.entities.Responsavel.list(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['eventos'] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['clientes'] });
    queryClient.invalidateQueries({ queryKey: ['historico-atendimento'] });
    setFormOpen(false);
    setEditing(null);
  };

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => id
      ? crmDataClient.entities.Atividade.update(id, data)
      : crmDataClient.entities.Atividade.create(data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['eventos'] });
      await queryClient.cancelQueries({ queryKey: ['leads'] });

      const previousEventos = queryClient.getQueryData(eventosQueryKey);
      const previousLeads = queryClient.getQueryData(['leads']);
      const now = new Date().toISOString();
      const tempId = id ? null : createTempId();
      const linkedLead = leads.find((lead) => lead.id === data.lead_id);

      queryClient.setQueryData(eventosQueryKey, (currentPage = eventosPage) => {
        const current = currentPage.rows || [];
        const nextRows = id
          ? current.map((evento) => (
              evento.id === id
                ? { ...evento, ...data, updated_date: now }
                : evento
            ))
          : [
              {
                id: tempId,
                created_date: now,
                updated_date: now,
                cliente_id: linkedLead?.cliente_id || data.cliente_id || '',
                cliente_nome: linkedLead?.nome || data.cliente_nome || '',
                telefone: linkedLead?.telefone || data.telefone || '',
                telefone_normalizado: linkedLead?.telefone_normalizado || data.telefone_normalizado || '',
                origem: linkedLead?.origem || data.origem || '',
                empresa: linkedLead?.empresa || data.empresa || 'Macom Ananindeua',
                modelo_interesse: linkedLead?.modelo_interesse || data.modelo_interesse || '',
                status: 'planejada',
                tipo_evento: 'ligacao',
                temperatura: 'morno',
                ...data,
              },
              ...current,
            ];
        return {
          ...currentPage,
          rows: nextRows,
          count: id ? currentPage.count : (currentPage.count || 0) + 1,
        };
      });

      if (data.status === 'concluida' && data.resultado === 'venda_realizada') {
        queryClient.setQueryData(['leads'], (current = []) =>
          current.map((lead) => lead.id === data.lead_id ? { ...lead, status: 'convertido' } : lead)
        );
      } else if (data.status === 'concluida' && data.resultado === 'lead_perdido') {
        queryClient.setQueryData(['leads'], (current = []) =>
          current.map((lead) => lead.id === data.lead_id
            ? { ...lead, status: 'perdido', motivo_perda: data.motivo_resultado || '' }
            : lead)
        );
      }

      setFormOpen(false);
      setEditing(null);
      return { previousEventos, previousLeads, tempId, id };
    },
    onSuccess: (saved, _data, context) => {
      queryClient.setQueryData(eventosQueryKey, (currentPage = eventosPage) => {
        const current = currentPage.rows || [];
        if (!saved) return currentPage;
        const rows = context?.tempId
          ? current.map((evento) => evento.id === context.tempId ? saved : evento)
          : current.map((evento) => evento.id === saved.id ? saved : evento);
        return { ...currentPage, rows };
      });
      invalidate();
    },
    onError: (error, _data, context) => {
      if (context?.previousEventos) {
        queryClient.setQueryData(eventosQueryKey, context.previousEventos);
      }
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads'], context.previousLeads);
      }
      toast({
        title: 'Nao foi possivel salvar a atividade',
        description: error.message || 'Revise os dados informados.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => crmDataClient.entities.Atividade.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['eventos'] });
      const previousEventos = queryClient.getQueryData(eventosQueryKey);
      queryClient.setQueryData(eventosQueryKey, (currentPage = eventosPage) => ({
        ...currentPage,
        rows: (currentPage.rows || []).filter((evento) => evento.id !== id),
        count: Math.max(0, (currentPage.count || 0) - 1),
      }));
      setFormOpen(false);
      setEditing(null);
      return { previousEventos };
    },
    onSuccess: invalidate,
    onError: (error, _id, context) => {
      if (context?.previousEventos) {
        queryClient.setQueryData(eventosQueryKey, context.previousEventos);
      }
      toast({
        title: 'Nao foi possivel excluir a atividade',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const porEmpresa = eventosResumo;
  const leadsDaEmpresa = leads.filter((lead) => empresa === 'Todas' || lead.empresa === empresa);
  const counts = porEmpresa.reduce((acc, e) => ({ ...acc, [e.status]: (acc[e.status] || 0) + 1 }), {});

  const filtrados = eventos;

  const hoje = startOfToday();
  const pendentes = porEmpresa
    .filter((e) => e.status === 'planejada')
    .map((evento) => ({ evento, data: toLocalDate(evento.proximo_contato) }))
    .filter((item) => item.data);
  const painelCounts = {
    atrasados: pendentes.filter(({ data }) => isBefore(data, hoje)).length,
    hoje: pendentes.filter(({ data }) => isToday(data)).length,
    futuros: pendentes.filter(({ data }) => !isBefore(data, hoje) && !isToday(data)).length,
  };
  const selectAgendaFiltro = (scope) => {
    setAgendaFiltro((current) => current === scope ? 'todos' : scope);
    setStatusTab('planejada');
    setPeriodoInicio('');
    setPeriodoFim('');
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest">Agenda de Atividades</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">Contatos, tarefas e proximas acoes dos leads</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-9 w-52 bg-white text-sm rounded-none border-border"
            />
          </div>
          <Input
            type="date"
            value={periodoInicio}
            onChange={(event) => {
              setAgendaFiltro('todos');
              setPeriodoInicio(event.target.value);
            }}
            className="h-9 w-40 rounded-none bg-white text-xs"
            title="Inicio do periodo de proximo contato"
          />
          <Input
            type="date"
            value={periodoFim}
            onChange={(event) => {
              setAgendaFiltro('todos');
              setPeriodoFim(event.target.value);
            }}
            className="h-9 w-40 rounded-none bg-white text-xs"
            title="Fim do periodo de proximo contato"
          />
          <Select value={responsavelFiltro} onValueChange={setResponsavelFiltro}>
            <SelectTrigger className="h-9 w-52 rounded-none bg-white text-xs">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="todos">Todos os vendedores</SelectItem>
              {responsaveis.map((responsavel) => (
                <SelectItem key={responsavel.id} value={responsavel.id}>
                  {responsavel.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="h-9 text-xs font-bold uppercase tracking-widest rounded-none px-5 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova Atividade
          </Button>
        </div>
      </div>

      <div className="mb-3 grid gap-2 md:grid-cols-3">
        <button
          type="button"
          onClick={() => selectAgendaFiltro('atrasados')}
          className={cn(
            'flex items-center gap-3 bg-white px-4 py-3 text-left shadow-sm transition-colors',
            agendaFiltro === 'atrasados' ? 'ring-2 ring-red-500' : 'hover:bg-red-50'
          )}
        >
          <AlarmClock className="h-4 w-4 text-red-600" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Atrasados</p>
            <p className="text-lg font-black text-red-600">{painelCounts.atrasados}</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => selectAgendaFiltro('hoje')}
          className={cn(
            'flex items-center gap-3 bg-white px-4 py-3 text-left shadow-sm transition-colors',
            agendaFiltro === 'hoje' ? 'ring-2 ring-amber-500' : 'hover:bg-amber-50'
          )}
        >
          <AlarmClock className="h-4 w-4 text-amber-500" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hoje</p>
            <p className="text-lg font-black text-amber-500">{painelCounts.hoje}</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => selectAgendaFiltro('futuros')}
          className={cn(
            'flex items-center gap-3 bg-white px-4 py-3 text-left shadow-sm transition-colors',
            agendaFiltro === 'futuros' ? 'ring-2 ring-green-600' : 'hover:bg-green-50'
          )}
        >
          <AlarmClock className="h-4 w-4 text-green-600" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Futuros</p>
            <p className="text-lg font-black text-green-600">{painelCounts.futuros}</p>
          </div>
        </button>
      </div>

      <div className="min-w-0">
        <StatusTabs value={statusTab} onChange={setStatusTab} counts={counts} />
        <div className="mt-3 space-y-2">
          {filtrados.length === 0 ? (
            <div className="bg-white py-12 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nenhuma atividade encontrada</p>
            </div>
          ) : (
            filtrados.map((evento) => (
              <EventoCard key={evento.id} evento={evento} onClick={() => { setEditing(evento); setFormOpen(true); }} />
            ))
          )}
        </div>
        <div className="mt-3 flex items-center justify-between bg-white px-3 py-2 text-xs shadow-sm">
          <span className="font-semibold uppercase tracking-wider text-muted-foreground">
            {eventosPage.count || 0} registros {isFetching ? 'carregando...' : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-none text-xs font-bold uppercase tracking-wider"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </Button>
            <span className="min-w-20 text-center font-bold uppercase tracking-wider">
              {page}/{totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-none text-xs font-bold uppercase tracking-wider"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Proxima
            </Button>
          </div>
        </div>
      </div>

      {formOpen && (
        <EventoForm
          key={editing?.id || 'new'}
          open={formOpen}
          onOpenChange={setFormOpen}
          evento={editing}
          leads={leadsDaEmpresa}
          atendimentos={porEmpresa}
          onSave={(data) => saveMutation.mutate({ id: editing?.id || null, data })}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}
    </div>
  );
}
