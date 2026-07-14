import React from 'react';
import { Menu, LogOut, Download } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { MACOM_LOGO_URL } from '@/config/branding';
import { useInstallPrompt } from '@/lib/useInstallPrompt';

export default function MobileHeader({ user, onMenuOpen }) {
  const { logout } = useAuth();
  const { canInstall, promptInstall } = useInstallPrompt();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-14 md:hidden"
      style={{ background: '#141414', borderBottom: '2px solid #E30613' }}
    >
      <button
        onClick={onMenuOpen}
        className="p-1.5 transition-colors"
        style={{ color: '#aaa' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#aaa'; }}
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2">
        <img src={MACOM_LOGO_URL} alt="MACOM" className="w-8 h-7 object-cover" />
        <span className="text-white font-black text-sm tracking-widest uppercase">MACOM</span>
      </div>

      <div className="flex items-center gap-1">
        {canInstall ? (
          <button
            onClick={promptInstall}
            aria-label="Instalar aplicativo"
            className="p-1.5 transition-colors"
            style={{ color: '#666' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#666'; }}
          >
            <Download className="w-5 h-5" />
          </button>
        ) : null}

        <button
          onClick={() => logout()}
          className="p-1.5 transition-colors"
          style={{ color: '#666' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E30613'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#666'; }}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
