import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Search } from 'lucide-react';
import { platformAuditApi } from '@macom/api-client';
import {
  Card,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@macom/ui';

import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import { formatDateTime } from '@/lib/format';

const PAGE_SIZE = 25;

export default function AccessLogOverview() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['console', 'access-logs', page],
    queryFn: () =>
      platformAuditApi.accessLogs.list({
        limit: PAGE_SIZE,
        offset: Math.max(0, (page - 1) * PAGE_SIZE),
      }),
  });

  const logs = data?.rows || [];
  const total = data?.total || 0;
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
      <PageHeader
        title="Logs de acesso"
        description="Historico de logins realizados nos sistemas da plataforma. Hoje registrado apenas pela Intranet."
        actions={
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar colaborador, sistema ou IP..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        }
      />

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
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-destructive">
                  Nao foi possivel carregar os acessos. Tente novamente.
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

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} itemLabel="acesso(s)" />
    </div>
  );
}
