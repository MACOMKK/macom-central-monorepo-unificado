import React, { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Spinner } from '@macom/ui';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import BottomNav from './BottomNav';
import Header from './Header';
import InstallPromptBanner from './InstallPromptBanner';
import FloatingChatButton from './FloatingChatButton';
import { useIntranetRealtime } from '@/lib/useIntranetRealtime';

const ContentLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <Spinner size="lg" className="text-primary" />
  </div>
);

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useIntranetRealtime();

  useEffect(() => {
    const saved = window.localStorage.getItem('intranet:sidebar-collapsed');
    setCollapsed(saved === null ? true : saved === 'true');
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
      <FloatingChatButton />

      <main className={`min-h-screen transition-[margin] duration-200 ${collapsed ? 'lg:ml-[88px]' : 'lg:ml-[240px]'}`}>
        <Header />
        <div className="p-4 pb-safe-bottom-nav md:p-6 lg:p-8 lg:pb-8">
          <Suspense fallback={<ContentLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
