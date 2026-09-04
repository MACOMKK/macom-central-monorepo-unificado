import React, { Suspense, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import MobileNav from './MobileNav';
import BottomNav from './BottomNav';

function PageContentFallback() {
  return (
    <div className="min-h-[calc(100vh-56px)] md:min-h-screen" style={{ background: '#f2f2f2' }}>
      <div style={{ background: '#141414' }} className="px-6 lg:px-10 py-8">
        <div className="h-3 w-28 animate-pulse rounded bg-[#E30613]/60" />
        <div className="mt-3 h-9 w-56 animate-pulse rounded bg-white/12" />
        <div className="mt-2 h-3 w-72 max-w-full animate-pulse rounded bg-white/10" />
      </div>
      <div className="px-6 lg:px-10 py-6">
        <div className="overflow-hidden bg-white shadow-sm" style={{ borderTop: '3px solid #E30613' }}>
          <div className="space-y-4 p-5">
            <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-10 w-11/12 animate-pulse rounded bg-slate-100" />
            <div className="h-10 w-10/12 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMd, setIsMd] = useState(() => window.innerWidth >= 768);

  useEffect(() => {
    const saved = window.localStorage.getItem('relatorios:sidebar-collapsed');
    setCollapsed(saved === null ? true : saved === 'true');
  }, []);

  useEffect(() => {
    const handler = () => setIsMd(window.innerWidth >= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const handleToggleSidebar = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('relatorios:sidebar-collapsed', String(next));
      return next;
    });
  };

  const sidebarWidth = isMd ? (collapsed ? 88 : 240) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block fixed left-0 top-0 h-full z-40">
        <Sidebar user={user} collapsed={collapsed} onToggle={handleToggleSidebar} />
      </div>

      <MobileHeader />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <BottomNav onOpenMore={() => setMobileNavOpen(true)} />

      {/* Main content */}
      <main
        className="transition-all duration-300 pb-safe-bottom-nav md:pb-0"
        style={{ marginLeft: sidebarWidth, paddingTop: isMd ? 0 : 56 }}
      >
        <Suspense fallback={<PageContentFallback />}>
          <Outlet context={{ user }} />
        </Suspense>
      </main>
    </div>
  );
}
