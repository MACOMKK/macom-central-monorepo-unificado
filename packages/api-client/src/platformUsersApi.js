import { assertSupabaseConfigured, supabase } from './supabaseClient';
import { platformAuditApi } from './platformAuditApi';

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

async function writeConsoleAudit(payload) {
  try {
    await platformAuditApi.logs.create(payload);
  } catch (error) {
    console.warn('Falha ao registrar auditoria do Console.', error);
  }
}

async function getCollaboratorSnapshot(id) {
  const rows = await listCentralEntity('colaboradores', { filters: { id } });
  return rows[0] || null;
}

export const platformUsersApi = {
  collaborators: {
    list: (options = {}) => listCentralEntity('colaboradores', options),
    updateAccessProfile: async (id, payload) => {
      const before = await getCollaboratorSnapshot(id).catch(() => null);
      const result = await invokeCentralApi('update', {
        entity: 'colaboradores',
        id,
        payload: {
          funcao: payload.funcao,
          status: payload.status,
        },
      });
      await writeConsoleAudit({
        entidade: 'usuarios',
        acao: 'atualizar',
        registro_id: id,
        antes: before,
        depois: result.row || null,
        metadados: {
          tipo: 'perfil_status',
          campos_alterados: ['funcao', 'status'],
        },
      });
      return result.row || null;
    },
    updatePassword: async (id, password) => {
      const collaborator = await getCollaboratorSnapshot(id).catch(() => null);
      await invokeAdminUserFunction({
        action: 'update_password',
        id,
        password,
      });
      await writeConsoleAudit({
        entidade: 'usuarios',
        acao: 'redefinir_senha',
        registro_id: id,
        antes: collaborator,
        depois: collaborator,
        metadados: {
          tipo: 'reset_manual',
          colaborador_id_afetado: id,
          colaborador_nome_afetado: collaborator?.nome || null,
          colaborador_email_afetado: collaborator?.email || null,
        },
      });
      return true;
    },
    updateEmail: async (id, email, options = {}) => {
      const before = await getCollaboratorSnapshot(id).catch(() => null);
      const result = await invokeAdminUserFunction({
        action: 'update_email',
        id,
        email,
        reset_password: Boolean(options.resetPassword),
      });
      await writeConsoleAudit({
        entidade: 'usuarios',
        acao: 'atualizar',
        registro_id: id,
        antes: before,
        depois: result.row || null,
        metadados: {
          tipo: 'email_login',
          campo: 'email',
          email_anterior: before?.email || null,
          email_novo: email,
          senha_redefinida: Boolean(options.resetPassword),
        },
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
      await writeConsoleAudit({
        entidade: 'acessos_usuario_sistema',
        acao: 'criar',
        registro_id: result.row?.id || null,
        antes: null,
        depois: result.row || null,
        metadados: {
          tipo: 'salvar_acesso_sistema',
          colaborador_id_afetado: result.row?.colaborador_id || payload.colaborador_id || null,
          sistema_id: result.row?.sistema_id || payload.sistema_id || null,
          nivel_acesso_novo: result.row?.nivel_acesso || payload.nivel_acesso || null,
          status_novo: result.row?.ativo ?? payload.ativo ?? null,
        },
      });
      return result.row || null;
    },
    update: async (id, payload) => {
      const result = await invokeCentralApi('update', {
        entity: 'acessos_usuario_sistema',
        id,
        payload,
      });
      await writeConsoleAudit({
        entidade: 'acessos_usuario_sistema',
        acao: 'atualizar',
        registro_id: id,
        antes: null,
        depois: result.row || null,
        metadados: {
          tipo: 'atualizar_acesso_sistema',
          colaborador_id_afetado: result.row?.colaborador_id || null,
          sistema_id: result.row?.sistema_id || null,
          nivel_acesso_novo: result.row?.nivel_acesso || payload.nivel_acesso || null,
          status_novo: result.row?.ativo ?? payload.ativo ?? null,
        },
      });
      return result.row || null;
    },
    remove: async (id) => {
      await invokeCentralApi('delete', {
        entity: 'acessos_usuario_sistema',
        id,
      });
      await writeConsoleAudit({
        entidade: 'acessos_usuario_sistema',
        acao: 'excluir',
        registro_id: id,
        antes: null,
        depois: null,
        metadados: {
          tipo: 'remover_acesso_sistema',
        },
      });
      return true;
    },
  },
};
