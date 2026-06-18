import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import StatusTabs from '@/components/eventos/StatusTabs';
import PainelLateral from '@/components/eventos/PainelLateral';
import EventoCard from '@/components/eventos/EventoCard';
import EventoForm from '@/components/eventos/EventoForm';
import { useEmpresa } from '@/context/EmpresaContext';
import { isToday, isBefore, startOfToday } from 'date-fns';

export default function Eventos() {
  const [statusTab, setStatusTab] = useState('aguardando');
  const [busca, setBusca] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();

  const { data: eventos = [] } = useQuery({
    queryKey: ['eventos'],
    queryFn: () => base44.entities.Evento.list('-updated_date', 200),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['eventos'] });
    setFormOpen(false);
    setEditing(null);
  };

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.Evento.update(editing.id, data)
      : base44.entities.Evento.create(data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Evento.delete(id),
    onSuccess: invalidate,
  });

  const porEmpresa = eventos.filter((e) => empresa === 'Todas' || e.empresa === empresa);
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
          <h1 className="text-xl font-black uppercase tracking-widest">Eventos</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">Gestão de atendimentos</p>
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
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Evento
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Coluna principal */}
        <div className="flex-1 min-w-0">
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

        {/* Painel lateral */}
        <PainelLateral counts={painelCounts} />
      </div>

      {formOpen && (
        <EventoForm
          key={editing?.id || 'new'}
          open={formOpen}
          onOpenChange={setFormOpen}
          evento={editing}
          onSave={(data) => saveMutation.mutate(data)}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}
    </div>
  );
}