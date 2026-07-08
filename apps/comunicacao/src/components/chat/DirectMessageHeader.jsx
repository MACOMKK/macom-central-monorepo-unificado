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

export default function DirectMessageHeader({ conversa }) {
  const outro = conversa?.outros_participantes?.[0];
  if (!outro) return null;

  return (
    <header className="flex items-center gap-2 border-b border-border px-4 py-3">
      <Avatar className="h-7 w-7">
        <AvatarFallback className="text-xs">{getInitials(outro.nome)}</AvatarFallback>
      </Avatar>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{outro.nome}</h2>
        <p className="text-xs text-muted-foreground">{outro.email}</p>
      </div>
    </header>
  );
}
