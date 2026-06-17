import React, { useState } from 'react';
import { appClient } from '@/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Trash2, Clock, MapPin, Pencil, UserRound } from 'lucide-react';
import { Badge, Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@macom/ui';
import EventForm from '../components/calendar/EventForm';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
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
  reuniao: 'Reunião',
  treinamento: 'Treinamento',
  evento: 'Evento',
  feriado: 'Feriado',
  aniversario: 'Aniversário',
  outro: 'Outro',
};

const recurrenceLabels = {
  weekly: 'Semanal',
  monthly: 'Mensal',
};

function replaceEvent(events, event) {
  if (!event?.id) return events;
  return events.map((item) => (item.id === event.id ? { ...item, ...event } : item));
}

function removeEvent(events, id) {
  return events.filter((event) => event.id !== id);
}

function prependEvent(events, event) {
  if (!event?.id) return events;
  return [event, ...events.filter((item) => item.id !== event.id)];
}

function parseEventDate(value) {
  if (!value || typeof value !== 'string') return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

function formatDateKey(date) {
  if (!date) return '';
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonthsClamped(date, months) {
  const next = new Date(date);
  const originalDay = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(originalDay, lastDay));
  return next;
}

function getNextOccurrenceDate(date, recurrence) {
  if (recurrence === 'weekly') return addDays(date, 7);
  if (recurrence === 'monthly') return addMonthsClamped(date, 1);
  return null;
}

function isRecurringEvent(event) {
  return Boolean(event?.recurrence && event.recurrence !== 'none' && event.recurrence_active !== false);
}

function eventOccurrenceForDay(event, day) {
  const eventDate = parseEventDate(event.date);
  if (!eventDate) return null;
  const dateKey = formatDateKey(day);
  const cancelledDates = Array.isArray(event.recurrence_cancelled_dates) ? event.recurrence_cancelled_dates : [];
  if (cancelledDates.includes(dateKey)) return null;

  const recurrence = event.recurrence || 'none';
  if (recurrence === 'none' || event.recurrence_active === false) {
    return isSameDay(eventDate, day) ? { ...event, occurrence_date: dateKey } : null;
  }

  if (day < eventDate) return null;

  const recurrenceEnd = parseEventDate(event.recurrence_until);
  if (recurrenceEnd && day > recurrenceEnd) return null;

  let occurrenceDate = eventDate;
  let guard = 0;
  while (occurrenceDate <= day && guard < 370) {
    if (isSameDay(occurrenceDate, day)) return { ...event, occurrence_date: dateKey };
    const nextDate = getNextOccurrenceDate(occurrenceDate, recurrence);
    if (!nextDate || nextDate <= occurrenceDate) return null;
    occurrenceDate = nextDate;
    guard += 1;
  }

  return null;
}

function sortEventsForDay(events) {
  return [...events].sort((first, second) => String(first.time || '').localeCompare(String(second.time || '')));
}

function addCancelledDate(event, date) {
  const current = Array.isArray(event.recurrence_cancelled_dates) ? event.recurrence_cancelled_dates : [];
  return Array.from(new Set([...current, date])).sort();
}

function dayBefore(dateValue) {
  const date = parseEventDate(dateValue);
  if (!date) return null;
  return formatDateKey(addDays(date, -1));
}

function formatEventDateLabel(value) {
  const date = parseEventDate(value);
  return date ? format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Data indisponivel';
}

function EventDetailsDialog({ event, open, onOpenChange }) {
  const participants = Array.isArray(event?.participants) ? event.participants : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{event?.title || 'Evento'}</DialogTitle>
        </DialogHeader>

        {event ? (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{typeLabels[event.type] || event.type || 'Evento'}</Badge>
              {isRecurringEvent(event) ? (
                <Badge variant="outline">{recurrenceLabels[event.recurrence] || 'Recorrente'}</Badge>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatEventDateLabel(event.occurrence_date || event.date)}{event.time ? `, ${event.time}` : ''}</span>
              </p>

              {event.location ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{event.location}</span>
                </p>
              ) : null}

              {event.google_meet_url ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <a href={event.google_meet_url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                    Entrar no Google Meet
                  </a>
                </p>
              ) : null}

              {event.responsible_name || event.responsible_email ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                  <span>Responsavel: {event.responsible_name || event.responsible_email}</span>
                </p>
              ) : null}
            </div>

            {participants.length > 0 ? (
              <div>
                <h4 className="mb-2 font-medium">Participantes</h4>
                <div className="space-y-1.5">
                  {participants.map((participant) => (
                    <div key={participant.collaborator_id || participant.id} className="rounded-md bg-muted px-3 py-2 text-sm">
                      <p className="font-medium leading-tight">{participant.name || participant.email}</p>
                      {participant.name && participant.email ? (
                        <p className="text-xs text-muted-foreground">{participant.email}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {event.description ? (
              <div>
                <h4 className="mb-1 font-medium">Descricao</h4>
                <p className="whitespace-pre-wrap text-muted-foreground">{event.description}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ScopeDialog({ open, mode, scope, onScopeChange, onCancel, onConfirm, isLoading }) {
  const title = mode === 'edit' ? 'Editar evento recorrente' : 'Excluir evento recorrente';
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {[
            ['this', 'Este evento'],
            ['following', 'Este e os eventos seguintes'],
            ['all', 'Todos os eventos'],
          ].map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="radio"
                name="recurrence-scope"
                value={value}
                checked={scope === value}
                onChange={() => onScopeChange(value)}
                className="h-5 w-5 accent-primary"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isLoading}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function canManageEvent(event, currentUser) {
  if (!event || !currentUser) return false;
  if (currentUser.role === 'admin') return true;

  const currentUserId = currentUser.collaborator_id || currentUser.id;
  return Boolean(currentUserId && event.created_by_id === currentUserId);
}

export default function Calendar() {
  const { canEdit } = usePermissions('calendario');
  const { user: currentUser } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingContext, setEditingContext] = useState(null);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [scopePrompt, setScopePrompt] = useState(null);
  const [formError, setFormError] = useState('');
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => appClient.entities.CalendarEvent.list('date', 1000),
  });

  const { data: googleCalendarStatus } = useQuery({
    queryKey: ['google-calendar-status'],
    queryFn: () => appClient.googleCalendar.status(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => appClient.entities.CalendarEvent.create(data),
    onSuccess: (createdEvent) => {
      queryClient.setQueryData(['events'], (old = []) => (
        Array.isArray(old) ? prependEvent(old, createdEvent) : old
      ));
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-upcoming'] });
      setDialogOpen(false);
      setFormError('');
    },
    onError: (error) => {
      setFormError(error?.message || 'Nao foi possivel salvar o evento.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.CalendarEvent.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['events'] });
      const previousEvents = queryClient.getQueryData(['events']);
      const optimisticEvent = {
        ...data,
        id,
        updated_date: new Date().toISOString(),
      };

      queryClient.setQueryData(['events'], (old = []) => (
        Array.isArray(old) ? replaceEvent(old, optimisticEvent) : old
      ));
      setDialogOpen(false);
      setEditingEvent(null);
      setFormError('');

      return { previousEvents };
    },
    onSuccess: (updatedEvent) => {
      queryClient.setQueryData(['events'], (old = []) => (
        Array.isArray(old) ? replaceEvent(old, updatedEvent) : old
      ));
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-upcoming'] });
      setDialogOpen(false);
      setEditingEvent(null);
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(['events'], context?.previousEvents);
      setFormError(_error?.message || 'Nao foi possivel atualizar o evento.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => appClient.entities.CalendarEvent.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['events'] });
      const previousEvents = queryClient.getQueryData(['events']);

      queryClient.setQueryData(['events'], (old = []) => (
        Array.isArray(old) ? removeEvent(old, id) : old
      ));
      setEventToDelete(null);

      return { previousEvents };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-upcoming'] });
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(['events'], context?.previousEvents);
    },
  });

  const scopedMutation = useMutation({
    mutationFn: async ({ mode, scope, event, occurrenceDate, data }) => {
      if (mode === 'delete') {
        if (scope === 'all') {
          return appClient.entities.CalendarEvent.delete(event.id);
        }
        if (scope === 'this') {
          return appClient.entities.CalendarEvent.update(event.id, {
            recurrence_cancelled_dates: addCancelledDate(event, occurrenceDate),
          });
        }
        return appClient.entities.CalendarEvent.update(event.id, {
          recurrence_until: dayBefore(occurrenceDate),
        });
      }

      if (scope === 'all') {
        return appClient.entities.CalendarEvent.update(event.id, data);
      }

      if (scope === 'this') {
        await appClient.entities.CalendarEvent.update(event.id, {
          recurrence_cancelled_dates: addCancelledDate(event, occurrenceDate),
        });
        return appClient.entities.CalendarEvent.create({
          ...data,
          date: occurrenceDate,
          recurrence: 'none',
          recurrence_until: '',
          recurrence_active: false,
        });
      }

      await appClient.entities.CalendarEvent.update(event.id, {
        recurrence_until: dayBefore(occurrenceDate),
      });
      return appClient.entities.CalendarEvent.create({
        ...data,
        date: occurrenceDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-upcoming'] });
      setDialogOpen(false);
      setEditingEvent(null);
      setEditingContext(null);
      setEventToDelete(null);
      setScopePrompt(null);
      setFormError('');
    },
    onError: (error) => {
      setFormError(error?.message || 'Nao foi possivel aplicar a alteracao no evento.');
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDay = monthStart.getDay();
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (day) => (
    sortEventsForDay(events.map((event) => eventOccurrenceForDay(event, day)).filter(Boolean))
  );

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const handleConfirmDelete = () => {
    if (!eventToDelete) return;
    deleteMutation.mutate(eventToDelete.id);
    setEventToDelete(null);
  };

  const openCreateDialog = () => {
    setEditingEvent(null);
    setEditingContext(null);
    setFormError('');
    setDialogOpen(true);
  };

  const openEditDialog = (event) => {
    if (isRecurringEvent(event)) {
      setScopePrompt({ mode: 'edit', event, scope: 'this' });
      return;
    }
    setEditingEvent(event);
    setEditingContext({ event, scope: 'all', occurrenceDate: event.occurrence_date || event.date });
    setFormError('');
    setDialogOpen(true);
  };

  const openDeleteDialog = (event) => {
    if (isRecurringEvent(event)) {
      setScopePrompt({ mode: 'delete', event, scope: 'this' });
      return;
    }
    setEventToDelete(event);
  };

  const handleDialogOpenChange = (open) => {
    setDialogOpen(open);
    if (!open) {
      setEditingEvent(null);
      setEditingContext(null);
      setFormError('');
    }
  };

  const handleSubmitEvent = (data) => {
    if (editingEvent) {
      if (editingContext && isRecurringEvent(editingContext.event)) {
        scopedMutation.mutate({
          mode: 'edit',
          scope: editingContext.scope,
          event: editingContext.event,
          occurrenceDate: editingContext.occurrenceDate,
          data,
        });
        return;
      }
      updateMutation.mutate({ id: editingEvent.id, data });
      return;
    }

    createMutation.mutate(data);
  };

  const handleConfirmScope = () => {
    if (!scopePrompt) return;
    const occurrenceDate = scopePrompt.event.occurrence_date || scopePrompt.event.date;

    if (scopePrompt.mode === 'delete') {
      scopedMutation.mutate({
        mode: 'delete',
        scope: scopePrompt.scope,
        event: scopePrompt.event,
        occurrenceDate,
      });
      return;
    }

    const initialData = {
      ...scopePrompt.event,
      date: scopePrompt.scope === 'all' ? scopePrompt.event.date : occurrenceDate,
      recurrence: scopePrompt.scope === 'this' ? 'none' : scopePrompt.event.recurrence,
      recurrence_until: scopePrompt.scope === 'this' ? '' : scopePrompt.event.recurrence_until,
    };
    setEditingEvent(initialData);
    setEditingContext({
      event: scopePrompt.event,
      scope: scopePrompt.scope,
      occurrenceDate,
    });
    setScopePrompt(null);
    setFormError('');
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">Eventos e datas importantes</p>
        </div>

        {canEdit ? (
          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2 sm:w-auto" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
              </DialogHeader>
              {formError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}
              <EventForm
                key={editingEvent?.id || 'new-event'}
                initialData={editingEvent}
                onSubmit={handleSubmitEvent}
                isLoading={createMutation.isPending || updateMutation.isPending || scopedMutation.isPending}
                submitLabel={editingEvent ? 'Salvar Alterações' : 'Salvar Evento'}
                googleCalendarConnected={Boolean(googleCalendarStatus?.connected)}
              />
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
                        <div key={`${event.id}-${event.occurrence_date || event.date}`} className={`h-1.5 w-1.5 rounded-full ${typeColors[event.type] || typeColors.outro}`} />
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
            {selectedEvents.map((event) => {
              const canManage = canEdit && canManageEvent(event, currentUser);

              return (
                <div
                  key={`${event.id}-${event.occurrence_date || event.date}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setViewingEvent(event)}
                  onKeyDown={(keyEvent) => {
                    if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                      keyEvent.preventDefault();
                      setViewingEvent(event);
                    }
                  }}
                  className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${typeColors[event.type] || typeColors.outro}`} />
                      <h4 className="text-sm font-medium leading-tight">{event.title}</h4>
                    </div>

                    {canManage ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            openEditDialog(event);
                          }}
                          aria-label="Editar evento"
                          title="Editar evento"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            openDeleteDialog(event);
                          }}
                          aria-label="Excluir evento"
                          title="Excluir evento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {typeLabels[event.type] || event.type}
                  </Badge>

                  {event.recurrence && event.recurrence !== 'none' && event.recurrence_active !== false ? (
                    <Badge variant="outline" className="ml-1 mt-1 text-[10px]">
                      {recurrenceLabels[event.recurrence] || 'Recorrente'}
                    </Badge>
                  ) : null}

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
                    {event.responsible_name || event.responsible_email ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <UserRound className="h-3 w-3" />
                        {event.responsible_name || event.responsible_email}
                      </span>
                    ) : null}
                    {Array.isArray(event.participants) && event.participants.length > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <UserRound className="h-3 w-3" />
                        {event.participants.slice(0, 2).map((participant) => participant.name || participant.email).join(', ')}
                        {event.participants.length > 2 ? ` +${event.participants.length - 2}` : ''}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ScopeDialog
        open={Boolean(scopePrompt)}
        mode={scopePrompt?.mode}
        scope={scopePrompt?.scope || 'this'}
        onScopeChange={(scope) => setScopePrompt((current) => current ? { ...current, scope } : current)}
        onCancel={() => setScopePrompt(null)}
        onConfirm={handleConfirmScope}
        isLoading={scopedMutation.isPending}
      />

      <EventDetailsDialog
        event={viewingEvent}
        open={Boolean(viewingEvent)}
        onOpenChange={(open) => !open && setViewingEvent(null)}
      />

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
