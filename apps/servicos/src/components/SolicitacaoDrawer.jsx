import { useEffect, useRef, useState } from 'react';
import { Loader2, Paperclip, Trash2 } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
  FORMA_PAGAMENTO_LABEL,
  STATUS_LABEL,
  STATUS_VARIANT,
  TIPOS_DOCUMENTO,
} from '@/lib/financeiroFormat';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';

const ANEXO_CATEGORIA_LABEL = {
  comprovante_solicitacao: 'Comprovante da solicitacao',
  nf_boleto: 'NF / Boleto',
  pdf_unificado: 'PDF unificado',
  rh: 'RH',
  comprovante_pagamento: 'Comprovante de pagamento',
};

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

const ANEXO_CATEGORIA_OPCOES = Object.entries(ANEXO_CATEGORIA_LABEL).map(([value, label]) => ({ value, label }));

export default function SolicitacaoDrawer({ solicitacao, onOpenChange, footer = null, parcelasSlot = null }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [anexos, setAnexos] = useState([]);
  const [anexosLoading, setAnexosLoading] = useState(true);
  const [parcelas, setParcelas] = useState([]);
  const [parcelasLoading, setParcelasLoading] = useState(true);
  const [historico, setHistorico] = useState([]);
  const [historicoLoading, setHistoricoLoading] = useState(true);

  const [novaCategoria, setNovaCategoria] = useState(ANEXO_CATEGORIA_OPCOES[0]?.value || '');
  const [novoTipoDocumento, setNovoTipoDocumento] = useState('outros');
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const [removerTarget, setRemoverTarget] = useState(null);
  const [removendoAnexo, setRemovendoAnexo] = useState(false);

  const podeGerenciarAnexos = Boolean(user?.isFinanceiro) && solicitacao?.status !== 'pendente';

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function loadAnexos() {
    if (!solicitacao?.id) return;
    setAnexosLoading(true);
    financeiroApi.anexos
      .list(solicitacao.id)
      .then((data) => {
        if (mountedRef.current) setAnexos(data);
      })
      .catch((error) => {
        toast({ title: 'Nao foi possivel carregar os anexos', description: getFriendlyErrorMessage(error) });
      })
      .finally(() => {
        if (mountedRef.current) setAnexosLoading(false);
      });
  }

  useEffect(() => {
    if (!solicitacao?.id) return undefined;
    loadAnexos();
    return undefined;
  }, [solicitacao?.id]);

  async function handleUploadAnexo(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !solicitacao?.id) return;
    if (file.size > MAX_ANEXO_SIZE) {
      toast({ title: 'Arquivo muito grande', description: `"${file.name}" deve ter no maximo 5 MB.` });
      return;
    }
    if (!isAllowedAnexoMimeType(file)) {
      toast({ title: 'Tipo de arquivo nao suportado', description: `"${file.name}" deve ser PDF, JPEG, PNG ou WebP.` });
      return;
    }

    setUploadingAnexo(true);
    try {
      await uploadAnexo({
        file,
        solicitacaoId: solicitacao.id,
        categoria: novaCategoria,
        tipoDocumento: novoTipoDocumento,
      });
      toast({ title: 'Anexo incluido' });
      loadAnexos();
    } catch (error) {
      toast({ title: 'Nao foi possivel incluir o anexo', description: getFriendlyErrorMessage(error) });
    } finally {
      setUploadingAnexo(false);
    }
  }

  async function handleRemoverAnexo() {
    if (!removerTarget) return;
    setRemovendoAnexo(true);
    try {
      await financeiroApi.anexos.remover(removerTarget.id);
      toast({ title: 'Anexo removido' });
      setRemoverTarget(null);
      loadAnexos();
    } catch (error) {
      toast({ title: 'Nao foi possivel remover o anexo', description: getFriendlyErrorMessage(error) });
    } finally {
      setRemovendoAnexo(false);
    }
  }

  useEffect(() => {
    if (!solicitacao?.id || parcelasSlot) return undefined;
    let mounted = true;

    setParcelasLoading(true);
    financeiroApi.parcelas
      .list(solicitacao.id)
      .then((data) => {
        if (mounted) setParcelas(data);
      })
      .catch((error) => {
        toast({ title: 'Nao foi possivel carregar as parcelas', description: getFriendlyErrorMessage(error) });
      })
      .finally(() => {
        if (mounted) setParcelasLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [solicitacao?.id, Boolean(parcelasSlot)]);

  useEffect(() => {
    if (!solicitacao?.id) return undefined;
    let mounted = true;

    setHistoricoLoading(true);
    financeiroApi.historico
      .list(solicitacao.id)
      .then((data) => {
        if (mounted) setHistorico(data);
      })
      .catch((error) => {
        toast({ title: 'Nao foi possivel carregar o historico', description: getFriendlyErrorMessage(error) });
      })
      .finally(() => {
        if (mounted) setHistoricoLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [solicitacao?.id]);

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
                {podeGerenciarAnexos && (
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
                          {TIPOS_DOCUMENTO.map((item) => (
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
                        {uploadingAnexo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                        Selecionar arquivo
                      </label>
                      <input
                        id="anexo-drawer-upload"
                        type="file"
                        className="hidden"
                        disabled={uploadingAnexo}
                        onChange={handleUploadAnexo}
                      />
                    </div>
                  </div>
                )}

                {anexosLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando...
                  </div>
                ) : anexos.length === 0 ? (
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
                              {podeGerenciarAnexos && (
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

                <ConfirmDeleteDialog
                  open={Boolean(removerTarget)}
                  onOpenChange={(open) => !open && setRemoverTarget(null)}
                  onConfirm={handleRemoverAnexo}
                  isLoading={removendoAnexo}
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
                    <Loader2 className="h-4 w-4 animate-spin" />
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
                    <Loader2 className="h-4 w-4 animate-spin" />
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
