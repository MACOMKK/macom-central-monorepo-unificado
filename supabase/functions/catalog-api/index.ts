import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENTITY_CONFIG = {
  departamentos: {
    schema: 'public',
    table: 'departamentos',
    orderBy: 'nome',
    allowedFields: ['nome', 'descricao'],
  },
  unidades: {
    schema: 'public',
    table: 'unidades',
    orderBy: 'nome',
    allowedFields: ['nome', 'cidade', 'endereco', 'telefone', 'responsavel', 'ativo'],
  },
  colaboradores: {
    schema: 'public',
    table: 'colaboradores',
    orderBy: 'nome',
    allowedFields: [
      'id',
      'nome',
      'email',
      'funcao',
      'cpf',
      'telefone',
      'departamento_id',
      'cargo',
      'data_admissao',
      'status',
      'unidade_id',
    ],
  },
  ativos: {
    schema: 'gestao_ativos',
    table: 'ativos',
    orderBy: 'nome',
    allowedFields: [
      'nome',
      'categoria',
      'marca',
      'modelo',
      'numero_serie',
      'patrimonio',
      'unidade_id',
      'localizacao_interna',
      'observacao',
      'status',
      'estado',
      'usuario_id',
    ],
  },
} as const;

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

function sanitizePayload(entity: keyof typeof ENTITY_CONFIG, payload: Record<string, unknown> = {}) {
  const allowedFields = ENTITY_CONFIG[entity].allowedFields;
  const sanitized: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in payload) {
      sanitized[field] = payload[field];
    }
  }

  return sanitized;
}

function normalizeAtivosPayload(payload: Record<string, unknown>) {
  const normalized = { ...payload };
  normalized.status = normalized.usuario_id ? 'em_uso' : 'disponivel';
  return normalized;
}

function buildInsertQuery(schema: string, table: string, payload: Record<string, unknown>) {
  const entries = Object.entries(payload);
  const columns = entries.map(([key]) => `"${key}"`).join(', ');
  const placeholders = entries.map((_, index) => `$${index + 1}`).join(', ');
  const values = entries.map(([, value]) => value);

  return {
    text: `insert into ${schema}.${table} (${columns}) values (${placeholders}) returning *;`,
    values,
  };
}

function buildUpdateQuery(schema: string, table: string, id: string, payload: Record<string, unknown>) {
  const entries = Object.entries(payload);
  const assignments = entries.map(([key], index) => `"${key}" = $${index + 2}`).join(', ');
  const values = [id, ...entries.map(([, value]) => value)];

  return {
    text: `update ${schema}.${table} set ${assignments} where id = $1 returning *;`,
    values,
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!supabaseUrl || !supabaseAnonKey || !sql) {
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

    const body = await request.json().catch(() => ({}));
    const action = body.action;
    const entity = body.entity as keyof typeof ENTITY_CONFIG;
    const id = body.id as string | undefined;
    const payload = body.payload as Record<string, unknown> | undefined;

    if (!entity || !ENTITY_CONFIG[entity]) {
      return json({ error: 'Entidade invalida.' }, 400);
    }

    const schema = ENTITY_CONFIG[entity].schema;
    const table = ENTITY_CONFIG[entity].table;
    const orderBy = ENTITY_CONFIG[entity].orderBy;

    if (action === 'me' && entity === 'colaboradores') {
      const rows = await sql.unsafe('select * from public.colaboradores where id = $1 limit 1;', [user.id]);
      return json({ row: rows[0] || null });
    }

    const accessRows = await sql.unsafe('select funcao, status from public.colaboradores where id = $1 limit 1;', [user.id]);
    const accessProfile = accessRows[0];

    if (!accessProfile || accessProfile.funcao !== 'admin' || accessProfile.status === 'inativo') {
      return json({ error: 'Acesso restrito a administradores.' }, 403);
    }

    if (action === 'list') {
      const rows = await sql.unsafe(`select * from ${schema}.${table} order by ${orderBy} asc;`);
      return json({ rows });
    }

    if (action === 'create') {
      const sanitized = sanitizePayload(entity, payload);
      const normalized = entity === 'ativos' ? normalizeAtivosPayload(sanitized) : sanitized;
      if (!Object.keys(normalized).length) {
        return json({ error: 'Payload vazio.' }, 400);
      }
      const query = buildInsertQuery(schema, table, normalized);
      const rows = await sql.unsafe(query.text, query.values);
      return json({ row: rows[0] || null });
    }

    if (action === 'update') {
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      const sanitized = sanitizePayload(entity, payload);
      if (entity === 'colaboradores') {
        delete sanitized.id;
      }
      const normalized = entity === 'ativos' ? normalizeAtivosPayload(sanitized) : sanitized;
      if (!Object.keys(normalized).length) {
        return json({ error: 'Nenhum campo para atualizar.' }, 400);
      }
      const query = buildUpdateQuery(schema, table, id, normalized);
      const rows = await sql.unsafe(query.text, query.values);
      return json({ row: rows[0] || null });
    }

    if (action === 'delete') {
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      await sql.unsafe(`delete from ${schema}.${table} where id = $1;`, [id]);
      return json({ success: true });
    }

    return json({ error: 'Acao invalida.' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Erro interno.' }, 500);
  }
});
