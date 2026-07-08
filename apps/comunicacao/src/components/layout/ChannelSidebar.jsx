import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Hash, LogOut, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, Button } from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';
import { useCanais } from '@/hooks/useCanais';
import { useConversas } from '@/hooks/useConversas';
import NewDirectMessageDialog from './NewDirectMessageDialog';

function getInitials(nome) {
  if (!nome) return '?';
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function ChannelSidebar() {
  const { user, logout } = useAuth();
  const { data: canais = [], isLoading } = useCanais();
  const { conversas, isLoading: isLoadingConversas } = useConversas();
  const [isNewDmOpen, setIsNewDmOpen] = useState(false);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-4">
        <h1 className="text-base font-bold text-foreground">Comunicação</h1>
        <p className="text-xs text-muted-foreground">MACOM</p>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Canais</p>
        {isLoading ? (
          <div className="px-2 py-1 text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <ul className="space-y-0.5">
            {canais.map((canal) => (
              <li key={canal.id}>
                <NavLink
                  to={`/canais/${canal.slug}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-accent font-medium text-accent-foreground'
                        : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'
                    }`
                  }
                >
                  <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {canal.nome}
                </NavLink>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-between px-2 pb-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mensagens diretas</p>
          <button
            type="button"
            onClick={() => setIsNewDmOpen(true)}
            className="rounded-md p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Nova mensagem direta"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {isLoadingConversas ? (
          <div className="px-2 py-1 text-sm text-muted-foreground">Carregando...</div>
        ) : conversas.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">Nenhuma conversa ainda.</p>
        ) : (
          <ul className="space-y-0.5">
            {conversas.map((conversa) => {
              const outro = conversa.outros_participantes?.[0];
              if (!outro) return null;
              return (
                <li key={conversa.id}>
                  <NavLink
                    to={`/dm/${conversa.id}`}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-accent font-medium text-accent-foreground'
                          : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'
                      }`
                    }
                  >
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarFallback className="text-[10px]">{getInitials(outro.nome)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate">{outro.nome}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{user?.nome}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <NewDirectMessageDialog open={isNewDmOpen} onOpenChange={setIsNewDmOpen} />
    </aside>
  );
}
