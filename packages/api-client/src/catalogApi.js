import { assertSupabaseConfigured, supabase } from './supabaseClient';

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

  if (text.includes('colaboradores_telefone_unique_idx') || text.includes('colaboradores_telefone_key')) {
    return 'Ja existe um colaborador com este telefone.';
  }

  if (text.includes('ativos_patrimonio_key')) {
    return 'Ja existe um ativo com este patrimonio.';
  }

  if (text.includes('ativos_numero_serie_key') || text.includes('ativos_numero_serie_unique_idx')) {
    return 'Ja existe um ativo com este numero de serie.';
  }

  return text || 'Falha ao consultar o catalogo.';
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

async function invokeCatalog(action, entity, options = {}) {
  return invokeSupabaseFunction('catalog-api', {
    action,
    entity,
    ...options,
  });
}

export const catalogApi = {
  auth: {
    async me(accessToken) {
      const result = await invokeSupabaseFunction('catalog-api', { action: 'me', entity: 'colaboradores' }, accessToken);
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
    async unlinkAssignments(id) {
      const result = await invokeSupabaseFunction('admin-create-user', { action: 'unlink_assignments', id });
      return result;
    },
    async remove(id) {
      await invokeSupabaseFunction('admin-create-user', { action: 'delete', id });
      return true;
    },
  },
  contatos: {
    async list() {
      const result = await invokeCatalog('list', 'contatos');
      return result.rows || [];
    },
    async create(payload) {
      const result = await invokeCatalog('create', 'contatos', { payload });
      return result.row;
    },
    async update(id, payload) {
      const result = await invokeCatalog('update', 'contatos', { id, payload });
      return result.row;
    },
    async remove(id) {
      await invokeCatalog('delete', 'contatos', { id });
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
  infra_estrutura: {
    async list() {
      const result = await invokeCatalog('list', 'infra_estrutura');
      return result.rows || [];
    },
    async create(payload) {
      const result = await invokeCatalog('create', 'infra_estrutura', { payload });
      return result.row;
    },
    async update(id, payload) {
      const result = await invokeCatalog('update', 'infra_estrutura', { id, payload });
      return result.row;
    },
    async remove(id) {
      await invokeCatalog('delete', 'infra_estrutura', { id });
      return true;
    },
  },
  linhas_corporativas: {
    async list() {
      const result = await invokeCatalog('list', 'linhas_corporativas');
      return result.rows || [];
    },
    async create(payload) {
      const result = await invokeCatalog('create', 'linhas_corporativas', { payload });
      return result.row;
    },
    async update(id, payload) {
      const result = await invokeCatalog('update', 'linhas_corporativas', { id, payload });
      return result.row;
    },
    async remove(id) {
      await invokeCatalog('delete', 'linhas_corporativas', { id });
      return true;
    },
  },
  termos_posse: {
    async list() {
      const result = await invokeCatalog('list', 'termos_posse');
      return result.rows || [];
    },
    async create(payload) {
      const result = await invokeCatalog('generate', 'termos_posse', { payload });
      return result.row;
    },
    async update(id, payload) {
      const result = await invokeCatalog('update', 'termos_posse', { id, payload });
      return result.row;
    },
    async remove(id) {
      await invokeCatalog('delete', 'termos_posse', { id });
      return true;
    },
  },
  fila_emails: {
    async create(payload) {
      const result = await invokeCatalog('create', 'fila_emails', { payload });
      return result.row;
    },
    async list() {
      const result = await invokeCatalog('list', 'fila_emails');
      return result.rows || [];
    },
  },
  email: {
    async sendTermoGmail(payload) {
      return invokeSupabaseFunction('enviar-termo-gmail', payload);
    },
  },
  relatorios: {
    async list(options = {}) {
      const result = await invokeCatalog('list', 'relatorios', {
        filters: options.filters || {},
      });
      return result.rows || [];
    },
    async create(payload) {
      const result = await invokeCatalog('create', 'relatorios', { payload });
      return result.row || null;
    },
    async update(id, payload) {
      const result = await invokeCatalog('update', 'relatorios', { id, payload });
      return result.row || null;
    },
    async remove(id) {
      await invokeCatalog('delete', 'relatorios', { id });
      return true;
    },
  },
  permissoes_relatorios: {
    async list(options = {}) {
      const result = await invokeCatalog('list', 'permissoes_relatorios', {
        filters: options.filters || {},
      });
      return result.rows || [];
    },
    async create(payload) {
      const result = await invokeCatalog('create', 'permissoes_relatorios', { payload });
      return result.row || null;
    },
    async update(id, payload) {
      const result = await invokeCatalog('update', 'permissoes_relatorios', { id, payload });
      return result.row || null;
    },
    async remove(id) {
      await invokeCatalog('delete', 'permissoes_relatorios', { id });
      return true;
    },
  },
};
