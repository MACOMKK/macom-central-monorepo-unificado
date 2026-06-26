import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSearch, History, Search, ShieldAlert } from 'lucide-react';
import { platformAuditApi } from '@macom/api-client';
import {
  Button,
  Card,
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

function formatJson(value) {
  return JSON.stringify(value ?? {}, null, 2);
}

function getAffectedLabel(log) {
  return (
    log.colaborador_email_afetado ||
    log.metadados?.colaborador_email_afetado ||
    log.metadados?.ativo_nome_afetado ||
    log.metadados?.patrimonio_afetado ||
    log.metadados?.linha_corporativa_nome_afetada ||
    log.metadados?.linha_corporativa_numero_afetado ||
    log.metadados?.colaborador_id_afetado ||
    '-'
  );
}

function getContextLabel(log) {
  if (log.entidade === 'acessos_usuario_sistema') {
    const systemName = log.metadados?.sistema_nome || log.metadados?.sistema_slug;
    const previousStatus = log.metadados?.status_anterior;
    const nextStatus = log.metadados?.status_novo;

    if (previousStatus !== undefined && nextStatus !== undefined) {
      return `${systemName || 'Sistema'}: ${previousStatus ? 'Liberado' : 'Bloqueado'} -> ${nextStatus ? 'Liberado' : 'Bloqueado'}`;
    }

    return systemName || '-';
  }

  return (
    log.metadados?.ativo_nome_afetado ||
    log.metadados?.linha_corporativa_nome_afetada ||
    log.metadados?.colaborador_nome_afetado ||
    log.metadados?.scope ||
    '-'
  );
}

export default function AuditOverview() {
  const [search, setSearch] = useState('');
  const [activeEntity, setActiveEntity] = useState('all');
  const [activeAction, setActiveAction] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['console', 'audit', page, activeEntity, activeAction],
    queryFn: () =>
      platformAuditApi.logs.list({
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
  const entityOptions = useMemo(() => ['all', ...Object.keys(entityLabels)], []);
  const actionOptions = useMemo(() => ['all', ...Object.keys(actionLabels)], []);
  const normalizedSearch = search.trim().toLowerCase();

  const filteredLogs = useMemo(() => {
    if (!normalizedSearch) return logs;

    return logs.filter((log) =>
      [
        log.responsavel_email,
        log.colaborador_email_afetado,
        log.colaborador_nome_afetado,
        log.entidade,
        log.acao,
        log.metadados?.sistema_slug,
        log.metadados?.sistema_nome,
        log.metadados?.ativo_nome_afetado,
        log.metadados?.patrimonio_afetado,
        log.metadados?.linha_corporativa_nome_afetada,
        log.metadados?.linha_corporativa_numero_afetado,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch)),
    );
  }, [logs, normalizedSearch]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">MACOM Console</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Auditoria</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Eventos administrativos registrados pelo Console. A auditoria operacional da Central permanece separada.
          </p>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar responsavel, afetado ou contexto..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </header>

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold uppercase text-foreground">Filtros</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            value={activeEntity}
            onValueChange={(value) => {
              setActiveEntity(value);
              setPage(1);
            }}
          >
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

          <Select
            value={activeAction}
            onValueChange={(value) => {
              setActiveAction(value);
              setPage(1);
            }}
          >
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
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(log.criado_em)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.responsavel_email || '-'}</TableCell>
                  <TableCell className="max-w-[240px] text-xs text-muted-foreground">
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
                  <TableCell className="max-w-xs text-xs text-muted-foreground">{getContextLabel(log)}</TableCell>
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
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do log</DialogTitle>
          </DialogHeader>

          {selectedLog ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-border bg-background p-3 text-sm">
                  <p><strong>Data:</strong> {formatDateTime(selectedLog.criado_em)}</p>
                  <p><strong>Responsavel:</strong> {selectedLog.responsavel_email || '-'}</p>
                  <p><strong>Afetado:</strong> {getAffectedLabel(selectedLog)}</p>
                  <p><strong>Entidade:</strong> {entityLabels[selectedLog.entidade] || selectedLog.entidade}</p>
                  <p><strong>Acao:</strong> {actionLabels[selectedLog.acao] || selectedLog.acao}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-3 text-sm">
                  <p><strong>Contexto:</strong> {getContextLabel(selectedLog)}</p>
                  <p><strong>Sistema:</strong> {selectedLog.metadados?.sistema_nome || selectedLog.metadados?.sistema_slug || '-'}</p>
                  <p><strong>Escopo:</strong> {selectedLog.metadados?.scope || '-'}</p>
                  <p><strong>Responsavel ID:</strong> {selectedLog.responsavel_colaborador_id || '-'}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">JSON antes</p>
                  <pre className="max-h-72 overflow-auto rounded-md border bg-slate-950 p-3 text-xs text-slate-100">
                    {formatJson(selectedLog.antes)}
                  </pre>
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">JSON depois</p>
                  <pre className="max-h-72 overflow-auto rounded-md border bg-slate-950 p-3 text-xs text-slate-100">
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
