import React, { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@macom/ui';

export default function EventForm({ onSubmit, isLoading }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    type: 'evento',
    location: '',
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
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
          <Label>Data</Label>
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

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Salvando...' : 'Salvar Evento'}
      </Button>
    </form>
  );
}
