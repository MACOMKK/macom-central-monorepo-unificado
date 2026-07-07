import { assertSupabaseConfigured, supabase } from './supabaseClient';

function toError(message, status = 500, code, details, hint) {
  const normalizedMessage =
    typeof message === 'string' ? message : message?.message || 'Falha ao consultar a Comunicacao.';

  const error = new Error(normalizedMessage);
  error.status = status;
  if (code) error.code = code;
  if (details) error.details = details;
  if (hint) error.hint = hint;
  return error;
}

async function invokeComunicacao(body = {}, accessTokenOverride) {
  assertSupabaseConfigured();

  const { data } = accessTokenOverride
    ? { data: { session: { access_token: accessTokenOverride } } }
    : await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (!token) {
    throw toError('Sessao expirada. Faca login novamente.', 401, 'auth_required');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/comunicacao-api`, {
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

export const comunicacaoApi = {
  auth: {
    async me(accessToken) {
      const result = await invokeComunicacao({ action: 'me' }, accessToken);
      return {
        row: result.row || null,
        access: result.access || null,
      };
    },
  },
  canais: {
    async list() {
      const result = await invokeComunicacao({ action: 'list_canais' });
      return result.rows || [];
    },
  },
  mensagens: {
    async list({ canalId, before, limit } = {}) {
      const result = await invokeComunicacao({
        action: 'list_mensagens',
        canal_id: canalId,
        before,
        limit,
      });
      return result.rows || [];
    },

    async create({ canalId, conteudo }) {
      const result = await invokeComunicacao({
        action: 'create_mensagem',
        canal_id: canalId,
        conteudo,
      });
      return result.row || null;
    },

    async update(id, conteudo) {
      const result = await invokeComunicacao({
        action: 'update_mensagem',
        id,
        conteudo,
      });
      return result.row || null;
    },

    async remove(id) {
      const result = await invokeComunicacao({
        action: 'delete_mensagem',
        id,
      });
      return result.row || null;
    },
  },
};
