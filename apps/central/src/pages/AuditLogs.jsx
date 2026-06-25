import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSearch, History, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { catalogApi } from '@/lib/catalogApi';
import { systemAccessApi } from '@/lib/systemAccessApi';

const PAGE_SIZE = 25;

const entityLabels = {
  colaboradores: 'Colaboradores',
  acessos_usuario_sistema: 'Acessos Sistemas',
  departamentos: 'Departamentos',
  unidades: 'Unidades',
  ativos: 'Ativos',
  contatos: 'Contatos',
  linhas_corporativas: 'Linhas Corporativas',
  infra_estrutura: 'Infraestrutura',
  termos_posse: 'Termos de Posse',
};

const actionLabels = {
  criar: 'Criar',
  atualizar: 'Atualizar',
  excluir: 'Excluir',
  redefinir_senha: 'Redefinir senha',
  desvincular: 'Desvincular',
  importar: 'Importar',
};

const hiddenLogFields = new Set(['atualizado_em']);
const fieldLabels = {
  nome: 'Nome',
  funcao: 'Funcao',
  status: 'Status',
  email: 'Email',
  telefone: 'Telefone',
  cpf: 'CPF',
  cnpj: 'CNPJ',
  ativo: 'Ativo',
  descricao: 'Descricao',
  categoria: 'Categoria',
  tipo: 'Tipo',
  numero: 'Numero',
  operadora: 'Operadora',
  plano: 'Plano',
  iccid: 'ICCID',
  marca: 'Marca',
  modelo: 'Modelo',
  patrimonio: 'Patrimonio',
  estado: 'Estado',
  numero_serie: 'Numero de serie',
  observacao: 'Observacao',
  observacoes: 'Observacoes',
  colaborador_nome: 'Colaborador',
  responsavel_colaborador_id: 'Responsavel',
  usuario_id: 'Usuario',
  colaborador_id: 'Colaborador',
  departamento_id: 'Departamento',
  unidade_id: 'Unidade',
  sistema_id: 'Sistema',
  ativo_id: 'Ativo',
};

function humanizeFieldName(field) {
  return String(field || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getAffectedLabel(log) {
  const affectedEmail = log.colaborador_email_afetado || log.metadados?.colaborador_email_afetado;
  const affectedId = log.metadados?.colaborador_id_afetado;
  const affectedAssetName = log.metadados?.ativo_nome_afetado;
  const affectedAssetId = log.metadados?.ativo_id_afetado;
  const affectedCorporateLineName = log.metadados?.linha_corporativa_nome_afetada;
  const affectedCorporateLineNumber = log.metadados?.linha_corporativa_numero_afetado;
  const affectedCorporateLineId = log.metadados?.linha_corporativa_id_afetada;

  if (affectedEmail) return affectedEmail;
  if (affectedAssetName) return String(affectedAssetName);
  if (affectedCorporateLineName && affectedCorporateLineNumber) {
    return `${affectedCorporateLineName} (${affectedCorporateLineNumber})`;
  }
  if (affectedCorporateLineName) return String(affectedCorporateLineName);
  if (affectedCorporateLineNumber) return String(affectedCorporateLineNumber);
  if (affectedId) return String(affectedId);
  if (affectedAssetId) return String(affectedAssetId);
  if (affectedCorporateLineId) return String(affectedCorporateLineId);

  return '-';
}

function getAffectedName(log) {
  return log.colaborador_nome_afetado || log.metadados?.colaborador_nome_afetado || null;
}

function getContextLabel(log) {
  if (log.entidade === 'ativos') {
    const assetName = log.metadados?.ativo_nome_afetado;
    const assetPatrimony = log.metadados?.patrimonio_afetado;
    const previousStatus = log.metadados?.status_anterior;
    const nextStatus = log.metadados?.status_novo;
    const statusChanged = previousStatus !== null && previousStatus !== undefined && nextStatus !== null && nextStatus !== undefined;

    if (statusChanged && previousStatus !== nextStatus) {
      return `${assetName || 'Ativo'}: ${previousStatus} -> ${nextStatus}`;
    }

    if (assetName && assetPatrimony) {
      return `${assetName} (${assetPatrimony})`;
    }

    if (assetName) {
      return String(assetName);
    }
  }

  if (log.entidade === 'linhas_corporativas') {
    const lineName = log.metadados?.linha_corporativa_nome_afetada;
    const lineNumber = log.metadados?.linha_corporativa_numero_afetado;
    const previousStatus = log.metadados?.status_anterior;
    const nextStatus = log.metadados?.status_novo;
    const statusChanged = previousStatus !== null && previousStatus !== undefined && nextStatus !== null && nextStatus !== undefined;

    if (statusChanged && previousStatus !== nextStatus) {
      return `${lineName || lineNumber || 'Linha'}: ${previousStatus} -> ${nextStatus}`;
    }

    if (lineName && lineNumber) {
      return `${lineName} (${lineNumber})`;
    }

    if (lineNumber) {
      return String(lineNumber);
    }

    if (lineName) {
      return String(lineName);
    }
  }

  if (log.entidade === 'acessos_usuario_sistema') {
    const systemName = log.metadados?.sistema_nome;
    const systemSlug = log.metadados?.sistema_slug;
    const previousStatus = log.metadados?.status_anterior;
    const nextStatus = log.metadados?.status_novo;
    const statusChanged = previousStatus !== null && previousStatus !== undefined && nextStatus !== null && nextStatus !== undefined;

    if (statusChanged) {
      const fromLabel = previousStatus ? 'Liberado' : 'Bloqueado';
      const toLabel = nextStatus ? 'Liberado' : 'Bloqueado';
      return `${systemName || systemSlug || 'Sistema'}: ${fromLabel} -> ${toLabel}`;
    }

    if (systemName || systemSlug) {
      return systemName || systemSlug;
    }
  }

  return getLogSummary(log);
}

function formatDateTime(value) {
  if (!value) return '-';

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function normalizeValue(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatValue(value) {
  if (value == null || value === '') return 'Vazio';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getFieldLabel(field) {
  return fieldLabels[field] || humanizeFieldName(field);
}

function resolveForeignKeyValue(field, value, lookups, log) {
  if (value == null || value === '') return value;

  if (field === 'usuario_id' || field === 'colaborador_id') {
    const collaborator = lookups.collaboratorsById.get(String(value));
    return collaborator?.nome || collaborator?.email || value;
  }

  if (field === 'departamento_id') {
    const department = lookups.departmentsById.get(String(value));
    return department?.nome || value;
  }

  if (field === 'unidade_id') {
    const unit = lookups.unitsById.get(String(value));
    return unit?.nome || value;
  }

  if (field === 'ativo_id') {
    const asset = lookups.assetsById.get(String(value));
    if (!asset) return value;
    if (asset.nome && asset.patrimonio) {
      return `${asset.nome} (${asset.patrimonio})`;
    }

    return asset.nome || asset.patrimonio || value;
  }

  if (field === 'sistema_id') {
    if (
      log?.metadados?.sistema_id &&
      String(log.metadados.sistema_id) === String(value)
    ) {
      return log.metadados?.sistema_nome || log.metadados?.sistema_slug || value;
    }

    const system = lookups.systemsById.get(String(value));
    return system?.nome || system?.slug || value;
  }

  return value;
}

function formatJson(value) {
  return JSON.stringify(value ?? {}, null, 2);
}

function getChangedFields(before, after) {
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
}

function getVisibleFields(log) {
  if (log.acao === 'atualizar') {
    return getChangedFields(log.antes, log.depois);
  }

  const source = log.acao === 'excluir' ? log.antes : log.depois;
  const payload = source && typeof source === 'object' ? source : {};

  return Object.keys(payload)
    .filter((key) => !hiddenLogFields.has(key))
    .sort()
    .map((key) => ({
      field: key,
      before: log.acao === 'excluir' ? payload[key] : null,
      after: log.acao === 'criar' ? payload[key] : null,
    }));
}

function getLogSummary(log) {
  const fields = getVisibleFields(log);

  if (log.acao === 'atualizar') {
    if (!fields.length) return 'Sem alteracoes detectadas';
    const preview = fields.slice(0, 3).map((item) => getFieldLabel(item.field)).join(', ');
    return `${fields.length} campo(s): ${preview}${fields.length > 3 ? '...' : ''}`;
  }

  if (log.acao === 'criar') {
    return `${fields.length} campo(s) definidos`;
  }

  if (log.acao === 'excluir') {
    return `${fields.length} campo(s) removidos`;
  }

  if (log.acao === 'desvincular') {
    return 'Acao de desvinculacao registrada';
  }

  if (log.acao === 'redefinir_senha') {
    return 'Senha redefinida';
  }

  if (log.acao === 'importar') {
    return 'Importacao registrada';
  }

  return '-';
}

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [activeEntity, setActiveEntity] = useState('all');
  const [activeAction, setActiveAction] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['logs_auditoria', page, activeEntity, activeAction],
    queryFn: () =>
      catalogApi.logs_auditoria.list({
        filters: {
          entidade: activeEntity === 'all' ? undefined : activeEntity,
          acao: activeAction === 'all' ? undefined : activeAction,
        },
        limit: PAGE_SIZE,
        offset: Math.max(0, (page - 1) * PAGE_SIZE),
      }),
  });
  const logs = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { data: collaborators = [] } = useQuery({
    queryKey: ['colaboradores', 'logs_lookup'],
    queryFn: catalogApi.colaboradores.list,
  });
  const { data: departments = [] } = useQuery({
    queryKey: ['departamentos', 'logs_lookup'],
    queryFn: catalogApi.departamentos.list,
  });
  const { data: units = [] } = useQuery({
    queryKey: ['unidades', 'logs_lookup'],
    queryFn: catalogApi.unidades.list,
  });
  const { data: assets = [] } = useQuery({
    queryKey: ['ativos', 'logs_lookup'],
    queryFn: catalogApi.ativos.list,
  });
  const { data: systems = [] } = useQuery({
    queryKey: ['sistemas', 'logs_lookup'],
    queryFn: systemAccessApi.systems.list,
  });

  const collaboratorsById = useMemo(
    () => new Map(collaborators.map((collaborator) => [collaborator.id, collaborator])),
    [collaborators],
  );
  const departmentsById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments],
  );
  const unitsById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit])),
    [units],
  );
  const assetsById = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  );
  const systemsById = useMemo(
    () => new Map(systems.map((system) => [system.id, system])),
    [systems],
  );

  const hydratedLogs = useMemo(
    () =>
      logs.map((log) => {
        const affectedId = log.metadados?.colaborador_id_afetado;
        const affectedCollaborator = affectedId ? collaboratorsById.get(affectedId) : null;

        return {
          ...log,
          colaborador_nome_afetado: log.colaborador_nome_afetado || affectedCollaborator?.nome || null,
          colaborador_email_afetado: log.colaborador_email_afetado || affectedCollaborator?.email || null,
        };
      }),
    [collaboratorsById, logs],
  );

  const entityOptions = useMemo(() => ['all', ...Object.keys(entityLabels)], []);
  const actionOptions = useMemo(() => ['all', ...Object.keys(actionLabels)], []);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredLogs = useMemo(() => (
    hydratedLogs.filter((log) => {
      const matchesSearch =
        !normalizedSearch ||
        String(log.responsavel_email || '').toLowerCase().includes(normalizedSearch) ||
        String(log.metadados?.colaborador_nome_afetado || '').toLowerCase().includes(normalizedSearch) ||
        String(log.metadados?.colaborador_email_afetado || '').toLowerCase().includes(normalizedSearch) ||
        String(log.colaborador_nome_afetado || '').toLowerCase().includes(normalizedSearch) ||
        String(log.colaborador_email_afetado || '').toLowerCase().includes(normalizedSearch) ||
        String(log.entidade || '').toLowerCase().includes(normalizedSearch) ||
        String(log.metadados?.sistema_slug || '').toLowerCase().includes(normalizedSearch) ||
        String(log.metadados?.ativo_nome_afetado || '').toLowerCase().includes(normalizedSearch) ||
        String(log.metadados?.patrimonio_afetado || '').toLowerCase().includes(normalizedSearch) ||
        String(log.metadados?.linha_corporativa_nome_afetada || '').toLowerCase().includes(normalizedSearch) ||
        String(log.metadados?.linha_corporativa_numero_afetado || '').toLowerCase().includes(normalizedSearch);

      return matchesSearch;
    })
  ), [hydratedLogs, normalizedSearch]);

  const selectedLogFields = useMemo(() => {
    if (!selectedLog) return [];

    const lookups = {
      collaboratorsById,
      departmentsById,
      unitsById,
      assetsById,
      systemsById,
    };

    return getVisibleFields(selectedLog).map((item) => ({
      ...item,
      fieldLabel: getFieldLabel(item.field),
      beforeDisplay: formatValue(resolveForeignKeyValue(item.field, item.before, lookups, selectedLog)),
      afterDisplay: formatValue(resolveForeignKeyValue(item.field, item.after, lookups, selectedLog)),
    }));
  }, [assetsById, collaboratorsById, departmentsById, selectedLog, systemsById, unitsById]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Governanca</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Logs de Auditoria</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Consulte as alteracoes administrativas registradas na central.
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground">Filtros</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Input
            placeholder="Buscar por responsavel, afetado, entidade ou sistema..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <Select value={activeEntity} onValueChange={(value) => {
            setActiveEntity(value);
            setPage(1);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar entidade" />
            </SelectTrigger>
            <SelectContent>
              {entityOptions.map((entity) => (
                <SelectItem key={entity} value={entity}>
                  {entity === 'all' ? 'Todas as entidades' : entityLabels[entity] || entity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={activeAction} onValueChange={(value) => {
            setActiveAction(value);
            setPage(1);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar acao" />
            </SelectTrigger>
            <SelectContent>
              {actionOptions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action === 'all' ? 'Todas as acoes' : actionLabels[action] || action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Responsavel</TableHead>
              <TableHead>Afetado</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Acao</TableHead>
              <TableHead>Contexto</TableHead>
              <TableHead className="text-right">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Carregando logs...
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <History className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhum log encontrado.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(log.criado_em)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.responsavel_email || '-'}
                  </TableCell>
                  <TableCell className="max-w-[260px] text-xs text-muted-foreground">
                    <span className="line-clamp-2">{getAffectedLabel(log)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-accent px-2 py-1 text-[11px] font-semibold text-foreground">
                      {entityLabels[log.entidade] || log.entidade}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="rounded border px-2 py-1 text-[11px] font-semibold text-foreground">
                      {actionLabels[log.acao] || log.acao}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs text-xs text-muted-foreground">
                    {getContextLabel(log)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                      <FileSearch className="h-4 w-4" />
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? `Mostrando ${Math.max(1, (page - 1) * PAGE_SIZE + 1)}-${Math.min(page * PAGE_SIZE, total)} de ${total} log(s)`
            : 'Nenhum log encontrado'}
        </p>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Proxima
          </Button>
        </div>
      </div>

      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-wider">Detalhes do Log</DialogTitle>
          </DialogHeader>

          {selectedLog ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded border bg-slate-50 p-3 text-sm">
                  <p><strong>Data:</strong> {formatDateTime(selectedLog.criado_em)}</p>
                  <p><strong>Responsavel:</strong> {selectedLog.responsavel_email || '-'}</p>
                  <p><strong>Afetado:</strong> {getAffectedLabel(selectedLog)}</p>
                  <p><strong>Nome do afetado:</strong> {getAffectedName(selectedLog) || '-'}</p>
                  <p><strong>Entidade:</strong> {entityLabels[selectedLog.entidade] || selectedLog.entidade}</p>
                  <p><strong>Acao:</strong> {actionLabels[selectedLog.acao] || selectedLog.acao}</p>
                </div>
                <div className="rounded border bg-slate-50 p-3 text-sm">
                  <p><strong>Contexto:</strong> {getContextLabel(selectedLog)}</p>
                  <p><strong>Sistema:</strong> {selectedLog.metadados?.sistema_nome || selectedLog.metadados?.sistema_slug || '-'}</p>
                  <p><strong>Escopo:</strong> {selectedLog.metadados?.scope || '-'}</p>
                  <p><strong>Responsavel ID:</strong> {selectedLog.responsavel_colaborador_id || '-'}</p>
                </div>
              </div>

              <div className="rounded border bg-white">
                <div className="border-b px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    O que mudou
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {getLogSummary(selectedLog)}
                  </p>
                </div>

                {selectedLogFields.length ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Campo</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Antes</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Depois</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLogFields.map((item) => (
                          <tr key={item.field} className="border-t align-top">
                            <td className="px-4 py-3 text-xs font-semibold text-foreground">{item.fieldLabel}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{item.beforeDisplay}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{item.afterDisplay}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-4 py-5 text-sm text-muted-foreground">
                    Nenhuma diferenca estruturada foi encontrada para este registro.
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    JSON antes
                  </p>
                  <pre className="max-h-72 overflow-auto rounded border bg-slate-950 p-3 text-xs text-slate-100">
                    {formatJson(selectedLog.antes)}
                  </pre>
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    JSON depois
                  </p>
                  <pre className="max-h-72 overflow-auto rounded border bg-slate-950 p-3 text-xs text-slate-100">
                    {formatJson(selectedLog.depois)}
                  </pre>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
