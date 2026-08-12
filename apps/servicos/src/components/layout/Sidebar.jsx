import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Lock, LogOut, PanelLeftClose, PanelLeftOpen, ShieldCheck, X } from 'lucide-react';

import { Button } from '@macom/ui';
import NotificationsBell from '@/components/NotificationsBell';
import { useAuth } from '@/lib/AuthContext';
import { appVersion } from '@/lib/buildInfo';
import { servicosModules } from '@/lib/navigation';

const ROLE_LABEL = {
  solicitante: 'Solicitante',
  aprovador: 'Aprovador',
  financeiro: 'Financeiro',
};

const logoUrl = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1777603989/logo_vermelha_e2aob2.png';

function NavItem({ to, icon: Icon, label, collapsed, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        } ${collapsed ? 'justify-center' : ''}`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed ? label : null}
    </NavLink>
  );
}

function ModuleNavItem({ mod, user, collapsed, onNavigate }) {
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
        onClick={onNavigate}
        title={collapsed ? mod.label : undefined}
        aria-label={collapsed ? mod.label : undefined}
        className={({ isActive }) =>
          `flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            mod.comingSoon
              ? 'opacity-40 text-muted-foreground hover:bg-accent hover:opacity-60'
              : isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          } ${collapsed ? 'justify-center' : ''}`
        }
      >
        <span className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed ? mod.label : null}
        </span>
        {!collapsed && mod.comingSoon && <Lock className="h-3.5 w-3.5 shrink-0" />}
      </NavLink>
    );
  }

  if (collapsed) {
    return (
      <NavLink
        to={mod.path}
        onClick={onNavigate}
        title={mod.label}
        aria-label={mod.label}
        className={({ isActive }) =>
          `flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isActive || childActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`
        }
      >
        <Icon className="h-4 w-4 shrink-0" />
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
            <NavItem key={child.key} to={child.path} icon={child.icon} label={child.label} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={closeMobile} />
      ) : null}

      <aside
        className={`
          fixed top-0 left-0 z-50 flex h-full flex-col border-r border-border bg-card
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[88px]' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className={`relative flex h-16 items-center border-b border-border ${collapsed ? 'justify-center px-3' : 'justify-between px-4'}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2 pl-1">
              <img src={logoUrl} alt="MACOM" className="h-8 w-8 object-contain" />
              <div className="flex flex-col leading-none">
                <h1 className="text-base font-extrabold leading-none tracking-tight text-foreground">MACOM</h1>
                <p className="mt-1 text-[10px] font-medium tracking-wider text-muted-foreground">
                  SERVIÇOS <span className="text-muted-foreground/60">· v{appVersion}</span>
                </p>
              </div>
            </div>
          ) : (
            <img src={logoUrl} alt="MACOM" className="mx-auto h-8 w-8 object-contain" />
          )}

          {!collapsed ? (
            <div className="hidden items-center gap-1 lg:flex">
              <NotificationsBell buttonClassName="h-7 w-7" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle} title="Recolher sidebar">
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
          <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={closeMobile}>
            <X className="h-4 w-4" />
          </Button>

          {collapsed ? (
            <button
              type="button"
              onClick={onToggle}
              className="absolute -right-3 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:bg-accent hover:text-foreground lg:flex"
              title="Expandir sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
          <div className="flex flex-col gap-1">
            {servicosModules.map((mod) => (
              <ModuleNavItem key={mod.key} mod={mod} user={user} collapsed={collapsed} onNavigate={closeMobile} />
            ))}
          </div>

          {user?.system_access_level === 'admin' && (
            <div className="flex flex-col gap-1 border-t border-border pt-4">
              {!collapsed ? (
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Administração</p>
              ) : null}
              <NavItem to="/permissoes" icon={ShieldCheck} label="Permissões" collapsed={collapsed} onNavigate={closeMobile} />
            </div>
          )}
        </nav>

        <div className={`flex items-center gap-3 border-t border-border px-4 py-4 ${collapsed ? 'justify-center' : ''}`}>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABEL[user?.role] || user?.role}</p>
            </div>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => logout()}
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>
    </>
  );
}
