import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';

export default function AppLayout() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMd, setIsMd] = useState(() => window.innerWidth >= 768);

  useEffect(() => {
    const handler = () => setIsMd(window.innerWidth >= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const sidebarWidth = isMd ? (collapsed ? 68 : 240) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className="fixed left-0 top-0 h-full z-40 transition-transform duration-300"
        style={{ transform: isMd || mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <Sidebar
          user={user}
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          onClose={() => setMobileOpen(false)}
        />
      </div>

      {/* Mobile top header */}
      <MobileHeader user={user} onMenuOpen={() => setMobileOpen(true)} />

      {/* Main content */}
      <main
        className="transition-all duration-300"
        style={{ marginLeft: sidebarWidth, paddingTop: isMd ? 0 : 56 }}
      >
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}
