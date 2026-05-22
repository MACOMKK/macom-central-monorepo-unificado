import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Bell } from 'lucide-react';

export default function WelcomeCard() {
  const now = new Date();
  const dateStr = format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="flex flex-col gap-4 rounded-[26px] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <p className="flex-1 text-sm font-semibold capitalize text-slate-500">{dateStr}</p>
      <div className="ml-auto flex w-full items-center gap-3 sm:w-auto">
        <div className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:w-[320px]">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar na intranet..."
            className="w-full bg-transparent text-sm text-slate-500 outline-none placeholder:text-slate-400"
            readOnly
          />
        </div>
        <button className="relative rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-400 transition-colors hover:text-slate-700">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-red-500" />
        </button>
      </div>
    </div>
  );
}
