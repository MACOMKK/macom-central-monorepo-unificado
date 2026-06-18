import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Car, Phone, Tag, UserRound } from 'lucide-react';

const ACTIVE_LEAD_STATUSES = new Set(['novo', 'em_atendimento']);
const OPEN_ATTENDANCE_STATUSES = new Set(['aguardando', 'andamento']);

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function leadToEvento(lead, base = {}) {
  if (!lead) return base;

  return {
    ...base,
    lead_id: lead.id,
    cliente_id: lead.cliente_id,
    cliente_nome: lead.nome,
    telefone: lead.telefone,
    empresa: lead.empresa,
    origem: lead.origem,
    modelo_interesse: lead.modelo_interesse,
  };
}

function createInitialData(evento, leads) {
  if (evento) {
    const linkedLead = leads.find((lead) => lead.id === evento.lead_id)
      || leads.find((lead) => lead.telefone_normalizado && lead.telefone_normalizado === evento.telefone_normalizado);
    return leadToEvento(linkedLead, evento);
  }

  const firstLead = leads.find((lead) => ACTIVE_LEAD_STATUSES.has(lead.status));

  return leadToEvento(firstLead, {
    lead_id: '',
    cliente_nome: '',
    telefone: '',
    titulo: '',
    status: 'aguardando',
    tipo_evento: 'venda',
    origem: '',
    temperatura: 'morno',
    empresa: '',
    modelo_interesse: '',
    proximo_contato: '',
    observacoes: '',
  });
}

export default function EventoForm({ open, onOpenChange, evento, leads = [], atendimentos = [], onSave, onDelete }) {
  const availableLeads = useMemo(() => {
    const hasOpenAttendance = (leadId) => atendimentos.some((atendimento) => (
      atendimento.lead_id === leadId &&
      atendimento.id !== evento?.id &&
      OPEN_ATTENDANCE_STATUSES.has(atendimento.status)
    ));

    if (evento?.lead_id) {
      return leads.filter((lead) => (
        lead.id === evento.lead_id ||
        (ACTIVE_LEAD_STATUSES.has(lead.status) && !hasOpenAttendance(lead.id))
      ));
    }

    return leads.filter((lead) => ACTIVE_LEAD_STATUSES.has(lead.status) && !hasOpenAttendance(lead.id));
  }, [atendimentos, evento?.id, evento?.lead_id, leads]);

  const [data, setData] = useState(() => createInitialData(evento, availableLeads.length ? availableLeads : leads));
  const selectedLead = leads.find((lead) => lead.id === data.lead_id);
  const canSave = Boolean(data.lead_id && data.titulo);

  const set = (field, value) => setData((current) => ({ ...current, [field]: value }));

  function selectLead(leadId) {
    const lead = leads.find((item) => item.id === leadId);
    setData((current) => leadToEvento(lead, current));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-none p-0 gap-0">
        <DialogHeader className="bg-[#1a1a1a] px-6 py-4">
          <DialogTitle className="text-sm font-black uppercase tracking-widest text-white">
            {evento ? 'Editar Atendimento' : 'Novo Atendimento'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(event) => { event.preventDefault(); if (canSave) onSave(data); }} className="space-y-4 p-6">
          <Field label="Lead vinculado *">
            {availableLeads.length > 0 ? (
              <Select value={data.lead_id} onValueChange={selectLead} disabled={Boolean(evento)}>
                <SelectTrigger className="h-9 rounded-none text-sm"><SelectValue placeholder="Selecione um lead" /></SelectTrigger>
                <SelectContent className="rounded-none">
                  {availableLeads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.nome} - {lead.modelo_interesse || 'Modelo nao informado'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="border border-dashed bg-slate-50 px-3 py-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Nao ha lead ativo sem atendimento em aberto.
              </div>
            )}
          </Field>

          {selectedLead ? (
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 text-xs">
              <span className="flex items-center gap-2 font-semibold"><UserRound className="h-3.5 w-3.5" />{selectedLead.nome}</span>
              <span className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{selectedLead.telefone}</span>
              <span className="flex items-center gap-2 text-muted-foreground"><Car className="h-3.5 w-3.5" />{selectedLead.modelo_interesse || 'Modelo nao informado'}</span>
              <span className="flex items-center gap-2 text-muted-foreground"><Tag className="h-3.5 w-3.5" />{selectedLead.origem || 'Sem origem'}</span>
              <span className="col-span-2 flex items-center gap-2 text-muted-foreground"><Building2 className="h-3.5 w-3.5" />{selectedLead.empresa}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Titulo do atendimento *">
                <Input required value={data.titulo} onChange={(event) => set('titulo', event.target.value)} className="h-9 rounded-none text-sm" />
              </Field>
            </div>
            <Field label="Status">
              <Select value={data.status} onValueChange={(value) => set('status', value)}>
                <SelectTrigger className="h-9 rounded-none text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                  <SelectItem value="andamento">Andamento</SelectItem>
                  <SelectItem value="sucesso">Sucesso</SelectItem>
                  <SelectItem value="insucesso">Insucesso</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tipo de atendimento">
              <Select value={data.tipo_evento} onValueChange={(value) => set('tipo_evento', value)}>
                <SelectTrigger className="h-9 rounded-none text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="venda">Venda</SelectItem>
                  <SelectItem value="pos_venda">Pos Venda</SelectItem>
                  <SelectItem value="agendamento">Agendamento</SelectItem>
                  <SelectItem value="retorno">Retorno</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Temperatura">
              <Select value={data.temperatura} onValueChange={(value) => set('temperatura', value)}>
                <SelectTrigger className="h-9 rounded-none text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="frio">Frio</SelectItem>
                  <SelectItem value="morno">Morno</SelectItem>
                  <SelectItem value="quente">Quente</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Proximo contato">
              <Input type="date" value={data.proximo_contato} onChange={(event) => set('proximo_contato', event.target.value)} className="h-9 rounded-none text-sm" />
            </Field>
            <div className="col-span-2">
              <Field label="Observacoes">
                <Textarea value={data.observacoes} onChange={(event) => set('observacoes', event.target.value)} className="resize-none rounded-none text-sm" rows={3} />
              </Field>
            </div>
          </div>
          <div className="flex justify-between border-t pt-2">
            {evento && onDelete ? (
              <Button type="button" variant="destructive" className="rounded-none text-xs font-bold uppercase tracking-wider" onClick={() => onDelete(evento.id)}>
                Excluir
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="rounded-none text-xs font-bold uppercase tracking-wider" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!canSave} className="rounded-none bg-primary text-xs font-bold uppercase tracking-wider hover:bg-primary/90">
                Salvar
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
