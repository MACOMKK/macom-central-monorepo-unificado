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
      };
    },
  },
  storage: {
    bucket: 'comprovantes-pagamento',
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
};
