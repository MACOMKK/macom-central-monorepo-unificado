import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PDFDocument } from 'pdf-lib';
import {
  Building2,
  Calendar,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileStack,
  Lock,
  Paperclip,
  Tag,
  Trash2,
  User,
  UserCheck,
  Wallet,
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
  STATUS_LABEL,
  STATUS_VARIANT,
  getTiposDocumentoPorCategoria,
} from '@/lib/financeiroFormat';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import WhatsAppShareButton from '@/components/WhatsAppShareButton';

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>;
}

function CampoDetalhe({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value || '-'}</p>
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

const EVENTO_LABEL = {
  criada: 'Solicitação criada',
  editada: 'Solicitação editada',
  aprovada: 'Aprovada',
  reprovada: 'Reprovada',
  reprovada_pos_aprovacao: 'Reprovada após aprovação',
  cancelada: 'Cancelada pelo solicitante',
  reenviada: 'Corrigida e reenviada',
  parcela_criada: 'Plano de pagamento definido',
  parcela_paga: 'Parcela paga',
  pago: 'Marcada como paga',
  anexo_adicionado: 'Anexo incluído',
  anexo_removido: 'Anexo removido',
};

const PARCELA_STATUS_LABEL = {
  pendente: 'Pendente',
  pago: 'Paga',
};

export default function SolicitacaoDrawer({ solicitacao, onOpenChange, footer = null, parcelasSlot = null }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [novaCategoria, setNovaCategoria] = useState(ANEXO_CATEGORIA_OPCOES[0]?.value || '');
  const [novoTipoDocumento, setNovoTipoDocumento] = useState('outros');
  const [novoSigiloso, setNovoSigiloso] = useState(false);
  const [removerTarget, setRemoverTarget] = useState(null);
  const [anexosPendentes, setAnexosPendentes] = useState([]);
  const [baixandoTodos, setBaixandoTodos] = useState(false);
  const [baixandoAnexoId, setBaixandoAnexoId] = useState(null);
  const [previewAnexo, setPreviewAnexo] = useState(null);
  const [gerandoPdfUnico, setGerandoPdfUnico] = useState(false);

  const tiposDocumentoOpcoes = getTiposDocumentoPorCategoria(novaCategoria);

  useEffect(() => {
    if (!tiposDocumentoOpcoes.some((item) => item.value === novoTipoDocumento)) {
      setNovoTipoDocumento(tiposDocumentoOpcoes[0]?.value || 'outros');
    }
  }, [novaCategoria]);

  const isDonoSolicitacao = Boolean(user?.id) && String(solicitacao?.criado_por) === String(user?.id);
  const isAprovadorDestino = Boolean(user?.id) && String(solicitacao?.aprovador_destino_id) === String(user?.id);
  const podeAdicionarAnexo = Boolean(user?.isFinanceiro) || isDonoSolicitacao;
  const podeRemoverAnexo =
    Boolean(user?.isFinanceiro) || (isDonoSolicitacao && solicitacao?.status === 'pendente');
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
            </span>
          </SheetTitle>
        </SheetHeader>

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
                <div className="space-y-3 rounded-md border border-border p-3">
                  <SectionLabel>Informações gerais</SectionLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <CampoDetalhe icon={User} label="Solicitante" value={solicitacao.solicitante_nome} />
                    <CampoDetalhe icon={Building2} label="Fornecedor" value={solicitacao.fornecedor} />
                    <CampoDetalhe icon={UserCheck} label="Aprovador responsável" value={solicitacao.aprovador_destino_nome} />
                    <CampoDetalhe icon={Wallet} label="Valor" value={formatValor(solicitacao.valor)} />
                    <CampoDetalhe icon={Tag} label="Categoria" value={solicitacao.categoria} />
                    <CampoDetalhe icon={Calendar} label="Vencimento" value={formatDataVencimento(solicitacao.data_vencimento)} />
                    <CampoDetalhe
                      icon={CreditCard}
                      label="Forma de pagamento"
                      value={FORMA_PAGAMENTO_LABEL[solicitacao.forma_pagamento] || solicitacao.forma_pagamento}
                    />
                    <CampoDetalhe icon={Clock} label="Criado em" value={formatData(solicitacao.criado_em)} />
                  </div>
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
                  <ul className="space-y-3">
                    {historico.map((item) => (
                      <li key={item.id} className="relative border-l-2 border-border pl-4 text-sm">
                        <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
                        <p className="font-medium">{EVENTO_LABEL[item.evento] || item.evento}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDataHora(item.criado_em)}
                          {item.autor_nome ? ` — ${item.autor_nome}` : ''}
                        </p>
                        {item.observacao && <p className="mt-1 text-muted-foreground">{item.observacao}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {footer && <div className="mt-6 border-t border-border pt-4">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}
