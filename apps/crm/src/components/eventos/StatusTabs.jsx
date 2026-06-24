import { Clock, CircleCheck, CircleX } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'planejada', label: 'Planejadas', icon: Clock },
  { id: 'concluida', label: 'Concluidas', icon: CircleCheck },
  { id: 'cancelada', label: 'Canceladas', icon: CircleX },
];

export default function StatusTabs({ value, onChange, counts = {} }) {
  return (
    <div className="flex gap-0 border-b border-border bg-white shadow-sm">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 -mb-px',
            value === tab.id
              ? 'border-primary text-primary bg-white'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <tab.icon className="w-3.5 h-3.5" />
          {tab.label}
          <span className={cn(
            'ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-sm',
            value === tab.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
          )}>
            {counts[tab.id] || 0}
          </span>
        </button>
      ))}
    </div>
  );
}
