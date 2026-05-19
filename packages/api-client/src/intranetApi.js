import { assertSupabaseConfigured, supabase } from './supabaseClient';

function toError(message, status = 500, code, details, hint) {
  const normalizedMessage =
    typeof message === 'string'
      ? message
      : message?.message || 'Falha ao consultar a intranet.';

  const error = new Error(normalizedMessage);
  error.status = status;
  if (code) {
    error.code = code;
  }
  if (details) {
    error.details = details;
  }
  if (hint) {
    error.hint = hint;
  }
  return error;
}

async function invokeIntranet(body = {}, accessTokenOverride) {
  assertSupabaseConfigured();

  const { data } = accessTokenOverride
    ? { data: { session: { access_token: accessTokenOverride } } }
    : await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (!token) {
    throw toError('Sessao expirada. Faca login novamente.', 401, 'auth_required');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/intranet-api`, {
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
    async list(orderBy, limit) {
      const result = await invokeIntranet({
        resource: 'entity',
        action: 'list',
        entity,
        orderBy,
        limit,
      });
      return result.data || [];
    },
    async filter(filters, orderBy, limit) {
      const result = await invokeIntranet({
        resource: 'entity',
        action: 'filter',
        entity,
        filters,
        orderBy,
        limit,
      });
      return result.data || [];
    },
    async create(payload) {
      const result = await invokeIntranet({
        resource: 'entity',
        action: 'create',
        entity,
        payload,
      });
      return result.data || null;
    },
    async update(id, payload) {
      const result = await invokeIntranet({
        resource: 'entity',
        action: 'update',
        entity,
        id,
        payload,
      });
      return result.data || null;
    },
    async delete(id) {
      const result = await invokeIntranet({
        resource: 'entity',
        action: 'delete',
        entity,
        id,
      });
      return result.data?.success ? { id } : result.data;
    },
  };
}

export const intranetApi = {
  auth: {
    async me(accessToken) {
      const result = await invokeIntranet({
        resource: 'auth',
        action: 'me',
      }, accessToken);
      return result.data || null;
    },
  },
  catalogs: {
    async listDepartments() {
      const result = await invokeIntranet({
        resource: 'catalog',
        action: 'listDepartments',
      });
      return result.data || [];
    },
    async listUnits() {
      const result = await invokeIntranet({
        resource: 'catalog',
        action: 'listUnits',
      });
      return result.data || [];
    },
  },
  entities: new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== 'string') return undefined;
        return buildEntity(prop);
      },
    },
  ),
};
