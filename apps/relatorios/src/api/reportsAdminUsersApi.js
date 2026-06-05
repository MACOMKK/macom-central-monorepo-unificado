import { assertSupabaseConfigured, supabase } from '@/api/supabaseClient';

function toAdminUserError(message, status = 500, code) {
  const error = new Error(message || 'Falha ao gerenciar usuario.');
  error.status = status;
  if (code) error.code = code;
  return error;
}

function mapAdminUserError(message) {
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

  return text || 'Falha ao gerenciar usuario.';
}

async function invokeAdminCreateUser(payload = {}) {
  assertSupabaseConfigured();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (!token) {
    throw toAdminUserError('Sessao expirada. Faca login novamente.', 401, 'auth_required');
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
    throw toAdminUserError(
      mapAdminUserError(result?.error),
      response.status,
      result?.code || (response.status === 401 ? 'auth_required' : undefined),
    );
  }

  return result;
}

export const reportsAdminUsersApi = {
  async create(payload) {
    const result = await invokeAdminCreateUser(payload);
    return result.row || null;
  },
  async updatePassword(id, password) {
    await invokeAdminCreateUser({ action: 'update_password', id, password });
    return true;
  },
};
