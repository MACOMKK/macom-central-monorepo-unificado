import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { FileSearch, History, Search } from 'lucide-react';

import { dataClient } from '@/api/dataClient';
import AdminGuard from '@/components/admin/AdminGuard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@macom/ui';

const entityLabels = {
  relatorios: 'Relatórios',
  permissoes_relatorios: 'Permissões',
  acessos_usuario_sistema: 'Acessos',
  colaboradores: 'Colaboradores',
};

entityLabels.relatorios_unidades = 'Unidades do relatorio';
entityLabels.avisos_relatorios = 'Avisos';

const actionLabels = {
  create: 'Criacao',
  update: 'Edicao',
  delete: 'Exclusao',
};

const filterableEntities = [
  'relatorios',
  'relatorios_unidades',
  'permissoes_relatorios',
  'avisos_relatorios',
];

const hiddenLogFields = new Set(['updated_at', 'created_at', 'criado_em', 'atualizado_em']);
const PAGE_SIZE = 50;

const formatDateTime = (value) => {
  if (!value) return '-';

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatJson = (value) => JSON.stringify(value ?? {}, null, 2);

const normalizeValue = (value) => {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const formatValue = (value) => {
  if (value == null || value === '') return 'Vazio';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.length ? JSON.stringify(value) : '[]';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const getChangedFields = (before, after) => {
  const left = before && typeof before === 'object' ? before : {};
  const right = after && typeof after === 'object' ? after : {};
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();

  return keys
    .filter((key) => !hiddenLogFields.has(key))
    .filter((key) => normalizeValue(left[key]) !== normalizeValue(right[key]))
    .map((key) => ({
      field: key,
      before: left[key],
      after: right[key],
    }));
};

const getVisibleFields = (log) => {
  if (log.action === 'update') {
    return getChangedFields(log.before, log.after);
  }

  const source = log.action === 'delete' ? log.before : log.after;
  const payload = source && typeof source === 'object' ? source : {};

  return Object.keys(payload)
    .filter((key) => !hiddenLogFields.has(key))
    .sort()
    .map((key) => ({
      field: key,
      before: log.action === 'delete' ? payload[key] : null,
      after: log.action === 'create' ? payload[key] : null,
    }));
};

const getLogCollaboratorId = (log) => {
  if (log.metadata?.colaborador_id_afetado) return log.metadata.colaborador_id_afetado;
  if (log.after?.colaborador_id || log.before?.colaborador_id) {
    return log.after?.colaborador_id || log.before?.colaborador_id;
  }
  if (log.entity === 'colaboradores') {
    return log.after?.id || log.before?.id || null;
  }
  return null;
};

const getLogReportId = (log) =>
  log.metadata?.relatorio_id ||
  log.after?.relatorio_id ||
  log.before?.relatorio_id ||
  log.after?.id ||
  log.before?.id ||
  null;

const getAffectedLabel = (log, collaboratorsById = new Map(), reportsById = new Map()) => {
  const collaboratorId = getLogCollaboratorId(log);
  const collaborator = collaboratorId ? collaboratorsById.get(collaboratorId) : null;
  const reportId = getLogReportId(log);
  const report = reportId ? reportsById.get(reportId) : null;
  const affectedName = log.metadata?.colaborador_nome_afetado || collaborator?.full_name;
  const affectedEmail = log.metadata?.colaborador_email_afetado || collaborator?.email;
  const reportTitle = log.metadata?.relatorio_titulo || report?.title;
  const noticeTitle = log.metadata?.aviso_titulo;

  if (affectedEmail) return affectedEmail;
  if (affectedName) return affectedName;
  if (reportTitle) return reportTitle;
  if (noticeTitle) return noticeTitle;
  if (collaboratorId) return String(collaboratorId);
  if (reportId) return String(reportId);
  return '-';
};

const getAffectedName = (log, collaboratorsById = new Map()) => {
  const collaboratorId = getLogCollaboratorId(log);
  const collaborator = collaboratorId ? collaboratorsById.get(collaboratorId) : null;
  return log.metadata?.colaborador_nome_afetado || collaborator?.full_name || null;
};

const getContextLabel = (log, _collaboratorsById = new Map(), reportsById = new Map()) => {
  if (log.entity === 'acessos_usuario_sistema') {
    const systemName = log.metadata?.system_name;
    const systemSlug = log.metadata?.system_slug;
    const previousStatus = log.metadata?.status_anterior;
    const nextStatus = log.metadata?.status_novo;
    const fromLevel = log.metadata?.nivel_acesso_anterior;
    const toLevel = log.metadata?.nivel_acesso_novo;

    if (previousStatus !== null && previousStatus !== undefined && nextStatus !== null && nextStatus !== undefined) {
      const fromLabel = previousStatus ? 'Liberado' : 'Bloqueado';
      const toLabel = nextStatus ? 'Liberado' : 'Bloqueado';
      return `${systemName || systemSlug || 'Sistema'}: ${fromLabel} -> ${toLabel}`;
    }

    if (fromLevel || toLevel) {
      return `${systemName || systemSlug || 'Sistema'}: ${fromLevel || '-'} -> ${toLevel || '-'}`;
    }

    return systemName || systemSlug || '-';
  }

  if (log.entity === 'permissoes_relatorios') {
    const reportId = getLogReportId(log);
    const report = reportId ? reportsById.get(reportId) : null;
    return log.metadata?.relatorio_titulo || report?.title || 'Permissao de relatorio';
  }

  if (log.entity === 'relatorios') {
    const reportId = getLogReportId(log);
    const report = reportId ? reportsById.get(reportId) : null;
    return log.metadata?.relatorio_titulo || report?.title || getLogSummary(log);
  }

  if (log.entity === 'avisos_relatorios') {
    return log.metadata?.aviso_titulo || log.metadata?.relatorio_titulo || getLogSummary(log);
  }

  return getLogSummary(log);
};

const getLogSummary = (log) => {
  const fields = getVisibleFields(log);

  if (log.action === 'update') {
    if (!fields.length) return 'Sem diferencas detectadas';
    const preview = fields.slice(0, 3).map((item) => item.field).join(', ');
    return `${fields.length} campo(s): ${preview}${fields.length > 3 ? '...' : ''}`;
  }

  if (log.action === 'create') {
    return `${fields.length} campo(s) definidos`;
  }

  if (log.action === 'delete') {
    return `${fields.length} campo(s) removidos`;
  }

  return '-';
};

export default function AuditLogs() {
  const { user } = useOutletContext();
  const [search, setSearch] = useState('');
  const [activeEntity, setActiveEntity] = useState('all');
  const [activeAction, setActiveAction] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, activeEntity, activeAction],
    queryFn: () =>
      dataClient.entities.AuditLog.listPage({
        sort: '-created_at',
        page,
        pageSize: PAGE_SIZE,
        filters: {
          entity: activeEntity,
          action: activeAction,
        },
      }),
  });
  const { data: lookupData } = useQuery({
    queryKey: ['audit-logs-lookups'],
    queryFn: async () => {
      const [collaborators, reports] = await Promise.all([
        dataClient.entities.User.list(),
        dataClient.entities.Report.list(),
      ]);

      return {
        collaboratorsById: new Map(collaborators.map((item) => [item.id, item])),
        reportsById: new Map(reports.map((item) => [item.id, item])),
      };
    },
    staleTime: 60_000,
  });
  const logs = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const collaboratorsById = lookupData?.collaboratorsById || new Map();
  const reportsById = lookupData?.reportsById || new Map();

  const entities = useMemo(
    () => ['all', ...filterableEntities],
    [],
  );
  const actions = useMemo(
    () => ['all', ...Object.keys(actionLabels)],
    [],
  );

  useEffect(() => {
    setPage(1);
  }, [activeEntity, activeAction]);

  const filteredLogs = logs.filter((log) => {
    const normalizedSearch = search.toLowerCase();
    const matchSearch =
      !normalizedSearch ||
      log.actor_email?.toLowerCase().includes(normalizedSearch) ||
      getAffectedLabel(log, collaboratorsById, reportsById).toLowerCase().includes(normalizedSearch) ||
      getContextLabel(log, collaboratorsById, reportsById).toLowerCase().includes(normalizedSearch) ||
      String(log.metadata?.colaborador_email_afetado || '').toLowerCase().includes(normalizedSearch) ||
      String(log.metadata?.colaborador_nome_afetado || '').toLowerCase().includes(normalizedSearch) ||
      String(log.metadata?.relatorio_titulo || '').toLowerCase().includes(normalizedSearch) ||
      String(log.metadata?.aviso_titulo || '').toLowerCase().includes(normalizedSearch) ||
      String(log.metadata?.system_slug || '').toLowerCase().includes(normalizedSearch);
    return matchSearch;
  });

  const selectedLogFields = selectedLog ? getVisibleFields(selectedLog) : [];
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

  return (
    <AdminGuard user={user}>
      <div className="min-h-screen" style={{ background: '#f2f2f2' }}>
        <div style={{ background: '#141414' }} className="px-6 lg:px-10 py-8">
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest" style={{ color: '#E30613' }}>
            Administração
          </p>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">Logs</h1>
          <p className="mt-1 text-xs" style={{ color: '#666' }}>
            Auditoria das alteracoes realizadas no sistema de relatorios
          </p>
        </div>

        <div className="px-6 lg:px-10 py-6">
          <div className="mb-4 flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative w-full lg:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#999' }} />
                <Input
                  placeholder="Buscar por responsavel, afetado ou sistema..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9 bg-white"
                  style={{ borderRadius: 2 }}
                />
              </div>

              <div className="grid w-full gap-3 md:grid-cols-2 lg:max-w-2xl">
                <Select
                  value={activeEntity}
                  onValueChange={(value) => {
                    setActiveEntity(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="bg-white" style={{ borderRadius: 2 }}>
                    <SelectValue placeholder="Filtrar entidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {entity === 'all' ? 'Todas as entidades' : entityLabels[entity] || entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={activeAction}
                  onValueChange={(value) => {
                    setActiveAction(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="bg-white" style={{ borderRadius: 2 }}>
                    <SelectValue placeholder="Filtrar acao" />
                  </SelectTrigger>
                  <SelectContent>
                    {actions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action === 'all' ? 'Todas as acoes' : actionLabels[action] || action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="overflow-hidden bg-white" style={{ borderTop: '3px solid #E30613' }}>
            <Table>
              <TableHeader>
                <TableRow style={{ background: '#fafafa' }}>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Data</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Responsavel</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Afetado</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Entidade</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Acao</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Contexto</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm" style={{ color: '#999' }}>
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center">
                      <History className="mx-auto mb-2 h-10 w-10" style={{ color: '#ddd' }} />
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#bbb' }}>
                        Nenhum log encontrado
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="transition-colors hover:bg-gray-50">
                      <TableCell className="text-xs" style={{ color: '#666' }}>
                        {formatDateTime(log.created_at)}
                      </TableCell>
                      <TableCell className="text-xs" style={{ color: '#666' }}>
                        {log.actor_email || '-'}
                      </TableCell>
                      <TableCell className="max-w-[260px] text-xs" style={{ color: '#666' }}>
                        <span className="line-clamp-2">{getAffectedLabel(log, collaboratorsById, reportsById)}</span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                          style={{ background: '#141414', color: '#fff' }}
                        >
                          {entityLabels[log.entity] || log.entity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                          style={{
                            background: log.action === 'delete' ? '#f4d7d9' : log.action === 'create' ? '#e8f3ea' : '#f2f2f2',
                            color: log.action === 'delete' ? '#8a1c24' : log.action === 'create' ? '#1e5b2a' : '#141414',
                          }}
                        >
                          {actionLabels[log.action] || log.action}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs text-xs" style={{ color: '#666' }}>
                        {getContextLabel(log, collaboratorsById, reportsById)}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors"
                          style={{ color: '#141414' }}
                        >
                          <FileSearch className="h-3.5 w-3.5" />
                          Ver
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs" style={{ color: '#666' }}>
              {total === 0
                ? 'Nenhum registro nesta consulta.'
                : `Mostrando ${pageStart}-${pageEnd} de ${total} logs`}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                style={{ border: '1px solid #ddd', background: '#fff', color: '#141414' }}
              >
                Anterior
              </button>
              <span className="text-xs font-semibold" style={{ color: '#141414' }}>
                Pagina {page} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                style={{ border: '1px solid #ddd', background: '#fff', color: '#141414' }}
              >
                Proxima
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-wider">Detalhes do Log</DialogTitle>
          </DialogHeader>

          {selectedLog ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded border bg-slate-50 p-3 text-sm">
                  <p><strong>Data:</strong> {formatDateTime(selectedLog.created_at)}</p>
                  <p><strong>Responsavel:</strong> {selectedLog.actor_email || '-'}</p>
                  <p><strong>Afetado:</strong> {getAffectedLabel(selectedLog, collaboratorsById, reportsById)}</p>
                  <p><strong>Nome do afetado:</strong> {getAffectedName(selectedLog, collaboratorsById) || '-'}</p>
                  <p><strong>Entidade:</strong> {entityLabels[selectedLog.entity] || selectedLog.entity}</p>
                  <p><strong>Acao:</strong> {actionLabels[selectedLog.action] || selectedLog.action}</p>
                </div>
                <div className="rounded border bg-slate-50 p-3 text-sm">
                  <p><strong>Contexto:</strong> {getContextLabel(selectedLog, collaboratorsById, reportsById)}</p>
                  <p><strong>Sistema:</strong> {selectedLog.metadata?.system_name || selectedLog.metadata?.system_slug || '-'}</p>
                  <p><strong>Escopo:</strong> {selectedLog.metadata?.access_scope || '-'}</p>
                  <p><strong>Actor ID:</strong> {selectedLog.actor_collaborator_id || '-'}</p>
                </div>
              </div>

              <div className="rounded border bg-white">
                <div className="border-b px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#666' }}>
                    O que mudou
                  </p>
                  <p className="mt-1 text-sm" style={{ color: '#141414' }}>
                    {getLogSummary(selectedLog)}
                  </p>
                </div>

                {selectedLogFields.length ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead style={{ background: '#fafafa' }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Campo</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Antes</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Depois</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLogFields.map((item) => (
                          <tr key={item.field} className="border-t align-top">
                            <td className="px-4 py-3 font-mono text-xs" style={{ color: '#141414' }}>
                              {item.field}
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: '#666' }}>
                              {formatValue(item.before)}
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: '#666' }}>
                              {formatValue(item.after)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-4 py-5 text-sm" style={{ color: '#666' }}>
                    Nenhuma diferenca estruturada foi encontrada para este registro.
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest" style={{ color: '#666' }}>
                    JSON antes
                  </p>
                  <pre className="max-h-72 overflow-auto rounded border bg-slate-950 p-3 text-xs text-slate-100">
                    {formatJson(selectedLog.before)}
                  </pre>
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest" style={{ color: '#666' }}>
                    JSON depois
                  </p>
                  <pre className="max-h-72 overflow-auto rounded border bg-slate-950 p-3 text-xs text-slate-100">
                    {formatJson(selectedLog.after)}
                  </pre>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminGuard>
  );
}
