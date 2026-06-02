import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Save } from 'lucide-react';

import { dataClient } from '@/api/dataClient';
import { Button, Input, Label, Switch, Textarea } from '@macom/ui';

const INITIAL_FORM = {
  title: '',
  message: '',
  active: true,
  required: true,
};

function upsertNotice(notices, notice) {
  if (!notice?.id) return notices;
  const exists = notices.some((item) => item.id === notice.id);
  if (!exists) return [notice, ...notices];
  return notices.map((item) => (item.id === notice.id ? { ...item, ...notice } : item));
}

export default function ReportNoticeForm({ report, user, onSaved, onCancel }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(INITIAL_FORM);

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['report-notice', report?.id],
    queryFn: () => dataClient.entities.ReportNotice.filter({ report_id: report.id }),
    enabled: !!report?.id,
  });

  const currentNotice = useMemo(() => notices[0] || null, [notices]);

  useEffect(() => {
    if (!currentNotice) {
      setForm(INITIAL_FORM);
      return;
    }

    setForm({
      title: currentNotice.title || '',
      message: currentNotice.message || '',
      active: currentNotice.active !== false,
      required: currentNotice.required !== false,
    });
  }, [currentNotice]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const normalizedPayload = {
        report_id: report.id,
        title: form.title.trim(),
        message: form.message.trim(),
        active: form.active,
        required: form.required,
        created_by: user?.id || null,
      };

      if (!normalizedPayload.title || !normalizedPayload.message) {
        throw new Error('Preencha titulo e mensagem do aviso.');
      }

      if (!currentNotice) {
        return dataClient.entities.ReportNotice.create({
          ...normalizedPayload,
          version: 1,
        });
      }

      const hasMeaningfulChange =
        normalizedPayload.title !== (currentNotice.title || '') ||
        normalizedPayload.message !== (currentNotice.message || '') ||
        normalizedPayload.active !== (currentNotice.active !== false) ||
        normalizedPayload.required !== (currentNotice.required !== false);

      return dataClient.entities.ReportNotice.update(currentNotice.id, {
        ...normalizedPayload,
        version: hasMeaningfulChange ? (currentNotice.version || 1) + 1 : (currentNotice.version || 1),
      });
    },
    onSuccess: async (savedNotice) => {
      queryClient.setQueryData(['report-notice', report?.id], (old = []) => (
        Array.isArray(old) ? upsertNotice(old, savedNotice) : old
      ));
      queryClient.setQueryData(['report-notice-active', report?.id, user?.id], (old = []) => {
        if (!Array.isArray(old)) return old;
        if (savedNotice?.active === false) return old.filter((notice) => notice.id !== savedNotice.id);
        return upsertNotice(old, savedNotice);
      });
      await queryClient.invalidateQueries({ queryKey: ['report-notice', report?.id] });
      await queryClient.invalidateQueries({ queryKey: ['report-notice-active', report?.id] });
      onSaved?.(savedNotice);
    },
  });

  return (
    <div className="space-y-5">
      <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-[#E30613]/10 p-2">
            <Bell className="h-4 w-4 text-[#E30613]" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{report?.title}</p>
            <p className="mt-1 text-xs text-slate-600">
              Esse aviso sera exibido antes da abertura do relatorio para usuarios com acesso.
            </p>
            {currentNotice ? (
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Versao atual: {currentNotice.version}
              </p>
            ) : (
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Primeiro aviso deste relatorio
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notice-title">Titulo do aviso *</Label>
        <Input
          id="notice-title"
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="Ex.: Atualizacao do indicador de faturamento"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notice-message">Mensagem *</Label>
        <Textarea
          id="notice-message"
          value={form.message}
          onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
          placeholder="Descreva para o usuario o que mudou neste relatorio."
          rows={8}
        />
      </div>

      <div className="grid gap-4 rounded-sm border border-slate-200 p-4 md:grid-cols-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Aviso ativo</p>
            <p className="text-xs text-slate-500">Se desligado, o aviso deixa de aparecer antes do relatorio.</p>
          </div>
          <Switch
            checked={form.active}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, active: Boolean(checked) }))}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Aceite obrigatorio</p>
            <p className="text-xs text-slate-500">Quando ligado, o usuario precisa confirmar para abrir o relatorio.</p>
          </div>
          <Switch
            checked={form.required}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, required: Boolean(checked) }))}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={isLoading || saveMutation.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? 'Salvando...' : currentNotice ? 'Atualizar aviso' : 'Criar aviso'}
        </Button>
      </div>
    </div>
  );
}
