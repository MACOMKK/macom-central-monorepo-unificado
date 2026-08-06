import { useEffect, useMemo, useState } from 'react';
import { Banknote, Loader2, Plus, Trash2 } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@macom/ui';
import SolicitacaoDrawer from '@/components/SolicitacaoDrawer';

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

  const [dialogRow, setDialogRow] = useState(null);
  const [parcelas, setParcelas] = useState([]);
  const [draftParcelas, setDraftParcelas] = useState([]);
  const [parcelasLoading, setParcelasLoading] = useState(false);
  const [savingParcelas, setSavingParcelas] = useState(false);
  const [payingParcelaId, setPayingParcelaId] = useState(null);

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

  async function handlePagarAVista(row) {
    setProcessingId(row.id);
    try {
      const created = await financeiroApi.parcelas.criar(row.id, [{ valor: Number(row.valor), data_vencimento: null }]);
      await financeiroApi.parcelas.registrarPagamento(created[0].id);
      toast({ title: 'Solicitacao marcada como paga' });
      setRows((current) => current.filter((r) => r.id !== row.id));
    } catch (error) {
      toast({ title: 'Nao foi possivel marcar como paga', description: error.message });
    } finally {
      setProcessingId(null);
    }
  }

  async function openParcelas(row) {
    setDialogRow(row);
    setParcelasLoading(true);
    try {
      const data = await financeiroApi.parcelas.list(row.id);
      setParcelas(data);
      setDraftParcelas(
        data.length
          ? []
          : [{ valor: row.valor, data_vencimento: '' }],
      );
    } catch (error) {
      toast({ title: 'Nao foi possivel carregar as parcelas', description: error.message });
    } finally {
      setParcelasLoading(false);
    }
  }

  function closeDialog() {
    setDialogRow(null);
    setParcelas([]);
    setDraftParcelas([]);
  }

  function addDraftParcela() {
    setDraftParcelas((current) => [...current, { valor: '', data_vencimento: '' }]);
  }

  function updateDraftParcela(index, field, value) {
    setDraftParcelas((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function removeDraftParcela(index) {
    setDraftParcelas((current) => current.filter((_, i) => i !== index));
  }

  async function handleSalvarPlano() {
    if (!dialogRow) return;
    setSavingParcelas(true);
    try {
      const data = await financeiroApi.parcelas.criar(
        dialogRow.id,
        draftParcelas.map((item) => ({ valor: Number(item.valor), data_vencimento: item.data_vencimento || null })),
      );
      setParcelas(data);
      setDraftParcelas([]);
      toast({ title: 'Plano de pagamento definido' });
    } catch (error) {
      toast({ title: 'Nao foi possivel salvar o plano de pagamento', description: error.message });
    } finally {
      setSavingParcelas(false);
    }
  }

  async function handlePagarParcela(parcelaId) {
    setPayingParcelaId(parcelaId);
    try {
      const result = await financeiroApi.parcelas.registrarPagamento(parcelaId);
      setParcelas((current) => current.map((item) => (item.id === parcelaId ? result : item)));
      const todasPagas = parcelas.every((item) => item.id === parcelaId || item.status === 'pago');
      if (todasPagas) {
        toast({ title: 'Solicitacao marcada como paga' });
        setRows((current) => current.filter((row) => row.id !== dialogRow?.id));
        closeDialog();
      } else {
        toast({ title: 'Parcela paga' });
      }
    } catch (error) {
      toast({ title: 'Nao foi possivel registrar o pagamento', description: error.message });
    } finally {
      setPayingParcelaId(null);
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
                <TableRow key={row.id} className="cursor-pointer" onClick={() => openParcelas(row)}>
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
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        disabled={processingId === row.id}
                        onClick={(event) => { event.stopPropagation(); handlePagarAVista(row); }}
                      >
                        <Banknote className="mr-1 h-4 w-4" />
                        Marcar como pago
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <SolicitacaoDrawer
        solicitacao={dialogRow}
        onOpenChange={(open) => !open && closeDialog()}
        parcelasSlot={
          parcelasLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          ) : parcelas.length > 0 ? (
            <div className="space-y-2">
              {parcelas.map((parcela) => (
                <div key={parcela.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">Parcela {parcela.numero} — {formatValor(parcela.valor)}</p>
                    <p className="text-muted-foreground">Vencimento: {formatData(parcela.data_vencimento)}</p>
                  </div>
                  {parcela.status === 'pago' ? (
                    <Badge>Paga</Badge>
                  ) : (
                    <Button
                      size="sm"
                      disabled={payingParcelaId === parcela.id}
                      onClick={() => handlePagarParcela(parcela.id)}
                    >
                      Marcar como paga
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {draftParcelas.map((item, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <span className="text-xs text-muted-foreground">Valor (R$)</span>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.valor}
                      onChange={(event) => updateDraftParcela(index, 'valor', event.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-xs text-muted-foreground">Vencimento</span>
                    <Input
                      type="date"
                      value={item.data_vencimento}
                      onChange={(event) => updateDraftParcela(index, 'data_vencimento', event.target.value)}
                    />
                  </div>
                  {draftParcelas.length > 1 && (
                    <Button variant="outline" size="icon" onClick={() => removeDraftParcela(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addDraftParcela}>
                <Plus className="mr-1 h-4 w-4" />
                Adicionar parcela
              </Button>
              <Button
                className="w-full"
                onClick={handleSalvarPlano}
                disabled={savingParcelas || draftParcelas.length === 0}
              >
                {savingParcelas ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar plano de pagamento
              </Button>
            </div>
          )
        }
      />
    </div>
  );
}
