import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Megaphone,
  Link2,
  Users,
  FileText,
  CalendarDays,
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

export default function MobileNav({ open = false, onClose }) {
  const location = useLocation();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <div
        className={cn(
          'fixed left-0 right-0 top-16 z-50 overflow-hidden bg-sidebar text-sidebar-foreground transition-all duration-300 lg:hidden',
          open ? 'max-h-[80vh] border-b border-sidebar-border' : 'max-h-0'
        )}
      >
        <nav className="p-3 space-y-1">
          <div className="mb-2 flex items-center justify-between px-2 py-1 text-white/80">
            <span className="text-xs font-bold uppercase tracking-[0.24em]">Menu</span>
            <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
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

