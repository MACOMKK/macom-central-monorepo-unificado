import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/client';
import { Button, Checkbox, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@macom/ui';

const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  time: '',
  type: 'evento',
  location: '',
  recurrence: 'none',
  recurrence_until: '',
  participant_ids: [],
  add_google_meet: false,
  responsible_collaborator_id: '',
};

function normalizeInitialData(initialData) {
  if (!initialData) return EMPTY_FORM;

  return {
    title: initialData.title || '',
    description: initialData.description || '',
    date: initialData.date || '',
    time: initialData.time || '',
    type: initialData.type || 'evento',
    location: initialData.location || '',
    recurrence: initialData.recurrence || 'none',
    recurrence_until: initialData.recurrence_until || '',
    participant_ids: Array.isArray(initialData.participant_ids)
      ? initialData.participant_ids
      : (initialData.participants || []).map((participant) => participant.collaborator_id || participant.id).filter(Boolean),
    add_google_meet: false,
    responsible_collaborator_id: initialData.responsible_collaborator_id || initialData.responsible_id || '',
  };
}

const WEEKDAY_LABELS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

const MONTHLY_ORDINAL_LABELS = [
  'primeiro(a)',
  'segundo(a)',
  'terceiro(a)',
  'quarto(a)',
  'quinto(a)',
];

function parseLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getWeeklyRecurrenceLabel(value) {
  const date = parseLocalDate(value);
  if (!date) return 'Semanalmente';
  return `Semanal: cada ${WEEKDAY_LABELS[date.getDay()]}`;
}

function getMonthlyRecurrenceLabel(value) {
  const date = parseLocalDate(value);
  if (!date) return 'Mensalmente';
  const occurrenceIndex = Math.ceil(date.getDate() / 7);
  const ordinal = MONTHLY_ORDINAL_LABELS[occurrenceIndex - 1] || 'ultimo(a)';
  return `Mensal no(a) ${ordinal} ${WEEKDAY_LABELS[date.getDay()]}`;
}

export default function EventForm({
  initialData = null,
  onSubmit,
  isLoading,
  submitLabel,
  googleCalendarConnected = false,
}) {
  const [form, setForm] = useState({
    ...normalizeInitialData(initialData),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        return await appClient.entities.Employee.list('name', 200);
      } catch {
        return [];
      }
    },
  });

  const responsibleOptions = useMemo(() => {
    const currentResponsibleId = form.responsible_collaborator_id;
    return employees.filter((employee) => (
      employee.status === 'ativo' || employee.id === currentResponsibleId
    ));
  }, [employees, form.responsible_collaborator_id]);

  const participantOptions = useMemo(() => {
    const selectedIds = new Set(form.participant_ids || []);
    return employees.filter((employee) => employee.status === 'ativo' || selectedIds.has(employee.id));
  }, [employees, form.participant_ids]);

  const toggleParticipant = (employeeId, checked) => {
    setForm((currentForm) => {
      const currentIds = Array.isArray(currentForm.participant_ids) ? currentForm.participant_ids : [];
      const nextIds = checked
        ? Array.from(new Set([...currentIds, employeeId]))
        : currentIds.filter((id) => id !== employeeId);
      return { ...currentForm, participant_ids: nextIds };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      ...form,
      recurrence_until: form.recurrence === 'none' ? '' : form.recurrence_until,
      recurrence_active: form.recurrence !== 'none',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Titulo</Label>
        <Input
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          required
          placeholder="Nome do evento"
        />
      </div>

      <div className="space-y-2">
        <Label>Descricao</Label>
        <Textarea
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          rows={2}
          placeholder="Detalhes..."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Data inicial</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Horario</Label>
          <Input
            type="time"
            value={form.time}
            onChange={(event) => setForm({ ...form, time: event.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Repetição</Label>
          <Select
            value={form.recurrence}
            onValueChange={(value) => setForm({
              ...form,
              recurrence: value,
              recurrence_until: value === 'none' ? '' : form.recurrence_until,
            })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não se repete</SelectItem>
              <SelectItem value="weekly">{getWeeklyRecurrenceLabel(form.date)}</SelectItem>
              <SelectItem value="monthly">{getMonthlyRecurrenceLabel(form.date)}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {form.recurrence !== 'none' ? (
          <div className="space-y-2">
            <Label>Repetir ate</Label>
            <Input
              type="date"
              value={form.recurrence_until}
              min={form.date || undefined}
              onChange={(event) => setForm({ ...form, recurrence_until: event.target.value })}
              required
            />
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="reuniao">Reuniao</SelectItem>
              <SelectItem value="treinamento">Treinamento</SelectItem>
              <SelectItem value="evento">Evento</SelectItem>
              <SelectItem value="feriado">Feriado</SelectItem>
              <SelectItem value="aniversario">Aniversario</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Local</Label>
          <Input
            value={form.location}
            onChange={(event) => setForm({ ...form, location: event.target.value })}
            placeholder="Sala, endereco..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Responsavel</Label>
        <Select
          value={form.responsible_collaborator_id || '__none__'}
          onValueChange={(value) => setForm({
            ...form,
            responsible_collaborator_id: value === '__none__' ? '' : value,
          })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o colaborador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sem responsavel</SelectItem>
            {responsibleOptions.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.name || employee.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Participantes</Label>
        {participantOptions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
            Nenhum colaborador disponivel.
          </p>
        ) : (
          <div className="max-h-44 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
            {participantOptions.map((employee) => {
              const checked = (form.participant_ids || []).includes(employee.id);
              return (
                <label key={employee.id} className="flex cursor-pointer items-center gap-3 text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggleParticipant(employee.id, Boolean(value))}
                  />
                  <span className="min-w-0 flex-1 truncate">{employee.name || employee.email}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {!initialData?.google_meet_url ? (
        <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
          <Checkbox
            checked={Boolean(form.add_google_meet)}
            disabled={!googleCalendarConnected}
            onCheckedChange={(value) => setForm({ ...form, add_google_meet: Boolean(value) })}
          />
          <span>
            <span className="block font-medium">Adicionar Google Meet</span>
            <span className="block text-xs text-muted-foreground">
              {googleCalendarConnected
                ? 'Cria um link Meet na sua Google Agenda.'
                : 'Conecte sua Google Agenda no Perfil para gerar links Meet.'}
            </span>
          </span>
        </label>
      ) : null}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Salvando...' : submitLabel || 'Salvar Evento'}
      </Button>
    </form>
  );
}
