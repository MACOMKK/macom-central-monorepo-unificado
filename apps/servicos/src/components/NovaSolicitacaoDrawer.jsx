import { useEffect, useState } from 'react';
import { Loader2, Paperclip, X } from 'lucide-react';

import { financeiroApi } from '@macom/api-client/financeiroApi';
import { supabase } from '@macom/api-client/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
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

const CATEGORIAS = [
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'servico', label: 'Servico' },
  { value: 'viagem', label: 'Viagem' },
  { value: 'reembolso', label: 'Reembolso' },
  { value: 'outros', label: 'Outros' },
];

const FORMAS_PAGAMENTO = [
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cartao', label: 'Cartao' },
  { value: 'outros', label: 'Outros' },
];

const TIPOS_DOCUMENTO = [
  { value: 'orcamento', label: 'Orcamento' },
  { value: 'nota_fiscal', label: 'Nota fiscal' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'comprovante_pix', label: 'Comprovante Pix' },
  { value: 'outros', label: 'Outros' },
];

const MAX_COMPROVANTE_SIZE = 5 * 1024 * 1024;

const NOVO_FORNECEDOR_VALUE = '__novo__';

const EMPTY_FORM = {
  titulo: '',
  fornecedorId: '',
  descricao: '',
  valor: '',
  categoria: 'outros',
  dataVencimento: '',
  formaPagamento: '',
  observacao: '',
  empresaId: '',
  departamentoId: '',
};

export default function NovaSolicitacaoDrawer({ open, onOpenChange, onCreated }) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [empresas, setEmpresas] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [novoFornecedorNome, setNovoFornecedorNome] = useState('');
  const [anexos, setAnexos] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    financeiroApi.empresas
      .list()
      .then(setEmpresas)
      .catch(() => setEmpresas([]));
    financeiroApi.departamentos
      .list()
      .then(setDepartamentos)
      .catch(() => setDepartamentos([]));
    financeiroApi.fornecedores
      .list()
      .then(setFornecedores)
      .catch(() => setFornecedores([]));
  }, [open]);

  useEffect(() => {
    if (open) {
      setForm((current) => ({ ...current, departamentoId: user?.collaborator?.departamento_id || '' }));
    } else {
      setForm(EMPTY_FORM);
      setNovoFornecedorNome('');
      setAnexos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setField = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    const tooBig = files.find((file) => file.size > MAX_COMPROVANTE_SIZE);
    if (tooBig) {
      toast({ title: 'Arquivo muito grande', description: `"${tooBig.name}" deve ter no maximo 5 MB.` });
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

    setSubmitting(true);
    try {
      let fornecedorId = form.fornecedorId;
      if (fornecedorId === NOVO_FORNECEDOR_VALUE) {
        const novo = await financeiroApi.fornecedores.criar(novoFornecedorNome.trim());
        fornecedorId = novo.id;
      }

      const row = await financeiroApi.solicitacoes.create({
        titulo: form.titulo,
        fornecedor_id: fornecedorId,
        descricao: form.descricao,
        valor: Number(form.valor),
        categoria: form.categoria,
        data_vencimento: form.dataVencimento || null,
        forma_pagamento: form.formaPagamento || null,
        observacao: form.observacao || null,
        empresa_id: form.empresaId || null,
        departamento_id: form.departamentoId || null,
      });

      for (const { file, tipoDocumento } of anexos) {
        const extension = file.name.split('.').pop();
        const path = `${row.id}/comprovante_solicitacao/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(financeiroApi.storage.bucket)
          .upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;

        await financeiroApi.anexos.registrar({
          solicitacaoId: row.id,
          categoria: 'comprovante_solicitacao',
          tipoDocumento,
          nomeArquivo: file.name,
          tipoMime: file.type || 'application/octet-stream',
          tamanhoBytes: file.size,
          storagePath: path,
        });
      }

      toast({ title: 'Solicitacao enviada', description: 'Sua solicitacao de pagamento foi registrada.' });
      onOpenChange(false);
      onCreated?.(row);
    } catch (error) {
      toast({ title: 'Nao foi possivel enviar', description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nova solicitacao de pagamento</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Titulo</Label>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(event) => setField('titulo')(event.target.value)}
              placeholder="Titulo curto da solicitacao"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fornecedor">Fornecedor</Label>
            <Select value={form.fornecedorId} onValueChange={setField('fornecedorId')}>
              <SelectTrigger id="fornecedor">
                <SelectValue placeholder="Selecione o fornecedor" />
              </SelectTrigger>
              <SelectContent>
                {fornecedores.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.nome}
                  </SelectItem>
                ))}
                <SelectItem value={NOVO_FORNECEDOR_VALUE}>+ Cadastrar novo fornecedor</SelectItem>
              </SelectContent>
            </Select>
            {form.fornecedorId === NOVO_FORNECEDOR_VALUE && (
              <Input
                value={novoFornecedorNome}
                onChange={(event) => setNovoFornecedorNome(event.target.value)}
                placeholder="Nome do novo fornecedor"
                required
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descricao</Label>
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
              <Label htmlFor="valor">Valor (R$)</Label>
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
              <Label htmlFor="categoria">Categoria</Label>
              <Select value={form.categoria} onValueChange={setField('categoria')}>
                <SelectTrigger id="categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
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
                Enviando...
              </>
            ) : (
              'Enviar solicitacao'
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
