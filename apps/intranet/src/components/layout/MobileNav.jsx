import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Megaphone,
  Link2,
  Users,
  FileText,
  CalendarDays,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { appClient } from '@/api/client';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/avisos', label: 'Mural de Avisos', icon: Megaphone },
  { path: '/links', label: 'Links \u00dateis', icon: Link2 },
  { path: '/colaboradores', label: 'Colaboradores', icon: Users },
  { path: '/documentos', label: 'Documentos', icon: FileText },
  { path: '/calendario', label: 'Calend\u00e1rio', icon: CalendarDays },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-14 bg-sidebar text-white flex items-center justify-between px-4 z-50 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-xs">I</span>
          </div>
          <span className="font-bold text-sm">Intranet</span>
        </div>
        <button onClick={() => setOpen(!open)}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div
        className={cn(
          'fixed top-14 left-0 right-0 bg-sidebar text-sidebar-foreground z-50 transition-all duration-300 lg:hidden overflow-hidden',
          open ? 'max-h-[80vh] border-b border-sidebar-border' : 'max-h-0'
        )}
      >
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-white'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => appClient.auth.logout('/login')}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </nav>
      </div>
    </>
  );
}

