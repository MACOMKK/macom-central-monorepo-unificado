import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getPrimaryNavItems } from '@/lib/navigation';

const SHORT_LABELS = {
  '/': 'Dashboard',
  '/relatorios': 'Relatórios',
  '/unidades': 'Unidades',
  '/permissoes': 'Permissões',
  '/acessos': 'Acessos',
  '/logs': 'Logs',
};

export default function BottomNav({ onOpenMore }) {
  const location = useLocation();
  const { user } = useAuth();
  const primaryItems = getPrimaryNavItems(user);
  const isPrimaryActive = primaryItems.some((item) => item.path === location.pathname);
  const columns = primaryItems.length + 1;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t pb-safe md:hidden"
      style={{ background: '#141414', borderColor: '#222' }}
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {primaryItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center gap-1 py-2 text-[0.65rem] font-semibold uppercase tracking-wider transition-colors"
              style={{ color: isActive ? '#E30613' : '#777' }}
            >
              <item.icon className="h-5 w-5" />
              <span>{SHORT_LABELS[item.path] || item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenMore}
          className="flex flex-col items-center justify-center gap-1 py-2 text-[0.65rem] font-semibold uppercase tracking-wider transition-colors"
          style={{ color: !isPrimaryActive ? '#E30613' : '#777' }}
        >
          <Menu className="h-5 w-5" />
          <span>Mais</span>
        </button>
      </div>
    </nav>
  );
}
