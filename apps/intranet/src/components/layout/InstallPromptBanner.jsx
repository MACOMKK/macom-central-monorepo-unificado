import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '@/lib/useInstallPrompt';

const SHOW_DELAY_MS = 2500;

export default function InstallPromptBanner() {
  const { canShowBanner, promptInstall, dismiss } = useInstallPrompt();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canShowBanner) {
      setVisible(false);
      return undefined;
    }
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [canShowBanner]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[360px]">
      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E30613]/10 text-[#E30613]">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#141414]">Instalar a Intranet</p>
          <p className="mt-0.5 text-xs leading-4 text-slate-500">
            Adicione o app à tela inicial para acesso rápido e em tela cheia.
          </p>
          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              onClick={promptInstall}
              className="rounded-full bg-[#E30613] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#c80510]"
            >
              Instalar
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 transition-colors hover:text-[#141414]"
            >
              Agora não
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar"
          className="shrink-0 text-slate-400 transition-colors hover:text-[#141414]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
