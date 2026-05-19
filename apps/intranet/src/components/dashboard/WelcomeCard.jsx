import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Bell } from 'lucide-react';

export default function WelcomeCard({ user }) {
  const now = new Date();
  const dateStr = format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center gap-4">
        <p className="text-muted-foreground text-sm capitalize flex-1">{dateStr}</p>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 w-64">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Buscar na intranet..."
              className="bg-transparent text-sm outline-none w-full text-muted-foreground placeholder:text-muted-foreground/70"
              readOnly
            />
          </div>
          <button className="relative p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>

      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl p-7 text-white bg-gradient-to-br from-sidebar via-sidebar to-sidebar-accent"
      >
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #4f7fff 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-1/3 w-56 h-56 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #4f7fff 0%, transparent 70%)', transform: 'translateY(40%)' }} />
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold">
            Olá, {user?.full_name?.split(' ')[0] || 'Colaborador'}! 👋
          </h1>
          <p className="text-white/65 mt-2 text-sm max-w-xl">
            Bem-vindo à Intranet Mitmacom. Aqui você encontra tudo que precisa para o seu dia a dia, comunicados importantes e acesso rápido aos nossos sistemas.
          </p>
        </div>
      </div>
    </div>
  );
}