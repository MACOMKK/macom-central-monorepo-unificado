import { useNavigate } from 'react-router-dom';
import { Archive, Hash, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useCanais } from '@/hooks/useCanais';

export default function ChannelHeader({ canal, onOpenSidebar }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: canais = [], archiveCanal, isArchiving, leaveCanal, isLeaving } = useCanais();

  if (!canal) return null;

  const canArchive = user?.accessLevel === 'admin' || (canal.criado_por && canal.criado_por === user?.id);
  const proximoCanal = () => canais.find((item) => item.id !== canal.id && item.membro);

  const handleArchive = async () => {
    if (!window.confirm(`Arquivar o canal "${canal.nome}"? Ele deixará de aparecer na lista.`)) {
      return;
    }
    await archiveCanal(canal.id);
    const proximo = proximoCanal();
    navigate(proximo ? `/canais/${proximo.slug}` : '/canais');
  };

  const handleLeave = async () => {
    if (!window.confirm(`Sair do canal "${canal.nome}"? Você deixará de ver as mensagens dele.`)) {
      return;
    }
    await leaveCanal(canal.id);
    const proximo = proximoCanal();
    navigate(proximo ? `/canais/${proximo.slug}` : '/canais');
  };

  return (
    <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 md:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">{canal.nome}</h2>
          {canal.descricao ? <p className="truncate text-xs text-muted-foreground">{canal.descricao}</p> : null}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleLeave}
          disabled={isLeaving}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          aria-label="Sair do canal"
          title="Sair do canal"
        >
          <LogOut className="h-4 w-4" />
        </button>
        {canArchive ? (
          <button
            type="button"
            onClick={handleArchive}
            disabled={isArchiving}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            aria-label="Arquivar canal"
            title="Arquivar canal"
          >
            <Archive className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </header>
  );
}
