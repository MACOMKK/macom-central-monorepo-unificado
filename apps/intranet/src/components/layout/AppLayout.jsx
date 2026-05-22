import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import Header from './Header';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

      <main className={`min-h-screen transition-[margin] duration-200 ${collapsed ? 'lg:ml-[88px]' : 'lg:ml-[240px]'}`}>
        <Header onMenuClick={() => setMobileMenuOpen((current) => !current)} />
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
