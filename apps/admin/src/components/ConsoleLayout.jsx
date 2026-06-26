import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  AppWindow,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { Button } from '@macom/ui';
import { useAuth } from '@macom/auth';

const navItems = [
  { path: '/', label: 'Visao geral', icon: LayoutDashboard, end: true },
  { path: '/sistemas', label: 'Sistemas', icon: AppWindow },
  { path: '/permissoes-sistemas', label: 'Permissoes', icon: ShieldCheck },
  { path: '/acessos-sistemas', label: 'Acessos', icon: KeyRound },
  { path: '/usuarios', label: 'Usuarios', icon: UsersRound },
  { path: '/auditoria', label: 'Auditoria', icon: Activity },
  { path: '/configuracoes', label: 'Configuracoes', icon: Settings2 },
];

function ConsoleNavLink({ item, onClick }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        ].join(' ')
      }
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  );
}

export default function ConsoleLayout() {
  const navigate = useNavigate();
  const { logout, profile } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card lg:flex lg:flex-col">
        <div className="border-b border-border px-5 py-5">
          <p className="text-xs font-semibold uppercase text-primary">MACOM</p>
          <h1 className="mt-1 text-xl font-black">Console</h1>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <ConsoleNavLink key={item.path} item={item} />
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <Button type="button" variant="outline" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:h-16 lg:px-6">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-sm font-bold">MACOM Console</p>
              <p className="hidden text-xs text-muted-foreground sm:block">Gestao da plataforma</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{profile?.nome || profile?.email || 'Usuario autenticado'}</p>
              <p className="text-xs text-muted-foreground">{profile?.funcao || 'perfil ativo'}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </header>

        <div className="border-b border-border bg-card px-4 py-2 lg:hidden">
          <nav className="flex gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <ConsoleNavLink key={item.path} item={item} />
            ))}
          </nav>
        </div>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
