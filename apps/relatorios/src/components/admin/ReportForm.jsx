import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { dataClient } from '@/api/dataClient';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Textarea } from '@macom/ui';

const CATEGORIES = [
  { value: 'gerencial', label: 'Gerencial' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'rh', label: 'RH' },
  { value: 'outros', label: 'Outros' },
];

const providerLabels = {
  power_bi: 'Power BI',
  data_studio: 'Data Studio',
  other: 'Nao identificado',
};

const detectReportProvider = (embedCode = '') => {
  const normalizedCode = String(embedCode).toLowerCase();

  if (normalizedCode.includes('app.powerbi.com') || normalizedCode.includes('powerbi')) {
    return 'power_bi';
  }

  if (
    normalizedCode.includes('datastudio.google.com') ||
    normalizedCode.includes('lookerstudio.google.com') ||
    normalizedCode.includes('data studio') ||
    normalizedCode.includes('looker studio')
  ) {
    return 'data_studio';
  }

  return 'other';
};

export default function ReportForm({ report, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    embed_code: '',
    unit_id: '',
    unit_name: '',
    category: '',
    active: true,
  });

  const detectedProvider = detectReportProvider(form.embed_code);

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
    mutationFn: (data) => (report ? dataClient.entities.Report.update(report.id, data) : dataClient.entities.Report.create(data)),
    onSuccess: onSaved,
  });

  const handleUnitChange = (unitId) => {
    const unit = units.find((u) => u.id === unitId);
    setForm((current) => ({ ...current, unit_id: unitId, unit_name: unit?.name || '' }));
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        saveMutation.mutate(form);
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest">Titulo *</Label>
        <Input
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          required
          style={{ borderRadius: 2 }}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest">Descricao</Label>
        <Input
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          style={{ borderRadius: 2 }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-widest">Unidade</Label>
          <Select value={form.unit_id} onValueChange={handleUnitChange}>
            <SelectTrigger style={{ borderRadius: 2 }}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-widest">Categoria</Label>
          <Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}>
            <SelectTrigger style={{ borderRadius: 2 }}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest">Codigo embed *</Label>
        <Textarea
          value={form.embed_code}
          onChange={(event) => setForm((current) => ({ ...current, embed_code: event.target.value }))}
          placeholder='<iframe title="..." src="https://app.powerbi.com/..." frameborder="0" allowFullScreen></iframe>'
          rows={4}
          required
          style={{ borderRadius: 2, fontFamily: 'monospace', fontSize: 12 }}
        />
        <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider" style={{ color: '#999' }}>
          <p>Cole o iframe completo do Power BI ou Data Studio</p>
          <span
            className="px-2 py-0.5 font-black tracking-widest"
            style={{
              background: detectedProvider === 'power_bi' ? '#141414' : detectedProvider === 'data_studio' ? '#f2f2f2' : '#f7f7f7',
              color: '#141414',
            }}
          >
            {providerLabels[detectedProvider]}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={form.active} onCheckedChange={(value) => setForm((current) => ({ ...current, active: value }))} />
        <Label className="text-xs font-semibold">Relatorio ativo</Label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-xs font-black uppercase tracking-widest border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
          style={{ background: '#E30613' }}
        >
          {saveMutation.isPending ? 'Salvando...' : 'Salvar Relatorio'}
        </button>
      </div>
    </form>
  );
}
