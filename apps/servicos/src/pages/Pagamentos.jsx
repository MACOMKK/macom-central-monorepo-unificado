import { useEffect, useMemo, useState } from 'react';
import { Banknote, Loader2, Paperclip, Plus, Trash2, X } from 'lucide-react';

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  useToast,
} from '@macom/ui';
import SolicitacaoDrawer from '@/components/SolicitacaoDrawer';
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
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [categorias, setCategorias] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState(CATEGORIA_FILTRO_TODAS);
  const [classificacaoFiltro, setClassificacaoFiltro] = useState(CLASSIFICACAO_TODAS);

  const [dialogRow, setDialogRow] = useState(null);
  const [parcelas, setParcelas] = useState([]);
  const [draftParcelas, setDraftParcelas] = useState([]);
  const [parcelasLoading, setParcelasLoading] = useState(false);
  const [parcelasError, setParcelasError] = useState(false);
  const [savingParcelas, setSavingParcelas] = useState(false);

  const [reprovarTarget, setReprovarTarget] = useState(null);
  const [motivoReprovacao, setMotivoReprovacao] = useState('');
  const [reprovando, setReprovando] = useState(false);

  const [pagamentoTarget, setPagamentoTarget] = useState(null);
  const [comprovantes, setComprovantes] = useState([]);
  const [confirmandoPagamento, setConfirmandoPagamento] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const filters = { status: 'aprovado', order_by: 'data_vencimento' };
      if (categoriaFiltro !== CATEGORIA_FILTRO_TODAS) filters.categoria_id = categoriaFiltro;
      const data = await financeiroApi.solicitacoes.list(filters);
      setRows(data);
    } catch (error) {
      toast({ title: 'Nao foi possivel carregar as solicitacoes', description: getFriendlyErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    financeiroApi.categorias
      .list()
      .then(setCategorias)
      .catch(() => setCategorias([]));
  }, []);

  useEffect(() => {
    load();
  }, [categoriaFiltro]);

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

  async function handleConfirmarPagamento() {
    if (!pagamentoTarget) return;
    const { type, row, parcelaId } = pagamentoTarget;
    setConfirmandoPagamento(true);
    try {
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

      for (const file of comprovantes) {
        await uploadAnexo({
          file,
          solicitacaoId: row.id,
          categoria: 'comprovante_pagamento',
          parcelaId: parcelaAlvoId,
        });
      }

      const result = await financeiroApi.parcelas.registrarPagamento(parcelaAlvoId);

      if (type === 'avista') {
        toast({ title: 'Solicitacao marcada como paga' });
        await load();
      } else {
        const parcelasAtualizadas = parcelas.map((item) => (item.id === parcelaAlvoId ? result : item));
        setParcelas(parcelasAtualizadas);
        const todasPagas = parcelasAtualizadas.every((item) => item.status === 'pago');
        if (todasPagas) {
          toast({ title: 'Solicitacao marcada como paga' });
          setRows((current) => current.filter((r) => r.id !== dialogRow?.id));
          closeDialog();
        } else {
          toast({ title: 'Parcela paga' });
          setRows((current) =>
            current.map((r) => (r.id === row.id ? { ...r, parcelas_pagas: Number(r.parcelas_pagas || 0) + 1 } : r)),
          );
        }
      }

      closePagamentoDialog();
    } catch (error) {
      toast({ title: 'Nao foi possivel registrar o pagamento', description: getFriendlyErrorMessage(error) });
    } finally {
      setConfirmandoPagamento(false);
    }
  }

  function closeReprovar() {
    setReprovarTarget(null);
    setMotivoReprovacao('');
  }

  async function handleReprovar() {
    if (!reprovarTarget || !motivoReprovacao.trim()) return;
    setReprovando(true);
    try {
      await financeiroApi.solicitacoes.setStatus(reprovarTarget.id, 'reprovado', motivoReprovacao.trim());
      toast({ title: 'Solicitacao reprovada', description: 'O solicitante foi notificado para corrigir e reenviar.' });
      setRows((current) => current.filter((row) => row.id !== reprovarTarget.id));
      closeReprovar();
    } catch (error) {
      toast({ title: 'Nao foi possivel reprovar a solicitacao', description: getFriendlyErrorMessage(error) });
    } finally {
      setReprovando(false);
    }
  }

  async function openParcelas(row) {
    setDialogRow(row);
    setParcelasLoading(true);
    setParcelasError(false);
    try {
      const data = await financeiroApi.parcelas.list(row.id);
      setParcelas(data);
      setDraftParcelas(
        data.length
          ? []
          : [{ valor: row.valor, data_vencimento: '' }],
      );
    } catch (error) {
      setParcelasError(true);
      toast({ title: 'Nao foi possivel carregar as parcelas', description: getFriendlyErrorMessage(error) });
    } finally {
      setParcelasLoading(false);
    }
  }

  function closeDialog() {
    setDialogRow(null);
    setParcelas([]);
    setDraftParcelas([]);
    setParcelasError(false);
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
      toast({ title: 'Nao foi possivel salvar o plano de pagamento', description: getFriendlyErrorMessage(error) });
    } finally {
      setSavingParcelas(false);
    }
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
          <Loader2 className="h-4 w-4 animate-spin" />
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
          parcelasLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          ) : parcelasError ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">Nao foi possivel carregar as parcelas desta solicitacao.</p>
              <Button variant="outline" size="sm" onClick={() => dialogRow && openParcelas(dialogRow)}>
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
                disabled={savingParcelas || draftParcelas.length === 0}
              >
                {savingParcelas ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
            <Button variant="outline" onClick={closeReprovar} disabled={reprovando}>
              Cancelar
            </Button>
            <Button
              onClick={handleReprovar}
              disabled={reprovando || !motivoReprovacao.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {reprovando ? 'Reprovando...' : 'Reprovar'}
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
            <Button variant="outline" onClick={closePagamentoDialog} disabled={confirmandoPagamento}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarPagamento} disabled={confirmandoPagamento}>
              {confirmandoPagamento ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
