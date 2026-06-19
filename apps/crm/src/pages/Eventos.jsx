import { useState } from 'react';
import { crmDataClient } from '@/api/crmDataClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlarmClock, Plus, Search } from 'lucide-react';
import StatusTabs from '@/components/eventos/StatusTabs';
import EventoCard from '@/components/eventos/EventoCard';
import EventoForm from '@/components/eventos/EventoForm';
import { useEmpresa } from '@/context/EmpresaContext';
import { isToday, isBefore, startOfToday } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

const createTempId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function Eventos() {
  const [statusTab, setStatusTab] = useState('aguardando');
  const [busca, setBusca] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();

  const { data: eventos = [] } = useQuery({
    queryKey: ['eventos'],
    queryFn: () => crmDataClient.entities.Evento.list('-updated_date', 200),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => crmDataClient.entities.Lead.list('-updated_date', 500),
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
    mutationFn: (data) => editing
      ? crmDataClient.entities.Evento.update(editing.id, data)
      : crmDataClient.entities.Evento.create(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['eventos'] });
      await queryClient.cancelQueries({ queryKey: ['leads'] });

      const previousEventos = queryClient.getQueryData(['eventos']);
      const previousLeads = queryClient.getQueryData(['leads']);
      const now = new Date().toISOString();
      const editingEvento = editing;
      const tempId = createTempId();
      const linkedLead = leads.find((lead) => lead.id === data.lead_id);

      queryClient.setQueryData(['eventos'], (current = []) => {
        if (editingEvento) {
          return current.map((evento) => (
            evento.id === editingEvento.id
              ? { ...evento, ...data, updated_date: now }
              : evento
          ));
        }

        return [
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
            status: 'aguardando',
            tipo_evento: 'venda',
            temperatura: 'morno',
            ...data,
          },
          ...current,
        ];
      });

      if (linkedLead?.status === 'novo') {
        queryClient.setQueryData(['leads'], (current = []) =>
          current.map((lead) => lead.id === linkedLead.id ? { ...lead, status: 'em_atendimento' } : lead)
        );
      }

      setFormOpen(false);
      setEditing(null);
      return { previousEventos, previousLeads, tempId, editingEvento };
    },
    onSuccess: (saved, _data, context) => {
      queryClient.setQueryData(['eventos'], (current = []) => {
        if (!saved) return current;
        if (context?.tempId) {
          return current.map((evento) => evento.id === context.tempId ? saved : evento);
        }
        return current.map((evento) => evento.id === saved.id ? saved : evento);
      });
      invalidate();
    },
    onError: (error, _data, context) => {
      if (context?.previousEventos) {
        queryClient.setQueryData(['eventos'], context.previousEventos);
      }
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads'], context.previousLeads);
      }
      toast({
        title: 'Nao foi possivel salvar o atendimento',
        description: error.message || 'Revise os dados informados.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => crmDataClient.entities.Evento.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['eventos'] });
      const previousEventos = queryClient.getQueryData(['eventos']);
      queryClient.setQueryData(['eventos'], (current = []) => current.filter((evento) => evento.id !== id));
      setFormOpen(false);
      setEditing(null);
      return { previousEventos };
    },
    onSuccess: invalidate,
    onError: (error, _id, context) => {
      if (context?.previousEventos) {
        queryClient.setQueryData(['eventos'], context.previousEventos);
      }
      toast({
        title: 'Nao foi possivel excluir o atendimento',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const porEmpresa = eventos.filter((e) => empresa === 'Todas' || e.empresa === empresa);
  const leadsDaEmpresa = leads.filter((lead) => empresa === 'Todas' || lead.empresa === empresa);
  const counts = porEmpresa.reduce((acc, e) => ({ ...acc, [e.status]: (acc[e.status] || 0) + 1 }), {});

  const filtrados = porEmpresa.filter((e) =>
    e.status === statusTab &&
    (busca === '' || e.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) || e.titulo?.toLowerCase().includes(busca.toLowerCase()))
  );

  const hoje = startOfToday();
  const pendentes = porEmpresa.filter((e) => ['aguardando', 'andamento'].includes(e.status) && e.proximo_contato);
  const painelCounts = {
    atrasados: pendentes.filter((e) => isBefore(new Date(e.proximo_contato + 'T00:00:00'), hoje)).length,
    hoje: pendentes.filter((e) => isToday(new Date(e.proximo_contato + 'T00:00:00'))).length,
    futuros: pendentes.filter((e) => !isBefore(new Date(e.proximo_contato + 'T00:00:00'), hoje) && !isToday(new Date(e.proximo_contato + 'T00:00:00'))).length,
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest">Atendimentos</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">Historico de interacoes com clientes</p>
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
          <Button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="h-9 text-xs font-bold uppercase tracking-widest rounded-none px-5 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Atendimento
          </Button>
        </div>
      </div>

      <div className="mb-3 grid gap-2 md:grid-cols-3">
        <div className="flex items-center gap-3 bg-white px-4 py-3 shadow-sm">
          <AlarmClock className="h-4 w-4 text-red-600" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Atrasados</p>
            <p className="text-lg font-black text-red-600">{painelCounts.atrasados}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-3 shadow-sm">
          <AlarmClock className="h-4 w-4 text-amber-500" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hoje</p>
            <p className="text-lg font-black text-amber-500">{painelCounts.hoje}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-3 shadow-sm">
          <AlarmClock className="h-4 w-4 text-green-600" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Futuros</p>
            <p className="text-lg font-black text-green-600">{painelCounts.futuros}</p>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <StatusTabs value={statusTab} onChange={setStatusTab} counts={counts} />
        <div className="mt-3 space-y-2">
          {filtrados.length === 0 ? (
            <div className="bg-white py-12 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nenhum evento encontrado</p>
            </div>
          ) : (
            filtrados.map((evento) => (
              <EventoCard key={evento.id} evento={evento} onClick={() => { setEditing(evento); setFormOpen(true); }} />
            ))
          )}
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
          onSave={(data) => saveMutation.mutate(data)}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}
    </div>
  );
}
