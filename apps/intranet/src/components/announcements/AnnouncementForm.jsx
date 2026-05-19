import React, { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Textarea } from '@macom/ui';

export default function AnnouncementForm({ onSubmit, isLoading }) {
  const [form, setForm] = useState({
    title: '', content: '', category: 'geral', priority: 'media', pinned: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Título</Label>
        <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="Título do aviso" />
      </div>
      <div className="space-y-2">
        <Label>Conteúdo</Label>
        <Textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} required rows={4} placeholder="Descreva o aviso..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="geral">Geral</SelectItem>
              <SelectItem value="rh">RH</SelectItem>
              <SelectItem value="ti">TI</SelectItem>
              <SelectItem value="financeiro">Financeiro</SelectItem>
              <SelectItem value="vendas">Vendas</SelectItem>
              <SelectItem value="pos_vendas">Pós-Vendas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Prioridade</Label>
          <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={form.pinned} onCheckedChange={v => setForm({...form, pinned: v})} />
        <Label>Fixar aviso</Label>
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Publicando...' : 'Publicar Aviso'}
      </Button>
    </form>
  );
}
