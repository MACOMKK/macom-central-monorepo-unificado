import { NavLink, Outlet } from 'react-router-dom';
import { CheckCircle2, LogOut, Plus, Receipt } from 'lucide-react';

import { Button } from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';
import { servicosModules } from '@/lib/navigation';

const ROLE_LABEL = {
  solicitante: 'Solicitante',
  aprovador: 'Aprovador',
  financeiro: 'Financeiro',
};

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  );
}

function ModuleNavItem({ mod }) {
  const Icon = mod.icon;
  return (
    <NavLink
      to={mod.path}
      className={({ isActive }) =>
        `flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`
      }
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4 shrink-0" />
        {mod.label}
      </span>
      {mod.comingSoon && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Em breve
        </span>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">MACOM</p>
          <h1 className="text-lg font-bold">Servicos</h1>
        </div>

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
          <div className="flex flex-col gap-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Modulos</p>
            {servicosModules.map((mod) => (
              <ModuleNavItem key={mod.key} mod={mod} />
            ))}
          </div>

          <div className="flex flex-col gap-1 border-t border-border pt-4">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Financeiro</p>
            <NavItem to="/solicitacoes" icon={Receipt} label="Minhas solicitacoes" />
            <NavItem to="/solicitacoes/nova" icon={Plus} label="Nova solicitacao" />
            {user?.isAprovador && <NavItem to="/aprovacoes" icon={CheckCircle2} label="Aprovacoes" />}
            {user?.isFinanceiro && <NavItem to="/pagamentos" icon={Receipt} label="Contas a pagar" />}
          </div>
        </nav>

        <div className="flex items-center gap-3 border-t border-border px-4 py-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABEL[user?.role] || user?.role}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => logout()} title="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
