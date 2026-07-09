import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Hash, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from '@macom/ui';
import { useBuscaMensagens } from '@/hooks/useBuscaMensagens';

function getInitials(nome) {
  if (!nome) return '?';
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function highlight(texto, termo) {
  if (!termo) return texto;
  const partes = texto.split(new RegExp(`(${termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return partes.map((parte, index) =>
    parte.toLowerCase() === termo.toLowerCase() ? (
      <mark key={index} className="rounded-sm bg-primary/20 text-inherit">
        {parte}
      </mark>
    ) : (
      parte
    ),
  );
}

export default function SearchMessagesDialog({ open, onOpenChange }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const navigate = useNavigate();
  const { data: resultados = [], isLoading, isFetching } = useBuscaMensagens({ query: debouncedSearch });

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setDebouncedSearch('');
    }
  }, [open]);

  const handleSelect = (resultado) => {
    onOpenChange(false);
    if (resultado.tipo === 'canal') {
      navigate(`/canais/${resultado.destino_slug}`);
    } else {
      navigate(`/dm/${resultado.canal_id}`);
    }
  };

  const buscaMuitoCurta = debouncedSearch.length < 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buscar mensagens</DialogTitle>
        </DialogHeader>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Digite ao menos 2 caracteres..."
          autoFocus
        />
        <div className="max-h-80 overflow-y-auto">
          {buscaMuitoCurta ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Digite ao menos 2 caracteres para buscar.</p>
          ) : isLoading || isFetching ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Buscando...</p>
          ) : resultados.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Nenhuma mensagem encontrada.</p>
          ) : (
            <ul className="space-y-0.5">
              {resultados.map((resultado) => (
                <li key={resultado.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(resultado)}
                    className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    {resultado.tipo === 'canal' ? (
                      <Hash className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-[10px]">{getInitials(resultado.autor?.nome)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-foreground">
                          {resultado.tipo === 'canal' ? resultado.destino_nome : resultado.autor?.nome}
                        </span>
                        {resultado.tipo === 'direta' ? (
                          <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                        ) : null}
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(resultado.criado_em), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <p className="truncate text-muted-foreground">{highlight(resultado.conteudo, debouncedSearch)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
