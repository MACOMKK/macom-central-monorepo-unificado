import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Search } from 'lucide-react';
import { platformAuditApi } from '@macom/api-client';
import {
  Button,
  Card,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@macom/ui';

const PAGE_SIZE = 25;

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

export default function AccessLogOverview() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['console', 'access-logs', page],
    queryFn: () =>
      platformAuditApi.accessLogs.list({
        limit: PAGE_SIZE,
        offset: Math.max(0, (page - 1) * PAGE_SIZE),
      }),
  });

  const logs = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const normalizedSearch = search.trim().toLowerCase();

  const filteredLogs = useMemo(() => {
    if (!normalizedSearch) return logs;

    return logs.filter((log) =>
      [log.colaborador_nome, log.colaborador_email, log.sistema_nome, log.sistema_slug, log.ip_address].some(
        (value) => String(value || '').toLowerCase().includes(normalizedSearch),
      ),
    );
  }, [logs, normalizedSearch]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Console Macom</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Logs de acesso</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Historico de logins realizados nos sistemas da plataforma. Hoje registrado apenas pela Intranet.
          </p>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar colaborador, sistema ou IP..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </header>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Colaborador</TableHead>
              <TableHead>Sistema</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Navegador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Carregando acessos...
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center">
                  <History className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhum acesso encontrado.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(log.criado_em)}</TableCell>
                  <TableCell className="text-xs">
                    <span className="block font-medium text-foreground">{log.colaborador_nome || '-'}</span>
                    <span className="block text-muted-foreground">{log.colaborador_email || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-accent px-2 py-1 text-[11px] font-semibold text-foreground">
                      {log.sistema_nome || log.sistema_slug}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.ip_address || '-'}</TableCell>
                  <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                    <span className="line-clamp-2">{log.user_agent || '-'}</span>
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
            ? `Mostrando ${Math.max(1, (page - 1) * PAGE_SIZE + 1)}-${Math.min(page * PAGE_SIZE, total)} de ${total} acesso(s)`
            : 'Nenhum acesso encontrado'}
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
    </div>
  );
}
