import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Hash, LogOut, Plus, Search } from 'lucide-react';
import { Avatar, AvatarFallback, Button } from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';
import { useCanais } from '@/hooks/useCanais';
import { useConversas } from '@/hooks/useConversas';
import { usePresence } from '@/hooks/usePresence';
import NewChannelDialog from './NewChannelDialog';
import NewDirectMessageDialog from './NewDirectMessageDialog';
import SearchMessagesDialog from './SearchMessagesDialog';

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
  const navigate = useNavigate();
  const { data: canais = [], isLoading, joinCanal, isJoining } = useCanais();
  const { conversas, isLoading: isLoadingConversas } = useConversas();
  const { onlineIds } = usePresence();
  const [isNewDmOpen, setIsNewDmOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewChannelOpen, setIsNewChannelOpen] = useState(false);

  const meusCanais = canais.filter((canal) => canal.membro);
  const canaisDisponiveis = canais.filter((canal) => !canal.membro);

  const handleJoin = async (canal) => {
    await joinCanal(canal.id);
    navigate(`/canais/${canal.slug}`);
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-4">
        <h1 className="text-base font-bold text-foreground">Comunicação</h1>
        <p className="text-xs text-muted-foreground">MACOM</p>
      </div>

      <div className="px-2 pt-2">
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="flex w-full items-center gap-2 rounded-md border border-border px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          Buscar mensagens...
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <div className="flex items-center justify-between px-2 pb-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Canais</p>
          <button
            type="button"
            onClick={() => setIsNewChannelOpen(true)}
            className="rounded-md p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Novo canal"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {isLoading ? (
          <div className="px-2 py-1 text-sm text-muted-foreground">Carregando...</div>
        ) : meusCanais.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">Você ainda não entrou em nenhum canal.</p>
        ) : (
          <ul className="space-y-0.5">
            {meusCanais.map((canal) => (
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
                  <span className="min-w-0 flex-1 truncate">{canal.nome}</span>
                  {canal.nao_lidas > 0 ? (
                    <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                      {canal.nao_lidas > 99 ? '99+' : canal.nao_lidas}
                    </span>
                  ) : null}
                </NavLink>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && canaisDisponiveis.length > 0 ? (
          <>
            <p className="mt-4 px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Canais disponíveis
            </p>
            <ul className="space-y-0.5">
              {canaisDisponiveis.map((canal) => (
                <li key={canal.id}>
                  <button
                    type="button"
                    disabled={isJoining}
                    onClick={() => handleJoin(canal)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground/80 hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{canal.nome}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">Entrar</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

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
                    <span className="relative shrink-0">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px]">{getInitials(outro.nome)}</AvatarFallback>
                      </Avatar>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-card ${
                          onlineIds.has(outro.id) ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                        }`}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{outro.nome}</span>
                    {conversa.nao_lidas > 0 ? (
                      <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                        {conversa.nao_lidas > 99 ? '99+' : conversa.nao_lidas}
                      </span>
                    ) : null}
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
      <SearchMessagesDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <NewChannelDialog open={isNewChannelOpen} onOpenChange={setIsNewChannelOpen} />
    </aside>
  );
}
