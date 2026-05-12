import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SB_PUBLISHABLE_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: 'Missing environment configuration in function' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: callerUser },
      error: callerError
    } = await callerClient.auth.getUser();

    if (callerError || !callerUser) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (callerProfileError) {
      return json({ error: 'Unable to validate caller permissions' }, 500);
    }

    if (callerProfile?.role !== 'admin') {
      return json({ error: 'Only admins can update user passwords' }, 403);
    }

    const body = await req.json();
    const userId = String(body?.userId || '').trim();
    const password = String(body?.password || '');

    if (!userId) {
      return json({ error: 'Invalid user id' }, 400);
    }
    if (!password || password.length < 8) {
      return json({ error: 'Password must have at least 8 characters' }, 400);
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true
    });

    if (updateError) {
      return json({ error: updateError.message }, 400);
    }

    return json({ ok: true, userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected function error';
    return json({ error: message }, 500);
  }
});

