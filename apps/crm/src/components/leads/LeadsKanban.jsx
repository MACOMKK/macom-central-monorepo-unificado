import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { Phone, Car, Building2, CalendarClock, UserRound } from 'lucide-react';

const COLUNAS = [
  { key: 'novo', label: 'Novo', color: 'border-t-blue-500', headerBg: 'bg-blue-500', dot: 'bg-blue-500' },
  { key: 'em_atendimento', label: 'Em Atendimento', color: 'border-t-amber-500', headerBg: 'bg-amber-500', dot: 'bg-amber-500' },
  { key: 'convertido', label: 'Convertido', color: 'border-t-green-600', headerBg: 'bg-green-600', dot: 'bg-green-600' },
  { key: 'perdido', label: 'Perdido', color: 'border-t-red-600', headerBg: 'bg-red-600', dot: 'bg-red-600' },
];

function LeadCard({ lead, index, onClick }) {
  const slaLabel = lead.sla_status === 'concluido'
    ? 'Primeiro contato realizado'
    : lead.sla_status === 'atrasado'
      ? 'SLA atrasado'
      : 'SLA no prazo';
  const slaStyle = lead.sla_status === 'concluido'
    ? 'text-green-700'
    : lead.sla_status === 'atrasado'
      ? 'text-red-700'
      : 'text-blue-700';

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(lead)}
          className={cn(
            'bg-white border border-border shadow-sm p-3 cursor-pointer select-none transition-shadow',
            snapshot.isDragging ? 'shadow-xl rotate-1 opacity-95' : 'hover:shadow-md hover:border-primary/30'
          )}
        >
          <p className="font-bold text-sm leading-tight">{lead.nome}</p>
          {lead.modelo_interesse && (
            <p className="text-xs text-primary font-semibold mt-1 flex items-center gap-1">
              <Car className="w-3 h-3" />{lead.modelo_interesse}
            </p>
          )}
          <div className="mt-2 space-y-1">
            {lead.telefone && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" />{lead.telefone}
              </p>
            )}
            {lead.empresa && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3 h-3" />{lead.empresa}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <UserRound className="w-3 h-3" />{lead.responsavel_nome || 'Distribuicao automatica'}
            </p>
            {['novo', 'em_atendimento'].includes(lead.status) ? (
              <p className={cn('flex items-center gap-1 text-[11px] font-semibold', slaStyle)}>
                <CalendarClock className="h-3 w-3" />{slaLabel}
              </p>
            ) : null}
          </div>
          <div className="mt-2 pt-2 border-t border-dashed border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{lead.origem}</span>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default function LeadsKanban({ leads, onDragEnd, onCardClick }) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 items-start">
        {COLUNAS.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.key);
          return (
            <div key={col.key} className={cn('flex-1 min-w-[240px] max-w-[300px] bg-[#f4f4f4] border-t-4 shrink-0', col.color)}>
              {/* Column Header */}
              <div className="px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', col.dot)} />
                  <span className="text-[11px] font-black uppercase tracking-widest">{col.label}</span>
                </div>
                <span className="text-[10px] font-black bg-[#1a1a1a] text-white px-2 py-0.5 rounded-sm min-w-[20px] text-center">
                  {colLeads.length}
                </span>
              </div>

              {/* Droppable area */}
              <Droppable droppableId={col.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'px-2 pb-2 space-y-2 min-h-[200px] transition-colors',
                      snapshot.isDraggingOver ? 'bg-primary/5' : ''
                    )}
                  >
                    {colLeads.map((lead, index) => (
                      <LeadCard key={lead.id} lead={lead} index={index} onClick={onCardClick} />
                    ))}
                    {provided.placeholder}
                    {colLeads.length === 0 && !snapshot.isDraggingOver && (
                      <div className="border-2 border-dashed border-border rounded-sm py-6 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Arraste aqui</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
