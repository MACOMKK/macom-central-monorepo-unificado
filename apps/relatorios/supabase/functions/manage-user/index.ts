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
      return json({ error: 'Only admins can manage users' }, 403);
    }

    const body = await req.json();
    const userId = String(body?.userId || '').trim();
    const action = String(body?.action || '').trim().toLowerCase();

    if (!userId) {
      return json({ error: 'Invalid user id' }, 400);
    }

    if (!['delete', 'deactivate', 'activate'].includes(action)) {
      return json({ error: 'Invalid action' }, 400);
    }

    if (userId === callerUser.id) {
      return json({ error: 'You cannot manage your own user through this action' }, 400);
    }

    const { data: targetProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, email, active')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      return json({ error: 'Unable to load target user' }, 500);
    }

    if (!targetProfile?.email) {
      return json({ error: 'User not found' }, 404);
    }

    const { count, error: permissionError } = await adminClient
      .from('report_permissions')
      .select('id', { count: 'exact', head: true })
      .eq('user_email', targetProfile.email);

    if (permissionError) {
      return json({ error: 'Unable to validate linked reports' }, 500);
    }

    const linkedReportsCount = count || 0;

    if (action === 'delete') {
      if (linkedReportsCount > 0) {
        return json(
          {
            error: 'User has linked reports and cannot be deleted',
            code: 'USER_HAS_LINKED_REPORTS',
            linkedReportsCount
          },
          409
        );
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) {
        return json({ error: deleteError.message }, 400);
      }

      return json({ ok: true, action, userId, linkedReportsCount });
    }

    const shouldBeActive = action === 'activate';
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        active: shouldBeActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      return json({ error: updateError.message }, 400);
    }

    return json({
      ok: true,
      action,
      userId,
      active: shouldBeActive,
      linkedReportsCount
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected function error';
    return json({ error: message }, 500);
  }
});
