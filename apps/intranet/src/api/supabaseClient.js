import {
  assertSupabaseConfigured,
  checkLoginLock,
  isSupabaseConfigured,
  reportFailedLogin,
  reportLoginSuccess,
  supabase,
} from '@macom/api-client/supabaseClient';

export { assertSupabaseConfigured, checkLoginLock, isSupabaseConfigured, reportFailedLogin, reportLoginSuccess, supabase };

export const hasSupabaseEnv = isSupabaseConfigured;
