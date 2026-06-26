import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const databaseUrl = Deno.env.get('DATABASE_URL');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const sql = databaseUrl ? postgres(databaseUrl, { prepare: false }) : null;

const ENTITY_CONFIG = {
  logs_auditoria: {
    schema: 'gestao_plataforma',
    table: 'logs_auditoria',
    orderBy: 'criado_em',
    orderDirection: 'desc',
    allowedFilters: ['entidade', 'acao', 'registro_id', 'responsavel_colaborador_id'],
  },
} as const;

type EntityKey = keyof typeof ENTITY_CONFIG;
type AuditAction = 'criar' | 'atualizar' | 'excluir' | 'redefinir_senha' | 'desvincular' | 'importar';

const AUDIT_ACTIONS = new Set(['criar', 'atualizar', 'excluir', 'redefinir_senha', 'desvincular', 'importar']);

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function requireConfig() {
  if (!sql || !supabaseUrl || !supabaseAnonKey) {
    throw new Error('Ambiente Supabase incompleto.');
  }
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get('Authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function sanitizeFilters(entity: EntityKey, filters: Record<string, unknown> = {}) {
  const config = ENTITY_CONFIG[entity];
  return Object.fromEntries(
    Object.entries(filters).filter(([key, value]) =>
      (config.allowedFilters as readonly string[]).includes(key) && value !== undefined && value !== null && value !== '',
    ),
  );
}

function buildSqlFilters(filters: Record<string, unknown>, startIndex = 1, alias = 'l') {
  const clauses: string[] = [];
  const values: unknown[] = [];

  Object.entries(filters).forEach(([key, value], index) => {
    clauses.push(`${alias}.${key} = $${startIndex + index}`);
    values.push(value);
  });

  return { clauses, values };
}

async function getAuthenticatedUser(request: Request) {
  const token = getBearerToken(request);

  if (!token || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function getAuthenticatedCollaborator(userId: string) {
  if (!sql) return null;

  const rows = await sql.unsafe(
    `
      select id, nome, email, funcao, status
      from public.colaboradores
      where id = $1
      limit 1;
    `,
    [userId],
  );

  return rows[0] || null;
}

function canAccessPlataforma(collaborator: Record<string, unknown> | null) {
  return (
    collaborator?.status !== 'inativo' &&
    (collaborator?.funcao === 'admin' || collaborator?.funcao === 'gestor')
  );
}

function sanitizeAuditPayload(payload: Record<string, unknown> = {}) {
  const action = typeof payload.acao === 'string' ? payload.acao : '';
  const entity = typeof payload.entidade === 'string' ? payload.entidade.trim() : '';

  if (!AUDIT_ACTIONS.has(action)) {
    throw new Error('Acao de auditoria invalida.');
  }

  if (!entity) {
    throw new Error('Entidade de auditoria obrigatoria.');
  }

  return {
    action: action as AuditAction,
    entity,
    recordId: typeof payload.registro_id === 'string' && payload.registro_id ? payload.registro_id : null,
    before: payload.antes && typeof payload.antes === 'object' ? payload.antes as Record<string, unknown> : null,
    after: payload.depois && typeof payload.depois === 'object' ? payload.depois as Record<string, unknown> : null,
    metadata: payload.metadados && typeof payload.metadados === 'object' ? payload.metadados as Record<string, unknown> : {},
  };
}

async function insertAuditLog({
  payload,
  collaborator,
  userEmail,
}: {
  payload: Record<string, unknown>;
  collaborator: Record<string, unknown>;
  userEmail?: string | null;
}) {
  const sanitized = sanitizeAuditPayload(payload);
  const metadata = {
    source_app: 'console',
    origem: 'console',
    audit_scope: 'governanca',
    ...(sanitized.metadata || {}),
  };

  const rows = await sql!.unsafe(
    `
      insert into gestao_plataforma.logs_auditoria (
        entidade,
        acao,
        registro_id,
        responsavel_colaborador_id,
        responsavel_email,
        antes,
        depois,
        metadados
      )
      values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)
      returning *;
    `,
    [
      sanitized.entity,
      sanitized.action,
      sanitized.recordId,
      collaborator.id ?? null,
      userEmail || collaborator.email || null,
      sanitized.before ? JSON.stringify(sanitized.before) : null,
      sanitized.after ? JSON.stringify(sanitized.after) : null,
      JSON.stringify(metadata),
    ],
  );

  return rows[0] || null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    requireConfig();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return json({ error: 'Sessao expirada. Faca login novamente.', code: 'auth_required' }, 401);
    }

    const collaborator = await getAuthenticatedCollaborator(user.id);
    if (!canAccessPlataforma(collaborator)) {
      return json({ error: 'Acesso restrito ao MACOM Console.' }, 403);
    }
    const activeCollaborator = collaborator as Record<string, unknown>;

    const body = await request.json().catch(() => ({}));
    const { action, entity } = body || {};

    if (action === 'create' && entity === 'logs_auditoria') {
      const row = await insertAuditLog({
        payload: body.payload || {},
        collaborator: activeCollaborator,
        userEmail: user.email ?? null,
      });

      return json({ row });
    }

    if (action !== 'list' || entity !== 'logs_auditoria') {
      return json({ error: 'Acao ou entidade invalida.' }, 400);
    }

    const entityKey = entity as EntityKey;
    const config = ENTITY_CONFIG[entityKey];
    const filters = sanitizeFilters(entityKey, body.filters || {});
    const { clauses, values } = buildSqlFilters(filters);
    const whereSql = clauses.length ? `where ${clauses.join(' and ')}` : '';
    const rawLimit = typeof body.limit === 'number' ? body.limit : Number(body.limit);
    const rawOffset = typeof body.offset === 'number' ? body.offset : Number(body.offset);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : null;
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    const totalRows = await sql!.unsafe(
      `select count(*)::int as total from ${config.schema}.${config.table} l ${whereSql};`,
      values,
    );
    const paginatedSql = limit != null
      ? `
          select *
          from ${config.schema}.${config.table} l
          ${whereSql}
          order by l.${config.orderBy} ${config.orderDirection}
          limit ${limit} offset ${offset};
        `
      : `
          select *
          from ${config.schema}.${config.table} l
          ${whereSql}
          order by l.${config.orderBy} ${config.orderDirection};
        `;
    const rows = await sql!.unsafe(paginatedSql, values);

    return json({
      rows,
      total: totalRows[0]?.total ?? rows.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('plataforma-api error', error);
    return json({ error: error instanceof Error ? error.message : 'Falha na API da plataforma.' }, 500);
  }
});
