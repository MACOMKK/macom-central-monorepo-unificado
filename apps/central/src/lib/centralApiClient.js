import { assertSupabaseConfigured, supabase } from '@/lib/supabaseClient';

function toCentralApiError(message, status = 500, code) {
  const error = new Error(message || 'Falha ao consultar a Central.');
  error.status = status;
  if (code) error.code = code;
  return error;
}

export async function invokeCentralApi(action, payload = {}, accessTokenOverride) {
  assertSupabaseConfigured();
  const { data } = accessTokenOverride
    ? { data: { session: { access_token: accessTokenOverride } } }
    : await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (!token) {
    throw toCentralApiError('Sessao expirada. Faca login novamente.', 401, 'auth_required');
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
    throw toCentralApiError(
      result?.error || 'Falha ao consultar a Central.',
      response.status,
      result?.code || (response.status === 401 ? 'auth_required' : undefined),
    );
  }

  return result;
}
