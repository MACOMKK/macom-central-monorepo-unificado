import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  AvatarFallback,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from '@macom/ui';
import { useColaboradores } from '@/hooks/useColaboradores';
import { useConversas } from '@/hooks/useConversas';

function getInitials(nome) {
  if (!nome) return '?';
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function NewDirectMessageDialog({ open, onOpenChange }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const navigate = useNavigate();
  const { startConversa, isStarting } = useConversas();
  const { data: colaboradores = [], isLoading } = useColaboradores(debouncedSearch);

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

  const handleSelect = async (colaborador) => {
    const conversa = await startConversa(colaborador.id);
    if (conversa?.id) {
      onOpenChange(false);
      navigate(`/dm/${conversa.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova mensagem direta</DialogTitle>
        </DialogHeader>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          autoFocus
        />
        <div className="max-h-72 overflow-y-auto">
          {isLoading ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Carregando...</p>
          ) : colaboradores.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Nenhum colaborador encontrado.</p>
          ) : (
            <ul className="space-y-0.5">
              {colaboradores.map((colaborador) => (
                <li key={colaborador.id}>
                  <button
                    type="button"
                    disabled={isStarting}
                    onClick={() => handleSelect(colaborador)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">{getInitials(colaborador.nome)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{colaborador.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{colaborador.email}</p>
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
