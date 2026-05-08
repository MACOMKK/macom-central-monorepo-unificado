import { assertSupabaseConfigured, supabase } from '@/lib/supabaseClient';

function mapApiErrorMessage(message) {
  const text = String(message || '');

  if (
    text.includes('A user with this email address has already been registered') ||
    text.includes('User already registered') ||
    text.includes('already been registered') ||
    text.includes('colaboradores_email_unique_idx') ||
    text.includes('colaboradores_email_key')
  ) {
    return 'Ja existe um colaborador com este email.';
  }

  if (text.includes('colaboradores_cpf_key')) {
    return 'Ja existe um colaborador com este CPF.';
  }

  if (
    text.includes('colaboradores_telefone_unique_idx') ||
    text.includes('colaboradores_telefone_key')
  ) {
    return 'Ja existe um colaborador com este telefone.';
  }

  return text || 'Falha ao consultar o catalogo.';
}

async function invokeCatalog(action, entity, payload = {}) {
  return invokeSupabaseFunction('catalog-api', {
    action,
    entity,
    ...payload,
  });
}

async function invokeSupabaseFunction(functionName, payload = {}, accessTokenOverride) {
  assertSupabaseConfigured();
  const { data } = accessTokenOverride ? { data: { session: { access_token: accessTokenOverride } } } : await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (!token) {
    throw new Error('Sessao expirada. Faca login novamente.');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
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
    throw new Error(mapApiErrorMessage(result?.error));
  }

  return result;
}

export const catalogApi = {
  auth: {
    async me(accessToken) {
      const result = await invokeSupabaseFunction(
        'catalog-api',
        { action: 'me', entity: 'colaboradores' },
        accessToken
      );
      return result.row || null;
    },
  },
  departamentos: {
    async list() {
      const result = await invokeCatalog('list', 'departamentos');
      return result.rows || [];
    },
    async create(payload) {
      const result = await invokeCatalog('create', 'departamentos', { payload });
      return result.row;
    },
    async update(id, payload) {
      const result = await invokeCatalog('update', 'departamentos', { id, payload });
      return result.row;
    },
    async remove(id) {
      await invokeCatalog('delete', 'departamentos', { id });
      return true;
    },
  },
  unidades: {
    async list() {
      const result = await invokeCatalog('list', 'unidades');
      return result.rows || [];
    },
    async create(payload) {
      const result = await invokeCatalog('create', 'unidades', { payload });
      return result.row;
    },
    async update(id, payload) {
      const result = await invokeCatalog('update', 'unidades', { id, payload });
      return result.row;
    },
    async remove(id) {
      await invokeCatalog('delete', 'unidades', { id });
      return true;
    },
  },
  colaboradores: {
    async list() {
      const result = await invokeCatalog('list', 'colaboradores');
      return result.rows || [];
    },
    async create(payload) {
      const result = await invokeSupabaseFunction('admin-create-user', payload);
      return result.row;
    },
    async update(id, payload) {
      const result = await invokeCatalog('update', 'colaboradores', { id, payload });
      return result.row;
    },
    async updatePassword(id, password) {
      await invokeSupabaseFunction('admin-create-user', { action: 'update_password', id, password });
      return true;
    },
    async unlinkAssets(id) {
      const result = await invokeSupabaseFunction('admin-create-user', { action: 'unlink_assets', id });
      return result.count || 0;
    },
    async remove(id) {
      await invokeSupabaseFunction('admin-create-user', { action: 'delete', id });
      return true;
    },
  },
  ativos: {
    async list() {
      const result = await invokeCatalog('list', 'ativos');
      return result.rows || [];
    },
    async create(payload) {
      const result = await invokeCatalog('create', 'ativos', { payload });
      return result.row;
    },
    async update(id, payload) {
      const result = await invokeCatalog('update', 'ativos', { id, payload });
      return result.row;
    },
    async remove(id) {
      await invokeCatalog('delete', 'ativos', { id });
      return true;
    },
  },
};
