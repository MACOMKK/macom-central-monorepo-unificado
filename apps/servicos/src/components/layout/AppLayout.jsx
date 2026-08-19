import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import InstallPromptBanner from '@/components/layout/InstallPromptBanner';
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

      <BottomNav onOpenMore={() => setMobileOpen(true)} />

      <InstallPromptBanner />

      <div className={`transition-all duration-300 ${collapsed ? 'lg:ml-[88px]' : 'lg:ml-64'}`}>
        <Header onOpenMobileMenu={() => setMobileOpen(true)} />

        <main className="min-w-0 flex-1 px-4 py-6 pb-safe-bottom-nav md:px-6 lg:px-8 lg:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
