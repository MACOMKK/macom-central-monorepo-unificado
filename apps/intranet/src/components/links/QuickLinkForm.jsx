import React, { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@macom/ui';

export default function QuickLinkForm({ onSubmit, isLoading, initial = {} }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    url: initial.url || '',
    description: initial.description || '',
    category: initial.category || 'sistema',
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome do Sistema</Label>
        <Input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
          placeholder="Ex: SAP, Jira, etc."
        />
      </div>

      <div className="space-y-2">
        <Label>URL</Label>
        <Input
          value={form.url}
          onChange={(event) => setForm({ ...form, url: event.target.value })}
          required
          placeholder="https://..."
          type="url"
        />
      </div>

      <div className="space-y-2">
        <Label>Descricao</Label>
        <Textarea
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          rows={2}
          placeholder="Breve descricao..."
        />
      </div>

      <div className="space-y-2">
        <Label>Categoria</Label>
        <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sistema">Sistema</SelectItem>
            <SelectItem value="ferramenta">Ferramenta</SelectItem>
            <SelectItem value="portal">Portal</SelectItem>
            <SelectItem value="comunicacao">Comunicacao</SelectItem>
            <SelectItem value="financeiro">Financeiro</SelectItem>
            <SelectItem value="rh">RH</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Salvando...' : 'Salvar Link'}
      </Button>
    </form>
  );
}
