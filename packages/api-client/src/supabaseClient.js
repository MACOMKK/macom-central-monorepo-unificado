import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local.');
  }
}

// Telemetria de seguranca (item 5 do plano de forca bruta, SECURITY_AUDIT.md): registra uma
// tentativa de login rejeitada por credencial invalida, alimentando o alerta de picos
// (security-alerta-picos-login). Nunca deve interromper o fluxo de login em si -- por isso
// engole qualquer erro silenciosamente.
export function reportFailedLogin(email, systemSlug) {
  if (!isSupabaseConfigured || !email || !systemSlug) return;
  supabase.functions
    .invoke('security-log-failed-login', { body: { email, sistema_slug: systemSlug } })
    .catch(() => {});
}

// Simetrico a reportFailedLogin: registra um login bem-sucedido, usado por checkLoginLock para
// resetar a janela de falhas contadas contra a conta. Sem parametro de e-mail -- a function
// deriva o e-mail do token de acesso da sessao recem-criada (nunca de um valor enviado pelo
// client, que um chamador anonimo poderia forjar para resetar o lockout de outra conta).
export function reportLoginSuccess(systemSlug) {
  if (!isSupabaseConfigured || !systemSlug) return;
  supabase.functions
    .invoke('security-log-login-success', { body: { sistema_slug: systemSlug } })
    .catch(() => {});
}

// Traduz erros de autenticacao do Supabase (e alguns casos genericos de rede/captcha) para
// mensagens amigaveis em pt-BR. Usado por todos os fluxos de login do monorepo, direto ou via
// packages/auth, para evitar mensagens cruas como "Invalid login credentials" chegando ao usuario.
export function getAuthErrorMessage(error, fallback = 'Não foi possível entrar.') {
  const code = error?.code;
  const msg = typeof error?.message === 'string' ? error.message : '';
  const lower = msg.toLowerCase();

  if (code === 'invalid_credentials' || msg === 'Invalid login credentials') {
    return 'E-mail ou senha incorretos.';
  }
  if (code === 'email_not_confirmed' || lower.includes('email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.';
  }
  if (lower.includes('captcha')) {
    return 'Falha na verificação de segurança. Recarregue a página e tente novamente.';
  }
  if (code === 'over_request_rate_limit' || lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Muitas tentativas. Aguarde alguns instantes e tente novamente.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Falha de conexão. Verifique sua internet e tente novamente.';
  }
  if (lower.includes('auth session missing')) {
    return null;
  }
  if (lower.includes('missing sub claim')) {
    return 'Sua sessão está inválida ou expirada. Faça login novamente.';
  }

  return msg || fallback;
}

// Fallback client-side do lockout por conta (item 3 do plano de forca bruta, SECURITY_AUDIT.md):
// o Auth Hook nativo "Password Verification Attempt" exige plano Team/Enterprise do Supabase,
// indisponivel neste projeto. Chamar ANTES de supabase.auth.signInWithPassword; fail-open (nunca
// bloqueia um login por erro nesta checagem).
export async function checkLoginLock(email, systemSlug) {
  if (!isSupabaseConfigured || !email || !systemSlug) return { locked: false };
  try {
    const { data, error } = await supabase.functions.invoke('security-check-login-lock', {
      body: { email, sistema_slug: systemSlug },
    });
    if (error || !data?.locked) return { locked: false };
    const minutos = Math.max(1, Math.ceil((data.retry_after_seconds || 60) / 60));
    return { locked: true, message: `Muitas tentativas de login. Tente novamente em ${minutos} min.` };
  } catch {
    return { locked: false };
  }
}
