import { useEffect, useState } from 'react';
import { Loader2, Paperclip, X } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import { useAuth } from '@/lib/AuthContext';
import { isAllowedAnexoMimeType, MAX_ANEXO_SIZE, uploadAnexo } from '@/lib/anexoUpload';
import { getFriendlyErrorMessage } from '@/lib/errorMessage';
import { FORMA_PAGAMENTO_LABEL, TIPOS_DOCUMENTO } from '@/lib/financeiroFormat';
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

export default function NovaSolicitacaoDrawer({ open, onOpenChange, onCreated, solicitacao = null }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isReenvio = Boolean(solicitacao);

  const [form, setForm] = useState(EMPTY_FORM);
  const [empresas, setEmpresas] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [aprovadores, setAprovadores] = useState([]);
  const [anexos, setAnexos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [catalogosLoading, setCatalogosLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCatalogosLoading(true);
    Promise.allSettled([
      financeiroApi.empresas.list().then(setEmpresas).catch(() => setEmpresas([])),
      financeiroApi.departamentos.list().then(setDepartamentos).catch(() => setDepartamentos([])),
      financeiroApi.fornecedores.list().then(setFornecedores).catch(() => setFornecedores([])),
      financeiroApi.categorias.list().then(setCategorias).catch(() => setCategorias([])),
      financeiroApi.aprovadores.list().then(setAprovadores).catch(() => setAprovadores([])),
    ]).finally(() => setCatalogosLoading(false));
  }, [open]);

  useEffect(() => {
    if (open && isReenvio) {
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
    } else if (open) {
      setForm((current) => ({
        ...current,
        empresaId: user?.collaborator?.empresa_id || '',
        departamentoId: user?.collaborator?.departamento_id || '',
      }));
    } else {
      setForm(EMPTY_FORM);
      setAnexos([]);
    }
  }, [open]);

  const setField = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  const hasUnsavedChanges = () =>
    Boolean(form.titulo.trim() || form.descricao.trim() || form.valor || anexos.length > 0);

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen && hasUnsavedChanges()) {
      const confirmed = window.confirm('Existem dados preenchidos que serao perdidos. Deseja mesmo fechar?');
      if (!confirmed) return;
    }
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
    setAnexos((current) => [...current, ...files.map((file) => ({ file, tipoDocumento: 'outros' }))]);
    event.target.value = '';
  };

  const removeAnexo = (index) => {
    setAnexos((current) => current.filter((_, i) => i !== index));
  };

  const setAnexoTipoDocumento = (index) => (value) => {
    setAnexos((current) => current.map((item, i) => (i === index ? { ...item, tipoDocumento: value } : item)));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (!form.fornecedorId || !form.aprovadorDestinoId || !form.categoriaId) {
      toast({
        title: 'Campos obrigatorios faltando',
        description: 'Selecione fornecedor, aprovador e categoria antes de enviar.',
      });
      return;
    }

    setSubmitting(true);
    let row = null;
    try {
      const payload = {
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
      };

      row = isReenvio
        ? await financeiroApi.solicitacoes.reenviar(solicitacao.id, payload)
        : await financeiroApi.solicitacoes.create(payload);

      try {
        for (const { file, tipoDocumento } of anexos) {
          await uploadAnexo({ file, solicitacaoId: row.id, categoria: 'comprovante_solicitacao', tipoDocumento });
        }
      } catch (anexoError) {
        toast({
          title: isReenvio ? 'Solicitacao reenviada, mas houve falha no anexo' : 'Solicitacao enviada, mas houve falha no anexo',
          description: `A solicitacao foi registrada normalmente, porem um anexo nao foi enviado: ${getFriendlyErrorMessage(anexoError)}. Voce pode adiciona-lo depois pela tela de detalhes.`,
        });
        onOpenChange(false);
        onCreated?.(row);
        return;
      }

      toast(
        isReenvio
          ? { title: 'Solicitacao reenviada', description: 'Sua solicitacao voltou para a fila de aprovacao.' }
          : { title: 'Solicitacao enviada', description: 'Sua solicitacao de pagamento foi registrada.' },
      );
      onOpenChange(false);
      onCreated?.(row);
    } catch (error) {
      toast({ title: isReenvio ? 'Nao foi possivel reenviar' : 'Nao foi possivel enviar', description: getFriendlyErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
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
                {anexos.map(({ file, tipoDocumento }, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                    <span className="flex-1 truncate">{file.name}</span>
                    <Select value={tipoDocumento} onValueChange={setAnexoTipoDocumento(index)}>
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
                    <button type="button" onClick={() => removeAnexo(index)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
