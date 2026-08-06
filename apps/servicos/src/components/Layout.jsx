import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, ShieldCheck } from 'lucide-react';

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

function ModuleNavItem({ mod, user }) {
  const Icon = mod.icon;
  const location = useLocation();
  const visibleChildren = (mod.children ?? []).filter((child) => !child.requires || user?.[child.requires]);
  const hasChildren = visibleChildren.length > 0;
  const childActive = visibleChildren.some((child) => location.pathname.startsWith(child.path));
  const [open, setOpen] = useState(childActive);

  if (!hasChildren) {
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

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          childActive ? 'text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0" />
          {mod.label}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="ml-4 flex flex-col gap-1 border-l border-border pl-3">
          {visibleChildren.map((child) => (
            <NavItem key={child.key} to={child.path} icon={child.icon} label={child.label} />
          ))}
        </div>
      )}
    </div>
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
              <ModuleNavItem key={mod.key} mod={mod} user={user} />
            ))}
          </div>

          {user?.system_access_level === 'admin' && (
            <div className="flex flex-col gap-1 border-t border-border pt-4">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Administracao
              </p>
              <NavItem to="/permissoes" icon={ShieldCheck} label="Permissoes" />
            </div>
          )}
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
