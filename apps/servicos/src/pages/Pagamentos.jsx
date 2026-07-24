import { useEffect, useMemo, useState } from 'react';
import { Banknote, Loader2 } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast } from '@macom/ui';

const FORMA_PAGAMENTO_LABEL = {
  pix: 'Pix',
  boleto: 'Boleto',
  transferencia: 'Transferencia',
  cartao: 'Cartao',
  outros: 'Outros',
};

function formatValor(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

function getVencimentoInfo(dataVencimento) {
  if (!dataVencimento) return { label: 'Sem vencimento', variant: 'outline' };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(`${dataVencimento}T00:00:00`);
  const diffDias = Math.round((vencimento - hoje) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return { label: 'Atrasado', variant: 'destructive' };
  if (diffDias <= 3) return { label: 'Vence em breve', variant: 'secondary' };
  return { label: 'No prazo', variant: 'outline' };
}

export default function Pagamentos() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await financeiroApi.solicitacoes.list({ status: 'aprovado', order_by: 'data_vencimento' });
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

  const resumo = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + Number(row.valor || 0), 0);
    const atrasadas = rows.filter((row) => getVencimentoInfo(row.data_vencimento).label === 'Atrasado').length;
    return { total, atrasadas };
  }, [rows]);

  async function handlePagar(id) {
    setProcessingId(id);
    try {
      await financeiroApi.solicitacoes.setStatus(id, 'pago');
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Contas a pagar</h2>
        {!loading && rows.length > 0 && (
          <div className="text-right text-sm">
            <p className="font-semibold">{formatValor(resumo.total)} a pagar</p>
            {resumo.atrasadas > 0 && (
              <p className="text-destructive">{resumo.atrasadas} atrasada{resumo.atrasadas > 1 ? 's' : ''}</p>
            )}
          </div>
        )}
      </div>

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
              <TableHead>Solicitante</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Forma de pagamento</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const vencimentoInfo = getVencimentoInfo(row.data_vencimento);
              return (
                <TableRow key={row.id}>
                  <TableCell>{row.solicitante_nome}</TableCell>
                  <TableCell className="font-medium">{row.fornecedor}</TableCell>
                  <TableCell className="max-w-xs truncate">{row.descricao}</TableCell>
                  <TableCell>{formatValor(row.valor)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{formatData(row.data_vencimento)}</span>
                      <Badge variant={vencimentoInfo.variant}>{vencimentoInfo.label}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>{FORMA_PAGAMENTO_LABEL[row.forma_pagamento] || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" disabled={processingId === row.id} onClick={() => handlePagar(row.id)}>
                      <Banknote className="mr-1 h-4 w-4" />
                      Marcar como pago
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
