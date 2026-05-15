import { assertSupabaseConfigured, supabase } from './supabaseClient';

function toError(message, status = 500, code) {
  const error = new Error(message || 'Falha ao consultar a intranet.');
  error.status = status;
  if (code) {
    error.code = code;
  }
  return error;
}

async function invokeIntranet(action, payload = {}, accessTokenOverride) {
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
    body: JSON.stringify({ action, ...payload }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw toError(result?.error || 'Falha ao consultar a intranet.', response.status, result?.code);
  }

  return result;
}

function buildEntity(entity) {
  return {
    async list(orderBy, limit) {
      const result = await invokeIntranet('list', { entity, orderBy, limit });
      return result.rows || [];
    },
    async filter(filters, orderBy, limit) {
      const result = await invokeIntranet('filter', { entity, filters, orderBy, limit });
      return result.rows || [];
    },
    async create(payload) {
      const result = await invokeIntranet('create', { entity, payload });
      return result.row || null;
    },
    async update(id, payload) {
      const result = await invokeIntranet('update', { entity, id, payload });
      return result.row || null;
    },
    async delete(id) {
      const result = await invokeIntranet('delete', { entity, id });
      return result.success ? { id } : result;
    },
  };
}

export const intranetApi = {
  auth: {
    async me(accessToken) {
      const result = await invokeIntranet('me', {}, accessToken);
      return result.user || null;
    },
  },
  catalogs: {
    async listDepartments() {
      const result = await invokeIntranet('catalog', { catalog: 'departments' });
      return result.rows || [];
    },
    async listUnits() {
      const result = await invokeIntranet('catalog', { catalog: 'units' });
      return result.rows || [];
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
