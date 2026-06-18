import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

export default function EventoForm({ open, onOpenChange, evento, onSave, onDelete }) {
  const [data, setData] = useState(evento || {
    cliente_nome: '', telefone: '', titulo: '', status: 'aguardando',
    tipo_evento: 'venda', origem: 'telefone', temperatura: 'morno',
    empresa: 'Macom Ananindeua', modelo_interesse: '', proximo_contato: '', observacoes: ''
  });

  const set = (field, value) => setData((d) => ({ ...d, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-none p-0 gap-0">
        <DialogHeader className="bg-[#1a1a1a] px-6 py-4">
          <DialogTitle className="text-white text-sm font-black uppercase tracking-widest">
            {evento ? 'Editar Evento' : 'Novo Evento'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(data); }} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Nome do Cliente *">
                <Input required value={data.cliente_nome} onChange={(e) => set('cliente_nome', e.target.value)}
                  className="rounded-none h-9 text-sm" />
              </Field>
            </div>
            <Field label="Telefone">
              <Input value={data.telefone} onChange={(e) => set('telefone', e.target.value)} className="rounded-none h-9 text-sm" />
            </Field>
            <Field label="Empresa">
              <Select value={data.empresa} onValueChange={(v) => set('empresa', v)}>
                <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">{EMPRESAS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="col-span-2">
              <Field label="Título do Evento *">
                <Input required value={data.titulo} onChange={(e) => set('titulo', e.target.value)} className="rounded-none h-9 text-sm" />
              </Field>
            </div>
            <Field label="Status">
              <Select value={data.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                  <SelectItem value="andamento">Andamento</SelectItem>
                  <SelectItem value="sucesso">Sucesso</SelectItem>
                  <SelectItem value="insucesso">Insucesso</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tipo de Evento">
              <Select value={data.tipo_evento} onValueChange={(v) => set('tipo_evento', v)}>
                <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="venda">Venda</SelectItem>
                  <SelectItem value="pos_venda">Pós Venda</SelectItem>
                  <SelectItem value="agendamento">Agendamento</SelectItem>
                  <SelectItem value="retorno">Retorno</SelectItem>
                </SelectContent>
              </Select>
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
            <Field label="Temperatura">
              <Select value={data.temperatura} onValueChange={(v) => set('temperatura', v)}>
                <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="frio">Frio</SelectItem>
                  <SelectItem value="morno">Morno</SelectItem>
                  <SelectItem value="quente">Quente</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Modelo de Interesse">
              <Input value={data.modelo_interesse} onChange={(e) => set('modelo_interesse', e.target.value)} className="rounded-none h-9 text-sm" />
            </Field>
            <Field label="Próximo Contato">
              <Input type="date" value={data.proximo_contato} onChange={(e) => set('proximo_contato', e.target.value)} className="rounded-none h-9 text-sm" />
            </Field>
            <div className="col-span-2">
              <Field label="Observações">
                <Textarea value={data.observacoes} onChange={(e) => set('observacoes', e.target.value)} className="rounded-none text-sm resize-none" rows={3} />
              </Field>
            </div>
          </div>
          <div className="flex justify-between pt-2 border-t">
            {evento && onDelete ? (
              <Button type="button" variant="destructive" className="rounded-none text-xs font-bold uppercase tracking-wider" onClick={() => onDelete(evento.id)}>
                Excluir
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="rounded-none text-xs font-bold uppercase tracking-wider" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="rounded-none text-xs font-bold uppercase tracking-wider bg-primary hover:bg-primary/90">
                Salvar
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}