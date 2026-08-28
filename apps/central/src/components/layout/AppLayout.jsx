import { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Spinner, applyTheme, getInitialTheme } from '@macom/ui';

import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';

function PageContentFallback() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-border/70 bg-card/80 shadow-sm">
      <div className="flex items-center gap-3 rounded-2xl bg-background/70 px-5 py-4">
        <Spinner className="text-primary" />
        <span className="text-sm text-muted-foreground">Carregando conteudo...</span>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = window.localStorage.getItem('central:sidebar-collapsed');
    setCollapsed(saved === 'true');
  }, []);

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  };

  const handleToggleSidebar = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('central:sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={handleToggleSidebar}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <div className={`transition-all duration-300 ${collapsed ? 'lg:ml-[88px]' : 'lg:ml-64'}`}>
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-card px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <span className="text-xs font-black text-primary-foreground">M</span>
            </div>
            <span className="text-sm font-bold">MACOM</span>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          <Suspense fallback={<PageContentFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
