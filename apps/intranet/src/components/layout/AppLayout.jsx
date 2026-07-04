import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import BottomNav from './BottomNav';
import Header from './Header';
import InstallPromptBanner from './InstallPromptBanner';
import { useIntranetRealtime } from '@/lib/useIntranetRealtime';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useIntranetRealtime();

  useEffect(() => {
    const saved = window.localStorage.getItem('intranet:sidebar-collapsed');
    setCollapsed(saved === 'true');
  }, []);

  const handleToggleSidebar = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('intranet:sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={handleToggleSidebar} />
      </div>

      <MobileNav open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <BottomNav onOpenMore={() => setMobileMenuOpen(true)} />
      <InstallPromptBanner />

      <main className={`min-h-screen transition-[margin] duration-200 ${collapsed ? 'lg:ml-[88px]' : 'lg:ml-[240px]'}`}>
        <Header />
        <div className="p-4 pb-safe-bottom-nav md:p-6 lg:p-8 lg:pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
