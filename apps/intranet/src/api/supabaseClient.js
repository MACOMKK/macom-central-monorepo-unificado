import { assertSupabaseConfigured, isSupabaseConfigured, supabase } from '@macom/api-client/supabaseClient';

export { assertSupabaseConfigured, isSupabaseConfigured, supabase };

export const hasSupabaseEnv = isSupabaseConfigured;
