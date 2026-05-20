import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { dataClient } from '@/api/dataClient';
import { Checkbox, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Textarea } from '@macom/ui';

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
    all_units: false,
    unit_ids: [],
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
        all_units: report.all_units === true,
        unit_ids: Array.isArray(report.unit_ids) && report.unit_ids.length
          ? report.unit_ids
          : report.unit_id
            ? [report.unit_id]
            : [],
        category: report.category || '',
        active: report.active !== false,
      });
      return;
    }

    setForm({
      title: '',
      description: '',
      embed_code: '',
      all_units: false,
      unit_ids: [],
      category: '',
      active: true,
    });
  }, [report]);

  const selectedUnits = useMemo(
    () => units.filter((unit) => form.unit_ids.includes(unit.id)),
    [form.unit_ids, units],
  );

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (!data.all_units && data.unit_ids.length === 0) {
        throw new Error('Selecione ao menos uma unidade ou marque todas as unidades.');
      }

      return report ? dataClient.entities.Report.update(report.id, data) : dataClient.entities.Report.create(data);
    },
    onSuccess: onSaved,
  });

  const toggleUnit = (unitId) => {
    setForm((current) => ({
      ...current,
      unit_ids: current.unit_ids.includes(unitId)
        ? current.unit_ids.filter((id) => id !== unitId)
        : [...current.unit_ids, unitId],
    }));
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        saveMutation.mutate(form);
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
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

          <div className="flex items-center gap-3 rounded border p-3" style={{ borderColor: '#e5e5e5' }}>
            <Switch checked={form.active} onCheckedChange={(value) => setForm((current) => ({ ...current, active: value }))} />
            <Label className="text-xs font-semibold">Relatorio ativo</Label>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-3 rounded border p-3" style={{ borderColor: '#e5e5e5' }}>
            <Label className="text-[10px] font-black uppercase tracking-widest">Unidades</Label>

            {!form.all_units ? (
              <div className="space-y-2">
                <div className="space-y-2 rounded border bg-white p-2" style={{ borderColor: '#e5e5e5' }}>
                  <label className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 hover:bg-gray-50">
                    <Switch
                      checked={form.all_units}
                      onCheckedChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          all_units: value,
                          unit_ids: value ? [] : current.unit_ids,
                        }))
                      }
                    />
                    <span className="text-sm font-medium" style={{ color: '#141414' }}>Todas as unidades</span>
                  </label>

                  <div className="grid gap-2 border-t pt-2" style={{ borderColor: '#e5e5e5' }}>
                    {units.map((unit) => (
                      <label key={unit.id} className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-gray-50">
                        <Checkbox
                          checked={form.unit_ids.includes(unit.id)}
                          onCheckedChange={() => toggleUnit(unit.id)}
                        />
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#141414' }}>{unit.name}</p>
                          {unit.city ? <p className="text-xs" style={{ color: '#666' }}>{unit.city}</p> : null}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                {selectedUnits.length ? (
                  <p className="text-xs" style={{ color: '#666' }}>
                    {selectedUnits.length} unidade(s) selecionada(s)
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded border bg-white p-2" style={{ borderColor: '#e5e5e5' }}>
                <label className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 hover:bg-gray-50">
                  <Switch
                    checked={form.all_units}
                    onCheckedChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        all_units: value,
                        unit_ids: value ? [] : current.unit_ids,
                      }))
                    }
                  />
                  <span className="text-sm font-medium" style={{ color: '#141414' }}>Todas as unidades</span>
                </label>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest">Codigo embed *</Label>
            <Textarea
              value={form.embed_code}
              onChange={(event) => setForm((current) => ({ ...current, embed_code: event.target.value }))}
              placeholder='<iframe title="..." src="https://app.powerbi.com/..." frameborder="0" allowFullScreen></iframe>'
              rows={2}
              required
              style={{ borderRadius: 2, fontFamily: 'monospace', fontSize: 12 }}
            />
            <div className="flex items-center justify-end gap-3 text-[10px] uppercase tracking-wider" style={{ color: '#999' }}>
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
        </div>
      </div>

      {saveMutation.error ? (
        <p className="text-xs font-semibold" style={{ color: '#E30613' }}>
          {saveMutation.error.message}
        </p>
      ) : null}

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
