import { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { applyTheme, getInitialTheme, Spinner } from '@macom/ui';

import ConsoleSidebar from '@/components/ConsoleSidebar';

const ContentLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <Spinner size="lg" className="text-primary" />
  </div>
);

export default function ConsoleLayout() {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = window.localStorage.getItem('admin:sidebar-collapsed');
    setCollapsed(saved === null ? true : saved === 'true');
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
      window.localStorage.setItem('admin:sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ConsoleSidebar
        collapsed={collapsed}
        onToggle={handleToggleSidebar}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <div className={`transition-all duration-300 ${collapsed ? 'lg:ml-[88px]' : 'lg:ml-64'}`}>
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-card px-4 lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent">
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <span className="text-xs font-black text-primary-foreground">M</span>
            </div>
            <span className="text-sm font-bold">MACOM</span>
          </div>
        </header>

        <main className="w-full px-4 py-6 md:px-6 lg:px-8">
          <Suspense fallback={<ContentLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
