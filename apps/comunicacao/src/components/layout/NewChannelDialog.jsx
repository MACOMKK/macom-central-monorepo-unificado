import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@macom/ui';
import { useCanais } from '@/hooks/useCanais';

export default function NewChannelDialog({ open, onOpenChange }) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { createCanal, isCreating } = useCanais();

  useEffect(() => {
    if (!open) {
      setNome('');
      setDescricao('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!nome.trim()) {
      setError('Informe um nome para o canal.');
      return;
    }

    try {
      const canal = await createCanal({ nome: nome.trim(), descricao: descricao.trim() });
      if (canal?.slug) {
        onOpenChange(false);
        navigate(`/canais/${canal.slug}`);
      }
    } catch (err) {
      setError(err?.message || 'Nao foi possivel criar o canal.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo canal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="novo-canal-nome">Nome</Label>
            <Input
              id="novo-canal-nome"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Ex.: Marketing"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="novo-canal-descricao">Descrição (opcional)</Label>
            <Textarea
              id="novo-canal-descricao"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="Do que trata este canal?"
              rows={3}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={isCreating} className="w-full">
            {isCreating ? 'Criando...' : 'Criar canal'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
