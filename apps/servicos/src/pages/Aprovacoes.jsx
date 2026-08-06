import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import { Button, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea, useToast } from '@macom/ui';
import SolicitacaoDrawer from '@/components/SolicitacaoDrawer';

function formatValor(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

export default function Aprovacoes() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [observacoes, setObservacoes] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [selected, setSelected] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await financeiroApi.solicitacoes.list({ status: 'pendente' });
      setRows(data);
    } catch (error) {
      toast({ title: 'Nao foi possivel carregar as solicitacoes', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDecision(id, status) {
    setProcessingId(id);
    try {
      await financeiroApi.solicitacoes.setStatus(id, status, observacoes[id] || null);
      toast({
        title: status === 'aprovado' ? 'Solicitacao aprovada' : 'Solicitacao reprovada',
      });
      setRows((current) => current.filter((row) => row.id !== id));
      setSelected((current) => (current?.id === id ? null : current));
    } catch (error) {
      toast({ title: 'Nao foi possivel processar a solicitacao', description: error.message });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Solicitacoes pendentes de aprovacao</h2>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma solicitacao pendente.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Solicitante</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelected(row)}>
                <TableCell>{row.solicitante_nome}</TableCell>
                <TableCell className="font-medium">{row.fornecedor}</TableCell>
                <TableCell className="max-w-xs truncate">{row.descricao}</TableCell>
                <TableCell>{formatValor(row.valor)}</TableCell>
                <TableCell>{formatData(row.criado_em)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); setSelected(row); }}>
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <SolicitacaoDrawer
        solicitacao={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        footer={
          selected && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="observacao-analise">Observacao (opcional)</Label>
                <Textarea
                  id="observacao-analise"
                  rows={2}
                  placeholder="Observacao (opcional)"
                  value={observacoes[selected.id] || ''}
                  onChange={(event) =>
                    setObservacoes((current) => ({ ...current, [selected.id]: event.target.value }))
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={processingId === selected.id}
                  onClick={() => handleDecision(selected.id, 'reprovado')}
                >
                  <X className="mr-1 h-4 w-4" />
                  Reprovar
                </Button>
                <Button disabled={processingId === selected.id} onClick={() => handleDecision(selected.id, 'aprovado')}>
                  <Check className="mr-1 h-4 w-4" />
                  Aprovar
                </Button>
              </div>
            </div>
          )
        }
      />
    </div>
  );
}
