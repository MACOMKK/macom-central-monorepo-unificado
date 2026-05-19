import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function QuickLinkForm({ onSubmit, isLoading, initial = {} }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    url: initial.url || '',
    description: initial.description || '',
    category: initial.category || 'sistema',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome do Sistema</Label>
        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Ex: SAP, Jira, etc." />
      </div>
      <div className="space-y-2">
        <Label>URL</Label>
        <Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} required placeholder="https://..." type="url" />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Breve descrição..." />
      </div>
      <div className="space-y-2">
        <Label>Categoria</Label>
        <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sistema">Sistema</SelectItem>
            <SelectItem value="ferramenta">Ferramenta</SelectItem>
            <SelectItem value="portal">Portal</SelectItem>
            <SelectItem value="comunicacao">Comunicação</SelectItem>
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

