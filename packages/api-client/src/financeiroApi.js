import { assertSupabaseConfigured, supabase } from './supabaseClient';

function toError(message, status = 500, code, details, hint) {
  const normalizedMessage =
    typeof message === 'string'
      ? message
      : message?.message || 'Falha ao consultar o modulo financeiro.';

  const error = new Error(normalizedMessage);
  error.status = status;
  if (code) error.code = code;
  if (details) error.details = details;
  if (hint) error.hint = hint;
  return error;
}

async function invokeServicos(body = {}, accessTokenOverride) {
  assertSupabaseConfigured();

  const { data } = accessTokenOverride
    ? { data: { session: { access_token: accessTokenOverride } } }
    : await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (!token) {
    throw toError('Sessao expirada. Faca login novamente.', 401, 'auth_required');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/servicos-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const payloadError = result?.error;
    throw toError(
      payloadError,
      response.status,
      payloadError?.code || result?.code,
      payloadError?.details,
      payloadError?.hint,
    );
  }

  return result;
}

export const financeiroApi = {
  auth: {
    async me(accessToken) {
      const result = await invokeServicos({ action: 'me' }, accessToken);
      return {
        row: result.row || null,
        access: result.access || null,
        role: result.role || null,
      };
    },
  },
  storage: {
    bucket: 'comprovantes-pagamento',
  },
  empresas: {
    async list() {
      const result = await invokeServicos({ action: 'list_empresas' });
      return result.rows || [];
    },
  },
  departamentos: {
    async list() {
      const result = await invokeServicos({ action: 'list_departamentos' });
      return result.rows || [];
    },
  },
  fornecedores: {
    async list() {
      const result = await invokeServicos({ action: 'list_fornecedores' });
      return result.rows || [];
    },
    async criar(nome) {
      const result = await invokeServicos({ action: 'criar_fornecedor', nome });
      return result.row || null;
    },
  },
  permissoes: {
    async list() {
      const result = await invokeServicos({ action: 'list_permissoes' });
      return {
        colaboradores: result.colaboradores || [],
        permissoes: result.permissoes || [],
        modulos: result.modulos || [],
      };
    },
    async set(colaboradorId, modulo, papel) {
      const result = await invokeServicos({
        action: 'set_permissao',
        colaborador_id: colaboradorId,
        modulo,
        papel,
      });
      return result.row || null;
    },
  },
  solicitacoes: {
    async list(filters = {}) {
      const result = await invokeServicos({ action: 'list', filters });
      return result.rows || [];
    },
    async getById(id) {
      const result = await invokeServicos({ action: 'get', id });
      return result.row || null;
    },
    async create(payload) {
      const result = await invokeServicos({ action: 'create', payload });
      return result.row || null;
    },
    async update(id, payload) {
      const result = await invokeServicos({ action: 'update', id, payload });
      return result.row || null;
    },
    async setStatus(id, status, observacao_analise) {
      const result = await invokeServicos({ action: 'set_status', id, status, observacao_analise });
      return result.row || null;
    },
    async getSignedUrl(id) {
      const result = await invokeServicos({ action: 'signed_url', id });
      return result.url || null;
    },
  },
  anexos: {
    async list(solicitacaoId) {
      const result = await invokeServicos({ action: 'list_anexos', solicitacao_id: solicitacaoId });
      return result.rows || [];
    },
    async registrar({ solicitacaoId, parcelaId, categoria, tipoDocumento, nomeArquivo, tipoMime, tamanhoBytes, storagePath }) {
      const result = await invokeServicos({
        action: 'registrar_anexo',
        solicitacao_id: solicitacaoId,
        parcela_id: parcelaId || null,
        categoria,
        tipo_documento: tipoDocumento,
        nome_arquivo: nomeArquivo,
        tipo_mime: tipoMime,
        tamanho_bytes: tamanhoBytes,
        storage_path: storagePath,
      });
      return result.row || null;
    },
    async remover(id) {
      await invokeServicos({ action: 'remover_anexo', id });
    },
  },
  parcelas: {
    async list(solicitacaoId) {
      const result = await invokeServicos({ action: 'list_parcelas', solicitacao_id: solicitacaoId });
      return result.rows || [];
    },
    async criar(solicitacaoId, parcelas) {
      const result = await invokeServicos({ action: 'criar_parcelas', solicitacao_id: solicitacaoId, parcelas });
      return result.rows || [];
    },
    async registrarPagamento(id) {
      const result = await invokeServicos({ action: 'registrar_pagamento_parcela', id });
      return result.row || null;
    },
  },
  historico: {
    async list(solicitacaoId) {
      const result = await invokeServicos({ action: 'historico', solicitacao_id: solicitacaoId });
      return result.rows || [];
    },
  },
};
