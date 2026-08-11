import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Paperclip, Plus, Trash2, X } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  useToast,
} from '@macom/ui';
import PaymentSuccessOverlay from '@/components/PaymentSuccessOverlay';
import SolicitacaoDrawer from '@/components/SolicitacaoDrawer';
import { useCategorias } from '@/hooks/useCatalogos';
import { isAllowedAnexoMimeType, MAX_ANEXO_SIZE, uploadAnexo } from '@/lib/anexoUpload';
import { getFriendlyErrorMessage } from '@/lib/errorMessage';
import { formatData, formatValor, FORMA_PAGAMENTO_LABEL } from '@/lib/financeiroFormat';

const CATEGORIA_FILTRO_TODAS = 'todas';
const CLASSIFICACAO_TODAS = 'todas';
const CLASSIFICACAO_PARCIAL = 'parcial';

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

function isParcialmentePago(row) {
  const total = Number(row.parcelas_total || 0);
  const pagas = Number(row.parcelas_pagas || 0);
  return total > 0 && pagas > 0 && pagas < total;
}

export default function Pagamentos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categorias = [] } = useCategorias();
  const [categoriaFiltro, setCategoriaFiltro] = useState(CATEGORIA_FILTRO_TODAS);
  const [classificacaoFiltro, setClassificacaoFiltro] = useState(CLASSIFICACAO_TODAS);

  const [dialogRowId, setDialogRowId] = useState(null);
  const [draftParcelas, setDraftParcelas] = useState([]);

  const [reprovarTarget, setReprovarTarget] = useState(null);
  const [motivoReprovacao, setMotivoReprovacao] = useState('');

  const [pagamentoTarget, setPagamentoTarget] = useState(null);
  const [comprovantes, setComprovantes] = useState([]);
  const [successOverlay, setSuccessOverlay] = useState(null);

  const solicitacoesQuery = useQuery({
    queryKey: ['servicos', 'solicitacoes', 'aprovadas', categoriaFiltro],
    queryFn: () => {
      const filters = { status: 'aprovado', order_by: 'data_vencimento' };
      if (categoriaFiltro !== CATEGORIA_FILTRO_TODAS) filters.categoria_id = categoriaFiltro;
      return financeiroApi.solicitacoes.list(filters);
    },
  });
  const rows = solicitacoesQuery.data || [];
  const loading = solicitacoesQuery.isLoading;
  const dialogRow = rows.find((row) => row.id === dialogRowId) || null;

  const parcelasQuery = useQuery({
    queryKey: ['servicos', 'parcelas', dialogRowId],
    queryFn: () => financeiroApi.parcelas.list(dialogRowId),
    enabled: Boolean(dialogRowId),
  });
  const parcelas = parcelasQuery.data || [];

  useEffect(() => {
    if (!dialogRowId || !parcelasQuery.data) {
      setDraftParcelas([]);
      return;
    }
    setDraftParcelas(parcelasQuery.data.length ? [] : [{ valor: dialogRow?.valor, data_vencimento: '' }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogRowId, parcelasQuery.data]);

  const visibleRows = useMemo(() => {
    if (classificacaoFiltro !== CLASSIFICACAO_PARCIAL) return rows;
    return rows.filter(isParcialmentePago);
  }, [rows, classificacaoFiltro]);

  const resumo = useMemo(() => {
    const total = visibleRows.reduce((sum, row) => sum + Number(row.valor || 0), 0);
    const atrasadas = visibleRows.filter((row) => getVencimentoInfo(row.data_vencimento).label === 'Atrasado').length;
    return { total, atrasadas };
  }, [visibleRows]);

  function openPagamentoAVista(row) {
    setPagamentoTarget({ type: 'avista', row });
    setComprovantes([]);
  }

  function openPagamentoParcela(row, parcelaId) {
    setPagamentoTarget({ type: 'parcela', row, parcelaId });
    setComprovantes([]);
  }

  function closePagamentoDialog() {
    setPagamentoTarget(null);
    setComprovantes([]);
  }

  function handleComprovanteChange(event) {
    const files = Array.from(event.target.files || []);
    const tooBig = files.find((file) => file.size > MAX_ANEXO_SIZE);
    if (tooBig) {
      toast({ title: 'Arquivo muito grande', description: `"${tooBig.name}" deve ter no maximo 5 MB.` });
      event.target.value = '';
      return;
    }
    const tipoInvalido = files.find((file) => !isAllowedAnexoMimeType(file));
    if (tipoInvalido) {
      toast({ title: 'Tipo de arquivo nao suportado', description: `"${tipoInvalido.name}" deve ser PDF, JPEG, PNG ou WebP.` });
      event.target.value = '';
      return;
    }
    setComprovantes((current) => [...current, ...files]);
    event.target.value = '';
  }

  function removeComprovante(index) {
    setComprovantes((current) => current.filter((_, i) => i !== index));
  }

  function uploadComprovantesEmBackground(solicitacaoId, parcelaId, files) {
    if (!files || files.length === 0) return;

    Promise.allSettled(
      files.map((file) =>
        uploadAnexo({ file, solicitacaoId, categoria: 'comprovante_pagamento', parcelaId }),
      ),
    ).then((results) => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'anexos', solicitacaoId] });
      const falhas = results.filter((result) => result.status === 'rejected');
      if (falhas.length > 0) {
        toast({
          title: falhas.length === 1 ? 'Um comprovante nao foi enviado' : `${falhas.length} comprovantes nao foram enviados`,
          description: `O pagamento foi registrado normalmente, mas houve falha no envio: ${getFriendlyErrorMessage(falhas[0].reason)}.`,
        });
      }
    });
  }

  const confirmarPagamentoMutation = useMutation({
    mutationFn: async ({ type, row, parcelaId }) => {
      let parcelaAlvoId = parcelaId;

      if (type === 'avista') {
        const existentes = await financeiroApi.parcelas.list(row.id);
        const pendente = existentes.find((item) => item.status === 'pendente');
        if (pendente) {
          parcelaAlvoId = pendente.id;
        } else {
          const created = await financeiroApi.parcelas.criar(row.id, [
            { valor: Number(row.valor), data_vencimento: row.data_vencimento || null },
          ]);
          parcelaAlvoId = created[0].id;
        }
      }

      await financeiroApi.parcelas.registrarPagamento(parcelaAlvoId);
      return { type, row, parcelaAlvoId };
    },
    onMutate: ({ type, row, parcelaId }) => {
      const aprovadasKey = ['servicos', 'solicitacoes', 'aprovadas', categoriaFiltro];
      const parcelasKey = ['servicos', 'parcelas', row.id];
      const previousAprovadas = queryClient.getQueryData(aprovadasKey);
      const previousParcelas = queryClient.getQueryData(parcelasKey);

      if (type === 'avista') {
        // Pagamento a vista quita a solicitacao inteira — some da fila de "Contas a pagar".
        queryClient.setQueryData(aprovadasKey, (old) => (old || []).filter((item) => item.id !== row.id));
      } else if (parcelaId) {
        // Pagamento de uma parcela especifica — so marca ela como paga; a solicitacao so sai da
        // fila quando TODAS as parcelas estiverem pagas (regra calculada no servidor), entao a
        // lista de "aprovadas" nao e tocada aqui.
        queryClient.setQueryData(parcelasKey, (old) =>
          (old || []).map((item) => (item.id === parcelaId ? { ...item, status: 'pago' } : item)),
        );
      }

      closePagamentoDialog();
      setSuccessOverlay(type === 'avista' ? 'Solicitacao marcada como paga' : 'Parcela paga');

      return { aprovadasKey, parcelasKey, previousAprovadas, previousParcelas };
    },
    onSuccess: ({ row, parcelaAlvoId }, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'solicitacoes'] });
      queryClient.invalidateQueries({ queryKey: context.parcelasKey });
      uploadComprovantesEmBackground(row.id, parcelaAlvoId, variables.files);
    },
    onError: (error, variables, context) => {
      if (context?.previousAprovadas !== undefined) queryClient.setQueryData(context.aprovadasKey, context.previousAprovadas);
      if (context?.previousParcelas !== undefined) queryClient.setQueryData(context.parcelasKey, context.previousParcelas);
      setSuccessOverlay(null);
      setPagamentoTarget({ type: variables.type, row: variables.row, parcelaId: variables.parcelaId });
      setComprovantes(variables.files);
      toast({
        title: 'Nao foi possivel registrar o pagamento',
        description: `${getFriendlyErrorMessage(error)} Revise e tente novamente.`,
      });
    },
  });

  function handleConfirmarPagamento() {
    if (!pagamentoTarget) return;
    confirmarPagamentoMutation.mutate({ ...pagamentoTarget, files: comprovantes });
  }

  function closeReprovar() {
    setReprovarTarget(null);
    setMotivoReprovacao('');
  }

  const reprovarMutation = useMutation({
    mutationFn: ({ id, motivo }) => financeiroApi.solicitacoes.setStatus(id, 'reprovado', motivo),
    onMutate: ({ id }) => {
      const queryKey = ['servicos', 'solicitacoes', 'aprovadas', categoriaFiltro];
      const previous = queryClient.getQueryData(queryKey);
      const targetSnapshot = reprovarTarget;
      const motivoSnapshot = motivoReprovacao;
      queryClient.setQueryData(queryKey, (old) => (old || []).filter((row) => row.id !== id));
      closeReprovar();
      return { queryKey, previous, targetSnapshot, motivoSnapshot };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'solicitacoes'] });
      toast({ title: 'Solicitacao reprovada', description: 'O solicitante foi notificado para corrigir e reenviar.' });
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
      setReprovarTarget(context?.targetSnapshot ?? null);
      setMotivoReprovacao(context?.motivoSnapshot ?? '');
      toast({
        title: 'Nao foi possivel reprovar a solicitacao',
        description: `${getFriendlyErrorMessage(error)} Revise e tente novamente.`,
      });
    },
  });

  function handleReprovar() {
    if (!reprovarTarget || !motivoReprovacao.trim()) return;
    reprovarMutation.mutate({ id: reprovarTarget.id, motivo: motivoReprovacao.trim() });
  }

  function openParcelas(row) {
    setDialogRowId(row.id);
  }

  function closeDialog() {
    setDialogRowId(null);
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

  const criarParcelasMutation = useMutation({
    mutationFn: (parcelasPayload) => financeiroApi.parcelas.criar(dialogRowId, parcelasPayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'parcelas', dialogRowId] });
      setDraftParcelas([]);
      toast({ title: 'Plano de pagamento definido' });
    },
    onError: (error) => {
      toast({ title: 'Nao foi possivel salvar o plano de pagamento', description: getFriendlyErrorMessage(error) });
    },
  });

  function handleSalvarPlano() {
    if (!dialogRowId) return;
    criarParcelasMutation.mutate(
      draftParcelas.map((item) => ({ valor: Number(item.valor), data_vencimento: item.data_vencimento || null })),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Contas a pagar</h2>
        {!loading && visibleRows.length > 0 && (
          <div className="text-right text-sm">
            <p className="font-semibold">{formatValor(resumo.total)} a pagar</p>
            {resumo.atrasadas > 0 && (
              <p className="text-destructive">{resumo.atrasadas} atrasada{resumo.atrasadas > 1 ? 's' : ''}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56 space-y-1">
          <span className="text-xs text-muted-foreground">Classificacao</span>
          <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CATEGORIA_FILTRO_TODAS}>Todas as categorias</SelectItem>
              {categorias.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-56 space-y-1">
          <span className="text-xs text-muted-foreground">Status de pagamento</span>
          <Select value={classificacaoFiltro} onValueChange={setClassificacaoFiltro}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CLASSIFICACAO_TODAS}>Todas</SelectItem>
              <SelectItem value={CLASSIFICACAO_PARCIAL}>Parcialmente pagas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Carregando...
        </div>
      ) : visibleRows.length === 0 ? (
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
            {visibleRows.map((row) => {
              const vencimentoInfo = getVencimentoInfo(row.data_vencimento);
              const parcial = isParcialmentePago(row);
              return (
                <TableRow
                  key={row.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => openParcelas(row)}
                  title="Ver parcelas e detalhes"
                >
                  <TableCell>{row.solicitante_nome}</TableCell>
                  <TableCell className="font-medium">{row.fornecedor}</TableCell>
                  <TableCell className="max-w-xs truncate">{row.descricao}</TableCell>
                  <TableCell>{formatValor(row.valor)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{formatData(row.data_vencimento)}</span>
                      <Badge variant={vencimentoInfo.variant}>{vencimentoInfo.label}</Badge>
                      {parcial && <Badge variant="secondary">Parcialmente pago</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{FORMA_PAGAMENTO_LABEL[row.forma_pagamento] || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => { event.stopPropagation(); setReprovarTarget(row); }}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Reprovar
                      </Button>
                      <Button
                        size="sm"
                        onClick={(event) => { event.stopPropagation(); openPagamentoAVista(row); }}
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
          parcelasQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner size="sm" />
              Carregando...
            </div>
          ) : parcelasQuery.isError ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">Nao foi possivel carregar as parcelas desta solicitacao.</p>
              <Button variant="outline" size="sm" onClick={() => parcelasQuery.refetch()}>
                Tentar novamente
              </Button>
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
                    <Button size="sm" onClick={() => openPagamentoParcela(dialogRow, parcela.id)}>
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
                disabled={criarParcelasMutation.isPending || draftParcelas.length === 0}
              >
                {criarParcelasMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                Salvar plano de pagamento
              </Button>
            </div>
          )
        }
      />

      <Dialog open={Boolean(reprovarTarget)} onOpenChange={(open) => !open && closeReprovar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar solicitacao ja aprovada</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Informe o motivo. O solicitante podera corrigir e reenviar a solicitacao.
          </p>
          <Textarea
            value={motivoReprovacao}
            onChange={(event) => setMotivoReprovacao(event.target.value)}
            placeholder="Motivo da reprovacao"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeReprovar} disabled={reprovarMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleReprovar}
              disabled={reprovarMutation.isPending || !motivoReprovacao.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {reprovarMutation.isPending ? 'Reprovando...' : 'Reprovar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pagamentoTarget)} onOpenChange={(open) => !open && closePagamentoDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pagamento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Anexe o comprovante de pagamento (opcional, um ou mais arquivos, max 5 MB cada).
          </p>
          <label
            htmlFor="comprovantes-pagamento"
            className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 text-sm text-muted-foreground hover:bg-accent"
          >
            <Paperclip className="h-4 w-4" />
            Selecionar arquivo(s)
          </label>
          <input id="comprovantes-pagamento" type="file" multiple className="hidden" onChange={handleComprovanteChange} />
          {comprovantes.length > 0 && (
            <ul className="space-y-2">
              {comprovantes.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                  <span className="flex-1 truncate">{file.name}</span>
                  <button type="button" onClick={() => removeComprovante(index)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closePagamentoDialog} disabled={confirmarPagamentoMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarPagamento} disabled={confirmarPagamentoMutation.isPending}>
              {confirmarPagamentoMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
              Confirmar pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentSuccessOverlay
        open={Boolean(successOverlay)}
        message={successOverlay}
        onOpenChange={(open) => !open && setSuccessOverlay(null)}
      />
    </div>
  );
}
