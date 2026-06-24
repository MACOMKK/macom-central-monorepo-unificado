import { format } from 'date-fns';
import { Phone, Calendar, Flame, Building2, Car, UserRound, AlarmClock } from 'lucide-react';
import { cn } from '@/lib/utils';

const TEMP_COLORS = {
  frio: 'bg-blue-100 text-blue-700 border-blue-200',
  morno: 'bg-amber-100 text-amber-700 border-amber-200',
  quente: 'bg-red-100 text-primary border-red-200',
};

const TIPO_COLORS = {
  ligacao: 'bg-blue-600 text-white',
  whatsapp: 'bg-green-600 text-white',
  email: 'bg-cyan-600 text-white',
  visita: 'bg-violet-600 text-white',
  test_drive: 'bg-orange-500 text-white',
  tarefa: 'bg-slate-600 text-white',
  venda: 'bg-primary text-white',
  pos_venda: 'bg-[#1a1a1a] text-white',
  agendamento: 'bg-slate-500 text-white',
  retorno: 'bg-slate-400 text-white',
};

const RESULT_LABELS = {
  contato_realizado: 'Contato realizado',
  sem_resposta: 'Sem resposta',
  visita_agendada: 'Visita agendada',
  test_drive: 'Test-drive',
  proposta_enviada: 'Proposta enviada',
  venda_realizada: 'Venda realizada',
  lead_perdido: 'Lead perdido',
};

export default function EventoCard({ evento, onClick }) {
  const contactDate = evento.proximo_contato
    ? new Date(`${String(evento.proximo_contato).slice(0, 10)}T00:00:00`)
    : null;
  const formattedContactDate = contactDate && !Number.isNaN(contactDate.getTime())
    ? format(contactDate, 'dd/MM/yyyy')
    : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = evento.status === 'planejada'
    && contactDate
    && !Number.isNaN(contactDate.getTime())
    && contactDate < today;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left bg-white shadow-sm border-l-4 hover:shadow-md hover:border-l-[5px] transition-all group',
        isOverdue ? 'border-red-600 bg-red-50/40' : 'border-primary'
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm', TIPO_COLORS[evento.tipo_evento] || 'bg-muted text-muted-foreground')}>
                {evento.tipo_evento?.replace('_', ' ')}
              </span>
              <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border', TEMP_COLORS[evento.temperatura] || 'bg-muted')}>
                <Flame className="w-2.5 h-2.5 inline mr-0.5" />{evento.temperatura}
              </span>
              {evento.resultado ? (
                <span className="bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  {RESULT_LABELS[evento.resultado] || evento.resultado}
                </span>
              ) : null}
              {isOverdue ? (
                <span className="inline-flex items-center gap-1 bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  <AlarmClock className="h-3 w-3" /> Atrasado
                </span>
              ) : null}
            </div>
            <p className="font-bold text-sm mt-1.5 group-hover:text-primary transition-colors">{evento.cliente_nome}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{evento.titulo}</p>
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">{evento.empresa}</span>
        </div>

        <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground flex-wrap border-t border-dashed pt-2.5">
          {evento.telefone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />{evento.telefone}
            </span>
          )}
          {evento.modelo_interesse && (
            <span className="flex items-center gap-1">
              <Car className="w-3 h-3" />{evento.modelo_interesse}
            </span>
          )}
          {formattedContactDate && (
            <span className={cn('flex items-center gap-1 font-semibold', isOverdue ? 'text-red-700' : 'text-primary')}>
              <Calendar className="w-3 h-3" />
              {formattedContactDate}
            </span>
          )}
          {evento.responsavel_nome && (
            <span className="flex items-center gap-1">
              <UserRound className="w-3 h-3" />{evento.responsavel_nome}
            </span>
          )}
          <span className="flex items-center gap-1 ml-auto">
            <Building2 className="w-3 h-3" />{evento.origem}
          </span>
        </div>
      </div>
    </button>
  );
}
