import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@macom/ui';

import { appClient } from '@/api/client';

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

export default function AccessLogSection() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['intranet', 'access-logs', page],
    queryFn: () =>
      appClient.accessLogs.list({
        limit: PAGE_SIZE,
        offset: Math.max(0, (page - 1) * PAGE_SIZE),
      }),
  });

  const logs = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Log de acessos</h2>
          <p className="text-sm text-muted-foreground">Registro de logins realizados na intranet.</p>
        </div>
        <Badge className="w-fit bg-primary/10 text-primary">
          {total} acesso{total === 1 ? '' : 's'}
        </Badge>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Data/hora</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Navegador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  Carregando acessos...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center">
                  <History className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhum acesso registrado.</p>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">
                    <span className="block font-medium text-foreground">{log.colaborador_nome || '-'}</span>
                    <span className="block text-muted-foreground">{log.colaborador_email || '-'}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(log.criado_em)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.ip_address || '-'}</TableCell>
                  <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                    <span className="line-clamp-2">{log.user_agent || '-'}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {total > 0
            ? `Mostrando ${Math.max(1, (page - 1) * PAGE_SIZE + 1)}-${Math.min(page * PAGE_SIZE, total)} de ${total}`
            : 'Nenhum acesso encontrado'}
        </p>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
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
