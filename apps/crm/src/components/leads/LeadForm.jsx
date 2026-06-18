import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EMPRESAS = ['Macom Ananindeua', 'Macom Belém', 'Macom Paragominas'];

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export default function LeadForm({ open, onOpenChange, lead, onSave }) {
  const [data, setData] = useState(lead || {
    nome: '', telefone: '', email: '', origem: 'site', status: 'novo',
    modelo_interesse: '', empresa: 'Macom Ananindeua'
  });
  const set = (f, v) => setData((d) => ({ ...d, [f]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none p-0 gap-0">
        <DialogHeader className="bg-[#1a1a1a] px-6 py-4">
          <DialogTitle className="text-white text-sm font-black uppercase tracking-widest">
            {lead ? 'Editar Lead' : 'Novo Lead'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(data); }} className="p-6 space-y-4">
          <Field label="Nome *">
            <Input required value={data.nome} onChange={(e) => set('nome', e.target.value)} className="rounded-none h-9 text-sm" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Telefone">
              <Input required value={data.telefone} onChange={(e) => set('telefone', e.target.value)} className="rounded-none h-9 text-sm" />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={data.email} onChange={(e) => set('email', e.target.value)} className="rounded-none h-9 text-sm" />
            </Field>
            <Field label="Origem">
              <Select value={data.origem} onValueChange={(v) => set('origem', v)}>
                <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="site">Site</SelectItem>
                  <SelectItem value="showroom">Showroom</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={data.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                  <SelectItem value="convertido">Convertido</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Modelo de Interesse">
              <Input value={data.modelo_interesse} onChange={(e) => set('modelo_interesse', e.target.value)} className="rounded-none h-9 text-sm" />
            </Field>
            <Field label="Empresa">
              <Select value={data.empresa} onValueChange={(v) => set('empresa', v)}>
                <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">{EMPRESAS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" className="rounded-none text-xs font-bold uppercase tracking-wider" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="rounded-none text-xs font-bold uppercase tracking-wider bg-primary hover:bg-primary/90">
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
