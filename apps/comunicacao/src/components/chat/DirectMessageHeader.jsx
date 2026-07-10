import { Menu } from 'lucide-react';
import { Avatar, AvatarFallback } from '@macom/ui';

function getInitials(nome) {
  if (!nome) return '?';
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function DirectMessageHeader({ conversa, onOpenSidebar }) {
  const outro = conversa?.outros_participantes?.[0];
  if (!outro) return null;

  return (
    <header className="flex items-center gap-2 border-b border-border px-3 py-3 md:px-4">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-4 w-4" />
      </button>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="text-xs">{getInitials(outro.nome)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-foreground">{outro.nome}</h2>
        <p className="truncate text-xs text-muted-foreground">{outro.email}</p>
      </div>
    </header>
  );
}
