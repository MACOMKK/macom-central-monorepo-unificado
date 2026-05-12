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
      return json({ error: 'Only admins can invite users' }, 403);
    }

    const body = await req.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const roleRaw = String(body?.role || 'user').trim().toLowerCase();
    const redirectTo = String(body?.redirectTo || '').trim();
    const initialPassword = String(body?.initialPassword || '');
    const fullName = String(body?.fullName || '').trim();

    const allowedRoles = new Set(['admin', 'manager', 'user']);
    const role = allowedRoles.has(roleRaw) ? roleRaw : 'user';

    if (!email || !email.includes('@')) {
      return json({ error: 'Invalid email' }, 400);
    }
    if (initialPassword && initialPassword.length < 8) {
      return json({ error: 'Initial password must have at least 8 characters' }, 400);
    }

    const inviteResult = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: fullName ? { full_name: fullName, name: fullName } : undefined
    });

    const inviteError = inviteResult.error;
    const invitedUserId = inviteResult.data?.user?.id;

    if (inviteError && !inviteError.message.toLowerCase().includes('already')) {
      return json({ error: inviteError.message }, 400);
    }

    if (invitedUserId) {
      const { error: upsertError } = await adminClient.from('profiles').upsert(
        {
          id: invitedUserId,
          email,
          full_name: fullName || email.split('@')[0],
          role,
          active: true,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      );

      if (upsertError) {
        return json({ error: upsertError.message }, 400);
      }

      if (initialPassword) {
        const { error: passwordError } = await adminClient.auth.admin.updateUserById(invitedUserId, {
          password: initialPassword,
          email_confirm: true
        });
        if (passwordError) {
          return json({ error: passwordError.message }, 400);
        }
      }
    } else {
      const { data: existingProfile, error: existingProfileError } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingProfileError) {
        return json({ error: existingProfileError.message }, 400);
      }

      if (existingProfile?.id) {
        const { error: updateRoleError } = await adminClient
          .from('profiles')
          .update({
            role,
            active: true,
            ...(fullName ? { full_name: fullName } : {}),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProfile.id);

        if (updateRoleError) {
          return json({ error: updateRoleError.message }, 400);
        }

        if (initialPassword) {
          const { error: passwordError } = await adminClient.auth.admin.updateUserById(existingProfile.id, {
            password: initialPassword,
            email_confirm: true
          });
          if (passwordError) {
            return json({ error: passwordError.message }, 400);
          }
        }
      }
    }

    return json({ ok: true, email, role });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected function error';
    return json({ error: message }, 500);
  }
});
