import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, AppWindow, History, ShieldCheck, UsersRound } from 'lucide-react';
import { platformAuditApi, platformUsersApi } from '@macom/api-client';
import { Card } from '@macom/ui';

import PageHeader from '@/components/PageHeader';
import { formatDateTime } from '@/lib/format';

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

const RECENT_LIMIT = 5;

function StatCard({ icon: Icon, label, value, hint, to }) {
  return (
    <Link to={to} className="block">
      <Card className="h-full p-4 transition-colors hover:bg-accent/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <p className="text-sm">{label}</p>
        </div>
        <p className="mt-2 text-3xl font-black">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </Card>
    </Link>
  );
}

function ActivityCard({ icon: Icon, title, to, isLoading, isError, isEmpty, emptyLabel, children }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold uppercase text-foreground">{title}</h2>
        </div>
        <Link to={to} className="text-xs font-semibold text-primary hover:underline">
          Ver tudo
        </Link>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-destructive">Nao foi possivel carregar.</p>
      ) : isEmpty ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        children
      )}
    </Card>
  );
}

export default function ConsoleDashboard() {
  const { data: systems = [], isLoading: loadingSystems, isError: errorSystems } = useQuery({
    queryKey: ['console', 'dashboard', 'systems'],
    queryFn: platformUsersApi.systems.list,
  });

  const { data: collaborators = [], isLoading: loadingCollaborators, isError: errorCollaborators } = useQuery({
    queryKey: ['console', 'dashboard', 'collaborators'],
    queryFn: platformUsersApi.collaborators.list,
  });

  const { data: accesses = [], isLoading: loadingAccesses, isError: errorAccesses } = useQuery({
    queryKey: ['console', 'dashboard', 'accesses'],
    queryFn: platformUsersApi.accesses.list,
  });

  const { data: auditData, isLoading: loadingAudit, isError: errorAudit } = useQuery({
    queryKey: ['console', 'dashboard', 'audit'],
    queryFn: () => platformAuditApi.logs.list({ limit: RECENT_LIMIT, offset: 0 }),
  });

  const { data: accessLogData, isLoading: loadingAccessLogs, isError: errorAccessLogs } = useQuery({
    queryKey: ['console', 'dashboard', 'access-logs'],
    queryFn: () => platformAuditApi.accessLogs.list({ limit: RECENT_LIMIT, offset: 0 }),
  });

  const activeSystems = systems.filter((system) => system.ativo).length;
  const activeUsers = collaborators.filter((collaborator) => collaborator.status !== 'inativo').length;
  const activeAccesses = accesses.filter((access) => access.ativo).length;

  const auditLogs = auditData?.rows || [];
  const accessLogs = accessLogData?.rows || [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Visao geral"
        description="Acompanhe o estado da plataforma MACOM e a atividade recente do Console."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={AppWindow}
          label="Sistemas ativos"
          value={loadingSystems ? '-' : errorSystems ? '?' : activeSystems}
          hint={loadingSystems || errorSystems ? undefined : `${systems.length} cadastrados`}
          to="/sistemas"
        />
        <StatCard
          icon={UsersRound}
          label="Usuarios ativos"
          value={loadingCollaborators ? '-' : errorCollaborators ? '?' : activeUsers}
          hint={loadingCollaborators || errorCollaborators ? undefined : `${collaborators.length} cadastrados`}
          to="/usuarios"
        />
        <StatCard
          icon={ShieldCheck}
          label="Acessos concedidos"
          value={loadingAccesses ? '-' : errorAccesses ? '?' : activeAccesses}
          to="/acessos-sistemas"
        />
        <StatCard
          icon={Activity}
          label="Eventos de auditoria"
          value={loadingAudit ? '-' : errorAudit ? '?' : auditData?.total ?? auditLogs.length}
          to="/auditoria"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ActivityCard
          icon={Activity}
          title="Ultimas acoes de auditoria"
          to="/auditoria"
          isLoading={loadingAudit}
          isError={errorAudit}
          isEmpty={auditLogs.length === 0}
          emptyLabel="Nenhum evento de auditoria registrado."
        >
          <ul className="space-y-2">
            {auditLogs.map((log) => (
              <li key={log.id} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{entityLabels[log.entidade] || log.entidade}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(log.criado_em)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {actionLabels[log.acao] || log.acao} por {log.responsavel_email || 'responsavel desconhecido'}
                </p>
              </li>
            ))}
          </ul>
        </ActivityCard>

        <ActivityCard
          icon={History}
          title="Ultimos acessos a plataforma"
          to="/logs-acesso"
          isLoading={loadingAccessLogs}
          isError={errorAccessLogs}
          isEmpty={accessLogs.length === 0}
          emptyLabel="Nenhum acesso registrado."
        >
          <ul className="space-y-2">
            {accessLogs.map((log) => (
              <li key={log.id} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{log.colaborador_nome || log.colaborador_email || 'Colaborador'}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(log.criado_em)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {log.sistema_nome || log.sistema_slug || 'Sistema'}
                </p>
              </li>
            ))}
          </ul>
        </ActivityCard>
      </section>
    </div>
  );
}
