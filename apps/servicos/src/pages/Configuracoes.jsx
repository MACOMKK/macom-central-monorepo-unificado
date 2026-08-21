import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Spinner,
  useToast,
} from '@macom/ui';

import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import Permissoes from '@/pages/Permissoes';

function formatData(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Fallback pra inscricoes antigas (de antes desta coluna existir) ou de navegadores sem
// User-Agent Client Hints -- so cobre os casos mais comuns, sem pretensao de ser um parser
// completo de user-agent.
function resumoDispositivoPorUserAgent(userAgent) {
  if (!userAgent) return 'Dispositivo desconhecido';

  let navegador = 'Navegador desconhecido';
  if (/Edg\//.test(userAgent)) navegador = 'Edge';
  else if (/OPR\//.test(userAgent)) navegador = 'Opera';
  else if (/Chrome\//.test(userAgent)) navegador = 'Chrome';
  else if (/Firefox\//.test(userAgent)) navegador = 'Firefox';
  else if (/Safari\//.test(userAgent)) navegador = 'Safari';

  let sistema = '';
  if (/Windows/.test(userAgent)) sistema = 'Windows';
  else if (/Android/.test(userAgent)) sistema = 'Android';
  else if (/iPhone|iPad|iOS/.test(userAgent)) sistema = 'iOS';
  else if (/Mac OS X/.test(userAgent)) sistema = 'macOS';
  else if (/Linux/.test(userAgent)) sistema = 'Linux';

  return sistema ? `${navegador} · ${sistema}` : navegador;
}

// Usa o dado estruturado capturado na inscricao (User-Agent Client Hints, ver
// packages/push/src/pushClient.js -> detectarDispositivo) quando disponivel -- mais confiavel
// que reinterpretar o user_agent bruto, que o Chrome vem "congelando" por privacidade. Cai pro
// parse antigo so pra inscricoes feitas antes dessa coluna existir.
function resumoDispositivo(sub) {
  if (sub.navegador || sub.sistema_operacional) {
    const tipo = sub.tipo_dispositivo === 'mobile' ? ' (mobile)' : '';
    return [sub.navegador, sub.sistema_operacional].filter(Boolean).join(' · ') + tipo;
  }
  return resumoDispositivoPorUserAgent(sub.user_agent);
}

function NotificacoesPushTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [revogarAlvo, setRevogarAlvo] = useState(null);

  const subscricoesQuery = useQuery({
    queryKey: ['servicos', 'push-subscriptions'],
    queryFn: () => financeiroApi.pushSubscriptions.list(),
  });
  const subscricoes = subscricoesQuery.data || [];

  const revogarMutation = useMutation({
    mutationFn: (id) => financeiroApi.pushSubscriptions.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'push-subscriptions'] });
      toast({ title: 'Inscrição removida' });
      setRevogarAlvo(null);
    },
    onError: (error) => toast({ title: 'Não foi possível remover a inscrição', description: error.message }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Notificações push</h2>
        <p className="text-sm text-muted-foreground">
          Colaboradores com notificações push ativadas. Use &quot;Remover&quot; se alguém parar de
          receber notificações.
        </p>
      </div>

      {subscricoesQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Carregando...
        </div>
      ) : subscricoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum colaborador ativou notificações push ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Dispositivo</TableHead>
                <TableHead>Ativado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscricoes.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div className="font-medium">{sub.nome}</div>
                    <div className="text-xs text-muted-foreground">{sub.email}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{resumoDispositivo(sub)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatData(sub.criado_em)}</TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setRevogarAlvo(sub)}>
                      Remover
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(revogarAlvo)}
        onOpenChange={(open) => !open && setRevogarAlvo(null)}
        onConfirm={() => revogarMutation.mutate(revogarAlvo.id)}
        isLoading={revogarMutation.isPending}
        title="Remover inscrição de notificação"
        description={
          revogarAlvo
            ? `Isso remove a inscrição de push de "${resumoDispositivo(revogarAlvo)}" para ${revogarAlvo.nome}. Ele(a) vai precisar autorizar notificações de novo nesse dispositivo.`
            : ''
        }
        confirmLabel="Remover"
      />
    </div>
  );
}

export default function Configuracoes() {
  const [tab, setTab] = useState('notificacoes');

  const tabs = useMemo(
    () => [
      { value: 'notificacoes', label: 'Notificações' },
      { value: 'permissoes', label: 'Permissões' },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Área administrativa do Serviços.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {tabs.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="notificacoes" className="mt-4">
          <NotificacoesPushTab />
        </TabsContent>

        <TabsContent value="permissoes" className="mt-4">
          <Permissoes />
        </TabsContent>
      </Tabs>
    </div>
  );
}
