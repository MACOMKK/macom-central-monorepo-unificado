import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CRM_SCHEMA = 'gestao_crm';
const CRM_SYSTEM_SLUG = 'crm';

const ENTITY_CONFIG = {
  clientes: {
    table: 'clientes',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFields: [
      'nome',
      'telefone',
      'telefone_normalizado',
      'email',
      'email_normalizado',
      'empresa',
      'status_relacionamento',
      'observacoes',
    ],
  },
  leads: {
    table: 'leads',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFields: [
      'cliente_id',
      'nome',
      'telefone',
      'telefone_normalizado',
      'email',
      'email_normalizado',
      'origem',
      'status',
      'modelo_interesse',
      'empresa',
      'convertido_em',
      'perdido_em',
      'motivo_perda',
    ],
  },
  atendimentos: {
    table: 'atendimentos',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFields: [
      'lead_id',
      'cliente_id',
      'titulo',
      'status',
      'tipo_atendimento',
      'temperatura',
      'proximo_contato',
      'observacoes',
    ],
  },
  historico_atendimentos: {
    table: 'historico_atendimentos',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFields: [
      'cliente_id',
      'lead_id',
      'atendimento_id',
      'tipo',
      'descricao',
      'entidade',
      'entidade_id',
      'status',
      'metadados',
    ],
  },
} as const;

type EntityName = keyof typeof ENTITY_CONFIG;

const ORDER_FIELD_MAP: Record<string, string> = {
  created_date: 'criado_em',
  updated_date: 'atualizado_em',
  tipo_evento: 'tipo_atendimento',
};

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

function mapDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');

  if (message.includes('idx_crm_leads_cliente_ativo_unique')) {
    return 'Ja existe um lead ativo para este cliente.';
  }

  if (message.includes('idx_crm_atendimentos_lead_aberto_unique')) {
    return 'Este lead ja possui um atendimento em aberto.';
  }

  if (message.includes('idx_crm_clientes_telefone_unique')) {
    return 'Ja existe outro cliente com este telefone.';
  }

  if (message.includes('idx_crm_clientes_email_unique')) {
    return 'Ja existe outro cliente com este e-mail.';
  }

  return message || 'Falha ao consultar o CRM.';
}

function getErrorStatus(error: unknown) {
  const status = Number((error as { status?: number })?.status);
  if (Number.isFinite(status) && status >= 400) return status;
  return 500;
}

function sanitizePayload(entity: EntityName, payload: Record<string, unknown> = {}) {
  const allowedFields = ENTITY_CONFIG[entity].allowedFields;
  const sanitized: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in payload) {
      sanitized[field] = payload[field];
    }
  }

  return sanitized;
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildSqlFilters(filters: Record<string, unknown> = {}, startIndex = 1, tableAlias?: string) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const prefix = tableAlias ? `${tableAlias}.` : '';

  for (const [field, value] of Object.entries(filters)) {
    if (value === undefined) continue;
    clauses.push(`${prefix}${quoteIdentifier(field)} = $${startIndex + values.length}`);
    values.push(value);
  }

  return { clauses, values };
}

function parseOrFilter(orFilter: string | undefined, startIndex: number) {
  if (!orFilter) return { clause: '', values: [] as unknown[] };

  const values: unknown[] = [];
  const clauses = orFilter
    .split(',')
    .map((part) => {
      const match = part.match(/^([a-zA-Z0-9_]+)\.eq\.(.*)$/);
      if (!match) return null;
      values.push(match[2]);
      return `${quoteIdentifier(match[1])} = $${startIndex + values.length - 1}`;
    })
    .filter(Boolean);

  return {
    clause: clauses.length ? `(${clauses.join(' or ')})` : '',
    values,
  };
}

function buildInsertQuery(schema: string, table: string, payload: Record<string, unknown>) {
  const fields = Object.keys(payload);
  const columns = fields.map(quoteIdentifier).join(', ');
  const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
  return {
    text: `insert into ${schema}.${table} (${columns}) values (${placeholders}) returning *;`,
    values: fields.map((field) => payload[field]),
  };
}

function buildUpdateQuery(schema: string, table: string, id: string, payload: Record<string, unknown>) {
  const fields = Object.keys(payload);
  const assignments = fields.map((field, index) => `${quoteIdentifier(field)} = $${index + 2}`).join(', ');
  return {
    text: `update ${schema}.${table} set ${assignments} where id = $1 returning *;`,
    values: [id, ...fields.map((field) => payload[field])],
  };
}

function buildListSelect(entity: EntityName) {
  if (entity !== 'atendimentos') {
    return `select * from ${CRM_SCHEMA}.${ENTITY_CONFIG[entity].table}`;
  }

  return `
    select
      a.*,
      row_to_json(l) as lead,
      row_to_json(c) as cliente
    from ${CRM_SCHEMA}.atendimentos a
    left join ${CRM_SCHEMA}.leads l on l.id = a.lead_id
    left join ${CRM_SCHEMA}.clientes c on c.id = a.cliente_id
  `;
}

function baseAlias(entity: EntityName) {
  return entity === 'atendimentos' ? 'a' : '';
}

function scopedColumn(entity: EntityName, column: string) {
  const alias = baseAlias(entity);
  return alias ? `${alias}.${quoteIdentifier(column)}` : quoteIdentifier(column);
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

async function getCrmAccess(collaboratorId: string) {
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
    [collaboratorId, CRM_SYSTEM_SLUG],
  );

  return rows[0] || null;
}

function ensureCanManage(access: Record<string, unknown> | null) {
  if (!access || !['admin', 'gestor', 'usuario'].includes(String(access.nivel_acesso || ''))) {
    throw Object.assign(new Error('Seu usuario nao possui acesso liberado ao CRM.'), { status: 403 });
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
    const access = collaborator?.id ? await getCrmAccess(String(collaborator.id)) : null;
    ensureCanManage(access);

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'list');

    if (action === 'me') {
      return json({ row: collaborator, access });
    }

    const entity = String(body.entity || '') as EntityName;
    const config = ENTITY_CONFIG[entity];

    if (!config) {
      return json({ error: 'Entidade invalida.' }, 400);
    }

    const id = typeof body.id === 'string' ? body.id : '';
    const filters = typeof body.filters === 'object' && body.filters ? body.filters : {};
    const orFilter = typeof body.or === 'string' ? body.or : undefined;
    const orderBy = ORDER_FIELD_MAP[String(body.orderBy || '')] || String(body.orderBy || config.orderBy);
    const orderDirection = body.ascending === false ? 'desc' : String(config.orderDirection || 'asc');
    const limit = Number.isFinite(Number(body.limit)) ? Math.min(Number(body.limit), 1000) : 100;

    if (action === 'get') {
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      const rows = await sql.unsafe(`${buildListSelect(entity)} where ${scopedColumn(entity, 'id')} = $1 limit 1;`, [id]);
      return json({ row: rows[0] || null });
    }

    if (action === 'list') {
      const filterParts = buildSqlFilters(filters, 1, baseAlias(entity) || undefined);
      const orPart = parseOrFilter(orFilter, filterParts.values.length + 1);
      const clauses = [...filterParts.clauses, orPart.clause].filter(Boolean);
      const whereClause = clauses.length ? `where ${clauses.join(' and ')}` : '';
      const rows = await sql.unsafe(
        `${buildListSelect(entity)} ${whereClause} order by ${scopedColumn(entity, orderBy)} ${orderDirection} limit ${limit};`,
        [...filterParts.values, ...orPart.values],
      );
      return json({ rows });
    }

    if (action === 'create') {
      const payload = sanitizePayload(entity, body.payload || {});
      if (!Object.keys(payload).length) return json({ error: 'Payload vazio.' }, 400);
      const query = buildInsertQuery(CRM_SCHEMA, config.table, payload);
      const rows = await sql.unsafe(query.text, query.values);
      return json({ row: rows[0] || null });
    }

    if (action === 'update') {
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      const payload = sanitizePayload(entity, body.payload || {});
      if (!Object.keys(payload).length) return json({ error: 'Nenhum campo para atualizar.' }, 400);
      const query = buildUpdateQuery(CRM_SCHEMA, config.table, id, payload);
      const rows = await sql.unsafe(query.text, query.values);
      return json({ row: rows[0] || null });
    }

    if (action === 'delete') {
      if (!id) return json({ error: 'ID obrigatorio.' }, 400);
      await sql.unsafe(`delete from ${CRM_SCHEMA}.${config.table} where id = $1;`, [id]);
      return json({ success: true });
    }

    return json({ error: 'Acao invalida.' }, 400);
  } catch (error) {
    return json({ error: mapDatabaseError(error) }, getErrorStatus(error));
  }
});
