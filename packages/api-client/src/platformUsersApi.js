import { assertSupabaseConfigured, supabase } from './supabaseClient';

function toApiError(message, status = 500, code) {
  const error = new Error(message || 'Falha ao consultar usuarios da plataforma.');
  error.status = status;
  if (code) error.code = code;
  return error;
}

async function invokeCentralApi(action, payload = {}) {
  assertSupabaseConfigured();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (!token) {
    throw toApiError('Sessao expirada. Faca login novamente.', 401, 'auth_required');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/central-api`, {
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
    throw toApiError(
      result?.error || result?.message || result?.details || 'Falha ao consultar usuarios da plataforma.',
      response.status,
      result?.code || (response.status === 401 ? 'auth_required' : undefined),
    );
  }

  return result;
}

async function invokeAdminUserFunction(payload = {}) {
  assertSupabaseConfigured();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (!token) {
    throw toApiError('Sessao expirada. Faca login novamente.', 401, 'auth_required');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw toApiError(
      result?.error || result?.message || result?.details || 'Falha ao atualizar usuario da plataforma.',
      response.status,
      result?.code || (response.status === 401 ? 'auth_required' : undefined),
    );
  }

  return result;
}

const listCentralEntity = async (entity, options = {}) => {
  const result = await invokeCentralApi('list', {
    entity,
    filters: options.filters || {},
  });
  return result.rows || [];
};

export const platformUsersApi = {
  collaborators: {
    list: (options = {}) => listCentralEntity('colaboradores', options),
    updateAccessProfile: async (id, payload) => {
      const result = await invokeCentralApi('update', {
        entity: 'colaboradores',
        id,
        payload: {
          funcao: payload.funcao,
          status: payload.status,
        },
      });
      return result.row || null;
    },
    updatePassword: async (id, password) => {
      await invokeAdminUserFunction({
        action: 'update_password',
        id,
        password,
      });
      return true;
    },
    updateEmail: async (id, email, options = {}) => {
      const result = await invokeAdminUserFunction({
        action: 'update_email',
        id,
        email,
        reset_password: Boolean(options.resetPassword),
      });
      return result.row || null;
    },
  },
  systems: {
    list: (options = {}) => listCentralEntity('sistemas', options),
  },
  accesses: {
    list: (options = {}) => listCentralEntity('acessos_usuario_sistema', options),
    save: async (payload) => {
      const result = await invokeCentralApi('save', {
        entity: 'acessos_usuario_sistema',
        payload,
      });
      return result.row || null;
    },
    update: async (id, payload) => {
      const result = await invokeCentralApi('update', {
        entity: 'acessos_usuario_sistema',
        id,
        payload,
      });
      return result.row || null;
    },
    remove: async (id) => {
      await invokeCentralApi('delete', {
        entity: 'acessos_usuario_sistema',
        id,
      });
      return true;
    },
  },
};
