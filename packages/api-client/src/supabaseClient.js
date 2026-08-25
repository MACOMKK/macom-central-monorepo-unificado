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
