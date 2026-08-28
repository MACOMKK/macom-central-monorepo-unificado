import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PDFDocument } from 'pdf-lib';
import {
  Bell,
  Building2,
  Calendar,
  Check,
  Clock,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileStack,
  Hash,
  Landmark,
  Lock,
  Paperclip,
  Pencil,
  RefreshCw,
  Tag,
  Trash2,
  Unlock,
  User,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';
import { isAllowedAnexoMimeType, MAX_ANEXO_SIZE, uploadAnexo } from '@/lib/anexoUpload';
import { getFriendlyErrorMessage } from '@/lib/errorMessage';
import {
  formatData,
  formatDataHora,
  formatDataVencimento,
  formatValor,
  ANEXO_CATEGORIA_LABEL,
  ANEXO_CATEGORIA_OPCOES,
  FORMA_PAGAMENTO_LABEL,
  isBloqueadaPorPendencia,
  STATUS_LABEL,
  STATUS_VARIANT,
  getTiposDocumentoPorCategoria,
} from '@/lib/financeiroFormat';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import WhatsAppShareButton from '@/components/WhatsAppShareButton';

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>;
}

function CampoDetalhe({ icon: Icon, label, value, onClick, trailing }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1">
          {onClick ? (
            <button
              type="button"
              onClick={onClick}
              className="truncate text-left font-medium underline-offset-2 hover:underline"
            >
              {value || '-'}
            </button>
          ) : (
            <p className="truncate font-medium">{value || '-'}</p>
          )}
          {trailing}
        </div>
      </div>
    </div>
  );
}

function getPreviewType(anexo) {
  const tipoMime = String(anexo?.tipo_mime || '').toLowerCase();
  const nomeArquivo = String(anexo?.nome_arquivo || '').toLowerCase();

  if (tipoMime.includes('pdf') || nomeArquivo.endsWith('.pdf')) return 'pdf';
  if (tipoMime.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif|bmp)$/.test(nomeArquivo)) return 'image';
  return 'unsupported';
}

const EVENTO_META = {
  criada: { label: 'Solicitação criada', icon: FileStack, className: 'text-muted-foreground bg-muted' },
  editada: { label: 'Solicitação editada', icon: Pencil, className: 'text-muted-foreground bg-muted' },
  aprovada: { label: 'Aprovada', icon: Check, className: 'text-emerald-600 bg-emerald-500/20' },
  reprovada: { label: 'Reprovada', icon: X, className: 'text-destructive bg-destructive/20' },
  reprovada_pos_aprovacao: {
    label: 'Reprovada após aprovação',
    icon: X,
    className: 'text-destructive bg-destructive/20',
  },
  cancelada: { label: 'Cancelada', icon: X, className: 'text-destructive bg-destructive/20' },
  reenviada: { label: 'Corrigida e reenviada', icon: RefreshCw, className: 'text-muted-foreground bg-muted' },
  parcela_criada: {
    label: 'Plano de pagamento definido',
    icon: CreditCard,
    className: 'text-muted-foreground bg-muted',
  },
  parcela_paga: { label: 'Parcela paga', icon: Wallet, className: 'text-emerald-600 bg-emerald-500/20' },
  pago: { label: 'Marcada como paga', icon: Wallet, className: 'text-emerald-600 bg-emerald-500/20' },
  anexo_adicionado: { label: 'Anexo incluído', icon: Paperclip, className: 'text-muted-foreground bg-muted' },
  anexo_removido: { label: 'Anexo removido', icon: Trash2, className: 'text-destructive bg-destructive/20' },
  notificacao_enviada: { label: 'Notificação enviada', icon: Bell, className: 'text-muted-foreground bg-muted' },
  pendencia_aberta: { label: 'Pendência sinalizada', icon: Lock, className: 'text-destructive bg-destructive/20' },
  pendencia_liberada: { label: 'Pendência liberada', icon: Unlock, className: 'text-emerald-600 bg-emerald-500/20' },
  pendencia_atualizada_pelo_solicitante: {
    label: 'Solicitante corrigiu pendência',
    icon: RefreshCw,
    className: 'text-amber-600 bg-amber-500/10',
  },
};

const EVENTO_META_DEFAULT = { label: null, icon: Clock, className: 'text-muted-foreground bg-muted' };

const PARCELA_STATUS_LABEL = {
  pendente: 'Pendente',
  pago: 'Paga',
};

export default function SolicitacaoDrawer({ solicitacao, onOpenChange, footer = null, parcelasSlot = null }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [novaCategoria, setNovaCategoria] = useState(ANEXO_CATEGORIA_OPCOES[0]?.value || '');
  const [numeroCopiado, setNumeroCopiado] = useState(false);
  const [novoTipoDocumento, setNovoTipoDocumento] = useState('outros');
  const [novoSigiloso, setNovoSigiloso] = useState(false);
  const [removerTarget, setRemoverTarget] = useState(null);
  const [anexosPendentes, setAnexosPendentes] = useState([]);
  const [baixandoTodos, setBaixandoTodos] = useState(false);
  const [baixandoAnexoId, setBaixandoAnexoId] = useState(null);
  const [previewAnexo, setPreviewAnexo] = useState(null);
  const [gerandoPdfUnico, setGerandoPdfUnico] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const tiposDocumentoOpcoes = getTiposDocumentoPorCategoria(novaCategoria);

  useEffect(() => {
    if (!tiposDocumentoOpcoes.some((item) => item.value === novoTipoDocumento)) {
      setNovoTipoDocumento(tiposDocumentoOpcoes[0]?.value || 'outros');
    }
  }, [novaCategoria]);

  const isDonoSolicitacao = Boolean(user?.id) && String(solicitacao?.solicitante_id) === String(user?.id);
  const isAprovadorDestino = Boolean(user?.id) && String(solicitacao?.aprovador_destino_id) === String(user?.id);
  const podeAdicionarAnexo = Boolean(user?.isFinanceiro) || isDonoSolicitacao;
  const podeRemoverAnexo =
    Boolean(user?.isFinanceiro) ||
    (isDonoSolicitacao && (solicitacao?.status === 'pendente' || solicitacao?.pendencia_bloqueio === true));
  const podeBaixarTodosAnexos = Boolean(user?.isPagador) || isAprovadorDestino;

  const solicitacaoId = solicitacao?.id;

  const anexosQuery = useQuery({
    queryKey: ['servicos', 'anexos', solicitacaoId],
    queryFn: () => financeiroApi.anexos.list(solicitacaoId),
    enabled: Boolean(solicitacaoId),
  });
  const anexos = anexosQuery.data || [];
  const anexosLoading = anexosQuery.isLoading;

  const parcelasQuery = useQuery({
    queryKey: ['servicos', 'parcelas', solicitacaoId],
    queryFn: () => financeiroApi.parcelas.list(solicitacaoId),
    enabled: Boolean(solicitacaoId) && !parcelasSlot,
  });
  const parcelas = parcelasQuery.data || [];
  const parcelasLoading = parcelasQuery.isLoading;

  const historicoQuery = useQuery({
    queryKey: ['servicos', 'historico', solicitacaoId],
    queryFn: () => financeiroApi.historico.list(solicitacaoId),
    enabled: Boolean(solicitacaoId),
  });
  const historico = historicoQuery.data || [];
  const historicoLoading = historicoQuery.isLoading;

  useEffect(() => {
    if (anexosQuery.error) {
      toast({ title: 'Não foi possível carregar os anexos', description: getFriendlyErrorMessage(anexosQuery.error) });
    }
  }, [anexosQuery.error]);

  useEffect(() => {
    if (parcelasQuery.error) {
      toast({ title: 'Não foi possível carregar as parcelas', description: getFriendlyErrorMessage(parcelasQuery.error) });
    }
  }, [parcelasQuery.error]);

  useEffect(() => {
    if (historicoQuery.error) {
      toast({ title: 'Não foi possível carregar o histórico', description: getFriendlyErrorMessage(historicoQuery.error) });
    }
  }, [historicoQuery.error]);

  async function handleCopiarNumero(numero) {
    try {
      await navigator.clipboard.writeText(String(numero));
      setNumeroCopiado(true);
      setTimeout(() => setNumeroCopiado(false), 1500);
    } catch (error) {
      toast({ title: 'Não foi possível copiar o número', description: getFriendlyErrorMessage(error) });
    }
  }

  function handleAbrirFornecedor() {
    onOpenChange(false);
    navigate('/fornecedores');
  }

  function loadAnexos() {
    queryClient.invalidateQueries({ queryKey: ['servicos', 'anexos', solicitacaoId] });
  }

  function loadHistorico() {
    queryClient.invalidateQueries({ queryKey: ['servicos', 'historico', solicitacaoId] });
  }

  const uploadAnexoMutation = useMutation({
    mutationFn: ({ file, categoria, tipoDocumento, sigiloso }) =>
      uploadAnexo({ file, solicitacaoId, categoria, tipoDocumento, sigiloso }),
    onSuccess: (row, variables) => {
      setAnexosPendentes((current) => current.filter((item) => item.tempId !== variables.tempId));
      queryClient.setQueryData(['servicos', 'anexos', solicitacaoId], (old) => [...(old || []), row]);
      loadHistorico();
      toast({ title: 'Anexo incluído' });
    },
    onError: (error, variables) => {
      setAnexosPendentes((current) =>
        current.map((item) => (item.tempId === variables.tempId ? { ...item, erro: true } : item)),
      );
      toast({ title: 'Não foi possível incluir o anexo', description: getFriendlyErrorMessage(error) });
    },
  });

  function handleUploadAnexo(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !solicitacaoId) return;
    if (file.size > MAX_ANEXO_SIZE) {
      toast({ title: 'Arquivo muito grande', description: `"${file.name}" deve ter no máximo 5 MB.` });
      return;
    }
    if (!isAllowedAnexoMimeType(file)) {
      toast({ title: 'Tipo de arquivo não suportado', description: `"${file.name}" deve ser PDF, JPEG, PNG ou WebP.` });
      return;
    }

    const tempId = crypto.randomUUID();
    setAnexosPendentes((current) => [
      ...current,
      { tempId, nomeArquivo: file.name, categoria: novaCategoria, erro: false },
    ]);
    uploadAnexoMutation.mutate({ file, categoria: novaCategoria, tipoDocumento: novoTipoDocumento, sigiloso: novoSigiloso, tempId });
  }

  function removerAnexoPendente(tempId) {
    setAnexosPendentes((current) => current.filter((item) => item.tempId !== tempId));
  }

  const removerAnexoMutation = useMutation({
    mutationFn: (id) => financeiroApi.anexos.remover(id),
    onSuccess: () => {
      toast({ title: 'Anexo removido' });
      setRemoverTarget(null);
      loadAnexos();
      loadHistorico();
    },
    onError: (error) => {
      toast({ title: 'Não foi possível remover o anexo', description: getFriendlyErrorMessage(error) });
    },
  });

  function handleRemoverAnexo() {
    if (!removerTarget) return;
    removerAnexoMutation.mutate(removerTarget.id);
  }

  // Flag "solicitacao de teste" + exclusao definitiva, so pra admin (Camada 1) e so na propria
  // solicitacao (nao vale marcar a de outro colaborador como teste, mesmo sendo admin -- ver
  // isDonoSolicitacao no gate do bloco renderizado mais abaixo e a mesma checagem no backend).
  // Diferente de cancelar_solicitacao (que so muda o status): deletar_solicitacao remove o
  // registro de vez, liberado em qualquer fase quando eh_teste = true. Centralizado aqui (nao em
  // cada pagina que abre o drawer) pra funcionar igual em MinhasSolicitacoes/Pagamentos.
  const marcarTesteMutation = useMutation({
    mutationFn: (ehTeste) => financeiroApi.solicitacoes.marcarTeste(solicitacaoId, ehTeste),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'solicitacoes'] });
    },
    onError: (error) => {
      toast({ title: 'Não foi possível atualizar a solicitação', description: getFriendlyErrorMessage(error) });
    },
  });

  const deletarSolicitacaoMutation = useMutation({
    mutationFn: () => financeiroApi.solicitacoes.deletar(solicitacaoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'solicitacoes'] });
      setDeleteConfirmOpen(false);
      toast({ title: 'Solicitação excluída' });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ title: 'Não foi possível excluir a solicitação', description: getFriendlyErrorMessage(error) });
    },
  });

  async function baixarAnexo(anexo) {
    const response = await fetch(anexo.url);
    if (!response.ok) throw new Error(`Falha ao baixar "${anexo.nome_arquivo}".`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = anexo.nome_arquivo || 'anexo';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  }

  async function handleBaixarAnexo(anexo) {
    if (!anexo.url) return;
    setBaixandoAnexoId(anexo.id);
    try {
      await baixarAnexo(anexo);
    } catch (error) {
      toast({ title: 'Não foi possível baixar o anexo', description: getFriendlyErrorMessage(error) });
    } finally {
      setBaixandoAnexoId(null);
    }
  }

  async function handleBaixarTodosAnexos() {
    const anexosComUrl = anexos.filter((anexo) => anexo.url);
    if (anexosComUrl.length === 0) return;

    setBaixandoTodos(true);
    try {
      for (const anexo of anexosComUrl) {
        await baixarAnexo(anexo);
      }
    } catch (error) {
      toast({ title: 'Não foi possível baixar todos os anexos', description: getFriendlyErrorMessage(error) });
    } finally {
      setBaixandoTodos(false);
    }
  }

  async function handleGerarPdfUnico() {
    const pdfs = anexos.filter((anexo) => anexo.url && getPreviewType(anexo) === 'pdf');
    if (pdfs.length === 0) return;

    setGerandoPdfUnico(true);
    try {
      const pdfFinal = await PDFDocument.create();
      for (const anexo of pdfs) {
        const response = await fetch(anexo.url);
        if (!response.ok) throw new Error(`Falha ao baixar "${anexo.nome_arquivo}".`);
        const bytes = await response.arrayBuffer();
        const pdfOrigem = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const paginas = await pdfFinal.copyPages(pdfOrigem, pdfOrigem.getPageIndices());
        paginas.forEach((pagina) => pdfFinal.addPage(pagina));
      }

      const pdfBytes = await pdfFinal.save();
      const blobUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `anexos-${solicitacao?.numero || solicitacaoId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast({ title: 'Não foi possível gerar o PDF único', description: getFriendlyErrorMessage(error) });
    } finally {
      setGerandoPdfUnico(false);
    }
  }

  const anexosPorCategoria = anexos.reduce((acc, anexo) => {
    const key = anexo.categoria || 'outros';
    if (!acc[key]) acc[key] = [];
    acc[key].push(anexo);
    return acc;
  }, {});

  return (
    <Sheet open={Boolean(solicitacao)} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between gap-2 pr-6">
            <span className="truncate">{solicitacao?.titulo || solicitacao?.fornecedor}</span>
            <span className="flex shrink-0 items-center gap-2">
              <WhatsAppShareButton solicitacao={solicitacao} />
              {solicitacao && (
                <Badge variant={STATUS_VARIANT[solicitacao.status]}>
                  {STATUS_LABEL[solicitacao.status] || solicitacao.status}
                </Badge>
              )}
              {solicitacao?.eh_teste && (
                <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-600">
                  Teste
                </Badge>
              )}
              {solicitacao && isBloqueadaPorPendencia(solicitacao) && (
                <Badge
                  variant={solicitacao.pendencia_atualizada_em ? 'outline' : 'destructive'}
                  className={
                    solicitacao.pendencia_atualizada_em
                      ? 'gap-1 border-amber-500/50 bg-amber-500/10 text-amber-600'
                      : 'gap-1'
                  }
                >
                  {solicitacao.pendencia_atualizada_em && <RefreshCw className="h-3 w-3" />}
                  {solicitacao.pendencia_atualizada_em ? 'Pendência • Corrigida' : 'Pendência'}
                </Badge>
              )}
            </span>
          </SheetTitle>
        </SheetHeader>

        {solicitacao && isDonoSolicitacao && user?.system_access_level === 'admin' && (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-md border border-dashed border-muted-foreground/40 p-3">
            <label
              htmlFor="solicitacao-eh-teste"
              className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"
            >
              <Checkbox
                id="solicitacao-eh-teste"
                checked={Boolean(solicitacao.eh_teste)}
                onCheckedChange={(checked) => marcarTesteMutation.mutate(checked === true)}
                disabled={marcarTesteMutation.isPending}
              />
              Solicitação de teste (pode ser excluída)
            </label>
            {solicitacao.eh_teste && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            )}
          </div>
        )}

        {solicitacao && (
          <div className="mt-4 flex-1 space-y-4">
            <Tabs defaultValue="detalhes">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                <TabsTrigger value="anexos">Anexos</TabsTrigger>
                <TabsTrigger value="parcelas">Parcelas</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="detalhes" className="space-y-4 text-sm">
                {isBloqueadaPorPendencia(solicitacao) && (
                  <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
                    <div className="flex items-center gap-2 font-semibold text-destructive">
                      <Lock className="h-4 w-4" />
                      Pagamento bloqueado por pendência
                    </div>
                    <p className="text-foreground">{solicitacao.pendencia_motivo}</p>
                    <div className="grid grid-cols-2 gap-4 border-t border-destructive/20 pt-2">
                      <CampoDetalhe icon={User} label="Sinalizada por" value={solicitacao.pendencia_aberta_por_nome} />
                      <CampoDetalhe icon={Clock} label="Sinalizada em" value={formatDataHora(solicitacao.pendencia_aberta_em)} />
                    </div>
                    {solicitacao.pendencia_atualizada_em && (
                      <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-amber-700">
                        <RefreshCw className="h-4 w-4 shrink-0" />
                        <p className="text-xs font-medium">
                          Corrigido pelo solicitante em {formatDataHora(solicitacao.pendencia_atualizada_em)} — revisar antes de liberar.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-3 rounded-md border border-border p-3">
                  <SectionLabel>Informações gerais</SectionLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <CampoDetalhe
                      icon={Hash}
                      label="Nº"
                      value={solicitacao.numero}
                      trailing={
                        solicitacao.numero && (
                          <button
                            type="button"
                            onClick={() => handleCopiarNumero(solicitacao.numero)}
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                            title="Copiar número"
                          >
                            {numeroCopiado ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        )
                      }
                    />
                    <CampoDetalhe icon={User} label="Solicitante" value={solicitacao.solicitante_nome} />
                    <CampoDetalhe
                      icon={Building2}
                      label="Fornecedor"
                      value={solicitacao.fornecedor}
                      onClick={user?.isFinanceiro && solicitacao.fornecedor ? handleAbrirFornecedor : undefined}
                    />
                    <CampoDetalhe icon={UserCheck} label="Aprovador responsável" value={solicitacao.aprovador_destino_nome} />
                    <CampoDetalhe icon={Wallet} label="Valor" value={formatValor(solicitacao.valor)} />
                    <CampoDetalhe icon={Tag} label="Categoria" value={solicitacao.categoria} />
                    <CampoDetalhe icon={Calendar} label="Vencimento" value={formatDataVencimento(solicitacao.vencimento_efetivo)} />
                    <CampoDetalhe
                      icon={CreditCard}
                      label="Forma de pagamento"
                      value={FORMA_PAGAMENTO_LABEL[solicitacao.forma_pagamento] || solicitacao.forma_pagamento}
                    />
                    <CampoDetalhe icon={Landmark} label="Empresa" value={solicitacao.empresa_nome} />
                    <CampoDetalhe icon={Building2} label="Departamento" value={solicitacao.departamento_nome} />
                    <CampoDetalhe icon={Clock} label="Criado em" value={formatData(solicitacao.criado_em)} />
                  </div>
                  {Number(solicitacao.parcelas_total || 0) > 0 && Number(solicitacao.valor_pago || 0) > 0 && (
                    <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                      <CampoDetalhe icon={Wallet} label="Valor pago" value={formatValor(solicitacao.valor_pago)} />
                      <CampoDetalhe
                        icon={Wallet}
                        label="Saldo em aberto"
                        value={formatValor(Number(solicitacao.valor || 0) - Number(solicitacao.valor_pago || 0))}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-md border border-border p-3">
                  <SectionLabel>Descrição e observações</SectionLabel>
                  <div>
                    <p className="text-xs text-muted-foreground">Descrição</p>
                    <p className="whitespace-pre-wrap">{solicitacao.descricao || '-'}</p>
                  </div>

                  {solicitacao.observacao && (
                    <div>
                      <p className="text-xs text-muted-foreground">Observação do solicitante</p>
                      <p className="whitespace-pre-wrap">{solicitacao.observacao}</p>
                    </div>
                  )}

                  {solicitacao.observacao_analise && (
                    <div>
                      <p className="text-xs text-muted-foreground">Observação da análise</p>
                      <p className="whitespace-pre-wrap">{solicitacao.observacao_analise}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="anexos" className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Anexos</p>
                  {podeBaixarTodosAnexos && anexos.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {anexos.some((anexo) => anexo.url && getPreviewType(anexo) === 'pdf') && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={gerandoPdfUnico}
                          onClick={handleGerarPdfUnico}
                        >
                          {gerandoPdfUnico ? <Spinner size="sm" /> : <FileStack className="h-4 w-4" />}
                          Juntar PDFs
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={baixandoTodos}
                        onClick={handleBaixarTodosAnexos}
                      >
                        {baixandoTodos ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
                        Baixar todos
                      </Button>
                    </div>
                  )}
                </div>

                {podeAdicionarAnexo && (
                  <div className="space-y-2 rounded-md border border-dashed border-input p-3">
                    <SectionLabel>Incluir anexo (correção pós-análise)</SectionLabel>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={novaCategoria} onValueChange={setNovaCategoria}>
                        <SelectTrigger className="h-8 w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ANEXO_CATEGORIA_OPCOES.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={novoTipoDocumento} onValueChange={setNovoTipoDocumento}>
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposDocumentoOpcoes.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <label
                        htmlFor="anexo-drawer-upload"
                        className="flex h-8 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-xs text-muted-foreground hover:bg-accent"
                      >
                        <Paperclip className="h-3 w-3" />
                        Selecionar arquivo
                      </label>
                      <input id="anexo-drawer-upload" type="file" className="hidden" onChange={handleUploadAnexo} />
                      <label htmlFor="anexo-drawer-sigiloso" className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          id="anexo-drawer-sigiloso"
                          checked={novoSigiloso}
                          onCheckedChange={(checked) => setNovoSigiloso(checked === true)}
                        />
                        Sigiloso
                      </label>
                    </div>
                    {anexosPendentes.length > 0 && (
                      <ul className="space-y-1">
                        {anexosPendentes.map((item) => (
                          <li
                            key={item.tempId}
                            className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              {item.erro ? <Paperclip className="h-4 w-4 shrink-0" /> : <Spinner size="sm" />}
                              <span className="truncate">{item.nomeArquivo}</span>
                              {item.erro && <span className="text-destructive">Falha no envio</span>}
                            </span>
                            {item.erro && (
                              <button
                                type="button"
                                onClick={() => removerAnexoPendente(item.tempId)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="space-y-3 rounded-md border border-border p-3">
                  <SectionLabel>Anexos enviados</SectionLabel>
                  {anexosLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner size="sm" />
                      Carregando...
                    </div>
                  ) : anexos.length === 0 && anexosPendentes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum anexo enviado.</p>
                  ) : (
                    Object.entries(anexosPorCategoria).map(([categoria, items]) => (
                      <div key={categoria} className="space-y-2">
                        <SectionLabel>{ANEXO_CATEGORIA_LABEL[categoria] || categoria}</SectionLabel>
                        <ul className="space-y-1">
                          {items.map((anexo) => (
                            <li
                              key={anexo.id}
                              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate">{anexo.nome_arquivo}</span>
                                {anexo.sigiloso && (
                                  <Badge variant="outline" className="shrink-0 gap-1">
                                    <Lock className="h-3 w-3" />
                                    Sigiloso
                                  </Badge>
                                )}
                              </span>
                              <span className="flex shrink-0 items-center gap-1">
                                {anexo.url && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewAnexo(anexo)}
                                    title="Visualizar"
                                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                )}
                                {anexo.url && (
                                  <button
                                    type="button"
                                    onClick={() => handleBaixarAnexo(anexo)}
                                    disabled={baixandoAnexoId === anexo.id}
                                    title="Baixar"
                                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                                  >
                                    {baixandoAnexoId === anexo.id ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
                                  </button>
                                )}
                                {podeRemoverAnexo && (
                                  <button
                                    type="button"
                                    onClick={() => setRemoverTarget(anexo)}
                                    title="Remover"
                                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </div>

                <ConfirmDeleteDialog
                  open={Boolean(removerTarget)}
                  onOpenChange={(open) => !open && setRemoverTarget(null)}
                  onConfirm={handleRemoverAnexo}
                  isLoading={removerAnexoMutation.isPending}
                  title="Remover anexo"
                  description={`Tem certeza que deseja remover "${removerTarget?.nome_arquivo || ''}"? Essa ação não pode ser desfeita.`}
                  confirmLabel="Remover"
                  loadingLabel="Removendo..."
                />

                <Dialog open={Boolean(previewAnexo)} onOpenChange={(open) => !open && setPreviewAnexo(null)}>
                  <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto p-4 sm:p-6">
                    {previewAnexo && (
                      <>
                        <DialogHeader className="border-b border-border pb-4">
                          <DialogTitle className="line-clamp-1 text-base text-foreground">
                            {previewAnexo.nome_arquivo}
                          </DialogTitle>
                        </DialogHeader>

                        <div className="overflow-hidden rounded-md border border-border bg-muted/20">
                          {getPreviewType(previewAnexo) === 'pdf' && previewAnexo.url ? (
                            <iframe title={previewAnexo.nome_arquivo} src={previewAnexo.url} className="h-[60vh] w-full" />
                          ) : null}

                          {getPreviewType(previewAnexo) === 'image' && previewAnexo.url ? (
                            <div className="flex justify-center p-4">
                              <img
                                src={previewAnexo.url}
                                alt={previewAnexo.nome_arquivo}
                                className="max-h-[60vh] w-auto max-w-full rounded object-contain"
                              />
                            </div>
                          ) : null}

                          {getPreviewType(previewAnexo) === 'unsupported' && (
                            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
                              <p className="text-sm text-muted-foreground">
                                Este tipo de arquivo não possui visualização interna no momento.
                              </p>
                              <Button className="gap-2" onClick={() => handleBaixarAnexo(previewAnexo)}>
                                <Download className="h-4 w-4" />
                                Baixar arquivo
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </TabsContent>

              <TabsContent value="parcelas" className="space-y-4">
                {parcelasSlot ? (
                  parcelasSlot
                ) : parcelasLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner size="sm" />
                    Carregando...
                  </div>
                ) : parcelas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum plano de pagamento definido ainda.</p>
                ) : (
                  <div className="space-y-3 rounded-md border border-border p-3">
                    <SectionLabel>Plano de pagamento</SectionLabel>
                    <div className="space-y-2">
                      {parcelas.map((parcela) => (
                        <div
                          key={parcela.id}
                          className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                            parcela.status === 'pago' ? 'border-emerald-500/30' : 'border-border'
                          }`}
                        >
                          <div>
                            <p className="font-medium">
                              Parcela {parcela.numero} — {formatValor(parcela.valor)}
                            </p>
                            <p className="text-muted-foreground">Vencimento: {formatDataVencimento(parcela.data_vencimento)}</p>
                          </div>
                          <Badge variant={parcela.status === 'pago' ? 'default' : 'secondary'}>
                            {PARCELA_STATUS_LABEL[parcela.status] || parcela.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="historico" className="space-y-4">
                {historicoLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner size="sm" />
                    Carregando...
                  </div>
                ) : historico.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
                ) : (
                  <ul className="min-w-0">
                    {historico.map((item, index) => {
                      const meta = EVENTO_META[item.evento] || EVENTO_META_DEFAULT;
                      const EventoIcon = meta.icon;
                      const isLast = index === historico.length - 1;
                      return (
                        <li key={item.id} className="flex min-w-0 gap-3 text-sm">
                          <div className="flex shrink-0 flex-col items-center">
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${meta.className}`}
                            >
                              <EventoIcon className="h-3 w-3" />
                            </span>
                            {!isLast && <span className="my-1 w-0.5 flex-1 bg-border" />}
                          </div>
                          <div className="min-w-0 flex-1 pb-4 pt-1">
                            <p className="break-words font-medium">{meta.label || item.evento}</p>
                            <p className="break-words text-xs text-muted-foreground">
                              {formatDataHora(item.criado_em)}
                              {item.autor_nome ? ` — ${item.autor_nome}` : ''}
                            </p>
                            {item.observacao && (
                              <p className="mt-1 break-words text-muted-foreground">{item.observacao}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <ConfirmDeleteDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onConfirm={() => deletarSolicitacaoMutation.mutate()}
          isLoading={deletarSolicitacaoMutation.isPending}
          title="Excluir solicitação"
          description="Isso remove a solicitação, seus anexos, parcelas e histórico permanentemente. Essa ação não pode ser desfeita."
          confirmLabel="Excluir solicitação"
          loadingLabel="Excluindo..."
        />

        {footer && <div className="mt-6 border-t border-border pt-4">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}
