import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen,
  X,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { canViewNavItem, intranetNavItems } from '@/lib/navigation';

const LOGO_URL = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1777603989/logo_vermelha_e2aob2.png';

export default function MobileNav({ open = false, onClose }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const visibleNavItems = intranetNavItems.filter((item) => canViewNavItem(item, user));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-[360px] flex-col bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="border-b border-sidebar-border px-4 pb-4 pt-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white">
                <img src={LOGO_URL} alt="MACOM" className="h-7 w-7 object-contain" />
              </div>
              <div>
                <p className="text-sm font-extrabold tracking-tight text-white">MACOM</p>
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-white/55">Intranet</p>
              </div>
            </div>

            <button type="button" onClick={onClose} className="rounded-xl p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
            <p className="truncate text-sm font-semibold text-white">{user?.full_name || 'Usuario'}</p>
            <p className="truncate text-xs text-white/55">{user?.email || ''}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleNavItems.map((item) => {
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

          {isAdmin ? (
            <>
              <Link
                to="/guia"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                  location.pathname === '/guia'
                    ? 'bg-sidebar-primary text-white'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent'
                )}
              >
                <BookOpen className="h-5 w-5" />
                <span>Guia</span>
              </Link>
            </>
          ) : null}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </>
  );
}

