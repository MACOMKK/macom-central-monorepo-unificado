import { useEffect, useState } from 'react';
import { Banknote, Loader2 } from 'lucide-react';

import { pagamentosApi } from '@macom/api-client/pagamentosApi';
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast } from '@macom/ui';

function formatValor(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

export default function Pagamentos() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await pagamentosApi.solicitacoes.list({ status: 'aprovado' });
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

  async function handlePagar(id) {
    setProcessingId(id);
    try {
      await pagamentosApi.solicitacoes.setStatus(id, 'pago');
      toast({ title: 'Solicitacao marcada como paga' });
      setRows((current) => current.filter((row) => row.id !== id));
    } catch (error) {
      toast({ title: 'Nao foi possivel marcar como paga', description: error.message });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Solicitacoes aprovadas aguardando pagamento</h2>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma solicitacao aguardando pagamento.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Aprovado em</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.fornecedor}</TableCell>
                <TableCell className="max-w-xs truncate">{row.descricao}</TableCell>
                <TableCell>{formatValor(row.valor)}</TableCell>
                <TableCell>{formatData(row.analisado_em)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" disabled={processingId === row.id} onClick={() => handlePagar(row.id)}>
                    <Banknote className="mr-1 h-4 w-4" />
                    Marcar como pago
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
