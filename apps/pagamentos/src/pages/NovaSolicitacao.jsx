import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Paperclip } from 'lucide-react';

import { pagamentosApi } from '@macom/api-client/pagamentosApi';
import { supabase } from '@macom/api-client/supabaseClient';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';

const CATEGORIAS = [
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'servico', label: 'Servico' },
  { value: 'viagem', label: 'Viagem' },
  { value: 'reembolso', label: 'Reembolso' },
  { value: 'outros', label: 'Outros' },
];

const MAX_COMPROVANTE_SIZE = 5 * 1024 * 1024;

export default function NovaSolicitacao() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [fornecedor, setFornecedor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('outros');
  const [comprovante, setComprovante] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > MAX_COMPROVANTE_SIZE) {
      toast({ title: 'Arquivo muito grande', description: 'O comprovante deve ter no maximo 5 MB.' });
      event.target.value = '';
      return;
    }
    setComprovante(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      let comprovante_path = null;

      if (comprovante) {
        const extension = comprovante.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(pagamentosApi.storage.bucket)
          .upload(path, comprovante, { upsert: false });

        if (uploadError) throw uploadError;
        comprovante_path = path;
      }

      await pagamentosApi.solicitacoes.create({
        fornecedor,
        descricao,
        valor: Number(valor),
        categoria,
        comprovante_path,
      });

      toast({ title: 'Solicitacao enviada', description: 'Sua solicitacao de pagamento foi registrada.' });
      navigate('/solicitacoes');
    } catch (error) {
      toast({ title: 'Nao foi possivel enviar', description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Nova solicitacao de pagamento</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fornecedor">Fornecedor</Label>
            <Input
              id="fornecedor"
              value={fornecedor}
              onChange={(event) => setFornecedor(event.target.value)}
              placeholder="Nome do fornecedor ou beneficiario"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descricao</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="O que esta sendo pago"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                min="0.01"
                step="0.01"
                value={valor}
                onChange={(event) => setValor(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger id="categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comprovante">Comprovante (opcional, max 5 MB)</Label>
            <label
              htmlFor="comprovante"
              className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 text-sm text-muted-foreground hover:bg-accent"
            >
              <Paperclip className="h-4 w-4" />
              {comprovante ? comprovante.name : 'Selecionar arquivo'}
            </label>
            <input id="comprovante" type="file" className="hidden" onChange={handleFileChange} />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar solicitacao'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
