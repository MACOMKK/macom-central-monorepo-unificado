import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { canViewNavItem, intranetNavItems } from '@/lib/navigation';

const PRIMARY_PATHS = ['/', '/avisos', '/documentos', '/calendario'];
const SHORT_LABELS = {
  '/': 'Home',
  '/avisos': 'Avisos',
  '/documentos': 'Documentos',
  '/calendario': 'Agenda',
};

function getPrimaryNavItems(user) {
  const visible = intranetNavItems.filter((item) => canViewNavItem(item, user));
  const preferred = PRIMARY_PATHS.map((path) => visible.find((item) => item.path === path)).filter(Boolean);
  const rest = visible.filter((item) => !preferred.includes(item));
  return [...preferred, ...rest].slice(0, 4);
}

export default function BottomNav({ onOpenMore }) {
  const location = useLocation();
  const { user } = useAuth();
  const primaryItems = getPrimaryNavItems(user);
  const isPrimaryActive = primaryItems.some((item) => item.path === location.pathname);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar pb-safe lg:hidden">
      <div className="grid grid-cols-5">
        {primaryItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2 text-[0.65rem] font-medium transition-colors',
                isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{SHORT_LABELS[item.path] || item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenMore}
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-2 text-[0.65rem] font-medium transition-colors',
            !isPrimaryActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
          )}
        >
          <Menu className="h-5 w-5" />
          <span>Mais</span>
        </button>
      </div>
    </nav>
  );
}
