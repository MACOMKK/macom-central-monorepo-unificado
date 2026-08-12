import { useEffect, useRef, useState } from 'react';
import { LogOut, Menu } from 'lucide-react';

import { Button } from '@macom/ui';
import NotificationsBell from '@/components/NotificationsBell';
import { useAuth } from '@/lib/AuthContext';

const ROLE_LABEL = {
  solicitante: 'Solicitante',
  aprovador: 'Aprovador',
  financeiro: 'Financeiro',
};

function getInitials(name) {
  return (
    (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'U'
  );
}

export default function Header({ onOpenMobileMenu }) {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMobileMenu}>
        <Menu className="h-5 w-5" />
      </Button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <NotificationsBell />

        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold uppercase text-primary-foreground transition-colors hover:opacity-90"
            aria-label="Abrir menu da conta"
          >
            {getInitials(user?.name)}
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-11 z-50 w-64 rounded-md border border-border bg-card p-4 shadow-2xl">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABEL[user?.role] || user?.role}</p>

              <div className="my-3 h-px bg-border" />

              <button
                type="button"
                onClick={() => logout()}
                className="flex w-full items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
