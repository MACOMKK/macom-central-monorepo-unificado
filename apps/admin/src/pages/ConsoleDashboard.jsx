import { Link } from 'react-router-dom';
import { Activity, AppWindow, KeyRound, Settings2, ShieldCheck, UsersRound } from 'lucide-react';
import { Button, Card } from '@macom/ui';

import PageHeader from '@/components/PageHeader';

const platformAreas = [
  {
    title: 'Sistemas',
    description: 'Cadastro e organizacao dos apps do ecossistema MACOM.',
    icon: AppWindow,
    path: '/sistemas',
  },
  {
    title: 'Permissoes',
    description: 'Perfis, acessos e regras compartilhadas entre sistemas.',
    icon: ShieldCheck,
    path: '/permissoes-sistemas',
  },
  {
    title: 'Usuarios',
    description: 'Administracao de contas, funcoes e vinculos corporativos.',
    icon: UsersRound,
    path: '/usuarios',
  },
  {
    title: 'Auditoria',
    description: 'Rastreamento de eventos globais e acoes administrativas.',
    icon: Activity,
    path: '/auditoria',
  },
];

export default function ConsoleDashboard() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Visao geral"
        description="Um app dedicado para administrar sistemas, usuarios e acessos da plataforma MACOM."
      />

      <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="text-sm font-medium text-primary">Separacao de responsabilidades</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight">
            A Central segue focada em estoque e operacao de TI, enquanto o Console concentra
            configuracoes transversais aos demais apps.
          </h2>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/sistemas">
                <AppWindow className="h-4 w-4" />
                Abrir sistemas
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/permissoes-sistemas">
                <ShieldCheck className="h-4 w-4" />
                Abrir permissoes
              </Link>
            </Button>
          </div>
        </div>

        <Card className="self-start p-5">
          <div className="mb-5 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            <KeyRound className="h-4 w-4 text-primary" />
            <span>Autenticacao compartilhada ativa</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold">Proximas migracoes</h2>
              <p className="text-sm text-muted-foreground">Ordem sugerida</p>
            </div>
          </div>

          <ol className="mt-5 space-y-3 text-sm text-muted-foreground">
            <li className="rounded-md bg-secondary px-3 py-2">1. Permissoes dos sistemas</li>
            <li className="rounded-md bg-secondary px-3 py-2">2. Usuarios e perfis</li>
            <li className="rounded-md bg-secondary px-3 py-2">3. Auditoria global</li>
            <li className="rounded-md bg-secondary px-3 py-2">4. Configuracoes</li>
          </ol>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {platformAreas.map((area) => {
          const Icon = area.icon;

          return (
            <Link key={area.title} to={area.path} className="rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold">{area.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{area.description}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
