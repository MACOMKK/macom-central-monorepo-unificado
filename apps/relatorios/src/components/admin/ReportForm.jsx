import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { dataClient } from '@/api/dataClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const CATEGORIES = [
  { value: 'gerencial', label: 'Gerencial' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'rh', label: 'RH' },
  { value: 'outros', label: 'Outros' },
];

export default function ReportForm({ report, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: '', description: '', embed_code: '',
    unit_id: '', unit_name: '', category: '', active: true,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => dataClient.entities.Unit.filter({ active: true }),
  });

  useEffect(() => {
    if (report) {
      setForm({
        title: report.title || '',
        description: report.description || '',
        embed_code: report.embed_code || '',
        unit_id: report.unit_id || '',
        unit_name: report.unit_name || '',
        category: report.category || '',
        active: report.active !== false,
      });
    }
  }, [report]);

  const saveMutation = useMutation({
    mutationFn: (data) => report ? dataClient.entities.Report.update(report.id, data) : dataClient.entities.Report.create(data),
    onSuccess: onSaved,
  });

  const handleUnitChange = (unitId) => {
    const unit = units.find(u => u.id === unitId);
    setForm(f => ({ ...f, unit_id: unitId, unit_name: unit?.name || '' }));
  };

  return (
    <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest">Título *</Label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required style={{ borderRadius: 2 }} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest">Descrição</Label>
        <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ borderRadius: 2 }} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-widest">Unidade</Label>
          <Select value={form.unit_id} onValueChange={handleUnitChange}>
            <SelectTrigger style={{ borderRadius: 2 }}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-widest">Categoria</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger style={{ borderRadius: 2 }}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest">Código Embed do Power BI *</Label>
        <Textarea
          value={form.embed_code}
          onChange={e => setForm(f => ({ ...f, embed_code: e.target.value }))}
          placeholder='<iframe title="..." src="https://app.powerbi.com/..." frameborder="0" allowFullScreen></iframe>'
          rows={4}
          required
          style={{ borderRadius: 2, fontFamily: 'monospace', fontSize: 12 }}
        />
        <p className="text-[10px] uppercase tracking-wider" style={{ color: '#999' }}>Cole o código iframe completo do Power BI</p>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
        <Label className="text-xs font-semibold">Relatório ativo</Label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 text-xs font-black uppercase tracking-widest border border-gray-300 hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
          style={{ background: '#E30613' }}
        >
          {saveMutation.isPending ? 'Salvando...' : 'Salvar Relatório'}
        </button>
      </div>
    </form>
  );
}
