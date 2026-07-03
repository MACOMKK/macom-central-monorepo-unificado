import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { canViewNavItem, intranetNavItems } from '@/lib/navigation';

const BOTTOM_NAV_PATHS = ['/', '/avisos', '/documentos', '/calendario'];
const LOGO_URL = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1777603989/logo_vermelha_e2aob2.png';

export default function MobileNav({ open = false, onClose }) {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const visibleNavItems = intranetNavItems.filter(
    (item) => !BOTTOM_NAV_PATHS.includes(item.path) && canViewNavItem(item, user)
  );

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
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="MACOM" className="h-7 w-7 shrink-0 object-contain" />
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-[0.95rem] tracking-tight text-white">MACOM</span>
              <span className="mt-1 text-[0.55rem] font-medium tracking-[0.2em] text-sidebar-foreground/80">INTRANET MACOM</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
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
      </div>
    </>
  );
}

