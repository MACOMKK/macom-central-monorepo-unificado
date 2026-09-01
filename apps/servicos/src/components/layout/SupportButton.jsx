import { Headset } from 'lucide-react';

// Numero de contato do responsavel pelo suporte do sistema Servicos (WhatsApp).
const SUPPORT_PHONE = '5591983927903';
const SUPPORT_LINK = `https://wa.me/${SUPPORT_PHONE}`;

// Botao flutuante fixo, visivel em qualquer tela do app -- posicionado acima da BottomNav
// mobile (que fica em z-40, altura ~4rem + safe-area) e do InstallPromptBanner (que ocupa a
// mesma faixa inferior no mobile), por isso o offset maior em bottom no mobile.
export default function SupportButton() {
  return (
    <a
      href={SUPPORT_LINK}
      target="_blank"
      rel="noopener noreferrer"
      title="Pedir ajuda ao suporte"
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.75rem)] right-4 z-50 flex h-11 w-11 items-center justify-center gap-2 rounded-full bg-[#25D366] text-white shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-transform hover:scale-105 sm:bottom-6 sm:right-6 sm:h-auto sm:w-auto sm:px-4 sm:py-3"
    >
      <Headset className="h-5 w-5 shrink-0" />
      <span className="hidden text-sm font-medium sm:inline">Suporte</span>
    </a>
  );
}
