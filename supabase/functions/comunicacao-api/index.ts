import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCHEMA = 'gestao_comunicacao';
const SYSTEM_SLUG = 'comunicacao';
const MAX_MENSAGEM_LENGTH = 4000;
const DEFAULT_LIST_LIMIT = 50;

const databaseUrl = Deno.env.get('DATABASE_URL');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

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

function getErrorStatus(error: unknown) {
  const status = Number((error as { status?: number })?.status);
  if (Number.isFinite(status) && status >= 400) return status;
  return 500;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Falha ao consultar a comunicacao.');
}

function parseInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.trunc(parsed), max));
}

async function getAuthenticatedUser(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw Object.assign(new Error('Supabase nao configurado.'), { status: 500 });
  }

  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    throw Object.assign(new Error('Sessao expirada. Faca login novamente.'), { status: 401 });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await authClient.auth.getUser();

  if (error || !data.user) {
    throw Object.assign(new Error('Sessao expirada. Faca login novamente.'), { status: 401 });
  }

  return data.user;
}

async function getCurrentCollaborator(user: { id: string; email?: string }) {
  if (!sql) return null;

  const rows = await sql.unsafe(
    `
      select *
      from public.colaboradores
      where id = $1
         or lower(email) = lower($2)
      order by case when id = $1 then 0 else 1 end
      limit 1;
    `,
    [user.id, user.email || ''],
  );

  return rows[0] || null;
}

async function getComunicacaoAccess(collaboratorId: string) {
  if (!sql) return null;

  const rows = await sql.unsafe(
    `
      select
        aus.*,
        row_to_json(s) as sistema
      from public.acessos_usuario_sistema aus
      join public.sistemas s on s.id = aus.sistema_id
      where aus.colaborador_id = $1
        and aus.ativo = true
        and s.slug = $2
        and s.ativo = true
      limit 1;
    `,
    [collaboratorId, SYSTEM_SLUG],
  );

  return rows[0] || null;
}

function ensureHasAccess(access: Record<string, unknown> | null) {
  if (!access || !['admin', 'gestor', 'usuario'].includes(String(access.nivel_acesso || ''))) {
    throw Object.assign(new Error('Seu usuario nao possui acesso liberado a Comunicacao.'), { status: 403 });
  }
}

async function ensureCanAccessCanal(canalId: string) {
  const rows = await sql.unsafe(
    `select id from ${SCHEMA}.canais where id = $1 and ativo limit 1;`,
    [canalId],
  );
  if (!rows[0]) {
    throw Object.assign(new Error('Canal nao encontrado ou inativo.'), { status: 404 });
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!sql) {
      return json({ error: 'DATABASE_URL nao configurada.' }, 500);
    }

    const user = await getAuthenticatedUser(request);
    const collaborator = await getCurrentCollaborator(user);
    const access = collaborator?.id ? await getComunicacaoAccess(String(collaborator.id)) : null;

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');

    if (action === 'me') {
      return json({ row: collaborator, access });
    }

    ensureHasAccess(access);

    if (action === 'list_canais') {
      const rows = await sql.unsafe(
        `select * from ${SCHEMA}.canais where ativo order by ordem asc;`,
      );
      return json({ rows });
    }

    if (action === 'list_mensagens') {
      const canalId = String(body.canal_id || '');
      if (!canalId) return json({ error: 'canal_id obrigatorio.' }, 400);
      await ensureCanAccessCanal(canalId);

      const limit = parseInteger(body.limit, DEFAULT_LIST_LIMIT, 1, 200);
      const before = body.before ? String(body.before) : null;

      const rows = await sql.unsafe(
        `
          select
            m.*,
            json_build_object('id', c.id, 'nome', c.nome, 'email', c.email) as autor
          from ${SCHEMA}.mensagens m
          join public.colaboradores c on c.id = m.autor_id
          where m.canal_id = $1
            and ($2::timestamptz is null or m.criado_em < $2::timestamptz)
          order by m.criado_em desc
          limit ${limit};
        `,
        [canalId, before],
      );

      return json({ rows: rows.reverse() });
    }

    if (action === 'create_mensagem') {
      const canalId = String(body.canal_id || '');
      const conteudo = typeof body.conteudo === 'string' ? body.conteudo.trim() : '';
      if (!canalId) return json({ error: 'canal_id obrigatorio.' }, 400);
      if (!conteudo || conteudo.length > MAX_MENSAGEM_LENGTH) {
        return json({ error: 'Mensagem invalida.' }, 400);
      }
      await ensureCanAccessCanal(canalId);

      const rows = await sql.unsafe(
        `
          insert into ${SCHEMA}.mensagens (canal_id, autor_id, conteudo)
          values ($1, $2, $3)
          returning *;
        `,
        [canalId, collaborator.id, conteudo],
      );
      return json({ row: rows[0] || null });
    }

    if (action === 'update_mensagem') {
      const id = String(body.id || '');
      const conteudo = typeof body.conteudo === 'string' ? body.conteudo.trim() : '';
      if (!id) return json({ error: 'id obrigatorio.' }, 400);
      if (!conteudo || conteudo.length > MAX_MENSAGEM_LENGTH) {
        return json({ error: 'Mensagem invalida.' }, 400);
      }

      const rows = await sql.unsafe(
        `
          update ${SCHEMA}.mensagens
          set conteudo = $1, editada_em = now()
          where id = $2
            and autor_id = $3
            and excluida_em is null
          returning *;
        `,
        [conteudo, id, collaborator.id],
      );

      if (!rows[0]) {
        return json({ error: 'Mensagem nao encontrada ou sem permissao.' }, 403);
      }
      return json({ row: rows[0] });
    }

    if (action === 'delete_mensagem') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'id obrigatorio.' }, 400);

      const rows = await sql.unsafe(
        `
          update ${SCHEMA}.mensagens
          set excluida_em = now()
          where id = $1
            and autor_id = $2
            and excluida_em is null
          returning *;
        `,
        [id, collaborator.id],
      );

      if (!rows[0]) {
        return json({ error: 'Mensagem nao encontrada ou sem permissao.' }, 403);
      }
      return json({ row: rows[0] });
    }

    return json({ error: 'Acao invalida.' }, 400);
  } catch (error) {
    return json({ error: getErrorMessage(error) }, getErrorStatus(error));
  }
});
