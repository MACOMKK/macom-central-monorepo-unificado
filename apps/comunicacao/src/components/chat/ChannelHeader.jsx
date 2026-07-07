import { Hash } from 'lucide-react';

export default function ChannelHeader({ canal }) {
  if (!canal) return null;

  return (
    <header className="flex items-center gap-2 border-b border-border px-4 py-3">
      <Hash className="h-4 w-4 text-muted-foreground" />
      <div>
        <h2 className="text-sm font-semibold text-foreground">{canal.nome}</h2>
        {canal.descricao ? <p className="text-xs text-muted-foreground">{canal.descricao}</p> : null}
      </div>
    </header>
  );
}
