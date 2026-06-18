import { assertSupabaseConfigured, supabase } from './supabaseClient';

function toError(message, status = 500, code, details, hint) {
  const normalizedMessage =
    typeof message === 'string'
      ? message
      : message?.message || 'Falha ao consultar o CRM.';

  const error = new Error(normalizedMessage);
  error.status = status;
  if (code) error.code = code;
  if (details) error.details = details;
  if (hint) error.hint = hint;
  return error;
}

async function invokeCrm(body = {}, accessTokenOverride) {
  assertSupabaseConfigured();

  const { data } = accessTokenOverride
    ? { data: { session: { access_token: accessTokenOverride } } }
    : await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (!token) {
    throw toError('Sessao expirada. Faca login novamente.', 401, 'auth_required');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-api`, {
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

function buildEntity(entity) {
  return {
    async list(options = {}) {
      const result = await invokeCrm({
        action: 'list',
        entity,
        filters: options.filters || {},
        or: options.or,
        orderBy: options.orderBy,
        ascending: options.ascending,
        limit: options.limit,
        offset: options.offset,
      });
      return result.rows || [];
    },

    async getById(id) {
      const result = await invokeCrm({
        action: 'get',
        entity,
        id,
      });
      return result.row || null;
    },

    async create(payload) {
      const result = await invokeCrm({
        action: 'create',
        entity,
        payload,
      });
      return result.row || null;
    },

    async update(id, payload) {
      const result = await invokeCrm({
        action: 'update',
        entity,
        id,
        payload,
      });
      return result.row || null;
    },

    async remove(id) {
      await invokeCrm({
        action: 'delete',
        entity,
        id,
      });
      return { id };
    },
  };
}

export const crmApi = {
  auth: {
    async me(accessToken) {
      const result = await invokeCrm({ action: 'me' }, accessToken);
      return {
        row: result.row || null,
        access: result.access || null,
      };
    },
  },
  clientes: buildEntity('clientes'),
  leads: buildEntity('leads'),
  atendimentos: buildEntity('atendimentos'),
  historico_atendimentos: buildEntity('historico_atendimentos'),
};
