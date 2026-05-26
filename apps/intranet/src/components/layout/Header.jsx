import React from 'react';
import { Bell, Menu, Search } from 'lucide-react';

function formatDateLabel() {
  const formatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function Header({ onMenuClick }) {
  const dateLabel = formatDateLabel();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#141414] lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0 sm:hidden">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[#E30613]">Intranet</p>
          <p className="truncate text-xs font-medium text-slate-500">{dateLabel}</p>
        </div>

        <div className="hidden items-center gap-2 text-sm font-semibold capitalize text-slate-500 sm:flex">
          {dateLabel}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative hidden w-72 md:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar na intranet..."
            readOnly
            className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm leading-5 text-slate-500 placeholder-slate-400 transition-all focus:border-[#E30613] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E30613]/15"
          />
        </div>

        <button
          type="button"
          className="relative rounded-xl border border-slate-200 p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#141414]"
          aria-label="Notificacoes"
        >
          <Bell size={20} />
          <span className="absolute right-1.5 top-1.5 block h-2.5 w-2.5 rounded-full bg-[#E30613] ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}
