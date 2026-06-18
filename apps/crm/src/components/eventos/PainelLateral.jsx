import { ChevronRight, AlarmClock } from 'lucide-react';

const SECOES = ['Funil', 'Etapas do Funil', 'Tipos Evento', 'Origens', 'Mídias', 'Modelos de Interesse', 'Motivos Insucesso', 'Motivos Andamento', 'Empresas', 'Temperatura', 'Tipo de Ação'];

export default function PainelLateral({ counts }) {
  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-[#1a1a1a] px-4 py-3 flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-primary" />
          <span className="text-white text-xs font-bold uppercase tracking-widest">Painel de Eventos</span>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-3 divide-x border-b">
          <div className="flex flex-col items-center py-3 gap-1">
            <AlarmClock className="w-4 h-4 text-red-600" />
            <span className="text-lg font-black text-red-600">{counts?.atrasados ?? 0}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Atrasados</span>
          </div>
          <div className="flex flex-col items-center py-3 gap-1">
            <AlarmClock className="w-4 h-4 text-amber-500" />
            <span className="text-lg font-black text-amber-500">{counts?.hoje ?? 0}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Hoje</span>
          </div>
          <div className="flex flex-col items-center py-3 gap-1">
            <AlarmClock className="w-4 h-4 text-green-600" />
            <span className="text-lg font-black text-green-600">{counts?.futuros ?? 0}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Futuros</span>
          </div>
        </div>

        {/* Filtros */}
        {SECOES.map((s) => (
          <button key={s} className="w-full flex items-center gap-2 px-4 py-2.5 border-b last:border-0 text-[11px] font-bold uppercase tracking-wider text-foreground/60 hover:text-primary hover:bg-red-50 transition-colors group">
            <ChevronRight className="w-3 h-3 group-hover:text-primary" /> {s}
          </button>
        ))}
      </div>
    </aside>
  );
}