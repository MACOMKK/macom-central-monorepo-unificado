import React, { useState } from 'react';
import { appClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Trash2, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import EventForm from '../components/calendar/EventForm';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/lib/usePermissions';

const typeColors = {
  reuniao: 'bg-blue-500', treinamento: 'bg-green-500', evento: 'bg-purple-500',
  feriado: 'bg-red-500', aniversario: 'bg-pink-500', outro: 'bg-gray-500',
};
const typeLabels = {
  reuniao: 'Reunião', treinamento: 'Treinamento', evento: 'Evento',
  feriado: 'Feriado', aniversario: 'Aniversário', outro: 'Outro',
};

export default function Calendar() {
  const { canEdit } = usePermissions('calendario');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => appClient.entities.CalendarEvent.list('date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => appClient.entities.CalendarEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => appClient.entities.CalendarEvent.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDay = monthStart.getDay();
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter(e => e.date === dayStr);
  };

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Calendário</h1>
          <p className="text-sm text-muted-foreground mt-1">Eventos e datas importantes</p>
        </div>
        {canEdit && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Evento</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo Evento</DialogTitle></DialogHeader>
            <EventForm onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
          </DialogContent>
        </Dialog>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
            ))}
            {Array(startDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
            {days.map(day => {
              const dayEvents = getEventsForDay(day);
              const selected = selectedDate && isSameDay(day, selectedDate);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative h-12 md:h-16 rounded-lg flex flex-col items-center justify-start pt-1 transition-all text-sm",
                    isToday(day) && "bg-primary/10 font-bold",
                    selected && "ring-2 ring-primary bg-primary/5",
                    !selected && "hover:bg-muted"
                  )}
                >
                  <span className={cn(isToday(day) && "text-primary")}>{format(day, 'd')}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map(e => (
                        <div key={e.id} className={`w-1.5 h-1.5 rounded-full ${typeColors[e.type] || typeColors.outro}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Details */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">
            {selectedDate
              ? format(selectedDate, "d 'de' MMMM", { locale: ptBR })
              : 'Selecione um dia'}
          </h3>
          {selectedDate && selectedEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>
          )}
          <div className="space-y-3">
            {selectedEvents.map(e => (
              <div key={e.id} className="p-3 rounded-lg border border-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${typeColors[e.type] || typeColors.outro}`} />
                    <h4 className="font-medium text-sm">{e.title}</h4>
                  </div>
                  {canEdit && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(e.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>}
                </div>
                <Badge variant="secondary" className="text-[10px] mt-1">{typeLabels[e.type] || e.type}</Badge>
                {e.description && <p className="text-xs text-muted-foreground mt-2">{e.description}</p>}
                <div className="flex gap-3 mt-2">
                  {e.time && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {e.time}</span>}
                  {e.location && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.location}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

