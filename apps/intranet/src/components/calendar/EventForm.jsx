import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/client';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@macom/ui';

const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  time: '',
  type: 'evento',
  location: '',
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
    responsible_collaborator_id: initialData.responsible_collaborator_id || initialData.responsible_id || '',
  };
}

export default function EventForm({ initialData = null, onSubmit, isLoading, submitLabel }) {
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

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Título</Label>
        <Input
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          required
          placeholder="Nome do evento"
        />
      </div>

      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          rows={2}
          placeholder="Detalhes..."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Data</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Horário</Label>
          <Input
            type="time"
            value={form.time}
            onChange={(event) => setForm({ ...form, time: event.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="reuniao">Reunião</SelectItem>
              <SelectItem value="treinamento">Treinamento</SelectItem>
              <SelectItem value="evento">Evento</SelectItem>
              <SelectItem value="feriado">Feriado</SelectItem>
              <SelectItem value="aniversario">Aniversário</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Local</Label>
          <Input
            value={form.location}
            onChange={(event) => setForm({ ...form, location: event.target.value })}
            placeholder="Sala, endereço..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Responsável</Label>
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
            <SelectItem value="__none__">Sem responsável</SelectItem>
            {responsibleOptions.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.name || employee.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Salvando...' : submitLabel || 'Salvar Evento'}
      </Button>
    </form>
  );
}
