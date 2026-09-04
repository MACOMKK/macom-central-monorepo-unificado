import { useEffect, useRef, useState } from 'react';
import { Headset } from 'lucide-react';

// Numeros de contato dos responsaveis pelo suporte do sistema Servicos (WhatsApp).
const SUPPORT_CONTACTS = [
  { nome: 'Suporte I', telefone: '5591983927903' },
  { nome: 'Suporte II', telefone: '5591989566353' },
];

function buildWhatsAppLink(telefone) {
  return `https://wa.me/${telefone}`;
}

// Botao flutuante fixo, visivel em qualquer tela do app -- posicionado acima da BottomNav
// mobile (que fica em z-40, altura ~4rem + safe-area) e do InstallPromptBanner (que ocupa a
// mesma faixa inferior no mobile), por isso o offset maior em bottom no mobile.
export default function SupportButton() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.75rem)] right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6"
    >
      {open ? (
        <div className="flex flex-col gap-2 rounded-xl bg-white p-2 shadow-[0_4px_14px_rgba(0,0,0,0.25)]">
          {SUPPORT_CONTACTS.map((contact) => (
            <a
              key={contact.telefone}
              href={buildWhatsAppLink(contact.telefone)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-[#111] transition-colors hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <Headset className="h-4 w-4 shrink-0 text-[#25D366]" />
              {contact.nome}
            </a>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        title="Pedir ajuda ao suporte"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-11 items-center justify-center gap-2 rounded-full bg-[#25D366] text-white shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-transform hover:scale-105 sm:h-auto sm:w-auto sm:px-4 sm:py-3"
      >
        <Headset className="h-5 w-5 shrink-0" />
        <span className="hidden text-sm font-medium sm:inline">Suporte</span>
      </button>
    </div>
  );
}
