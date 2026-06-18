import { format } from 'date-fns';
import { Phone, Calendar, Flame, Building2, Car } from 'lucide-react';
import { cn } from '@/lib/utils';

const TEMP_COLORS = {
  frio: 'bg-blue-100 text-blue-700 border-blue-200',
  morno: 'bg-amber-100 text-amber-700 border-amber-200',
  quente: 'bg-red-100 text-primary border-red-200',
};

const TIPO_COLORS = {
  venda: 'bg-primary text-white',
  pos_venda: 'bg-[#1a1a1a] text-white',
  agendamento: 'bg-slate-500 text-white',
  retorno: 'bg-slate-400 text-white',
};

export default function EventoCard({ evento, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white shadow-sm border-l-4 border-primary hover:shadow-md hover:border-l-[5px] transition-all group"
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
          {evento.proximo_contato && (
            <span className="flex items-center gap-1 font-semibold text-primary">
              <Calendar className="w-3 h-3" />
              {format(new Date(evento.proximo_contato + 'T00:00:00'), 'dd/MM/yyyy')}
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