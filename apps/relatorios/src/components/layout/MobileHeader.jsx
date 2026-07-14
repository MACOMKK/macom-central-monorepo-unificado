import React from 'react';
import { Download } from 'lucide-react';
import { MACOM_LOGO_URL } from '@/config/branding';
import { useInstallPrompt } from '@/lib/useInstallPrompt';

export default function MobileHeader() {
  const { canInstall, promptInstall } = useInstallPrompt();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-20 grid grid-cols-3 items-center px-4 h-14 md:hidden"
      style={{ background: '#141414', borderBottom: '2px solid #E30613' }}
    >
      <div />

      <div className="flex items-center justify-center gap-2">
        <img src={MACOM_LOGO_URL} alt="MACOM" className="w-8 h-7 object-cover" />
        <span className="text-white font-black text-sm tracking-widest uppercase">MACOM</span>
      </div>

      <div className="flex items-center justify-end gap-1">
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
      </div>
    </header>
  );
}
