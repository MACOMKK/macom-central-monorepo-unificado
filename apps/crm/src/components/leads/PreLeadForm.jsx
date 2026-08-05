import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { companyFromUnit } from '@/lib/empresa';

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

const EMPTY_PRE_LEAD = {
  nome: '',
  telefone: '',
  origem: 'site',
  unidade_id: '',
  empresa: 'Macom Ananindeua',
};

export default function PreLeadForm({ open, onOpenChange, responsaveis = [], onSave }) {
  const [data, setData] = useState(EMPTY_PRE_LEAD);
  const [unidadeError, setUnidadeError] = useState('');
  const set = (field, value) => setData((current) => ({ ...current, [field]: value }));

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

  useEffect(() => {
    if (!open) {
      setData(EMPTY_PRE_LEAD);
      return;
    }
    if (data.unidade_id || unidades.length === 0) return;
    setData((current) => ({ ...current, unidade_id: unidades[0].id, empresa: companyFromUnit(unidades[0].nome) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unidades]);

  const setUnidade = (unidadeId) => {
    const unidade = unidades.find((item) => item.id === unidadeId);
    setData((current) => ({ ...current, unidade_id: unidadeId, empresa: companyFromUnit(unidade?.nome) }));
    setUnidadeError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!data.unidade_id) {
      setUnidadeError('Selecione uma unidade antes de salvar.');
      return;
    }
    onSave({ ...data, status: 'triagem' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none p-0">
        <DialogHeader className="bg-[#1a1a1a] px-6 py-4">
          <DialogTitle className="text-sm font-black uppercase tracking-widest text-white">
            Novo Pré-Lead
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <p className="text-xs text-muted-foreground">
            Cadastro rápido para triagem. Complete os dados comerciais depois, ao qualificar este contato como lead.
          </p>

          <Field label="Nome *">
            <Input required placeholder="Nome e sobrenome" value={data.nome} onChange={(event) => set('nome', event.target.value)} className="h-9 rounded-none text-sm" />
          </Field>

          <Field label="Telefone *">
            <Input
              required
              inputMode="numeric"
              placeholder="DDD + numero"
              maxLength={11}
              value={data.telefone}
              onChange={(event) => set('telefone', event.target.value.replace(/\D/g, '').slice(0, 11))}
              className="h-9 rounded-none text-sm"
            />
          </Field>

          <Field label="Origem">
            <Select value={data.origem} onValueChange={(value) => set('origem', value)}>
              <SelectTrigger className="h-9 rounded-none text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="telefone">Telefone</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="site">Site</SelectItem>
                <SelectItem value="showroom">Showroom</SelectItem>
                <SelectItem value="indicacao">Indicação</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Unidade *">
            <Select value={data.unidade_id || ''} onValueChange={setUnidade}>
              <SelectTrigger className="h-9 rounded-none text-sm"><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
              <SelectContent className="rounded-none">
                {unidades.map((unidade) => (
                  <SelectItem key={unidade.id} value={unidade.id}>{unidade.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {unidadeError ? <p className="text-xs font-semibold text-red-600">{unidadeError}</p> : null}
          </Field>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-none text-xs font-bold uppercase tracking-wider" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="rounded-none bg-primary text-xs font-bold uppercase tracking-wider hover:bg-primary/90">
              Salvar pré-lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
