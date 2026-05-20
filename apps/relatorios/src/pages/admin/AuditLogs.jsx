import React, { useMemo, useState } from 'react';
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
  relatorios: 'Relatorios',
  permissoes_relatorios: 'Permissoes',
  acessos_usuario_sistema: 'Acessos',
  colaboradores: 'Colaboradores',
};

const actionLabels = {
  create: 'Criacao',
  update: 'Edicao',
  delete: 'Exclusao',
};

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
    .sort()
    .map((key) => ({
      field: key,
      before: log.action === 'delete' ? payload[key] : null,
      after: log.action === 'create' ? payload[key] : null,
    }));
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

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => dataClient.entities.AuditLog.list('-created_at'),
  });

  const entities = useMemo(
    () => ['all', ...new Set(logs.map((log) => log.entity).filter(Boolean))],
    [logs],
  );
  const actions = useMemo(
    () => ['all', ...new Set(logs.map((log) => log.action).filter(Boolean))],
    [logs],
  );

  const filteredLogs = logs.filter((log) => {
    const normalizedSearch = search.toLowerCase();
    const matchSearch =
      !normalizedSearch ||
      log.actor_email?.toLowerCase().includes(normalizedSearch) ||
      log.record_id?.toLowerCase().includes(normalizedSearch) ||
      String(log.metadata?.system_slug || '').toLowerCase().includes(normalizedSearch);
    const matchEntity = activeEntity === 'all' || log.entity === activeEntity;
    const matchAction = activeAction === 'all' || log.action === activeAction;
    return matchSearch && matchEntity && matchAction;
  });

  const selectedLogFields = selectedLog ? getVisibleFields(selectedLog) : [];

  return (
    <AdminGuard user={user}>
      <div className="min-h-screen" style={{ background: '#f2f2f2' }}>
        <div style={{ background: '#141414' }} className="px-6 lg:px-10 py-8">
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest" style={{ color: '#E30613' }}>
            Administracao
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
                  placeholder="Buscar por usuario, registro ou sistema..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9 bg-white"
                  style={{ borderRadius: 2 }}
                />
              </div>

              <div className="grid w-full gap-3 md:grid-cols-2 lg:max-w-2xl">
                <Select value={activeEntity} onValueChange={setActiveEntity}>
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

                <Select value={activeAction} onValueChange={setActiveAction}>
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
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Usuario</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Entidade</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Acao</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Registro</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Alterado</TableHead>
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
                      <TableCell className="text-xs font-mono" style={{ color: '#666' }}>
                        {log.record_id || '-'}
                      </TableCell>
                      <TableCell className="max-w-xs text-xs" style={{ color: '#666' }}>
                        {getLogSummary(log)}
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
        </div>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-wider">Detalhes do Log</DialogTitle>
          </DialogHeader>

          {selectedLog ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded border bg-slate-50 p-3 text-sm">
                  <p><strong>Data:</strong> {formatDateTime(selectedLog.created_at)}</p>
                  <p><strong>Usuario:</strong> {selectedLog.actor_email || '-'}</p>
                  <p><strong>Entidade:</strong> {entityLabels[selectedLog.entity] || selectedLog.entity}</p>
                  <p><strong>Acao:</strong> {actionLabels[selectedLog.action] || selectedLog.action}</p>
                </div>
                <div className="rounded border bg-slate-50 p-3 text-sm">
                  <p><strong>Registro:</strong> {selectedLog.record_id || '-'}</p>
                  <p><strong>Sistema:</strong> {selectedLog.metadata?.system_slug || '-'}</p>
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
