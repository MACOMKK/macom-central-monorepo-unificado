import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Building2, ChevronLeft, ChevronRight, FileText, Home, KeyRound, Laptop, LogOut, Moon, Network, Phone, Smartphone, Sun, Users, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

const routePrefetchers = {
  '/': () => import('@/pages/Dashboard'),
  '/ativos': () => import('@/pages/Assets'),
  '/departamentos': () => import('@/pages/Departments'),
  '/unidades': () => import('@/pages/Units'),
  '/colaboradores': () => import('@/pages/Collaborators'),
  '/contatos': () => import('@/pages/Contacts'),
  '/linhas-corporativas': () => import('@/pages/CorporateLines'),
  '/infraestrutura': () => import('@/pages/Infrastructure'),
  '/acessos-sistemas': () => import('@/pages/SystemAccess'),
  '/termos-posse': () => import('@/pages/TermsPossession'),
};

const navItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/ativos', label: 'Ativos', icon: Laptop },
  { path: '/departamentos', label: 'Departamentos', icon: Building2 },
  { path: '/unidades', label: 'Unidades', icon: Building2 },
  { path: '/colaboradores', label: 'Colaboradores', icon: Users },
  { path: '/contatos', label: 'Contatos', icon: Phone },
  { path: '/linhas-corporativas', label: 'Linhas Corporativas', icon: Smartphone },
  { path: '/infraestrutura', label: 'Infraestrutura', icon: Network },
  { path: '/acessos-sistemas', label: 'Acessos Sistemas', icon: KeyRound },
  { path: '/termos-posse', label: 'Termos de Posse', icon: FileText },
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen, theme, toggleTheme }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const logoUrl = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1777603989/logo_vermelha_e2aob2.png';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handlePrefetch = (path) => {
    routePrefetchers[path]?.().catch(() => null);
  };

  return (
    <>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      ) : null}

      <aside
        className={`
          fixed top-0 left-0 z-50 flex h-full flex-col border-r border-border bg-card
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[72px]' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <img src={logoUrl} alt="MACOM" className="h-8 w-8 object-contain" />
              <div>
                <h1 className="text-base font-extrabold leading-none tracking-tight text-foreground">MACOM</h1>
                <p className="text-[10px] font-medium tracking-wider text-muted-foreground">CENTRAL MACOM</p>
              </div>
            </div>
          ) : (
            <img src={logoUrl} alt="MACOM" className="mx-auto h-8 w-8 object-contain" />
          )}

          <Button variant="ghost" size="icon" className="hidden h-7 w-7 lg:flex" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                onMouseEnter={() => handlePrefetch(item.path)}
                onFocus={() => handlePrefetch(item.path)}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200
                  ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed ? <span className="text-sm font-medium">{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-border p-3">
          <Button
            variant="outline"
            onClick={toggleTheme}
            title={collapsed ? (theme === 'dark' ? 'Modo Claro' : 'Modo Escuro') : undefined}
            aria-label={collapsed ? (theme === 'dark' ? 'Modo Claro' : 'Modo Escuro') : undefined}
            className={`w-full gap-2 ${collapsed ? 'justify-center px-0' : ''}`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!collapsed ? <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span> : null}
          </Button>
          <Button
            variant="outline"
            onClick={handleLogout}
            title={collapsed ? 'Sair' : undefined}
            aria-label={collapsed ? 'Sair' : undefined}
            className={`w-full gap-2 ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed ? <span>Sair</span> : null}
          </Button>
          {!collapsed ? (
            <p className="text-center text-[10px] text-muted-foreground">MACOM Mitsubishi © {new Date().getFullYear()}</p>
          ) : null}
        </div>
      </aside>
    </>
  );
}
