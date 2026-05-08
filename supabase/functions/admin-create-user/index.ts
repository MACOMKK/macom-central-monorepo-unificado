import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const databaseUrl = Deno.env.get('DATABASE_URL');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const sql = databaseUrl
  ? postgres(databaseUrl, {
      prepare: false,
      max: 3,
      idle_timeout: 5,
      connect_timeout: 15,
    })
  : null;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalizePayload(payload: Record<string, unknown> = {}) {
  const fields = ['nome', 'email', 'funcao', 'cpf', 'telefone', 'departamento_id', 'cargo', 'data_admissao', 'status', 'unidade_id'];
  const normalized = fields.reduce<Record<string, unknown>>((acc, field) => {
    if (field in payload) {
      acc[field] = payload[field];
    }
    return acc;
  }, {});

  if (typeof normalized.email === 'string') {
    normalized.email = normalized.email.trim().toLowerCase() || null;
  }

  if (typeof normalized.telefone === 'string') {
    normalized.telefone = normalizeDigits(normalized.telefone.trim()) || null;
  }

  if (typeof normalized.cpf === 'string') {
    normalized.cpf = normalizeDigits(normalized.cpf.trim()) || null;
  }

  return normalized;
}

function normalizeDigits(value: string | null) {
  return value ? value.replace(/\D/g, '') : null;
}

async function validateUniqueCollaboratorFields(payload: Record<string, unknown>) {
  if (!sql) return;

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null;
  const telefone = typeof payload.telefone === 'string' ? payload.telefone.trim() : null;
  const cpf = normalizeDigits(typeof payload.cpf === 'string' ? payload.cpf.trim() : null);

  if (email) {
    const emailRows = await sql.unsafe(
      'select id from public.colaboradores where lower(trim(email)) = lower(trim($1)) limit 1;',
      [email],
    );

    if (emailRows[0]) {
      throw new Error('Ja existe um colaborador com este email.');
    }
  }

  if (cpf) {
    const cpfRows = await sql.unsafe(
      "select id from public.colaboradores where regexp_replace(coalesce(cpf, ''), '\\D', '', 'g') = $1 limit 1;",
      [cpf],
    );

    if (cpfRows[0]) {
      throw new Error('Ja existe um colaborador com este CPF.');
    }
  }

  if (telefone) {
    const phoneRows = await sql.unsafe(
      'select id from public.colaboradores where telefone = $1 limit 1;',
      [telefone],
    );

    if (phoneRows[0]) {
      throw new Error('Ja existe um colaborador com este telefone.');
    }
  }
}

function validateCollaboratorDocumentFields(payload: Record<string, unknown>) {
  const cpf = typeof payload.cpf === 'string' ? payload.cpf : null;
  const telefone = typeof payload.telefone === 'string' ? payload.telefone : null;

  if (cpf && cpf.length !== 11) {
    throw new Error('CPF deve conter exatamente 11 digitos.');
  }

  if (telefone && telefone.length !== 11) {
    throw new Error('Telefone deve conter exatamente 11 digitos.');
  }
}

function mapDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');

  if (message.includes('already been registered') || message.includes('User already registered')) {
    return 'Ja existe um colaborador com este email.';
  }

  if (message.includes('colaboradores_cpf_key')) {
    return 'Ja existe um colaborador com este CPF.';
  }

  if (message.includes('colaboradores_email_unique_idx')) {
    return 'Ja existe um colaborador com este email.';
  }

  if (message.includes('colaboradores_telefone_unique_idx')) {
    return 'Ja existe um colaborador com este telefone.';
  }

  return message || 'Erro interno.';
}

function getErrorStatus(error: unknown) {
  const message = mapDatabaseError(error);

  if (
    message === 'Ja existe um colaborador com este CPF.' ||
    message === 'Ja existe um colaborador com este email.' ||
    message === 'Ja existe um colaborador com este telefone.' ||
    message === 'CPF deve conter exatamente 11 digitos.' ||
    message === 'Telefone deve conter exatamente 11 digitos.'
  ) {
    return 400;
  }

  return 500;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !sql) {
      return json({ error: 'Secrets da function nao configurados.' }, 500);
    }

    const authHeader = request.headers.get('Authorization') || '';
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return json({ error: 'Nao autenticado.' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'create');
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const collaboratorId = String(body.id || '').trim();
    const payload = normalizePayload(body);

    const adminRole = await sql.unsafe(
      'select funcao from public.colaboradores where id = $1 limit 1;',
      [user.id],
    );

    if ((adminRole[0]?.funcao || 'usuario') !== 'admin') {
      return json({ error: 'Apenas administradores podem gerenciar colaboradores.' }, 403);
    }

    if (action === 'delete') {
      if (!collaboratorId) {
        return json({ error: 'ID obrigatorio.' }, 400);
      }

      if (collaboratorId === user.id) {
        return json({ error: 'Voce nao pode excluir seu proprio usuario por aqui.' }, 400);
      }

      await sql.unsafe('delete from public.colaboradores where id = $1;', [collaboratorId]);

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(collaboratorId);
      if (deleteError) {
        return json({ error: deleteError.message || 'Falha ao excluir usuario no Auth.' }, 400);
      }

      return json({ success: true });
    }

    if (action === 'update_password') {
      if (!collaboratorId) {
        return json({ error: 'ID obrigatorio.' }, 400);
      }

      if (!password || password.length < 6) {
        return json({ error: 'Senha obrigatoria com pelo menos 6 caracteres.' }, 400);
      }

      const { error: updatePasswordError } = await adminClient.auth.admin.updateUserById(collaboratorId, {
        password,
      });

      if (updatePasswordError) {
        return json({ error: updatePasswordError.message || 'Falha ao atualizar senha no Auth.' }, 400);
      }

      return json({ success: true });
    }

    if (action === 'unlink_assets') {
      if (!collaboratorId) {
        return json({ error: 'ID obrigatorio.' }, 400);
      }

      const collaboratorRows = await sql.unsafe(
        'select status from public.colaboradores where id = $1 limit 1;',
        [collaboratorId],
      );

      const collaborator = collaboratorRows[0];

      if (!collaborator) {
        return json({ error: 'Colaborador nao encontrado.' }, 404);
      }

      if (collaborator.status !== 'inativo') {
        return json({ error: 'So e permitido desvincular ativos de colaboradores inativos.' }, 400);
      }

      const updatedRows = await sql.unsafe(
        `
          update gestao_ativos.ativos
          set
            usuario_id = null,
            status = 'disponivel',
            atualizado_em = now()
          where usuario_id = $1
          returning id;
        `,
        [collaboratorId],
      );

      return json({ success: true, count: updatedRows.length });
    }

    if (action !== 'create') {
      return json({ error: 'Acao invalida.' }, 400);
    }

    if (!email) {
      return json({ error: 'Email obrigatorio.' }, 400);
    }

    if (!password || password.length < 6) {
      return json({ error: 'Senha obrigatoria com pelo menos 6 caracteres.' }, 400);
    }

    validateCollaboratorDocumentFields(payload);
    await validateUniqueCollaboratorFields({ email, telefone: payload.telefone, cpf: payload.cpf });

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.nome || email.split('@')[0],
        funcao: payload.funcao || 'usuario',
      },
    });

    if (createError || !createdUser.user) {
      return json({ error: mapDatabaseError(createError?.message || 'Falha ao criar usuario no Auth.') }, 400);
    }

    try {
      const upsertPayload = {
        nome: payload.nome || email.split('@')[0],
        email,
        funcao: payload.funcao || 'usuario',
        cpf: payload.cpf ?? null,
        telefone: payload.telefone ?? null,
        departamento_id: payload.departamento_id ?? null,
        cargo: payload.cargo ?? null,
        data_admissao: payload.data_admissao ?? null,
        status: payload.status || 'ativo',
        unidade_id: payload.unidade_id ?? null,
      };

      const rows = await sql.unsafe(
        `
          insert into public.colaboradores (
            id,
            nome,
            email,
            funcao,
            cpf,
            telefone,
            departamento_id,
            cargo,
            data_admissao,
            status,
            unidade_id
          )
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          on conflict (id) do update
          set
            nome = excluded.nome,
            email = excluded.email,
            funcao = excluded.funcao,
            cpf = excluded.cpf,
            telefone = excluded.telefone,
            departamento_id = excluded.departamento_id,
            cargo = excluded.cargo,
            data_admissao = excluded.data_admissao,
            status = excluded.status,
            unidade_id = excluded.unidade_id,
            atualizado_em = now()
          returning *;
        `,
        [
          createdUser.user.id,
          upsertPayload.nome,
          upsertPayload.email,
          upsertPayload.funcao,
          upsertPayload.cpf,
          upsertPayload.telefone,
          upsertPayload.departamento_id,
          upsertPayload.cargo,
          upsertPayload.data_admissao,
          upsertPayload.status,
          upsertPayload.unidade_id,
        ],
      );

      return json({ row: rows[0] || null });
    } catch (dbError) {
      await adminClient.auth.admin.deleteUser(createdUser.user.id).catch(() => null);
      throw dbError;
    }
  } catch (error) {
    return json({ error: mapDatabaseError(error) }, getErrorStatus(error));
  }
});
