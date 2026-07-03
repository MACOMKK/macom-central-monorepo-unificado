import { Link } from 'react-router-dom';
import { BarChart3, Building2, CheckCircle2, Clock3, Megaphone, ShieldCheck, UsersRound, WalletCards } from 'lucide-react';
import { Badge, Button, Card } from '@macom/ui';

import { permissionSystems } from '@/lib/platformPermissions';

const systemIcons = {
  central: Building2,
  relatorios: BarChart3,
  intranet: Megaphone,
  pagamentos: WalletCards,
  crm: UsersRound,
  rh: UsersRound,
};

function getStatusConfig(status) {
  if (status === 'active') {
    return {
      label: 'Ativo',
      icon: CheckCircle2,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  return {
    label: 'Planejado',
    icon: Clock3,
    className: 'border-slate-200 bg-slate-100 text-slate-600',
  };
}

export default function SystemsCatalog() {
  const activeSystems = permissionSystems.filter((system) => system.status === 'active').length;
  const plannedSystems = permissionSystems.length - activeSystems;
  const mappedModules = permissionSystems.reduce((total, system) => total + system.modules.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Console Macom</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Sistemas e Modulos</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Inventario inicial dos apps do monorepo e dos modulos que serao administrados pelo Console.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/permissoes-sistemas">
              <ShieldCheck className="h-4 w-4" />
              Permissoes
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Sistemas ativos</p>
          <p className="mt-2 text-3xl font-black">{activeSystems}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Planejados</p>
          <p className="mt-2 text-3xl font-black">{plannedSystems}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Modulos mapeados</p>
          <p className="mt-2 text-3xl font-black">{mappedModules}</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {permissionSystems.map((system) => {
          const Icon = systemIcons[system.key] || Building2;
          const status = getStatusConfig(system.status);
          const StatusIcon = status.icon;

          return (
            <Card key={system.key} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{system.label}</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{system.description}</p>
                  </div>
                </div>

                <Badge variant="outline" className={status.className}>
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Slug</p>
                  <p className="mt-1 font-mono text-sm">{system.key}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Dev</p>
                  <p className="mt-1 font-mono text-sm">{system.devPort ? `localhost:${system.devPort}` : 'pendente'}</p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Modulos</p>
                {system.modules.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {system.modules.map((module) => (
                      <Badge key={module.key} variant="secondary">
                        {module.label}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Modulos ainda nao mapeados.</p>
                )}
              </div>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
