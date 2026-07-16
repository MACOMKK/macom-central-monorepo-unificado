import { NavLink, Outlet } from 'react-router-dom';
import { Banknote, CheckCircle2, LogOut, Plus, Receipt } from 'lucide-react';

import { Button } from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';

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
        `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">MACOM</p>
            <h1 className="text-lg font-bold">Pagamentos</h1>
          </div>

          <nav className="flex items-center gap-1">
            <NavItem to="/solicitacoes" icon={Receipt} label="Minhas solicitacoes" />
            <NavItem to="/solicitacoes/nova" icon={Plus} label="Nova solicitacao" />
            {user?.isAprovador && <NavItem to="/aprovacoes" icon={CheckCircle2} label="Aprovacoes" />}
            {user?.isFinanceiro && <NavItem to="/pagamentos" icon={Banknote} label="Pagamentos" />}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABEL[user?.role] || user?.role}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logout()} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
