import React from 'react';
import { MessageSquare } from 'lucide-react';

const COMUNICACAO_URL = import.meta.env.VITE_COMUNICACAO_URL;

export default function FloatingChatButton() {
  if (!COMUNICACAO_URL) return null;

  return (
    <a
      href={COMUNICACAO_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Comunicação (abre em nova aba)"
      className="fixed right-5 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[65] flex h-14 w-14 items-center justify-center rounded-full bg-sidebar-primary text-white shadow-lg shadow-sidebar-primary/30 transition-transform hover:scale-105 hover:shadow-xl lg:bottom-5"
    >
      <MessageSquare className="h-6 w-6" />
    </a>
  );
}
