import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function companyFromUnit(unitName = '') {
  const normalized = unitName.toLowerCase();
  if (normalized.includes('paragominas')) return 'Macom Paragominas';
  if (normalized.includes('bel')) return 'Macom Belém';
  return 'Macom Ananindeua';
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export default function LeadForm({ open, onOpenChange, lead, responsaveis = [], notes = [], onSave, onAddNote, addingNote = false }) {
  const [data, setData] = useState(lead || {
    nome: '', telefone: '', email: '', origem: 'site', status: 'novo',
    modelo_interesse: '', empresa: 'Macom Ananindeua', responsavel_id: '',
    previsao_fechamento: '', motivo_perda: '', observacoes: ''
  });
  const [noteText, setNoteText] = useState('');
  const set = (f, v) => setData((d) => ({ ...d, [f]: v }));
  const unidades = useMemo(() => {
    const unique = new Map();
    responsaveis.forEach((responsavel) => {
      if (responsavel.unidade_id) {
        unique.set(responsavel.unidade_id, {
          id: responsavel.unidade_id,
          nome: responsavel.unidade_nome || companyFromUnit(responsavel.unidade_nome),
        });
      }
    });
    return [...unique.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [responsaveis]);
  const responsaveisDaUnidade = responsaveis.filter((item) => !data.unidade_id || item.unidade_id === data.unidade_id);

  useEffect(() => {
    if (data.unidade_id || unidades.length === 0) return;
    const expectedCompany = data.empresa || 'Macom Ananindeua';
    const matched = unidades.find((item) => companyFromUnit(item.nome) === expectedCompany) || unidades[0];
    setData((current) => ({ ...current, unidade_id: matched.id, empresa: companyFromUnit(matched.nome) }));
  }, [data.empresa, data.unidade_id, unidades]);

  const setUnidade = (unidadeId) => {
    const unidade = unidades.find((item) => item.id === unidadeId);
    setData((current) => ({
      ...current,
      unidade_id: unidadeId,
      empresa: companyFromUnit(unidade?.nome),
      responsavel_id: responsaveis.some((item) => item.id === current.responsavel_id && item.unidade_id === unidadeId)
        ? current.responsavel_id
        : '',
    }));
  };
  const saveNote = () => {
    const text = noteText.trim();
    if (!text || !onAddNote) return;
    onAddNote(text);
    setNoteText('');
  };

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
                  <SelectItem value="tentativa_contato">Tentativa de contato</SelectItem>
                  <SelectItem value="em_contato">Em contato</SelectItem>
                  <SelectItem value="qualificado">Qualificado</SelectItem>
                  <SelectItem value="proposta">Proposta</SelectItem>
                  <SelectItem value="convertido">Convertido</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Modelo de Interesse">
              <Input value={data.modelo_interesse} onChange={(e) => set('modelo_interesse', e.target.value)} className="rounded-none h-9 text-sm" />
            </Field>
            <Field label="Unidade *">
              <Select value={data.unidade_id || ''} onValueChange={setUnidade} required>
                <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">{unidades.map((unidade) => <SelectItem key={unidade.id} value={unidade.id}>{unidade.nome}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Responsavel">
              <Select
                value={data.responsavel_id || 'automatico'}
                onValueChange={(value) => set('responsavel_id', value === 'automatico' ? '' : value)}
              >
                <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="automatico">Distribuicao automatica</SelectItem>
                  {responsaveisDaUnidade.map((responsavel) => (
                    <SelectItem key={responsavel.id} value={responsavel.id}>
                      {responsavel.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Previsao de fechamento">
              <Input
                type="date"
                value={data.previsao_fechamento || ''}
                onChange={(event) => set('previsao_fechamento', event.target.value)}
                className="rounded-none h-9 text-sm"
              />
            </Field>
          </div>
          {data.status === 'perdido' ? (
            <Field label="Motivo da perda *">
              <Textarea
                required
                value={data.motivo_perda || ''}
                onChange={(event) => set('motivo_perda', event.target.value)}
                className="resize-none rounded-none text-sm"
                rows={2}
              />
            </Field>
          ) : null}
          <Field label="Observacoes comerciais">
            <Textarea
              value={data.observacoes || ''}
              onChange={(event) => set('observacoes', event.target.value)}
              className="resize-none rounded-none text-sm"
              rows={3}
            />
          </Field>
          {lead ? (
            <div className="border-t pt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Notas do lead</Label>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{notes.length} notas</span>
              </div>
              <div className="space-y-2">
                <Textarea
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="Registrar nota comercial..."
                  className="resize-none rounded-none text-sm"
                  rows={2}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!noteText.trim() || addingNote}
                    onClick={saveNote}
                    className="h-8 rounded-none text-xs font-bold uppercase tracking-wider"
                  >
                    {addingNote ? 'Registrando...' : 'Adicionar nota'}
                  </Button>
                </div>
              </div>
              <div className="mt-3 max-h-40 space-y-2 overflow-y-auto border-t pt-3">
                {notes.length === 0 ? (
                  <p className="py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Nenhuma nota registrada</p>
                ) : notes.map((note) => (
                  <div key={note.id} className="bg-slate-50 p-3">
                    <p className="text-sm text-slate-800">{note.descricao}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{formatDate(note.created_date)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
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
