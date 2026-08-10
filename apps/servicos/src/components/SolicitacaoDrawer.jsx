import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Paperclip, Trash2 } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import {
  Badge,
  Button,
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
  formatValor,
  ANEXO_CATEGORIA_LABEL,
  ANEXO_CATEGORIA_OPCOES,
  FORMA_PAGAMENTO_LABEL,
  STATUS_LABEL,
  STATUS_VARIANT,
  getTiposDocumentoPorCategoria,
} from '@/lib/financeiroFormat';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';

const EVENTO_LABEL = {
  criada: 'Solicitacao criada',
  aprovada: 'Aprovada',
  reprovada: 'Reprovada',
  reprovada_pos_aprovacao: 'Reprovada apos aprovacao',
  cancelada: 'Cancelada pelo solicitante',
  reenviada: 'Corrigida e reenviada',
  parcela_criada: 'Plano de pagamento definido',
  parcela_paga: 'Parcela paga',
  pago: 'Marcada como paga',
  anexo_adicionado: 'Anexo incluido',
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
  const [removerTarget, setRemoverTarget] = useState(null);
  const [anexosPendentes, setAnexosPendentes] = useState([]);
  const [baixandoTodos, setBaixandoTodos] = useState(false);

  const tiposDocumentoOpcoes = getTiposDocumentoPorCategoria(novaCategoria);

  useEffect(() => {
    if (!tiposDocumentoOpcoes.some((item) => item.value === novoTipoDocumento)) {
      setNovoTipoDocumento(tiposDocumentoOpcoes[0]?.value || 'outros');
    }
  }, [novaCategoria]);

  const isDonoSolicitacao = Boolean(user?.id) && String(solicitacao?.criado_por) === String(user?.id);
  const isAprovadorDestino = Boolean(user?.id) && String(solicitacao?.aprovador_destino_id) === String(user?.id);
  const podeAdicionarAnexo = Boolean(user?.isFinanceiro) || isDonoSolicitacao;
  const podeRemoverAnexo = Boolean(user?.isFinanceiro);
  const podeBaixarTodosAnexos = Boolean(user?.isFinanceiro) || isAprovadorDestino;

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
      toast({ title: 'Nao foi possivel carregar os anexos', description: getFriendlyErrorMessage(anexosQuery.error) });
    }
  }, [anexosQuery.error]);

  useEffect(() => {
    if (parcelasQuery.error) {
      toast({ title: 'Nao foi possivel carregar as parcelas', description: getFriendlyErrorMessage(parcelasQuery.error) });
    }
  }, [parcelasQuery.error]);

  useEffect(() => {
    if (historicoQuery.error) {
      toast({ title: 'Nao foi possivel carregar o historico', description: getFriendlyErrorMessage(historicoQuery.error) });
    }
  }, [historicoQuery.error]);

  function loadAnexos() {
    queryClient.invalidateQueries({ queryKey: ['servicos', 'anexos', solicitacaoId] });
  }

  const uploadAnexoMutation = useMutation({
    mutationFn: ({ file, categoria, tipoDocumento }) => uploadAnexo({ file, solicitacaoId, categoria, tipoDocumento }),
    onSuccess: (row, variables) => {
      setAnexosPendentes((current) => current.filter((item) => item.tempId !== variables.tempId));
      queryClient.setQueryData(['servicos', 'anexos', solicitacaoId], (old) => [...(old || []), row]);
      toast({ title: 'Anexo incluido' });
    },
    onError: (error, variables) => {
      setAnexosPendentes((current) =>
        current.map((item) => (item.tempId === variables.tempId ? { ...item, erro: true } : item)),
      );
      toast({ title: 'Nao foi possivel incluir o anexo', description: getFriendlyErrorMessage(error) });
    },
  });

  function handleUploadAnexo(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !solicitacaoId) return;
    if (file.size > MAX_ANEXO_SIZE) {
      toast({ title: 'Arquivo muito grande', description: `"${file.name}" deve ter no maximo 5 MB.` });
      return;
    }
    if (!isAllowedAnexoMimeType(file)) {
      toast({ title: 'Tipo de arquivo nao suportado', description: `"${file.name}" deve ser PDF, JPEG, PNG ou WebP.` });
      return;
    }

    const tempId = crypto.randomUUID();
    setAnexosPendentes((current) => [
      ...current,
      { tempId, nomeArquivo: file.name, categoria: novaCategoria, erro: false },
    ]);
    uploadAnexoMutation.mutate({ file, categoria: novaCategoria, tipoDocumento: novoTipoDocumento, tempId });
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
    },
    onError: (error) => {
      toast({ title: 'Nao foi possivel remover o anexo', description: getFriendlyErrorMessage(error) });
    },
  });

  function handleRemoverAnexo() {
    if (!removerTarget) return;
    removerAnexoMutation.mutate(removerTarget.id);
  }

  async function handleBaixarTodosAnexos() {
    const anexosComUrl = anexos.filter((anexo) => anexo.url);
    if (anexosComUrl.length === 0) return;

    setBaixandoTodos(true);
    try {
      for (const anexo of anexosComUrl) {
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
    } catch (error) {
      toast({ title: 'Nao foi possivel baixar todos os anexos', description: getFriendlyErrorMessage(error) });
    } finally {
      setBaixandoTodos(false);
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
            {solicitacao && (
              <Badge variant={STATUS_VARIANT[solicitacao.status]}>
                {STATUS_LABEL[solicitacao.status] || solicitacao.status}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {solicitacao && (
          <div className="mt-4 flex-1 space-y-4">
            <Tabs defaultValue="detalhes">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                <TabsTrigger value="anexos">Anexos</TabsTrigger>
                <TabsTrigger value="parcelas">Parcelas</TabsTrigger>
                <TabsTrigger value="historico">Historico</TabsTrigger>
              </TabsList>

              <TabsContent value="detalhes" className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Solicitante</p>
                    <p className="font-medium">{solicitacao.solicitante_nome || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fornecedor</p>
                    <p className="font-medium">{solicitacao.fornecedor || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Aprovador responsavel</p>
                    <p className="font-medium">{solicitacao.aprovador_destino_nome || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="font-medium">{formatValor(solicitacao.valor)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Categoria</p>
                    <p className="font-medium">{solicitacao.categoria || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vencimento</p>
                    <p className="font-medium">{formatData(solicitacao.data_vencimento)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Forma de pagamento</p>
                    <p className="font-medium">
                      {FORMA_PAGAMENTO_LABEL[solicitacao.forma_pagamento] || solicitacao.forma_pagamento || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="font-medium">{formatData(solicitacao.criado_em)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Descricao</p>
                  <p className="whitespace-pre-wrap">{solicitacao.descricao || '-'}</p>
                </div>

                {solicitacao.observacao && (
                  <div>
                    <p className="text-xs text-muted-foreground">Observacao do solicitante</p>
                    <p className="whitespace-pre-wrap">{solicitacao.observacao}</p>
                  </div>
                )}

                {solicitacao.observacao_analise && (
                  <div>
                    <p className="text-xs text-muted-foreground">Observacao da analise</p>
                    <p className="whitespace-pre-wrap">{solicitacao.observacao_analise}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="anexos" className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Anexos</p>
                  {podeBaixarTodosAnexos && anexos.length > 0 && (
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
                  )}
                </div>

                {podeAdicionarAnexo && (
                  <div className="space-y-2 rounded-md border border-dashed border-input p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Incluir anexo (correcao pos-analise)</p>
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

                <div className="space-y-3 border-t border-border pt-3">
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
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {ANEXO_CATEGORIA_LABEL[categoria] || categoria}
                        </p>
                        <ul className="space-y-1">
                          {items.map((anexo) => (
                            <li
                              key={anexo.id}
                              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate">{anexo.nome_arquivo}</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                {anexo.url ? (
                                  <a href={anexo.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                    Abrir
                                  </a>
                                ) : null}
                                {podeRemoverAnexo && (
                                  <button
                                    type="button"
                                    onClick={() => setRemoverTarget(anexo)}
                                    className="text-muted-foreground hover:text-destructive"
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
                  description={`Tem certeza que deseja remover "${removerTarget?.nome_arquivo || ''}"? Essa acao nao pode ser desfeita.`}
                  confirmLabel="Remover"
                  loadingLabel="Removendo..."
                />
              </TabsContent>

              <TabsContent value="parcelas" className="space-y-3">
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
                  <div className="space-y-2">
                    {parcelas.map((parcela) => (
                      <div
                        key={parcela.id}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            Parcela {parcela.numero} — {formatValor(parcela.valor)}
                          </p>
                          <p className="text-muted-foreground">Vencimento: {formatData(parcela.data_vencimento)}</p>
                        </div>
                        <Badge variant={parcela.status === 'pago' ? 'default' : 'secondary'}>
                          {PARCELA_STATUS_LABEL[parcela.status] || parcela.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="historico">
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
                      <li key={item.id} className="border-l-2 border-border pl-3 text-sm">
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
