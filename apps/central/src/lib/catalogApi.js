import { invokeCentralApi } from '@/lib/centralApiClient';
import { assertSupabaseConfigured, supabase } from '@/lib/supabaseClient';

function toApiError(message, status = 500, code) {
  const error = new Error(message || 'Falha ao consultar a Central.');
  error.status = status;
  if (code) error.code = code;
  return error;
}

function getFunctionErrorMessage(result, fallbackMessage = 'Falha ao consultar a Central.') {
  return result?.error || result?.message || result?.details || fallbackMessage;
}

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

  return text || 'Falha ao consultar a Central.';
}

async function invokeSupabaseFunction(functionName, payload = {}) {
  assertSupabaseConfigured();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (!token) {
    throw toApiError('Sessao expirada. Faca login novamente.', 401, 'auth_required');
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
    throw toApiError(
      mapApiErrorMessage(getFunctionErrorMessage(result)),
      response.status,
      result?.code || (response.status === 401 ? 'auth_required' : undefined),
    );
  }

  return result;
}

const listCentralEntity = async (entity) => {
  const result = await invokeCentralApi('list', { entity });
  return result.rows || [];
};

const buildCentralEntity = (entity) => ({
  list: () => listCentralEntity(entity),
  create: async (payload) => {
    const result = await invokeCentralApi('create', { entity, payload });
    return result.row || null;
  },
  update: async (id, payload) => {
    const result = await invokeCentralApi('update', { entity, id, payload });
    return result.row || null;
  },
  remove: async (id) => {
    await invokeCentralApi('delete', { entity, id });
    return true;
  },
});

export const catalogApi = {
  departamentos: {
    ...buildCentralEntity('departamentos'),
  },
  cargos: {
    ...buildCentralEntity('cargos'),
  },
  empresas: {
    ...buildCentralEntity('empresas'),
  },
  unidades: {
    ...buildCentralEntity('unidades'),
  },
  colaboradores: {
    list: () => listCentralEntity('colaboradores'),
    create: async (payload) => {
      const result = await invokeSupabaseFunction('admin-create-user', payload);
      return result.row || null;
    },
    update: async (id, payload) => {
      const result = await invokeCentralApi('update', { entity: 'colaboradores', id, payload });
      return result.row || null;
    },
    unlinkAssignments: async (id) => {
      return invokeSupabaseFunction('admin-create-user', { action: 'unlink_assignments', id });
    },
    remove: async (id) => {
      await invokeSupabaseFunction('admin-create-user', { action: 'delete', id });
      return true;
    },
  },
  contatos: {
    ...buildCentralEntity('contatos'),
  },
  contratos_documentos: {
    ...buildCentralEntity('contratos_documentos'),
  },
  ativos: {
    ...buildCentralEntity('ativos'),
  },
  infra_estrutura: {
    ...buildCentralEntity('infra_estrutura'),
  },
  linhas_corporativas: {
    ...buildCentralEntity('linhas_corporativas'),
  },
  termos_posse: {
    list: () => listCentralEntity('termos_posse'),
    create: async (payload) => {
      const result = await invokeCentralApi('generate', { entity: 'termos_posse', payload });
      return result.row || null;
    },
    update: async (id, payload) => {
      const result = await invokeCentralApi('update', { entity: 'termos_posse', id, payload });
      return result.row || null;
    },
    remove: async (id) => {
      await invokeCentralApi('delete', { entity: 'termos_posse', id });
      return true;
    },
  },
  email: {
    sendTermoGmail: (payload) => invokeSupabaseFunction('enviar-termo-gmail', payload),
  },
};
