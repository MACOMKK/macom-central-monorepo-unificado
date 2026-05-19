import React, { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@macom/ui';

export default function EventForm({ onSubmit, isLoading }) {
  const [form, setForm] = useState({
    title: '', description: '', date: '', time: '', type: 'evento', location: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Título</Label>
        <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="Nome do evento" />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} placeholder="Detalhes..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data</Label>
          <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
        </div>
        <div className="space-y-2">
          <Label>Horário</Label>
          <Input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
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
          <Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Sala, endereço..." />
        </div>
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Salvando...' : 'Salvar Evento'}
      </Button>
    </form>
  );
}
