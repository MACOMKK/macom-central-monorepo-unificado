import { useQuery } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@macom/ui';

import { appClient } from '@/api/client';

const LIMIT = 20;

const STATUS_LABEL = {
  enviado: 'Enviado',
  pendente: 'Pendente',
  processando: 'Processando',
  erro: 'Erro',
};

const STATUS_CLASS = {
  enviado: 'bg-emerald-100 text-emerald-700',
  pendente: 'bg-amber-100 text-amber-700',
  processando: 'bg-amber-100 text-amber-700',
  erro: 'bg-red-100 text-red-700',
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

export default function EmployeeNotifications({ email }) {
  const { data, isLoading } = useQuery({
    queryKey: ['intranet', 'employee-notifications', email],
    queryFn: () => appClient.employeeNotifications.list({ email, limit: LIMIT }),
    enabled: Boolean(email),
  });

  const notifications = data?.rows || [];

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <h3 className="text-sm font-semibold text-foreground">Notificações enviadas</h3>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assunto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-xs text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : notifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center">
                  <Mail className="mx-auto mb-1 h-6 w-6 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Nenhuma notificação enviada ainda.</p>
                </TableCell>
              </TableRow>
            ) : (
              notifications.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell className="text-xs">
                    <span className="block font-medium text-foreground">{notification.assunto || '-'}</span>
                    {notification.status === 'erro' && notification.erro ? (
                      <span className="mt-0.5 block text-red-600" title={notification.erro}>
                        {notification.erro}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge className={`w-fit text-xs ${STATUS_CLASS[notification.status] || 'bg-muted text-muted-foreground'}`}>
                      {STATUS_LABEL[notification.status] || notification.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(notification.enviado_em || notification.criado_em)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
