import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';

import { Button } from '@macom/ui';
import NotificationsBell from '@/components/NotificationsBell';
import Sidebar from '@/components/layout/Sidebar';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('servicos:sidebar-collapsed');
    setCollapsed(saved === 'true');
  }, []);

  const handleToggleSidebar = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('servicos:sidebar-collapsed', String(next));
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
            <span className="text-sm font-bold">MACOM Serviços</span>
          </div>
          <div className="ml-auto">
            <NotificationsBell />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
