import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { applyTheme, getInitialTheme } from '@macom/ui';

import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import InstallPromptBanner from '@/components/layout/InstallPromptBanner';
import Sidebar from '@/components/layout/Sidebar';
import SupportButton from '@/components/layout/SupportButton';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = window.localStorage.getItem('servicos:sidebar-collapsed');
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
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <BottomNav onOpenMore={() => setMobileOpen(true)} />

      <SupportButton />

      <div className="pointer-events-none fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col-reverse items-stretch gap-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[360px]">
        <InstallPromptBanner />
      </div>

      <div className={`transition-all duration-300 ${collapsed ? 'lg:ml-[88px]' : 'lg:ml-64'}`}>
        <Header onOpenMobileMenu={() => setMobileOpen(true)} />

        <main className="min-w-0 flex-1 px-4 py-6 pb-safe-bottom-nav md:px-6 lg:px-8 lg:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
