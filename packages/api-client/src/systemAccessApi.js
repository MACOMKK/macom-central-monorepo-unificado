import { assertSupabaseConfigured, supabase } from './supabaseClient';

function toApiError(message, status = 500, code) {
  const error = new Error(message || 'Falha ao consultar acessos dos sistemas.');
  error.status = status;
  if (code) {
    error.code = code;
  }
  return error;
}

async function invokeCatalogFunction(action, payload = {}, accessTokenOverride) {
  assertSupabaseConfigured();
  const { data } = accessTokenOverride
    ? { data: { session: { access_token: accessTokenOverride } } }
    : await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (!token) {
    throw new Error('Sessao expirada. Faca login novamente.');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/catalog-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload ? { action, ...payload } : { action }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw toApiError(
      result?.error || 'Falha ao consultar acessos dos sistemas.',
      response.status,
      result?.code || (response.status === 401 ? 'auth_required' : undefined),
    );
  }

  return result;
}

export const systemAccessApi = {
  systems: {
    async list(options = {}) {
      const result = await invokeCatalogFunction('list', {
        entity: 'sistemas',
        ...(options.appContext ? { app_context: options.appContext } : {}),
      });
      return result.rows || [];
    },
    async findBySlug(slug) {
      const rows = await this.list();
      return rows.find((system) => system.slug === slug) || null;
    },
  },
  accesses: {
    async list(options = {}) {
      const result = await invokeCatalogFunction('list', {
        entity: 'acessos_usuario_sistema',
        ...(options.appContext ? { app_context: options.appContext } : {}),
      });
      return result.rows || [];
    },
    async save(payload, options = {}) {
      const result = await invokeCatalogFunction('save', {
        entity: 'acessos_usuario_sistema',
        payload,
        ...(options.appContext ? { app_context: options.appContext } : {}),
      });
      return result.row || null;
    },
    async update(id, payload, options = {}) {
      const result = await invokeCatalogFunction('update', {
        entity: 'acessos_usuario_sistema',
        id,
        payload,
        ...(options.appContext ? { app_context: options.appContext } : {}),
      });
      return result.row || null;
    },
    async findByCollaboratorAndSystem(colaboradorId, systemSlug, accessToken) {
      void colaboradorId;
      const result = await invokeCatalogFunction('access_check', {
        entity: 'acessos_usuario_sistema',
        system_slug: systemSlug,
      }, accessToken);
      return result.row || null;
    },
    async remove(id, options = {}) {
      await invokeCatalogFunction('delete', {
        entity: 'acessos_usuario_sistema',
        id,
        ...(options.appContext ? { app_context: options.appContext } : {}),
      });
      return true;
    },
  },
};
