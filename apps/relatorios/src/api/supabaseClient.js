import { assertSupabaseConfigured, isSupabaseConfigured, reportFailedLogin, supabase } from '@macom/api-client/supabaseClient';

export { assertSupabaseConfigured, isSupabaseConfigured, reportFailedLogin, supabase };

export const hasSupabaseEnv = isSupabaseConfigured;
