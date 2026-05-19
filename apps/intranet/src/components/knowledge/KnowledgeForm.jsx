import React, { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@macom/ui';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save } from 'lucide-react';

const categoryLabels = {
  geral: 'Geral', rh: 'RH', ti: 'TI', financeiro: 'Financeiro',
  vendas: 'Vendas', pos_vendas: 'Pós-Vendas', beneficios: 'Benefícios', politicas: 'Políticas',
};

const typeLabels = {
  faq: 'FAQ', artigo: 'Artigo', tutorial: 'Tutorial', politica: 'Política',
};

const EMPTY = { title: '', content: '', category: 'geral', type: 'faq', tags: '', pinned: false };

export default function KnowledgeForm({ initial, onSubmit, isLoading }) {
  const [form, setForm] = useState(initial || EMPTY);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Título / Pergunta</Label>
        <Input
          placeholder="Ex: Como solicitar férias?"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(typeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Conteúdo / Resposta</Label>
        <Textarea
          placeholder="Descreva detalhadamente..."
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          className="h-36"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Tags (separadas por vírgula)</Label>
        <Input
          placeholder="ex: férias, rh, solicitação"
          value={form.tags}
          onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="pinned"
            checked={form.pinned}
            onCheckedChange={v => setForm(f => ({ ...f, pinned: v }))}
          />
          <Label htmlFor="pinned" className="cursor-pointer">Fixar no topo</Label>
        </div>
        <Button type="submit" disabled={isLoading} className="gap-2">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}
