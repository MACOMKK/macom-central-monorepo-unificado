import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Paperclip, X } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import { useAuth } from '@/lib/AuthContext';
import { useCatalogosSolicitacao } from '@/hooks/useCatalogos';
import { isAllowedAnexoMimeType, MAX_ANEXO_SIZE, uploadAnexo } from '@/lib/anexoUpload';
import { getFriendlyErrorMessage } from '@/lib/errorMessage';
import {
  ANEXO_CATEGORIA_OPCOES,
  FORMA_PAGAMENTO_LABEL,
  getTiposDocumentoPorCategoria,
} from '@/lib/financeiroFormat';
import {
  Button,
  Input,
  Label,
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
  Textarea,
  useToast,
} from '@macom/ui';

const FORMAS_PAGAMENTO = Object.entries(FORMA_PAGAMENTO_LABEL).map(([value, label]) => ({ value, label }));

const EMPTY_FORM = {
  titulo: '',
  fornecedorId: '',
  descricao: '',
  valor: '',
  categoriaId: '',
  dataVencimento: '',
  formaPagamento: '',
  observacao: '',
  empresaId: '',
  departamentoId: '',
  aprovadorDestinoId: '',
};

export default function NovaSolicitacaoDrawer({ open, onOpenChange, solicitacao = null }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isReenvio = Boolean(solicitacao);

  const [form, setForm] = useState(EMPTY_FORM);
  const [anexos, setAnexos] = useState([]);
  const [visible, setVisible] = useState(open);
  const skipNextResetRef = useRef(false);

  useEffect(() => {
    setVisible(open);
  }, [open]);

  function uploadAnexosEmBackground(solicitacaoId, anexosParaEnviar) {
    if (anexosParaEnviar.length === 0) return;

    Promise.allSettled(
      anexosParaEnviar.map(({ file, categoria, tipoDocumento }) =>
        uploadAnexo({ file, solicitacaoId, categoria, tipoDocumento }),
      ),
    ).then((results) => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'anexos', solicitacaoId] });
      const falhas = results.filter((result) => result.status === 'rejected');
      if (falhas.length > 0) {
        toast({
          title: falhas.length === 1 ? 'Um anexo nao foi enviado' : `${falhas.length} anexos nao foram enviados`,
          description: `A solicitacao foi registrada normalmente, mas houve falha no envio: ${getFriendlyErrorMessage(falhas[0].reason)}. Voce pode adiciona-los depois pela tela de detalhes.`,
        });
      }
    });
  }

  const minhasSolicitacoesKey = ['servicos', 'solicitacoes', 'minhas'];

  const submitMutation = useMutation({
    mutationFn: ({ payload }) =>
      isReenvio
        ? financeiroApi.solicitacoes.reenviar(solicitacao.id, payload)
        : financeiroApi.solicitacoes.create(payload),
    onMutate: ({ payload, tempId }) => {
      const previous = queryClient.getQueryData(minhasSolicitacoesKey);
      const anexosSnapshot = anexos;
      const formSnapshot = form;
      const fornecedorNome = fornecedores.find((item) => item.id === payload.fornecedor_id)?.nome || '';
      const optimisticId = isReenvio ? solicitacao.id : tempId;
      const optimisticRow = {
        id: optimisticId,
        titulo: payload.titulo,
        fornecedor: fornecedorNome,
        descricao: payload.descricao,
        valor: payload.valor,
        status: 'pendente',
        criado_em: isReenvio ? solicitacao.criado_em : new Date().toISOString(),
        solicitante_id: user?.collaborator?.id,
      };

      queryClient.setQueryData(minhasSolicitacoesKey, (old) => {
        const rows = old || [];
        if (isReenvio) {
          return rows.map((row) => (row.id === solicitacao.id ? { ...row, ...optimisticRow } : row));
        }
        return [optimisticRow, ...rows];
      });

      // Fecha so localmente (sem tocar em novaOpen/reenvioTarget do pai) pra poder reabrir
      // sozinho com o rascunho se o envio falhar — ver onError.
      setVisible(false);

      return { previous, tempId: optimisticId, anexosSnapshot, formSnapshot };
    },
    onSuccess: (row, _variables, context) => {
      queryClient.setQueryData(minhasSolicitacoesKey, (old) =>
        (old || []).map((existing) => (existing.id === context.tempId ? row : existing)),
      );
      toast(
        isReenvio
          ? { title: 'Solicitacao reenviada', description: 'Sua solicitacao voltou para a fila de aprovacao.' }
          : { title: 'Solicitacao enviada', description: 'Sua solicitacao de pagamento foi registrada.' },
      );
      uploadAnexosEmBackground(row.id, context.anexosSnapshot);
      onOpenChange(false);
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(minhasSolicitacoesKey, context.previous);
      toast({
        title: isReenvio ? 'Nao foi possivel reenviar' : 'Nao foi possivel enviar',
        description: `${getFriendlyErrorMessage(error)} Revise os dados e tente novamente.`,
      });
      skipNextResetRef.current = true;
      setForm(context.formSnapshot);
      setAnexos(context.anexosSnapshot);
      setVisible(true);
    },
  });

  const {
    data: catalogos,
    isLoading: catalogosLoading,
  } = useCatalogosSolicitacao({ enabled: visible });
  const {
    empresas = [],
    departamentos = [],
    fornecedores = [],
    categorias = [],
    aprovadores = [],
  } = catalogos || {};

  useEffect(() => {
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false;
      return;
    }
    if (visible && isReenvio) {
      setForm({
        titulo: solicitacao.titulo || '',
        fornecedorId: solicitacao.fornecedor_id || '',
        descricao: solicitacao.descricao || '',
        valor: solicitacao.valor != null ? String(solicitacao.valor) : '',
        categoriaId: solicitacao.categoria_id || '',
        dataVencimento: solicitacao.data_vencimento ? solicitacao.data_vencimento.slice(0, 10) : '',
        formaPagamento: solicitacao.forma_pagamento || '',
        observacao: solicitacao.observacao || '',
        empresaId: solicitacao.empresa_id || '',
        departamentoId: solicitacao.departamento_id || '',
        aprovadorDestinoId: solicitacao.aprovador_destino_id || '',
      });
    } else if (visible) {
      setForm((current) => ({
        ...current,
        empresaId: user?.collaborator?.empresa_id || '',
        departamentoId: user?.collaborator?.departamento_id || '',
      }));
    } else {
      setForm(EMPTY_FORM);
      setAnexos([]);
    }
  }, [visible]);

  const setField = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  const hasUnsavedChanges = () =>
    Boolean(form.titulo.trim() || form.descricao.trim() || form.valor || anexos.length > 0);

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen && hasUnsavedChanges()) {
      const confirmed = window.confirm('Existem dados preenchidos que serao perdidos. Deseja mesmo fechar?');
      if (!confirmed) return;
    }
    setVisible(nextOpen);
    onOpenChange(nextOpen);
  };

  const handleFileChange = (event) => {
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
    setAnexos((current) => [
      ...current,
      ...files.map((file) => ({ file, categoria: 'comprovante_solicitacao', tipoDocumento: 'outros' })),
    ]);
    event.target.value = '';
  };

  const removeAnexo = (index) => {
    setAnexos((current) => current.filter((_, i) => i !== index));
  };

  const setAnexoCategoria = (index) => (value) => {
    setAnexos((current) =>
      current.map((item, i) => {
        if (i !== index) return item;
        const tiposValidos = getTiposDocumentoPorCategoria(value);
        const tipoDocumento = tiposValidos.some((tipo) => tipo.value === item.tipoDocumento)
          ? item.tipoDocumento
          : tiposValidos[0]?.value || 'outros';
        return { ...item, categoria: value, tipoDocumento };
      }),
    );
  };

  const setAnexoTipoDocumento = (index) => (value) => {
    setAnexos((current) => current.map((item, i) => (i === index ? { ...item, tipoDocumento: value } : item)));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (submitMutation.isPending) return;

    if (!form.fornecedorId || !form.aprovadorDestinoId || !form.categoriaId) {
      toast({
        title: 'Campos obrigatorios faltando',
        description: 'Selecione fornecedor, aprovador e categoria antes de enviar.',
      });
      return;
    }

    submitMutation.mutate({
      tempId: `optimistic-${crypto.randomUUID()}`,
      payload: {
        titulo: form.titulo,
        fornecedor_id: form.fornecedorId,
        descricao: form.descricao,
        valor: Number(form.valor),
        categoria_id: form.categoriaId,
        data_vencimento: form.dataVencimento || null,
        forma_pagamento: form.formaPagamento || null,
        observacao: form.observacao || null,
        empresa_id: form.empresaId || null,
        departamento_id: form.departamentoId || null,
        aprovador_destino_id: form.aprovadorDestinoId,
      },
    });
  };

  return (
    <Sheet open={visible} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-xl overflow-y-auto"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>{isReenvio ? 'Corrigir e reenviar solicitacao' : 'Nova solicitacao de pagamento'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">
              Titulo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(event) => setField('titulo')(event.target.value)}
              placeholder="Titulo curto da solicitacao"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fornecedor">
              Fornecedor <span className="text-destructive">*</span>
            </Label>
            <Select value={form.fornecedorId} onValueChange={setField('fornecedorId')} disabled={catalogosLoading}>
              <SelectTrigger id="fornecedor">
                <SelectValue placeholder={catalogosLoading ? 'Carregando...' : 'Selecione o fornecedor'} />
              </SelectTrigger>
              <SelectContent>
                {fornecedores.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aprovadorDestino">
              Aprovador responsavel <span className="text-destructive">*</span>
            </Label>
            <Select value={form.aprovadorDestinoId} onValueChange={setField('aprovadorDestinoId')} disabled={catalogosLoading}>
              <SelectTrigger id="aprovadorDestino">
                <SelectValue placeholder={catalogosLoading ? 'Carregando...' : 'Selecione quem vai aprovar'} />
              </SelectTrigger>
              <SelectContent>
                {aprovadores.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">
              Descricao <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="descricao"
              value={form.descricao}
              onChange={(event) => setField('descricao')(event.target.value)}
              placeholder="O que esta sendo pago"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">
                Valor (R$) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="valor"
                type="number"
                min="0.01"
                step="0.01"
                value={form.valor}
                onChange={(event) => setField('valor')(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">
                Categoria <span className="text-destructive">*</span>
              </Label>
              <Select value={form.categoriaId} onValueChange={setField('categoriaId')} disabled={catalogosLoading}>
                <SelectTrigger id="categoria">
                  <SelectValue placeholder={catalogosLoading ? 'Carregando...' : 'Selecione a categoria'} />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataVencimento">Data de vencimento (opcional)</Label>
              <Input
                id="dataVencimento"
                type="date"
                value={form.dataVencimento}
                onChange={(event) => setField('dataVencimento')(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="formaPagamento">Forma de pagamento (opcional)</Label>
              <Select value={form.formaPagamento} onValueChange={setField('formaPagamento')}>
                <SelectTrigger id="formaPagamento">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS_PAGAMENTO.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {empresas.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa</Label>
              <Select value={form.empresaId} onValueChange={setField('empresaId')}>
                <SelectTrigger id="empresa">
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {departamentos.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="departamento">Setor</Label>
              <Select value={form.departamentoId} onValueChange={setField('departamentoId')}>
                <SelectTrigger id="departamento">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {departamentos.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="observacao">Observacao (opcional)</Label>
            <Textarea
              id="observacao"
              value={form.observacao}
              onChange={(event) => setField('observacao')(event.target.value)}
              placeholder="Notas adicionais para quem for analisar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="anexos">Anexos (opcional, max 5 MB cada)</Label>
            <label
              htmlFor="anexos"
              className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 text-sm text-muted-foreground hover:bg-accent"
            >
              <Paperclip className="h-4 w-4" />
              Selecionar arquivo(s)
            </label>
            <input id="anexos" type="file" multiple className="hidden" onChange={handleFileChange} />
            {anexos.length > 0 && (
              <ul className="space-y-2">
                {anexos.map(({ file, categoria, tipoDocumento }, index) => (
                  <li key={`${file.name}-${index}`} className="space-y-2 rounded-md bg-muted px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 truncate">{file.name}</span>
                      <button type="button" onClick={() => removeAnexo(index)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={categoria} onValueChange={setAnexoCategoria(index)}>
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
                      <Select value={tipoDocumento} onValueChange={setAnexoTipoDocumento(index)}>
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getTiposDocumentoPorCategoria(categoria).map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
            {submitMutation.isPending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                {isReenvio ? 'Reenviando...' : 'Enviando...'}
              </>
            ) : isReenvio ? (
              'Reenviar solicitacao'
            ) : (
              'Enviar solicitacao'
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
