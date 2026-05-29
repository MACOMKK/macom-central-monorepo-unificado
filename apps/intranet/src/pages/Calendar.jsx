import React, { useState } from 'react';
import { appClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Trash2, Clock, MapPin } from 'lucide-react';
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@macom/ui';
import EventForm from '../components/calendar/EventForm';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/lib/usePermissions';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';

const typeColors = {
  reuniao: 'bg-blue-500',
  treinamento: 'bg-green-500',
  evento: 'bg-purple-500',
  feriado: 'bg-red-500',
  aniversario: 'bg-pink-500',
  outro: 'bg-gray-500',
};

const typeLabels = {
  reuniao: 'Reuniao',
  treinamento: 'Treinamento',
  evento: 'Evento',
  feriado: 'Feriado',
  aniversario: 'Aniversario',
  outro: 'Outro',
};

function parseEventDate(value) {
  if (!value || typeof value !== 'string') return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export default function Calendar() {
  const { canEdit } = usePermissions('calendario');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
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

  const getEventsForDay = (day) => (
    events.filter((event) => {
      const eventDate = parseEventDate(event.date);
      return eventDate ? isSameDay(eventDate, day) : false;
    })
  );

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const handleConfirmDelete = () => {
    if (!eventToDelete) return;
    deleteMutation.mutate(eventToDelete.id);
    setEventToDelete(null);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Calendario</h1>
          <p className="mt-1 text-sm text-muted-foreground">Eventos e datas importantes</p>
        </div>

        {canEdit ? (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2 sm:w-auto">
                <Plus className="h-4 w-4" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Evento</DialogTitle>
              </DialogHeader>
              <EventForm onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-xl"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <h2 className="text-center text-base font-semibold capitalize sm:text-lg">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-xl"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((dayLabel) => (
              <div key={dayLabel} className="py-2 text-center text-[11px] font-semibold text-muted-foreground sm:text-xs">
                {dayLabel}
              </div>
            ))}

            {Array(startDay).fill(null).map((_, index) => <div key={`empty-${index}`} />)}

            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const selected = selectedDate && isSameDay(day, selectedDate);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'relative flex h-11 flex-col items-center justify-start rounded-lg pt-1 text-sm transition-all sm:h-14 md:h-16',
                    isToday(day) && 'bg-primary/10 font-bold',
                    selected && 'bg-primary/5 ring-2 ring-primary',
                    !selected && 'hover:bg-muted'
                  )}
                >
                  <span className={cn(isToday(day) && 'text-primary')}>{format(day, 'd')}</span>
                  {dayEvents.length > 0 ? (
                    <div className="mt-1 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div key={event.id} className={`h-1.5 w-1.5 rounded-full ${typeColors[event.type] || typeColors.outro}`} />
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h3 className="mb-4 font-semibold">
            {selectedDate
              ? format(selectedDate, "d 'de' MMMM", { locale: ptBR })
              : 'Selecione um dia'}
          </h3>

          {selectedDate && selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>
          ) : null}

          <div className="space-y-3">
            {selectedEvents.map((event) => (
              <div key={event.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${typeColors[event.type] || typeColors.outro}`} />
                    <h4 className="text-sm font-medium leading-tight">{event.title}</h4>
                  </div>

                  {canEdit ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setEventToDelete(event)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>

                <Badge variant="secondary" className="mt-1 text-[10px]">
                  {typeLabels[event.type] || event.type}
                </Badge>

                {event.description ? (
                  <p className="mt-2 text-xs text-muted-foreground">{event.description}</p>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-3">
                  {event.time ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {event.time}
                    </span>
                  ) : null}
                  {event.location ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={Boolean(eventToDelete)}
        onOpenChange={(open) => !open && setEventToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir evento"
        description={
          eventToDelete
            ? `Essa ação não pode ser desfeita. Deseja excluir o evento "${eventToDelete.title}"?`
            : 'Essa ação não pode ser desfeita.'
        }
      />
    </div>
  );
}
